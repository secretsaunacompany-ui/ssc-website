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

- **Four product decisions still open** (see Open Questions below) -- these block WP-3/WP-4 copy and page work along with the doc-20 fact answers.

- **rhythm.test.mjs crashes** on `/process/`, a meta-refresh stub in its page list. The suite is red until the route is dropped or the stub becomes a page.

- **Re-run `npm run visual-diff` after the hero deploy** so the three refused residuals on `/` (1440 shiftCoverage 0.799; 390 layoutShiftMaxPx 454, coverage 0.909) retire against the new main; if any survives, it is a finding, not the expected residual.

- **Resend of the case-study drafts is done as a pointer:** both approved drafts (to Emmanuel, to Jon, dated 2026-08-03) are still in Lee's Gmail Drafts, unsent. Lee sends; Clarke by message. WP-6 stays parked until replies land.

- **Ask Homecraft and Harvia for their written warranty terms (doc 20 B32)** so the warranty page can name what the manufacturer covers; Homecraft is 2 years per the relationship summary, Harvia has nothing on file.

- **Pierre reads the full warranty set once** before the warranty rewrite goes live (Lee 2026-09-05).

- **Retire the 18 visual-diff `expectedToChange` waivers.** After the hero deploy the harness reports every one of them firing on ZERO compared pages (their changes are all in the baseline now), and the loader refuses to start after 2026-10-05. Deleting them is a config-only commit; do it before the next visual relay.

## Open questions awaiting Lee

| Question | Why it matters | Raised |
|----------|---------------|--------|
| Formspree dashboard: confirm 4 test submissions visible, set 90-day auto-delete | PIPA retention requirement (Petra item 3) | 2026-08-01 |
| One real quote test from Lee's phone, personal email | Closes the receipt-gate final inch -- Formspree silently 200s on discarded owner-address/draft-origin submissions | 2026-08-01 |
| Nav mark E1 -- Saul's version of Lee's logo (unmerged branch `relay/redesign-wave-a-mark`) | Product decision, intentionally unmerged pending Lee | 2026-08-01 |
| Favicon | Product decision | 2026-08-01 |
| Speaker mounting copy (resolved 2026-09-05) | Product decision | 2026-08-01 |
| Package-audio +$500 upsell (resolved 2026-09-05) | Product decision | 2026-08-01 |
| Doc 20 fact answers (process page, warranty terms + certifying body, design-deposit decision, per-model price display, 5 smaller copy calls) (resolved 2026-09-05) | Unblocks WP-3/WP-4 | 2026-08-01 |
| Does Lee own secretsaunacompany.com? | Determines 301 vs. squatter risk. **secretsaunacompany.com** (the .com, not .ca) is a parked registrar lander redirecting to AWS parking IPs -- not owned-and-pointed. If Lee owns it, 301 to the .ca; if not, someone is squatting the obvious typo. Still needs Lee's answer. | 2026-08-01 |
| First manual funnel check (`quote_submit_success` count via Supabase MCP) | Was due 2026-08-07 -- confirm it happened | 2026-08-01 |
| Mobile configurator CTA: 152 configurator opens since the 2026-08-09 deploy and ZERO step-2 views (prior rate ~5%). Funnel and instrument both verified working from production. On a 390px phone the CTA sits 4,454px into a 4,945px scrolling modal and the sticky total bar has no CTA. Put a CTA in the sticky bar, or restructure step 1? (resolved 2026-09-04) | Every mobile quote since 2026-08-09 has died on step 1; the cause of the exact zero at the deploy boundary is not established | 2026-09-03 |
| Replacement address for the LocalBusiness schema (38918 Progress Way is still live in head.njk), or no street address at all? (resolved 2026-09-04) | Google reads it as the business location; it is wrong today | 2026-09-02 |
| Four proposed DECISIONS entries from the 2026-09-02..04 refresh await approval: CARTO keyed basemap as an operating constraint; never `git add -A` after a suite that mutates the tree and never let that suite be what a timeout kills; cold plunge removed sitewide; fixed photo backgrounds removed everywhere but Contact (doc 10 §2.3). Plus, from the copy-followups relay: no em dashes in rendered prose; separator dashes pending a house-style ruling. (resolved 2026-09-04) | Rulings a future session could violate without knowing; unwritten until Lee says yes | 2026-09-04 |
| Residential map pins are #4A90E2, a blue from no token in the design system. Recolour to a system token, or leave? | Only off-system colour left on /locations/ after the refresh | 2026-09-04 |
| One look at the new hero on your phone with Safari's toolbar up: does the Book a Session button sit above the toolbar? (Deployed 2026-09-05, ac4fb9a.) | The svh guard cannot be proven headless; Jen and Razor both left this to a real device | 2026-09-05 |
| **Cold plunge vs the /squamish/ intro photograph.** Two of your own rulings collide. 2026-09-04: cold plunge is not offered and is not mentioned anywhere on the site -- Jen excluded four hero frames on exactly this ground, all showing galvanised stock tanks. 2026-09-05: this photograph stays, you like it. Brightening it to fix its false alt turned up **two galvanised stock tanks clearly visible behind the trailer**. A photograph is arguably a depiction rather than a mention, and it predates this relay, so nothing was changed but the alt, which names no tank. Options: leave it (the tanks are dim and off to one side); swap the photograph; or narrow the ruling to say it governs words, not incidental background. **Recommendation: leave it and narrow the ruling** -- the frame is dark and the alternative is losing a photograph you like over an object no visitor reads as an offer. Reversible; nothing breaks if you do nothing. (resolved 2026-09-07) | A live page carries an object a standing ruling says is not offered | 2026-09-06 |
| **Three intro alts name third-party venues** -- `src/vancouver.njk:14`, `src/north-shore.njk:14`, `src/sea-to-sky.njk:14`. This is doc 20 Q47 and only you can answer it: do we have permission to name those businesses in alt text on our own marketing pages? The hero alts written in this relay all claim no venue; these three are pre-existing intro-block alts that do. | Naming a third party's business on our page is a permission question, not a copy one | 2026-09-06 |

