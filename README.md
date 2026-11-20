# Eggman Studios — Sovereign Platform & Zero Trust Homelab

Canonical monorepo for **Eggman Studios** (`eggmanstudios.me`), unifying the public web properties, .NET 9 Aspire microservices, YARP Zero Trust edge gateway, HashiCorp Vault + Keycloak security plane, and HP EliteDesk 800 G1 SFF (16 GB RAM) self-hosted infrastructure.

---

## Trust Zone Architecture

| Stack | Zone | Services | Memory Ceiling |
| :--- | :--- | :--- | :---: |
| `infra/compose/01-security/` | **Core Security / Private Edge** | Keycloak (`-Xmx768m`), HashiCorp Vault, Tailscale Caddy Ingress Proxy | `1,408 MB` |
| `infra/compose/02-data-bus/` | **Data & Messaging Plane** | `postgres-public`, `postgres-private` (VectorChord), Redis (ACLs), RabbitMQ (AMQPS TLS) | `2,112 MB` |
| `infra/compose/03-public-edge/` | **Public Edge / DMZ (Cloudflare Tunnel)** | `cloudflared`, `Eggman.Gateway.Yarp`, `Eggman.ReleaseHub`, `web/landing`, `web/docs` | `768 MB` |
| `infra/compose/04-private-homelab/` | **Private Homelab (Tailscale-only)** | Nextcloud (+cron), Immich (+ML), Jellyfin, Navidrome, Forgejo, `Eggman.IoT.Bridge`, Homepage | `6,912 MB` |
| `infra/compose/05-observability-ops/` | **Observability & Alerting** | Beszel Hub (+ `32 MB` host systemd agent), Uptime Kuma, ntfy | `512 MB` |
| **Total Stack Ceiling** | **All 4 Zones** | **17 Services (20 Runtime Units)** | **`11,712 MB` (`11.44 GiB`)** |

See [docs/architecture.md](docs/architecture.md) for full network diagrams, Split-DNS routing, and blast-radius isolation proofs, and [docs/backlog.md](docs/backlog.md) for deferred services (Jarvis Backend, SPAYD QR, Plane, Prometheus/Grafana).

---

## Physical Console Bootstrap (No SSH Required Initially)

Run directly on the HP EliteDesk 800 G1 SFF console:

```bash
git clone https://github.com/EggmanStudios5/EggmanSite.git /srv/eggman/repo
cd /srv/eggman/repo
sudo ./bootstrap/bootstrap-elitedesk.sh
```

After Tailscale enrollment and local Ansible hardening (`infra/ansible/site.yml`) complete:
1. Initialize the internal PKI CA and Vault AppRoles/dynamic secret engines:
   ```bash
   ./scripts/init-networks.sh
   ./scripts/gen-internal-certs.sh
   docker compose --env-file .env --env-file infra/compose/01-security/.env -f infra/compose/01-security/compose.yml up -d
   ./scripts/bootstrap-vault.sh
   docker compose --env-file .env --env-file infra/compose/02-data-bus/.env -f infra/compose/02-data-bus/compose.yml up -d
   ./scripts/bootstrap-vault.sh --configure-engines
   ./scripts/import-keycloak-realm.sh
   ```
2. Validate Zero Trust posture:
   ```bash
   ./scripts/verify-zero-trust.sh --live
   ```

---

## Codebase Layout

- `bootstrap/` — Physical console bootstrap (`bootstrap-elitedesk.sh`)
- `infra/ansible/` — Idempotent OS, UFW/`DOCKER-USER`, Tailscale SSH lockdown, Docker daemon & systemd hardening (supports both `connection: local` and Tailscale SSH)
- `infra/compose/` — Strictly isolated zone stacks (`00-networks.yml`, `01-security/` .. `05-observability-ops/`)
- `contracts/Eggman.Contracts/` — Shared immutable C# DTOs, RabbitMQ event schemas, and OpenAPI 3.1 contracts
- `services/` — .NET 9 Aspire `Eggman.AppHost`, `Eggman.ServiceDefaults`, `Eggman.Gateway.Yarp`, `Eggman.ReleaseHub`, and `Eggman.IoT.Bridge`
- `web/landing/` — Modular JSON-driven static showcase (`eggmanstudios.me`) built in a multi-stage read-only Nginx container
- `web/docs/` — Astro Starlight documentation & hardware guides (`docs.eggmanstudios.me`)
- `scripts/` — Internal CA, Vault bootstrap, Keycloak realm import, and Zero Trust verification scripts
- `archive/` — Quarantine area for retired legacy apps (never deployed)
