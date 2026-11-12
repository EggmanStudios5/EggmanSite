/**
 * Modular About Component — Eggman Studios
 * Driven by `SITE_COPY.about` in `src/data/projects.js`.
 * Written in a calm, grounded voice without referencing specific projects.
 */

import { SITE_COPY } from '../data/projects.js';

export function About({ copy = SITE_COPY.about } = {}) {
  const paragraphsHtml = copy.paragraphs
    .map((p) => `<p class="text-base text-slate-600 leading-relaxed">${p}</p>`)
    .join('\n                        ');

  const principlesHtml = copy.principles
    .map(
      (item, idx) => `
                        <div class="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90">
                            <h3 class="text-base font-bold text-slate-900 mb-1.5">${idx + 1}. ${item.title}</h3>
                            <p class="text-sm text-slate-600 leading-relaxed">
                                ${item.description}
                            </p>
                        </div>`
    )
    .join('\n');

  return `
        <!-- About Us Section (Modular About Component) -->
        <section id="about" data-component="About" class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <!-- Left Column: General Studio Philosophy -->
                    <div class="lg:col-span-6 space-y-5">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${copy.eyebrow}</span>
                        <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                            ${copy.title}
                        </h2>
                        ${paragraphsHtml}
                    </div>

                    <!-- Right Column: Modular Principles List -->
                    <div class="lg:col-span-6 space-y-5 lg:pt-6">
                        ${principlesHtml}
                    </div>
                </div>
            </div>
        </section>`;
}
