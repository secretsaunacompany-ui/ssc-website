# SSC Website — Front-End Audit (July 2026)

**Scope:** secretsaunacompany.ca (Eleventy + Netlify), repo at `/home/leesalo/Projects/ssc-website/`. All findings verified against source, the live deployment, and a headless browser session on 2026-07-11. Ranked by impact.

**Headline:** the marketing site itself is in good shape — accurate pricing, solid SEO plumbing, on-brand design. The operational layer around it is broken: analytics is silently dead, the booking admin dashboard cannot be logged into, and a legacy analytics API is publicly leaking data from other projects (including Fern). All three trace to the same root: the CSP in `netlify.toml` was never updated when the analytics stack migrated, plus a legacy stack that was never decommissioned.

---

## Critical (broken right now)

### C1. Site analytics is completely dead — CSP blocks the tracker
- `src/_includes/scripts.njk:18-21` loads the centralized tracker from `https://ssc-ops.netlify.app/tracker.js`.
- `netlify.toml:65` — `script-src 'self' https://cdn.jsdelivr.net https://unpkg.com` does not include `ssc-ops.netlify.app`. `connect-src` doesn't either (needed for the track POST).
- **Browser-verified:** loading the live homepage logs `Loading the script 'https://ssc-ops.netlify.app/tracker.js' ... has been blocked`.
- **Corroborated:** the analytics DB shows zero secretsaunacompany.ca pageviews in the last 10 days (only Fern/OpenCanopy traffic — see C3).
- **Fix (5 min):** add `https://ssc-ops.netlify.app` to both `script-src` and `connect-src` in `netlify.toml:65`. Every day this sits, marketing data is lost — this predates the fire-ban closure, so there's no traffic baseline for reopening.

### C2. Booking admin (/ops) is unusable — CSP blocks its inline login script
- `booking-ops.html:642-711` holds the entire auth layer (hashing, session, `handleLogin`) in an inline `<script>`. The site-wide CSP has no `'unsafe-inline'` for scripts.
- **Browser-verified on live /ops:** `Executing inline script violates the ... CSP` followed by `ReferenceError: isSessionValid is not defined` from `booking-ops.js:550`. The login overlay renders but the Login button can do nothing.
- `analytics-dashboard-netlify.html:822-895` has the identical defect (inline auth script).
- **Fix (20 min):** move the inline block into `booking-ops.js` (it already loads fine as `'self'`). If Lee has been managing fire-ban blocks some other way, that explains why nobody noticed.

