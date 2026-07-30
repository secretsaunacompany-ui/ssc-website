# Plan Critic Review — Redesign Wave A

**Plan:** `.claude/plans/redesign-wave-a.md` (updated 2026-07-29)
**Rubric:** `~/marvin/.claude/rules/plan-critic-rubric.md` (v2)
**Reviewed:** 2026-07-30
**Prior passes:** `website-redesign-2026-07-critic.md`, `-rev2.md`, `-rev3.md` (partial clearance)
**Scope of this pass:** the plan in its current form, with priority on material never critic-reviewed — WP-0b in full, `35-configurator-price-sheet.md` in full, and the 2026-07-29 additions (§2 accent-wall correction, §2B semi-enclosed decks, §5B speaker tiers, §2.7 generalisation, `models.json` parity).

**Method note.** Every file:line, figure and arithmetic claim below was checked against the working tree at `4e11c9c`. Where the plan's claim survived verification, it is marked verified and not re-litigated. Where I could not verify something (one Netlify deploy id), I say so rather than guess. Two hypotheses I formed while reading were **disproved** by direct check and have been dropped rather than reported — noted here because rev3's lesson cuts both ways: unchecked suspicion is as corrosive as unchecked attestation.

---

## Applicability block

**Project type(s):** (a) live public commercial website serving a revenue funnel; (b) a pricing instrument — the configurator computes and publishes the numbers a customer is quoted; (c) front-end build/tooling change (fonts, tokens, motion, CI-adjacent harness); (d) a research-derived cost/price corpus (doc 35).

| Dim | Status | Tag | Why |
|---|---|---|---|
| 1–10 core | Active | **GATING** | Universal. |
| **X1** Physical & human safety | **Does not fire** | — | *Negative attestation:* the plan ships website markup, CSS, fonts, an SVG mark and price strings. It creates no control path, no firmware, no G-code, no mains-power or heat-producing output. Heater and stove references are catalogue strings rendered as text, not commands to hardware. The one heat-adjacent item — doc 35 §5B.2's finding that no outdoor speaker is rated for hot-room ceiling temperature, and §5.2's note that the old lighting price rested on a non-heat-rated $45 strip — concerns the accuracy of *published product copy*, so it is verdicted under X4, not here. No plan state can injure a person. |
| **X2** Privacy & data stewardship | **Fires** | **GATING** | WP-0b collects name, email, **physical location and site-access instructions**, posts them to a third party (Formspree), and — by the plan's own change — persists the configuration in `localStorage` for 7 days instead of per-tab `sessionStorage`. Personal data plus a description of how to get onto someone's property. |
| **X3** Evidence & source integrity | **Fires** | **GATING** | *Positive attestation:* doc 35 is research whose conclusions set real prices and reach the public. Every price is a load-bearing factual claim. |
| **X4** Audience, brand & money accuracy | **Fires** | **GATING** | Money, and a public commerce surface. Nineteen priced lines, a savings claim in marketing copy, and a live quote funnel. This is the centre of gravity of the review. |
| **X5** Concurrency & re-entrancy | Fires | Advisory | `localStorage` shared across tabs; double-submit; a re-entrant modal; the harness's `WORKING` mode operating on the live tree. |
| **X6** Operability & observability | Fires | Advisory | Deployed site; a weekly submission check intended to run unattended; analytics events as the programme's success instrument. |
| **X7** Self-modification safety | **Does not fire** | — | *Negative attestation:* nothing here touches MARVIN's gates, hooks, skills, agents or automation. The new `stylelint` config and the proposed Eleventy content-hash filter are build tooling inside a client repo; they cannot lock MARVIN out of anything, and the plan-gate/relay-gate machinery is untouched. |
| **X8** Dependencies, performance & cost | Fires | Advisory | Adds `fontaine`, `glyphhanger`, `stylelint`, self-hosted font binaries; touches the CSP and cache headers. |

Twelve active dimensions plus two negative attestations.

---

## Verdicts — universal core

### 1. Problem-fit — **PASS**

Wave A correctly identifies the actual need: a quote button that has never once delivered a submission, and prices that are wrong in the customer's favour by thousands per sale. Scoping to "everything not blocked on Lee" is the right cut, and the out-of-scope list is named rather than vaguely deferred. Folding WP-0b in on Lee's 2026-07-28 call is right — the pre-flight and quote-integrity work is worth little if the funnel it protects stays broken.

### 2. Approach soundness — **CONCERN**

The core moves are sound: an in-modal two-step form (doc 14 §1 verified as the genuine source, including the `<form>`-posts-to-`mdaaejwp` design), incremental-cost-plus-margin as the pricing basis, tokens from a single arbitration document, one commit per package with a revert SHA. Doc 35's convention (incremental cost → stress → ÷0.55 → round up, floor-check at 40%) is coherent, consistently applied, and its rule 4 ("prices only move up or hold") is a sensible ratchet.

Two soundness problems:

**(a) The plan's §3a bullet list is presented as the price enumeration and is not one.** It opens "Every line from `35-configurator-price-sheet.md`. Load-bearing changes:" and then lists ten. Doc 35 §6 specifies **nineteen** code changes (verified by row count). **Ten are absent from the plan** — eight substantive, two default-markup price-text edits (changes 12 and 14). The substantive eight: `interiorUpgrade` repricing (change 2 — S2 rises 120%, $1,000→$2,200), `premiumFinishPrice` repricing (change 3 — all five models, +$2,000 to +$2,200), the S2–S8 electric heater rise from $2,000 to **$3,500** (change 5 — the plan mentions only the *SC* path being separated, never that the mainline heater price rises 75%), per-model exterior repricing (changes 10 and 11), the **savings-copy change to "Save $500"** (change 13 — see X4.1), the **new full-size window tier at $3,700** (change 15 — the word "window" does not appear anywhere in the plan), and the lighting rise $1,500→$2,000 (change 16).

*Fix:* either replace §3a's bullet list with a pointer that carries no enumeration ("every line in doc 35 §6, all nineteen changes, no exceptions") or make the list complete. A partial list that reads as complete is how a repricing ships half-done.

**(b) WP-0c is specified to make a claim true that WP-0b then makes false.** See dimension 9 and X4 — this is the review's central finding.

### 3. Completeness — **FAIL**

Six gaps, each independently capable of producing a defect in production.

**3.1 WP-0b does not appear in the sequencing diagram.** §8's diagram runs `P-A/P-B → WP-0c → WP-0a → WP-1a → WP-1b → [prod gate] → production`, with WP-2a parallel. The package the plan itself calls "the package this whole programme exists for" is **absent**. It has no stated position, no commit unit, no revert SHA slot, no prod-gate relationship. `HANDOFF.md:52–59` supplies an order the plan does not contain ("Then WP-0c, WP-0b, WP-0a, WP-1a, WP-1b, WP-2a as sequenced in plan §8") — pointing at a diagram that omits it.
*Fix:* put WP-0b in the diagram explicitly, between WP-0c and WP-0a, and state its prod-gate status.

**3.2 §8's shared-file ownership rule names the wrong files.** It names `netlify.toml` and `styles.css`. The actual collision in Wave A is `src/_includes/modals/sauna.njk`, `js/modal.js` and `js/data.js` — touched by WP-0c (WiFi option, bench fix) *and* rewritten wholesale by WP-0b (two-step form, nineteen price changes), and touched again by doc 35 changes 1/2/3 in `js/data.js`.
*Fix:* add those three files to the single-owner list, with WP-0b as owner and WP-0c merging first.

