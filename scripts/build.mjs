import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS, SITE_COPY } from '../src/data/projects.js';
import { Layout } from '../src/components/Layout.js';
import { renderLandingView } from '../src/views/LandingView.js';
import { renderProjectsView } from '../src/views/ProjectsView.js';
import { renderShopView } from '../src/views/ShopView.js';
import { renderCartView } from '../src/views/CartView.js';
import { renderTutorialsView } from '../src/views/TutorialsView.js';
import { renderForumView } from '../src/views/ForumView.js';
import { renderRfidView } from '../src/views/RfidView.js';
import { renderMacroView } from '../src/views/MacroView.js';
import { renderMateoView } from '../src/views/MateoView.js';
import { generateShopPlaceholders } from './generate-shop-placeholders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src', 'data', 'repos-manifest.json');

const PROJECT_THEME_RENDERERS = {
  split: renderRfidView,
  dark: renderMacroView,
  atmospheric: renderMateoView
};

/**
 * Fallback view generator for any project in `PROJECTS` that does not specify
 * one of the specialized `detailPage.theme` layouts.
 */
function renderGenericProjectView({ project, assetPrefix = '.' }) {
  const highlights = (project.highlights || [])
    .map(
      (h) =>
        `<li class="flex items-start gap-2.5 text-sm text-slate-600"><span class="text-teal-700 font-bold">&bull;</span><span>${h}</span></li>`
    )
    .join('\n');

  const bodyContent = `
        <section class="py-20 bg-white border-b border-slate-200/80">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <a href="projects.html" class="text-xs font-semibold text-slate-500 hover:text-slate-900">&larr; Back to all projects</a>
                <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block">${project.kindLabel || 'Project'}</span>
                <h1 class="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">${project.title}</h1>
                <p class="text-lg text-slate-600 leading-relaxed">${project.summary}</p>
                <div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h2 class="text-base font-bold text-slate-900">What it solves</h2>
                    <p class="text-sm text-slate-600 leading-relaxed">${project.whatItSolves}</p>
                    <ul class="space-y-2 pt-2">${highlights}</ul>
                </div>
                <div class="pt-4">
                    <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800">
                        View on GitHub &nearr;
                    </a>
                </div>
            </div>
        </section>`;

  return Layout({
    title: `${project.title} — ${SITE_COPY.brand.name}`,
    description: project.summary,
    activePage: project.slug,
    assetPrefix,
    bodyContent
  });
}

export function getSitePages(projects = PROJECTS) {
  return [
    {
      filename: 'index.html',
      render: (assetPrefix) => renderLandingView({ assetPrefix })
    },
    {
      filename: 'projects.html',
      render: (assetPrefix) => renderProjectsView({ projects, assetPrefix })
    },
    {
      filename: 'shop.html',
      render: (assetPrefix) => renderShopView({ assetPrefix })
    },
    {
      filename: 'cart.html',
      render: (assetPrefix) => renderCartView({ assetPrefix })
    },
    {
      filename: 'tutorials.html',
      render: (assetPrefix) => renderTutorialsView({ assetPrefix })
    },
    {
      filename: 'forum.html',
      render: (assetPrefix) => renderForumView({ assetPrefix })
    },
    ...projects.map((project) => {
      const themeRenderer = PROJECT_THEME_RENDERERS[project.detailPage?.theme];
      return {
        filename: project.overviewPage,
        render: (assetPrefix) =>
          themeRenderer
            ? themeRenderer({ project, projects, assetPrefix })
            : renderGenericProjectView({ project, assetPrefix })
      };
    })
  ];
}

export function buildSite() {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  generateShopPlaceholders();

  // Keep repos-manifest.json synchronized with PROJECTS (no stale hardcoded paths)
  const manifestPayload = {
    generatedAt: new Date().toISOString(),
    organization: {
      name: SITE_COPY.brand.name,
      tagline: SITE_COPY.brand.subtitle,
      license: SITE_COPY.brand.licenseNote,
      githubProfile: SITE_COPY.brand.githubProfile
    },
    projects: PROJECTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      group: p.group,
      title: p.title,
      tagline: p.tagline,
      kindLabel: p.kindLabel,
      githubUrl: p.githubUrl,
      overviewPage: p.overviewPage,
      summary: p.summary,
      whatItSolves: p.whatItSolves,
      highlights: p.highlights
    }))
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestPayload, null, 2) + '\n', 'utf8');

  const pages = getSitePages(PROJECTS);

  for (const page of pages) {
    const rootHtml = page.render('.');
    fs.writeFileSync(path.join(ROOT_DIR, page.filename), rootHtml, 'utf8');

    const templateHtml = page.render('..');
    fs.writeFileSync(path.join(TEMPLATES_DIR, page.filename), templateHtml, 'utf8');

    console.log(`[build] Compiled ${page.filename} and templates/${page.filename}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildSite();
}
