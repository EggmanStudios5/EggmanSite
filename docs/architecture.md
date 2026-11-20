# Eggman Platform — Zero Trust Architecture & Operations Runbook

## 1. Trust Zone Topology

- **Zone A (`03-public-edge`)**: Inbound via Cloudflare Tunnel (`cloudflared` on `net_public_tunnel` + `net_public_ingress`) -> `Eggman.Gateway.Yarp` -> `web-landing`, `web-docs`, `Eggman.ReleaseHub`. Every Zone A application container sits exclusively on `internal: true` networks with zero outbound internet egress.
- **Zone B (`04-private-homelab`, `05-observability-ops`)**: Accessible exclusively via Tailscale Split-DNS (`tailscale0` -> `tailscale-proxy` Caddy on `${TAILSCALE_IP}:443`). LAN IoT devices communicate only with `Eggman.IoT.Bridge` (`${IOT_VLAN_IP}:8443`) using TLS + per-device HMAC-SHA256 + timestamp/nonce replay protection.
- **Zone C (`01-security`)**: HashiCorp Vault (`256 MB`, Raft storage, TLS-only, AppRole + dynamic DB/RMQ creds + internal PKI) and Keycloak (`1024 MB`, `-Xmx768m`, split admin hostname `auth-admin.eggmanstudios.me` unreachable via Zone A).
- **Zone D (`02-data-bus`)**: Strictly two PostgreSQL instances (`postgres-public` `512 MB`, `postgres-private` `768 MB` VectorChord), ACL-isolated TLS Redis (`320 MB`), and TLS-only RabbitMQ (`512 MB`) with vhost isolation (`/public-events`, `/private-iot`, reserved `/private-jarvis`).

## 2. Public vs. Private Subdomain Split

- **Public (Cloudflare Tunnel -> YARP):**
  - `eggmanstudios.me` -> `web-landing`
  - `docs.eggmanstudios.me` -> `web-docs`
  - `releases.eggmanstudios.me`, `altstore.eggmanstudios.me` -> `Eggman.ReleaseHub`
  - `auth.eggmanstudios.me` -> Keycloak `/realms/eggman-public/*` only (`/admin*` & `/realms/master*` hard-blocked `403`)
  - `status.eggmanstudios.me` -> Uptime Kuma read-only `/status/*` over isolated `net_public_status`
- **Private Tailscale Split-DNS (NXDOMAIN publicly):**
  - `home.`, `drive.`, `photos.`, `media.`, `music.`, `git.`, `iot.`, `notify.`, `monitor.`, `uptime.`, `vault.`, `auth-admin.`, `mq.` `.eggmanstudios.me`

## 3. Vault Unseal & Disaster Recovery SOP

1. Store Vault Shamir unseal shares and root recovery key offline (hardware-encrypted password manager / YubiKey), never on `/srv/eggman` or in Git.
2. On EliteDesk reboot, Vault starts sealed in `01-security`. Connect via Tailscale, run `vault operator unseal` (threshold 3-of-5) or via `https://vault.eggmanstudios.me`, then verify dynamic DB/RMQ credentials renew automatically in `Eggman.ReleaseHub` and `Eggman.IoT.Bridge`.
3. Backup `/srv/eggman/data/` (Vault Raft snapshot + `pg_dumpall` encrypted with `age`) to off-box encrypted storage on a scheduled timer.
