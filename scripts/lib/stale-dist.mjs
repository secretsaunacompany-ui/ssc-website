/**
 * stale-dist.mjs — refuse to certify a build that predates its sources.
 *
 * fonts, rhythm and csp-hash measure dist/ as it sits on disk; the other
 * suites build hermetically. Until 2026-08-06 those three trusted operator
 * discipline: edit styles.css, forget the rebuild, and they certified last
 * week's build as current — "a comment is not a mechanism", per
 * prices-version's own header. This is the mechanism: any watched source
 * newer than dist/index.html is a loud refusal naming the file and the fix.
 *
 * The watched set includes booking-ops.html/js and .eleventy.js explicitly —
 * csp-hash certifies booking-ops.html's inline script hash, and the Eleventy
 * config shapes every built page (critic round 1: as first specced the guard
 * failed open for exactly the file the D1 fix edits).
 */
import fs from 'node:fs';
import path from 'node:path';

const WATCHED_FILES = ['styles.css', '.eleventy.js', 'booking-ops.html', 'booking-ops.js', 'netlify.toml'];
const WATCHED_DIRS = ['js', 'src'];

function newestUnder(dir) {
  let newest = { path: null, mtimeMs: 0 };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = newestUnder(p);
      if (sub.mtimeMs > newest.mtimeMs) newest = sub;
    } else if (entry.isFile()) {
      const m = fs.statSync(p).mtimeMs;
      if (m > newest.mtimeMs) newest = { path: p, mtimeMs: m };
    }
  }
  return newest;
}

export function assertDistFresh(repoRoot) {
  const stampFile = path.join(repoRoot, 'dist', 'index.html');
  if (!fs.existsSync(stampFile)) {
    throw new Error('dist/ is missing — run `npm run build` first.');
  }
  const distMs = fs.statSync(stampFile).mtimeMs;

  let newest = { path: null, mtimeMs: 0 };
  for (const f of WATCHED_FILES) {
    const p = path.join(repoRoot, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.statSync(p).mtimeMs;
    if (m > newest.mtimeMs) newest = { path: p, mtimeMs: m };
  }
  for (const d of WATCHED_DIRS) {
    const p = path.join(repoRoot, d);
    if (!fs.existsSync(p)) continue;
    const sub = newestUnder(p);
    if (sub.mtimeMs > newest.mtimeMs) newest = sub;
  }

  if (newest.mtimeMs > distMs) {
    throw new Error(
      `dist/ is STALE: ${path.relative(repoRoot, newest.path)} is newer than dist/index.html. `
      + 'This suite measures the built output as it sits on disk — a stale build certifies '
      + 'last week\'s site as current. Run `npm run build` and re-run.');
  }
}
