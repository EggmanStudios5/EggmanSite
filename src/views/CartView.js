/**
 * CartView — Dedicated Shopping Cart & Checkout Page (`cart.html`)
 * Provides a clean, cohesive two-column checkout experience:
 *   - Left Column: Interactive cart line items, thumbnail previews, quantity controls, and empty state
 *   - Right Column: Order summary breakdown + Shipping & EmailJS Checkout form
 * Security:
 *   - Embeds only minimal sanitized catalog fields (`id`, `name`, `categoryLabel`, `price`, `image`)
 *   - Never exposes API key input boxes, internal email addresses, or raw exception messages
 */

import { Layout } from '../components/Layout.js';
import { SITE_COPY } from '../data/projects.js';
import { PUBLIC_CATALOG_SUMMARY, SHOP_CONFIG } from '../data/shop.js';

export function renderCartView({
  catalogSummary = PUBLIC_CATALOG_SUMMARY,
  assetPrefix = '.'
} = {}) {
  const emailJsHeadScript = `<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js" defer></script>`;

  // Minimal sanitized catalog JSON for canonical client-side price verification
  const sanitizedCatalogJson = JSON.stringify(catalogSummary).replace(/</g, '\\u003c');

  // Optional build-time EmailJS identifiers (empty strings if not configured at build time)
  const emailJsMetaConfig = JSON.stringify({
    publicKey: SHOP_CONFIG.emailJs.publicKey || '',
    serviceId: SHOP_CONFIG.emailJs.serviceId || '',
    templateId: SHOP_CONFIG.emailJs.templateId || ''
  }).replace(/</g, '\\u003c');

  const bodyContent = `
        <!-- Cart Page Header -->
        <section class="bg-white border-b border-slate-200/80 py-12">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="shop.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900 transition-colors">
                        &larr; Continue Shopping in Hardware Store
                    </a>
                </div>

                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                            Hardware Order &amp; Dispatch
                        </span>
                        <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                            Shopping Cart &amp; Checkout
                        </h1>
                        <p class="text-sm text-slate-600 mt-1 max-w-2xl">
                            Review your selected devices and DIY kits below, adjust quantities, and submit your shipping details. Every assembled unit is bench-tested before dispatch.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <a href="shop.html"
                            class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                            + Add More Items
                        </a>
                        <button type="button" id="cart-clear-btn"
                            class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer">
                            Clear Cart
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Main Two-Column Cart & Checkout Workspace -->
        <section class="py-14 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    <!-- Left Column (7 cols): Cart Items List & Empty State -->
                    <div class="lg:col-span-7 space-y-4">
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                                <h2 class="text-base font-bold text-slate-900">
                                    Selected Hardware (<span id="cart-count-badge" class="font-mono text-teal-700">0</span>)
                                </h2>
                                <span class="text-xs text-slate-500">Prices verified in ${SHOP_CONFIG.currencySymbol}</span>
                            </div>

                            <!-- Empty Cart Placeholder -->
                            <div id="cart-empty-state" class="py-12 text-center space-y-4">
                                <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <div class="space-y-1">
                                    <h3 class="text-base font-bold text-slate-900">Your cart is currently empty</h3>
                                    <p class="text-xs text-slate-500 max-w-sm mx-auto">
                                        Browse our pre-built solar Mateo Weather Stations, custom Macro Pads, or DIY component kits to add items to your order.
                                    </p>
                                </div>
                                <div class="pt-2">
                                    <a href="shop.html"
                                        class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                                        Browse Hardware Shop &rarr;
                                    </a>
                                </div>
                            </div>

                            <!-- Populated Cart Items List -->
                            <div id="cart-items-list" class="hidden space-y-3" data-asset-prefix="${assetPrefix}"></div>
                        </div>

                        <!-- Hardware Assurance Strip -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="p-4 rounded-xl bg-white border border-slate-200">
                                <span class="text-xs font-bold text-teal-700 block">01 &middot; Bench Tested</span>
                                <p class="text-xs text-slate-600 mt-1">Every assembled pad and weather station is tested over USB/serial before packing.</p>
                            </div>
                            <div class="p-4 rounded-xl bg-white border border-slate-200">
                                <span class="text-xs font-bold text-teal-700 block">02 &middot; Open Firmware</span>
                                <p class="text-xs text-slate-600 mt-1">Ships pre-flashed with our open-source firmware—no cloud account required.</p>
                            </div>
                            <div class="p-4 rounded-xl bg-white border border-slate-200">
                                <span class="text-xs font-bold text-teal-700 block">03 &middot; Direct Support</span>
                                <p class="text-xs text-slate-600 mt-1">Need setup help? Follow our step-by-step <a href="tutorials.html" class="text-teal-700 font-semibold hover:text-slate-900">Tutorials</a> or ask on the <a href="forum.html" class="text-teal-700 font-semibold hover:text-slate-900">Forum</a>.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column (5 cols): Order Summary & Shipping Form -->
                    <div class="lg:col-span-5 space-y-6">
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">Order Summary</span>
                                <h2 class="text-lg font-bold text-slate-900 mt-0.5">Shipping &amp; Order Confirmation</h2>
                            </div>

                            <!-- Subtotal / Total Breakdown -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                                <div class="flex items-center justify-between text-slate-600">
                                    <span>Hardware Subtotal</span>
                                    <span id="cart-subtotal-price" class="font-mono font-semibold text-slate-800">0.00 Kč</span>
                                </div>
                                <div class="flex items-center justify-between text-slate-600">
                                    <span>Firmware Pre-Flash &amp; Calibration</span>
                                    <span class="font-semibold text-teal-700">Included</span>
                                </div>
                                <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                                    <span class="font-bold text-slate-900">Total Due</span>
                                    <span id="cart-total-price" class="text-lg font-bold text-teal-700 font-mono">0.00 Kč</span>
                                </div>
                            </div>

                            <!-- Shipping & Contact Form -->
                            <form id="cart-checkout-form" class="space-y-3" novalidate>
                                <div>
                                    <label for="checkout-name" class="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                                    <input type="text" id="checkout-name" name="customerName" required maxlength="120"
                                        placeholder="Jan Novak"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label for="checkout-email" class="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                                        <input type="email" id="checkout-email" name="customerEmail" required maxlength="160"
                                            placeholder="jan@example.cz"
                                            class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                    </div>
                                    <div>
                                        <label for="checkout-phone" class="block text-xs font-bold text-slate-700 mb-1">Phone (Courier)</label>
                                        <input type="tel" id="checkout-phone" name="customerPhone" maxlength="40"
                                            placeholder="+420 777 123 456"
                                            class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                    </div>
                                </div>

                                <div>
                                    <label for="checkout-address" class="block text-xs font-bold text-slate-700 mb-1">Shipping Address (Street, City, ZIP) *</label>
                                    <textarea id="checkout-address" name="shippingAddress" rows="2" required maxlength="300"
                                        placeholder="Technicka 2, 166 27 Praha 6, Czech Republic"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"></textarea>
                                </div>

                                <div>
                                    <label for="checkout-notes" class="block text-xs font-bold text-slate-700 mb-1">Custom Build Notes (Switch type, keycap color, etc.)</label>
                                    <input type="text" id="checkout-notes" name="orderNotes" maxlength="250"
                                        placeholder="Optional: tactile brown switches, LoRa 868MHz..."
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                </div>

                                <button type="submit" id="checkout-submit-btn"
                                    class="w-full py-3 px-5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer">
                                    Place Order &amp; Send Confirmation
                                </button>

                                <div id="checkout-feedback" role="status" aria-live="polite" class="hidden p-3.5 rounded-xl text-xs leading-relaxed"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Sanitized Catalog Summary & Runtime Config (No Secrets Exposed) -->
        <script type="application/json" id="catalog-summary-data">${sanitizedCatalogJson}</script>
        <script type="application/json" id="emailjs-runtime-config">${emailJsMetaConfig}</script>`;

  return Layout({
    title: `Shopping Cart & Checkout — ${SITE_COPY.brand.name}`,
    description:
      'Review your Eggman Studios hardware cart, adjust quantities, and complete your order.',
    activePage: 'cart',
    assetPrefix,
    headScripts: emailJsHeadScript,
    bodyContent
  });
}
