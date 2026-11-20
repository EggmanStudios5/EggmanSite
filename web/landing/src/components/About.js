import { escapeHtml } from '../lib/escape.js';

export function About({ copy }) {
  const paragraphsHtml = copy.paragraphs
    .map((p) => `<p class="text-base text-slate-600 leading-relaxed">${escapeHtml(p)}</p>`)
    .join('\n                        ');

  const principlesHtml = copy.principles
    .map(
      (item, idx) => `
                        <div class="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90">
                            <h3 class="text-base font-bold text-slate-900 mb-1.5">${idx + 1}. ${escapeHtml(item.title)}</h3>
                            <p class="text-sm text-slate-600 leading-relaxed">
                                ${escapeHtml(item.description)}
                            </p>
                        </div>`
    )
    .join('\n');

  return `
        <section id="about" data-component="About" class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div class="lg:col-span-6 space-y-5">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${escapeHtml(copy.eyebrow)}</span>
                        <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                            ${escapeHtml(copy.title)}
                        </h2>
                        ${paragraphsHtml}
                    </div>

                    <div class="lg:col-span-6 space-y-5 lg:pt-6">
                        ${principlesHtml}
                    </div>
                </div>
            </div>
        </section>`;
}
