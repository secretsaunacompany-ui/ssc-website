# SSC Intake Form Design — Location, Access, and the Right Level of Interrogation
**Wim, Experience — 2026-07-28**
Brief (per Lee, 2026-07-27): "location and crane access should be more explicitly asked about. Maybe we should research what a good level of interrogation is that doesn't overload people. And maybe we could refine both the questions and the Formspree interface to make everything as easy as possible."

Status: complete.

---

## 0. The tension, named honestly

My own journey spec (14-wim-journey-funnel.md §1) says: *accept less data to lose fewer people.* Lee is asking me to add fields. These are not actually in conflict, and here's why.

The low-input principle applies to the **configurator modal**, where the visitor has already handed over a full configuration — model, options, budget signal — and every extra field is redundant interrogation of things the config already says. The contact form is different: it is the *conversation opener*, and right now it asks five questions that barely change Lee's reply (heat source, capacity — the configurator's territory) while omitting the two that decide whether the quote is even scopeable: **where is this going, and can we get it there.** Every serious lead this month (North Vancouver crane assessment, Whistler, out-of-province trailer — per Lee, 2026-07-27) hit that gap, which means the current form's cost isn't friction, it's a mandatory follow-up email round before the first real answer. A form that forces an extra email exchange has higher *total* friction than a form with one more field.

The principle survives, restated: **minimize fields per unit of quote-precision, not fields absolutely.** Cut what doesn't change the reply; add only what does. Location and access change the reply by up to 1.5x (on-site vs shop-built, per Lee) and can trigger a site visit. Nothing else on the current form has that leverage.

---
## 1. Evidence — form length, friction, and what actually holds up

What the research supports, and where it's contested:

**a. Field count matters, but the relationship is not linear and the popular stats are shaky.** Widely-cited figures (HubSpot's "each field costs ~4.1%", "3 fields converts ~25%") circulate through marketing blogs with weak provenance; treat them as directional, not laws. Aggregated benchmark roundups show conversion degrading gently from ~3 to ~5 fields and falling sharply past 6–7 ([Digital Applied benchmark roundup](https://www.digitalapplied.com/blog/form-conversion-rate-benchmarks-2026-data-points), [Mailmunch](https://www.mailmunch.com/blog/form-length-affect-conversion-rate)). The defensible reading: stay at or under ~7 *visible decisions*, and make each one obviously relevant.

**b. "Fewer fields always wins" is demonstrably false.** Michael Aagaard's often-cited test (via [Venture Harbour's studies roundup](https://ventureharbour.com/how-form-length-impacts-conversion-rates/)) found that *removing* fields cut conversion 14% — he'd removed the fields people wanted to answer and kept the ones they didn't. Restoring the wanted fields and fixing labels produced a +19% lift. The same roundup documents a 15-field form outperforming an 11-field one when the added fields matched user expectations, and a 30+ question multi-step flow converting at 53%. **Relevance beats brevity.** A person commissioning a $25K–$60K+ physical build *expects* to be asked where it's going; that question increases perceived competence rather than friction. This is the load-bearing finding for Lee's request.

**c. High-consideration purchases change the calculus.** Form-friction research is dominated by email-capture and SaaS signup funnels, where intent is shallow and every field loses people. A custom sauna inquiry is a considered purchase: the visitor has often spent multiple sessions researching (my J3 journey). Long-form B2B evidence ([Brixon Group](https://brixongroup.com/en/lead-forms-in-b2b-the-perfect-balancing-act-between-data-depth-and-conversion-rate), [CoBloom](https://www.cobloom.com/blog/form-fields-and-conversion-rates-is-less-really-more)) consistently finds that qualification fields on high-value forms trade a small volume loss for materially better lead quality — and SSC's problem this month was not lead volume, it was un-scopeable leads.

**d. Required vs optional.** Baymard Institute's B2B form testing (as summarized in the benchmark roundups above — I could not access the primary study; marked accordingly) found forms marking fields "(optional)" outperformed asterisk-marked-required conventions. The current SSC form already does this correctly ("all optional" legend). Keep it. Require only what makes a reply *possible*.

**e. Selects vs freeform.** Selects with a "not sure" escape are lower cognitive load than freeform for factual attributes, and produce scannable inbox data. Freeform is better where the answer space is open (the site description). The current form's pattern — selects with "not sure yet" options — is right and should carry the new questions.

**f. Progressive disclosure / multi-step.** Multi-step reduces *perceived* friction (Venture Harbour, above) but adds engineering and analytics complexity, and Formspree has no native multi-step (§4). At the contact form's scale (~8 visible fields) a single page with grouped fieldsets is under the threshold where multi-step pays for itself. The configurator *is* our multi-step form — the config is step one.

**Honest caveat:** none of these sources tested a sauna company in BC. The controlling logic is (b) and (c): ask expected, quote-changing questions; skip everything else. The instrumentation plan (journey spec §8, `contact_submit_success`) is how we verify rather than believe.

---

## 2. Recommended field set

Nine fields today → nine fields after, but two low-value fields out, two high-leverage fields in. Visible decision count stays constant; quote-precision per submission roughly doubles.

| Field | Verdict | Required? | Why it earns its place |
|---|---|---|---|
| `name` | keep | yes | Address the reply. |
| `email` | keep | yes | Send the reply. |
| `phone` | keep | no | George's helper line stands ("Only if you'd rather talk than type"). Crane/site-visit leads often *do* want a call. |
| `location` | **add** (text) | **yes** | The single highest-leverage datum: determines delivery vs on-site build (~1.5x price delta, per Lee 2026-07-27), service area, site-visit feasibility, and whether it's out-of-province. Without it, the first reply is a question, not an answer. Label: **"Where would the sauna go? (city or area)"** — city-level only, deliberately not a street address (privacy-proportionate, zero lookup effort, answerable from memory on a phone). |
| `site_access` | **add** (select) | no | The crane question, asked without saying "crane assessment." Options (§3). One select encodes drive-up / tight / crane / trailer / not-sure — every scenario from this month's leads. |
| `project_type` | keep | no | Routes the reply register (residential vs commercial vs rental); target of the `/contact/?type=commercial` preselect. |
| `timeline` | keep | no | Sets reply priority and whether a site visit gets scheduled now or logged. |
| `budget` | keep | no | With location+access it tells Lee which build path (shop-built vs on-site) is even in range before he replies. |
| `heat_source` | **cut** | — | Doesn't change the first reply; it's a design-conversation and configurator question. Asking it here duplicates the configurator and pads the form. |
| `capacity` | **cut** | — | Same reasoning. Size gets settled in the design conversation; the model cards and configurator already carry it. |
| `message` | keep | no | The open channel. Placeholder retargeted to the site (§3). |

Required stays at **three** (name, email, location). Everything else keeps the "(optional)" convention the evidence favors. If Lee is nervous about requiring location: the fallback is optional-but-first-in-fieldset, but I recommend required — it is an *expected* question (evidence §1b), it's answerable in two words, and an inquiry without it cannot be quoted at all.

---

## 3. Asking about location and access without bloat

Options weighed:

1. **Postal code only.** Cheap, but reads bureaucratic ("why do you need my postal code?"), fails for "we have land near Pemberton," and gives no access signal. Rejected.
2. **Map/pin picker.** Highest data quality, highest implementation cost, needs a maps dependency (CSP + weight + privacy), overkill for city-level scoping. Rejected.
3. **Defer access to the reply email.** Zero form cost, but this is exactly the current failure: every serious lead costs an extra email round. Rejected as the default; the reply remains the fallback for "not sure."
4. **Single combined freeform ("tell us about your site").** One field, but yields unscannable answers and people don't know crane access is even a question. Rejected.
5. **One text field (city) + one select (access) + conditional microcopy.** Two scannable fields, no lookup effort, the select *teaches* the visitor what matters. **Recommended.**

The two fields, grouped in their own fieldset placed immediately after the identity block — the site is the headline of this form, not an afterthought:

**Fieldset legend:** `Where it's going`

**`location`** — text input, required. Label: `Where would the sauna go? (city or area)`. `autocomplete="address-level2"`, `placeholder="e.g. Squamish, North Vancouver, Whistler"`. Inline error (George's register): *We need to know where it's going to quote it — city or area is plenty.* (George polishes.)

**`site_access`** — select, optional. Label: `Getting it in place` — options:

| value | option text |
|---|---|
| `` | Select one |
| `easy` | Easy access — a truck can get close |
| `tight` | Tight — stairs, slope, gate, or narrow path |
| `crane` | Would likely need a crane or lift |
| `trailer` | It's going on a trailer — mobile |
| `on-site` | No access for a finished unit — might need building on site |
| `not-sure` | Not sure — help me figure it out |

Every option is a self-diagnosis in plain language; "not sure" keeps it honest. Trailer and on-site are answers, not problems — this month's leads prove both paths are real business.

**Conditional microcopy, not conditional fields.** When `crane`, `tight`, or `on-site` is selected, a helper line fades in under the select (no new input, no layout jump beyond one line): *No problem — tricky sites are normal for us. Anything you can tell us about the spot in the notes below helps.* Simultaneously the `message` placeholder swaps to `e.g. distance from driveway, slope, overhead wires, gate width...`. This is progressive disclosure at its cheapest: the form gets smarter without getting longer, and the visitor is guided to volunteer exactly the detail a crane operator needs — voluntarily, in the field that already exists. When `trailer` is selected, the helper reads: *Mobile builds travel well. Mention where it'd live and how far it'll roam.* Under `prefers-reduced-motion`: instant show, no fade.

**Message placeholder (default)** retargets from "backyard size, specific features, questions" to the site: `e.g. what the spot looks like, how you'd use it, questions you have...`

What this deliberately does *not* do: ask for street address, photos, or measurements. Those belong to the reply and the site visit. The form's job is to let Lee's *first* reply say "here's roughly what that means for your site" instead of "where is it?"

---

## 4. Formspree — what it actually supports (verified 2026-07-28)

Formspree is a dumb-but-reliable POST endpoint plus dashboard features. Verified against Formspree's own docs where reachable; third-party where noted.

**Supported, relevant to us:**
- **Arbitrary new fields require zero dashboard changes.** Any `name=value` pair posted arrives in the notification email and submission archive. Adding `location` and `site_access` is a pure front-end change.
- **`_subject`** — per-submission custom subject line, settable via a hidden input, including dynamically via JS before submit. This is how Lee's inbox gets scannable (§6). ([Formspree help index](https://help.formspree.io/))
- **Auto-response emails** — via the "autoresponse" plugin; requires a field named `email` (we have it); custom from-name, subject, message. Configured in the dashboard, per ["Sending a confirmation or response email"](https://help.formspree.io/hc/en-us/articles/360025007233-Sending-a-confirmation-or-response-email). Plan gating: fully custom *templates* require the Business plan; whether the basic autoresponse plugin needs a paid tier isn't stated on the pages I could reach — **verify in the dashboard before promising a confirmation email anywhere** (this matches my journey-spec §1 flag: never claim a confirmation email until it's enabled and tested).
- **Spam** — honeypot via a hidden `_gotcha` field, plus reCAPTCHA and keyword filtering in the dashboard ([Formspree help](https://help.formspree.io/)). The current form has no `_gotcha`; add it.
- **File uploads** — paid plans only (25MB/file; 1GB storage on Personal — [System limits](https://help.formspree.io/hc/en-us/articles/7017303616659-System-Limits)). Relevant later if we ever want "attach a photo of the spot," which I'm deliberately *not* recommending now (friction, and plan dependency).
- **AJAX submission** with `Accept: application/json` — already how `forms.js` works. Fine.
- **Rules engine / conditional routing** — routes *notifications* (e.g., send commercial inquiries to a different address) and triggers; it does **not** render conditional fields in your HTML. Third-party sourced ([Staxly Formspree overview](https://staxly.dev/platforms/formspree)); treat routing specifics as verify-in-dashboard.

**Not supported — would require client-side JS or a platform move:**
- **Conditional/branching fields in the form itself.** Formspree never renders our form; the HTML is ours. All conditional behavior (the §3 microcopy, commercial preselect) is our own JS — which is exactly why we don't need anything fancier from the platform.
- **Native multi-step forms.** Not offered. Multi-step would be hand-built. §1f: not worth it at this field count.
- **Submission volume**: free tier is 50/month ([Account limits](https://help.formspree.io/hc/en-us/articles/47605896654227-Account-limits) — tier limits third-party corroborated). SSC's historic ~201 submissions total is well inside this; not a constraint. **I don't know which plan SSC is on — Lee should confirm when deciding on the autoresponse.**

**Verdict: no reason to leave Formspree.** Everything in this design is front-end + at most two dashboard toggles (spam settings, optional autoresponse). A platform move would only be justified by needs we don't have (payment forms, native logic, CRM).

---

## 5. The interface

Working inside Jen's §3.7 composition: form directly on ground, single column at `--hold-narrow`, rule-separated fieldsets, no frosted card, micro-ledger below.

**Order and grouping (top to bottom):**

1. **Identity** (no legend needed): `name`, `email`, `phone` + helper.
2. **`Where it's going`** (fieldset, rule-separated): `location`, `site_access` (+ conditional helper line). Placed second, not buried: this ordering *is* the message that SSC takes the site seriously, and easy questions early build completion momentum.
3. **`The project (all optional)`** (fieldset): `project_type`, `timeline`, `budget`.
4. `message` textarea.
5. Submit: **`Get My Quote`** (George's sanctioned variant stands).

**Why this order:** identity first (universal convention, easiest fields), site second (the expected, engaging question — the Aagaard lesson: lead with fields people *want* to answer), qualifiers third (the ones people hesitate on, especially budget — by then they're invested), open text last. Budget stays optional and late deliberately; it's the only field with any social discomfort.

**Mobile (390px):**
- All inputs `font-size ≥ 16px` (iOS zoom guard — pattern already in the codebase).
- `location`: `autocomplete="address-level2"`, `autocapitalize="words"` — most users get their city from keyboard suggestion in one tap.
- Selects stay native — the OS picker is the best mobile select; do not custom-render.
- One column, full-width fields, ≥44px touch targets; the conditional helper appears *below* the select so nothing shifts under the user's thumb.
- Total scroll length after the cut-two/add-two swap is essentially unchanged.
- The three required fields sit in the first two groups; a mobile user can legitimately submit with a name, an email, and two words of location.

**Labels and microcopy** are George's to polish; drafts in §3. Error states follow his inline-per-field pattern (13-george-copy.md §6), adding the `location` error line.

**Accessibility:** fieldsets get real `<legend>`s (already the pattern); the conditional helper is `aria-live="polite"`; keep marking *optional* rather than asterisking required (§1d).

---

## 6. Coherence across the three intake paths

One principle: **every path asks identity + site; only the conversation-openers ask qualifiers; the configurator's config replaces the qualifiers.**

| | Contact form | Configurator modal (Step 2) | Commercial page → contact |
|---|---|---|---|
| Identity | name, email, phone(opt) | name, email | name, email, phone(opt) |
| Site | location (req), site_access (opt) | **location (req), site_access (opt)** — amendment below | same as contact |
| Qualifiers | type, timeline, budget (opt) | none — the config is the qualifier | `project_type=commercial` preselected via `/contact/?type=commercial` |
| Freeform | message | notes | message, placeholder in commercial register (George) |
| `_subject` | `Sauna Inquiry — {location} — {access}` | `Configurator Quote — {Model} — ${Total} — {location}` | `Commercial Inquiry — {location}` |

**Amendment to my own journey spec (§1, "exactly three fields"):** configurator Step 2 grows from three visible fields to five: name, email, **location, site_access**, notes. This is the one place I override my earlier spec, for the same reason the contact form changes: a configuration without a location is still an unquotable lead — the North Vancouver case would have arrived through the configurator just as unscopeable. Two added fields, both trivially answerable, both quote-critical; §0's restated principle (fields per unit of quote-precision) supports it. Everything else in the Step 2 design stands (recap persistence, storage, failure/mailto fallback, a11y).

**What Lee sees arriving,** by path:
- Contact: subject `Sauna Inquiry — North Vancouver — crane`. Body: identity, location, access, type/timeline/budget, message. Triage in three seconds: he knows before opening whether it's a delivery, a crane job, or a road trip.
- Configurator: subject `Configurator Quote — S4 — $35,500 — Whistler`. Body: identity, location, access, notes, full config summary.
- Commercial: subject `Commercial Inquiry — Parksville`. Same body as contact with type=commercial.

The subject-line convention is the cheapest CRM SSC will ever own.

---

## 7. Migration note (implementation-grade, feeds a relay)

### `src/_includes/pages/contact.njk`
1. Remove the `heat-source` and `capacity` form-groups.
2. Add fieldset `Where it's going` after the phone group: `location` text input (required, `autocomplete="address-level2"`, placeholder per §3) and `site_access` select with the seven options in §3, plus `<p class="form-helper" id="access-helper" aria-live="polite" hidden></p>`.
3. Reword remaining fieldset legend to `The project (all optional)`; keep `project_type`, `timeline`, `budget`.
4. `message` placeholder → default text per §3.
5. Add honeypot: `<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">`. Keep `_next` and static `_subject` (no-JS fallback).
6. Frosted-card retirement is already in Jen's migration scope — don't duplicate.

### `js/forms.js`
1. Before building `FormData` in `handleSubmit`: set `_subject` dynamically — `Sauna Inquiry — {location} — {site_access||'access unspecified'}`; prefix `Commercial Inquiry` when `project_type === 'commercial'`. Guard: if fields absent, leave the static subject (the configurator posts through this same handler).
2. `change` listener on `#site-access`: `crane|tight|on-site` → show helper text A + swap message placeholder to the access-detail prompt; `trailer` → helper text B; else hide helper, restore default placeholder. Respect `prefers-reduced-motion` (no fade).
3. Replace the `alert()` failure with George's inline error + mailto fallback (same pattern journey §1 specs for the modal — one shared error renderer).
4. Query-param preselect: on `/contact/` load, `?type=commercial` sets the `project_type` select (may belong in `navigation.js` — implement once, either file).

### Configurator modal (when the two-step rebuild lands)
Step 2 field list per §6: name, email, location (required), site_access, notes. Same `_subject` builder with `— {location}` appended.

### Formspree dashboard (Lee, five minutes)
1. Confirm current plan tier.
2. Enable keyword/spam filtering if not already on; honeypot needs no dashboard change.
3. Decide on the autoresponse plugin (journey spec flag #2) — only after confirming plan support; until enabled and tested, no page or success copy may claim a confirmation email.

### No changes needed
Endpoint stays `https://formspree.io/f/mdaaejwp`; new fields flow through automatically; thank-you redirect unchanged.

### Verification
- Test posts per path: contact with crane access, contact minimal (three required fields only), commercial query-param, and — once built — configurator Step 2. Confirm subject + all fields arrive.
- Mobile pass per the dev-server SOP: 390px viewport, keyboard behavior on `location`, native select pickers, helper reveal.
- Instrumentation: `contact_submit_success` gains `{has_access: bool, access_value}` so 30 days of data can confirm required-location didn't hurt completion — the empirical check on §1.

---

## Open flags for Lee (do not invent)
1. Formspree plan tier — gates the autoresponse decision.
2. Required `location`: my recommendation is required; optional-but-first is the fallback if Lee prefers softer.
3. George: final wording for the access options, helper lines, and location error (drafts above are placement-grade, not final voice).
4. Whether crane/on-site leads get a different reply template on Lee's side (ops, outside site scope — the subject convention makes filtering trivial).

## Sources
**Form-length evidence (secondary/aggregator — treat numbers as directional):**
- Venture Harbour, "5 Studies on How Form Length Impacts Conversion Rates" — https://ventureharbour.com/how-form-length-impacts-conversion-rates/ (Aagaard counter-example, multi-step, expectation effects; fetched 2026-07-28)
- Digital Applied, form conversion benchmarks — https://www.digitalapplied.com/blog/form-conversion-rate-benchmarks-2026-data-points
- Mailmunch, form length and conversion — https://www.mailmunch.com/blog/form-length-affect-conversion-rate
- Brixon Group, B2B lead form field counts — https://brixongroup.com/en/lead-forms-in-b2b-the-perfect-balancing-act-between-data-depth-and-conversion-rate
- CoBloom, "Form Fields and Conversion Rates: Is Less Really More?" — https://www.cobloom.com/blog/form-fields-and-conversion-rates-is-less-really-more
- Baymard optional-labeling finding: reached only via aggregators; primary study not accessed — marked in §1d.

**Formspree (primary where reachable):**
- Auto-response — https://help.formspree.io/hc/en-us/articles/360025007233-Sending-a-confirmation-or-response-email
- System limits — https://help.formspree.io/hc/en-us/articles/7017303616659-System-Limits
- Account limits — https://help.formspree.io/hc/en-us/articles/47605896654227-Account-limits
- Staxly Formspree overview (third-party; verify routing/plan details in dashboard) — https://staxly.dev/platforms/formspree

**Internal:**
- `src/_includes/pages/contact.njk`, `js/forms.js` (read 2026-07-28)
- `docs/redesign-2026-07/14-wim-journey-funnel.md`, `13-george-copy.md` §5–6, `10-jen-art-direction.md` §3.7
- Lead scenarios, 1.5x on-site price delta, brief: per Lee, 2026-07-27.