**3.3 The `/contact/` fallback is specified as a state and is broken by the plan's own storage change.** Verified: `js/modal.js:381` writes `sessionStorage.setItem('ssc_quote_config', …)`; `js/navigation.js:72` reads `sessionStorage.getItem('ssc_quote_config')` and `:77` immediately removes it. The plan switches the modal to `localStorage` (§3a) and lists "`/contact/` fallback" as one of its six states — but never mentions `navigation.js`. If the modal writes `localStorage` and `navigation.js` still reads `sessionStorage`, **the fallback state silently never fires**. Doc 14 §1:47–49 specifies the correct handling (delete-on-read "removed entirely"; keep `/contact/` as fallback with a visible attached-config banner; "key survives until successful submit"); the plan does not carry any of it.
*Fix:* name `js/navigation.js:72–79` in WP-0b's file list; carry doc 14 §1:47–49's three rules verbatim into the plan.

**3.4 The `_subject` string is unarbitrated and two authorities disagree.** Doc 14 §1:34 specifies `"Configurator Quote Request — {Model} — ${Total}"`. Doc 33 §6:158 specifies `"Configurator Quote — {Model} — ${Total} — {location}"`. Doc 21 does not arbitrate it. The plan says only "a dynamic `_subject`". This is exactly the conflict the plan's own §0 says must stop the batch and be resolved into doc 21 — and it is discoverable *now*, not mid-relay. It is also load-bearing for N4/WP-0a: the weekly check counts the configurator stream by this string.
*Fix:* resolve into doc 21 before the relay opens; pick one and record it.

**3.5 The third value-collision is unswept.** Verified in the working tree: three radio groups carry duplicate `value=` across distinct products — `bench` (both `value="0"`, `sauna.njk:148,153`), `exterior` (both `value="2500"`, `:115,:120`), and `interior` (**both `value="interiorUpgrade"`, `:134,:139` — Clear Cedar and Thermowood**). Doc 35 change 19 fixes bench; changes 10/11 fix exterior by giving each a distinct per-model token. **Nothing fixes interior.** Today's DOM-reading serializer reads the `.addon-label` text, so the summary is correct — but doc 35 §7.7 explicitly flags that clear cedar is priced at thermowood parity on an unverified assumption and may have to split, at which point one shared token cannot carry two prices. And if WP-0b's `<form>` serialises named fields, the two become indistinguishable in the payload.
This is precisely rev3's closing lesson — *"state the class, not the instance… a fix which exactly matches the words of the request has probably not been generalised."* The class is "one token, two products." Two of three members swept.
*Fix:* give Thermowood its own token in the same pass, mirroring changes 10/11.

**3.6 WP-0b's serialisation contract is unspecified.** The plan says "a real `<form>` posting to the existing Formspree endpoint" but never says whether each option posts as an individual named field or whether the configuration is composed into one text field. The two have different, opposite failure modes: named-field serialisation drops the three checkboxes (`window`, `lighting`, `speakers` at `sauna.njk:177,182,187` carry **no `name` attribute at all** — verified — as would doc 35's two new checkboxes, changes 15 and 18) and collides on duplicate values; single-blob composition is immune to both but loses machine-readability for the `_subject` and analytics payloads. An implementer must guess.
*Fix:* state the contract. If named fields, add `name` to every input in the same pass and finish the collision sweep (3.5).

### 4. Right-sizing & reuse — **PASS**

Genuinely well-sized. Reuses `SSC.handleSubmit`, the existing Formspree endpoint, the existing `interiorUpgrade` per-model pattern for the new per-model tokens, the existing `site.features` flag pattern (verified: `src/_data/site.json` carries `features.advisor`, consumed at seven sites), and the existing `.reveal`/observer machinery. Out-of-scope is named per package, not waved at. The two-tier splits (deck, speaker, window) reuse one pattern three times rather than inventing three. Self-hosting fonts *shrinks* the CSP rather than growing it — verified, `netlify.toml` carries `fonts.googleapis.com` in `style-src` and `fonts.gstatic.com` in `font-src`, both deletable. A PNG-at-2x stopgap sanctioned for the nav but explicitly not the favicon is exactly the right granularity of compromise.

### 5. Security — **PASS**

No new secrets, no auth surface, no new attack surface of consequence. The `_gotcha` honeypot is a net addition. `form-action https://formspree.io` is already present in the CSP, so the in-modal POST is not newly permitted. Removing two Google origins reduces third-party script/style reach. Blast radius of a bad deploy is bounded by the rollback mechanism in §9. The `ssc-ops.netlify.app` script-src grant is pre-existing, deliberate, and documented in `netlify.toml`; nothing here changes it.

### 6. Failure modes — **CONCERN**

Well covered on the submission path: six states specified plus four the prior review added (validation failure, double-submit, offline, modal closed mid-step-2), failure keeps the form mounted with values intact, a `mailto:` fallback carries the configuration, and "the config must always have a second exit" is the right principle stated as a principle.

What is not covered:

