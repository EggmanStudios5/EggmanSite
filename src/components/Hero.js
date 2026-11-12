/**
 * Modular Hero Component — Eggman Studios
 * Clean, welcoming landing hero without listing individual projects—focused on
 * introducing Eggman Studios and guiding visitors to `projects.html`.
 */

import { SITE_COPY } from '../data/projects.js';

export function Hero({
  kicker = SITE_COPY.hero.kicker,
  title = SITE_COPY.hero.title,
  subtitle = SITE_COPY.hero.subtitle,
  primaryCta = SITE_COPY.hero.primaryCta,
  secondaryCta = SITE_COPY.hero.secondaryCta
} = {}) {
  return `
        <!-- Hero Section (Modular Hero Component) -->
        <section id="hero" data-component="Hero"
            class="hero-banner relative border-b border-slate-200/80 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-left">
                <p class="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3">
                    ${kicker}
                </p>
                <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
                    ${title}
                </h1>
                <p class="text-base sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl">
                    ${subtitle}
                </p>

                <div class="flex flex-wrap items-center gap-3">
                    <a href="${primaryCta.href}"
                        class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs">
                        ${primaryCta.label} &rarr;
                    </a>
                    <a href="${secondaryCta.href}"
                        class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        ${secondaryCta.label}
                    </a>
                </div>
            </div>
        </section>`;
}
