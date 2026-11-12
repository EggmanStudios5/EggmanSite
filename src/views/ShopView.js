/**
 * ShopView — Eggman Studios Hardware & Parts Catalog (`shop.html`)
 * Dynamically renders filter pills and product sections from `src/data/shop.js`.
 */

import { Layout } from '../components/Layout.js';
import { ShopCard } from '../components/ShopCard.js';
import { SITE_COPY } from '../data/projects.js';
import {
  ALL_SHOP_ITEMS,
  PUBLIC_CATALOG_SUMMARY,
  SHOP_CONFIG,
  SHOP_FILTERS,
  SHOP_PAGE_CONFIG,
  SHOP_SECTIONS
} from '../data/shop.js';

export function renderShopView({
  allItems = ALL_SHOP_ITEMS,
  sections = SHOP_SECTIONS,
  filters = SHOP_FILTERS,
  pageConfig = SHOP_PAGE_CONFIG,
  catalogSummary = PUBLIC_CATALOG_SUMMARY,
  assetPrefix = '.'
} = {}) {
  const sanitizedCatalogJson = JSON.stringify(catalogSummary).replace(/</g, '\\u003c');

  const filterButtonsHtml = filters
    .map((f, idx) => {
      const isActive = idx === 0;
      const countSuffix = typeof f.countFn === 'function' ? ` (${f.countFn(allItems)})` : '';
      const btnClass = isActive
        ? 'shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer'
        : 'shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer';
      return `<button type="button" data-shop-filter="${f.id}" class="${btnClass}">
                            ${f.label}${countSuffix}
                        </button>`;
    })
    .join('\n                        ');

  const sectionsHtml = sections
    .map((sec) => {
      const sectionItems = allItems.filter((item) => item.category === sec.category);
      if (sectionItems.length === 0) return '';

      const cardsHtml = sectionItems
        .map((item) => ShopCard(item, { assetPrefix }))
        .join('\n');

      return `
        <!-- Dynamic Catalog Section: ${sec.title} -->
        <section id="${sec.id}" data-shop-section="${sec.category}" class="${sec.sectionClass}">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider ${sec.eyebrowClass} block mb-1">
                            ${sec.eyebrow}
                        </span>
                        <h2 class="text-2xl sm:text-3xl font-bold ${sec.titleClass} tracking-tight">
                            ${sec.title}
                        </h2>
                        <p class="text-sm ${sec.descriptionClass} mt-1 max-w-2xl">
                            ${sec.description}
                        </p>
                    </div>
                    <a href="${sec.linkHref}" class="${sec.linkClass}">
                        ${sec.linkLabel}
                    </a>
                </div>

                <div class="${sec.gridClass}">
                    ${cardsHtml}
                </div>
            </div>
        </section>`;
    })
    .filter(Boolean)
    .join('\n');

  const bodyContent = `
        <!-- Storefront Header with Clean Cart Status Bar -->
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div class="lg:col-span-7 space-y-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            ${pageConfig.header.eyebrow}
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            ${pageConfig.header.title}
                        </h1>
                        <p class="text-base text-slate-600 leading-relaxed max-w-2xl">
                            ${pageConfig.header.subtitle}
                        </p>
                    </div>

                    <!-- Dedicated Cart Summary Card -->
                    <div class="lg:col-span-5">
                        <div class="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold uppercase tracking-wider text-teal-400">${pageConfig.cartSummaryCard.eyebrow}</span>
                                    <span id="cart-count-badge" class="px-2 py-0.5 rounded bg-teal-600 text-white text-xs font-mono font-bold">0</span>
                                </div>
                                <p class="text-xs text-slate-300">
                                    ${pageConfig.cartSummaryCard.subtotalLabel} <strong id="cart-total-price" class="text-white font-mono">0.00 ${SHOP_CONFIG.currencySymbol}</strong>
                                </p>
                            </div>
                            <a href="${pageConfig.cartSummaryCard.ctaHref}"
                                class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                ${pageConfig.cartSummaryCard.ctaLabel}
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Dynamic Filter Pills -->
                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter shop catalog">
                        ${filterButtonsHtml}
                    </div>

                    <a href="${pageConfig.tutorialsPrompt.href}" class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                        ${pageConfig.tutorialsPrompt.label}
                    </a>
                </div>
            </div>
        </section>

        ${sectionsHtml}

        <!-- Sanitized Catalog Summary for Canonical Client Cart Lookup -->
        <script type="application/json" id="catalog-summary-data">${sanitizedCatalogJson}</script>`;

  return Layout({
    title: `${pageConfig.pageTitle} — ${SITE_COPY.brand.name}`,
    description: pageConfig.pageDescription,
    activePage: 'shop',
    assetPrefix,
    bodyContent
  });
}
