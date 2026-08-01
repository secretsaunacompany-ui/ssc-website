# SSC Website Redesign — Creative Department Brief

**Date:** 2026-07-28
**Client:** Secret Sauna Company (Lee Salo, owner-builder; Anthony, co-owner)
**Project:** Full website redesign, moving from a competent product site to an architecture-studio register.

---

## The situation

SSC builds custom Finnish-style saunas in Squamish, BC. The website
(`/home/leesalo/Projects/ssc-website/`, Eleventy static site, live at
secretsaunacompany.ca) is roughly 75% of the way to premium. Three specialist
audits ran on 2026-07-27 and found:

- A configurator whose "Request Quote" button has **never once delivered a
  submission** in the site's entire history (funnel dead-end, not a code bug)
- Copy that sells a category, not a company — the hero headline would run
  unedited on the direct competitor's site
- A motion layer fighting itself: scroll-lock intro, four parallax variants,
  infinite ambient zoom

The design foundation (dark palette, token system, serif/sans duality, 8rem
section rhythm, single warm accent) is genuinely good and is **not** being
thrown out. This is a refinement to a clear register, not a rebuild.

---

## The vision (already validated with Lee)

A working mood board was built and Lee approved the direction enthusiastically,
specifically praising the mobile experience. **Read the source directly:**
`/tmp/claude-1000/-home-leesalo--local-share-marvin-worktrees-marvin-session-ade477/8216e1a0-91d3-4f30-90c5-72b45a660c8b/scratchpad/ssc-visual-direction.html`

It demonstrates rather than describes. In Lee's own words, the target is:

> "A smooth architectural website for a design firm." Landing on the home page,
> the first thing you meet is a big hero photo, nothing obstructing it, really
> just letting the image speak for a moment before people inevitably begin to
> scroll — whereby all the information slowly fades into view. Using scroll
> animations to break things into little chunks so people can digest the
> information better.

And explicitly **not**:

> "I don't personally like to be too corny. No lighting up of call-to-action
> buttons." He rejected the proposed hero line "the only sauna in the Sea-to-Sky
> built by the hands you shook" as corny.

Reference register (validated): George Nakashima Woodworkers, Norm Architects,
Olson Kundig. Competitors working in a lower register: Storm Saunas (clean but
conventional product cards), Voyageur (premium spacing, dream-it-build-it
headline). **No sauna builder is working in the architecture-studio language.
That gap is the opportunity.**

---

## Lee's voice — verbatim source material

Asked what he'd say at a barbecue if someone asked what he does. Use this as the
voice source; do not sand it into marketing copy:

> I build saunas. I've taken up a passion that reflects my cultural heritage and
> that's something I'm very proud to be doing. The satisfaction of being able to
> start a conversation with someone, come up with a design, make the plans, see
> it all come to life, and present them with the final product at the end is what
> is so satisfying about this line of work. Often in other industries you're a
> single cog; here we play every role. It means we wear a lot of hats, but it
> leads to a much more satisfying experience.
>
> This whole thing came about because of our love for the hidden secret saunas
> that exist within the woods in Squamish, and our desire to recreate that
> experience — which had become overrun with tourists in our own backyard — or
> as we'd first done on a trailer, by bringing it to the riverside and being able
> to use it wherever we like. This philosophy, coupled with attention to the
> Finnish traditions for how to properly build a sauna, is what has resulted in
> such a unique and well-loved product.

---

## Decisions Lee has already made — treat as fixed constraints

| Item | Decision |
|---|---|
| **Ownership voice** | "We" = Lee **and Anthony**. Anthony is still co-owner. Names are fine to use; keep it slightly vague rather than a solo-founder story. Do NOT write a first-person-singular About page. |
| **Address** | Progress Way shop closed May 2026. Flagship is now Brackendale Art Gallery (41950 Government Rd, Squamish). Remove all Aldergrove mentions. |
| **Phone** | No phone number on the public site. Email only. 604-245-1008 in the brand guidelines is WRONG and must be removed from that doc. |
| **Booking** | `book.secretsaunacompany.ca` is live and functional, but sessions are paused during the fire ban. `/book/` currently says "offline while we rebuild" — wrong. Keep the four inbound links; fix the page copy. |
| **Payments** | Helcim only. Privacy policy still says Square — stale, must change. |
| **Typeface** | Cormorant Garamond stays. Playfair Display is retired. Guidelines get updated to match the site, not the reverse. |
| **/saunas/ order** | Models first, barrel/infrared comparison after. "Best foot forward, then defend it." |
| **Process page** | `/process/` is currently a redirect to `/about/`. It previously existed as a four-step section ("01 Consultation / 02 Design & Planning / 03 Construction / 04 Installation & Support") and was folded into About during the SPA→MPA conversion. Lee wants it restored as a real page: timeline, what each step looks like, payment milestones, how to get started. Confidence-building is the job. |
| **Configurator** | Highest-value fix. Must submit directly from the modal. Lee has personally had to ask clients to resend details by other means. |
| **Testimonials** | Currently three anonymous "Private Client, Squamish BC" quotes. Lee is running a separate campaign to collect real reviews + photos from past clients. Design for real attribution arriving later; do not invent names. |

