# SSC Website -- Hand-off

**What this file is:** the volatile layer. What is in flight, what is owed, what is waiting on
Lee, and a short log. It is safe to rewrite *because nothing permanent lives here any more.*

**Where everything else went** (restructured 2026-08-21):

| You want… | Read |
|---|---|
| Rulings, pins, operating constraints — anything decided | `.claude/DECISIONS.md` — **append-and-amend only** |
| Named work not yet scheduled | `ROADMAP.md` → **Parking Lot** |
| What shipped, and when | `ROADMAP.md` → `shipped` |

**Read `.claude/DECISIONS.md` before proposing anything.** Most of what looks like a fresh idea
in this project has already been ruled on, usually for a reason that is not obvious from the code.

---

## Owed right now

- **Wave B's three Lee-feedback priorities (from the 2026-08-01 review) do not yet show as shipped** in ROADMAP's shipped log or ARCHITECTURE docs -- verify status before assuming any are done: the hero-first reveal regression, the `/saunas/` page order, and the spacing/container rhythm. The rulings behind all three, and the process lesson attached to the first, are in `.claude/DECISIONS.md`.
- **Four product decisions still open** (see Open Questions below) -- these block WP-3/WP-4 copy and page work along with the doc-20 fact answers.

- **Post-deploy verification owed** for the 2026-09-02..04 refresh: one /ops auth round-trip, watch the hero arrive on the homepage, one look at the /locations/ map with the CARTO key. None done at close.

- **Visual-diff waivers expire 2026-10-05.** 18 `expectedToChange` entries; the harness refuses to start after that date. Advance the baselines (a pixel run is owed anyway for 11 routes) or renew before then.

- **rhythm.test.mjs crashes** on `/process/`, a meta-refresh stub in its page list. The suite is red until the route is dropped or the stub becomes a page.

- **Relay ssc-website-copy-followups in flight** (branch `relay/website-copy-followups` from 29ad824, plan and pack in worktree marvin/session-691205). Ted implementing; Razor, Jen, 3.5 and close belong to this session. The push to main is a live deploy and waits for Lee's yes.

## Open questions awaiting Lee

| Question | Why it matters | Raised |
|----------|---------------|--------|
| Formspree dashboard: confirm 4 test submissions visible, set 90-day auto-delete | PIPA retention requirement (Petra item 3) | 2026-08-01 |
| One real quote test from Lee's phone, personal email | Closes the receipt-gate final inch -- Formspree silently 200s on discarded owner-address/draft-origin submissions | 2026-08-01 |
| Nav mark E1 -- Saul's version of Lee's logo (unmerged branch `relay/redesign-wave-a-mark`) | Product decision, intentionally unmerged pending Lee | 2026-08-01 |
| Favicon | Product decision | 2026-08-01 |
| Speaker mounting copy | Product decision | 2026-08-01 |
| Package-audio +$500 upsell | Product decision | 2026-08-01 |
| Doc 20 fact answers (process page, warranty terms + certifying body, design-deposit decision, per-model price display, 5 smaller copy calls) | Unblocks WP-3/WP-4 | 2026-08-01 |
| Does Lee own secretsaunacompany.com? | Determines 301 vs. squatter risk. **secretsaunacompany.com** (the .com, not .ca) is a parked registrar lander redirecting to AWS parking IPs -- not owned-and-pointed. If Lee owns it, 301 to the .ca; if not, someone is squatting the obvious typo. Still needs Lee's answer. | 2026-08-01 |
| First manual funnel check (`quote_submit_success` count via Supabase MCP) | Was due 2026-08-07 -- confirm it happened | 2026-08-01 |
| Mobile configurator CTA: 152 configurator opens since the 2026-08-09 deploy and ZERO step-2 views (prior rate ~5%). Funnel and instrument both verified working from production. On a 390px phone the CTA sits 4,454px into a 4,945px scrolling modal and the sticky total bar has no CTA. Put a CTA in the sticky bar, or restructure step 1? (resolved 2026-09-04) | Every mobile quote since 2026-08-09 has died on step 1; the cause of the exact zero at the deploy boundary is not established | 2026-09-03 |
| Replacement address for the LocalBusiness schema (38918 Progress Way is still live in head.njk), or no street address at all? (resolved 2026-09-04) | Google reads it as the business location; it is wrong today | 2026-09-02 |
| Four proposed DECISIONS entries from the 2026-09-02..04 refresh await approval: CARTO keyed basemap as an operating constraint; never `git add -A` after a suite that mutates the tree and never let that suite be what a timeout kills; cold plunge removed sitewide; fixed photo backgrounds removed everywhere but Contact (doc 10 §2.3). Plus, from the copy-followups relay: no em dashes in rendered prose; separator dashes pending a house-style ruling. (resolved 2026-09-04) | Rulings a future session could violate without knowing; unwritten until Lee says yes | 2026-09-04 |
| Residential map pins are #4A90E2, a blue from no token in the design system. Recolour to a system token, or leave? | Only off-system colour left on /locations/ after the refresh | 2026-09-04 |

