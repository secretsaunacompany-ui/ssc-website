#!/usr/bin/env node
/**
 * Fixtures for the DOM-integrity instrument.
 *
 *   npm run dom-integrity:test
 *
 * This instrument is the certificate for a whole change class — a restyle or a
 * typeface swap, where the pixel harness honestly cannot speak. If it is wrong,
 * "the DOM is unchanged" is wrong, and that claim is the entire basis on which
 * such a batch ships. So it gets the same treatment as the pixel harness: real
 * pages through the real browser, and a runnable mutation battery rather than a
 * story about one.
 *
 * The standing lesson from the pixel harness applies here too, and shapes the
 * fixtures: an instrument must be tested against material shaped like the
 * material it measures. These fixtures use real markup with attributes, nesting,
 * repeated siblings and inline code — not a bare div.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './lib/server.mjs';
import {
  extractFingerprint, diffTokens, describeToken, loadWhitelist, applyWhitelist,
  checkWhitelistSpecificity, applyRenameMap, staleRenames, partitionByScope,
  subtreeHash, findSubtreeHashes, checkSubtreeDeclarations, checkAddedDeclarations,
  MAX_SUBTREE_TOKENS, fingerprintsIdentical,
} from './lib/dom-fingerprint.mjs';
import * as realFingerprint from './lib/dom-fingerprint.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CONFIG_FILE = path.join(REPO_ROOT, 'scripts', 'dom-integrity.config.json');
const MUTANT_ROOT = path.join(REPO_ROOT, '.dom-integrity', 'mutants');

let failures = 0;
let passes = 0;
function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}
function expectThrows(name, fn, mustMention) {
  let msg = null;
  try { fn(); } catch (err) { msg = err.message; }
  if (msg === null) { failures += 1; process.stdout.write(`  FAIL  ${name}\n        expected an error\n`); return; }
  if (mustMention && !msg.toLowerCase().includes(mustMention.toLowerCase())) {
    failures += 1;
    process.stdout.write(`  FAIL  ${name}\n        error did not mention "${mustMention}": ${msg}\n`);
    return;
  }
  passes += 1; process.stdout.write(`  PASS  ${name}\n`);
}

// ------------------------------------------------------------------ fixtures

/** Realistic page: head links, nested sections, repeated cards, inline code. */
const PAGE = ({
  fontsLink = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant">',
  preconnects = '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  preloads = '',
  stamp = 'abc123def456',
  heading = 'Secret Sauna Company',
  bodyCopy = 'Hand-built saunas for the Sea to Sky corridor.',
  price = '$18,500',
  extraCard = '',
  reordered = false,
  reparent = false,
  inlineJs = 'window.SSC = window.SSC || {};',
  // The hero-intro shape, and it is built adversarially for delete-subtree: two
  // ATTRIBUTE-LESS <style> siblings under the same parent at the same ancestry
  // path, distinguishable only by their content, plus a <noscript> wrapping a
  // third. This is the real material — a `contains` entry has nothing to grip
  // here, which is exactly why the primitive exists.
  heroIntro = '',
} = {}) => {
  const card = (i) =>
    `<article class="card" data-index="${i}"><h3>Model ${i}</h3><p>Description for model ${i}.</p></article>`;
  // The RE-PARENTING case, and it is built to be adversarial: card 3 moves
  // inside the group wrapper without changing document order and without
  // changing any node's tag, attributes or text. Every token is byte-identical
  // and only its ANCESTRY differs, so the ancestry path in tokenKey is the only
  // thing that can see it.
  const cards = reparent
    ? `<div class="group">${card(1)}${card(2)}${card(3)}</div>`
    : `<div class="group">${card(1)}${card(2)}</div>${card(3)}`;
  const intro = `<p class="intro">${bodyCopy}</p>`;
  const priceEl = `<p class="price">${price}</p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
${preconnects}
<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>
${fontsLink}
${preloads}
<link rel="stylesheet" href="/styles.css?v=${stamp}">
<script>${inlineJs}</script>
</head><body>
<header class="site-header"><h1>${heading}</h1></header>
<main>
  <section id="hero">${heroIntro}${reordered ? priceEl + intro : intro + priceEl}</section>
  <section id="models">${cards}${extraCard}</section>
</main>
<footer><p>Built in Squamish, BC.</p></footer>
<script src="/js/init.js?v=${stamp}"></script>
</body></html>`;
};

async function fingerprint(browser, tmp, html, slug, width = 1440) {
  const site = path.join(tmp, slug);
  fs.mkdirSync(site, { recursive: true });
  fs.writeFileSync(path.join(site, 'index.html'), html);
  const server = await startServer(site);
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(extractFingerprint);
  } finally {
    await page.close();
    await server.close();
  }
}

