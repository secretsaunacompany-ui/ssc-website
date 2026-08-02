/**
 * DOM-integrity fingerprinting: the change-class-correct certificate for a
 * restyle.
 *
 * WHY THIS EXISTS
 *
 * The pixel harness answers "did anything move?" by matching row signatures.
 * That question is meaningful for a spacing or colour change and MEANINGLESS
 * for a typeface replacement: swapping the font changes every text pixel by
 * design, so no signature matches, no position model applies, and the affine
 * fit correctly reports does-not-fit. WP-1a failed 37 of 38 pairs and every one
 * of those verdicts was honest. Tuning the pixel instrument until a font swap
 * came back green would be modelling until the answer is the one we wanted.
 *
 * The question a font swap actually needs answered is different: *did the page
 * still say the same thing, in the same structure?* If the element tree and the
 * text are identical, then whatever changed was presentation — which is exactly
 * what a restyle is allowed to change, and what the fonts suite's computed-style
 * assertions and Jen's fidelity review cover from the other side.
 *
 * So: build both refs, load every page, and compare a normalized structural
 * fingerprint. Identical modulo an explicit, declared whitelist, or a named
 * per-page failure.
 *
 * WHAT NORMALIZATION IS AND IS NOT
 *
 * Normalization here is narrow on purpose, because a normalizer is just a
 * laundering machine pointed at your own gate. Two things are normalized and
 * nothing else:
 *
 *   - WHITESPACE in text, collapsed and trimmed. Rendering already collapses
 *     runs of whitespace, so a template reflow that changes indentation changes
 *     nothing a visitor can see. Beyond that, text compares EXACTLY: a reworded
 *     sentence, a changed price, a dropped word is a FAIL. That is the point of
 *     the instrument, not a limitation of it.
 *   - VOLATILE URL SEGMENTS, listed exhaustively below.
 *
 * Everything else — every tag, every nesting relationship, every attribute,
 * every ordering — compares raw.
 */
import { createHash } from 'node:crypto';

/**
 * Extracted in the page, so it must be entirely self-contained: Playwright
 * stringifies this function and evaluates it in the browser, where nothing from
 * this module's scope exists.
 *
 * Returns an ordered token stream. Order is document order, and it is
 * load-bearing: a reordered section produces a different stream even when every
 * individual node is unchanged.
 *
 * The `path` is an ancestry chain of TAG NAMES and deliberately carries no
 * sibling ordinal. An ordinal would make every node after an insertion or a
 * deletion compare unequal to its own unchanged self, so a single whitelisted
 * deletion in <head> cascaded into a spurious failure for every following link
 * on all 19 pages — measured, on the first real run. Ordering is still fully
 * enforced, by the position of each token in the stream rather than by a number
 * baked into its identity: a reordered section still produces a different
 * sequence and still fails.
 *
 * THE VOLATILE LIST, exhaustive, with the reason each entry is on it:
 *
 *   1. `?v=<hex>` cache-busting stamps. The stamp is a content hash of the
 *      asset (P-A), so it changes whenever styles.css or a js/ file changes —
 *      which is precisely what a restyle does. Keeping it would make every
 *      restyle fail for a reason that has nothing to do with the DOM. What the
 *      stamp protects (that the served bytes match the URL) is covered by
 *      build-cache.test.mjs, not here.
 *   2. Content-hashed FONT filenames, `/fonts/<name>.<hex>.woff2` -> the hash
 *      segment only. Same argument, and narrowed deliberately: only the hash is
 *      dropped, the family name is kept, so substituting a DIFFERENT font still
 *      fails. Whether the bytes behind that name are the right typeface is the
 *      fonts suite's question (it asserts computed faces against a real
 *      browser), not this one's.
 *
 * Nothing else is volatile. An attribute change outside this list fails.
 */
