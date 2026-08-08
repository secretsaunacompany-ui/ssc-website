# SSC Website — Journey, Funnel & Emotional Arc
**Wim, Experience — 2026-07-28**
Lane: sequencing, conversion architecture, trust flow, arrival choreography. No visual spec, no final copy (placeholders marked `[GEORGE]` where wording is his).

Principle carried over from session design: a visitor moves through the same arc a sauna guest does — anticipation → threshold → immersion → release → integration. The site's job is to never ask for commitment before the arc has earned it, and to never lose someone who was ready to commit. Both failures exist on the current site: the scroll-lock asks for effort before giving anything (threshold before anticipation), and the configurator drops the guest at the moment of maximum intent (asks, then abandons).

---

## 1. The central failure — replacement quote flow, end to end

### Diagnosis in one line
The button says "Request Quote" but performs a navigation. The user's mental model completes ("I sent it"); the site's model has barely started ("now find a second form 1,536px down a different page"). 0 submissions ever, against ~201 contact-form emails. This is a promise-keeping failure, not a code bug.

### Design decision: the modal IS the right container — extended, not replaced
The visitor has just spent 1–3 minutes making choices. Configuration is investment; investment is the best moment to ask. Moving them anywhere resets emotional state to zero (proven: 100% abandonment). So the ask happens **in place**, inside the same modal, as a second step of the same surface. No page navigation until success.

### The two-step modal

**Step 1 — Configure (existing content, one change).**
The `data-action="request-quote"` button label changes to **"Request This Quote"** and no longer closes the modal or navigates. It transitions the modal body to Step 2.

- Transition: configuration panel slides/fades out left (250ms), Step 2 fades in (250ms, 100ms overlap). Under `prefers-reduced-motion`: instant swap.
- The price summary block (`#summaryBase`, `#addonsList`, `#summaryTotal`) **persists visually across both steps** — it moves to the top of Step 2 as a read-only recap. The visitor must see their configuration survive the transition. This is the "your towel is where you left it" rule: continuity of the guest's own artifacts is what makes a space feel trustworthy.

**Step 2 — Send (new, inside the modal).**
A real `<form>` posting to the existing Formspree endpoint `https://formspree.io/f/mdaaejwp`, reusing `SSC.handleSubmit` (it already reads `form.action`).

Contents, in order:
1. **Recap block** (read-only): model name, selected options list, estimated total. Small text link: "Change something" → returns to Step 1 with all inputs intact (inputs are never reset between steps; the same DOM nodes remain mounted).
2. **Fields — exactly three visible:**
   - `name` (text, required)
   - `email` (email, required)
   - `notes` (textarea, optional, 3 rows, label `[GEORGE — something like "Anything about your site or timeline"]`)
   - Hidden: `message` = the full config summary text (built by the existing `requestQuote()` string builder, with the §1-fix below); `_subject` = "Configurator Quote Request — {Model} — ${Total}"; `model`, `estimated_total` as separate hidden fields so Lee's inbox is scannable; `_next` omitted (AJAX handles success in place).
   - **No phone, no budget, no timeline selects.** The configuration already communicates budget and seriousness. Every added field is a step back down the commitment ladder. (Low-input principle: accept less data to lose fewer people.)
3. **Submit button:** "Send Quote Request". Quiet styling — same `.quote-btn` treatment, no glow, no pulse. During flight: disabled, label "Sending…".

**Success state (in the modal, no navigation):**
- Step 2 form fades out; success panel fades in: checkmark-free, text-led. `[GEORGE — plain confirmation: it went to Lee and Anthony, expect a reply within X business days — Lee must supply X, do not invent]`. Include the recap block again (what was sent) and a secondary line: "A copy of nothing was emailed to you" is NOT true — Formspree does not auto-reply on this plan, so **do not claim a confirmation email** unless Formspree's auto-response is enabled. Flag: enabling Formspree's auto-reply with the config text is a cheap, high-trust add — Lee's call.
- One quiet text link: "Close" and optionally "See how the process works →" (→ `/process/`, the restored page). This is the integration phase of the arc: they've committed; give them something to read while the afterglow lasts, not a dead end.
- `sessionStorage['ssc_quote_config']` is cleared **only here**, on confirmed success.

