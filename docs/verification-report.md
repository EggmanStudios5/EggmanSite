# Phase 5 Zero Trust Adversarial Verification Report

**Target Platform:** Eggman Studios (`eggmanstudios.me`) — HP EliteDesk 800 G1 SFF (`16 GB RAM`)  
**Verification Scope:** Local static infrastructure, Ansible syntax/linting, secret & container-policy audits, .NET 9 adversarial security integration suite (`WebApplicationFactory` + xUnit + real RS256 JWTs), SSG web verification, and on-box live verification script (`scripts/verify-zero-trust-on-host.sh`).  
**Remote Execution Constraint:** Zero remote SSH connections or off-box network probes were executed; host-level kernel/UFW/socket/container checks are packaged in `scripts/verify-zero-trust-on-host.sh` for post-deploy on-box execution.

---

## 1. Pass / Fail Security Matrix

| Security Domain / Gate | Exact Check / Command Executed | Result | Observed Evidence |
| :--- | :--- | :---: | :--- |
| **Compose Schema & Env Interpolation** | `docker-compose` `v2.33.1` `config -q` across `00-networks.yml` and `01-security` .. `05-observability-ops` with `.env.example` | **PASS** | `00-networks.yml` + all 5 stacks validated cleanly with exit code `0`. |
| **Zero Trust Container Policy & 16 GB RAM Cap** | `./scripts/verify-zero-trust.sh --static` | **PASS** | `2 PASSED, 0 FAILED`: `11,680 MB` containers + `32 MB` host `beszel-agent` = **`11,712 MB` (`11.44 GiB`)** (`<= 12,000 MB` threshold). Every container enforces non-root `user`, `read_only: true`, `cap_drop: [ALL]`, zero `cap_add`, `no-new-privileges:true`, pinned image tags, `healthcheck`, memory limit, zero `docker.sock` mounts, and per-service isolated `approle/<service>` mounts. |
| **Zone A / Zone B Network Isolation** | Static policy check in `./scripts/verify-zero-trust.sh --static` + `infra/compose/00-networks.yml` | **PASS** | 13 declared networks (`11` set `internal: true`; only `net_public_tunnel` & `net_private_egress` have `internal: false` with `enable_icc: "false"`). Only `cloudflared` attaches to `net_public_tunnel`; `03-public-edge` has zero links to `net_private_*` or `net_tailscale_admin`. |
| **Ansible Playbook Syntax** | `ANSIBLE_CONFIG=infra/ansible/ansible.cfg ansible-playbook --syntax-check -i localhost, -c local infra/ansible/site.yml` & `playbooks/deploy-stacks.yml` | **PASS** | Exit code `0` on `ansible-core 2.22.0` (`community.general 14.0.1`). Both playbooks parsed cleanly (only deprecation note on `ansible.builtin.apt_repository` for future `ansible-core 2.25`). |
| **Ansible Lint Posture** | `ANSIBLE_CONFIG=infra/ansible/ansible.cfg ansible-lint infra/ansible/` (`v26.11.0`) | **WARN (Style)** | Exit code `2` due solely to `5 role-name` hyphenated Phase 2 role directories, `2 yaml[line-length]` lines (`beszel-agent-host/tasks/main.yml:21`, `docker-hardening/tasks/main.yml:31`), and `1 args[module]` Jinja policy variable in `os-hardening/tasks/main.yml:63`. **0 security or syntax errors.** |
| **Bash Script Syntax** | `bash -n` on `bootstrap/bootstrap-elitedesk.sh` and all 6 scripts under `scripts/` | **PASS** | `7/7` scripts passed `bash -n` with exit code `0`. |
| **Secrets, Private Keys & Legacy Handle Scan** | `grep -rnE` scan + `git ls-files` `.env` check + `./scripts/verify-zero-trust.sh --static` | **PASS** | Zero tracked `.env` files, zero private keys, zero tokens (`ghp_`/`sk_live_`/`AKIA`), zero `// TODO`/`FIXME`, zero forbidden CDN/legacy handle references, zero `0.0.0.0:` host port bindings in Compose/`ufw` (only `vault.hcl` binds `0.0.0.0:8200` TLS 1.3 inside internal-only container networks with zero published host ports). |
| **.NET 9 Solution Build** | `dotnet build Eggman.Platform.sln -c Release` | **PASS** | `0 Error(s)` across `Eggman.Contracts`, `Eggman.ServiceDefaults`, `Eggman.Gateway.Yarp`, `Eggman.ReleaseHub`, `Eggman.IoT.Bridge`, `Eggman.AppHost`, and `Eggman.Platform.Tests`. Runtime Dockerfiles use `aspnet:9.0-noble-chiseled` with `USER 1654:1654`. |
| **Adversarial JWT Matrix (YARP & Downstream)** | `dotnet test -c Release` (`GatewayYarp_ProtectedRouteEnforcesFullAdversarialJwtMatrix`, `DownstreamServices_IndependentlyEnforceFullAdversarialJwtMatrix`) | **PASS** | Unauthenticated, expired, rogue-key tampered signature, tampered payload, wrong audience, and wrong issuer RS256 JWTs return `401`; valid JWT missing required scope returns `403`; exact scope/issuer/audience JWT passes at **both** `Eggman.Gateway.Yarp` AND downstream `Eggman.ReleaseHub` + `Eggman.IoT.Bridge`. |
| **Header Spoofing Stripping & Downstream Rejection** | `SpoofedIdentityAndProxyHeaders_AreStrippedAtYarpAndIgnoredDownstream` | **PASS** | YARP strips `X-User-Id`, `X-Roles`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-User`, `X-Remote-User`, `X-Auth-User`, `X-Original-URL`, `X-Rewrite-URL`, and `X-Eggman-Internal-*` before downstream delivery; downstream services reject unauthenticated requests carrying those headers with `401`. |
| **Admin / Internal Path Blocking & Default-Deny** | `GatewayYarp_BlocksAdminAndInternalEndpointsWith403` (11 vectors) & `GatewayYarp_DefaultDenyReturns404ForUnknownRoute` | **PASS** | `/admin`, `//admin`, `/admin/master/console`, `/realms/master`, `/metrics`, `/health/ready`, `/socket.io/`, `/swagger/index.html`, `/.env`, `/.git/config`, `/api/v1/releases/..%2f..%2fetc/passwd` all return `403`; unlisted hosts/paths return `404`. |
| **Rate Limiting Under Burst Traffic** | `GatewayYarp_RateLimitingTriggers429UnderBurstTraffic` | **PASS** | Burst requests exceeding permit cap deterministically return `429 Too Many Requests`. |
| **Malformed (`400`) & Oversized (`413`) Payloads** | `Endpoints_RejectMalformedWith400AndOversizedWith413` | **PASS** | YARP rejects oversized sized (`Content-Length`) and chunked streams with `413`; `ReleaseHub` & `IoT.Bridge` reject malformed JSON & invalid DTOs with `400` and oversized payloads with `413`. |
| **IoT Hardware HMAC-SHA256 Auth & PII Scrubbing** | `IoTBridge_HmacAuthAcceptsValidAndRejectsTamperedOrReplayed`, `PiiScrubber_RedactsTokensSecretsPasswordsAndEmails` | **PASS** | Accepts valid signed packets (`202`), blocks replay nonces, tampered bodies, and stale timestamps (`401`); redacts Bearer JWTs, Vault tokens, passwords, and emails from logs. (`22/22` xUnit tests passed in `4.10s`). |
| **Landing & Docs Static Site Builds** | `web/landing`: `npm run build && npm run build:css && npm run verify`; `web/docs`: `npm run build` | **PASS** | `web/landing` verified `8` static HTML pages + compiled CSS with zero inline `<style>` or external CDNs; `web/docs` Astro + Pagefind built `7` pages cleanly. |
| **Live Host / Lateral Movement Containment** | `scripts/verify-zero-trust-on-host.sh` (generated, `bash -n` verified) | **PENDING ON-BOX RUN** | Ready for execution on HP EliteDesk after physical console bootstrap & stack deployment. |

