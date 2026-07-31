/**
 * fonts.test.mjs -- the self-hosted type system, checked against reality.
 *
 * WP-1a replaced a Google Fonts <link> with three self-hosted variable faces and
 * swapped ~20 ad-hoc font sizes for a token scale. Every failure mode that work
 * has is silent -- that is the whole reason this file exists:
 *
 *   - `format('woff2-variations')` is deprecated syntax. A browser that sees it
 *     drops the WHOLE face and renders Arial. The page still "works". Nobody
 *     notices until someone looks at it, and it is the exact CLS regression
 *     self-hosting was supposed to prevent.
 *   - A content-hashed filename that stops matching its own bytes turns the
 *     `immutable` cache header into a year-long stale-font bug.
 *   - `tnum` is NOT in fontTools' default keep-list. Re-subset the fonts without
 *     asking for it and tabular numerals degrade silently to proportional --
 *     price columns stop aligning and no test fails.
 *   - A type token nudged below the 19px Cormorant floor or the 11px absolute
 *     floor renders as hairline-serif mush on a phone in sunlight. Asserting on
 *     the token VALUE would not catch it; these assert on COMPUTED style in a
 *     real browser at both widths, which is where the floor actually has to hold.
 *
 * Group A runs against the repo (bytes, config, CSS text). Group B drives a real
 * Chromium against a real build, because "the font loaded" is not a claim static
 * analysis can make.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './lib/server.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(REPO_ROOT, 'src', 'fonts');
const DIST = path.join(REPO_ROOT, 'dist');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}\n          ${err.message}`);
    failed += 1;
    failures.push(name);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}\n          ${err.message}`);
    failed += 1;
    failures.push(name);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// The three faces the system is built from. Kept as data so a fourth face
// cannot be added to the CSS without being added here too (F4 enforces that).
const FACES = [
  { file: 'cormorant-garamond-var', family: 'Cormorant Garamond', style: 'normal', weights: '300 700', preload: true },
  { file: 'cormorant-garamond-italic-var', family: 'Cormorant Garamond', style: 'italic', weights: '300 700', preload: false },
  { file: 'outfit-var', family: 'Outfit', style: 'normal', weights: '100 900', preload: true },
];

const css = fs.readFileSync(path.join(REPO_ROOT, 'styles.css'), 'utf8');
const head = fs.readFileSync(path.join(REPO_ROOT, 'src', '_includes', 'head.njk'), 'utf8');
const netlifyToml = fs.readFileSync(path.join(REPO_ROOT, 'netlify.toml'), 'utf8');

/**
 * Comment-stripped views. These checks are about what the browser EXECUTES, and
 * the files explain themselves at length -- the comments name the deprecated
 * syntax and the deleted Google origins precisely so a later reader knows why
 * they are gone. Scanning raw text makes a correct file fail because it
 * documents itself, so strip comments first and assert on declarations.
 */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
const headCode = head.replace(/<!--[\s\S]*?-->/g, '');
const tomlCode = netlifyToml.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');

function fontFiles() {
  return fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.woff2'));
}

function resolveFace(face) {
  const re = new RegExp(`^${face.file}\\.([0-9a-f]{12})\\.woff2$`);
  const match = fontFiles().map((f) => [f, re.exec(f)]).filter(([, m]) => m);
  assert(match.length === 1,
    `expected exactly one binary for ${face.file}, found ${match.length}: ${match.map(([f]) => f).join(', ')}`);
  const [name, m] = match[0];
  return { name, hash: m[1], full: path.join(FONT_DIR, name) };
}

console.log('\nGroup A -- binaries, filenames, and the CSS that references them\n');

// A1 is the load-bearing one. The `immutable` header means a wrong answer here
// is served for a year.
check('A1 every font filename matches the sha256 of its own bytes', () => {
  const files = fontFiles();
  assert(files.length === FACES.length,
    `expected ${FACES.length} woff2 files, found ${files.length}: ${files.join(', ')}`);
  for (const f of files) {
    const m = /^(.+)\.([0-9a-f]{12})\.woff2$/.exec(f);
    assert(m, `filename carries no content hash: ${f}`);
    const bytes = fs.readFileSync(path.join(FONT_DIR, f));
    const actual = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    assert(actual === m[2],
      `${f} claims hash ${m[2]} but its bytes hash to ${actual}. `
      + 'The binary changed without being renamed -- under `immutable` that is a stale font for up to a year.');
  }
});

