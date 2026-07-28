# SSC Brand Guidelines Audit — Guidelines vs. Site Implementation

**Jen, Creative Direction — 2026-07-28**
Sources: `content/reference/operations/ssc-brand-guidelines.md` (guidelines), `/home/leesalo/Projects/ssc-website/styles.css` (design system of record), `src/_data/site.json`, and the 2026-07-27 UX audit (`website-audit-ux.md`).

---

## Part 1: Drift Analysis

Verdict format: **SITE** = update guidelines to match site. **GUIDELINE** = guidelines are stronger; site should eventually conform (noted, not restated here — the UX audit already carries those items). **BOTH** = merge.

### 1.1 Heading serif — Playfair Display vs. Cormorant Garamond — **SITE** (decided)

Guidelines: `Headings: Playfair Display`, with an "Upgrade Path" section recommending Cormorant Garamond as a future move. Site: `--font-heading: 'Cormorant Garamond', Georgia, serif` (styles.css:49). The site already executed the guideline's own recommendation. Cormorant is lighter, more architectural, less commoditized. **Fix:** Cormorant Garamond becomes the canonical serif; delete the entire "Upgrade Path" section (it's a completed migration masquerading as guidance). Keep the premium-license note (Hatton/Canela) as a one-line aspiration only.

### 1.2 Color tokens — incomplete inventory — **SITE**

Guidelines list 10 color tokens. The site's `:root` defines ~27: the 10 core plus 7 semantic text tokens (`--color-text-muted #888`, `--color-text-subtle #aaa`, `--color-text-dim #666`, `--color-text-faint #999`, `--color-text-feature #ccc`, plus `--color-black`/`--color-white`) and 12 alpha variants (warm-wood at 4/5/10/25/30%, white at 3/5/8/10%, black at 30/80/95%). The alpha ramp is genuinely good practice — tokenized transparency instead of ad-hoc rgba — and the guidelines don't know it exists. **Fix:** document the full token inventory, including alphas. **Carry two caveats from the UX audit into the guidelines as known debt:** (a) `--color-charcoal` is `#c0c0c0` — the name lies; (b) `#666` fails AA on `#0c0c0c` for small text. The guidelines should name the three-grey target (subtle/muted/dim) rather than bless five.

### 1.3 Descriptions of token usage — guidelines wrong — **SITE**

Guidelines table says `--color-charcoal #c0c0c0` = "Secondary/muted text" (true) but the naming problem is unremarked, and the guidelines omit that the site treats `--color-soft-grey #2a2a2a` primarily as a *border* color on cards (`border: 1px solid var(--color-soft-grey)`), not a background. **Fix:** describe tokens by actual role.

### 1.4 Radius rule — internal contradiction — **BOTH**, resolve in favor of the site's practice

Guidelines say two things at once: tokens `4/6/20px`, and "Premium brands go pill (100px) or sharp (0px) — no middle ground." The site uses middle ground everywhere: cards are square (0), buttons `--radius-md 6px`, badges/chips pill (`--radius-lg 20px`, 999px logo pill), plus untokenized 8px and 12px on newer components. The actual working language is: **structural surfaces sharp, interactive elements slightly softened, chips/badges pill.** That's coherent and more honest than the aphorism. **Fix:** replace the "no middle ground" rule with the three-tier rule; flag 8px/12px one-offs as debt to fold into tokens (per UX audit P2).

### 1.5 Grain texture — implemented, guidelines treat as advice — **SITE**

Guidelines: "subtle noise/grain overlay at 2-4% opacity... via CSS SVG filters" listed under "what works" and again as elevation opportunity #6. Site: shipped — `body::after` fractal-noise SVG at `opacity: 0.03` with `mix-blend-mode: overlay`, disabled under 768px and in print (styles.css:135–147, 2462, 2857). **Fix:** document as the standard, including the mobile/print opt-outs (a good performance decision the guidelines should preserve).

### 1.6 Typography metrics — site is more precise — **SITE**

Guidelines: "40-56px desktop headings, fluid via clamp() where possible." Site: exact fluid scale — h1 `clamp(2.5rem, 5vw, 4rem)`, h2 `clamp(2rem, 4vw, 3rem)`, h3 `clamp(1.5rem, 3vw, 2rem)`; headings 400/1.3, `-0.01em` (`-0.02em` at h1); body 300, line-height 1.8; `p { max-width: 65ch }`. The 65ch prose cap is a stronger rule than the guidelines' "600-700px text blocks" (character-based beats pixel-based). **Fix:** publish the actual scale; state measure in `ch`. Carry the UX-audit caveat that 1.8 line-height leaks into dense UI (target 1.5–1.7 in cards/lists).

### 1.7 Layout containers — **SITE**

Guidelines: "~700px prose, ~1200px marketing, ~1400px dashboards." Site: `.container` 1200px, `.wide-container` 1400px, prose 65ch/`content-wrapper--narrow` 700px, and — undocumented — `body { max-width: 1920px; margin: 0 auto }` for ultra-wide screens. That 1920px frame is a real decision the guidelines should record. **Fix:** document the four-tier container system.

### 1.8 Navigation — split verdict

