/**
 * ShopView — Eggman Studios Hardware & Parts Catalog (`shop.html`)
 * Focused product catalog for Pre-Built Mateo Weather Stations, Assembled Macro Pads,
 * and DIY Components. Links cleanly to the dedicated `cart.html` page for checkout.
 */

import { Layout } from '../components/Layout.js';
import { ShopCard } from '../components/ShopCard.js';
import { SITE_COPY } from '../data/projects.js';
import {
  ASSEMBLED_WEATHER_STATIONS,
  ASSEMBLED_MACRO_PADS,
  DIY_COMPONENTS,
  PUBLIC_CATALOG_SUMMARY
} from '../data/shop.js';

export function renderShopView({
  weatherStations = ASSEMBLED_WEATHER_STATIONS,
  assembledItems = ASSEMBLED_MACRO_PADS,
  diyItems = DIY_COMPONENTS,
  catalogSummary = PUBLIC_CATALOG_SUMMARY,
  assetPrefix = '.'
} = {}) {
  const weatherStationCardsHtml = weatherStations
    .map((item) => ShopCard(item, { assetPrefix }))
    .join('\n');

  const assembledCardsHtml = assembledItems
    .map((item) => ShopCard(item, { assetPrefix }))
    .join('\n');

  const diyCardsHtml = diyItems
    .map((item) => ShopCard(item, { assetPrefix }))
    .join('\n');

  const totalProducts = weatherStations.length + assembledItems.length + diyItems.length;
  const sanitizedCatalogJson = JSON.stringify(catalogSummary).replace(/</g, '\\u003c');

  const bodyContent = `
        <!-- Storefront Header with Clean Cart Status Bar -->
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div class="lg:col-span-7 space-y-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            Eggman Studios Hardware Store
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            Pre-built devices &amp; DIY parts.
                        </h1>
                        <p class="text-base text-slate-600 leading-relaxed max-w-2xl">
                            Pick up a fully calibrated solar <strong>Mateo Weather Station</strong>, a ready-to-plug <strong>Macro Pad</strong>, or grab raw switches, sensors, and controllers to solder your own build at home.
                        </p>
                    </div>

                    <!-- Dedicated Cart Summary Card (Links to cart.html) -->
                    <div class="lg:col-span-5">
                        <div class="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase tracking-wider text-teal-400">Shopping Cart</span>
                                    <span id="cart-count-badge" class="px-2 py-0.5 rounded bg-teal-600 text-white text-xs font-mono font-bold">0</span>
                                </div>
                                <p class="text-xs text-slate-300">
                                    Subtotal: <strong id="cart-total-price" class="text-white font-mono">0.00 Kč</strong>
                                </p>
                            </div>
                            <a href="cart.html"
                                class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                View Cart &amp; Checkout &rarr;
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Interactive Filter Pills -->
                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter shop catalog">
                        <button type="button" data-shop-filter="all"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer">
                            All Items (${totalProducts})
                        </button>
                        <button type="button" data-shop-filter="weather-station"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                            Weather Stations (${weatherStations.length})
                        </button>
                        <button type="button" data-shop-filter="assembled"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                            Assembled Macro Pads (${assembledItems.length})
                        </button>
                        <button type="button" data-shop-filter="bluetooth"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                            Wireless / Bluetooth
                        </button>
                        <button type="button" data-shop-filter="encoder"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                            With Rotary Knob / Lever
                        </button>
                        <button type="button" data-shop-filter="component"
                            class="shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                            DIY Parts &amp; Kits (${diyItems.length})
                        </button>
                    </div>

                    <a href="tutorials.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                        Need installation or wiring help? View Setup Tutorials &rarr;
                    </a>
                </div>
            </div>
        </section>

        <!-- Section 0: Pre-Built Mateo Solar Weather Stations -->
        <section id="weather-stations" class="py-16 bg-slate-900 text-slate-200 border-b border-slate-800">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">
                            Ready for Outdoor Deployment &middot; Solar + Li-Ion Powered
                        </span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Pre-Built Mateo Weather Stations
                        </h2>
                        <p class="text-sm text-slate-300 mt-1 max-w-2xl">
                            Complete, weather-sealed outdoor stations built with genuine Bosch BME280 barometric sensors, MOSFET-gated MQ-135 air quality heaters, tempered-glass solar panels, and protected Li-Ion / LiFePO4 battery packs.
                        </p>
                    </div>
                    <a href="mateo.html" class="text-xs font-semibold text-teal-400 hover:text-white shrink-0">
                        Learn how the Mateo network works &rarr;
                    </a>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${weatherStationCardsHtml}
                </div>
            </div>
        </section>

        <!-- Section 1: Assembled Macro Pads -->
        <section id="assembled-devices" class="py-16 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                            Ready to Plug &amp; Play
                        </span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Assembled Macro Pads
                        </h2>
                        <p class="text-sm text-slate-600 mt-1">
                            Fully soldered, flashed with our open-source EEPROM firmware, and ready for your desk.
                        </p>
                    </div>
                    <a href="macro.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900 shrink-0">
                        See how the Macro Pad works &rarr;
                    </a>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${assembledCardsHtml}
                </div>
            </div>
        </section>

        <!-- Section 2: DIY Components & Project Kits -->
        <section id="diy-components" class="py-16 bg-white border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                            Build or Repair Your Own
                        </span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Individual Components &amp; DIY Kits
                        </h2>
                        <p class="text-sm text-slate-600 mt-1">
                            Have a 3D printer and a soldering iron? Grab the exact microcontrollers, switches, and sensors used in our projects.
                        </p>
                    </div>
                    <a href="cart.html"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Proceed to Cart &amp; Checkout &rarr;
                    </a>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${diyCardsHtml}
                </div>
            </div>
        </section>

        <!-- Sanitized Catalog Summary for Canonical Client Cart Lookup -->
        <script type="application/json" id="catalog-summary-data">${sanitizedCatalogJson}</script>`;

  return Layout({
    title: `Hardware & Parts Shop — ${SITE_COPY.brand.name}`,
    description:
      'Shop pre-built Mateo solar weather stations, assembled Macro Pads, or individual DIY switches, rotary encoders, and starter kits.',
    activePage: 'shop',
    assetPrefix,
    bodyContent
  });
}
