/**
 * Modular Footer Component — Eggman Studios
 * Clean footer with human-friendly links and sanitized repository links.
 */

import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function Footer({ assetPrefix = '.' } = {}) {
  const repoLinksHtml = PROJECTS.map(
    (p) => `
                        <li>
                            <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer"
                                class="hover:text-white transition-colors">${p.title} &nearr;</a>
                        </li>`
  ).join('');

  return `
    <!-- Clean Footer (Component: Footer) -->
    <footer data-component="Footer" class="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-800">
                <div>
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${assetPrefix}/src/img/eggmanlogo.svg" alt="${SITE_COPY.brand.name} Logo"
                            class="w-7 h-7 rounded bg-slate-800">
                        <span class="font-bold text-white text-sm tracking-tight">${SITE_COPY.brand.name}</span>
                    </div>
                    <p class="text-slate-400 leading-relaxed max-w-sm">
                        ${SITE_COPY.brand.subtitle} &middot; Practical tools and open community hardware.
                    </p>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Explore</h3>
                    <ul class="space-y-2">
                        <li><a href="index.html" class="hover:text-white transition-colors">Home &amp; Story</a></li>
                        <li><a href="projects.html" class="hover:text-white transition-colors">All Projects Directory</a></li>
                        <li><a href="shop.html" class="hover:text-white transition-colors">Hardware &amp; Parts Shop</a></li>
                        <li><a href="cart.html" class="hover:text-white transition-colors">Shopping Cart &amp; Checkout</a></li>
                        <li><a href="tutorials.html" class="hover:text-white transition-colors">Setup &amp; Assembly Tutorials</a></li>
                        <li><a href="forum.html" class="hover:text-white transition-colors">Community Forum</a></li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Source Repositories</h3>
                    <ul class="space-y-2">${repoLinksHtml}
                    </ul>
                </div>
            </div>

            <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>&copy; 2026 ${SITE_COPY.brand.name}. ${SITE_COPY.brand.licenseNote}.</p>
                <p class="text-slate-400">Built for people who like hardware they can actually own.</p>
            </div>
        </div>
    </footer>`;
}
