import { escapeHtml, sanitizeHref } from '../lib/escape.js';
import { Layout } from '../components/Layout.js';
import { ShopCard } from '../components/ShopCard.js';

export function renderShopView({ siteCopy, projects, catalog }) {
  const { config, allItems } = catalog;
  const pageConfig = config.pageConfig;

  const filters = [
    { id: 'all', label: `All Items (${allItems.length})` },
    {
      id: 'weather-station',
      label: `Weather Blueprints (${allItems.filter((i) => i.category === 'weather-station').length})`
    },
    {
      id: 'assembled',
      label: `Macro Pads (${allItems.filter((i) => i.category === 'assembled').length})`
    },
    { id: 'bluetooth', label: 'Wireless / Bluetooth' },
    { id: 'encoder', label: 'With Rotary Dial' },
    {
      id: 'component',
      label: `DIY Parts & Kits (${allItems.filter((i) => i.category === 'component').length})`
    }
  ];

  const filterButtonsHtml = filters
    .map((f, idx) => {
      const btnClass =
        idx === 0
          ? 'shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer'
          : 'shop-filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer';
      return `<button type="button" data-shop-filter="${escapeHtml(f.id)}" class="${btnClass}">${escapeHtml(f.label)}</button>`;
    })
    .join('\n                        ');

  const sections = [
    {
      id: 'assembled-devices',
      category: 'assembled',
      sectionClass: 'py-16 bg-slate-50 border-b border-slate-200/80',
      eyebrow: 'Programmable Desk Hardware',
      eyebrowClass: 'text-teal-700',
      title: 'Macro Pad Hardware Lineup',
      titleClass: 'text-slate-900',
      description: 'EEPROM-backed USB and Bluetooth macro pads driven by open-source firmware.',
      descriptionClass: 'text-slate-600',
      linkLabel: 'See Macro Pad overview →',
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
      description: 'Reference bills of materials for switches, encoders, microcontrollers, and starter kits.',
      descriptionClass: 'text-slate-600',
      linkLabel: 'Open Docs & Assembly Guides →',
      linkHref: 'https://docs.eggmanstudios.me',
      linkClass: 'text-xs font-semibold text-teal-700 hover:text-slate-900 shrink-0',
      gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
    },
    {
      id: 'weather-stations',
      category: 'weather-station',
      sectionClass: 'py-16 bg-slate-900 text-slate-200 border-b border-slate-800',
      eyebrow: 'Reference Designs · Solar + Environmental',
      eyebrowClass: 'text-teal-400',
      title: 'Mateo Weather Station Blueprints',
      titleClass: 'text-white',
      description: 'Open hardware reference specifications pairing Bosch BME280, air quality sensing, and solar power.',
      descriptionClass: 'text-slate-300',
      linkLabel: 'Explore Mateo blueprint →',
      linkHref: 'mateo.html',
      linkClass: 'text-xs font-semibold text-teal-400 hover:text-white shrink-0',
      gridClass: 'grid grid-cols-1 md:grid-cols-3 gap-6'
    }
  ];

  const sectionsHtml = sections
    .map((sec) => {
      const sectionItems = allItems.filter((item) => item.category === sec.category);
      if (sectionItems.length === 0) return '';
      const cardsHtml = sectionItems
        .map((item) =>
          ShopCard(item, {
            currencySymbol: config.currencySymbol,
            currencyPosition: config.currencyPosition
          })
        )
        .join('\n');
      const isExternal = sec.linkHref.startsWith('https://');
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

      return `
        <section id="${escapeHtml(sec.id)}" data-shop-section="${escapeHtml(sec.category)}" class="${sec.sectionClass}">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider ${sec.eyebrowClass} block mb-1">${escapeHtml(sec.eyebrow)}</span>
                        <h2 class="text-2xl sm:text-3xl font-bold ${sec.titleClass} tracking-tight">${escapeHtml(sec.title)}</h2>
                        <p class="text-sm ${sec.descriptionClass} mt-1 max-w-2xl">${escapeHtml(sec.description)}</p>
                    </div>
                    <a href="${sanitizeHref(sec.linkHref)}"${attrs} class="${sec.linkClass}">${escapeHtml(sec.linkLabel)}</a>
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
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div class="lg:col-span-7 space-y-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            ${escapeHtml(pageConfig.header.eyebrow)}
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            ${escapeHtml(pageConfig.header.title)}
                        </h1>
                        <p class="text-base text-slate-600 leading-relaxed max-w-2xl">
                            ${escapeHtml(pageConfig.header.subtitle)}
                        </p>
                    </div>

                    <div class="lg:col-span-5">
                        <div class="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs space-y-3">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block">${escapeHtml(pageConfig.statusCard.eyebrow)}</span>
                            <h2 class="text-base font-bold text-white">${escapeHtml(pageConfig.statusCard.title)}</h2>
                            <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(pageConfig.statusCard.description)}</p>
                            <a href="${sanitizeHref(pageConfig.statusCard.ctaHref)}" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                ${escapeHtml(pageConfig.statusCard.ctaLabel)}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter hardware showcase">
                        ${filterButtonsHtml}
                    </div>

                    <a href="${sanitizeHref(pageConfig.tutorialsPrompt.href)}" target="_blank" rel="noopener noreferrer"
                        class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                        ${escapeHtml(pageConfig.tutorialsPrompt.label)}
                    </a>
                </div>
            </div>
        </section>

        ${sectionsHtml}`;

  return Layout({
    siteCopy,
    projects,
    title: `${pageConfig.pageTitle} — ${siteCopy.brand.name}`,
    description: pageConfig.pageDescription,
    activePage: 'shop',
    bodyContent
  });
}
