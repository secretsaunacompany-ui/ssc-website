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
  subtreeHash, findSubtreeHashes, checkSubtreeDeclarations,
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
