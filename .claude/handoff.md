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

- **ROADMAP frontmatter is stale.** `status: deploying` / `current` still describe Wave A as "pending deploy" (2026-07-31), but Wave A has been live since that date and further work has shipped since without updating these fields: the Cloudinary migration (2026-08-09, self-hosted 68 assets off a Cloudinary account that hit 264% quota and was scheduled for deactivation 2026-08-15) and service-area copy edits (2026-08-10, on branch `relay/cloudinary-migration` -- merged to main, working tree clean). Update ROADMAP before trusting `current`/`status` for reporting.
- **Wave B's three Lee-feedback priorities (from the 2026-08-01 review) do not yet show as shipped** in ROADMAP's shipped log or ARCHITECTURE docs -- verify status before assuming any are done: the hero-first reveal regression, the `/saunas/` page order, and the spacing/container rhythm. The rulings behind all three, and the process lesson attached to the first, are in `.claude/DECISIONS.md`.
- **Four product decisions still open** (see Open Questions below) -- these block WP-3/WP-4 copy and page work along with the doc-20 fact answers.

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

---

## Log (newest first)

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