/** The WP-1a-shaped whitelist, loaded through the real validator. */
function realWhitelist() {
  return loadWhitelist(CONFIG_FILE, JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
}

/** Run one comparison end to end and return the undeclared failures. */
function verdict(a, b, whitelist) {
  const { ops } = diffTokens(a, b);
  const { failures: undeclared, consumed } = applyWhitelist(ops, whitelist);
  return { ops, undeclared, consumed };
}

// ----------------------------------------------------------------- mutations

const MUTATIONS = [
  {
    name: 'D-m1  whitespace normalization widened to strip ALL whitespace',
    proves: 'normalization cannot silently merge distinct words',
    edits: { 'dom-fingerprint.mjs': [
      "const norm = (s) => String(s == null ? '' : s).replace(/\\s+/g, ' ').trim();",
      "const norm = (s) => String(s == null ? '' : s).replace(/\\s+/g, '').trim();"] },
    extraction: true,
    probe: async (m, f, wl, ctx) => m.diffTokens(
      await ctx.extract(m, PAGE({ bodyCopy: 'alpha beta' }), 'x1'),
      await ctx.extract(m, PAGE({ bodyCopy: 'alphabeta' }), 'x2')).ops.length,
  },
  {
    name: 'D-m2  text comparison dropped entirely (structure only)',
    proves: 'a reworded sentence is caught',
    edits: { 'dom-fingerprint.mjs': [
      "        tokens.push({ kind: isCode ? 'code' : 'text', path, tag, text });",
      '        continue;'] },
    extraction: true,
    probe: async (m, f, wl, ctx) => m.diffTokens(
      await ctx.extract(m, PAGE(), 'x3'),
      await ctx.extract(m, PAGE({ bodyCopy: 'Hand-built saunas for the Sea to Sky region.' }), 'x4')).ops.length,
  },
  {
    name: 'D-m3  attributes dropped from the element token',
    proves: 'an attribute change is caught',
    edits: { 'dom-fingerprint.mjs': [
      "        attrs: names.map((n) => `${n}=${JSON.stringify(attrs[n])}`).join(' '),",
      "        attrs: '',"] },
    extraction: true,
    probe: async (m, f, wl, ctx) => m.diffTokens(
      await ctx.extract(m, PAGE(), 'x5'),
      await ctx.extract(m, PAGE().replace('class="card" data-index="1"', 'class="card feature" data-index="1"'), 'x6')).ops.length,
  },
  {
    name: 'D-m4  volatile stripper widened to blank every URL query',
    proves: 'only the declared ?v= stamp is volatile, not arbitrary query state',
    edits: { 'dom-fingerprint.mjs': [
      "    out = out.replace(/\\?v=[0-9a-f]{6,}\\b/gi, '?v=CONTENT_HASH');",
      "    out = out.replace(/\\?[^\"'\\s]*/g, '');"] },
    extraction: true,
    probe: async (m, f, wl, ctx) => m.diffTokens(
      await ctx.extract(m, PAGE(), 'x7'),
      await ctx.extract(m, PAGE().replace('/js/init.js?v=abc123def456', '/js/init.js?debug=1'), 'x8')).ops.length,
  },
  {
    name: 'D-m5  font-hash stripper widened to drop the family name',
    proves: 'swapping to a DIFFERENT typeface still fails',
    edits: { 'dom-fingerprint.mjs': [
      "    out = out.replace(/(\\/fonts\\/[^\"'\\s]*?)\\.[0-9a-f]{8,}(\\.woff2?\\b)/gi, '$1$2');",
      "    out = out.replace(/\\/fonts\\/[^\"'\\s]+/gi, '/fonts/FONT');"] },
    extraction: true,
    probe: async (m, f, wl, ctx) => m.diffTokens(
      await ctx.extract(m, PAGE({ preloads: '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font">' }), 'x9'),
      await ctx.extract(m, PAGE({ preloads: '<link rel="preload" href="/fonts/helvetica-var.55112282293d.woff2" as="font">' }), 'x10')).ops.length,
  },
  {
    name: 'D-m6  whitelist count budget removed (unlimited consumption)',
    proves: 'a SECOND unexpected instance of a declared change still fails',
    edits: { 'dom-fingerprint.mjs': ['      if (budget[i] <= 0) continue;', ''] },
    probe: (m, f, wl) => m.applyWhitelist(f.twoPreconnectDeletionsPlusOne, wl).failures.length,
  },
  {
    name: 'D-m7  whitelist matches on tag alone (contains ignored)',
    proves: 'a whitelist entry cannot swallow an unrelated node of the same tag',
    edits: { 'dom-fingerprint.mjs': [
      '      if (!haystack.includes(e.contains)) continue;', ''] },
    probe: (m, f, wl) => m.applyWhitelist(f.unrelatedLinkDeletion, wl).failures.length,
  },
  {
    name: 'D-m10 rename normalization disabled',
    proves: 'a declared rename is actually applied, not just declared',
    edits: { 'dom-fingerprint.mjs': [
      '  if (map.size === 0) return { tokens, used };',
      '  return { tokens, used };'] },
    probe: (m, f) => m.diffTokens(
      m.applyRenameMap(f.base, f.renames).tokens, f.renamedPage).ops.length,
  },
  {
    name: 'D-m11 rename drops class tokens it does not know',
    proves: 'a smuggled extra class is not absorbed by the rename',
    edits: { 'dom-fingerprint.mjs': [
      '        if (!map.has(tok)) return tok;',
      "        if (!map.has(tok)) return '';"] },
    probe: (m, f) => m.diffTokens(
      m.applyRenameMap(f.basePlus, f.renames).tokens, f.renamedPlus).ops.length,
  },
  {
    name: 'D-m9  ancestry path dropped from tokenKey',
    proves: 're-parenting a node is caught (Razor: ops 4 -> 0 without the path)',
    edits: { 'dom-fingerprint.mjs': [
      "  return t.kind === 'element'\n    ? `E|${t.path}|${t.tag}|${t.attrs}`\n"
      + "    : `${t.kind === 'code' ? 'C' : 'T'}|${t.path}|${t.text}`;",
      "  return t.kind === 'element'\n    ? `E|${t.tag}|${t.attrs}`\n"
      + "    : `${t.kind === 'code' ? 'C' : 'T'}|${t.text}`;"] },
    probe: (m, f) => m.diffTokens(f.base, f.reparented).ops.length,
  },
  {
    name: 'D-m12 delete-subtree hash check disabled (tag + path alone)',
    proves: 'a declaration aimed at the WRONG attribute-less node consumes nothing',
    edits: { 'dom-fingerprint.mjs': [
      "          if (subtreeHash(slice, e.path) !== e.textHash) continue;", ''] },
    probe: (m, f) => m.applyWhitelist(
      m.diffTokens(f.heroAll, f.heroNoA).ops, f.wrongSubtreeEntry).failures.length,
  },
  {
    name: 'D-m13 class REMOVAL declaration treated as a no-op',
    proves: 'a declared `to: null` actually drops the token, not just declares it',
    edits: { 'dom-fingerprint.mjs': [
      '      }).filter((tok) => tok !== null).join(\' \');',
      "      }).map((tok) => (tok === null ? 'featured' : tok)).join(' ');"] },
    probe: (m, f) => m.diffTokens(
      m.applyRenameMap(f.withUtility, f.removals).tokens, f.withoutUtility).ops.length,
  },
  {
    name: 'D-m15 entry "kind" ignored (a code entry consumes elements too)',
    proves: 'a declaration written for an inline-code edit cannot swallow a node change',
    edits: { 'dom-fingerprint.mjs': [
      "      if (op.token.kind !== (e.kind || 'element')) continue;", ''] },
    // The entry declares a CODE edit but its substring happens to appear in an
    // ELEMENT's attributes. Shipped, kind refuses it and the node change fails
    // as undeclared. With kind ignored, the entry swallows a node it was never
    // written for -- the exact laundering `contains` specificity exists to stop,
    // reintroduced through the back door.
    probe: (m, f) => m.applyWhitelist(
      m.diffTokens(f.codeBefore, f.codeElementChanged).ops, f.kindConfusable).failures.length,
  },
  {
    name: 'D-m14 scope partitioning ignored (every entry active)',
    proves: 'an out-of-scope entry cannot top up another batch\'s budget',
    edits: { 'dom-fingerprint.mjs': [
      '  const active = whitelist.filter(applies);',
      '  const active = whitelist.slice();'] },
    // Two entries with the SAME `contains`, one scoped to this comparison and
    // one to a different batch, against TWO deletions. Shipped: only the
    // in-scope entry is active, its count of 1 is spent, and the second deletion
    // FAILS. Mutated: the stale entry's budget silently absorbs it and the run
    // goes green. 1 failure vs 0 — the difference is the whole scope mechanism.
    probe: (m, f) => m.applyWhitelist(f.twoSameShapeDeletions,
      m.partitionByScope(f.scopedPair, 'aaaaaaa', 'bbbbbbb').active).failures.length,
  },
  {
    name: 'D-m17 descendant activation disabled (the proven clause ignored)',
    proves: 'an entry whose tip moved on, with markup PROVEN identical, still certifies',
    edits: { 'dom-fingerprint.mjs': [
      '    return descendantOk.has(c);',
      '    return false;'] },
    // Shipped: the caller has proven descent and markup identity, so the entry
    // activates and the run can certify the tip that is actually merging.
    // Mutated: it goes inert, every comparison it covered reports undeclared,
    // and we are back to hand re-pointing an entry that is stale on arrival.
    probe: (m, f) => m.partitionByScope(f.descEntry, f.descBase, f.descTip,
      { descendantOk: new Set([f.descEnd]) }).active.length,
  },
  {
    name: 'D-m18 fingerprint identity stops comparing token CONTENT',
    proves: 'identity reads the markup, not just how much of it there is',
    edits: { 'dom-fingerprint.mjs': [
      '      if (tokenKey(a[i]) !== tokenKey(b[i])) {',
      '      if (false) {'] },
    // The half that makes descent SAFE, and it is probed with a REWORDED page
    // rather than an added node on purpose: a changed word leaves the token
    // count untouched, so the cheap length check cannot see it and only real
    // content comparison can. Mutated, a descendant whose copy changed reads as
    // identical and the entry activates over markup it never described --
    // which is the whole failure mode descent could have introduced.
    probe: (m, f) => m.fingerprintsIdentical(f.printsA, f.printsReworded).identical,
  },
  {
    name: 'D-m20 cap enforcement bypassed on the ADD path',
    proves: 'the cap governs additions too, and not merely by sharing a code path',
    // D-m16 aims at the same enforcement site from the DELETE direction. Both
    // exist on purpose. The cap is enforced in shared code today, so one
    // mutation appears to cover both -- but "appears to" is the whole problem:
    // if the add path is ever given its own matcher (the obvious refactor the
    // moment the two directions need to differ), D-m16 keeps passing while the
    // add cap silently becomes a suggestion. This probe is aimed at the add
    // direction's OWN material so it fails the moment that happens.
    edits: { 'dom-fingerprint.mjs': [
      '      const maxLen = Math.min(MAX_SUBTREE_TOKENS, end - i);',
      '      const maxLen = Math.min(end - i, 100000);'] },
    // Shipped: the over-cap ADD entry matches nothing, so the whole run of
    // additions falls through undeclared -- many failures. Mutated: the cap
    // disappears, the oversized subtree is consumed whole, and 0 failures. An
    // entry larger than one component would start certifying itself.
    probe: (m, f) => m.applyWhitelist(
      m.diffTokens(f.capNone, f.capOver).ops, f.capOverAddEntry).failures.length,
  },
  {
    name: 'D-m21 add-subtree stops checking the hash (tag + path alone)',
    proves: 'an add declaration aimed at the WRONG node consumes nothing',
    edits: { 'dom-fingerprint.mjs': [
      '          if (subtreeHash(slice, e.path) !== e.textHash) continue;',
      '          if (false) continue;'] },
    // The add-path twin of D-m12. Shipped, an entry whose hash names subtree A
    // cannot consume subtree B even though tag and path match exactly -- which
    // is the only thing separating two attribute-less siblings. Mutated, the
    // first slice that fits the path is claimed and the declaration means
    // nothing beyond "something of this tag appeared somewhere under here".
    probe: (m, f) => m.applyWhitelist(
      m.diffTokens(f.capNone, f.capOther).ops, f.capAddEntry).failures.length,
  },
  {
    name: 'D-m22 the add-subtree staleness mirror deleted',
    proves: 'a hand-written add hash is refused before any verdict rests on it',
    edits: { 'dom-fingerprint.mjs': [
      "  return checkSubtreeSide(whitelist, candidatePrints, 'add-subtree', 'candidate');",
      '  return [];'] },
    // Without the mirror an add entry can name a node the candidate never
    // contained and simply go quiet: it consumes nothing, and the only signal
    // left is the generic "never matched anywhere" staleness line, which does
    // not distinguish "your hash is wrong" from "the addition did not happen".
    // Shipped: 1 problem, named. Mutated: 0.
    probe: (m, f) => m.checkAddedDeclarations(f.capBogusAddEntry, f.capPrints).length,
  },
  {
    name: 'D-m19 the vacuity guard removed (empty compares as identical)',
    proves: 'a comparison that measured nothing cannot certify identity',
    edits: { 'dom-fingerprint.mjs': [
      '  if (aPrints.size === 0 || bPrints.size === 0) {',
      '  if (false) {'] },
    // Shipped: false. Mutated: true — and a `true` here activates a whitelist
    // entry against a build that produced no pages at all. Cheap to probe and
    // it needs no fixture, which is the point: the guard is one line and
    // without this the one line could be deleted by anyone and nothing would
    // go red.
    probe: (m) => m.fingerprintsIdentical(new Map(), new Map()).identical,
  },
  {
    name: 'D-m16 MAX_SUBTREE_TOKENS collapsed back to a tiny cap',
    proves: 'the raised cap is what actually lets a whole component be declared as one deletion',
    // Aimed at the ENFORCEMENT site, not at the constant's declaration. An
    // anchor of `const MAX_SUBTREE_TOKENS = 400;` would be a third functional
    // copy of the number -- it would have to be edited in lockstep with any
    // future retune, and the cap value is supposed to live in exactly two
    // places: the constant and Z20.
    edits: { 'dom-fingerprint.mjs': [
      '      const maxLen = Math.min(MAX_SUBTREE_TOKENS, end - i);',
      '      const maxLen = Math.min(4, end - i);'] },
    // Z18's material: a subtree of ~121 tokens, correctly declared and hashed.
    // Shipped, the cap is 400 and it is consumed whole -- 0 failures. Mutated
    // to 4, the slice search can never reach the subtree's length, the entry
    // matches nothing and the whole run of removals falls through as
    // undeclared. This is the mutation that stops the cap being a number
    // nobody's tests touch: without it, 400 could be edited to anything and
    // only Z20's equality assertion would notice, which proves the constant is
    // written down rather than that it does anything.
    probe: (m, f) => m.applyWhitelist(
      m.diffTokens(f.capUnder, f.capNone).ops, f.capEntry).failures.length,
  },
  {
    name: 'D-m8  document order ignored (tokens sorted)',
    proves: 'a reordered section is caught',
    edits: { 'dom-fingerprint.mjs': [
      '  let start = 0;',
      '  baseline = baseline.slice().sort((x, y) => tokenKey(x) < tokenKey(y) ? -1 : 1);\n'
      + '  candidate = candidate.slice().sort((x, y) => tokenKey(x) < tokenKey(y) ? -1 : 1);\n'
      + '  let start = 0;'] },
    probe: (m, f) => m.diffTokens(f.base, f.reordered).ops.length,
  },
];

async function loadMutant(id, edits) {
  const dir = path.join(MUTANT_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  let src = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'lib', 'dom-fingerprint.mjs'), 'utf8');
  const edit = edits['dom-fingerprint.mjs'];
  if (edit) {
    if (!src.includes(edit[0])) {
      throw new Error(`mutation ${id}: anchor not found. The code moved; re-aim the mutation. `
        + `An un-applied mutation must never look like a pass.`);
    }
    src = src.replace(edit[0], edit[1]);
  }
  fs.writeFileSync(path.join(dir, 'dom-fingerprint.mjs'), src);
  return import(pathToFileURL(path.join(dir, 'dom-fingerprint.mjs')).href);
}

