/**
 * Modular SolutionsHub Component — Eggman Studios
 * Automatically separates projects into their configured groups
 * (e.g. Connected Platforms vs. Standalone Devices & One-Time Solutions)
 * so projects can be added, edited, or removed in `src/data/projects.js`.
 */

import { PROJECT_GROUPS, PROJECTS } from '../data/projects.js';
import { SolutionCard } from './SolutionCard.js';

export function SolutionsHub({ projects = PROJECTS, groups = PROJECT_GROUPS } = {}) {
  const sectionsHtml = groups
    .map((group) => {
      const groupProjects = projects.filter((p) => p.group === group.id);
      if (groupProjects.length === 0) return '';

      const isNetworkGroup = group.id === 'network';
      const cardsHtml = groupProjects
        .map((project) => SolutionCard(project, { variant: isNetworkGroup ? 'featured' : 'standard' }))
        .join('\n');

      const gridClass = isNetworkGroup
        ? 'space-y-6'
        : 'grid grid-cols-1 md:grid-cols-2 gap-8';

      return `
                <!-- Project Group: ${group.label} -->
                <div class="space-y-6">
                    <div class="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div>
                            <h3 class="text-xl font-bold text-slate-900">${group.label}</h3>
                            <p class="text-sm text-slate-600 mt-1">${group.description}</p>
                        </div>
                        <span class="text-xs font-medium text-slate-400 shrink-0">
                            ${groupProjects.length} ${groupProjects.length === 1 ? 'project' : 'projects'}
                        </span>
                    </div>

                    <div class="${gridClass}">
                        ${cardsHtml}
                    </div>
                </div>`;
    })
    .filter(Boolean)
    .join('\n\n                <div class="pt-8"></div>\n');

  return `
        <!-- Solutions / Projects Hub Section (Modular SolutionsHub Component) -->
        <section id="solutions" data-component="SolutionsHub" class="py-20 bg-slate-50 border-b border-slate-200/80">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <!-- Section Header -->
                <div class="max-w-2xl">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-2">Projects &amp; Solutions</span>
                    <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                        From single-purpose devices to community networks.
                    </h2>
                    <p class="text-base text-slate-600 leading-relaxed">
                        Some problems only need a small circuit board on your desk or a classroom door. Others take a connected network of stations working together. Here is what we currently maintain.
                    </p>
                </div>

                ${sectionsHtml}
            </div>
        </section>`;
}
