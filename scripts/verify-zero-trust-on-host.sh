#!/usr/bin/env bash
# Phase 5 On-Box Zero Trust Verification Script
# Execute directly on the HP EliteDesk 800 G1 SFF after stack deployment (as root / sudo).
set -euo pipefail

PASS=0
FAIL=0

ok()   { printf '[PASS] %s\n' "$*"; PASS=$((PASS + 1)); }
fail() { printf '[FAIL] %s\n' "$*" >&2; FAIL=$((FAIL + 1)); }
info() { printf '[INFO] %s\n' "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { fail "Missing required host binary: $1"; return 1; }
}

if [[ "${EUID}" -ne 0 ]]; then
  printf '[ERROR] Run this host audit with sudo / root privileges: sudo %s\n' "$0" >&2
  exit 1
fi

require_cmd ss
require_cmd ufw
require_cmd iptables
require_cmd docker
require_cmd python3
require_cmd sshd

printf '=== Eggman HP EliteDesk Live On-Box Zero Trust Audit ===\n'

# 1. Tailscale interface & SSH lockdown verification
TAILSCALE_IP="$(tailscale ip -4 2>/dev/null | head -n1 || true)"
if [[ "${TAILSCALE_IP}" =~ ^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.[0-9]+\.[0-9]+$ ]]; then
  ok "Verified active tailscale0 CGNAT IPv4 address: ${TAILSCALE_IP}"
else
  fail "Tailscale interface IPv4 missing or invalid: '${TAILSCALE_IP}'"
fi

SS_OUT="$(ss -tulpn)"

if printf '%s\n' "${SS_OUT}" | grep -E '(0\.0\.0\.0|\[::\]):22\b' >/dev/null; then
  fail "sshd is listening on wildcard 0.0.0.0:22 or [::]:22 (must bind strictly to tailscale0)"
elif [[ -n "${TAILSCALE_IP}" ]] && printf '%s\n' "${SS_OUT}" | grep -E "${TAILSCALE_IP}:22\b" >/dev/null; then
  ok "sshd is bound strictly to Tailscale IP ${TAILSCALE_IP}:22"
else
  fail "sshd is not listening on expected Tailscale IP ${TAILSCALE_IP:-<unknown>}:22"
fi

SSHD_EFFECTIVE="$(sshd -T 2>/dev/null || true)"
if printf '%s\n' "${SSHD_EFFECTIVE}" | grep -q '^passwordauthentication no$' \
   && printf '%s\n' "${SSHD_EFFECTIVE}" | grep -q '^permitrootlogin no$'; then
  ok "sshd enforces PasswordAuthentication no and PermitRootLogin no"
else
  fail "sshd effective configuration failed PasswordAuthentication/PermitRootLogin lockdown check"
fi

if printf '%s\n' "${SS_OUT}" | grep -E '(0\.0\.0\.0|\[::\]|\*):(80|443|5432|6379|5671|8200|15671|8096|2283|3000|3001|4533|8090|45876)\b' >/dev/null; then
  fail "Detected prohibited wildcard listener (0.0.0.0/[::]) on internal/private service port!"
else
  ok "Zero 0.0.0.0/[::] listeners on protected internal/private ports (80,443,5432,6379,5671,8200,15671,8096,2283,3000,3001,4533,8090,45876)"
fi

# 2. UFW & DOCKER-USER firewall lockdown checks
UFW_STATUS="$(ufw status verbose 2>/dev/null || true)"
if printf '%s\n' "${UFW_STATUS}" | grep -q 'Status: active' \
   && printf '%s\n' "${UFW_STATUS}" | grep -q 'Default: deny (incoming), deny (outgoing), deny (routed)'; then
  ok "UFW is active with default-deny incoming, outgoing, and routed policies"
else
  fail "UFW is inactive or missing default-deny incoming/outgoing/routed posture"
fi

DOCKER_USER_RULES="$(iptables -S DOCKER-USER 2>/dev/null || true)"
if printf '%s\n' "${DOCKER_USER_RULES}" | grep -q '172.28.16.0/20.*-j DROP' \
   && printf '%s\n' "${DOCKER_USER_RULES}" | grep -q '100.64.0.0/10.*-j DROP' \
   && printf '%s\n' "${DOCKER_USER_RULES}" | grep -q '192.168.0.0/16.*-j DROP'; then
  ok "DOCKER-USER iptables chain enforces Zone A -> Zone B/Tailscale/RFC1918 DROP isolation"
