#!/usr/bin/env node
/**
 * rhythm.test.mjs -- the computed-spacing certificate for WP-1b.
 *
 *   npm run build && npm run rhythm:test
 *
 * MEASURES BUILT dist/, NOT styles.css. Rebuild between any stylesheet edit and
 * a re-run -- a mutation applied to styles.css without a rebuild never reaches
 * the page this suite measures, and a silent no-op reports as "the suite did
 * not notice", which reads as a coverage gap that isn't there. (A reviewer lost
 * three probes to exactly this before noticing. The sibling batteries throw on
 * unapplicable mutations; this suite mutates nothing itself, so the discipline
 * is on the person editing.)
 *
 * WP-1b deleted six spacing utilities, consolidated three percentage gutters
 * into one viewport-relative token, and relaxed the line-length cap from 60/65ch
 * to 70ch. The DOM-integrity check certifies that those class names left the
 * markup; it is structurally incapable of saying whether anything still HOLDS
 * THE PAGE TOGETHER afterwards, because a deleted class and a deleted class
 * whose job nobody picked up look identical in a token stream.
 *
 * That gap is the reason this file exists. Three claims, none of them visible to
 * any other gate in the repo:
 *
 *   1. THE DELETIONS WERE SAFE. `.grid-3--mt-2/-3/-4`, `.heading--mb-2` and
 *      `.section--mt-8` supplied per-instance vertical space. If the replacement
 *      system does not supply it, the pages do not fail -- they quietly collapse
 *      to zero, which no test in this repo would notice and which reads as a
 *      layout bug months later. Asserted from COMPUTED margins.
 *   2. --gutter IS ACTUALLY ONE VALUE. The consolidation's own premise (21 R1)
 *      is that `0 5%` resolved against three different parents and produced
 *      three gutters that looked like one rule. A token that most elements use
 *      and some do not is the same bug wearing the fix's name, so every
 *      deviation is pinned by measurement and a NEW one fails.
 *   3. THE LINE LENGTH IS 70ch. `.measure-wide` replaced four `text--*`
 *      utilities capped at 60ch and 65ch. That is a real change to how the site
 *      reads and NO gate currently sees it -- the pixel harness reports it as
 *      "content moved", the DOM check as "a class was renamed".
 *
 * Everything is measured from COMPUTED style in a real browser at both widths,
 * against the real built stylesheet, for the reason fonts.test.mjs gives: a
 * token's declared value and the value that reaches the element are different
 * claims, and only the second one is the site.
 *
 * Group R runs against `dist/`, so it needs a build first -- and it SAYS so and
 * exits rather than passing vacuously (the flaw NOTE-2 recorded against
 * fonts.test.mjs). Group M is the mutation battery: each mutation patches the
 * BUILT stylesheet in a throwaway copy under .rhythm/ (gitignored, never the
 * working tree), re-serves it, and must move the probe it is aimed at.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './lib/server.mjs';
import { installRouting } from './lib/capture.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(REPO_ROOT, 'dist');
const WORK = path.join(REPO_ROOT, '.rhythm');
// The same asset cache the pixel and DOM harnesses use. Without it every page
// load fetches Cloudinary for real, which makes a SPACING suite depend on the
// network -- slow, and flaky for a reason that has nothing to do with spacing.
const CACHE_DIR = path.join(REPO_ROOT, '.visual-diff', 'asset-cache');

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}

/** Computed values are sub-pixel; 0.5px is below anything a visitor can see. */
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

// ---------------------------------------------------------------- the probes
//
// Evaluated IN THE PAGE, so each must be self-contained. They return raw
// measurements and make no judgements -- the assertions live below, where the
// documented values they are compared against are visible in the same screen.

/**
 * The heading rhythm system (doc 11 §5).
 *
 * Measured against SYNTHETIC nodes injected into the real page, and that is
 * deliberate rather than lazy: `* + h2` fires on exactly ONE element in the
 * entire built site (measured), because almost every heading is the first child
 * of its container. Asserting only on live instances would leave four of the
 * five documented rules with no coverage at all, and would quietly lose the
 * coverage it does have the moment a template changes. The probe nodes are
 * styled by the real shipped stylesheet in a real browser, so what is measured
 * is the delivered rule -- the same thing a heading would get if a template put
 * one there tomorrow. Live instances are ALSO asserted, where they exist.
 */
function probeHeadingSystem() {
  const host = document.createElement('div');
  host.className = 'container';
  host.style.position = 'absolute';
  host.style.visibility = 'hidden';
  document.querySelector('main').appendChild(host);
  const ratio = (html, sel) => {
    host.innerHTML = html;
    const el = host.querySelector(sel);
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    return {
      top: +(parseFloat(cs.marginTop) / fs).toFixed(4),
      bottom: +(parseFloat(cs.marginBottom) / fs).toFixed(4),
      fontSize: fs,
    };
  };
  const out = {
    h2AfterP: ratio('<p>x</p><h2>y</h2>', 'h2'),
    h3AfterP: ratio('<p>x</p><h3>y</h3>', 'h3'),
    h4AfterP: ratio('<p>x</p><h4>y</h4>', 'h4'),
    h2AfterEyebrow: ratio('<p class="eyebrow">x</p><h2>y</h2>', 'h2'),
    h1First: ratio('<h1>y</h1>', 'h1'),
  };
  host.remove();

  // Live instances of the same rules, wherever the templates actually produce
  // one. Zero is a legitimate answer on most pages and is reported, not failed.
  out.live = [];
  for (const el of document.querySelectorAll('main h1, main h2, main h3, main h4')) {
    const prev = el.previousElementSibling;
    if (!prev) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    out.live.push({
      tag: el.tagName,
      eyebrow: prev.classList.contains('eyebrow'),
      top: +(parseFloat(cs.marginTop) / fs).toFixed(4),
    });
  }
  return out;
}

