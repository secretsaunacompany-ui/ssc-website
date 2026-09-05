# Grill: the doc 20 answers that unblock Wave B

**Date:** 2026-09-05
**Goal:** get the process, warranty and small-ones facts out of Lee's head so WP-4 (/process/, /commercial/, /care/), WP-3 copy and the rest of WP-2 can run as relays instead of waiting.
**Status:** confirmed (gate R4, 2026-09-05, "Yes, this is it")
**Mode:** standalone

Source document: `docs/redesign-2026-07/20-fact-gathering-questions.md` (50 questions).

**The finding that reshapes this grill (after round 1):** Lee already answered doc 20 on 2026-08-02, in three rounds, dictated and transcribed at `~/marvin/state/ssc-website-doc20-lee-answers-2026-08-02.md` ("DOC 20 STATUS: fully answered except C39-45 and B32"). The website ROADMAP was never updated and still lists Wave B as blocked on those answers. So the frontier is not "answer doc 20"; it is (a) reconcile the few places where today's round 1 taps differ from the August dictation, (b) the handful of decisions the dictation left open, and (c) route the two false claims on the live site and the warranty reconciliation to a relay.

## Summary / key decisions
<!-- rewritten from scratch after every round -->
- Payment schedule is 30/30/30/10 on every build; the first 30% holds the slot and starts design. (Aug 2; confirmed R1, recommended taken.)
- First contact is a call. A site visit is free within the Sea-to-Sky and Lower Mainland; farther out it is charged as part of the design deposit. The consultation ends in a number and an estimate, maybe a hand sketch; no 3D model before the deposit. (R2, Lee overrode the August "distance no problem" line; the page draws the line.)
- Design stage: screenshots of the model after the deposit; "two to three rounds" of revision, no fee line. (R2, recommended taken.)
- Booking horizon is not published; the usual delay (heater and window lead times) is named. (R1, Lee overrode: "Name the delay, no horizon".)
- Warranty: the trailer is excluded entirely on trailer builds, including SSC's own frame work; the live page's "SSC-fabricated skid or trailer frame" line comes out. (R2, Lee overrode; matches his Aug 2 dictation.)
- Warranty text to publish: claims by email answered within two weeks; the warranty does not transfer on sale; residential use only, commercial or rental use needs written terms. Pierre reviews the full warranty set once before it goes live. (R2, recommended taken.)
- About page team phrase: "a small crew in Squamish". (R3, recommended taken.)
- Homepage testimonials: cut to the two strongest, attributed as "Client", no place claim, until named reviews exist. (R3, recommended taken.)
- Case studies: the two approved outreach drafts (Emmanuel, Jon) have not been sent; MARVIN resends them to Lee for a final look this week, Lee sends, Clarke by message. WP-6 stays parked until replies land. (R3, recommended taken.)
- A /commercial/ page uses the names, photographs and links the locations page already shows, BAG in the lead position; no fresh ask to the partners. (R3, recommended taken.)
- Copy corrections that follow from facts, no decision needed: the electrical "third-party certification, documentation in your name" claim is rewritten to what happens (SSC's electrician inspects the stove install, fits the transformer box and pulls a permit the client's electrician connects to); the "ships with a detailed owner's manual" claim comes out until the manual ships; WETT wording follows the SOP's allowed phrases.