else
  fail "DOCKER-USER iptables chain missing Zone A egress DROP rules"
fi

# 3. Live lateral-movement containment probes from Zone A (03-public-edge)
if ! docker network inspect net_public_apps >/dev/null 2>&1; then
  fail "Canonical network net_public_apps does not exist (run ./scripts/init-networks.sh)"
else
  LAN_GW="$(ip -4 route show default | awk '/default/ {print $3; exit}' || true)"

  resolve_ip() {
    local c="$1"
    docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "${c}" 2>/dev/null | awk '{print $1}' || true
  }

  PG_PRIV_IP="$(resolve_ip eggman-postgres-private)"
  NEXTCLOUD_IP="$(resolve_ip eggman-nextcloud)"
  JELLYFIN_IP="$(resolve_ip eggman-jellyfin)"
  FORGEJO_IP="$(resolve_ip eggman-forgejo)"
  VAULT_IP="$(resolve_ip eggman-vault)"
  REDIS_IP="$(resolve_ip eggman-redis)"
  PLANE_IP="$(resolve_ip eggman-plane)"

  # Probe image: tiny read-only unprivileged busybox/alpine already available locally or pulled safely
  PROBE_IMG=""
  for candidate in "alpine:3.21" "busybox:1.37" "caddy:2.9.1-alpine" "redis:7.4.2-alpine"; do
    if docker image inspect "${candidate}" >/dev/null 2>&1; then
      PROBE_IMG="${candidate}"
      break
    fi
  done

  if [[ -z "${PROBE_IMG}" ]]; then
    PROBE_IMG="alpine:3.21"
    info "Pulling minimal probe image ${PROBE_IMG} for isolated Zone A containment verification..."
    docker pull -q "${PROBE_IMG}" >/dev/null 2>&1 || true
  fi

  probe_must_fail() {
    local net="$1"
    local target="$2"
    local port="$3"
    local label="$4"
    [[ -n "${target}" ]] || return 0
    if docker run --rm --network "${net}" --user 65534:65534 --cap-drop ALL --security-opt no-new-privileges:true --read-only \
         "${PROBE_IMG}" nc -z -w 2 "${target}" "${port}" >/dev/null 2>&1; then
      fail "LATERAL MOVEMENT BREACH: ${net} reached ${label} (${target}:${port})!"
    else
      ok "Containment verified: ${net} blocked from reaching ${label} (${target}:${port})"
    fi
  }

  probe_must_fail "net_public_apps" "eggman-postgres-private" "5432" "Postgres-Private (DNS)"
  probe_must_fail "net_public_apps" "${PG_PRIV_IP}"             "5432" "Postgres-Private (IP)"
  probe_must_fail "net_public_apps" "eggman-nextcloud"        "8080" "Nextcloud (DNS)"
  probe_must_fail "net_public_apps" "${NEXTCLOUD_IP}"           "8080" "Nextcloud (IP)"
  probe_must_fail "net_public_apps" "eggman-jellyfin"         "8096" "Jellyfin (DNS)"
  probe_must_fail "net_public_apps" "${JELLYFIN_IP}"            "8096" "Jellyfin (IP)"
  probe_must_fail "net_public_apps" "eggman-forgejo"          "3000" "Forgejo (DNS)"
  probe_must_fail "net_public_apps" "${FORGEJO_IP}"             "3000" "Forgejo (IP)"
  probe_must_fail "net_public_apps" "${PLANE_IP}"               "3000" "Plane (if present)"
  probe_must_fail "net_public_apps" "eggman-vault"            "8200" "Vault from net_public_apps (DNS)"
  probe_must_fail "net_public_apps" "${VAULT_IP}"               "8200" "Vault from net_public_apps (IP)"
  probe_must_fail "net_public_apps" "eggman-redis"            "6379" "Redis (DNS)"
  probe_must_fail "net_public_apps" "${REDIS_IP}"               "6379" "Redis (IP)"

  if docker network inspect net_public_tunnel >/dev/null 2>&1; then
    probe_must_fail "net_public_tunnel" "${TAILSCALE_IP}" "22"  "Host Tailscale SSH"
    probe_must_fail "net_public_tunnel" "${TAILSCALE_IP}" "443" "Host Tailscale Proxy"
    probe_must_fail "net_public_tunnel" "${LAN_GW}"       "80"  "Host LAN Gateway :80"
    probe_must_fail "net_public_tunnel" "${LAN_GW}"       "443" "Host LAN Gateway :443"
    probe_must_fail "net_public_tunnel" "${LAN_GW}"       "22"  "Host LAN Gateway :22"
  fi
