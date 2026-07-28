# SSC Website — UX/UI/Visual Design Audit
**Jen, Creative Direction — 2026-07-27**
Scope: `/home/leesalo/Projects/ssc-website/` — all `src/` templates, `styles.css` (2,871 lines), all `js/` modules. Evaluated against `content/reference/operations/ssc-brand-guidelines.md` (40/60 modern-rustic duality, restraint principle, dark-mode palette).

---

## Verdict up front

This is not a contractor's website. The bones are genuinely good: a real token system, a coherent dark palette, serif/sans duality, film-grain texture, disciplined 8rem section rhythm. It sits maybe 75% of the way to "premium custom builder." What's holding back the last 25% is the **motion layer** — one actively hostile pattern (the homepage scroll-lock), one genuine jank bug (parallax fighting CSS transitions), and a visible seam between two design generations (sharp-cornered 2025 components vs. rounded 2026 components). Plus a handful of small credibility leaks (blurry lightbox, triplicate anonymous testimonials, oversized logo).

---

## 1. Visual hierarchy

**Good:** Home page flows correctly — hero, offerings, craft story, tradition, process, proof, CTA. Single accent color means the eye lands where warm-wood appears. `p { max-width: 65ch }` (styles.css:197) enforces measure globally. Smart.

**Findings:**

- **[HIGH] The logo is the loudest element on every page.** `.logo img { height: 115px; width: 115px }` with its own pill background, padding, and drop shadow (styles.css:279–289). A 115px circular badge floating in a blur-glass nav competes with the hero photography on every page load. Premium nav logos run 32–48px. The pill background (`rgba(0,0,0,0.35)` + `box-shadow: 0 6px 18px`) is atmosphere, not information — the restraint principle in the brand doc says cut it. Recommend: 48px, no pill, no shadow; let the mark sit naked in the glass bar.
- **[MED] Saunas page leads with attack, not craft.** `src/_includes/pages/saunas.njk:110–163` — first content section is the three-column takedown of barrel and infrared saunas, then research stats, and the actual product grid arrives third, ~2.5 viewports down. A premium builder leads with the work ("let the work speak" — brand doc), and uses comparison as *supporting* evidence later. Reorder: models → gallery → comparison → science.
- **[LOW] Hero CTA pairing** (`home.njk:9–10`): primary + secondary buttons are inline-block siblings with `.btn--hero-secondary { margin-top: var(--spacing-sm) }` (styles.css:710–713) — they wrap unpredictably at mid widths and misalign vertically when side by side. Wrap them in a flex container like `.cta__buttons` (already exists, styles.css:1939).

## 2. Typography

**Good:** Cormorant Garamond (headings, 400) / Outfit (body, 300) is a defensible 40/60 pairing. Fluid `clamp()` scale on h1–h3 (styles.css:181–193). Negative tracking on display sizes. Font loading is correct: preconnect + single `display=swap` request, weights trimmed (head.njk:290–298).

**Findings:**

- **[HIGH] Brand-guideline drift: the guidelines specify Playfair Display for serif headings; the site ships Cormorant Garamond** (`--font-heading`, styles.css:49). One of the two documents is wrong. Cormorant is the better choice for this brand (lighter, more architectural; Playfair is heavier and trending toward overused), so my recommendation is to amend the guidelines to match the site — but the drift needs a decision, not silence.
- **[MED] Nav type is set louder than anything Apple would ship:** `.nav-links a { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em }` (styles.css:298–307). Uppercase + 1.1rem + wide tracking makes five nav items shout. Premium register: `0.85–0.9rem`, keep the tracking, drop weight to 400 or keep uppercase but shrink — not both large *and* uppercase.
- **[LOW] `body { line-height: 1.8 }`** (styles.css:101) is generous — fine for long copy, but it leaks into cards, specs, and buttons, making dense UI (model-specs, comparison lists) feel loose. Consider 1.7 body, 1.5 on `.model-card p`/`.comparison-list li`.
- **[LOW] Ad-hoc sizes exist but are contained** — `.model-header h3` 1.8rem, `.compare-table thead th` 1.4rem, `.blog-card__title` 1.5rem. No type-scale tokens (`--text-sm/md/lg`), so sizes are re-invented per component. Works today; will drift.

## 3. Color system

**Good:** True dark mode, not grey-washed — `#0c0c0c` page, `#1a1a1a` elevated, `#111` alternate, tokenized alphas. Single warm-wood accent `#c4a57b` with hover/pressed variants, matching the brand doc exactly. `::selection` themed (styles.css:159). Warm-tinted hover scrims on gallery (`rgba(140,100,50,0.25)`, styles.css:779) keep even overlays in the temperature family. This is real dark-mode execution.

**Findings:**

