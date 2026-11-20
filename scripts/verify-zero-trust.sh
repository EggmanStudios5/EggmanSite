#!/usr/bin/env bash
# Zero Trust Verification Script (--static for repo/Compose audits, --live for EliteDesk host checks).
set -euo pipefail

MODE="${1:---static}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PASS=0
FAIL=0

ok()   { printf '[PASS] %s\n' "$*"; PASS=$((PASS + 1)); }
fail() { printf '[FAIL] %s\n' "$*" >&2; FAIL=$((FAIL + 1)); }

printf '=== Eggman Zero Trust Verification (%s) ===\n' "${MODE}"

# 1. Forbidden legacy/insecure pattern scan (constructed dynamically to avoid self-matching)
PAT_1="$(printf 'filip%s' 'vastl005')"
PAT_2="$(printf 'cdn.%s' 'jsdelivr.net')"
PAT_3="$(printf 'email%s' 'js')"
PAT_4="$(printf 'fonts.%s' 'googleapis.com')"
PAT_5="$(printf 'dock%s' 'ge')"
PAT_6="$(printf 'ServerCertificate%s' 'CustomValidationCallback')"
PAT_7="$(printf 'Insecure%s' 'SkipVerify')"
PAT_8="$(printf 'tls_insecure_%s' 'skip_verify')"
PAT_9="$(printf 'AllowAny%s' 'Origin')"

SCAN_PATTERNS="${PAT_1}|${PAT_2}|${PAT_3}|${PAT_4}|${PAT_5}|${PAT_6}|${PAT_7}|${PAT_8}|${PAT_9}"

if grep -rnIiE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=bin --exclude-dir=obj --exclude-dir=dist --exclude-dir=.astro "${SCAN_PATTERNS}" "${REPO_ROOT}"; then
  fail "Forbidden legacy/insecure patterns detected in repository."
else
  ok "Zero forbidden legacy handles, external CDNs, docker-socket GUIs, wildcard CORS, or TLS bypasses found."
fi

# 2. Validate Compose Zero Trust lockdown, network isolation, and 16GB RAM budget
if python3 - "${REPO_ROOT}" <<'PYEOF'
import glob, os, re, sys, yaml

repo_root = sys.argv[1]
compose_files = sorted(glob.glob(os.path.join(repo_root, "infra", "compose", "0*-*", "compose.yml")))
if len(compose_files) != 5:
    print(f"Expected 5 compose stack files, found {len(compose_files)}", file=sys.stderr)
    sys.exit(1)

with open(os.path.join(repo_root, "infra", "compose", "00-networks.yml"), "r", encoding="utf-8") as fh:
    net_reg = yaml.safe_load(fh).get("networks", {})

def parse_mem_mb(val):
    m = re.fullmatch(r"(\d+)([MG])", str(val).strip())
    if not m:
        raise ValueError(f"Invalid memory limit format: {val}")
    num, unit = int(m.group(1)), m.group(2)
    return num * 1024 if unit == "G" else num

total_mb = 0
errors = []

