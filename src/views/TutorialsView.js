/**
 * TutorialsView — Eggman Studios Simple Setup, Assembly & Connection Guides (`tutorials.html`)
 * Clean, practical step-by-step instructions—no emulators or code-dump walls.
 */

import { Layout } from '../components/Layout.js';
import { SITE_COPY } from '../data/projects.js';
import { PYTHON_OS_GUIDES, SETUP_GUIDES } from '../data/tutorials.js';

export function renderTutorialsView({
  osGuides = PYTHON_OS_GUIDES,
  setupGuides = SETUP_GUIDES,
  assetPrefix = '.'
} = {}) {
  const osTabButtonsHtml = osGuides
    .map((os, index) => {
      const isActive = index === 0;
      const btnClass = isActive
        ? 'tutorial-os-tab px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white transition-colors cursor-pointer'
        : 'tutorial-os-tab px-4 py-2.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer';
      return `<button type="button" data-os-target="${os.id}" class="${btnClass}">
          ${os.label}
        </button>`;
    })
    .join('\n                        ');

  const osPanelsHtml = osGuides
    .map((os, index) => {
      const isHidden = index !== 0;
      const stepsHtml = os.steps
        .map((step) => {
          const commandBlock = step.code
            ? `<div class="relative mt-3">
                                    <div class="flex items-center justify-between bg-slate-800 text-slate-400 px-3.5 py-1.5 rounded-t-xl text-[11px] font-mono border-b border-slate-700">
                                        <span>Terminal / Command Prompt</span>
                                        <button type="button" data-copy-code="${step.code.replace(/"/g, '&quot;')}"
                                            class="tutorial-copy-btn text-teal-400 hover:text-white font-semibold cursor-pointer">
                                            Copy
                                        </button>
                                    </div>
                                    <pre class="bg-slate-900 text-slate-200 p-4 rounded-b-xl font-mono text-xs overflow-x-auto leading-relaxed"><code>${step.code}</code></pre>
                                </div>`
            : '';

          return `
                            <div class="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <h3 class="text-base font-bold text-slate-900 mb-2">${step.title}</h3>
                                    <p class="text-sm text-slate-600 leading-relaxed">${step.description}</p>
                                </div>
                                ${commandBlock}
                            </div>`;
        })
        .join('\n');

      return `
                    <!-- OS Setup Panel: ${os.label} -->
                    <div data-os-panel="${os.id}" class="tutorial-os-panel ${isHidden ? 'hidden' : ''} space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${stepsHtml}
                        </div>

                        <div class="p-5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-slate-700 leading-relaxed">
                            <strong class="text-slate-900">Helpful Tip (${os.label}):</strong> ${os.tip}
                        </div>
                    </div>`;
    })
    .join('\n');

  const setupGuidesHtml = setupGuides
    .map((guide) => {
      const cardsHtml = guide.steps
        .map(
          (s) => `
                            <div class="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <span class="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                                    ${s.stepNumber}
                                </span>
                                <h4 class="text-base font-bold text-slate-900">${s.title}</h4>
                                <p class="text-xs text-slate-600 leading-relaxed">${s.text}</p>
                            </div>`
        )
        .join('\n');

      return `
                    <article id="${guide.id}" class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                        <div class="max-w-2xl">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">${guide.badge}</span>
                            <h3 class="text-xl sm:text-2xl font-bold text-slate-900">${guide.title}</h3>
                            <p class="text-sm text-slate-600 mt-1 leading-relaxed">${guide.subtitle}</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${cardsHtml}
                        </div>
                    </article>`;
    })
    .join('\n');

  const bodyContent = `
        <!-- Clean, Direct Header with Quick Jump Cards -->
        <section class="bg-white border-b border-slate-200/80 py-14">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl space-y-3 mb-10">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                        Getting Started &amp; Setup Guides
                    </span>
                    <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                        How to install, connect &amp; assemble.
                    </h1>
                    <p class="text-base text-slate-600 leading-relaxed">
                        Pick what you are setting up below—whether you are installing Python for your Macro Pad, mounting a pre-built Weather Station outside, or wiring a DIY kit.
                    </p>
                </div>

                <!-- 4 Direct Jump Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a href="#python-os-setup"
                        class="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-600 transition-colors block">
                        <span class="text-xs font-bold text-teal-700 block">01 &middot; Software Setup</span>
                        <span class="text-sm font-bold text-slate-900 mt-1 block">Install Python &amp; Macro App</span>
                        <span class="text-xs text-slate-500 mt-0.5 block">Windows, Linux &amp; macOS</span>
                    </a>
                    <a href="#setup-macro-diy"
                        class="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-600 transition-colors block">
                        <span class="text-xs font-bold text-teal-700 block">02 &middot; Desk Hardware</span>
                        <span class="text-sm font-bold text-slate-900 mt-1 block">Assemble a DIY Macro Pad</span>
                        <span class="text-xs text-slate-500 mt-0.5 block">Switches, pins &amp; upload</span>
                    </a>
                    <a href="#setup-weather-station"
                        class="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-600 transition-colors block">
                        <span class="text-xs font-bold text-teal-700 block">03 &middot; Outdoor Weather</span>
                        <span class="text-sm font-bold text-slate-900 mt-1 block">Mount a Weather Station</span>
                        <span class="text-xs text-slate-500 mt-0.5 block">Battery switch, Wi-Fi &amp; solar</span>
                    </a>
                    <a href="#setup-rfid-door"
                        class="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-600 transition-colors block">
                        <span class="text-xs font-bold text-teal-700 block">04 &middot; Room Security</span>
                        <span class="text-sm font-bold text-slate-900 mt-1 block">Wire the RFID Door Kit</span>
                        <span class="text-xs text-slate-500 mt-0.5 block">Reader, lock relay &amp; cards</span>
                    </a>
                </div>
            </div>
        </section>

        <!-- Section 1: Operating System Switcher for Python & Macro Pad App -->
        <section id="python-os-setup" class="py-16 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                            Guide 01 &middot; Macro Pad Desktop App
                        </span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Install Python &amp; Connect Your Macro Pad
                        </h2>
                        <p class="text-sm text-slate-600 mt-1 max-w-xl">
                            Choose your operating system below for the exact steps to install Python, open the configurator, and save your shortcuts.
                        </p>
                    </div>

                    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Select Operating System">
                        ${osTabButtonsHtml}
                    </div>
                </div>

                ${osPanelsHtml}
            </div>
        </section>

        <!-- Section 2: Step-by-Step Hardware Assembly & Mounting Guides -->
        <section id="hardware-assembly" class="py-16 bg-white border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div class="max-w-2xl">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                        Guides 02–04 &middot; Hardware Assembly &amp; Mounting
                    </span>
                    <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Connecting &amp; assembling your hardware
                    </h2>
                    <p class="text-sm text-slate-600 mt-1">
                        Simple 4-step checklists for assembling a DIY Macro Pad, setting up a Mateo Weather Station outside, or installing an RFID door lock.
                    </p>
                </div>

                <div class="space-y-8">
                    ${setupGuidesHtml}
                </div>

                <!-- Friendly Need Help Strip -->
                <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Run into an issue during setup?</h3>
                        <p class="text-xs text-slate-600 mt-0.5">Check solved issues or post your question on the Community Forum and we'll help you get it running.</p>
                    </div>
                    <a href="forum.html"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Go to Community Forum &rarr;
                    </a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: `Setup & Assembly Tutorials — ${SITE_COPY.brand.name}`,
    description:
      'Simple, step-by-step instructions to install Python, connect your Macro Pad, assemble DIY kits, and mount Mateo Weather Stations.',
    activePage: 'tutorials',
    assetPrefix,
    bodyContent
  });
}
