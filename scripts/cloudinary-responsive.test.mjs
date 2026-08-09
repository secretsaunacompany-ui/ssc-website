#!/usr/bin/env node
/**
 * Fixture for the Cloudinary responsive-delivery contract in `.eleventy.js`.
 *
 *   npm run cloudinary:test
 *
 * WHAT IS UNDER TEST
 *
 * Three things that must agree, and one thing that must keep failing.
 *
 * The `cloudinaryResponsive` transform writes the srcset that ships on <img>
 * elements; `cloudinaryDefaultSrc` and `cloudinarySrcset` write the SAME list
 * for a <link rel="preload">. They agree because they read the same regex and
 * the same width table -- a preload whose candidate list drifts from the
 * element's is not a preload, it is a second download.
 *
 * WHY THE ANGLE CASES EXIST (B7 stream 2c)
 *
 * Several photographs on this site carry EXIF rotation their derivative does
 * not honour, and the fix was a hand-written `a_90` in the URL. The accepted
 * shape used to be `q_auto,f_auto/<path>` EXACTLY, so every one of those
 * corrected URLs silently failed to match: no srcset was generated and the
 * browser fetched the full-size original. The correction that made the picture
 * the right way up was also the thing making it enormous, on three <img>
 * elements (about :27, about :95, home :54), and nothing anywhere reported it.
 * A silent opt-out is the worst shape a performance bug can have.
 *
 * WHY THE WIDTH CASES STILL THROW
 *
 * Tolerating rotation must not widen the B1 guard. An angle is a property of
 * the SOURCE (this photograph is on its side); a width is a decision about
 * DELIVERY, which is the generator's job. Hard-coding a width is what made the
 * homepage fetch its LCP photograph twice, and the filters throw on it rather
 * than degrading -- `cloudinarySrcset` failing soft emits `imagesrcset=""`,
 * which no browser reports. The combined shape `a_90,w_600` must throw too:
 * that is the one an author is most likely to write by hand after seeing the
 * angle accepted.
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * A fixture that cannot fail is decoration. Scenario B reloads the config with
 * the angle group surgically removed from the shared regex and requires the
 * angle assertions to go RED and the width assertions to stay GREEN. So this
 * file proves both halves of its own claim: that it detects the regression it
 * was written for, and that the guard it relaxed is still a guard.
 *
 * If the mutation regex stops matching (someone reformats that line), the run
 * fails loudly rather than quietly skipping the half that gives the other half
 * its meaning.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CONFIG_PATH = path.join(REPO_ROOT, '.eleventy.js');
const BASE = 'https://res.cloudinary.com/dlhqdgmih/image/upload/';
const PATHSEG = 'v1768250654/20250214_115013_ka8wl6.jpg';

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}`);
    if (detail) console.log(`       ${detail}`);
  }
}

/**
 * Load a copy of `.eleventy.js` and harvest its filters and transforms.
 *
 * The REAL config file is the thing under test, so it is loaded rather than
 * reimplemented; `mutate` lets scenario B load a byte-identical copy with one
 * edit. A stub `eleventyConfig` captures the registrations and ignores
 * everything else the config asks for (passthrough copies, collections,
 * lifecycle hooks) -- none of which this fixture drives.
 */
let loadCount = 0;
function loadConfig(mutate) {
  let source = fs.readFileSync(CONFIG_PATH, 'utf8');
  if (mutate) source = mutate(source);

  // The copy is written INSIDE the repo, not in os.tmpdir(). The config
  // `require`s esbuild and lightningcss at module scope, and CommonJS resolves
  // those from the requiring FILE's directory -- a copy under /tmp cannot see
  // the repo's node_modules and dies with MODULE_NOT_FOUND before a single
  // filter is registered. Anchoring the caller's createRequire does not help:
  // it governs how this fixture resolves the copy, not how the copy resolves
  // its own dependencies.
  //
  // The name is unique PER LOAD, not just per process. CommonJS caches modules
  // by resolved path, so reusing one filename made the mutated scenario B get
  // scenario A's module straight from require.cache -- the mutation applied to
  // the bytes on disk, nothing loaded them, and all four angle assertions
  // stayed green while appearing to prove the opposite. A mutation harness that
  // silently tests the unmutated code is worse than no mutation harness.
  const file = path.join(REPO_ROOT, `.eleventy-under-test.${process.pid}.${loadCount++}.cjs`);
  fs.writeFileSync(file, source);

  const filters = new Map();
  const transforms = new Map();
  const stub = {
    addFilter: (name, fn) => filters.set(name, fn),
    addTransform: (name, fn) => transforms.set(name, fn),
    addPassthroughCopy: () => {},
    addCollection: () => {},
    on: () => {},
  };

  // The config `require`s esbuild/lightningcss at module scope, which resolve
  // from the repo's node_modules; a temp-dir copy would not find them, so the
  // require is anchored to the repo root.
  const require = createRequire(path.join(REPO_ROOT, '/'));
  try {
    const configFn = require(file);
    configFn(stub);
  } finally {
    // Cleaned even when the config throws, so a failing run never leaves a
    // stray .cjs beside the real one for the next person to wonder about.
    fs.rmSync(file, { force: true });
  }

  return { filters, transforms };
}

