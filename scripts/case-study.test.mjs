#!/usr/bin/env node
/**
 * The case-study permission gate, under test.
 *
 *   npm run case-study:test
 *
 * WHAT IS AT STAKE. `src/_data/builds.js` decides whether a client's build --
 * his name, a description of his house, his words, photographs of his back
 * garden -- appears on a public website. He has not said yes. The whole feature
 * exists behind one boolean, and the failure mode is silent and irreversible in
 * the way that matters: nobody gets an error, the page simply renders, and it is
 * already in a search index before anyone notices. A unit test is the only thing
 * standing between a wrong `permission` string and that.
 *
 * FIVE GROUPS, AND WHY EACH IS A DIFFERENT KIND OF EVIDENCE.
 *
 *   G  the gate, as pure functions on synthetic inputs. Fast, exhaustive about
 *      the awkward values (`""`, absent, `"Named"`, `"named "`, a number, an
 *      array) that a real data file never contains and a real accident always
 *      does.
 *   P  production: what the shipped `dist/` actually contains, compared against
 *      what the data says should be publishable. G proves the function is right;
 *      P proves the function is the one the page consults.
 *   B  byte-identity: production HTML against a build of the merge-base with
 *      main. The strongest statement available today -- not "no case-study
 *      markup leaked" but "this feature changed nothing at all" -- and it is
 *      controlled by a DIFFERENT COMMIT, so no mutation of the working tree can
 *      move both sides of it.
 *   V  preview: the gated preview build, driven in a real browser. The unit has
 *      to exist and be correct, not merely be absent from production.
 *   M  markup: the house rules (no em dash, no heading inside a unit, alt on
 *      every image) on the rendered units.
 *
 * WHY THE SUITE BUILDS THE SITE ITSELF. It is run inside
 * `scripts/mutation-battery.mjs`, which copies the working tree into a
 * disposable worktree. That copy has no `dist/` and no `.case-study-preview/`,
 * and a suite that assumed one would pass there by measuring a stale tree
 * carried in from somewhere else -- which is the exact shape of a mutation
 * surviving. So it builds both trees, every run, from the code under test.
 *
 * IT IS SERIAL AND MUST NOT RUN CONCURRENTLY WITH ANOTHER DIST-READING SUITE.
 * It does `rm -rf dist` and rebuilds. `fonts:test`, `rhythm:test`,
 * `stacking:check` and `image-audit` all read `dist/`; running any of them
 * beside this one measures a directory being deleted underneath it.
 *
 * BOTH BUILDS GO THROUGH `node_modules/.bin/eleventy`, NEVER `npx`, for the
 * reason `scripts/lib/build-ref.mjs` records: npx will reach the network and
 * resolve a different Eleventy than the one this repo pins, and then the thing
 * measured is not the thing that deploys.
 *
 * AFTER A KILLED RUN (timeout, Ctrl-C), group B's `buildRef` may leave a temp
 * worktree registered in `.git`. Run `git worktree prune`.
 *
 * THE MUTATION TABLE: WHAT EACH MUTANT CHANGES, AND WHERE ITS CONTROL COMES FROM
 * -----------------------------------------------------------------------------
 * Run through `~/marvin/scripts/mutation-battery.mjs`, never a hand-rolled
 * script. Every mutant must be killed.
 *
 * THE JOURNAL RECORDS IDS, PATHS AND OUTCOMES -- NOT WHAT A MUTANT CHANGED. This
 * table is the only place a reader in a month can see that, so each entry says
 * three things in words: what it changes, what differs in the world when the code
 * is wrong that way, and which control catches it.
 *
 * The third part is the one that rots quietly. An expectation computed BY THE
 * CODE UNDER TEST moves with the mutation and can never fail, so each kill names
 * where its control actually comes from: a SPEC LITERAL (a value written from
 * doc 10 or from Lee's answers), or the BASELINE BUILD (a different commit, which
 * no mutation of this working tree can reach). A same-helper control is never a
 * mutant's only kill. A survivor is repaired by RE-DERIVING ITS CONTROL, never by
 * adding cases and never by waiving it.
 *
 * MUTANTS ARE AIMED AT BEHAVIOUR, NOT AT LINES. Each anchor targets the decision
 * itself -- a guard's condition, a gate's set test -- so that neutralising the
 * behaviour in any spelling is what the anchor catches, rather than one edit
 * someone happened to make. An anchor that no longer matches makes the battery
 * REFUSE, loudly; it never counts as a pass. (Mutant 7's anchor had to be
 * re-aimed once already, when the W2 fix rewrote its line.)
 *
 * 1. GATE BY INEQUALITY. `isPublishable` becomes `permission !== "pending"`
 *    instead of membership of the three-string set.
 *    Wrong-world: "", a missing field, a typo and the layout fixture all become
 *    publishable, so an unfinished record publishes because a field was absent.
 *    Killed by: G, spec literals on synthetic inputs ("", absent, "fixture");
 *    and P's "the fixture never reaches production" literal. NOT P's
 *    set-equality, whose two arms move together.
 *
 * 2. GATE CASE-FOLDS. `isPublishable` lower-cases `permission` before the set
 *    test.
 *    Wrong-world: "Named" publishes. A capital letter in a hand-edited data file
 *    silently becomes consent.
 *    Killed by: G, spec literal "Named".
 *
 * 3. THE /saunas/ LOOP STOPS TESTING `renderable` (`{% if true %}`).
 *    Wrong-world: the page stops filtering and hands every record to the macro.
 *    Killed by: B ONLY, both of its assertions, against the merge-base build --
 *    a different commit. CORRECTED after the W2 wrap (Razor batch-2 re-check):
 *    P's fixture-id literal NO LONGER fires here, because the macro now refuses a
 *    non-renderable build. What reaches dist is two EMPTY
 *    `<section class="case-study-slot">` elements -- the wrapper lives in the
 *    page, outside the macro -- so there is a real markup difference and no
 *    `#build-` id at all. Two guards in series, and only the outer one is visible
 *    to P.
 *
 * 4. THE RIBBON STOPS TESTING `!publishable`.
 *    Wrong-world: a build that publishes anyway wears "Draft. Not for
 *    publication." in preview, so the ribbon stops meaning "preview added this"
 *    and reviewers learn to ignore it.
 *    Killed by: G, a synthetic `named` build under preview expecting literal
 *    `null`.
 *
 * 5. THE DATA LIES: Clarke's `permission` is flipped to "named" in
 *    buildRecords.json.
 *    Wrong-world: a client's build publishes on the live site before he has
 *    answered. This is the actual accident the whole feature is built around.
 *    Killed by: B (baseline diff -- a different commit) and V (the unit must
 *    carry a ribbon: spec literal). NOT P, whose two arms agree: the data says
 *    publishable and dist agrees, so P sees a consistent world.
 *
 * 6. THE HOME PAGE STOPS TESTING `showPhotos` when picking its one unit.
 *    Wrong-world: the home slot is a plate slot, so it takes Clarke's text-only
 *    unit and the home page gets a case study with no photograph.
 *    Killed by: V, "exactly one brief and it is the fixture" (spec literal;
 *    relies on data order, Clarke first).
 *
 * 7. `displayName` STOPS SPECIAL-CASING `anonymous`.
 *    Wrong-world: a client who asked not to be named is named, under a unit whose
 *    whole promise was that he would not be.
 *    Killed by: G, literal "Private Residence".
 *
 * 8. `previewFlag` STOPS THROWING ON NETLIFY.
 *    Wrong-world: the preview flag set in the Netlify UI -- which no file in this
 *    repo can see -- builds unpublished client work onto a public URL.
 *    Killed by: G, expects a throw.
 *
 * 9. `renderable` BECOMES `preview` ALONE.
 *    Wrong-world: the inverse failure. Builds that DO have permission vanish from
 *    production, so the feature silently stops working the day it starts being
 *    used.
 *    Killed by: G, (named, preview false) -> literal true.
 *
 * 10. `showStory` STOPS SPECIAL-CASING `anonymous`.
 *     Wrong-world: a description of the home publishes under an answer that
 *     covered the name and the photographs but never the description -- and
 *     "Kitsilano, a front-yard sauna behind a tall hedge" identifies the house
 *     whether or not a name sits above it (Petra, Stage 0.3, flags 1-2).
 *     Killed by: G, literal false for `anonymous`. Live under the `renderable`
 *     AND, because `anonymous` IS publishable, so renderable is true there and
 *     the AND masks nothing.
 *
 * 11. THE MACRO'S `renderable` GUARD IS NEUTRALISED -- the anchor is the guard's
 *     CONDITION (`{%- if v.renderable -%}` -> `{%- if true -%}`), so any way of
 *     defeating it is the same mutant: wrap deleted, condition inverted, truthy
 *     default.
 *     Wrong-world: a template that calls the macro without testing `renderable`
 *     first publishes the index line and the credits ledger of a `pending` build
 *     -- the display name, the neighbourhood, the year, the footprint and six
 *     build facts. The story and the photographs stay withheld, so it is the
 *     identifying half that escapes.
 *     Killed by: N, literal ZERO BYTES. Nothing else moves: both real callers
 *     test `renderable`, so dist is unchanged and B, P and V stay green -- which
 *     is exactly why this pin had to be written down.
 *
 * 12. `view()` STOPS NULLING `displayName` FOR A NON-RENDERABLE BUILD -- the
 *     anchor is the nulling CONDITION (`const displayName = !renderable`), not
 *     the ternary under it, so it survives a reformat of the branch bodies.
 *     Wrong-world: a future template that prints `v.displayName` directly gets a
 *     client's name for a build that renders nothing.
 *     Killed by: G, literal null for a non-renderable build. Group N does NOT
 *     kill this: the macro wrap still suppresses the unit, so the name is
 *     computed and never printed. Two guards, two pins, deliberately.
 *
 * 13. THE STORY-ABSENT LINK BRANCH IS NEUTRALISED -- the anchor is the branch's
 *     CONDITION (`variant == "brief" and not (v.showStory and build.story)`), so
 *     removing the container, inverting the test or defaulting it false are one
 *     mutant.
 *     Wrong-world: a build published `anonymous` WITH photographs renders a brief
 *     unit of index -> plate and no way through to the full one. The unit becomes
 *     a picture with a label and no action -- which is what it did before Jen's
 *     Stage 3 ruling, and no real record in the data file exercises it, so
 *     nothing else in the suite would ever notice it going back.
 *     Killed by: N, "story absent: exactly one View the work link" and "the link
 *     is the last part of the article" -- both spec literals from Jen's ruling.
 *     Not visible to B, P or V: today's two records are `pending` and `fixture`,
 *     neither of which is an anonymous-with-photos build.
 *
 * COVERED BUT NOT MUTATED: `renderable` defaulted true in `view()`. Group N
 * reddens on it (a pending build would render) and so does G's "renderable:
 * pending without preview is false". Recorded as coverage rather than added as a
 * mutant, because it is the same blind spot as 11 and 12 and a third mutant there
 * would buy nothing.
 *
 * WHAT NO MUTANT COVERS, stated rather than left to be discovered: group M. Its
 * red evidence is a one-off -- an em dash put into the fixture story, which
 * reddens `no em dash in rendered prose` on both pages and nothing else.
 *
 * MUTANTS 11 AND 12 EXIST BECAUSE THEIR TARGETS ARE INVISIBLE TO EVERY OTHER
 * GROUP. Razor deleted both guards by hand in the batch-2 re-check and the suite
 * returned 87/87, exit 0, twice. A guard whose removal nothing notices is a
 * guard the next edit deletes. If either mutant ever SURVIVES, the pin has
 * stopped working -- repair it by re-deriving its control, never by waiving it.
 * stopped working -- repair it by re-deriving its control, never by waiving it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startServer } from './lib/server.mjs';
import { buildRef } from './lib/build-ref.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const { chromium } = require('playwright');
const nunjucks = require('nunjucks');

/**
 * The gate itself, required rather than re-implemented. A test that writes its
 * own copy of `isPublishable` proves that two copies of a mistake agree.
 */