for path in compose_files:
    stack = os.path.basename(os.path.dirname(path))
    with open(path, "r", encoding="utf-8") as fh:
        doc = yaml.safe_load(fh)
    services = doc.get("services", {})
    for svc_name, svc in services.items():
        # Must run non-root
        user = str(svc.get("user", ""))
        if not user or user == "0" or user.startswith("0:") or user == "root":
            errors.append(f"{stack}/{svc_name}: missing or root user '{user}'")
        # Must be read_only
        if svc.get("read_only") is not True:
            errors.append(f"{stack}/{svc_name}: read_only must be true")
        # Must drop ALL caps and forbid privileged
        if svc.get("privileged") is True:
            errors.append(f"{stack}/{svc_name}: privileged:true is forbidden")
        if svc.get("cap_drop") != ["ALL"]:
            errors.append(f"{stack}/{svc_name}: cap_drop must be ['ALL']")
        if svc.get("cap_add"):
            errors.append(f"{stack}/{svc_name}: cap_add must be omitted")
        if "no-new-privileges:true" not in svc.get("security_opt", []):
            errors.append(f"{stack}/{svc_name}: missing no-new-privileges:true")
        # Forbid docker.sock and shared parent AppRole mounts
        for vol in svc.get("volumes", []):
            vol_str = str(vol)
            if "docker.sock" in vol_str:
                errors.append(f"{stack}/{svc_name}: docker.sock mount forbidden")
            if re.search(r"approle:/run/secrets/approle(?::|$)", vol_str):
                errors.append(f"{stack}/{svc_name}: shared parent approle mount forbidden; must isolate per-service subdirectory ({vol_str})")
        # Validate port bindings (never 0.0.0.0 or unqualified host ports)
        for p in svc.get("ports", []):
            p_str = str(p)
            if p_str.startswith("0.0.0.0:") or re.match(r"^\d+:\d+", p_str):
                errors.append(f"{stack}/{svc_name}: insecure host port binding '{p_str}'")
        # Validate pinned image tag (no :latest)
        img = str(svc.get("image", ""))
        if img.endswith(":latest") or (img and ":" not in img):
            errors.append(f"{stack}/{svc_name}: image tag must be pinned '{img}'")
        # Validate healthcheck & memory limits
        if "healthcheck" not in svc:
            errors.append(f"{stack}/{svc_name}: missing healthcheck")
        try:
            mem = svc["deploy"]["resources"]["limits"]["memory"]
            total_mb += parse_mem_mb(mem)
        except Exception as exc:
            errors.append(f"{stack}/{svc_name}: invalid/missing memory limit ({exc})")

        # Validate strict Zone A isolation
        nets = svc.get("networks", [])
        if isinstance(nets, dict):
            nets = list(nets.keys())
        for n in nets:
            if n not in net_reg:
                errors.append(f"{stack}/{svc_name}: undeclared network '{n}'")
        if stack == "03-public-edge":
            for n in nets:
                if n.startswith("net_private_") or n == "net_tailscale_admin":
                    errors.append(f"{stack}/{svc_name}: public edge bridged to private/admin network '{n}'")
            if svc_name != "cloudflared" and "net_public_tunnel" in nets:
                errors.append(f"{stack}/{svc_name}: only cloudflared may attach to net_public_tunnel")

# Include host beszel-agent 32M unit in 16GB budget assertion
total_with_host_agent_mb = total_mb + 32
if total_with_host_agent_mb > 12000:
    errors.append(f"Total memory cap {total_with_host_agent_mb}M exceeds 12000M safety threshold for 16GB EliteDesk")

if errors:
    for e in errors:
        print(f"POLICY ERROR: {e}", file=sys.stderr)
    sys.exit(1)

print(f"Verified 5 Compose stacks: {total_mb} MB containers + 32 MB host agent = {total_with_host_agent_mb} MB ({total_with_host_agent_mb/1024:.2f} GiB)")
PYEOF
then
  ok "All 5 Compose stacks comply with container lockdown, Zone A/B isolation, and 16GB RAM budget."
else
  fail "Compose Zero Trust policy validation failed."
fi

# 3. Live host verification (when --live passed on EliteDesk)
if [[ "${MODE}" == "--live" ]]; then
  if ss -tulpn | grep -E '0\.0\.0\.0:(22|80|443|5432|6379|5671|8200|15671)\b' >/dev/null; then
    fail "Detected unexpected 0.0.0.0 listening sockets on protected ports!"
  else
    ok "No protected services listening on 0.0.0.0."
  fi

  if docker ps -q | xargs -r docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}} {{end}}' | grep -q 'docker.sock'; then
    fail "Running container has docker.sock mounted!"
  else
    ok "Zero running containers mount docker.sock."
  fi

  if sudo ufw status | grep -q 'Status: active'; then
    ok "UFW firewall is active."
  else
    fail "UFW firewall is NOT active."
  fi
fi

printf '=== Summary: %d PASSED, %d FAILED ===\n' "${PASS}" "${FAIL}"
[[ "${FAIL}" -eq 0 ]]
