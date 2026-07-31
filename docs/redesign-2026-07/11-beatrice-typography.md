# SSC Website — Typographic System Specification
**Beatrice (Typography), Creative Department — 2026-07-28**
Sources: `/home/leesalo/Projects/ssc-website/styles.css` (live values, line refs), `src/_includes/head.njk:290–298` (font loading), `netlify.toml` (CSP), mood board `ssc-visual-direction.html`, UX audit `website-audit-ux.md` items at lines 25–32.

Families are fixed per Lee: **Cormorant Garamond** (display serif) + **Outfit** (sans). This document specs them properly and replaces the ad-hoc sizing with a token system Ted can implement mechanically.

---

## 1. Audit — what is actually wrong in `styles.css`

The good bones: fluid h1–h3 (`clamp()`, lines 181–193), `p { max-width: 65ch }` (196–198), negative tracking on display sizes, trimmed weight loading. Now the faults, each with line numbers:

1. **No type-scale tokens at all.** `:root` has color, spacing, shadow, radius tokens — zero `--text-*` or `--leading-*` tokens. Every component reinvents its sizes. Inventory of ad-hoc font sizes found in the file: **0.62 (mood board), 0.7, 0.75, 0.8, 0.85, 0.875, 0.9, 0.92, 0.95, 1, 1.05, 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 2, 2.5, 3.5rem** — twenty distinct values doing perhaps nine jobs. Examples: `.model-header h3` 1.8rem (517), `.compare-table thead th` 1.4rem (2602), `.blog-card__title` 1.5rem (2346), `.process-step__title` 1.3rem (1964), `.info-section__title` 1.2rem (2160), `.comparison-header h3` 1.3rem (591). Five different "small text" values (0.85/0.875/0.9/0.92/0.95) that should be two.
2. **Nav shouts** (UX audit MED, confirmed): `.nav-links a` = 1.1rem + uppercase + 0.06em tracking + weight 400 (298–307). That is display-level loudness on a utility element. An architecture studio's nav whispers.
3. **`body { line-height: 1.8 }`** (101) leaks everywhere. 1.8 is right for nothing: too loose even for long-form (1.6–1.7 at 65ch), and actively wrong in cards, spec rows, buttons, lists. `.model-card p` re-fixes it locally to 1.7 (531), `.faq-answer` re-states 1.8 (1448), `.testimonial-card__quote` 1.8 (1977) — line-height is being patched per component because the base is wrong.
4. **Outfit 300 as the global body weight** (103) on `#0c0c0c`. Light-on-dark thins strokes further (halation). At 1rem it is marginal; combined with the muted greys it fails: `--color-text-dim: #666` on `#0c0c0c` ≈ **3.4:1 — fails WCAG AA** for normal text outright, `#888` ≈ 5.3:1 passes only at weight ≥400. Weight 300 at 0.85–0.95rem in muted grey is the site's most common small-text recipe and it is its weakest.
5. **Cormorant used below its floor.** `.logo` sets Cormorant at 1.2rem (269–271); `.quote-btn` sets Cormorant at **1.1rem inside a button** (1208–1216) — a hairline serif at 17px on a wood-colored button is both illegible and off-register (buttons are UI; UI is Outfit's job). `.booking-option__price` Cormorant 1.3rem (2127) is borderline.
6. **`.quote-btn` color bug while we're there:** `color: var(--color-charcoal)` (1213) = `#c0c0c0` light grey **on the warm-wood background** ≈ 2.4:1. Every other button uses `--color-black`. The single most important button on the site has the worst text contrast on the site.
7. **Letter-spacing is inconsistent on caps.** Uppercase micro-labels use 0.05em (`.model-capacity`, 525), 0.1em (`.spec-item label`, 1040), 0.08em (`.compare-badge`, 2637), 0.03em (`label`, 876 — not even uppercase-safe). All-caps at small sizes needs ≥0.08em, and one value, not four.
8. **Headings have only `margin-bottom`** (177). No space-above system, so every section invents its own (`.section--mt-8`, `.grid-3--mt-3/-4/-2`, `.heading--mb-2`, `.center-wrapper` margins — lines 1671–1782, 2037). That is a rhythm system leaking out as utility-class scar tissue.
9. **No OpenType feature declarations anywhere.** No `font-variant-numeric` (prices in `.price-row`, `.model-price`, `.compare-table` all render proportional figures — columns of prices don't align), no ligature policy, kerning left to default.
10. **Fallback stacks are token gestures.** `Georgia, serif` for Cormorant with no metric adjustment: Georgia's x-height is enormous next to Cormorant's tiny one, so the swap moment reflows the whole page (visible CLS on 3G). Outfit falls to `-apple-system` which is metrically much heavier and wider than Outfit 300.
11. **`.hero-subtitle` 1.5rem max** (368) competes with h3. Subtitle under a display h1 should sit at body+, not heading size.

Verdict: the *taste* is mostly right; the *system* doesn't exist. Everything below is the system.

---

## 2. The type scale

**Ratio: minor third (1.2) at the text end, stretching toward a perfect fourth at the display end.** Rationale: a dark, photography-led architecture register needs a big jump between text and display (the El Croquis pattern: enormous quiet headline, small dense caption, little in between) but a *gentle* progression among UI sizes so cards and specs don't develop internal hierarchy noise. A single strict ratio can't do both; a two-regime scale can. The mood board already behaves this way (0.62–1rem cluster, then 2.2–4.2rem display) — I am formalizing what Jen's board does by instinct.

Viewport interpolation range 320px → 1440px. Every `clamp()` middle is calculated to hit its **min exactly at 320px**; each then reaches its max somewhere between ~670px and ~1030px and holds flat from there (the display steps grow fastest and top out latest). Nothing grows past 1440px in any case — the 1920px `body` max-width already caps layout, and §8's position is that width above 1440 buys whitespace, not point size.

Add to `:root` in `styles.css` (new block, after the color tokens):

```css
/* --- Type scale (minor third text regime, stretched display regime) --- */
--text-2xs: 0.6875rem;                            /* 11px fixed — legal floor, never fluid */
--text-xs:  0.75rem;                              /* 12px fixed */
--text-sm:  0.875rem;                             /* 14px fixed */
--text-base: 1rem;                                /* 16px fixed — body never shrinks */
--text-md:  clamp(1.0625rem, 1rem + 0.3vw, 1.125rem);   /* 17→18px  lead/intro */
--text-lg:  clamp(1.1875rem, 1.1rem + 0.45vw, 1.3125rem);/* 19→21px  h4 / card titles */
--text-xl:  clamp(1.4375rem, 1.3rem + 0.7vw, 1.625rem);  /* 23→26px  h3 */
--text-2xl: clamp(1.75rem, 1.5rem + 1.25vw, 2.25rem);    /* 28→36px  h2 small contexts */
--text-3xl: clamp(2rem, 1.55rem + 2.25vw, 3rem);         /* 32→48px  h2 / section heads */
--text-4xl: clamp(2.5rem, 1.8rem + 3.5vw, 4rem);         /* 40→64px  h1 / hero display */

/* --- Line heights (unitless, per role) --- */
--leading-display: 1.12;   /* --text-4xl */
--leading-heading: 1.22;   /* --text-2xl/-3xl */
--leading-subhead: 1.35;   /* --text-lg/-xl */
--leading-body: 1.65;      /* long-form paragraphs at 65ch */
--leading-ui: 1.5;         /* cards, specs, list rows */
--leading-tight: 1.35;     /* buttons, labels, single-line UI */
--leading-caption: 1.45;   /* captions, eyebrows, metadata */

/* --- Tracking --- */
--tracking-display: -0.02em;
--tracking-heading: -0.012em;
--tracking-body: 0;          /* never track lowercase text */
--tracking-caps: 0.14em;     /* ALL uppercase micro-type uses this, one value */
--tracking-caps-wide: 0.2em; /* eyebrows/kickers only */
```

**Step → role map (the scale is not mathematics until this table exists):**

| Token | Face/weight | Used for | Replaces (selector: old value) |
|---|---|---|---|
| `--text-4xl` | Cormorant 400 | h1, hero display | `h1` clamp(2.5rem,5vw,4rem) — near-identical, now tokenized |
| `--text-3xl` | Cormorant 400 | h2 section heads | `h2` clamp(2rem,4vw,3rem) |
| `--text-2xl` | Cormorant 500 | h2 in narrow/heavy contexts, pull quotes, `.stat-number` companion | — new step, no current selector migrates *up* into it. (`.model-header h3` 1.8rem is **demoted**, not promoted: it lands on `--text-lg`.) |
| `--text-xl` | Cormorant 500 | h3 | `h3` clamp(1.5rem,3vw,2rem) — slightly smaller max; 2rem h3 was crowding h2. Also `.booking-option__price` 1.3rem, if it stays serif (§3) |
| `--text-lg` | Cormorant 600 (serif contexts) **or** Outfit 400 (UI card titles) | h4, card titles | `.blog-card__title` 1.5rem · `.model-header h3` 1.8rem (too loud inside a card) · `.compare-table thead th` 1.4rem · `.process-step__title` 1.3rem · `.comparison-header h3` 1.3rem |
| `--text-md` | Outfit 300 | intro/lead paragraphs | `.page-hero p` 1.1rem · `.hero-subtitle` clamp(→1.5rem) · `.info-section__intro` 1.1rem · `.info-section__title` 1.2rem |
| `--text-base` | Outfit 400 | body copy, `.faq-answer`, form inputs, buttons | `body` 1rem (weight 300→400, leading 1.8→1.65) · `.btn` 1.1rem (buttons drop to 1rem) |
| `--text-sm` | Outfit 400 (nav: 400, caps) | card body, specs, price rows, footer links, form labels, **nav links** | the whole 0.85/0.875/0.9/0.92/0.95rem cluster (`.model-card p`, `.card-content p`, `.footer-section a`, `label`) · `.nav-links a` 1.1rem → 14px per §4 |
| `--text-xs` | Outfit 500 | micro-labels: spec labels, badges, dates, metadata | `.spec-item label` 0.75rem (size unchanged, now tokenized) · `.blog-card__date` · `.stat-source` · `.model-capacity` |
| `--text-2xs` | Outfit 500 | footnotes, disclaimers, **section kickers** (doc 21 R10), plate provenance, index captions, the scroll cue | `.advisor__disclaimer` 0.7rem (raised to 11px) · `.compare-badge` 0.7rem · the mood board's 0.62–0.68rem specimen labels |

**Four rules the table encodes, stated so they are not re-litigated per selector:**

- **The Cormorant floor holds structurally.** No serif row exists below `--text-lg` (1.1875rem = 19px min). Every step from `--text-md` down is Outfit-only. §3's ban list is therefore enforceable by reading the table alone.
- **The 11px floor is absolute.** Nothing on the site renders below `--text-2xs` (0.6875rem) — doc 21 R4 confirms this with zero exceptions and remaps the four violations (index captions, scroll cue, section-index eyebrows, plate provenance) onto this step. The mood board's specimen labels are specimen-only; the eyebrow *proportions* survive, the absolute size comes up ~1px.
- **Eyebrows split across two steps** (doc 21 R10, which reconciles inside this system rather than overriding it): the **section kicker** — one per section — is `--text-2xs` / `--tracking-caps-wide` (0.2em) / `--ember`. **All other micro-labels** (spec labels, badges, dates, metadata) take the §4 base spec: `--text-xs` / `--tracking-caps` (0.14em) / `--ink-quiet`.
- **Numerals:** every price and spec target in the `--text-sm` and `--text-xs` rows also carries the tabular-numeral block in §4. Size token and figure style land together or prices still fail to align.

Delete once migrated: the raw sizes at lines 302, 368, 389, 469, 517, 523, 529, 541, 591, 601, 611, 623, 653, 662, 668, 681, 713, 875, 889, 1019, 1038, 1046, 1058, 1075, 1103, 1133, 1163, 1187, 1196, 1201, 1216, 1231, 1243, 1417, 1440, 1505, 1514, 1543, 1715, 1936, 1948, 1964, 1981, 2013, 2057, 2118, 2128, 2138, 2144, 2160, 2166, 2195, 2251, 2259, 2269, 2281, 2296, 2311, 2340, 2346, 2354, 2360, 2590, 2602, 2635, 2645 — each maps to a token above. This is mechanical for Ted; the table is the law.

**Scope boundary (doc 21 critic T2).** This system governs `styles.css` and the templates in `src/` only. `booking-ops.html` at the repo root — built to `dist/`, routed live at `/ops` — is a self-contained internal ops page with its own inline `:root`, a system-font stack, and its own ad-hoc sizes. It consumes none of these tokens and no web font. **It is deliberately out of scope for WP-1a**, so a type sweep must not touch it and its raw `font-size` values are not a grep-clean failure. (The `--color-bg` value collision between that file and doc 21 is a WP-1b colour matter, not a type one.)

---

## 3. Cormorant Garamond, specified properly

Cormorant (Christian Thalmann / Catharsis Fonts, OFL — free, no license exposure; distributed via Google Fonts) is a very high-contrast Garalde with a **small x-height and hairline thins**. It is a display face that happens to ship text weights. Rules:

- **No true `opsz` axis.** The Google Fonts build of Cormorant Garamond is static-instance (300–700 + italics); the *family* handles optical sizing by sibling families (Cormorant, Cormorant Garamond, Cormorant Infant, Cormorant SC, Cormorant Upright), not an axis. So optical sizing must be done by **weight substitution**, which is the correct lever here:
  - **≥ `--text-3xl` (32px+): weight 400.** At display sizes the hairlines sing; anything heavier muddies the contrast that makes the face architectural. The current site is right about this.
  - **`--text-xl`–`--text-2xl` (23–36px): weight 500.** The thins start dropping out against `#0c0c0c` below ~32px; 500 restores stroke presence without visible boldness.
  - **`--text-lg` (19–21px): weight 600.** This is the smallest Cormorant permitted.
  - **Floor: 1.1875rem (19px). Below that, Cormorant is banned.** Fix the two violations: `.logo` (1.2rem serif — acceptable at exactly the floor but the logo is an image anyway; the text fallback moves to Outfit 500, 0.875rem, caps, `--tracking-caps`) and **`.quote-btn` (1208): serif in a button — change to `font-family: var(--font-primary); font-weight: 500; font-size: var(--text-base); color: var(--color-black)`** (also fixes the 2.4:1 contrast bug noted in §1.6). `.booking-option__price` at 1.3rem serif survives only if bumped to `--text-xl`/500; otherwise set it in Outfit 500 tabular.
- **Loaded weights change: currently `400;500;600` roman only.** Correct set: **400, 500, 600 roman + 400 italic** (see §6 for the request). Nothing needs 300 or 700.
- **Italic (400 italic) is permitted in exactly three places:** (a) Finnish loanwords on first use in running serif contexts — *löyly*; (b) pull quotes / the thesis-line pattern from the mood board (`em` inside a serif display line, colored `--color-warm-wood` — this is the board's best trick, keep it); (c) photo captions when set in serif (Jen's call whether captions are serif or sans; I recommend sans — see §Eyebrow spec — so likely (a) and (b) only). Italic is **never** used for emphasis in Outfit body copy — use weight 500 there. `.stat-source` and `.included-box__note` currently fake italics in Outfit (synthesized slant — the browser is shearing the roman); replace with `font-style: normal; font-weight: 400; color` differentiation.
- **At very large sizes** (the 4rem end of `--text-4xl`): tracking `--tracking-display` (-0.02em), `--leading-display` (1.12), and `font-kerning: normal` (default, but state it). Do not letter-space Cormorant lowercase, ever, at any size.
- **Cormorant SC** (the real small-caps sibling): not worth a fourth font file for this site. Where small-caps register is wanted (eyebrows), use Outfit uppercase instead — it is already the site's label voice.

```css
/* Heading defaults — replaces styles.css:173–193 */
h1, h2, h3, h4 {
    font-family: var(--font-heading);
    font-weight: 400;
    line-height: var(--leading-heading);
    letter-spacing: var(--tracking-heading);
    text-wrap: balance;               /* progressive enhancement; harmless where unsupported */
}
h1 { font-size: var(--text-4xl); line-height: var(--leading-display); letter-spacing: var(--tracking-display); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-xl); font-weight: 500; line-height: var(--leading-subhead); }
h4 { font-size: var(--text-lg); font-weight: 600; line-height: var(--leading-subhead); }
```

---

## 4. Outfit, specified properly

Outfit (Rodrigo Fuenzalida / On Brand Investments, OFL, Google Fonts; ships as a variable font 100–900) is a geometric sans with generous apertures — good stamina at small sizes, but geometric sanses at weight 300 on near-black go thin fast.

**Weight policy (the 300 interrogation):**
- **300 is permitted only at ≥ `--text-md` (17px+) in `--ink` (#e8e6e3, **15.70:1** on #0c0c0c — doc 21 §7/A2; my earlier 15.9 was arithmetic drift).** At that size and contrast it reads as the airy architectural voice Lee likes. This covers lead paragraphs and the hero subtitle.
- **400 is the body default.** Change `body { font-weight: 300 }` (styles.css:103) → `400`, and set `line-height: var(--leading-body)` (see §5). Reason: most body copy on this site is *not* off-white — it's `--color-charcoal` #c0c0c0 (≈10.9:1, fine) and the muted greys. Weight 300 + #888 + 0.9rem, the current card recipe, is sub-AA in effective legibility even where the ratio technically passes. 400 at `--text-sm` in #aaa or brighter is the floor for card/spec text.
- **Kill the failing grey — resolved by doc 21.** `--color-text-dim: #666` measures **3.49:1** and fails AA outright. Doc 21 A1 aliases it to `--ink-quiet` `#9a9590` (**6.59:1**, AA at every size on both surfaces), which is exactly the fix I ordered for `.stat-source` and also raises the palette floor I flagged (my "#888 → #9a9a9a" ask lands as `#9a9590`). Nothing further needed here; the decorative comparison-list "x" glyphs (639–641) are exempt either way.
- **500** = labels, buttons, nav, prices, eyebrows. **600** = only `.price-row.total` and `.booking-option__title` class of moments. Loaded set stays **300, 400, 500, 600** — but as the variable font (§6), so the weights are free.

**Numerals:** Outfit's figures are lining by default; the Google build exposes `tnum`. Every price and spec column gets tabular:

```css
.model-price, .price-row, .price-summary, .addon-price,
.booking-option__price, .booking-summary__row, .compare-table td,
.spec-item span, .lightbox-counter {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings: "tnum" 1;   /* belt for older Safari */
}
```
Confidence note: `tnum` presence in the current Google-served Outfit build is high-likelihood but **must be verified in the build we ship** (type "11111 / 90909" in a column and compare widths). If the shipped subset lacks it, tabular alignment falls back silently to proportional — acceptable degradation, but Ted should check once.

**The eyebrow/label spec** (one definition, replacing four ad-hoc ones):

```css
.eyebrow, .spec-item label, .addon-category h4, .standard-features h4,
.compare-badge, .model-capacity, .blog-card__date {
    font-family: var(--font-primary);
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);   /* 0.14em — replaces 0.03/0.05/0.08/0.1em zoo */
    line-height: var(--leading-caption);
    color: var(--color-text-muted);
}
/* Section kicker — one per section (doc 21 R10). Smaller, wider, ember. */
.eyebrow--wide {
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-caps-wide);   /* 0.2em */
    color: var(--ember);
}
```
The base rule above is the micro-label voice: spec labels, badges, dates, metadata. `.eyebrow--wide` is the wayfinding kicker the mood board established and doc 21 R10 preserved inside this system — it passes AA at 11px (`--ember` on ground 8.40:1, on elevated 7.84:1, doc 21 §7).

**Nav, quieted** (UX audit item, resolved): `.nav-links a` → `font-size: var(--text-sm); font-weight: 400; letter-spacing: var(--tracking-caps); text-transform: uppercase;`. Keep caps, shrink to 14px, open the tracking to the caps standard. Small + spaced + quiet is the architecture-studio register; the current 1.1rem was doing hero work in a utility bar.

---

## 5. Vertical rhythm and measure

- **Body:** `line-height: var(--leading-body)` (1.65) replaces 1.8 at styles.css:101. Long-form only earns it via measure: keep `p { max-width: 65ch }`.
- **Component leading — delete the local patches, apply roles:** `.model-card p` 1.7→`--leading-ui`; `.faq-answer` 1.8→`--leading-body` (it's prose, but inherits now — delete line 1448); `.testimonial-card__quote` 1.8→1.55 (serif quotes at `--text-md` want less); `.footer-tagline` 1.6→`--leading-ui`; `.advisor__answer p` 1.7→`--leading-ui`; `.package-description` 1.5→`--leading-caption`.
- **Measure exceptions, named:** `p` 65ch is law for prose. Exceptions: `.faq-answer` 80ch → tighten to **70ch** (80 is past the comfortable return sweep); `.text--*-70ch` utilities collapse to one `.measure-wide { max-width: 70ch }`; captions/eyebrows 45ch; `.contact-info p` and `.service-area-links` keep `max-width: none` (link clouds aren't prose). Centered text (this site centers a lot) must never exceed 65ch — centered ragged edges get worse with width.
- **Heading space system** — replaces `margin-bottom: var(--spacing-md)` on all headings (177) plus the `.grid-3--mt-*` / `.heading--mb-2` / `.section--mt-8` utility sprawl:

```css
h1, h2, h3, h4 { margin-block: 0 0.6em; }        /* space below scales with the heading itself */
* + h2 { margin-block-start: 2.5em; }             /* space above = em of the heading = large gap */
* + h3 { margin-block-start: 2em; }
* + h4 { margin-block-start: 1.75em; }
.eyebrow + h1, .eyebrow + h2, .eyebrow + h3 { margin-block-start: 0.5em; }
p { margin-block: 0 var(--spacing-md); }
```
Em-relative heading margins mean rhythm scales with the fluid sizes for free — no breakpoint patching. The `.grid-3--mt-3/-4/-2` trio and `.heading--mb-2` become deletable after templates migrate (Ted: grep `.njk` for usages first).

---

## 6. Web font loading — self-host, subset, kill the swap shift

Current: `head.njk:298`, one Google CSS request, `display=swap`, weights CG 400/500/600 + Outfit 300–600, no italic, Georgia/system fallbacks with no metric tuning. Two extra origins (fonts.googleapis.com, fonts.gstatic.com) sit in the CSP and the preconnect list.

**Recommendation: self-host on Netlify.** Both faces are OFL — self-hosting is unambiguously licensed, zero cost. Wins: (1) removes two third-party origins and two preconnects — fonts ride the site's own HTTP/2 connection and its `max-age=31536000, immutable` header (Google rotates URLs; first visits always re-fetch); (2) CSP *shrinks* — delete `https://fonts.googleapis.com` from `style-src` and `https://fonts.gstatic.com` from `font-src` in `netlify.toml` (no new origin added, so the strict-CSP constraint is satisfied in the right direction); (3) enables `size-adjust` fallback metrics and exact subsetting.

**Files (6 total, ~110–140KB):** via `glyphhanger` or fontsource downloads, woff2 only, **latin subset** `U+0000-00FF, U+0131, U+0152-0153, U+2013-2014, U+2018-201A, U+201C-201E, U+2026, U+2212` — note U+00E4 ä, U+00F6 ö, U+00E5 å are inside U+0000-00FF, so **Finnish rides in the base subset; no latin-ext needed** (see §9).

1. `cormorant-garamond-400.woff2`, `-500`, `-600`, `-400italic`
2. `outfit-variable.woff2` — Outfit ships as a single variable font (wght 100–900); one file replaces four static instances and makes the 300/400/500/600 policy free. Subset with the `wght` axis intact (`glyphhanger --variable`).

```css
/* fonts.css — or top of styles.css.
   Paths below are illustrative. The Wave A plan is authoritative on delivery:
   binaries live in src/fonts/ with CONTENT-HASHED filenames under
   max-age=31536000, immutable. The variable face declares format('woff2') with
   font-weight: 100 900 — NOT format('woff2-variations'), which is deprecated
   syntax that silently drops the whole face to Arial. */
@font-face { font-family: 'Cormorant Garamond'; src: url('/assets/fonts/cormorant-garamond-400.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; unicode-range: U+0000-00FF, U+2013-2014, U+2018-201E, U+2026; }
@font-face { font-family: 'Cormorant Garamond'; src: url('/assets/fonts/cormorant-garamond-500.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; unicode-range: U+0000-00FF, U+2013-2014, U+2018-201E, U+2026; }
@font-face { font-family: 'Cormorant Garamond'; src: url('/assets/fonts/cormorant-garamond-600.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: swap; unicode-range: U+0000-00FF, U+2013-2014, U+2018-201E, U+2026; }
@font-face { font-family: 'Cormorant Garamond'; src: url('/assets/fonts/cormorant-garamond-400italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; unicode-range: U+0000-00FF, U+2013-2014, U+2018-201E, U+2026; }
@font-face { font-family: 'Outfit'; src: url('/assets/fonts/outfit-variable.woff2') format('woff2'); font-weight: 100 900; font-style: normal; font-display: swap; unicode-range: U+0000-00FF, U+2013-2014, U+2018-201E, U+2026; }

/* Metric-tuned fallbacks — kills the swap reflow */
@font-face {
    font-family: 'Cormorant Garamond Fallback'; src: local('Georgia');
    size-adjust: 88%; ascent-override: 96%; descent-override: 28%; line-gap-override: 0%;
}
@font-face {
    font-family: 'Outfit Fallback'; src: local('Arial');
    size-adjust: 99%; ascent-override: 100%; descent-override: 26%; line-gap-override: 0%;
}
```
```css
/* Token updates, replacing styles.css:48–49 */
--font-primary: 'Outfit', 'Outfit Fallback', -apple-system, BlinkMacSystemFont, sans-serif;
--font-heading: 'Cormorant Garamond', 'Cormorant Garamond Fallback', Georgia, serif;
```
The override numbers above are calibrated starting points from the two faces' metrics (Cormorant's small x-height needs Georgia shrunk hard; Outfit is near-Arial in advance widths). **Ted must verify with `fontaine` (npm, or its playground) against the actual subset files** and paste the generated values — do not hand-tune by eye. With correct overrides, `font-display: swap` produces near-zero CLS and we keep instant text; `optional` is not needed.

**Preload exactly two files** (the above-the-fold pair), in `head.njk` replacing lines 290–298:
```html
<link rel="preload" href="/assets/fonts/cormorant-garamond-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/outfit-variable.woff2" as="font" type="font/woff2" crossorigin>
```
Delete both Google preconnects and the Google CSS `<link>`. Do not preload the italic or the 500/600 romans — they're below the fold on every entry page and would delay the LCP hero image (which keeps its `preload_image` slot).

---

## 7. OpenType features

Google's shipped builds strip some features; everything below degrades silently if absent, so all declarations are safe. Verified-behavior notes inline.

```css
/* Global — after the body rule */
body { font-kerning: normal; font-variant-ligatures: common-ligatures; }

/* Serif display: allow Cormorant's discretionary ligatures ONLY at display sizes */
h1, .thesis-line { font-variant-ligatures: common-ligatures discretionary-ligatures; }

/* Never in UI strings, prices, or all-caps */
.btn, .nav-links a, .eyebrow, .price-row, .compare-table {
    font-variant-ligatures: common-ligatures; /* explicit: no dlig */
}
```
- **Figures:** Cormorant's default figures are oldstyle-leaning; in *running serif display* that's correct and needs no declaration. Anywhere Cormorant shows a number that aligns with UI (none, after §3's ban list) would need `lining-nums`. Outfit prices: tabular lining per §4.
- **Small caps:** not available in these builds (Cormorant SC is a separate family); do not declare `font-variant-caps: small-caps` — the browser would synthesize fake shrunken caps, the one outcome worse than uppercase. Eyebrow spec (§4) is the small-caps substitute.
- **`letter-spacing` interaction warning for Ted:** tracking applies after ligature substitution and can crack `dlig` pairs; since dlig only lives on untracked display serif lines, no conflict exists in this spec. Keep it that way.

---

## 8. Responsive behavior, 320 → 1920

- **Fixed small steps, fluid large steps** (§2) is the mobile strategy: body stays 16px at every width (Lee loved the mobile mood board because its text end holds still and only the display sizes breathe — this preserves that), display collapses from 64→40px. At 320px: h1 40px / h2 32px / h3 23px / body 16 / small 14 / captions 12–11. Ratios stay legible without a single media query.
- **The scale's clamps use `vw` terms small enough (≤3.5vw)** that no step inverts order at any width — verified arithmetic: at 320px the steps are 11/12/14/16/17/19/23/28/32/40; at 1440+ 11/12/14/16/18/21/26/36/48/64. Monotonic at every interpolation point.
- **iOS zoom guard stays:** the `input { font-size: 16px !important }` rule (2532) is correct and now consistent with `--text-base` inputs anyway; keep the rule as a backstop.
- **Measure on mobile:** 65ch never binds below ~600px (the container is narrower); no exception needed. `--tracking-caps` at `--text-xs` on 320px screens is safe (11px × 0.14em ≈ 1.5px — renders cleanly at 2x DPR; another reason for the 11px floor).
- **Above 1440:** type stops growing deliberately. The 1920 experience gains whitespace, not point size — the architecture-monograph move. `.hero-subtitle` at `--text-md` under a 64px h1 gives the ~3.5:1 display-to-subtitle jump the register calls for.

---

## 9. The Finnish problem

*Löyly*, *sauna*, place names (Squamish is Skwxwú7mesh territory — if Coast Salish orthography ever appears, that's a different problem; flag to George/Lee before use, as ʔ and 7 need glyph checks these subsets don't cover).

- **Coverage:** Finnish uses ä ö å (U+00E4/F6/E5 + capitals U+00C4/D6/C5) — all inside Latin-1, all present in both faces' latin subset and in the §6 `unicode-range`. **No latin-ext file needed; no fallback flash on the ö in löyly.**
- **Verification step for Ted (one-time):** render `LÖYLY löyly Väinämöinen ÄÖÅ äöå` in Cormorant 400/500/600 + italic and Outfit 300–600 at `--text-2xs` through `--text-4xl` on the dev server; confirm (a) diaereses don't clip against ascenders at `--leading-display` 1.12 — Cormorant's Ö at display size with tight leading is the one real risk; if a capital Ö ever starts a display line that sits directly under another line, bump that element to line-height 1.18; (b) no synthesized/fallback glyph swap (diacritics render in the same color/weight as neighbors).
- **Style rule:** Finnish loanwords italicized (Cormorant italic) on first use in serif contexts only; in Outfit body they stay roman (no synthetic italic exists in our load, and geometric-sans fake italics are ugly) — set them plain, optionally weight 500 on first use. `lang="fi"` spans on Finnish phrases (not single loanwords) for hyphenation/screen-reader correctness.
- **The scale survives diacritics** because every leading token ≥1.35 except display (handled above); no other collision exists.

---

## 10. Implementation order for Ted (dependency-sorted)

1. Add the token block (§2) + fallback `@font-face` metrics + self-hosted fonts (§6); update `netlify.toml` CSP + `head.njk`. Run `fontaine` for real override values. Verify tnum (§4) and Finnish rendering (§9).
2. Swap `body` to weight 400 / `--leading-body`; replace h1–h4 block (§3); add OpenType globals (§7).
3. Mechanical size migration per the §2 table (one selector at a time; the "replaces" column is exhaustive).
4. Eyebrow consolidation + nav quieting (§4); heading-margin system (§5) and utility-class retirement (template grep first).
5. Fix the two register violations: `.quote-btn` (serif→Outfit 500 + `--color-black`) and `.booking-option__price`.

## Deferred ideas (out of my lane or out of scope)
- Palette contrast: raising `--color-text-muted` #888→#9a9a9a and restricting #666 — Jen's token file, flagged in §4.
- Caption placement/serif-vs-sans for photo captions under the El Croquis plate pattern — layout call, deferring to Jen; my recommendation is sans (`--text-xs` eyebrow voice, no italic).
- The mood board's sub-11px specimen labels — flagged to Jen (§2), production floor is 11px.
- `.stat-number` at 3.5rem sits between `--text-3xl` and `--text-4xl`; I mapped nothing to it deliberately — if Jen keeps stat cards post-redesign, it takes `--text-3xl`.

*Licensing: both families SIL Open Font License 1.1 — web self-hosting, subsetting, and modification all explicitly permitted, cost $0. Sources: Google Fonts family pages for Cormorant Garamond and Outfit (verify at fonts.google.com if re-confirming the variable axis or weight set).*