const builds = require('./src/_data/builds.js');

const DIST = path.join(REPO_ROOT, 'dist');
const PREVIEW = path.join(REPO_ROOT, '.case-study-preview');
const ELEVENTY = path.join(REPO_ROOT, 'node_modules', '.bin', 'eleventy');

/**
 * The publishable set, written out AS LITERALS here rather than imported.
 * This is the control-provenance rule: an expectation derived from the code
 * under test moves with the mutation and can never fail. These three strings
 * come from doc 10 §7.2/§7.5(f) and from Lee's four answers (name x photos),
 * and they are the spec, not a computation.
 */
const PUBLISHABLE_LITERAL = new Set(['named', 'anonymous', 'name_only']);

let failures = 0;
let passes = 0;
const groupCounts = {};

function check(group, name, condition, detail) {
  groupCounts[group] = groupCounts[group] || { pass: 0, fail: 0 };
  if (condition) {
    passes += 1; groupCounts[group].pass += 1;
    process.stdout.write(`  PASS  [${group}] ${name}\n`);
  } else {
    failures += 1; groupCounts[group].fail += 1;
    process.stdout.write(`  FAIL  [${group}] ${name}\n        ${detail}\n`);
  }
}

/** Env for a build, with the preview flag explicitly present or explicitly
 *  absent. Never inherited: an ambient CASE_STUDY_PREVIEW in the developer's
 *  shell would otherwise turn the production build into a preview build and the
 *  suite would cheerfully measure it. */
