/**
 * ============================================================================
 * EGGMAN STUDIOS — SHOP & HARDWARE CATALOG DATA
 * ============================================================================
 * Automatically loads assembled Macro Pads from:
 *   `/Macro Pads specifications - Sheet1.csv`
 * and combines them with modular DIY Components & Kits below.
 *
 * You can edit the CSV file directly (to change prices or add Macro Pad models)
 * or edit `DIY_COMPONENTS` below to add/remove individual parts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CSV_PATH = path.join(ROOT_DIR, 'Macro Pads specifications - Sheet1.csv');

export const SHOP_CONFIG = {
  currencySymbol: 'Kč',
  currencyPosition: 'after', // e.g. "749.99 Kč"
  shippingNote: 'Assembled by hand & tested before shipping. Open-source firmware pre-installed.',
  emailJs: {
    publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
    serviceId: process.env.EMAILJS_SERVICE_ID || '',
    templateId: process.env.EMAILJS_TEMPLATE_ID || ''
  }
};

export function formatPrice(priceNumber) {
  const num = Number(priceNumber);
  const formatted = Number.isFinite(num) ? num.toFixed(2) : String(priceNumber);
  return SHOP_CONFIG.currencyPosition === 'before'
    ? `${SHOP_CONFIG.currencySymbol}${formatted}`
    : `${formatted} ${SHOP_CONFIG.currencySymbol}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Friendly descriptions based on each Macro Pad model from the CSV.
 */
const MODEL_DESCRIPTIONS = {
  'Macro simple': 'Our classic 3×3 9-key shortcut pad. Plug it in via USB, set your 9 shortcuts once, and use it anywhere.',
  'Macro simpleBT': 'The 3×3 9-key pad upgraded with wireless Bluetooth and a modern USB-C port.',
  'Macro S': 'Compact 6-key (3×2) pad for essential everyday shortcuts without taking up desk space.',
  'Macro S BT': 'Wireless Bluetooth + USB-C version of the compact 6-key (3×2) pad.',
  'Macro M': 'Mid-size 8-key (4×2) layout—great for window management, media controls, or CAD tools.',
  'Macro M BT': 'Wireless Bluetooth + USB-C 8-key (4×2) pad for clean, cable-free setups.',
  'Macro L': 'Full 16-key (4×4) grid for power users, streamers, and complex shortcut workflows.',
  'Macro gamer': 'Low-profile 1×4 4-key strip for quickone-handed actions and gaming binds.',
  'Macro gamerBT': 'Wireless Bluetooth + USB-C 4-key strip you can place anywhere on your desk.',
  'Macro office': '3 shortcut keys paired with a tactile rotary encoder dial for volume, scrolling, or zoom.',
  'Macro office BT': 'Wireless Bluetooth + USB-C 3-key + rotary dial pad for everyday office and media control.',
  'Macro producer': 'Built for audio & synth workflows: 9 keys (3×3) plus 3 independent rotary encoder knobs.',
  'Macro Editor': 'Designed for video & photo timelines: 6 shortcut keys (2×3) paired with a dedicated jog/scrub encoder.'
};

/**
 * Parse `Macro Pads specifications - Sheet1.csv` into structured product items.
 */
export function loadAssembledMacroPadsFromCsv() {
  if (!fs.existsSync(CSV_PATH)) return [];
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  // Skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const name = cols[0];
    if (!name) continue; // skip empty separator rows

    const bluetoothRaw = (cols[1] || 'No').toLowerCase();
    const hasBluetooth = bluetoothRaw === 'yes';
    const connector = cols[2] || 'USB Micro';
    const buttonsCount = parseInt(cols[3] || '0', 10);
    const specialComponents = cols[4] && cols[4].toLowerCase() !== 'none' ? cols[4] : null;
    const matrixSpec = cols[6] || '';
    const price = parseFloat(cols[8] || '0');
    const slug = slugify(name);

    items.push({
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
      image: `src/img/shop/${slug}.svg`,
      description:
        MODEL_DESCRIPTIONS[name] ||
        `Pre-assembled ${matrixSpec} programmable macro pad with ${buttonsCount} keys and onboard EEPROM storage.`
    });
  }

  return items;
}

/**
 * Pre-Built Mateo Weather Stations (Assembled & Calibrated Field Units).
 * Priced to reflect industrial air-quality sensors, Bosch BME280 modules,
 * Li-ion / LiFePO4 battery packs, tempered solar modules, and weatherproof shields.
 */
