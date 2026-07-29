# Fact-Gathering — Process & Warranty

## Answers received

**Tax treatment (was blocking Q12 / WP-3).** **PST applies to custom sauna
builds.** *(per Lee, 2026-07-28.)* So the published figure is GST 5% + PST 7%,
which matches what the Adam Pospisil quote already used. George's copy may now
carry a tax line; the `[NEEDS LEE]` placeholders on tax come out.

**Configurator pricing basis (was Q11 / critic blocker 2).** *(per Lee, 2026-07-28.)*

- **Basis: incremental, plus margin.** A heater upgrade is priced on the delta
  (upgrade cost minus the standard unit not being fitted), then margin on top.
  House target 45% GM stress-tested; 40% is the floor.
- **Kuuma is cut** from the configurator. It was live at +$3,000 against a
  ~$6,150–6,700 landed cost — roughly a $3,000 loss per sale, on the site today.
- **Wood-fired is replaced by IKI stoves** — Lee said "eekie stoves, which are
  more readily available for pricing." **Brand reading flagged for confirmation**
  (IKI, Lithuanian, most likely; HUUM the alternative). Priced with proper margin.
- **Extra window: two tiers.** Lee accepts thinner margin here but the tiers must
  price the extra *labour* a larger opening costs, not just the glass. Note his
  correction to the premise: in practice full pricing is discussed with clients
  and the configurator number is rarely what closes, so the line has not actually
  been losing money.
- **SC heater path fixed** — the `+$2,000` slot sells a 15kW Apex on SC and a
  Revive 9kW elsewhere. Priced separately from the real 15kW cost.
- **Everything else delegated**, with a standing instruction: **bias upward.**
  Lee: *"I would rather that these numbers stay higher so that people aren't
  shocked by the increased cost of upgrades."* Underpricing is what stopped them
  building.