export function extractFingerprint() {
  const stripVolatile = (value) => {
    if (typeof value !== 'string') return value;
    let out = value;
    // 1. ?v=<hex> content-hash stamp (P-A), anywhere in the value.
    out = out.replace(/\?v=[0-9a-f]{6,}\b/gi, '?v=CONTENT_HASH');
    // 2. /fonts/<name>.<hex>.woff2 -> /fonts/<name>.woff2 (hash segment only).
    out = out.replace(/(\/fonts\/[^"'\s]*?)\.[0-9a-f]{8,}(\.woff2?\b)/gi, '$1$2');
    return out;
  };

  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  const tokens = [];
  const walk = (node, path) => {
    if (node.nodeType === 1) {
      const attrs = {};
      for (const a of Array.from(node.attributes)) attrs[a.name] = stripVolatile(a.value);
      const names = Object.keys(attrs).sort();
      tokens.push({
        kind: 'element',
        path,
        tag: node.tagName,
        attrs: names.map((n) => `${n}=${JSON.stringify(attrs[n])}`).join(' '),
      });
      const tag = node.tagName;
      const isCode = tag === 'SCRIPT' || tag === 'STYLE';
      const children = Array.from(node.childNodes);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.nodeType === 1) {
          walk(child, `${path}/${child.tagName.toLowerCase()}`);
        } else if (child.nodeType === 3) {
          const text = norm(child.nodeValue);
          if (text === '') continue;
          // Inline script/style bodies are code, not page copy. They are still
          // compared exactly; they are only labelled differently so a failure
          // report can say "inline code changed" rather than "the page text
          // changed", which are very different things to a reviewer.
          tokens.push({ kind: isCode ? 'code' : 'text', path, tag, text });
        }
      }
    }
  };
  walk(document.documentElement, 'html');
  return tokens;
}

/** Stable one-line identity for a token, used for sequence comparison. */
export function tokenKey(t) {
  return t.kind === 'element'
    ? `E|${t.path}|${t.tag}|${t.attrs}`
    : `${t.kind === 'code' ? 'C' : 'T'}|${t.path}|${t.text}`;
}

/** Human-readable form for a failure message. */
export function describeToken(t) {
  if (t.kind === 'element') {
    return `<${t.tag.toLowerCase()}${t.attrs ? ` ${t.attrs}` : ''}> at ${t.path}`;
  }
  const label = t.kind === 'code' ? 'inline code in' : 'text in';
  const clipped = t.text.length > 120 ? `${t.text.slice(0, 117)}...` : t.text;
  return `${label} <${t.tag.toLowerCase()}> at ${t.path}: ${JSON.stringify(clipped)}`;
}

/**
 * Sequence diff over the token streams.
 *
 * Common prefix and suffix are trimmed first, which on two builds of the same
 * site reduces the interesting middle to a handful of tokens and keeps the LCS
 * cheap. A pathological case (the whole document differs) is reported as such
 * rather than being ground through a quadratic table.
 *
 * @returns {{ops: {op:'removed'|'added', token: object}[], bulk: boolean}}
 */
export function diffTokens(baseline, candidate, maxWindow = 4000) {
  let start = 0;
  while (start < baseline.length && start < candidate.length
    && tokenKey(baseline[start]) === tokenKey(candidate[start])) start += 1;

  let endA = baseline.length - 1;
  let endB = candidate.length - 1;
  while (endA >= start && endB >= start
    && tokenKey(baseline[endA]) === tokenKey(candidate[endB])) { endA -= 1; endB -= 1; }

  const a = baseline.slice(start, endA + 1);
  const b = candidate.slice(start, endB + 1);
  if (a.length === 0 && b.length === 0) return { ops: [], bulk: false };

  if (a.length * b.length > maxWindow * maxWindow) {
    return {
      ops: [...a.map((t) => ({ op: 'removed', token: t })),
        ...b.map((t) => ({ op: 'added', token: t }))],
      bulk: true,
    };
  }

  // Classic LCS table over the trimmed window.
  const n = a.length;
  const m = b.length;
  const lcs = new Uint32Array((n + 1) * (m + 1));
  const at = (i, j) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[at(i, j)] = tokenKey(a[i]) === tokenKey(b[j])
        ? lcs[at(i + 1, j + 1)] + 1
        : Math.max(lcs[at(i + 1, j)], lcs[at(i, j + 1)]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (tokenKey(a[i]) === tokenKey(b[j])) { i += 1; j += 1; continue; }
    if (lcs[at(i + 1, j)] >= lcs[at(i, j + 1)]) { ops.push({ op: 'removed', token: a[i] }); i += 1; }
    else { ops.push({ op: 'added', token: b[j] }); j += 1; }
  }
  while (i < n) { ops.push({ op: 'removed', token: a[i] }); i += 1; }
  while (j < m) { ops.push({ op: 'added', token: b[j] }); j += 1; }
  return { ops, bulk: false };
}

/**
 * Validate and normalize the whitelist.
 *
 * A whitelist entry is a DECLARATION, in the same spirit as `expectedRedirects`
 * in the pixel harness: it says "exactly this many of exactly this change are
 * expected, for this reason, because of this commit". Anything undeclared
 * fails, and a declaration that does NOT occur also fails — a stale entry is a
 * hole someone forgot to close.
 */
export function loadWhitelist(file, raw) {
  const list = raw.whitelist;
  if (!Array.isArray(list)) throw new Error(`${file}: "whitelist" must be an array.`);
  return list.map((e, idx) => {
    const where = `whitelist[${idx}]`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) {
      throw new Error(`${file}: ${where} must be an object.`);
    }
    // SCOPE. Every entry declares the comparison it belongs to. The whitelist
    // file is per-repo but each entry describes ONE batch's change, so without
    // a scope WP-1a's declarations sit in the file forever, reading as stale
    // against every later baseline while still being load-bearing. Scoped, an
    // entry that does not belong to this comparison is inert and reported,
    // never silently consuming somebody else's diff.
    if (typeof e.range !== 'string' || !/^[0-9a-f]{7,40}\.\.[0-9a-f]{7,40}$/.test(e.range)) {
      throw new Error(`${file}: ${where} needs a "range" of "<baselineSha>..<candidateSha>" `
        + `naming the comparison it applies to. An unscoped entry is load-bearing forever.`);
    }
    if (typeof e.reason !== 'string' || !e.reason.trim()) {
      throw new Error(`${file}: ${where} needs a "reason".`);
    }
    if (typeof e.commit !== 'string' || !e.commit.trim()) {
      throw new Error(`${file}: ${where} needs a "commit".`);
    }
    // RENAME entries declare an old->new CLASS TOKEN pair rather than a node.
    // A 158-node global rename is declared structure change, and no
    // substring-and-count entry can express it: every entry it would need is
    // exactly the lazy kind the specificity check exists to reject. So the
    // rename is applied during normalization instead, and what remains after
    // it is compared as strictly as ever.
    if (e.op === 'rename') {
      const cls = /^[A-Za-z_][A-Za-z0-9_-]*$/;
      if (typeof e.from !== 'string' || !cls.test(e.from)) {
        throw new Error(`${file}: ${where} needs a "from" class token.`);
      }
      // `to: null` is a declared class REMOVAL: the token existed in the
      // baseline's vocabulary and the batch deleted it outright rather than
      // renaming it. Same authority as a rename and the same strictness — the
      // named token is dropped from the baseline's class lists and NOTHING
      // else is, so an undeclared removal on the same node still fails naming
      // the token that vanished. Expressed here rather than as a `removed`
      // node entry because a class deletion changes an attribute on a surviving
      // element; there is no node to name.
      if (e.to !== null && (typeof e.to !== 'string' || !cls.test(e.to))) {
        throw new Error(`${file}: ${where} needs a "to" class token, or null to `
          + `declare that "${e.from}" was REMOVED rather than renamed.`);
      }
      if (e.from === e.to) {
        throw new Error(`${file}: ${where} renames "${e.from}" to itself.`);
      }
      return { ...e };
    }
    // DELETE-SUBTREE. A `removed` entry names a node by tag + an attribute
    // substring, which is exactly the wrong instrument for an attribute-LESS
    // node: a bare <style> or <noscript> has no `contains` to write, and the
    // only honest candidates ("style", "") are the lazy kind the specificity
    // check exists to reject. Worse, a subtree deletion arrives as a RUN of ops
    // (the element, its text, its descendants), so a node entry would need one
    // declaration per token and would still not say they belong together.
    //
    // So this entry identifies the deleted node three ways at once: its tag,
    // its ancestry path, and a hash of ITS OWN serialized content (the subtree's
    // tokens, with the ancestry prefix stripped so the hash is the node's, not
    // its location's). It consumes the whole run or nothing. The hash is what
    // makes it impossible to write lazily — you cannot guess it, you measure it,
    // and two attribute-less siblings of the same tag hash differently the
    // moment their content differs. An entry whose hash matches nothing in the
    // baseline is flagged before any verdict rests on it.
    if (e.op === 'delete-subtree') {
      if (typeof e.tag !== 'string' || !e.tag) {
        throw new Error(`${file}: ${where} needs a "tag" (e.g. "STYLE").`);
      }
      if (typeof e.path !== 'string' || !e.path.trim()) {
        throw new Error(`${file}: ${where} needs a "path": the deleted node's ancestry `
          + `chain of tag names, e.g. "html/body/section/div".`);
      }
      if (typeof e.textHash !== 'string' || !/^[0-9a-f]{8,64}$/.test(e.textHash)) {
        throw new Error(`${file}: ${where} needs a "textHash": the hex subtree hash of the `
          + `deleted node's own content. Measure it, do not invent it — a wrong hash matches `
          + `nothing and is reported as a stale declaration.`);
      }
      if (!Number.isInteger(e.count) || e.count < 1) {
        throw new Error(`${file}: ${where} needs an integer "count" >= 1.`);
      }
      return { ...e };
    }
    if (e.op !== 'removed' && e.op !== 'added') {
      throw new Error(`${file}: ${where} needs "op" of "removed", "added", "rename" or `
        + `"delete-subtree", got ${JSON.stringify(e.op)}.`);
    }
    if (typeof e.tag !== 'string' || !e.tag) {
      throw new Error(`${file}: ${where} needs a "tag" (e.g. "LINK").`);
    }
    // KIND. A removed/added entry names an ELEMENT by default, and that was the
    // only thing it could name — `contains` was tested against the serialized
    // attributes, and a token with no attributes (a text or inline-code token)
    // could never match one. Which meant an edit to an inline <style> body was
    // undeclarable by construction: WP-1b reconciled booking-ops.html's own
    // `:root` block with the stylesheet's, exactly the change the plan §6 calls
    // for, and no entry in this vocabulary could say so.
    //
    // With an explicit kind, `contains` is tested against the TEXT for "text"
    // and "code" tokens and against the attributes for elements. Same substring
    // rule, same count discipline, same specificity check. Defaulting to
    // "element" keeps every existing entry meaning exactly what it meant.
    if (e.kind !== undefined && !['element', 'text', 'code'].includes(e.kind)) {
      throw new Error(`${file}: ${where} has "kind" ${JSON.stringify(e.kind)}; it must be `
        + `"element" (the default), "text", or "code".`);
    }
    if (typeof e.contains !== 'string' || !e.contains.trim()) {
      throw new Error(`${file}: ${where} needs a "contains" substring identifying the node. `
        + `A whitelist entry that matches on tag alone would consume any node of that tag.`);
    }
    if (!Number.isInteger(e.count) || e.count < 1) {
      throw new Error(`${file}: ${where} needs an integer "count" >= 1. The count is what `
        + `stops a second, unexpected instance of the same change slipping through.`);
    }
    return { ...e, kind: e.kind || 'element', contains: e.contains };
  });
}

