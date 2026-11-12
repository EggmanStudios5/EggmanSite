/**
 * CartView — Dedicated Shopping Cart & Checkout Page (`cart.html`)
 * Driven dynamically by `CART_PAGE_CONFIG` and `SHOP_CONFIG` in `src/data/shop.js`.
 */

import { Layout } from '../components/Layout.js';
import { SITE_COPY } from '../data/projects.js';
import {
  CART_PAGE_CONFIG,
  PUBLIC_CATALOG_SUMMARY,
  SHOP_CONFIG
} from '../data/shop.js';

export function renderCartView({
  pageConfig = CART_PAGE_CONFIG,
  shopConfig = SHOP_CONFIG,
  catalogSummary = PUBLIC_CATALOG_SUMMARY,
  assetPrefix = '.'
} = {}) {
  const emailJsHeadScript = `<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js" defer></script>`;

  const sanitizedCatalogJson = JSON.stringify(catalogSummary).replace(/</g, '\\u003c');
  const emailJsMetaConfig = JSON.stringify({
    publicKey: shopConfig.emailJs.publicKey || '',
    serviceId: shopConfig.emailJs.serviceId || '',
    templateId: shopConfig.emailJs.templateId || ''
  }).replace(/</g, '\\u003c');

  const assuranceCardsHtml = pageConfig.assuranceCards
    .map(
      (card) => `
                            <div class="p-4 rounded-xl bg-white border border-slate-200">
                                <span class="text-xs font-bold text-teal-700 block">${card.badge}</span>
                                <p class="text-xs text-slate-600 mt-1">${card.text}</p>
                            </div>`
    )
    .join('\n');

  const fields = pageConfig.summaryPanel.fields;

  const bodyContent = `
        <!-- Cart Page Header -->
        <section class="bg-white border-b border-slate-200/80 py-12">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="${pageConfig.backLinkHref}" class="text-xs font-semibold text-teal-700 hover:text-slate-900 transition-colors">
                        ${pageConfig.backLinkLabel}
                    </a>
                </div>

                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                            ${pageConfig.header.eyebrow}
                        </span>
                        <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                            ${pageConfig.header.title}
                        </h1>
                        <p class="text-sm text-slate-600 mt-1 max-w-2xl">
                            ${pageConfig.header.subtitle}
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <a href="${pageConfig.backLinkHref}"
                            class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                            ${pageConfig.header.addMoreLabel}
                        </a>
                        <button type="button" id="cart-clear-btn"
                            class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer">
                            ${pageConfig.header.clearLabel}
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
                                    ${pageConfig.itemsPanel.headingPrefix} (<span id="cart-count-badge" class="font-mono text-teal-700">0</span>)
                                </h2>
                                <span class="text-xs text-slate-500">Prices verified in ${shopConfig.currencySymbol}</span>
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
                                    <h3 class="text-base font-bold text-slate-900">${pageConfig.itemsPanel.emptyTitle}</h3>
                                    <p class="text-xs text-slate-500 max-w-sm mx-auto">
                                        ${pageConfig.itemsPanel.emptyDescription}
                                    </p>
                                </div>
                                <div class="pt-2">
                                    <a href="${pageConfig.itemsPanel.emptyCtaHref}"
                                        class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                                        ${pageConfig.itemsPanel.emptyCtaLabel}
                                    </a>
                                </div>
                            </div>

                            <!-- Populated Cart Items List -->
                            <div id="cart-items-list" class="hidden space-y-3" data-asset-prefix="${assetPrefix}"></div>
                        </div>

                        <!-- Hardware Assurance Strip -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            ${assuranceCardsHtml}
                        </div>
                    </div>

                    <!-- Right Column (5 cols): Order Summary & Shipping Form -->
                    <div class="lg:col-span-5 space-y-6">
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${pageConfig.summaryPanel.eyebrow}</span>
                                <h2 class="text-lg font-bold text-slate-900 mt-0.5">${pageConfig.summaryPanel.title}</h2>
                            </div>

                            <!-- Subtotal / Total Breakdown -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                                <div class="flex items-center justify-between text-slate-600">
                                    <span>${pageConfig.summaryPanel.subtotalLabel}</span>
                                    <span id="cart-subtotal-price" class="font-mono font-semibold text-slate-800">0.00 ${shopConfig.currencySymbol}</span>
                                </div>
                                <div class="flex items-center justify-between text-slate-600">
                                    <span>${pageConfig.summaryPanel.calibrationLabel}</span>
                                    <span class="font-semibold text-teal-700">${pageConfig.summaryPanel.calibrationValue}</span>
                                </div>
                                <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                                    <span class="font-bold text-slate-900">${pageConfig.summaryPanel.totalLabel}</span>
                                    <span id="cart-total-price" class="text-lg font-bold text-teal-700 font-mono">0.00 ${shopConfig.currencySymbol}</span>
                                </div>
                            </div>

                            <!-- Shipping & Contact Form -->
                            <form id="cart-checkout-form" class="space-y-3" novalidate>
                                <div>
                                    <label for="checkout-name" class="block text-xs font-bold text-slate-700 mb-1">${fields.nameLabel}</label>
                                    <input type="text" id="checkout-name" name="customerName" required maxlength="120"
                                        placeholder="${fields.namePlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label for="checkout-email" class="block text-xs font-bold text-slate-700 mb-1">${fields.emailLabel}</label>
                                        <input type="email" id="checkout-email" name="customerEmail" required maxlength="160"
                                            placeholder="${fields.emailPlaceholder}"
                                            class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                    </div>
                                    <div>
                                        <label for="checkout-phone" class="block text-xs font-bold text-slate-700 mb-1">${fields.phoneLabel}</label>
                                        <input type="tel" id="checkout-phone" name="customerPhone" maxlength="40"
                                            placeholder="${fields.phonePlaceholder}"
                                            class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                    </div>
                                </div>

                                <div>
                                    <label for="checkout-address" class="block text-xs font-bold text-slate-700 mb-1">${fields.addressLabel}</label>
                                    <textarea id="checkout-address" name="shippingAddress" rows="2" required maxlength="300"
                                        placeholder="${fields.addressPlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"></textarea>
                                </div>

                                <div>
                                    <label for="checkout-notes" class="block text-xs font-bold text-slate-700 mb-1">${fields.notesLabel}</label>
                                    <input type="text" id="checkout-notes" name="orderNotes" maxlength="250"
                                        placeholder="${fields.notesPlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                                </div>

                                <button type="submit" id="checkout-submit-btn"
                                    class="w-full py-3 px-5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer">
                                    ${pageConfig.summaryPanel.submitLabel}
                                </button>

                                <div id="checkout-feedback" role="status" aria-live="polite" class="hidden p-3.5 rounded-xl text-xs leading-relaxed"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Sanitized Catalog Summary & Runtime Config -->
        <script type="application/json" id="catalog-summary-data">${sanitizedCatalogJson}</script>
        <script type="application/json" id="emailjs-runtime-config">${emailJsMetaConfig}</script>`;

  return Layout({
    title: `${pageConfig.pageTitle} — ${SITE_COPY.brand.name}`,
    description: pageConfig.pageDescription,
    activePage: 'cart',
    assetPrefix,
    headScripts: emailJsHeadScript,
    bodyContent
  });
}