- **The `/contact/` fallback fails silently** (3.3) — the one failure path the plan names as the safety net is the one broken by its own storage change.
- **Formspree itself** — no behaviour specified for a non-2xx, a rate-limit (Formspree's free tier caps monthly submissions), or a changed endpoint. `js/forms.js:16` hardcodes `mdaaejwp` as a fallback *in addition to* the form `action`, so the endpoint has two sources of truth; if one is changed and not the other, submissions go to the old form and the inbox looks healthy.
- **Doc 35's own supply failures** are priced but not operationally handled: IKI stock is unknown (§7.6), freight is a $500 allowance against a quote-only reality (§7.4), and stones are a proxy price (§7.5). The site would publish a firm +$9,800/+$10,800 wood-fired price against a stove nobody has confirmed is orderable. Doc 35 §7.4's instruction — close it "before the first wood-fired quote goes out, **not** before the site ships" — accepts that gap deliberately, but the plan never surfaces the acceptance.

*Fix:* specify Formspree non-2xx and rate-limit behaviour; collapse the endpoint to one source of truth; carry doc 35 §7's live-supply caveats into the plan as a named accepted risk with the "call B Saunas before the first wood quote" action assigned.

### 7. Change safety — **FAIL**

The rollback design is good: a named restore floor with a stated reason, `netlify api restoreSiteDeploy` for instant recovery, `git revert` for code, and a plain-English "say put it back" instruction that respects Lee being non-technical. Per-package commits with revert SHAs are right.

**7.1 There is no price-transition handling of any kind.** I swept all nineteen docs in `docs/redesign-2026-07/` and the plan for effective date, quote validity, outstanding/in-flight quotes, grandfathering, honouring prior prices, rollout date. **Found none.** Doc 35 §6 is a table of nineteen edits that flip prices in place. The increases are large and immediate:

| Line | Old | New | Change |
|---|---|---|---|
| 3' changing room | $3,500 | **$11,000** | +214% |
| 4' changing room | $4,500 | **$12,500** | +178% |
| Wood-fired | $3,000 (Kuuma) | **$8,200–10,800** (IKI) | +173–260% |
| Electric heater, S2–S8 | $2,000 | **$3,500** | +75% |
| Interior upgrade, S2 | $1,000 | **$2,200** | +120% |
| Premium Finish Package | $7,000–10,500 | **$9,200–12,500** | +$2,000–2,200 |
| Lighting | $1,500 | **$2,000** | +33% |
| 2'/3' deck (semi-enclosed) | $2,000/$3,000 | **$4,100/$5,200** | +105%/+73% |

Anyone mid-conversation with Lee on the old numbers, or holding a printed/emailed estimate, sees a different site the morning after deploy. This is a **judgement call that belongs to Lee, not to the implementer**, and the plan does not put it to him.

**7.2 The `localStorage` change makes 7.1 concrete and self-inflicted.** A 7-day window means a configuration saved *before* the price deploy is restored *after* it. The plan specifies no version stamp on the stored config and no invalidation on price change. The customer sees their saved total change under them, or worse, sees a stale total that no longer matches the line items. Rev3 raised the sibling issue (multi-tab last-writer) and it was dropped too.
*Fix:* stamp the stored config with a price-sheet version; invalidate and re-price on restore if the version differs; tell the user plainly when that happens.

**7.3 Rollback across a price change is a second uncontrolled price flip.** §9's mechanism restores a *deploy*. Restoring to a pre-WP-0b deploy puts the old, loss-making prices back on the site — Kuuma at a ~$3,000/sale loss returns, changing rooms return to $3,500. The plan's restore floor correctly guards against re-introducing the data leak; it does not guard against re-introducing the pricing defects the programme exists to fix.
*Fix:* add pricing to the restore-floor logic — after WP-0b ships, the floor moves to the WP-0b deploy, and any rollback below it re-applies the price commit in the same operation, exactly as §9 already does for the leak fix.

**7.4 `HANDOFF.md` is stale and instructs the opposite of the plan.** `HANDOFF.md:101–105` states changing-room pricing is unresolved, Lee "has not yet responded," and "**If he does not accept before WP-0b runs, those two lines ship at current prices and flagged.**" The plan (`:182–186`) states the opposite: resolved 2026-07-29, "these were the last unresolved lines; there are none now." HANDOFF is the cold-start document a fresh session reads first, and it currently instructs that reader to ship $3,500/$4,500.
*Fix:* update HANDOFF in the same commit as any plan change. It is a derived index; it must never be older than its source.

**7.5 The restore floor could not be verified.** Deploy id `6a68f16f80fdaf000837b588` cannot be checked without Netlify API access, which I do not have in this pass. Stated as unverified, not as wrong. The associated commit `cc8270f` does exist in the tree.

### 8. Data integrity & compatibility — **FAIL**

**8.1 `models.json` "same-pass parity" is specified as a copy and is actually a schema extension.** Verified: `/home/leesalo/marvin/content/reference/operations/models.json` exists, `_updated: "2026-02-09"`, filesystem mtime 2026-03-27, and `_source` reads "Synced from website index.html (modal section) and js/data.js" — a file that no longer exists since the Eleventy migration. Today its numbers agree with the site on everything both carry. But it **cannot represent the shape doc 35 creates**: one `heater_apex` entry cannot hold the per-model electric split ($3,500 S2–S8 / $2,800 SC); there is no bench group at all; no deck tiers; no speaker tiers; no window tiers; no `woodFired`/`woodFiredLabel` per model. P9 parity as written ("every value changed lands in models.json in the same commit") is unachievable without designing new structure, and the plan budgets no work for it.
*Fix:* specify the target schema for `models.json` as part of WP-0b, or explicitly downgrade P9 to "models.json is regenerated from `js/data.js` by a script" and write the script.

**8.2 The phantom-heater fix is scoped to one line and the string lives in four places.** Verified occurrences of "Homecraft 9kW Apex" in hand-authored source:

- `js/data.js:84` — the only one the plan and doc 35 name
- `netlify/functions/prompts/commercial.js:13`
- `netlify/functions/prompts/faq.js:36`
- `netlify/functions/data/products.json:58`
- plus `~/marvin/content/reference/operations/models.json:48`

Doc 35 change 1 is correct that fixing `data.js:84` also fixes both *render* points (`modal.js:97`, `compare.js:28`) because they read from data — that reasoning is sound and verified. But it does not reach the three Netlify function files, which feed customer-facing AI answers. `site.features.advisor` is currently `false`, so at least one consumption path is dormant; `products.json` and the FAQ prompt should be checked individually before the fix is called complete.
This is the same literalism rev3 named: the quoted instance fixed, the class unswept.
*Fix:* sweep all five locations in the same commit; verify each consumer.

**8.3 Two sources of truth for the Formspree endpoint** — `contact.njk:18` (form `action`) and `js/forms.js:16` (hardcoded fallback). Pre-existing, but WP-0b adds a third form on the same endpoint. Collapse to one.

**8.4 Doc 21 does not record the override it is supposed to record.** ROADMAP names doc 21 as the file that "overrides 10–14 on those values." Doc 33 §6:160 overrides doc 14's configurator field set (three fields → five). That override is real, well-argued and authored by the same specialist — but it lives in doc 33, not doc 21, and doc 21's §4 is where a mid-relay implementer would look. Same for the reply-time promise: doc 21 §4 **E3** still says the number "does not ship anywhere until Lee gives the number," and `13-george-copy.md:335,547` still carry `[NEEDS LEE: reply-time]` — while Lee answered it in `20-fact-gathering-questions.md:75–80` on 2026-07-28. The plan is substantively right on both; the corpus contradicts itself, and an implementer following the plan's own §0 rule ("a new conflict discovered mid-relay stops the batch") will stop.
*Fix:* close E3 in doc 21, clear the two `[NEEDS LEE]` markers in doc 13, and record doc 33 §6's field override in doc 21.

### 9. Verifiability (incl. testing the tests) — **FAIL**

**9.1 The WP-0c verification criterion is arithmetically wrong the moment WP-0b lands.** This is the review's central finding; full arithmetic under X4.

**9.2 The harness repair drops four of the nine fail-open paths rev3 required, and states no thresholds.** Verified directly in `scripts/visual-diff.mjs` and `scripts/lib/diff.mjs`:

- `shiftCoverage` and `layoutShiftMaxPx` are computed at `lib/diff.mjs:138–149` and written to the report, but the gate at `visual-diff.mjs:176–187` tests only `layoutShiftPx` (the **p99**, not the max), `heightDeltaPx`, and `changedPct`. The plan's "both are already computed and neither is gated — this is most of the repair" is verified true. **But the plan states no threshold for either.** An ungated metric with no budget is not a gate.
- `expectedToChange` is **route-level, not metric-level**: `status = expected ? 'EXPECTED' : 'FAIL'` waives whichever metric blew, and the same map also suppresses page-added/page-removed structural failures at `:201–203`. The plan's "waives `changedPct` only" is therefore a **restructure**, not the flag-flip the plan's one-line framing implies.
- **Still fail-open and unowned anywhere in Wave A** (rev3 required all four): `"widths": []` treated as truthy; `fetchFailures > 0` not a failure; the missing-PNG `continue` at `visual-diff.mjs:174` silently skipping pairs while the screenshot count is computed arithmetically at `:87`; and discarded redirects (`/booking-ops.html` bouncing to auth compares two auth screens and passes).
- **Zero tests exist in the repo** — verified, no `*test*`/`*spec*` files outside `node_modules`, no `test` script in `package.json`. The plan's three fixture tests would be the first.

*Fix:* state numeric budgets for `shiftCoverage` and `layoutShiftMaxPx`; restructure `expectedToChange` to per-metric; add the four missing fail-closed paths; keep the three fixtures.

**9.3 The hero-video determinism caveat is stated and then not resolved.** "Fix or document — a determinism claim resting on a second bug is not a determinism claim" is exactly right, and then the plan picks neither. *Fix:* pick one, in the plan.

**9.4 WP-0b's acceptance test is passable while broken for the cohort that matters.** "A real quote request arrives in the inbox from the modal" will be run in a fresh browser context and will pass, while returning visitors keep the year-cached broken bundle. Rev3 named this a false-green. The plan carries P-A, which is the right fix, but does not connect P-A to WP-0b's acceptance test. *Fix:* add "verified from a browser profile that visited the site before the deploy" to WP-0b's definition of done.

**9.5 What is genuinely well-verified, and should be credited.** Doc 35 prints its derivations rather than asserting them; §2.5 reconciles three independent labour methods and explains *why* the per-square-foot formulas mis-scale (fixed-task floor) rather than averaging them; §2.6 shows the audit's own recommended prices failing Lee's floor; §4.1 prints the corrected arithmetic chain step by step; §2B.4 and §5B.1 both show the rejected alternatives with their margins. The accent-wall correction in §2 is a model of how to fold a client correction: it names the input that changed, traces the three consequences, reports the net effect (−$35 / +$15), and states that the recommended prices are unchanged *because* the movement was immaterial — rather than quietly re-deriving to the same answer. I re-checked doc 35's package-saving arithmetic independently and it is correct on all five models (below, X4).

### 10. Maintainability — **CONCERN**

Good: the `stylelint` guard banning raw `font-size`/`border-radius` outside `:root` is the move that makes the token consolidation permanent rather than a one-time tidy — that is the single best maintainability decision in the plan. The content-hash filter (P-A preferred fix) permanently kills a class of staleness. Retiring `--color-charcoal` (verified: `styles.css:13`, `#c0c0c0`, exactly 14 consumptions, all `color:`) and defining `--color-bg` (verified: consumed at `styles.css:2687,2725`, defined nowhere) are honest cleanups.

Concerns:

- **`booking-ops.html` remains a second, unreconciled token universe.** Verified: repo root, live at `/ops`, its own inline `:root`, and it defines `--color-bg: #0f0f0f` — the same token name the plan is about to define differently in `styles.css`. The plan correctly extends the *grep-clean* gate to it (T2) but does not reconcile the token values. Two files will define one token name with two values.
- **"doc 21's T1–T4 count corrections" mislabels T2.** T1, T3 and T4 are count corrections; **T2 is not** — it is the `booking-ops.html` scope defect plus three conflicting token values. The plan cites T2 correctly in §6 and loosely in §5's production gate. An implementer could satisfy "T1–T4 count corrections" by fixing three numbers and skipping the file that breaks `/ops`.
- **`package-lock.json` is gitignored** (`.gitignore:2`, verified untracked) **and `@11ty/eleventy` is `^2.0.0`** — rev3's must-fix 10, dropped. See X8.

---

## Verdicts — conditional dimensions

### X2 — Privacy & data stewardship — **CONCERN** [GATING]

The plan collects more than the site does today and stores it longer, and never once uses the word privacy.

- **Minimum collection:** defensible. Five fields, each justified; doc 14 §1:35 explicitly bans phone, budget and timeline selects, and doc 33 §6 argues location from a real failure (the North Vancouver unscopeable lead). Good discipline.
- **Retention/exposure — not named in the plan.** The switch from `sessionStorage` (dies on tab close) to `localStorage` (survives reboot, 7 days) is made on funnel-coherence grounds alone. What is now persisted in plaintext on the device for 7 days includes a **physical address and site-access instructions** — on a shared family computer, a work machine, or a library terminal. Doc 14 §1:49 does specify "key survives until successful submit," which is a retention rule; the plan does not carry it, and it does not cover the abandon case, which is the common one.
- **Third-party transfer:** Formspree receives and stores this. No privacy-policy link on the new form is specified. Rev3's N6 flagged that the privacy page has no work package and no Pierre/Petra review; that is still true, and WP-0b now adds a second collection surface to a site whose privacy page is unreviewed. PIPEDA applies to BC commercial collection.

*Fix (all three, small):* carry doc 14's retention rule into the plan and add an explicit clear on abandon or on expiry, whichever comes first; add a privacy-policy link beside the Step 2 submit; put the privacy page in front of Petra before WP-0b's production deploy, not as part of the parked WP-4.

Not a FAIL because the collection is minimal and purposeful and an upstream retention rule exists — but it is gating-tagged and belongs high in the must-fix list, because the exposure was *increased* by a deliberate change made without weighing it.

### X3 — Evidence & source integrity — **CONCERN** [GATING]

Doc 35's own integrity is strong — arguably the best-sourced document in the corpus. Prices carry dated URLs and check-dates; §7 lists twelve unverifiables plainly, each with its direction of error and what would close it; §8 separates live checks by date from inherited internal sources; the margin convention states explicitly that Homecraft retail pricing makes every margin a **floor** rather than an estimate, which is the honest framing. Where a source could not be found (clear cedar 1x6 T&G, §7.7) it says so and prices at parity rather than inventing a number. The IKI brand identification (§3.1) shows its reasoning, corrects the brief's "Lithuanian" to Finnish, and explains why the phonetic match beats the alternative on Lee's own stated criterion.

The failure is **transmission, not derivation**: the plan strips the uncertainty.

- §3a presents IKI prices as settled and never mentions that freight is a $500 *allowance* against quote-only reality (§7.4, ±$300 moves the price ±$570), stones are a proxy (§7.5), or **stock is unconfirmed** (§7.6).
- The H-Series credit instability (rev3 **P3**) — load-bearing under every heater line — is not surfaced in the plan at all. Doc 35 §4.2 resolves it correctly and conservatively; the plan doesn't carry the resolution or the watch item.
- §7.7's clear-cedar parity risk is not surfaced, though it is the assumption most likely to require a post-ship price change (and it interacts with finding 3.5).
- Plan §3 says "Research priced a heat-rated controller around $550." Doc 35 line 55 costs the WiFi line at **$1,020 direct** ($550 touchpad + $350 contactor + 2h). The $550 is one component quoted as if it were the basis.
- Rev3's **Assumption 3** is untouched by anything: doc 31 records realized price at **73% of list on average**. The entire repricing operates on list prices while the margin problem may live in the discount. Wave A's whole justification for pulling WP-0b in is pricing accuracy, and the discounting practice is not examined.

*Fix:* add a short "what is still soft" paragraph to §3a carrying §7's four live-supply items, P3, and §7.7; correct the $550 to $1,020; put the 73%-realized-price question to Lee as a named open item.

### X4 — Audience, brand & money accuracy — **FAIL** [GATING]

**X4.1 — The plan specifies shipping a money claim its own price authority says is false.**

Plan §3 (WP-0c):
> "Add WiFi as an individually-selectable $2,000 option… The basket becomes $8,000, the claim becomes true… **Verify:** with WiFi selected individually alongside the other four components, the total must exceed the package price by **exactly $1,000** on all five models."

Plan §3a:
> "**WiFi controller added at $2,000**, individually selectable — which makes the Premium Package's **"Save $1,000" true** instead of backwards by $2,000."

Doc 35 §1 row 18, §6 change 13:
> *"À la carte now sums to $9,700–13,000; package = à la carte − $500. **"Save $1,000" becomes "Save $500"** — $500 is the largest saving that keeps every model above the 40% floor."*
> *"A $1,000 saving would put the S2/S4 packages at 37.4–37.5% stressed GM in the worst cedar-cost case — **under the floor**."*
> Change 13: `sauna.njk:161` → *"**Save $500** vs selecting individually"*

Both are internally correct; they describe different price worlds. I verified both arithmetics independently.

*At current prices, with WiFi added (WP-0c's world):* basket = `interiorUpgrade + 2500 + 2000 + 1500 + 1000` = `interiorUpgrade + 7000`; package = `interiorUpgrade + 6000`. Delta **$1,000 on every model** — S2 $8,000 v $7,000, S4 $8,500 v $7,500, S6 $9,500 v $8,500, S8 $10,500 v $9,500, SC $11,500 v $10,500. The plan's verify criterion is correct here.

*At doc 35's prices (WP-0b's world):* basket = `interiorUpgrade_new + cedar_new + 2000 + 2000 + 1000`; package = `premiumFinishPrice_new`.

| Model | Basket | Package | Delta |
|---|---|---|---|
| S2 | 2200+2500+2000+2000+1000 = **9,700** | 9,200 | **500** |
| S4 | 2600+2500+2000+2000+1000 = **10,100** | 9,600 | **500** |
| S6 | 3000+3000+2000+2000+1000 = **11,000** | 10,500 | **500** |
| S8 | 3500+3000+2000+2000+1000 = **11,500** | 11,000 | **500** |
| SC | 5000+3000+2000+2000+1000 = **13,000** | 12,500 | **500** |

Doc 35's arithmetic is exactly right on all five. **The plan's verify gate is therefore wrong the moment WP-0b lands**, and — worse — the string "Save $500" **appears nowhere in the plan**. `sauna.njk:161` currently reads "Save $1,000". WP-0c leaves it. WP-0b, if implemented from the plan's bullet list rather than doc 35 §6, leaves it. The result is a **checkably-false money claim, live on a commerce surface, overstating a saving by 2× — which is the exact defect (rev3 N5) this programme exists to fix, recreated one package downstream.** An implementer who satisfies the plan's own verify criterion literally ships it.

*Fix (all three):* (a) delete the "exactly $1,000" verify criterion and replace with "the delta must equal the saving stated in `sauna.njk:161`, on all five models, at whatever prices are live in that commit"; (b) add doc 35 change 13 ("Save $500") to §3a's list explicitly; (c) state that between WP-0c and WP-0b the copy reads "Save $1,000" and is true, and that WP-0b must change it in the same commit as the price changes — never a commit apart.

**X4.2 — The illustrative absolutes are S2-only, presented as universal.** Verified: `premiumFinishPrice` is $7,000/$7,500/$8,500/$9,500/$10,500 across S2–SC; the assemblable basket is $6,000/$6,500/$7,500/$8,500/$9,500. Plan §3's "the basket a customer can actually assemble is $6,000 against a $7,000 package" and "the basket becomes $8,000" are the S2 row, asserted "on every model." The **$1,000 gap and the $2,000 direction error are model-invariant and the plan's conclusion is right**; the dollar figures are not. *Fix:* write them as `interiorUpgrade + $5,000` vs `interiorUpgrade + $6,000`, as rev3 did.

**X4.3 — No customer-transition policy for a repricing that runs from +33% to +260%.** See 7.1. This is a brand and money decision of real consequence and it is not put to Lee anywhere.

**X4.4 — The premium speaker tier ships without its safety-adjacent honesty line.** Doc 35 §5B.2: *"no outdoor speaker is rated for hot-room ceiling temperatures. The premium tier's site copy must state the actual mounting practice."* The fact is DOCKED on Lee. The plan's instruction — "ship a placeholder-free functional label without the mounting claim until he supplies it" — is reasonable for a *placeholder*, but it means a $1,500 audio upgrade publishes into a hot-room product with no statement of where the speakers go. A customer can reasonably infer ceiling mounting inside the sauna.
*Fix:* either hold row 14b until Lee supplies the sentence, or ship with a minimal true line ("mounted outside the peak-heat zone; placement confirmed at consultation") that does not require his input to be accurate.

**X4.5 — Two-tier labels change what an existing option means.** Relabelling today's "2' Front deck" to "2' open deck platform" at the same $2,000 is correct and honest (doc 35 §2B is persuasive that the semi-enclosed build was selling below cost). But a customer who saw "Front deck / +$2,000" last week and returns to "open deck platform / +$2,000" alongside "semi-enclosed / +$4,100" has effectively had their expected product repriced by 105%. Same for speakers. Doc 35 handles the *margin*; nobody handles the *conversation*. Folds into 7.1.

**X4.6 — Credit where due.** Doc 35's core money work is sound and I could not break it. The convention is applied consistently across all nineteen lines; every recommended price clears the stated 40% floor at stress cost; the two-tier splits are the right structural answer to "the cost model describes a leaner product than the one that leaves the shop," and §2B.4 names that class explicitly as its third instance. The §2.7 trailer rule generalised to decks is a genuine catch — box length is box length, and pricing a deck without the chassis step would have reproduced the changing-room error. The Kuuma cut is correct and overdue.

### X5 — Concurrency & re-entrancy — **CONCERN** [ADVISORY]

Double-submit is named as a state. Not covered: **multi-tab last-writer** (rev3 raised it against `sessionStorage`; the switch to `localStorage` makes it *worse* — two tabs configuring two models now share one key across the whole browser, with no rule stated); config-vs-price-sheet version skew on restore (7.2); and the harness's `WORKING` mode running `rm -rf dist` against the live working tree (`scripts/lib/build-ref.mjs:33,46`), which is a footgun if a build is running concurrently. *Fix:* state a last-writer rule and a version stamp; make `WORKING` mode build to a temp dir.

### X6 — Operability & observability — **CONCERN** [ADVISORY]

The instrument is the right one — `quote_submit_success` off zero is a real success criterion, and counting the configurator stream separately via `_subject` (N4) is the correct fix for the aggregate-masking problem. But after rev3 asked twice, the weekly submission check still has **no stated host, no reader, no threshold, and no delivery mechanism** — "surfaced to Lee in plain English" is an outcome, not a design. It is also the only instrument that would catch a silent revenue-channel outage, which makes it the one piece of observability that must actually exist.
*Fix:* name where it runs (cron/systemd/routine), what it reads (Formspree API? analytics store?), the threshold that makes it speak, and the channel. One paragraph.

Second item: analytics only started recording 2026-07-28, so there is no baseline. A week-over-week comparison has nothing to compare against for its first two weeks. Say so, so a quiet first fortnight isn't read as a regression.

### X8 — Dependencies, performance & cost — **CONCERN** [ADVISORY]

Good: `fontaine` and `glyphhanger` pinned to exact versions and typosquat-checked before install is exactly right, and stated in the plan. Self-hosting fonts is a net performance and CSP win. Content-hashed immutable font binaries are correct.

Gap: rev3's must-fix 10 second half is unowned — **`package-lock.json` is gitignored and untracked** (verified, `.gitignore:2`) while **`@11ty/eleventy` sits at `^2.0.0`**. The build tool is the least pinned thing in the repo, on a project whose entire deploy story rests on reproducible builds, and the plan is about to add three more dev dependencies and a font pipeline to it. A caret-range Eleventy minor bump between the draft deploy and the production deploy would invalidate the draft review.
*Fix:* commit the lockfile and pin Eleventy before WP-1a, in the same pre-flight bracket as P-A and P-B. It is a two-line change with the same "cheap now, expensive later" profile as the other two.

---

## Stress test 1 — Pre-mortem

**Scenario A (most likely) — the doubled savings claim reaches customers.** *It is October. WP-0b shipped in August with doc 35's prices. `sauna.njk:161` still reads "Save $1,000" because the plan's §3a list didn't carry doc 35 change 13, and the plan's own verify step said the $1,000 delta was the correct outcome — so the implementer confirmed it against the WP-0c world and moved on. The Premium Finish Package now costs $9,600 on an S4 against a $10,100 basket. A prospect adds it up, finds the saving is $500 not $1,000, and either walks or asks Lee about it — and Lee, who signed off a price sheet that says $500, has to explain why his own website says otherwise.* **Type-specific worst case: a wrong price reaches a customer as a quantified marketing promise the company cannot honour, on the one line the previous critic pass already flagged as false.** What we should have seen: the plan states a verify criterion in §3 that contradicts change 13 of the document it names as authority for every number, and the string "Save $500" appears nowhere in the plan.

**Scenario B — the quote path breaks silently in the one state built to catch breakage.** *A customer configures an S6, hits send, Formspree is rate-limited, the failure state fires, they take the `/contact/` exit. Nothing is attached — the modal wrote `localStorage`, `navigation.js:72` reads `sessionStorage`, the branch never runs. They retype what they can remember, or leave. `quote_submit_success` doesn't move, and because the weekly check has no threshold and no baseline, nobody notices for a month.* **Worst case: the quote funnel is broken in production and the instrument built to detect that is itself unspecified.** What we should have seen: the plan lists "`/contact/` fallback" as a required state and changes the storage mechanism in the same section, without naming `js/navigation.js` in either place.

**Scenario C — the repricing lands on a live conversation.** *Lee quoted a client a 4' changing room at $4,500 in July. In August the site says $12,500. There is no effective date, no quote-validity line, nothing in the plan that ever put the question to him. He honours the old price and eats a ~$3,000 loss, or he doesn't and loses the client.* **Worst case: a 178% price increase ships without anyone deciding how to handle the people already in the funnel — a decision that was always Lee's and was never surfaced to him.** What we should have seen: a nineteen-line repricing document with a "what changes in code" section and no "what changes for customers" section.

---

## Stress test 2 — Load-bearing assumptions

1. **That doc 35 is the single authority for every number, and the plan's §3a is a summary of it rather than a substitute.** *Confidence: high that it's intended; low that it will hold in practice.* §3a reads as an enumeration, is incomplete by ten of nineteen changes, and contains one criterion that contradicts doc 35 outright. **Consequence if wrong: a half-applied repricing plus a false public claim.** Resolve before implementation.

2. **That the pricing convention's inputs are stable enough to publish.** *Confidence: medium-high.* Doc 35 is admirably honest that they aren't fully — twelve open items in §7, the softest being the metal panel supplier ("still TBD, still the softest input"), IKI freight/stones/stock, and clear-cedar parity. The convention's upward bias makes every error land in SSC's favour, which is the right direction. **Consequence if wrong: prices are too high and conversion suffers quietly** — the failure that generates no complaint. Acceptable, but the plan should carry the caveats it currently strips.

3. **That realized price ≈ list price.** *Confidence: low — and this one is unexamined by anything.* Doc 31 records realized price at **73% of list**. Every margin in doc 35 is computed against list. If Lee discounts to the historical average, a 45% stressed GM becomes roughly 25%, and lines priced *at* the 40% floor go under it. **Consequence if wrong: the entire repricing fails to fix the margin problem it was built to fix**, while the customer-facing price rises 75–260%. This is the most dangerous unexamined assumption in the plan and it was flagged a pass ago.

4. **That the harness is a meaningful acceptance gate for WP-1a/1b.** *Confidence: low as written.* Four fail-open paths survive, the two headline metrics have no stated budgets, and `expectedToChange` needs restructuring rather than the flag-flip the plan implies. **Consequence if wrong: a stylesheet migration ships behind a green check that means nothing.** The plan's own escape hatch — declare the repair declined and substitute named human review — is honest and available; taking it deliberately is better than a half-repaired gate.

---

## Stress test 3 — Inversion

**What would have to be true for the rejected alternative — ship WP-0c's one-line corrections and defer WP-0b entirely — to win?**

It wins if any of: (i) doc 35's prices are not yet safe to publish; (ii) the repricing needs a customer-transition decision from Lee that hasn't been made; (iii) WP-0b's scope has grown past what one package can carry safely.

**Two of the three conditions are already true.** (ii) is unambiguously true — there is no transition policy anywhere in nineteen documents (finding 7.1), and it is Lee's call, not the implementer's. (iii) is arguably true: WP-0b now carries a two-step form rebuild, nineteen price changes, a schema extension to `models.json`, three new two-tier option groups, a serialisation contract that isn't specified, and a value-collision sweep that is two-thirds done — in one commit with one revert SHA. (i) is *false* — doc 35 is genuinely publishable, biased upward, honest about its softness.

This does not mean deferring WP-0b. Lee's 2026-07-28 call to include it stands, and the funnel is the whole point. But the inversion says something sharper: **WP-0b should be two commits, not one.** Split the *funnel rebuild* (form, states, a11y, fallback, events — no price changes) from the *repricing* (doc 35's nineteen changes + `models.json` + the savings-claim copy). They have different risk profiles, different revert consequences, and different approval requirements — the funnel needs no decision from Lee; the repricing needs one from him about customers in flight. Splitting them also makes the "Save $1,000 → Save $500" transition trivially correct, because the copy change lives in the same commit as the prices that make it true.