---

## Log (newest first)

### 2026-09-07 -- Lee ruled on the /squamish/ photograph; no code change

His words: "I don't mind there being a little bit of contradiction between the photo and the words. We don't need to explicitly state that there are cold plunges in the photo, and that's not obvious what they are. So we can leave it ambiguous as the sauna at night photo description."

The shipped alt already is exactly that -- "A cedar clad sauna on its trailer at night, its siding lit from off to one side." It describes the frame, claims no town, venue or client, and names no tank. So the 2026-09-04 cold-plunge ruling and the 2026-09-05 keep-the-photograph ruling are both satisfied as they stand, and the question comes off the open list without a commit against it.

The related item that STAYS open is the different one: three intro alts name third-party businesses (`src/vancouver.njk:14`, `src/north-shore.njk:14`, `src/sea-to-sky.njk:14`). That is doc 20 Q47, a permission question rather than a copy question, and only Lee can answer it.

### 2026-09-06 -- relay `ssc-website-sub-page-heroes` closed on its branch

16 commits, not merged, not pushed. Seven pages open on a photograph again, in the composition doc 10 s2.3 specified and never got.

Two defects were found after first implementation and both were mine. C1: the scrim's stops were percentages of a box that ranges 384-736px while the type is bottom-anchored, so on any viewport 640px tall or shorter /vancouver/'s h1 read 3.51:1; fixed by anchoring the gradient in px above the bottom edge. B1: `mask-image` made the scrim's pseudo-element a stacking context, so it painted OVER the heading at every width >= 1440 on all seven pages -- and roughly seven hundred contrast measurements could not see it, because every one sampled the backdrop with the type hidden, which is structurally blind to it.

A new gate came out of that: `npm run stacking:check` samples RENDERED GLYPH pixels and carries two negative controls that must fail, so it cannot pass vacuously. Four false alt texts were corrected along the way, two of them found only because a reviewer looked at the actual photographs.

**Three separate 'clean tree' claims in this relay were unsound** -- two of Razor's (an unconditional `&& echo`, and `$?` read after a pipe) and one of mine (untracked files another agent had written into my worktree). Nobody was careless; the check is just easy to get wrong. `git status --porcelain | wc -l` is the version that cannot lie, and it is worth adopting everywhere.

### 2026-09-05 (close)

Session closed with /save and /update: session branch refresh/2026-09-02 equals origin/main at 87a964b, both relays merged and shipped (copy follow-ups 69328a1, hero composition C ac4fb9a), relay/website-copy-followups deleted, relay/hero-composition-c still checked out in the relay-copy-followups worktree (clears with /housekeeping). Wave B picks up next session from ROADMAP `next`: the warranty copy fix first.

### 2026-09-05 (later)

Hero relay pushed to main at ac4fb9a on Lee's yes. Grill on the doc 20 leftovers run and confirmed (`.claude/grills/2026-09-05-doc-20-wave-b-facts.md`): the finding was that Lee had answered doc 20 on 2026-08-02 (`~/marvin/state/ssc-website-doc20-lee-answers-2026-08-02.md`) and the ROADMAP had carried 'blocked on doc 20' for a month regardless. Lee settled the leftovers (site-visit line, revision rounds, no horizon, trailer excluded, warranty text + Pierre, 'a small crew in Squamish', two testimonials as 'Client', commercial page reuses the locations venues) and approved five rulings, written below. Wave B is unblocked: next relays are the warranty-page copy fix, the warranty rewrite through Pierre, and the /process/ page with /commercial/ and /care/ behind it. Speaker mounting copy and the package-audio upsell questions are closed as overtaken (audio is a configurator line already; speaker copy rides the care page).

### 2026-09-05

Copy relay pushed to main at 69328a1 on Lee's yes (2026-09-04, "lets go with all of your recommendations") and verified live: new search description, BAG schema address, real heat on /locations/, keyed map tiles with the gallery pin on top, /ops answering, /book redirecting. Ledger: merged, shipped.

Landing hero relay ssc-website-hero-composition-c run end to end in this session: Lee saw the 29ad824 hero live and disliked it; five-specialist ideation (Jen four rendered compositions, George eight thesis lines) went out as the artifact The Held Photograph; Lee chose composition C, kept the headline, cut the subtitle, kept one button, approved the filter and scrim removal. Plan gated by two Fable critic rounds (FAIL then CONCERN, nine must-fixes folded, including the iOS toolbar guard and the twinned-anchor declaration). Ted built it; Jen's Stage 3 found the gradient too weak for a three-element block (h1 1.55:1), the hero letterboxed by section padding since forever (also eating 252px of the sticky runway), and the mobile gradient painting under the image on main; she ruled exact values, Ted folded them (h1 4.25:1 / 4.94:1, full-bleed, runway 630px), then brought the rhythm suite to the new rulings. Razor on the final diff; push waits for Lee.

Next: Lee's yes on the push; his phone look; visual-diff re-run; then the Wave B items and the CTA question in the Parking Lot.

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
