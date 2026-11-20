import { escapeHtml, sanitizeHref } from '../lib/escape.js';

export function Hero({ heroCopy }) {
  const secHref = sanitizeHref(heroCopy.secondaryCta.href);
  const secAttrs = secHref.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';

  return `
        <section id="hero" data-component="Hero"
            class="hero-banner relative border-b border-slate-200/80 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
                <p class="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3">
                    ${escapeHtml(heroCopy.kicker)}
                </p>
                <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
                    ${escapeHtml(heroCopy.title)}
                </h1>
                <p class="text-base sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl">
                    ${escapeHtml(heroCopy.subtitle)}
                </p>

                <div class="flex flex-wrap items-center gap-3">
                    <a href="${sanitizeHref(heroCopy.primaryCta.href)}"
                        class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs">
                        ${escapeHtml(heroCopy.primaryCta.label)} &rarr;
                    </a>
                    <a href="${secHref}"${secAttrs}
                        class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        ${escapeHtml(heroCopy.secondaryCta.label)}
                    </a>
                </div>
            </div>
        </section>`;
}
