#!/usr/bin/env bash
# All-in-One Interactive Setup & Bootstrap Script for Eggman Studios HP EliteDesk.
# 1. Runs bootstrap/bootstrap-elitedesk.sh (OS/UFW/Tailscale/SSH/Docker hardening).
# 2. Interactively fills/updates all 6 .env files (auto-detecting IPs & generating random secrets).
# 3. Initializes networks & internal PKI, pulls/builds images, bootstraps Vault & Keycloak,
#    starts all 5 stacks via start-all.sh, and runs Zero Trust verification.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SKIP_BOOTSTRAP=0
NON_INTERACTIVE=0

for arg in "$@"; do
  case "${arg}" in
    --skip-bootstrap)  SKIP_BOOTSTRAP=1 ;;
    --non-interactive) NON_INTERACTIVE=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: sudo ./scripts/setup-all.sh [--skip-bootstrap] [--non-interactive]
  --skip-bootstrap   Skip OS/Tailscale/Ansible host hardening (use if already bootstrapped)
  --non-interactive  Use existing .env values, env overrides, and auto-detected defaults without prompts
EOF
      exit 0
      ;;
    *)
      printf '[setup-all][ERROR] Unknown argument: %s\n' "${arg}" >&2
      exit 1
      ;;
  esac
done