- **[MED] Eight overlapping greys, two with lying names.** Tokens: `#c0c0c0` is named `--color-charcoal` (it's light silver), `--color-soft-grey` is `#2a2a2a` (near-black). Then `#888, #aaa, #666, #999, #ccc` as "semantic" text tokens (styles.css:23–27). Consequence: contributors guess, and the greys are cool-neutral while the accent is warm — the brand doc's own expansion palette (`#9a9590` warm grey) already names this problem. Collapse to 3 text greys, rename honestly.
- **[MED] Contrast failures:** `--color-text-dim: #666` on `#0c0c0c` ≈ 3.9:1 — fails WCAG AA for the small text it's used on: `.stat-source` (0.8rem, styles.css:666), `.comparison-list .x` (styles.css:639). `#888` at 0.85rem sizes is borderline (~5.0:1, passes but barely at `.advisor__disclaimer` 0.7rem). Raise `#666` → `#8a8a8a` minimum where it carries text.
- **[BUG] Undefined token:** `.advisor__starter:hover { color: var(--color-bg) }` and `.advisor__submit { color: var(--color-bg) }` (styles.css:2687, 2725). `--color-bg` does not exist in `:root`. The submit arrow and hovered chips render with inherited/initial color — wrong contrast on the accent background. Should be `var(--color-muted-black)`.

## 4. Spacing & layout

**Good:** Tokenized scale with a real jump to `--spacing-3xl: 8rem` — sections breathe like the brand doc's compression-and-release principle demands. `.container` 1200px / `.wide-container` 1400px is a sane two-tier system. `body { max-width: 1920px; margin: 0 auto }` with the nav matching (styles.css:248) — ultra-wide handled.

**Findings:**

- **[HIGH] Hardcoded nav gutters break mid-width layouts:** `nav .container { padding-left: 6rem; padding-right: 6rem }` (styles.css:260–262). At 900–1100px viewports, 12rem of dead gutter + 115px logo + five 1.1rem uppercase links = overflow pressure; nothing adjusts until the 860px hamburger breakpoint. Use `padding-inline: clamp(1.5rem, 5vw, 6rem)`.
- **[MED] Utility-class sprawl:** the "Extracted Inline Styles" block (styles.css:1660–2298) is ~640 lines of one-off utilities — `.section--mt-8`, `.spacer--8`, `.grid-3--mt-2/-3/-4`, `.text--intro-65ch/70ch`, `.content-wrapper--800`. It's honest about its origin (inline-style extraction) but it's three margin systems coexisting. Maintainability debt, not a visual bug.
- **[LOW] `.spacer--8` divs in about.njk** — spacing as markup. Should be section margin.

## 5. Animations & transitions

This is where the site most needs an editor. There are **six** concurrent motion systems: scroll-reveals, stagger delays, hero scroll-lock intro, JS parallax (4 variants), infinite `slowZoom`, and hover transforms.

- **[CRITICAL] The homepage scroll-lock intro is the single worst pattern on the site.** `head.njk:2–14` + `HeroIntroAnimation` (animations.js:~95–160): on load, nav and hero text are hidden, `body.hero-locked { overflow: hidden; touch-action: none }`, and the user must perform **two separate scroll gestures** (600ms cooldown between) to unlock the page, with 5s/10s safety timers. What a first-time visitor experiences: a photo, no heading, no nav, and a page that ignores their first scroll. That reads as *broken*, and scroll hijacking is the signature move of over-designed agency sites — the opposite of Apple-esque confidence. It also ignores `prefers-reduced-motion` entirely and `touch-action: none` is an accessibility violation while active. The noscript fallback (head.njk:11–14) is correct, which shows the risk was understood. **Remove the lock.** Keep a one-shot entrance: hero text fades up 900ms after load, nav fades in with it. Zero gestures owed.
- **[HIGH] Parallax fights CSS transitions — visible smearing.** `.full-width-image { transition: transform var(--transition-slow) }` (styles.css:730, 0.8s ease-out) while `initHeroParallax` writes `img.style.transform = translateY(...)` **every scroll frame** (animations.js parallax block). Each frame's transform is tweened over 800ms, so the parallax lags and floats behind the scroll. Same class also has a `:hover { transform: scale(1.02) }` that the JS clobbers. Fix: parallax targets get `transition: none` on transform (or write to a wrapper), and drop the hover scale on parallaxed images.
- **[HIGH] Hero parallax mutates `top`, not `transform`:** `heroImage.style.top = -(scrollY * 0.6) + 'px'` (animations.js). Layout property → layout + paint per frame, on a 160%-height image that is *also* running an infinite 20s `slowZoom` scale animation (styles.css:345–352). `will-change: top` (styles.css:346) doesn't help — `top` isn't compositable. Use `transform: translate3d(0, y, 0)` and let the zoom live on a parent.
- **[MED] Reduced-motion coverage is partial.** The global CSS kill switch (styles.css:2862–2871) is correct, but JS keeps writing inline `opacity`/`top`/`transform` on scroll — only two of the five parallax effects check `prefersReducedMotion`, and the hero intro doesn't check at all. Gate the whole of `initHeroParallax` and `HeroIntroAnimation` behind the media query.
- **[LOW] FAQ open/close is `display: none` → `block`** (styles.css:1446–1466) — instant snap in a site where everything else eases. A `grid-template-rows: 0fr → 1fr` transition (or `max-height`) plus rotating the `+` glyph would match the motion language for ~10 lines of CSS.
- **[LOW] Mobile menu appears with no transition** (styles.css:2438–2459) — `display: none/flex` toggle. Same abruptness.
- **Good:** stagger via `--stagger-index` custom property (styles.css:1641–1649 + animations.js) is a clean pattern; IntersectionObserver with sensible thresholds; scroll handler is rAF-throttled with a `ticking` flag; ambient video is `muted playsinline` and compressed via Cloudinary (`w_1920,ac_none`).

## 6. Mobile responsiveness

**Good:** Consolidated media-query block, iOS input-zoom guard (`font-size: 16px !important`, styles.css:2532–2534), grain overlay disabled on mobile (2462–2464), `page-bg--fixed` correctly demoted to `absolute` on mobile (2561–2564) avoiding the iOS fixed-background bug, hero 80vh on small screens, single-column collapses all present, 400px micro-breakpoint for booking.

**Findings:**

- **[MED] Breakpoint gap 768–860px:** hamburger appears at 860px (styles.css:2438) but the logo shrinks to 58px only at 768px (2470). In the gap you get hamburger UI + 115px desktop logo + 6rem gutters — a tablet nav that's mostly logo. Align both to 860.
- **[LOW] Fragile selectors:** `#bookingSummary div[style*="display: flex"]` (styles.css:2547–2554) — styling against inline-style strings will silently die on any refactor.
- **[LOW] `.feature-image--overflow { width: 160%; margin-left: -60% }`** (styles.css:1897–1905) is correctly reset on mobile, but between 769–1024px the bleed can crowd the adjacent text column. Check at 900px.

## 7. Component consistency

- **[HIGH] Two design generations are visible in one viewport.** Generation A (cards, testimonials, stat cards, forms, modals): square corners, `#1a1a1a`, 1px `#2a2a2a` borders. Generation B (advisor, contact-form--styled, map, chips): `border-radius: 12px`, `rgba(15,15,15,0.75)`, `backdrop-filter: blur(4px)`, pill chips at 20px (styles.css:2042–2048, 2655–2663, 2676, 2022). Radii in play: 0, 4, 6, 8, 12, 20px — only 4/6/20 are tokens. On `/saunas/` a frosted rounded advisor sits directly above sharp-cornered model cards. Pick one language (my call: Generation A's sharpness is more architectural and more SSC — brand doc: "precision-engineered") and fold the frosted-glass treatment into it: keep the blur, square the corners to `--radius-sm`, tokenize.
- **[MED] Three testimonial cards attributed identically** "— Private Client, Squamish BC" (home.njk:126–136). Three quotes, one anonymous label, repeated — reads as fabricated even though it isn't. Vary the attribution (first name + area, project type: "S4 owner, Brackendale") or show two instead of three.
- **[LOW] Two gallery systems** — `.gallery-mosaic` grid and legacy `.gallery` column layout both live in CSS (styles.css:737–839); legacy is dead weight if no page uses it.
- **Good:** buttons (`.btn`/`.btn-outline`), `link--accent` underline-grow, card hover grammar (lift + image scale + brightness) are consistent across all Generation-A components.

## 8. Image handling

**Good:** `q_auto,f_auto` everywhere; rotation via `a_90` server-side; `fetchpriority="high"` on the hero (home.njk:5); `loading="eager"` only on above-fold gallery items; preconnect to res.cloudinary.com; `preload_image` front-matter hook; footer logo has explicit `aspect-ratio` (styles.css:2290) killing CLS.

**Findings:**

- **[HIGH] Blurry lightbox.** `gallery.js collectGalleryImages()` reads `img.src` — the grid thumbnails, which are `w_600`/`w_800` Cloudinary variants (saunas.njk:333–376) — then displays them at up to 90vw in the lightbox (styles.css:1338). On any desktop screen the "premium craftsmanship" close-up is a 600px upscale. Store a `data-full` attribute with a `w_1600` variant (or strip the `w_` param) and load that in `updateImage()`.
- **[MED] No `srcset`/`sizes` anywhere.** The homepage hero has **no width transform at all** (home.njk:5) — mobile users download the full-resolution original. Minimum fix: `w_1920` on the hero plus a 2-step `srcset` (`w_828`, `w_1920`) on hero and full-width images.
- **[LOW] No `width`/`height` attributes on `<img>`** — CLS is mostly masked by fixed CSS heights (`.card-image` 300px etc.), but full-width and about-banner images can still shift.
- **[LOW] Lightbox counter fallback hardcoded "25"** (modals/lightbox.njk:19) — cosmetic, JS overwrites it.

## 9. Accessibility

**Good:** skip-to-content link (styles.css:109–133, base.njk); global `:focus-visible` in accent (styles.css:900–903); FAQ toggles get `role="button"`, `tabindex`, `aria-expanded`, Enter/Space handling (utils.js `initFaqToggles`); lightbox has aria-labels, Escape, arrow keys, touch swipe; `prefers-reduced-motion` CSS kill switch; `accent-color` on modal inputs; semantic `fieldset/legend` on the contact form.

**Findings:**

- **[HIGH] Sauna modal is not an accessible dialog.** `modals/sauna.njk` / `modal.js`: no `role="dialog"`, no `aria-modal="true"`, **no focus trap**, focus is not moved into the modal on open nor restored on close. Keyboard users tab straight through to the page underneath a full-screen overlay. Same for the lightbox. This is the standard checklist for a config-and-quote flow that leads to money.
- **[MED] Model cards are click-only:** `.model-card` divs with `data-action="open-modal"` (saunas.njk:204 etc.) — not focusable, no keyboard access, no role. Make the card a `<button>`-wrapped surface or add `tabindex="0"` + `role="button"` + keydown.
- **[MED] Mobile menu button lacks `aria-expanded`/`aria-controls`** (nav.njk:7) and state is never announced.
- **[MED] Scroll-lock intro** — `touch-action: none` + preventDefault on keys blocks assistive scrolling for up to 10s (covered in §5; same fix).
- **[LOW] Contrast items from §3** (`#666` small text).
- **[LOW] Gallery `<div>` items open the lightbox via click listener only (gallery.js `attachClickHandlers`) — same keyboard gap as model cards.

## 10. Overall impression

Premium custom builder? **Close.** The palette, the section rhythm, the photography treatment, the single-accent discipline, and the grain overlay all say "designed on purpose." What says "not quite" is: the site *performs* premium instead of *being* premium in three places — the scroll-lock intro (asks the visitor to earn the page), the 115px badge logo (insecurity, not confidence), and the comparison-attack-first saunas page (defensive positioning). Storm Saunas can't out-craft this token system; where they'd win today is first-impression smoothness.

**The single biggest design improvement:** strip the motion layer back to one confident system. Delete the scroll-lock intro, fix the parallax/transition conflict, retire `slowZoom`, and keep exactly two motions: a single load-in for hero text/nav, and the existing staggered scroll-reveals. The photography is strong enough to carry a still page — the brand doc's own restraint test ("is this adding information, or just adding atmosphere?") fails almost the entire parallax stack.

---

## Prioritized remediation

**P0 — bugs & credibility**
1. Remove the homepage scroll-lock intro; replace with a passive load-in (head.njk:2–14, animations.js `HeroIntroAnimation`).
2. Fix parallax jank: `transition: none` on JS-driven transforms; hero parallax via `translate3d` not `top`; retire the hover-scale on parallaxed `.full-width-image` (animations.js, styles.css:724–735).
3. Fix undefined `var(--color-bg)` in `.advisor__starter:hover` / `.advisor__submit` (styles.css:2687, 2725).
4. Lightbox full-resolution source via `data-full` (gallery.js, saunas.njk gallery items).

**P1 — accessibility & mobile**
5. Modal + lightbox: `role="dialog"`, `aria-modal`, focus trap, focus restore (modal.js, gallery.js, modals/*.njk).
6. Keyboard access for model cards and gallery items; `aria-expanded` on the hamburger.
7. Gate all JS motion behind `prefers-reduced-motion`.
8. Nav: logo to ~48px without pill/shadow; `clamp()` gutters; align logo/hamburger breakpoints at 860px (styles.css:260–262, 279–289, 2438, 2470).
9. `srcset` + width transform on hero and full-width images; explicit width/height attributes.

**P2 — design coherence**
10. Unify component generations: one radius token set, fold frosted-glass into the square-corner language (styles.css advisor/contact/map blocks).
11. Reorder /saunas/: models first, comparison later.
12. Collapse the grey ramp to 3 honest tokens; fix `#666` contrast; warm the secondary grey (`#9a9590` per brand doc expansion palette).
13. Vary testimonial attributions (home.njk:126–136).
14. Animate FAQ and mobile-menu open/close.
15. Resolve Playfair-vs-Cormorant guideline drift (recommend amending guidelines to Cormorant); quiet the nav type (0.9rem).

**P3 — hygiene**
16. Delete legacy `.gallery` column system if unused; prune the extracted-utilities block into tokens; replace `[style*=]` selectors in booking CSS.