---

## 2. Red-Team Flaws Uncovered & Remediated in Phase 5

1. **CRITICAL — Shared Vault AppRole Secret Directory (`approle/`) Across Services & Trust Zones:**
   - **Finding:** `eggman-gateway-yarp`, `eggman-releasehub`, and `eggman-iot-bridge` previously mounted the shared parent `${EGGMAN_SECRETS_ROOT}/approle:/run/secrets/approle:ro`, enabling lateral secret read across Zone A/Zone B AppRoles if one container were compromised.
   - **Fix:** Isolated secrets into per-service subdirectories (`approle/yarp/`, `approle/releasehub/`, `approle/iot-bridge/` with `0750 root:1654` and `0640` `role-id`/`secret-id`) in `scripts/bootstrap-vault.sh`, `infra/ansible/roles/docker-hardening/tasks/main.yml`, `infra/compose/03-public-edge/compose.yml`, and `infra/compose/04-private-homelab/compose.yml`, and enforced a permanent policy check in `scripts/verify-zero-trust.sh`.

2. **CRITICAL — `DOCKER-USER` Rule Blocking Zone A Intra-Bridge Traffic Under `br_netfilter`:**
   - **Finding:** `-A DOCKER-USER -s 172.28.0.0/20 -d 172.16.0.0/12 -j DROP` blocked legitimate Zone A intra-subnet traffic when `br_netfilter` inspects bridged frames.
   - **Fix:** Updated `infra/ansible/roles/os-hardening/tasks/main.yml` to explicitly drop Zone A (`172.28.0.0/20`) -> Zone B/C (`172.28.16.0/20`), return intra-Zone-A (`172.28.0.0/20`) to `DOCKER-ISOLATION`, and drop all other RFC1918 (`10/8`, `172.16/12`, `192.168/16`) and Tailscale (`100.64/10`) destinations.

