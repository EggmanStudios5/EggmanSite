# Eggman Studios — Sovereign Open-Source Landing Page & Solutions Hub

**Initiative:** Eggman Studios  
**Design Baseline:** Mateo Network (`WEB-Projekt`)  
**Tech Stack:** HTML5, Tailwind CSS v4 (`src/css/input.css` &rarr; `src/css/style.css`), Modular Vanilla ES6 Components (Zero Corporate Bloat, Zero Trackers)  
**License:** MIT / GPLv3 / CERN-OHL Permissive Open Source

---

## 1. Overview & Philosophy

Eggman Studios is an open-source, sovereign software and hardware initiative dedicated to giving builders, students, and local communities complete ownership over their software, silicon, and local infrastructure.

This web application serves as our public landing page and solutions hub. It uses Mateo's **WEB-Projekt** repository as the canonical source of truth for its design system (`Plus Jakarta Sans` + `JetBrains Mono` typography, high-contrast slate/teal/indigo/emerald color palette, ASCII topology diagrams, and zero-dependency client-side interactivity).

---

## 2. Modular Component Architecture

Every section of the site is decoupled into reusable ES modules under `src/components/`:

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| **`Navbar`** | `src/components/Navbar.js` | Sticky backdrop-blur navigation bar, active view state, mobile menu toggle, and GitHub CTA. |
| **`Hero`** | `src/components/Hero.js` | Configurable hero banner with mission statement, primary/secondary CTAs, metrics grid, and jump cards. |
| **`About`** | `src/components/About.js` | Outlines Eggman Studios' open-source philosophy, 3 problem/solution pillars, manifesto, and ASCII stack diagram. |
| **`SolutionCard`** | `src/components/SolutionCard.js` | Reusable card displaying a project's badge, summary, *"What It Solves"*, scanned repo files, tech stack, and GitHub link. |
| **`SolutionsHub`** | `src/components/SolutionsHub.js` | Composes `SolutionCard` instances with category filtering, a `git clone` matrix, and an interactive protocol sandbox. |
| **`Footer`** | `src/components/Footer.js` | Direct cross-page navigation, GitHub repository links, and permissive open-source license metadata. |

---

## 3. Integrated Source Repositories

`scripts/scan-repos.mjs` automatically scans the local repository clones inside `./Github Repos/` and outputs structured project metadata to `src/data/projects.js` and `src/data/repos-manifest.json`:

1. **[RFID-student-acces-system](https://github.com/FilipVastl005/RFID-student-acces-system)** (`rfid.html`)
   - **Core Concept:** Hardware-software integration & local physical door access control using split perimeter ESP nodes (`esp/InputNode.ino` for exterior 13.56MHz RFID scanning and `esp/OutputNode.ino` for interior strike relay actuation) plus a self-hosted LAN web dashboard (`server/frontend/index.html`).
   - **README Status:** Includes modular technical placeholder specifications and setup guides ready for ongoing firmware commits.
2. **[Macro](https://github.com/FilipVastl005/Macro)** (`macro.html`)
   - **Core Concept:** Zero-bloat 3&times;3 USB HID programmable macro pad (`3x3/simple/usb/simple.ino` & `simple.cpp`) with 90-byte non-volatile `EEPROM` keymap storage and a cross-platform Python Tkinter serial configurator (`macro_pad_config.py`).
   - **Interactive Feature:** Includes an interactive 3&times;3 keypad configurator previewing live `SET key1|key2|...|key9\n` serial payloads.
3. **[WEB-Projekt (Mateo Network)](https://github.com/FilipVastl005/WEB-Projekt)** (`mateo.html`)
   - **Core Concept:** Community-driven hyper-local climate & weather platform across 3 hardware topologies (ESP32-C6 Wi-Fi 6 TWT, ESP32-C3 + SX1262 LoRa Home Deck, and Off-Grid Autonomous Mesh Kiosk) with a 3-stage Zero-Trust Quality Control (QC) & Station Quality Index (SQI) pipeline.

---

## 4. Build & Verification Commands

```bash
# 1. Scan local repositories in "./Github Repos" and regenerate src/data/projects.js
npm run scan:repos

# 2. Compile modular components & views into root (*.html) and templates/*.html
npm run build

# 3. Run full build + automated component, link, and CSS utility verification
npm test
```

