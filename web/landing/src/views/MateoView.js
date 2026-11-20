import { escapeHtml, sanitizeHref } from '../lib/escape.js';
import { getAdjacentProjects } from '../lib/catalog.js';
import { Layout } from '../components/Layout.js';

export function renderMateoView({ siteCopy, project, projects }) {
  const detail = project.detailPage;
  const { prevProject, nextProject } = getAdjacentProjects(project.slug, projects);

  const paragraphsHtml = detail.paragraphs
    .map((p, idx) =>
      idx === 0
        ? `<p class="text-base sm:text-lg text-slate-600 leading-relaxed">${escapeHtml(p)}</p>`
        : `<p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(p)}</p>`
    )
    .join('\n                        ');

  const ctasHtml = detail.ctas
    .map((cta) => {
      const href = sanitizeHref(cta.href);
      const attrs = href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
      const btnClass =
        cta.style === 'teal'
          ? 'inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs'
          : 'inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors';
      return `<a href="${href}"${attrs} class="${btnClass}">${escapeHtml(cta.label)}</a>`;
    })
    .join('\n                        ');

  const topologiesHtml = detail.topologiesSection.items
    .map(
      (item) => `
                    <div class="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div class="md:col-span-4">
                            <span class="text-xs font-bold ${escapeHtml(item.badgeClass)} px-2.5 py-1 rounded-md inline-block mb-2">${escapeHtml(item.badge)}</span>
                            <h3 class="text-xl font-bold text-slate-900">${escapeHtml(item.title)}</h3>
                            <p class="text-xs text-slate-500 mt-1">${escapeHtml(item.subtitle)}</p>
                        </div>
                        <div class="md:col-span-8 text-sm text-slate-600 leading-relaxed space-y-2">
                            <p>${escapeHtml(item.description)}</p>
                        </div>
                    </div>`
    )
    .join('\n');

  const stepsHtml = detail.stepsSection.steps
    .map(
      (step) => `
                        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4">
                            <span class="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">${escapeHtml(step.number)}</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">${escapeHtml(step.title)}</h3>
                                <p class="text-xs text-slate-600 mt-0.5">${escapeHtml(step.description)}</p>
                            </div>
                        </div>`
    )
    .join('\n');

  const bannerHref = sanitizeHref(detail.tutorialBanner.ctaHref);
  const bannerAttrs = bannerHref.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';

  const bodyContent = `
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
                            <img src="assets/img/${escapeHtml(project.logo || siteCopy.brand.logo)}" alt="${escapeHtml(project.title)} Logo"
                                class="w-10 h-10 rounded-lg border border-slate-200 shadow-2xs">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-700">${escapeHtml(detail.kicker)}</span>
                        </div>
                        <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">${escapeHtml(detail.headline)}</h1>
                        ${paragraphsHtml}
                    </div>

                    <div class="flex flex-col gap-3 shrink-0">
                        ${ctasHtml}
                        <a href="${sanitizeHref(project.githubUrl)}" target="_blank" rel="noopener noreferrer"
                            class="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs">
                            ${escapeHtml(detail.githubCtaLabel)}
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <section class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl mb-12">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">${escapeHtml(detail.topologiesSection.eyebrow)}</span>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tight mb-3">${escapeHtml(detail.topologiesSection.title)}</h2>
                    <p class="text-base text-slate-600 leading-relaxed">${escapeHtml(detail.topologiesSection.subtitle)}</p>
                </div>

                <div class="space-y-6">
                    ${topologiesHtml}
                </div>
            </div>
        </section>

        <section class="py-16 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div class="lg:col-span-5 space-y-4">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${escapeHtml(detail.stepsSection.eyebrow)}</span>
                        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">${escapeHtml(detail.stepsSection.title)}</h2>
                        <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(detail.stepsSection.subtitle)}</p>
                    </div>

                    <div class="lg:col-span-7 space-y-3">
                        ${stepsHtml}
                    </div>
                </div>
            </div>
        </section>

        <section class="py-14 bg-white border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">${escapeHtml(detail.tutorialBanner.eyebrow)}</span>
                        <h2 class="text-lg font-bold text-slate-900">${escapeHtml(detail.tutorialBanner.title)}</h2>
                        <p class="text-xs text-slate-600 mt-0.5">${escapeHtml(detail.tutorialBanner.description)}</p>
                    </div>
                    <a href="${bannerHref}"${bannerAttrs}
                        class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        ${escapeHtml(detail.tutorialBanner.ctaLabel)}
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <a href="${sanitizeHref(prevProject ? prevProject.overviewPage : 'projects.html')}" class="text-xs font-semibold text-slate-600 hover:text-slate-900">
                        &larr; Previous: ${escapeHtml(prevProject ? prevProject.title : 'All Projects')}
                    </a>
                    <a href="${sanitizeHref(nextProject ? nextProject.overviewPage : 'projects.html')}" class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                        Next: ${escapeHtml(nextProject ? nextProject.title : 'All Projects')} &rarr;
                    </a>
                </div>
            </div>
        </section>`;

  return Layout({
    siteCopy,
    projects,
    title: `${project.title} — ${siteCopy.brand.name}`,
    description: project.summary,
    activePage: project.slug,
    favicon: project.favicon,
    bodyContent
  });
}