function buildEnv(preview) {
  const env = { ...process.env };
  delete env.CASE_STUDY_PREVIEW;
  delete env.NETLIFY;
  if (preview) env.CASE_STUDY_PREVIEW = '1';
  return env;
}

function buildProduction() {
  if (!fs.existsSync(ELEVENTY)) throw new Error('Eleventy binary not found. Run `npm install` first.');
  execSync(`rm -rf "${DIST}" && "${ELEVENTY}"`, { cwd: REPO_ROOT, stdio: 'pipe', env: buildEnv(false) });
}

function buildPreview() {
  execSync(`rm -rf "${PREVIEW}" && "${ELEVENTY}" --output=.case-study-preview`,
    { cwd: REPO_ROOT, stdio: 'pipe', env: buildEnv(true) });
}

function htmlFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) out.push(full);
    }
  };
  walk(root);
  return out.sort();
}

/**
 * The ONE normalisation applied before group B compares bytes.
 *
 * `/styles.css?v=<hash>` and `/js/animations.js?v=<hash>` carry a content stamp.
 * B1 edited both files, so both stamps moved, and every page of both builds
 * differs in exactly those two substrings. Stripping the stamp is not a
 * weakening of the comparison: the claim under test is that the RENDERED MARKUP
 * did not change, and the stamp is a function of an asset this relay is allowed
 * to change. Everything else -- every tag, attribute, and character of text --
 * still has to match byte for byte.
 *
 * THE PATTERN NAMES THE TWO ASSETS AND ONLY THOSE TWO. It was written once as a
 * blanket `/\?v=[0-9a-f]+/g`, which is a different and much weaker gate: this
 * site stamps THIRTEEN assets, so the blanket form silently forgave a moved
 * stamp on `js/forms.js`, `js/data.js`, `js/map.js` and nine others -- and
 * Razor's batch-2 review proved it by editing `js/forms.js` and watching group B
 * stay green. Two files are what this relay touched; every other stamp moving is
 * a real difference and must fail. The capture group is what keeps the asset
 * name in the output, so two different assets can never normalise to the same
 * string.
 */
const STAMPED_BY_THIS_RELAY = /(\/styles\.css|\/js\/animations\.js)\?v=[0-9a-f]+/g;

function stripStamps(html) {
  return html.replace(STAMPED_BY_THIS_RELAY, '$1?v=STAMP');
}

/* ---------------------------------------------------------------- group G */

/** A synthetic record. Nothing here is read from the data file: these are the
 *  shapes an accident produces, and the data file by definition contains none
 *  of them today. */
function synth(over) {
  return Object.assign({
    id: 'synth',
    model: 'S2',
    display_name: 'Synth Residence',
    location: 'Nowhere',
    year: 2026,
    footprint: "5' x 7'",
    story: 'A paragraph about a house.',
    quote: null,
    hero: null,
    details: [],
    photos: false,
    permission: 'pending',
  }, over);
}