check('A2 every face is declared format(\'woff2\'), never the deprecated woff2-variations', () => {
  assert(!cssCode.includes('woff2-variations'),
    'styles.css declares format(\'woff2-variations\'). That syntax is deprecated: browsers drop the '
    + 'entire face and silently render Arial.');
  const declared = cssCode.match(/format\('woff2'\)/g) || [];
  assert(declared.length === FACES.length,
    `expected ${FACES.length} format('woff2') declarations, found ${declared.length}`);
});

check('A3 each face declares its real fvar weight range', () => {
  for (const face of FACES) {
    const { name } = resolveFace(face);
    const block = css.split('@font-face').find((b) => b.includes(name));
    assert(block, `no @font-face block references ${name}`);
    assert(block.includes(`font-weight: ${face.weights}`),
      `${face.file} should declare font-weight: ${face.weights} (its actual fvar range); block was:\n${block}`);
    assert(block.includes(`font-style: ${face.style}`),
      `${face.file} should declare font-style: ${face.style}`);
    assert(block.includes('font-display: swap'),
      `${face.file} should declare font-display: swap`);
  }
});

check('A4 the CSS references exactly the binaries on disk, and no others', () => {
  const referenced = new Set((css.match(/\/fonts\/[A-Za-z0-9._-]+\.woff2/g) || [])
    .map((u) => path.basename(u)));
  const onDisk = new Set(fontFiles());
  for (const r of referenced) {
    assert(onDisk.has(r), `styles.css references ${r}, which is not in src/fonts/`);
  }
  for (const d of onDisk) {
    assert(referenced.has(d), `src/fonts/${d} is shipped but nothing references it`);
  }
});

check('A5 preload tags name real, current binaries and carry crossorigin', () => {
  for (const face of FACES.filter((f) => f.preload)) {
    const { name } = resolveFace(face);
    const tag = head.split('\n').find((l) => l.includes('rel="preload"') && l.includes(name));
    assert(tag, `head.njk does not preload ${name} (a stale hash here means the preload misses and the font is fetched twice)`);
    assert(tag.includes('crossorigin'),
      `preload of ${name} lacks crossorigin; fonts are fetched in anonymous CORS mode, so without it the preload is discarded`);
    assert(tag.includes('as="font"') && tag.includes('type="font/woff2"'),
      `preload of ${name} needs as="font" and type="font/woff2"`);
  }
  const preloaded = (head.match(/rel="preload"[^>]*\.woff2/g) || []).length;
  assert(preloaded === 2,
    `expected exactly 2 font preloads (the above-the-fold pair), found ${preloaded}. `
    + 'Preloading more competes with the LCP hero image.');
});

check('A6 the italic face is deliberately NOT preloaded', () => {
  const { name } = resolveFace(FACES.find((f) => f.style === 'italic'));
  assert(!head.includes(`rel="preload" href="/fonts/${name}"`),
    'the Cormorant italic is below the fold on every entry page; preloading it delays the LCP image');
});

check('A7 no Google Fonts origin survives in CSS, head, or CSP', () => {
  for (const [label, text] of [['styles.css', cssCode], ['head.njk', headCode], ['netlify.toml', tomlCode]]) {
    assert(!text.includes('fonts.googleapis.com'), `${label} still references fonts.googleapis.com`);
    assert(!text.includes('fonts.gstatic.com'), `${label} still references fonts.gstatic.com`);
  }
});

check('A8 the CSP shrank: font-src is self only', () => {
  const csp = /Content-Security-Policy = "([^"]+)"/.exec(netlifyToml);
  assert(csp, 'no Content-Security-Policy found in netlify.toml');
  const fontSrc = /font-src ([^;]+)/.exec(csp[1]);
  assert(fontSrc, 'CSP declares no font-src');
  assert(fontSrc[1].trim() === "'self'",
    `font-src should be 'self' alone now that fonts are self-hosted, got: ${fontSrc[1].trim()}`);
});

