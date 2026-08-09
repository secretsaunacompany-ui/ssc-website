#!/usr/bin/env node
// Audit: verify every img src, srcset candidate, CSS url(), and video src in dist/ resolves to a file.

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

const htmlFiles = walkDir(DIST).filter(f => f.endsWith('.html'));
const jsFiles = walkDir(DIST).filter(f => f.endsWith('.js'));

for (const file of htmlFiles) {
  const content = readFileSync(file, 'utf8');

  // img src
  for (const m of content.matchAll(/src="([^"]+\.(?:webp|jpg|jpeg|png|mp4|svg))"/gi)) {
    checkRef(m[1], file);
  }

  // srcset candidates
  for (const m of content.matchAll(/srcset="([^"]+)"/gi)) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      checkRef(url, file);
    }
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

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} broken reference(s):`);
  for (const e of errors) {
    console.error(`  ${e.ref}  (from ${e.source})`);
  }
  process.exit(1);
} else {
  console.log(`PASS: all image/video references in dist/ resolve to existing files.`);
}
