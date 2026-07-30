#!/usr/bin/env node
/**
 * Fixture for the asset-cache invalidation guard in .eleventy.js.
 *
 *   npm run build-cache:test
 *
 * WHAT IS UNDER TEST
 *
 * `.eleventy.js` memoises every stamped asset in a module-scope `assetCache` so the
 * hash in `styles.css?v=…` and the bytes written to `dist/styles.css` come from
 * the same buffer and cannot drift apart. That memo is per-BUILD, and the thing
 * that makes it per-build is one line:
 *
 *     eleventyConfig.on('eleventy.before', () => { assetCache.clear(); });
 *
 * The cache lives in the closure of the config function, which Eleventy
 * evaluates ONCE per Eleventy instance. A one-shot `npm run build` is therefore
 * immune: it gets a fresh, empty cache and never notices. `--serve` / `--watch`
 * reuse the instance across rebuilds, so without the clear the FIRST build's
 * bytes are served forever: passthrough copy puts the edited styles.css into
 * dist, and then the `eleventy.after` hook overwrites it with the stale cached
 * buffer. The stamp never moves either, so nothing looks wrong. You edit CSS,
 * the page does not change, and you go looking for the bug in your CSS.
 *
 * WHY THIS FILE EXISTS
 *
 * That line had no programmatic coverage at all. Deleting it left the 91
 * assertions in visual-diff.test.mjs completely green, because none of them
 * ever builds twice in one process. The only detector was a human noticing
 * stale CSS in dev and correctly guessing why.
 *
 * HOW IT IS TESTED
 *
 * The real Eleventy JS API, one instance, two `write()` calls, with a real edit
 * to a real CSS input in between -- the actual `--serve` shape, not a
 * simulation of it. The site is copied to a temp directory first so the edit
 * never touches the working tree, and the copy carries the REAL `.eleventy.js`:
 * the config is the thing under test, so substituting a simplified one would
 * test nothing. (The copy is also load-bearing for a second reason: the
 * `eleventy.after` hook resolves `dist` from its own `__dirname`, so a build
 * driven at a temp output path would still write into the real repo's dist.)
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * A fixture that cannot fail is decoration. This one runs the same scenario
 * twice: once against the config as shipped, and once against a copy with the
 * `eleventy.before` clear surgically removed. The first MUST come back fresh
 * and the second MUST come back stale. So the mutation test is not a thing
 * someone has to remember to perform by hand -- if the guard ever stops being
 * load-bearing, scenario B goes green and this file fails on the spot.
 *
 * If the mutation regex stops matching (someone reformats that block), the run
 * fails loudly rather than quietly skipping the half of the fixture that gives
 * the other half its meaning.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const Eleventy = require('@11ty/eleventy');

/** Marker written into the CSS/JS inputs between the two builds. */
const CSS_MARKER = 'ssc-cache-fixture-marker';
const JS_MARKER = 'sscCacheFixtureMarker';

/** Directories never copied into the scratch site. */
const SKIP = new Set(['node_modules', '.git', 'dist', '_site', '.visual-diff', '.probe', 'tmp']);

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

/**
 * Remove the `eleventy.before` assetCache clear from a copied config.
 *
 * Deliberately strict: if the block is not found EXACTLY once, throw. A
 * mutation that silently fails to apply would make scenario B pass for the
 * wrong reason and quietly retire the only thing that gives this fixture teeth.
 */
function removeCacheClear(configFile) {
  const before = fs.readFileSync(configFile, 'utf8');
  const pattern = /\n\s*eleventyConfig\.on\('eleventy\.before',\s*\(\)\s*=>\s*\{\s*assetCache\.clear\(\);\s*\}\);\n/g;
  const hits = before.match(pattern);
  if (!hits || hits.length !== 1) {
    throw new Error(
      `mutation could not be applied to ${configFile}: expected exactly one `
      + `eleventy.before assetCache.clear() block, found ${hits ? hits.length : 0}. `
      + `If that block was reformatted or moved, update this pattern -- do not `
      + `delete the mutation, it is what proves the fixture can fail.`);
  }
  fs.writeFileSync(configFile, before.replace(pattern, '\n'));
}

/** Copy the site into a fresh temp dir, minus build output and dependencies. */
function scratchSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-build-cache-'));
  fs.cpSync(REPO_ROOT, dir, {
    recursive: true,
    filter: (src) => !SKIP.has(path.basename(src)) || path.dirname(src) !== REPO_ROOT,
  });
  // Symlinked rather than copied: it is large, and resolving to the same
  // installed Eleventy is the point.
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}

