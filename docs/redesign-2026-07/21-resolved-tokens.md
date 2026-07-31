# Resolved Tokens — Single Source of Truth

**Arbiter:** independent resolver (not an author of 10–14) — 2026-07-28
**Status:** authoritative. Where this file and any of `10`–`14` disagree, **this file wins.** Ted implements contested values from here only; write-order in the spec corpus decides nothing.
**Amended 2026-07-28 (completeness audit):** the first issue of this file resolved the eight collisions correctly but presented a `:root` block that omitted whole token families the live stylesheet depends on — `--spacing-*` alone has 108 live uses — while claiming to keep all 2,871 lines resolving. That claim was the defect. This issue carries a full inventory of every live custom property (§5), a genuinely complete block (§1), the migration call-site ledger (§6), and a contrast verification sweep (§7). Every count below was re-derived by grep against the working tree; nothing is inherited from earlier reviews. The eight resolutions (§2) are unchanged; five amendments forced by the audit are logged in §2.1 with reasons.
**Scope:** every token or shared decision that appears in two or more specification documents, plus collisions found on adversarial sweep, **plus** (as of this amendment) every token the live stylesheet consumes, so the §1 block is complete rather than merely correct. Tokens owned by exactly one document keep their authoritative home — the type scale, leading, and tracking blocks in `11-beatrice-typography.md` §2, the Cloudinary role table in `12 §3.1`, the modal state table in `14 §1` — but §5 names them so the omission is explicit, not silent.
**Evidence base:** `15-mood-board.html` is the approved visual direction (Lee signed off on it); its computed values were extracted directly. Live values and all use counts verified against `styles.css` and `src/` by grep, 2026-07-28. Contrast ratios calculated (WCAG 2.x relative luminance), not estimated.

---

## 1. The resolved `:root` block

**Coverage, stated precisely.** This block defines or aliases every custom property the live stylesheet consumes: all **48** tokens declared in the live `:root` (`styles.css:9–75`), plus `--color-bg`, which the stylesheet consumes twice but never defined — a live bug (audit P0-3, Jen `10 §4.2`) this block fixes. Pasting it over the live `:root` leaves all 2,871 lines resolving. The value changes that pasting causes are enumerated in §5.3 — they are the migration's intent, not side effects.

**What this block does NOT contain, deliberately:**
- The type-scale / leading / tracking tokens (`--text-*` other than `--text-2xs`, `--leading-*`, `--tracking-*`). Single-owner, defined in `11 §2`; they land in WP-1a **alongside** this block. The full post-migration `:root` = this block + doc 11 §2's token block.
- The `@font-face` rules that define the two `* Fallback` families referenced in the font stacks below (`11 §6`). Until they land, browsers skip the unknown family names — the stacks below are paste-safe today.
- The component-scoped map-pin tokens (`--pin-size`, `--pin-core`, `--pin-color`, `--pin-color-dark`), defined at their components (`styles.css` locations map, not `:root`). Unaffected by this migration.

Canonical names follow the mood board's vocabulary (`--ground`, `--ink`, `--rule`, `--ember`), which is also what Jen's and Saul's specs reference. The legacy alias and bridge blocks at the bottom keep every live consumer resolving during migration; they are deleted when WP-1b completes and §6's ledger reaches zero.

