/**
 * Modular ShopCard Component — Eggman Studios
 * Renders either an Assembled Device, Pre-Built Weather Station, or DIY Component
 * with its placeholder image, specs, formatted price, and canonical ID Add-to-Cart trigger.
 */

import { formatPrice } from '../data/shop.js';

export function ShopCard(item, { assetPrefix = '.' } = {}) {
  const isAssembled = item.category === 'assembled';
  const isWeatherStation = item.category === 'weather-station';
  const formattedPrice = formatPrice(item.price);

  const hasEncoder = Boolean(item.specialComponents);
  const filterTags = [
    item.category,
    item.bluetooth ? 'bluetooth' : 'wired',
    hasEncoder ? 'encoder' : 'no-encoder'
  ].join(' ');

  let specsHtml = '';
  if (isWeatherStation) {
    specsHtml = `
                            <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs mb-4">
                                <div>
                                    <span class="text-[11px] text-slate-400 block">Solar &amp; Battery</span>
                                    <span class="font-semibold text-slate-800">${item.powerSpec}</span>
                                </div>
                                <div>
                                    <span class="text-[11px] text-slate-400 block">Sensors</span>
                                    <span class="font-semibold text-teal-700">${item.sensorsSpec}</span>
                                </div>
                                <div class="col-span-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                                    <span class="text-[11px] text-slate-400">Radio / Link:</span>
                                    <span class="font-mono font-semibold text-slate-700">${item.connectivitySpec}</span>
                                </div>
                            </div>`;
  } else if (isAssembled) {
    specsHtml = `
                            <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs mb-4">
                                <div>
                                    <span class="text-[11px] text-slate-400 block">Buttons / Matrix</span>
                                    <span class="font-semibold text-slate-800">${item.buttonsCount} keys <span class="font-mono text-slate-500">(${item.matrixSpec})</span></span>
                                </div>
                                <div>
                                    <span class="text-[11px] text-slate-400 block">Connection</span>
                                    <span class="font-semibold text-slate-800">${item.bluetooth ? 'Bluetooth + ' : ''}${item.connector}</span>
                                </div>
                                <div class="col-span-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                                    <span class="text-[11px] text-slate-400">Special Hardware:</span>
                                    <span class="font-mono font-semibold ${item.specialComponents ? 'text-teal-700' : 'text-slate-500'}">
                                        ${item.specialComponents ? item.specialComponents : 'Standard Keys'}
                                    </span>
                                </div>
                            </div>`;
  } else {
    specsHtml = `
                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs mb-4 space-y-1">
                                <div class="flex items-center justify-between">
                                    <span class="text-[11px] text-slate-400">Includes:</span>
                                    <span class="font-semibold text-slate-800">${item.specSummary}</span>
                                </div>
                                <div class="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                    <span class="text-[11px] text-slate-400">Fits:</span>
                                    <span class="text-slate-600">${item.compatibility}</span>
                                </div>
                            </div>`;
  }

  return `
                    <!-- Modular ShopCard: ${item.name} -->
                    <article data-component="ShopCard"
                        data-shop-category="${item.category}"
                        data-shop-tags="${filterTags}"
                        data-item-id="${item.id}"
                        class="shop-item-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
                        <div>
                            <!-- Placeholder Product Image -->
                            <div class="border-b border-slate-100 bg-slate-50">
                                <img src="${assetPrefix}/${item.image}" alt="${item.name} Placeholder"
                                    class="w-full h-44 object-contain p-2">
                            </div>

                            <!-- Card Body -->
                            <div class="p-6 pb-4">
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                                        ${item.categoryLabel}
                                    </span>
                                    ${
                                      item.bluetooth
                                        ? '<span class="text-[11px] font-semibold bg-teal-50 text-teal-800 px-2 py-0.5 rounded">Bluetooth</span>'
                                        : ''
                                    }
                                </div>

                                <h3 class="text-lg font-bold text-slate-900 mb-2">${item.name}</h3>
                                <p class="text-xs text-slate-600 leading-relaxed mb-4">
                                    ${item.description}
                                </p>

                                ${specsHtml}
                            </div>
                        </div>

                        <!-- Price & Add to Cart Footer -->
                        <div class="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div>
                                <span class="text-[11px] text-slate-400 block">Price</span>
                                <span class="text-lg font-bold text-slate-900">${formattedPrice}</span>
                            </div>
                            <button type="button"
                                data-add-to-cart="${item.id}"
                                class="shop-add-btn inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
                                + Add to Cart
                            </button>
                        </div>
                    </article>`;
}
