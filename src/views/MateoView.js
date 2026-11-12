/**
 * MateoView — Dedicated Page for WEB-Projekt (Mateo Weather Network) (`mateo.html`)
 */

import { Layout } from '../components/Layout.js';

export function renderMateoView({ project, assetPrefix = '.' } = {}) {
  const bodyContent = `
        <!-- Distinct Atmospheric Field-Guide Header -->
        <section class="hero-banner border-b border-slate-200/80 py-16 md:py-24">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <a href="projects.html" class="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                        &larr; Back to all projects
                    </a>
                </div>

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div class="max-w-2xl space-y-4">
                        <div class="flex items-center gap-3">
                            <img src="${assetPrefix}/src/img/mateologo.svg" alt="Mateo Logo"
                                class="w-10 h-10 rounded-lg border border-slate-200 shadow-2xs">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-700">
                                Project 03 &middot; Community Weather &amp; Design Baseline
                            </span>
                        </div>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            Local weather data where big forecasts miss.
                        </h1>
                        <p class="text-base sm:text-lg text-slate-600 leading-relaxed">
                            Official weather stations cost thousands of dollars and are mostly placed near airports and big cities—leaving farms, valleys, and small towns guessing when frost or heavy rain will hit.
                        </p>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            <strong>Mateo</strong> is an open-source, solar-powered weather station project built to work anywhere, from an apartment balcony to a remote village with zero cell service.
                        </p>
                    </div>

                    <div class="flex flex-col gap-3 shrink-0">
                        <a href="shop.html"
                            class="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs">
                            Shop Pre-Built Stations &amp; Kits &rarr;
                        </a>
                        <a href="tutorials.html#setup-weather-station"
                            class="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors">
                            How to Mount &amp; Connect &rarr;
                        </a>
                        <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
                            class="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs">
                            Open WEB-Projekt on GitHub &nearr;
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 1: Three Places, Three Setups (Stacked Editorial Layout) -->
        <section class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl mb-12">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">Built for Real Places</span>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-3">
                        Three station setups, depending on where you live.
                    </h2>
                    <p class="text-base text-slate-600 leading-relaxed">
                        Not everyone has strong Wi-Fi or wall power outside. Mateo uses the same core weather sensors across three different setups.
                    </p>
                </div>

                <!-- Stacked Horizontal Rows -->
                <div class="space-y-6">
                    <!-- Place 1 -->
                    <div class="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div class="md:col-span-4">
                            <span class="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md inline-block mb-2">Setup 01 &middot; City &amp; Balcony</span>
                            <h3 class="text-xl font-bold text-slate-900">Home Wi-Fi Station</h3>
                            <p class="text-xs text-slate-500 mt-1">For apartments, rooftops, and city neighborhoods</p>
                        </div>
                        <div class="md:col-span-8 text-sm text-slate-600 leading-relaxed space-y-2">
                            <p>
                                Connects directly to your home Wi-Fi. To keep the small solar battery charged through dark winters, the chip stays asleep 99.9% of the time—waking up for just a fraction of a second every few minutes to take a reading and go right back to sleep.
                            </p>
                        </div>
                    </div>

                    <!-- Place 2 -->
                    <div class="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div class="md:col-span-4">
                            <span class="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md inline-block mb-2">Setup 02 &middot; Countryside &amp; Farms</span>
                            <h3 class="text-xl font-bold text-slate-900">Long-Range Garden Mast + Indoor Hub</h3>
                            <p class="text-xs text-slate-500 mt-1">When the sensor is too far for Wi-Fi</p>
                        </div>
                        <div class="md:col-span-8 text-sm text-slate-600 leading-relaxed space-y-2">
                            <p>
                                Places the solar weather sensor out in a field or orchard up to 2 km away, beaming readings over long-range radio (LoRa) to a small indoor display box in your house. Even if your home internet goes out, you can view live weather on your local network and everything saves to an SD card.
                            </p>
                        </div>
                    </div>

                    <!-- Place 3 -->
                    <div class="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div class="md:col-span-4">
                            <span class="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md inline-block mb-2">Setup 03 &middot; Off-Grid Villages</span>
                            <h3 class="text-xl font-bold text-slate-900">Solar Community Kiosk</h3>
                            <p class="text-xs text-slate-500 mt-1">Zero internet or cell towers required</p>
                        </div>
                        <div class="md:col-span-8 text-sm text-slate-600 leading-relaxed space-y-2">
                            <p>
                                Multiple solar sensors relay readings from hill to hill into a central village kiosk. The kiosk broadcasts a free local Wi-Fi page (<code class="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">http://community.weather</code>) so anyone nearby can check frost warnings and rainfall on their phone without needing mobile data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 2: How Mateo Filters Out Bad Readings -->
        <section class="py-16 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div class="lg:col-span-5 space-y-4">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">Keeping Data Honest</span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Why backyard weather networks usually get messy—and how we fix it.
                        </h2>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            If someone mounts a cheap temperature sensor on a sunny black roof, it might read 40°C on a mild spring day. Mateo runs every reading through three automatic sanity checks before showing it on the public map.
                        </p>
                    </div>

                    <div class="lg:col-span-7 space-y-3">
                        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4">
                            <span class="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Ignore impossible numbers</h3>
                                <p class="text-xs text-slate-600 mt-0.5">If a loose wire reports 75°C or negative humidity, it gets thrown out immediately.</p>
                            </div>
                        </div>

                        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4">
                            <span class="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Catch sudden sun spikes</h3>
                                <p class="text-xs text-slate-600 mt-0.5">Real air temperature doesn't jump 5°C in 45 seconds. Sudden spikes from direct sun glare are flagged and filtered out.</p>
                            </div>
                        </div>

                        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4">
                            <span class="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Compare with nearby stations</h3>
                                <p class="text-xs text-slate-600 mt-0.5">Each station is compared with its neighbors within 25 km. Reliable stations earn a higher trust score; drifting sensors are quietly hidden until fixed.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section 3: Link to Tutorials & Next Project -->
        <section class="py-14 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">Mounting &amp; Setup</span>
                        <h2 class="text-lg font-bold text-slate-900">Setting up a Pre-Built or DIY Mateo Station?</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Read our step-by-step guide on turning on the internal battery switch, connecting to Wi-Fi, and aiming the solar panel.</p>
                    </div>
                    <a href="tutorials.html#setup-weather-station"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Open Station Setup Guide &rarr;
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <a href="projects.html" class="text-xs font-semibold text-slate-600 hover:text-slate-900">&larr; Back to All Projects</a>
                    <a href="rfid.html" class="text-xs font-semibold text-teal-700 hover:text-slate-900">Next: RFID Student Access &rarr;</a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: 'Mateo Weather Network — Eggman Studios',
    description:
      'Community-driven, solar-powered weather stations for city balconies, rural farms, and off-grid communities.',
    activePage: 'mateo',
    assetPrefix,
    favicon: 'mateologo.svg',
    bodyContent
  });
}