/** Every element that used to carry a deleted rhythm utility. */
function probeDeletedUtilitySites() {
  const grids = [...document.querySelectorAll('.grid-3')].map((el) => {
    const prev = el.previousElementSibling;
    return {
      marginTop: parseFloat(getComputedStyle(el).marginTop),
      // The gap a visitor actually sees, which is the claim that matters: a
      // margin can be non-zero and still be collapsed away by a neighbour.
      gap: prev
        ? Math.round(el.getBoundingClientRect().top - prev.getBoundingClientRect().bottom)
        : null,
      classes: el.className,
    };
  });
  const DELETED = ['grid-3--mt-2', 'grid-3--mt-3', 'grid-3--mt-4',
    'heading--mb-2', 'section--mt-8', 'section--warm-glow'];
  const survivors = DELETED.filter((c) => document.querySelector(`.${c}`) !== null);
  return { grids, survivors };
}

/** --gutter, and every element in the container/section family. */
function probeGutter() {
  const probe = document.createElement('div');
  const declared = getComputedStyle(document.documentElement)
    .getPropertyValue('--gutter').trim();
  probe.style.cssText = `position:absolute;visibility:hidden;width:${declared}`;
  document.body.appendChild(probe);
  // getBoundingClientRect, not offsetWidth: offsetWidth rounds to whole pixels
  // and 86.4 would read as 86, turning a 0.4px tolerance question into a 0.4px
  // measurement error.
  const gutterPx = probe.getBoundingClientRect().width;
  probe.remove();

  const rows = [];
  for (const el of document.querySelectorAll('nav, section, .container, .wide-container')) {
    const cs = getComputedStyle(el);
    rows.push({
      tag: el.tagName,
      classes: el.className || '',
      left: parseFloat(cs.paddingLeft),
      right: parseFloat(cs.paddingRight),
    });
  }
  return { declared, gutterPx, rows };
}

/**
 * The section tier system, on the BLOCK axis (B2 / F-1).
 *
 * Until B2 this could not be measured, because there was nothing to measure:
 * `.container`'s `padding` shorthand wrote the block axis to 0 and outranked
 * `section`'s tier rule, so 44 of the site's sections rendered with no vertical
 * rhythm at all (doc 21 §6.2a amendment). R2 above measures the INLINE axis and
 * is structurally blind to that -- a section with a perfect gutter and zero top
 * padding passes every assertion in this file up to here.
 *
 * Resolution is read from a probe element rather than from the declared string:
 * `clamp(3.5rem, min(14vh, 18vw), 10rem)` is a value only the viewport can
 * compute, and the whole point of the min() arm is that it resolves DIFFERENTLY
 * at 390 than the vh-only version did.
 *
 * The tight and open tiers are read here but NOT asserted against consumers:
 * no element carries `.section--tight` or `.section--open` yet (tier classes are
 * B5's markup batch). Asserting a tier with zero consumers is a fixture proving
 * itself. Those assertions land in B5, where the consumers do.
 */