**Failure state (fetch rejects or non-2xx):**
- Form stays mounted, all values intact. Inline error above the submit button (not `alert()`): `[GEORGE — honest failure line]` plus a **mailto fallback link** whose `href` is `mailto:{site email}?subject=Quote%20Request%20—%20{Model}&body={urlencoded config summary}`. The configuration must always have a second exit. Button re-enables, label restores.
- Config summary is also written to `sessionStorage['ssc_quote_config']` on entering Step 2 (not on success) and **never deleted on failure or reload** — expiry after 7 days via a stored timestamp, checked on read. If the visitor closes the modal and reopens any model modal later in the session, Step 1 restores their previous selections for that model.

**Preservation rules (replacing the current delete-on-read):**
- `navigation.js:72-79` delete-on-prefill behavior is removed entirely.
- The `/contact/` handoff path is kept as **fallback only** (deep links, JS-disabled edge): if `ssc_quote_config` exists when `/contact/` loads, scroll to the form, focus `name`, and render a visible attached-config banner above the form ("Your {Model} configuration is attached below"). Key survives until successful submit.

**Fix folded in:** the `value === '0'` skip in `requestQuote()` (`modal.js:354`) currently drops the bench choice. Include all checked radios by label; give U-shape bench `value="0" data-label="U-shaped benches"` or equivalent so $0-but-meaningful choices always appear in the summary Lee receives.

