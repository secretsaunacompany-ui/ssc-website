# SSC Website — Functional Audit (2026-07-27)

**Scope:** secretsaunacompany.ca customizer/form submission failure. Repo: `/home/leesalo/Projects/ssc-website/` (clean tree, last commit bd8022e 2026-07-11; live deploy matches source — verified by fetching live JS/HTML). Prior audit `research/front-end-audit-2026-07.md` (2026-07-11) covers CSP/analytics/admin issues; this audit does not repeat it except where findings intersect.

**Headline:** The customizer's code path works mechanically end-to-end on desktop AND mobile (browser-verified live today). The contact form works and IS receiving submissions (Gmail-verified: ~201 Formspree emails, latest today 2026-07-27 8:18 PM UTC). But **zero configurator-originated submissions have ever been received — not one, in the entire mailbox history.** The bug is not a broken endpoint. It is a funnel dead-end: the "Request Quote for This Configuration" button silently dumps the user at the top of the generic contact page with their configuration buried 1.5–2.5 viewports below the fold in an "optional" field, with no confirmation it carried and a second, unannounced form to complete. Users believe they already submitted, and leave.

---

## 1. Customizer submission flow — step-by-step trace

Full journey, all verified against live site with Playwright (2026-07-27):

1. **`/saunas/` → model card** — 5 cards with `data-action="open-modal" data-model="s2|s4|s6|s8|sc"`. Click delegated by `js/init.js:27-29` → `ModalManager.open()` (`js/modal.js:70-85`). **Works.**
2. **Modal customization** — addon radios/checkboxes in `src/_includes/modals/sauna.njk`; `calculateTotal()` (`modal.js:252-308`) recomputes live. Verified: S4 + wood-fired heater + 3' changing room → `$35,500` correct. **Works.**
3. **"Request Quote for This Configuration"** (`sauna.njk:203`, `data-action="request-quote"`) → `requestQuote()` (`modal.js:346-383`): builds a plain-text config summary, closes modal, writes it to `sessionStorage['ssc_quote_config']`, then `window.location.href = '/contact/'`. **Works — but this is where the funnel breaks (below).**
4. **Contact page prefill** — `js/navigation.js:72-79` on DOMContentLoaded reads the key, injects "I'm interested in the following configuration: …" into `textarea[name="message"]`, and **immediately deletes the sessionStorage key**. Verified working on desktop and 390px mobile viewport. **Works.**
5. **Submit** — user must scroll down, fill name + email, click "Get My Quote" → `init.js:67-69` → `SSC.handleSubmit` (`js/forms.js:11-50`) → fetch POST to `https://formspree.io/f/mdaaejwp` → redirect `/contact/thank-you/` (live, 200). **Works when reached** — Formspree receipt confirmed by today's real submission.

### The bug (behavioral, evidence-backed)

- **Gmail evidence:** searches across the full mailbox for `"interested in the following configuration"`, `"Estimated Total"`, `"Selected Options"`, and `from:formspree.io "Standard Sauna"` all return **0 results**, against ~201 total Formspree submission emails (regular contact-form inquiries arrive fine, including one today). **No configurator request has ever been completed.**
- **Measured landing experience** (desktop 649px viewport, after clicking Request Quote): page loads at `scrollY=0` under a hero reading "Get Your Quote"; the form starts at y=458, the prefilled message textarea at **y=1536**, the submit button at **y=1727** — 2.5 viewports down. Mobile (390×844): textarea at y=1645. **No banner, no scroll, no focus, no indication anything carried over.**
- **The button label promises a submission** ("Request **Quote** for This Configuration") but performs a silent page hand-off. The user's mental model says "sent"; the site's model says "now find and fill a second form." That mismatch is precisely the owner's report: *"they cannot submit that request directly -- or the submission isn't being received."* Both are true — there is no direct submission, and abandoned handoffs are never received.
- **Fragile single-shot handoff:** `navigation.js:77` deletes the sessionStorage key the moment it prefills. Reload, back-then-forward, or any detour from `/contact/` permanently loses the configuration. Nothing re-creates it.

