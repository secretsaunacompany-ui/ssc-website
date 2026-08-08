# Critic Review ROUND 3 (final) — code-refresh-2026-08-06-remediation.md

Reviewer: fresh critic (session model, no override), rubric v2. Round 3 of the
convergence loop (cap 3). Mandate: (a) verify the round-2 folds as written,
(b) hunt genuinely new issues, especially second-order effects of the folds.
Prior findings NOT re-litigated. Every claim below verified against the tree at
`refresh/2026-08-06` (bucket A applied).

## Applicability block

Incorporated by reference from round 1 (same project type, same conditional
set, same severities). Re-attested unchanged: X1 does not fire (software-only
website work, no hardware or hazardous control path — explicit negative
attestation); X7 does not fire (B1/B2 alter the project's own test gates, not
MARVIN's hooks/skills; fail-closed discipline scored under core 7/9 — explicit
negative attestation). X2/X3/X4 GATING, X5/X6/X8 advisory, as in rounds 1–2.

## (a) Round-2 fold verification

**Fold 1 — B1 fixture migration (r2 MF-1): SOUND as written.** Verified against
visual-diff.test.mjs:
- The two named sites exist as described: the F1 waiver-immunity fixture
  (:654-661) and the G-fixture `gcfg` (:769-777) both spread the shipped config
  and replace `expectedToChange` with expiry-less synthetic entries.
- The sweep language ("EVERY synthetic expectedToChange fixture") is what makes
  the fold sound, because the enumeration is incomplete on purpose: additional
  sites exist at :1093, :1156, :1483 (the valid `ok` fixture), and the
  rejection cluster :1468-1478. The plan's sweep covers them; the two line
  numbers are illustrations, not the scope.
- `loadConfig(file, readFile, now = Date.now())` (gate.mjs:87) confirms the
  injectable-`now` mechanism; the pageOverrides validator (:281-309) is the
  correct parity template including the ≤90-day horizon (:294-302) and
  expired-fails-loud (:303-309).
- Consumer sweep, second-order: dom-integrity.mjs has its OWN loadConfig
  (:76) reading its OWN file (dom-integrity.config.json, :227-228) and never
  touches expectedToChange — no hidden second consumer breaks. The complete
  visual-diff.config.json consumer set is visual-diff.mjs:289 (real clock,
  covered by the deploy-clock item) and visual-diff.test.mjs (:627 shipped
  read + the fixtures above). Fully accounted for.

**Fold 2 — B1 reason-clause amendment + deploy-clock docking (r2 MF-2): SOUND
but INCOMPLETE (see MF-1 below).** The clause "the schema has no expiry field
for expectedToChange" exists verbatim in the shipped `/` entry's reason
(visual-diff.config.json) and the amendment directive is right; the deploy
checklist line correctly covers all three entries ("re-stamp or retire the
three…") and the report names the date. What the fold missed: the same
now-false schema claim lives on TWO more documentation surfaces (new finding,
MF-1).

**Fold 3 — B4 reachable-half scope cut (r2 MF-3): diagnosis and cut CORRECT,
close-focus mechanism as specced CONTRADICTS its own rationale (see MF-2).**
Re-verified the diagnosis: gallery invokers are plain
`<div class="gallery-item …">` (saunas.njk:229+), gallery.js attaches direct
click listeners (attachClickHandlers) bypassing init.js's
`[data-action][role="button"]` keyboard hub; the lightbox container
(src/_includes/modals/lightbox.njk) carries no role/aria-modal today. Deferring
the tabbable-grid change to Jen's lane as a named residual is the right call.
The flaw is in the folded wording: "on close, focus goes to **document.body
explicitly** — coded so it starts working the day invokers become focusable."
A hardcoded `document.body.focus()` can NEVER restore focus to an invoker, on
any future day — the mechanism that delivers the stated claim is
capture-`document.activeElement`-at-open / restore-on-close (which resolves to
`<body>` today and to the invoker the day invokers are focusable). As written,
B4 ships code whose stated future-proofing is structurally false.

## (b) New findings

**Core 8, Data integrity — CONCERN (MF-1).** B1 makes `expires` mandatory, and
THREE surfaces document the expiry-less schema; the fold amends only one:
1. the `/` entry's reason clause (folded, r2 MF-2) — covered;
2. `visual-diff.config.json` `_notes.expectedToChange` — documents the shape as
   `{ "route": …, "reason": …, "waive": […] }` with no `expires`, in a config
   whose `_notes.authority` declares the notes the reviewable contract (contrast
   `_notes.pageOverrides`, which documents its expiry discipline in full);
3. `scripts/README.md:72-82` — same expiry-less shape (its example is already
   missing `waive` too; fix both while there).
Consequence is fail-closed (a reader following the docs writes an entry that
hard-errors at load), so this is drift, not a hole — but it is exactly the
"config honesty" class round 2 gated on, and the fix is one line per surface
in the same migration commit.

**Core 9, Verifiability — PASS with two advisories.**
- The rejection fixtures at :1468-1478 assert SPECIFIC error substrings
  ('per-metric', 'never be waived', 'unknown metric', 'reason'). B1 should
  clone pageOverrides' intra-entry validation ORDER (reason at :276 before
  expires at :281) so a missing-reason fixture still throws the reason error —
  though the plan's stamp-every-fixture sweep makes ordering moot if actually
  applied to the rejection fixtures too (a stamped entry can only fail for its
  intended cause). Either discipline works; pick one consciously.
