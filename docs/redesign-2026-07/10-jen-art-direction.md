# SSC Website Redesign — Art Direction & Compositional System
**Jen, Creative Direction — 2026-07-28**
Feeds the relay pipeline. Companion documents: Beatrice (type), Saul (photography/grid), George (copy), Wim (experience/journey). Where a decision belongs to one of them I name the handoff and stop.

Sources: DESIGN-BRIEF.md; `ssc-visual-direction.html` (mood board); `website-audit-ux.md` (my 2026-07-27 audit); `brand-guidelines-audit.md`; `architectural-brochure-inspiration.md` (Zumthor/El Croquis/Kundig); `/home/leesalo/Projects/ssc-website/styles.css` + `src/`.

---

## 1. Critique of the direction — where the mood board stops short

The mood board is right about register and I stand behind everything in it. But it is a **register demo, not a system**, and if Ted builds "more of the mood board" we ship a beautiful monotone. Five genuine gaps:

**1.1 It has one rhythm, and one rhythm is a metronome.**
Every section in the mood board is: narrow serif thesis → note → plate → repeat, at identical `clamp(6rem,16vh,12rem)` spacing. That works for a five-minute manifesto. Across a 17-page site it becomes wallpaper. Compression-and-release requires actual *compression* — a genuinely dense moment (a spec table, a plan, a tight grid) — or the "release" is just emptiness. Therme Vals works because the low dark corridors exist; the mood board is all tall rooms. The compositional system in §2 fixes this by making density a first-class archetype (the Ledger), not a lapse.

**1.2 It has no answer for the work itself.**
The El Croquis insight the mood board cites — hero, plan, words, detail, credits, repeated — is quoted but never demonstrated. There is no per-project template anywhere in the direction, and the current site has the same hole: a gallery of images but not one *build presented as a build* (location, year, footprint, species, stove, one paragraph, detail shots). This is the single largest thing an architecture-studio register demands that we do not yet deliver. Kundig's book presents five houses deeply, not twelve thinly. SSC should present 3–5 builds in a fixed case-study template (§2.2, archetype F) and let the gallery be the overflow, not the argument.

**1.3 It's missing the third voice: the drawing.**
Zumthor's book keeps the architect's annotated sketches in the body of the book, carrying narrative weight. Nakashima's site shows templates and shop drawings. SSC has plans, cut-lists, and build sequences and shows none of them. Photography alone says "we photograph well." A plan or an annotated section drawing says "we *design*." One drawing on /process/ and one per case study moves the site from catalogue to studio more than any amount of whitespace. **Handoff → Saul:** art-directing the drawing style (line weight, white-on-dark vs dark-on-white reproduction). **Escalation → Lee:** do presentable drawings exist? (§6.)

