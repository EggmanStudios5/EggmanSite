/**
 * Modular Navbar Component — Eggman Studios
 * Clean, human-focused top navigation with live Cart link & badge counter.
 */

import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function Navbar({ activePage = 'home', assetPrefix = '.' } = {}) {
  const isHome = activePage === 'home';
  const isProjectsGroup =
    activePage === 'projects' || PROJECTS.some((p) => p.slug === activePage);
  const isShop = activePage === 'shop';
  const isCart = activePage === 'cart';
  const isTutorials = activePage === 'tutorials';
  const isForum = activePage === 'forum';

  const navLinkClass = (isActive) =>
    isActive
      ? 'text-teal-700 font-semibold transition-colors'
      : 'text-slate-600 hover:text-slate-900 transition-colors';

  const cartPillClass = isCart
    ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white transition-colors'
    : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors';

  return `
    <!-- Clean Sticky Navigation (Component: Navbar) -->
    <header data-component="Navbar" class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <!-- Brand Identity -->
            <a href="index.html" class="flex items-center gap-3 group">
                <img src="${assetPrefix}/src/img/eggmanlogo.svg" alt="${SITE_COPY.brand.name} Logo"
                    class="w-9 h-9 rounded-lg shadow-2xs border border-slate-200/80 object-contain bg-slate-900">
                <div>
                    <span class="font-bold text-base tracking-tight text-slate-900 block leading-none">${SITE_COPY.brand.name}</span>
                    <span class="text-[11px] font-medium text-slate-500 tracking-wide block mt-0.5">${SITE_COPY.brand.subtitle}</span>
                </div>
            </a>

            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Main Navigation">
                <a href="${isHome ? '#about' : 'index.html#about'}" class="${navLinkClass(false)}">Our Story</a>
                <a href="projects.html" class="${navLinkClass(isProjectsGroup)}">Projects</a>
                <a href="shop.html" class="${navLinkClass(isShop)}">Shop</a>
                <a href="tutorials.html" class="${navLinkClass(isTutorials)}">Tutorials</a>
                <a href="forum.html" class="${navLinkClass(isForum)}">Forum</a>
            </nav>

            <!-- Action CTAs: Dedicated Cart Page Link + Projects -->
            <div class="hidden md:flex items-center gap-2.5">
                <a href="cart.html" class="${cartPillClass}" aria-label="View Shopping Cart and Checkout">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <span>Cart</span>
                    <span id="nav-cart-count" data-nav-cart-count
                        class="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold leading-none">0</span>
                </a>
                <a href="projects.html"
                    class="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs">
                    Browse Projects
                </a>
            </div>

            <!-- Mobile Menu Button -->
            <div class="flex md:hidden items-center gap-2">
                <a href="cart.html" class="${cartPillClass}" aria-label="Shopping Cart">
                    <span>Cart</span>
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
            <a href="${isHome ? '#about' : 'index.html#about'}"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Our Story</a>
            <a href="projects.html"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Projects</a>
            <a href="shop.html"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Shop</a>
            <a href="cart.html"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Cart &amp; Checkout</a>
            <a href="tutorials.html"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Tutorials</a>
            <a href="forum.html"
                class="mobile-nav-link block py-2 text-sm font-medium text-slate-700 hover:text-teal-700">Forum</a>
        </div>
    </header>`;
}
