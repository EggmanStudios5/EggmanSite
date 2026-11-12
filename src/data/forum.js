/**
 * ============================================================================
 * EGGMAN STUDIOS — COMMUNITY FORUM CONFIGURATION (`forum.html`)
 * ============================================================================
 * No hardcoded fake threads or fake user accounts. Threads, replies, upvotes,
 * and solved states are created dynamically by users and persisted via `ForumStore`.
 */

export const FORUM_CATEGORIES = [
  { id: 'all', label: 'All Discussions' },
  { id: 'macro-python', label: 'Macro Pads & Python' },
  { id: 'weather-stations', label: 'Mateo Weather Stations' },
  { id: 'rfid-access', label: 'RFID Door Locks' },
  { id: 'show-and-tell', label: 'Show & Tell / Builds' }
];

export const FORUM_STATUS_FILTERS = [
  {
    id: 'open-only',
    label: 'Needs Answer / Open',
    className:
      'forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer'
  },
  {
    id: 'solved-only',
    label: '✓ Solved Only',
    className:
      'forum-filter-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer'
  }
];

export const FORUM_CONFIG = {
  pageTitle: 'Community Forum & Issue Board',
  pageDescription:
    'Interactive community troubleshooting board for Eggman Studios hardware: post questions, share replies, and mark verified solutions.',
  header: {
    eyebrow: 'Interactive Troubleshooting & Builders Board',
    title: 'Solve hardware problems together.',
    subtitle:
      'Start a new troubleshooting topic or reply to open discussions below. You can upvote helpful answers and mark threads as solved once fixed.'
  },
  stats: [
    {
      id: 'forum-stat-total',
      label: 'Total Topics',
      boxClass: 'bg-slate-50 border-slate-200',
      labelClass: 'text-slate-500',
      valueClass: 'text-slate-900'
    },
    {
      id: 'forum-stat-open',
      label: 'Open Problems',
      boxClass: 'bg-amber-50/60 border-amber-200/80',
      labelClass: 'text-slate-600',
      valueClass: 'text-amber-800'
    },
    {
      id: 'forum-stat-solved',
      label: 'Solved Fixes',
      boxClass: 'bg-emerald-50 border-emerald-200',
      labelClass: 'text-emerald-800',
      valueClass: 'text-emerald-700'
    }
  ],
  searchPlaceholder: 'Filter topics by keyword...',
  emptyState: {
    title: 'No discussion threads yet',
    description:
      'Use the "Start a New Topic" form to post the first hardware question, troubleshooting log, or project build.'
  },
  newTopicForm: {
    eyebrow: 'Ask the Community',
    title: 'Start a New Topic',
    subtitle:
      'Describe your setup issue or share a custom build. Anyone can reply or mark a working solution right on the card.',
    authorLabel: 'Your Name / Handle',
    authorPlaceholder: 'Enter display name',
    categoryLabel: 'Category',
    titleLabel: 'Problem / Topic Title',
    titlePlaceholder: 'Brief summary of your question or build',
    bodyLabel: 'Details / Logs',
    bodyPlaceholder: 'Describe your setup, operating system, and what you observed...',
    submitLabel: 'Post Topic to Board'
  },
  helpCard: {
    eyebrow: 'Documentation & Setup',
    title: 'Looking for step-by-step wiring or installation instructions?',
    description:
      'Browse our OS-specific Python setup instructions and 4-step hardware assembly guides on the Tutorials page.',
    ctaLabel: 'Open Setup & Assembly Guides →',
    ctaHref: 'tutorials.html'
  }
};

export const FORUM_THREADS = [];
