/**
 * Repository Audit Utility (`scripts/scan-repos.mjs`)
 * Verifies local repository structure without overwriting curated `src/data/projects.js`
 * or exposing local filesystem paths in public bundles.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS } from '../src/data/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const REPOS_DIR = path.join(ROOT_DIR, 'Github Repos');

function verifyLocalRepos() {
  if (!fs.existsSync(REPOS_DIR)) {
    console.log('[scan-repos] Local Github Repos directory not present; skipping check.');
    return;
  }

  for (const project of PROJECTS) {
    const repoPath = path.join(REPOS_DIR, project.folderName);
    const exists = fs.existsSync(repoPath);
    console.log(`[scan-repos] ${project.title}: ${exists ? 'OK' : 'MISSING'}`);
  }
}

verifyLocalRepos();