export const ASSEMBLED_WEATHER_STATIONS = [
  {
    id: 'station-mateo-urban',
    slug: 'station-mateo-urban',
    name: 'Mateo Urban Station (Pre-Built · Wi-Fi + Air Quality)',
    category: 'weather-station',
    categoryLabel: 'Pre-Built Weather Station',
    powerSpec: '2W Solar + 3000mAh Li-ion / LiFePO4',
    sensorsSpec: 'Bosch BME280 + MQ-135 Air Quality',
    connectivitySpec: 'Wi-Fi 6 (802.11ax) + Deep-Sleep',
    enclosureSpec: 'UV-ASA Louvered Stevenson Shield',
    price: 3499.99,
    image: 'src/img/shop/station-mateo-urban.svg',
    description:
      'Fully assembled and factory-calibrated balcony or rooftop weather station. Combines a Bosch BME280 atmospheric sensor, MOSFET-isolated MQ-135 air quality sensor, 3000mAh rechargeable battery pack, and tempered 2W solar panel inside a breathable UV-stabilized radiation shield.'
  },
  {
    id: 'station-mateo-suburban-lora',
    slug: 'station-mateo-suburban-lora',
    name: 'Mateo Long-Range Field Mast + Indoor Home Deck (Pre-Built)',
    category: 'weather-station',
    categoryLabel: 'Pre-Built Weather Station',
    powerSpec: '5W Solar + 6000mAh Dual Battery Pack',
    sensorsSpec: 'BME280 + Air Quality + Soil / Frost Probe',
    connectivitySpec: 'SX1262 LoRa (2 km) + OLED Indoor Hub',
    enclosureSpec: 'Weatherproof Mast Unit + Desk Receiver',
    price: 4899.99,
    image: 'src/img/shop/station-mateo-suburban-lora.svg',
    description:
      'Complete two-unit long-range weather system for gardens, orchards, and farms. Includes the solar-powered outdoor sensor mast (with BME280, air quality sensor, and 6000mAh battery) plus an indoor OLED receiver deck that logs data to microSD even when internet is down.'
  },
  {
    id: 'station-mateo-offgrid-pro',
    slug: 'station-mateo-offgrid-pro',
    name: 'Mateo Off-Grid Autonomous Mesh Station & Solar Kiosk (Pre-Built)',
    category: 'weather-station',
    categoryLabel: 'Pre-Built Weather Station',
    powerSpec: '10W Solar Array + 12000mAh LiFePO4 Bank',
    sensorsSpec: 'Dual BME280 + Air Quality + Tipping Rain + Wind',
    connectivitySpec: 'LoRa Mesh Relay + Local Wi-Fi Portal',
    enclosureSpec: 'Heavy-Duty IP66 Field Enclosure + Mounts',
    price: 6899.99,
    image: 'src/img/shop/station-mateo-offgrid-pro.svg',
    description:
      'Our flagship autonomous field station built for remote valleys, off-grid homesteads, and community hubs. Features redundant Bosch BME280 sensors, particulate/gas air-quality sensing, heavy-duty solar + LiFePO4 battery bank, and a built-in offline Wi-Fi weather portal.'
  }
];

/**
 * Modular list of DIY Components & Spare Parts for builders.
 * Add or remove items here at any time.
 */