/** Did calling `fn` throw? */
function threw(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

function img(src) {
  return `<img loading="lazy" src="${src}" alt="x" width="600" height="400">`;
}

/**
 * Run every assertion against a loaded config.
 *
 * Returns the per-group pass/fail so scenario B can require the angle group to
 * FLIP while the width group holds. `record` is the reporter: the real run
 * prints and counts, the mutation run only tallies.
 */
function assertions({ filters, transforms }, report) {
  const defaultSrc = filters.get('cloudinaryDefaultSrc');
  const srcset = filters.get('cloudinarySrcset');
  const transform = transforms.get('cloudinaryResponsive');
  const render = (html) => transform.call({}, html, 'dist/x/index.html');

  /**
   * Every assertion is a THUNK, and a throw scores as a failure.
   *
   * Both halves matter under mutation. Removing the angle group from the
   * transform's pattern also removes a capture, so the replace callback's
   * arguments shift by one and `after` arrives undefined -- the config throws
   * rather than returning a wrong answer. Evaluated eagerly, that exception
   * escaped `assertions` entirely and took the whole run down mid-scenario,
   * which reads as a broken fixture instead of as the detection it actually
   * is. A mutant that crashes the code under test IS caught; it just has to be
   * scored, not propagated.
   */
  const record = (group, name, fn) => {
    let ok = false;
    try {
      ok = fn() === true;
    } catch {
      ok = false;
    }
    report(group, name, ok);
  };

  // --- group: plain URLs still behave exactly as before --------------------
  record('plain', 'cloudinaryDefaultSrc pins a widthless URL to w_800',
    () => defaultSrc(`${BASE}q_auto,f_auto/${PATHSEG}`)
      === `${BASE}q_auto,f_auto,w_800/${PATHSEG}`);

  record('plain', 'cloudinarySrcset emits the four declared candidates',
    () => srcset(`${BASE}q_auto,f_auto/${PATHSEG}`).split(', ').length === 4);

  record('plain', 'the transform gives a plain <img> a srcset and a w_800 src',
    () => {
      const out = render(img(`${BASE}q_auto,f_auto/${PATHSEG}`));
      return out.includes('srcset="') && out.includes(`q_auto,f_auto,w_800/${PATHSEG}"`);
    });

  // --- group: ANGLE tolerated, and carried into every derivative -----------
  // The angle must survive into the candidates, not merely be accepted. A
  // regex that matched the angle and then dropped it would serve a correctly
  // sized picture lying on its side -- a worse bug than the one being fixed,
  // because it is visible to a visitor rather than only to a waterfall.
  record('angle', 'cloudinaryDefaultSrc preserves a_90, angle BEFORE width',
    () => defaultSrc(`${BASE}q_auto,f_auto,a_90/${PATHSEG}`)
      === `${BASE}q_auto,f_auto,a_90,w_800/${PATHSEG}`);

  record('angle', 'cloudinarySrcset carries a_90 into all four candidates',
    () => {
      const out = srcset(`${BASE}q_auto,f_auto,a_90/${PATHSEG}`).split(', ');
      return out.length === 4 && out.every((c) => c.includes('q_auto,f_auto,a_90,w_'));
    });

  record('angle', 'a negative angle (a_-90) is tolerated too',
    () => defaultSrc(`${BASE}q_auto,f_auto,a_-90/${PATHSEG}`)
      === `${BASE}q_auto,f_auto,a_-90,w_800/${PATHSEG}`);

  record('angle', 'the transform makes an angle-carrying <img> responsive',
    () => {
      const out = render(img(`${BASE}q_auto,f_auto,a_90/${PATHSEG}`));
      return out.includes('srcset="')
        && out.includes(`q_auto,f_auto,a_90,w_400/${PATHSEG} 400w`)
        && out.includes(`q_auto,f_auto,a_90,w_1920/${PATHSEG} 1920w`);
    });

  // --- group: WIDTH still rejected, in every shape -------------------------
  record('width', 'cloudinaryDefaultSrc throws on a width-carrying URL',
    () => threw(() => defaultSrc(`${BASE}q_auto,f_auto,w_1200/${PATHSEG}`)));

  record('width', 'cloudinarySrcset throws on a width-carrying URL',
    () => threw(() => srcset(`${BASE}q_auto,f_auto,w_1200/${PATHSEG}`)));

  // The shape an author writes by hand after learning the angle is accepted.
  record('width', 'cloudinaryDefaultSrc throws on the COMBINED a_90,w_600 shape',
    () => threw(() => defaultSrc(`${BASE}q_auto,f_auto,a_90,w_600/${PATHSEG}`)));

  record('width', 'cloudinarySrcset throws on the COMBINED a_90,w_600 shape',
    () => threw(() => srcset(`${BASE}q_auto,f_auto,a_90,w_600/${PATHSEG}`)));

  record('width', 'the transform leaves a width-carrying <img> alone',
    () => !render(img(`${BASE}q_auto,f_auto,a_90,w_600/${PATHSEG}`)).includes('srcset='));

  // --- group: the logo skip-rule is a PIN, not a pass-through --------------
  record('logo', 'a logo mark is pinned to w_192 and gets no srcset',
    () => {
      const out = render(img(`${BASE}q_auto,f_auto/v1768254526/CircleWhite2025_gqtclg.png`));
      return out.includes('q_auto,f_auto,w_192/') && !out.includes('srcset=');
    });
}

// ---------------------------------------------------------------------------
// Scenario A -- the config as shipped. Everything must pass.
// ---------------------------------------------------------------------------
console.log('\nA. the config as shipped\n');
assertions(loadConfig(null), (group, name, ok) => check(name, ok));

// ---------------------------------------------------------------------------
// Scenario B -- the angle group removed from the shared regex.
//
// This is the state the file was in before B7: `q_auto,f_auto/` exactly. The
// angle assertions MUST go red (that is the regression this fixture exists to
// catch) and the width assertions MUST stay green (relaxing the shape did not
// cost us the guard).
// ---------------------------------------------------------------------------
console.log('\nB. mutation -- angle tolerance removed from the shared regex\n');

const ANGLE_GROUP = '(,a_-?\\d+)?';
let mutationApplied = 0;
const mutated = loadConfig((source) => {
  const out = source.split(ANGLE_GROUP).join('');
  mutationApplied = (source.length - out.length) / ANGLE_GROUP.length;
  return out;
});

// Two sites: the shared CLOUDINARY_BARE regex and the transform's own pattern.
check('the mutation actually applied at both regex sites',
  mutationApplied === 2,
  `the angle group '${ANGLE_GROUP}' was removed ${mutationApplied} time(s), expected 2 -- `
  + `if that literal was reformatted, this fixture is no longer proving anything `
  + `and must be updated rather than ignored`);

const groups = { plain: [], angle: [], width: [], logo: [] };
assertions(mutated, (group, name, ok) => groups[group].push({ name, ok }));

const angleAllFailed = groups.angle.every((r) => !r.ok);
const widthAllPassed = groups.width.every((r) => r.ok);

check('mutation: EVERY angle assertion fails without the tolerance',
  angleAllFailed,
  `still green: ${groups.angle.filter((r) => r.ok).map((r) => r.name).join('; ')} -- `
  + `an assertion that passes with the feature removed is not testing the feature`);

check('mutation: every width guard still holds without the tolerance',
  widthAllPassed,
  `went red: ${groups.width.filter((r) => !r.ok).map((r) => r.name).join('; ')}`);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks\n`);
process.exit(failures === 0 ? 0 : 1);