/**
 * Reject a whitelist entry whose `contains` is too lazy to mean what it says.
 *
 * A `contains` of "rel" matches every <link> on the page. Such an entry is held
 * in check only by its count, which means it consumes the FIRST n matching
 * changes rather than the n it was written for — and if the intended node stops
 * changing, it silently starts absorbing something else. The count is a budget,
 * not an identity.
 *
 * So: if `contains` matches more nodes in the relevant build than the entry
 * declares, the entry is not specific enough to be a declaration and the run
 * refuses to start. Cheap, structural, and it fires before any comparison.
 *
 * Which build is "relevant" depends on the op: a `removed` node exists in the
 * baseline, an `added` node in the candidate. Checking the wrong side would let
 * a lazy entry through precisely when it matters.
 *
 * NOTE, related and deliberately not fixed here: when an entry's count is
 * exhausted, the surviving failure names the node that happened to arrive last,
 * which for identical-looking siblings may not be the one a human would call
 * "the unexpected one". Specificity enforcement makes that case rare rather
 * than impossible. Naming it precisely would need the entry to identify nodes
 * uniquely rather than by substring, which is a bigger change than this finding
 * warrants.
 *
 * @param {object[]} whitelist  validated entries
 * @param {Map<string, object[]>} baselinePrints  key -> token stream
 * @param {Map<string, object[]>} candidatePrints
 * @returns {string[]} one message per over-broad entry, empty when all are tight
 */