**Changing rooms — NOT accepted yet, derivation requested.** Lee is not
convinced by the cost basis behind $3,500 → $8,500 (3') and $4,500 → $10,500–11,000
(4'): *"I'm interested to see where these numbers are coming from... I'm not
exactly sure that the costs described here are totally accurate."* A line-item
takeoff he can argue with is being produced — quantities from geometry, labour by
task, the 2.5 hr/sqft formula reconciled against an itemised estimate, and the
uncaptured question of whether a changing room forces a larger trailer.

**Formspree autoresponse (was Q14, wrongly gating WP-0b).** Resolved by
investigation rather than by asking. Findings: autoresponse is **available on
Formspree's Professional and Business plans only**, configured in the dashboard
(Workflow → Add New → Auto Response), not in code — which is why auditing the
form could only answer half. It requires a field named exactly `email`;
`contact.njk:28` already has one, so no markup change is needed. The code
currently sends only `_next` and `_subject`, and no `_replyto`.

**The real fix is that this should never have gated the package.** The modal
success panel is written so it holds either way — one conditional line, driven by
a flag in `src/_data/site.json`, claiming a confirmation email only when
autoresponse is actually enabled. Wim's rule stands (`14 §1`: do not claim a
confirmation email unless it exists); it is now satisfied by design instead of by
waiting. **Q14 comes off the critical path.** Lee can flip the flag whenever he
checks the tier; if it is Free, nothing is broken and nothing is promised.

**Build duration (was A13, a live contradiction).** **"As little as 8-12 weeks"**
from deposit, and where a build lands in that range depends on the model and the
level of customization. *(per Lee, 2026-07-28.)* The FAQ's "4-6 weeks" was simply
wrong and is **fixed** in `src/_data/faq.json` — both `answer` and `schemaAnswer`,
the latter feeding Google rich results. Swept: no 4-6 week claim survives anywhere
in `src/` or `js/`. All future copy uses the 8-12 framing.

**WiFi controller (was the "Save $1,000" defect).** **Add it as a $2,000
individually-selectable upgrade line.** *(per Lee, 2026-07-28.)* This makes the
Premium Finish Package's savings claim true rather than backwards: the individually
selectable basket becomes $8,000 against a $7,000 package. Research priced a
genuine heat-rated controller around $550, so this is a strong-margin line. Ted
adds the option to `src/_includes/modals/sauna.njk` and the modal total logic.

**Nav mark (was Q10, blocking WP-2a).** **Remove the logo from the nav; it becomes
a maker's mark.** *(per Lee, 2026-07-28.)* Saul's spec proceeds: 22px wordmark in
the nav, badge relocated to the footer as a maker's seal at 72px. WP-2a unblocks,
including the asset redraw from `~/marvin/content/assets/logo-original.pdf`.

**Reply time (was blocking Q4 / WP-0b + WP-3).** Normal is **within a day**;
a bad week is **three**. *(per Lee, 2026-07-28.)* Published promise uses the
bad-week number so it holds on the worst week, not the best: "we'll come back
within three business days, usually the next day." George's five pre-submission
placeholders can now fill; `thank-you.njk`'s existing post-submission line is
unaffected.

**Intake fields (new work, arising from A2).** The current form asks nine
questions and requires two. It does **not** ask location or access, which are
the two facts that most change a quote — on-site build runs ~1.5x and crane
placement needs an operator assessment. Every serious lead this month hit it
(Natalie: crane vs on-site; Ian Penn: Whistler; Adam: trailer-mounted). Lee
wants the right level of interrogation researched rather than guessed, and the
Formspree interface refined alongside the questions. Assigned to Wim.

**Case studies (Q1, Q2 — deferred, not answered).** Lee is contacting Clarke,
Emmanuel and Mountain Life directly to agree a curated package with each before
anything publishes. WP-6 stays parked until those land. The permission gate in
`builds.json` means an un-permissioned build cannot render regardless.


**Purpose:** every answer below becomes published copy. Nothing here may be
invented, inferred, or filled in from a competitor's site. Where the answer is
"it depends" or "we haven't decided," that is a valid answer and the copy will
be written around it.

**How to answer:** talk them through, in order. Rough is fine — George turns
them into copy. Say "skip" on anything you'd rather not publish.

---

## Part A — The Process page

The job of this page is confidence: what happens after someone emails, and when
money changes hands. Four stages, from the original site structure.

### A1 — First contact
1. Someone sends an inquiry. What actually happens next, and how fast do you
   normally reply? *(This one becomes a published promise, so give a number you
   can hit on a bad week, not a good one.)*
2. What do you need from them before you can say anything useful — dimensions,
   photos, a site address?

### A2 — Consultation
3. Is it a call, a site visit, or both? Does that change by project size or
   distance?
4. Is the consultation free? Is there a point where it stops being free?
5. What comes out of it — a number, a sketch, a range?

### A3 — Design and planning
6. You model in SketchUp. What does the client actually see — screenshots, a
   walkthrough, a PDF?
7. How many rounds of revision before it's locked? Is there a limit?
8. How long does this stage usually take?
9. What decisions does the client have to make here, and which ones are hardest
   to change later? *(Naming the irreversible ones builds trust.)*

### A4 — Deposit and scheduling
10. When is the first money due, and how much? *(The Adam quote used
    30/30/30/10 — is that the standard for every build or commercial only?)*
11. Does the deposit hold a build slot, or start the build?
12. Roughly how far out are you booking right now?

### A5 — Construction
13. **Real build duration.** The FAQ says 4–6 weeks; the commercial quote to
    Adam said 8–12 weeks. Which is right for which size? *(This contradiction is
    live on the site now.)*
14. Do clients get progress updates? Photos? Can they visit?
15. What most commonly causes a delay, and do you want to say so publicly?
    *(Naming it honestly usually reads as competence.)*

### A6 — Client responsibilities
16. What does the client have to arrange themselves — electrical, site prep,
    permits, crane? Where does your work stop and theirs start?
17. What surprises people most often about this list?

### A7 — Delivery and installation
18. How does a unit actually arrive — driven on, crane, trailer left in place?
    What decides which?
19. Who arranges and pays for delivery? Is it quoted separately every time?
20. What happens on delivery day, start to finish?

### A8 — Handover and after
21. Is there a walkthrough? Do they get a manual? *(You have an owner's manual
    in the reference library — is it given to every client?)*
22. What support do they get afterwards, and for how long?
23. First-season care — anything they must do that they wouldn't guess?

---

## Part B — Warranty

Currently published as "2-5 Year Limited Warranty." Every specific below is
missing from the site and will not be written without you.

### B1 — The terms
24. What exactly does the **2 years** cover?
25. What exactly does the **5 years** cover?
26. Where's the line between them — why is one thing 2 and another 5?
27. Does the warranty start at delivery, or at final payment?

### B2 — Exclusions
28. What is explicitly **not** covered? *(The current page names thermal
    cycling on glass — what else?)*
29. What does a client do that voids it?
30. Normal wear that people mistake for a defect — cedar greying, checking,
    movement — how do you describe that?

### B3 — Third-party components
31. Heater, glass, roofing: is that your warranty or the manufacturer's? If
    theirs, what are the terms and do you handle the claim or hand it off?
32. Homecraft and Harvia terms — do you know them, or do we need to ask?

### B4 — Certification
33. **The electrical certification body's exact name.** Quotes say "third-party
    electrical inspection and certification" — published copy needs the real
    name of who issues it.
34. Does the client receive a certificate or document? Is it in their name?
35. Anything else certified — WETT for wood-fired, CSA on components?

### B5 — Claims and transfer
36. How does someone actually make a claim — email you?
37. Response time you're willing to commit to publicly?
38. Does the warranty transfer if they sell the sauna or the house?

---

## Part C — Case study details

Three builds confirmed: **Clarke** (S2, Kitsilano), **Emmanuel** (SC, Edmonton),
**Mountain Life** (S4). For each, the El Croquis index block needs:

39. Publishable location — neighbourhood or region is fine, street addresses are
    not. *(e.g. "Kitsilano, Vancouver" / "Edmonton, Alberta")*
40. Year completed.
41. Footprint and capacity.
42. Wood species, interior and exterior.
43. Heater make and model.
44. One thing about that build that was specific to it — a constraint, a
    request, a problem solved. *(This is what makes it a case study instead of a
    listing.)*
45. **Client permission** — has each of the three agreed to be named and
    photographed? Name-only, photos-only, and anonymous-but-shown are all valid
    answers per client.

Notes already on file:
- Emmanuel's build has **43 photos and 45 videos** in the library, flagged
  "very video-heavy" — the strongest process material SSC owns.
- Clarke's build has outstanding touch-ups scheduled for the week of Aug 4 and
  a final invoice unpaid. Worth confirming he's comfortable before publishing.
- Mountain Life is preparing the backyard, so photography is pending. Confirm
  the spelling of the client's name — the portfolio records "Jon Burak."

---

## Part D — Small ones

46. Reply-time promise for the quote confirmation panel ("we'll come back within
    ___").
47. Which of The Good Sauna, Gatherwell, BAG, and Sea Edge Hotel may be named on
    a commercial page? Which may be photographed?
48. Does a real laser cut file exist that could be used as a footer motif?
49. Session price — the mood board work assumed ~$30; what is it actually?
50. Fire ban scope — does it pause all sessions, or only wood-fired?
