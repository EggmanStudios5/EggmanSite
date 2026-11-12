/**
 * LandingView — Eggman Studios Home Page (`index.html`)
 * Focused strictly on catching people's attention, explaining what Eggman Studios is about,
 * and guiding visitors to the dedicated Projects page (`projects.html`).
 */

import { Layout } from '../components/Layout.js';
import { Hero } from '../components/Hero.js';
import { About } from '../components/About.js';
import { SITE_COPY } from '../data/projects.js';

export function renderLandingView({ assetPrefix = '.' } = {}) {
  const hero = Hero();
  const about = About();

  return Layout({
    title: `${SITE_COPY.brand.name} — ${SITE_COPY.brand.subtitle}`,
    description:
      'Eggman Studios builds open, repairable tools and community networks without cloud subscriptions.',
    activePage: 'home',
    assetPrefix,
    bodyContent: `
${hero}
${about}`
  });
}