export function checkWhitelistSpecificity(whitelist, baselinePrints, candidatePrints) {
  const problems = [];
  whitelist.forEach((e, idx) => {
    if (e.op === 'rename' || e.op === 'delete-subtree') return;
    if (typeof e.contains !== 'string') return;
    const prints = e.op === 'removed' ? baselinePrints : candidatePrints;
    const wantKind = e.kind || 'element';
    let worstKey = null;
    let worstCount = 0;
    for (const [key, tokens] of prints) {
      const matches = tokens.filter((t) => t.kind === wantKind
        && t.tag === e.tag.toUpperCase()
        && (wantKind === 'element' ? t.attrs : t.text).includes(e.contains)).length;
      if (matches > worstCount) { worstCount = matches; worstKey = key; }
    }
    if (worstCount > e.count) {
      problems.push(`whitelist[${idx}]: "contains" ${JSON.stringify(e.contains)} matches `
        + `${worstCount} <${e.tag.toLowerCase()}> node(s) on ${worstKey}, but the entry declares `
        + `only ${e.count}. An entry held in check by its count alone consumes the first `
        + `${e.count} matching changes rather than the ones it was written for, and will start `
        + `absorbing a different node the moment the intended one stops changing. Make `
        + `"contains" identify the node, not a family of nodes.`);
    }
  });
  return problems;
}