**Accessibility (blocking, per Jen's audit):** the modal gets `role="dialog"`, `aria-modal="true"`, focus trap, focus moved to Step 2's first field on transition, focus restored on close. A quote flow that leads to money must be keyboard-complete.

**What arrives in Lee's inbox:**
Subject: `Configurator Quote Request — S4 — $35,500`. Body: name, email, notes, then the full config summary (model, every selected option including $0 ones, estimated total, date). Scannable in four seconds, replyable in one click.

### States summary (engineer's checklist)
| State | Trigger | Visible | Storage |
|---|---|---|---|
| Configure | modal open | options + live total + "Request This Quote" | restore prior selections if stored |
| Send | Request This Quote | recap + 3 fields + "Send Quote Request" | write `ssc_quote_config` + timestamp |
| Sending | submit | disabled button "Sending…" | unchanged |
| Success | 2xx | confirmation panel + recap + Process link | clear key |
| Failure | error/non-2xx | inline error + mailto fallback, form intact | key retained |
| Fallback | `/contact/` load with key present | scroll+focus+banner | key retained until submit |

---

## 2. The five real journeys

Format per journey: entry → the questions in their head, in order → what the site does now → what it should do → exit.

### J1 — Cold visitor → curious → quote request
**Entry:** Google "custom sauna Squamish / BC", Instagram, word of mouth. Lands on `/` or `/saunas/`.
**Questions, in order:** (1) Is this real and good? (2) Is this for people like me? (3) What does it roughly cost? (4) What happens if I raise my hand?
**Now:** scroll-lock hostage-taking answers question 1 with "maybe broken"; pricing is hidden inside modals; raising a hand ends in the dead configurator.
**Should:** hero photograph answers (1) instantly; the work and the Squamish origin story answer (2); model cards with visible base prices answer (3) before any click — put "from $22,500" on the card face, not behind the modal, so the price question never becomes a click-commitment; the two-step modal answers (4). The quiet standing ask on every content page (§4) is "Start a conversation", never "Buy".
**Exit:** modal success panel → `/process/` → leaves knowing what week one looks like.

### J2 — Cold visitor → session booking (~$30 — the true top of funnel)
A $30 session is the cheapest possible way to *feel* the product. It is not the fourth card on the home page; it is the lowest rung of the ladder and should be reachable from every page in one click.
**Entry:** local search "sauna session Squamish", BAG foot traffic, Instagram.
**Questions:** (1) Can I try this without buying one? (2) When/where/how much? (3) Is it beginner-friendly?
**Now:** buried as fourth home card; nav "Book" → external site saying "closed during fire ban"; internal `/book/` says "offline while we rebuild" — three contradictory stories.
**Should:** one story everywhere (see §7). Sessions get a real presence on `/`: not louder, but *earlier* — a single restrained band after the hero sequence: photograph of the BAG flagship, one line on what a session is, price, one link. When live: link → `book.secretsaunacompany.ca`. When paused: link → `/book/` waitlist state (§7).
**Exit (live):** external booking, done. **Exit (paused):** email captured, expectation set.
This journey also feeds J1: a session is the strongest possible quote-request precursor. On the post-session follow-up (outside site scope, but note for David): the build story belongs there.

### J3 — Returning researcher comparing SSC vs Storm vs a barrel kit
**Entry:** direct or branded search, second/third visit. Often lands on `/saunas/`.
**Questions:** (1) What exactly do I get for the price difference? (2) Why not a $12K barrel kit? (3) Who stands behind it? (4) What's the catch?
**Now:** `/saunas/` opens with the barrel/infrared attack before showing any work — defensive posture; comparison content exists but leads.
**Should (matches Lee's fixed decision):** models first, comparison after. The comparison section reframes from attack to *specification*: side-by-side facts (wall assembly, heater class, warranty term, certification) rather than adjectives. A researcher on visit three doesn't want persuasion, they want ammunition to justify the decision they're already leaning toward — give them the spec sheet, the warranty term, and the certification in copy-pasteable form. Add a quiet "Compare in detail" anchor link from each model card to the comparison section so the researcher's path is one page, top to bottom.
**Exit:** configurator (they'll configure precisely — researchers love the modal) → two-step submit. Or the standing conversation ask.

### J4 — Commercial buyer
**Entry:** referral (The Good Sauna, Gatherwell, BAG, Sea Edge Hotel are the referrers' network), or search "commercial sauna builder BC".
**Questions (different order than residential):** (1) Have you done this at commercial scale before? (2) Throughput/durability under daily public use? (3) Certification and regulatory standing? (4) Service and support after install? (5) Then price.
**Now:** commercial buyers are funneled through the same residential flow; the four commercial names are the strongest proof SSC owns and they are not doing structured work.
**Should:** a `/commercial/` page (new). Sequence mirrors the question order: named installs first (the four clients, with whatever detail each has approved — **flag: Lee must confirm which clients may be named with photos vs. name-only**), then durability/duty-cycle facts, then third-party electrical certification, then service terms, then a dedicated ask: "Start a commercial conversation" → the contact form pre-selecting `project_type=commercial` via query param (`/contact/?type=commercial`, `navigation.js` sets the select). The configurator is residential-shaped; do not route commercial buyers into it — the SC model card links to `/commercial/` instead of opening the modal, or opens it with a banner link out. Decision for Jen/Lee; my recommendation: card → page, page → conversation. Commercial is sold in conversations, not configurators.
**Exit:** email conversation with context attached.

### J5 — Post-purchase owner (warranty, care)
**Entry:** direct, branded search "secret sauna warranty / cedar care".
**Questions:** (1) What does my warranty cover and how do I claim? (2) How do I maintain this? (3) Seasonal care (fire ban, winter)?
**Now:** nothing. Owners email Lee, which is fine at current volume but invisible proof-of-support to *prospects* (J3 and J4 both ask "who stands behind it").
**Should:** `/care/` (new, small): warranty terms stated plainly (2–5 year — **flag: exact terms per component from Lee, do not invent**), how to reach us for a claim (email), a short care guide (wood treatment cadence, heater maintenance, off-season). This page does double duty: it serves owners AND is the trust artifact J3/J4 link to. Link it from the footer and from the comparison section ("what ownership looks like").
**Exit:** email, or nothing needed — the page answered it. That is success.

---

## 3. The arrival sequence — the held photograph, fixed

Lee's instinct is architecturally correct: a threshold moment. In a sauna building you don't put the stove at the front door — you pass through a compression (entry, low light) into release (the room). But a threshold invites; it never restrains. The current scroll-lock (two forced gestures, 600ms cooldown, up to 10s timers, `touch-action: none`) is a locked door, not a threshold. The fix: make the hold *temporal and passive*, never *gestural and enforced*.

**The choreography (replaces `HeroIntroAnimation`, `head.njk:2-14` inline lock):**

1. **t=0** — page paints with the hero photograph full-bleed, alone. No nav, no heading, no scroll cue. The image is the whole first breath. Scroll is **never blocked** — a visitor who scrolls immediately gets the full page, and the entrance animations simply run as they arrive (scroll cancels the timed sequence and hands off to the normal reveal system).
2. **t≈1.2s** — the wordmark/nav fades in at the top (600ms ease). Quietly: the room has a host.
3. **t≈2.0s** — the hero heading and subline fade up (700ms, 80ms stagger). The image has had ~2 seconds unobstructed — long enough to register as intentional, short enough that nobody notices they waited.
4. **t≈3.0s** — a minimal scroll affordance appears (thin line or chevron, low opacity, gentle 4s loop). This is the invitation, not a gate.
5. **First scroll** — normal page. All subsequent sections use the existing IntersectionObserver staggered reveals (the "chunks, not a wall" pattern Lee praised in the mood board). One motion system below the fold, per Jen's audit: reveals only. No parallax, no slowZoom.

`prefers-reduced-motion`: everything renders immediately, fully composed, zero animation. Noscript: same (the existing noscript fallback pattern is kept).

**How the page earns the ask:** the first commitment request (the sessions band or "See the saunas" link) appears no earlier than section 2 — after hero + one proof/story chunk. The arc is: image (anticipation) → identity + origin (immersion) → work (evidence) → then the first rung of the ladder. Nothing asks in the first viewport except the hero's own single quiet link ("See the work" or similar — `[GEORGE]`), which is navigation, not conversion.

---

## 4. Conversion architecture — the commitment ladder

Asks work like heat: layered, quiet, and always opt-in. The ladder, lowest to highest:

| Rung | Commitment | Ask (quiet form) | Placement |
|---|---|---|---|
| 0 | Attention | none — just scroll | hero, all photography |
| 1 | ~$0 — read | "See the work" / "How we build" links | hero sub-link, section ends |
| 2 | ~$30 — feel it | "Book a session" | sessions band on `/` (post-hero), footer, `/book/` |
| 3 | ~$0 but identity — stay in touch | fire-ban waitlist email (§7); review campaign later | `/book/` paused state only — no site-wide newsletter; SSC has nothing to send yet |
| 4 | Serious intent | configurator → "Send Quote Request" | `/saunas/` model cards |
| 5 | Conversation | "Start a conversation" (contact form) | standing footer ask on every page + `/contact/` |
| 6 | Commercial engagement | "Start a commercial conversation" | `/commercial/` |

Rules:
- **One rung per surface.** No section carries two asks. The current home page ends correctly (single CTA section); keep that discipline everywhere.
- **Asks are text-weight, not light-weight.** Lee's constraint: no lighting up. Every ask is the existing `.btn-outline` or an underline-grow text link. The *position in the sequence* does the persuading, not the chrome.
- **Every page exits somewhere.** No page may end without exactly one downhill next step: `/` → sessions or saunas; `/saunas/` → configurator; `/process/` → conversation; `/about/` → process; `/care/` → nothing required (service page); `/commercial/` → commercial conversation. Dead-end pages are the configurator bug in slow motion.
- The ladder is skippable in both directions — a referral-armed commercial buyer lands on rung 6 directly. Never force descent (e.g., don't gate the contact form behind the configurator).

---

## 5. Trust sequencing — proof placed at the moment of doubt

Proof answers a question; a proof *page* answers nothing because nobody arrives holding all the questions at once. Place each artifact where its doubt occurs:

| Doubt (moment) | Proof | Placement |
|---|---|---|
| "Is this real?" (first 5s) | The photography itself + Squamish/BAG physical address in footer | hero, footer (every page) |
| "Are these people legitimate?" (home, mid-scroll) | Origin story (the hidden Squamish saunas, Finnish tradition — Lee's barbecue answer is the source) + named commercial clients as a quiet single line or logo-free text list | home craft/story section |
| "Is the build actually good?" (`/saunas/`, comparing) | Construction facts: wall assembly, materials, Finnish method specifics; third-party electrical certification named here | `/saunas/` after models, inside the reframed comparison |
| "What if it breaks?" (configurator, pre-ask) | One line under the price summary: warranty term + certification, linking to `/care/` | modal Step 1, below `.contact-note` |
| "Can I afford the jump?" (contact/process) | Staged payments — named as milestones on `/process/` (04-step structure), one line on `/contact/` | `/process/` primarily |
| "Have they done MY kind of project?" (commercial) | The four named installs, each with scope | `/commercial/` |
| "Do they stand behind it after?" (any late-funnel) | `/care/` page existing at all | footer, comparison, modal |
| "Do other owners love it?" | Testimonials — held until real attribution arrives from Lee's campaign; until then show two, not three, per Jen | home, `/saunas/` |

Sequencing rule: **certification and warranty appear before every ask, never after.** The modal is the key instance — one quiet line of proof directly above the "Request This Quote" button is worth more than a dedicated trust page.

**Flag for Lee:** exact warranty terms per component, the certification body's name, and which commercial clients may be named/photographed. None of these may be invented.

---

## 6. Mobile — where reflow isn't enough

Lee loved the mood board on mobile; the register survives reflow. Three places need genuinely different flows:

1. **The configurator.** A two-step modal on a 390px screen is a full-screen takeover; make it honest about that. On `max-width: 768px` the modal becomes a **full-screen sheet** with a sticky bottom bar: running total on the left, "Request This Quote" on the right, always visible while options scroll behind it (currently the total and button live at the end of a long scroll — the ask disappears exactly when the mobile user is deepest in options). Step 2 keeps the same sticky bar with "Send Quote Request". Fields get `autocomplete="name"` / `autocomplete="email"`, `font-size ≥16px` (iOS zoom guard already exists), and the notes field is optional and last so thumb-typing is never required to finish.
2. **The arrival sequence.** Identical choreography but timings compress ~25% (mobile attention is shorter): nav at 0.9s, heading at 1.5s, affordance at 2.4s. The hero image must be `w_828` srcset (per Jen §8) or the held moment is a held blur on cell connections — a slow-loading hero destroys the exact moment it exists to create. The held moment depends on LCP more than on animation.
3. **Navigation as journey map.** The mobile menu is the only place a phone user sees the whole site at once. Order it as the ladder, not alphabetically: Saunas / Sessions / Process / About / Commercial / Contact — with Sessions present even during the ban (→ `/book/` waitlist). Add the transition Jen specs (her §5); the flow requirement from my side is only the order.

Everything else (journeys, trust placement, ladder) reflows without redesign.

---

## 7. The booking situation — a seasonal state, designed once

The ban recurs; design it as a first-class state, not an apology. One story on all three surfaces (nav links, external booking site copy, internal `/book/`):

**`/book/` page, paused state (replaces the "offline while we rebuild" placeholder — that copy is wrong and reads as dysfunction):**
1. Photograph (session at BAG), held-moment treatment consistent with the site.
2. Plain state statement `[GEORGE — sessions are paused during the BC fire ban; wood-fired means fire, and we don't burn during a ban. They return when the ban lifts]`. This is a *credibility asset*: a wood-fired sauna company that respects fire bans is proof of seriousness. Say it with pride, not apology.
3. **The capture:** single email field + button "Tell me when sessions return". POST to Formspree (same endpoint, `_subject`: "Session waitlist"; or a second Formspree form ID if Lee prefers separation — flag). Success: inline confirmation, no navigation. This is rung 3 of the ladder — the only email capture on the site, placed exactly where intent exists and can't be served.
4. **The redirect downhill, not away:** "While you wait" — two quiet links: the gallery/work, and the saunas page ("the sessions run in saunas we built — see them"). A paused booking visitor is a warm sauna-curious local; some of them are future owners.
5. When the ban lifts: page flips to a single link out to `book.secretsaunacompany.ca` + session details. Implement as a data flag in `src/_data/site.json` (`features.sessionsPaused: true|false`) so the flip is a one-line change, because this will happen every summer.
6. The external booking site's own paused copy should match this register — outside repo scope, flag for Lee.

Waitlist obligations: when sessions resume, the captured emails must actually be told (gws send by Lee/Marvin). A waitlist that never writes back is the configurator bug wearing a different shirt. Note in ops.

---

## 8. Instrumentation — the events that prove this worked

Precondition: fix the CSP block first (`netlify.toml:65`, add `https://ssc-ops.netlify.app` to `script-src` + `connect-src`) — 16 days of zero data is how a zero-submission funnel stayed invisible. Nothing below matters until that ships.

Events (name — payload — the question it answers):

**Configurator funnel (the one that was invisible):**
- `configurator_open` — `{model}` — top of funnel
- `configurator_option_change` — `{model, addon}` — engagement depth (sampled/debounced; low value per-event, keep cheap)
- `quote_step2_view` — `{model, total}` — intent (clicked Request This Quote)
- `quote_submit_attempt` — `{model, total}`
- `quote_submit_success` / `quote_submit_error` — `{model, total, error?}` — **the number that must move off zero**
- `quote_restore` — `{model}` — stored config restored (validates preservation design)
- `quote_fallback_contact` — config banner shown on `/contact/` (fallback path still used?)

**Arrival & ladder:**
- `hero_hold_complete` vs `hero_hold_skipped` — `{ms}` — is the held moment being watched or skipped? This decides the hold duration empirically instead of by taste. **Re-based WP-1b (2026-07-31):** the scroll-lock hold was deleted per 21 N2, so the branch is now decided by the reveal choreography's settle boundary (1240ms = `--transition-reveal` + 2×`--stagger-step`) rather than by a timer: `skipped` = first scroll before the page settled, `complete` = first scroll after it or no scroll at all. `ms` is the time given to the photograph in both branches, which is what keeps the median usable — it now tunes the settle duration rather than a lock duration. The event fires once per page view. The payload key is `ms`, not `ms_before_scroll`; that name never shipped. **Amended 2026-08-06:** the 1240ms figure above is dead — its derivation assumed a last held member at `--i:2` (a scroll cue that does not exist; js/animations.js:50-55 records the error). Since Wave B-1 the hold is restored and the boundary is `SETTLE_MS` = 2720ms (`--hero-hold` 1600 + `--transition-reveal` 1000 + 1×`--stagger-step` 120); both branches report real elapsed `ms` from the choreography clock. The full, current reading protocol (retune sites, reduced-motion exclusion, cutover comparability) lives in the ROADMAP deferred entry "ANALYTICS READING NOTE — hero_hold_*" — read that, not this paragraph, before touching the metric.
- `sessions_band_click`, `book_page_view` — `{paused: bool}`
- `waitlist_submit_success` — the paused-state capture working
- `contact_submit_success` — `{source: direct|configurator_fallback|commercial}`
- `contact_submit_error` — `{source, error: rate_limited|rejected|network}` — **added 2026-08-06:** the contact form's failure paths joined the tripwire. Until then the contact client trusted `response.ok` alone (a 2xx with no `next` fired success and discarded the message — the shape proven live 2026-07-30) and its failures were a blocking `alert()` invisible to analytics. Same once-per-visible-failure contract as `quote_submit_error`; a streak of these on the contact path now means what a streak of quote errors means.
- `commercial_page_view`, `commercial_contact_click`

**Health checks (already-known failure classes):**
- `quote_submit_error` alerting: any occurrence is worth a look; a *streak* means the endpoint broke again — this event class is the tripwire that would have caught the original bug in a day instead of never.

Success criteria, 30 days post-launch: `quote_submit_success > 0` (literally any), step2→success conversion ≥60%, `hero_hold_skipped` median informs the settle duration (see the re-basing note in §8), waitlist captures > 0 during ban.

---

## Open flags for Lee (do not invent)
1. Reply-time promise for the quote success panel ("within X business days").
2. Formspree auto-reply on quote submissions — enable? (recommended)
3. Exact warranty terms per component; certification body name.
4. Which commercial clients may be named / photographed on `/commercial/`.
5. Separate Formspree form ID for the session waitlist, or shared endpoint with subject tag?
6. External booking site paused-state copy alignment (outside this repo).

## Cross-department handoffs
- **George:** every `[GEORGE]` marker — modal Step 2 labels, success/failure lines, `/book/` paused copy, sessions band line, `/commercial/` and `/care/` copy.
- **Jen:** modal Step 1↔2 transition treatment, mobile sticky bar visual, scroll affordance mark, `/commercial/` and `/care/` layout.
- **Saul:** the `/book/` paused-state photograph; sessions band image; commercial install photography (pending client permission).
- **Beatrice:** recap block + price summary type hierarchy in the modal (numbers must scan in four seconds for Lee too).