function groupG() {
  const { isPublishable, previewFlag, view } = builds;

  for (const p of ['named', 'anonymous', 'name_only']) {
    check('G', `isPublishable("${p}") is true`, isPublishable(synth({ permission: p })), 'expected true');
  }
  const rejects = [
    ['"pending"', synth({ permission: 'pending' })],
    ['"" (empty string)', synth({ permission: '' })],
    ['absent', (() => { const b = synth({}); delete b.permission; return b; })()],
    ['null', synth({ permission: null })],
    ['"Named" (case)', synth({ permission: 'Named' })],
    ['"named " (trailing space)', synth({ permission: 'named ' })],
    ['"fixture"', synth({ permission: 'fixture' })],
    ['"declined"', synth({ permission: 'declined' })],
    ['"anonymous-but-shown"', synth({ permission: 'anonymous-but-shown' })],
    ['7 (number)', synth({ permission: 7 })],
    ['["named"] (array)', synth({ permission: ['named'] })],
  ];
  for (const [label, rec] of rejects) {
    check('G', `isPublishable(${label}) is false`, isPublishable(rec) === false, 'expected false');
  }

  // Mutant 4: the ribbon marks what PREVIEW added. A build that publishes
  // anyway renders identically in both, so it wears nothing.
  check('G', 'named under preview has no ribbon',
    view(synth({ permission: 'named' }), true).ribbon === null,
    `got ${JSON.stringify(view(synth({ permission: 'named' }), true).ribbon)}, expected null`);

  check('G', 'pending under preview wears the draft ribbon',
    view(synth({ permission: 'pending' }), true).ribbon === 'Draft. Not for publication. Permission: pending',
    `got ${JSON.stringify(view(synth({ permission: 'pending' }), true).ribbon)}`);

  check('G', 'fixture under preview wears the fixture ribbon',
    view(synth({ permission: 'fixture' }), true).ribbon === 'Layout fixture. Site photographs standing in.',
    `got ${JSON.stringify(view(synth({ permission: 'fixture' }), true).ribbon)}`);

  // Mutant 7.
  check('G', 'anonymous is headed "Private Residence"',
    view(synth({ permission: 'anonymous' }), false).displayName === 'Private Residence',
    `got ${JSON.stringify(view(synth({ permission: 'anonymous' }), false).displayName)}`);
  check('G', 'named keeps its own display_name',
    view(synth({ permission: 'named' }), false).displayName === 'Synth Residence',
    'expected the record\'s display_name');

  const anonWithPhotos = synth({ permission: 'anonymous', photos: true, hero: 'stem' });
  const anonNoPhotos = synth({ permission: 'anonymous', photos: false, hero: 'stem' });
  check('G', 'anonymous shows photos iff photos === true',
    view(anonWithPhotos, false).showPhotos === true && view(anonNoPhotos, false).showPhotos === false,
    'expected true then false');

  check('G', 'name_only with a hero still shows no photos',
    view(synth({ permission: 'name_only', photos: true, hero: 'stem' }), false).showPhotos === false,
    'expected false: that answer said name, not pictures');

  check('G', 'photos:true with no image fields shows no photos',
    view(synth({ permission: 'named', photos: true }), false).showPhotos === false,
    'expected false');

  // showQuote, the one expression.
  const ph = { text: '[placeholder]', attribution: 'X', placeholder: true };
  const real = { text: 'It is warm.', attribution: 'X, Kitsilano' };
  const q = (permission, quote, preview) => view(synth({ permission, quote }), preview).showQuote;
  check('G', 'placeholder quote, pending, preview -> shown', q('pending', ph, true) === true, 'expected true');
  check('G', 'placeholder quote, pending, no preview -> hidden', q('pending', ph, false) === false, 'expected false');
  check('G', 'placeholder quote, named, no preview -> hidden', q('named', ph, false) === false, 'expected false');
  check('G', 'real quote under named -> shown', q('named', real, false) === true, 'expected true');
  check('G', 'real quote under name_only -> shown', q('name_only', real, false) === true, 'expected true');
  check('G', 'real quote under anonymous -> hidden', q('anonymous', real, false) === false,
    'a quote attributed by name is a name-bearing element');
  check('G', 'no quote object -> hidden', q('named', null, false) === false, 'expected false');

  // Mutant 9: renderable must not collapse to `preview` alone.
  check('G', 'renderable: named without preview is true',
    view(synth({ permission: 'named' }), false).renderable === true, 'expected true');
  check('G', 'renderable: pending without preview is false',
    view(synth({ permission: 'pending' }), false).renderable === false, 'expected false');
  check('G', 'renderable: pending with preview is true',
    view(synth({ permission: 'pending' }), true).renderable === true, 'expected true');

  // Mutant 10: a description of the home does not ride on an anonymous answer.
  const story = (permission, preview) => view(synth({ permission }), preview).showStory;
  check('G', 'showStory: named -> true', story('named', false) === true, 'expected true');
  check('G', 'showStory: name_only -> true', story('name_only', false) === true, 'expected true');
  check('G', 'showStory: anonymous -> false', story('anonymous', false) === false,
    'Petra flags 1-2: the anonymous answer does not cover a description of the home');
  check('G', 'showStory: anonymous under preview -> true', story('anonymous', true) === true, 'expected true');
  check('G', 'showStory: pending without preview -> false', story('pending', false) === false, 'expected false');

  // The view fails closed on its own (Razor N3): a caller that forgets to test
  // `renderable` gets an empty unit, not a client's story.
  const closed = view(synth({ permission: 'pending', photos: true, hero: 'stem', quote: real }), false);
  check('G', 'a non-renderable build shows nothing at all',
    closed.showStory === false && closed.showPhotos === false && closed.showQuote === false,
    `got ${JSON.stringify(closed)}`);
  // The display name is ABSENT, not merely unused, when the unit does not
  // render -- so a future template printing `v.displayName` directly gets
  // nothing rather than a client's name. Spec literal: null.
  check('G', 'a non-renderable build has no displayName at all',
    closed.displayName === null, `got ${JSON.stringify(closed.displayName)}`);
  check('G', 'a renderable build still has one',
    view(synth({ permission: 'named' }), false).displayName === 'Synth Residence',
    'expected the record\'s display_name');

  // Mutant 8: the Netlify interlock.
  let threw = false;
  try { previewFlag({ CASE_STUDY_PREVIEW: '1', NETLIFY: 'true' }); } catch { threw = true; }
  check('G', 'previewFlag throws when the flag is set on Netlify', threw,
    'a preview build on Netlify puts an unpublished client build on a public URL');
  check('G', 'previewFlag("1") is true', previewFlag({ CASE_STUDY_PREVIEW: '1' }) === true, 'expected true');
  check('G', 'previewFlag({}) is false', previewFlag({}) === false, 'expected false');
  check('G', 'previewFlag("true") is false', previewFlag({ CASE_STUDY_PREVIEW: 'true' }) === false,
    'the flag is the literal "1"; anything else is off');
}