---

## Log (newest first)

### 2026-09-04 (rulings)

Lee approved the five recommended rulings from the 2026-09-02..04 refresh and the copy relay in one batch; all five written below through the writer. The sixth item, separator dashes in process-step titles, testimonial bylines, add-on labels and price placeholders, carried no recommendation and stays parked for a house-style ruling (the copy relay's 3.5 indexes it in the Parking Lot with the four pinned locations).

### 2026-09-04 (later)

Lee: the business location becomes the BAG. LocalBusiness schema in head.njk now carries 41950 Government Road, Brackendale, BC V0N 1H0 (postal code from the two signed BAG agreements; OSM says V0N 1T0 for the same node, contract wins), the gallery's OSM coordinates, and a hasMap link to that address. openingHours dropped: the Mo-Fr 09:00-17:00 was shop hours and session times live in the booking app. The mobile configurator CTA question is closed as a question and tracked in the Parking Lot as a Wave B item, per Lee.

### 2026-09-04

Code-refresh 2026-09-02..04 closed and merged (branch `refresh/2026-09-02`, main at 88ef1f0, then 29ad824 with the hero copy from session-691205). What shipped is in ROADMAP `shipped`. Two DECISIONS entries written with Lee's approval during the session: the S2 AI-named files are real photographs (evidence correction) and the Brackendale Art Gallery is named on the landing page (product ruling). Four more candidates were discussed, not ruled: they sit in Open questions until Lee says yes.

Incident, on record so it is never repeated: a 10-minute timeout killed `models-json-selftest.mjs` between its M16 mutation and its restore, leaving `exteriorYakisugi: 5000,` deleted from S2 in `js/data.js`; a later `git add -A` swept that into unrelated commit 54d98ec and it was pushed. The S2 under-quoted yakisugi cladding by $5,000 in production for about a day (from 2026-09-03). Caught when models-json-roundtrip went red, reproduced three times, restored in 35e8f18; all 12 mutation anchors and the canonical ~/marvin models.json verified untouched. Two lessons: never `git add -A` after a suite that mutates the tree, and never let that suite be the one a timeout can kill.

Creative review (five Fable specialists) raised ~86 findings; the handful applied are in the shipped entry, the rest are indexed in the ROADMAP Parking Lot under `### Deferred from the 2026-09-02 code-refresh and creative review`. Lee's closing challenge, whether changes were grounded in the brand guidelines or made for their own sake, was checked against doc 10 §2.3 (lines 78-79): the background-layer removal executes an approved July spec; the BAG naming, cold-plunge removal and map changes were Lee's own directives.

Lee's presentation preference recorded as memory: artifacts are the default for anything visual; he reads in a terminal and cannot see sent images.

Next: relay ssc-website-copy-followups, handed to this session by session-691205 at ~15:00 PT. Ted implementing on `relay/website-copy-followups`; Razor, Jen, 3.5 and close from here; push waits for Lee.

### 2026-08-21
Hand-off restructured by lifetime, per the MARVIN convention (`fern 91b4db1`): standing
decisions extracted to `.claude/DECISIONS.md`, deferred work consolidated into the ROADMAP's
Parking Lot, this file cut to the volatile layer. The prior hand-off lived untracked in the
primary checkout and was the only copy of the "confirm against Lee's stated likes" process
lesson. Design and process decisions from the Wave A review: see `DECISIONS.md`.

### 2026-08-01
- **2026-08-01 -- Wave A closed, Wave B queued.** Written at Lee's instruction after his review of the live Wave A deploy. Wave A shipped 2026-07-31: rebuilt quote funnel (two-step modal), 19-row repricing (Save $500 true by construction), type/colour token system, truthful privacy page, ten instrument suites with zero waivers. Lee's review: it wasn't the visible transformation he expected -- composition (WP-2), copy (WP-3), and new pages (WP-4) are Wave B, and the nav badge / headline prices were deliberately unchanged (logo veto, repricing targeted add-ons not model bases). His three concrete feedback items became this file's top Standing Gate: hero-first reveal regression, `/saunas/` page order, spacing rhythm.

Design decisions from this batch: see `DECISIONS.md` → Product rulings.

Since this hand-off: the Cloudinary migration shipped (2026-08-09, self-hosted 68 assets ahead of the account's 2026-08-15 deactivation) and service-area copy edits landed (2026-08-10). Neither is a Wave B composition/copy/pages item -- WP-2/WP-3/WP-4 and the three Lee-feedback priorities above have not been confirmed shipped. Verify against ROADMAP's shipped log and the live site before reporting Wave B status.

**Cloudinary account can be deleted post-2026-08-15** -- migration is complete, zero references remain in the codebase (verified as part of the 2026-08-09 shipped work).