Guidelines: "sticky nav that reappears on upward scroll," 4-6 uppercase items, generous letter-spacing. Site: permanently fixed nav with `rgba(0,0,0,0.8)` + `backdrop-filter: blur(10px)`. The frosted-glass fixed bar is the stronger, simpler pattern — **SITE** on mechanism. But the site's 115px pill-badge logo and 1.1rem uppercase links are the guideline's restraint principle violated — **GUIDELINE** on scale (UX audit P1 #8, P2 #15: logo ~48px naked, links 0.85–0.9rem). **Fix:** guidelines specify: fixed frosted bar, logo ≤48px without backing shape, nav links 0.85–0.9rem uppercase at 0.06em.

### 1.9 Motion — **GUIDELINE**, with site additions worth keeping

Guidelines: motion communicates state change, 200-500ms, nothing attention-grabbing, respect reduced-motion. Site: six concurrent systems including a scroll-lock hero intro, infinite 20s `slowZoom`, and four parallax variants — the UX audit's P0 finding. The guidelines were right; the site drifted the wrong way here. What the site *did* add that deserves canonization: the `--stagger-index` custom-property stagger pattern (clean, tokenizable), IntersectionObserver reveals firing once, and the global reduced-motion kill switch (styles.css:2862). **Fix:** keep the guideline's restraint rules, add the stagger/reveal patterns as the sanctioned vocabulary, and add an explicit prohibition: no scroll hijacking, no infinite ambient animation, JS-driven motion must check `prefers-reduced-motion` (CSS kill switch alone doesn't stop inline-style writers).

### 1.10 Component patterns — guidelines thin, site rich — **SITE**

The site has a real component grammar the guidelines never mention: unified card hover (lift −5/−8px + image scale 1.05 + `brightness(1.08) saturate(1.15)` + warm-tinted gradient scrim `rgba(140,100,50,0.25)`), `link--accent` underline-grow, warm-glow radial section backdrops, `section--fade-edges`, themed `::selection`, skip-to-content link, global `:focus-visible` in accent, iOS input-zoom guard. **Fix:** document the hover grammar, link treatments, and accessibility floor as standards. Also record the *two-generation* problem (square Gen-A vs. frosted 12px Gen-B) and declare Gen-A sharp + frosted-fold-in as the target (UX audit P2 #10).

### 1.11 Buttons — minor drift — **SITE**

Guidelines: "warm-wood background, dark text, rounded corners." Site: exact spec — `--radius-md 6px`, `translateY(-2px)` hover with warm-wood-alpha shadow, outline variant in off-white (not warm-wood border as guidelines say). The off-white outline is the shipped, better-tested choice on photography backgrounds. **Fix:** secondary = off-white ghost.

### 1.12 Stale content in the guidelines — remove

- "Upgrade Path" typography section (completed — see 1.1).
- "Expansion Palette (for future consideration)" — three years of "future"; either adopt `#9a9590` warm secondary grey as the stated replacement target for `#c0c0c0` (the UX audit endorses this) and drop the other two, or cut the section. I've folded `#9a9590` in as a migration target.
- Elevation-opportunities table items already shipped (#5 Cormorant, #6 grain) need pruning.
- The document is ~620 lines and roughly half is *build/architecture* content (compression-and-release, laser techniques, facility design, quick-win tables). That's valuable but it's a *product design language* document interleaved with a *visual identity* document — one reason the web section went stale unnoticed. Recommendation to Lee: split later; for now I've kept the structure but tightened, since the task is guideline accuracy, not reorganization.

### 1.13 What the guidelines get right that the site should keep hearing

One CTA per viewport; 2-3 active colors per page; photography ≥60% of above-fold; restraint test ("information or atmosphere?"); the 40/60 rule; craft language table; sage-green print system. None of these drifted. Preserved verbatim in spirit.

---

## Part 2: Updated Brand Guidelines (replacement document)

The full replacement follows. Drop-in for `content/reference/operations/ssc-brand-guidelines.md`.

---

# SSC Brand Guidelines

The source of truth for Secret Sauna Company's visual identity, design philosophy, and quality standards. This document governs all customer-facing output: website, PDFs, quotes, proposals, emails, signage, and the physical builds themselves.

The web design system of record is `/home/leesalo/Projects/ssc-website/styles.css`. Where this document and shipped tokens disagree, investigate before assuming either is right — then update whichever is wrong.

---

## Brand Identity

**Company:** Secret Sauna Company
**Positioning:** Premium custom sauna builder in Sea-to-Sky corridor. Craft-focused, small-batch, detail-obsessed. One of the only builders with in-house laser cutting capability.
**Tone:** Confident but not flashy. Let the work speak. Premium without pretension.
**Tagline ethos:** "Built, not manufactured." (Not a public tagline -- a positioning compass.)

**Logo assets:** `content/assets/`
- `logo.png` -- primary badge mark
- `logo-wordmark-white.png` -- wordmark on dark backgrounds
- `logo-wordmark-black.png` -- wordmark on light backgrounds
- `logo-wordmark-black-sm.png` -- small wordmark variant (400px, 13KB; use for PDFs)
- `logo-original.pdf` -- source vector

**Logo usage on web:** the mark sits naked in the navigation bar at a maximum height of 48px. No backing pill, no drop shadow, no decorative container. A logo that needs a stage is asking for attention the work should earn.

---

## Brand Philosophy: The Modern-Rustic Duality

SSC saunas have a cabin-like wooden exterior and a clean modern interior. The brand mirrors this duality in every medium. The sauna is the metaphor: natural materials, precision-engineered.

**The 40/60 Rule:**
Approximately 40% rustic/natural elements and 60% modern/minimal elements. Invert that ratio and you get a log cabin gift shop. The dark minimal UI is the 60% modern. The warm-wood accent, natural photography, and serif typography are the 40% rustic.

| Layer | Modern (60%) | Rustic (40%) |
|-------|-------------|-------------|
| UI / Layout | Clean grids, generous whitespace, precise spacing | -- |
| Typography | Sans-serif body (Outfit), light weights | Serif headings (Cormorant Garamond) |
| Color | Dark backgrounds, neutral surfaces | Warm-wood accent (`#c4a57b`) |
| Photography | -- | Cedar grain, charred exteriors, steam, natural light |
| Motion | Smooth ease transitions, deliberate timing | -- |
| Copy | Precise, confident, understated | Craft language: "built," "joined," "selected" |
| Product exterior | -- | Charred cedar, rough texture, shou sugi ban |
| Product interior | Clean joinery, precise bench geometry, integrated lighting | -- |

**The resolution:** Intentional imperfection within a precise frame. Live-edge slabs connected with butterfly joints. Rough cedar exterior behind tempered glass. The imperfection is chosen, not accidental. The frame (the UI, the layout, the typography system) is modern and precise; the content within it (the photography, the materials, the warmth) is natural and handmade.

**The restraint principle:** The single most reliable signal of premium positioning is restraint. Show less. Say less. Let materials and photography do the work. Every design element must pass: "Is this adding information, or just adding atmosphere?" If it's just atmosphere, cut it. The saunas are the atmosphere.

This test applies with special force to motion and to the brand's own mark. The site does not perform premium; it is premium.

---

## Design Philosophy: Architecture & Space

Derived from research across the world's most architecturally significant sauna and wellness facilities (Therme Vals, Loyly Helsinki, Kulttuurisauna, Trosten Oslo, and others documented in `content/reference/design/sauna-architecture-new-wave.md`), combined with analysis of 35 high-impact design techniques (`content/reference/design/architectural-effects-guide.md`).

### Core Architectural Principles

**1. Material Honesty**
Use real materials. Never simulate. Real cedar, real stone, real blackened steel. If you can't afford the material, use less of it -- don't substitute a facsimile. Applies equally to builds (no vinyl "wood" panels) and digital design (no tiling wood-grain backgrounds). One species of wood used consistently throughout a build. Cedar is SSC's primary material. Zumthor built all of Therme Vals from a single quartzite. Material repetition signals confidence.

**2. Compression and Release**
Narrow, enclosed spaces followed by expansive, open ones. In SSC builds: narrow entry opening into the expansive hot room. In brand design: dense content areas (data tables, spec sheets) punctuated by generous breathing space (the 8rem section padding, full-bleed photography).

**3. Light as Material**
Light placement defines mood more than any surface treatment. SSC's lighting vocabulary:
- **Cove lighting** (LED strips hidden in reveals): value score 5.0 -- highest-impact, lowest-effort. $150-650
- **Under-bench glow**: floating bench effect. Value 4.0. $100-400
- **Warm color temperature** (2200-2700K): mandatory. No cool-white LEDs in any SSC build. $50-150
- **Dimmable zones**: sauna dimmest, changing area brightest. Value 2.0. $200-500
- **One dramatic window or skylight per hot room**, not multiple small windows

**4. Shadow as Texture**
Shadow gaps (reveal joints, 10-15mm, $50-200), perforated shadow screens (laser-cut, backlit, $300-1,500 -- SSC's laser advantage), negative detail joints ($50-150).

**5. The Entry Sequence**
The approach matters as much as the sauna. Even a trailer-mounted unit benefits from a considered path: gravel underfoot, a bench for shoes, a transition moment before the door.

**6. The Three-Room Finnish Cycle**
Heat -- cold -- rest. Every SSC installation supports this cycle, even in its simplest form.

**7. Thermal Sensation as Spatial Experience**
Temperature change should correspond with a material change, a light change, or a spatial change.

### Quick-Win Techniques for SSC Builds

Ranked by value score (impact/complexity). Full details: `content/reference/design/architectural-effects-guide.md`.

| # | Technique | Value | Cost | Notes |
|---|-----------|:---:|---|---|
| 1 | LED cove lighting | 5.0 | $150-650 | Best ROI in design. Hidden strips, warm white |
| 2 | Under-bench lighting | 4.0 | $100-400 | Floating bench effect |
| 3 | Wood species contrast | 4.0 | $200-800 | Dark thermowood against light cedar |
| 4 | Warm color temp (2200-2700K) | 4.0 | $50-150 | Mandatory standard |
| 5 | Thermowood panels | 4.0 | $4-15/LF | Dark tones without stain |
| 6 | Shadow gaps / reveals | 2.5 | $50-200 | Free design move at the joint level |
| 7 | Fluted / ribbed panels | 2.5 | $300-1,000 | Strong visual impact |
| 8 | Mixed grain orientation | 2.0 | $0 | Labor only |
| 9 | Slatted wood screens | 2.0 | $200-600 | Varying gaps for light modulation |
| 10 | Laser-cut perforated screens | 1.7 | $300-1,500 | SSC differentiator |

---

## Product Design Language

### The Exterior
- **Shou sugi ban (charred cedar)** is the SSC signature. Uncharred cedar acceptable by client preference; charred is the default recommendation
- Exposed structural elements clean and finished -- painted black steel, not raw galvanized
- Signage: laser-cut SSC badge in stainless or blackened steel. Small, confident, never promotional

### The Interior
- **Smooth, clean cedar** throughout, sanded to 220+ grit
- Bench design: tiered, minimum 24" depth, ergonomic backrests. The bench profile is a design signature
- Integrated lighting from the design phase: cove above bench level, under-bench glow, dimmable
- Hardware: black steel or brushed brass. No chrome. No plastic. Every visible piece looks chosen
- Glass: frameless where budget allows; otherwise slim-profile, black or dark bronze
- Vent covers, guard rails, light housings: laser-cut with SSC patterns where possible

### Laser Capability as Brand Differentiator

SSC owns an 18"x18" laser cutter no comparable BC builder possesses: custom vent covers, signage, perforated privacy/shadow screens, branded accessories, backlit panels, client monograms. Every SSC build includes at least one laser-cut touchpoint. Full guide: `content/reference/design/laser-cutting-architectural-applications.md`.

### Facility Design Language

For commercial installations (BAG, Nelson, Taylor): courtyard/enclosure principle; water as architectural element (visible, audible, or both from multiple points); seamless indoor-outdoor flow; material consistency across the threshold; heated pathways in cold climates.

---

## Color System

### Web Palette (Dark Mode Primary)

The site's `:root` in `styles.css` is the system of record. Core tokens:

| Token | Hex | Actual role |
|-------|-----|-------|
| `--color-muted-black` | `#0c0c0c` | Page background |
| `--color-bg-grey` | `#111111` | Alternate section background (`.bg-grey`) |
| `--color-bg-dark` | `#1a1a1a` | Elevated surfaces: cards, forms, panels |
| `--color-soft-grey` | `#2a2a2a` | Card borders, internal dividers |
| `--color-border-subtle` | `#3a3a3a` | Form borders, section rules |
| `--color-off-white` | `#e8e6e3` | Primary text |
| `--color-charcoal` | `#c0c0c0` | Secondary text (note: the name is wrong -- it is a light silver; migration target is a warm grey, see below) |
| `--color-warm-wood` | `#c4a57b` | The accent: CTAs, highlights, active states, prices, checkmarks |
| `--color-warm-wood-hover` | `#d4b58b` | Accent hover |
| `--color-warm-wood-dark` | `#a08060` | Accent pressed / gradient partner |

**Semantic text greys** (site tokens): `--color-text-subtle #aaa`, `--color-text-muted #888`, `--color-text-dim #666`, plus `#999`/`#ccc` variants. Target state is three honest steps -- subtle (#aaa), muted (#888), dim -- and `#666` must not carry text smaller than ~1rem on `#0c0c0c` (fails WCAG AA). New work uses the three; the five-token spread is legacy.

**Alpha ramps** (tokenized transparency -- use these, never ad-hoc rgba):
- Warm wood at 4/5/10/25/30% (`--color-warm-wood-alpha-*`): glows, tinted panels, accent borders, selection
- White at 3/5/8/10% (`--color-white-alpha-*`): hairline borders, hover fills on dark
- Black at 30/80/95% (`--color-black-alpha-*`): badges, nav glass, lightbox scrim

**Signature moves already in the system:**
- Themed selection: `::selection` in warm-wood-alpha-30
- Warm-tinted image scrims: hover overlays use `rgba(140,100,50,0.25)`, not neutral black -- even overlays stay in the temperature family
- Radial warm glows: `section--warm-glow` / `page-hero::before` at 4-5% warm-wood alpha

**Migration target (adopted, not yet shipped):** secondary text moves from cool `#c0c0c0` toward warm grey `#9a9590` so the neutral ramp shares the accent's temperature.

### Film Grain (standard)

Dark pages carry a full-viewport fractal-noise SVG overlay at `opacity: 0.03`, `mix-blend-mode: overlay` (see `body::after` in styles.css). This is the "earned texture" whisper. It is disabled below 768px and in print -- keep both opt-outs. Range 2-4% opacity; never more.

### Print / PDF Palette (Light Background)

PDFs use a light background with sage green accent. Warm wood reads muddy on white paper; sage green (`#5a7a6a`) provides clean contrast and connects to SSC's natural/architectural positioning.

| Role | Hex | Usage |
|------|-----|-------|
| Text primary | `#1a1a1a` | Headings |
| Text body | `#2d2d2d` | Body copy |
| Text secondary | `#444` | Subheadings |
| Text tertiary | `#aaa` | Footers, metadata, page numbers |
| Sage green (accent) | `#5a7a6a` | H1 underline, table headers, blockquote border, links |
| Sage green (light) | `#f6f8f7` | Blockquote backgrounds |
| Border light | `#e8e8e8` | Table row borders |
| Border medium | `#e0e0e0` | Section dividers, H2 underlines |
| Background subtle | `#fafafa` | Alternating table rows |

**Rule:** Sage green appears in at most 5 places per page. It is an accent, not a theme.

### Color Rules

- Dark mode is the default and primary presentation for web; light for print
- Warm wood is the web signature; sage green is the print signature. Never oversaturate either
- Never pure white (`#fff`) for running text on dark; use off-white (`#e8e6e3`). Pure white is reserved for hero text over photography and footer headings
- No bright/saturated colors outside the palette. Status colors muted
- 2-3 colors maximum in active use on any page
- New transparency values go through the alpha tokens

---

## Typography

### Web System

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| Body / UI | Outfit | -apple-system, BlinkMacSystemFont, sans-serif | 300 (400-500 for buttons, labels, emphasis) |
| Headings | Cormorant Garamond | Georgia, serif | 400, never bold |

Cormorant Garamond replaced Playfair Display (decided 2026-07; Playfair is retired -- do not reintroduce it). If a premium license is ever budgeted, Hatton or Canela are the studied candidates; until then Cormorant is canonical.

### The Scale (fluid, from styles.css)

| Element | Size | Tracking | Line height |
|---------|------|----------|-------------|
| H1 | `clamp(2.5rem, 5vw, 4rem)` | −0.02em | 1.3 |
| H2 | `clamp(2rem, 4vw, 3rem)` | −0.01em | 1.3 |
| H3 | `clamp(1.5rem, 3vw, 2rem)` | −0.01em | 1.3 |
| Body | 1rem | 0 | 1.8 (use 1.5-1.7 inside cards, spec lists, dense UI) |
| Uppercase labels / nav | 0.75-0.9rem | 0.05-0.15em | -- |

- **Measure is character-based:** `p { max-width: 65ch }` globally; up to 70-80ch for FAQ/long-form. Prefer `ch` caps over pixel caps
- Nav links: 0.85-0.9rem, uppercase, 0.06em tracking, weight 400. Uppercase and large is shouting; pick uppercase and small
- Numerals-as-heroes (stat numbers, prices) set in the serif at accent color
- Font loading: preconnect + single `display=swap` request, trimmed weights
- `-webkit-font-smoothing: antialiased` always
- Admin/internal tools may use system fonts

### Print / PDF System

| Role | Spec |
|------|------|
| All text | Helvetica Neue; Helvetica, Arial fallback |
| H1 | 24pt, weight 300, letter-spacing 1px |
| H2 | 14pt, weight 600 |
| H3 | 11pt, weight 600 |
| Body | 10.5pt, line-height 1.6 |
| Tables | 9.5pt body, 9pt headers |
| Footer | 7pt, #aaa, letter-spacing 0.5px |

The H1 is deliberately light (300) in both web and print. Confidence without shouting.

---

## Photography Direction

Photography is where SSC separates from kit sellers. A simple template with outstanding photography looks premium; the inverse never does.

### Three-Scale System
1. **Wide / Establishing** -- the sauna in its landscape. Full-bleed, cinematic
2. **Interior / Atmosphere** -- steam, warm light on cedar, glow through glass
3. **Detail / Material** -- macro cedar grain, char texture, joinery, hardware, bench profiles. The most underdeveloped category for most builders

### Process Photography
Show hands working. Charring cedar, fitting joints, selecting boards. The human hand in frame turns a product shot into a craft story. SSC's strongest differentiator.

### Contrast Pairs
Charred exterior next to smooth interior. Raw slab next to finished bench. Workshop next to quiet forest install. The before and after of the same piece of wood.

### Rules
- Natural light, controlled. Golden hour or large-window indirect. Never direct flash
- One focal point per image
- In situ, never studio. No CGI renders
- Consistent grading: warm shadows, slightly desaturated midtones, clean highlights, matte. Warm-but-not-orange
- Steam as visual device

### Anti-Patterns
Stock photography (never). Posed lifestyle shots. Competing subjects. Inconsistent color temperature. Product-on-white catalog shots.

### Delivery (web)
- Cloudinary with `q_auto,f_auto` always; width transforms on every placement
- Hero: `fetchpriority="high"`, width-capped (`w_1920`) with `srcset` for mobile
- Lightbox/zoom views load a full-resolution variant (`w_1600`+), never the grid thumbnail
- Explicit dimensions or `aspect-ratio` on every image to prevent layout shift

---

## Spacing and Layout

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 0.5rem | Tight gaps |
| `--spacing-sm` | 1rem | Standard element spacing |
| `--spacing-md` | 1.5rem | Card padding, form gaps |
| `--spacing-lg` | 2rem | Section spacing within a view |
| `--spacing-xl` | 3rem | Major section breaks |
| `--spacing-2xl` | 4rem | Page-level section padding (mobile section padding) |
| `--spacing-3xl` | 8rem | Desktop section padding, hero spacing |

Sections: `padding: var(--spacing-3xl) 5%` desktop, `--spacing-2xl` under 768px. The deliberate jump from 4rem to 8rem is the compression-and-release principle in the token scale -- don't fill the gap with intermediate values.

### Container System (four tiers)

| Container | Max width | Use |
|-----------|-----------|-----|
| Prose | 65ch (700px wrapper) | Body copy, FAQ, blog content |
| `.container` | 1200px | Standard sections, footer content |
| `.wide-container` | 1400px | Galleries, model grids, comparison tables |
| `body` | 1920px, centered | The whole page; nav matches. Ultra-wide screens get a framed page, not an infinite smear |

### Layout Rhythm

The breathing pattern: **WIDE (image) - NARROW (text) - WIDE (image)**.

- Full-bleed sections for hero images, project photography, visual breaks
- Text floats in space; images fill it
- Asymmetric text-image pairings (40/60 or 60/40), swapping sides as you scroll
- Spacing lives on sections and layout classes, not spacer divs

### Rules
- Generous whitespace is non-negotiable. When in doubt, add more space
- Mobile-first responsive; breakpoints at 400 / 600 / 768 / 860 / 900 / 1100 / 1200px, with 860px as the nav collapse point -- align logo scaling and hamburger to the same breakpoint
- Fluid values (`clamp()`) for gutters and padding that must survive mid-width viewports; no hardcoded rem gutters on the nav
- One CTA per viewport. Never stack competing calls to action

---

## Surfaces, Elevation, and Shape

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.1)` |
| `--shadow-md` | `0 8px 16px rgba(0,0,0,0.2)` |
| `--shadow-lg` | `0 15px 30px rgba(0,0,0,0.3)` |
| `--shadow-xl` | `0 20px 40px rgba(0,0,0,0.4)` |

Accent shadows for accent elements: button hover casts `0 8px 30px` in warm-wood-alpha-25, not neutral black.

### Shape Language (three tiers)

| Tier | Radius | Applies to |
|------|--------|-----------|
| Structural | 0 (or `--radius-sm` 4px on media) | Cards, panels, sections, modals, tables, images |
| Interactive | `--radius-md` 6px | Buttons, inputs, filter buttons |
| Chips / badges | `--radius-lg` 20px (pill) | Tags, comparison badges, starter chips |

Sharp structural surfaces are the architectural register -- "precision-engineered." Softened interactives acknowledge the hand. Pills are for small floating objects only. Untokenized 8px/12px radii on newer components are debt; fold them into the three tiers.

**Frosted glass** (`rgba(15,15,15,0.75)` + `backdrop-filter: blur(4px)`) is an approved surface treatment for floating/overlay elements (nav, forms over photography) -- but it takes the structural shape tier (square corners), not its own rounded language. One shape language per page.

### Texture

Earned texture (photography of real materials) over applied texture, always.
- The 3% film grain overlay (see Color System) is the only sanctioned applied texture
- Color implies material: `#c4a57b` reads as warm wood without showing grain
- Never: tiling wood-grain backgrounds, skeuomorphism, texture competing with photography

---

## Motion

### Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 0.3s ease | Hover states, toggles |
| `--transition-medium` | 0.5s ease | Panel reveals, tab switches |
| `--transition-slow` | 0.8s ease-out | Page fade-in, scroll reveals |

### The Sanctioned Vocabulary

Exactly two motion systems per page, plus hover:

1. **One load-in.** Page fades in (0.8s). Hero text and nav may fade/rise once on load. No gestures owed, nothing withheld from the visitor
2. **Scroll reveals.** IntersectionObserver-driven fade/slide (20-60px travel, `--transition-slow`), firing once, with grid children staggered via the `--stagger-index` custom property (0.1s per index). This is the house pattern -- reuse it, don't invent parallel systems
3. **Hover grammar** (consistent across all cards): lift `translateY(-3 to -8px)` + shadow step up; images inside scale 1.05 with `brightness(1.08) saturate(1.15)` and warm-tinted gradient scrim; links underline-grow from left; buttons lift −2px with accent glow shadow

### Prohibitions

- **No scroll hijacking.** Never lock, intercept, or ration the visitor's scroll. The first gesture always works
- **No infinite ambient animation** (perpetual zooms, loops). Motion communicates state change; if nothing changed, nothing moves
- **Parallax is off the menu** unless it writes `transform: translate3d` on an element with no CSS transition on transform and is gated behind reduced-motion. Default answer: don't
- Nothing bouncy, spinning, or attention-grabbing. 200-800ms, ease families only
- State toggles (FAQ, mobile menu) animate open/close -- everything eases or nothing does

### Reduced Motion

Two layers, both required: the global CSS kill switch (`prefers-reduced-motion` zeroing durations), **and** every JS writer of inline styles checks the same media query before writing. CSS kill switches do not stop JavaScript.

---

## Component Patterns

### Hero
- Full-viewport (100vh desktop / 80vh mobile) photography or ambient video (muted, playsinline, compressed)
- Minimal overlay: headline, subtitle, one primary CTA (optional quiet secondary in a flex `cta__buttons` row)
- The hero says "experience this" before "buy this"

### Navigation
- Fixed frosted bar: `rgba(0,0,0,0.8)` + 10px backdrop blur, 1px `white-alpha-10` bottom border
- 4-6 single-word items, uppercase, 0.85-0.9rem, 0.06em tracking
- Logo ≤48px, no backing shape
- No dropdowns by default; hamburger below 860px with `aria-expanded`/`aria-controls` and an animated open

### Buttons
- Primary: warm-wood fill, black text, `--radius-md`, weight 500, 0.05em tracking
- Secondary: transparent ghost, 2px off-white border, off-white text; inverts to off-white fill on hover
- Hover: lighten + `translateY(-2px)` + warm-alpha shadow
- Destructive: muted red, never alarming
- One shape language per page

### Cards
- `--color-bg-dark` surface, 1px `--color-soft-grey` border, square corners
- Hover: lift + border warms to accent + shadow step; interior image scales 1.05
- Hierarchy: serif title (accent for model names), meta, body in secondary grey
- Cards that open something are keyboard-reachable: real buttons or `role="button"` + `tabindex="0"` + keydown

### Forms
- Dark surface, 1px subtle border, off-white text; labels above inputs
- Focus: warm-wood border; global `:focus-visible` outline in accent, 2px offset
- Inputs ≥16px font size on mobile (iOS zoom guard)
- Over photography: frosted-glass container, square corners

### Modals & Lightboxes
- `role="dialog"`, `aria-modal="true"`, focus moved in on open and restored on close, focus trapped, Escape closes
- Lightbox loads full-resolution image variants, arrow-key and swipe navigation, counter

### Tables / Data
- Header row visually distinct (serif, larger); highlight column in warm-wood-alpha-04 with accent header
- Sticky first column on horizontally scrolling comparison tables; wrap in an `overflow-x: auto` scroller
- Generous row padding; right-align numbers, left-align text
- Print tables: sage header row, zebra `#fafafa`, hairline `#e8e8e8`

### Testimonials
- Real attribution with texture: first name + area or project type ("S4 owner, Brackendale"). Three identical anonymous labels read as fabricated. Two credible beats three generic

### States
- Empty states never look broken: brief message + how to populate, muted, centered
- Skeletons over spinners; inline text for brief operations
- Every interactive component ships loading, empty, error, and success states

### Accessibility Floor (every page)
- Skip-to-content link
- Global accent `:focus-visible`
- Text contrast ≥4.5:1 (no `#666` small text on the dark background)
- Keyboard access to everything the mouse can do
- Reduced motion honored in CSS and JS
- 44x44px minimum touch targets

---

## Content and Copy

### Voice
- Concise, confident, understated
- No exclamation marks. No superlatives ("best," "amazing," "revolutionary")
- Let specifics sell: materials, dimensions, craftsmanship details
- Headlines that could be taglines; body copy that reads like editorial
- Lead with the work. Comparison and takedown content is supporting evidence, placed after the product -- never the opening argument

### Craft Language

| Use | Instead of |
|-----|-----------|
| Built | Manufactured |
| Selected | Sourced |
| Joined | Assembled |
| Designed | Configured |
| Finished | Processed |
| Crafted | Made |
| Fitted | Installed |

### Project Narratives
Each build presentable as a mini case study: **Context** (where and why) -- **Design intent** (why this wood, this layout, this stove) -- **Process** (how it was built) -- **Outcome** (the finished space). Short paragraphs; never more than 2-3 sentences between images.

### Formatting
- Semicolons instead of em dashes in emails; sign off "Cheers"
- Numbers: commas for thousands ($2,485); spell out one through nine in prose
- Dates: Feb 13, 2026. Phone: 604-245-1008

---

## Quality Checklist (Brand Critic)

### Digital
1. **Palette compliance** -- all colors from tokens? Accent restrained (2-3 active colors)? Warm temperature consistent, including overlays and scrims?
2. **Typography** -- Cormorant/Outfit? Weights 300-400 body, 400 headings? Fluid scale? 65ch measure? Uppercase small, not large?
3. **Spacing** -- 8rem section rhythm? Container tiers respected? No spacer divs?
4. **Dark mode execution** -- off-white not pure white? Contrast ≥4.5:1 on all text sizes?
5. **Shape language** -- three-tier radius rule? One language per page? No untokenized radii?
6. **Motion restraint** -- two systems + hover only? No scroll hijacking, no infinite loops? Reduced motion honored in CSS *and* JS?
7. **Component consistency** -- house hover grammar? Single design generation per viewport?
8. **Mobile** -- breakpoints aligned? Touch targets 44px? iOS input guard? Grain off?
9. **State completeness** -- loading, empty, error, success?
10. **Accessibility floor** -- skip link, focus-visible, keyboard access, dialogs done properly?
11. **Image delivery** -- width transforms + srcset? Full-res lightbox sources? No CLS?
12. **Copy and tone** -- craft language? No exclamation marks? Work leads, comparison follows?
13. **Photography standard** -- three scales? Natural light? One focus? In situ? Consistent grade?
14. **Restraint principle** -- would a $100k client feel confident? Information, not atmosphere? 40/60 holding?

### Print (PDFs, Proposals, Contracts)
15. **PDF palette** -- sage green (#5a7a6a), not warm wood? Max 5 accent instances per page?
16. **PDF typography** -- Helvetica Neue, H1 at 300, body 10.5pt?
17. **PDF layout** -- Letter, margins 1.1"/1"/1.2"/1", logo first page, footer with address + page number?
18. **Structure** -- H1 title only, tables under 5 columns, breathing room?

### Physical (Builds)
19. **Material honesty** -- real materials, consistent species?
20. **Lighting** -- cove + under-bench, 2200-2700K, dimmable?
21. **Entry sequence** -- considered approach, transition moments?
22. **Laser touchpoint** -- at least one per build?
23. **Hardware** -- black steel or brass; no chrome, no plastic?
24. **Exterior** -- shou sugi ban or clean cedar; steel finished; signage minimal?

---

## Contexts

### Website (customer-facing)
- Full treatment: Outfit + Cormorant Garamond, warm-wood accent, dark mode, film grain
- Photography ≥60% of above-fold real estate
- No pop-ups, no chat widgets, no aggressive CTAs, no scroll tricks. Restraint communicates confidence

### PDFs and Print
- Accent sage green (#5a7a6a); Helvetica Neue; Letter, margins 1.1" top / 1" sides / 1.2" bottom
- Header: `logo-wordmark-black-sm.png` top of first page
- Footer: "4-38918 Progress Way, Squamish, B.C. V8B0K7 | secretsaunacompany.ca" centered; page number right; 7pt #aaa
- Tables: sage header (white text), zebra #fafafa, hairlines #e8e8e8. Blockquotes: 3px sage border, #f6f8f7 fill. Links sage, no underline
- Stylesheet: `skills/pdf/style.css`. Full reference: `content/reference/operations/ssc-pdf-style-guide.md`

### Admin / Internal Tools
- System fonts acceptable; warm-wood accent; dark mode default; generous spacing. A well-made tool, not a prototype

### Emails
- HTML, Arial: `font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6`
- `<p>`, `<ul>/<li>`, `<strong>`. Semicolons not em dashes. Thread replies. Sign off "Cheers"

### Signage and Physical Brand
- Laser-cut badge or wordmark in stainless or blackened steel. Small, confident, never promotional. The sauna itself is the brand statement

---

## Competitive Reference

Research Feb 2026 across luxury manufacturers (Tylo, Harvia, KLAFS, Thermory), boutique builders (Cedar & Stone, Voyageur, BW Sauna Co, Stoke, Finnish Sauna Design, Nordic Sauna), and architectural exemplars (Olson Kundig, Aman, Snohetta, Nakashima, Frama, Filson). Plus 14 wellness facilities worldwide (`content/reference/design/sauna-architecture-new-wave.md`).

### Where SSC Leads
- Palette: dark + warm-wood accent is the gold standard
- Token system: full color/alpha/spacing/motion tokens in CSS custom properties
- Dark mode commitment; laser capability; material knowledge (shou sugi ban, thermowood, cedar species)

### Elevation Opportunities (pruned to what's open)

| Priority | Opportunity | Impact | Effort |
|----------|------------|--------|--------|
| 1 | Three-scale photography (add detail shots) | Highest | Photography shoot |
| 2 | Process photography (hands working) | Highest | Photography shoot |
| 3 | Project case studies per build | High | Content restructure |
| 4 | Motion diet per this document (remove scroll-lock, parallax, slowZoom) | High | JS/CSS removal |
| 5 | Hero video (looping atmospheric, muted) | Medium | Video production |
| 6 | Warm secondary grey migration (#9a9590) | Low | CSS change |
| 7 | Light section palette (#f5f0eb warm linen) for occasional temperature contrast | Low | CSS addition |

(Shipped and removed from this list: Cormorant Garamond, film grain, scroll reveals.)

### Key Competitors

| Company | What They Do Well | SSC Advantage |
|---------|------------------|---------------|
| Cedar & Stone | Best web in the custom tier | Finnish heritage, commercial scale, laser |
| BW Sauna Co | "Showing the work" | Design range, architectural ambition |
| Voyageur Saunas | Dark/moody aesthetic, near-identical palette | Sea-to-Sky presence, facility scale |
| KLAFS | Premium restraint | Bespoke craft vs. manufactured product |

### The Nakashima Parallel
George Nakashima Woodworkers: stark UI, zero applied texture, photography carries 100% of material warmth. The lesson: the more real craft you have to show, the less your UI needs to simulate it.

---

## Research Sources

- `content/reference/design/architectural-effects-guide.md` -- 35 techniques ranked
- `content/reference/design/sauna-architecture-new-wave.md` -- 14 facility profiles
- `content/reference/design/laser-cutting-architectural-applications.md`
- `content/reference/industry/ssc-industry-research.md`; `content/reference/industry/competitor-comparison.md`
- `skills/pdf/style.css`; `content/reference/operations/ssc-pdf-style-guide.md`
- SSC website: `/home/leesalo/Projects/ssc-website` (`styles.css` is the web design system of record)
- Site UX audit 2026-07-27 (Jen) -- drift findings and remediation backlog
- External: Tylo, Harvia, KLAFS, Thermory, Loyly Helsinki; Cedar & Stone, Voyageur, BW Sauna Co, Stoke; Olson Kundig, Aman, Snohetta, Nakashima, Frama, Filson, Aesop; Awwwards, ArchDaily, Dezeen