// ---------------------------------------------------------------------- main

async function main() {
  const whitelist = realWhitelist();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-dom-integrity-test-'));
  const browser = await chromium.launch();
  try {
    const fp = (html, slug, width) => fingerprint(browser, tmp, html, slug, width);

    process.stdout.write('\nA — a pure font/CSS swap PASSES (the whole point)\n');
    const before = await fp(PAGE(), 'before');
    const afterFonts = await fp(PAGE({
      fontsLink: '',
      preconnects: '<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>'
        .replace('<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>', ''),
      preloads: '<link rel="preload" href="/fonts/cormorant-garamond-var.16b298e9dcfa.woff2" '
        + 'as="font" type="font/woff2" crossorigin>'
        + '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font" '
        + 'type="font/woff2" crossorigin>',
      stamp: 'ffff9999aaaa',   // styles.css changed, so its content hash moved
    }), 'after-fonts');
    {
      const v = verdict(before, afterFonts, whitelist);
      check('A1 a font swap + restyle leaves NO undeclared change',
        v.undeclared.length === 0,
        `expected everything consumed by the whitelist, got:\n        `
        + v.undeclared.map((f) => `${f.op}: ${describeToken(f.token)}`).join('\n        '));
      check('A2 the changed ?v= content stamp did not register',
        !v.ops.some((o) => o.token.kind === 'element' && o.token.attrs.includes('styles.css')),
        'the cache stamp is volatile by declaration; it must not appear as a diff');
      check('A3 the whitelist actually consumed the declared deletions',
        [...v.consumed.values()].reduce((a, b) => a + b, 0) >= 3,
        `expected the fonts link + 2 preconnects consumed, got ${JSON.stringify([...v.consumed])}`);
    }

    process.stdout.write('\nB — a content change FAILS, and says which node\n');
    {
      const reworded = await fp(PAGE({ bodyCopy: 'Hand-built saunas for the Sea to Sky region.' }), 'reworded');
      const v = verdict(before, reworded, whitelist);
      check('B1 one changed word fails',
        v.undeclared.length > 0, 'a reworded sentence must not pass');
      check('B2 the failure names the changed text and its node',
        v.undeclared.some((f) => /region|corridor/.test(f.describe ? f.describe : describeToken(f.token))
          && /intro|<p>/.test(describeToken(f.token))),
        `expected a message naming the word and the <p>, got:\n        `
        + v.undeclared.map((f) => describeToken(f.token)).join('\n        '));

      const priced = await fp(PAGE({ price: '$18,600' }), 'priced');
      check('B3 a changed price fails',
        verdict(before, priced, whitelist).undeclared.length > 0,
        'the instrument certifies copy, and a price is copy');
    }

    process.stdout.write('\nC — a structural change FAILS\n');
    {
      const reordered = await fp(PAGE({ reordered: true }), 'reordered');
      const v = verdict(before, reordered, whitelist);
      check('C1 reordering two elements fails',
        v.undeclared.length > 0,
        'document order is load-bearing: the same nodes in a different order is a different page');

      const added = await fp(PAGE({
        extraCard: '<article class="card" data-index="4"><h3>Model 4</h3><p>Description for model 4.</p></article>',
      }), 'added');
      check('C2 an added element fails',
        verdict(before, added, whitelist).undeclared.length > 0, 'a new node is a change');

      const attrChanged = await fp(PAGE({ heading: 'Secret Sauna Company' })
        .replace('class="site-header"', 'class="site-header is-compact"'), 'attr');
      const av = verdict(before, attrChanged, whitelist);
      check('C3 an attribute change outside the volatile list fails',
        av.undeclared.length > 0,
        `a class change is a real change. got ${av.undeclared.length} failures`);

      const reparented = await fp(PAGE({ reparent: true }), 'reparent');
      const rv = verdict(before, reparented, whitelist);
      check('C5 an element promoted into a different parent fails',
        rv.undeclared.length > 0,
        `card 3 moved inside the group wrapper. Document order is unchanged and every `
        + `node's tag, attributes and text are identical -- only ancestry differs, which `
        + `is precisely what the path in tokenKey exists to catch. `
        + `got ${rv.undeclared.length} failures`);
      check('C5 the failure names the re-parented node',
        rv.undeclared.some((f) => describeToken(f.token).includes('data-index="3"')
          || describeToken(f.token).includes('Model 3')),
        `expected the moved card named, got:\n        `
        + rv.undeclared.map((f) => describeToken(f.token)).join('\n        '));

      const jsChanged = await fp(PAGE({ inlineJs: 'window.SSC = window.SSC || {}; window.X = 1;' }), 'js');
      check('C4 an inline script change fails',
        verdict(before, jsChanged, whitelist).undeclared.length > 0,
        'inline code is inside what this certifies, not outside it');
    }

    process.stdout.write('\nD — the whitelist consumes exactly what it declares\n');
    {
      // A SECOND unexpected deletion of the same shape must still fail: the
      // declared count is 2 preconnects, so a third disappearing one is a
      // change to the Cloudinary hint and must be caught.
      const overDeleted = await fp(PAGE({
        fontsLink: '',
        preconnects: '',   // all three gone, including Cloudinary
        preloads: '<link rel="preload" href="/fonts/cormorant-garamond-var.16b298e9dcfa.woff2" '
          + 'as="font" type="font/woff2" crossorigin>'
          + '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font" '
          + 'type="font/woff2" crossorigin>',
      }).replace('<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>', ''),
      'over-deleted');
      const v = verdict(before, overDeleted, whitelist);
      check('D1 a THIRD deleted preconnect is not swallowed by a count of 2',
        v.undeclared.length > 0,
        `the Cloudinary preconnect must survive; its deletion is undeclared. `
        + `got ${v.undeclared.length} failures`);
      check('D2 the surviving failure names the undeclared node',
        v.undeclared.some((f) => describeToken(f.token).includes('cloudinary')),
        `expected the Cloudinary hint named, got:\n        `
        + v.undeclared.map((f) => describeToken(f.token)).join('\n        '));

      // A third preload appearing is likewise undeclared (count is 2).
      const overPreloaded = await fp(PAGE({
        fontsLink: '', preconnects: '',
        preloads: '<link rel="preload" href="/fonts/cormorant-garamond-var.16b298e9dcfa.woff2" as="font" type="font/woff2" crossorigin>'
          + '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font" type="font/woff2" crossorigin>'
          + '<link rel="preload" href="/fonts/cormorant-garamond-italic-var.36e02675130e.woff2" as="font" type="font/woff2" crossorigin>',
      }), 'over-preloaded');
      check('D3 a THIRD preload is not swallowed by a count of 2',
        verdict(before, overPreloaded, whitelist).undeclared.length > 0,
        'the italic face is deliberately not preloaded; its appearance is a change');
    }

    process.stdout.write('\nE — volatile normalization is narrow\n');
    {
      const fontRehashed = await fp(PAGE({
        fontsLink: '', preconnects: '',
        preloads: '<link rel="preload" href="/fonts/outfit-var.999999999999.woff2" as="font" type="font/woff2" crossorigin>',
      }), 'font-rehash');
      const fontOriginal = await fp(PAGE({
        fontsLink: '', preconnects: '',
        preloads: '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font" type="font/woff2" crossorigin>',
      }), 'font-orig');
      check('E1 the SAME font with a new content hash is not a change',
        diffTokens(fontOriginal, fontRehashed).ops.length === 0,
        'only the hash segment is volatile; a rebuild of the same face must be quiet');

      const differentFamily = await fp(PAGE({
        fontsLink: '', preconnects: '',
        preloads: '<link rel="preload" href="/fonts/helvetica-var.55112282293d.woff2" as="font" type="font/woff2" crossorigin>',
      }), 'font-diff');
      check('E2 a DIFFERENT font family IS a change',
        diffTokens(fontOriginal, differentFamily).ops.length > 0,
        'the family name is kept precisely so a typeface substitution cannot hide');
    }

    process.stdout.write('\nF — width independence\n');
    {
      const wide = await fp(PAGE(), 'w1440', 1440);
      const narrow = await fp(PAGE(), 'w390', 390);
      check('F1 the same markup at two widths fingerprints identically',
        diffTokens(wide, narrow).ops.length === 0,
        'this page is responsive by CSS only; a DOM difference by width would be a finding');
    }

    process.stdout.write('\nW — whitelist validation\n');
    {
      const bad = (patch) => () => loadWhitelist('t.json', { whitelist: [patch] });
      const ok = { op: 'removed', tag: 'LINK', contains: 'x', count: 1, reason: 'r',
        commit: 'c', range: 'aaaaaaa..bbbbbbb' };
      expectThrows('W1 a bad op is rejected', bad({ ...ok, op: 'changed' }), 'removed');
      expectThrows('W2 a missing tag is rejected', bad({ ...ok, tag: '' }), 'tag');
      expectThrows('W3 a missing "contains" is rejected', bad({ ...ok, contains: '' }), 'contains');
      expectThrows('W4 a zero count is rejected', bad({ ...ok, count: 0 }), 'count');
      expectThrows('W5 a missing reason is rejected', bad({ ...ok, reason: '' }), 'reason');
      expectThrows('W6 a missing commit is rejected', bad({ ...ok, commit: '' }), 'commit');
      expectThrows('W7 a non-array whitelist is rejected',
        () => loadWhitelist('t.json', { whitelist: {} }), 'must be an array');
      check('W8 the shipped whitelist loads and every entry is scoped',
        realWhitelist().length > 0 && realWhitelist().every((e) => /\.\./.test(e.range || '')),
        `every entry needs a range naming the comparison it belongs to; got `
        + `${JSON.stringify(realWhitelist().filter((e) => !e.range).map((e) => e.op))}`);
      check('W9 an unscoped entry is rejected',
        (() => { try {
          loadWhitelist('t.json', { whitelist: [{ op: 'removed', tag: 'LINK', contains: 'x',
            count: 1, reason: 'r', commit: 'c' }] });
          return false;
        } catch (e) { return /range/.test(e.message); } })(),
        'an entry with no scope is load-bearing forever');
      check('W10 out-of-scope entries are inert, not consuming',
        partitionByScope(realWhitelist(), 'deadbee', 'f00dcaf').active.length === 0,
        'a comparison nobody wrote an entry for must consume nothing');

      // N: an entry too lazy to identify its node is refused before any verdict
      // rests on it. `contains: "rel"` matches every <link> on the page.
      const prints = new Map([['/@1440', before]]);
      const empty = new Map([['/@1440', []]]);
      const lazy = loadWhitelist('t.json', { whitelist: [{
        op: 'removed', tag: 'LINK', contains: 'rel', count: 1,
        reason: 'lazy on purpose', commit: 'fixture', range: 'aaaaaaa..bbbbbbb',
      }] });
      const lazyProblems = checkWhitelistSpecificity(lazy, prints, empty);
      check('N1 a lazy "contains" is rejected',
        lazyProblems.length === 1,
        `"rel" matches every link; the entry must be refused. got `
        + `${JSON.stringify(lazyProblems)}`);
      check('N2 the rejection names the over-match',
        /matches \d+ <link> node\(s\)/.test(lazyProblems[0] || '')
        && lazyProblems[0].includes('declares'),
        `the message must say how many it matched and how many it declared, got `
        + `${JSON.stringify(lazyProblems[0])}`);
      check('N3 a specific "contains" is accepted',
        checkWhitelistSpecificity(loadWhitelist('t.json', { whitelist: [{
          op: 'removed', tag: 'LINK', contains: 'fonts.googleapis.com/css', count: 1,
          reason: 'r', commit: 'c', range: 'aaaaaaa..bbbbbbb',
        }] }), prints, empty).length === 0,
        'an entry that names exactly one node must pass');
      check('N4 the SHIPPED whitelist is specific enough',
        checkWhitelistSpecificity(realWhitelist().filter((e) => e.op !== 'rename'), prints, empty)
          .filter((x) => x.includes('LINK') || x.includes('link')).length === 0,
        'the config we ship must satisfy the check it enforces');
    }

    process.stdout.write('\nX — declared class renames\n');
    {
      const RENAMES = [{ op: 'rename', from: 'card', to: 'tile',
        range: 'aaaaaaa..bbbbbbb', reason: 'fixture', commit: 'fixture' }];
      const renamed = await fp(PAGE().replace(/class="card"/g, 'class="tile"'), 'renamed');
      const { tokens: normalized, used } = applyRenameMap(before, RENAMES);
      check('X1 a declared rename compares clean',
        diffTokens(normalized, renamed).ops.length === 0,
        `a declared old->new class token must not read as a diff. got `
        + `${JSON.stringify(diffTokens(normalized, renamed).ops.map((o) => describeToken(o.token)))}`);
      check('X2 the rename reports how many tokens it rewrote',
        used.get('card') === 3, `expected 3 rewrites, got ${used.get('card')}`);

      // An UNDECLARED class change on the same page must still fail.
      const alsoChanged = await fp(PAGE().replace(/class="card"/g, 'class="tile"')
        .replace('class="site-header"', 'class="site-header is-compact"'), 'renamed-plus');
      check('X3 an undeclared class change alongside a declared rename still fails',
        diffTokens(normalized, alsoChanged).ops.length > 0,
        'the map explains one vocabulary change, not every attribute delta');

      // A rename PLUS a smuggled extra class must fail NAMING the smuggled token.
      const smuggled = await fp(PAGE().replace(/class="card"/g, 'class="tile promoted"'), 'smuggled');
      const sm = diffTokens(normalized, smuggled).ops;
      check('X4 a rename plus a smuggled extra class fails',
        sm.length > 0, 'whole-token rewriting must not absorb an added sibling token');
      check('X5 the failure names the smuggled token',
        sm.some((o) => describeToken(o.token).includes('promoted')),
        `expected "promoted" named, got ${JSON.stringify(sm.map((o) => describeToken(o.token)))}`);

      check('X6 renaming is whole-token, never substring',
        (() => {
          const t = [{ kind: 'element', path: 'p', tag: 'DIV', attrs: 'class="card-wide"' }];
          return applyRenameMap(t, RENAMES).tokens[0].attrs === 'class="card-wide"';
        })(),
        'renaming `card` must not touch `card-wide`');

      check('X7 a rename whose class never occurs is flagged stale',
        staleRenames([{ from: 'ghost', to: 'x', reason: 'never happens' }], new Map()).length === 1,
        'dead declarations must not accumulate');
      check('X8 a rename that did occur is not flagged',
        staleRenames(RENAMES, used).length === 0, 'control');

      // ---- class REMOVAL: `to: null` ----
      // WP-1b deletes rhythm utilities (`grid-3--mt-2`, `heading--mb-2`, ...)
      // and `section--warm-glow` outright. That is a declared vocabulary change
      // like a rename, but there is no new name, and no `removed`-node entry can
      // express it: the ELEMENT survives, only one of its class tokens goes.
      const REMOVALS = [{ op: 'rename', from: 'featured', to: null,
        range: 'aaaaaaa..bbbbbbb', reason: 'fixture', commit: 'fixture' }];
      const withUtility = await fp(PAGE().replace(/class="card"/g, 'class="card featured"'), 'rm-before');
      const withoutUtility = await fp(PAGE(), 'rm-after');
      const { tokens: stripped, used: rmUsed } = applyRenameMap(withUtility, REMOVALS);
      check('X9 a declared class REMOVAL compares clean',
        diffTokens(stripped, withoutUtility).ops.length === 0,
        `dropping a declared token must leave the surviving classes intact. got `
        + `${JSON.stringify(diffTokens(stripped, withoutUtility).ops.map((o) => describeToken(o.token)))}`);
      check('X10 the removal reports how many tokens it dropped',
        rmUsed.get('featured') === 3, `expected 3 drops, got ${rmUsed.get('featured')}`);

      // The whole point of a DECLARATION: an UNDECLARED removal on the same
      // page still fails, and names the node whose class list shrank.
      const alsoStripped = await fp(PAGE().replace('class="intro"', 'class=""'), 'rm-undeclared');
      const us = diffTokens(stripped, alsoStripped).ops;
      check('X11 an undeclared class removal still fails',
        us.length > 0, 'the map explains one token, not every class that vanishes');
      check('X12 the failure names the node that lost a class',
        us.some((o) => describeToken(o.token).includes('intro')),
        `expected the <p class="intro"> named, got `
        + `${JSON.stringify(us.map((o) => describeToken(o.token)))}`);

      check('X13 a removal declaration whose token never occurs is flagged stale',
        staleRenames([{ from: 'ghost-utility', to: null, reason: 'never happens' }],
          new Map()).length === 1,
        'a dead removal declaration is as much a hole as a dead rename');

      expectThrows('X14 a non-null, non-token "to" is still rejected',
        () => loadWhitelist('t.json', { whitelist: [{ op: 'rename', from: 'a', to: 'not a token',
          range: 'aaaaaaa..bbbbbbb', reason: 'r', commit: 'c' }] }), 'to');
    }

    process.stdout.write('\nY — scope matching tolerates abbreviated shas (NOTE-1a)\n');
    {
      // THE BUG THIS PINS: a human writes 7-character shas into the config; the
      // runtime resolves refs to full 40-character shas. The guard clause used
      // to demand an exact match before the prefix-tolerant body could run, so
      // EVERY abbreviated entry went inert — measured on the shipped config,
      // where all six WP-1b rename declarations silently stopped applying.
      const abbrev = [{ op: 'rename', from: 'card', to: 'tile',
        range: '198bc0b..c208508', reason: 'fixture', commit: 'fixture' }];
      const full = ['198bc0b1f2a3c4d5e6f708192a3b4c5d6e7f8091',
        'c2085081f2a3c4d5e6f708192a3b4c5d6e7f8091'];
      check('Y1 a 7-char config range is ACTIVE against full runtime shas',
        partitionByScope(abbrev, full[0], full[1]).active.length === 1,
        'the config is written by a human in abbreviations; if that reads as out-of-scope '
        + 'the declarations are inert and the run reports them as somebody else\'s batch');
      check('Y2 a full-sha config range is ACTIVE against the same full shas',
        partitionByScope([{ ...abbrev[0], range: `${full[0]}..${full[1]}` }], full[0], full[1])
          .active.length === 1, 'the symmetric case must not regress');
      check('Y3 a range for a DIFFERENT comparison is still inert',
        partitionByScope(abbrev, `dead${full[0].slice(4)}`, full[1]).active.length === 0,
        'tolerance is about sha LENGTH, never about which comparison an entry belongs to');
      check('Y4 a candidate mismatch alone is enough to make an entry inert',
        partitionByScope(abbrev, full[0], `beef${full[1].slice(4)}`).active.length === 0,
        'both ends of the range must match, not just the baseline');

      // ---- DESCENDANT ACTIVATION (Razor CRITICAL-1) ----
      //
      // The problem it solves: an entry names one comparison `B..C`, and the
      // commit that re-points `..C` can only name its OWN PARENT, so the entry
      // is stale the instant it lands. Re-pointing by hand forever, always one
      // commit behind, is not a mechanism.
      //
      // The rule gains a second clause with TWO required halves, both supplied
      // as proof by the caller: the candidate is a git descendant of C, AND the
      // harness's own fingerprints of C and the candidate are identical. The
      // git half is environmental and is injected here; the fingerprint half is
      // a pure function and is tested below on real browser-built markup.
      const DESC_END = 'c0ffee1';
      const descEntry = [{ ...abbrev[0], range: `${full[0].slice(0, 7)}..${DESC_END}` }];
      const laterTip = `dddddd${full[1].slice(6)}`;

      check('Y5 a descendant with IDENTICAL markup activates the entry',
        partitionByScope(descEntry, full[0], laterTip,
          { descendantOk: new Set([DESC_END]) }).active.length === 1,
        'this is the whole mechanism: the tip moved past the range end, the markup did not, '
        + 'so the declaration still describes the comparison being run');

      check('Y6 a descendant whose MARKUP CHANGED does not activate',
        partitionByScope(descEntry, full[0], laterTip,
          { descendantOk: new Set() }).active.length === 0,
        'the caller proves identity or the entry stays inert. There is no "probably fine".');

      check('Y7 with no proof offered at all, behaviour is exactly as before',
        partitionByScope(descEntry, full[0], laterTip).active.length === 0,
        'the default path must be the old, strict one — a caller that does not opt in '
        + 'cannot be silently widened');

      check('Y8 descent NEVER relaxes the BASELINE end',
        partitionByScope(descEntry, `beef${full[0].slice(4)}`, laterTip,
          { descendantOk: new Set([DESC_END]) }).active.length === 0,
        'every measurement an entry carries — a subtree hash, a count — was taken against '
        + 'ONE baseline. Reading it against another is describing a document it never saw.');

      // The fingerprint half, on real markup rather than on a stub, because
      // this is the half that makes the mechanism self-verifying.
      const fpA = await fp(PAGE(), 'desc-a');
      const fpAgain = await fp(PAGE(), 'desc-a2');
      const fpMoved = await fp(PAGE({ extraCard: '<article class="card" data-index="9"></article>' }), 'desc-b');
      const prints = (t) => new Map([['/@1440', t], ['/about/@390', t]]);

      check('Y9 identical builds fingerprint identical',
        fingerprintsIdentical(prints(fpA), prints(fpAgain)).identical === true,
        `two builds of the same markup must compare identical, or the mechanism refuses `
        + `everything. got ${JSON.stringify(
          fingerprintsIdentical(prints(fpA), prints(fpAgain)).differences)}`);

      const moved = fingerprintsIdentical(prints(fpA), prints(fpMoved));
      check('Y10 one added node makes them NOT identical, and it says where',
        moved.identical === false && moved.differences.length > 0
        && /@/.test(moved.differences[0]),
        `a markup change between the range end and the tip is exactly what must block `
        + `activation, and the message must name the page. got `
        + `${JSON.stringify(moved.differences)}`);

      check('Y11 a page missing on one side is NOT identical',
        fingerprintsIdentical(prints(fpA), new Map([['/@1440', fpA]])).identical === false,
        'a page that exists on one side only is a difference, not an absence of evidence — '
        + 'fail closed');

      // Y13, the vacuity guard (Razor, B3 review). Y12 was already taken by the
      // descendant-activation check below it. Every loop in
      // fingerprintsIdentical is over the keys of the maps it was handed, so
      // two EMPTY maps fall straight through all of them and returned
      // identical:true — "I compared nothing and found no difference". In the
      // one caller that matters that answer activates a whitelist entry on the
      // strength of a build that produced no pages, which is the fail-OPEN
      // direction in a mechanism whose every other error path closes.
      {
        const vacuous = fingerprintsIdentical(new Map(), new Map());
        check('Y13 two EMPTY fingerprint sets are NOT identical',
          vacuous.identical === false && vacuous.differences.length === 1,
          'an empty comparison establishes nothing; it must never read as proof of identity. '
          + `got ${JSON.stringify(vacuous)}`);
        check('Y13b one empty side is NOT identical either',
          fingerprintsIdentical(new Map(), prints(fpA)).identical === false
          && fingerprintsIdentical(prints(fpA), new Map()).identical === false,
          'the guard has to hold in both directions, or the argument order decides the verdict');
      }

      // (b) from the reviewer's list, end to end: the entry is inert AND the
      // deletion it would have covered reports as undeclared.
      {
        const withModal = await fp(PAGE({ heroIntro: '<style>.x{color:red}</style>' }), 'desc-live');
        const withoutModal = await fp(PAGE(), 'desc-gone');
        const hash = findSubtreeHashes(withModal, 'html/body/main/section/style', 'STYLE')[0].hash;
        const decl = loadWhitelist('t.json', { whitelist: [{
          op: 'delete-subtree', tag: 'STYLE', path: 'html/body/main/section/style',
          textHash: hash, count: 1, reason: 'fixture', commit: 'fixture',
          range: `${full[0].slice(0, 7)}..${DESC_END}`,
        }] });
        const inert = partitionByScope(decl, full[0], laterTip, { descendantOk: new Set() });
        const verdict = applyWhitelist(diffTokens(withModal, withoutModal).ops, inert.active);
        check('Y12 an unactivated entry lets its own deletion fail as undeclared',
          inert.active.length === 0 && verdict.failures.length > 0,
          `inert must mean LOUD, not silent: the change the entry would have covered has to `
          + `surface as undeclared. got ${inert.active.length} active, `
          + `${verdict.failures.length} failures`);
      }
    }

    process.stdout.write('\nZ — delete-subtree declarations\n');
    {
      // Two attribute-less <style> siblings plus a <noscript> wrapping a third:
      // the hero-intro shape this primitive exists for.
      const STYLE_A = '<style>.hero-intro{opacity:0}</style>';
      const STYLE_B = '<style>.hero-mask{transform:none}</style>';
      const NOSCRIPT = '<noscript><style>.hero-intro{opacity:1}</style></noscript>';
      const withAll = await fp(PAGE({ heroIntro: STYLE_A + STYLE_B + NOSCRIPT }), 'z-all');
      const withoutA = await fp(PAGE({ heroIntro: STYLE_B + NOSCRIPT }), 'z-no-a');
      const withoutB = await fp(PAGE({ heroIntro: STYLE_A + NOSCRIPT }), 'z-no-b');
      const withoutNoscript = await fp(PAGE({ heroIntro: STYLE_A + STYLE_B }), 'z-no-ns');

      const HERO_PATH = 'html/body/main/section';
      const styleHashes = findSubtreeHashes(withAll, `${HERO_PATH}/style`, 'STYLE');
      const nsHashes = findSubtreeHashes(withAll, `${HERO_PATH}/noscript`, 'NOSCRIPT');
      check('Z0 the two attribute-less <style> siblings hash DIFFERENTLY',
        styleHashes.length === 2 && styleHashes[0].hash !== styleHashes[1].hash,
        `this is the whole premise: identical tag, no attributes, distinguishable only by `
        + `content. got ${JSON.stringify(styleHashes)}`);

      const entry = (hash, tag, p, extra = {}) => loadWhitelist('t.json', { whitelist: [{
        op: 'delete-subtree', tag, path: p, textHash: hash, count: 1,
        reason: 'fixture', commit: 'fixture', range: 'aaaaaaa..bbbbbbb', ...extra,
      }] });

      const declA = entry(styleHashes[0].hash, 'STYLE', `${HERO_PATH}/style`);
      check('Z1 a DECLARED subtree deletion passes',
        applyWhitelist(diffTokens(withAll, withoutA).ops, declA).failures.length === 0,
        `the declared <style> and its text are one deletion, consumed as one. got `
        + JSON.stringify(applyWhitelist(diffTokens(withAll, withoutA).ops, declA)
          .failures.map((f) => describeToken(f.token))));

      // THE CASE A `contains` ENTRY CANNOT DISTINGUISH: same tag, same path, no
      // attributes on either. Only the content hash separates them.
      const undeclaredSibling = applyWhitelist(diffTokens(withAll, withoutB).ops, declA);
      check('Z2 an UNDECLARED deletion of an identical-tag sibling still fails',
        undeclaredSibling.failures.length > 0,
        `entry A must not swallow sibling B: they differ only in content, which is exactly `
        + `what the hash reads. got ${undeclaredSibling.failures.length} failures`);
      // What the failure can and cannot say, stated honestly. The two element
      // tokens are byte-identical, so the diff is free to report either as the
      // removed one and the message names whichever it picked — the same
      // identical-siblings caveat already recorded on checkWhitelistSpecificity.
      // The load-bearing property is not WHICH node is named; it is that the
      // declaration could not launder the deletion: entry A consumed NOTHING,
      // so it is also reported stale, and a reviewer gets two signals.
      check('Z2b the declaration consumed nothing, so it is also flagged stale',
        (undeclaredSibling.consumed.get(0) || 0) === 0,
        `a deletion the entry does not describe must not spend the entry's budget. `
        + `consumed ${JSON.stringify([...undeclaredSibling.consumed])}`);

      // A hash aimed at the WRONG node is not a near-miss that degrades to a
      // count check — it matches nothing and the real deletion fails loudly.
      const wrongHash = entry(styleHashes[1].hash, 'STYLE', `${HERO_PATH}/style`);
      const wrong = applyWhitelist(diffTokens(withAll, withoutA).ops, wrongHash);
      check('Z3 a hash aimed at the wrong node fails loudly',
        wrong.failures.length > 0 && (wrong.consumed.get(0) || 0) === 0,
        `a delete-subtree entry either matches its node or consumes nothing; there is no `
        + `"close enough". got ${wrong.failures.length} failures, `
        + `consumed ${JSON.stringify([...wrong.consumed])}`);

      // NESTED subtree: <noscript> carrying an inner <style>. Deleting it is ONE
      // declaration, not two, and the inner node must not be left orphaned.
      const declNs = entry(nsHashes[0].hash, 'NOSCRIPT', `${HERO_PATH}/noscript`);
      const nsVerdict = applyWhitelist(diffTokens(withAll, withoutNoscript).ops, declNs);
      check('Z4 a nested subtree is ONE declaration, inner nodes included',
        nsVerdict.failures.length === 0 && nsVerdict.consumed.get(0) === 1,
        `the <noscript>, its inner <style> and that style's text are one deletion. got `
        + `${nsVerdict.failures.length} failures / consumed `
        + `${JSON.stringify([...nsVerdict.consumed])}`);

      // Count is exact, like every other entry: TWO deletions against a count of
      // 1 leave the second failing.
      const bothGone = await fp(PAGE({ heroIntro: NOSCRIPT }), 'z-none');
      check('Z5 count is exact — a second subtree deletion is not swallowed',
        applyWhitelist(diffTokens(withAll, bothGone).ops, declA).failures.length > 0,
        'a count is a budget for the node it names, not a licence for its siblings');

      // STALENESS, checked against the baseline before any verdict rests on it.
      const prints = new Map([['/@1440', withAll]]);
      check('Z6 an entry whose hash matches nothing in the baseline is flagged',
        checkSubtreeDeclarations(entry('deadbeefdeadbeef', 'STYLE', `${HERO_PATH}/style`),
          prints).length === 1,
        'a declaration about a node that does not exist cannot certify anything');
      check('Z6b the flag distinguishes a wrong hash from a wrong path',
        /node\(s\) of that tag do sit at that path/
          .test(checkSubtreeDeclarations(
            entry('deadbeefdeadbeef', 'STYLE', `${HERO_PATH}/style`), prints)[0] || ''),
        'the message must say whether the tag/path was found, so a reader knows which half '
        + 'of the declaration is wrong');
      check('Z7 a correctly measured entry is NOT flagged',
        checkSubtreeDeclarations(declA, prints).length === 0, 'control');

      // Validation.
      const okSub = { op: 'delete-subtree', tag: 'STYLE', path: 'html/head/style',
        textHash: 'abcdef0123456789', count: 1, reason: 'r', commit: 'c',
        range: 'aaaaaaa..bbbbbbb' };
      const badSub = (patch) => () => loadWhitelist('t.json', { whitelist: [{ ...okSub, ...patch }] });
      expectThrows('Z8 a missing path is rejected', badSub({ path: '' }), 'path');
      expectThrows('Z9 a missing textHash is rejected', badSub({ textHash: '' }), 'textHash');
      expectThrows('Z10 a non-hex textHash is rejected', badSub({ textHash: 'not-a-hash' }), 'textHash');
      expectThrows('Z11 a zero count is rejected', badSub({ count: 0 }), 'count');
      // ---- kind: an inline-code edit is declarable, and still exact ----
      // WP-1b reconciled booking-ops.html's own `:root` with the stylesheet's.
      // That is a CODE token changing, and `contains` used to be tested only
      // against attributes, so no entry in the vocabulary could name it.
      const codeBefore = await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#0f0f0f" };' }), 'z-code-a');
      const codeAfter = await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#0c0c0c" };' }), 'z-code-b');
      const codeDecl = loadWhitelist('t.json', { whitelist: [
        { op: 'removed', kind: 'code', tag: 'SCRIPT', contains: '#0f0f0f', count: 1,
          reason: 'fixture', commit: 'c', range: 'aaaaaaa..bbbbbbb' },
        { op: 'added', kind: 'code', tag: 'SCRIPT', contains: '#0c0c0c', count: 1,
          reason: 'fixture', commit: 'c', range: 'aaaaaaa..bbbbbbb' },
      ] });
      check('Z13 a declared inline-code edit is consumed',
        applyWhitelist(diffTokens(codeBefore, codeAfter).ops, codeDecl).failures.length === 0,
        `an inline <style>/<script> body edit must be declarable, got `
        + JSON.stringify(applyWhitelist(diffTokens(codeBefore, codeAfter).ops, codeDecl)
          .failures.map((f) => describeToken(f.token))));
      check('Z14 an UNDECLARED inline-code edit still fails',
        applyWhitelist(diffTokens(codeBefore,
          await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#ff0000" };' }), 'z-code-c'),
        ).ops, codeDecl).failures.length > 0,
        'the declaration names one value, not any value');
      check('Z15 a code entry does not consume an ELEMENT change',
        applyWhitelist(diffTokens(codeBefore,
          await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#0f0f0f" };' })
            .replace('class="site-header"', 'class="site-header is-compact"'), 'z-code-d'),
        ).ops, codeDecl).failures.length > 0,
        'kind is part of the identity, not decoration');
      expectThrows('Z16 an unknown "kind" is rejected',
        () => loadWhitelist('t.json', { whitelist: [{ op: 'removed', kind: 'node', tag: 'STYLE',
          contains: 'x', count: 1, reason: 'r', commit: 'c', range: 'aaaaaaa..bbbbbbb' }] }),
        'kind');
      check('Z17 the specificity check reads TEXT for a code entry',
        checkWhitelistSpecificity(loadWhitelist('t.json', { whitelist: [{
          op: 'removed', kind: 'code', tag: 'SCRIPT', contains: 'window', count: 1,
          reason: 'r', commit: 'c', range: 'aaaaaaa..bbbbbbb' }] }),
        new Map([['/@1440', codeBefore]]), new Map()).length === 0,
        'a code entry must be checked against the code it names, not against attributes it '
        + 'does not have — otherwise the laziest possible entry passes the laziness check');

      check('Z12 the specificity check ignores delete-subtree entries',
        checkWhitelistSpecificity(loadWhitelist('t.json', { whitelist: [okSub] }),
          prints, new Map()).length === 0,
        'a delete-subtree entry has no "contains" to be lazy with; the substring check must '
        + 'not fabricate a verdict about it');

      // ---- THE CAP, at both bounds ----
      //
      // MAX_SUBTREE_TOKENS went 64 -> 400 in B3, because the configurator modal
      // is a 355-token subtree and could not be declared at all under 64. A cap
      // raised to let one batch through is exactly the tuning-until-green move
      // this instrument exists to refuse, so the raised cap is proven here on
      // its own material rather than on that batch's: one subtree comfortably
      // UNDER the cap must certify, one OVER it must still fail loudly, and the
      // number itself is asserted so it cannot drift silently.
      //
      // These subtrees are sized RELATIVE to the constant, not to the literal
      // 400. Change the cap and the fixtures follow it; the only place the
      // number is written down is the constant and Z20's assertion.
      const bigSubtree = (n, tail = '') =>
        `<div class="big">${Array.from({ length: n }, (_, i) => `<p>Row ${i}</p>`).join('')}${tail}</div>`;
      const BIG_PATH = `${HERO_PATH}/div`;
      // span = 1 (the div) + 2 per <p> (element + text) + 1 per bare <hr>.
      const UNDER_N = 60;                                   // span 121
      const OVER_N = Math.ceil((MAX_SUBTREE_TOKENS + 40 - 2) / 2);
      const underHtml = bigSubtree(UNDER_N);
      const overHtml = bigSubtree(OVER_N, '<hr>');
      const withUnder = await fp(PAGE({ heroIntro: underHtml }), 'z-cap-under');
      const withOver = await fp(PAGE({ heroIntro: overHtml }), 'z-cap-over');
      const withoutBig = await fp(PAGE({ heroIntro: '' }), 'z-cap-none');
      const underMeasured = findSubtreeHashes(withUnder, BIG_PATH, 'DIV')[0];
      const overMeasured = findSubtreeHashes(withOver, BIG_PATH, 'DIV')[0];

      check('Z18 a subtree well under the cap is declarable and certifies',
        (() => {
          const decl = entry(underMeasured.hash, 'DIV', BIG_PATH);
          const v = applyWhitelist(diffTokens(withUnder, withoutBig).ops, decl);
          return underMeasured.span > 64 && underMeasured.span < MAX_SUBTREE_TOKENS
            && v.failures.length === 0 && v.consumed.get(0) === 1;
        })(),
        `a ${underMeasured.span}-token deletion, over the OLD cap of 64 and under the new `
        + `${MAX_SUBTREE_TOKENS}, must be consumed whole as one declaration. This is the `
        + `property the raise buys, and it is what the modal entry rests on. got span `
        + `${underMeasured.span}, `
        + JSON.stringify(applyWhitelist(diffTokens(withUnder, withoutBig).ops,
          entry(underMeasured.hash, 'DIV', BIG_PATH)).failures.length) + ' failures');

      // The cap did not become a suggestion. Past it the entry matches NOTHING
      // -- it does not degrade to a looser tag+path check, and it does not
      // half-consume. consumed===0 is asserted explicitly rather than inferred
      // from the failure count, because "failed loudly" and "quietly spent its
      // budget on part of the run" look the same from failures alone.
      const overDecl = entry(overMeasured.hash, 'DIV', BIG_PATH);
      const overVerdict = applyWhitelist(diffTokens(withOver, withoutBig).ops, overDecl);
      check('Z19 a correctly declared subtree OVER the cap still fails loudly',
        overMeasured.span > MAX_SUBTREE_TOKENS
        && overVerdict.failures.length > 0 && (overVerdict.consumed.get(0) || 0) === 0,
        `the entry is correct in every way -- right tag, right path, hash measured from the `
        + `real baseline -- and is refused purely for size. Raising the ceiling must not turn `
        + `the ceiling into a soft one. got span ${overMeasured.span} (cap ${MAX_SUBTREE_TOKENS}), `
        + `${overVerdict.failures.length} failures, consumed `
        + `${JSON.stringify([...overVerdict.consumed])}`);

      check('Z20 the cap is 400',
        MAX_SUBTREE_TOKENS === 400,
        `the number is load-bearing and is asserted so it cannot drift unreviewed. It was `
        + `raised from 64 in B3 on a measurement -- the configurator modal at 355 tokens -- `
        + `and 400 is that need plus headroom, still one-component scale. Moving it is a `
        + `reviewed harness change, not a knob. got ${MAX_SUBTREE_TOKENS}`);

      // ---- ADD-SUBTREE: the same battery, the other direction (B4-pre) ----
      //
      // The vocabulary was asymmetric. A removed component was one entry; the
      // IDENTICAL component added was one entry per token, and an attribute-less
      // added element could not be declared at all. Measured on B4's /saunas/
      // recomposition: 249 removed tokens coverable by ~7 delete-subtree
      // entries, against 102 added tokens needing 102 declarations.
      //
      // The material is reused deliberately: these are the SAME subtrees as
      // Z18/Z19 with the diff run the other way round, so any difference in
      // verdict is a difference in the mechanism and not in the fixture.
      const addEntry = (hash, tag, p, extra = {}) => loadWhitelist('t.json', { whitelist: [{
        op: 'add-subtree', tag, path: p, textHash: hash, count: 1,
        reason: 'fixture', commit: 'fixture', range: 'aaaaaaa..bbbbbbb', ...extra,
      }] });

      const addDecl = addEntry(underMeasured.hash, 'DIV', BIG_PATH);
      const addVerdict = applyWhitelist(diffTokens(withoutBig, withUnder).ops, addDecl);
      check('Z21 a DECLARED subtree ADDITION under the cap is consumed whole',
        addVerdict.failures.length === 0 && addVerdict.consumed.get(0) === 1,
        `the mirror of Z18: a ${underMeasured.span}-token addition must be one declaration, `
        + `not ${underMeasured.span}. got ${addVerdict.failures.length} failures, consumed `
        + `${JSON.stringify([...addVerdict.consumed])}`);

      // The hash is measured in the CANDIDATE for an addition, and it is the
      // same hash the baseline yielded for the deletion -- the subtree hash
      // describes the node, not which side of the diff it sat on. Asserted
      // because it is the property that lets one hashing primitive serve both.
      check('Z21b the added subtree hashes identically whichever way it crossed the diff',
        findSubtreeHashes(withUnder, BIG_PATH, 'DIV')[0].hash === underMeasured.hash,
        'one subtreeHash serves both directions; if it did not, add-subtree would need its '
        + 'own hasher and the two would drift');

      const overAddDecl = addEntry(overMeasured.hash, 'DIV', BIG_PATH);
      const overAddVerdict = applyWhitelist(diffTokens(withoutBig, withOver).ops, overAddDecl);
      check('Z22 a correctly declared ADDITION over the cap still fails loudly',
        overMeasured.span > MAX_SUBTREE_TOKENS
        && overAddVerdict.failures.length > 0 && (overAddVerdict.consumed.get(0) || 0) === 0,
        `Z19's property on the add path, and it needs its own assertion: the cap is enforced `
        + `in shared code but nothing proved the add direction reached it. consumed===0 is `
        + `explicit, because "failed loudly" and "quietly spent its budget on part of the run" `
        + `look identical from a failure count. got span ${overMeasured.span}, `
        + `${overAddVerdict.failures.length} failures, consumed `
        + `${JSON.stringify([...overAddVerdict.consumed])}`);

      // An entry written for one added subtree must not swallow a DIFFERENT one.
      // Same argument as Z2, and the same shape of node: same tag, same path,
      // distinguished only by content -- which is exactly what a `contains`
      // entry cannot see and the hash can.
      const otherAdd = await fp(PAGE({ heroIntro: bigSubtree(UNDER_N, '<hr>') }), 'z-add-other');
      const wrongTarget = applyWhitelist(diffTokens(withoutBig, otherAdd).ops, addDecl);
      check('Z23 an UNDECLARED addition of an identical-tag sibling still fails',
        wrongTarget.failures.length > 0,
        `the entry names one subtree by content; a different subtree at the same tag and path `
        + `must not be absorbed by it. got ${wrongTarget.failures.length} failures`);

      check('Z24 an add-subtree entry whose hash is in NO candidate node is flagged',
        (() => {
          const bogus = addEntry('deadbeefdeadbeef', 'DIV', BIG_PATH);
          const problems = checkAddedDeclarations(bogus, new Map([['/@1440', withUnder]]));
          return problems.length === 1 && /add-subtree/.test(problems[0])
            && /candidate/.test(problems[0]);
        })(),
        'a hand-written hash must be refused before any verdict rests on it, and the message '
        + 'must say it looked in the CANDIDATE -- otherwise a reader checks the wrong build');

      // The mirror is NECESSARY, not decorative: the delete-side check reads the
      // baseline, where an added node is correctly absent, so pointing it at an
      // add entry would flag every correct declaration. Pinned so nobody
      // "simplifies" the two calls into one.
      check('Z25 the two staleness checks read opposite builds',
        checkAddedDeclarations(addDecl, new Map([['/@1440', withUnder]])).length === 0
        && checkAddedDeclarations(addDecl, new Map([['/@1440', withoutBig]])).length === 1
        && checkSubtreeDeclarations(addDecl, new Map([['/@1440', withUnder]])).length === 0,
        'a correct add entry passes against a candidate that HAS the node and is flagged '
        + 'against one that does not; and the delete-side check must ignore add entries '
        + 'entirely rather than judging them against the baseline');

      check('Z26 an add-subtree entry is flagged when the candidate produced NO pages',
        checkAddedDeclarations(addDecl, new Map()).length === 1,
        'vacuity, guarded the same way fingerprintsIdentical guards it: a build that '
        + 'fingerprinted nothing corroborates nothing, and must not read as corroboration');

      // Z28 — WIRING (Razor N5). Every other add-subtree fixture imports the lib
      // and exercises it directly, which proves the mirror WORKS and says nothing
      // about whether the gate ever calls it. Delete the one line in
      // dom-integrity.mjs that invokes it and all of Z21-Z27 stay green while a
      // hand-written hash sails through: the exact shape of inertness this repo
      // has now hit five times (sha-abbrev scoping, stale entries, the reveal
      // pin, VIDEO_URL, the reveal-boot).
      //
      // ITS LIMIT, STATED: this reads the runner's SOURCE. It proves the call
      // exists and is handed the CANDIDATE prints; it does not execute the
      // runner, because doing so needs two real git refs and a pair of builds.
      // A source check is weaker than a mutation and stronger than the nothing
      // that was here before. If it ever fires falsely, replace it with an
      // end-to-end run rather than loosening the pattern.
      {
        const runner = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'dom-integrity.mjs'), 'utf8');
        check('Z28 the runner CALLS checkAddedDeclarations, against the candidate prints',
          /checkAddedDeclarations\(\s*nodeEntries\s*,\s*candidate\.prints\s*\)/.test(runner)
          && /checkSubtreeDeclarations\(\s*nodeEntries\s*,\s*baseline\.prints\s*\)/.test(runner)
          // The import is read from the dom-fingerprint block SPECIFICALLY. A
          // first draft of this line split on the first `} from` in the file,
          // which is the node:child_process import, and reported "not imported"
          // about a runner that imports it fine. A wiring check that can be
          // wrong about the wiring is worse than none.
          && /import\s*\{[^}]*checkAddedDeclarations[^}]*\}\s*from\s*'\.\/lib\/dom-fingerprint\.mjs'/s
            .test(runner),
          'the add-subtree staleness mirror must be imported AND invoked AND handed the '
          + 'candidate build. Written-but-unwired is how five things on this branch went '
          + 'silently inert; the delete-side call is asserted alongside it so a copy-paste '
          + 'that points both at the same build is caught too.');
      }

      check('Z27 the specificity check ignores add-subtree entries',
        checkWhitelistSpecificity(addDecl, new Map(), new Map([['/@1440', withUnder]]))
          .length === 0,
        'an add-subtree entry has no "contains" to be lazy with; the substring check must '
        + 'not fabricate a verdict about it');
    }

    process.stdout.write('\nM — mutation battery (runnable)\n');
    {
      // Token streams the mutations are exercised against. Built once.
      const f = {
        base: before,
        reworded: await fp(PAGE({ bodyCopy: 'Hand-built saunas for the Sea to Sky region.' }), 'm-reword'),
        reordered: await fp(PAGE({ reordered: true }), 'm-reorder'),
        reparented: await fp(PAGE({ reparent: true }), 'm-reparent'),
        renames: [{ op: 'rename', from: 'card', to: 'tile', range: 'a..b',
          reason: 'fixture', commit: 'fixture' }],
        renamedPage: await fp(PAGE().replace(/class="card"/g, 'class="tile"'), 'm-renamed'),
        smuggledPage: await fp(PAGE().replace(/class="card"/g, 'class="tile promoted"'), 'm-smug'),
        // A node carrying BOTH a renamed token and an untouched sibling token.
        // Without one, a mutation that drops unknown tokens has nothing to drop
        // on the very nodes the rename touches, and reports itself detected
        // while proving nothing.
        basePlus: await fp(PAGE().replace(/class="card"/g, 'class="card featured"'), 'm-bp'),
        renamedPlus: await fp(PAGE().replace(/class="card"/g, 'class="tile featured"'), 'm-rp'),
        attrChanged: await fp(PAGE().replace('class="card" data-index="1"', 'class="card feature" data-index="1"'), 'm-attr'),
        queryChanged: await fp(PAGE().replace('/js/init.js?v=abc123def456', '/js/init.js?debug=1'), 'm-query'),
        fontA: await fp(PAGE({ preloads: '<link rel="preload" href="/fonts/outfit-var.55112282293d.woff2" as="font">' }), 'm-fa'),
        fontB: await fp(PAGE({ preloads: '<link rel="preload" href="/fonts/helvetica-var.55112282293d.woff2" as="font">' }), 'm-fb'),
        textA: await fp(PAGE({ bodyCopy: 'alpha beta' }), 'm-ta'),
        textSquashed: await fp(PAGE({ bodyCopy: 'alphabeta' }), 'm-ts'),
        // Attributes are serialized in SORTED name order by the extractor, so
        // these stubs must be too — a stub in source order matches nothing and
        // the mutation silently tests an empty whitelist. (It did, once.)
        // Two deletions of the SAME declared node against a count of 1, plus the
        // Cloudinary hint that no entry names at all.
        twoPreconnectDeletionsPlusOne: [
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'href="https://fonts.googleapis.com" rel="preconnect"' } },
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'href="https://fonts.googleapis.com" rel="preconnect"' } },
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'crossorigin="" href="https://res.cloudinary.com" rel="preconnect"' } },
        ],
        unrelatedLinkDeletion: [
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'href="https://secretsaunacompany.ca/" rel="canonical"' } },
        ],
        // delete-subtree material: the two attribute-less <style> siblings, and
        // an entry aimed at the WRONG one. Shipped, the hash refuses it and the
        // real deletion fails; with the hash check gone, tag+path alone let it
        // consume a node it was never written for.
        heroAll: null,
        heroNoA: null,
        wrongSubtreeEntry: null,
        // Cap material for D-m16, the same shape as Z18: a subtree of ~121
        // tokens -- over the OLD cap of 64, under the new 400 -- correctly
        // declared with a hash measured from the fixture itself. Built here
        // rather than shared with the Z block because that block is scoped;
        // the shape is what matters, not the identity of the object.
        capUnder: null,
        capNone: null,
        capEntry: null,
        // Descendant-activation material (D-m17/D-m18). The shas are fixtures,
        // not repo history: the git half is the CALLER's to prove, and what is
        // under test here is what partitionByScope does with that proof.
        descBase: 'aaaaaaa1111111111111111111111111111aaaa',
        descEnd: 'c0ffee1',
        descTip: 'dddddd11111111111111111111111111111dddd',
        descEntry: null,
        printsA: null,
        printsMoved: null,
        printsReworded: null,
        // class-removal material
        withUtility: await fp(PAGE().replace(/class="card"/g, 'class="card featured"'), 'm-wu'),
        withoutUtility: await fp(PAGE(), 'm-wou'),
        removals: [{ op: 'rename', from: 'featured', to: null, range: 'a..b',
          reason: 'fixture', commit: 'fixture' }],
        // scope material: same shape, different batches.
        scopedPair: loadWhitelist('t.json', { whitelist: [
          { op: 'removed', tag: 'LINK', contains: 'fonts.googleapis.com/css', count: 1,
            reason: 'this batch', commit: 'c', range: 'aaaaaaa..bbbbbbb' },
          { op: 'removed', tag: 'LINK', contains: 'fonts.googleapis.com/css', count: 1,
            reason: 'a DIFFERENT batch', commit: 'c', range: 'ccccccc..ddddddd' },
        ] }),
        twoSameShapeDeletions: [
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'href="https://fonts.googleapis.com/css2?family=Cormorant" rel="stylesheet"' } },
          { op: 'removed', token: { kind: 'element', tag: 'LINK', path: 'html/head', attrs: 'href="https://fonts.googleapis.com/css2?family=Cormorant" rel="stylesheet"' } },
        ],
      };
      f.codeBefore = await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#0f0f0f" };' }), 'm-cb');
      f.codeElementChanged = await fp(PAGE({ inlineJs: 'window.TOKENS = { bg: "#0f0f0f" };' })
        .replace('class="site-header"', 'class="site-header is-compact"'), 'm-cec');
      f.kindConfusable = loadWhitelist('t.json', { whitelist: [
        { op: 'added', kind: 'code', tag: 'HEADER', contains: 'is-compact', count: 1,
          reason: 'fixture: a code entry whose substring lives in an attribute',
          commit: 'c', range: 'aaaaaaa..bbbbbbb' },
      ] });
      f.codeDecl = loadWhitelist('t.json', { whitelist: [
        { op: 'removed', kind: 'code', tag: 'SCRIPT', contains: '#0f0f0f', count: 1,
          reason: 'fixture', commit: 'c', range: 'aaaaaaa..bbbbbbb' },
        { op: 'added', kind: 'code', tag: 'SCRIPT', contains: '#0c0c0c', count: 1,
          reason: 'fixture', commit: 'c', range: 'aaaaaaa..bbbbbbb' },
      ] });
      {
        const STYLE_A = '<style>.hero-intro{opacity:0}</style>';
        const STYLE_B = '<style>.hero-mask{transform:none}</style>';
        f.heroAll = await fp(PAGE({ heroIntro: STYLE_A + STYLE_B }), 'm-hero-all');
        f.heroNoA = await fp(PAGE({ heroIntro: STYLE_B }), 'm-hero-noa');
        const hashes = findSubtreeHashes(f.heroAll, 'html/body/main/section/style', 'STYLE');
        f.wrongSubtreeEntry = loadWhitelist('t.json', { whitelist: [{
          op: 'delete-subtree', tag: 'STYLE', path: 'html/body/main/section/style',
          textHash: hashes[1].hash, count: 1, reason: 'aimed at sibling B on purpose',
          commit: 'fixture', range: 'aaaaaaa..bbbbbbb',
        }] });
      }
      {
        f.descEntry = loadWhitelist('t.json', { whitelist: [{
          op: 'removed', tag: 'LINK', contains: 'rel="canonical"', count: 1,
          reason: 'fixture', commit: 'fixture', range: `${f.descBase.slice(0, 7)}..${f.descEnd}`,
        }] });
        const a = await fp(PAGE(), 'm-desc-a');
        const moved = await fp(PAGE({ extraCard: '<article class="card" data-index="9"></article>' }), 'm-desc-b');
        // Same token COUNT, one changed word: the case only content comparison
        // can see, and therefore the one that proves it happens.
        const reworded = await fp(PAGE({ bodyCopy: 'Hand-built saunas for the Sea to Sky region.' }), 'm-desc-c');
        f.printsA = new Map([['/@1440', a]]);
        f.printsMoved = new Map([['/@1440', moved]]);
        f.printsReworded = new Map([['/@1440', reworded]]);
      }
      {
        const CAP_PATH = 'html/body/main/section/div';
        const big = `<div class="big">${Array.from({ length: 60 },
          (_, i) => `<p>Row ${i}</p>`).join('')}</div>`;   // span 121
        f.capUnder = await fp(PAGE({ heroIntro: big }), 'm-cap-under');
        f.capNone = await fp(PAGE({ heroIntro: '' }), 'm-cap-none');
        const measured = findSubtreeHashes(f.capUnder, CAP_PATH, 'DIV')[0];
        f.capEntry = loadWhitelist('t.json', { whitelist: [{
          op: 'delete-subtree', tag: 'DIV', path: CAP_PATH,
          textHash: measured.hash, count: 1,
          reason: 'a whole component, declared as one deletion — needs the raised cap',
          commit: 'fixture', range: 'aaaaaaa..bbbbbbb',
        }] });

        // ADD-PATH material (B4-pre), for D-m20/21/22. Deliberately its OWN
        // fixtures rather than a reuse of the delete ones: the point of these
        // mutations is that the add direction is exercised on add-direction
        // material, so a future split of the shared matcher cannot leave the
        // add path unguarded while the delete probes stay green.
        const addOne = (hash, extra = {}) => loadWhitelist('t.json', { whitelist: [{
          op: 'add-subtree', tag: 'DIV', path: CAP_PATH, textHash: hash, count: 1,
          reason: 'a whole component, declared as one addition',
          commit: 'fixture', range: 'aaaaaaa..bbbbbbb', ...extra,
        }] });
        f.capAddEntry = addOne(measured.hash);
        f.capBogusAddEntry = addOne('deadbeefdeadbeef');
        f.capPrints = new Map([['/@1440', f.capUnder]]);

        // A different subtree at the same tag and path — for D-m21, the case
        // only the hash separates.
        const other = `<div class="big">${Array.from({ length: 60 },
          (_, i) => `<p>Row ${i}</p>`).join('')}<hr></div>`;
        f.capOther = await fp(PAGE({ heroIntro: other }), 'm-cap-other');

        // Over the cap, correctly declared — for D-m20.
        const overN = Math.ceil((MAX_SUBTREE_TOKENS + 40 - 2) / 2);
        const over = `<div class="big">${Array.from({ length: overN },
          (_, i) => `<p>Row ${i}</p>`).join('')}<hr></div>`;
        f.capOver = await fp(PAGE({ heroIntro: over }), 'm-cap-over-add');
        f.capOverAddEntry = addOne(findSubtreeHashes(f.capOver, CAP_PATH, 'DIV')[0].hash);
      }
      // Extraction-level mutations change the function that runs IN THE PAGE,
      // so they must be re-extracted through a real browser with the mutant's
      // own extractFingerprint. Handing them tokens produced by the real one
      // tests the diff and nothing else — which is exactly what happened first
      // time round: five mutations reported themselves detected while the code
      // they mutated never ran.
      const ctx = {
        extract: async (mod, html, slug) => {
          const site = path.join(tmp, `mut-${slug}`);
          fs.mkdirSync(site, { recursive: true });
          fs.writeFileSync(path.join(site, 'index.html'), html);
          const server = await startServer(site);
          const page = await browser.newPage();
          try {
            await page.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' });
            return await page.evaluate(mod.extractFingerprint);
          } finally { await page.close(); await server.close(); }
        },
      };
      fs.rmSync(MUTANT_ROOT, { recursive: true, force: true });
      try {
        // Detection is defined as "the mutant behaves DIFFERENTLY from the real
        // module on this probe", never as a hand-written expectation about which
        // direction it moves. Writing the direction by hand is how three of
        // these mutations first reported themselves undetected: for a defect
        // that makes the instrument go quiet, the mutant's count is LOWER, and a
        // `> 0` predicate silently inverts. Comparing against the real module
        // removes that whole class of mistake, and the reference value is
        // printed so a reviewer can see what the probe actually measured.
        for (let i = 0; i < MUTATIONS.length; i++) {
          const mut = MUTATIONS[i];
          let mutantValue = null;
          let err = null;
          const reference = await mut.probe(realFingerprint, f, whitelist, ctx);
          try {
            const mod = await loadMutant(`d${i}`, mut.edits);
            mutantValue = await mut.probe(mod, f, whitelist, ctx);
          } catch (e) { err = e; }
          if (err) check(mut.name, false, `mutation could not be applied or run: ${err.message}`);
          else {
            check(`${mut.name} — ${mut.proves}`,
              JSON.stringify(mutantValue) !== JSON.stringify(reference),
              `the mutant behaved identically to the real module (both ${JSON.stringify(reference)}), `
              + `so this property has no coverage: the defect would ship unnoticed`);
          }
        }
      } finally {
        fs.rmSync(MUTANT_ROOT, { recursive: true, force: true });
      }
    }
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`\ndom-integrity tests crashed: ${err.stack || err.message}`); process.exit(2); }
);