/**
 * The span of the subtree rooted at `tokens[i]`, whose path is P.
 *
 * The token stream is flat, so a subtree is recovered from the paths: the root
 * element carries path P, its own text/code children carry P (a text token is
 * pushed under its PARENT's path), and every descendant carries a path under
 * `P/`. The run stops at the next ELEMENT token whose path is exactly P — that
 * is a SIBLING, and merging a sibling in would let a declaration written for one
 * node quietly describe two.
 */
function subtreeSpan(tokens, i) {
  const P = tokens[i].path;
  let n = 1;
  for (let j = i + 1; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.path.startsWith(`${P}/`)) { n += 1; continue; }
    if (t.path === P && t.kind !== 'element') { n += 1; continue; }
    break;
  }
  return n;
}

/**
 * Cap on how many tokens one delete-subtree entry may claim. See
 * matchSubtreeDeletions for what the cap does and why failing loudly past it is
 * the safe direction.
 *
 * 64 → 400, and the number is chosen from a measurement rather than picked to
 * clear one entry. The configurator modal -- the largest single component on
 * the site, and the thing that made this cap bite -- measures 352-355 tokens
 * depending on build (WP-0b-i recorded 352; re-measured for this batch against
 * its own baseline). 400 is that need plus enough headroom that the component
 * can grow a row or two without a harness change, and it is still ONE-COMPONENT
 * scale: a modal, a nav, a card grid. It is deliberately nowhere near the size
 * of a page section or a template.
 *
 * The property the cap protects is unchanged and must stay unchanged: a
 * declared deletion LARGER than the cap does not match and fails loudly as
 * undeclared. It never degrades to a looser check. Raising the ceiling changes
 * where "too big to declare in one line" starts; it does not change what
 * happens past it. Anything larger than one component is a human conversation
 * about whether that really is one change, not a number to raise again.
 *
 * Exported READ-ONLY so the fixtures can assert the value and size their
 * subtrees relative to it, rather than hard-coding 400 a second time.
 */
const MAX_SUBTREE_TOKENS = 400;
export { MAX_SUBTREE_TOKENS };

/**
 * Hash a subtree's OWN content, relative to the root path P: every token's key
 * with P's prefix stripped, so the hash describes the node rather than where it
 * sits. Truncated to 16 hex characters — 64 bits against a handful of candidate
 * subtrees per page is not a collision anyone will meet, and it stays legible in
 * a config file a human has to read.
 *
 * THE KEYS ARE SORTED, and that is not tidiness — it is the difference between
 * this primitive working and not. Two attribute-less <style> siblings produce
 * BYTE-IDENTICAL element tokens, so when one is deleted the LCS is free to match
 * the survivor's element token against the deleted one's. Measured, on exactly
 * the hero-intro shape this exists for: deleting <style A> yields the removed
 * run [A's TEXT, B's ELEMENT] rather than [A's element, A's text]. The multiset
 * of removed keys is exactly right — indistinguishable tokens are, after all,
 * indistinguishable — but the ORDER is an artifact of which representative the
 * matcher happened to pick. Hashing the sorted keys reads the content that
 * actually went and ignores an alignment nobody chose.
 *
 * What this gives up is intra-subtree ORDER: a subtree whose children were
 * permuted hashes the same. That is not a hole in the gate, because a permuted
 * subtree is not a DELETED subtree — reordering surfaces as its own
 * added/removed pair in the diff and fails there, which fixture C1 pins.
 */
export function subtreeHash(tokens, path) {
  const P = path === undefined ? tokens[0].path : path;
  const rel = (t) => (t.path === P ? '' : t.path.slice(P.length + 1));
  const line = (t) => (t.kind === 'element'
    ? `E|${rel(t)}|${t.tag}|${t.attrs}`
    : `${t.kind === 'code' ? 'C' : 'T'}|${rel(t)}|${t.text}`);
  return createHash('sha256')
    .update(tokens.map(line).sort().join('\n')).digest('hex').slice(0, 16);
}

/** Every subtree hash for nodes of `tag` at `path` in a full token stream. */
export function findSubtreeHashes(tokens, path, tag) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'element' || t.path !== path || t.tag !== tag.toUpperCase()) continue;
    const n = subtreeSpan(tokens, i);
    out.push({ hash: subtreeHash(tokens.slice(i, i + n), path), span: n });
  }
  return out;
}