export const DIY_COMPONENTS = [
  {
    id: 'comp-switches-pack',
    slug: 'comp-switches-pack',
    name: 'Tactile Mechanical Switches + Keycaps (10× Pack)',
    category: 'component',
    categoryLabel: 'Switches & Keycaps',
    specSummary: '10× switches + 10× blank PBT keycaps',
    compatibility: 'Fits all Macro Pad sizes',
    price: 189.99,
    image: 'src/img/shop/comp-switches-pack.svg',
    description:
      'A 10-pack of crisp tactile mechanical switches paired with blank matte keycaps—enough to populate a 3×3 pad with one spare.'
  },
  {
    id: 'comp-rotary-encoder',
    slug: 'comp-rotary-encoder',
    name: 'EC11 Rotary Encoder + Machined Knob',
    category: 'component',
    categoryLabel: 'Encoders & Dials',
    specSummary: 'Detented 360° dial + push switch',
    compatibility: 'Macro office / producer / Editor',
    price: 89.99,
    image: 'src/img/shop/comp-rotary-encoder.svg',
    description:
      'Smooth detented rotary encoder with integrated push-button click and a knurled aluminum cap for volume, brush size, or timeline scrubbing.'
  },
  {
    id: 'comp-hid-mcu',
    slug: 'comp-hid-mcu',
    name: 'USB HID Microcontroller Board (Pre-Flashed)',
    category: 'component',
    categoryLabel: 'Microcontrollers',
    specSummary: 'ATmega32U4 / RP2040 · EEPROM Ready',
    compatibility: 'USB Wired & DIY Matrix Builds',
    price: 219.99,
    image: 'src/img/shop/comp-hid-mcu.svg',
    description:
      'Comes pre-flashed with our open-source Macro EEPROM firmware so you can solder your switch matrix to pins 4–9 and start binding keys right away.'
  },
  {
    id: 'comp-ble-mcu',
    slug: 'comp-ble-mcu',
    name: 'Bluetooth + USB-C Controller Module',
    category: 'component',
    categoryLabel: 'Microcontrollers',
    specSummary: 'Wireless BLE HID + LiPo Charger',
    compatibility: 'Macro BT Series & Wireless Builds',
    price: 279.99,
    image: 'src/img/shop/comp-ble-mcu.svg',
    description:
      'Drop-in USB-C microcontroller with built-in Bluetooth Low Energy HID support and battery charging circuit for wireless macro pads.'
  },
  {
    id: 'comp-rfid-kit',
    slug: 'comp-rfid-kit',
    name: 'RFID Door Access Starter Kit (Reader + Relay Pair)',
    category: 'component',
    categoryLabel: 'Project Kits',
    specSummary: '2× ESP Boards + MFRC522 + Relay + 3 Cards',
    compatibility: 'RFID Student Access System',
    price: 449.99,
    image: 'src/img/shop/comp-rfid-kit.svg',
    description:
      'Everything needed on the bench to prototype our split-perimeter door system: exterior 13.56MHz reader, two ESP controllers, opto-isolated relay, and 3 blank student badges.'
  },
  {
    id: 'comp-mateo-sensor-kit',
    slug: 'comp-mateo-sensor-kit',
    name: 'Mateo Solar Weather Sensor DIY Bundle',
    category: 'component',
    categoryLabel: 'Project Kits',
    specSummary: 'ESP32-C6 + BME280 + MQ-135 + TP5000 + Solar',
    compatibility: 'Mateo Weather Network (DIY Build)',
    price: 899.99,
    image: 'src/img/shop/comp-mateo-sensor-kit.svg',
    description:
      'Unassembled electronics bundle for builders who want to 3D-print their own enclosure and solder a Mateo weather node from scratch (includes Bosch BME280, MQ-135 air quality sensor, solar charger, and 2W panel).'
  }
];

export const ASSEMBLED_MACRO_PADS = loadAssembledMacroPadsFromCsv();
export const ALL_SHOP_ITEMS = [
  ...ASSEMBLED_WEATHER_STATIONS,
  ...ASSEMBLED_MACRO_PADS,
  ...DIY_COMPONENTS
];

export const SHOP_PAGE_CONFIG = {
  pageTitle: 'Hardware & Parts Shop',
  pageDescription:
    'Shop pre-built Mateo solar weather stations, assembled Macro Pads, or individual DIY switches, rotary encoders, and starter kits.',
  header: {
    eyebrow: 'Eggman Studios Hardware Store',
    title: 'Pre-built devices & DIY parts.',
    subtitle:
      'Pick up a fully calibrated solar Mateo Weather Station, a ready-to-plug Macro Pad, or grab raw switches, sensors, and controllers to solder your own build at home.'
  },
  cartSummaryCard: {
    eyebrow: 'Shopping Cart',
    subtotalLabel: 'Subtotal:',
    ctaLabel: 'View Cart & Checkout →',
    ctaHref: 'cart.html'
  },
  tutorialsPrompt: {
    label: 'Need installation or wiring help? View Setup Tutorials →',
    href: 'tutorials.html'
  }
};

export const SHOP_FILTERS = [
  { id: 'all', label: 'All Items', countFn: (items) => items.length },
  {
    id: 'weather-station',
    label: 'Weather Stations',
    countFn: (items) => items.filter((i) => i.category === 'weather-station').length
  },
  {
    id: 'assembled',
    label: 'Assembled Macro Pads',
    countFn: (items) => items.filter((i) => i.category === 'assembled').length
  },
  { id: 'bluetooth', label: 'Wireless / Bluetooth' },
  { id: 'encoder', label: 'With Rotary Knob / Lever' },
  {
    id: 'component',
    label: 'DIY Parts & Kits',
    countFn: (items) => items.filter((i) => i.category === 'component').length
  }
];

