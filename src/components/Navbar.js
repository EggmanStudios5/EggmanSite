/**
 * Modular Navbar Component — Eggman Studios
 * Dynamically renders navigation items and CTAs from `SITE_COPY.navigation`.
 */

import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function Navbar({
  activePage = 'home',
  assetPrefix = '.',
  navConfig = SITE_COPY.navigation,
  brand = SITE_COPY.brand
} = {}) {
  const isHome = activePage === 'home';
  const isProjectsGroup =
    activePage === 'projects' || PROJECTS.some((p) => p.slug === activePage);
  const isCart = activePage === navConfig.cartLink.id;

  const navLinkClass = (isActive) =>
    isActive
      ? 'text-teal-700 font-semibold transition-colors'
      : 'text-slate-600 hover:text-slate-900 transition-colors';

  const cartPillClass = isCart
    ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white transition-colors'
    : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors';

  const desktopLinksHtml = navConfig.links
    .map((item) => {
      const href = isHome && item.homeHref ? item.homeHref : item.href;
      const isActive =
        item.id === 'projects' ? isProjectsGroup : activePage === item.id;
      return `<a href="${href}" class="${navLinkClass(isActive)}">${item.label}</a>`;
    })
    .join('\n                ');

  const mobileLinksHtml = [
    ...navConfig.links.map((item) => ({
      href: isHome && item.homeHref ? item.homeHref : item.href,
      label: item.label
    })),
    {
      href: navConfig.cartLink.href,
      label: navConfig.cartLink.mobileLabel || navConfig.cartLink.label
    }
  ]
    .map(
      (item) => `<a href="${item.href}"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">${item.label}</a>`
    )
    .join('\n            ');

  return `
    <!-- Clean Sticky Navigation (Component: Navbar) -->
    <header data-component="Navbar" class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <!-- Brand Identity -->
            <a href="index.html" class="flex items-center gap-3 group">
                <img src="${assetPrefix}/src/img/${brand.logo}" alt="${brand.name} Logo"
                    class="w-9 h-9 rounded-lg shadow-2xs border border-slate-200/80 object-contain bg-slate-900">
                <div>
                    <span class="font-bold text-base tracking-tight text-slate-900 block leading-none">${brand.name}</span>
                    <span class="text-[11px] font-medium text-slate-500 tracking-wide block mt-0.5">${brand.subtitle}</span>
                </div>
            </a>

            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Main Navigation">
                ${desktopLinksHtml}
            </nav>

            <!-- Action CTAs -->
            <div class="hidden md:flex items-center gap-2.5">
                <a href="${navConfig.cartLink.href}" class="${cartPillClass}" aria-label="${navConfig.cartLink.ariaLabel}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <span>${navConfig.cartLink.label}</span>
                    <span id="nav-cart-count" data-nav-cart-count
                        class="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold leading-none">0</span>
                </a>
                <a href="${navConfig.primaryCta.href}"
                    class="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs">
                    ${navConfig.primaryCta.label}
                </a>
            </div>

            <!-- Mobile Menu Button -->
            <div class="flex md:hidden items-center gap-2">
                <a href="${navConfig.cartLink.href}" class="${cartPillClass}" aria-label="${navConfig.cartLink.ariaLabel}">
                    <span>${navConfig.cartLink.label}</span>
                    <span data-nav-cart-count
                        class="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold leading-none">0</span>
                </a>
                <button id="mobile-menu-btn" type="button" aria-label="Toggle Menu" aria-expanded="false"
                    class="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Mobile Navigation Drawer -->
        <div id="mobile-menu" class="hidden md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
            ${mobileLinksHtml}
        </div>
    </header>`;
}
