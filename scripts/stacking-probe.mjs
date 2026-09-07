#!/usr/bin/env node
/**
 * stacking-probe.mjs — does the type actually render on TOP of the scrim?
 *
 * WHY THIS EXISTS. On 2026-09-06 the sub-page hero shipped through a plan
 * critic, a Stage 0.7 visual spec, four Razor rounds and roughly seven hundred
 * contrast measurements with the scrim painting OVER the h1 at every width
 * >= 1440, on all seven pages. `mask-image` makes `.hero-sub::after` a stacking
 * context; an unpositioned element that establishes one paints as if positioned
 * at z-index 0, so it left the background layer, joined the content's layer, and
 * won on document order because `::after` is the last child.
 *
 * EVERY GATE WAS BLIND TO IT BY CONSTRUCTION. A contrast measurement samples the
 * BACKDROP with the content block hidden -- correct for measuring a scrim, and
 * structurally incapable of seeing a scrim painted over the words. The computed
 * colour never changes: it is rgb(232,230,227) whether the type is legible or
 * unreadable. Only sampled pixels of the RENDERED GLYPHS show it.
 *
 * Jen's standing rule after the incident is that introducing a stacking context
 * requires a rendered-glyph sample. This script is that rule mechanised, so
 * compliance is a command rather than a habit.
 *
 * Origin: adapted from the Stage 2.8 behavioural evaluator's `probe-stack.mjs`,
 * including its compositing-property list. Turned from a prober that PRINTS into
 * a gate that FAILS, and given the negative controls below.
 *
 * IT PROVES ITSELF ON EVERY RUN. A check that can only ever pass is worse than
 * no check, because it reads like coverage -- this relay shipped one of those
 * too (an undrawn-preload check whose own `imagesrcset` satisfied it). So before
 * trusting any pass, this script reintroduces the defect two ways and REQUIRES
 * both to fail: `display: block` on the section (which stops the children being
 * grid items, so the z-indexes stop applying) and removing the content's
 * z-index. If a control does not fail, the probe is broken and the run exits
 * non-zero regardless of what the real measurements said.
 *
 * USAGE
 *   npm run build && npm run stacking:check
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(REPO, 'dist');

/** `--ink` #e8e6e3 peaks at 232 in its red channel. Anything materially below
 *  means something is painted over the glyphs. 225 is the evaluator's bar and
 *  leaves room for antialiasing without leaving room for a scrim (~90). */
const INK_PEAK = 232;
const FLOOR = 225;

const ROUTES = ['/squamish/', '/sea-to-sky/', '/about/', '/saunas/', '/whistler/', '/vancouver/', '/north-shore/'];

/** 1439/1440 bracket the mask breakpoint, which is where B1 lived. 1600 is past
 *  it. 390 keeps the mobile composition honest. */
const WIDTHS = [[390, 844], [1439, 900], [1440, 900], [1600, 1000]];

/** Every one of these makes `::after` a stacking context. The fix is explicit
 *  z-index on all three grid items, so it must survive all of them. */
const STACKING_PROPS = [
  ['(none - control)', ''],
  ['mask-image (the original cause)', '-webkit-mask-image:linear-gradient(90deg,#000 60%,transparent 95%);mask-image:linear-gradient(90deg,#000 60%,transparent 95%);'],
  ['filter', 'filter:blur(0.2px);'],
  ['opacity 0.99', 'opacity:0.99;'],
  ['transform', 'transform:translateZ(0);'],
  ['will-change:transform', 'will-change:transform;'],
  ['mix-blend-mode', 'mix-blend-mode:multiply;'],
  ['backdrop-filter', '-webkit-backdrop-filter:saturate(1.01);backdrop-filter:saturate(1.01);'],
  ['isolation:isolate', 'isolation:isolate;'],
  ['contain:paint', 'contain:paint;'],
  ['perspective', 'perspective:100px;'],
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.mp4': 'video/mp4', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve() {
  return new Promise((res) => {
    const s = createServer((q, r) => {
      let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
      if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!existsSync(f)) { r.statusCode = 404; r.end('nf'); return; }
      r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
      r.end(readFileSync(f));
    });
    s.listen(0, '127.0.0.1', () => res({ s, base: `http://127.0.0.1:${s.address().port}` }));
  });
}

