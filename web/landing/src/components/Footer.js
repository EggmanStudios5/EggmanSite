import { escapeHtml, sanitizeHref } from '../lib/escape.js';

export function Footer({ siteCopy, projects = [] }) {
  const brand = siteCopy.brand;
  const footerCopy = siteCopy.footer;
  const currentYear = new Date().getFullYear();

  const exploreLinksHtml = footerCopy.links
    .map((link) => {
      const href = sanitizeHref(link.href);
      const attrs = href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `\n                        <li><a href="${href}"${attrs} class="hover:text-white transition-colors">${escapeHtml(link.label)}</a></li>`;
    })
    .join('');

  const repoLinksHtml = projects
    .map(
      (p) => `
                        <li>
                            <a href="${sanitizeHref(p.githubUrl)}" target="_blank" rel="noopener noreferrer"
                                class="hover:text-white transition-colors">${escapeHtml(p.title)} &nearr;</a>
                        </li>`
    )
    .join('');

  return `
    <footer data-component="Footer" class="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-800">
                <div>
                    <div class="flex items-center gap-3 mb-3">
                        <img src="assets/img/${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.name)} Logo"
                            class="w-7 h-7 rounded bg-slate-800">
                        <span class="font-bold text-white text-sm tracking-tight">${escapeHtml(brand.name)}</span>
                    </div>
                    <p class="text-slate-400 leading-relaxed max-w-sm">
                        ${escapeHtml(footerCopy.blurb)}
                    </p>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">${escapeHtml(footerCopy.exploreHeading)}</h3>
                    <ul class="space-y-2">${exploreLinksHtml}
                    </ul>
                </div>

                <div>
                    <h3 class="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">${escapeHtml(footerCopy.reposHeading)}</h3>
                    <ul class="space-y-2">${repoLinksHtml}
                    </ul>
                </div>
            </div>

            <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>&copy; ${currentYear} ${escapeHtml(brand.name)}. ${escapeHtml(brand.licenseNote)}.</p>
                <p class="text-slate-400">${escapeHtml(footerCopy.tagline)}</p>
            </div>
        </div>
    </footer>`;
}
