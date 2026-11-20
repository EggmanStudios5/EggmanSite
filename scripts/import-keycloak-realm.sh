#!/usr/bin/env bash
# Imports realm-eggman-public.json into Keycloak using Admin REST API via Tailscale/internal TLS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REALM_FILE="${REPO_ROOT}/infra/compose/01-security/keycloak/realm-eggman.json"
KEYCLOAK_ADMIN_URL="${KEYCLOAK_ADMIN_URL:-https://auth-admin.eggmanstudios.me}"
KEYCLOAK_ADMIN_USER="${KEYCLOAK_ADMIN:-eggman-sec-admin}"

if [[ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]]; then
  printf '[import-keycloak][ERROR] Export KEYCLOAK_ADMIN_PASSWORD before running.\n' >&2
  exit 1
fi

TOKEN="$(curl -fsSL --cacert "${EGGMAN_CERTS_ROOT:-/srv/eggman/certs}/ca/ca.crt" \
  -X POST "${KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN_USER}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')"

if [[ -z "${TOKEN}" || "${TOKEN}" == "null" ]]; then
  printf '[import-keycloak][ERROR] Failed to obtain Keycloak Admin token.\n' >&2
  exit 1
fi

STATUS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  --cacert "${EGGMAN_CERTS_ROOT:-/srv/eggman/certs}/ca/ca.crt" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_ADMIN_URL}/admin/realms/eggman-public")"

if [[ "${STATUS_CODE}" == "200" ]]; then
  printf '[import-keycloak] Realm eggman-public already exists; skipping destructive overwrite.\n'
else
  printf '[import-keycloak] Creating realm eggman-public...\n'
  curl -fsSL --cacert "${EGGMAN_CERTS_ROOT:-/srv/eggman/certs}/ca/ca.crt" \
    -X POST "${KEYCLOAK_ADMIN_URL}/admin/realms" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary "@${REALM_FILE}"
fi

printf '[import-keycloak] Done. Rotate confidential client secrets via Vault + Keycloak Admin Console.\n'
