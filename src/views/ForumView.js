/**
 * ForumView — Eggman Studios Interactive Community Troubleshooting & Issue Board (`forum.html`)
 */

import { Layout } from '../components/Layout.js';
import { SITE_COPY } from '../data/projects.js';
import { FORUM_CATEGORIES, FORUM_THREADS } from '../data/forum.js';

export function renderForumView({
  categories = FORUM_CATEGORIES,
  threads = FORUM_THREADS,
  assetPrefix = '.'
} = {}) {
  const solvedCount = threads.filter((t) => t.solved).length;
  const openCount = threads.length - solvedCount;

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

  const categorySelectOptionsHtml = categories
    .filter((c) => c.id !== 'all')
    .map((c) => `<option value="${c.id}" data-label="${c.label}">${c.label}</option>`)
    .join('\n                                    ');

  const threadsHtml = threads
    .map((t) => {
      const repliesList = t.replies || [];
      const repliesHtml = repliesList
        .map(
          (r) => `
                                    <div class="forum-reply-item p-4 rounded-xl ${
                                      r.isSolution
                                        ? 'bg-emerald-50/70 border border-emerald-200'
                                        : 'bg-slate-50 border border-slate-200/80'
                                    } space-y-1.5">
                                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div class="flex items-center gap-2">
                                                <span class="font-bold text-slate-900">${r.author}</span>
                                                <span class="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">${r.role}</span>
                                            </div>
                                            ${
                                              r.isSolution
                                                ? '<span class="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">&#10003; Verified Solution</span>'
                                                : ''
                                            }
                                        </div>
                                        <p class="text-xs text-slate-700 leading-relaxed">${r.text}</p>
                                    </div>`
        )
        .join('\n');

      return `
                        <!-- Interactive Forum Thread: ${t.id} -->
                        <article id="${t.id}"
                            data-thread-id="${t.id}"
                            data-forum-category="${t.category}"
                            data-forum-solved="${t.solved ? 'true' : 'false'}"
                            class="forum-thread-card bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                            <!-- Thread Top Meta Bar -->
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded">
                                        ${t.categoryLabel}
                                    </span>
                                    <span data-thread-status-badge="${t.id}"
                                        class="text-[11px] font-bold px-2.5 py-1 rounded ${
                                          t.solved
                                            ? 'text-emerald-700 bg-emerald-50'
                                            : 'text-amber-800 bg-amber-50'
                                        }">
                                        ${t.solved ? '&#10003; Solved' : 'Open Problem'}
                                    </span>
                                </div>
                                <span class="text-xs text-slate-400">Posted by <strong class="text-slate-600">${t.author}</strong> &middot; ${t.timeAgo}</span>
                            </div>

                            <!-- Thread Title & Problem Description -->
                            <div>
                                <h3 class="text-lg font-bold text-slate-900 mb-1.5">${t.title}</h3>
                                <p class="text-sm text-slate-600 leading-relaxed">${t.question}</p>
                            </div>

                            <!-- Interactive Action Bar: Upvote & Toggle Solved -->
                            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                <div class="flex flex-wrap items-center gap-2">
                                    <button type="button"
                                        data-upvote-thread="${t.id}"
                                        class="forum-upvote-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors cursor-pointer">
                                        <span>&uarr; Helpful</span>
                                        <span data-upvote-count="${t.id}" class="font-mono font-bold">(${t.upvotes || 1})</span>
                                    </button>

                                    <button type="button"
                                        data-toggle-solved="${t.id}"
                                        class="forum-solve-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                                        ${t.solved ? 'Reopen Problem' : '&#10003; Mark as Solved'}
                                    </button>
                                </div>

                                <span data-reply-counter="${t.id}" class="text-xs font-semibold text-slate-500">
                                    ${repliesList.length} ${repliesList.length === 1 ? 'reply' : 'replies'}
                                </span>
                            </div>

                            <!-- Expandable Replies + Inline Reply Form -->
                            <details class="group pt-2 border-t border-slate-100" ${!t.solved ? 'open' : ''}>
                                <summary class="flex items-center justify-between cursor-pointer select-none text-xs font-bold text-teal-700 hover:text-slate-900 py-1">
                                    <span>Discussion &amp; Post a Reply / Fix</span>
                                    <span class="faq-icon text-slate-400 transition-transform duration-200">&darr;</span>
                                </summary>

                                <div class="pt-3 space-y-3">
                                    <div data-replies-container="${t.id}" class="space-y-3">
                                        ${repliesHtml}
                                    </div>

                                    <!-- Inline Reply Form for This Problem -->
                                    <form data-reply-form="${t.id}" class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-3">
                                        <div class="text-xs font-bold text-slate-800">Add a Reply or Solution to This Thread</div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input type="text" name="replyAuthor" required maxlength="60" placeholder="Your handle (e.g. jan_hw)"
                                                class="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white">
                                            <label class="flex items-center gap-2 text-xs text-slate-700 font-medium px-2">
                                                <input type="checkbox" name="markSolved" class="rounded border-slate-300">
                                                <span>This reply solves the problem</span>
                                            </label>
                                        </div>
                                        <textarea name="replyText" rows="2" required maxlength="1000"
                                            placeholder="Write your troubleshooting step, pinout fix, or command..."
                                            class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"></textarea>
                                        <div class="flex justify-end">
                                            <button type="submit"
                                                class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
                                                Post Reply &rarr;
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </details>
                        </article>`;
    })
    .join('\n');

  const bodyContent = `
        <!-- Distinct Forum & Issue Tracker Header -->
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                    <div class="lg:col-span-7 space-y-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            Interactive Troubleshooting &amp; Builders Board
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            Solve hardware problems together.
                        </h1>
                        <p class="text-base text-slate-600 leading-relaxed">
                            Jump into an open problem below to post a fix, upvote helpful answers, mark issues as solved, or open a new troubleshooting thread.
                        </p>
                    </div>

                    <!-- Live Board Stats Box -->
                    <div class="lg:col-span-5 grid grid-cols-3 gap-3">
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span class="text-xs text-slate-500 block">Total Topics</span>
                            <span id="forum-stat-total" class="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">${threads.length}</span>
                        </div>
                        <div class="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-center">
                            <span class="text-xs text-slate-600 block">Open Problems</span>
                            <span id="forum-stat-open" class="text-2xl font-bold text-amber-800 font-mono mt-0.5 block">${openCount}</span>
                        </div>
                        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <span class="text-xs text-emerald-800 block">Solved Fixes</span>
                            <span id="forum-stat-solved" class="text-2xl font-bold text-emerald-700 font-mono mt-0.5 block">${solvedCount}</span>
                        </div>
                    </div>
                </div>

                <!-- Filter & Search Bar -->
                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter forum discussions">
                        ${categoryButtonsHtml}
                        <button type="button" data-forum-filter="open-only"
                            class="forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer">
                            Needs Answer / Open
                        </button>
                        <button type="button" data-forum-filter="solved-only"
                            class="forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer">
                            &#10003; Solved Only
                        </button>
                    </div>

                    <div class="w-full md:w-64">
                        <input type="search" id="forum-search-input"
                            placeholder="Search COM port, BME280, dialout..."
                            class="w-full p-2 rounded-lg border border-slate-300 text-xs bg-slate-50">
                    </div>
                </div>
            </div>
        </section>

        <!-- Forum Main Layout: Interactive Thread Feed + Sidebar Form -->
        <section class="py-14 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <!-- Left: Discussion Threads (7 cols) -->
                    <div id="forum-threads-list" class="lg:col-span-7 space-y-5">
                        ${threadsHtml}
                    </div>

                    <!-- Right: Start a New Topic Box + Quick Reference (5 cols) -->
                    <div id="new-topic-box" class="lg:col-span-5 space-y-6">
                        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                            <div>
                                <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">Ask the Community</span>
                                <h2 class="text-lg font-bold text-slate-900 mt-0.5">Start a New Topic</h2>
                                <p class="text-xs text-slate-500 mt-1">
                                    Describe your setup issue or share a custom build. Anyone can reply or mark a working solution right on the card.
                                </p>
                            </div>

                            <form id="forum-new-topic-form" class="space-y-3">
                                <div>
                                    <label for="forum-author" class="block text-xs font-bold text-slate-700 mb-1">Your Name / Handle</label>
                                    <input type="text" id="forum-author" required maxlength="60" placeholder="e.g. martin_cz"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                </div>

                                <div>
                                    <label for="forum-category" class="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                    <select id="forum-category" class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                        ${categorySelectOptionsHtml}
                                    </select>
                                </div>

                                <div>
                                    <label for="forum-title" class="block text-xs font-bold text-slate-700 mb-1">Problem / Topic Title</label>
                                    <input type="text" id="forum-title" required maxlength="140" placeholder="e.g. Rotary encoder pins on Macro producer?"
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white">
                                </div>

                                <div>
                                    <label for="forum-body" class="block text-xs font-bold text-slate-700 mb-1">Details / Logs</label>
                                    <textarea id="forum-body" rows="4" required maxlength="1200" placeholder="Include your OS, board (ATmega32U4 / ESP32), and any serial output..."
                                        class="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white"></textarea>
                                </div>

                                <button type="submit"
                                    class="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
                                    Post Topic to Board
                                </button>
                                <p id="forum-post-feedback" class="hidden p-3 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"></p>
                            </form>
                        </div>

                        <div class="p-5 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block font-mono">Common Quick Fixes</span>
                            <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
                                <li>&bull; <strong>Linux /dev/ttyACM0 error:</strong> Run <code class="text-teal-400 font-mono">sudo usermod -a -G dialout $USER</code> and log out/in.</li>
                                <li>&bull; <strong>BME280 reads -999:</strong> Check 4.7k&Omega; pull-ups on SDA/SCL and verify I2C address (0x76 vs 0x77).</li>
                                <li>&bull; <strong>RFID ESP resets on lock release:</strong> Add a 1N4007 flyback diode across the 12V strike terminals.</li>
                            </ul>
                            <a href="tutorials.html" class="inline-block text-xs font-semibold text-teal-400 hover:text-white pt-1">
                                Open Setup &amp; Assembly Guides &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;

  return Layout({
    title: `Community Forum & Issue Board — ${SITE_COPY.brand.name}`,
    description:
      'Interactive community troubleshooting board for Eggman Studios hardware: reply to open problems, mark fixes as solved, and share builds.',
    activePage: 'forum',
    assetPrefix,
    bodyContent
  });
}
