import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSEMBLED_WEATHER_STATIONS,
  ASSEMBLED_MACRO_PADS,
  DIY_COMPONENTS
} from '../src/data/shop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SHOP_IMG_DIR = path.join(ROOT_DIR, 'src', 'img', 'shop');

function renderWeatherStationPlaceholderSvg(station) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <pattern id="ws-grid-${station.slug}" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" stroke-width="1"/>
  </pattern>
  <rect width="360" height="220" fill="url(#ws-grid-${station.slug})"/>

  <!-- Top Left Placeholder Tag -->
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">PLACEHOLDER</text>

  <!-- Top Right Badge -->
  <rect x="208" y="14" width="138" height="20" rx="4" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.8"/>
  <text x="277" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="#0f766e" text-anchor="middle">SOLAR + AIR QUALITY</text>

  <!-- Left: Angled Solar Panel Module -->
  <rect x="48" y="64" width="84" height="58" rx="6" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <line x1="48" y1="83" x2="132" y2="83" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="48" y1="102" x2="132" y2="102" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="76" y1="64" x2="76" y2="122" stroke="#1e293b" stroke-width="1.5"/>
  <line x1="104" y1="64" x2="104" y2="122" stroke="#1e293b" stroke-width="1.5"/>
  <text x="90" y="138" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="#0f766e" text-anchor="middle">SOLAR + LiFePO4</text>

  <!-- Center: Louvered Stevenson Radiation Shield -->
  <rect x="150" y="50" width="76" height="18" rx="5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="148" y="70" width="80" height="16" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="148" y="88" width="80" height="16" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="148" y="106" width="80" height="16" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="152" y="124" width="72" height="22" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="188" y="138" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="#334155" text-anchor="middle">BME280+MQ135</text>

  <!-- Right: Telemetry Antenna & Air Quality Intake -->
  <line x1="276" y1="46" x2="276" y2="86" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
  <circle cx="276" cy="44" r="4" fill="#0f766e"/>
  <rect x="248" y="86" width="56" height="58" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
  <text x="276" y="110" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="#2dd4bf" text-anchor="middle">AQI + RF</text>
  <text x="276" y="124" font-family="ui-monospace, monospace" font-size="8" font-weight="600" fill="#94a3b8" text-anchor="middle">MODULE</text>

  <!-- Bottom Caption -->
  <text x="180" y="198" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
    ${station.sensorsSpec} · ${station.powerSpec}
  </text>
