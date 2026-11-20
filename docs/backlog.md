# Deferred Services Backlog

Per the Phase 2 Master Scope List, the following components are intentionally **deferred** to protect the 16 GB HP EliteDesk 800 G1 SFF memory budget (`11.44 GiB` hard cap) and avoid premature complexity:

1. **Jarvis Backend (Zone B Private)**
   - **Status:** Deferred (container not scaffolded yet).
   - **Pre-Reserved Infrastructure:** RabbitMQ `definitions.json.template` already provisions vhost `/private-jarvis` and read permissions on `/private-iot` (`eggman.iot.events`) so `Eggman.IoT.Bridge` telemetry from Arduino Mega/UNO R4/ESP32 nodes can be consumed seamlessly when deployed.

2. **SPAYD QR Payment Microservice (Zone A Public)**
   - **Status:** Deferred until hardware sales or donations go live.
   - **Prerequisite:** Dedicated `payments` DB/role in `postgres-public`, Keycloak authenticated checkout flow, Czech SPAYD QR generator, and `Eggman.Contracts` order events. Meanwhile `web/landing` renders hardware items as a read-only showcase.

3. **Plane Project Management (Zone B Private)**
   - **Status:** Deferred to avoid its 2–4 GB RAM overhead.
   - **Current Alternative:** Forgejo Issues (`git.eggmanstudios.me`, `256 MB` cap).

4. **Prometheus + Grafana (Zone B Observability)**
   - **Status:** Deferred until microservice density justifies the RAM budget.
   - **Current Alternative:** Beszel Hub + hardened host systemd Beszel Agent (`128 MB` total) + Uptime Kuma (`256 MB`) + ntfy (`128 MB`).
