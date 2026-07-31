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
    if (e.op !== 'removed' && e.op !== 'added') {
      throw new Error(`${file}: ${where} needs "op" of "removed" or "added", got `
        + `${JSON.stringify(e.op)}.`);
    }
    if (typeof e.tag !== 'string' || !e.tag) {
      throw new Error(`${file}: ${where} needs a "tag" (e.g. "LINK").`);
    }
    if (typeof e.contains !== 'string' || !e.contains.trim()) {
      throw new Error(`${file}: ${where} needs a "contains" substring identifying the node. `
        + `A whitelist entry that matches on tag alone would consume any node of that tag.`);
    }
    if (!Number.isInteger(e.count) || e.count < 1) {
      throw new Error(`${file}: ${where} needs an integer "count" >= 1. The count is what `
        + `stops a second, unexpected instance of the same change slipping through.`);
    }
    if (typeof e.reason !== 'string' || !e.reason.trim()) {
      throw new Error(`${file}: ${where} needs a "reason".`);
    }
    if (typeof e.commit !== 'string' || !e.commit.trim()) {
      throw new Error(`${file}: ${where} needs a "commit" — the change that made this `
        + `deletion or addition legitimate, so a reviewer can check it.`);
    }
    return { ...e, contains: e.contains };
  });
}

/**
 * Apply the whitelist to one page's diff.
 *
 * Consumption is COUNTED and per-page. An entry declaring `count: 1` consumes
 * one matching op and no more: a second, unexpected instance of the very same
 * change still fails, which is the difference between a declaration and a mute
 * button.
 *
 * @returns {{failures: object[], consumed: Map<number, number>}}
 */
export function applyWhitelist(ops, whitelist) {
  const budget = whitelist.map((e) => e.count);
  const consumed = new Map();
  const failures = [];

  for (const op of ops) {
    let matchedIdx = -1;
    for (let i = 0; i < whitelist.length; i++) {
      const e = whitelist[i];
      if (budget[i] <= 0) continue;
      if (e.op !== op.op) continue;
      if (op.token.kind !== 'element') continue;
      if (op.token.tag !== e.tag.toUpperCase()) continue;
      if (!op.token.attrs.includes(e.contains)) continue;
      matchedIdx = i;
      break;
    }
    if (matchedIdx === -1) { failures.push(op); continue; }
    budget[matchedIdx] -= 1;
    consumed.set(matchedIdx, (consumed.get(matchedIdx) || 0) + 1);
  }
  return { failures, consumed };
}
