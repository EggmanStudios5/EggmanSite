/**
 * MacroView — Data-Driven Project View for Desk Hardware (`macro.html`)
 * Renders 100% dynamically from `project.detailPage` and `getAdjacentProjects` in `src/data/projects.js`.
 */

import { Layout } from '../components/Layout.js';
import { getAdjacentProjects, getProjectBySlug, PROJECTS, SITE_COPY } from '../data/projects.js';

export function renderMacroView({
  project = getProjectBySlug('macro'),
  projects = PROJECTS,
  assetPrefix = '.'
} = {}) {
  const detail = project.detailPage;
  const { prevProject, nextProject } = getAdjacentProjects(project.slug, projects);

  const paragraphsHtml = detail.paragraphs
    .map((p, idx) =>
      idx === 0
        ? `<p class="text-base sm:text-lg text-slate-300 leading-relaxed">${p}</p>`
        : `<p class="text-sm text-slate-400 leading-relaxed">${p}</p>`
    )
    .join('\n                        ');

  const ctasHtml = detail.ctas
    .map((cta) => {
      const btnClass =
        cta.style === 'teal'
          ? 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors'
          : 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors';
      return `<a href="${cta.href}" class="${btnClass}">${cta.label}</a>`;
    })
    .join('\n                            ');

  const bulletsHtml = detail.summaryCard.bullets
    .map(
      (b) => `
                                <li class="flex items-start gap-2.5">
                                    <span class="text-teal-400 font-bold">&bull;</span>
                                    <span><strong>${b.lead}</strong> ${b.text}</span>
                                </li>`
    )
    .join('\n');

  const stepsHtml = detail.stepsSection.steps
    .map(
      (step) => `
                    <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center mb-4">${step.number}</span>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">${step.title}</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            ${step.description}
                        </p>
                    </div>`
    )
    .join('\n');

  const bodyContent = `
        <!-- Dark Studio Hardware Showcase Hero -->
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
                            ${detail.kicker}
                        </span>
                        <h1 class="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                            ${detail.headline}
                        </h1>
                        ${paragraphsHtml}

                        <div class="pt-3 flex flex-wrap gap-3">
                            ${ctasHtml}
                            <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
                                ${detail.githubCtaLabel}
                            </a>
                        </div>
                    </div>

                    <!-- Right: Hardware Summary Card -->
                    <div class="lg:col-span-5">
                        <div class="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-xs space-y-4">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                                ${detail.summaryCard.eyebrow}
                            </span>
                            <h2 class="text-xl font-bold text-white">${detail.summaryCard.title}</h2>
                            <ul class="space-y-3 text-xs text-slate-300 leading-relaxed">
                                ${bulletsHtml}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Step-by-Step Guide -->
        <section id="how-to-setup" class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl mb-12">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">${detail.stepsSection.eyebrow}</span>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-3">
                        ${detail.stepsSection.title}
                    </h2>
                    <p class="text-base text-slate-600 leading-relaxed">
                        ${detail.stepsSection.subtitle}
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    ${stepsHtml}
                </div>
            </div>
        </section>

        <!-- Link to Tutorials & Dynamic Adjacent Projects -->
        <section class="py-14 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">${detail.tutorialBanner.eyebrow}</span>
                        <h2 class="text-lg font-bold text-slate-900">${detail.tutorialBanner.title}</h2>
                        <p class="text-xs text-slate-600 mt-0.5">${detail.tutorialBanner.description}</p>
                    </div>
                    <a href="${detail.tutorialBanner.ctaHref}"
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        ${detail.tutorialBanner.ctaLabel}
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
                    <a href="${prevProject ? prevProject.overviewPage : 'projects.html'}" class="text-xs font-semibold text-slate-600 hover:text-slate-900">
                        &larr; Previous: ${prevProject ? prevProject.title : 'All Projects'}
                    </a>
                    <a href="${nextProject ? nextProject.overviewPage : 'projects.html'}" class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                        Next Project: ${nextProject ? nextProject.title : 'All Projects'} &rarr;
                    </a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: `${project.title} — ${SITE_COPY.brand.name}`,
    description: project.summary,
    activePage: project.slug,
    assetPrefix,
    favicon: project.favicon || SITE_COPY.brand.logo,
    bodyContent
  });
}
