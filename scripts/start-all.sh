#!/usr/bin/env bash
# Starts the entire Eggman Studios Zero Trust platform in strict dependency order:
#   00-networks -> 01-security (unseals Vault if needed) -> 02-data-bus ->
#   03-public-edge -> 04-private-homelab -> 05-observability-ops -> beszel-agent
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_ENV="${REPO_ROOT}/.env"

log()  { printf '[start-all] %s\n' "$*"; }
warn() { printf '[start-all][WARN] %s\n' "$*" >&2; }
die()  { printf '[start-all][FATAL] %s\n' "$*" >&2; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  die "Run as root: sudo $0"
fi

[[ -f "${ROOT_ENV}" ]] || die "Missing ${ROOT_ENV}. Run sudo ./scripts/setup-all.sh first."
set -a && source "${ROOT_ENV}" && set +a
SECRETS_ROOT="${EGGMAN_SECRETS_ROOT:-/srv/eggman/secrets}"

start_stack() {
  local stack="$1"
  local stack_env="${REPO_ROOT}/infra/compose/${stack}/.env"
  local compose_file="${REPO_ROOT}/infra/compose/${stack}/compose.yml"
  [[ -f "${stack_env}" ]] || die "Missing ${stack_env}. Run sudo ./scripts/setup-all.sh first."

  if systemctl list-unit-files "eggman-stack-${stack}.service" >/dev/null 2>&1 \
     && systemctl list-unit-files "eggman-stack-${stack}.service" | grep -q "eggman-stack-${stack}.service"; then
    log "Starting systemd unit eggman-stack-${stack}.service..."
    systemctl start "eggman-stack-${stack}.service"
  else
    log "Starting Compose stack ${stack}..."
    docker compose --env-file "${ROOT_ENV}" --env-file "${stack_env}" -f "${compose_file}" up -d --remove-orphans
  fi
}

unseal_vault_if_needed() {
  for _ in $(seq 1 20); do
    if docker inspect eggman-vault >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  local sealed
  sealed="$(docker exec -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_CACERT=/vault/certs/ca.crt \
    eggman-vault vault status -format=json 2>/dev/null | jq -r '.sealed // empty' || true)"

  if [[ "${sealed}" != "true" ]]; then
    log "Vault is already unsealed."
    return 0
  fi

  local init_file="${SECRETS_ROOT}/vault-init.json"
  if [[ -f "${init_file}" ]]; then
    log "Unsealing Vault using local Shamir shares (threshold 3)..."
    for i in 0 1 2; do
      local key
      key="$(jq -r ".unseal_keys_b64[${i}]" "${init_file}")"
      docker exec -i -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_CACERT=/vault/certs/ca.crt \
        eggman-vault vault operator unseal "${key}" >/dev/null
    done
    return 0
  fi

  warn "Vault is sealed and ${init_file} has been shredded."
  for i in 1 2 3; do
    local key
    read -r -s -p "[start-all] Enter Vault unseal key ${i}/3: " key
    printf '\n'
    docker exec -i -e VAULT_ADDR=https://127.0.0.1:8200 -e VAULT_CACERT=/vault/certs/ca.crt \
      eggman-vault vault operator unseal "${key}" >/dev/null
  done
}

wait_healthy() {
  local container="$1"
  local attempts="${2:-30}"
  for _ in $(seq 1 "${attempts}"); do
    if docker inspect -f '{{.State.Health.Status}}' "${container}" 2>/dev/null | grep -q '^healthy$'; then
      return 0
    fi
    sleep 2
  done
  warn "Timed out waiting for ${container} to report healthy; continuing..."
}

log "1/6 Reconciling 13 canonical Zero Trust networks..."
"${REPO_ROOT}/scripts/init-networks.sh"

log "2/6 Starting 01-security..."
start_stack "01-security"
unseal_vault_if_needed

log "3/6 Starting 02-data-bus..."
start_stack "02-data-bus"
wait_healthy "eggman-postgres-public" 30
wait_healthy "eggman-postgres-private" 30
wait_healthy "eggman-rabbitmq" 30

log "4/6 Starting 03-public-edge..."
start_stack "03-public-edge"

log "5/6 Starting 04-private-homelab..."
start_stack "04-private-homelab"

log "6/6 Starting 05-observability-ops & host beszel-agent..."
start_stack "05-observability-ops"
if systemctl list-unit-files beszel-agent.service 2>/dev/null | grep -q 'beszel-agent.service'; then
  systemctl start beszel-agent.service || warn "Failed to start beszel-agent.service"
fi

log "All Eggman Studios services started:"
docker ps --format "table {{.Names}}\t{{.Status}}"