**1.4 The captionless-plate rule is half right.**
"A photograph carrying a caption reads as a receipt" — true for atmosphere plates. But El Croquis puts a small typographic block (project, year, location) *near* the hero, and that block is what makes it read as a body of work rather than stock. Rule as built: atmosphere plates carry nothing; **case-study and gallery plates carry a one-line index caption** in the utility voice (`0.6875rem` — Beatrice's stated type floor, nothing on the site sets below it — tracked uppercase, `--color-text-secondary` `#9a9590`, **not** the faint token: §4.3 rules faint out below 0.8rem, so captions at floor size use secondary), set *below* the image against ground, never overlaid. Alt text everywhere regardless — accessibility is not a caption.

**1.5 It ducks the commercial problem.**
Nakashima and Norm don't sell sessions or run configurators. SSC does, and the highest-value fix in the whole program is a quote form that actually submits. The mood board's silence here is a risk: an over-faithful implementation would bury the funnel under restraint. The resolution is the **Threshold archetype** (§2.2G): exactly one quiet, full-width ask per page, never lit-up (Lee's constraint), always the last section before the footer. Restraint applies to *how* we ask, not *whether*.

Verdict on the direction itself: **right, and incomplete in the direction of politeness.** Everything it says, keep. What it omits — density, the work-as-work template, drawings, the funnel — is where the department earns its keep.

---
## 2. The compositional system

The system of record is `styles.css`. New tokens go in `:root` (styles.css:1–90); new section classes replace the ad-hoc `container` / `bg-grey hero-overlay` / `wide-container` trio currently doing all the work.

### 2.0 New tokens

```css
/* Section rhythm — replaces flat --spacing-3xl (8rem) on sections */
--section-pad:       clamp(6rem, 14vh, 10rem);   /* standard block */
--section-pad-tight: clamp(3.5rem, 8vh, 5rem);   /* dense/utility block */
--section-pad-open:  clamp(8rem, 18vh, 13rem);   /* thesis/release block */

/* Containers */
--measure:      65ch;                             /* prose, exists as p max-width */
--hold:         72rem;                            /* contained max width */
--hold-narrow:  38rem;                            /* thesis/essay column */
--gutter:       clamp(1.5rem, 6vw, 7rem);
```

Section classes (Ted implements as utility classes on `<section>`; existing `.container` keeps its role as an inner wrapper):
`.section` → `padding-block: var(--section-pad)`; modifiers `.section--tight`, `.section--open`; `.section--elevated` → `background: var(--color-bg-light) /* #1a1a1a */`. Full-bleed figures sit *between* sections with `padding-block: 0`.

### 2.1 Section archetypes — seven, no more

Every section on the site must be one of these. If a design need doesn't fit, the need is wrong or the system grows by department decision, not by drift.

| # | Archetype | Job | Composition | Padding |
|---|---|---|---|---|
| A | **Hero Plate** | Arrival. The held photograph. | 100svh image, nothing on it except scroll cue (and nav). One per page max; sub-pages use a 60svh variant (`.hero--sub`). | 0 |
| B | **Thesis** | One idea, stated once. | Single narrow column (`--hold-narrow`), serif display line ≤26ch, optionally one supporting paragraph. Nothing else shares it. | `--section-pad-open` |
| C | **Plate / Pair** | Evidence. Photography as argument. | Full-bleed single image (`clamp(24rem,78svh,46rem)` height) or 2-up pair split by 1px `--rule` line. Atmosphere: no caption. Work: index caption below. | 0 (+1 caption row) |
| D | **Essay** | Explanation. Text with a supporting image. | Asymmetric two-column, 40/60 or 60/40 (§2.4). Text column obeys `--measure`. | `--section-pad` |
| E | **Ledger** | Density. Specs, comparisons, FAQs, prices, credits. | Contained (`--hold`), rule-separated rows or tight grid, utility type, tabular numerals. This is the *compression* — visibly denser than everything around it. | `--section-pad-tight` |
| F | **Case Study unit** | A build presented as a build. | Fixed El Croquis sequence: index block (name · year · location · footprint, archetype E micro) → hero plate (C) → one running paragraph (B, ≤120 words) → detail pair (C) → credits/spec row (E). Repeats identically per build. **Full implementation spec: §7** — template path, data shape, class names, degradation rules, worked example. | composite |
| G | **Threshold** | The single ask. | Full-width, `--color-bg-light` ground, one serif line, one `.btn` + one text link. Always last before footer. Never boxed, never glowing. | `--section-pad` |

### 2.2 Rhythm rules — what may share a viewport

1. **One archetype per viewport at desktop.** A Thesis never shares the screen with a Ledger; the `--section-pad-open` value exists to enforce this physically.
2. **No two same-type sections adjacent**, with two exceptions: Plates may stack (that's a portfolio), and Case Study units repeat by design.
3. **Dense follows open, open follows dense.** After a Ledger, the next section must be B, C, or G. After two consecutive text sections (B/D), the next must be C. This is the compression-and-release encoding: the *sequence grammar* is `(open text | plate)+ dense (open text | plate)+ …`, terminated by G.
4. **Elevated ground (`#1a1a1a`) marks a register change**, not decoration: use it for Voice/story sections and the Threshold only. Never two elevated sections in a row — the alternation is what makes it legible.
5. **A page is 5–9 sections.** Beyond 9, split the page or cut. (Current /saunas/ would be ~14 under the old grammar; §3 fixes it.)

### 2.3 Full-bleed vs contained — the decision rule

**Full-bleed is for photography and nothing else.** If it is an image whose job is evidence or atmosphere → full-bleed (archetype C). Everything textual, tabular, or interactive is contained. Corollaries:
- The current `page-bg--fixed` translucent background image behind whole pages (home.njk:3) dies — it's atmosphere leaking behind text, the exact thing the restraint test fails.
- `hero-overlay` sections (text over darkened image, used on about/saunas/warranty/service-area) are retired as a *text* pattern. Text never sits on photography except the sub-page hero `<h1>`, which sits on a bottom-third scrim (`linear-gradient(transparent 40%, rgba(12,12,12,.72))`), left-aligned at the gutter — not centered over the image's face.
- Maps and video follow the photography rule (full-bleed allowed, contained preferred at 600px height as today).

### 2.4 The asymmetry system

The brand doc's 40/60 ratio becomes a strict alternation on archetype D:
- Grid: `grid-template-columns: 2fr 3fr` (40/60, text left) and `3fr 2fr` reversed (60/40, image left, i.e. text right at 40). Gap `var(--spacing-2xl)` (4rem).
- **Alternate strictly down the page**: first Essay on a page is text-left, second is text-right, and so on. The alternation is per page, not per template — it makes a long page read as a woven column rather than a left-heavy list.
- The image in an Essay may overflow its column by up to `4rem` toward the outer edge only (the existing `.feature-image--overflow` gesture, kept, tokenized as `--overflow-reach: 4rem`) — never toward the center gutter.
- Below 768px: single column, image first, text second, overflow disabled.
- The 40-side never contains more than heading + 2 paragraphs + 1 link. More than that → it's two sections.

### 2.5 Vertical pacing — the canonical page arc

What the reader meets, in order, and how long each moment lasts (scroll-lengths at desktop, 1 unit ≈ 1 viewport):

1. **Hold** — Hero Plate, 1.0 viewport, zero information beyond the photograph and nav. The moment Lee loves, kept, but passive (§5.3).
2. **Orient** — Thesis, ~0.7 viewport of mostly ground. The one sentence that tells you whose site this is.
3. **Prove** — alternating Plate/Essay, 2–4 viewports. The middle of the page belongs to evidence.
4. **Compress** — one Ledger, ~1 viewport. Specs, numbers, the builder voice. The reader leans in.
5. **Release** — one Plate or short Thesis, ~1 viewport. Breath after density.
6. **Ask** — Threshold, ~0.6 viewport, then footer.

Every page in §3 is an instance of this arc, sometimes with a stage omitted, never reordered.

---
## 3. Page-by-page art direction

Templates in `src/` and `src/_includes/pages/`. Format: **job → composition (arc stages, §2.5) → what changes from today.** Copy itself is George's; journey/CTA logic is Wim's; I specify composition.

### 3.1 Home (`index.njk` → `pages/home.njk`)
**Job:** establish the register in one scroll. The page *is* the mood board, productionized.
**Composition:** A Hero Plate (current `IMG_7991` hero image, kept) → B Thesis (the one line that only SSC can say — George) → C Plate → D Essay 40/60 "built with care" (existing `grid-2` section, kept, re-gridded) → F one abbreviated Case Study unit (the newest build — the proof the page currently lacks) → E Ledger: three offerings as rule-separated rows (Custom / Standard / Mobile — replaces the four `offering-card` grid; "Try a Session" moves to the Threshold, it's a different intent) → C Plate release → G Threshold (quote + session links side by side).
**Changes:** delete `page-bg--fixed` background layer (home.njk:3); hero loses both overlaid buttons and headline (moves to Thesis below — see §5.3 for how the h1 still exists for SEO: it's in the Thesis, not on the photo); testimonials section held until real attributions arrive (Lee's campaign), slot reserved as an E-row; Aldergrove copy in "Try a Session" card is factually wrong — flagged, George rewrites.

### 3.2 Saunas (`saunas.njk` → `pages/saunas.njk`)
**Job:** the body of work. Best foot forward, then defend it (Lee's fixed order).
**Composition:** A `.hero--sub` → E Ledger: **model index first** (S2→SC as rule-separated rows: model · footprint · capacity · price — El Croquis credits-block register, replacing card grid as the page's spine; each row opens the existing modal) → C/F: 2–3 featured builds as Case Study units → E Ledger: compare table (kept, restyled) → D Essay: barrel/infrared comparison *demoted* to one asymmetric section with a link to a fuller FAQ answer (currently sections at saunas.njk:110–163 lead the page — they move below the work and shrink) → B short thesis on the science (one stat, not a stat wall) → G Threshold (configurator CTA — the funnel Ted must make actually submit).
**Changes:** section order inverted per Lee's decision; three-column takedown compressed; model cards become keyboard-accessible rows (fixes my audit §9 finding).

### 3.3 About (`about.njk` → `pages/about.njk`)
**Job:** two people you'd trust with a six-figure build. "We" = Lee and Anthony, slightly vague, never first-person-singular (fixed constraint).
**Composition:** A `.hero--sub` → B Thesis drawn from Lee's barbecue answer (the hidden-saunas origin — George sands nothing) → D Essay 40/60: the origin story with the trailer-era photograph → C Pair: hands-at-work detail shots (the missing third photo scale — Saul) → D Essay 60/40: how we build / every-role paragraph → G Threshold.
**Changes:** both `hero-overlay` text-on-image sections (about.njk:44, 68) retired per §2.3; "Working together" process content moves out entirely to the restored /process/ page; page shrinks from 6 sections of mixed jobs to one job.

### 3.4 Process (`process.njk` — currently a redirect; becomes a real page)
**Job:** confidence. What happens after you email us, and when money changes hands.
**Composition:** A `.hero--sub` (a build-in-progress photograph, not a finished glamour shot) → B Thesis → four D Essays, alternating 40/60 / 60/40, one per step (01 Consultation / 02 Design & Planning / 03 Construction / 04 Installation & Support), each with a photo *of that step*; step 02 is where the **drawing** goes (§1.3) → E Ledger: timeline + payment-milestone table (weeks, deposit points — content from Lee, do not invent) → G Threshold ("start with a conversation").
**Changes:** new template `pages/process.njk`; remove the redirect. This page is the purest expression of the alternating-asymmetry system — the four steps *are* the weave.

### 3.5 Gallery (`gallery.njk`)
**Job:** overflow evidence — the case studies are the argument, this is the depth behind them.
**Composition:** A none (starts at nav) → B one-line Thesis → C plates: masonry replaced by a strict alternation of full-bleed Plate / Pair / contained 3-up row, grouped by build where metadata exists, each group headed by an E-micro index line (build · location · year) → no Threshold variant with a button; a single text link to /contact/ suffices here.
**Changes:** lightbox gets `data-full` full-resolution sources and dialog semantics (audit P0-4/P1-5); captions per §1.4.

### 3.6 Locations (`locations.njk` → `pages/locations.njk`)
**Job:** we're real and near you. Flagship = Brackendale Art Gallery; all Aldergrove mentions removed (fixed constraint).
**Composition:** A none → B Thesis → D Essay: BAG flagship with photograph → E Ledger: visit info rows (address, hours, booking link) → C contained map (600px, kept) with build pins → G Threshold (book a session).
**Changes:** location cards → ledger rows; map keeps `--radius-sm` per §4.

### 3.7 Contact (`contact.njk` → `pages/contact.njk`)
**Job:** lowest-friction serious inquiry. Email only, no phone (fixed constraint).
**Composition:** A none → B short Thesis ("start with a conversation" register) → form as a contained single column at `--hold-narrow`, **not** the frosted card — the form sits directly on ground with rule-separated fieldsets (§4) → E micro-ledger: email + BAG address + response-time expectation → no separate Threshold (the page *is* the threshold).
**Changes:** `.contact-form--styled` frosted card retired (styles.css:2661); advisor widget visual language unified (§4).

### 3.8 FAQ (`faq.njk` → `pages/faq.njk`)
**Job:** kill objections quietly. This page is *allowed* to be one long Ledger — density is its nature.
**Composition:** A none → B one-line Thesis → E Ledger: rule-separated accordion rows grouped under 3–4 serif group headings → G Threshold.
**Changes:** `hero-overlay` hero retired; accordion open/close animated at 250ms ease (audit P2-14); barrel/infrared long-form defense lands here from /saunas/.

### 3.9 Warranty (`warranty.njk` → `pages/warranty.njk`)
**Job:** legal confidence without legal atmosphere. A document, presented as a document.
**Composition:** A none → B Thesis (plain-language summary line) → E Ledgers throughout: coverage table, third-party components table, exclusions, maintenance — all in the utility voice with tabular numerals → no Threshold (a warranty page selling is off-register); text link to /contact/.
**Changes:** `hero-overlay` sections (warranty.njk:4, 45) retired; 8 loose sections consolidated to ~5 Ledgers.

### 3.10 Blog (`blog.njk`, `blog-post.njk`)
**Job:** the studio journal — proof of ongoing practice.
**Composition:** index: B Thesis + E Ledger rows (date · title · one-line deck; no card grid, no thumbnails competing). Post: A `.hero--sub` if the post has a strong image, else none → single `--measure` column, Plates full-bleed between passages.
**Changes:** `.blog-card` grid → ledger rows; post template inherits reveal system only.

### 3.11 Book (`book.njk` — currently includes `coming-soon.njk`)
**Job:** route to `book.secretsaunacompany.ca` honestly. Sessions live but paused for fire ban (fixed constraint — current "offline while we rebuild" copy is wrong).
**Composition:** B Thesis + short status paragraph (fire-ban pause, George writes; must be easy to flip when ban lifts — suggest a data flag in `src/_data`, Ted's call) + one `.btn` to the booking subdomain → C single atmosphere Plate.
**Changes:** drop `coming-soon.njk` include; keep the four inbound links working.

### 3.12 404 (`404.njk`)
**Job:** a wrong turn handled with the same voice.
**Composition:** B Thesis only (serif line + link home + link to /saunas/) over ground. No photo — the one page where emptiness is the joke. One line of George's dry copy.

### 3.13 Service areas (`squamish.njk`, `whistler.njk`, `vancouver.njk`, `north-shore.njk`, `sea-to-sky.njk` → `pages/service-area.njk`)
**Job:** SEO landers that don't read as landers.
**Composition:** shared template, one composition: A `.hero--sub` (area-specific image where the library has one — Saul to confirm coverage; no misattributed locations, ever) → B Thesis naming the place → D Essay: delivery/site logistics for that area → E micro-ledger: distance/travel facts (real ones only) → G Threshold.
**Changes:** `hero-overlay` features section and `section--warm-glow` CTA (service-area.njk:21, 45) retired — the warm-glow class is exactly the lit-up CTA Lee rejects. Threshold replaces it.

### 3.14 Privacy (`privacy.njk`)
Utility document, Ledger register throughout. **Square → Helcim correction** (fixed constraint) — flag to George/legal copy pass.

*(§3.15 Commercial and §3.16 Care — the two pages from Wim's journey spec — are specified in §8, in this same format. The enumeration is sixteen pages, not fourteen.)*

---
## 4. The two-generation problem — one component language

My audit found square-cornered Gen-A (2025) and frosted 12px-radius Gen-B (2026) coexisting. **The unified language is Gen-A's geometry with Gen-B's discipline: near-square, rule-drawn, opaque.** Frost, blur, and pill shapes leave the system. Rationale: the mood board's entire surface grammar is 1px rules on true ground — `border-radius: 0` swatches, 1px `--rule` pair-gaps. Blur-glass is a consumer-app gesture, not an architecture-studio one.

### 4.1 Radius tokens (styles.css:72–74)

```css
--radius-sm: 2px;   /* was 4px — interactive elements: buttons, inputs, chips */
--radius-md: 2px;   /* was 6px — collapse to sm; keep the token for compat, or alias */
--radius-lg: 0;     /* was 20px — surfaces are square. Token retained, zeroed */
```
Images and cards: **0**. Interactive controls: **2px** (a hairline of forgiveness so buttons don't look like table cells). Only `50%` circles (map markers, avatar dots) keep their geometry.

### 4.2 Component-by-component

| Selector (styles.css line) | Today | Becomes |
|---|---|---|
| `.logo` pill (279–289) | 115px img, `border-radius:999px`, dark pill bg, drop shadow | 48px mark, no pill, no shadow, sits naked in nav (audit P1-8) |
| nav bar (251–252) | `backdrop-filter: blur(10px)` | **Kept** — the one sanctioned blur; it's chrome, not content. Reduce to `blur(8px)` + `background: rgba(12,12,12,0.72)` |
| `.offering-card` / `.model-card` (599, 609 area) | `--radius-lg` 20px | radius 0; `border: 1px solid var(--color-border-subtle)`; hover per §5.2 |
| buttons `.btn`, `.btn-outline` (687, 699) | `--radius-md` 6px | 2px |
| gallery items / images (750, 812, 1150…) | `--radius-sm` 4px | 0 — photography is never rounded |
| `.map-container` (2022) | 8px + heavy shadow | radius 0; shadow removed; `border: 1px solid var(--color-border-subtle)` |
| `.contact-form--styled` (2661) | frosted card: `rgba(15,15,15,0.75)` + 12px + `blur(4px)` | **deleted** — form sits on ground; fieldsets separated by `border-top: 1px solid var(--color-border-subtle)`; legends in utility voice |
| `.advisor` (2650s) | same frosted 12px card | `background: var(--color-bg-light)` opaque, radius 0, 1px border, no blur |
| `.advisor__starter` (chip, 20px pill) | pill | 2px chip, same border grammar |
| `.advisor__input`, `.advisor__submit` (8px) | 8px | 2px; also fix undefined `var(--color-bg)` at :2687/:2725 (audit P0-3) |
| booking/status blocks (2374, 2700, 2724, 2781) | 6–8px mixed | 2px interactive / 0 surface, per rule above |
| `.timeline` dots etc. (1284–1387 50% shapes) | circles | keep |

### 4.3 Surface elevation grammar

Exactly three surface treatments exist after unification:
1. **Ground** `#0c0c0c` — default.
2. **Elevated** `#1a1a1a` — section-level register change only (§2.2 rule 4), never per-card.
3. **Ruled** — 1px `var(--color-border-subtle)` borders/dividers doing all component separation. No box-shadows on static surfaces anywhere; shadow appears only as the hover-lift affordance (§5.2).

Grey ramp collapses to the three honest tokens from the audit/mood board: text `#e8e6e3`, secondary `#9a9590` (replaces cool `#c0c0c0`, and retires the lying `--color-charcoal` name), faint `#6b6762` (replaces `#666` on small text — and Beatrice must verify AA at final sizes; `#6b6762` on `#0c0c0c` is borderline at small sizes, so faint is *never* used below 0.8rem).

---

## 5. Motion — the build spec

Two systems. Everything else in `js/animations.js` is deleted: `HeroIntroAnimation` scroll-lock, all four parallax variants (`initHeroParallax` and the `.full-width-image-wrap` wrapper injection), `slowZoom`, hover-scale on parallaxed images. The mood board's IntersectionObserver implementation (ssc-visual-direction.html:590–611) is the reference implementation — Ted can lift it nearly verbatim.

### 5.1 System 1 — Reveal (load-in and scroll are the same system)

- **Mechanism:** `.reveal` class; IntersectionObserver, `threshold: 0.12`, `rootMargin: '0px 0px -8% 0px'`; add `.seen`, then `unobserve` — fires once, never reverses.
- **Properties animated:** `opacity 0→1`, `transform: translateY(28px)→none`. Nothing else. Never `top`, never `filter`, never scale on reveal.
- **Duration / easing:** `1000ms cubic-bezier(.22,.61,.36,1)` both properties.
- **Stagger:** within a grid/ledger/nav group, `transition-delay: calc(var(--i) * 120ms)`, `--i` set per child, capped at `--i: 4` (5th+ children share the 480ms slot — long ledgers must not take 2s to settle).
- **Load-in is the same class:** hero image, nav, and scroll cue get `.reveal` with `--i` 0/1/2 and are observed immediately on DOMContentLoaded — the page "settles once," no separate intro system, no lock.
- **Replaces:** `.fade-in`, `.slide-up`, `.slide-right`, `.slide-left`, `.scale-in`, `.gallery-item--reveal` — all collapse to `.reveal` (+stagger). Directional slides die; one direction (up) sitewide.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` → `.reveal { opacity:1; transform:none; transition:none }` in CSS **and** the JS bails before constructing the observer (both layers, as in the mood board script). No JS-driven motion of any kind runs.

### 5.2 System 2 — Hover grammar (interactive feedback)

One grammar for every interactive surface (cards, ledger rows, gallery items, buttons, nav links):
- **Surface hover:** `transform: translateY(-3px)`; `border-color` warms from `var(--color-border-subtle)` to `rgba(196,165,123,0.45)`; `box-shadow: 0 12px 32px rgba(0,0,0,0.35)` appears. `200ms ease-out` on all three.
- **Image-in-surface hover:** inner `img { transform: scale(1.03) }`, `600ms cubic-bezier(.22,.61,.36,1)`, parent has `overflow:hidden`. Applies only to images inside an interactive card/row — never to standalone Plates.
- **Buttons/links:** color/border transitions only, `200ms ease`; no lift, no glow, no pulsing — the "no lighting up of call-to-action buttons" constraint is a hard rule for the Threshold `.btn`.
- **Reduced motion:** transforms suppressed; color/border transitions may remain (they convey state, not decoration).
- **Transition tokens:** `--transition-fast: 200ms ease-out` (was 300ms), `--transition-reveal: 1000ms cubic-bezier(.22,.61,.36,1)`; `--transition-medium/slow` deleted along with their consumers.

### 5.3 The hero, specifically

Lee loves the held photograph; the current implementation holds the *visitor* instead. Spec:
- Image is `position: relative`, static, `height: 100svh`, `object-fit: cover`. **No parallax, no zoom, no scroll-lock.** `touch-action` untouched; first scroll gesture always works.
- On load: image reveals first (`--i:0`), then nav (`--i:1`), then scroll cue (`--i:2`) — total settle ≈ 1.24s.
- Scroll cue: the mood board's 1px breathing line (`drift` keyframes, `2.8s ease-in-out infinite`, scaleY 0.35→1 / opacity 0.35→0.9) + "Scroll" at `0.6875rem` tracked uppercase (raised from the mood board's 0.65rem — Beatrice's type floor is 0.6875rem and this document does not breach it), `mix-blend-mode: difference`. This is the only infinite animation on the site, and it's 1px tall. Killed under reduced motion.
- No headline, no buttons on the photograph (home); the `<h1>` lives in the Thesis section immediately below — first thing revealed on first scroll. Sub-page heroes (`.hero--sub`, 60svh) carry the `<h1>` on a bottom scrim per §2.3.
- As the visitor scrolls off the hero, nothing happens to the image. It's a photograph, not a rig.

### 5.4 Micro-motion (sanctioned exceptions)
- FAQ accordion: `grid-template-rows 0fr→1fr` (or max-height) `250ms ease`; chevron rotate 180° same duration.
- Mobile menu: opacity + `translateY(-8px)→0`, `250ms ease-out`; `aria-expanded` synced.
- Modal/lightbox: overlay fade `200ms`, panel `opacity + translateY(12px)`, `250ms ease-out`; with the focus-trap/dialog work from audit P1-5.
All obey reduced-motion (instant swap).

---

## 6. Escalate to Lee — decisions the department cannot make

1. **Case-study builds (blocking for /saunas/ + home).** Which 3–5 builds become case studies? We need per-build: location (as publishable — "Squamish backcountry" fine, street addresses not), year, footprint, wood species, stove, and client permission to publish. Do not invent any of it.
2. **Drawings (blocking for /process/ + case studies).** Do presentable plans/sketches exist, and is Lee willing to publish them? If they exist only as rough field sketches — even better, per Zumthor — but that's his call.
3. **Photography gaps.** The detail scale (hands, joinery, charring) is thin per the mood board's own admission. A shot-list needs Lee's shop time. Saul will produce the list; Lee decides when it gets shot. Also: do area-specific photos exist for all five service-area heroes?
4. **Process page facts.** Timeline durations and payment-milestone structure — from Lee, not from us.
5. **Homepage testimonial slot.** Held empty pending his review campaign — confirm he accepts shipping without testimonials in the interim, or keeps the three anonymous quotes in a single (not triplicate) E-row until real ones land.
6. **Fire-ban status flag.** Who flips /book/ copy when the ban lifts — a data flag Lee can edit, or does he ping us?
7. **Model pricing exposure.** The ledger-row spec for /saunas/ shows price per model (currently only "from $22,500" on home). Showing per-model prices is a business call, not a design call.

---
## 7. The case-study template — archetype F, implementation-grade

This expands §2.1F from a table cell into the thing Ted builds. It is the single largest register-carrying component on the site; nothing here is left to interpretation.

### 7.1 Structure decision: data file + include, not a collection, not pages

**Decision: builds are data (`src/_data/builds.json`); the case-study unit is a reusable include (`src/_includes/components/case-study.njk`) rendered inline on `/saunas/` and the home page. No per-build URLs in this phase.**

Why not an Eleventy collection: collections are for dated, growing, individually-addressable content (the blog). We have three curated builds consumed by two different pages in two different depths. A collection would force per-build permalinks nobody asked for and a directory of near-empty markdown files fronting what is really structured data. Why not individual pages: three builds do not warrant a URL each; the El Croquis argument is the *sequence* on `/saunas/`, and the gallery is the overflow (§3.5). If the roster grows past ~6 builds, revisit — the data file migrates into a collection cleanly because the field schema below doesn't change.

Files:
- `src/_data/builds.json` — the single source of truth for build facts. Ted creates it; **every factual value comes from Lee's answers to `20-fact-gathering-questions.md` Part C (Q39–45). No field is ever guessed.**
- `src/_includes/components/case-study.njk` — the unit. Accepts one build object + a `variant` string (`"full"` | `"brief"`).
- Consumed by `src/_includes/pages/saunas.njk` (full variants) and `src/_includes/pages/home.njk` (one brief variant).

### 7.2 Data shape — `src/_data/builds.json`

Array of build objects, in publication order. Fields, types, and whether the unit renders without them:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | slug, e.g. `"clarke"` — used for anchor (`id="build-clarke"`) and gallery grouping |
| `model` | string | yes | `"S2"` \| `"S4"` \| `"S6"` \| `"SC"` — must match `models.json` naming |
| `display_name` | string | yes | What the index block shows. `"Clarke Residence"` if named permission; `"Private Residence"` if anonymous |
| `location` | string | yes | Publishable granularity only — neighbourhood/region, never a street address (Q39) |
| `year` | number | yes | Year completed (Q40) |
| `footprint` | string | yes | e.g. `"7' × 12'"` — **match the site's existing width-first order** (`saunas.njk:84`), tabular numerals |
| `capacity` | string | yes | e.g. `"4–6 people"` (Q41) |
| `wood_interior` | string | no | Q42; row omitted if absent |
| `wood_exterior` | string | no | Q42; row omitted if absent |
| `heater` | string | no | Make + model (Q43); row omitted if absent |
| `story` | string | yes | ≤120 words, George writes from Lee's Q44 answer. The build-specific thing — constraint, request, problem solved |
| `hero` | string | no | Cloudinary public ID, delivered per Saul §3 roles. If absent → degradation 7.5(a) |
| `details` | string[] | no | 0–2 Cloudinary public IDs for the detail pair. If absent → 7.5(b) |
| `drawing` | string \| null | no | Cloudinary public ID of the reproduced drawing (§1.3), reproduction style per Saul. `null` until drawings exist (§6 #2) |
| `permission` | string | yes | `"named"` \| `"anonymous"` \| `"name_only"` — from Q45. This is the publish gate, in data, where it can't be forgotten. **The gate is an allowlist and fails CLOSED:** a unit renders only if `permission` is exactly one of those three strings. Anything else — `"pending"`, absent, empty, misspelled, a typo, a value someone invents later — renders nothing. Do not implement this as `if (permission !== "pending")`; a denylist means one typo publishes a client's home without consent. |

### 7.3 The unit, section by section

Wrapper: `<article class="case-study" id="build-{id}">`. Internal spacing between the five parts: `var(--spacing-2xl)` (4rem); the whole unit sits inside the page's section flow with `--section-pad` above the first unit and between units.

| Order | Part | Class | Archetype | Spec |
|---|---|---|---|---|
| 1 | Index block | `.case-study__index` | E micro | One rule-separated line, contained at `--hold`: `display_name · year · location · footprint`. Utility voice, `0.6875rem` tracked uppercase, `--color-text-secondary`, tabular numerals, `border-top: 1px solid var(--color-border-subtle)`, `padding-block: var(--spacing-md)`. This is the El Croquis credits register — it announces the build before the photograph |
| 2 | Hero plate | `.case-study__hero` | C | Full-bleed, `clamp(24rem, 78svh, 46rem)` height, `object-fit: cover`, radius 0. Index caption already rendered above (part 1), so the plate itself carries nothing |
| 3 | Story | `.case-study__story` | B | Single `--hold-narrow` column, one running paragraph ≤120 words, body serif per Beatrice. No heading — the index block *is* the heading |
| 4 | Detail pair | `.case-study__details` | C | 2-up grid split by the 1px `--rule` gap (Saul's pair grammar, his §4). Each image gets an index caption per §1.4 (`0.6875rem`, secondary). If `drawing` is set, the drawing takes the left slot of the pair — the third voice (§1.3) |
| 5 | Credits row | `.case-study__credits` | E | Contained (`--hold`), rule-separated definition rows, `--section-pad-tight` internal rhythm. Fields in order, each `<div class="case-study__credit-row">` with `dt`/`dd`: **Model** (`model`) · **Footprint** (`footprint`) · **Capacity** (`capacity`) · **Interior** (`wood_interior`) · **Exterior** (`wood_exterior`) · **Heater** (`heater`). Utility voice, tabular numerals. Rows with absent fields are omitted, never rendered empty. **No price row** — per-build pricing is not a case-study fact and per-model price exposure is Lee's open call (§6 #7) |

`variant="brief"` (home page): parts 1–3 only (index → hero → story), plus one text link `View the work → /saunas/#build-{id}`. No details, no credits — the home page proves, `/saunas/` documents.

### 7.4 Reveal behavior

The unit participates in the standard `.reveal` system (§5.1) — index, plate, story, pair, credits each reveal as they enter, no unit-level choreography. Credits rows stagger with the standard `--i` cap.

### 7.5 Degradation — every missing-field state

a. **No `hero`:** the unit renders index → story → credits only (a build documented in text — the Zumthor register tolerates this; a placeholder image never does). Flag in build output is not needed; it's a legitimate state (Mountain Life until photography lands).
b. **`details` has 0 or 1 entries:** one entry → single full-bleed plate (C single, not pair). Zero → part 4 omitted entirely.
c. **No `drawing`:** detail pair is photographs only. Never substitute a decorative graphic.
d. **`permission: "anonymous"`:** `display_name` is `"Private Residence"`, `location` stays at region granularity, photographs render only if the anonymous-but-shown permission covers them (Q45 allows this combination explicitly).
e. **`permission: "name_only"`:** name renders, `hero`/`details` are ignored even if present → state (a).
f. **Anything not on the allowlist** (`"pending"`, absent, empty, misspelled, unrecognised): unit skipped in the template loop. `/saunas/` and home must render correctly with 2, 1, or 0 publishable builds — the loop has no minimum. Ted: implement as membership in an explicit set of the three permitted values, never as an inequality against `"pending"`. A build with no `permission` key at all must render nothing, silently and by default.
g. **Missing optional credit fields:** row omitted (7.3 part 5). The credits block renders with as few as three rows (model/footprint/capacity, all required).

### 7.6 Worked example — Clarke (S2, Kitsilano, delivered 2026-06-22)

```json
{
  "id": "clarke",
  "model": "S2",
  "display_name": "[NEEDS LEE — Q45: named vs anonymous; note Clarke has touch-ups pending week of Aug 4 and a final invoice outstanding — confirm he's comfortable before publishing at all]",
  "location": "Kitsilano, Vancouver",
  "year": 2026,
  "footprint": "[NEEDS LEE — Q41; S2 model spec is a starting point but the as-built figure is the fact]",
  "capacity": "[NEEDS LEE — Q41]",
  "wood_interior": "[NEEDS LEE — Q42]",
  "wood_exterior": "[NEEDS LEE — Q42]",
  "heater": "[NEEDS LEE — Q43]",
  "story": "[GEORGE, ≤120 words, from Lee's Q44 answer — the build-specific constraint or problem solved. Do not write it from the model brochure]",
  "hero": "[SAUL — select from S2 Clarke build-documentation folder or schedule a made photograph; phone-shot progress records are P-class, not plate-class, per his §2]",
  "details": ["[SAUL]", "[SAUL]"],
  "drawing": null,
  "permission": "pending"
}
```

`"permission": "pending"` is the true current state — the unit is fully specced and ships nothing until Lee's Q45 answer flips it.

### 7.7 Sequencing the three confirmed builds

Confirmed roster (fact-gathering doc Part C): **Clarke** (S2, Kitsilano), **Emmanuel** (SC, Edmonton), **Mountain Life** (S4).

- **`/saunas/`** (§3.2, the C/F slot): all publishable builds as full units, order **Emmanuel → Clarke → Mountain Life**. Rationale: Emmanuel has the strongest material on file (43 photos, 45 videos — the best process record SSC owns) and leads; Clarke follows pending his comfort confirmation; Mountain Life anchors, and until its photography lands it renders in text-only state 7.5(a) or is held at `"pending"` — Lee's call per build. Model diversity is a side benefit: SC → S2 → S4 shows range without saying "range."
- **Home** (§3.1, the F slot): exactly one `variant="brief"` unit — the newest build with full photo permission. At launch that is expected to be Emmanuel `[NEEDS LEE — confirm]`; the template takes the first qualifying entry in `builds.json` order rather than hardcoding, so the home proof updates by editing data, not templates.
- **Gallery** (§3.5): overflow imagery groups by `id`, headed by the same E-micro index line — one register, two depths.

---
## 8. `/commercial/` and `/care/` — composition

Wim specified both as journey rationale (14 §J4, §J5). Neither appeared in my §3 enumeration; that was a gap, closed here in the same format. Copy is George's; the journey logic is Wim's and is adopted as written.

### 3.15 Commercial (`src/commercial.njk` → `pages/commercial.njk`) — new

**Job:** convert the referred commercial buyer by answering their questions in *their* order (Wim J4): commercial track record → durability → certification → support → then price. Four named installs are the strongest proof SSC owns and currently do no structured work.
**Composition:** A `.hero--sub` (a commercial install photograph — `[NEEDS LEE — Q47: which of The Good Sauna, Gatherwell, BAG, Sea Edge Hotel may be photographed]`) → B Thesis (one line on building for daily public use — George) → E Ledger: **named installs** as rule-separated rows, one per approved client: venue · location · model · year in service (`[NEEDS LEE — Q47 governs naming; name-only clients render without images]`) → D Essay 40/60: durability and duty-cycle under daily public use, with one install photograph (facts from Lee/Adam — do not invent duty-cycle numbers) → E micro-ledger: third-party electrical certification + service/support terms (`[NEEDS LEE — service terms; certification language must match /warranty/ exactly, one phrasing sitewide]`) → G Threshold: "Start a commercial conversation" → `/contact/?type=commercial` (Wim's query-param pre-select; `navigation.js` sets the form's project-type field).
**Changes from today:** page is new. Adopting Wim's recommendation as a decision: on `/saunas/`, the **SC model row links to `/commercial/` instead of opening the configurator modal** — commercial is sold in conversations, not configurators; the residential-shaped modal never sees a commercial buyer. Footer gains a Commercial link under the existing nav column.
**Arc:** Hold (sub) → Orient → Compress (the proof ledger leads — deliberately early density; for this audience the ledger *is* the hero) → Prove → Compress (micro) → Ask. The one page where Compress precedes Prove: J4's first question is "have you done this before," and the answer is a list.

### 3.16 Care (`src/care.njk` → `pages/care.njk`) — new

**Job:** the owner's manual. Serve post-purchase owners (Wim J5) and stand as the trust artifact prospects check ("who stands behind it").

**Resolution of the `/warranty/` overlap — split by job, one job per page:**
- **`/warranty/` (§3.9, unchanged) remains the document of record**: coverage tables, third-party component terms, exclusions, the legal text, the FAQ schema. It keeps its URL, inbound links, and structured data.
- **`/care/` is the owner's manual**: maintenance cadence, seasonal care, how to make a claim, and a *plain-language warranty summary of no more than three sentences* that links to `/warranty/` for terms. **`/care/` never restates a coverage table, term length, or exclusion — every warranty fact has exactly one home, and it is `/warranty/`.** If a future edit needs a warranty number on `/care/`, the answer is a link, not a copy.
- Cross-links: `/warranty/` gains one line near its close — "Day-to-day care and claims: see Care." Footer and the `/saunas/` comparison section link to `/care/` ("what ownership looks like"), per Wim. Not merged: an owner mid-claim and a lawyer-minded prospect are different readers; fusing the pages would re-create the mixed-job pages §3 exists to eliminate.

**Composition:** A none (starts at nav, like `/warranty/`) → B Thesis (one line: a build is the start of a relationship, not the end of one — George's register, not this phrasing) → E Ledger: **care cadence** rows — task · interval · notes (wood treatment, heater maintenance, off-season prep — `[NEEDS LEE — all cadences and products; do not invent maintenance advice for a product category with fire involved]`) → D Essay 40/60: seasonal care (fire-ban season, winter) with one detail photograph → E micro-ledger: **making a claim** — email address · what to include · response expectation (`[NEEDS LEE — Q36–37: claim process and any publicly-committed response time; no number until he gives one]`) + the three-sentence warranty summary with its link → no Threshold (selling to an owner who already bought is off-register, same rule as `/warranty/`); a text link to `/contact/` closes the page.
**Arc:** Orient → Compress → Prove → Compress (micro). A utility page wears its density honestly, same as FAQ.

Both pages use the standard `.section` grammar of §2.0 — no new tokens, no new archetypes. Front matter follows the existing pattern (`layout: base.njk`, title, description, canonical, breadcrumb, sitemap entries); Ted mirrors `warranty.njk`'s structure.

---
## 9. WP-2a — the mark phase, as a work package

Saul's §5 says "I'll produce `logo-wordmark.svg`" and that the favicon "needs the usual 2–3 direction exploration." That is design *production*, and the plan gave it no slot — WP-2 assumed the assets exist. They do not: `~/marvin/content/assets/logo.svg` is Inkscape output with embedded base64 PNG masks — a raster wearing SVG clothing — and every vector asset must be redrawn from `logo-original.pdf` in the same directory. This section is the work package.

**Slot:** WP-2a runs in parallel with WP-1 (it touches no code) and **must complete before the WP-2 rows it feeds merge**. It is design-department work (Saul executes, I review), not Ted work.

### 9.1 Deliverables, in order

| Step | Produces | Source | Gate before proceeding |
|---|---|---|---|
| 1 | **Wordmark** — `logo-wordmark.svg`, clean paths, `fill="currentColor"`, viewBox only, no fixed dimensions, `id="wordmark"` | Redrawn from `~/marvin/content/assets/logo-original.pdf` | My review against Saul's asset gates (his §5.1) |
| 2 | **Badge** — `logo-badge.svg`, clean paths, same gates | Same PDF | Same review. Needed for the footer seal (72px) regardless of the nav decision |
| 3 | **Monogram exploration** — 2–3 directions per Saul §5.3 (interlocking SS vs steam-curl element, single color `#c4a57b`), each shown at 16px | Derived from the redrawn badge, not the Inkscape file | **Lee picks one direction** — approval, not consultation |
| 4 | **Monogram + favicon set** — `logo-monogram.svg`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180px on `#0c0c0c` ground) | The chosen direction | My review at 16px render |
| 5 | Assets land in the repo (`src/assets/brand/` — new directory, passthrough-copied) with Saul's clear-space/misuse rules appended to the brand guidelines doc | — | — |

### 9.2 Lee's approvals — what, when

1. **Monogram direction pick** (after step 3). Blocks steps 4–5 and therefore the favicon and mobile-nav rows of WP-2.
2. **Badge out of the nav** (§6 escalation; the critic's Q10). **This sign-off gates the WP-2 nav change itself** — until Lee approves, the nav keeps the current badge and only the pill/shadow cleanup (§4.2 row 1's non-mark parts) ships. The wordmark-in-nav, badge-to-footer move is one atomic change, made only after his yes.
3. **Final asset acceptance** — a one-look review of the wordmark and badge redraws against the PDF original. Redrawing can drift; the original is the authority.

### 9.3 What each deliverable unblocks

- Step 1 → WP-2 nav wordmark row (22px desktop / 18px mobile, per Saul) — *jointly* gated on approval 2.
- Step 2 → WP-2 footer seal row (72px badge above the fine print).
- Step 4 → favicon replacement + mobile-nav monogram (≤768px, 20px).
- **Stopgap, explicit:** if the SVG redraws slip, the existing `logo-wordmark-white.png`/`-black.png` at 2x are the sanctioned interim for the nav (Saul §5.1) — but there is **no stopgap for the favicon**; it waits for the monogram. Nothing in WP-2a blocks WP-0 or WP-1.

### 9.4 Out of scope for WP-2a

The physical mark photograph (Saul's D9, §5.6) — that is shot-list work gated on Lee's shop time (§6 #3). The laser-cut footer motif question (fact-gathering Q48) is Lee's to answer; if a real cut file exists it enters a later package.

---

## Handoff summary

- **Beatrice:** type-scale tokens (`--text-*` — audit §2 noted per-component reinvention), nav at 0.85–0.9rem, two-voice system (serif display / sans body / tracked utility), contrast verification on the `#6b6762` faint token, Cormorant weights per template.
- **Saul:** photo taxonomy (establishing/atmosphere/detail), shot-list for the missing detail scale, drawing reproduction style, gallery grouping, grid specifics inside archetypes C/F; **WP-2a mark production per §9** (wordmark/badge/monogram redraws from `logo-original.pdf`, favicon exploration).
- **George:** thesis lines per page from Lee's verbatim material, Aldergrove/Square/booking copy corrections, FAQ restructure, 404 line, index captions; **case-study `story` paragraphs (§7.2) and copy for §3.15/§3.16** — the `[NEEDS LEE]` markers in §7–8 are his fact-gathering inputs, never his to invent.
- **Wim:** journey logic between pages, Threshold CTA intent per page (quote vs session vs conversation), configurator flow UX, booking-pause messaging experience; his J4/J5 decisions are adopted in §8 as written.
- **Ted (via relay):** everything in §2.0, §4.1–4.3, §5, §7, §8 is written to be implemented directly; §3 defines target template structure per page. §9 is design-department work — Ted only lands the finished assets.