function readStamp(html, asset) {
  const m = html.match(new RegExp(`${asset.replace('.', '\\.')}\\?v=([a-f0-9]+)`));
  return m ? m[1] : null;
}

/**
 * Build twice in ONE Eleventy instance, editing styles.css and a JS input in
 * between, and report what the second build actually served.
 *
 * @param {boolean} mutate  strip the eleventy.before clear from the copy first
 */
async function twoBuildScenario(mutate) {
  const dir = scratchSite();
  try {
    if (mutate) removeCacheClear(path.join(dir, '.eleventy.js'));

    const dist = path.join(dir, 'dist');
    const elev = new Eleventy(path.join(dir, 'src'), dist, {
      configPath: path.join(dir, '.eleventy.js'),
      quietMode: true,
    });

    await elev.write();
    const html1 = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    const first = {
      cssStamp: readStamp(html1, 'styles.css'),
      jsStamp: readStamp(html1, 'animations.js'),
    };

    // Edit real inputs between the builds, exactly as a developer would with
    // `--serve` running. Appending keeps both files valid CSS/JS.
    fs.appendFileSync(path.join(dir, 'styles.css'), `\n.${CSS_MARKER}{color:#123456}\n`);
    fs.appendFileSync(path.join(dir, 'js', 'animations.js'), `\nvar ${JS_MARKER}=1;\n`);

    await elev.write();
    const html2 = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    const servedCss = fs.readFileSync(path.join(dist, 'styles.css'), 'utf8');
    const servedJs = fs.readFileSync(path.join(dist, 'js', 'animations.js'), 'utf8');

    return {
      first,
      cssStamp: readStamp(html2, 'styles.css'),
      jsStamp: readStamp(html2, 'animations.js'),
      cssHasEdit: servedCss.includes(CSS_MARKER),
      jsHasEdit: servedJs.includes(JS_MARKER),
      // The stamp must key the bytes that were actually written, not some
      // other rendering of the same source.
      cssStampMatchesServedBytes:
        crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, 'styles.css')))
          .digest('hex').slice(0, 12) === readStamp(html2, 'styles.css'),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  process.stdout.write('\nAsset-cache invalidation across two builds in one process\n\n');

  process.stdout.write('  A: config as shipped -- the second build must serve the edit\n');
  const shipped = await twoBuildScenario(false);

  check('A1 the served styles.css contains the edit made between the builds',
    shipped.cssHasEdit,
    'dist/styles.css is the FIRST build\'s bytes. Under --serve every CSS edit is '
    + 'silently discarded: passthrough copies the new file in and eleventy.after '
    + 'overwrites it from the stale memo.');
  check('A2 the styles.css cache stamp moved with the edit',
    shipped.cssStamp && shipped.first.cssStamp && shipped.cssStamp !== shipped.first.cssStamp,
    `stamp stayed ${shipped.first.cssStamp}. Served bytes changed but the immutable `
    + 'cache key did not, which is the year-long stale-cache bug assetUrl exists to kill.');
  check('A3 the stamp still hashes the bytes actually served',
    shipped.cssStampMatchesServedBytes,
    'the hash in the URL is not the sha256 of dist/styles.css, so the cache key does '
    + 'not cover what visitors receive');
  check('A4 the served animations.js contains the edit',
    shipped.jsHasEdit,
    'the same memo backs js/*; a CSS-only fix would leave JS edits stale');
  check('A5 the animations.js cache stamp moved with the edit',
    shipped.jsStamp && shipped.first.jsStamp && shipped.jsStamp !== shipped.first.jsStamp,
    `stamp stayed ${shipped.first.jsStamp}`);

  process.stdout.write('\n  B: eleventy.before clear removed -- the fixture must detect it\n');
  const mutated = await twoBuildScenario(true);

  check('B1 without the clear, the second build serves STALE css',
    !mutated.cssHasEdit,
    'the edit survived even with the cache never cleared, so A1 does not actually '
    + 'depend on the guard and proves nothing. Either Eleventy changed its rebuild '
    + 'semantics or this fixture is decoration -- find out which before trusting A.');
  check('B2 without the clear, the css stamp does NOT move',
    mutated.cssStamp === mutated.first.cssStamp,
    'the stamp moved without the guard, so A2 is not load-bearing either');
  check('B3 without the clear, the second build serves STALE js',
    !mutated.jsHasEdit,
    'the js edit survived without the guard, so A4 proves nothing');

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`\nbuild-cache tests crashed: ${err.stack || err.message}`);
    process.exit(2);
  },
);
