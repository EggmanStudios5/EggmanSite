#!/usr/bin/env bash
# Idempotent Vault initialization, HCL policy deployment, CIDR-bound AppRole provisioning,
# PostgreSQL + RabbitMQ dynamic secret engines, and Redis/RabbitMQ secret file rendering.
set -euo pipefail
umask 077

MODE="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
POLICIES_DIR="${REPO_ROOT}/infra/compose/01-security/vault/policies"
SECRETS_ROOT="${EGGMAN_SECRETS_ROOT:-/srv/eggman/secrets}"
CERTS_ROOT="${EGGMAN_CERTS_ROOT:-/srv/eggman/certs}"
APPROLE_DIR="${SECRETS_ROOT}/approle"
INIT_FILE="${SECRETS_ROOT}/vault-init.json"

mkdir -p "${APPROLE_DIR}" "${SECRETS_ROOT}/redis" "${SECRETS_ROOT}/rabbitmq"
chmod 0750 "${APPROLE_DIR}"

vault_exec() {
  docker exec -i \
    -e VAULT_ADDR=https://127.0.0.1:8200 \
    -e VAULT_CACERT=/vault/certs/ca.crt \
    ${VAULT_TOKEN:+-e VAULT_TOKEN="${VAULT_TOKEN}"} \
    eggman-vault vault "$@"
}

printf '[bootstrap-vault] Checking Vault initialization status...\n'
if vault_exec status -format=json 2>/dev/null | jq -e '.initialized == false' >/dev/null; then
  printf '[bootstrap-vault] Initializing Vault (5 shares, threshold 3)...\n'
  vault_exec operator init -key-shares=5 -key-threshold=3 -format=json > "${INIT_FILE}"
  chmod 0600 "${INIT_FILE}"
  printf '[bootstrap-vault] IMPORTANT: Back up %s offline & shred from disk after unsealing!\n' "${INIT_FILE}"
fi

if vault_exec status -format=json 2>/dev/null | jq -e '.sealed == true' >/dev/null; then
  if [[ ! -f "${INIT_FILE}" ]]; then
    printf '[bootstrap-vault][ERROR] Vault is sealed and %s not found. Unseal manually first.\n' "${INIT_FILE}" >&2
    exit 1
  fi
  for i in 0 1 2; do
    key="$(jq -r ".unseal_keys_b64[${i}]" "${INIT_FILE}")"
    vault_exec operator unseal "${key}" >/dev/null
  done
fi

if [[ -z "${VAULT_TOKEN:-}" ]]; then
  if [[ -f "${INIT_FILE}" ]]; then
    export VAULT_TOKEN
    VAULT_TOKEN="$(jq -r '.root_token' "${INIT_FILE}")"
  else
    printf '[bootstrap-vault][ERROR] Export VAULT_TOKEN (with admin policy) to run configuration.\n' >&2
    exit 1
  fi
fi

