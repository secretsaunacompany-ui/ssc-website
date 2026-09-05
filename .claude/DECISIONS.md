# SSC Website — Standing Decisions

**Write rule: APPEND AND AMEND. Never rewrite, never delete.**

A decision leaves this file only by being explicitly reversed, and a reversal is written
*into* the entry it reverses — struck through, dated, with the reason. Nothing here is
removed because it looks stale, because a rewrite felt cleaner, or because the reader
doesn't recognise it. If an entry seems wrong, that is a reason to investigate it, not to
delete it.

**Why this file exists.** It was extracted from `.claude/handoff.md` on 2026-08-21 as part
of the fleet restructure after the Fern near-miss of 2026-08-16; this hand-off was untracked
and held the project's only copy of a permanent process lesson. An untracked file in the
primary checkout is one `git clean` or one careless rewrite away from gone, and the lesson it
carried — that a brief built from audits never swept Lee's stated preferences — is exactly the
kind of thing a future session would otherwise re-learn the expensive way. Permanent content
now lives here, where rewriting is not a thing anyone does.

**Scope.** Decisions and permanent operating constraints. Not work-in-flight (that is
`.claude/handoff.md`), not scheduled-or-parked work (that is `ROADMAP.md`).

---

## Product rulings

### Hero-first reveal — `HeroIntroAnimation` stays dead; the fix is a delayed `.reveal` stagger, not resurrecting old code
*2026-08-01, per Lee*

**Hero-first reveal regression** -- Lee wants the pre-Wave-A effect restored (hero image arrives first, unobstructed, then header/title stagger in over it). `HeroIntroAnimation` stays dead; the fix is a delayed `.reveal` stagger, not resurrecting old code.

### `/saunas/` must lead with the model index
*2026-08-01, per Lee*

**`/saunas/` page order** -- must lead with the model index. Live page still ran comparisons → science → models as of the 2026-08-01 review (confirmed against doc 10 §3.2, which already specifies the correct order -- WP-2 executes it, no redesign needed).

> Status — whether WP-2 has actually shipped — is tracked in `ROADMAP.md`, not here. This
> entry records only what was decided.

### Spacing rhythm is doc 10's section grammar plus the `--section-pad` system, with Jen review as the acceptance criterion
*2026-08-01, per Lee*

**Spacing/container rhythm** -- "not that well done" per Lee. Doc 10's section grammar + `--section-pad` system is the specified fix (WP-2), with Jen review against her own spec as acceptance criterion.

### The nav badge and headline prices were deliberately unchanged in Wave A
*2026-08-01, per Lee*

The nav badge / headline prices were deliberately unchanged (logo veto, repricing targeted add-ons not model bases).

### "Save $500" is true by construction, not by copywriting
*2026-07-31*

19-row repricing (Save $500 true by construction). The claim holds on all five models because
the pricing arithmetic makes it hold, and the package-claim detector guards it — not because
the marketing line says so.

### The Brackendale Art Gallery is named on the landing page; venue-neutral copy is retired
*2026-09-02, per Lee, amended 2026-09-04*

The homepage hero subtitle and the Try-a-Session card name the Brackendale Art Gallery in Squamish, and both booking CTAs point at that venue's own page in the booking app rather than the app root. This deliberately retires doc 13's venue-neutral copy ("our saunas run at partner locations around BC"). That neutrality was itself a correction: the line it replaced advertised booking at "our Aldergrove location", a venue SSC does not have, removed sitewide on 2026-08-06. Naming Brackendale is not a return to that mistake, and the test that separates them is whether a stranger can show up and get in. The SC runs at the gallery, the public can walk in, and the booking app sells that slot at a page of its own. Apply the same test before naming any venue anywhere on the site, including the /locations/ map.

**Amended, Lee, 2026-09-04:** The hero subtitle no longer names the gallery: Lee, seeing the 29ad824 hero live, found the two-sentence subtitle long and too location-specific and cut it to 'Handcrafted Finnish saunas from Squamish, BC.' The venue stays on the landing page through the Try-a-Session card and the hero's single button, both of which still link to the gallery's own booking page. The walk-in test in the entry above is unchanged.

### Cold plunge is not offered and is not mentioned anywhere on the site
*2026-09-04, Lee*

Lee directed its removal sitewide on 2026-09-02: the Brackendale set-up runs the sauna, and no location has a plunge SSC operates. Every mention (the /locations/ BAG card description and Features line, the advisor prompt) was removed in the 2026-09-02..04 refresh. Old templates, briefs and the July redesign docs still carry the phrase, so a future copy pass will find it and be tempted to restore it; do not, unless Lee says a plunge exists at a venue the public can book.