- "Stamps computed relative to loadConfig's injected `now`": the F1/G/withCfg
  call sites currently pass NO third argument (default Date.now()). Both
  compliant readings — inject an explicit `now`, or compute the stamp from the
  live clock at fixture-build time — satisfy the anti-rot intent; the
  implementer should state which. Not blocking.

**Core 3, Completeness — PASS with one advisory.** The lightbox include is
UNGUARDED in footer.njk:58 (comment says so deliberately), so B4's role/
aria-modal addition changes the DOM fingerprint on all 19 routes, same blast
radius as D6's footer privacy link. The equivalence gate's "intended changes
enumerated" covers it generically; enumerate it explicitly beside D6's so the
dom-integrity declaration isn't discovered at gate time. (B4's w_1600 swap is
lightbox-only `src` state, invisible to captures — no declaration needed.)

**Everything else hunted, found clean:** withCfg's spread-of-shipped-config
means several validation fixtures inherit the live entries' real stamps under a
real clock — same suite-bricks-on-lapse consequence round 2 already docked to
the deploy checklist, no new blast radius. B1's zero-fire warning is
runner-level and cannot misfire in evaluatePair-level fixtures. D5/D6/D7
surfaces unchanged since r2 verification. No consumer of gate.mjs's
expectedToChange map exists outside visual-diff.{mjs,test.mjs} (grep-verified).
X-dimension deltas: none — X2/X3/X4 unchanged by the folds (the folds touch
harness fixtures, config prose, and focus mechanics; no PII, copy, or money
surface moves).

## Stress tests (round-3 additions only)

**Pre-mortem:** (1) *Next quarter someone adds an expectedToChange entry by
copying the README/_notes example, gets a hard error naming a field no doc
mentions, and "fixes" it by copying a stale 60-day date from git history —
which then trips the horizon or expires mid-batch.* MF-1 removes the trap at
its source. (2) *Invokers become focusable in Jen's Wave B pass; QA reports
"focus still dumps to body on close"; the B4 code everyone believed was
future-proof needs rewriting anyway.* MF-2 makes the same-cost implementation
actually deliver the claim.

**Load-bearing assumptions:** (1) *The stamp-all sweep is actually applied to
the rejection fixtures, not just the valid ones* — if skipped there, validation
order becomes load-bearing; the advisory names both disciplines. (2) *No other
tool parses visual-diff.config.json's entry shape* — grep-verified across
scripts/, js/, src/; high confidence.

**Inversion:** *Would warn-only expires for fixtures (validate only the shipped
file) have been simpler?* It would dissolve the fixture sweep — but it forks
the parser into trusted/untrusted paths, and F1's waiver-immunity check exists
precisely because fixtures must go through the SHIPPED parser. The plan's
single-parser choice is right; the sweep is its honest cost.

## Overall verdict

**APPROVE WITH CHANGES.** All three round-2 folds check out against the tree in
mechanism and scope — the fixture-migration fold is sound precisely because its
sweep language outreaches its illustrative line numbers, the deploy-clock
docking covers all three entries, and the B4 cut draws the scope line in the
right place. The two remaining blockers are small and of the same species the
loop has been converging on: one documentation surface the config-honesty fold
didn't finish sweeping, and one folded sentence that specs a mechanism unable
to deliver its own stated rationale. Both are one-to-two-line plan amendments;
neither disturbs any batch's structure. With MF-1 and MF-2 folded, this plan is
converged — no further round warranted.

## Prioritized must-fix list

1. **[B1 / finish the schema-doc sweep]** Extend the reason-clause amendment to
   the other two surfaces documenting the expiry-less shape:
   `visual-diff.config.json` `_notes.expectedToChange` (add `expires` to the
   documented shape, note the ≤90-day horizon and expired-fails-loud, mirroring
   `_notes.pageOverrides`) and `scripts/README.md:72-82` (whose example also
   omits the already-mandatory `waive` — fix both fields). Same commit as the
   migration.
2. **[B4 / close-focus mechanism]** Replace "on close, focus goes to
   document.body explicitly" with: capture `document.activeElement` at open,
   restore it on close (resolves to `<body>` today — same no-op — and to the
   invoker the day invokers become focusable). As specced, the hardcoded
   body.focus() contradicts the fold's own "starts working" claim; the
   capture/restore version also un-strands focus from the hidden close button
   today, at identical cost.

Advisory (non-blocking): clone pageOverrides' intra-entry validation order
(reason before expires) OR stamp the :1468-1478 rejection fixtures too — state
which; say whether fixture stamps inject `now` or compute from the live clock;
enumerate B4's all-route role/aria-modal DOM delta beside D6's footer change in
the equivalence-gate declarations (lightbox ships unguarded via footer.njk:58).