## Facts established
<!-- looked up by sub-agents, never asked -->
- **Doc 20 is answered.** `~/marvin/state/ssc-website-doc20-lee-answers-2026-08-02.md`: A1-A18 (intake needs indoor/outdoor, budget, dimensions, crane access; call default; free through consultation; number + estimate, no 3D pre-deposit; screenshots post-deposit; 2-3 revisions; 30/30/30/10 holds a slot; progress by walkthrough; client owns electrical, site prep, permits, crane; SSC arranges delivery and quotes it separately, up-charge; local deliveries accompanied with a week to report small defects; arrives by crane; biggest surprises are crane access and a proper pad; handover is a walkthrough, no manual yet). B24-B38 (2yr cosmetic incl. siding, bench tops, accent walls, electrical; 5yr structural incl. benches, framing; starts at delivery/final payment; glass NOT covered but SSC covers the seal; trailer not covered on trailer builds; void by abuse or clear human error; greying/checking/movement expected; heater is the manufacturer's; claims by email, response within a week or two; no transfer). D47 (Good Sauna, Gatherwell, BAG likely willing; BAG is the one to direct business to), D48 (real laser file: `~/Downloads/CircleBlackBC2026laser.svg`), D49 (session $45 then; now $35 to Sep 30, $45 after), D50 (fire ban pauses all sessions; moot now).
- Still open after Aug 2: B32 (Homecraft/Harvia manufacturer terms: SSC asks them, not Lee), C39-45 (case studies: outreach emails to Emmanuel and Jon were approved as drafts 2026-08-02; Clarke in person), headcount phrasing, interim testimonials, per-venue photo permission for a /commercial/ page.
- Warranty has four incompatible written versions (live page, faq.json, Aug 2 dictation, Thunderbird contract); `~/marvin/content/reference/operations/warranty-benchmark-2026-08.md` names three and recommends Pierre review; commercial/rental use is unaddressed everywhere; BC Sale of Goods Act makes published durations a floor. Live page covers the SSC-fabricated skid/trailer frame for 5 years; Aug 2 excludes the trailer entirely.
- Two false claims live on warranty.njk: "third-party electrical inspection and certification… you receive full documentation" (reality per Lee: SSC's electrician inspects the stove install, fits the transformer box and pulls a permit the client's electrician connects to; no certificate in the client's name) and "every sauna ships with a detailed owner's manual" (drafted at `~/marvin/content/reference/owners-manual/`, warranty table blank, never shipped).
- WETT: SOP 2026-03-27 says every wood-fired build is WETT-inspected before handoff (~$200 absorbed; inspector Mike, Joe's Fireplace); Lee's Aug 2 ruling: all wood-fired builds designed WETT-certifiable from now on, insurers always ask. Marketing language allowed: "independently inspected by a WETT-certified technician"; never "WETT certified sauna" or "CSA certified".
- Heater terms on file: Homecraft 2-year (relationship-summary.md:130); Harvia none on file, only notes (commercial use voids; +1yr on registration within 30 days). Kuuma publishes no residential warranty; IKI's terms are Finland-only. The live page names all five brands.
- Headcount = the About line's team phrasing ("Lee and Anthony" / "a small crew" / "two builders"), George doc 13 item 5. Not capacity.
- Blog: already gone from `src/` (no blog templates render); the doc 13 question is moot.
- Testimonials: no attributable client testimonial on file; three "Private Client, Squamish BC" quotes on the homepage; zero Google reviews (local-seo-action-plan.md).
- Reply time, tax, build duration, WiFi controller, nav mark, intake fields: answered 2026-07-28 (doc 20 Answers received).
- Session price and fire ban: see above; schema address answered 2026-09-04.

## Rounds
### Round 1
- Q1: How does a first consultation run, and is it free? | Rec: Call first, free visit close, farther folded into the design fee | Answered: recommended | Flags: conflicts with Aug 2 dictation (distance no problem, free through consultation); reopened R2
- Q2: Is 30/30/30/10 standard, and does the first payment hold a slot? | Rec: 30/30/30/10 for all builds, holds the slot and starts design | Answered: recommended | Flags: matches Aug 2; reclassified-as-fact
- Q3: What does the client see from SketchUp, how many rounds? | Rec: rendered views as PDF, two rounds, more at the design fee | Answered: recommended | Flags: partly conflicts with Aug 2 (2-3 rounds, no hard rule); reopened R2
- Q4: Publish a booking horizon and name the usual delay? | Rec: publish a lead time you update, name heater lead times | Answered: "Name the delay, no horizon" | Flags: overrode-rec

### Round 2
- Q1: Site visits, August vs R1 | Rec: August stands, any visit free | Answered: "Free nearby, farther in the design fee" | Flags: overrode-rec
- Q2: Revision rounds | Rec: "two to three rounds", no fee line | Answered: recommended | Flags: none
- Q3: Trailer coverage, live page vs August | Rec: frame covered, running gear excluded | Answered: "Trailer excluded entirely" | Flags: overrode-rec; live warranty page must change
- Q4: Claim response, transfer, commercial use, Pierre | Rec: publish all three, Pierre first | Answered: recommended | Flags: none

### Round 3
- Q1: Headcount phrase | Rec: "a small crew in Squamish" | Answered: recommended | Flags: none
- Q2: Interim testimonials | Rec: keep two, attributed "Client" | Answered: recommended | Flags: none
- Q3: Case-study outreach status | Rec: not sent, send this week | Answered: recommended | Flags: MARVIN owes the resend of the two approved drafts
- Q4: Venue photos on /commercial/ | Rec: use what locations already shows | Answered: recommended | Flags: none

## Open flags -> owner
| Flag | Owner | Route |
|---|---|---|
| Consultation distance: Aug 2 vs R1 | Lee | R2 |
| Revision rounds: Aug 2 vs R1 | Lee | R2 |
| Trailer frame coverage: live page vs Aug 2 | Lee | R2 |
| Publish claim response, transfer, commercial-use line; Pierre review | Lee | R2 |
| Headcount phrasing | Lee | R3 |
| Interim testimonials | Lee | R3 |
| Case-study outreach status (Emmanuel, Jon, Clarke) | Lee | R3 |
| Per-venue photo permission for /commercial/ | Lee | R3 |
| B32 heater manufacturer terms | MARVIN | ask Homecraft/Harvia directly, draft candidate |
| Two false claims on warranty.njk | relay | WP-3 copy fix, does not wait for the warranty ruling |
| ROADMAP `next` says Wave B is blocked on doc 20 | MARVIN | rewrite at close; it is not |

### Round 4 (gate)
- Q1: Does the summary read as what you meant? | Rec: Yes | Answered: recommended | Flags: confirmed

## Graduation (proposed)
- DECISIONS.md (evidence correction): **Doc 20 was answered by Lee on 2026-08-02; the transcript at `~/marvin/state/ssc-website-doc20-lee-answers-2026-08-02.md` is the source, and Wave B is not blocked on facts.** Why durable: the ROADMAP carried the "blocked on doc 20" line for a month after the answers existed, and a future session reading the ROADMAP alone would re-ask.
- DECISIONS.md (product ruling): **The warranty excludes the trailer entirely on trailer builds, does not transfer on sale, and covers residential use only; commercial or rental use needs written terms.** Attribution Lee 2026-09-05 (R2), with the August dictation as the origin. Why durable: four incompatible versions exist and the live page says the opposite on the trailer.
- DECISIONS.md (product ruling): **A site visit is free within the Sea-to-Sky and Lower Mainland and charged as part of the design deposit farther out; consultation ends in a number and an estimate, never a 3D model.** Lee 2026-09-05 (R2). Why durable: it reverses the August "distance no problem" line, and copy will quote it.
- DECISIONS.md (product ruling): **Testimonials without a named client are attributed "Client" and capped at two until named reviews exist.** Lee 2026-09-05 (R3). Why durable: the place claim would drift back in.
- DECISIONS.md (operating constraint): **The warranty page does not change without Pierre reading the full set once.** Lee 2026-09-05 (R2). Why durable: BC Sale of Goods Act treats published durations as a floor; a copy relay must not rewrite it alone.
- Not proposed as rulings (copy facts George works from the transcript): 30/30/30/10 (already in the templates), two-to-three revision rounds, no booking horizon, "a small crew in Squamish", the certification and manual corrections, WETT wording (SOP already governs).
- Owed work (hand-off): resend the two approved case-study outreach drafts to Lee for a final look; ask Homecraft and Harvia for their written warranty terms (B32); rewrite ROADMAP `next` so Wave B is no longer described as blocked on doc 20.
- Plans: (1) WP-3 copy fix relay: the two false claims on warranty.njk and faq.json, testimonials to two "Client", the About team phrase; no warranty-term changes. (2) Warranty rewrite: George drafts from the transcript plus R2, Pierre reviews, then a relay. (3) WP-4 /process/ page: George drafts from the transcript plus R1/R2 (visit line, rounds, delay named, no horizon), Jen's spec, then a relay; /commercial/ from the locations venues; /care/ from the owner's-manual draft, which also needs its warranty table filled from the same ruling.
