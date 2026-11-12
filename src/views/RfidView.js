/**
 * RfidView — Dedicated Page for RFID-student-acces-system (`rfid.html`)
 * Distinct "Inside vs. Outside the Door" architectural layout that explains
 * physical security in plain human terms.
 */

import { Layout } from '../components/Layout.js';

export function renderRfidView({ project, assetPrefix = '.' } = {}) {
  const bodyContent = `
        <!-- Distinct Split-Screen Architectural Header -->
        <section class="bg-white border-b border-slate-200/80 py-16 md:py-20">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <a href="projects.html" class="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                        &larr; Back to all projects
                    </a>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <!-- Left: Plain-English Overview -->
                    <div class="lg:col-span-6 space-y-5">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                            Project 01 &middot; Classroom &amp; Workshop Security
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            A smarter way to unlock the student lab.
                        </h1>
                        <p class="text-base sm:text-lg text-slate-600 leading-relaxed">
                            Schools and makerspaces shouldn't have to pay monthly cloud fees just to let students tap into a workshop. And they definitely shouldn't use cheap all-in-one door readers where anyone can pop off the plastic cover and hotwire the lock.
                        </p>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            <strong>RFID Student Access</strong> solves both problems by splitting the hardware across two small boards—one outside the door, one safely inside—paired with a simple web page running on the school's own local network.
                        </p>

                        <div class="pt-2 flex flex-wrap gap-3">
                            <a href="shop.html"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                                Get the Starter Kit in the Shop &rarr;
                            </a>
                            <a href="tutorials.html#setup-rfid-door"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors">
                                How to Wire &amp; Install &rarr;
                            </a>
                            <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors">
                                View on GitHub &nearr;
                            </a>
                        </div>
                    </div>

                    <!-- Right: Visual "Outside vs. Inside the Wall" Blueprint Card -->
                    <div class="lg:col-span-6">
                        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-4">
                                Why Two Boards Are Safer Than One
                            </span>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Hallway Side -->
                                <div class="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                                    <div>
                                        <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mb-2">
                                            Hallway Side (Outside)
                                        </span>
                                        <h2 class="text-base font-bold text-slate-900 mb-1">1. The Reader Board</h2>
                                        <p class="text-xs text-slate-600 leading-relaxed">
                                            Sits next to the door handle. All it can do is read a student badge ID and ask the inside board for permission.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                                        No lock wires attached here
                                    </div>
                                </div>

                                <!-- Room Side -->
                                <div class="bg-white p-5 rounded-xl border border-teal-200 flex flex-col justify-between">
                                    <div>
                                        <span class="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded inline-block mb-2">
                                            Locked Room (Inside)
                                        </span>
                                        <h2 class="text-base font-bold text-slate-900 mb-1">2. The Lock Controller</h2>
                                        <p class="text-xs text-slate-600 leading-relaxed">
                                            Safely mounted inside the room. Checks with the local dashboard and flips the electric door strike for 3 seconds.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-teal-700">
                                        Protected behind the locked door
                                    </div>
                                </div>
                            </div>

                            <!-- Bottom Local Dashboard Bar -->
                            <div class="mt-4 bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 class="text-sm font-bold text-slate-900">3. The Local Web Dashboard</h3>
                                    <p class="text-xs text-slate-600">Teachers or lab leads can add cards and check attendance from any browser on the building Wi-Fi.</p>
                                </div>
                                <span class="text-xs font-mono text-teal-700 shrink-0">Local LAN Only</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 2: How a Card Tap Works (Simple 3-Step Flow) -->
        <section class="py-16 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl mb-10">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">How It Works</span>
                    <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        What happens when a student taps their card
                    </h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div class="bg-white p-6 rounded-2xl border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">1</span>
                        <h3 class="text-base font-bold text-slate-900 mb-2">Outside reader scans the card</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            The hallway reader picks up the student badge number and sends it through the thin cable in the wall to the inside box.
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">2</span>
                        <h3 class="text-base font-bold text-slate-900 mb-2">Inside controller checks the list</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            The inside board checks if that card is approved for the room—even if the school Wi-Fi is down, it keeps a backup list in its own memory.
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">3</span>
                        <h3 class="text-base font-bold text-slate-900 mb-2">Door unlocks for 3 seconds</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            If approved, the inside relay clicks open the electric door latch for 3 seconds, beeps the green light outside, and logs the visit.
                        </p>
                    </div>
                </div>

                <div class="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">Step-by-Step Installation</span>
                        <h3 class="text-base font-bold text-slate-900">Installing this on a classroom or workshop door?</h3>
                        <p class="text-xs text-slate-600 mt-0.5">Read our simple 4-step wiring and setup guide on the Tutorials page.</p>
                    </div>
                    <a href="tutorials.html#setup-rfid-door"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Open RFID Setup Guide &rarr;
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
                    <a href="projects.html" class="text-xs font-semibold text-slate-600 hover:text-slate-900">&larr; Back to Projects</a>
                    <a href="macro.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900">Next Project: Macro 3&times;3 Pad &rarr;</a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: 'RFID Student Access — Eggman Studios',
    description:
      'A self-hosted badge access system for classrooms and student workshops built on two separate ESP boards.',
    activePage: 'rfid',
    assetPrefix,
    bodyContent
  });
}