fi

# 4. Inspect EVERY running container for Zero Trust posture & 16GB RAM budget
if python3 - <<'PYEOF'
import json, subprocess, sys

ids = subprocess.check_output(["docker", "ps", "-q"], text=True).split()
if not ids:
    print("WARN: No running Docker containers detected.", file=sys.stderr)
    sys.exit(1)

data = json.loads(subprocess.check_output(["docker", "inspect", *ids], text=True))
errors = []
total_mem_bytes = 0

for c in data:
    name = c["Name"].lstrip("/")
    cfg = c.get("Config", {})
    hcfg = c.get("HostConfig", {})

    user = str(cfg.get("User", ""))
    if not user or user == "0" or user.startswith("0:") or user == "root":
        errors.append(f"{name}: running as root/empty user '{user}'")
    if hcfg.get("Privileged") is True:
        errors.append(f"{name}: Privileged=true")
    if hcfg.get("ReadonlyRootfs") is not True:
        errors.append(f"{name}: ReadonlyRootfs!=true")
    if "ALL" not in (hcfg.get("CapDrop") or []):
        errors.append(f"{name}: CapDrop missing ALL")
    if hcfg.get("CapAdd"):
        errors.append(f"{name}: CapAdd non-empty ({hcfg.get('CapAdd')})")
    if not any("no-new-privileges" in s for s in (hcfg.get("SecurityOpt") or [])):
        errors.append(f"{name}: SecurityOpt missing no-new-privileges")

    for m in c.get("Mounts", []):
        src = str(m.get("Source", ""))
        if "docker.sock" in src:
            errors.append(f"{name}: forbidden docker.sock mount ({src})")
        if src.rstrip("/").endswith("/approle"):
            errors.append(f"{name}: shared parent approle mount ({src})")

    mem = int(hcfg.get("Memory") or 0)
    if mem <= 0:
        errors.append(f"{name}: missing hard Memory limit")
    total_mem_bytes += mem

total_mb = total_mem_bytes // (1024 * 1024)
if total_mb + 32 > 12000:
    errors.append(f"Total container memory limit {total_mb}M + 32M beszel-agent exceeds 12000M HP EliteDesk cap")

if errors:
    for err in errors:
        print(f"CONTAINER POLICY FAILURE: {err}", file=sys.stderr)
    sys.exit(1)

print(f"Verified {len(data)} running containers: all non-root, cap_drop=ALL, read_only=true, total cap={total_mb} MiB (+32 MiB host agent)")
PYEOF
then
  ok "All running containers enforce non-root, read_only, cap_drop=ALL, zero docker.sock, and <=12000M ceiling"
else
  fail "One or more running containers violated Zero Trust runtime constraints"
fi

# 5. Host Beszel Agent verification (no container docker.sock)
if systemctl is-active --quiet beszel-agent.service; then
  AGENT_USER="$(systemctl show -p User --value beszel-agent.service)"
  AGENT_MEM="$(systemctl show -p MemoryMax --value beszel-agent.service)"
  if [[ "${AGENT_USER}" == "beszel-agent" ]] && printf '%s\n' "${SS_OUT}" | grep -q '172\.28\.20\.1:45876'; then
    ok "Host beszel-agent active as '${AGENT_USER}' bound strictly to 172.28.20.1:45876 (MemoryMax=${AGENT_MEM})"
  else
    fail "Host beszel-agent user/listener mismatch (User=${AGENT_USER})"
  fi
else
  fail "Host beszel-agent.service is not active"
fi

info "Live container memory snapshot:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" || true

printf '=== On-Box Audit Summary: %d PASSED, %d FAILED ===\n' "${PASS}" "${FAIL}"
[[ "${FAIL}" -eq 0 ]]
