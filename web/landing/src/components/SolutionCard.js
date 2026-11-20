import { escapeHtml, sanitizeHref } from '../lib/escape.js';

export function SolutionCard(project, { variant = 'standard' } = {}) {
  const highlightsHtml = (project.highlights || [])
    .map(
      (item) => `
                                <li class="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                                    <span class="text-teal-700 font-bold mt-0.5">&bull;</span>
                                    <span>${escapeHtml(item)}</span>
                                </li>`
    )
    .join('');

  if (variant === 'featured') {
    return `
                    <article data-component="SolutionCard" data-group="${escapeHtml(project.group)}" data-project-id="${escapeHtml(project.id)}"
                        class="solution-card bg-white rounded-2xl border border-slate-200 p-7 sm:p-8 shadow-xs hover:border-slate-300 transition-all duration-200">
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div class="lg:col-span-7 flex flex-col justify-between">
                                <div>
                                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">
                                        ${escapeHtml(project.kindLabel || 'Platform Project')}
                                    </span>
                                    <h3 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                                        <a href="${sanitizeHref(project.overviewPage)}" class="hover:text-teal-700 transition-colors">${escapeHtml(project.title)}</a>
                                    </h3>
                                    <p class="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">
                                        ${escapeHtml(project.summary)}
                                    </p>
                                </div>

                                <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                    <a href="${sanitizeHref(project.overviewPage)}"
                                        class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                                        Explore Blueprint &rarr;
                                    </a>
                                    <a href="${sanitizeHref(project.githubUrl)}" target="_blank" rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                                        <span>GitHub</span>
                                        <span>&nearr;</span>
                                    </a>
                                </div>
                            </div>

                            <div class="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-4">
                                <div>
                                    <span class="text-xs font-bold text-slate-900 block mb-1">What it solves</span>
                                    <p class="text-xs text-slate-600 leading-relaxed">
                                        ${escapeHtml(project.whatItSolves)}
                                    </p>
                                </div>
                                <ul class="space-y-2 pt-3 border-t border-slate-200/70">
                                    ${highlightsHtml}
                                </ul>
                            </div>
                        </div>
                    </article>`;
  }

  return `
                    <article data-component="SolutionCard" data-group="${escapeHtml(project.group)}" data-project-id="${escapeHtml(project.id)}"
                        class="solution-card bg-white rounded-2xl border border-slate-200 p-7 shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
                        <div>
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">
                                ${escapeHtml(project.kindLabel || 'Project')}
                            </span>

                            <h3 class="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                                <a href="${sanitizeHref(project.overviewPage)}" class="hover:text-teal-700 transition-colors">${escapeHtml(project.title)}</a>
                            </h3>
                            <p class="text-sm text-slate-600 leading-relaxed mb-5">
                                ${escapeHtml(project.summary)}
                            </p>

                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-5">
                                <span class="text-xs font-bold text-slate-900 block mb-1">What it solves</span>
                                <p class="text-xs text-slate-600 leading-relaxed">
                                    ${escapeHtml(project.whatItSolves)}
                                </p>
                            </div>

                            <ul class="space-y-2 mb-7">
                                ${highlightsHtml}
                            </ul>
                        </div>

                        <div class="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                            <a href="${sanitizeHref(project.overviewPage)}"
                                class="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                                View Details &rarr;
                            </a>
                            <a href="${sanitizeHref(project.githubUrl)}" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                <span>GitHub</span>
                                <span>&nearr;</span>
                            </a>
                        </div>
                    </article>`;
}