### Fixed photo backgrounds are removed from every page except the Contact fog
*2026-09-04, Lee*

The `page-bg--fixed` wood-plank layer and the `hero-overlay__bg` photo-behind-text sections were deleted sitewide in the 2026-09-02..04 refresh. This executes doc 10 §2.3 (lines 78-79), approved in July, which says the fixed layer "dies" and the hero-overlay text sections "are retired": atmosphere must not leak into the surfaces that carry information. Lee chose on 2026-09-04 to keep the one exception, the fog on Contact, which sits behind a form rather than under body text. The 2026-08-01 operating constraint (confirm against Lee's stated likes before any effect deletion) was satisfied by that choice; it still applies to the next one, so the Contact fog is not removed without asking.

### No em dashes in rendered prose; "authentic" and "traditional" are retired as category labels, "handcrafted" is not
*2026-09-04, Lee*

SSC's voice rule for email (no em dashes, contractions, no adjective stacks) applies to the website's rendered text as well. The 2026-09-04 copy relay restructured every prose em dash on the site into a sentence, a comma or a colon, never a hyphen swap and never a fragment chain, and replaced the "authentic Finnish saunas handcrafted" meta and alt strings that disagreed with the approved hero. "handcrafted" survives where it reads naturally (the approved hero subtitle uses it); "authentic" and "traditional" as labels for what SSC sells are gone. Typographic separator dashes (process-step titles, testimonial bylines, add-on labels, price placeholders) are not prose and are parked for a house-style ruling; Nunjucks and HTML comments never render and are exempt.

### The warranty excludes the trailer entirely on trailer builds, does not transfer on sale, and covers residential use only
*2026-09-05, Lee*

Lee, 2026-08-02 dictation and 2026-09-05 grill round 2: on trailer builds nothing about the trailer is covered, including SSC's own frame work (the live warranty page's five-year 'skid or trailer frame (SSC-fabricated components)' line is wrong and comes out); the warranty does not extend to a subsequent owner; it covers residential use, and commercial or rental use needs written terms, which also protects the heater coverage that Harvia voids when residential use turns commercial. Claims are by email and answered within two weeks; that is the published response time. Glass is not covered but SSC covers the seal. Two-year cosmetic (siding, bench tops, accent walls, electrical), five-year structural (benches, framing), starting at delivery or final payment, whichever the same day. Four incompatible written versions existed before this ruling (live page, faq.json, the August dictation, the Thunderbird contract); this is the one.

### A site visit is free within the Sea-to-Sky and Lower Mainland and charged as part of the design deposit farther out; consultation ends in a number, never a 3D model
*2026-09-05, Lee*

First contact is a call. Lee's 2026-08-02 dictation said distance was no problem and everything was free through consultation; on 2026-09-05 he drew the line instead: free nearby, farther visits fold into the design deposit. The consultation ends in a number and an estimate, maybe a hand sketch; screenshots of the SketchUp model come after the deposit, with two to three rounds of revision and no fee line published. The booking horizon is not published; the usual delay (heater and window lead times) is named. Payment is 30/30/30/10 on every build and the first 30% holds the slot. Process-page copy quotes this, not the August line.

### Testimonials without a named client are attributed "Client" and capped at two until named reviews exist
*2026-09-05, Lee*

No attributable client testimonial and no Google review is on file (local-seo-action-plan.md). The homepage's three quotes carry 'Private Client, Squamish BC', a place claim nobody can back. Until the review campaign and the case-study replies produce a name, the section shows the two strongest quotes attributed plainly as 'Client'. A named testimonial replaces one of them; nothing unnamed is added.

---

## Engineering pins

### `npm audit fix --force` on a live site is not a relay side-quest
*2026-07-30, recorded in this hand-off 2026-08-01*

Needs its own plan -- `npm audit fix --force` on a live site is not a relay side-quest.

### This site suppresses the generic tracker listener and sends its own event
*2026-07-30, recorded in this hand-off 2026-08-01*

This site suppresses the generic listener and sends its own event, but the tracker itself needs an authorized fix in the ssc-ops repo.

---

## Operating constraints

### Confirm against Lee's stated likes before any future motion/effect deletion
*2026-08-01, per Lee*