/**
 * Does this slice of removed tokens even look like the subtree the entry names?
 *
 * Checked BEFORE the hash, so a hash is never computed over tokens from a
 * different part of the document (where the relative-path arithmetic would be
 * meaningless). Every token must live at or under the declared path, and exactly
 * one element must sit AT it, carrying the declared tag — that element is the
 * deleted root.
 */
function sliceFitsEntry(slice, entry) {
  const P = entry.path;
  let roots = 0;
  for (const t of slice) {
    if (t.path !== P && !t.path.startsWith(`${P}/`)) return false;
    if (t.kind === 'element' && t.path === P) {
      if (t.tag !== entry.tag.toUpperCase()) return false;
      roots += 1;
    }
  }
  return roots === 1;
}

/**
 * Consume delete-subtree declarations out of a page's diff, returning the set of
 * op indices they claimed.
 *
 * A subtree deletion arrives as a RUN of `removed` ops, so this runs as a
 * pre-pass over each maximal block of consecutive removals: within a block, take
 * the shortest contiguous slice from each position whose content hash matches a
 * live entry, claim it whole, and move past it. Anything unclaimed falls through
 * to the ordinary per-op matching and fails there if nothing declares it.
 *
 * Budget is spent exactly as everywhere else: an entry with `count: 1` claims
 * one subtree, and a second identical deletion still fails.
 *
 * The MAX_SUBTREE_TOKENS cap bounds the slice search. It is a real limit, stated
 * rather than hidden: a declared deletion larger than the cap will not match and
 * will fail loudly as undeclared, which is the safe direction. Most entries this
 * exists for are 2 to 4 tokens; the cap is set at one-component scale so that a
 * whole component — the configurator modal at ~355 — can be declared as one
 * deletion. See the constant for the measurement behind the number.
 */
function matchSubtreeDeletions(ops, whitelist, budget, consumed) {
  const claimed = new Set();
  const entries = whitelist
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e.op === 'delete-subtree');
  if (entries.length === 0) return claimed;

  let k = 0;
  while (k < ops.length) {
    if (ops[k].op !== 'removed') { k += 1; continue; }
    let end = k;
    while (end < ops.length && ops[end].op === 'removed') end += 1;

    let i = k;
    while (i < end) {
      let hit = null;
      const maxLen = Math.min(MAX_SUBTREE_TOKENS, end - i);
      for (let len = 1; len <= maxLen && hit === null; len++) {
        const slice = ops.slice(i, i + len).map((o) => o.token);
        for (const { e, idx } of entries) {
          if (budget[idx] <= 0) continue;
          if (!sliceFitsEntry(slice, e)) continue;
          if (subtreeHash(slice, e.path) !== e.textHash) continue;
          hit = { idx, len };
          break;
        }
      }
      if (hit === null) { i += 1; continue; }
      for (let j = i; j < i + hit.len; j++) claimed.add(j);
      budget[hit.idx] -= 1;
      consumed.set(hit.idx, (consumed.get(hit.idx) || 0) + 1);
      i += hit.len;
    }
    k = end;
  }
  return claimed;
}

/**
 * A delete-subtree entry whose hash matches nothing in the baseline is a
 * declaration about a node that does not exist. Caught before any verdict rests
 * on it, in the same spirit as the specificity check — and with a specific
 * message, because "your hash is wrong" and "the deletion did not happen" look
 * identical from the consumption tally alone.
 */
export function checkSubtreeDeclarations(whitelist, baselinePrints) {
  const problems = [];
  whitelist.forEach((e, idx) => {
    if (e.op !== 'delete-subtree') return;
    let matches = 0;
    let sameSpot = 0;
    for (const [, tokens] of baselinePrints) {
      for (const found of findSubtreeHashes(tokens, e.path, e.tag)) {
        sameSpot += 1;
        if (found.hash === e.textHash) matches += 1;
      }
    }
    if (matches === 0) {
      problems.push(`whitelist[${idx}]: delete-subtree declares <${e.tag.toLowerCase()}> at `
        + `"${e.path}" with content hash ${e.textHash}, and NO node in the baseline hashes to `
        + `that (${sameSpot} node(s) of that tag do sit at that path). Either the hash was `
        + `written by hand instead of measured, or the node this entry was written for is `
        + `already gone. Re-measure it or delete the entry — a declaration about a node that `
        + `does not exist cannot certify anything.`);
    }
  });
  return problems;
}