check('A9 fonts are served immutable', () => {
  assert(/for = "\/fonts\/\*"/.test(netlifyToml),
    'netlify.toml has no cache header rule for /fonts/*');
  const block = netlifyToml.split('for = "/fonts/*"')[1].slice(0, 200);
  assert(block.includes('max-age=31536000') && block.includes('immutable'),
    '/fonts/* should be cached max-age=31536000, immutable -- safe only because the filenames are content-hashed');
});

check('A10 the metric-tuned fallback families exist and are actually adjusted', () => {
  for (const fam of ['Cormorant Garamond Fallback', 'Outfit Fallback']) {
    assert(css.includes(`font-family: '${fam}'`), `no @font-face defines ${fam}`);
  }
  // A size-adjust of exactly 100% means nobody ran fontaine -- that is the
  // default when the fallback's own metrics were never supplied.
  const adjusts = (css.match(/size-adjust: ([\d.]+)%/g) || []);
  assert(adjusts.length >= 3, `expected a size-adjust on each fallback face, found ${adjusts.length}`);
  const cormorant = /font-family: 'Cormorant Garamond Fallback';[\s\S]*?size-adjust: ([\d.]+)%/.exec(css);
  assert(cormorant && Number(cormorant[1]) < 95,
    `Cormorant's x-height is far smaller than Georgia's, so its fallback must be shrunk well below 100% `
    + `(fontaine computes ~87.9%); got ${cormorant && cormorant[1]}%. A flat 100% means the metrics were never generated.`);
});

check('A11 both font stacks route through their metric fallback before the system font', () => {
  const primary = /--font-primary: ([^;]+);/.exec(css)[1];
  const heading = /--font-heading: ([^;]+);/.exec(css)[1];
  assert(/'Outfit',\s*'Outfit Fallback'/.test(primary),
    `--font-primary must put 'Outfit Fallback' directly after 'Outfit', got: ${primary}`);
  assert(/'Cormorant Garamond',\s*'Cormorant Garamond Fallback'/.test(heading),
    `--font-heading must put the metric fallback directly after the real face, got: ${heading}`);
});

console.log('\nGroup A -- the type scale itself\n');

check('A12 the scale is monotonic at both ends of the viewport range', () => {
  const order = ['--text-2xs', '--text-xs', '--text-sm', '--text-base', '--text-md',
    '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl'];
  const rem = 16;
  const bounds = {};
  for (const tok of order) {
    const decl = new RegExp(`${tok}:\\s*([^;]+);`).exec(css);
    assert(decl, `${tok} is not defined in :root`);
    const v = decl[1].trim();
    const clamp = /clamp\(([\d.]+)rem,[^,]+,\s*([\d.]+)rem\)/.exec(v);
    if (clamp) bounds[tok] = [Number(clamp[1]) * rem, Number(clamp[2]) * rem];
    else {
      const fixed = Number(/([\d.]+)rem/.exec(v)[1]) * rem;
      bounds[tok] = [fixed, fixed];
    }
  }
  for (let i = 1; i < order.length; i += 1) {
    const [prevMin, prevMax] = bounds[order[i - 1]];
    const [curMin, curMax] = bounds[order[i]];
    assert(curMin >= prevMin, `${order[i]} min (${curMin}px) is below ${order[i - 1]} min (${prevMin}px)`);
    assert(curMax >= prevMax, `${order[i]} max (${curMax}px) is below ${order[i - 1]} max (${prevMax}px)`);
  }
  assert(bounds['--text-2xs'][0] === 11, `the absolute floor must be 11px, got ${bounds['--text-2xs'][0]}px`);
  assert(bounds['--text-base'][0] === 16 && bounds['--text-base'][1] === 16,
    'body must hold still at 16px across the whole viewport range');
  assert(bounds['--text-lg'][0] === 19,
    `the Cormorant floor --text-lg must start at exactly 19px, got ${bounds['--text-lg'][0]}px`);
});