/* ---------------------------------------------------------------- group N */

/**
 * THE REGRESSION PIN FOR THE `renderable` GUARD.
 *
 * `view()` fails closed and the macro refuses to render a build that is not
 * renderable. Both of those are guards for a caller that does not exist yet: the
 * two templates that call the macro today both test `b.view.renderable` first,
 * so DELETING EITHER GUARD CHANGES NOTHING THAT ANY PAGE RENDERS, and the whole
 * suite stayed green when Razor deleted them by hand (batch-2 re-check, W3).
 *
 * A guard whose removal nothing notices is a guard that will be removed. This
 * group is the thing that notices. It renders the macro DIRECTLY, through real
 * nunjucks, on a synthetic `pending` build, with no caller test in front of it --
 * which is precisely the third template the guard exists for, written down once
 * so it cannot be forgotten.
 *
 * The expected value is a spec literal: ZERO BYTES. Not "fewer facts", not "no
 * story" -- nothing at all.
 *
 * The vacuity control is the `named` render below. Without it, a loader that
 * silently returned the empty string for every template would pass every
 * assertion here, and this group would be decoration.
 */
function renderMacroDirectly(build, v, variant = 'full') {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(path.join(REPO_ROOT, 'src/_includes')),
    { autoescape: true }
  );
  // STUBS, AND WHAT THEY ARE AND ARE NOT. `macros/hero.njk` calls three filters
  // that `.eleventy.js` registers on the Eleventy environment, and they cannot
  // be imported out of it. They are stubbed here because the assertions in this
  // group are about WHICH PARTS RENDER AND IN WHAT ORDER -- a link's presence
  // and its position among its siblings -- and not about image URLs or
  // dimensions. Nothing here asserts anything a stub produces. The real filters
  // (including `heroAlt`, which THROWS on an empty alt) are exercised against
  // real builds by groups P, B and V, which is where that behaviour belongs.
  env.addFilter('heroWidths', () => [400, 800, 1200]);
  env.addFilter('heroDims', () => ({ w: 1200, h: 800 }));
  env.addFilter('heroAlt', (alt) => alt);
  const tpl = `{% import "macros/case-study.njk" as cs %}{{ cs.caseStudy(build, v, ${JSON.stringify(variant)}) }}`;
  return env.renderString(tpl, { build, v });
}

function groupN() {
  const { view } = builds;

  // The caller a future repo will contain: it does NOT test `renderable`.
  const pending = synth({
    permission: 'pending',
    display_name: 'Clarkeish Residence',
    location: 'Kitsilano, Vancouver',
    footprint: "7' x 7'",
    quote: { text: 'He said a thing.', attribution: 'Clarkeish, Kitsilano' },
  });
  const out = renderMacroDirectly(pending, view(pending, false)).trim();

  check('N', 'a pending build rendered with no caller test emits zero bytes',
    out === '', `emitted ${out.length} byte(s): ${JSON.stringify(out.slice(0, 200))}`);
  check('N', 'and therefore carries no unit id',
    !out.includes('id="build-'), 'a #build- id reached the output');
  for (const fact of ['Clarkeish Residence', 'Kitsilano', "7' x 7'", 'Homecraft', 'cedar']) {
    check('N', `and no client fact: ${JSON.stringify(fact)}`,
      !out.includes(fact), `"${fact}" reached the output`);
  }

  // VACUITY CONTROL. If this renders empty too, the three assertions above are
  // measuring a broken loader, not a working guard.
  const named = synth({ permission: 'named', display_name: 'Rendered Residence' });
  const namedOut = renderMacroDirectly(named, view(named, false)).trim();
  check('N', 'control: a named build DOES render through the same call',
    namedOut.includes('Rendered Residence') && namedOut.includes('id="build-synth"'),
    `the renderer produced ${namedOut.length} byte(s); if this is vacuous the pin above is too`);

  /* ---- Jen's Stage 3 ruling: where "View the work" lives ----
     The link is the brief unit's one action, and before the ruling it was a
     child of the story's container -- so an `anonymous` build with photographs,
     which renders no story, rendered a brief unit with no way through to the
     full one. These two pin both halves of the ruling, because only the
     story-present half was ever exercised by real data. */

  // Story ABSENT (anonymous: no story, no quote) with photographs. The link
  // becomes the LAST part of the article, in its own container.
  const anon = synth({
    permission: 'anonymous', photos: true,
    hero: 'stem', hero_alt: 'A sauna',
    details: [], display_name: 'Should Not Appear',
  });
  const anonOut = renderMacroDirectly(anon, view(anon, false), 'brief');
  const anonLinks = (anonOut.match(/case-study__more/g) || []).length;
  check('N', 'story absent: exactly one "View the work" link',
    anonLinks === 1, `found ${anonLinks}`);
  check('N', 'story absent: no story renders (the premise of the ruling)',
    !anonOut.includes('case-study__story'), 'a story rendered under anonymous');
  // "Last part of the article": the link's container is the final element before
  // the closing tag. Compared as positions, so it cannot pass by coincidence.
  const linkPos = anonOut.indexOf('case-study__more');
  const closePos = anonOut.lastIndexOf('</article>');
  const afterLink = anonOut.slice(linkPos, closePos);
  check('N', 'story absent: the link is the last part of the article',
    linkPos > -1 && closePos > linkPos && !/<(img|p|dl|blockquote)\b/.test(afterLink),
    `content after the link: ${JSON.stringify(afterLink.replace(/\s+/g, ' ').slice(0, 160))}`);
  check('N', 'story absent: the link follows the plate',
    anonOut.indexOf('case-study__hero') > -1
      && anonOut.indexOf('case-study__hero') < linkPos,
    'expected index -> plate -> link');

  // Story PRESENT: unchanged -- the link stays inside the story's container.
  const briefNamed = synth({ permission: 'named', story: 'A paragraph about a house.' });
  const namedBrief = renderMacroDirectly(briefNamed, view(briefNamed, false), 'brief');
  const namedLinks = (namedBrief.match(/case-study__more/g) || []).length;
  check('N', 'story present: exactly one "View the work" link',
    namedLinks === 1, `found ${namedLinks}`);
  const storyPos = namedBrief.indexOf('case-study__story');
  const namedLinkPos = namedBrief.indexOf('case-study__more');
  // Inside the SAME container: no </div> between the paragraph and the link.
  check('N', 'story present: the link sits inside the story container',
    storyPos > -1 && namedLinkPos > storyPos
      && !namedBrief.slice(storyPos, namedLinkPos).includes('</div>'),
    'a container closed between the story and the link, so the link is no longer the story\'s');
}