/** Human-readable identity for a whitelist entry, for reports and logs. */
export function describeEntry(e) {
  if (e.op === 'rename') return `rename ${e.from} -> ${e.to === null ? '(removed)' : e.to}`;
  if (e.op === 'delete-subtree') {
    return `delete-subtree <${e.tag.toLowerCase()}> at ${e.path} #${e.textHash}`;
  }
  const kind = (e.kind || 'element') === 'element' ? '' : `${e.kind} in `;
  return `${e.op} ${kind}<${e.tag.toLowerCase()}> ${JSON.stringify(e.contains)}`;
}

/**
 * Apply the whitelist to one page's diff.
 *
 * Consumption is COUNTED and per-page. An entry declaring `count: 1` consumes
 * one matching op and no more: a second, unexpected instance of the very same
 * change still fails, which is the difference between a declaration and a mute
 * button.
 *
 * Delete-subtree entries get first refusal on the head of every removed-element
 * run, because they consume the WHOLE run and a node entry would otherwise eat
 * its root token and leave the orphaned children failing on their own.
 *
 * @returns {{failures: object[], consumed: Map<number, number>}}
 */
export function applyWhitelist(ops, whitelist) {
  const budget = whitelist.map((e) => e.count);
  const consumed = new Map();
  const failures = [];

  const claimed = matchSubtreeDeletions(ops, whitelist, budget, consumed);

  for (let k = 0; k < ops.length; k++) {
    if (claimed.has(k)) continue;
    const op = ops[k];
    let matchedIdx = -1;
    for (let i = 0; i < whitelist.length; i++) {
      const e = whitelist[i];
      if (budget[i] <= 0) continue;
      if (e.op !== op.op) continue;
      if (op.token.kind !== (e.kind || 'element')) continue;
      if (op.token.tag !== e.tag.toUpperCase()) continue;
      const haystack = op.token.kind === 'element' ? op.token.attrs : op.token.text;
      if (!haystack.includes(e.contains)) continue;
      matchedIdx = i;
      break;
    }
    if (matchedIdx === -1) { failures.push(op); continue; }
    budget[matchedIdx] -= 1;
    consumed.set(matchedIdx, (consumed.get(matchedIdx) || 0) + 1);
  }
  return { failures, consumed };
}

/**
 * Split a whitelist into the entries that apply to THIS comparison and those
 * that do not. Non-applicable entries are inert: reported so they can be
 * pruned, never consuming a diff they were not written for.
 *
 * ABBREVIATED SHAS, and the bug that hid here (NOTE-1a, fixed 2026-07-31). The
 * body of this test is deliberately prefix-tolerant in BOTH directions, because
 * a human writes `198bc0b..c208508` into the config by hand while the runtime
 * resolves refs to full 40-character shas. It used to be guarded by a ternary
 * CONDITION that demanded an EXACT match first — `want.startsWith(`${b}..`)`
 * compares a 7-char abbreviation against a 40-char sha and is false, and
 * `b === baselineSha` is false for the same reason — so every abbreviated entry
 * fell straight to the `: false` branch and went INERT. The prefix tolerance
 * underneath it could never run. Measured consequence: all six of WP-1b's
 * shipped rename declarations were silently inert in any real run, and the run
 * reported them as "out of scope" rather than applying them. The condition is
 * gone; the tolerant body is the whole test. Fixture Y1 pins the abbreviated
 * case ACTIVE so this cannot regress into politeness again.
 */
export function partitionByScope(whitelist, baselineSha, candidateSha, opts = {}) {
  const descendantOk = opts.descendantOk || new Set();
  const applies = (e) => {
    const [b, c] = e.range.split('..');
    // The BASELINE end is always exact-prefix. It is not negotiable and gets no
    // descendant tolerance: every measurement an entry carries -- a subtree
    // hash, a count -- was taken against that specific baseline, so an entry
    // read against a different one is describing a document it never saw.
    const baseOk = baselineSha.startsWith(b) || b.startsWith(baselineSha);
    if (!baseOk) return false;
    if (candidateSha.startsWith(c) || c.startsWith(candidateSha)) return true;
    // DESCENDANT ACTIVATION. Only the candidate end moves, and only when the
    // caller has PROVEN two things about it (see resolveDescendantScope): the
    // candidate is a git descendant of the range end, and the harness's own
    // built-markup fingerprints of the two are identical on every page and
    // width. Absent that proof this is exactly the old behaviour.
    return descendantOk.has(c);
  };
  const active = whitelist.filter(applies);
  const inert = whitelist.filter((e) => !applies(e));
  return { active, inert };
}