3. **HIGH — Incomplete Spoofed Identity Header Stripping, Path RawTarget Fallback Bug & Rate Limiter Option Timing (`Eggman.Gateway.Yarp`):**
   - **Finding:** YARP did not strip `X-User-Id`, `X-Roles`, `X-Real-IP`, or untrusted `X-Forwarded-*` headers before `UseForwardedHeaders()` or in downstream proxy transforms; `RawTarget ?? path` skipped traversal checks when `RawTarget` was empty string (`""`); and `AddRateLimiter` evaluated `builder.Configuration` eagerly before host config finalized.
   - **Fix:** Added pre-`UseForwardedHeaders` untrusted forwarding stripping (strictly trusting `172.28.2.0/28`), post-`UseForwardedHeaders` + global YARP `AddTransforms` header scrubbing (`X-User-Id`, `X-Roles`, `X-Real-IP`, `X-Forwarded-For`, etc.), `string.IsNullOrEmpty(featureRawTarget)` traversal checks across `path`/`normalizedPath`/`rawTarget`, `AddOptions<RateLimiterOptions>().Configure<IConfiguration>` with `GlobalLimiter`, and `UseAuthentication()` before `UseRateLimiter()` for per-user `sub` partitioning.

4. **HIGH — Chunked & Oversized Request Body Enforcement (`413 Payload Too Large`):**
   - **Finding:** Kestrel `MaxRequestBodySize` (`10 MB`) was too permissive for JSON/auth routes and skipped `TestServer`/chunked streams lacking `Content-Length`.
   - **Fix:** Added `UseEggmanRequestBodySizeLimit` in `services/Eggman.ServiceDefaults/ZeroTrustExtensions.cs` (applied to YARP at `1 MiB` API / `10 MiB` default, and `1 MiB` on `ReleaseHub` and `IoT.Bridge`), rejecting oversized sized and chunked payloads with `413` and malformed JSON with `400`. Also tightened `IsInternalRequest` to reject `CF-Ray`/`CF-Connecting-IP` headers and DMZ subnets `172.28.1.x`/`172.28.2.x`, and moved IoT HMAC replay nonce recording (`DeviceHmacAuthHandler.cs`) to execute only after cryptographic signature verification succeeds.

5. **HIGH — Ansible `synchronize` Module Error, Deprecated SSHD Directives, Redis Healthcheck Argument Secret & Dummy Compose Token Default:**
   - **Fix:** Replaced nonexistent `ansible.builtin.synchronize` with `ansible.builtin.command` running `rsync` in `infra/ansible/roles/docker-hardening/tasks/main.yml`; removed deprecated `Protocol 2` and `ChallengeResponseAuthentication` in `99-eggman-zero-trust.conf.j2`; replaced `redis-cli --pass "${REDIS_HEALTH_PASSWORD}"` with mounted `/etc/redis/health.pass` (`REDISCLI_AUTH` inside container); and cleared dummy `CLOUDFLARE_DNS_API_TOKEN` literal default in `infra/compose/01-security/compose.yml`.

---

## 3. HP EliteDesk 16 GB RAM Budget Allocation