</svg>`;
}

function renderMacroPadPlaceholderSvg(item) {
  const isBt = item.bluetooth;
  const accent = isBt ? '#0f766e' : '#334155';
  const badgeBg = isBt ? '#f0fdfa' : '#f1f5f9';
  const badgeText = isBt ? 'BLE + USB-C' : item.connector;

  // Determine matrix rows & cols for the visual preview
  let rows = 3;
  let cols = 3;
  const m = item.matrixSpec.match(/(\d+)\*(\d+)/);
  if (m) {
    rows = parseInt(m[1], 10);
    cols = parseInt(m[2], 10);
  }

  const encoderCount = item.specialComponents
    ? item.specialComponents.includes('3*')
      ? 3
      : 1
    : 0;

  // Draw keycaps centered in the left/center area
  const keySize = rows >= 4 || cols >= 4 ? 26 : 32;
  const gap = 8;
  const gridW = cols * keySize + (cols - 1) * gap;
  const gridH = rows * keySize + (rows - 1) * gap;
  const startX = encoderCount > 0 ? 135 - gridW / 2 : 180 - gridW / 2;
  const startY = 112 - gridH / 2;

  let keysSvg = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (keySize + gap);
      const y = startY + r * (keySize + gap);
      keysSvg += `
    <rect x="${x}" y="${y + 2}" width="${keySize}" height="${keySize}" rx="6" fill="#94a3b8"/>
    <rect x="${x}" y="${y}" width="${keySize}" height="${keySize}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`;
    }
  }

  // Draw rotary encoders if present
  let encodersSvg = '';
  if (encoderCount === 1) {
    const cx = 248;
    const cy = 112;
    encodersSvg = `
    <circle cx="${cx}" cy="${cy + 3}" r="24" fill="#64748b"/>
    <circle cx="${cx}" cy="${cy}" r="24" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${cx}" y1="${cy - 18}" x2="${cx}" y2="${cy - 8}" stroke="#2dd4bf" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (encoderCount === 3) {
    for (let e = 0; e < 3; e++) {
      const cx = 252;
      const cy = 68 + e * 44;
      encodersSvg += `
    <circle cx="${cx}" cy="${cy + 2}" r="16" fill="#64748b"/>
    <circle cx="${cx}" cy="${cy}" r="16" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="${cx}" y1="${cy - 12}" x2="${cx}" y2="${cy - 5}" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <pattern id="dots-${item.slug}" width="20" height="20" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="#cbd5e1" fill-opacity="0.55"/>
  </pattern>
  <rect width="360" height="220" fill="url(#dots-${item.slug})"/>

  <!-- Top Left Placeholder Tag -->
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">PLACEHOLDER</text>

  <!-- Top Right Connection Badge -->
  <rect x="250" y="14" width="96" height="20" rx="4" fill="${badgeBg}" stroke="${accent}" stroke-width="0.8"/>
  <text x="298" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${accent}" text-anchor="middle">${badgeText}</text>

  <!-- Device Enclosure Outline -->
  <rect x="64" y="42" width="232" height="142" rx="16" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="70" y="46" width="220" height="132" rx="12" fill="#f1f5f9"/>

  <!-- Keys & Encoders -->
  ${keysSvg}
  ${encodersSvg}

  <!-- Bottom Spec Caption -->
  <text x="180" y="204" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">
    ${item.name} · Matrix ${item.matrixSpec} (${item.buttonsCount} Keys${encoderCount ? ` + ${item.specialComponents}` : ''})
  </text>
</svg>`;
}

function renderComponentPlaceholderSvg(comp) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <pattern id="grid-${comp.slug}" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" stroke-width="1"/>
  </pattern>
  <rect width="360" height="220" fill="url(#grid-${comp.slug})"/>

  <!-- Placeholder Tag -->
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">PLACEHOLDER</text>

  <!-- Component Category Tag -->
  <rect x="220" y="14" width="126" height="20" rx="4" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.8"/>
  <text x="283" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="#0f766e" text-anchor="middle">${comp.categoryLabel.toUpperCase()}</text>

  <!-- Hardware Component Schematic Graphic -->
  <rect x="105" y="54" width="150" height="104" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <!-- Gold PCB Pads -->
  <circle cx="122" cy="70" r="4" fill="#fbbf24"/>
  <circle cx="238" cy="70" r="4" fill="#fbbf24"/>
  <circle cx="122" cy="142" r="4" fill="#fbbf24"/>
  <circle cx="238" cy="142" r="4" fill="#fbbf24"/>
  <!-- Center IC / Part Outline -->
  <rect x="145" y="76" width="70" height="60" rx="6" fill="#1e293b" stroke="#2dd4bf" stroke-width="1.5"/>
  <text x="180" y="110" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="#2dd4bf" text-anchor="middle">DIY PART</text>

  <!-- Bottom Label -->
  <text x="180" y="196" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
    ${comp.specSummary}
  </text>
</svg>`;
}

export function generateShopPlaceholders() {
  fs.mkdirSync(SHOP_IMG_DIR, { recursive: true });

  for (const station of ASSEMBLED_WEATHER_STATIONS) {
    const svg = renderWeatherStationPlaceholderSvg(station);
    fs.writeFileSync(path.join(SHOP_IMG_DIR, `${station.slug}.svg`), svg, 'utf8');
  }

  for (const pad of ASSEMBLED_MACRO_PADS) {
    const svg = renderMacroPadPlaceholderSvg(pad);
    fs.writeFileSync(path.join(SHOP_IMG_DIR, `${pad.slug}.svg`), svg, 'utf8');
  }

  for (const comp of DIY_COMPONENTS) {
    const svg = renderComponentPlaceholderSvg(comp);
    fs.writeFileSync(path.join(SHOP_IMG_DIR, `${comp.slug}.svg`), svg, 'utf8');
  }

  const total =
    ASSEMBLED_WEATHER_STATIONS.length + ASSEMBLED_MACRO_PADS.length + DIY_COMPONENTS.length;
  console.log(`[shop-placeholders] Generated ${total} placeholder SVGs in src/img/shop/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  generateShopPlaceholders();
}

