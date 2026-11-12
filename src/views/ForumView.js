/**
 * ForumView — Eggman Studios Interactive Community Troubleshooting & Issue Board (`forum.html`)
 * Driven dynamically by `FORUM_CONFIG`, `FORUM_CATEGORIES`, and `FORUM_STATUS_FILTERS`
 * with zero hardcoded fake threads or hardcoded user handles.
 */

import { Layout } from '../components/Layout.js';
import { SITE_COPY } from '../data/projects.js';
import {
  FORUM_CATEGORIES,
  FORUM_CONFIG,
  FORUM_STATUS_FILTERS,
  FORUM_THREADS
} from '../data/forum.js';

export function renderForumView({
  categories = FORUM_CATEGORIES,
  statusFilters = FORUM_STATUS_FILTERS,
  config = FORUM_CONFIG,
  threads = FORUM_THREADS,
  assetPrefix = '.'
} = {}) {
  const solvedCount = threads.filter((t) => t.solved).length;
  const openCount = threads.length - solvedCount;
  const initialStatCounts = {
    'forum-stat-total': threads.length,
    'forum-stat-open': openCount,
    'forum-stat-solved': solvedCount
  };

  const statsHtml = config.stats
    .map(
      (stat) => `
                        <div class="p-4 rounded-xl border ${stat.boxClass} text-center">
                            <span class="text-xs ${stat.labelClass} block">${stat.label}</span>
                            <span id="${stat.id}" class="text-2xl font-bold ${stat.valueClass} font-mono mt-0.5 block">${initialStatCounts[stat.id] ?? 0}</span>
                        </div>`
    )
    .join('\n');

  const categoryButtonsHtml = categories
    .map((cat, idx) => {
      const isActive = idx === 0;
      const btnClass = isActive
        ? 'forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer'
        : 'forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer';
      return `<button type="button" data-forum-filter="${cat.id}" class="${btnClass}">
          ${cat.label}
        </button>`;
    })
    .join('\n                        ');

  const statusButtonsHtml = statusFilters
    .map(
      (filter) => `<button type="button" data-forum-filter="${filter.id}" class="${filter.className}">
                            ${filter.label}
                        </button>`
    )
    .join('\n                        ');

  const categorySelectOptionsHtml = categories
    .filter((c) => c.id !== 'all')
    .map((c) => `<option value="${c.id}" data-label="${c.label}">${c.label}</option>`)
    .join('\n                                    ');

  const emptyStateHtml = `
                        <div id="forum-empty-state" class="${threads.length > 0 ? 'hidden ' : ''}bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-xs">
                            <h2 class="text-base font-bold text-slate-900">${config.emptyState.title}</h2>
                            <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">${config.emptyState.description}</p>
                        </div>`;

  const bodyContent = `
        <!-- Forum & Issue Tracker Header -->
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                    <div class="lg:col-span-7 space-y-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            ${config.header.eyebrow}
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            ${config.header.title}
                        </h1>
                        <p class="text-base text-slate-600 leading-relaxed">
                            ${config.header.subtitle}
                        </p>
                    </div>

                    <!-- Live Board Stats Box -->
                    <div class="lg:col-span-5 grid grid-cols-3 gap-3">
                        ${statsHtml}
                    </div>
                </div>

                <!-- Filter & Search Bar -->
                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter forum discussions">
                        ${categoryButtonsHtml}
                        ${statusButtonsHtml}
                    </div>

                    <div class="w-full md:w-64">
                        <input type="search" id="forum-search-input"
                            placeholder="${config.searchPlaceholder}"
                            class="w-full p-2 rounded-lg border border-slate-300 text-xs bg-slate-50">
                    </div>
                </div>
            </div>
        </section>

        <!-- Forum Main Layout: Dynamic Thread Feed + Sidebar Form -->
        <section class="py-14 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <!-- Left: Discussion Threads (7 cols) -->
                    <div id="forum-threads-list" class="lg:col-span-7 space-y-5">
                        ${emptyStateHtml}
                    </div>

                    <!-- Right: Start a New Topic Box + Documentation Link (5 cols) -->
                    <div id="new-topic-box" class="lg:col-span-5 space-y-6">
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${config.newTopicForm.eyebrow}</span>
                                <h2 class="text-lg font-bold text-slate-900 mt-0.5">${config.newTopicForm.title}</h2>
                                <p class="text-xs text-slate-500 mt-1">
                                    ${config.newTopicForm.subtitle}
                                </p>
                            </div>

                            <form id="forum-new-topic-form" class="space-y-3">
                                <div>
                                    <label for="forum-author" class="block text-xs font-bold text-slate-700 mb-1">${config.newTopicForm.authorLabel}</label>
                                    <input type="text" id="forum-author" required maxlength="60" placeholder="${config.newTopicForm.authorPlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                </div>

                                <div>
                                    <label for="forum-category" class="block text-xs font-bold text-slate-700 mb-1">${config.newTopicForm.categoryLabel}</label>
                                    <select id="forum-category" class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                        ${categorySelectOptionsHtml}
                                    </select>
                                </div>

                                <div>
                                    <label for="forum-title" class="block text-xs font-bold text-slate-700 mb-1">${config.newTopicForm.titleLabel}</label>
                                    <input type="text" id="forum-title" required maxlength="140" placeholder="${config.newTopicForm.titlePlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                </div>

                                <div>
                                    <label for="forum-body" class="block text-xs font-bold text-slate-700 mb-1">${config.newTopicForm.bodyLabel}</label>
                                    <textarea id="forum-body" rows="4" required maxlength="1200" placeholder="${config.newTopicForm.bodyPlaceholder}"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"></textarea>
                                </div>

                                <button type="submit"
                                    class="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
                                    ${config.newTopicForm.submitLabel}
                                </button>
                                <p id="forum-post-feedback" class="hidden p-3 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"></p>
                            </form>
                        </div>

                        <div class="p-5 rounded-2xl bg-slate-900 text-slate-200 space-y-2">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block font-mono">${config.helpCard.eyebrow}</span>
                            <h3 class="text-sm font-bold text-white">${config.helpCard.title}</h3>
                            <p class="text-xs text-slate-300 leading-relaxed">${config.helpCard.description}</p>
                            <a href="${config.helpCard.ctaHref}" class="inline-block text-xs font-semibold text-teal-400 hover:text-white pt-1">
                                ${config.helpCard.ctaLabel}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;

  return Layout({
    title: `${config.pageTitle} — ${SITE_COPY.brand.name}`,
    description: config.pageDescription,
    activePage: 'forum',
    assetPrefix,
    bodyContent
  });
}
