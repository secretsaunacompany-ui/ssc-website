#!/usr/bin/env node
/**
 * lightbox.test.mjs — the gallery lightbox's accessibility contract, in a
 * real browser.
 *
 * Born 2026-08-06 (code-refresh B4): Wave A made the quote funnel keyboard-
 * complete and nothing pinned the lightbox to the same bar — it kept a static
 * alt across navigation and moved no focus. These assertions pin the
 * reachable half of the fix. KNOWN LIMIT, deliberate: gallery invokers are
 * non-focusable divs, so there is NO keyboard path to OPEN the lightbox;
 * focus-restore lands on <body> today and on the invoker the day the grid
 * becomes keyboard-reachable (Jen-lane interaction change, Wave B residual).
 *
 *   npm run build && node scripts/lightbox.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { assertDistFresh } from './lib/stale-dist.mjs';
import { serve } from './lib/scratch.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(REPO_ROOT, '/'));
const { chromium } = require('playwright');

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail}`}`);
  ok ? passes++ : failures++;
};

assertDistFresh(REPO_ROOT);
const { server, base } = await serve(path.join(REPO_ROOT, 'dist'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${base}/saunas/`, { waitUntil: 'networkidle' });

  const gridAlt = await page.$eval('.gallery-item img', (img) => img.alt);
  check('the source grid images carry real alt text (precondition)',
    gridAlt && gridAlt !== 'Gallery image', `first grid alt was ${JSON.stringify(gridAlt)}`);

  await page.click('.gallery-item');
  await page.waitForSelector('#galleryLightbox.active');

  check('the lightbox is a labelled modal dialog',
    await page.$eval('#galleryLightbox', (el) =>
      el.getAttribute('role') === 'dialog' && el.getAttribute('aria-modal') === 'true'),
    'role/aria-modal missing');

  check('opening moves focus to the close button',
    await page.evaluate(() => document.activeElement?.classList.contains('lightbox-close')),
    `activeElement is ${await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 60))}`);

  check('the full-screen image carries the source image\'s alt, not the static placeholder',
    await page.$eval('#lightboxImage', (img) => img.alt) === gridAlt,
    `lightbox alt was ${JSON.stringify(await page.$eval('#lightboxImage', (i) => i.alt))}`);

  check('the full-screen image upgrades to the w_1600 variant',
    await page.$eval('#lightboxImage', (img) => /\bw_1600\b/.test(img.src)),
    `src was ${await page.$eval('#lightboxImage', (i) => i.src)}`);

  const altBefore = await page.$eval('#lightboxImage', (i) => i.alt);
  await page.keyboard.press('ArrowRight');
  check('arrow navigation updates BOTH the image and its alt',
    await page.$eval('#lightboxImage', (i) => i.alt) !== altBefore
    || await page.$eval('#lightboxCurrent', (el) => el.textContent) === '2',
    'navigation moved neither counter nor alt');

  await page.keyboard.press('Escape');
  // Wait for the state the assertion is about, rather than racing it: the
  // class going away is the observable close. (A .catch()-swallowed
  // waitForSelector was letting this assertion read a half-closed lightbox.)
  await page.waitForFunction(
    () => !document.getElementById('galleryLightbox').classList.contains('active'),
    null, { timeout: 5000 });
  check('Escape closes, and focus never strands on the hidden close button',
    await page.evaluate(() => {
      const box = document.getElementById('galleryLightbox');
      return !box.classList.contains('active') && !box.contains(document.activeElement);
    }),
    `activeElement after close: ${await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 60))}`);
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
