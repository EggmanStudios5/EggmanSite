/**
 * MacroView — Dedicated Page for Macro (3x3 USB Shortcut Pad) (`macro.html`)
 */

import { Layout } from '../components/Layout.js';

export function renderMacroView({ project, assetPrefix = '.' } = {}) {
  const bodyContent = `
        <!-- Distinct Dark Studio Hardware Showcase Hero -->
        <section class="bg-slate-900 text-slate-200 border-b border-slate-800 py-16 md:py-24">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <a href="projects.html" class="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                        &larr; Back to all projects
                    </a>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <!-- Left: Product Story -->
                    <div class="lg:col-span-7 space-y-5">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                            Project 02 &middot; Everyday Desk Hardware
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                            Nine keys. Zero background bloatware.
                        </h1>
                        <p class="text-base sm:text-lg text-slate-300 leading-relaxed">
                            Why do commercial macro pads make you install a 500MB app and log into a cloud account just to assign Copy and Paste? Worse yet, the moment you plug that pad into a different laptop, it forgets everything.
                        </p>
                        <p class="text-sm text-slate-400 leading-relaxed">
                            <strong>Macro</strong> saves your shortcuts directly onto the pad's own onboard memory. Set your keys once with our tiny Python app, close it forever, and plug the pad into any Windows, Mac, or Linux machine.
                        </p>

                        <div class="pt-3 flex flex-wrap gap-3">
                            <a href="shop.html"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                Shop Macro Pads &amp; Parts &rarr;
                            </a>
                            <a href="tutorials.html#python-os-setup"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
                                How to Install &amp; Set Up &rarr;
                            </a>
                            <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
                                GitHub Repo &nearr;
                            </a>
                        </div>
                    </div>

                    <!-- Right: Clean Hardware Summary Card (No Fake Emulator) -->
                    <div class="lg:col-span-5">
                        <div class="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-xs space-y-4">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                                At a Glance
                            </span>
                            <h2 class="text-xl font-bold text-white">Plug-and-play USB or Bluetooth</h2>
                            <ul class="space-y-3 text-xs text-slate-300 leading-relaxed">
                                <li class="flex items-start gap-2.5">
                                    <span class="text-teal-400 font-bold">&bull;</span>
                                    <span><strong>Onboard Memory:</strong> Remembers your shortcuts even when unplugged and moved to a new computer.</span>
                                </li>
                                <li class="flex items-start gap-2.5">
                                    <span class="text-teal-400 font-bold">&bull;</span>
                                    <span><strong>13 Layouts in the Shop:</strong> From compact 4-key strips and 3&times;3 pads to 16-key grids and rotary dial models for audio/video editing.</span>
                                </li>
                                <li class="flex items-start gap-2.5">
                                    <span class="text-teal-400 font-bold">&bull;</span>
                                    <span><strong>Easy to Build or Repair:</strong> Standard mechanical switches and a 6-wire switch matrix you can solder yourself.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 2: Simple 3-Step Guide -->
        <section id="how-to-setup" class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl mb-12">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">How It Works</span>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-3">
                        Set it up in under two minutes.
                    </h2>
                    <p class="text-base text-slate-600 leading-relaxed">
                        Whether you built your own pad or have a finished USB or Bluetooth unit in hand, setting your keys takes three simple steps.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">1</span>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">Plug it in via USB</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            Your computer immediately recognizes the pad as a standard USB keyboard—no custom drivers or kernel modules needed.
                        </p>
                    </div>

                    <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">2</span>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">Run the small Python app</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            Open <code class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">macro_pad_config.py</code>, pick your USB port, click any button on screen, and press the key combo you want.
                        </p>
                    </div>

                    <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">3</span>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">Save &amp; close the app</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            Click <em>Save to Device</em>. Your 9 shortcuts are written to the chip's internal EEPROM memory and stay there even when unplugged.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 3: Link to Tutorials & Next Project -->
        <section class="py-14 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">Step-by-Step Guides</span>
                        <h2 class="text-lg font-bold text-slate-900">Ready to set up Python or solder a DIY kit?</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Head over to the Tutorials page for Windows, Linux, and macOS install steps and the 4-step DIY assembly guide.</p>
                    </div>
                    <a href="tutorials.html"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Open Setup Tutorials &rarr;
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
                    <a href="rfid.html" class="text-xs font-semibold text-slate-600 hover:text-slate-900">&larr; Previous: RFID Student Access</a>
                    <a href="mateo.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900">Next Project: Mateo Weather Network &rarr;</a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: 'Macro 3×3 Pad — Eggman Studios',
    description:
      'A 9-key hardware shortcut pad that saves your bindings directly on the chip so you never need background bloatware.',
    activePage: 'macro',
    assetPrefix,
    bodyContent
  });
}
