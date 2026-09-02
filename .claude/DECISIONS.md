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

---

## Evidence corrections

### Formspree silently 200s on discarded submissions — a green status code proves nothing, only the inbox does
*2026-08-01*

Closes the receipt-gate final inch -- Formspree silently 200s on discarded owner-address/draft-origin submissions.

### The S2's AI-named image files are real photographs of the built sauna
*2026-09-02, per Lee*

The four S2 gallery files named Gemini_Generated_Image_* and nano-banana-* are photographs of the S2 that was actually built. Only the background was replaced, so the sauna did not read as sitting in the shop. That is ordinary commercial retouching, not generated product imagery, and no labelling or disclosure is owed. The filenames assert the opposite of the truth and will mislead anyone who greps them; src/img/MANIFEST.md publishes them in a public, sitemap-listed table, which is how the 2026-09-02 code-refresh audit misread them as fabricated product shots before Lee corrected it. Renaming the four files is optional and churns js/data.js, src/_data/models.json, the saunas template and the harness; the correction is recorded here instead.
