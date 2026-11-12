/**
 * ============================================================================
 * EGGMAN STUDIOS — CENTRAL SITE, NAVIGATION & PROJECT CONFIGURATION
 * ============================================================================
 * Single source of truth for all site copy, navigation links, project groups,
 * and individual project detail pages. Views and components render dynamically
 * from these structures with zero hardcoded copy or links.
 */

export const SITE_COPY = {
  brand: {
    name: 'Eggman Studios',
    subtitle: 'Open Hardware & Software',
    logo: 'eggmanlogo.svg',
    githubProfile: 'https://github.com/FilipVastl005',
    licenseNote: 'Released under permissive Open-Source Licenses (MIT & CERN-OHL)'
  },
  errorBoundary: {
    defaultMessage:
      'We encountered a temporary issue completing that action. Please refresh the page or try again in a moment.',
    dismissLabel: 'Dismiss'
  },
  navigation: {
    links: [
      { id: 'about', label: 'Our Story', href: 'index.html#about', homeHref: '#about' },
      { id: 'projects', label: 'Projects', href: 'projects.html' },
      { id: 'shop', label: 'Shop', href: 'shop.html' },
      { id: 'tutorials', label: 'Tutorials', href: 'tutorials.html' },
      { id: 'forum', label: 'Forum', href: 'forum.html' }
    ],
    cartLink: {
      id: 'cart',
      label: 'Cart',
      mobileLabel: 'Cart & Checkout',
      href: 'cart.html',
      ariaLabel: 'View Shopping Cart and Checkout'
    },
    primaryCta: {
      label: 'Browse Projects',
      href: 'projects.html'
    }
  },
  footer: {
    blurb: 'Open Hardware & Software · Practical tools and open community hardware.',
    exploreHeading: 'Explore',
    reposHeading: 'Source Repositories',
    tagline: 'Built for people who like hardware they can actually own.',
    links: [
      { label: 'Home & Story', href: 'index.html' },
      { label: 'All Projects Directory', href: 'projects.html' },
      { label: 'Hardware & Parts Shop', href: 'shop.html' },
      { label: 'Shopping Cart & Checkout', href: 'cart.html' },
      { label: 'Setup & Assembly Tutorials', href: 'tutorials.html' },
      { label: 'Community Forum', href: 'forum.html' }
    ]
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
  solutionsHub: {
    eyebrow: 'Projects & Solutions',
    title: 'From single-purpose devices to community networks.',
    description:
      'Some problems only need a small circuit board on your desk or a classroom door. Others take a connected network of stations working together. Here is what we currently maintain.',
    pageTitle: 'Projects Directory',
    pageDescription:
      'Browse Eggman Studios projects separated into focused one-time hardware solutions and broader community networks.'
  }
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
    favicon: 'mateologo.svg',
    logo: 'mateologo.svg',
    summary:
      'An open-source, solar-powered weather network designed to bring reliable local forecasts to areas that commercial stations miss.',
    whatItSolves:
      'Official weather stations cost thousands of dollars, while cheap backyard sensors give false readings whenever the sun hits them. Mateo pairs sub-$100 solar hardware with automatic neighbor cross-checking to filter out bad data.',
    highlights: [
      'Three station setups tailored for city balconies, rural farms, and off-grid villages',
      'Automatic quality checks spot and ignore sudden temperature spikes',
      'Solar-powered design that runs for months through cloudy weather'
    ],
    detailPage: {
      theme: 'atmospheric',
      kicker: 'Project 03 · Community Weather & Design Baseline',
      headline: 'Local weather data where big forecasts miss.',
      paragraphs: [
        'Official weather stations cost thousands of dollars and are mostly placed near airports and big cities—leaving farms, valleys, and small towns guessing when frost or heavy rain will hit.',
        'Mateo is an open-source, solar-powered weather station project built to work anywhere, from an apartment balcony to a remote village with zero cell service.'
      ],
      ctas: [
        { label: 'Shop Pre-Built Stations & Kits →', href: 'shop.html', style: 'teal' },
        { label: 'How to Mount & Connect →', href: 'tutorials.html#setup-weather-station', style: 'outline' }
      ],
      githubCtaLabel: 'Open Repository on GitHub ↗',
      topologiesSection: {
        eyebrow: 'Built for Real Places',
        title: 'Three station setups, depending on where you live.',
        subtitle:
          'Not everyone has strong Wi-Fi or wall power outside. Mateo uses the same core weather sensors across three different setups.',
        items: [
          {
            badge: 'Setup 01 · City & Balcony',
            badgeClass: 'text-blue-800 bg-blue-50',
            title: 'Home Wi-Fi Station',
            subtitle: 'For apartments, rooftops, and city neighborhoods',
            description:
              'Connects directly to your home Wi-Fi. To keep the small solar battery charged through dark winters, the chip stays asleep 99.9% of the time—waking up for just a fraction of a second every few minutes to take a reading and go right back to sleep.'
          },
          {
            badge: 'Setup 02 · Countryside & Farms',
            badgeClass: 'text-indigo-800 bg-indigo-50',
            title: 'Long-Range Garden Mast + Indoor Hub',
            subtitle: 'When the sensor is too far for Wi-Fi',
            description:
              'Places the solar weather sensor out in a field or orchard up to 2 km away, beaming readings over long-range radio (LoRa) to a small indoor display box in your house. Even if your home internet goes out, you can view live weather on your local network and everything saves to an SD card.'
          },
          {
            badge: 'Setup 03 · Off-Grid Villages',
            badgeClass: 'text-emerald-800 bg-emerald-50',
            title: 'Solar Community Kiosk',
            subtitle: 'Zero internet or cell towers required',
            description:
              'Multiple solar sensors relay readings from hill to hill into a central village kiosk. The kiosk broadcasts a free local Wi-Fi page (http://community.weather) so anyone nearby can check frost warnings and rainfall on their phone without needing mobile data.'
          }
        ]
      },
      stepsSection: {
        eyebrow: 'Keeping Data Honest',
        title: 'Why backyard weather networks usually get messy—and how we fix it.',
        subtitle:
          'If someone mounts a cheap temperature sensor on a sunny black roof, it might read 40°C on a mild spring day. Mateo runs every reading through three automatic sanity checks before showing it on the public map.',
        steps: [
          {
            number: '1',
            title: 'Ignore impossible numbers',
            description: 'If a loose wire reports 75°C or negative humidity, it gets thrown out immediately.'
          },
          {
            number: '2',
            title: 'Catch sudden sun spikes',
            description:
              "Real air temperature doesn't jump 5°C in 45 seconds. Sudden spikes from direct sun glare are flagged and filtered out."
          },
          {
            number: '3',
            title: 'Compare with nearby stations',
            description:
              'Each station is compared with its neighbors within 25 km. Reliable stations earn a higher trust score; drifting sensors are quietly hidden until fixed.'
          }
        ]
      },
      tutorialBanner: {
        eyebrow: 'Mounting & Setup',
        title: 'Setting up a Pre-Built or DIY Mateo Station?',
        description:
          'Read our step-by-step guide on turning on the internal battery switch, connecting to Wi-Fi, and aiming the solar panel.',
        ctaLabel: 'Open Station Setup Guide →',
        ctaHref: 'tutorials.html#setup-weather-station'
      }
    }
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
    favicon: 'eggmanlogo.svg',
    summary:
      'A self-hosted badge access system built on two separate ESP microcontrollers and a lightweight local web page—with zero recurring cloud fees.',
    whatItSolves:
      'Many all-in-one door readers put the lock relay right behind the exterior plastic cover where wires can be shorted. Splitting the reader (outside) from the lock switch (inside) keeps the room secure while running entirely on the building LAN.',
    highlights: [
      'Two-part hardware keeps the lock switch safely inside the room',
      'Runs on your local network and keeps working if the internet drops',
      'Simple browser page for adding student cards and viewing attendance'
    ],
    detailPage: {
      theme: 'split',
      kicker: 'Project 01 · Classroom & Workshop Security',
      headline: 'A smarter way to unlock the student lab.',
      paragraphs: [
        "Schools and makerspaces shouldn't have to pay monthly cloud fees just to let students tap into a workshop. And they definitely shouldn't use cheap all-in-one door readers where anyone can pop off the plastic cover and hotwire the lock.",
        'RFID Student Access solves both problems by splitting the hardware across two small boards—one outside the door, one safely inside—paired with a simple web page running on the school’s own local network.'
      ],
      ctas: [
        { label: 'Get the Starter Kit in the Shop →', href: 'shop.html', style: 'primary' },
        { label: 'How to Wire & Install →', href: 'tutorials.html#setup-rfid-door', style: 'secondary' }
      ],
      githubCtaLabel: 'View on GitHub ↗',
      architectureCard: {
        eyebrow: 'Why Two Boards Are Safer Than One',
        nodes: [
          {
            badge: 'Hallway Side (Outside)',
            badgeClass: 'text-amber-700 bg-amber-50',
            borderClass: 'border-slate-200',
            title: '1. The Reader Board',
            description:
              'Sits next to the door handle. All it can do is read a student badge ID and ask the inside board for permission.',
            footerNote: 'No lock wires attached here',
            footerClass: 'text-slate-500'
          },
          {
            badge: 'Locked Room (Inside)',
            badgeClass: 'text-teal-800 bg-teal-50',
            borderClass: 'border-teal-200',
            title: '2. The Lock Controller',
            description:
              'Safely mounted inside the room. Checks with the local dashboard and flips the electric door strike for 3 seconds.',
            footerNote: 'Protected behind the locked door',
            footerClass: 'text-teal-700'
          }
        ],
        bottomBar: {
          title: '3. The Local Web Dashboard',
          description:
            'Teachers or lab leads can add cards and check attendance from any browser on the building Wi-Fi.',
          tag: 'Local LAN Only'
        }
      },
      stepsSection: {
        eyebrow: 'How It Works',
        title: 'What happens when a student taps their card',
        steps: [
          {
            number: '1',
            title: 'Outside reader scans the card',
            description:
              'The hallway reader picks up the student badge number and sends it through the thin cable in the wall to the inside box.'
          },
          {
            number: '2',
            title: 'Inside controller checks the list',
            description:
              'The inside board checks if that card is approved for the room—even if the school Wi-Fi is down, it keeps a backup list in its own memory.'
          },
          {
            number: '3',
            title: 'Door unlocks for 3 seconds',
            description:
              'If approved, the inside relay clicks open the electric door latch for 3 seconds, beeps the green light outside, and logs the visit.'
          }
        ]
      },
      tutorialBanner: {
        eyebrow: 'Step-by-Step Installation',
        title: 'Installing this on a classroom or workshop door?',
        description: 'Read our simple 4-step wiring and setup guide on the Tutorials page.',
        ctaLabel: 'Open RFID Setup Guide →',
        ctaHref: 'tutorials.html#setup-rfid-door'
      }
    }
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
    favicon: 'eggmanlogo.svg',
    summary:
      'A compact 3×3 USB keypad that saves your custom shortcuts directly to onboard memory so you never have to leave configuration software running.',
    whatItSolves:
      'Most programmable keypads require bloated background apps and forget your shortcuts as soon as you plug them into another computer. Macro writes your 9 key combos straight to the microcontroller chip.',
    highlights: [
      'Program your keys once with a small Python utility, then close it',
      'Shortcuts stay on the hardware chip across Windows, Mac, and Linux',
      'Works immediately as a standard driverless USB keyboard'
    ],
    detailPage: {
      theme: 'dark',
      kicker: 'Project 02 · Everyday Desk Hardware',
      headline: 'Nine keys. Zero background bloatware.',
      paragraphs: [
        'Why do commercial macro pads make you install a 500MB app and log into a cloud account just to assign Copy and Paste? Worse yet, the moment you plug that pad into a different laptop, it forgets everything.',
        "Macro saves your shortcuts directly onto the pad's own onboard memory. Set your keys once with our tiny Python app, close it forever, and plug the pad into any Windows, Mac, or Linux machine."
      ],
      ctas: [
        { label: 'Shop Macro Pads & Parts →', href: 'shop.html', style: 'teal' },
        { label: 'How to Install & Set Up →', href: 'tutorials.html#python-os-setup', style: 'dark-outline' }
      ],
      githubCtaLabel: 'GitHub Repo ↗',
      summaryCard: {
        eyebrow: 'At a Glance',
        title: 'Plug-and-play USB or Bluetooth',
        bullets: [
          {
            lead: 'Onboard Memory:',
            text: 'Remembers your shortcuts even when unplugged and moved to a new computer.'
          },
          {
            lead: 'Multiple Layouts in the Shop:',
            text: 'From compact 4-key strips and 3×3 pads to 16-key grids and rotary dial models for audio/video editing.'
          },
          {
            lead: 'Easy to Build or Repair:',
            text: 'Standard mechanical switches and a 6-wire switch matrix you can solder yourself.'
          }
        ]
      },
      stepsSection: {
        eyebrow: 'How It Works',
        title: 'Set it up in under two minutes.',
        subtitle:
          'Whether you built your own pad or have a finished USB or Bluetooth unit in hand, setting your keys takes three simple steps.',
        steps: [
          {
            number: '1',
            title: 'Plug it in via USB',
            description:
              'Your computer immediately recognizes the pad as a standard USB keyboard—no custom drivers or kernel modules needed.'
          },
          {
            number: '2',
            title: 'Run the small Python app',
            description:
              'Open macro_pad_config.py, pick your USB port, click any button on screen, and press the key combo you want.'
          },
          {
            number: '3',
            title: 'Save & close the app',
            description:
              "Click Save to Device. Your 9 shortcuts are written to the chip's internal EEPROM memory and stay there even when unplugged."
          }
        ]
      },
      tutorialBanner: {
        eyebrow: 'Step-by-Step Guides',
        title: 'Ready to set up Python or solder a DIY kit?',
        description:
          'Head over to the Tutorials page for Windows, Linux, and macOS install steps and the 4-step DIY assembly guide.',
        ctaLabel: 'Open Setup Tutorials →',
        ctaHref: 'tutorials.html'
      }
    }
  }
];

export function getProjectBySlug(slug) {
  return PROJECTS.find((p) => p.slug === slug || p.id === slug) || null;
}

export function getProjectsByGroup(groupId) {
  return PROJECTS.filter((p) => p.group === groupId);
}

/**
 * Dynamically computes the previous and next projects in the `PROJECTS` list
 * so views never hardcode links to specific project filenames.
 */
export function getAdjacentProjects(slug, projects = PROJECTS) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return { prevProject: null, nextProject: null };
  }
  const index = projects.findIndex((p) => p.slug === slug || p.id === slug);
  if (index === -1) {
    return { prevProject: projects[0], nextProject: projects[projects.length - 1] };
  }
  const prevProject = projects[(index - 1 + projects.length) % projects.length];
  const nextProject = projects[(index + 1) % projects.length];
  return { prevProject, nextProject };
}
