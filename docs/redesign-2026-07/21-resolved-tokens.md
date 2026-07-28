# Resolved Tokens — Single Source of Truth

**Arbiter:** independent resolver (not an author of 10–14) — 2026-07-28
**Status:** authoritative. Where this file and any of `10`–`14` disagree, **this file wins.** Ted implements contested values from here only; write-order in the spec corpus decides nothing.
**Scope:** every token or shared decision that appears in two or more specification documents, plus collisions found on adversarial sweep. Tokens owned by exactly one document are *not* restated here and cannot collide — the type scale, leading, and tracking blocks remain authoritative in `11-beatrice-typography.md` §2, the Cloudinary role table in `12 §3.1`, the modal state table in `14 §1`.
**Evidence base:** `15-mood-board.html` is the approved visual direction (Lee signed off on it); its computed values were extracted directly, not quoted from the specs. Live values verified against `styles.css:9–75`. Contrast ratios calculated (WCAG 2.x relative luminance), not estimated.

---

## 1. The resolved `:root` block

Paste-ready. Canonical names follow the mood board's vocabulary (`--ground`, `--ink`, `--rule`, `--ember`), which is also what Jen's and Saul's specs reference. The legacy alias block at the bottom keeps all 2,871 live lines resolving during migration; it is deleted when WP-1b completes.

```css
:root {
    /* ===== Surfaces — the warm ramp (mood board; Saul §7.3 anti-convergence) ===== */
    --ground:     #0c0c0c;
    --elevated:   #161512;   /* NOT #1a1a1a — see R7 */
    --rule:       #2a2724;   /* the one hairline colour — see R6 */
    --rule-hover: rgba(196, 165, 123, 0.45);   /* Jen §5.2 border-warm on hover */

    /* ===== Ink — three honest tokens, nothing else (Jen §4.3) ===== */
    --ink:        #e8e6e3;   /* 15.9:1 on ground */
    --ink-quiet:  #9a9590;   /*  6.6:1 on ground — AA at every size */
    --ink-faint:  #7f7a74;   /*  4.6:1 on ground — ADJUSTED from #6b6762, see R5 */

    /* ===== Accent ===== */
    --ember:       #c4a57b;
    --ember-quiet: rgba(196, 165, 123, 0.18);

    /* ===== Layout ===== */
    --gutter:         clamp(1.5rem, 6vw, 7rem);   /* see R1 */
    --measure:        65ch;      /* prose — live value, uncontested */
    --measure-narrow: 34rem;     /* thesis/lede column — see R2 */
    --measure-thesis: 26ch;      /* serif display line cap — Jen §2.1B = mood board .thesis */
    --hold:           75rem;     /* 1200px — the one contained tier, see R8 */
    --hold-wide:      87.5rem;   /* 1400px — .wide-container, unchanged */
    --width-frame:    120rem;    /* 1920px — body frame, unchanged */
    --overflow-reach: 4rem;      /* Essay image outward overflow — Jen §2.4, Saul caps at 769–1024px */

    /* ===== Section rhythm — three tiers (Jen §2.0; see R3) ===== */
    --section-pad:       clamp(6rem, 14vh, 10rem);
    --section-pad-tight: clamp(3.5rem, 8vh, 5rem);
    --section-pad-open:  clamp(8rem, 18vh, 13rem);

    /* ===== Plates (Jen §2.1C = mood board .plate/.pair, agreement) ===== */
    --plate-h:      clamp(24rem, 78svh, 46rem);
    --plate-pair-h: clamp(20rem, 52svh, 34rem);

    /* ===== Type floor (Beatrice §2 — absolute, zero exceptions; see R4) ===== */
    --text-2xs: 0.6875rem;   /* 11px. Nothing on the site renders below this. */

    /* ===== Radius (Jen §4.1, uncontested) ===== */
    --radius-sm: 2px;   /* interactive: buttons, inputs, chips */
    --radius-md: 2px;   /* alias of sm — kept for compat, retire post-migration */
    --radius-lg: 0;     /* surfaces are square */

    /* ===== Elevation & scrims ===== */
    --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.35);   /* the ONLY shadow — hover-lift, Jen §4.3/§5.2 */
    --nav-scrim:    rgba(12, 12, 12, 0.72);            /* nav bar bg + backdrop blur(8px) — the one sanctioned blur */
    --hero-scrim:   linear-gradient(transparent 40%, rgba(12, 12, 12, 0.72));  /* sub-page hero h1 only */

    /* ===== Motion (Jen §5, mood board implementation) ===== */
    --transition-fast:   200ms ease-out;
    --transition-micro:  250ms ease-out;   /* accordion, mobile menu, modal steps — Jen §5.4 = Wim §1, agreement */
    --transition-image:  600ms cubic-bezier(0.22, 0.61, 0.36, 1);
    --transition-reveal: 1000ms cubic-bezier(0.22, 0.61, 0.36, 1);
    --reveal-shift:  28px;
    --stagger-step:  120ms;    /* per-child delay, --i capped at 4 */
    /* --transition-medium / --transition-slow: DELETED with their consumers */

    /* ===== Legacy aliases — migration bridge only. Delete when WP-1b closes. ===== */
    --color-muted-black:   var(--ground);
    --color-bg-dark:       var(--elevated);
    --color-bg-grey:       var(--elevated);     /* #111111 collapses into elevated — two surfaces only */
    --color-border-subtle: var(--rule);
    --color-soft-grey:     var(--rule);
    --color-off-white:     var(--ink);
    --color-charcoal:      var(--ink-quiet);    /* the lying name — retire with prejudice */
    --color-text-muted:    var(--ink-quiet);
    --color-text-subtle:   var(--ink-quiet);
    --color-text-faint:    var(--ink-quiet);
    --color-text-feature:  var(--ink-quiet);    /* was #ccc; nearest honest role is quiet — Ted verifies per surface */
    --color-text-dim:      var(--ink-faint);    /* was #666 (3.4:1, failed AA) */
    --color-warm-wood:     var(--ember);
    /* Re-base the drifted alphas: --color-warm-wood-alpha-10/-25/-30 currently use
       rgb(184,156,104) — a different colour than the accent. All ember alphas use
       rgb(196,165,123) from here on. See R9. */
    --color-warm-wood-alpha-10: rgba(196, 165, 123, 0.1);
    --color-warm-wood-alpha-25: rgba(196, 165, 123, 0.25);
    --color-warm-wood-alpha-30: rgba(196, 165, 123, 0.3);
}
```