log()  { printf '[setup-all] %s\n' "$*"; }
warn() { printf '[setup-all][WARN] %s\n' "$*" >&2; }
die()  { printf '[setup-all][FATAL] %s\n' "$*" >&2; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  die "Run as root: sudo $0"
fi

# 1. Run physical-console/host bootstrap unless skipped
if [[ "${SKIP_BOOTSTRAP}" -eq 0 ]]; then
  log "1/7 Running host bootstrap & Ansible Zero Trust hardening..."
  "${REPO_ROOT}/bootstrap/bootstrap-elitedesk.sh"
else
  log "1/7 Skipping host bootstrap (--skip-bootstrap)."
fi

# Use /srv/eggman/repo if Ansible synced it there, otherwise use current REPO_ROOT
TARGET_REPO="${REPO_ROOT}"
if [[ -d /srv/eggman/repo/infra/compose ]]; then
  TARGET_REPO="/srv/eggman/repo"
fi
log "Working in repository: ${TARGET_REPO}"
cd "${TARGET_REPO}"

# Helper: read existing key from an .env file (returns empty if missing or CHANGE_ME_*)
read_env_val() {
  local file="$1"
  local key="$2"
  local val=""
  if [[ -f "${file}" ]]; then
    val="$(grep -E "^${key}=" "${file}" | head -n1 | cut -d= -f2- || true)"
  fi
  if [[ "${val}" == CHANGE_ME_* ]]; then
    val=""
  fi
  printf '%s' "${val}"
}

prompt_value() {
  local prompt_text="$1"
  local default_val="$2"
  local is_secret="${3:-0}"
  local input=""

  if [[ "${NON_INTERACTIVE}" -eq 1 ]]; then
    printf '%s' "${default_val}"
    return 0
  fi

  if [[ "${is_secret}" -eq 1 ]]; then
    if [[ -n "${default_val}" ]]; then
      read -r -s -p "${prompt_text} [press Enter to keep existing]: " input
    else
      read -r -s -p "${prompt_text}: " input
    fi
    printf '\n' >&2
  else
    read -r -p "${prompt_text} [${default_val}]: " input
  fi

  if [[ -z "${input}" ]]; then
    printf '%s' "${default_val}"
  else
    printf '%s' "${input}"
  fi
}

gen_secret() {
  openssl rand -hex 24
}

# 2. Interactive .env configuration across root + all 5 stacks
log "2/7 Configuring root and per-stack .env files..."

DETECTED_TS_IP="$(tailscale ip -4 2>/dev/null | head -n1 || true)"
DETECTED_LAN_IP="$(ip -4 -o addr show scope global 2>/dev/null | awk '!/tailscale0|docker|br-|veth/ {split($4,a,"/"); print a[1]; exit}' || true)"
DETECTED_RENDER_GID="$(getent group render 2>/dev/null | cut -d: -f3 || echo 109)"

ROOT_ENV="${TARGET_REPO}/.env"
SEC_ENV="${TARGET_REPO}/infra/compose/01-security/.env"
DATA_ENV="${TARGET_REPO}/infra/compose/02-data-bus/.env"
PUB_ENV="${TARGET_REPO}/infra/compose/03-public-edge/.env"
PRIV_ENV="${TARGET_REPO}/infra/compose/04-private-homelab/.env"
OBS_ENV="${TARGET_REPO}/infra/compose/05-observability-ops/.env"

# Load defaults from existing .env or sane host detection
DEF_DOMAIN="$(read_env_val "${ROOT_ENV}" EGGMAN_DOMAIN)"; DEF_DOMAIN="${DEF_DOMAIN:-eggmanstudios.me}"
DEF_ORG="$(read_env_val "${ROOT_ENV}" EGGMAN_ORG)"; DEF_ORG="${DEF_ORG:-EggmanStudios5}"
DEF_TS_IP="$(read_env_val "${ROOT_ENV}" TAILSCALE_IP)"; DEF_TS_IP="${DEF_TS_IP:-${DETECTED_TS_IP:-100.64.0.10}}"
DEF_IOT_IP="$(read_env_val "${ROOT_ENV}" IOT_VLAN_IP)"; DEF_IOT_IP="${DEF_IOT_IP:-${DETECTED_LAN_IP:-192.168.50.10}}"
DEF_IOT_CIDR="$(read_env_val "${ROOT_ENV}" IOT_VLAN_CIDR)"; DEF_IOT_CIDR="${DEF_IOT_CIDR:-192.168.50.0/24}"
DEF_ADMIN_USER="$(read_env_val "${ROOT_ENV}" EGGMAN_ADMIN_USER)"; DEF_ADMIN_USER="${DEF_ADMIN_USER:-eggman-ops}"
DEF_DATA_ROOT="$(read_env_val "${ROOT_ENV}" EGGMAN_DATA_ROOT)"; DEF_DATA_ROOT="${DEF_DATA_ROOT:-/srv/eggman/data}"
DEF_SECRETS_ROOT="$(read_env_val "${ROOT_ENV}" EGGMAN_SECRETS_ROOT)"; DEF_SECRETS_ROOT="${DEF_SECRETS_ROOT:-/srv/eggman/secrets}"
DEF_CERTS_ROOT="$(read_env_val "${ROOT_ENV}" EGGMAN_CERTS_ROOT)"; DEF_CERTS_ROOT="${DEF_CERTS_ROOT:-/srv/eggman/certs}"
DEF_RELEASES_ROOT="$(read_env_val "${ROOT_ENV}" EGGMAN_RELEASES_ROOT)"; DEF_RELEASES_ROOT="${DEF_RELEASES_ROOT:-/srv/eggman/releases}"

DEF_CF_TUNNEL="${CLOUDFLARED_TUNNEL_TOKEN:-$(read_env_val "${ROOT_ENV}" CLOUDFLARED_TUNNEL_TOKEN)}"
DEF_CF_DNS="${CLOUDFLARE_DNS_API_TOKEN:-$(read_env_val "${SEC_ENV}" CLOUDFLARE_DNS_API_TOKEN)}"
DEF_KC_ADMIN="$(read_env_val "${SEC_ENV}" KEYCLOAK_ADMIN)"; DEF_KC_ADMIN="${DEF_KC_ADMIN:-eggman-sec-admin}"
DEF_NC_ADMIN="$(read_env_val "${PRIV_ENV}" NEXTCLOUD_ADMIN_USER)"; DEF_NC_ADMIN="${DEF_NC_ADMIN:-eggman-nc-admin}"
DEF_RENDER_GID="$(read_env_val "${PRIV_ENV}" RENDER_GID)"; DEF_RENDER_GID="${DEF_RENDER_GID:-${DETECTED_RENDER_GID}}"

printf '\n--- Network & Host Settings (press Enter to accept defaults) ---\n'
EGGMAN_DOMAIN="$(prompt_value "Primary domain" "${DEF_DOMAIN}")"
EGGMAN_ORG="$(prompt_value "GitHub/Studio org" "${DEF_ORG}")"
TAILSCALE_IP="$(prompt_value "EliteDesk Tailscale IPv4" "${DEF_TS_IP}")"
IOT_VLAN_IP="$(prompt_value "EliteDesk LAN / IoT VLAN IPv4" "${DEF_IOT_IP}")"
IOT_VLAN_CIDR="$(prompt_value "IoT VLAN CIDR allowlist" "${DEF_IOT_CIDR}")"
EGGMAN_ADMIN_USER="$(prompt_value "Host admin username" "${DEF_ADMIN_USER}")"
RENDER_GID="$(prompt_value "GPU render group GID (Jellyfin)" "${DEF_RENDER_GID}")"
KEYCLOAK_ADMIN="$(prompt_value "Keycloak admin username" "${DEF_KC_ADMIN}")"
NEXTCLOUD_ADMIN_USER="$(prompt_value "Nextcloud admin username" "${DEF_NC_ADMIN}")"

printf '\n--- External Tokens (leave blank to fill later in .env) ---\n'
CLOUDFLARED_TUNNEL_TOKEN="$(prompt_value "Cloudflare Tunnel Token (Zone A)" "${DEF_CF_TUNNEL}" 1)"
CLOUDFLARE_DNS_API_TOKEN="$(prompt_value "Cloudflare DNS-01 API Token (Tailscale Caddy TLS)" "${DEF_CF_DNS}" 1)"

CLOUDFLARED_TUNNEL_TOKEN="${CLOUDFLARED_TUNNEL_TOKEN:-CHANGE_ME_FROM_VAULT_CF_TUNNEL_TOKEN}"
CLOUDFLARE_DNS_API_TOKEN="${CLOUDFLARE_DNS_API_TOKEN:-CHANGE_ME_FROM_VAULT_CF_DNS01_TOKEN}"

# Preserve existing non-placeholder secrets or auto-generate strong cryptographic ones
get_or_gen() {
  local existing
  existing="$(read_env_val "$1" "$2")"
  if [[ -n "${existing}" ]]; then
    printf '%s' "${existing}"
  else
    gen_secret
  fi
}

POSTGRES_PUBLIC_ADMIN_PASSWORD="$(get_or_gen "${DATA_ENV}" POSTGRES_PUBLIC_ADMIN_PASSWORD)"
KC_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" KC_DB_PASSWORD)"
RELEASEHUB_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" RELEASEHUB_DB_PASSWORD)"
VAULT_PG_PUB_PASSWORD="$(get_or_gen "${DATA_ENV}" VAULT_PG_PUB_PASSWORD)"
KEYCLOAK_ADMIN_PASSWORD="$(get_or_gen "${SEC_ENV}" KEYCLOAK_ADMIN_PASSWORD)"

POSTGRES_PRIVATE_ADMIN_PASSWORD="$(get_or_gen "${DATA_ENV}" POSTGRES_PRIVATE_ADMIN_PASSWORD)"
NEXTCLOUD_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" NEXTCLOUD_DB_PASSWORD)"
NEXTCLOUD_ADMIN_PASSWORD="$(get_or_gen "${PRIV_ENV}" NEXTCLOUD_ADMIN_PASSWORD)"
NEXTCLOUD_REDIS_PASSWORD="$(get_or_gen "${PRIV_ENV}" NEXTCLOUD_REDIS_PASSWORD)"
IMMICH_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" IMMICH_DB_PASSWORD)"
IMMICH_REDIS_PASSWORD="$(get_or_gen "${PRIV_ENV}" IMMICH_REDIS_PASSWORD)"
FORGEJO_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" FORGEJO_DB_PASSWORD)"
IOT_BRIDGE_DB_PASSWORD="$(get_or_gen "${DATA_ENV}" IOT_BRIDGE_DB_PASSWORD)"
VAULT_PG_PRIV_PASSWORD="$(get_or_gen "${DATA_ENV}" VAULT_PG_PRIV_PASSWORD)"
RABBITMQ_ERLANG_COOKIE="$(get_or_gen "${DATA_ENV}" RABBITMQ_ERLANG_COOKIE)"
IOT_DEVICE_HMAC_SECRET="$(get_or_gen "${PRIV_ENV}" IOT_DEVICE_HMAC_SECRET)"

cat > "${ROOT_ENV}" <<EOF
EGGMAN_DOMAIN=${EGGMAN_DOMAIN}
EGGMAN_ORG=${EGGMAN_ORG}
TAILSCALE_IP=${TAILSCALE_IP}
IOT_VLAN_IP=${IOT_VLAN_IP}
IOT_VLAN_CIDR=${IOT_VLAN_CIDR}
EGGMAN_ADMIN_USER=${EGGMAN_ADMIN_USER}
EGGMAN_DATA_ROOT=${DEF_DATA_ROOT}
EGGMAN_SECRETS_ROOT=${DEF_SECRETS_ROOT}
EGGMAN_CERTS_ROOT=${DEF_CERTS_ROOT}
EGGMAN_RELEASES_ROOT=${DEF_RELEASES_ROOT}
CLOUDFLARED_TUNNEL_TOKEN=${CLOUDFLARED_TUNNEL_TOKEN}
DOTNET_IMAGE_TAG=9.0
EOF

cat > "${SEC_ENV}" <<EOF
TAILSCALE_IP=${TAILSCALE_IP}
EGGMAN_DATA_ROOT=${DEF_DATA_ROOT}
EGGMAN_CERTS_ROOT=${DEF_CERTS_ROOT}
KC_DB_PASSWORD=${KC_DB_PASSWORD}
KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
CLOUDFLARE_DNS_API_TOKEN=${CLOUDFLARE_DNS_API_TOKEN}
EOF

cat > "${DATA_ENV}" <<EOF
EGGMAN_DATA_ROOT=${DEF_DATA_ROOT}
EGGMAN_SECRETS_ROOT=${DEF_SECRETS_ROOT}
EGGMAN_CERTS_ROOT=${DEF_CERTS_ROOT}
POSTGRES_PUBLIC_ADMIN_PASSWORD=${POSTGRES_PUBLIC_ADMIN_PASSWORD}
KC_DB_PASSWORD=${KC_DB_PASSWORD}
RELEASEHUB_DB_PASSWORD=${RELEASEHUB_DB_PASSWORD}
VAULT_PG_PUB_PASSWORD=${VAULT_PG_PUB_PASSWORD}
POSTGRES_PRIVATE_ADMIN_PASSWORD=${POSTGRES_PRIVATE_ADMIN_PASSWORD}
NEXTCLOUD_DB_PASSWORD=${NEXTCLOUD_DB_PASSWORD}
IMMICH_DB_PASSWORD=${IMMICH_DB_PASSWORD}
FORGEJO_DB_PASSWORD=${FORGEJO_DB_PASSWORD}
IOT_BRIDGE_DB_PASSWORD=${IOT_BRIDGE_DB_PASSWORD}
VAULT_PG_PRIV_PASSWORD=${VAULT_PG_PRIV_PASSWORD}
RABBITMQ_ERLANG_COOKIE=${RABBITMQ_ERLANG_COOKIE}
EOF

cat > "${PUB_ENV}" <<EOF
CLOUDFLARED_TUNNEL_TOKEN=${CLOUDFLARED_TUNNEL_TOKEN}
EGGMAN_CERTS_ROOT=${DEF_CERTS_ROOT}
EGGMAN_SECRETS_ROOT=${DEF_SECRETS_ROOT}
EGGMAN_RELEASES_ROOT=${DEF_RELEASES_ROOT}
EOF

cat > "${PRIV_ENV}" <<EOF
EGGMAN_DATA_ROOT=${DEF_DATA_ROOT}
EGGMAN_CERTS_ROOT=${DEF_CERTS_ROOT}
EGGMAN_SECRETS_ROOT=${DEF_SECRETS_ROOT}
IOT_VLAN_IP=${IOT_VLAN_IP}
RENDER_GID=${RENDER_GID}
NEXTCLOUD_DB_PASSWORD=${NEXTCLOUD_DB_PASSWORD}
NEXTCLOUD_ADMIN_USER=${NEXTCLOUD_ADMIN_USER}
NEXTCLOUD_ADMIN_PASSWORD=${NEXTCLOUD_ADMIN_PASSWORD}
NEXTCLOUD_REDIS_PASSWORD=${NEXTCLOUD_REDIS_PASSWORD}
IMMICH_DB_PASSWORD=${IMMICH_DB_PASSWORD}
IMMICH_REDIS_PASSWORD=${IMMICH_REDIS_PASSWORD}
FORGEJO_DB_PASSWORD=${FORGEJO_DB_PASSWORD}
IOT_DEVICE_HMAC_SECRET=${IOT_DEVICE_HMAC_SECRET}
EOF

cat > "${OBS_ENV}" <<EOF
EGGMAN_DATA_ROOT=${DEF_DATA_ROOT}
EOF

chmod 0600 "${ROOT_ENV}" "${SEC_ENV}" "${DATA_ENV}" "${PUB_ENV}" "${PRIV_ENV}" "${OBS_ENV}"
log "All 6 .env files written with 0600 permissions."

# 3. Initialize Zero Trust networks & internal PKI certificates
log "3/7 Creating 13 isolated Docker networks & generating internal TLS 1.3 PKI..."
"${TARGET_REPO}/scripts/init-networks.sh"
EGGMAN_CERTS_ROOT="${DEF_CERTS_ROOT}" IOT_VLAN_IP="${IOT_VLAN_IP}" "${TARGET_REPO}/scripts/gen-internal-certs.sh"

# 4. Download / build all container images up front
log "4/7 Pulling upstream images and building .NET/web containers..."
for s in 01-security 02-data-bus 03-public-edge 04-private-homelab 05-observability-ops; do
  docker compose --env-file "${ROOT_ENV}" --env-file "${TARGET_REPO}/infra/compose/${s}/.env" \
    -f "${TARGET_REPO}/infra/compose/${s}/compose.yml" pull --ignore-buildable || true
done
docker compose --env-file "${ROOT_ENV}" --env-file "${PUB_ENV}" \
  -f "${TARGET_REPO}/infra/compose/03-public-edge/compose.yml" build
docker compose --env-file "${ROOT_ENV}" --env-file "${PRIV_ENV}" \
  -f "${TARGET_REPO}/infra/compose/04-private-homelab/compose.yml" build eggman-iot-bridge

# 5. Boot Security Plane & Data Bus, bootstrap Vault + sync Redis ACLs + import Keycloak realm
log "5/7 Booting 01-security and initializing Vault..."
docker compose --env-file "${ROOT_ENV}" --env-file "${SEC_ENV}" \
  -f "${TARGET_REPO}/infra/compose/01-security/compose.yml" up -d

for _ in $(seq 1 30); do
  if docker exec eggman-vault vault status -address=https://127.0.0.1:8200 -ca-cert=/vault/certs/ca.crt >/dev/null 2>&1 || [[ $? -eq 2 ]]; then
    break
  fi
  sleep 2
done

EGGMAN_SECRETS_ROOT="${DEF_SECRETS_ROOT}" EGGMAN_CERTS_ROOT="${DEF_CERTS_ROOT}" \
  "${TARGET_REPO}/scripts/bootstrap-vault.sh"

# Sync Vault-generated Redis ACL passwords into 04-private-homelab/.env
if [[ -f "${DEF_SECRETS_ROOT}/vault-init.json" ]]; then
  ROOT_VAULT_TOKEN="$(jq -r '.root_token' "${DEF_SECRETS_ROOT}/vault-init.json")"
  SYNC_NC_REDIS="$(docker exec -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_CACERT=/vault/certs/ca.crt -e VAULT_TOKEN="${ROOT_VAULT_TOKEN}" eggman-vault vault kv get -field=nextcloud secret/private/redis 2>/dev/null || true)"
  SYNC_IM_REDIS="$(docker exec -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_CACERT=/vault/certs/ca.crt -e VAULT_TOKEN="${ROOT_VAULT_TOKEN}" eggman-vault vault kv get -field=immich secret/private/redis 2>/dev/null || true)"
  if [[ -n "${SYNC_NC_REDIS}" ]]; then
    sed -i "s|^NEXTCLOUD_REDIS_PASSWORD=.*|NEXTCLOUD_REDIS_PASSWORD=${SYNC_NC_REDIS}|" "${PRIV_ENV}"
  fi
  if [[ -n "${SYNC_IM_REDIS}" ]]; then
    sed -i "s|^IMMICH_REDIS_PASSWORD=.*|IMMICH_REDIS_PASSWORD=${SYNC_IM_REDIS}|" "${PRIV_ENV}"
  fi
fi

log "6/7 Booting 02-data-bus, configuring Vault dynamic DB/RMQ engines & importing Keycloak realm..."
docker compose --env-file "${ROOT_ENV}" --env-file "${DATA_ENV}" \
  -f "${TARGET_REPO}/infra/compose/02-data-bus/compose.yml" up -d

for _ in $(seq 1 40); do
  if docker inspect -f '{{.State.Health.Status}}' eggman-postgres-public 2>/dev/null | grep -q healthy \
     && docker inspect -f '{{.State.Health.Status}}' eggman-postgres-private 2>/dev/null | grep -q healthy \
     && docker inspect -f '{{.State.Health.Status}}' eggman-rabbitmq 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 3
done

EGGMAN_SECRETS_ROOT="${DEF_SECRETS_ROOT}" EGGMAN_CERTS_ROOT="${DEF_CERTS_ROOT}" \
  "${TARGET_REPO}/scripts/bootstrap-vault.sh" --configure-engines

# Wait for Keycloak before realm import
for _ in $(seq 1 40); do
  if docker inspect -f '{{.State.Health.Status}}' eggman-keycloak 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 3
done

if [[ -f "${TARGET_REPO}/infra/compose/01-security/keycloak/realm-eggman.json" ]]; then
  set -a && source "${SEC_ENV}" && set +a
  EGGMAN_CERTS_ROOT="${DEF_CERTS_ROOT}" "${TARGET_REPO}/scripts/import-keycloak-realm.sh" || \
    warn "Keycloak realm import deferred (ensure Split-DNS/ACME cert for auth-admin.${EGGMAN_DOMAIN} is ready, then re-run ./scripts/import-keycloak-realm.sh)."
fi

# 7. Start all remaining stacks + verify posture
log "7/7 Starting all stacks and running Zero Trust host verification..."
"${TARGET_REPO}/scripts/start-all.sh"
"${TARGET_REPO}/scripts/verify-zero-trust.sh" --live || true
"${TARGET_REPO}/scripts/verify-zero-trust-on-host.sh" || warn "Review any failed checks above once containers finish warming up."

cat <<EOF

=== Eggman Studios Setup Complete ===
Save these initial admin credentials offline in your password manager, then shred ${DEF_SECRETS_ROOT}/vault-init.json:
  Keycloak Admin User : ${KEYCLOAK_ADMIN}
  Keycloak Admin Pass : ${KEYCLOAK_ADMIN_PASSWORD}
  Nextcloud Admin User: ${NEXTCLOUD_ADMIN_USER}
  Nextcloud Admin Pass: ${NEXTCLOUD_ADMIN_PASSWORD}
  Tailscale SSH       : ssh -i ~/.ssh/id_ed25519 ${EGGMAN_ADMIN_USER}@${TAILSCALE_IP}

To start/restart the entire platform later, run:
  sudo ${TARGET_REPO}/scripts/start-all.sh
EOF
