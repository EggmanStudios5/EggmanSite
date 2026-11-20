import { Layout } from '../components/Layout.js';
import { Hero } from '../components/Hero.js';
import { About } from '../components/About.js';
import { TutorialsGrid } from '../components/TutorialsGrid.js';

export function renderLandingView({ siteCopy, projects, tutorials }) {
  const hero = Hero({ heroCopy: siteCopy.hero });
  const about = About({ copy: siteCopy.about });
  const tutorialsSection = tutorials ? TutorialsGrid({ tutorialsConfig: tutorials }) : '';

  return Layout({
    siteCopy,
    projects,
    title: `${siteCopy.brand.name} — ${siteCopy.brand.subtitle}`,
    description: siteCopy.hero.subtitle,
    activePage: 'home',
    bodyContent: `\n${hero}\n${about}\n${tutorialsSection}`
  });
}
