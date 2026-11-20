import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, loadProjects, loadSiteCopy, loadTutorials } from '../src/lib/catalog.js';
import { renderLandingView } from '../src/views/LandingView.js';
import { renderProjectsView } from '../src/views/ProjectsView.js';
import { renderShopView } from '../src/views/ShopView.js';
import { renderRfidView } from '../src/views/RfidView.js';
import { renderMacroView } from '../src/views/MacroView.js';
import { renderMateoView } from '../src/views/MateoView.js';
import { renderGameView } from '../src/views/GameView.js';
import { generateShopPlaceholders } from './generate-shop-placeholders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANDING_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(LANDING_ROOT, 'dist');

const PROJECT_THEME_RENDERERS = {
  split: renderRfidView,
  dark: renderMacroView,
  atmospheric: renderMateoView,
  game: renderGameView
};

export function buildSite() {
  const siteCopy = loadSiteCopy();
  const projects = loadProjects();
  const catalog = loadCatalog();
  const tutorials = loadTutorials();

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'css'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'js'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'img'), { recursive: true });

  // Copy static brand SVGs and client JS into dist/assets/
  const imgSrcDir = path.join(LANDING_ROOT, 'src', 'assets', 'img');
  for (const file of fs.readdirSync(imgSrcDir)) {
    if (file.endsWith('.svg')) {
      fs.copyFileSync(path.join(imgSrcDir, file), path.join(DIST_DIR, 'assets', 'img', file));
    }
  }
  fs.copyFileSync(path.join(LANDING_ROOT, 'src', 'app.js'), path.join(DIST_DIR, 'assets', 'js', 'app.js'));

  generateShopPlaceholders(catalog);

  const pages = [
    { filename: 'index.html', html: renderLandingView({ siteCopy, projects, tutorials }) },
    { filename: 'projects.html', html: renderProjectsView({ siteCopy, projects }) },
    { filename: 'shop.html', html: renderShopView({ siteCopy, projects, catalog }) },
    ...projects.map((project) => {
      const renderer = PROJECT_THEME_RENDERERS[project.detailPage?.theme] || renderGameView;
      return {
        filename: project.overviewPage,
        html: renderer({ siteCopy, project, projects })
      };
    })
  ];

  for (const page of pages) {
    fs.writeFileSync(path.join(DIST_DIR, page.filename), page.html, 'utf8');
    console.log(`[build] Compiled dist/${page.filename}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildSite();
}
