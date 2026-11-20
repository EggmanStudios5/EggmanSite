#!/usr/bin/env bash
# Generates internal Root CA and TLS 1.3 leaf certs with SANs under /srv/eggman/certs.
set -euo pipefail
umask 077

CERTS_ROOT="${EGGMAN_CERTS_ROOT:-/srv/eggman/certs}"
CA_DIR="${CERTS_ROOT}/ca"
DAYS_CA=3650
DAYS_LEAF=365

mkdir -p "${CA_DIR}"
chmod 0755 "${CERTS_ROOT}" "${CA_DIR}"

if [[ ! -f "${CA_DIR}/ca.key" || ! -f "${CA_DIR}/ca.crt" ]]; then
  printf '[gen-certs] Generating Eggman Internal Root CA...\n'
  openssl genrsa -out "${CA_DIR}/ca.key" 4096
  chmod 0600 "${CA_DIR}/ca.key"
  openssl req -x509 -new -nodes -key "${CA_DIR}/ca.key" -sha256 -days "${DAYS_CA}" \
    -subj "/C=CZ/O=Eggman Studios/CN=Eggman Internal Zero Trust CA" \
    -out "${CA_DIR}/ca.crt"
  chmod 0644 "${CA_DIR}/ca.crt"
fi

issue_cert() {
  local name="$1"
  local uid="$2"
  local gid="$3"
  shift 3
  local sans=("$@")
  local out_dir="${CERTS_ROOT}/${name}"
  mkdir -p "${out_dir}"
  cp "${CA_DIR}/ca.crt" "${out_dir}/ca.crt"

  local ext_file
  ext_file="$(mktemp)"
  {
    printf 'basicConstraints=CA:FALSE\n'
    printf 'keyUsage=digitalSignature,keyEncipherment\n'
    printf 'extendedKeyUsage=serverAuth,clientAuth\n'
    printf 'subjectAltName='
    local first=1
    for san in "${sans[@]}"; do
      if [[ "${first}" -eq 0 ]]; then printf ','; fi
      printf '%s' "${san}"
      first=0
    done
    printf '\n'
  } > "${ext_file}"

  if [[ ! -f "${out_dir}/tls.crt" || ! -f "${out_dir}/tls.key" ]]; then
    printf '[gen-certs] Issuing TLS cert for %s...\n' "${name}"
    openssl genrsa -out "${out_dir}/tls.key" 2048
    openssl req -new -key "${out_dir}/tls.key" -subj "/O=Eggman Studios/CN=${name}" -out "${out_dir}/tls.csr"
    openssl x509 -req -in "${out_dir}/tls.csr" -CA "${CA_DIR}/ca.crt" -CAkey "${CA_DIR}/ca.key" \
      -CAcreateserial -out "${out_dir}/tls.crt" -days "${DAYS_LEAF}" -sha256 -extfile "${ext_file}"
    rm -f "${out_dir}/tls.csr"
  fi
  rm -f "${ext_file}"

  chown -R "${uid}:${gid}" "${out_dir}" || true
  chmod 0750 "${out_dir}"
  chmod 0644 "${out_dir}/ca.crt" "${out_dir}/tls.crt"
  chmod 0600 "${out_dir}/tls.key"
}

issue_cert "vault"            100  1000 "DNS:eggman-vault" "DNS:vault" "DNS:vault.eggmanstudios.me" "DNS:localhost" "IP:127.0.0.1"
issue_cert "keycloak"         1000 1000 "DNS:eggman-keycloak" "DNS:keycloak" "DNS:auth.eggmanstudios.me" "DNS:auth-admin.eggmanstudios.me" "DNS:localhost"
issue_cert "postgres-public"  999  999  "DNS:eggman-postgres-public" "DNS:postgres-public" "DNS:localhost"
issue_cert "postgres-private" 999  999  "DNS:eggman-postgres-private" "DNS:postgres-private" "DNS:localhost"
issue_cert "redis"            999  999  "DNS:eggman-redis" "DNS:redis" "DNS:localhost"
issue_cert "rabbitmq"         999  999  "DNS:eggman-rabbitmq" "DNS:rabbitmq" "DNS:mq.eggmanstudios.me" "DNS:localhost"
issue_cert "yarp"             1654 1654 "DNS:eggman-gateway-yarp" "DNS:localhost"
issue_cert "releasehub"       1654 1654 "DNS:eggman-releasehub" "DNS:releases.eggmanstudios.me" "DNS:altstore.eggmanstudios.me" "DNS:localhost"
issue_cert "iot-bridge"       1654 1654 "DNS:eggman-iot-bridge" "DNS:iot.eggmanstudios.me" "DNS:localhost" "IP:${IOT_VLAN_IP:-127.0.0.1}"

printf '[gen-certs] Internal Zero Trust PKI ready under %s.\n' "${CERTS_ROOT}"
