#!/usr/bin/env bash
# Creates the 13 canonical Zero Trust Docker networks via 00-networks.yml.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
NETWORKS_FILE="${REPO_ROOT}/infra/compose/00-networks.yml"

if ! command -v docker >/dev/null 2>&1; then
  printf '[init-networks][ERROR] docker CLI not found.\n' >&2
  exit 1
fi

printf '[init-networks] Reconciling canonical Zero Trust networks from %s...\n' "${NETWORKS_FILE}"
docker compose -f "${NETWORKS_FILE}" up --no-start --remove-orphans >/dev/null 2>&1 || true

# Ensure every bridge network in 00-networks.yml exists cleanly with configured driver options
python3 - "${NETWORKS_FILE}" <<'PYEOF'
import subprocess, sys, yaml

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    doc = yaml.safe_load(fh)

for name, cfg in doc.get("networks", {}).items():
    exists = subprocess.run(["docker", "network", "inspect", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if exists:
        print(f"[init-networks] Network exists: {name}")
        continue
    cmd = ["docker", "network", "create", "--driver", cfg.get("driver", "bridge")]
    if cfg.get("internal") is True:
        cmd.append("--internal")
    for k, v in cfg.get("driver_opts", {}).items():
        cmd.extend(["--opt", f"{k}={v}"])
    for ipam_cfg in cfg.get("ipam", {}).get("config", []):
        if "subnet" in ipam_cfg:
            cmd.extend(["--subnet", ipam_cfg["subnet"]])
    cmd.append(name)
    print(f"[init-networks] Creating network: {name}")
    subprocess.run(cmd, check=True)
PYEOF