Process lesson attached to item 1, worth carrying forward permanently: the original brief was built from *audits of the site*, and never swept Lee's previously-stated *preferences* about it. Confirm against Lee's stated likes before any future motion/effect deletion, not just code quality.

### The /locations/ map uses a keyed CARTO basemap; an unkeyed tile request is a silent failure, not an error
*2026-09-04, Lee*

CARTO began enforcing API keys on basemaps.cartocdn.com in late August 2026. An unkeyed request still returns HTTP 200 with a valid PNG, so nothing throws, nothing logs and no monitor fires; every tile simply carries "API KEY REQUIRED" stamped diagonally across it, and the page that invites people to visit the sauna reads as broken. The key in js/map.js is a domain-scoped public tile key that ships in client JavaScript by design (free tier, 5M tiles a month, requested 2026-09-04). Any change to the tile URL, any basemap swap, and any future map on any SSC property must keep a key on the request, and a map check is a visual one: look at a tile, do not trust the status code. If the key is ever rotated, request another at carto.com/basemaps/apikey.

### Never `git add -A` after a suite that mutates the tree, and never let that suite be the one a timeout can kill
*2026-09-04, Lee*

scripts/models-json-selftest.mjs proves the roundtrip suite can detect price drift by mutating real files (js/data.js, src/_data/models.json, the saunas template) and restoring them only when it finishes. On 2026-09-03 a 10-minute command timeout killed a full-suite run while that self-test was between its M16 mutation and its restore, leaving `exteriorYakisugi: 5000,` deleted from the S2 block in js/data.js. A later `git add -A` swept the deletion into unrelated commit 54d98ec and it was pushed: the S2 under-quoted yakisugi cladding by $5,000 in production for about a day, until models-json:roundtrip went red and 35e8f18 restored it. Two rules follow. Stage by explicit pathspec after any run of a mutating suite, and diff the tree against HEAD before committing. Run the self-test on its own, never inside a batch that a timeout or a Ctrl-C can cut short; if a run is killed, `git diff --stat` first and restore before anything else.

### The warranty page does not change without Pierre reading the full set once
*2026-09-05, Lee*

Published warranty durations are a floor under the BC Sale of Goods Act (s.18(c), s.20(2)), the page has carried four incompatible versions, and it still makes two false claims (third-party electrical certification with documentation in the client's name; an owner's manual that ships with every sauna). Removing the false claims is a copy fix and does not wait. Rewriting the terms themselves (the 2026-09-05 trailer, transfer, residential-use and response-time ruling) goes to Pierre for one full read before it is published, and no copy relay rewrites warranty terms on its own.

---

## Evidence corrections

### Formspree silently 200s on discarded submissions — a green status code proves nothing, only the inbox does
*2026-08-01*

Closes the receipt-gate final inch -- Formspree silently 200s on discarded owner-address/draft-origin submissions.

### The S2's AI-named image files are real photographs of the built sauna
*2026-09-02, per Lee*

The four S2 gallery files named Gemini_Generated_Image_* and nano-banana-* are photographs of the S2 that was actually built. Only the background was replaced, so the sauna did not read as sitting in the shop. That is ordinary commercial retouching, not generated product imagery, and no labelling or disclosure is owed. The filenames assert the opposite of the truth and will mislead anyone who greps them; src/img/MANIFEST.md publishes them in a public, sitemap-listed table, which is how the 2026-09-02 code-refresh audit misread them as fabricated product shots before Lee corrected it. Renaming the four files is optional and churns js/data.js, src/_data/models.json, the saunas template and the harness; the correction is recorded here instead.

### Doc 20 was answered by Lee on 2026-08-02; the transcript is the source and Wave B is not blocked on facts
*2026-09-05, Lee*

The fact-gathering questions in docs/redesign-2026-07/20-fact-gathering-questions.md were answered by Lee in three dictated rounds on the evening of 2026-08-02, transcribed verbatim at ~/marvin/state/ssc-website-doc20-lee-answers-2026-08-02.md with a structured extraction (all of Part A and Part B, D47-D50; open only B32, the manufacturer heater terms SSC asks for itself, and C39-45, the case studies pending client replies). The website ROADMAP was never updated and described WP-2, WP-3 and WP-4 as blocked on those answers for a month; a grill on 2026-09-05 re-asked four of them before the transcript surfaced. George works from that transcript plus the 2026-09-05 grill capture, not from doc 20's questions. A session that reads the ROADMAP alone and re-asks Lee is repeating a mistake already made twice.
