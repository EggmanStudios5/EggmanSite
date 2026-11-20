import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from '../src/lib/escape.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANDING_ROOT = path.resolve(__dirname, '..');
const SHOP_OUT_DIR = path.join(LANDING_ROOT, 'dist', 'assets', 'img', 'shop');

function renderWeatherStationSvg(station) {
  const slug = escapeHtml(station.slug);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">REFERENCE</text>
  <rect x="208" y="14" width="138" height="20" rx="4" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.8"/>
  <text x="277" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="#0f766e" text-anchor="middle">SOLAR + AIR QUALITY</text>
  <rect x="48" y="64" width="84" height="58" rx="6" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="148" y="56" width="80" height="84" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="188" y="102" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="#334155" text-anchor="middle">BME280+MQ135</text>
  <rect x="248" y="76" width="56" height="64" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
  <text x="276" y="112" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="#2dd4bf" text-anchor="middle">${slug.slice(0, 12).toUpperCase()}</text>
  <text x="180" y="198" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
    ${escapeHtml(station.sensorsSpec)} · ${escapeHtml(station.powerSpec)}
  </text>
</svg>`;
}

function renderMacroPadSvg(item) {
  const isBt = Boolean(item.bluetooth);
  const accent = isBt ? '#0f766e' : '#334155';
  const badgeBg = isBt ? '#f0fdfa' : '#f1f5f9';
  const badgeText = isBt ? 'BLE + USB-C' : escapeHtml(item.connector);

  let rows = 3;
  let cols = 3;
  const m = String(item.matrixSpec || '').match(/(\d+)\*(\d+)/);
  if (m) {
    rows = Math.min(4, Math.max(1, Number.parseInt(m[1], 10)));
    cols = Math.min(4, Math.max(1, Number.parseInt(m[2], 10)));
  }

  const encoderCount = item.specialComponents ? (item.specialComponents.includes('3*') ? 3 : 1) : 0;
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
      keysSvg += `<rect x="${x}" y="${y}" width="${keySize}" height="${keySize}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">SCHEMATIC</text>
  <rect x="250" y="14" width="96" height="20" rx="4" fill="${badgeBg}" stroke="${accent}" stroke-width="0.8"/>
  <text x="298" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${accent}" text-anchor="middle">${badgeText}</text>
  <rect x="64" y="42" width="232" height="142" rx="16" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="70" y="46" width="220" height="132" rx="12" fill="#f1f5f9"/>
  ${keysSvg}
  <text x="180" y="204" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">
    ${escapeHtml(item.name)} · Matrix ${escapeHtml(item.matrixSpec)} (${escapeHtml(item.buttonsCount)} Keys)
  </text>
</svg>`;
}

function renderComponentSvg(comp) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" height="100%">
  <rect width="360" height="220" fill="#f8fafc"/>
  <rect x="14" y="14" width="96" height="20" rx="4" fill="#e2e8f0"/>
  <text x="62" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">DIY KIT</text>
  <rect x="210" y="14" width="136" height="20" rx="4" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.8"/>
  <text x="278" y="27" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="#0f766e" text-anchor="middle">${escapeHtml(comp.categoryLabel).toUpperCase()}</text>
  <rect x="105" y="54" width="150" height="104" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="145" y="76" width="70" height="60" rx="6" fill="#1e293b" stroke="#2dd4bf" stroke-width="1.5"/>
  <text x="180" y="110" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="#2dd4bf" text-anchor="middle">HARDWARE</text>
  <text x="180" y="196" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">${escapeHtml(comp.specSummary)}</text>
</svg>`;
}

export function generateShopPlaceholders(catalog) {
  fs.mkdirSync(SHOP_OUT_DIR, { recursive: true });
  for (const station of catalog.weatherStations) {
    fs.writeFileSync(path.join(SHOP_OUT_DIR, `${station.slug}.svg`), renderWeatherStationSvg(station), 'utf8');
  }
  for (const pad of catalog.macroPads) {
    fs.writeFileSync(path.join(SHOP_OUT_DIR, `${pad.slug}.svg`), renderMacroPadSvg(pad), 'utf8');
  }
  for (const comp of catalog.diyComponents) {
    fs.writeFileSync(path.join(SHOP_OUT_DIR, `${comp.slug}.svg`), renderComponentSvg(comp), 'utf8');
  }
}
