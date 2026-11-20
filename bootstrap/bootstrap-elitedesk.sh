#!/usr/bin/env bash
# On-console physical bootstrap script for HP EliteDesk 800 G1 SFF (16 GB RAM).
# Designed to run directly at the physical keyboard/monitor console — NO SSH required.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANSIBLE_DIR="${REPO_ROOT}/infra/ansible"

ADMIN_USER="${EGGMAN_ADMIN_USER:-eggman-ops}"
IOT_VLAN_CIDR="${IOT_VLAN_CIDR:-192.168.50.0/24}"
IOT_VLAN_IP="${IOT_VLAN_IP:-}"

log()  { printf '[bootstrap] %s\n' "$*"; }
warn() { printf '[bootstrap][WARN] %s\n' "$*" >&2; }
die()  { printf '[bootstrap][FATAL] %s\n' "$*" >&2; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  die "Run as root on the local physical console: sudo $0"
fi

if [[ ! -f /etc/os-release ]]; then
  die "Unsupported OS: /etc/os-release missing."
fi
# shellcheck source=/dev/null
source /etc/os-release
if [[ "${ID:-}" != "debian" && "${ID:-}" != "ubuntu" ]]; then
  die "Only Debian/Ubuntu hosts are supported (found ID=${ID:-unknown})."
fi

log "1/6 Installing minimal host bootstrap prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends \
  ansible \
  ca-certificates \
  curl \
  fail2ban \
  git \
  gnupg \
  jq \
  openssl \
  python3 \
  systemd-zram-generator \
  ufw

log "2/6 Installing Tailscale (if missing)..."
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL "https://pkgs.tailscale.com/stable/${ID}/${VERSION_CODENAME}.noarmor.gpg" \
    -o /usr/share/keyrings/tailscale-archive-keyring.gpg
  curl -fsSL "https://pkgs.tailscale.com/stable/${ID}/${VERSION_CODENAME}.tailscale-keyring.list" \
    -o /etc/apt/sources.list.d/tailscale.list
  apt-get update -qq
  apt-get install -y --no-install-recommends tailscale
fi
systemctl enable --now tailscaled

log "3/6 Ensuring Tailscale interface (tailscale0) is up (interactive auth if first run)..."
if ! tailscale ip -4 >/dev/null 2>&1; then
  log "Authenticate Tailscale in browser when prompted (OpenSSH enforces Ed25519 pubkey lockdown)..."
  tailscale up --ssh=false --accept-dns=false
fi

TAILSCALE_IP="$(tailscale ip -4 | head -n1)"
if [[ ! "${TAILSCALE_IP}" =~ ^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.[0-9]+\.[0-9]+$ ]]; then
  die "Invalid or missing Tailscale CGNAT IPv4 address: '${TAILSCALE_IP}'"
fi
log "Verified Tailscale IP: ${TAILSCALE_IP}"

log "4/6 Ensuring non-root admin user '${ADMIN_USER}' and Ed25519 SSH key exist BEFORE locking SSH..."
if ! id "${ADMIN_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --groups sudo "${ADMIN_USER}"
  log "Created user '${ADMIN_USER}'. Set a local sudo password if needed with: passwd ${ADMIN_USER}"
fi

ADMIN_HOME="$(getent passwd "${ADMIN_USER}" | cut -d: -f6)"
AUTH_KEYS="${ADMIN_HOME}/.ssh/authorized_keys"
install -d -m 0700 -o "${ADMIN_USER}" -g "${ADMIN_USER}" "${ADMIN_HOME}/.ssh"

if [[ ! -s "${AUTH_KEYS}" ]] || ! grep -qE '^(ssh-ed25519|sk-ssh-ed25519@openssh\.com)[[:space:]]' "${AUTH_KEYS}"; then
  warn "No Ed25519 SSH public key found at ${AUTH_KEYS}."
  warn "Paste your Ed25519 SSH public key (ssh-ed25519 ...) and press Enter:"
  read -r PUBKEY
  if [[ ! "${PUBKEY}" =~ ^(ssh-ed25519|sk-ssh-ed25519@openssh\.com)[[:space:]] ]]; then
    die "Invalid Ed25519 SSH public key format. Aborting BEFORE SSH lockdown."
  fi
  printf '%s\n' "${PUBKEY}" >> "${AUTH_KEYS}"
  chown "${ADMIN_USER}:${ADMIN_USER}" "${AUTH_KEYS}"
  chmod 0600 "${AUTH_KEYS}"
fi

if [[ -z "${IOT_VLAN_IP}" ]]; then
  IOT_VLAN_IP="$(ip -4 -o addr show scope global | awk '!/tailscale0|docker|br-|veth/ {split($4,a,"/"); print a[1]; exit}')"
  if [[ -z "${IOT_VLAN_IP}" ]]; then
    IOT_VLAN_IP="127.0.0.1"
    warn "Could not auto-detect LAN/IoT VLAN IP; defaulting IOT_VLAN_IP=${IOT_VLAN_IP} (update .env before deploying IoT Bridge)."
  fi
fi

log "5/6 Running local Ansible Zero Trust hardening playbook (-i localhost, -c local)..."
ANSIBLE_CONFIG="${ANSIBLE_DIR}/ansible.cfg" \
ansible-playbook \
  -i localhost, \
  -c local \
  "${ANSIBLE_DIR}/site.yml" \
  --extra-vars "tailscale_ip=${TAILSCALE_IP} iot_vlan_ip=${IOT_VLAN_IP} iot_vlan_cidr=${IOT_VLAN_CIDR} eggman_admin_user=${ADMIN_USER} eggman_repo_src=${REPO_ROOT}"

log "6/6 Bootstrap complete! Summary:"
cat <<EOF
  - Tailscale SSH bound strictly to : ${TAILSCALE_IP}:22 (Ed25519 key-only, root disabled)
  - LAN/IoT VLAN Bridge Target IP    : ${IOT_VLAN_IP}:8443 (from ${IOT_VLAN_CIDR})
  - Hardened Docker & UFW/DOCKER-USER: ACTIVE
  - Repository synced to             : /srv/eggman/repo

Next on-console steps (run as '${ADMIN_USER}' in /srv/eggman/repo):
  1. cp .env.example .env && chmod 0600 .env   # Fill TAILSCALE_IP=${TAILSCALE_IP}, IOT_VLAN_IP, CLOUDFLARED_TUNNEL_TOKEN
  2. ./scripts/init-networks.sh && ./scripts/gen-internal-certs.sh
  3. docker compose --env-file .env --env-file infra/compose/01-security/.env -f infra/compose/01-security/compose.yml up -d
  4. ./scripts/bootstrap-vault.sh
  5. docker compose --env-file .env --env-file infra/compose/02-data-bus/.env -f infra/compose/02-data-bus/compose.yml up -d
  6. ./scripts/bootstrap-vault.sh --configure-engines
  7. ./scripts/import-keycloak-realm.sh
  8. ansible-playbook -i localhost, -c local infra/ansible/playbooks/deploy-stacks.yml
EOF