/** Peak red channel inside an element's own box, from a real screenshot. */
async function peakIn(page, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return null;
    return { x: Math.max(0, Math.floor(b.x)), y: Math.max(0, Math.floor(b.y)),
             width: Math.ceil(b.width), height: Math.ceil(b.height) };
  }, selector);
  if (!box) return null;
  const png = PNG.sync.read(await page.screenshot({ clip: box }));
  let peak = 0;
  for (let i = 0; i < png.data.length; i += 4) if (png.data[i] > peak) peak = png.data[i];
  return peak;
}

const failures = [];
const lines = [];

async function main() {
  if (!existsSync(DIST)) { console.error('dist/ is absent. Run `npm run build` first.'); process.exit(1); }
  const { s, base } = await serve();
  const browser = await chromium.launch();

  // ---- A. the real measurement, every hero page at every bracket width
  let measured = 0;
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(200);
      for (const [sel, what] of [['.hero-sub h1', 'h1'], ['.hero-sub p', 'subtitle']]) {
        const peak = await peakIn(page, sel);
        if (peak === null) { failures.push(`${route} @${w}: ${what} not found or has no box`); continue; }
        measured++;
        if (peak < FLOOR) {
          failures.push(`${route} @${w}: ${what} peak ${peak} < ${FLOOR} `
            + `(ink peaks at ${INK_PEAK}); something is painted over the glyphs`);
        }
      }
    }
    await page.close(); await ctx.close();
  }
  lines.push(`A. ${measured} glyph samples across ${ROUTES.length} pages x ${WIDTHS.length} widths`);

  // ---- B. the fix must be STRUCTURAL: survive anything that makes ::after a
  //         stacking context, not just the one property that exposed it.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, css] of STACKING_PROPS) {
    await page.goto(base + '/vancouver/', { waitUntil: 'networkidle', timeout: 60000 });
    if (css) await page.addStyleTag({ content: `.hero-sub::after{${css}}` });
    await page.waitForTimeout(200);
    const peak = await peakIn(page, '.hero-sub h1');
    if (peak < FLOOR) failures.push(`stacking context via ${name}: h1 peak ${peak} < ${FLOOR}`);
  }
  lines.push(`B. ${STACKING_PROPS.length} stacking-context injections survived`);

  // ---- C. NEGATIVE CONTROLS. These MUST fail, or this script proves nothing.
  const controls = [
    ['display:block on .hero-sub (children stop being grid items, z-index stops applying)',
     '.hero-sub{display:block}'],
    ['content z-index removed (the pre-fix stacking order)',
     '.hero-sub__content{z-index:auto}.hero-sub::after{-webkit-mask-image:linear-gradient(90deg,#000 60%,transparent 95%);mask-image:linear-gradient(90deg,#000 60%,transparent 95%)}'],
  ];
  for (const [name, css] of controls) {
    await page.goto(base + '/vancouver/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(200);
    const peak = await peakIn(page, '.hero-sub h1');
    if (peak === null || peak >= FLOOR) {
      failures.push(`NEGATIVE CONTROL DID NOT FAIL -- ${name}: peak ${peak}. `
        + `This probe cannot detect the defect it exists for, so its passes mean nothing.`);
    } else {
      lines.push(`C. control fails as required (${name.split(' (')[0]}): peak ${peak}`);
    }
  }
  await page.close(); await ctx.close();

  await browser.close(); s.close();

  for (const l of lines) console.log(`  ${l}`);
  if (failures.length) {
    console.error(`\nFAIL — stacking-probe (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`\nPASS — the type renders on top of the scrim everywhere, and the probe proved it can tell.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
