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
  checkWhitelistSpecificity,
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
  <section id="hero">${reordered ? priceEl + intro : intro + priceEl}</section>
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
      '      if (!op.token.attrs.includes(e.contains)) continue;', ''] },
    probe: (m, f, wl) => m.applyWhitelist(f.unrelatedLinkDeletion, wl).failures.length,
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
      const ok = { op: 'removed', tag: 'LINK', contains: 'x', count: 1, reason: 'r', commit: 'c' };
      expectThrows('W1 a bad op is rejected', bad({ ...ok, op: 'changed' }), 'removed');
      expectThrows('W2 a missing tag is rejected', bad({ ...ok, tag: '' }), 'tag');
      expectThrows('W3 a missing "contains" is rejected', bad({ ...ok, contains: '' }), 'contains');
      expectThrows('W4 a zero count is rejected', bad({ ...ok, count: 0 }), 'count');
      expectThrows('W5 a missing reason is rejected', bad({ ...ok, reason: '' }), 'reason');
      expectThrows('W6 a missing commit is rejected', bad({ ...ok, commit: '' }), 'commit');
      expectThrows('W7 a non-array whitelist is rejected',
        () => loadWhitelist('t.json', { whitelist: {} }), 'must be an array');
      check('W8 the shipped whitelist loads', realWhitelist().length === 4,
        `expected 4 declared entries, got ${realWhitelist().length}`);

      // N: an entry too lazy to identify its node is refused before any verdict
      // rests on it. `contains: "rel"` matches every <link> on the page.
      const prints = new Map([['/@1440', before]]);
      const empty = new Map([['/@1440', []]]);
      const lazy = loadWhitelist('t.json', { whitelist: [{
        op: 'removed', tag: 'LINK', contains: 'rel', count: 1,
        reason: 'lazy on purpose', commit: 'fixture',
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
          reason: 'r', commit: 'c',
        }] }), prints, empty).length === 0,
        'an entry that names exactly one node must pass');
      check('N4 the SHIPPED whitelist is specific enough',
        checkWhitelistSpecificity(realWhitelist(), prints, empty)
          .filter((x) => x.includes('LINK') || x.includes('link')).length === 0,
        'the config we ship must satisfy the check it enforces');
    }

    process.stdout.write('\nM — mutation battery (runnable)\n');
    {
      // Token streams the mutations are exercised against. Built once.
      const f = {
        base: before,
        reworded: await fp(PAGE({ bodyCopy: 'Hand-built saunas for the Sea to Sky region.' }), 'm-reword'),
        reordered: await fp(PAGE({ reordered: true }), 'm-reorder'),
        reparented: await fp(PAGE({ reparent: true }), 'm-reparent'),
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
      };
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