| Layer / Stack | Containers & Services | Configured Memory Limit |
| :--- | :--- | :---: |
| `01-security` | `eggman-vault` (`256M`), `eggman-keycloak` (`1024M`, `-Xmx768m`), `eggman-tailscale-proxy` (`128M`) | `1,408 MB` |
| `02-data-bus` | `postgres-public` (`512M`), `postgres-private` (`768M`), `redis` (`320M`), `rabbitmq` (`512M`) | `2,112 MB` |
| `03-public-edge` | `cloudflared` (`128M`), `eggman-gateway-yarp` (`256M`), `eggman-releasehub` (`256M`), `web-landing` (`64M`), `web-docs` (`64M`) | `768 MB` |
| `04-private-homelab` | `nextcloud-app` (`1280M`), `nextcloud-cron` (`256M`), `immich-server` (`1024M`), `immich-ml` (`2048M`), `jellyfin` (`1536M`), `navidrome` (`128M`), `forgejo` (`256M`), `eggman-iot-bridge` (`256M`), `homepage` (`128M`) | `6,912 MB` |
| `05-observability-ops` | `beszel-hub` (`96M`), `uptime-kuma` (`256M`), `ntfy` (`128M`) + Host `beszel-agent.service` (`32M`) | `512 MB` (`480M` + `32M`) |
| **Total Enforced Ceiling** | **24 Containers + 1 Hardened Host Unit** | **`11,712 MB` (`11.44 GiB`)** |

*Headroom preserved for Linux kernel, Debian OS, Docker Engine, ZRAM (`4 GB` max), and NVMe page cache on 16 GB HP EliteDesk: `~4.56 GiB`.*

---

## 4. Physical HP EliteDesk Console Bootstrap & On-Box Audit Runbook

Execute these commands directly on the HP EliteDesk keyboard/monitor console (**no remote SSH needed initially**):

```bash
# 1. Clone repo cleanly on physical console and execute hardened OS + Docker + Tailscale + SSH lockdown
git clone https://github.com/EggmanStudios5/EggmanSite.git /srv/eggman/repo
cd /srv/eggman/repo
sudo ./bootstrap/bootstrap-elitedesk.sh
# During prompts:
#   - Authenticate Tailscale in browser when displayed
#   - Paste your workstation Ed25519 SSH public key (ssh-ed25519 ...) when prompted

# 2. Switch to synced repo as non-root admin user (eggman-ops) and create 0600 runtime .env files
cd /srv/eggman/repo
cp .env.example .env && chmod 0600 .env
for s in 01-security 02-data-bus 03-public-edge 04-private-homelab 05-observability-ops; do
  cp "infra/compose/${s}/.env.example" "infra/compose/${s}/.env"
  chmod 0600 "infra/compose/${s}/.env"
done
# Populate TAILSCALE_IP, IOT_VLAN_IP, CLOUDFLARED_TUNNEL_TOKEN, and high-entropy initial secrets in each .env

# 3. Create 13 canonical Zero Trust bridge networks and generate internal Root CA + TLS 1.3 leaf certs
./scripts/init-networks.sh
sudo ./scripts/gen-internal-certs.sh

# 4. Boot Security Plane (01-security), initialize/unseal Vault & render AppRole/Redis/RabbitMQ secrets
docker compose --env-file .env --env-file infra/compose/01-security/.env -f infra/compose/01-security/compose.yml up -d
sudo ./scripts/bootstrap-vault.sh

# 5. Boot Data/Messaging Bus (02-data-bus), configure Vault dynamic DB/RabbitMQ engines & import Keycloak realm
docker compose --env-file .env --env-file infra/compose/02-data-bus/.env -f infra/compose/02-data-bus/compose.yml up -d
sudo ./scripts/bootstrap-vault.sh --configure-engines
set -a && source infra/compose/01-security/.env && set +a
./scripts/import-keycloak-realm.sh

# 6. Deploy all 5 Zero Trust stacks sequentially via Ansible systemd units
cd /srv/eggman/repo/infra/ansible
sudo ansible-playbook -i localhost, -c local playbooks/deploy-stacks.yml

# 7. Run live host & lateral-movement containment verification on the EliteDesk
cd /srv/eggman/repo
./scripts/verify-zero-trust.sh --live
sudo ./scripts/verify-zero-trust-on-host.sh

# 8. Record Vault unseal shares & root token offline, then shred bootstrap init artifact from disk:
# shred -u /srv/eggman/secrets/vault-init.json
```

### Unlock Remote Tailscale SSH (From Operator Workstation)

After step 7 reports **0 FAILED**:

```bash
ssh -i ~/.ssh/id_ed25519 eggman-ops@<TAILSCALE_IP>
```
