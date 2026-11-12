import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Layout, Navbar, Hero, About, SolutionCard, SolutionsHub, Footer } from '../src/components/index.js';
import { PROJECTS } from '../src/data/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[VERIFY FAILED] ${message}`);
  }
}

function verifyAll() {
  console.log('--- Verifying Eggman Studios Architecture & Security Posture ---');

  // 1. Verify modular component functions
  const layoutHtml = Layout({ title: 'Test', description: 'Test', bodyContent: '<p>Test</p>' });
  const navHtml = Navbar({ activePage: 'home' });
  const heroHtml = Hero();
  const aboutHtml = About();
  const cardHtml = SolutionCard(PROJECTS[0]);
  const hubHtml = SolutionsHub({ projects: PROJECTS });
  const footerHtml = Footer();

  assert(layoutHtml.includes('id="app-error-boundary"'), 'Layout must include global user-friendly error boundary');
  assert(navHtml.includes('data-component="Navbar"'), 'Navbar component must render data-component="Navbar"');
  assert(navHtml.includes('href="cart.html"'), 'Navbar component must include link to dedicated cart.html');
  assert(heroHtml.includes('data-component="Hero"'), 'Hero component must render data-component="Hero"');
  assert(aboutHtml.includes('data-component="About"'), 'About component must render data-component="About"');
  assert(cardHtml.includes('data-component="SolutionCard"'), 'SolutionCard component must render data-component="SolutionCard"');
  assert(hubHtml.includes('data-component="SolutionsHub"'), 'SolutionsHub component must render data-component="SolutionsHub"');
  assert(footerHtml.includes('data-component="Footer"'), 'Footer component must render data-component="Footer"');
  console.log('[OK] All 7 modular components (Layout, Navbar, Hero, About, SolutionCard, SolutionsHub, Footer) compile cleanly.');

  // 2. Verify repository data & GitHub links
  const expectedRepos = [
    'https://github.com/FilipVastl005/RFID-student-acces-system',
    'https://github.com/FilipVastl005/Macro',
    'https://github.com/FilipVastl005/WEB-Projekt'
  ];
  for (const repoUrl of expectedRepos) {
    assert(
      PROJECTS.some((p) => p.githubUrl === repoUrl),
      `Missing repository URL in PROJECTS: ${repoUrl}`
    );
  }
  console.log('[OK] All 3 GitHub repositories verified in src/data/projects.js.');

  // 3. Verify compiled HTML pages, security posture, and CSS classes
  const pages = [
    'index.html',
    'projects.html',
    'shop.html',
    'cart.html',
    'tutorials.html',
    'forum.html',
    'rfid.html',
    'macro.html',
    'mateo.html'
  ];
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'src', 'css', 'style.css'), 'utf8');

  const jsHookClasses = new Set([
    'group',
    'faq-icon',
    'mobile-nav-link',
    'solution-card',
    'solution-filter-btn',
    'macro-key-btn',
    'macro-key-combo',
    'font-mono-code',
    'shop-item-card',
    'shop-add-btn',
    'shop-filter-btn',
    'tutorial-os-tab',
    'tutorial-os-panel',
    'tutorial-copy-btn',
    'blueprint-tab-btn',
    'blueprint-panel',
    'forum-filter-btn',
    'forum-thread-card',
    'forum-reply-item',
    'forum-upvote-btn',
    'forum-solve-btn'
  ]);

  const missingClasses = new Set();

  for (const page of pages) {
    const rootPagePath = path.join(ROOT_DIR, page);
    const tplPagePath = path.join(ROOT_DIR, 'templates', page);
    assert(fs.existsSync(rootPagePath), `Missing root page: ${page}`);
    assert(fs.existsSync(tplPagePath), `Missing template page: templates/${page}`);

    const html = fs.readFileSync(rootPagePath, 'utf8');
    assert(html.includes('name="viewport" content="width=device-width, initial-scale=1.0"'), `${page} missing responsive viewport meta`);
    assert(html.includes('Eggman Studios'), `${page} missing Eggman Studios branding`);
    assert(html.includes('id="app-error-boundary"'), `${page} missing global error boundary`);

    // Security assertions: prevent credential / internal path disclosure
    assert(!html.includes('YOUR_EMAILJS_PUBLIC_KEY'), `${page} must not expose placeholder API keys`);
    assert(!html.includes('orders@eggmanstudios.org'), `${page} must not expose internal order email addresses`);
    assert(!html.includes('server/frontend'), `${page} must not expose internal server filesystem paths`);

    // Check all class names in HTML against style.css
    const classMatches = html.matchAll(/class="([^"]+)"/g);
    for (const match of classMatches) {
      const classes = match[1].split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        if (jsHookClasses.has(cls)) continue;
        const cssSelector = '.' + cls.replace(/([.:/[\]])/g, '\\$1');
        if (!styleCss.includes(cssSelector)) {
          missingClasses.add(cls);
        }
      }
    }
  }

  if (missingClasses.size > 0) {
    console.warn('[WARN] Classes not found in style.css:', [...missingClasses]);
    assert(false, `Found uncompiled CSS classes: ${[...missingClasses].join(', ')}`);
  }

  console.log('[OK] All 9 HTML pages (including dedicated cart.html), security assertions, and CSS utility classes verified.');
}

verifyAll();