That split is the single highest-leverage structural change available to this plan, and it falls out of the inversion rather than the verdicts.

---

## Overall verdict

**NOT CLEARED as written — one gating FAIL cluster blocks, and it is small, specific, and cheap to fix.**

This is a strong plan attached to an unusually strong price sheet. Doc 35 is the best-sourced document in this corpus: it prints its arithmetic, reconciles three independent labour methods and explains why they disagree, states twelve unverifiables with their direction of error, names its own defect class ("the cost model describing a leaner product than the one that leaves the shop") and sweeps it three times, and folds Lee's accent-wall correction by tracing consequences rather than quietly re-deriving to the same answer. I re-checked its package arithmetic on all five models and could not break it. The plan's structure — pre-flight fixes that cannot be deferred, a named restore floor with reasons, one commit per package, a plain-English rollback for a non-technical owner, and an honest escape hatch on the harness — is disciplined work.

It fails on four gating dimensions (3 Completeness, 7 Change safety, 8 Data integrity, 9 Verifiability, plus **X4**) for one recurring reason, and it is the reason rev3 predicted: **the class was not swept.** The plan fixes the savings claim in WP-0c and specifies a verify criterion that contradicts doc 35's change 13, so the corrected claim becomes false again one package later — the same false-money-claim defect (N5) that this programme exists to eliminate, recreated downstream and *certified* by the plan's own acceptance test. The value-collision class has three members and two are swept. The phantom-heater string lives in five files and one is named. `models.json` parity is specified as a copy and is a schema extension. And the repricing — +33% to +260% across eight lines — ships with no answer to "what about the people already in the funnel," which is not an implementation detail but a decision belonging to Lee that nobody has put to him.

