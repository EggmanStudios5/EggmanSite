import { escapeHtml, sanitizeHref } from '../lib/escape.js';

export function TutorialsGrid({ tutorialsConfig }) {
  const cardsHtml = (tutorialsConfig.items || [])
    .map(
      (item) => `
                    <a href="${sanitizeHref(item.href)}" target="_blank" rel="noopener noreferrer"
                        class="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-600 transition-colors flex flex-col justify-between gap-3">
                        <div class="space-y-2">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${escapeHtml(item.badge)}</span>
                            <h3 class="text-base font-bold text-slate-900">${escapeHtml(item.title)}</h3>
                            <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(item.summary)}</p>
                        </div>
                        <span class="text-xs font-semibold text-teal-700">Read Guide &nearr;</span>
                    </a>`
    )
    .join('\n');

  return `
        <section id="tutorials" data-component="TutorialsGrid" class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div class="max-w-2xl space-y-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${escapeHtml(tutorialsConfig.eyebrow)}</span>
                        <h2 class="text-3xl font-bold text-slate-900 tracking-tight">${escapeHtml(tutorialsConfig.title)}</h2>
                        <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(tutorialsConfig.description)}</p>
                    </div>
                    <a href="${sanitizeHref(tutorialsConfig.ctaHref)}" target="_blank" rel="noopener noreferrer"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        ${escapeHtml(tutorialsConfig.ctaLabel)}
                    </a>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    ${cardsHtml}
                </div>
            </div>
        </section>`;
}
