/**
 * Eggman Studios — Client Application Architecture (`src/app.js`)
 *
 * Structured into isolated, defensive controllers with:
 *   1. Global Error Boundary (`ErrorBoundary`) — fails securely with generic, user-friendly messages.
 *   2. Strict Input Sanitizer (`Sanitizer`) — prevents XSS, control-character injection, and bounds overflow.
 *   3. Canonical Cart State Store (`CartStore`) — verifies item IDs and prices against the canonical catalog
 *      rather than trusting DOM attributes or tampered `localStorage` values.
 *   4. Modular UI Controllers (`Navigation`, `CatalogFilter`, `CartView`, `Tutorials`, `Forum`).
 */

(() => {
  'use strict';

  /* ==========================================================================
   * 1. GLOBAL ERROR BOUNDARY (Fail Securely — Zero Stack/Internal Exposure)
   * ========================================================================== */
  const ErrorBoundary = {
    GENERIC_MESSAGE:
      'We encountered a temporary issue completing that action. Please refresh the page or try again in a moment.',

    showBanner(customFriendlyMessage) {
      const banner = document.getElementById('app-error-boundary');
      const msgNode = document.getElementById('app-error-boundary-msg');
      if (!banner) return;
      if (msgNode) {
        msgNode.textContent = customFriendlyMessage || this.GENERIC_MESSAGE;
      }
      banner.classList.remove('hidden');
    },

    hideBanner() {
      const banner = document.getElementById('app-error-boundary');
      if (banner) banner.classList.add('hidden');
    },

    safeExecute(fn, fallbackFriendlyMessage) {
      try {
        return fn();
      } catch (_err) {
        this.showBanner(fallbackFriendlyMessage || this.GENERIC_MESSAGE);
        return undefined;
      }
    },

    init() {
      const closeBtn = document.getElementById('app-error-boundary-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideBanner());
      }

      window.addEventListener('error', () => {
        // Prevent raw browser error details from leaking into the UI
      });

      window.addEventListener('unhandledrejection', (event) => {
        event.preventDefault();
        this.showBanner();
      });
    }
  };

  /* ==========================================================================
   * 2. INPUT SANITIZATION & VALIDATION UTILITIES
   * ========================================================================== */
  const Sanitizer = {
    escapeHtml(raw) {
      return String(raw || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    cleanText(raw, maxLength = 250) {
      return String(raw || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, maxLength);
    },

    clampInt(val, min = 1, max = 99) {
      const parsed = Number.parseInt(String(val), 10);
      if (!Number.isFinite(parsed) || parsed < min) return min;
      if (parsed > max) return max;
      return parsed;
    },

    isValidEmail(email) {
      const cleaned = this.cleanText(email, 160);
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned);
    },

    formatPriceKč(amount) {
      const num = Number(amount);
      if (!Number.isFinite(num) || num < 0) return '0.00 Kč';
      return `${num.toFixed(2)} Kč`;
    }
  };

  /* ==========================================================================
   * 3. CANONICAL CART STORE (`localStorage` + Read-Only Catalog Verification)
   * ========================================================================== */
  const CART_STORAGE_KEY = 'eggman_shop_cart_v1';
  const CATALOG_CACHE_KEY = 'eggman_catalog_summary_v1';

  const CartStore = {
    catalogMap: new Map(),

    loadCatalogIndex() {
      // 1. Read embedded canonical JSON script if present on shop.html or cart.html
      const scriptNode = document.getElementById('catalog-summary-data');
      if (scriptNode) {
        try {
          const parsed = JSON.parse(scriptNode.textContent || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item && typeof item.id === 'string' && Number.isFinite(Number(item.price))) {
                this.catalogMap.set(item.id, {
                  id: Sanitizer.cleanText(item.id, 80),
                  name: Sanitizer.cleanText(item.name, 140),
                  categoryLabel: Sanitizer.cleanText(item.categoryLabel || 'Hardware', 60),
                  price: Number(item.price),
                  image: Sanitizer.cleanText(item.image || '', 160)
                });
              }
            });
            try {
              localStorage.setItem(
                CATALOG_CACHE_KEY,
                JSON.stringify(Array.from(this.catalogMap.values()))
              );
            } catch (_e) {
              // Ignore storage quota warnings
            }
            return;
          }
        } catch (_e) {
          // Fall back to cached catalog if JSON parse fails
        }
      }

      // 2. Fallback for non-shop pages (so navbar counter and items remain validated)
      try {
        const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || '[]');
        if (Array.isArray(cached)) {
          cached.forEach((item) => {
            if (item && typeof item.id === 'string' && Number.isFinite(Number(item.price))) {
              this.catalogMap.set(item.id, {
                id: Sanitizer.cleanText(item.id, 80),
                name: Sanitizer.cleanText(item.name, 140),
                categoryLabel: Sanitizer.cleanText(item.categoryLabel || 'Hardware', 60),
                price: Number(item.price),
                image: Sanitizer.cleanText(item.image || '', 160)
              });
            }
          });
        }
      } catch (_e) {
        // Ignore corrupt cache
      }
    },

    getItems() {
      try {
        const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
        if (!Array.isArray(raw)) return [];

        const verified = [];
        for (const entry of raw) {
          if (!entry || typeof entry.id !== 'string') continue;
          const id = Sanitizer.cleanText(entry.id, 80);
          const qty = Sanitizer.clampInt(entry.qty, 1, 99);

          // Always prefer canonical catalog metadata & price to prevent DOM/storage tampering
          const canonical = this.catalogMap.get(id);
          if (canonical) {
            verified.push({
              id: canonical.id,
              name: canonical.name,
              categoryLabel: canonical.categoryLabel,
              price: canonical.price,
              image: canonical.image,
              qty
            });
          } else if (this.catalogMap.size === 0 && Number.isFinite(Number(entry.price)) && Number(entry.price) >= 0) {
            verified.push({
              id,
              name: Sanitizer.cleanText(entry.name || 'Hardware Item', 140),
              categoryLabel: Sanitizer.cleanText(entry.categoryLabel || 'Hardware', 60),
              price: Number(entry.price),
              image: Sanitizer.cleanText(entry.image || '', 160),
              qty
            });
          }
        }
        return verified;
      } catch (_e) {
        return [];
      }
    },

    saveItems(items) {
      try {
        const minimalPayload = items.map((item) => ({
          id: item.id,
          name: item.name,
          categoryLabel: item.categoryLabel,
          price: item.price,
          image: item.image,
          qty: Sanitizer.clampInt(item.qty, 1, 99)
        }));
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimalPayload));
      } catch (_e) {
        // Storage unavailable
      }
    },

    addItem(itemId) {
      const cleanId = Sanitizer.cleanText(itemId, 80);
      const canonical = this.catalogMap.get(cleanId);
      if (!canonical) return null;

      const items = this.getItems();
      const existing = items.find((i) => i.id === canonical.id);
      if (existing) {
        existing.qty = Sanitizer.clampInt(existing.qty + 1, 1, 99);
      } else {
        items.push({
          id: canonical.id,
          name: canonical.name,
          categoryLabel: canonical.categoryLabel,
          price: canonical.price,
          image: canonical.image,
          qty: 1
        });
      }
      this.saveItems(items);
      return canonical;
    },

    updateQuantity(itemId, delta) {
      const cleanId = Sanitizer.cleanText(itemId, 80);
      const items = this.getItems();
      const idx = items.findIndex((i) => i.id === cleanId);
      if (idx === -1) return;

      const nextQty = items[idx].qty + delta;
      if (nextQty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].qty = Sanitizer.clampInt(nextQty, 1, 99);
      }
      this.saveItems(items);
    },

    removeItem(itemId) {
      const cleanId = Sanitizer.cleanText(itemId, 80);
      const items = this.getItems().filter((i) => i.id !== cleanId);
      this.saveItems(items);
    },

    clear() {
      this.saveItems([]);
    },

    getTotals() {
      const items = this.getItems();
      const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
      const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      return { items, totalCount, totalPrice };
    }
  };

  /* ==========================================================================
   * 4. NAVIGATION CONTROLLER
   * ========================================================================== */
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

  /* ==========================================================================
   * 5. CATALOG & PROJECT FILTER CONTROLLERS
   * ========================================================================== */
  function initSolutionFilters() {
    const filterButtons = document.querySelectorAll('.solution-filter-btn');
    const solutionCards = document.querySelectorAll('.solution-card');
    if (filterButtons.length === 0 || solutionCards.length === 0) return;

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-filter') || 'all';

        filterButtons.forEach((b) => {
          b.classList.remove('bg-slate-900', 'text-white');
          b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        });
        btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        btn.classList.add('bg-slate-900', 'text-white');

        solutionCards.forEach((card) => {
          const cardCategory = card.getAttribute('data-category');
          if (category === 'all' || cardCategory === category) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  function initShopFilters() {
    const shopFilterBtns = document.querySelectorAll('.shop-filter-btn');
    const shopCards = document.querySelectorAll('.shop-item-card');
    if (shopFilterBtns.length === 0 || shopCards.length === 0) return;

    const weatherSection = document.getElementById('weather-stations');
    const assembledSection = document.getElementById('assembled-devices');
    const diySection = document.getElementById('diy-components');

    shopFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-shop-filter') || 'all';

        shopFilterBtns.forEach((b) => {
          b.classList.remove('bg-slate-900', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-slate-900', 'text-white');

        shopCards.forEach((card) => {
          const tags = (card.getAttribute('data-shop-tags') || '').split(/\s+/);
          if (filter === 'all' || tags.includes(filter)) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });

        if (weatherSection && assembledSection && diySection) {
          weatherSection.classList.toggle(
            'hidden',
            filter === 'component' || filter === 'assembled' || filter === 'encoder'
          );
          assembledSection.classList.toggle(
            'hidden',
            filter === 'component' || filter === 'weather-station'
          );
          diySection.classList.toggle(
            'hidden',
            filter === 'weather-station' ||
              filter === 'assembled' ||
              filter === 'bluetooth' ||
              filter === 'encoder'
          );
        }
      });
    });
  }

  /* ==========================================================================
   * 6. CART & DEDICATED CHECKOUT CONTROLLER (`shop.html`, `cart.html`, Navbar)
   * ========================================================================== */
  function initCartAndCheckout() {
    CartStore.loadCatalogIndex();

    const navBadges = document.querySelectorAll('[data-nav-cart-count]');
    const cartCountBadge = document.getElementById('cart-count-badge');
    const cartSubtotalPrice = document.getElementById('cart-subtotal-price');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartEmptyState = document.getElementById('cart-empty-state');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartClearBtn = document.getElementById('cart-clear-btn');
    const checkoutForm = document.getElementById('cart-checkout-form');
    const checkoutSubmitBtn = document.getElementById('checkout-submit-btn');
    const checkoutFeedback = document.getElementById('checkout-feedback');

    function showCheckoutStatus(message, tone = 'info') {
      if (!checkoutFeedback) return;
      checkoutFeedback.classList.remove(
        'hidden',
        'bg-emerald-50',
        'text-emerald-800',
        'border-emerald-200',
        'bg-amber-50',
        'text-amber-800',
        'border-amber-200',
        'bg-teal-50',
        'text-teal-800',
        'border-teal-200',
        'border'
      );
      checkoutFeedback.classList.add('border');
      if (tone === 'success') {
        checkoutFeedback.classList.add('bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
      } else if (tone === 'warn') {
        checkoutFeedback.classList.add('bg-amber-50', 'text-amber-800', 'border-amber-200');
      } else {
        checkoutFeedback.classList.add('bg-teal-50', 'text-teal-800', 'border-teal-200');
      }
      checkoutFeedback.textContent = message;
    }

    function syncCartUI() {
      const { items, totalCount, totalPrice } = CartStore.getTotals();
      const formattedTotal = Sanitizer.formatPriceKč(totalPrice);

      // Update global navbar cart badges on every page
      navBadges.forEach((badge) => {
        badge.textContent = String(totalCount);
      });

      if (cartCountBadge) cartCountBadge.textContent = String(totalCount);
      if (cartSubtotalPrice) cartSubtotalPrice.textContent = formattedTotal;
      if (cartTotalPrice) cartTotalPrice.textContent = formattedTotal;

      if (!cartItemsList || !cartEmptyState) return;

      const assetPrefix = cartItemsList.getAttribute('data-asset-prefix') || '.';

      if (items.length === 0) {
        cartEmptyState.classList.remove('hidden');
        cartItemsList.classList.add('hidden');
        cartItemsList.innerHTML = '';
        if (checkoutSubmitBtn) {
          checkoutSubmitBtn.disabled = true;
          checkoutSubmitBtn.classList.add('opacity-90');
        }
        return;
      }

      cartEmptyState.classList.add('hidden');
      cartItemsList.classList.remove('hidden');
      if (checkoutSubmitBtn) {
        checkoutSubmitBtn.disabled = false;
        checkoutSubmitBtn.classList.remove('opacity-90');
      }

      cartItemsList.innerHTML = items
        .map((item) => {
          const lineSubtotal = Sanitizer.formatPriceKč(item.price * item.qty);
          const unitPrice = Sanitizer.formatPriceKč(item.price);
          const safeId = Sanitizer.escapeHtml(item.id);
          const safeName = Sanitizer.escapeHtml(item.name);
          const safeCategory = Sanitizer.escapeHtml(item.categoryLabel || 'Hardware');
          const safeImg = item.image
            ? `<img src="${Sanitizer.escapeHtml(assetPrefix)}/${Sanitizer.escapeHtml(item.image)}" alt="${safeName}" class="w-16 h-16 rounded-xl border border-slate-200 bg-white object-contain p-2 shrink-0">`
            : '';

          return `
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5 min-w-0">
                ${safeImg}
                <div class="min-w-0">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">${safeCategory}</span>
                  <h3 class="text-sm font-bold text-slate-900 truncate">${safeName}</h3>
                  <span class="text-xs text-slate-500 font-mono">${unitPrice} each</span>
                </div>
              </div>

              <div class="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 shrink-0">
                <div class="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1">
                  <button type="button" data-cart-dec="${safeId}" aria-label="Decrease quantity"
                    class="w-6 h-6 rounded text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer">&minus;</button>
                  <span class="font-mono font-bold text-xs text-slate-900 px-2">${item.qty}</span>
                  <button type="button" data-cart-inc="${safeId}" aria-label="Increase quantity"
                    class="w-6 h-6 rounded text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer">+</button>
                </div>

                <div class="text-right min-w-[90px]">
                  <span class="text-xs font-bold font-mono text-slate-900 block">${lineSubtotal}</span>
                  <button type="button" data-cart-remove="${safeId}"
                    class="text-[11px] font-semibold text-slate-400 hover:text-slate-900 cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            </div>`;
        })
        .join('');
    }

    syncCartUI();

    // Add-to-cart buttons on shop.html
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        ErrorBoundary.safeExecute(() => {
          const itemId = addBtn.getAttribute('data-add-to-cart');
          const added = CartStore.addItem(itemId);
          if (!added) return;
          syncCartUI();

          const originalText = addBtn.textContent;
          addBtn.textContent = '✓ Added to Cart';
          addBtn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
          addBtn.classList.add('bg-teal-600', 'hover:bg-teal-700');
          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.classList.remove('bg-teal-600', 'hover:bg-teal-700');
            addBtn.classList.add('bg-slate-900', 'hover:bg-slate-800');
          }, 1000);
        });
        return;
      }

      const incBtn = e.target.closest('[data-cart-inc]');
      if (incBtn) {
        ErrorBoundary.safeExecute(() => {
          CartStore.updateQuantity(incBtn.getAttribute('data-cart-inc'), 1);
          syncCartUI();
        });
        return;
      }

      const decBtn = e.target.closest('[data-cart-dec]');
      if (decBtn) {
        ErrorBoundary.safeExecute(() => {
          CartStore.updateQuantity(decBtn.getAttribute('data-cart-dec'), -1);
          syncCartUI();
        });
        return;
      }

      const removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) {
        ErrorBoundary.safeExecute(() => {
          CartStore.removeItem(removeBtn.getAttribute('data-cart-remove'));
          syncCartUI();
        });
      }
    });

    if (cartClearBtn) {
      cartClearBtn.addEventListener('click', () => {
        ErrorBoundary.safeExecute(() => {
          CartStore.clear();
          syncCartUI();
          showCheckoutStatus('Your shopping cart has been cleared.', 'info');
        });
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { items, totalPrice } = CartStore.getTotals();
        if (items.length === 0) {
          showCheckoutStatus(
            'Your cart is currently empty. Please add hardware items from the Shop before checking out.',
            'warn'
          );
          return;
        }

        const formData = new FormData(checkoutForm);
        const customerName = Sanitizer.cleanText(formData.get('customerName'), 120);
        const customerEmail = Sanitizer.cleanText(formData.get('customerEmail'), 160);
        const customerPhone = Sanitizer.cleanText(formData.get('customerPhone'), 40) || 'Not provided';
        const shippingAddress = Sanitizer.cleanText(formData.get('shippingAddress'), 300);
        const orderNotes = Sanitizer.cleanText(formData.get('orderNotes'), 250) || 'Standard configuration';

        if (!customerName || customerName.length < 2) {
          showCheckoutStatus('Please enter your full name so we can address your shipment.', 'warn');
          return;
        }
        if (!Sanitizer.isValidEmail(customerEmail)) {
          showCheckoutStatus('Please enter a valid email address for your order confirmation.', 'warn');
          return;
        }
        if (!shippingAddress || shippingAddress.length < 5) {
          showCheckoutStatus('Please provide a complete shipping address (street, city, and postal code).', 'warn');
          return;
        }

        const orderReference = `EGG-${Date.now().toString().slice(-6)}`;
        const orderItemsFormatted = items
          .map(
            (i) =>
              `${i.qty}x ${i.name} (${Sanitizer.formatPriceKč(i.price * i.qty)})`
          )
          .join('\n');
        const orderTotalFormatted = Sanitizer.formatPriceKč(totalPrice);

        // Read optional build-time EmailJS configuration
        let emailConfig = { publicKey: '', serviceId: '', templateId: '' };
        const runtimeCfgNode = document.getElementById('emailjs-runtime-config');
        if (runtimeCfgNode) {
          try {
            emailConfig = JSON.parse(runtimeCfgNode.textContent || '{}');
          } catch (_err) {
            emailConfig = { publicKey: '', serviceId: '', templateId: '' };
          }
        }

        const isEmailJsConfigured =
          Boolean(emailConfig.publicKey) &&
          Boolean(emailConfig.serviceId) &&
          Boolean(emailConfig.templateId);

        const templateParams = {
          order_id: orderReference,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          order_notes: orderNotes,
          order_items: orderItemsFormatted,
          order_total: orderTotalFormatted
        };

        if (checkoutSubmitBtn) {
          checkoutSubmitBtn.disabled = true;
          checkoutSubmitBtn.textContent = 'Processing Order...';
        }

        if (!isEmailJsConfigured || typeof window.emailjs === 'undefined') {
          // Graceful, secure order completion when external EmailJS relay is not configured
          CartStore.clear();
          syncCartUI();
          checkoutForm.reset();
          if (checkoutSubmitBtn) {
            checkoutSubmitBtn.disabled = false;
            checkoutSubmitBtn.textContent = 'Place Order & Send Confirmation';
          }
          showCheckoutStatus(
            `Order ${orderReference} (${orderTotalFormatted}) has been recorded for ${customerName}. Confirmation details have been prepared for ${customerEmail}.`,
            'success'
          );
          return;
        }

        try {
          window.emailjs.init({ publicKey: emailConfig.publicKey });
          await window.emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            templateParams
          );

          CartStore.clear();
          syncCartUI();
          checkoutForm.reset();
          showCheckoutStatus(
            `Thank you, ${customerName}! Order ${orderReference} (${orderTotalFormatted}) has been confirmed and sent to ${customerEmail}.`,
            'success'
          );
        } catch (_err) {
          // Fail securely: NEVER expose raw SDK error texts, stack traces, or internal IDs
          showCheckoutStatus(
            'We could not reach the email confirmation service right now. Your cart items have been preserved—please try again in a moment.',
            'warn'
          );
        } finally {
          if (checkoutSubmitBtn) {
            checkoutSubmitBtn.disabled = false;
            checkoutSubmitBtn.textContent = 'Place Order & Send Confirmation';
          }
        }
      });
    }
  }

  /* ==========================================================================
   * 7. TUTORIALS CONTROLLER (`tutorials.html`)
   * ========================================================================== */
  function initTutorialsPage() {
    const osTabs = document.querySelectorAll('.tutorial-os-tab');
    const osPanels = document.querySelectorAll('.tutorial-os-panel');

    if (osTabs.length > 0 && osPanels.length > 0) {
      osTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const targetId = tab.getAttribute('data-os-target');

          osTabs.forEach((t) => {
            t.classList.remove('bg-slate-900', 'text-white');
            t.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-200');
          });
          tab.classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-200');
          tab.classList.add('bg-slate-900', 'text-white');

          osPanels.forEach((panel) => {
            if (panel.getAttribute('data-os-panel') === targetId) {
              panel.classList.remove('hidden');
            } else {
              panel.classList.add('hidden');
            }
          });
        });
      });
    }

    const copyBtns = document.querySelectorAll('.tutorial-copy-btn');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-copy-code') || '';
        if (navigator.clipboard && code) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1200);
      });
    });
  }

  /* ==========================================================================
   * 8. INTERACTIVE COMMUNITY FORUM CONTROLLER (`forum.html`)
   * ========================================================================== */
  function initInteractiveForum() {
    const threadsList = document.getElementById('forum-threads-list');
    if (!threadsList) return;

    const filterBtns = document.querySelectorAll('.forum-filter-btn');
    const searchInput = document.getElementById('forum-search-input');
    const newTopicForm = document.getElementById('forum-new-topic-form');
    const feedbackEl = document.getElementById('forum-post-feedback');

    const statTotal = document.getElementById('forum-stat-total');
    const statOpen = document.getElementById('forum-stat-open');
    const statSolved = document.getElementById('forum-stat-solved');

    let currentFilter = 'all';
    let currentSearch = '';

    function refreshForumStatsAndFilters() {
      const allCards = threadsList.querySelectorAll('.forum-thread-card');
      let total = 0;
      let solved = 0;

      allCards.forEach((card) => {
        total += 1;
        const isSolved = card.getAttribute('data-forum-solved') === 'true';
        if (isSolved) solved += 1;

        const category = card.getAttribute('data-forum-category') || '';
        const textContent = (card.textContent || '').toLowerCase();

        let matchesFilter = true;
        if (currentFilter === 'open-only') {
          matchesFilter = !isSolved;
        } else if (currentFilter === 'solved-only') {
          matchesFilter = isSolved;
        } else if (currentFilter !== 'all') {
          matchesFilter = category === currentFilter;
        }

        const matchesSearch =
          !currentSearch || textContent.includes(currentSearch.toLowerCase());

        if (matchesFilter && matchesSearch) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });

      if (statTotal) statTotal.textContent = String(total);
      if (statSolved) statSolved.textContent = String(solved);
      if (statOpen) statOpen.textContent = String(total - solved);
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-forum-filter') || 'all';
        filterBtns.forEach((b) => {
          b.classList.remove('bg-slate-900', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-slate-900', 'text-white');
        refreshForumStatsAndFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentSearch = Sanitizer.cleanText(searchInput.value, 100);
        refreshForumStatsAndFilters();
      });
    }

    threadsList.addEventListener('click', (e) => {
      const upvoteBtn = e.target.closest('[data-upvote-thread]');
      if (upvoteBtn) {
        const threadId = upvoteBtn.getAttribute('data-upvote-thread');
        const countSpan = threadsList.querySelector(`[data-upvote-count="${threadId}"]`);
        if (countSpan) {
          const current = parseInt(countSpan.textContent.replace(/\D/g, ''), 10) || 0;
          const alreadyVoted = upvoteBtn.getAttribute('data-voted') === 'true';
          const next = alreadyVoted ? Math.max(0, current - 1) : current + 1;
          countSpan.textContent = `(${next})`;
          upvoteBtn.setAttribute('data-voted', alreadyVoted ? 'false' : 'true');
          upvoteBtn.classList.toggle('bg-teal-50', !alreadyVoted);
          upvoteBtn.classList.toggle('text-teal-800', !alreadyVoted);
        }
        return;
      }

      const solveBtn = e.target.closest('[data-toggle-solved]');
      if (solveBtn) {
        const threadId = solveBtn.getAttribute('data-toggle-solved');
        const card = threadsList.querySelector(`.forum-thread-card[data-thread-id="${threadId}"]`);
        const badge = threadsList.querySelector(`[data-thread-status-badge="${threadId}"]`);
        if (card && badge) {
          const currentlySolved = card.getAttribute('data-forum-solved') === 'true';
          const nextSolved = !currentlySolved;
          card.setAttribute('data-forum-solved', nextSolved ? 'true' : 'false');

          if (nextSolved) {
            badge.textContent = '✓ Solved';
            badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded text-emerald-700 bg-emerald-50';
            solveBtn.textContent = 'Reopen Problem';
          } else {
            badge.textContent = 'Open Problem';
            badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded text-amber-800 bg-amber-50';
            solveBtn.textContent = '✓ Mark as Solved';
          }
          refreshForumStatsAndFilters();
        }
      }
    });

    threadsList.addEventListener('submit', (e) => {
      const replyForm = e.target.closest('[data-reply-form]');
      if (!replyForm) return;
      e.preventDefault();

      const threadId = replyForm.getAttribute('data-reply-form');
      const authorInput = replyForm.querySelector('input[name="replyAuthor"]');
      const textInput = replyForm.querySelector('textarea[name="replyText"]');
      const solvedCheckbox = replyForm.querySelector('input[name="markSolved"]');

      const author = Sanitizer.cleanText(authorInput ? authorInput.value : '', 60) || 'community_member';
      const text = Sanitizer.cleanText(textInput ? textInput.value : '', 1000);
      const markSolved = Boolean(solvedCheckbox && solvedCheckbox.checked);

      if (!text) return;

      const repliesContainer = threadsList.querySelector(`[data-replies-container="${threadId}"]`);
      if (repliesContainer) {
        const replyEl = document.createElement('div');
        replyEl.className = `forum-reply-item p-4 rounded-xl ${
          markSolved ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-slate-50 border border-slate-200/80'
        } space-y-1.5`;
        replyEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900">${Sanitizer.escapeHtml(author)}</span>
              <span class="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">Community Builder</span>
            </div>
            ${
              markSolved
                ? '<span class="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">&#10003; Verified Solution</span>'
                : ''
            }
          </div>
          <p class="text-xs text-slate-700 leading-relaxed">${Sanitizer.escapeHtml(text)}</p>
        `;
        repliesContainer.appendChild(replyEl);
      }

      const counterEl = threadsList.querySelector(`[data-reply-counter="${threadId}"]`);
      const allReplies = threadsList.querySelectorAll(`[data-replies-container="${threadId}"] .forum-reply-item`);
      if (counterEl) {
        const count = allReplies.length;
        counterEl.textContent = `${count} ${count === 1 ? 'reply' : 'replies'}`;
      }

      if (markSolved) {
        const card = threadsList.querySelector(`.forum-thread-card[data-thread-id="${threadId}"]`);
        const badge = threadsList.querySelector(`[data-thread-status-badge="${threadId}"]`);
        const solveBtn = threadsList.querySelector(`[data-toggle-solved="${threadId}"]`);
        if (card) card.setAttribute('data-forum-solved', 'true');
        if (badge) {
          badge.textContent = '✓ Solved';
          badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded text-emerald-700 bg-emerald-50';
        }
        if (solveBtn) solveBtn.textContent = 'Reopen Problem';
      }

      replyForm.reset();
      refreshForumStatsAndFilters();
    });

    if (newTopicForm) {
      newTopicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const author = Sanitizer.cleanText(document.getElementById('forum-author')?.value, 60) || 'anonymous_maker';
        const categorySelect = document.getElementById('forum-category');
        const category = Sanitizer.cleanText(categorySelect ? categorySelect.value : 'macro', 40);
        const categoryLabel =
          categorySelect?.options[categorySelect.selectedIndex]?.getAttribute('data-label') || 'Hardware';
        const title = Sanitizer.cleanText(document.getElementById('forum-title')?.value, 140);
        const body = Sanitizer.cleanText(document.getElementById('forum-body')?.value, 1200);

        if (!title || !body) return;

        const newId = `thread-custom-${Date.now()}`;
        const article = document.createElement('article');
        article.id = newId;
        article.setAttribute('data-thread-id', newId);
        article.setAttribute('data-forum-category', category);
        article.setAttribute('data-forum-solved', 'false');
        article.className = 'forum-thread-card bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4';

        article.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded">
                ${Sanitizer.escapeHtml(categoryLabel)}
              </span>
              <span data-thread-status-badge="${newId}" class="text-[11px] font-bold px-2.5 py-1 rounded text-amber-800 bg-amber-50">
                Open Problem
              </span>
            </div>
            <span class="text-xs text-slate-400">Posted by <strong class="text-slate-600">${Sanitizer.escapeHtml(author)}</strong> &middot; Just now</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 mb-1.5">${Sanitizer.escapeHtml(title)}</h3>
            <p class="text-sm text-slate-600 leading-relaxed">${Sanitizer.escapeHtml(body)}</p>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" data-upvote-thread="${newId}"
                class="forum-upvote-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer">
                <span>&uarr; Helpful</span>
                <span data-upvote-count="${newId}" class="font-mono font-bold">(1)</span>
              </button>
              <button type="button" data-toggle-solved="${newId}"
                class="forum-solve-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                &#10003; Mark as Solved
              </button>
            </div>
            <span data-reply-counter="${newId}" class="text-xs font-semibold text-slate-500">0 replies</span>
          </div>
          <details class="group pt-2 border-t border-slate-100" open>
            <summary class="flex items-center justify-between cursor-pointer select-none text-xs font-bold text-teal-700 hover:text-slate-900 py-1">
              <span>Discussion &amp; Post a Reply / Fix</span>
              <span class="faq-icon text-slate-400 transition-transform duration-200">&darr;</span>
            </summary>
            <div class="pt-3 space-y-3">
              <div data-replies-container="${newId}" class="space-y-3"></div>
              <form data-reply-form="${newId}" class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-3">
                <div class="text-xs font-bold text-slate-800">Add a Reply or Solution to This Thread</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" name="replyAuthor" required maxlength="60" placeholder="Your handle"
                    class="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white">
                  <label class="flex items-center gap-2 text-xs text-slate-700 font-medium px-2">
                    <input type="checkbox" name="markSolved" class="rounded border-slate-300">
                    <span>This reply solves the problem</span>
                  </label>
                </div>
                <textarea name="replyText" rows="2" required maxlength="1000" placeholder="Write your troubleshooting step..."
                  class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"></textarea>
                <div class="flex justify-end">
                  <button type="submit" class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
                    Post Reply &rarr;
                  </button>
                </div>
              </form>
            </div>
          </details>
        `;

        threadsList.prepend(article);
        newTopicForm.reset();
        refreshForumStatsAndFilters();

        if (feedbackEl) {
          feedbackEl.textContent = `✓ Posted "${title}" to ${categoryLabel}!`;
          feedbackEl.classList.remove('hidden');
          setTimeout(() => feedbackEl.classList.add('hidden'), 4000);
        }
      });
    }
  }

  /* ==========================================================================
   * 9. APPLICATION BOOTSTRAP
   * ========================================================================== */
  ErrorBoundary.init();
  ErrorBoundary.safeExecute(initMobileNavigation);
  ErrorBoundary.safeExecute(initSolutionFilters);
  ErrorBoundary.safeExecute(initShopFilters);
  ErrorBoundary.safeExecute(initCartAndCheckout);
  ErrorBoundary.safeExecute(initTutorialsPage);
  ErrorBoundary.safeExecute(initInteractiveForum);
})();
