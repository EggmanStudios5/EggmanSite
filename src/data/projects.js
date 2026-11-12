/**
 * ============================================================================
 * EGGMAN STUDIOS — CENTRAL SITE & PROJECT CONFIGURATION
 * ============================================================================
 * Edit this file to update site text, or to add, edit, or remove projects.
 * Run `npm run build` after making changes to recompile all HTML pages.
 *
 * Project Groups (`group` field):
 *   - 'network'    -> Larger, connected platforms & community-scale projects
 *   - 'standalone' -> Single-purpose devices, local fixes & everyday tools
 */

export const SITE_COPY = {
  brand: {
    name: 'Eggman Studios',
    subtitle: 'Open Hardware & Software',
    githubProfile: 'https://github.com/FilipVastl005',
    licenseNote: 'Released under permissive Open-Source Licenses (MIT & CERN-OHL)'
  },
  hero: {
    kicker: 'Eggman Studios',
    title: 'Practical open-source tools, built to stay yours.',
    subtitle:
      'We are a small studio designing open hardware and straightforward software. We like tools that do their job quietly without accounts, subscriptions, or unnecessary complexity—and we share all of our schematics and code so anyone can build or adapt them.',
    primaryCta: { label: 'Explore Our Projects', href: 'projects.html' },
    secondaryCta: { label: 'How We Work', href: '#about' }
  },
  about: {
    eyebrow: 'About the Studio',
    title: 'Simple ideas, shared openly.',
    paragraphs: [
      'Most of what we build starts because we needed a tool ourselves and could only find over-engineered commercial options tied to cloud accounts or heavy background software.',
      'Whether we are prototyping a quick weekend utility for our own desks or working on a larger community network, we try to keep the design as simple as possible. We use common, affordable parts and document our work so you can fix it, change it, or learn from it.'
    ],
    principles: [
      {
        title: 'Runs on its own',
        description:
          'Tools should keep working even when the internet is down. We design for local networks and onboard memory first.'
      },
      {
        title: 'Nothing extra in the background',
        description:
          'We avoid heavy installers and always-on desktop apps when a tiny script or built-in browser page can do the job.'
      },
      {
        title: 'Easy to take apart',
        description:
          'We stick to standard microcontrollers and permissive open-source licenses so you are never locked out of your own gear.'
      }
    ]
  },
  faq: [
    {
      question: 'Can I use or modify these designs for my own project?',
      answer:
        'Yes. Everything in our repositories is open source. You are welcome to download the code, wire up your own hardware, or adapt our layouts for your school, workshop, or personal use.'
    },
    {
      question: 'How are your projects organized?',
      answer:
        'We split our work into two groups: larger, ongoing community platforms that connect multiple nodes together, and smaller standalone devices built to solve a single everyday problem.'
    },
    {
      question: 'How can I report a bug or contribute?',
      answer:
        'Each project page links directly to its GitHub repository where you can browse the source files, open an issue, or submit a pull request.'
    }
  ]
};

export const PROJECT_GROUPS = [
  {
    id: 'network',
    label: 'Connected Platforms & Community Projects',
    shortLabel: 'Platform Projects',
    description:
      'Larger, multi-node systems designed to gather data and serve whole neighborhoods, farms, or off-grid communities.'
  },
  {
    id: 'standalone',
    label: 'Standalone Devices & One-Time Solutions',
    shortLabel: 'Devices & Utilities',
    description:
      'Focused, self-contained hardware and desktop tools you set up once to solve a specific problem in a room, workshop, or at your desk.'
  }
];

export const PROJECTS = [
  {
    id: 'mateo-web-projekt',
    slug: 'mateo',
    group: 'network',
    folderName: 'WEB-Projekt',
    title: 'Mateo Weather Network',
    tagline: 'Community weather stations for cities, farms, and off-grid valleys.',
    kindLabel: 'Community Platform',
    githubUrl: 'https://github.com/FilipVastl005/WEB-Projekt',
    overviewPage: 'mateo.html',
    summary:
      'An open-source, solar-powered weather network designed to bring reliable local forecasts to areas that commercial stations miss.',
    whatItSolves:
      'Official weather stations cost thousands of dollars, while cheap backyard sensors give false readings whenever the sun hits them. Mateo pairs sub-$100 solar hardware with automatic neighbor cross-checking to filter out bad data.',
    highlights: [
      'Three station setups tailored for city balconies, rural farms, and off-grid villages',
      'Automatic quality checks spot and ignore sudden temperature spikes',
      'Solar-powered design that runs for months through cloudy weather'
    ]
  },
  {
    id: 'rfid-student-access-system',
    slug: 'rfid',
    group: 'standalone',
    folderName: 'RFID-student-acces-system',
    title: 'RFID Student Access',
    tagline: 'Local door access for classrooms and student workshops.',
    kindLabel: 'One-Time Facility Solution',
    githubUrl: 'https://github.com/FilipVastl005/RFID-student-acces-system',
    overviewPage: 'rfid.html',
    summary:
      'A self-hosted badge access system built on two separate ESP microcontrollers and a lightweight local web page—with zero recurring cloud fees.',
    whatItSolves:
      'Many all-in-one door readers put the lock relay right behind the exterior plastic cover where wires can be shorted. Splitting the reader (outside) from the lock switch (inside) keeps the room secure while running entirely on the building LAN.',
    highlights: [
      'Two-part hardware keeps the lock switch safely inside the room',
      'Runs on your local network and keeps working if the internet drops',
      'Simple browser page for adding student cards and viewing attendance'
    ]
  },
  {
    id: 'macro-pad-utility',
    slug: 'macro',
    group: 'standalone',
    folderName: 'Macro',
    title: 'Macro 3×3 Pad',
    tagline: 'A 9-key shortcut pad that stores your bindings on the chip.',
    kindLabel: 'Standalone Desk Device',
    githubUrl: 'https://github.com/FilipVastl005/Macro',
    overviewPage: 'macro.html',
    summary:
      'A compact 3×3 USB keypad that saves your custom shortcuts directly to onboard memory so you never have to leave configuration software running.',
    whatItSolves:
      'Most programmable keypads require bloated background apps and forget your shortcuts as soon as you plug them into another computer. Macro writes your 9 key combos straight to the microcontroller chip.',
    highlights: [
      'Program your keys once with a small Python utility, then close it',
      'Shortcuts stay on the hardware chip across Windows, Mac, and Linux',
      'Works immediately as a standard driverless USB keyboard'
    ]
  }
];

export function getProjectBySlug(slug) {
  return PROJECTS.find((p) => p.slug === slug || p.id === slug) || null;
}

export function getProjectsByGroup(groupId) {
  return PROJECTS.filter((p) => p.group === groupId);
}