---

## 2. Resolution table — tokens

| # | Token | Chosen value | Lost | Why |
|---|---|---|---|---|
| R1 | `--gutter` | `clamp(1.5rem, 6vw, 7rem)` | Saul (12:223, `5vw/6rem`) | The mood board — the artifact Lee approved — uses exactly Jen's value (`15:17`). The wide desktop gutter is part of the monograph register he signed off on. Saul stated no rationale for the tighter value, so there is nothing to weigh against the approved evidence. |
| R2 | `--measure-narrow` | `34rem` | Jen (10:46, `38rem`); Jen's name `--hold-narrow` also retired | The mood board's `--measure` is 34rem (`15:16`) and every thesis block in it is set to that width — 34rem is what Lee looked at and approved. Jen's 38rem is 11% wider with no stated argument. Saul's *name* wins too: it is a measure (a reading width), not a hold (a container). The plan's own 34rem stands. |
| R3 | `--section-pad` / `-tight` / `-open` | Jen's three tiers (10:39–41) | Saul (12:248, restating flat `clamp(6rem,16vh,12rem)`) | The two arguments are not the same weight. Jen's §1.1 is a reasoned dismantling of the flat rhythm ("one rhythm is a metronome"; compression requires a genuinely dense register, so density needs its own padding tier). Saul's line is a one-sentence carry-over from the board with no engagement of her critique. Rhythm is Jen's lane, and her critique of the board stands unchallenged anywhere in the corpus. The board's flat value is bracketed by her system (`--section-pad` tops at 10rem, `--section-pad-open` at 13rem), so nothing Lee approved becomes unreachable. Both docs agree plates sit between sections at `padding-block: 0`. |
| R4 | Type floor | `0.6875rem` (11px), **absolute, zero exceptions** | Jen ×2 (10:23 caption `0.68rem`, 10:246 scroll-cue `0.65rem`); Saul ×2 (12:304 eyebrow `0.68rem`, 12:308 provenance `0.66rem`) | Type legibility is Beatrice's lane and her floor (11:80) has a stated physical rationale (phone, sunlight, 2x DPR tracking render). All four violations are inherited from mood-board specimen labels, which she explicitly exempts as specimen-only. Remap: index captions, the "Scroll" cue text, section-index eyebrows, and plate provenance marks all set at `--text-2xs`. The deltas are 0.1–0.6px — invisible individually, but an absolute floor only works with zero exceptions. |
| R5 | `--ink-faint` | `#7f7a74` (adjusted) | Everyone — the math wins | The specified `#6b6762` measures **3.49:1** on `#0c0c0c`: an outright AA failure (4.5:1) at every small size the token is actually used at — 11px captions, provenance marks, footer fine print. Jen's guard rule ("faint never below 0.8rem", 10:214) was violated by her own caption spec and twice by Saul, which proves the rule unenforceable; so the *value* is fixed instead and the 0.8rem rule is **retired**. `#7f7a74` keeps the warm hue (R>G>B), measures **4.60:1** on ground — AA at all sizes — and stays clearly distinct from `--ink-quiet` (6.6:1). Remaining constraint, stated once: on `--elevated` (#161512) faint measures 4.29:1, so **on elevated surfaces faint may only be used at large-text sizes (≥24px / ≥19px bold, where 3:1 applies); small metadata on elevated uses `--ink-quiet`.** In practice captions, provenance, and footer text all sit on ground, so this rarely binds. |
| R6 | `--rule` | `#2a2724`, one token | The live stylesheet (`--color-soft-grey #2a2a2a` + `--color-border-subtle #3a3a3a`, both cool) | The site currently runs **two** cool border greys doing one job; the board and Saul (12:300) specify one warm value, and the warm ramp is a named anti-convergence signature ("template dark modes are cool-grey", 12 §7.3). Jen's §4.2 rows reference `var(--color-border-subtle)` by name, not value — the alias makes her spec resolve to the warm value unchanged. Both legacy names alias to `--rule` and retire post-migration. Advisory for Ted: at 1.32:1 the rule is decorative-subtle by design; static form-input borders may need the existing warm-wood focus treatment to carry WCAG 1.4.11 perceivability — flag in WP-1b if a static input reads as invisible. |
| R7 | `--elevated` | `#161512` | Jen (10 §2.0/§4.3, `#1a1a1a`) — *sweep finding, not on the critic's list* | Jen specifies the elevated surface three times as `#1a1a1a`, which is the live site's cool `--color-bg-dark`. The approved board's elevated is the **warm** `#161512` (`15:6`). A cool elevated surface inside an otherwise all-warm ramp (rule `#2a2724`, quiet `#9a9590`) is exactly the two-generation seam this program exists to remove, and warmth-to-the-token-level is Saul's approved differentiator. `--color-bg-grey` (#111111) also collapses here: Jen's §4.3 allows exactly two surface colours, ground and elevated. |
| R8 | `--hold` | `75rem` (1200px), single contained tier | Jen (10:45, `72rem`) — *sweep finding, not on the critic's list* | Jen's 72rem (1152px) and the live `.container` 1200px would coexist 48px apart — a duplicate tier that visibly misaligns a Ledger against a card grid stacked on the same page, i.e. two design systems averaged by accident. One must go. The live 1200px wins because every existing component is built against it, making the token migration zero-regression on containers — and the board's 72rem was a demo page frame, not a number anyone approved as such. Saul's own verdict ("container 1200 stays — refinement, not rebuild", 12 §4.1) is the governing instinct. |
| R9 | Ember alpha base | `rgb(196,165,123)` for **all** alpha variants | The live stylesheet — *sweep finding* | Three of the five live warm-wood alphas are built on `rgb(184,156,104)` (= `#b89c68`), a silently different accent. One accent, one base. |
| R10 | Eyebrow spec | Section kicker: `--text-2xs` / `--tracking-caps-wide` (0.2em) / `--ember`, one per section. All other micro-labels: Beatrice's base spec (`--text-xs` / `--tracking-caps` 0.14em / `--ink-quiet`) | Nobody wholesale — reconciled *inside* Beatrice's system | The board's ember eyebrow (0.68rem/0.2em/`#c4a57b`) is the approved wayfinding element and Saul's §6.2 depends on it; Beatrice's base `.eyebrow` (12px/0.14em/muted) would erase it. But her system already contains the answer: `--tracking-caps-wide` is defined "eyebrows/kickers only" (11:64). So the section kicker uses her wide tracking, the board's ember colour, and `--text-2xs` — her own concession note ("the absolute size comes up ~1px", 11:80) confirms the size. Spec labels, badges, and dates stay on her base spec. |

Uncontested and confirmed in passing: `--measure: 65ch` (Jen = Beatrice = live), `--measure-thesis: 26ch` (Jen §2.1B = board `.thesis`), plate heights (Jen §2.1C = board), radius collapse (Jen §4.1, no dissent), body leading 1.65 (Beatrice's lane; the board's 1.75/1.8 are demo values she formalizes), 250ms micro-motion (Jen §5.4 = Wim §1).

---

## 3. Non-token decisions

| # | Decision | Chosen | Lost | Why |
|---|---|---|---|---|
| N1 | **Nav mark** | Wordmark SVG, `currentColor`, **22px** desktop / **18px** mobile (monogram 20px on mobile if the wordmark crowds the hamburger). Badge leaves the chrome entirely; its one web home is the **footer at 72px** as the maker's seal. Favicon = monogram, designed in the mark phase. | Jen (48px naked badge, 10 §4.2); current site (115px pill) | Saul's position is an argument; Jen's is a size. A detailed circular badge — steam curls, text ring — is illegible as chrome at any nav-plausible scale, and the studios this register borrows from (Olson Kundig, Norm, Nakashima) identify by name and sign with a seal. Jen herself deferred the call to her Stage 3 gate rather than defending 48px (12 §5.1 handoff), and Saul's footer-seal placement preserves the badge's meaning instead of deleting it. **Gated: see E1 — Lee must sign off on removing the badge from the nav before any WP-2 mark work ships.** Asset dependency: wordmark re-cut as clean SVG from `~/marvin/content/assets/logo-original.pdf` (the existing `logo.svg` is raster-in-SVG-clothing, 12 §5.5); 2x PNGs are the sanctioned stopgap. |
| N2 | **Hero choreography** | Mood board / Jen §5.3: **nothing on the photograph** — image, nav, scroll cue only. The `<h1>` lives in the Thesis section immediately below (SEO intact; George's home copy is already written this way). **One** motion system: `.reveal` + IntersectionObserver, observed on load, `--i` stagger — image `--i:0`, nav `--i:1`, cue `--i:2`, settle ≈1.24s. Scroll is never blocked. | Wim (14:121 — heading and subline fade up over the photo at t≈2.0s; and his separate 1.2s/2.0s/3.0s timer choreography) | The approved artifact is unambiguous: the hero section is commented "empty on purpose" and its own annotation reads "**No headline over it, no button, no logo competing for the frame.**" A timed fade-up of a heading onto the photo is the opposite of what Lee approved. On mechanism, Jen's spec *is* the board's shipped implementation (`15:590–611`), and a second timer-based system alongside the reveal system is exactly the "no separate intro system" failure her §5.1 rules out. What survives from Wim, explicitly: scroll-never-blocked (both agree), reduced-motion renders fully composed, the mobile `w_828` srcset requirement, and his `hero_hold_complete/skipped` instrumentation — which is the *right* way to revisit hold timing later: with data, not taste. |
| N3 | **Hero link** | No link on the photograph. Rung-1 asks ("See the saunas" etc.) begin in the Thesis section on first scroll. | Wim (14:127, "the hero's own single quiet link"); George's conditional hero-link fallback (13:26) becomes moot | Same evidence as N2 — "no button" is in the approved board's own caption. George's primary copy already puts no button in the first block; his fallback was conditioned on the journey design wanting one, and the resolved journey doesn't. |
| N4 | **Configurator buttons** | Wim's two-step structure governs: Step 1 button **"Request This Quote"** (transitions in place, never navigates), Step 2 submit **"Send Quote Request"**. George's helper, success, and failure lines carry into Step 2 — **minus any reply-time promise** (Lee-gated, see E3). Sitewide primary CTA **"Get a Quote"** (George §1) stands, with his one sanctioned variant on the contact submit. | George's modal button "Send This Configuration" (13:377) | Conversion architecture is Wim's lane and his six-state table is the best-specified artifact in the corpus. George's label was written for a one-step flow that no longer exists — in a two-step modal, "Send This Configuration" on Step 1 would promise a send the button doesn't perform, violating George's own rule 6 ("buttons promise exactly what they do"). Wim's pair keeps the promise honest at both steps: the request begins in place, the send happens where the send button is. |
| N5 | **Configurator storage** | `localStorage`, keyed `ssc_quote_config`, stored timestamp, 7-day expiry checked on read, cleared only on confirmed success. | Wim as written (14:45, `sessionStorage` + 7-day expiry) | Implementer trap, recorded here so 14 §1 is not implemented verbatim: `sessionStorage` is per-tab and dies on tab close — a 7-day expiry against it is incoherent. Wim's *intent* (survive a return visit within a week) is the part that stands; `localStorage` is the mechanism that delivers it. (Matches the critic's Approach-soundness fix.) |

---

## 4. Escalations — Lee's calls, not ours

Nothing below is resolved by this file. Do not guess; do not let a relay batch invent an answer mid-flight.

1. **E1 — Badge removal from the nav (gates WP-2 mark work).** N1 is the department's resolved recommendation: wordmark in the nav, badge to the footer as the seal. It goes further than what Lee has previously seen (Jen's audit said 48px badge). He must approve the badge leaving the chrome before any nav-mark implementation ships. Until then, no WP-2 mark row executes.
2. **E2 — Per-model price rows on `/saunas/`.** Jen's ledger-row spec (10 §3.2) and George's model cards both show per-model prices; Jen correctly flags exposure as a business call (10 §6.7). Note for the ask: per the critic, per-model prices are *already live* at `saunas.njk:214–274`, so this is likely a confirmation rather than a new exposure — but it is his to confirm.
3. **E3 — Reply-time promise.** N4's success copy needs "expect a reply within X" and X must come from Lee — already queued as `20-fact-gathering-questions.md` D46. George's "typically within one business day" is a post-submission courtesy line on the thank-you page being converted into a pre-submission promise; it does not ship anywhere until Lee gives the number he can hit on a bad week.

---

*Every contested value above now has exactly one home. If a sixth document appears and disagrees with this one, the sixth document is wrong until this file is amended.*