/* ---------------------------------------------------------------- group P */

function groupP() {
  const records = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/_data/buildRecords.json'), 'utf8'));

  // PRECONDITION, and it fails loudly. If every record were publishable, the
  // set-equality below would compare two identical full sets and say nothing
  // whatever about the loop. The layout fixture is the permanent sentinel that
  // keeps this non-vacuous after the first real permission flip. Read with the
  // test's own literal set, never through isPublishable, which a mutation moves.
  const nonPublishable = records.filter((r) => !PUBLISHABLE_LITERAL.has(r.permission));
  check('P', 'precondition: at least one record is not publishable',
    nonPublishable.length > 0,
    'every record publishes, so the set-equality below is vacuous. The layout fixture is supposed to guarantee this.');

  const expectedIds = records.filter((r) => PUBLISHABLE_LITERAL.has(r.permission)).map((r) => r.id).sort();

  const files = htmlFiles(DIST);
  check('P', 'production build produced pages', files.length > 0, 'dist/ has no HTML');

  const foundIds = new Set();
  let ribbonFiles = [];
  let fixtureFiles = [];
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    for (const m of html.matchAll(/id="build-([a-z0-9-]+)"/g)) {
      if (!m[1].endsWith('-index')) foundIds.add(m[1]);
    }
    if (html.includes('case-study__ribbon')) ribbonFiles.push(path.relative(DIST, f));
    if (html.includes('build-fixture-layout')) fixtureFiles.push(path.relative(DIST, f));
  }
  const found = [...foundIds].sort();
  check('P', 'dist unit ids equal the publishable ids in the data',
    JSON.stringify(found) === JSON.stringify(expectedIds),
    `dist has [${found}], data says [${expectedIds}]`);

  // Mutant 1 and mutant 3's second kill: a literal, never a set relation, so
  // both arms cannot move together.
  check('P', 'no draft ribbon anywhere in production', ribbonFiles.length === 0,
    `ribbon markup in: ${ribbonFiles.join(', ')}`);
  check('P', 'the layout fixture never reaches production', fixtureFiles.length === 0,
    `fixture id in: ${fixtureFiles.join(', ')}`);

  for (const rel of ['netlify.toml', 'package.json']) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    check('P', `${rel} does not set CASE_STUDY_PREVIEW`, !text.includes('CASE_STUDY_PREVIEW'),
      'the flag belongs in a developer shell only');
  }
}

/* ---------------------------------------------------------------- group B */