```css
:root {
    /* ===== Surfaces — the warm ramp (mood board; Saul §7.3 anti-convergence) ===== */
    --ground:     #0c0c0c;
    --elevated:   #161512;   /* NOT #1a1a1a — see R7 */
    --rule:       #2a2724;   /* the one hairline colour — see R6 */
    --rule-hover: rgba(196, 165, 123, 0.45);   /* Jen §5.2 border-warm on hover */

    /* ===== Ink — three honest tokens, nothing else (Jen §4.3) ===== */
    --ink:        #e8e6e3;   /* 15.7:1 on ground — see A2 */
    --ink-quiet:  #9a9590;   /*  6.6:1 on ground — AA at every size */
    --ink-faint:  #7f7a74;   /*  4.6:1 on ground — ADJUSTED from #6b6762, see R5 */

    /* ===== Accent ===== */
    --ember:       #c4a57b;
    --ember-quiet: rgba(196, 165, 123, 0.18);

    /* ===== Validation ===== */
    /* Requirement specified by Jen Stage 3 (C26/C27); value derived + verified at
       implementation, 2026-07-31. This file resolved NO error token, so form
       validation was rendering in --ember-hover — the same warm tan as every
       price on the configurator, which made "this field is wrong" and "this costs
       $2,000" the same colour on the money screen.
       Desaturated warm red, hsl(6, 50%, 58%). Contrast verified (WCAG 2.x
       relative luminance, calculated not estimated): 5.28:1 on --ground and
       4.93:1 on --elevated — AA at every size on BOTH surfaces, which is required
       because validation renders in the modal (elevated) and on /contact/
       (ground). Hue sits 28 degrees off --ember (34.5deg), so it is not a darker
       ember; and it never carries the message alone — an invalid field gets a
       border AND text (C27). */
    --error: #c9695e;

    /* ===== Fonts — families carried, stacks CHANGED by Beatrice 11 §6 ===== */
    /* The two Fallback families are metric-tuned @font-face blocks (11 §6, WP-1a).
       Until those land the names are skipped — paste-safe either way. */
    --font-primary: 'Outfit', 'Outfit Fallback', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-heading: 'Cormorant Garamond', 'Cormorant Garamond Fallback', Georgia, serif;

    /* ===== Spacing — CARRIED UNCHANGED, no document disputes them (110 live uses) ===== */
    --spacing-xs: 0.5rem;
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 2rem;
    --spacing-xl: 3rem;
    --spacing-2xl: 4rem;     /* Jen's own spec consumes this (10:85, 10:310) */
    --spacing-3xl: 8rem;     /* bridge — retires to the --section-pad tiers; 5 call sites, §6.2 */

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

    /* ===== Radius (Jen §4.1, uncontested across documents; value changes vs live, §5.3) ===== */
    --radius-sm: 2px;   /* was 4px — interactive: buttons, inputs, chips */
    --radius-md: 2px;   /* was 6px — alias of sm, kept for compat, retire post-migration */
    --radius-lg: 0;     /* was 20px — surfaces are square */

    /* ===== Elevation & scrims ===== */
    --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.35);   /* the ONLY shadow — hover-lift, Jen §4.3/§5.2 */
    --nav-scrim:    rgba(12, 12, 12, 0.72);            /* nav bar bg + backdrop blur(8px) — the one sanctioned blur */
    --hero-scrim:   linear-gradient(transparent 40%, rgba(12, 12, 12, 0.72));  /* sub-page hero h1 only */

    /* ===== Utility constants — CARRIED, no document disputes the tokens ===== */
    /* WP-1b flag: the 5 white-text call sites (§6.4) are candidates for --ink under
       Jen §4.3's three-token ramp — Jen's call at Stage 3, not resolved here. */
    --color-black: #000;
    --color-white: #fff;

    /* ===== Alpha overlays — CARRIED; consumers thin out in WP-1b (§6.3) ===== */
    --color-white-alpha-03: rgba(255, 255, 255, 0.03);
    --color-white-alpha-05: rgba(255, 255, 255, 0.05);
    --color-white-alpha-08: rgba(255, 255, 255, 0.08);
    --color-white-alpha-10: rgba(255, 255, 255, 0.1);
    --color-black-alpha-30: rgba(0, 0, 0, 0.3);
    --color-black-alpha-80: rgba(0, 0, 0, 0.8);   /* one consumer (nav) → --nav-scrim in WP-1b, then retire */
    --color-black-alpha-95: rgba(0, 0, 0, 0.95);  /* .lightbox-overlay */

    /* ===== Accent support — CARRIED ===== */
    --ember-hover: #d4b58b;   /* button hover fill — colour-only hover is sanctioned, Jen §5.2 */
    --ember-dark:  #a08060;   /* one consumer: .comparison-header.ours gradient — §6.5 */

    /* ===== Motion (Jen §5, mood board implementation) ===== */
    --transition-fast:   200ms ease-out;   /* was 0.3s ease — 20 live declarations change, §5.3 */
    --transition-micro:  250ms ease-out;   /* accordion, mobile menu, modal steps — Jen §5.4 = Wim §1, agreement */
    --transition-image:  600ms cubic-bezier(0.22, 0.61, 0.36, 1);
    --transition-reveal: 1000ms cubic-bezier(0.22, 0.61, 0.36, 1);
    --reveal-shift:  28px;
    --stagger-step:  120ms;    /* per-child delay, --i capped at 4 */

    /* ===== Motion bridge — live values, deleted WITH their consumers in WP-1b (see A3) =====
       The first issue deleted these two tokens while their 18 live declarations still
       existed — that is the paste that breaks the site. They stay until §6.2's motion
       rows are executed, then go. */
    --transition-medium: 0.5s ease;
    --transition-slow:   0.8s ease-out;

    /* ===== Legacy aliases — migration bridge only. Delete when WP-1b closes. ===== */
    --color-muted-black:   var(--ground);
    --color-bg:            var(--ground);       /* NEW — consumed at 2 call sites, never defined.
                                                   Fixes audit P0-3 (Jen §4.2); see A5 */
    --color-bg-dark:       var(--elevated);
    --color-bg-grey:       var(--elevated);     /* #111111 collapses into elevated — two surfaces only */
    --color-border-subtle: var(--rule);
    --color-soft-grey:     var(--rule);
    --color-off-white:     var(--ink);
    --color-charcoal:      var(--ink-quiet);    /* the lying name — retire with prejudice; call sites §6.1 */
    --color-text-muted:    var(--ink-quiet);
    --color-text-subtle:   var(--ink-quiet);
    --color-text-faint:    var(--ink-quiet);
    --color-text-feature:  var(--ink-quiet);    /* was #ccc; nearest honest role is quiet — Ted verifies per surface */
    --color-text-dim:      var(--ink-quiet);    /* was #666 (3.4:1, failed AA). CHANGED from --ink-faint — see A1 */
    --color-warm-wood:     var(--ember);
    /* Re-base the drifted alphas: --color-warm-wood-alpha-10/-25/-30 currently use
       rgb(184,156,104) — a different colour than the accent. All ember alphas use
       rgb(196,165,123) from here on. See R9. -04 and -05 were already on the correct base. */
    --color-warm-wood-alpha-04: rgba(196, 165, 123, 0.04);
    --color-warm-wood-alpha-05: rgba(196, 165, 123, 0.05);  /* dies with .section--warm-glow (10:171, 12:316) */
    --color-warm-wood-alpha-10: rgba(196, 165, 123, 0.1);
    --color-warm-wood-alpha-25: rgba(196, 165, 123, 0.25);
    --color-warm-wood-alpha-30: rgba(196, 165, 123, 0.3);
    /* Shadow bridge: the two live hover-shadow consumers resolve to the one sanctioned
       shadow. Visible change on 2 hover states — it is the spec'd end state arriving
       early (Jen §4.3/§5.2). --shadow-sm/-md had ZERO live uses (verified) — deleted. */
    --shadow-lg: var(--shadow-hover);
    --shadow-xl: var(--shadow-hover);
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

### 2.1 Amendments from the completeness audit (2026-07-28)

Five changes to the first issue's block, each with its reason. No R-numbered resolution value changed.

| # | Change | Why |
|---|---|---|
| A1 | `--color-text-dim` alias re-pointed: `--ink-faint` → `--ink-quiet` | The first issue's alias violated its own R5 constraint. `--color-text-dim` has two live call sites; one is `.stat-source` — **0.8rem italic text sitting on `.stat-card`, whose background is `--color-bg-dark` → `--elevated`**. Faint on elevated is 4.29:1: an AA failure at that size, created by this file's own alias table. Beatrice independently ordered the same fix ("everywhere it sets running text — `.stat-source` — move to `--color-text-muted` minimum", 11:124). The other call site, `.comparison-list .x`, is a decorative glyph (exempt per Beatrice, and quiet only lightens it). Nothing that consumed `--color-text-dim` needs faint. |
| A2 | Ink ratio comment corrected: 15.9:1 → 15.7:1 | Recomputed: `#e8e6e3` on `#0c0c0c` = 15.70. The token value is unchanged; the comment was arithmetic drift. (The R5 figures re-verify exactly: 3.4853 and 4.6002.) |
| A3 | `--transition-medium` / `--transition-slow` bridged at live values instead of deleted | The first issue deleted them "with their consumers" — but the block was offered as paste-ready **before** WP-1b deletes those consumers, and 18 live declarations (10 + 14 `var()` occurrences) would have gone undefined, killing transition durations on cards, galleries, and all five reveal classes. The deletion still happens; it happens in WP-1b when §6.2's rows execute, not in this block. |
| A4 | `--shadow-lg` / `--shadow-xl` aliased to `--shadow-hover`; `--shadow-sm`/`-md` deleted outright | `sm`/`md` have zero live uses (verified) — safe to drop now. `lg`/`xl` have one hover consumer each (`.model-card:hover`, `.offering-card:hover`); aliasing them to the one sanctioned shadow is Jen §4.3's end state ("shadow appears only as the hover-lift affordance") arriving early on two hover states, and keeps the paste safe. |
| A5 | `--color-bg: var(--ground)` added | The live stylesheet consumes `var(--color-bg)` at `.advisor__starter:hover` and `.advisor__submit` but **never defines it** — the declarations are invalid at computed-value time and the buttons render with inherited near-white text on their fills. Jen §4.2 flags exactly this ("fix undefined `var(--color-bg)`", audit P0-3). Defining the alias fixes the bug: dark text on ember fills, 8.4:1. This is a deliberate visible change. Not an invented token — the stylesheet already consumes it. |

