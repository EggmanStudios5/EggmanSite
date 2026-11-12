/**
 * Shared Document Layout Component — Eggman Studios (`src/components/Layout.js`)
 * Driven dynamically by `SITE_COPY` with zero hardcoded strings.
 */

import { SITE_COPY } from '../data/projects.js';
import { Navbar } from './Navbar.js';
import { Footer } from './Footer.js';

export function Layout({
  title = `${SITE_COPY.brand.name} — ${SITE_COPY.brand.subtitle}`,
  description = SITE_COPY.hero.subtitle,
  activePage = 'home',
  assetPrefix = '.',
  favicon = SITE_COPY.brand.logo,
  headScripts = '',
  bodyContent = ''
} = {}) {
  const navbar = Navbar({ activePage, assetPrefix });
  const footer = Footer({ assetPrefix });

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="icon" type="image/svg+xml" href="${assetPrefix}/src/img/${favicon}">
    <link rel="stylesheet" href="${assetPrefix}/src/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .font-mono-code {
            font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        }
    </style>${headScripts ? `\n    ${headScripts}` : ''}
</head>

<body class="bg-slate-50 text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
    ${navbar}

    <!-- Global User-Friendly Error Boundary -->
    <div id="app-error-boundary" role="alert" aria-live="polite"
        class="hidden bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium py-2.5 px-4">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <span id="app-error-boundary-msg">${SITE_COPY.errorBoundary.defaultMessage}</span>
            <button type="button" id="app-error-boundary-close"
                class="text-amber-800 hover:text-slate-900 font-bold cursor-pointer">
                ${SITE_COPY.errorBoundary.dismissLabel}
            </button>
        </div>
    </div>

    <main id="main-content">
${bodyContent}
    </main>

    ${footer}

    <script src="${assetPrefix}/src/app.js" defer></script>
</body>

</html>`;
}