None of this requires re-planning. The must-fixes below are mostly paragraphs and one structural split, and the plan is close.

---

## Prioritized must-fix list

**Blocking — gating FAILs:**

1. **Kill the "exactly $1,000" verify criterion and add "Save $500" to the plan.** Replace with: the package/basket delta must equal the saving stated at `sauna.njk:161` on all five models, at whatever prices are live in that commit. Add doc 35 change 13 explicitly to §3a. State that the copy change ships in the *same commit* as the prices. *(X4.1 — the one finding that puts a false price in front of a customer.)*
2. **Split WP-0b into two commits** — funnel rebuild (no price changes) and repricing (doc 35's nineteen + `models.json` + savings copy). Different risk, different revert, different approval. *(Inversion; de-risks 1, 3, 5 and 7 at once.)*
3. **Put the price-transition question to Lee before the repricing commit.** Effective date; whether quotes already given are honoured; quote-validity going forward. Eight lines rise between 33% and 260%. His call, not the implementer's. *(7.1 / X4.3)*
4. **Make §3a's price list complete or make it explicitly non-enumerative.** Ten of nineteen doc 35 changes are absent (eight substantive), including the S2–S8 heater rise to $3,500, `interiorUpgrade`, `premiumFinishPrice`, both exteriors, the new $3,700 window tier, and lighting. *(2a / 3)*
5. **Put WP-0b in the §8 sequencing diagram**, and add `sauna.njk`, `js/modal.js`, `js/data.js` to the single-owner shared-file rule. *(3.1 / 3.2)*
6. **Name `js/navigation.js:72–79` in WP-0b** and carry doc 14 §1:47–49 (delete-on-read removed, `/contact/` kept as fallback, attached-config banner, key survives to submit). As written, the storage change silently disables the fallback state. *(3.3)*
7. **Finish the value-collision sweep** — give Thermowood its own token alongside doc 35's changes 10/11. And **sweep all five locations** of "Homecraft 9kW Apex," not `js/data.js:84` alone. *(3.5 / 8.2 — the literalism class, twice.)*
8. **Specify WP-0b's serialisation contract** (named fields vs composed blob). If named fields, add `name=` to every input in the same pass. *(3.6)*
9. **Give the harness gates numbers, or decline the repair in writing.** State budgets for `shiftCoverage` and `layoutShiftMaxPx`; note that `expectedToChange` needs restructuring to per-metric, not a flag; add the four missing fail-closed paths (`widths: []`, `fetchFailures > 0`, missing-PNG `continue` at `:174`, discarded redirects). Resolve the hero-video caveat one way or the other. *(9.2 / 9.3)*
10. **Resolve `_subject` into doc 21** — docs 14 and 33 specify different strings and N4's stream-counting depends on it. *(3.4)*

**Gating-tagged conditional — fix before WP-0b's production deploy:**

11. **Privacy:** carry the retention rule into the plan, add an explicit clear on abandon/expiry, add a privacy-policy link at Step 2, and get the privacy page in front of Petra. `localStorage` now holds a home address and site-access notes for 7 days. *(X2)*
12. **Carry doc 35 §7's softness into §3a** — IKI freight/stones/stock, the H-Series credit watch (P3), clear-cedar parity (§7.7). Correct "$550" to the $1,020 full-stack basis. *(X3)*

**Non-blocking but cheap and overdue:**

13. Define `models.json`'s target schema or replace P9 parity with a generator script — as written it is unachievable. *(8.1)*
14. Update `HANDOFF.md` — it is the cold-start document and it currently instructs shipping changing rooms at the old prices. *(7.4)*
15. Commit `package-lock.json` and pin `@11ty/eleventy`; fold into the P-A/P-B pre-flight bracket. *(X8)*
16. Specify the weekly submission check: host, source, threshold, channel. Note there is no baseline before 2026-07-28. *(X6)*
17. Close doc 21 **E3** and clear doc 13's two `[NEEDS LEE: reply-time]` markers; record doc 33 §6's field override in doc 21. *(8.4)*
18. State a multi-tab last-writer rule and a price-sheet version stamp on the stored config. *(X5 / 7.2)*
19. Reword the §5 production gate: "T1–T4" is not four count corrections — T2 is the `booking-ops.html` scope defect. Reconcile the duplicate `--color-bg` definition between `styles.css` and `booking-ops.html`. *(10)*
20. Add "verified from a browser profile that visited the site before the deploy" to WP-0b's definition of done. *(9.4)*
21. Either hold the premium speaker tier until Lee supplies the mounting-practice sentence, or ship a minimal true line that doesn't need him. *(X4.4)*
22. Rewrite §3's package figures as `interiorUpgrade + $5,000` vs `+ $6,000` — the absolutes quoted are S2-only. *(X4.2)*
23. Put rev3's Assumption 3 (realized price at 73% of list) to Lee as a named open question. It may invalidate the margin case for the entire repricing. *(X3)*

---

*Reviewed against the working tree at `4e11c9c`. Unverified: Netlify deploy id `6a68f16f80fdaf000837b588` (no API access this pass); its associated commit `cc8270f` exists.*

---

# Addendum — fold verification (2026-07-30)

**Reviewed at:** `b4125e8` (fold commit `77c66e9` + Lee's answers commit `b4125e8`).
**Method:** every claimed fold checked against the artifact, not against the claim. Rev.3's lesson applied to this pass: a fix that exactly matches the words of the request has probably not been generalised, so each item was checked for *siblings of the thing quoted*, not just the quoted line.

## Verdict per must-fix

| # | Verdict | Evidence |
|---|---|---|
| 1 | **PARTIAL** | Verify criterion re-anchored in **both** places (§3 `:150–157`, §3a Verify `:326`), change 13 named (`:241`), same-commit rule stated twice. But `:250` — *inside WP-0b-ii's own highlight list* — still reads *"makes the Premium Package's "Save $1,000" true"*, nine lines below `:241`'s "Save $500". Residue, not mechanism. See below. |
| 2 | **FOLDED** | 0b-i/0b-ii split throughout §3a, §8 diagram (`:432`, `:435`), §9 rollback, §10 DoD, and the Verify block. Diagram carries both nodes. |
| 3 | **FOLDED** | `:301–313`. Real answers, not placeholders: honour issued quotes, 30-day validity going forward, new prices for unquoted conversations; firm prices, no discounting. |
| 4 | **FOLDED** | `:234–243` makes doc 35 §6's nineteen-row table the enumeration explicitly ("this list is highlights only, and treating it as the enumeration is how ten changes went missing"). All **eight** substantive omissions named. |
| 5 | **FOLDED** | `:449–451` — `sauna.njk`, `js/modal.js`, `js/data.js` under the single-owner rule, sequential 0c → 0b-i → 0b-ii. |
| 6 | **FOLDED** | `:190–194`. `js/navigation.js:72–79` named with the mechanism spelled out; all three doc 14 §1:47–49 rules carried (delete-on-read removed, key survives to submit, attached-config banner). No conflict with the #11 retention rule — both say "cleared on successful submit". |
| 7 | **FOLDED** | `:254–264` — five-file sweep named, Thermowood token added; `:328` grep-proof ("zero '9kW Apex' and zero duplicate `value=` within any radio group"). The grep is achievable: exterior and interior both get distinct tokens, bench gets one in WP-0c. |
| 8 | **FOLDED** | `:206–213`. Composed blob + named contact fields, rationale stated (nameless checkboxes + live collisions). Correct: the blob is composed from label text, so collisions cannot corrupt it. `_subject` resolved to doc 33's string. |
| 9 | **PARTIAL** | `:99–112` carries everything: 4px / 0.95 budgets, fixtures calibrate (6px must fail, self-comparison must error), per-metric waivers named as a restructure, all four fail-closed paths, hero video stubbed, `WORKING` to temp dir. **One wrong pointer:** `:107` cites the missing-PNG `continue` at **`diff.mjs:174`**; it is at **`visual-diff.mjs:174`**, and `scripts/lib/diff.mjs` is only 156 lines, so the cited line cannot exist. |
| 10 | **FOLDED** | Doc 21 `:194` **N6** (`_subject`, doc 33 wins, reasoning given) and `:195` **N7** (five-field override recorded). Both dated, both cite the finding. |
| 11 | **FOLDED** | `:201–205`. Clear on success, 7-day expiry, "start over" on demand, privacy link at Step 2, Petra before production — and the plaintext-address rationale kept, so the rule survives future editing. |
| 12 | **FOLDED** | `:292–299` carries IKI freight/stones/**stock**, the P3 watch, and §7.7 clear-cedar parity. `$550` → `$1,020` corrected at `:147–148` with "one component, not the basis". |
| 13 | **FOLDED** | `:284–290` reframed as a schema extension with the specific gaps named (heater split, bench, deck/speaker/window tiers, dead `index.html` `_source`), "budgeted as real work, not a copy step". DoD `:490` updated to match. |
| 14 | **FOLDED** (re-staled — see below) | HANDOFF's stale changing-room block replaced with the resolution; split and critic pointer added. |
| 15 | **FOLDED** | `:61–67` P-C, in the diagram at `:433`. |
| 16 | **FOLDED** | `:343–351`. Host (MARVIN local cron, Monday 08:00, market-watch pattern), source, channel (Telegram via /notify), thresholds (zero or >50% WoW drop), and the no-baseline caveat with its reason. |
| 17 | **FOLDED** | Doc 21 `:205` E3 CLOSED with Lee's number. Doc 13's three operative markers released — `:335`, `:432`, `:436` — each cross-referenced to E3. Thank-you page line correctly left untouched. |
| 18 | **FOLDED** | `:195–200`. `priceSheetVersion` stamp, recompute-on-stale with a visible note, last-writer-wins stated. |
| 19 | **FOLDED** | `:373–375` reworded ("three count corrections **plus T2, the `booking-ops.html` scope defect**… calling all four 'count corrections' is how it would have been skipped"). `--color-bg` reconciliation at `:388–389`. |
| 20 | **FOLDED** | Verify `:319–321` and DoD `:491`. |
| 21 | **FOLDED** | `:279–283`, the minimal true line verbatim, with Lee's sentence to replace it when supplied. |
| 22 | **PARTIAL** | Correct model-invariant formulation added at `:142–146` (`interiorUpgrade + $5,000` → `+ $7,000` vs package `+ $6,000`), including an explicit note that prior absolutes were the S2 row. But `:136–139` still asserts *"the basket a customer can actually assemble is $6,000 against a $7,000 package… on every model"* — the fix was added above the defect rather than replacing it. |
| 23 | **FOLDED** | `:310–313`. Retired by decision. |

**Tally: 20 FOLDED, 3 PARTIAL, 0 NOT FOLDED.**

## New defect introduced after the fold — stale gate annotation in three places

`b4125e8` un-gated WP-0b-ii (Lee answered) but touched **only** `redesign-wave-a.md`. Three assertions of the retired gate survive:

- Plan `:435` — the §8 diagram still annotates WP-0b-ii *"← gated on Lee's transition + discounting answers"*, contradicting `:301` ("**WP-0b-ii is un-gated**") and `:443` in the same file.
- `HANDOFF.md:61` — *"once Lee's price-transition and discounting answers are in."*
- `HANDOFF.md:115` — *"**gated on Lee's price-transition and discounting answers**."*

This is the **same class as must-fix #14**, recurring one commit later: the derived index and the diagram are older than the prose they summarise. Not dangerous — the failure direction is a package held back, not a wrong price shipped — but it is the transmission-failure class this review named, and HANDOFF is what a cold pickup reads first.

## Residue check on the three PARTIALs

**#1 is the only one with money in it.** The mechanism that would have certified a false claim is fixed: neither verify criterion names a dollar figure, and both anchor to `sauna.njk:161` at the prices live in that commit. What survives is a prose bullet inside WP-0b-ii asserting the "$1,000" claim becomes true — in the very commit that changes it to $500. An implementer following §3a-ii's own instruction (the nineteen-row table is the enumeration; the list is highlights) ships change 13 correctly. One who reads the highlights as the spec sees two answers nine lines apart. Delete the clause or scope it to WP-0c, where it is true.

**#9 and #22 are citation and prose hygiene**, not mechanism: a pointer to a line that cannot exist, and a corrected figure sitting below the uncorrected one it replaced.

## Cross-check against doc 35 — no new contradictions

Doc 35 is unchanged since `4e11c9c` (not in either commit's diffstat). Re-checked the plan's new assertions against it: the eight named omissions match rows 2/3/5/10/11/13/15/16; "Save $500" matches row 18 and change 13; the softness paragraph matches §7.4/§7.5/§7.6, §4.2 and §7.7; the Thermowood token is consistent with §7.7's split warning; the mounting line is consistent with §5B.2's constraint without pre-empting Lee's docked sentence. Lee's transition answer does not disturb any margin in the sheet. **No fold introduced a contradiction with doc 35.** The three residues are all intra-plan.

One honest note on #3/#23: "firm prices, none" retires the 73%-of-list realized-price problem **by decision, not by evidence**. That is the right way to resolve it and it is Lee's call to make — but it converts a modelling risk into an execution risk. If discounting recurs in practice, lines priced at the 40% floor go under it and nothing in the instrumentation would show it. Worth a look at realized-vs-list after the first quarter of quotes; not a gate condition.

## Gate call

**CLEARED.**

All five gating FAILs from rev.4 are closed against the artifact: Completeness (3.1–3.6 all folded), Change safety (transition answered, version stamp, price-rollback rule, HANDOFF resynced), Data integrity (models.json reframed, five-file sweep, endpoint collapsed at `:185–186`, doc 21 N6/N7/E3), Verifiability (both verify criteria re-anchored, budgets numeric, four paths closed, hero video resolved one way), and X4 (criterion fixed, change 13 named, transition answered, mounting line shipped). The gating conditionals X2 and X3 are addressed substantively rather than acknowledged.

The three PARTIALs and the stale gate annotation are prose and citation residue with no mechanism behind them — none can put a wrong price in front of a customer, because every gate that would certify one now anchors to the live artifact rather than a number. **Fix all four before the relay opens** (four one-line edits), but they do not hold the gate.

**Corrections required before relay open:**
1. Plan `:250` — delete or re-scope the "Save $1,000 becomes true" clause; it sits inside the commit that makes it $500.
2. Plan `:107` — `diff.mjs:174` → `visual-diff.mjs:174`.
3. Plan `:136–139` — replace the `$6,000`/`$7,000` absolutes with the `interiorUpgrade + $5,000` / `+ $6,000` form already used at `:142–146`.
4. Plan `:435` and `HANDOFF.md:61,:115` — drop the retired "gated on Lee's answers" annotation.