function probeSectionTier() {
  const resolve = (token) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;padding-block:var(${token})`;
    document.body.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).paddingTop);
    probe.remove();
    return px;
  };
  // A tier class or an explicit padding rule means the element is not claiming
  // the standard tier, so it is not evidence for or against it.
  const NOT_STANDARD = ['section--tight', 'section--open', 'section--bleed',
    'section--no-padding', 'page-hero'];
  const rows = [];
  for (const el of document.querySelectorAll('section.container, section.wide-container')) {
    const classes = el.className || '';
    if (NOT_STANDARD.some((c) => classes.split(/\s+/).includes(c))) continue;
    const cs = getComputedStyle(el);
    rows.push({
      classes,
      top: parseFloat(cs.paddingTop),
      bottom: parseFloat(cs.paddingBottom),
    });
  }
  return {
    standard: resolve('--section-pad'),
    tight: resolve('--section-pad-tight'),
    open: resolve('--section-pad-open'),
    rows,
  };
}

/** `.measure-wide`, in the only unit that means anything: rendered pixels. */
/**
 * The nav band, and whether the hero actually clears it.
 *
 * The nav is `position: fixed`: it paints over the top of every page while
 * occupying no space in flow. The hero centres its content in a box starting at
 * y=0, so without a reserved band it centres into a strip the nav covers, and
 * how far the h1 intrudes is decided by how many lines it happens to wrap to --
 * each extra line lifts the centred block by HALF a line-height. That is how the
 * h1 ended up behind the nav at 360-430.
 *
 * Three things are read, and the FIRST LINE's glyph box is used rather than the
 * h1's element box, because a element box that starts above the nav bottom can
 * still have its visible text below it (half-leading), and the question is what
 * a reader sees.
 */
function probeHeroClearance() {
  const nav = document.querySelector('nav');
  const hero = document.querySelector('.hero');
  const h1 = document.querySelector('.hero h1');
  if (!nav || !hero || !h1) return null;
  const navRect = nav.getBoundingClientRect();
  const rootCS = getComputedStyle(document.documentElement);
  const px = (v) => parseFloat(v) || 0;
  const range = document.createRange();
  range.selectNodeContents(h1);
  const lines = [...range.getClientRects()].filter((r) => r.height > 1);
  return {
    navHeight: +navRect.height.toFixed(2),
    navBottom: +navRect.bottom.toFixed(2),
    heroPadTop: +px(getComputedStyle(hero).paddingTop).toFixed(2),
    // The inputs --nav-band is derived from, read as USED VALUES off the
    // elements rather than as custom-property token text. A custom property
    // resolves to its token stream, so `--spacing-sm` reads back as the string
    // "1rem" and parses to 1, not 16 -- reading the token here would have
    // compared a real height against nonsense. The nav's own computed padding is
    // the same declaration after the browser has resolved it.
    logoSize: (() => {
      const img = nav.querySelector('.logo img');
      return img ? +img.getBoundingClientRect().height.toFixed(2)
        : +px(rootCS.getPropertyValue('--logo-size')).toFixed(2);
    })(),
    navPadTop: +px(getComputedStyle(nav).paddingTop).toFixed(2),
    navPadBottom: +px(getComputedStyle(nav).paddingBottom).toFixed(2),
    navBorderBottom: +px(getComputedStyle(nav).borderBottomWidth).toFixed(2),
    h1Lines: lines.length,
    firstLineTop: lines.length ? +lines[0].top.toFixed(2) : null,
    glyphClearance: lines.length ? +(lines[0].top - navRect.bottom).toFixed(2) : null,
  };
}

/**
 * Resolve --nav-band directly, independent of anything that consumes it.
 *
 * A custom property computes to its token stream, so `getPropertyValue` hands
 * back the literal text `calc(var(--logo-size) + 2 * var(--spacing-sm) + 1px)`.
 * The only way to learn what it RESOLVES to is to make the browser resolve it,
 * so a throwaway element is given `height: var(--nav-band)` and measured.
 */
function probeNavBandToken() {
  const nav = document.querySelector('nav');
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;visibility:hidden;width:1px;height:var(--nav-band)';
  document.body.appendChild(el);
  const resolved = +el.getBoundingClientRect().height.toFixed(2);
  el.remove();
  return {
    resolved,
    navHeight: nav ? +nav.getBoundingClientRect().height.toFixed(2) : null,
  };
}

function probeMeasure() {
  const decl = (n) => getComputedStyle(document.documentElement)
    .getPropertyValue(n).trim();
  const els = [...document.querySelectorAll('.measure-wide')];
  const out = { declaredWide: decl('--measure-wide'), declared: decl('--measure'), items: [] };
  for (const el of els) {
    const cs = getComputedStyle(el);
    // A `ch` is the advance width of "0" IN THIS ELEMENT'S FONT, so the probe
    // must inherit the element's font or the comparison is against a different
    // typeface than the one the cap applies to.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:70ch';
    probe.style.font = cs.font;
    el.parentNode.appendChild(probe);
    const seventyCh = probe.getBoundingClientRect().width;
    probe.style.width = '65ch';
    const sixtyFiveCh = probe.getBoundingClientRect().width;
    probe.remove();
    out.items.push({
      maxWidth: parseFloat(cs.maxWidth), seventyCh, sixtyFiveCh, tag: el.tagName,
    });
  }
  return out;
}

// ----------------------------------------------------------- documented values
//
// Every number here is a SPEC value with a citation, not an observation pasted
// back in. If a value below is wrong, the spec is wrong and this file is the
// argument for changing it.

const HEADING_SYSTEM = {                 // doc 11 §5, "Heading space system"
  h2AfterP: 2.5,
  h3AfterP: 2,
  h4AfterP: 1.75,
  h2AfterEyebrow: 0.5,
  marginBottom: 0.6,
};
const GRID_MARGIN_REM = 3;               // --spacing-xl, styles.css .grid-3
const GUTTER_PX = { 1440: 86.4, 390: 24 };   // clamp(1.5rem, 6vw, 7rem) → 21 R1
// The two surviving PERCENTAGE gutters. Pinned rather than waived: 21 R1's whole
// premise is that a percentage gutter resolves against its parent and so is not
// one value, and these two are exactly that bug, still live after WP-1b. They
// are recorded here with their measured values so the deviation is visible in a
// diff and so a THIRD one cannot appear unnoticed.
const GUTTER_DEVIATIONS = [
  { match: () => true, forClasses: ['section--no-padding'], px: () => 0,
    reason: '.section--no-padding sets `padding: 0` by intent (styles.css:2174). '
      + 'A modifier that says what it does; not a gutter deviation.' },
  { match: (r) => r.tag === 'NAV', px: (w) => 0.025 * w,
    reason: 'nav keeps `padding: var(--spacing-sm) 2.5%` (styles.css:579). '
      + 'Unmigrated: 21 R1 replaced the percentage gutters and this one survived.' },
  { match: (r) => r.classes.split(/\s+/).includes('page-hero'), px: (w) => 0.05 * w,
    reason: '.page-hero keeps `padding: 12rem 5% 6rem` (styles.css:712) — the '
      + 'literal `0 5%` pattern 21 R1 names as the bug. Unmigrated.' },
  // A THIRD entry lived here, for the mobile `section { padding:
  // var(--spacing-2xl) 5% }` override this suite found on 2026-07-31 — the
  // deviation it was written to catch. B2 deleted the override, so the pin came
  // out in the same commit: it was pinned to the RULE rather than to the number
  // the rule produced, and once the rule is gone the pin is a waiver for
  // nothing. The bare sections it used to reach now take --gutter from the
  // element rule like everything else, so they are asserted as CONFORMING here
  // rather than excused, which is a stronger claim than the pin ever made.
];
const MEASURE_WIDE_CH = 70;              // doc 11 §5 / --measure-wide

const WIDTHS = [1440, 390];

/* The hero clearance is a PHONE-WIDTH property and its worst case is 360, which
   is not one of the two capture widths, so it gets its own narrow sweep rather
   than widening WIDTHS (which would triple every other probe's runtime for no
   gain). 360 is where the h1 wraps to five lines with the real font; 430 is the
   first width that was already clear before the fix. */
const HERO_WIDTHS = [360, 390, 414, 430];

/* --nav-band is checked at a PHONE and a DESKTOP width, and the second one is
   the point. The hero only consumes the token at <=768px, so every assertion
   that reads it through the hero is blind to whether the token is still correct
   above the breakpoint -- a pasted `91px` literal would be right at every width
   the hero sweep visits and wrong everywhere else. Resolving the token directly
   at 1440 is what makes that visible (Razor W2). */
const TOKEN_WIDTHS = [390, 1440];

/* What "clear" means, as a number rather than as `> 0`. The wrap is sensitive
   to width and to whether the webfont resolved, so a headline that clears by a
   pixel is one re-wrap away from not clearing at all; and a first line whose
   glyphs begin 2px under a blurred, 72%-opaque band is not something anyone
   would call clear. 8px is the smallest gap that still reads as deliberate
   space rather than a near miss. Measured margin today is +30 to +50 at every
   target width in both font states, so this floor is a tripwire, not a
   constraint the design is pressed against. */
const MIN_CLEARANCE_PX = 8;
// Pages chosen for what they CARRY, not for tidiness: /saunas/ and /process/
// hold the grids that lost `--mt-*`, / and /about/ hold the widest spread of
// `.measure-wide` elements, /booking-ops.html is the file outside src/.
const PAGES = ['/', '/about/', '/saunas/', '/process/', '/locations/'];

// ------------------------------------------------------------------ the run

async function measureAll(browser, base) {
  const stats = {
    cacheHits: 0, cacheMisses: 0, fetchFailures: 0, blocked: 0,
    videoStubbed: 0, videoElements: 0, unknownHosts: new Set(),
    redirects: {}, brokenImages: [],
  };
  const context = await browser.newContext();
  await installRouting(context, CACHE_DIR, stats);
  const page = await context.newPage();
  const results = {};
  const hero = {};
  const token = {};
  try {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of PAGES) {
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
        results[`${route}@${width}`] = {
          heading: await page.evaluate(probeHeadingSystem),
          deleted: await page.evaluate(probeDeletedUtilitySites),
          gutter: await page.evaluate(probeGutter),
          tier: await page.evaluate(probeSectionTier),
          measure: await page.evaluate(probeMeasure),
        };
      }
    }
    for (const width of HERO_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
      // Past the held beat, so this is the SETTLED state and not a frame of the
      // arrival choreography (during the hold the nav and the hero content are
      // both translated, and they move together).
      await page.waitForTimeout(3400);
      hero[width] = await page.evaluate(probeHeroClearance);
    }
    for (const width of TOKEN_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
      token[width] = await page.evaluate(probeNavBandToken);
    }
  } finally { await page.close(); await context.close(); }

  // THE FONTS-BLOCKED PASS (Razor W1). The state that produced the -29px the
  // behavioural eval reported has had no fixture at all: every measurement above
  // is taken with the webfont resolved, and the h1 wraps to one MORE line
  // without it, which lifts the centred block by half a line-height. That state
  // is not hypothetical -- the metric-tuned 'Cormorant Garamond Fallback' is
  // `src: local('Georgia')`, and Georgia is absent on Android and most Linux, so
  // those visitors are in it permanently rather than for a swap window. It gets
  // its own page with /fonts/ aborted, in its own context so the route rule
  // cannot leak into any other measurement.
  const noFontCtx = await browser.newContext();
  await installRouting(noFontCtx, CACHE_DIR, stats);
  const noFontPage = await noFontCtx.newPage();
  await noFontPage.route('**/fonts/**', (r) => r.abort());
  const heroNoFont = {};
  try {
    for (const width of HERO_WIDTHS) {
      await noFontPage.setViewportSize({ width, height: 844 });
      await noFontPage.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
      await noFontPage.waitForTimeout(3400);
      heroNoFont[width] = await noFontPage.evaluate(probeHeroClearance);
    }
  } finally { await noFontPage.close(); await noFontCtx.close(); }

  return { ...results, __hero: hero, __heroNoFont: heroNoFont, __token: token, __stats: stats };
}

