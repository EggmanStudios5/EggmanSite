#!/usr/bin/env bash
# Zero Trust Resumable Chunked Release Publisher for Eggman.ReleaseHub (Cloudflare 100MB bypass).
# Slices large .ipa, firmware, or game builds into <= 50MB chunks, authenticates against Keycloak,
# streams each chunk with retries over strict TLS, and finalizes atomic server-side SHA-256 verification.
set -euo pipefail
umask 077

BASE_URL="${EGGMAN_RELEASEHUB_URL:-https://releases.eggmanstudios.me}"
AUTH_URL="${EGGMAN_AUTH_URL:-https://auth.eggmanstudios.me/realms/eggman-public/protocol/openid-connect/token}"
CLIENT_ID="${EGGMAN_CLIENT_ID:-eggman-releasehub-ci}"
CHUNK_SIZE_MB=50
MAX_RETRIES=5
CACERT_PATH="${SSL_CERT_FILE:-}"
FILE_PATH=""
APP_SLUG=""
VERSION=""
PLATFORM=""
DESCRIPTION=""

usage() {
  cat <<'EOF'
Usage: publish-release.sh --file <path> --slug <slug> --version <semver> --platform <platform> [options]

Options:
  --file <path>           Artifact file to publish (.ipa, .tar.gz, .zip, .hex, .bin)
  --slug <slug>           App/product slug (e.g., eggman-companion, slunicka, macro-3x3-usb)
  --version <semver>      Semantic version (e.g., 1.2.0)
  --platform <platform>   ios | ipa | firmware | windows | linux | macos | cross-platform | games
  --description <text>    Release notes summary (optional)
  --chunk-size-mb <N>     Chunk size in MiB, 1..55 (default: 50; safely under 60MB YARP / 100MB CF caps)
  --base-url <url>        ReleaseHub base URL (default: https://releases.eggmanstudios.me)
  --auth-url <url>        Keycloak token endpoint URL
  --client-id <id>        Keycloak confidential client_id (default: eggman-releasehub-ci)
  --cacert <path>         Optional internal Root CA bundle for private/testing endpoints
  --max-retries <N>       Max upload retries per chunk (default: 5)

Authentication (provide ONE via environment, NEVER via CLI flags):
  KEYCLOAK_ACCESS_TOKEN   Pre-minted JWT carrying scope 'releases:publish'
  KEYCLOAK_CLIENT_SECRET  Confidential client secret for client_credentials grant
EOF
}

die()  { printf '[publish-release][ERROR] %s\n' "$*" >&2; exit 1; }
info() { printf '[publish-release] %s\n' "$*"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)          FILE_PATH="${2:-}"; shift 2 ;;
    --slug)          APP_SLUG="${2:-}"; shift 2 ;;
    --version)       VERSION="${2:-}"; shift 2 ;;
    --platform)      PLATFORM="${2:-}"; shift 2 ;;
    --description)   DESCRIPTION="${2:-}"; shift 2 ;;
    --chunk-size-mb) CHUNK_SIZE_MB="${2:-}"; shift 2 ;;
    --base-url)      BASE_URL="${2:-}"; shift 2 ;;
    --auth-url)      AUTH_URL="${2:-}"; shift 2 ;;
    --client-id)     CLIENT_ID="${2:-}"; shift 2 ;;
    --cacert)        CACERT_PATH="${2:-}"; shift 2 ;;
    --max-retries)   MAX_RETRIES="${2:-}"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *)               die "Unknown argument: $1" ;;
  esac
done

for cmd in curl split sha256sum jq stat mktemp; do
  command -v "${cmd}" >/dev/null 2>&1 || die "Required tool missing: ${cmd}"
done

[[ -n "${FILE_PATH}" && -f "${FILE_PATH}" && -r "${FILE_PATH}" ]] || die "Valid --file is required."
[[ -n "${APP_SLUG}" && -n "${VERSION}" && -n "${PLATFORM}" ]] || { usage >&2; die "--slug, --version, and --platform are required."; }
[[ "${CHUNK_SIZE_MB}" =~ ^[0-9]+$ && "${CHUNK_SIZE_MB}" -ge 1 && "${CHUNK_SIZE_MB}" -le 55 ]] || die "--chunk-size-mb must be 1..55."
[[ "${MAX_RETRIES}" =~ ^[0-9]+$ && "${MAX_RETRIES}" -ge 1 ]] || die "--max-retries must be >= 1."

