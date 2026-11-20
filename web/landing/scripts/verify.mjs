import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjects, loadSiteCopy } from '../src/lib/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANDING_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(LANDING_ROOT, 'dist');

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`[VERIFY FAILED] ${msg}`);
  }
}

function verify() {
  const siteCopy = loadSiteCopy();
  const projects = loadProjects();
  const cssPath = path.join(DIST_DIR, 'assets', 'css', 'style.css');
  assert(fs.existsSync(cssPath), 'Missing compiled dist/assets/css/style.css');

  const forbiddenTokens = [
    ['filip', 'vastl005'].join(''),
    ['email', 'js'].join(''),
    ['cdn.', 'jsdelivr.net'].join(''),
    ['fonts.', 'googleapis.com'].join(''),
    '<style>'
  ];

  const expectedPages = ['index.html', 'projects.html', 'shop.html', ...projects.map((p) => p.overviewPage)];
  for (const page of expectedPages) {
    const filePath = path.join(DIST_DIR, page);
    assert(fs.existsSync(filePath), `Missing compiled page dist/${page}`);
    const html = fs.readFileSync(filePath, 'utf8');
    assert(html.includes(siteCopy.brand.name), `${page} missing brand name`);
    assert(html.includes('assets/css/style.css'), `${page} missing compiled stylesheet link`);
    for (const token of forbiddenTokens) {
      assert(!html.toLowerCase().includes(token), `${page} contains forbidden token '${token}'`);
    }
  }

  console.log(`[OK] Verified ${expectedPages.length} Zero Trust static pages under dist/.`);
}

verify();