/** Result rows only — `__stats` is run metadata, not a page. */
const pages = (results) => Object.entries(results).filter(([k]) => !k.startsWith('__'));

function assertHeroClearance(hero, heroNoFont, token) {
  console.log('\nN — the nav band, and the hero clearing it');
  const widths = Object.keys(hero).map(Number).sort((a, b) => a - b);
  check('N0 the hero sweep actually measured something',
    widths.length === HERO_WIDTHS.length && widths.every((w) => hero[w]),
    `a vacuous pass is not a pass. measured ${JSON.stringify(widths)}`);

  // The token, resolved on its own at a phone AND a desktop width. Everything
  // else reads --nav-band through the hero, which only consumes it at <=768px,
  // so a literal pasted over the derivation could be right at every width the
  // hero sweep visits and wrong above the breakpoint. This is the assertion
  // that sees that (Razor W2).
  for (const w of TOKEN_WIDTHS) {
    const t = token[w];
    check(`N1 @${w} --nav-band RESOLVES to the nav's measured height`,
      t && near(t.resolved, t.navHeight, 0.6),
      `the token is derived from the logo, the nav's block padding and its rule so that it `
      + `tracks the nav at every breakpoint. Resolved ${t && t.resolved} vs nav `
      + `${t && t.navHeight}. A pasted literal is right at one breakpoint and silently short `
      + `at the other, which is exactly how a hardcoded band rots.`);
  }

  for (const w of widths) {
    const m = hero[w];
    if (!m) continue;

    // The derivation restated at the element level: the nav really is its logo,
    // its block padding and its rule, so the token has something true to track.
    const derived = m.logoSize + m.navPadTop + m.navPadBottom + m.navBorderBottom;
    check(`N1b @${w} the nav's measured height is its logo + block padding + rule`,
      near(m.navHeight, derived, 0.6),
      `logo ${m.logoSize} + padding ${m.navPadTop}/${m.navPadBottom} + rule `
      + `${m.navBorderBottom} = ${derived}, nav measured ${m.navHeight}`);

    // The reserve equals the thing it reserves. This is the assertion that
    // catches --nav-band drifting away from the nav it is named for.
    check(`N2 @${w} the hero reserves exactly the nav's band`,
      near(m.heroPadTop, m.navHeight, 0.6),
      `the hero's padding-top is the reserved band and must match the nav's height: `
      + `padding-top ${m.heroPadTop} vs nav ${m.navHeight}`);

    // The requirement itself, in the terms a reader experiences it: the first
    // line's glyphs sit below the nav, not behind it, by a margin that survives
    // a re-wrap rather than by a pixel.
    check(`N3 @${w} the h1's first line clears the nav (${m.h1Lines} lines, fonts loaded)`,
      m.glyphClearance !== null && m.glyphClearance >= MIN_CLEARANCE_PX,
      `first-line glyph top ${m.firstLineTop} vs nav bottom ${m.navBottom} = `
      + `${m.glyphClearance}px, floor ${MIN_CLEARANCE_PX}px. Below zero the headline is `
      + `painted under the fixed nav; below the floor it is one re-wrap from being there.`);

    // THE STATE THAT PRODUCED THE -29px, which had no fixture until now (W1).
    // Without the webfont the h1 takes one more line and the centred block
    // lifts by half a line-height, so this is the case the reserve is really
    // sized for -- and on Android and most Linux it is not a transient, because
    // the metric-tuned fallback resolves through `local('Georgia')`.
    const n = heroNoFont[w];
    check(`N4 @${w} it clears with the WEBFONT UNRESOLVED too (${n && n.h1Lines} lines)`,
      n && n.glyphClearance !== null && n.glyphClearance >= MIN_CLEARANCE_PX,
      `fonts-blocked first-line glyph top ${n && n.firstLineTop} vs nav bottom `
      + `${n && n.navBottom} = ${n && n.glyphClearance}px, floor ${MIN_CLEARANCE_PX}px. This is `
      + `the state the behavioural eval measured at -29px, and it is permanent for any `
      + `visitor whose device has no Georgia to back the fallback.`);
  }
}

