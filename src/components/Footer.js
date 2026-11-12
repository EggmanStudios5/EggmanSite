/**
 * Modular Footer Component — Eggman Studios
 * Driven dynamically by `SITE_COPY.footer` and `PROJECTS` with dynamic year.
 */

import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function Footer({
  assetPrefix = '.',
  projects = PROJECTS,
  brand = SITE_COPY.brand,
  footerCopy = SITE_COPY.footer
} = {}) {
  const currentYear = new Date().getFullYear();

  const exploreLinksHtml = footerCopy.links
    .map(
      (link) => `
                        <li><a href="${link.href}" class="hover:text-white transition-colors">${link.label}</a></li>`
    )
    .join('');

  const repoLinksHtml = projects
    .map(
      (p) => `
                        <li>
                            <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer"
                                class="hover:text-white transition-colors">${p.title} &nearr;</a>
                        </li>`
    )
    .join('');

  return `
    <!-- Clean Footer (Component: Footer) -->
    <footer data-component="Footer" class="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-800">
                <div>
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${assetPrefix}/src/img/${brand.logo}" alt="${brand.name} Logo"
                            class="w-7 h-7 rounded bg-slate-800">
                        <span class="font-bold text-white text-sm tracking-tight">${brand.name}</span>
                    </div>
                    <p class="text-slate-400 leading-relaxed max-w-sm">
                        ${footerCopy.blurb}
                    </p>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">${footerCopy.exploreHeading}</h3>
                    <ul class="space-y-2">${exploreLinksHtml}
                    </ul>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">${footerCopy.reposHeading}</h3>
                    <ul class="space-y-2">${repoLinksHtml}
                    </ul>
                </div>
            </div>

            <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>&copy; ${currentYear} ${brand.name}. ${brand.licenseNote}.</p>
                <p class="text-slate-400">${footerCopy.tagline}</p>
            </div>
        </div>
    </footer>`;
}