### Secondary content bug in the quote itself

`requestQuote()` (`modal.js:354-363`) skips any checked radio with `value === '0'`. Both bench options (`sauna.njk:146-157`) have `value="0"`, so a **U-shaped bench selection is silently omitted** from every quote summary. Same mechanism drops any future $0-but-meaningful choice. (Priced options and `interiorUpgrade`/`premiumFinishPrice` string values pass through correctly.)

---

## 2. All forms inventory

Exactly **one** real `<form>` exists in source (`grep '<form' src/`):

| Form | Location | Action | Method | Status |
|---|---|---|---|---|
| Contact / quote | `src/_includes/pages/contact.njk:18` | `https://formspree.io/f/mdaaejwp` | POST via fetch (`forms.js`), native POST fallback | **Working & receiving** (verified today) |
| Customizer modal | `src/_includes/modals/sauna.njk` | none — not a form; sessionStorage handoff | n/a | Mechanically works; funnel dead-end (Section 1) |
| Booking | `src/book.njk` | none — page is a "coming soon" placeholder | n/a | Intentionally offline; nav CTAs go to external book.secretsaunacompany.ca (fire-ban closed — prior audit H1) |
| AI advisor | gated off (`src/_data/site.json` → `features.advisor: false`) | n/a | n/a | Not rendered |

Details checked:

- **Endpoint valid:** Formspree GET returns 405 + Formspree page (endpoint exists); receipt proven by inbox. Endpoint is duplicated as a hardcoded fallback in `forms.js:16` — harmless, but two sources of truth.
- **Hidden fields:** `_next` (ignored on AJAX submissions — JS handles the redirect itself; harmless) and `_subject` (working — inbox subjects read "New Sauna Inquiry from Website"). No honeypot/captcha fields that could block. Required fields: only `name` and `email`, both visible. No hidden required fields.
- **Error handling:** submit button disables + "Sending..." during flight; failure path is a generic `alert()` with no detail and no mailto fallback (`forms.js:41-43`). Success resets the form and redirects to `/contact/thank-you/` (200). Adequate, not great.
- **JS errors:** none in the form path. Only console errors on live are the CSP-blocked `ssc-ops.netlify.app/tracker.js` (prior audit C1 — **still unfixed 16 days later**, so there is also zero analytics visibility into this funnel).
- **CSP:** `connect-src`/`form-action` both allow formspree.io — submission not CSP-blocked in either fetch or no-JS fallback mode.
- **Dead handler:** `init.js:71-74` handles `data-action="booking-submit"` by calling `SSC.handleBookingSubmit`, which **no longer exists anywhere** (`js/booking.js` deleted from source). No form currently uses it, but since the case runs `e.preventDefault()` *before* the call, any future form wired to it would throw a TypeError and become an un-submittable dead button. Remove or guard.
- **Stale-cache cohort:** `/js/*` is served `max-age=31536000, immutable` (`netlify.toml:102-105`), busted only by `?v=` strings. `forms.js` was fixed 2026-02-27 (old version alert + redirect to `/gallery/`) but `?v=20260226` was never bumped (`scripts.njk:11`). Visitors from the one-day window keep the old file for a year — submissions still go through, just a weird post-submit hop. Prior audit M10 covers the systemic risk.

---

## 3. Data sync — `js/data.js` vs `models.json` (SoT)

Checked field-by-field against `/home/leesalo/.local/share/marvin/worktrees/marvin/session-ade477/content/reference/operations/models.json`:

- **In sync:** all five models' `basePrice` (22500/29000/35500/44000/57000), `size`, `capacity`, `heater`, `interiorUpgrade` (1000/1500/2500/3500/4500), `electricOnly`, and all Premium Finish Package prices (7000/7500/8500/9500/10500). Addon prices in `sauna.njk` (changing rooms, decks, cladding, window, lighting, speakers, wood-fired heater) all match. **Clean.**
- **One drift (prior audit M2, confirmed still present):** `modal.js:199-207` offers "Homecraft Revive 9kW (Electric) +$2,000" for non-SC models — this addon does not exist in `models.json` (which lists only the 15kW Apex at $2,000, correctly shown for SC). Ops context in the prior audit: Apex supplier cost has risen to $2,700–$3,000, so the +$2,000 configurator price may be underwater. Reconcile `models.json` first, then the modal.
- Cosmetic: `handlePremiumPackageChange` (`modal.js:317`) disables a nonexistent `input[name="wifi"]` — harmless dead selector.

---

## 4. Other functional issues

- **NEW — Netlify function source code is publicly served.** `.eleventy.js:63` (`addPassthroughCopy("netlify")`) copies the whole functions directory into the publish dir: `https://www.secretsaunacompany.ca/netlify/functions/advisor.js` returns **200** (live-verified), exposing advisor prompt logic, rate-limit internals, `lib/` (Supabase client wiring, admin-token comparison logic in spirit), and `prompts/`. No hardcoded secrets found (all via `process.env` — grep for key patterns clean), so this is source disclosure, not credential leak — but it hands an attacker the exact shape of the unauthenticated analytics API (prior audit C3) and the admin auth flow. The passthrough serves no runtime purpose (Netlify deploys functions from the repo path, not the publish dir). Delete the line.
- **Analytics still dead (prior audit C1, unfixed):** CSP still blocks the tracker on every page (re-verified in console today). Consequence for this investigation: there is no funnel data (model_view → request-quote → thank-you) to quantify the customizer drop-off — only the Gmail zero.
- **Booking funnel contradiction** (prior audit H1) still live: nav "Book" → external site "Closed during the fire ban", internal `/book/` says "offline while we rebuild." Unchanged.
- Legacy analytics stack (`analytics.js` unauthenticated cross-project leak, C3) — unchanged since prior audit; still the most serious security item in the repo.

---

## 5. Prioritized fix list

**P0 — the reported problem (customizer requests never arrive):**
1. **Let the modal submit directly.** Add name + email fields and a submit button inside the modal's price-summary block, POSTing to the same Formspree endpoint with the config text as `message` (reuse `SSC.handleSubmit`; it already reads `form.action`). The button then does what it says. Keep the contact-page handoff as fallback.
   *Minimum viable alternative (~1 hr):* keep the handoff but (a) rename button to "Continue to Quote Request", (b) on `/contact/` arrival with a config, scroll to/focus the form and show a visible "Your S4 configuration is attached — add your name and email to send it" banner, (c) don't delete the sessionStorage key until submission succeeds.
2. **Fix the CSP tracker block** (prior audit C1, 5 min, `netlify.toml:65`: add `https://ssc-ops.netlify.app` to `script-src` + `connect-src`) — without it there's no way to measure whether fix #1 works.

**P1 — quote correctness:**
3. Include $0 selections with distinct meaning in the quote summary — bench choice is currently dropped (`modal.js:354`, `sauna.njk:146-157`). Give U-shape a distinct value or include all checked radios by label.
4. Reconcile the Revive 9kW heater addon with `models.json` and current supplier pricing (M2 — needs Lee's numbers).

**P2 — hygiene / security:**
5. Remove `addPassthroughCopy("netlify")` from `.eleventy.js:63` (public function source), and while in there the `supabase-schema.sql` passthrough (prior audit quick-win #4).
6. Remove or guard the dead `booking-submit` case in `init.js:71-74` and the dead `initBookingSystem` probe in `navigation.js:63-69`.
7. Bump stale `?v=` stamps (forms.js changed after 20260226) or move to content-hashed filenames (M10).
8. Gate or delete the legacy analytics function (prior audit C3) — unchanged, still open.

**Evidence trail:** live browser repro (desktop + 390px mobile) 2026-07-27; Gmail via gws CLI (`from:formspree.io` ≈201 results, latest 2026-07-27; config-text searches 0 results); live curl of contact page/headers/JS; `research/front-end-audit-2026-07.md` (2026-07-11) for intersecting findings.
