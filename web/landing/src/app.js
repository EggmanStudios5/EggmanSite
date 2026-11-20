(() => {
  'use strict';

  function initMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenuBtn || !mobileMenu) return;

    mobileMenuBtn.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.toggle('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', String(!isHidden));
    });

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initShopFilters() {
    const filterBtns = document.querySelectorAll('.shop-filter-btn');
    const cards = document.querySelectorAll('.shop-item-card');
    const sections = document.querySelectorAll('[data-shop-section]');
    if (filterBtns.length === 0 || cards.length === 0) return;

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-shop-filter') || 'all';

        filterBtns.forEach((b) => {
          b.classList.remove('bg-slate-900', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-slate-900', 'text-white');

        cards.forEach((card) => {
          const tags = (card.getAttribute('data-shop-tags') || '').split(/\s+/);
          card.classList.toggle('hidden', filter !== 'all' && !tags.includes(filter));
        });

        sections.forEach((section) => {
          const visibleCount = section.querySelectorAll('.shop-item-card:not(.hidden)').length;
          section.classList.toggle('hidden', visibleCount === 0);
        });
      });
    });
  }

  initMobileNavigation();
  initShopFilters();
})();