check('A13 no serif rule is set below the 19px Cormorant floor', () => {
  // Structural check on the stylesheet: every rule that opts into --font-heading
  // must also land on a step at or above --text-lg.
  const allowedSerifSteps = new Set(['--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl']);
  const blocks = css.split('}');
  for (const block of blocks) {
    if (!block.includes('var(--font-heading)')) continue;
    const size = /font-size:\s*var\((--text-[a-z0-9]+)\)/.exec(block);
    if (!size) continue;   // inherits; the element-level check in Group B covers it
    assert(allowedSerifSteps.has(size[1]),
      `a --font-heading rule is set at ${size[1]}, below the 19px Cormorant floor:\n${block.trim().slice(0, 200)}`);
  }
});

check('A14 no raw font-size below the 11px floor survives in styles.css', () => {
  const raw = [...css.matchAll(/font-size:\s*([\d.]+)rem/g)].map((m) => Number(m[1]) * 16);
  const below = raw.filter((px) => px < 11);
  assert(below.length === 0, `raw font sizes below the 11px floor: ${below.join(', ')}px`);
});

check('A15 tabular numerals are declared on the price and spec selectors', () => {
  const block = /font-variant-numeric: lining-nums tabular-nums;/.exec(css);
  assert(block, 'no tabular-nums declaration found');
  for (const sel of ['.price-row', '.model-price', '.compare-table td', '.spec-item span', '.booking-option__price']) {
    const re = new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{[^}]*font-variant-numeric`, 's');
    const inList = css.includes(sel) && /([^{}]*)\{\s*font-variant-numeric: lining-nums tabular-nums/s.test(css);
    assert(re.test(css) || inList, `${sel} is not covered by a tabular-nums rule`);
  }
  assert(css.includes('"tnum" 1'), 'the older-Safari font-feature-settings belt is missing');
});

console.log('\nGroup B -- a real browser, a real build\n');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('  dist/ is missing -- run `npm run build` first.');
  process.exit(1);
}

const server = await startServer(DIST);
const baseUrl = server.url;
const browser = await chromium.launch();

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    const requested = [];
    const foreign = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.endsWith('.woff2')) requested.push(url);
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) foreign.push(url);
    });

    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    await checkAsync(`B1 @${width} both above-the-fold faces are actually fetched`, async () => {
      const names = requested.map((u) => path.basename(new URL(u).pathname));
      for (const face of FACES.filter((f) => f.preload)) {
        const { name } = resolveFace(face);
        assert(names.includes(name), `${name} was never requested. Fetched: ${names.join(', ') || '(none)'}`);
      }
    });

    await checkAsync(`B2 @${width} no Google Fonts origin is contacted`, async () => {
      assert(foreign.length === 0, `contacted: ${foreign.join(', ')}`);
    });

    await checkAsync(`B3 @${width} the browser reports both families loaded`, async () => {
      const loaded = await page.evaluate(() => ({
        cormorant: document.fonts.check('400 20px "Cormorant Garamond"'),
        outfit: document.fonts.check('400 16px "Outfit"'),
        families: [...document.fonts].map((f) => `${f.family}|${f.style}|${f.weight}|${f.status}`),
      }));
      assert(loaded.cormorant, `document.fonts says Cormorant Garamond is unavailable. Registered: ${loaded.families.join(', ')}`);
      assert(loaded.outfit, `document.fonts says Outfit is unavailable. Registered: ${loaded.families.join(', ')}`);
    });

    // The deprecated-syntax failure renders Arial while every other check still
    // passes, so measure a glyph: Cormorant is a narrow, small-x-height Garalde
    // and cannot possibly match Arial's advance width.
    await checkAsync(`B4 @${width} headings render in Cormorant, not a fallback`, async () => {
      const result = await page.evaluate(async () => {
        const probe = document.createElement('span');
        probe.textContent = 'Handgloves 0123456789';
        probe.style.cssText = 'position:absolute;left:-9999px;font-size:100px;white-space:nowrap;';
        document.body.appendChild(probe);
        const measure = async (family) => {
          probe.style.fontFamily = family;
          await document.fonts.ready;
          return probe.getBoundingClientRect().width;
        };
        const real = await measure("'Cormorant Garamond'");
        const arial = await measure('Arial');
        const georgia = await measure('Georgia');
        probe.remove();
        return { real, arial, georgia };
      });
      assert(Math.abs(result.real - result.arial) > 1,
        `Cormorant measures ${result.real}px and Arial ${result.arial}px -- identical means the face failed to load `
        + 'and the browser silently substituted (the woff2-variations failure mode).');
      assert(Math.abs(result.real - result.georgia) > 1,
        `Cormorant measures the same as Georgia (${result.real}px); the real face is not being used.`);
    });

    await checkAsync(`B5 @${width} the 19px Cormorant floor holds in computed style`, async () => {
      const violations = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          if (!cs.fontFamily.includes('Cormorant')) continue;
          if (!el.textContent || !el.textContent.trim()) continue;
          const px = parseFloat(cs.fontSize);
          if (px < 19) {
            out.push(`${el.tagName.toLowerCase()}.${el.className || '(none)'} = ${px}px`);
          }
        }
        return out.slice(0, 10);
      });
      assert(violations.length === 0, `Cormorant rendered below 19px at: ${violations.join('; ')}`);
    });

    await checkAsync(`B6 @${width} nothing renders below the 11px absolute floor`, async () => {
      const violations = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          if (!el.childNodes.length) continue;
          const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!hasText) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 11) out.push(`${el.tagName.toLowerCase()}.${el.className || '(none)'} = ${px}px`);
        }
        return out.slice(0, 10);
      });
      assert(violations.length === 0, `text below the 11px floor at: ${violations.join('; ')}`);
    });

    await checkAsync(`B7 @${width} nav sits on --text-sm, not --text-base`, async () => {
      const px = await page.evaluate(() => {
        const a = document.querySelector('.nav-links a');
        return a ? parseFloat(getComputedStyle(a).fontSize) : null;
      });
      assert(px !== null, 'no .nav-links a found on the homepage');
      assert(px === 14, `nav links should compute to 14px (--text-sm), got ${px}px`);
    });

    await context.close();
  }

  // Tabular numerals have to be checked where prices actually live.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/saunas/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await checkAsync('B8 price elements actually compute to tabular-nums', async () => {
    const found = await page.evaluate(() => {
      const sels = ['.model-price', '.price-row', '.compare-table td', '.spec-item span'];
      const out = [];
      for (const s of sels) {
        for (const el of document.querySelectorAll(s)) {
          out.push({ sel: s, variant: getComputedStyle(el).fontVariantNumeric });
          break;
        }
      }
      return out;
    });
    assert(found.length > 0, 'no price/spec elements found on /saunas/ to check');
    for (const f of found) {
      assert(f.variant.includes('tabular-nums'),
        `${f.sel} computes font-variant-numeric: "${f.variant}" -- prices will not align`);
    }
  });

  // tnum has to survive in the SHIPPED subset, not just in the CSS. If a
  // re-subset drops the feature this renders identically-wide digits as
  // variable-width ones.
  await checkAsync('B9 the shipped Outfit subset really applies tnum', async () => {
    const widths = await page.evaluate(async () => {
      const mk = (variant) => {
        const s = document.createElement('span');
        s.style.cssText = `position:absolute;left:-9999px;font-family:'Outfit';font-size:100px;font-variant-numeric:${variant};`;
        document.body.appendChild(s);
        return s;
      };
      await document.fonts.ready;
      const tab = mk('tabular-nums');
      const prop = mk('proportional-nums');
      const out = {};
      tab.textContent = '11111'; prop.textContent = '11111';
      out.tabNarrow = tab.getBoundingClientRect().width;
      out.propNarrow = prop.getBoundingClientRect().width;
      tab.textContent = '90909'; prop.textContent = '90909';
      out.tabWide = tab.getBoundingClientRect().width;
      out.propWide = prop.getBoundingClientRect().width;
      tab.remove(); prop.remove();
      return out;
    });
    assert(Math.abs(widths.tabNarrow - widths.tabWide) < 0.5,
      `with tabular-nums, "11111" (${widths.tabNarrow}px) and "90909" (${widths.tabWide}px) must be the same width. `
      + 'The tnum feature is missing from the shipped subset -- price columns will not align.');
  });

  await context.close();
} finally {
  await browser.close();
  if (server && typeof server.close === 'function') server.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log(`failing: ${failures.join(', ')}`);
  process.exit(1);
}