if [[ "${MODE}" != "--configure-engines" ]]; then
  printf '[bootstrap-vault] Enabling KV v2, AppRole, Database, and RabbitMQ secret engines...\n'
  vault_exec secrets enable -path=secret kv-v2 2>/dev/null || true
  vault_exec secrets enable database 2>/dev/null || true
  vault_exec secrets enable rabbitmq 2>/dev/null || true
  vault_exec auth enable approle 2>/dev/null || true

  printf '[bootstrap-vault] Loading declarative HCL policies from %s...\n' "${POLICIES_DIR}"
  vault_exec policy write eggman-yarp-public - < "${POLICIES_DIR}/yarp-public.hcl"
  vault_exec policy write eggman-releasehub-public - < "${POLICIES_DIR}/releasehub-public.hcl"
  vault_exec policy write eggman-iot-private - < "${POLICIES_DIR}/iot-bridge-private.hcl"

  printf '[bootstrap-vault] Provisioning CIDR-bound AppRoles...\n'
  provision_approle() {
    local role_name="$1"
    local policy="$2"
    local cidr="$3"
    local subdir="$4"
    local role_dir="${APPROLE_DIR}/${subdir}"

    install -d -m 0750 "${role_dir}"
    chown root:1654 "${role_dir}" || true

    vault_exec write "auth/approle/role/${role_name}" \
      token_policies="${policy}" \
      token_bound_cidrs="${cidr}" \
      secret_id_bound_cidrs="${cidr}" \
      token_ttl="1h" \
      token_max_ttl="4h" >/dev/null

    vault_exec read -field=role_id "auth/approle/role/${role_name}/role-id" > "${role_dir}/role-id"
    vault_exec write -f -field=secret_id "auth/approle/role/${role_name}/secret-id" > "${role_dir}/secret-id"
    chown root:1654 "${role_dir}/role-id" "${role_dir}/secret-id" || true
    chmod 0640 "${role_dir}/role-id" "${role_dir}/secret-id"
  }

  provision_approle "eggman-yarp"       "eggman-yarp-public"       "172.28.8.0/28"               "yarp"
  provision_approle "eggman-releasehub" "eggman-releasehub-public" "172.28.8.0/28"               "releasehub"
  provision_approle "eggman-iot-bridge" "eggman-iot-private"       "172.28.20.0/27,172.28.22.0/26" "iot-bridge"

  printf '[bootstrap-vault] Rendering Redis ACLs & RabbitMQ definitions with random cryptographic secrets...\n'
  rand_pw() { openssl rand -hex 24; }
  rmq_hash() {
    python3 - "$1" <<'PYEOF'
import hashlib, os, base64, sys
salt = os.urandom(4)
digest = hashlib.sha256(salt + sys.argv[1].encode("utf-8")).digest()
print(base64.b64encode(salt + digest).decode("ascii"))
PYEOF
  }

  REDIS_HEALTH_PW="$(rand_pw)"
  REDIS_NC_PW="$(rand_pw)"
  REDIS_IMMICH_PW="$(rand_pw)"
  REDIS_FORGEJO_PW="$(rand_pw)"

  printf '%s' "${REDIS_HEALTH_PW}" > "${SECRETS_ROOT}/redis/health.pass"
  chown 999:999 "${SECRETS_ROOT}/redis/health.pass" || true
  chmod 0640 "${SECRETS_ROOT}/redis/health.pass"

  sed \
    -e "s|CHANGE_ME_FROM_VAULT_REDIS_HEALTH_PASS|${REDIS_HEALTH_PW}|g" \
    -e "s|CHANGE_ME_FROM_VAULT_REDIS_NC_PASS|${REDIS_NC_PW}|g" \
    -e "s|CHANGE_ME_FROM_VAULT_REDIS_IMMICH_PASS|${REDIS_IMMICH_PW}|g" \
    -e "s|CHANGE_ME_FROM_VAULT_REDIS_FORGEJO_PASS|${REDIS_FORGEJO_PW}|g" \
    "${REPO_ROOT}/infra/compose/02-data-bus/redis/users.acl.template" > "${SECRETS_ROOT}/redis/users.acl"
  chown 999:999 "${SECRETS_ROOT}/redis/users.acl" || true
  chmod 0640 "${SECRETS_ROOT}/redis/users.acl"

  RMQ_ADMIN_PW="$(rand_pw)"
  RMQ_REL_PW="$(rand_pw)"
  RMQ_IOT_PW="$(rand_pw)"
  RMQ_JARVIS_PW="$(rand_pw)"

  python3 - \
    "${REPO_ROOT}/infra/compose/02-data-bus/rabbitmq/definitions.json.template" \
    "${SECRETS_ROOT}/rabbitmq/definitions.json" \
    "$(rmq_hash "${RMQ_ADMIN_PW}")" \
    "$(rmq_hash "${RMQ_REL_PW}")" \
    "$(rmq_hash "${RMQ_IOT_PW}")" \
    "$(rmq_hash "${RMQ_JARVIS_PW}")" <<'PYEOF'
import json, sys
src, dst, h_adm, h_rel, h_iot, h_jar = sys.argv[1:7]
with open(src, "r", encoding="utf-8") as fh:
    data = json.load(fh)
hashes = {
    "rmq_admin": h_adm,
    "svc_releasehub": h_rel,
    "svc_iot_bridge": h_iot,
    "svc_jarvis_reserved": h_jar,
}
for user in data["users"]:
    user["password_hash"] = hashes[user["name"]]