function groupB() {
  const base = execFileSync('git', ['merge-base', 'HEAD', 'main'],
    { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-case-study-base-'));
  const baseDist = path.join(out, 'dist');
  try {
    buildRef(base, baseDist);

    const baseFiles = htmlFiles(baseDist).map((f) => path.relative(baseDist, f));
    const distFiles = htmlFiles(DIST).map((f) => path.relative(DIST, f));
    check('B', 'the two builds produce the same page set',
      JSON.stringify(baseFiles) === JSON.stringify(distFiles),
      `baseline ${baseFiles.length} pages, candidate ${distFiles.length}`);

    // Vacuity: a comparison of zero pages passes forever.
    check('B', 'the comparison covers a real page set', distFiles.length >= 18,
      `only ${distFiles.length} pages; the site had 18 at 680d137`);

    const differing = [];
    for (const rel of distFiles) {
      if (!baseFiles.includes(rel)) continue;
      const a = stripStamps(fs.readFileSync(path.join(baseDist, rel), 'utf8'));
      const b = stripStamps(fs.readFileSync(path.join(DIST, rel), 'utf8'));
      if (a !== b) differing.push(rel);
    }
    check('B', `production HTML is byte-identical to ${base.slice(0, 7)} after stamp strip`,
      differing.length === 0,
      `${differing.length} page(s) differ: ${differing.slice(0, 5).join(', ')}`);

    // A separate, additional assertion -- not a replacement for the identity
    // above, which is the one controlled by a different commit.
    const leaked = distFiles.filter((rel) => fs.readFileSync(path.join(DIST, rel), 'utf8').includes('case-study'));
    check('B', 'no case-study markup in any production page', leaked.length === 0,
      `found in: ${leaked.join(', ')}`);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------- groups V, M */

/**
 * `page.$eval` THROWS when its selector matches nothing, and a throw here lands
 * in the outer catch and cancels every later assertion in the group -- so one
 * missing element reports as a single ERROR and hides twenty-nine results that
 * were never run. That is the worst possible shape for a gate: the output gets
 * SHORTER when more is wrong. This returns `null` instead, and each check then
 * fails on its own terms and says which element was absent. (Razor N2, batch 2.)
 */
async function evalOne(page, selector, fn) {
  const handle = await page.$(selector);
  if (!handle) return null;
  return handle.evaluate(fn);
}

/** The index line, composed from the DATA, not read back from the page and not
 *  written as a literal that would have to be edited every time a fact does. */
function expectedIndex(record, displayName) {
  return [displayName, record.year, record.location, record.footprint].join(' · ');
}

async function groupsVandM() {
  const records = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/_data/buildRecords.json'), 'utf8'));
  const clarke = records.find((r) => r.id === 'clarke');
  const fixture = records.find((r) => r.id === 'fixture-layout');
  check('V', 'the data still holds the clarke and fixture-layout records',
    Boolean(clarke) && Boolean(fixture), 'one of the two records is gone');
  if (!clarke || !fixture) return;

  const site = await startServer(PREVIEW);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    /* ---- /saunas/ at 1440 ---- */
    await page.goto(`${site.url}/saunas/`, { waitUntil: 'load' });

    const units = await page.$$eval('article.case-study', (els) => els.map((e) => e.id));
    check('V', '/saunas/ renders both units in data order',
      JSON.stringify(units) === JSON.stringify(['build-clarke', 'build-fixture-layout']),
      `got [${units}]`);

    for (const id of ['build-clarke', 'build-fixture-layout']) {
      const ribbon = await evalOne(page, `#${id}`, (el) => {
        const r = el.querySelector('.case-study__ribbon');
        return r ? r.textContent.trim() : null;
      });
      check('V', `${id} wears a ribbon in preview`, Boolean(ribbon), 'no .case-study__ribbon in the unit');
    }
    check('V', 'clarke\'s ribbon names the pending permission',
      (await evalOne(page, '#build-clarke .case-study__ribbon', (e) => e.textContent.trim()))
        === 'Draft. Not for publication. Permission: pending', 'ribbon text differs or the ribbon is absent');

    // Clarke: text only.
    const clarkeShape = (await evalOne(page, '#build-clarke', (el) => {
      const idx = el.querySelector('.case-study__index');
      return {
        heroes: el.querySelectorAll('.case-study__hero').length,
        details: el.querySelectorAll('.case-study__details').length,
        quotes: el.querySelectorAll('.case-study__quote').length,
        placeholderQuotes: el.querySelectorAll('.case-study__quote--placeholder').length,
        rows: el.querySelectorAll('.case-study__credit-row').length,
        index: idx ? idx.textContent.trim() : null,
        labelledby: el.getAttribute('aria-labelledby'),
        indexId: idx ? idx.id : null,
      };
    })) || { absent: true };
    check('V', 'clarke has no hero plate', clarkeShape.heroes === 0, `got ${clarkeShape.heroes}`);
    check('V', 'clarke has no detail pair', clarkeShape.details === 0, `got ${clarkeShape.details}`);
    check('V', 'clarke has one placeholder quote',
      clarkeShape.quotes === 1 && clarkeShape.placeholderQuotes === 1,
      `got ${clarkeShape.quotes} quote(s), ${clarkeShape.placeholderQuotes} placeholder(s)`);
    check('V', 'clarke has six credit rows', clarkeShape.rows === 6, `got ${clarkeShape.rows}`);
    check('V', 'clarke\'s index line is composed from the data',
      clarkeShape.index === expectedIndex(clarke, clarke.display_name),
      `page: ${JSON.stringify(clarkeShape.index)}\n        data: ${JSON.stringify(expectedIndex(clarke, clarke.display_name))}`);
    check('V', 'clarke\'s article is named by its index line',
      clarkeShape.labelledby === clarkeShape.indexId && clarkeShape.indexId === 'build-clarke-index',
      `aria-labelledby=${clarkeShape.labelledby}, index id=${clarkeShape.indexId}`);

    // The index line is uppercased by CSS, not in the data -- so the assertion
    // above compares the source case and this one proves the transform.
    check('V', 'the index line is uppercased by the stylesheet',
      (await evalOne(page, '#build-clarke .case-study__index', (e) => getComputedStyle(e).textTransform)) === 'uppercase',
      'expected text-transform: uppercase, or the index line is absent');

    // The fixture: plate, pair, three rows.
    const fixShape = (await evalOne(page, '#build-fixture-layout', (el) => {
      const idx = el.querySelector('.case-study__index');
      return {
        heroes: el.querySelectorAll('.case-study__hero').length,
        figures: el.querySelectorAll('.case-study__details figure').length,
        captions: el.querySelectorAll('.case-study__details figcaption').length,
        rows: el.querySelectorAll('.case-study__credit-row').length,
        index: idx ? idx.textContent.trim() : null,
      };
    })) || { absent: true };
    check('V', 'the fixture has one hero plate', fixShape.heroes === 1, `got ${fixShape.heroes}`);
    check('V', 'the fixture has two figures with two captions',
      fixShape.figures === 2 && fixShape.captions === 2,
      `got ${fixShape.figures} figures, ${fixShape.captions} captions`);
    check('V', 'the fixture has three credit rows', fixShape.rows === 3, `got ${fixShape.rows}`);
    check('V', 'the fixture\'s index line is composed from the data',
      fixShape.index === expectedIndex(fixture, fixture.display_name),
      `page: ${JSON.stringify(fixShape.index)}`);

    // Every image the units reference must resolve, in the built tree AND back
    // in src/img: a built copy with no source is a file nobody can regenerate.
    const refs = await page.$$eval('article.case-study img', (imgs) => {
      const out = [];
      for (const img of imgs) {
        out.push(img.getAttribute('src'));
        const ss = img.getAttribute('srcset') || '';
        for (const c of ss.split(',')) {
          const u = c.trim().split(/\s+/)[0];
          if (u) out.push(u);
        }
      }
      return out;
    });
    check('V', 'the units reference images at all', refs.length > 0, 'no img refs found in either unit');
    const unresolved = refs.filter((r) => {
      const clean = r.split('?')[0];
      const built = path.join(PREVIEW, clean);
      const source = path.join(REPO_ROOT, 'src', clean);
      return !fs.existsSync(built) || !fs.existsSync(source);
    });
    check('V', 'every unit image resolves in the build and under src/img',
      unresolved.length === 0, `unresolved: ${[...new Set(unresolved)].join(', ')}`);

    /* ---- computed spacing, the thing stylelint cannot see ----
       Two declarations in batch 1 were dead in the cascade and `lint:css` said
       nothing, because a stylesheet's text and the value that reaches an element
       are different claims. These read the value that reached the element. */
    const spacing = async (width, height) => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(80);
      return page.evaluate(() => ({
        indexGap: getComputedStyle(document.querySelector('#build-clarke .case-study__index')).marginTop,
        pairGap: getComputedStyle(document.querySelector('#build-fixture-layout .case-study__details')).marginTop,
      }));
    };
    const at1440 = await spacing(1440, 900);
    const at768 = await spacing(768, 1024);
    const at390 = await spacing(390, 844);

    check('V', 'ribbon-to-index gap is 24px at 1440',
      at1440.indexGap === '24px', `got ${at1440.indexGap}`);
    check('V', 'ribbon-to-index gap is 24px at 768', at768.indexGap === '24px', `got ${at768.indexGap}`);
    check('V', 'ribbon-to-index gap is 24px at 390', at390.indexGap === '24px', `got ${at390.indexGap}`);
    check('V', 'part gap is 64px at 1440', at1440.pairGap === '64px', `got ${at1440.pairGap}`);
    check('V', 'part gap is 64px at 768', at768.pairGap === '64px', `got ${at768.pairGap}`);
    check('V', 'part gap is 48px at 390 (narrow branch)', at390.pairGap === '48px', `got ${at390.pairGap}`);

    /* ---- group M, on the rendered units ---- */
    await page.setViewportSize({ width: 1440, height: 900 });
    const markup = await page.$$eval('article.case-study', (els) => els.map((el) => ({
      id: el.id,
      emDash: (el.textContent || '').includes('—'),
      headings: el.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      imagesWithoutAlt: [...el.querySelectorAll('img')]
        .filter((i) => !(i.getAttribute('alt') || '').trim()).length,
    })));
    for (const u of markup) {
      check('M', `${u.id}: no em dash in rendered prose`, u.emDash === false,
        'DECISIONS 2026-09-04: no em dashes in rendered prose');
      check('M', `${u.id}: no heading element inside the unit`, u.headings === 0,
        `got ${u.headings}; doc 10 §7.3 keeps <h*> out of a unit`);
      check('M', `${u.id}: every image has non-empty alt`, u.imagesWithoutAlt === 0,
        `${u.imagesWithoutAlt} image(s) without alt`);
    }

    /* ---- the home page brief unit ---- */
    await page.goto(`${site.url}/`, { waitUntil: 'load' });
    const briefs = await page.$$eval('article.case-study--brief', (els) => els.map((e) => e.id));
    // Mutant 6: the home slot is a plate slot, so it takes the first renderable
    // build that actually HAS photographs -- not simply the first renderable one,
    // which today is Clarke's text-only unit.
    check('V', '/ has exactly one brief unit and it is the fixture',
      JSON.stringify(briefs) === JSON.stringify(['build-fixture-layout']),
      `got [${briefs}]`);

    if (briefs.length === 1) {
      const brief = (await evalOne(page, 'article.case-study--brief', (el) => ({
        heroes: el.querySelectorAll('.case-study__hero').length,
        stories: el.querySelectorAll('.case-study__story').length,
        quotes: el.querySelectorAll('.case-study__quote').length,
        details: el.querySelectorAll('.case-study__details').length,
        credits: el.querySelectorAll('.case-study__credits').length,
        more: el.querySelector('.case-study__more') ? el.querySelector('.case-study__more').getAttribute('href') : null,
      }))) || { absent: true };
      check('V', 'the brief unit is plate + story + link, with no pair or ledger',
        brief.heroes === 1 && brief.stories === 1 && brief.quotes === 0
        && brief.details === 0 && brief.credits === 0,
        JSON.stringify(brief));
      check('V', 'the brief unit links through to the full unit',
        brief.more === '/saunas/#build-fixture-layout', `href=${brief.more}`);
    }

    const homeMarkup = await page.$$eval('article.case-study', (els) => els.map((el) => ({
      id: el.id,
      emDash: (el.textContent || '').includes('—'),
      headings: el.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      imagesWithoutAlt: [...el.querySelectorAll('img')]
        .filter((i) => !(i.getAttribute('alt') || '').trim()).length,
    })));
    for (const u of homeMarkup) {
      check('M', `home ${u.id}: no em dash, no heading, alt on every image`,
        u.emDash === false && u.headings === 0 && u.imagesWithoutAlt === 0,
        JSON.stringify(u));
    }
  } finally {
    await browser.close();
    await site.close();
  }
}

/* ------------------------------------------------------------------- main */

(async () => {
  try {
    process.stdout.write('\ncase-study gate\n\n');

    process.stdout.write('G  the gate, pure\n');
    groupG();

    process.stdout.write('\nN  the macro, called with no caller test\n');
    groupN();

    process.stdout.write('\nP  production build\n');
    buildProduction();
    groupP();

    process.stdout.write('\nB  byte-identity against the merge-base\n');
    groupB();

    process.stdout.write('\nV/M  preview build\n');
    buildPreview();
    await groupsVandM();
  } catch (err) {
    failures += 1;
    process.stdout.write(`\n  ERROR  ${err.stack || err.message}\n`);
  }

  const per = Object.entries(groupCounts)
    .map(([g, c]) => `${g} ${c.pass}/${c.pass + c.fail}`).join('   ');
  process.stdout.write(`\n${per}\n${passes} passed, ${failures} failed\n`);
  process.exit(failures ? 1 : 0);
})();
