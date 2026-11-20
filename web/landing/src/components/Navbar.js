import { escapeHtml, sanitizeHref } from '../lib/escape.js';

export function Navbar({ siteCopy, projects = [], activePage = 'home' }) {
  const navConfig = siteCopy.navigation;
  const brand = siteCopy.brand;
  const isHome = activePage === 'home';
  const isProjectsGroup =
    activePage === 'projects' || projects.some((p) => p.slug === activePage);

  const navLinkClass = (isActive) =>
    isActive
      ? 'text-teal-700 font-semibold transition-colors'
      : 'text-slate-600 hover:text-slate-900 transition-colors';

  const desktopLinksHtml = navConfig.links
    .map((item) => {
      const href = sanitizeHref(isHome && item.homeHref ? item.homeHref : item.href);
      const isExternal = href.startsWith('https://');
      const isActive = item.id === 'projects' ? isProjectsGroup : activePage === item.id;
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${attrs} class="${navLinkClass(isActive)}">${escapeHtml(item.label)}</a>`;
    })
    .join('\n                ');

  const mobileLinksHtml = navConfig.links
    .map((item) => {
      const href = sanitizeHref(isHome && item.homeHref ? item.homeHref : item.href);
      const isExternal = href.startsWith('https://');
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${attrs} class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">${escapeHtml(item.label)}</a>`;
    })
    .join('\n            ');

  return `
    <header data-component="Navbar" class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <a href="index.html" class="flex items-center gap-3 group">
                <img src="assets/img/${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.name)} Logo"
                    class="w-9 h-9 rounded-lg shadow-2xs border border-slate-200/80 object-contain bg-slate-900">
                <div>
                    <span class="font-bold text-base tracking-tight text-slate-900 block leading-none">${escapeHtml(brand.name)}</span>
                    <span class="text-[11px] font-medium text-slate-500 tracking-wide block mt-0.5">${escapeHtml(brand.subtitle)}</span>
                </div>
            </a>

            <nav class="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Main Navigation">
                ${desktopLinksHtml}
            </nav>

            <div class="hidden md:flex items-center gap-2.5">
                <a href="${sanitizeHref(navConfig.primaryCta.href)}"
                    class="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs">
                    ${escapeHtml(navConfig.primaryCta.label)}
                </a>
            </div>

            <div class="flex md:hidden items-center gap-2">
                <button id="mobile-menu-btn" type="button" aria-label="Toggle Menu" aria-expanded="false"
                    class="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div id="mobile-menu" class="hidden md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
            ${mobileLinksHtml}
        </div>
    </header>`;
}
