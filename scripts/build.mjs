import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS } from '../src/data/projects.js';
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

const CUSTOM_PROJECT_RENDERERS = {
  rfid: renderRfidView,
  macro: renderMacroView,
  mateo: renderMateoView
};

/**
 * Fallback view generator for any new project added to `PROJECTS` in `src/data/projects.js`
 * that does not have a custom view file in `src/views/`.
 */
function renderGenericProjectView({ project, assetPrefix = '.' }) {
  const highlights = (project.highlights || [])
    .map((h) => `<li class="flex items-start gap-2.5 text-sm text-slate-600"><span class="text-teal-700 font-bold">&bull;</span><span>${h}</span></li>`)
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
    title: `${project.title} — Eggman Studios`,
    description: project.summary,
    activePage: project.slug,
    assetPrefix,
    bodyContent
  });
}

function buildSite() {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  generateShopPlaceholders();

  const pages = [
    {
      filename: 'index.html',
      render: (assetPrefix) => renderLandingView({ assetPrefix })
    },
    {
      filename: 'projects.html',
      render: (assetPrefix) => renderProjectsView({ projects: PROJECTS, assetPrefix })
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
    ...PROJECTS.map((project) => {
      const customRenderer = CUSTOM_PROJECT_RENDERERS[project.slug];
      return {
        filename: project.overviewPage,
        render: (assetPrefix) =>
          customRenderer
            ? customRenderer({ project, assetPrefix })
            : renderGenericProjectView({ project, assetPrefix })
      };
    })
  ];

  for (const page of pages) {
    const rootHtml = page.render('.');
    fs.writeFileSync(path.join(ROOT_DIR, page.filename), rootHtml, 'utf8');

    const templateHtml = page.render('..');
    fs.writeFileSync(path.join(TEMPLATES_DIR, page.filename), templateHtml, 'utf8');

    console.log(`[build] Compiled ${page.filename} and templates/${page.filename}`);
  }
}

buildSite();
