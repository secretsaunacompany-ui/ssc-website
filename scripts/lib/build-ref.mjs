/**
 * Build the site at a given git ref into an isolated output directory.
 *
 * Two modes:
 *   ref === 'WORKING'  -> copy the current working tree (uncommitted edits
 *                         included) into a temp dir, build THERE, snapshot dist/.
 *   any other ref      -> `git worktree add --detach` a clean checkout of that
 *                         ref into a temp dir, build there, snapshot dist/.
 *
 * WORKING deliberately does NOT build in place. The build command starts with
 * `rm -rf dist`, and running that against the live working tree means a
 * measurement tool destroying the developer's own build output as a side
 * effect. Neither mode now writes anything inside the repo.
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
 * Directory names at the repo root that are never copied into a WORKING build.
 * Build artefacts, VCS metadata, the harness's own scratch space, and secrets.
 *
 * RISK, stated rather than discovered later: this is a DENYLIST, so it fails
 * open. Anything new at the repo root is copied by default. Two consequences —
 * a new build-artefact directory silently inflates every WORKING build until
 * someone adds it here, and a new secrets file that is not named `.env*` gets
 * copied into a world-readable temp directory. (The `.env` entry plus the
 * `startsWith('.env')` guard in materializeWorkingTree cover today's secrets;
 * they do not cover a future `credentials.json`.) An allowlist would fail
 * closed but would need updating for every legitimate new top-level input,
 * which is the more frequent event by far. Kept as a denylist deliberately;
 * revisit if a non-`.env` secret ever lands at the repo root.
 */
export const WORKING_COPY_EXCLUDE = new Set([
  'node_modules', '.git', 'dist', '_site', '.visual-diff', '.netlify',
  '.cache', 'tmp', '.env',
]);

/**
 * Copy the live working tree (including uncommitted edits) into `dest`, minus
 * build artefacts and secrets, and symlink node_modules the same way the
 * git-worktree path does.
 */
function materializeWorkingTree(dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (WORKING_COPY_EXCLUDE.has(entry.name)) continue;
    if (entry.name.startsWith('.env')) continue;
    fs.cpSync(path.join(REPO_ROOT, entry.name), path.join(dest, entry.name), {
      recursive: true,
      dereference: false,
      verbatimSymlinks: true,
    });
  }
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dest, 'node_modules'), 'dir');
}

/**
 * Resolve a ref to a short sha, so two refs naming the same commit can be
 * detected before an expensive self-comparison is run.
 *
 * WORKING resolves to HEAD's sha, with a `+dirty` suffix ONLY when the working
 * tree actually differs from HEAD. The suffix used to be unconditional, which
 * made `baselineSha === candidateSha` unreachable for WORKING and so disarmed
 * the self-comparison guard entirely: on a clean tree the default invocation
 * (`-b main -c WORKING` with main checked out) built the same commit twice,
 * measured nothing, and reported PASS. Suffixing only when dirty lets the
 * equality guard in visual-diff.mjs fire on exactly that case.
 *
 * `git status --porcelain` is the right dirtiness test rather than a
 * tracked-files-only diff: materializeWorkingTree copies untracked files into
 * the build too, so an untracked file genuinely makes WORKING a different build
 * from HEAD.
 *
 * `cwd` exists so the fixtures can exercise both the clean and the dirty case
 * against a real scratch repository. The live repo is dirty whenever anyone is
 * working in it, so the clean-tree branch — the one that was broken — is
 * otherwise untestable. Production callers always use the default.
 *
 * @returns {string} short sha, `<sha>+dirty`, or 'working-tree' outside a repo.
 */
export function resolveRef(ref, cwd = REPO_ROOT) {
  if (ref === 'WORKING') {
    try {
      const head = git(['rev-parse', '--short', 'HEAD'], cwd);
      const dirty = git(['status', '--porcelain'], cwd) !== '';
      return dirty ? `${head}+dirty` : head;
    } catch { return 'working-tree'; }
  }
  try {
    return git(['rev-parse', '--short', ref], cwd);
  } catch (err) {
    throw new Error(`Not a git ref: ${ref}`);
  }
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
    const sha = resolveRef('WORKING');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-visual-diff-working-'));
    try {
      materializeWorkingTree(tmp);
      runBuild(tmp);
      fs.cpSync(path.join(tmp, 'dist'), outDir, { recursive: true });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    return { ref, sha, outDir };
  }

  const sha = resolveRef(ref);
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
