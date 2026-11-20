import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANDING_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(LANDING_ROOT, 'content');
const PROJECTS_DIR = path.join(CONTENT_DIR, 'projects');
const CSV_PATH = path.join(CONTENT_DIR, 'catalog', 'macro-pads.csv');
const HARDWARE_JSON_PATH = path.join(CONTENT_DIR, 'catalog', 'hardware.json');

export function loadSiteCopy() {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'site.json'), 'utf8'));
}

export function loadTutorials() {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'tutorials.json'), 'utf8'));
}

export function loadProjects() {
  const order = ['slunicka.json', 'protikod.json', 'rfid.json', 'macro.json', 'mateo.json'];
  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.json'));
  files.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8')));
}

export function getAdjacentProjects(slug, projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return { prevProject: null, nextProject: null };
  }
  const index = projects.findIndex((p) => p.slug === slug || p.id === slug);
  if (index === -1) {
    return { prevProject: projects[0], nextProject: projects[projects.length - 1] };
  }
  return {
    prevProject: projects[(index - 1 + projects.length) % projects.length],
    nextProject: projects[(index + 1) % projects.length]
  };
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function loadCatalog() {
  const cfg = JSON.parse(fs.readFileSync(HARDWARE_JSON_PATH, 'utf8'));
  const macroPads = [];

  if (fs.existsSync(CSV_PATH)) {
    const lines = fs
      .readFileSync(CSV_PATH, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const name = cols[0];
      if (!name) continue;
      const hasBluetooth = (cols[1] || 'No').toLowerCase() === 'yes';
      const connector = cols[2] || 'USB Micro';
      const buttonsCount = Number.parseInt(cols[3] || '0', 10);
      const specialComponents = cols[4] && cols[4].toLowerCase() !== 'none' ? cols[4] : null;
      const matrixSpec = cols[6] || '';
      const price = Number.parseFloat(cols[8] || '0');
      const slug = slugify(name);

      macroPads.push({
        id: `pad-${slug}`,
        slug,
        name,
        category: 'assembled',
        categoryLabel: 'Assembled Macro Pad',
        bluetooth: hasBluetooth,
        connector,
        buttonsCount,
        specialComponents,
        matrixSpec,
        price,
        image: `assets/img/shop/${slug}.svg`,
        description:
          cfg.modelDescriptions[name] ||
          `Pre-assembled ${matrixSpec} programmable macro pad with ${buttonsCount} keys and onboard EEPROM.`
      });
    }
  }

  return {
    config: cfg,
    weatherStations: cfg.weatherStations,
    macroPads,
    diyComponents: cfg.diyComponents,
    allItems: [...cfg.weatherStations, ...macroPads, ...cfg.diyComponents]
  };
}

export function formatPrice(priceNumber, currencySymbol = 'Kč', position = 'after') {
  const num = Number(priceNumber);
  const formatted = Number.isFinite(num) ? num.toFixed(2) : '0.00';
  return position === 'before' ? `${currencySymbol}${formatted}` : `${formatted} ${currencySymbol}`;
}
