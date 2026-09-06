#!/usr/bin/env node
// Audit: verify every img src, srcset candidate, preload href/imagesrcset, CSS
// url(), and video src in dist/ resolves to a file.
//
// The `<link rel="preload" as="image">` href was UNCHECKED until 2026-09-06.
// That gap did not matter while the seam hardcoded `-1920w.webp` and fired on
// zero pages. The sub-page hero relay is the change that makes it matter: it
// puts a preload on seven pages, three of whose stems have no 1920w rung. A
// preload that 404s costs highest-priority bytes and shows no error anywhere --
// exactly the class of silent failure an audit exists to catch.

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const DIST = resolve('dist');
const errors = [];

function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

function checkRef(ref, sourceFile) {
  if (!ref || ref.startsWith('data:') || ref.startsWith('http://') || ref.startsWith('https://')) return;
  // Strip query string
  const clean = ref.split('?')[0];
  const target = join(DIST, clean);
  if (!existsSync(target)) {
    errors.push({ ref: clean, source: sourceFile.replace(DIST + '/', '') });
  }
}

// Vacuity guards. An audit that silently stops matching anything passes forever;
// these counters make "found nothing to check" a failure rather than a PASS.
let srcsetCandidates = 0;
let preloadHrefs = 0;

const htmlFiles = walkDir(DIST).filter(f => f.endsWith('.html'));
const jsFiles = walkDir(DIST).filter(f => f.endsWith('.js'));

for (const file of htmlFiles) {
  const content = readFileSync(file, 'utf8');

  // img src
  for (const m of content.matchAll(/src="([^"]+\.(?:webp|jpg|jpeg|png|mp4|svg))"/gi)) {
    checkRef(m[1], file);
  }

  // srcset candidates. The pattern also matches `imagesrcset="..."` on a
  // preload link, which is deliberate -- the candidates are the same shape and
  // must resolve for the same reason.
  for (const m of content.matchAll(/srcset="([^"]+)"/gi)) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      checkRef(url, file);
      srcsetCandidates++;
    }
  }

  // Preload hrefs. Matched on the whole <link> element rather than on a bare
  // href="" so a stylesheet or canonical link cannot be mistaken for an image.
  for (const m of content.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/gi)) {
    const tag = m[0];
    if (!/\bas="image"/i.test(tag)) continue;
    const href = tag.match(/\bhref="([^"]+)"/i);
    if (!href) {
      errors.push({ ref: '(preload as="image" with no href)', source: file.replace(DIST + '/', '') });
      continue;
    }
    checkRef(href[1], file);
    preloadHrefs++;
  }

  // CSS url() in style attributes
  for (const m of content.matchAll(/url\(['"]?([^'")]+\.(?:webp|jpg|jpeg|png))['"]?\)/gi)) {
    checkRef(m[1], file);
  }

  // video source src
  for (const m of content.matchAll(/<source[^>]+src="([^"]+\.mp4)"/gi)) {
    checkRef(m[1], file);
  }
}

for (const file of jsFiles) {
  const content = readFileSync(file, 'utf8');
  // Paths in JS strings
  for (const m of content.matchAll(/['"](\/(img|video)\/[^'"]+\.(webp|jpg|jpeg|png|mp4))['"]/gi)) {
    checkRef(m[1], file);
  }
}

if (srcsetCandidates === 0) {
  errors.push({ ref: '(no srcset candidate was found in any built page)', source: 'vacuity guard' });
}
if (preloadHrefs === 0) {
  errors.push({ ref: '(no <link rel="preload" as="image"> was found in any built page)', source: 'vacuity guard' });
}

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} broken reference(s):`);
  for (const e of errors) {
    console.error(`  ${e.ref}  (from ${e.source})`);
  }
  process.exit(1);
} else {
  console.log(`PASS: all image/video references in dist/ resolve to existing files `
    + `(${srcsetCandidates} srcset candidates, ${preloadHrefs} image preloads).`);
}