with open(dst, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
PYEOF
  chown 999:999 "${SECRETS_ROOT}/rabbitmq/definitions.json" || true
  chmod 0640 "${SECRETS_ROOT}/rabbitmq/definitions.json"

  vault_exec kv put secret/public/releasehub/rabbitmq username="svc_releasehub" password="${RMQ_REL_PW}" >/dev/null
  vault_exec kv put secret/private/iot-bridge/rabbitmq username="svc_iot_bridge" password="${RMQ_IOT_PW}" >/dev/null
  vault_exec kv put secret/private/iot-bridge/rabbitmq-admin username="rmq_admin" password="${RMQ_ADMIN_PW}" >/dev/null
  vault_exec kv put secret/private/redis nextcloud="${REDIS_NC_PW}" immich="${REDIS_IMMICH_PW}" forgejo="${REDIS_FORGEJO_PW}" >/dev/null
fi

configure_dynamic_engines() {
  local data_env="${REPO_ROOT}/infra/compose/02-data-bus/.env"
  if [[ -f "${data_env}" ]]; then
    # shellcheck source=/dev/null
    set -a && source "${data_env}" && set +a
  fi

  if docker ps --format '{{.Names}}' | grep -q '^eggman-postgres-public$' && [[ -n "${VAULT_PG_PUB_PASSWORD:-}" ]]; then
    printf '[bootstrap-vault] Configuring Vault PostgreSQL engine (postgres-public)...\n'
    vault_exec write database/config/postgres-public \
      plugin_name=postgresql-database-plugin \
      allowed_roles="releasehub-role" \
      connection_url="postgresql://{{username}}:{{password}}@eggman-postgres-public:5432/releasehub?sslmode=verify-full&sslrootcert=/vault/certs/ca.crt" \
      username="vault_admin" \
      password="${VAULT_PG_PUB_PASSWORD}" >/dev/null

    vault_exec write database/roles/releasehub-role \
      db_name=postgres-public \
      creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE releasehub_rw;" \
      revocation_statements="REASSIGN OWNED BY \"{{name}}\" TO pgadmin_pub; DROP OWNED BY \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
      default_ttl="1h" \
      max_ttl="24h" >/dev/null
  fi

  if docker ps --format '{{.Names}}' | grep -q '^eggman-postgres-private$' && [[ -n "${VAULT_PG_PRIV_PASSWORD:-}" ]]; then
    printf '[bootstrap-vault] Configuring Vault PostgreSQL engine (postgres-private)...\n'
    vault_exec write database/config/postgres-private \
      plugin_name=postgresql-database-plugin \
      allowed_roles="iot-bridge-role" \
      connection_url="postgresql://{{username}}:{{password}}@eggman-postgres-private:5432/iot_bridge?sslmode=verify-full&sslrootcert=/vault/certs/ca.crt" \
      username="vault_admin" \
      password="${VAULT_PG_PRIV_PASSWORD}" >/dev/null

    vault_exec write database/roles/iot-bridge-role \
      db_name=postgres-private \
      creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE iot_rw;" \
      revocation_statements="REASSIGN OWNED BY \"{{name}}\" TO pgadmin_priv; DROP OWNED BY \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
      default_ttl="1h" \
      max_ttl="24h" >/dev/null
  fi

  if docker ps --format '{{.Names}}' | grep -q '^eggman-rabbitmq$'; then
    local rmq_adm_pw
    rmq_adm_pw="$(vault_exec kv get -field=password secret/private/iot-bridge/rabbitmq-admin 2>/dev/null || true)"
    if [[ -n "${rmq_adm_pw}" ]]; then
      printf '[bootstrap-vault] Configuring Vault RabbitMQ secrets engine (TLS 15671)...\n'
      vault_exec write rabbitmq/config/connection \
        connection_uri="https://eggman-rabbitmq:15671" \
        username="rmq_admin" \
        password="${rmq_adm_pw}" \
        verify_connection=true >/dev/null

      vault_exec write rabbitmq/roles/releasehub-pub \
        vhosts='{"/public-events":{"configure":"^$","write":"^eggman\\.public\\.events$","read":"^$"}}' >/dev/null

      vault_exec write rabbitmq/roles/iot-bridge \
        vhosts='{"/private-iot":{"configure":"^(eggman\\.iot\\..*)$","write":"^eggman\\.iot\\.events$","read":"^eggman\\.iot\\.commands$"}}' >/dev/null
    fi
  fi
}

configure_dynamic_engines

printf '[bootstrap-vault] Vault configuration completed.\n'