function assertAll(results) {
  // ---- R1: the heading rhythm system that replaced the deleted utilities ----
  console.log('\nR1 — the heading space system (doc 11 §5)');
  {
    const sample = results[`/saunas/@1440`].heading;
    for (const [key, want] of Object.entries(HEADING_SYSTEM)) {
      if (key === 'marginBottom') continue;
      const got = sample[key].top;
      check(`R1 ${key} margin-block-start is ${want}em of the heading's own size`,
        near(got, want, 0.01),
        `measured ${got}em (font-size ${sample[key].fontSize}px). Em-relative margins are `
        + `the reason the rhythm scales with the fluid type for free; a px value here `
        + `means it stopped doing that.`);
    }
    check(`R1 headings carry ${HEADING_SYSTEM.marginBottom}em below`,
      near(sample.h2AfterP.bottom, HEADING_SYSTEM.marginBottom, 0.01),
      `measured ${sample.h2AfterP.bottom}em`);
    check('R1 a heading with NO preceding sibling gets no top margin',
      sample.h1First.top === 0,
      `measured ${sample.h1First.top}em — `
      + `\`* + h2\` is a sibling rule; a leading heading must not be pushed off its section`);

    // The rules hold at the narrow width too. Em-relative means this is nearly
    // free -- which is exactly why it is worth asserting rather than assuming.
    const narrow = results[`/saunas/@390`].heading;
    check('R1 the same ratios hold at 390 (em-relative, no breakpoint patching)',
      near(narrow.h2AfterP.top, HEADING_SYSTEM.h2AfterP, 0.01)
      && near(narrow.h3AfterP.top, HEADING_SYSTEM.h3AfterP, 0.01),
      `measured h2 ${narrow.h2AfterP.top}em, h3 ${narrow.h3AfterP.top}em`);
    check('R1 the ratio is identical at both widths while the PIXELS are not',
      near(narrow.h2AfterP.top, results['/saunas/@1440'].heading.h2AfterP.top, 0.01)
      && narrow.h2AfterP.fontSize < results['/saunas/@1440'].heading.h2AfterP.fontSize,
      `if the font-size did not change between widths this assertion proves nothing: `
      + `390 ${narrow.h2AfterP.fontSize}px vs 1440 `
      + `${results['/saunas/@1440'].heading.h2AfterP.fontSize}px`);

    // Live instances, across every page and width.
    const live = pages(results).flatMap(([, r]) => r.heading.live);
    const wrong = live.filter((x) => {
      const want = x.eyebrow ? HEADING_SYSTEM.h2AfterEyebrow
        : HEADING_SYSTEM[`${x.tag.toLowerCase()}AfterP`];
      return want !== undefined && !near(x.top, want, 0.01);
    });
    check(`R1 every live sibling-heading matches the system (${live.length} found)`,
      wrong.length === 0, `off-system: ${JSON.stringify(wrong)}`);
  }

  // ---- R1b: the deletions were safe ----
  console.log('\nR1b — the six deleted utilities left nothing collapsed');
  {
    const allGrids = [];
    const survivors = new Set();
    for (const [key, r] of pages(results)) {
      for (const c of r.deleted.survivors) survivors.add(c);
      for (const g of r.deleted.grids) allGrids.push({ key, ...g });
    }
    check('R1b no deleted utility class survives in the built pages',
      survivors.size === 0, `still present: ${[...survivors].join(', ')}`);
    check('R1b at least one grid was measured (a vacuous pass is not a pass)',
      allGrids.length > 0, 'no .grid-3 found on any probed page');

    const expected = GRID_MARGIN_REM * 16;
    const offSystem = allGrids.filter((g) => !near(g.marginTop, expected));
    check(`R1b every .grid-3 takes the ONE system value (${GRID_MARGIN_REM}rem = ${expected}px)`,
      offSystem.length === 0,
      `the utilities supplied 2rem/3rem/4rem per instance; after deletion the base rule `
      + `supplies one value to all of them. Off-system: ${JSON.stringify(offSystem)}`);
    const collapsed = allGrids.filter((g) => g.gap !== null && g.gap <= 0);
    check('R1b no grid collapsed to zero separation from what precedes it',
      collapsed.length === 0,
      `THE failure mode of deleting a spacing utility, and the one nothing else in this `
      + `repo would catch. Collapsed: ${JSON.stringify(collapsed)}`);
  }

  // ---- R2: --gutter is one value ----
  console.log('\nR2 — --gutter, applied (21 R1)');
  {
    for (const width of WIDTHS) {
      const r = results[`/saunas/@${width}`].gutter;
      check(`R2 --gutter resolves to ${GUTTER_PX[width]}px at ${width}`,
        near(r.gutterPx, GUTTER_PX[width]),
        `declared ${r.declared}, resolved ${r.gutterPx}px`);
    }
    const deviations = [];
    let conforming = 0;
    let pinned = 0;
    for (const [key, r] of pages(results)) {
      const width = Number(key.split('@')[1]);
      for (const row of r.gutter.rows) {
        const known = GUTTER_DEVIATIONS.find((d) => (d.forClasses
          ? d.forClasses.some((c) => row.classes.split(/\s+/).includes(c))
          : d.match(row, width)));
        if (known) {
          const want = known.px(width);
          if (!near(row.left, want, 1)) {
            deviations.push({ key, ...row, note: `pinned rule expects ${want}px` });
          }
          pinned += 1;
          continue;
        }
        if (near(row.left, r.gutter.gutterPx) && near(row.right, r.gutter.gutterPx)) {
          conforming += 1;
        } else {
          deviations.push({ key, ...row, expected: r.gutter.gutterPx });
        }
      }
    }
    check(`R2 every container/section uses --gutter (${conforming} conforming)`,
      deviations.length === 0,
      `a token most elements use and some do not is 21 R1's bug wearing the fix's name. `
      + `Unexpected: ${JSON.stringify(deviations.slice(0, 6))}`);
    // The count of unmigrated percentage gutters is itself the finding, and it
    // is asserted so that it can only be changed deliberately. THREE survived
    // WP-1b; B2 deleted the mobile section override, so TWO survive: nav (2.5%)
    // and .page-hero (5%). This number is supposed to go DOWN. If a future batch
    // migrates one and does not update this line, the suite fails and says so.
    const pctGutters = GUTTER_DEVIATIONS.filter((d) => !d.forClasses).length;
    check(`R2 exactly ${pctGutters} percentage gutters survive the consolidation`,
      pctGutters === 2 && pinned > 0,
      `nav (2.5%) and .page-hero (5%) are unmigrated. `
      + `They are pinned by their RULE, not waived: this count is the thing that has to `
      + `shrink, and ${pinned} element(s) matched a pinned rule this run.`);
  }

  // ---- R2b: the section tier reaches the block axis (B2 / F-1) ----
  console.log('\nR2b — the standard section tier, on the block axis (B2 / F-1)');
  {
    const measured = [];
    for (const [key, r] of pages(results)) {
      const width = Number(key.split('@')[1]);
      const want = r.tier.standard;
      for (const row of r.tier.rows) {
        measured.push({ key, width, want, ...row });
      }
    }
    check('R2b at least one standard-tier section.container was measured',
      measured.length > 0,
      'no untiered section.container on any probed page — either the templates changed '
      + 'or the selector is wrong. A vacuous pass is not a pass, and this assertion '
      + 'exists precisely because the thing it measures was 0 for the site\'s whole life.');

    const off = measured.filter((m) => !near(m.top, m.want) || !near(m.bottom, m.want));
    check(`R2b every standard section.container takes --section-pad on BOTH edges `
      + `(${measured.length} measured)`,
      off.length === 0,
      `THE F-1 defect, and the one no other gate in this repo can see: .container's `
      + `padding shorthand reset the block axis to 0 and outranked the tier rule, so `
      + `these sections rendered with no vertical rhythm at any width. dom-integrity `
      + `reads a token stream and the pixel harness reads a fit model; neither can say `
      + `whether a tier ARRIVED. Off-tier: ${JSON.stringify(off.slice(0, 6))}`);

    // Both widths, separately, because the whole mobile scale change lives in
    // the difference between them: a suite that only measured 1440 would have
    // called the vh-only clamp correct.
    for (const width of WIDTHS) {
      const at = measured.filter((m) => m.width === width);
      // `want > 0` on EVERY element, not on a sampled one. If --section-pad
      // resolved to 0 the equality above would be satisfied by a page with no
      // rhythm at all -- the exact defect this group exists to catch, passing
      // itself. One sampled element cannot carry that clause: it certifies the
      // sample, and the other sixteen ride for free.
      check(`R2b the tier resolves and lands at ${width} (${at.length} sections)`,
        at.length > 0 && at.every((m) => near(m.top, m.want) && m.want > 0),
        `resolved --section-pad ${at[0] ? at[0].want : 'n/a'}px at ${width}`);
    }

    // The tiers are read at both widths and REPORTED, not asserted against
    // consumers — .section--tight/--open have none until B5 assigns them.
    for (const width of WIDTHS) {
      const t = results[`/saunas/@${width}`].tier;
      console.log(`        @${width}: --section-pad ${t.standard}px · tight ${t.tight}px `
        + `· open ${t.open}px (ratios ${(t.tight / t.standard).toFixed(2)} : 1 : `
        + `${(t.open / t.standard).toFixed(2)})`);
    }
  }

  // ---- R3: the 70ch cap ----
  console.log('\nR3 — .measure-wide caps at 70ch (the change no other gate sees)');
  {
    const items = [];
    for (const [key, r] of pages(results)) {
      check(`R3 --measure-wide is declared ${MEASURE_WIDE_CH}ch (${key})`,
        r.measure.declaredWide === `${MEASURE_WIDE_CH}ch`,
        `declared ${JSON.stringify(r.measure.declaredWide)}`);
      break;   // the token is global; one assertion, not one per page
    }
    for (const [key, r] of pages(results)) {
      for (const it of r.measure.items) items.push({ key, ...it });
    }
    check('R3 at least one .measure-wide element was measured',
      items.length > 0, 'the four text--* utilities collapsed into this class; if nothing '
      + 'carries it the collapse went somewhere unexpected');
    const off = items.filter((it) => !near(it.maxWidth, it.seventyCh, 1));
    check(`R3 every .measure-wide element renders a ${MEASURE_WIDE_CH}ch cap (${items.length} measured)`,
      off.length === 0,
      `computed max-width must equal ${MEASURE_WIDE_CH}ch measured in the element's own `
      + `font. Off: ${JSON.stringify(off.slice(0, 4))}`);
    // The cap RELAXED. Asserting 70ch alone would pass just as well if the token
    // had never moved off 65ch and something else had gone wrong.
    const notWider = items.filter((it) => it.seventyCh <= it.sixtyFiveCh);
    check('R3 the 70ch cap is measurably wider than the 65ch it replaced',
      items.length > 0 && notWider.length === 0,
      `the four text--* utilities capped at 60ch and 65ch; this is the line-length change `
      + `itself, and it must be visible in pixels. Not wider: ${JSON.stringify(notWider)}`);
  }
}

