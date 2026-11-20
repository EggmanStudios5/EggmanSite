import { escapeHtml } from '../lib/escape.js';
import { Navbar } from './Navbar.js';
import { Footer } from './Footer.js';

export function Layout({
  siteCopy,
  projects,
  title,
  description,
  activePage = 'home',
  favicon,
  bodyContent = ''
}) {
  const brand = siteCopy.brand;
  const resolvedTitle = title || `${brand.name} — ${brand.subtitle}`;
  const resolvedDesc = description || siteCopy.hero.subtitle;
  const resolvedFavicon = favicon || brand.logo;

  const navbar = Navbar({ siteCopy, projects, activePage });
  const footer = Footer({ siteCopy, projects });

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(resolvedTitle)}</title>
    <meta name="description" content="${escapeHtml(resolvedDesc)}">
    <link rel="icon" type="image/svg+xml" href="assets/img/${escapeHtml(resolvedFavicon)}">
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="bg-slate-50 text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
    ${navbar}

    <div id="app-error-boundary" role="alert" aria-live="polite"
        class="hidden bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium py-2.5 px-4">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <span id="app-error-boundary-msg">${escapeHtml(siteCopy.errorBoundary.defaultMessage)}</span>
            <button type="button" id="app-error-boundary-close"
                class="text-amber-800 hover:text-slate-900 font-bold cursor-pointer">
                ${escapeHtml(siteCopy.errorBoundary.dismissLabel)}
            </button>
        </div>
    </div>

    <main id="main-content">
${bodyContent}
    </main>

    ${footer}

    <script src="assets/js/app.js" defer></script>
</body>

</html>`;
}