### C3. Unauthenticated analytics API leaks cross-project data — including Fern
- `netlify/functions/analytics.js:246-321` has **no auth check at all** (CORS only, which doesn't stop direct requests). Live test: `GET /.netlify/functions/analytics?action=pages` returned page URLs and titles from **fern-app.netlify.app** (the family baby tracker), **opencanopy.ca**, and localhost dev sessions — the shared Supabase analytics tables receive writes from every project using the tracker, and these legacy queries have no site filter.
- The dashboard "password" (`analytics-dashboard-netlify.html:822`, comment says "validate server-side") is never validated by this function — it's theater.
- **Fix:** either add a token gate identical to `booking-admin.js:38-43`, or better, **delete the legacy analytics stack from this repo entirely** (`netlify/functions/analytics.js`, `track.js`, `analytics-tracker-netlify.js`, `analytics-dashboard-netlify.*`, `supabase-schema.sql` and their passthrough lines in `.eleventy.js:64-69`). Analytics has moved to ssc-ops; this site shouldn't expose a second, unfiltered, unauthenticated read path into the shared DB.

### C4. `/analytics` redirect points at a domain that doesn't resolve
- `netlify.toml:14-17` redirects `/analytics` → `https://ops.secretsaunacompany.ca/`. DNS lookup fails (commit 9436e5a set up the custom domain; 9eff937 abandoned it for `ssc-ops.netlify.app`, but this redirect was never updated).
- **Fix (2 min):** point it at the real ops dashboard or delete the rule.

---

## High impact

### H1. The booking funnel dead-ends with contradictory messaging
Three prominent CTAs (nav "Book", hero "Or Book a Session" `home.njk:10`, "Try a Session" card `home.njk:48`) send visitors to book.secretsaunacompany.ca, which currently shows **"Closed during the fire ban."** Meanwhile the internal `/book/` page (in the sitemap) says booking is **"offline while we rebuild it"** (`src/book.njk:4`, `pages/coming-soon.njk:5`). Two different explanations for the same closure; the main site gives no warning before the click. The fire-ban toggle reopens on its own (rolling window), but until then:
- Add a one-line notice near the booking CTAs ("Sessions paused during the fire ban — custom builds unaffected"), or point CTAs at `/book/` with fire-ban copy. Keeps the quote funnel — the business's actual revenue path now — clearly separated from the paused rental funnel.
- **Email inconsistency:** the booking site says `info@secretsaunacompany.ca`; the main site uses `secretsaunacompany@gmail.com` everywhere. Verify info@ actually forwards, or unify.

### H2. Closed-shop content is still live (schema + Squamish page)
Shop closed May 2026, but:
- `src/_includes/head.njk:66-73` — LocalBusiness schema still lists `38918 Progress Way` as a physical address, plus `openingHours Mo-Fr 09:00-17:00` (line 86). Google can surface a location that no longer exists.
- `src/squamish.njk:15,43,50-51` — "Our workshop is right here on Progress Way", "we'll set up a shop visit."
- **Fix:** convert schema to a service-area business (drop `streetAddress`/`openingHours`, keep `areaServed` + `geo`), rewrite the Squamish page's workshop/shop-visit copy. Needs Lee's wording call on how to frame the operation now.

### H3. Hero (LCP) image: wrong `sizes` + wasted preload
- `.eleventy.js:92` hardcodes `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"` onto **every** Cloudinary image, including the full-viewport hero. Desktop browsers therefore pick the 800px file and stretch it past 1920px — soft hero image, the first thing every visitor sees.
- `src/index.njk:4` preloads the **w_1200** variant, which the browser then doesn't select — the LCP asset downloads twice.
- **Fix:** give the hero explicit `sizes="100vw"` (exclude it from the transform or add srcset manually in `home.njk:5`) and preload the variant the srcset math will actually choose.

---

## Medium

**M1. Where do sessions happen? Three answers.** `home.njk:47` says "our Aldergrove location"; `js/data.js:103-111` flagship says "Abbotsford, BC"; commit e651d05 says "update location to BAG" (Brackendale). Needs one canonical answer from Lee — this is customer-facing.

**M2. Heater option drift vs models.json.** `js/modal.js:199-207` offers "Homecraft Revive 9kW (Electric) +$2,000" — no such add-on exists in `models.json` (SoT lists "Homecraft 15kW Apex" at $2,000). Ops context notes Apex supplier cost is now $2,700-$3,000, so the +$2,000 configurator price is likely underwater. Reconcile `models.json` first, then the modal (`sauna.njk:57-61`). **Everything else checks out:** all five base prices, interior upgrades, changing rooms, decks, cladding, premium packages match `models.json` exactly across `head.njk`, `pages/saunas.njk`, and `js/data.js`.

**M3. Self-serving review schema.** `head.njk:229-284` marks up AggregateRating + reviews on the business's own LocalBusiness entity with anonymous "Private Client" authors. Google made self-serving LocalBusiness review markup ineligible in 2019; at best ignored, at worst a structured-data spam flag. Keep the visible testimonials, delete the markup.

**M4. Phantom SearchAction schema.** `head.njk:180-193` declares a site search (`/?q={search_term_string}`) that doesn't exist. Remove.

**M5. Hero scroll-lock intro.** `head.njk:2-14` + `js/animations.js:91-155`: homepage locks scrolling entirely until two separate gestures (or 5s/10s fallback timers). Cinematic, but every visitor pays a toll before reading anything, `prefers-reduced-motion` isn't respected for the lock, and there's no analytics right now to prove it isn't driving bounces. Suggest: reveal on first scroll without ever blocking the second gesture.

**M6. Admin/ops surfaces are public and indexable.** `/booking-ops.html`, `/ops`, `/analytics-dashboard-netlify.html`, and `/supabase-schema.sql` all return 200 with no `noindex` meta and no `X-Robots-Tag`. The schema file discloses full table structure including the `ip_address` column. Remove the schema passthrough (`.eleventy.js:69`) and add an `X-Robots-Tag: noindex` header block for the admin paths in `netlify.toml`.

**M7. Sitemap includes `/contact/thank-you/`.** The post-submit conversion page is in `sitemap.xml` — it can rank and let visitors land on a "thanks" page without submitting anything. Exclude + noindex.

**M8. Privacy page misstates the analytics stack.** `pages/privacy.njk:44` claims "Google Analytics for anonymous usage statistics" — the site uses the custom Supabase tracker (which stores IPs per the schema), not GA. Update the disclosure (PIPEDA accuracy).

**M9. Parallax uses layout-triggering properties.** `js/animations.js:194` writes `heroImage.style.top` per frame (rAF-throttled, but still layout); the image shift ignores `prefers-reduced-motion` while the text fade respects it (line 198). Switch to `transform: translateY()`.

**M10. Cache versioning is manual.** `/js/*` and `/styles.css` are cached 1 year immutable (`netlify.toml:101-111`) busted only by hand-bumped `?v=` strings (`scripts.njk:3-15`, `head.njk:301` — most still `v=20260226`). One forgotten bump strands users on year-old code. Consider content-hashing at build, or drop immutable to `max-age=86400`.

---

## Answers to specific questions

**SEO & meta.** Fundamentally solid: unique titles/descriptions per page, canonical + og/twitter tags, geo tags, LocalBusiness/Organization/BreadcrumbList/FAQPage schema, valid sitemap + robots.txt, www canonicalization, meta-refresh stubs with canonicals for /gallery and /process (the parallel `netlify.toml:26-43` 301s are dead letters since the files exist, but the stubs cover it). **The reported $22,500-vs-$29K mismatch is mostly a non-issue:** $22,500 is the correct S2 entry price per `models.json`, and every S4 $29,000 display is also correct. The only soft spot is wording — the og fallback (`head.njk:33`) says "**Custom builds** starting at $22,500" when that's the *standard model* floor; "Models from $22,500" would be accurate. Real SEO items: M3, M4, M7, H2.

**Content accuracy.** Pricing: fully consistent with `models.json` except the heater upgrade (M2). Stale content: closed-shop references (H2), session-location naming (M1), privacy policy (M8), contradictory booking-closure messaging (H1).

**Performance.** Good bones: JS is modular, deferred, and minified via esbuild at build (~12 files); CSS minified via lightningcss (40KB); Leaflet lazy-loads only on the locations page; Cloudinary `q_auto,f_auto` everywhere; lazy loading on below-fold images; `fetchpriority="high"` on the hero. Issues: H3 (hero sizes/preload), M9 (parallax), the homepage autoplay video (`home.njk:142`, w_1920 mp4, downloads on mobile — add `preload="metadata"` + poster), and two Google font families where the display font (Cormorant Garamond) is used sparingly.

**Mobile.** Breakpoints at 1200/1100/900/860/768/600/400 (`styles.css:2394-2855`), grain overlay disabled on mobile, `position:fixed` div backgrounds instead of `background-attachment` (correct for iOS), noscript fallbacks for the hero lock. One nit: `.mobile-menu-btn` (`styles.css:313-320`) has no padding — tap target well under 44px.

**UX flow.** Landing → "Plan My Sauna Design" → contact form is clear and low-friction (Formspree; required name/email only, project details in an optional fieldset — nicely staged). The stronger path: saunas → model card → configurator modal → "Request Quote for This Configuration" → config carried via sessionStorage (`modal.js:381`) → prefilled contact message (`navigation.js:72-79`). This works, but the prefill lands silently in the message textarea below the fold — add a small "Your S4 configuration is attached" banner so users know it carried. The rental-booking fork is the weak flow (H1).

**Analytics.** Currently recording **nothing** for SSC (C1). The in-repo tracker/dashboard/functions are a superseded legacy stack that should be removed (C3); the legacy dashboard would show cross-project mixed data anyway since the queries don't filter by site. After the CSP fix, verify the ssc-ops tracker segments by `data-site-id` and captures the funnel that matters: model_view → request-quote click → thank-you pageview.

**booking-ops page.** A self-contained dark-mode admin dashboard served at `/ops` (rewrite, `netlify.toml:20-23`). Login: password → SHA-256 client-side → hash used as bearer token, validated server-side against `OPS_ADMIN_TOKEN` (`booking-ops.html:679-704`, `booking-admin.js:38-43`) — reasonable for a solo operator. It manages the same Supabase `booking_slots`/`booking_reservations` tables the book.secretsaunacompany.ca app uses: month calendar with booked/blocked dots, per-slot capacity/block/notes, block/reset day, cancel reservation (UUID-validated), CSV export, 30 req/min rate limit. Currently broken in production (C2).

**Design quality.** Matches Lee's preferences well: dark theme by default (`#0c0c0c`/`#1a1a1a`), single warm-wood accent (#c4a57b), tokenized palette (`styles.css:9-33`), Cormorant Garamond/Outfit pairing, film-grain overlay, generous whitespace, no emojis. The booking-ops dashboard uses the same dark language with system fonts — coherent. The site does not look templated. Main aesthetic risk is behavioral, not visual: the scroll-lock intro (M5) prioritizes cinema over the visitor's intent.

---

## Quick wins (<30 min each, ranked)

1. **CSP: add `https://ssc-ops.netlify.app` to `script-src` + `connect-src`** (`netlify.toml:65`) — resurrects all analytics. 5 min.
2. **Move `booking-ops.html:642-711` inline script into `booking-ops.js`** — resurrects the booking admin. 20 min.
3. **Fix or delete the `/analytics` redirect** (`netlify.toml:14-17`). 2 min.
4. **Remove `supabase-schema.sql` passthrough** (`.eleventy.js:69`). 2 min.
5. **`X-Robots-Tag: noindex` headers for `/ops`, `/booking-ops.html`, `/analytics-dashboard-netlify.html`**. 5 min.
6. **Delete SearchAction + review schema blocks** (`head.njk:180-193, 229-284`). 10 min.
7. **Exclude `/contact/thank-you/` from the sitemap**. 5 min.
8. **Hero `sizes="100vw"` + matching preload** (`.eleventy.js`, `home.njk:5`, `index.njk:4`). 15 min.
9. **og fallback wording: "Models from $22,500"** (`head.njk:33`). 2 min.
10. **Fire-ban notice near booking CTAs** — copy needs Lee's sign-off. 20 min.

Larger but high-value: gate or delete the legacy analytics function (C3, ~45 min), de-address the LocalBusiness schema + rewrite Squamish copy (H2, needs Lee), reconcile the heater add-on with models.json (M2, needs current supplier pricing from Lee).

---

## Housekeeping notes

- `_site/` (Feb 26) and `dist/pricing/`, `dist/blog/`, `dist/js/booking.js` are stale local build artifacts (output dir is `dist/`, Eleventy doesn't clean it); both dirs are gitignored so deploys are unaffected. Safe to delete locally.
- `js/booking.js` no longer exists in source; `navigation.js:63-69` still probes for `initBookingSystem` — dead code path, harmless.
- ROADMAP's parked AI Advisor: frontend is gated off, but `netlify/functions/advisor.js` is still deployed and callable (returns 400, rate-limited 10/min/IP in-memory). Fine short-term; remove or env-gate the function until the widget rethink happens.