---

## Source documents — read what is relevant to your lane

**Audits (2026-07-27, all three in the same directory as this brief):**
- `website-audit-functional.md` — the configurator dead-end, forms, security, data sync
- `website-audit-copy.md` — George's copy + positioning audit
- `website-audit-ux.md` — Jen's UX/UI/motion audit, 16 prioritized items with line numbers
- `brand-guidelines-audit.md` — drift analysis + full replacement brand guidelines document

**Design research (SSC's own library):**
- `~/marvin/content/reference/design/sauna-architecture-new-wave.md` — 14 architecturally significant wellness facilities (Therme Vals, Löyly Helsinki, Kulttuurisauna, Kengo Kuma's Sauna Sazae). Section 1 on Zumthor is the deepest.
- `~/marvin/content/reference/design/finnish-sauna-design-research.md` — Liikkanen's four-faceted model, the convective loop, the Law of Löyly, bench/ceiling geometry
- `~/marvin/content/reference/design/architectural-effects-guide.md` — 35 architectural techniques ranked by value score
- `~/marvin/content/reference/operations/brochure-2026/architectural-brochure-inspiration.md` — **highly relevant.** How architectural monographs (Zumthor's Therme Vals book, El Croquis) sequence photography and text. The El Croquis per-project rhythm — hero, plan, words, detail, credits, repeated — is a scroll pattern written down before anyone called it one.
- `~/marvin/content/reference/operations/ssc-brand-guidelines.md` — current guidelines (being replaced; see the audit)
- `~/marvin/content/reference/industry/competitor-comparison.md` — full competitor profiles incl. Storm, Theraluxe, Revel, Island Sauna

**The codebase:**
- `/home/leesalo/Projects/ssc-website/styles.css` — 2,871 lines, the design system of record
- `/home/leesalo/Projects/ssc-website/src/` — all `.njk` templates and `_includes/`
- `/home/leesalo/Projects/ssc-website/js/` — animations, modal, gallery, forms, navigation

---

## What the department is being asked for

Lee's words:

> Take all of this vision and guidelines and research, all that is giving us the
> inspiration here, over to that design team of specialists and see what they
> think of this plan, what else could be improved upon to really go above and
> beyond and make it as professional as possible — and see if they can output a
> plan that is detailed enough to have run through the relay pipeline for
> implementation.

So: **critique the direction, then extend it past where it currently stops.**
Lee is not a graphic designer and has said so plainly — he is relying on the
department for the details he can't specify himself (typographic scale, spacing
discipline, compositional judgement). Do not simply ratify the mood board. Find
what it misses.

Output must be **implementation-grade**: specific enough that Ted can build from
it without inventing decisions. Name selectors, tokens, values, file paths,
breakpoints. Where you prescribe a change, say what it replaces.

**Do not fabricate facts** — no invented client names, testimonials, statistics,
or history. Flag anything you need from Lee rather than filling the gap.

---

## Working rule for every specialist

Write your output to your assigned file **incrementally** as you go — do not
hold it all in memory and write once at the end. If you approach a limit, save
what you have. A partial document on disk is worth more than a complete one that
never lands.

---

## Post-Wave-A feedback — Lee, 2026-08-01 (FIXED DECISIONS, Wave B scope)

Recorded verbatim-in-substance after Lee reviewed the live Wave A deploy. These
carry the same authority as the fixed decisions above. The first item corrects a
capture failure: the preference predates the audits and never made it into this
brief, so the Wave A motion cleanup deleted the effect along with the janky
scroll-lock implementation of it.

1. **Homepage hero reveal (restore the effect, not the old code).** The hero
   image must arrive FIRST — clean, unobstructed, no nav, no title, no overlay —
   with a beat of time to take in the visual quality of the sauna before the
   header and hero title come into play and cover it. Lee explicitly stated and
   deeply enjoyed this effect on the old site. Implementation freedom is total
   (the old `HeroIntroAnimation` scroll-lock stays dead; a delayed `.reveal`
   stagger on nav/title with a longer image-first hold is the obvious shape),
   but the *sequence* — image alone, pause, then chrome — is the fixed decision.

2. **/saunas/ leads with the saunas.** The model index goes to the top of the
   page; the barrel/infrared comparison and science sections move below the
   work and shrink. This confirms doc 10 §3.2 exactly as written — Lee
   independently stated the same order after seeing the live page (which still
   leads with comparisons). WP-2 executes it; no re-litigation needed.

3. **Spacing of text and containers needs real work.** Lee finds the current
   spacing/container rhythm "not that well done." This is doc 10's section
   grammar + `--section-pad` system (WP-2), not yet applied in Wave A. Treat
   spacing as a first-class WP-2 acceptance criterion, not a side effect.