// ------------------------------------------------------------- the mutations
//
// Each patches the BUILT stylesheet in a throwaway copy of dist/ and must move
// the probe it is aimed at. Anchors are asserted before the patch: an
// un-applied mutation must never look like a pass, which is the rule the
// DOM-integrity battery learned the hard way.

const MUTATIONS = [
  {
    name: 'R-m6 the hero stops reserving the nav band',
    proves: 'the clearance is measured, not merely declared in a comment',
    // The reserve removed, which is the pre-fix state: the hero centres its
    // content in a box whose top the fixed nav paints over, and the h1 goes
    // back behind it at phone widths. Probing the clearances (not the padding)
    // means this fails for the reason a reader would notice.
    anchor: 'padding-block:var(--nav-band) 0',
    patched: 'padding-block:0 0',
    probe: (r) => Object.keys(r.__hero).sort()
      .map((w) => `${w}:${r.__hero[w] && r.__hero[w].glyphClearance}`).join(','),
  },
  {
    name: 'R-m7 --nav-band decoupled from the logo that sizes the nav',
    proves: 'the band is DERIVED from the nav, not a literal that can drift from it',
    // A pasted literal instead of the derivation. It happens to be right at the
    // desktop breakpoint and wrong at <=768, which is exactly how a hardcoded
    // band rots: correct where it was measured, silently short everywhere else.
    anchor: '--nav-band:calc(var(--logo-size) + 2 * var(--spacing-sm) + 1px)',
    // 91px, NOT 148px, and that is the strengthening (Razor W2). 148 is wrong
    // at every phone width, so the hero sweep alone would catch it and the
    // mutation would prove almost nothing. 91 is CORRECT at every width the
    // hero consumes the token at, and wrong only above the breakpoint -- the
    // realistic shape of a pasted literal, and invisible to anything that reads
    // the token through the hero. Probing the resolved token at both widths is
    // what sees it.
    patched: '--nav-band:91px',
    probe: (r) => Object.keys(r.__token).sort()
      .map((w) => `${w}:${r.__token[w] && r.__token[w].resolved}`).join(','),
  },
  {
    name: 'R-m1 heading margin token changed (2.5em -> 1em)',
    proves: 'the em-relative heading rhythm is asserted, not assumed',
    anchor: 'margin-block-start:2.5em',
    patched: 'margin-block-start:1em',
    probe: (r) => r[`/saunas/@1440`].heading.h2AfterP.top,
  },
  {
    name: 'R-m2 --gutter dropped to a bare value',
    proves: 'the gutter is measured where it lands, not where it is declared',
    anchor: '--gutter:clamp(1.5rem, 6vw, 7rem)',
    patched: '--gutter:0px',
    probe: (r) => r[`/saunas/@1440`].gutter.rows.map((x) => x.left).join(','),
  },
  {
    name: 'R-m3 the line-length cap widened (70ch -> 90ch)',
    proves: 'the measure is pinned at its declared value, not merely non-zero',
    anchor: '--measure-wide:70ch',
    patched: '--measure-wide:90ch',
    probe: (r) => r[`/saunas/@1440`].measure.items.map((x) => Math.round(x.maxWidth)).join(','),
  },
  {
    name: 'R-m4 .grid-3 loses its system margin',
    proves: 'a collapsed grid after the utility deletions is caught',
    anchor: 'margin-top:var(--spacing-xl)',
    patched: 'margin-top:0',
    probe: (r) => r[`/saunas/@1440`].deleted.grids.map((g) => g.marginTop).join(','),
  },
  {
    name: 'R-m5 .container reverts to the padding shorthand (F-1 restored)',
    proves: 'the block-axis tier is measured where it lands, so the defect that '
      + 'shipped for the site\'s whole life cannot ship again unseen',
    anchor: 'padding-inline:var(--gutter)',
    patched: 'padding:0 var(--gutter)',
    probe: (r) => [1440, 390].map((w) => r[`/saunas/@${w}`].tier.rows
      .map((x) => `${x.top}/${x.bottom}`).join(',')).join(' | '),
  },
];