---

## 3. Non-token decisions

| # | Decision | Chosen | Lost | Why |
|---|---|---|---|---|
| N1 | **Nav mark** | Wordmark SVG, `currentColor`, **22px** desktop / **18px** mobile (monogram 20px on mobile if the wordmark crowds the hamburger). Badge leaves the chrome entirely; its one web home is the **footer at 72px** as the maker's seal. Favicon = monogram, designed in the mark phase. | Jen (48px naked badge, 10 §4.2); current site (115px pill) | Saul's position is an argument; Jen's is a size. A detailed circular badge — steam curls, text ring — is illegible as chrome at any nav-plausible scale, and the studios this register borrows from (Olson Kundig, Norm, Nakashima) identify by name and sign with a seal. Jen herself deferred the call to her Stage 3 gate rather than defending 48px (12 §5.1 handoff), and Saul's footer-seal placement preserves the badge's meaning instead of deleting it. **Gated: see E1 — Lee must sign off on removing the badge from the nav before any WP-2 mark work ships.** Asset dependency: wordmark re-cut as clean SVG from `~/marvin/content/assets/logo-original.pdf` (the existing `logo.svg` is raster-in-SVG-clothing, 12 §5.5); 2x PNGs are the sanctioned stopgap. |
| N2 | **Hero choreography** | Mood board / Jen §5.3: **nothing on the photograph** — image, nav, scroll cue only. The `<h1>` lives in the Thesis section immediately below (SEO intact; George's home copy is already written this way). **One** motion system: `.reveal` + IntersectionObserver, observed on load, `--i` stagger — image `--i:0`, nav `--i:1`, cue `--i:2`, settle ≈1.24s. Scroll is never blocked. | Wim (14:121 — heading and subline fade up over the photo at t≈2.0s; and his separate 1.2s/2.0s/3.0s timer choreography) | The approved artifact is unambiguous: the hero section is commented "empty on purpose" and its own annotation reads "**No headline over it, no button, no logo competing for the frame.**" A timed fade-up of a heading onto the photo is the opposite of what Lee approved. On mechanism, Jen's spec *is* the board's shipped implementation (`15:590–611`), and a second timer-based system alongside the reveal system is exactly the "no separate intro system" failure her §5.1 rules out. What survives from Wim, explicitly: scroll-never-blocked (both agree), reduced-motion renders fully composed, the mobile `w_828` srcset requirement, and his `hero_hold_complete/skipped` instrumentation — which is the *right* way to revisit hold timing later: with data, not taste. |
| N3 | **Hero link** | No link on the photograph. Rung-1 asks ("See the saunas" etc.) begin in the Thesis section on first scroll. | Wim (14:127, "the hero's own single quiet link"); George's conditional hero-link fallback (13:26) becomes moot | Same evidence as N2 — "no button" is in the approved board's own caption. George's primary copy already puts no button in the first block; his fallback was conditioned on the journey design wanting one, and the resolved journey doesn't. |
| N4 | **Configurator buttons** | Wim's two-step structure governs: Step 1 button **"Request This Quote"** (transitions in place, never navigates), Step 2 submit **"Send Quote Request"**. George's helper, success, and failure lines carry into Step 2 — with the reply-time promise now answered: **"within three business days, usually the next day"** (E3 closed 2026-07-30). Sitewide primary CTA **"Get a Quote"** (George §1) stands, with his one sanctioned variant on the contact submit. | George's modal button "Send This Configuration" (13:377) | Conversion architecture is Wim's lane and his six-state table is the best-specified artifact in the corpus. George's label was written for a one-step flow that no longer exists — in a two-step modal, "Send This Configuration" on Step 1 would promise a send the button doesn't perform, violating George's own rule 6 ("buttons promise exactly what they do"). Wim's pair keeps the promise honest at both steps: the request begins in place, the send happens where the send button is. |
| N5 | **Configurator storage** | `localStorage`, keyed `ssc_quote_config`, stored timestamp, 7-day expiry checked on read, cleared only on confirmed success. | Wim as written (14:45, `sessionStorage` + 7-day expiry) | Implementer trap, recorded here so 14 §1 is not implemented verbatim: `sessionStorage` is per-tab and dies on tab close — a 7-day expiry against it is incoherent. Wim's *intent* (survive a return visit within a week) is the part that stands; `localStorage` is the mechanism that delivers it. (Matches the critic's Approach-soundness fix.) |
| N6 | **`_subject` string** *(arbitrated 2026-07-30, critic rev.4 finding 3.4)* | Doc 33 §6's string: **`Configurator Quote — {Model} — ${Total} — {location}`** | Doc 14 §1:34 (`Configurator Quote Request — {Model} — ${Total}`) | The two authorities disagreed and nothing arbitrated it. Doc 33 is the later document by the same specialist and carries `{location}`, which is load-bearing twice over: inbox triage (an unscopeable lead is the failure the location field exists to prevent) and the WP-0a weekly stream count, which distinguishes configurator traffic from contact-form traffic by this exact string. |
| N7 | **Step 2 field set — five fields** *(recorded 2026-07-30, critic rev.4 finding 8.4)* | Name, email, notes, **location**, **site access** — doc 33 §6:160's explicit self-override of doc 14. | Doc 14 §1 (three fields) | The override was real, well-argued, and by the same specialist — but it lived only in doc 33 while this file is where a mid-relay implementer looks. Recorded here so the plan's own stop-the-batch rule doesn't fire on a conflict that was already resolved. |

