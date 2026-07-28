/**
 * Build the site at a given git ref into an isolated output directory.
 *
 * Two modes:
 *   ref === 'WORKING'  -> build the current working tree (uncommitted edits
 *                         included), in place, then snapshot dist/.
 *   any other ref      -> `git worktree add --detach` a clean checkout of that
 *                         ref into a temp dir, build there, snapshot dist/.
 *
 * The build command is always `rm -rf dist && <eleventy>`. The clean is
 * load-bearing per netlify.toml: Eleventy does not remove stale output, so a
 * dirty dist/ would leak deleted pages into a capture set and produce phantom
 * diffs. Do not remove it.
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const REPO_ROOT = path.resolve(new URL('../..', import.meta.url).pathname);

function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function runBuild(dir) {
  // Explicit local bin, not `npx`: npx will happily reach the network and
  // resolve a different Eleventy than the one this repo pins.
  const bin = path.join(REPO_ROOT, 'node_modules', '.bin', 'eleventy');
  if (!fs.existsSync(bin)) {
    throw new Error('Eleventy binary not found. Run `npm install` first.');
  }
  execSync(`rm -rf dist && "${bin}"`, { cwd: dir, stdio: 'pipe' });
}

/**
 * @param {string} ref  git ref, or the literal 'WORKING'
 * @param {string} outDir  where the built dist/ should end up
 * @returns {{ ref: string, sha: string, outDir: string }}
 */
export function buildRef(ref, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outDir), { recursive: true });

  if (ref === 'WORKING') {
    runBuild(REPO_ROOT);
    fs.cpSync(path.join(REPO_ROOT, 'dist'), outDir, { recursive: true });
    let sha = 'working-tree';
    try {
      sha = `${git(['rev-parse', '--short', 'HEAD'])}+dirty`;
    } catch { /* detached / no HEAD is fine */ }
    return { ref, sha, outDir };
  }

  const sha = git(['rev-parse', '--short', ref]);
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-visual-diff-'));
  try {
    git(['worktree', 'add', '--detach', '--quiet', wt, ref]);
    // Symlink the installed dependencies rather than reinstalling per ref:
    // the harness compares *rendered output*, and node_modules is not part of
    // what changes between a baseline and a stylesheet branch.
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(wt, 'node_modules'), 'dir');
    runBuild(wt);
    fs.cpSync(path.join(wt, 'dist'), outDir, { recursive: true });
  } finally {
    try { git(['worktree', 'remove', '--force', wt]); } catch { /* best effort */ }
    fs.rmSync(wt, { recursive: true, force: true });
  }

  return { ref, sha, outDir };
}

/**
 * Enumerate every HTML page a build produced, as request paths.
 * Derived from the built output, never a hardcoded list, so new pages are
 * picked up automatically and deleted pages disappear.
 */
export function enumeratePages(distDir) {
  const routes = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const rel = path.relative(distDir, full).split(path.sep).join('/');
      routes.push(rel.endsWith('index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`);
    }
  };
  walk(distDir);
  return routes.sort();
}

/** Stable filesystem-safe name for a route. */
export function routeSlug(route) {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return s === '' ? 'home' : s;
}