async function runMutations(browser, reference) {
  console.log('\nM — mutation battery (runnable)');
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  for (let i = 0; i < MUTATIONS.length; i++) {
    const m = MUTATIONS[i];
    const dir = path.join(WORK, 'mutants', `r${i}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.cpSync(DIST, dir, { recursive: true });
    if (!css.includes(m.anchor)) {
      check(m.name, false,
        `anchor ${JSON.stringify(m.anchor)} not found in the built stylesheet. The CSS `
        + `moved; re-aim the mutation. An un-applied mutation must never look like a pass.`);
      continue;
    }
    fs.writeFileSync(path.join(dir, 'styles.css'), css.split(m.anchor).join(m.patched));
    const server = await startServer(dir);
    try {
      const mutated = await measureAll(browser, server.url);
      const before = JSON.stringify(m.probe(reference));
      const after = JSON.stringify(m.probe(mutated));
      check(`${m.name} — ${m.proves}`, before !== after,
        `the mutant measured identically to the real build (both ${before}), so this `
        + `property has no coverage: the defect would ship unnoticed`);
    } finally {
      await server.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

async function main() {
  // Self-runnable from a clean checkout, or a named refusal. NOT a vacuous pass.
  if (!fs.existsSync(path.join(DIST, 'styles.css'))) {
    console.error('\nrhythm.test.mjs needs a build: run `npm run build` first.\n'
      + 'This suite measures COMPUTED style in a real browser against dist/, because a '
      + 'token\'s declared value and the value that reaches the element are different '
      + 'claims. Without a build it can only pass vacuously, so it refuses.\n');
    return 2;
  }
  fs.mkdirSync(WORK, { recursive: true });
  const browser = await chromium.launch();
  const server = await startServer(DIST);
  try {
    const results = await measureAll(browser, server.url);
    assertAll(results);
    assertHeroClearance(results.__hero, results.__heroNoFont, results.__token);
    await runMutations(browser, results);
  } finally {
    await server.close();
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  return failed === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`\nrhythm tests crashed: ${err.stack || err.message}`); process.exit(2); }
);