/**
 * Are two builds' fingerprints the same markup, page for page and width for
 * width?
 *
 * This is the self-verifying half of descendant activation. An entry says "this
 * deletion happens between baseline B and candidate C". If the branch tip has
 * moved past C to some descendant D, that claim still holds for D if and only if
 * D's delivered markup is identical to C's -- and this instrument already knows
 * how to answer that question, because comparing delivered markup is the only
 * thing it does. So the check is made with the harness's own primitive rather
 * than with a rule about which files are "allowed" to change between C and D.
 * A commit that touches only a config file passes; a commit that quietly moves
 * a <div> does not, and the entry goes inert, and the change it no longer covers
 * reports as undeclared. Fail-closed: any doubt -- a missing page, a differing
 * token -- is a NO.
 *
 * @returns {{identical: boolean, differences: string[]}}
 */
export function fingerprintsIdentical(aPrints, bPrints) {
  const differences = [];
  // VACUITY GUARD (Razor, B3 review). Two empty maps agree about nothing, and
  // the loops below would return identical:true for them -- which in the one
  // caller that matters would activate an entry on the strength of a build that
  // produced no pages at all. "I measured nothing and found no difference" is
  // the fail-OPEN direction for a mechanism whose every other error path closes.
  if (aPrints.size === 0 || bPrints.size === 0) {
    return {
      identical: false,
      differences: [`no fingerprints to compare (${aPrints.size} vs ${bPrints.size}); `
        + 'an empty comparison cannot establish identity'],
    };
  }
  const aKeys = [...aPrints.keys()].sort();
  const bKeys = [...bPrints.keys()].sort();
  for (const k of aKeys) if (!bPrints.has(k)) differences.push(`${k}: missing from the descendant`);
  for (const k of bKeys) if (!aPrints.has(k)) differences.push(`${k}: present only in the descendant`);
  for (const k of aKeys) {
    if (!bPrints.has(k)) continue;
    const a = aPrints.get(k);
    const b = bPrints.get(k);
    if (a.length !== b.length) {
      differences.push(`${k}: ${a.length} tokens vs ${b.length}`);
      continue;
    }
    for (let i = 0; i < a.length; i++) {
      if (tokenKey(a[i]) !== tokenKey(b[i])) {
        differences.push(`${k}: token ${i} differs (${describeToken(a[i])})`);
        break;
      }
    }
  }
  return { identical: differences.length === 0, differences };
}

/**
 * Rewrite declared class tokens in a token stream, in place of the baseline's
 * old vocabulary, so a declared global rename compares clean while every other
 * attribute difference survives untouched.
 *
 * Only whole class TOKENS are rewritten — never substrings — so renaming
 * `fade-in` cannot silently alter `fade-in-late`. Anything left over after the
 * rewrite is a real difference and still fails, which is what keeps this from
 * being a blanket attribute waiver.
 *
 * @returns {{tokens: object[], used: Map<string, number>}}
 */
export function applyRenameMap(tokens, renames) {
  const map = new Map(renames.map((r) => [r.from, r.to]));
  const used = new Map();
  if (map.size === 0) return { tokens, used };
  const out = tokens.map((t) => {
    if (t.kind !== 'element' || !t.attrs.includes('class=')) return t;
    const attrs = t.attrs.replace(/class="([^"]*)"/, (whole, value) => {
      let touched = false;
      const rewritten = value.split(/\s+/).map((tok) => {
        if (!map.has(tok)) return tok;
        touched = true;
        used.set(tok, (used.get(tok) || 0) + 1);
        // `to: null` is a declared REMOVAL: the token is dropped from the
        // baseline's class list rather than rewritten. Filtered out below, so
        // `class="grid-3 grid-3--mt-2"` becomes `class="grid-3"` — exactly what
        // the candidate's markup renders. Every OTHER token on the same node
        // survives untouched and still fails if it changed.
        return map.get(tok);
      }).filter((tok) => tok !== null).join(' ');
      return touched ? `class="${rewritten}"` : whole;
    });
    return attrs === t.attrs ? t : { ...t, attrs };
  });
  return { tokens: out, used };
}

/** Rename entries whose `from` never appeared: dead declarations, flagged. */
export function staleRenames(renames, used) {
  return renames.filter((r) => !used.has(r.from)).map((r) =>
    `rename entry "${r.from}" -> ${r.to === null ? '(removed)' : `"${r.to}"`} `
    + `never matched a class token anywhere `
    + `(${r.reason}). A rename that did not happen is a dead declaration; remove it, or `
    + `find out why the class stopped appearing.`);
}