---

## 4. Escalations — Lee's calls, not ours

Nothing below is resolved by this file. Do not guess; do not let a relay batch invent an answer mid-flight.

1. **E1 — Badge removal from the nav (gates WP-2 mark work).** N1 is the department's resolved recommendation: wordmark in the nav, badge to the footer as the seal. It goes further than what Lee has previously seen (Jen's audit said 48px badge). He must approve the badge leaving the chrome before any nav-mark implementation ships. Until then, no WP-2 mark row executes.
2. **E2 — Per-model price rows on `/saunas/`.** Jen's ledger-row spec (10 §3.2) and George's model cards both show per-model prices; Jen correctly flags exposure as a business call (10 §6.7). Note for the ask: per the critic, per-model prices are *already live* at `saunas.njk:214–274`, so this is likely a confirmation rather than a new exposure — but it is his to confirm.
3. **E3 — Reply-time promise. CLOSED 2026-07-30.** Lee answered (2026-07-28, `20-fact-gathering-questions.md` D46): one business day typically, three on a bad week. The promise ships as **"within three business days, usually the next day"** — the bad-week number is the commitment, the typical number is the texture, and it holds on the worst week rather than the best. Doc 13's pre-submission reply-time holds are released to this exact line (its post-submission thank-you line stays untouched).

---

## 5. Completeness audit — every live token, accounted for