BASE_URL="${BASE_URL%/}"
if [[ "${BASE_URL}" =~ ^http://(127\.0\.0\.1|localhost)(:|/|$) ]]; then
  CURL_TLS_ARGS=(--proto "=https,http" --proto-redir "=https")
else
  CURL_TLS_ARGS=(--proto "=https" --proto-redir "=https" --tlsv1.2)
fi
if [[ -n "${CACERT_PATH}" ]]; then
  [[ -r "${CACERT_PATH}" ]] || die "Unreadable --cacert file: ${CACERT_PATH}"
  CURL_TLS_ARGS+=(--cacert "${CACERT_PATH}")
fi

STAGING_DIR="$(mktemp -d)"
cleanup() { rm -rf "${STAGING_DIR}"; }
trap cleanup EXIT

TOKEN="${KEYCLOAK_ACCESS_TOKEN:-}"
if [[ -z "${TOKEN}" ]]; then
  [[ -n "${KEYCLOAK_CLIENT_SECRET:-}" ]] || die "Export KEYCLOAK_ACCESS_TOKEN or KEYCLOAK_CLIENT_SECRET."
  info "Authenticating client '${CLIENT_ID}' against Keycloak..."
  AUTH_CURL_TLS=(--proto "=https" --proto-redir "=https" --tlsv1.2)
  if [[ "${AUTH_URL}" =~ ^http://(127\.0\.0\.1|localhost)(:|/|$) ]]; then
    AUTH_CURL_TLS=(--proto "=https,http" --proto-redir "=https")
  fi
  if [[ -n "${CACERT_PATH}" ]]; then
    AUTH_CURL_TLS+=(--cacert "${CACERT_PATH}")
  fi
  TOKEN_RESP="$(curl -sS --fail-with-body "${AUTH_CURL_TLS[@]}" \
    -X POST "${AUTH_URL}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "scope=releases:publish" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "client_secret=${KEYCLOAK_CLIENT_SECRET}")" || die "Keycloak authentication failed."
  TOKEN="$(printf '%s' "${TOKEN_RESP}" | jq -r '.access_token // empty')"
  [[ -n "${TOKEN}" ]] || die "Keycloak response did not include access_token."
fi

[[ "${TOKEN}" != *$'\n'* && "${TOKEN}" != *$'\r'* && "${TOKEN}" != *'"'* ]] || die "Invalid characters in bearer token."

AUTH_CFG="${STAGING_DIR}/curl-auth.cfg"
printf 'header = "Authorization: Bearer %s"\n' "${TOKEN}" > "${AUTH_CFG}"
chmod 0600 "${AUTH_CFG}"

FILE_NAME="$(basename "${FILE_PATH}")"
TOTAL_SIZE="$(stat -c '%s' "${FILE_PATH}" 2>/dev/null || stat -f '%z' "${FILE_PATH}")"
EXPECTED_SHA256="$(sha256sum "${FILE_PATH}" | awk '{print $1}')"
CHUNK_BYTES=$((CHUNK_SIZE_MB * 1024 * 1024))

info "Slicing '${FILE_NAME}' (${TOTAL_SIZE} bytes, sha256=${EXPECTED_SHA256}) into ${CHUNK_SIZE_MB}MB chunks..."
split -b "${CHUNK_BYTES}" -d -a 6 "${FILE_PATH}" "${STAGING_DIR}/chunk-"
mapfile -t CHUNK_FILES < <(find "${STAGING_DIR}" -maxdepth 1 -type f -name 'chunk-*' | sort)
TOTAL_CHUNKS="${#CHUNK_FILES[@]}"
[[ "${TOTAL_CHUNKS}" -ge 1 ]] || die "Artifact produced 0 chunks."

INIT_PAYLOAD="$(jq -n \
  --arg slug "${APP_SLUG}" \
  --arg ver "${VERSION}" \
  --arg plat "${PLATFORM}" \
  --arg fname "${FILE_NAME}" \
  --argjson size "${TOTAL_SIZE}" \
  --argjson chunks "${TOTAL_CHUNKS}" \
  --arg sha "${EXPECTED_SHA256}" \
  --arg desc "${DESCRIPTION}" \
  '{
    appSlug: $slug,
    version: $ver,
    platform: $plat,
    fileName: $fname,
    totalSizeBytes: $size,
    totalChunks: $chunks,
    expectedSha256: $sha,
    description: (if $desc == "" then null else $desc end)
  }')"

info "Initializing upload session (${TOTAL_CHUNKS} chunk(s))..."
INIT_RESP_FILE="${STAGING_DIR}/init-resp.json"
INIT_CODE="$(curl -sS "${CURL_TLS_ARGS[@]}" -K "${AUTH_CFG}" \
  -o "${INIT_RESP_FILE}" -w '%{http_code}' \
  -X POST "${BASE_URL}/api/releases/uploads/init" \
  -H "Content-Type: application/json" \
  --data-binary "${INIT_PAYLOAD}")"
if [[ "${INIT_CODE}" != "201" ]]; then
  cat "${INIT_RESP_FILE}" >&2 || true
  die "Upload initialization failed with HTTP ${INIT_CODE}."
fi

UPLOAD_ID="$(jq -r '.uploadId // empty' "${INIT_RESP_FILE}")"
[[ -n "${UPLOAD_ID}" ]] || die "Missing uploadId in init response."
info "Session initialized: ${UPLOAD_ID}"

for idx in "${!CHUNK_FILES[@]}"; do
  chunk_file="${CHUNK_FILES[$idx]}"
  attempt=1
  while true; do
    chunk_resp_file="${STAGING_DIR}/chunk-resp.json"
    code="$(curl -sS "${CURL_TLS_ARGS[@]}" -K "${AUTH_CFG}" \
      -o "${chunk_resp_file}" -w '%{http_code}' \
      -X PUT "${BASE_URL}/api/releases/uploads/${UPLOAD_ID}/chunks/${idx}" \
      -H "Content-Type: application/octet-stream" \
      --data-binary "@${chunk_file}" || printf '000')"

    if [[ "${code}" == "200" ]]; then
      info "Uploaded chunk $((idx + 1))/${TOTAL_CHUNKS} (HTTP 200)"
      break
    elif [[ "${code}" == "400" || "${code}" == "401" || "${code}" == "403" || "${code}" == "404" || "${code}" == "410" || "${code}" == "413" ]]; then
      cat "${chunk_resp_file}" >&2 || true
      die "Chunk ${idx} rejected permanently with HTTP ${code}."
    fi

    if [[ "${attempt}" -ge "${MAX_RETRIES}" ]]; then
      cat "${chunk_resp_file}" >&2 || true
      die "Chunk ${idx} failed after ${MAX_RETRIES} attempts (last HTTP ${code})."
    fi
    backoff=$((attempt * 2))
    info "Chunk ${idx} transient error (HTTP ${code}); retrying in ${backoff}s (attempt ${attempt}/${MAX_RETRIES})..."
    sleep "${backoff}"
    attempt=$((attempt + 1))
  done
done

info "Completing upload and verifying server-side SHA-256 assembly..."
COMPLETE_RESP_FILE="${STAGING_DIR}/complete-resp.json"
COMPLETE_CODE="$(curl -sS "${CURL_TLS_ARGS[@]}" -K "${AUTH_CFG}" \
  -o "${COMPLETE_RESP_FILE}" -w '%{http_code}' \
  -X POST "${BASE_URL}/api/releases/uploads/${UPLOAD_ID}/complete")"
if [[ "${COMPLETE_CODE}" != "201" ]]; then
  cat "${COMPLETE_RESP_FILE}" >&2 || true
  die "Upload completion failed with HTTP ${COMPLETE_CODE}."
fi

info "Release published cleanly:"
jq . "${COMPLETE_RESP_FILE}"
