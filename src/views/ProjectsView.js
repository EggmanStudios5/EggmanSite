/**
 * ProjectsView — Dedicated Projects Directory Page (`projects.html`)
 * Driven dynamically by `PROJECTS` and `SITE_COPY.solutionsHub`.
 */

import { Layout } from '../components/Layout.js';
import { SolutionsHub } from '../components/SolutionsHub.js';
import { PROJECTS, SITE_COPY } from '../data/projects.js';

export function renderProjectsView({
  projects = PROJECTS,
  hubCopy = SITE_COPY.solutionsHub,
  assetPrefix = '.'
} = {}) {
  const solutionsHub = SolutionsHub({ projects, hubCopy });

  return Layout({
    title: `${hubCopy.pageTitle} — ${SITE_COPY.brand.name}`,
    description: hubCopy.pageDescription,
    activePage: 'projects',
    assetPrefix,
    bodyContent: solutionsHub
  });
}
