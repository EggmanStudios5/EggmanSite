# Legacy Archive Quarantine Policy

Files placed under `archive/` are **strictly non-deployable reference artifacts**.

Rules:
1. **Do NOT deploy, compose, or execute** anything inside `archive/` on the production HP EliteDesk host.
2. Retired legacy workloads classified for archive:
   - Legacy FastAPI home cloud (`app.py`) — replaced by Nextcloud + Jellyfin (`04-private-homelab/`).
   - Legacy Flask SQLite ledger (`ledger.db`) — retired.
   - GuitarRythmer Streamlit app — retired.
   - `WEB-Projekt` (Mateo Weather Network) — showcased as a reference open-hardware design only in `web/landing/content/projects/mateo.json`; never hosted on server infrastructure.
3. Explicitly **forbidden** tools (Docker-socket web UIs, Ollama on active stack, Jira) must never be archived as runnable Compose stacks or scripts.