The live `:root` (`styles.css:9–75`) defines **48** custom properties. One more (`--color-bg`) is consumed but never defined, and four (`--pin-*`) are component-scoped outside `:root`. Use counts are `var()` occurrences: `styles.css` + inline styles in `src/` templates (the only two places any token is consumed — verified; `head.njk`'s inline `<style>` uses no tokens). Classifications: **Resolved** (a §2 resolution covers it), **Carried** (live value stands, no document disputes it), **Changed** (a spec alters it, no conflict), **Retired** (deliberately removed), **Bridge** (carried only until WP-1b executes its §6 row).

| Live token | Live value | Uses | Class | Disposition |
|---|---|---|---|---|
| `--color-off-white` | `#e8e6e3` | 27 | Resolved | alias → `--ink` (same value) |
| `--color-soft-grey` | `#2a2a2a` | 9 | Resolved | alias → `--rule` (R6) |
| `--color-charcoal` | `#c0c0c0` | 14 | Resolved / Retired | alias → `--ink-quiet`; the lying name — call sites §6.1 |
| `--color-muted-black` | `#0c0c0c` | 9 | Resolved | alias → `--ground` (same value) |
| `--color-warm-wood` | `#c4a57b` | 52 | Resolved | alias → `--ember` (same value) |
| `--ember-hover` | `#d4b58b` | 6 | Carried (renamed WP-1b, was `--color-warm-wood-hover`) | button hover fill; colour-only hover sanctioned (Jen §5.2) |
| `--ember-dark` | `#a08060` | 1 | Carried (renamed WP-1b, was `--color-warm-wood-dark`) | one gradient consumer — §6.5 |
| `--color-bg-dark` | `#1a1a1a` | 12 | Resolved | alias → `--elevated` `#161512` (R7) |
| `--color-bg-grey` | `#111111` | 1 | Resolved / Retired | alias → `--elevated` (R7); `.bg-grey` class in 6 markup sites, §6.1 |
| `--color-border-subtle` | `#3a3a3a` | 11 | Resolved | alias → `--rule` (R6) |
| `--color-text-muted` | `#888` | 16 | Resolved | alias → `--ink-quiet` |
| `--color-text-subtle` | `#aaa` | 6 | Resolved | alias → `--ink-quiet` |
| `--color-text-dim` | `#666` | 2 | Resolved | alias → `--ink-quiet` (A1 — was faint, failed on elevated) |
| `--color-text-faint` | `#999` | 1 | Resolved | alias → `--ink-quiet` |
| `--color-text-feature` | `#ccc` | 1 | Resolved | alias → `--ink-quiet` |
| `--color-black` | `#000` | 6 | Carried | utility constant; button/badge text, overlays |
| `--color-white` | `#fff` | 5 | Carried | utility constant; 5 white-text sites are WP-1b `--ink` candidates, §6.4 |
| `--color-warm-wood-alpha-04` | `rgba(196,165,123,.04)` | 2 | Carried | already on correct base; 1 of 2 consumers dies (§6.2 glow row) |
| `--color-warm-wood-alpha-05` | `rgba(196,165,123,.05)` | 1 | Bridge / Retired | sole consumer `.section--warm-glow::before` is cut (10:171, 12:316) |
| `--color-warm-wood-alpha-10` | `rgba(184,156,104,.1)` | 3 | Resolved | re-based to rgb(196,165,123) (R9) |
| `--color-warm-wood-alpha-25` | `rgba(184,156,104,.25)` | 2 | Resolved | re-based (R9) |
| `--color-warm-wood-alpha-30` | `rgba(184,156,104,.3)` | 6 | Resolved | re-based (R9) |
| `--color-white-alpha-03` | `rgba(255,255,255,.03)` | 1 | Carried | `.spec-item` fill |
| `--color-white-alpha-05` | `rgba(255,255,255,.05)` | 2 | Carried | hover fills |
| `--color-white-alpha-08` | `rgba(255,255,255,.08)` | 2 | Carried | 1 consumer is the frosted form border Jen deletes (§6.3) |
| `--color-white-alpha-10` | `rgba(255,255,255,.1)` | 6 | Carried | nav border → `--rule` candidate in WP-1b (§6.3) |
| `--color-black-alpha-30` | `rgba(0,0,0,.3)` | 1 | Carried | `.comparison-badge` |
| `--color-black-alpha-80` | `rgba(0,0,0,.8)` | 1 | Bridge | nav bg → `--nav-scrim` in WP-1b, then retire (§6.2) |
| `--color-black-alpha-95` | `rgba(0,0,0,.95)` | 1 | Carried | `.lightbox-overlay` |
| `--font-primary` | Outfit stack | 3 | Changed | new stack with metric fallback family — Beatrice 11 §6 |
| `--font-heading` | Cormorant stack | 6 | Changed | new stack with metric fallback family — Beatrice 11 §6 |
| `--spacing-xs` | `0.5rem` | 10 | Carried | no document disputes it |
| `--spacing-sm` | `1rem` | 28 | Carried | |
| `--spacing-md` | `1.5rem` | 27 +1 src | Carried | src: `404.njk` inline gap |
| `--spacing-lg` | `2rem` | 18 | Carried | |
| `--spacing-xl` | `3rem` | 13 +1 src | Carried | src: `404.njk` inline margin |
| `--spacing-2xl` | `4rem` | 7 | Carried | Jen's spec consumes it (10:85, 10:310) |
| `--spacing-3xl` | `8rem` | 5 | Bridge / Retired | section rhythm replaces it (Jen §2.0) — 5 call sites, §6.2 |
| `--transition-fast` | `0.3s ease` | 29 (20 decl.) | Changed | → `200ms ease-out` (Jen §5.2) — value change in place, §5.3 |
| `--transition-medium` | `0.5s ease` | 10 (9 decl.) | Bridge / Retired | deleted with consumers in WP-1b (A3) — §6.2 |
| `--transition-slow` | `0.8s ease-out` | 14 (9 decl.) | Bridge / Retired | 5 of 9 declarations are the reveal classes — §6.2 |
| `--shadow-sm` | `0 2px 8px …` | **0** | Retired | zero consumers — deleted now (A4) |
| `--shadow-md` | `0 8px 16px …` | **0** | Retired | zero consumers — deleted now (A4) |
| `--shadow-lg` | `0 15px 30px …` | 1 | Retired | bridge-alias → `--shadow-hover` (A4) — §6.2 |
| `--shadow-xl` | `0 20px 40px …` | 1 | Retired | bridge-alias → `--shadow-hover` (A4) — §6.2 |
| `--radius-sm` | `4px` | 7 +1 src | Changed | → `2px` (Jen §4.1); image consumers go to 0 in WP-1b, §6.2. src: `service-area.njk` inline |
| `--radius-md` | `6px` | 4 | Changed | → `2px`, then retire as alias-of-sm |
| `--radius-lg` | `20px` | 2 | Changed | → `0` — the two badge pills square off, §5.3 |
| `--color-bg` | **undefined** | 2 | Changed | newly defined = `var(--ground)` — live bug fix (A5), audit P0-3 |

**Outside `:root`, unaffected:** `--pin-size`/`--pin-core`/`--pin-color`/`--pin-color-dark` (map-pin components, defined at their selectors); `--stagger-index` (set by `js/animations.js` with a `var(…, 0)` fallback — dies with the reveal migration in WP-1b); `--i` (the new stagger index, mood-board system).

**New tokens with no live consumer yet** (`--ground`, `--elevated`, `--rule`, `--rule-hover`, `--ink*`, `--ember*`, layout, rhythm, plate, scrim, and new motion tokens): they gain consumers during WP-1b. Pasting them early is inert.

### 5.1 What §1's block deliberately leaves to doc 11

`--text-xs` through `--text-4xl` (except `--text-2xs`, resolved here by R4), `--leading-*` (7 tokens), `--tracking-*` (5 tokens): single-owner, authoritative in `11 §2`, land in WP-1a as one block alongside §1. The site does not consume any of them today, so their absence from §1 cannot break a paste — but the post-migration stylesheet requires both blocks. This is the precise replacement for the first issue's false "keeps all 2,871 live lines resolving" claim: **§1 alone keeps the *current* 2,871 lines resolving; §1 + doc 11 §2 is the complete post-migration token set.**

### 5.2 Dangling names in the spec corpus — resolved references, not new tokens

The specs reference five token names that exist in no stylesheet and are **not** created by this file. WP-1b must map them, never invent them:

| Spec name | Where | Reads as |
|---|---|---|
| `--color-bg-light` | Jen 10:65, :203 | `--elevated` (R7's two-surface rule; note the tension with Jen §4.3's "never per-card" — Jen's Stage 3 call for `.advisor`) |
| `--color-text-secondary` | Jen 10:216, :314 | `--ink-quiet` |
| `--hold-narrow` | Jen 10:46, :60, :141, :316 | `--measure-narrow` (R2 retired the name) |
| `--width-content` | Saul 12:226 | `--hold` (R8) |
| `--width-wide` | Saul 12:227 | `--hold-wide` |

### 5.3 Value changes the paste causes — the blast radius, stated

Pasting §1 is not visually silent, and was never meant to be. What changes on paste, before any WP-1b consumer edit:

- **`--transition-fast`** `0.3s ease` → `200ms ease-out` across **20 declarations / 29 `var()` occurrences** (nav links, buttons, cards, accordion chrome). Intended: Jen §5.2.
- **`--radius-sm`** 4→2px (8 sites incl. one inline in `service-area.njk`), **`--radius-md`** 6→2px (4 sites: `.btn`, `.btn-outline`, `.quote-btn`, `.map-filter-btn`), **`--radius-lg`** 20→0 (2 sites: `.comparison-badge`, `.comparison-badge-alt` — the pills square off). Intended: Jen §4.1.
- **Ember alpha re-base** (R9): 11 occurrences across `-10`/`-25`/`-30` warm slightly toward the true accent.
- **Legacy grey/text aliases**: every aliased colour shifts to its warm-ramp equivalent (e.g. borders `#2a2a2a`/`#3a3a3a` → `#2a2724`; text greys → `#9a9590`). Intended: the entire program.
- **Hover shadows** on `.model-card`/`.offering-card` unify to `--shadow-hover` (A4).
- **`.advisor__starter:hover` / `.advisor__submit`** text becomes dark-on-ember instead of inherited near-white (A5 bug fix).
- **Font stacks** gain fallback families that are inert until 11 §6's `@font-face` blocks land (WP-1a).

Everything else in the paste is value-identical or inert. The screenshot-diff gate (plan WP-1) is still the instrument that certifies this list is exhaustive.

---

## 6. Migration ledger — every call site that must change

Selector names and counts — line numbers shift the moment the first edit lands; selectors survive. The pure renames (§6.6) are alias-backed and mechanical; the rows below them are the ones with judgement or deletion in them.

### 6.1 `--color-charcoal` — the lying name (confirmed: `#c0c0c0`, a light silver, 10.75:1 on ground)

14 declarations in `styles.css`, all `color:`. Every one moves to `var(--ink-quiet)` (or dies with its component):

`.card-content p` · `.quote-btn` · `.map-filter-btn` · `.faq-answer` · `footer` · `.footer-section a` · `.text--intro` · `.text--centered-60ch` · `.link--charcoal` · `.cta__footer` · `.testimonial-card__author` · `.location-card__address` · `.blog-card__excerpt` · `.advisor__clear`

Plus the **class name** `.link--charcoal` itself, which inherits the lie: 1 CSS selector + 1 markup site (`contact.njk`, the email link). Renamed to **`.link--quiet`** in WP-1b (or fold into a link default) in the same WP-1b batch — a grep for `charcoal` after WP-1b must return zero.

Related `.bg-grey`: 1 CSS selector + **7 markup sites** (`home.njk` ×2, `about.njk` ×2, `saunas.njk` ×1, `service-area.njk` ×1, `warranty.njk` ×1) — the class survives only if renamed to match the elevated vocabulary; six of those seven are `hero-overlay` sections that Jen retires anyway (10:79).

**Corrected 2026-07-31 (WP-1b certification):** this row read **6** markup sites and omitted `warranty.njk`. Re-derived by grep against the batch's own baseline commit and confirmed independently in review. The rename target, previously unstated here, is **`.surface--elevated`** — chosen to match the `--elevated` surface token rather than to carry the colour word forward, which is the same lie `.link--charcoal` was renamed to escape. Renders to 14 occurrences per width across 12 routes; declared as a single `rename` entry in `scripts/dom-integrity.config.json`, which rewrote 28 class tokens across the run.

### 6.2 Retired tokens — consumers by selector

| Token | Call sites (selector → what happens) |
|---|---|
| `--spacing-3xl` (5) | `section` (padding) and `section.wide-container` (padding-top + padding-bottom) → `--section-pad` tiers per Jen §2.0/§2.2; `footer` (margin-top) → `--section-pad`; `.blog-empty` (padding) → `--section-pad-tight` |
| `--transition-medium` (9 decl., 8 selectors) | `.offering-card` (×2), `.card-image`, `.model-card-image`, `.gallery-mosaic .gallery-item img`, `.gallery-mosaic .gallery-item::after`, `.gallery-item img`, `.gallery-item::after`, `.about-banner img` — all rewritten by Jen §5.2's hover grammar (`--transition-fast` for surface state, `--transition-image` for image zoom) |
| `--transition-slow` (9 decl.) | `.js-loaded .fade-in`/`.slide-up`/`.slide-left`/`.slide-right`/`.scale-in` (die with the reveal migration, §6.7); `.card-image`, `.full-width-image`, `.gallery-mosaic .gallery-item img`, `.gallery-item img` → `--transition-image` |
| `--shadow-lg` (1) | `.model-card:hover` → `var(--shadow-hover)` |
| `--shadow-xl` (1) | `.offering-card:hover` → `var(--shadow-hover)` |
| `--color-black-alpha-80` (1) | `nav` background → `var(--nav-scrim)` (+ blur 10px→8px, Jen §4.2) |
| `--color-warm-wood-alpha-05` (1) | `.section--warm-glow::before` — component cut entirely (Jen 10:171; Saul 12:316 "warm radial glows: atmosphere, no information — cut"); 2 markup sites (`home.njk`, `service-area.njk`) |
| `--color-warm-wood-alpha-04` (1 of 2) | `.page-hero::before` radial glow — cut per the same Saul rule. `.compare-table__highlight` (flat, information-bearing fill) survives, so the token stays |
| `--color-bg` (2, undefined) | `.advisor__starter:hover`, `.advisor__submit` → `var(--ground)` (A5) — the §1 alias fixes it at paste; the WP-1b rename makes it literal |
| `--radius-md` (4) | `.btn`, `.btn-outline`, `.quote-btn`, `.map-filter-btn` → `var(--radius-sm)`, then delete the token |
| `--radius-sm` image sites | gallery/photography consumers go to `0`, not 2px — "photography is never rounded" (Jen §4.2), incl. the inline style in `service-area.njk` |

### 6.2a Gutter migration — INCOMPLETE after WP-1b (found 2026-07-31 by `scripts/rhythm.test.mjs`)

R1's premise is that `0 5%` resolves against the parent and so produces several gutters wearing one rule's name. `--gutter` replaced most of them. **Three percentage gutters survive**, measured from computed style in a real browser at 1440 and 390:

| Site | Rule | Resolves to | Status |
|---|---|---|---|
| `nav` | `padding: var(--spacing-sm) 2.5%` (`styles.css:579`) | 36px @1440 · 9.75px @390 | unmigrated |
| `.page-hero` | `padding: 12rem 5% 6rem` (`styles.css:712`) | 72px @1440 · 19.5px @390 | unmigrated |
| bare `section` **below 768px** | `@media (max-width: 768px) { section { padding: var(--spacing-2xl) 5% } }` (`styles.css:2936`) | 19.5px @390 | unmigrated |

The third is the one worth flagging. It is invisible at desktop width, invisible to the DOM-integrity check (no markup changed) and invisible to the pixel harness (the batch was expected to move things), and nothing in the repo was reading the narrow width's computed padding until this suite existed. It also **flattens the section rhythm**: the three `--section-pad` tiers (Jen §2.0/§2.2) collapse to a flat `--spacing-2xl` below 768px, so the compression that is supposed to read *as* compression does not exist on a phone — which is the width most visitors use.

Not fixed here: this is a rendered-output change on every page at the mobile width, so it belongs in its own batch under the harness's own eyes, not folded into a certification round. Pinned by rule in `scripts/rhythm.test.mjs` so a fourth deviation fails and so migrating one of the three has to be a deliberate edit.

### 6.3 Alpha-overlay consumers WP-1b re-homes (tokens stay until their counts hit zero)

`nav` border-bottom (`-10`) → `--rule` · `.contact-form--styled` border (`-08`) → component deleted (Jen §4.2: frosted card dies) · `.map-filter-btn` border/fills (`-05`/`-08`/`-10`) → rule grammar · `.comparison-badge-alt`, `.price-row.total`, `.addon-category`, `.addon-option:hover`, `.spec-item`, `.lightbox-nav` — reviewed against the ruled-surface grammar in WP-1b; any that survive keep the tokens, which is why the tokens are Carried, not Retired.

### 6.4 White-text call sites — flagged, not resolved

`--color-white` as text at `.hero-content`, `.hero h1`, `.comparison-badge`, `.footer-section h4`, `.footer-section a:hover` — candidates for `--ink` under Jen §4.3's three-token ramp. The hero pair sits on photography behind `--hero-scrim` (image-dependent, not a token pairing). Jen's Stage 3 call; the token carries either way. `--color-black` text sites (`.btn`, `.btn-outline:hover`, `.comparison-header.ours h3`, `.map-filter-btn.active`) pass on every accent fill (§7) and stand.

### 6.5 One-consumer oddity

`.comparison-header.ours` runs `linear-gradient(135deg, var(--ember), var(--ember-dark))` (quoted at its post-WP-1b names) — the only gradient fill on an interactive-adjacent surface. Saul bans gradient *meshes* and radial *glows*, not this; but it is the sole reason `--ember-dark` exists. WP-1b decides flat-ember vs keep; if flattened, the token retires with it. Flagged, not resolved — **still open after WP-1b**: the token was renamed with the rest of the accent family, not retired, so the one gradient consumer survives and this decision is inherited rather than made.

### 6.6 Pure renames — alias-backed, mechanical, selector-independent

Global find-and-replace on the `var()` name; §1's aliases make before/after render identically, so these need counts, not selector lists: `--color-off-white`→`--ink` (27) · `--color-warm-wood`→`--ember` (52) · `--color-muted-black`→`--ground` (9) · `--color-bg-dark`→`--elevated` (12) · `--color-bg-grey`→`--elevated` (1) · `--color-border-subtle`→`--rule` (11) · `--color-soft-grey`→`--rule` (9) · `--color-text-muted`→`--ink-quiet` (16) · `--color-text-subtle`→`--ink-quiet` (6) · `--color-text-dim`→`--ink-quiet` (2) · `--color-text-faint`→`--ink-quiet` (1) · `--color-text-feature`→`--ink-quiet` (1) · `--color-charcoal`→`--ink-quiet` (14, §6.1).

**Added 2026-07-31 (NOTE-2c, done in WP-1b):** `--color-warm-wood-hover`→**`--ember-hover`** (6) · `--color-warm-wood-dark`→**`--ember-dark`** (1). These two were the last names in the accent family still carrying the `warm-wood` vocabulary after `--color-warm-wood`→`--ember` (52) landed, which left the stylesheet naming one colour two ways — the precise drift this ledger exists to close. Folded at every call site; a grep for `color-warm-wood-hover` or `color-warm-wood-dark` across `styles.css`, `src/`, `js/` and `booking-ops.html` now returns **zero**. The hover count is **6**, not the 4 recorded in §5 — re-derived by grep, and §5's row is corrected with it.

The **alpha** tokens (`--color-warm-wood-alpha-*`) deliberately keep their names for now, per §6.3: they retire when their consumer counts reach zero, not before, and renaming them ahead of that would churn call sites twice.

After the sweep, the alias block empties and is deleted.

### 6.7 Reveal-class inventory — the corrected count for WP-1b's grep-clean gate

The 148 figure circulating in earlier documents counted only class attributes in markup. Re-derived in full (this matches the critic's independent recount exactly):

| Class | Markup (`src/` class attrs) | `js/animations.js` | src+js total | `styles.css` selectors |
|---|---|---|---|---|
| `.fade-in` | 79 | 1 | **80** | 2 |
| `.slide-up` | 34 | 1 | **35** | 2 |
| `.slide-left` | 4 | 1 | **5** | 2 |
| `.slide-right` | 4 | 1 | **5** | 2 |
| `.scale-in` | 12 | 4 | **16** | 2 |
| `.gallery-item--reveal` | 15 | 2 | **17** | 1 |
| **Total** | **148** | **10** | **158** | **11** |

**The WP-1b acceptance number is 158 occurrences across `src/` and `js/` (169 including `styles.css` selectors), not 148.** All collapse to `.reveal` (+ `--i` stagger) per Jen §5.1 / N2. Markup concentration, for batch planning: `saunas.njk` 45, `privacy.njk` 19, `home.njk` 25, `about.njk` 17, `warranty.njk` 18, `locations.njk` 12, `service-area.njk` 7, `faq.njk` 2, `blog.njk` 2, `contact.njk` 1. The gate stays as specified: after WP-1b, a grep for any of the six names returns zero.

---

## 7. Contrast verification — the resolved system, both surfaces

WCAG 2.x relative-luminance ratios, computed 2026-07-28. AA thresholds: 4.5:1 normal text, 3:1 large (≥24px, or ≥18.66px bold).

| Pairing | On `--ground` #0c0c0c | On `--elevated` #161512 | Verdict |
|---|---|---|---|
| `--ink` #e8e6e3 | 15.70 | 14.66 | AAA everywhere |
| `--ink-quiet` #9a9590 | 6.59 | 6.15 | AA at every size, both surfaces |
| `--ink-faint` #7f7a74 | 4.60 | **4.29** | AA at all sizes on ground; **large-text only on elevated** (R5 constraint — holds) |
| `--ember` #c4a57b | 8.40 | 7.84 | AA at every size — the 11px ember kicker (R10) passes on both surfaces |
| `#000` on `--ember` fill | 9.02 | — | `.btn` text passes |
| `#000` on `--ember-hover` | 10.78 | — | hover state passes |

**Alias sweep:** every legacy text alias in §1 resolves to `--ink` or `--ink-quiet` — both pass AA at every size on both surfaces — so all 74 aliased text call sites pass without per-site review. The single faint-mapped alias in the first issue (`--color-text-dim`) was the one failure this sweep caught: `.stat-source` is 0.8rem italic on an elevated card (`.stat-card` runs `--color-bg-dark` → `--elevated`), where faint is 4.29:1. Corrected by A1; with the alias on quiet the site has **no live small-text-on-elevated pairing below 6.15:1.**

**`--ember-quiet` composite surfaces** (rgba 0.18 flattened): over ground = `#2d2820`; over elevated = `#352f25`. On those fills: `--ink` 11.74 / 10.64 (pass), `--ember` 6.28 over ground (pass), `--ink-quiet` 4.93 over ground (pass, thin) but **4.47 over elevated — below AA.** New constraint, stated once: **small text on an `--ember-quiet` fill that sits on an elevated surface must be `--ink` or `--ember`, never `--ink-quiet`.** No live consumer exists yet; this binds the WP-1b chip/badge work.

**Non-text:** `--rule` measures 1.32:1 against ground — decorative-subtle by design; R6's WCAG 1.4.11 advisory for static form inputs stands. Text over photography occurs only at the sub-page hero `<h1>` behind `--hero-scrim` (Jen §2.3) — image-dependent, verified per-image at Stage 3, not a token pairing.

---

*Every contested value above now has exactly one home, and every live token now has exactly one disposition. If a sixth document appears and disagrees with this one, the sixth document is wrong until this file is amended.*
