import { escapeHtml, sanitizeHref } from '../lib/escape.js';
import { getAdjacentProjects } from '../lib/catalog.js';
import { Layout } from '../components/Layout.js';

export function renderGameView({ siteCopy, project, projects }) {
  const detail = project.detailPage;
  const { prevProject, nextProject } = getAdjacentProjects(project.slug, projects);

  const paragraphsHtml = detail.paragraphs
    .map((p) => `<p class="text-base text-slate-300 leading-relaxed">${escapeHtml(p)}</p>`)
    .join('\n                        ');

  const specsHtml = (detail.specs || [])
    .map(
      (s) => `
                        <div class="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">${escapeHtml(s.label)}</span>
                            <span class="text-sm font-semibold text-white mt-1 block">${escapeHtml(s.value)}</span>
                        </div>`
    )
    .join('\n');

  const bodyContent = `
        <section class="bg-slate-900 text-slate-200 border-b border-slate-800 py-16 md:py-24">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div>
                    <a href="projects.html" class="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                        &larr; Back to all projects
                    </a>
                </div>

                <div class="max-w-3xl space-y-4">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                        ${escapeHtml(detail.kicker)}
                    </span>
                    <h1 class="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                        ${escapeHtml(detail.headline)}
                    </h1>
                    ${paragraphsHtml}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${specsHtml}
                </div>

                <div class="flex flex-wrap gap-3 pt-2">
                    <a href="${sanitizeHref(detail.releaseUrl)}" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                        Download via ReleaseHub &nearr;
                    </a>
                    <a href="${sanitizeHref(detail.docsUrl)}" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors">
                        Verify SHA-256 Checksum &nearr;
                    </a>
                </div>
            </div>
        </section>

        <section class="py-10 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
                <a href="${sanitizeHref(prevProject ? prevProject.overviewPage : 'projects.html')}" class="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    &larr; Previous: ${escapeHtml(prevProject ? prevProject.title : 'All Projects')}
                </a>
                <a href="${sanitizeHref(nextProject ? nextProject.overviewPage : 'projects.html')}" class="text-xs font-semibold text-teal-700 hover:text-slate-900">
                    Next: ${escapeHtml(nextProject ? nextProject.title : 'All Projects')} &rarr;
                </a>
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
