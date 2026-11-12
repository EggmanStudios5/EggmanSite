/**
 * ProjectsView — Dedicated Projects Directory Page (`projects.html`)
 * Separates our work into:
 *   1. Devices & One-Time Solutions (focused tools built for a single job)
 *   2. Big "Global" & Community Projects (broader shared networks)
 */

import { Layout } from '../components/Layout.js';
import { SolutionsHub } from '../components/SolutionsHub.js';
import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function renderProjectsView({ projects = PROJECTS, assetPrefix = '.' } = {}) {
  const solutionsHub = SolutionsHub({ projects });

  return Layout({
    title: `Projects Directory — ${SITE_COPY.brand.name}`,
    description:
      'Browse Eggman Studios projects separated into focused one-time hardware solutions and broader community networks.',
    activePage: 'projects',
    assetPrefix,
    bodyContent: solutionsHub
  });
}