export const SHOP_SECTIONS = [
  {
    id: 'weather-stations',
    category: 'weather-station',
    sectionClass: 'py-16 bg-slate-900 text-slate-200 border-b border-slate-800',
    eyebrow: 'Ready for Outdoor Deployment · Solar + Li-Ion Powered',
    eyebrowClass: 'text-teal-400',
    title: 'Pre-Built Mateo Weather Stations',
    titleClass: 'text-white',
    description:
      'Complete, weather-sealed outdoor stations built with genuine Bosch BME280 barometric sensors, MOSFET-gated MQ-135 air quality heaters, tempered-glass solar panels, and protected Li-Ion / LiFePO4 battery packs.',
    descriptionClass: 'text-slate-300',
    linkLabel: 'Learn how the Mateo network works →',
    linkHref: 'mateo.html',
    linkClass: 'text-xs font-semibold text-teal-400 hover:text-white shrink-0',
    gridClass: 'grid grid-cols-1 md:grid-cols-3 gap-6'
  },
  {
    id: 'assembled-devices',
    category: 'assembled',
    sectionClass: 'py-16 bg-slate-50 border-b border-slate-200/80',
    eyebrow: 'Ready to Plug & Play',
    eyebrowClass: 'text-teal-700',
    title: 'Assembled Macro Pads',
    titleClass: 'text-slate-900',
    description:
      'Fully soldered, flashed with our open-source EEPROM firmware, and ready for your desk.',
    descriptionClass: 'text-slate-600',
    linkLabel: 'See how the Macro Pad works →',
    linkHref: 'macro.html',
    linkClass: 'text-xs font-semibold text-teal-700 hover:text-slate-900 shrink-0',
    gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
  },
  {
    id: 'diy-components',
    category: 'component',
    sectionClass: 'py-16 bg-white border-b border-slate-200/80',
    eyebrow: 'Build or Repair Your Own',
    eyebrowClass: 'text-teal-700',
    title: 'Individual Components & DIY Kits',
    titleClass: 'text-slate-900',
    description:
      'Have a 3D printer and a soldering iron? Grab the exact microcontrollers, switches, and sensors used in our projects.',
    descriptionClass: 'text-slate-600',
    linkLabel: 'Proceed to Cart & Checkout →',
    linkHref: 'cart.html',
    linkClass:
      'shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors',
    gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
  }
];

export const CART_PAGE_CONFIG = {
  pageTitle: 'Shopping Cart & Checkout',
  pageDescription:
    'Review your Eggman Studios hardware cart, adjust quantities, and complete your order.',
  backLinkLabel: '← Continue Shopping in Hardware Store',
  backLinkHref: 'shop.html',
  header: {
    eyebrow: 'Hardware Order & Dispatch',
    title: 'Shopping Cart & Checkout',
    subtitle:
      'Review your selected devices and DIY kits below, adjust quantities, and submit your shipping details. Every assembled unit is bench-tested before dispatch.',
    addMoreLabel: '+ Add More Items',
    clearLabel: 'Clear Cart'
  },
  itemsPanel: {
    headingPrefix: 'Selected Hardware',
    emptyTitle: 'Your cart is currently empty',
    emptyDescription:
      'Browse our pre-built solar Mateo Weather Stations, custom Macro Pads, or DIY component kits to add items to your order.',
    emptyCtaLabel: 'Browse Hardware Shop →',
    emptyCtaHref: 'shop.html'
  },
  assuranceCards: [
    {
      badge: '01 · Bench Tested',
      text: 'Every assembled pad and weather station is tested over USB/serial before packing.'
    },
    {
      badge: '02 · Open Firmware',
      text: 'Ships pre-flashed with our open-source firmware—no cloud account required.'
    },
    {
      badge: '03 · Direct Support',
      text: 'Follow our step-by-step Setup Tutorials or ask questions on the Community Forum.'
    }
  ],
  summaryPanel: {
    eyebrow: 'Order Summary',
    title: 'Shipping & Order Confirmation',
    subtotalLabel: 'Hardware Subtotal',
    calibrationLabel: 'Firmware Pre-Flash & Calibration',
    calibrationValue: 'Included',
    totalLabel: 'Total Due',
    submitLabel: 'Place Order & Send Confirmation',
    fields: {
      nameLabel: 'Full Name *',
      namePlaceholder: 'Recipient full name',
      emailLabel: 'Email Address *',
      emailPlaceholder: 'Confirmation email address',
      phoneLabel: 'Phone (Courier)',
      phonePlaceholder: 'Contact phone number',
      addressLabel: 'Shipping Address (Street, City, Postal Code) *',
      addressPlaceholder: 'Street address, city, postal code, and country',
      notesLabel: 'Custom Build Notes (Switch type, keycap color, etc.)',
      notesPlaceholder: 'Optional build preferences or delivery notes'
    }
  }
};

/**
 * Sanitized, minimal projection of catalog items for client-side cart rendering
 * and canonical price verification. Excludes internal specs, CSV metadata, and
 * unnecessary fields to prevent data over-fetching.
 */
export const PUBLIC_CATALOG_SUMMARY = ALL_SHOP_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  categoryLabel: item.categoryLabel,
  price: Number(item.price),
  image: item.image
}));


