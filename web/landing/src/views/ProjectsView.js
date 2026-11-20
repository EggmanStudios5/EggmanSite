import { Layout } from '../components/Layout.js';
import { SolutionsHub } from '../components/SolutionsHub.js';

export function renderProjectsView({ siteCopy, projects }) {
  const hubCopy = siteCopy.solutionsHub;
  const solutionsHub = SolutionsHub({
    projects,
    groups: siteCopy.projectGroups,
    hubCopy
  });

  return Layout({
    siteCopy,
    projects,
    title: `${hubCopy.pageTitle} — ${siteCopy.brand.name}`,
    description: hubCopy.pageDescription,
    activePage: 'projects',
    bodyContent: solutionsHub
  });
}
