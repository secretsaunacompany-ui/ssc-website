/**
 * scratch.mjs — the scratch-site machinery five suites used to carry as
 * private copies (quote-funnel, events, package-claim, prices-version,
 * build-cache), consolidated 2026-08-06.
 *
 * The copies' "mirrors the sibling suites" comments were aspirational: the
 * mirror had drifted in both directions. build-ref's exclude list carried
 * '.netlify' and '.cache' but not '.probe'; every suite copy carried '.probe'
 * but not '.netlify' or '.cache'; neither side named '.dom-integrity' or
 * '.rhythm'. And build-ref.mjs documents a real secrets edge for ITS list —
 * "a new secrets file not named .env* gets copied into a world-readable temp
 * directory" — a risk that existed in five undocumented copies, each of which
 * would have needed the same future fix. One list, one fix, derived from the
 * build-ref source of truth.
 *
 * The per-suite mutate() helpers are deliberately NOT here: their
 * single-occurrence-anchor error messages are suite-specific and load-bearing.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKING_COPY_EXCLUDE } from './build-ref.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Union of build-ref's exclude list (the source of truth) and the harness
 * work dirs the suites had learned about separately. Everything here is a
 * top-level directory (or .env) that must never enter a scratch copy.
 */
export const SCRATCH_SKIP = new Set([
  ...WORKING_COPY_EXCLUDE, '.probe', '.dom-integrity', '.rhythm',
]);

export const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.txt': 'text/plain',
};

/**
 * A disposable copy of the repo for in-place mutation, node_modules
 * symlinked (large, and resolving to the same installed Eleventy is the
 * point). `prefix` names the suite in the tmpdir path so a crashed run's
 * leftovers are attributable.
 */
export function scratchSite(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  fs.cpSync(REPO_ROOT, dir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base.startsWith('.env')) return false; // never copy secrets into scratch
      return !SCRATCH_SKIP.has(base) || path.dirname(src) !== REPO_ROOT;
    },
  });
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}

/**
 * Tiny static server for a scratch dist/. Refuses path traversal like
 * lib/server.mjs does — harmless on 127.0.0.1 scratch serving, but the old
 * per-suite copies lacked it for no reason beyond drift.
 */
export async function serve(root) {
  const resolvedRoot = path.resolve(root);
  const server = http.createServer((req, res) => {
    let file = path.resolve(path.join(resolvedRoot, decodeURIComponent(req.url.split('?')[0])));
    if (file !== resolvedRoot && !file.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { /* 404 below */ }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
