# 35 — Configurator Price Sheet (Final)

**Date:** 2026-07-28
**Status:** FINAL — implementable. Remaining unknowns are listed in §7 and none of them block Ted; every one is priced on its safe side.
**SUPERSEDED IN PART (2026-08-06):** the number authority is now `41-models-v2.json` (canonical models.json, pricesVersion 4). The base-price reprice + complete-sauna catalogue (Lee, 2026-08-03) re-derived the heater lines: a standard heater (electric, or wood on S4/S6/S8 per Lee's field ruling) is INCLUDED in the base price at $0, and the IKI premium tier is priced OVER the standard at the ~30% stove-category convention — so rows 3–5 below (+$9,800/+$10,800/+$8,200) are historical derivations, NOT the live prices (live: wood premium +$5,000/+$5,900/+$5,900/+$6,500 by model). Canonical's `optionGroups.heater._note` warns these must not be "corrected" back up to 45% by a future audit. The item-18 sentence "pays the $500 delta on top of the package" is likewise superseded: audio is ADDITIVE at full price (canonical `packages._upgradableGroupsNote`, the documented audio exception). Everything else in this sheet still reconciles line-for-line with the live site.
**Basis (per Lee, 2026-07-28):** incremental cost plus margin. When an upgrade replaces a standard item, the cost is the upgrade stack minus the standard item not being fitted, plus the labour delta. House target **45% GM stress-tested**; the audit's **40% is the floor**. Where a sourced range exists, the top of the range is used (Lee: "I would rather that these numbers stay higher").
**Currency:** CAD, pre-tax.

## Pricing convention (applied to every line)

1. **Incremental cost** = upgrade materials − credit for the displaced standard item + labour delta at $60/hr (rate verified against BC market, doc 31 §4 — low side of Vancouver billing).
2. **Stress cost** = materials × 1.05, labour hours × 1.15 (the house contingency from `pricing-first-principles.md`).
3. **Recommended price** = stress cost ÷ 0.55 (45% GM), rounded up to the nearest $100. Floor check: price must hold ≥ 40% GM at stress cost.
4. **Prices only move up or hold.** Where the current price already exceeds the convention output (decks, speakers), it stays — the convention is a floor, not a ceiling.
5. GM% = (price − cost) ÷ price. Both **nominal** (direct cost) and **stressed** GMs are shown so the floor can be checked at a glance.
6. All Homecraft figures are the manufacturer's public retail (no dealer pricing is published anywhere). SSC buys direct and may pay less — **every margin below is therefore a floor**, not an estimate.

## Critic findings P1–P8 — closure map

| # | Defect (critic rev. 3) | Closed where |
|---|---|---|
| P1 | Printed arithmetic doesn't reach its own 16–27% conclusion | §4 — full derivation printed, credit step included |
| P2 | Pricing basis never chosen | Lee chose incremental + margin (2026-07-28); applied to every line |
| P3 | Standard-heater credit unstable (H-Series availability) | §4 — credit fixed at $1,175, listing re-verified live 2026-07-28; trigger and direction-of-error stated |
| P4 | Docs 30/31 contradict on the window | §5 — tiering (doc 31) wins; doc 30's flat $2,500 rejected; two signed numbers |
| P5 | Changing rooms absent from the sign-off | §2 — full takeoff, priced $11,000 / $12,500 |
| P6 | Kuuma sold at ~$3,000/sale loss on the live site | Cut entirely (Lee's decision); replaced by IKI, §3 |
| P7 | SC 15kW path unpriced | §4 — priced +$2,800 from the real $3,000 heater cost |
| P8 | "Homecraft 9kW Apex" catalogue string (nonexistent product) | §6 change 1 — `js/data.js:84` renamed to Revive 9kW |

---

## 1. Decision table

Every priced option in `src/_includes/modals/sauna.njk`, plus the two per-model maps in `js/data.js`. Costs are incremental per the convention; "stressed" in parentheses. Sources abbreviated here; full derivations in §2–§5 and full source list in §8.

| # | Line | Current | Incremental cost (nominal → stressed) | Cost source | Recommended | GM nom / stressed | Rationale |
|---|---|---|---|---|---|---|---|
| 1 | Electric heater upgrade, S2–S8 (Revive 9kW) | +$2,000 | $1,795 → $1,897 | homecraftsaunas.com 2026-07-28 (heater $1,850, contactor $350, touchpad $300, rocks $350, credit −$1,175) | **+$3,500** | 48.7% / 45.8% | Full control stack costed, H-Series credit applied, 45% stressed. Derivation §4. |
| 2 | Electric heater upgrade, SC (Apex 15kW) | +$2,000 (same slot) | $1,420 → $1,503 | homecraftsaunas.com 2026-07-28 (Apex 15kW $3,000 vs Revive $1,850 credit) | **+$2,800** | 49.3% / 46.3% | SC's included heater is already a 9kW; only the heater/rocks delta is incremental. Derivation §4. |
| 3 | Wood-fired, S4 (Mini-IKI) | Kuuma +$3,000 — **CUT** | $5,040 → $5,340 | bsaunas.com 2026-07-28 (stove $4,320) + chimney/stones/freight, §3 | **+$9,800** | 48.6% / 45.5% | Kuuma lost ~$3,000/sale; Mini-IKI fits the S4's 343 cu ft, domestic supply, published CAD price. |
| 4 | Wood-fired, S6/S8 (Original-IKI) | Kuuma +$3,000 — **CUT** | $5,610 → $5,939 | bsaunas.com 2026-07-28 (stove $4,640) + chimney/stones/freight, §3 | **+$10,800** | 48.1% / 45.0% | Original-IKI rated 353–882 cu ft covers S6/S8 rooms; Mini tops out at 423. |
| 5 | Wood-fired, SC (Original-IKI) | Kuuma +$3,000 — **CUT** | $4,245 → $4,505 | bsaunas.com 2026-07-28 + Revive-stack credit, §3 | **+$8,200** | 48.2% / 45.1% | SC's bigger included heater means a bigger credit; quote-time adjusts down if the client was taking the Pro 20 standard. |
| 6 | 3' changing room | +$3,500 | $5,708 → $6,287 | Itemised takeoff §2 (master-materials Feb 2026, saunadoor.ca Jul 2026; accent-wall correction per Lee 2026-07-29) | **+$11,000** | 48.1% / 42.8% | Every method tested says $3,500 is a ~$2,200 gift per sale. Full arguable takeoff in §2. |
| 7 | 4' changing room | +$4,500 | $6,448 → $7,100 | Itemised takeoff §2 | **+$12,500** | 48.4% / 43.2% | Same takeoff, 28 sqft geometry. |
| 8 | 2' front deck — **open platform** | +$2,000 | $584 → $649 | master-materials Feb 2026 unit prices (frame, cedar decking, 6 h) | **Keep $2,000** | 70.8% / 67.6% | High margin verified; convention floor is $1,200 — price holds per rule 4. Label must say platform — see 8b. |
| 8b | 2' **semi-enclosed** deck (two finished side walls + roof over deck) | not offered — sold inside the $2,000 line | $2,025 → $2,246 | Itemised takeoff §2B (per Lee 2026-07-29: semi-enclosed is what buyers expect from "front deck") | **NEW +$4,100** | 50.6% / 45.2% | At $2,000 this build is **below cost** (−12% stressed). Two-tier split per Lee: platform stays cheap and honest, the real product gets a real price. |
| 9 | 3' front deck — **open platform** | +$3,000 | $779 → $866 | Same basis, 8 h | **Keep $3,000** | 74.0% / 71.1% | Same as 8. |
| 9b | 3' **semi-enclosed** deck | not offered — same defect as 8b | $2,571 → $2,850 | Itemised takeoff §2B | **NEW +$5,200** | 50.6% / 45.2% | At $3,000: 5.0% stressed GM — fails every floor. |
| 10 | Standing seam exterior | +$2,500 flat | $1,600–2,100 (overhaul); market materials $8–18/sqft say higher | pricing-overhaul-reference Jul 2026; barrierboss.ca 2026 band | **Per-model: S2/S4 $3,000 · S6 $3,500 · S8/SC $4,000** | 47.5–60% at overhaul cost | Audit's "scale by area" adopted at top of its $2,900–4,000 band. Supplier still "TBD" — softest input in the sheet, §7.8. |
| 11 | Cedar exterior | +$2,500 flat | $1,200–1,600 (overhaul, full basis); delta-basis ~$815–1,200 | pricing-overhaul-reference Jul 2026; Northwood Feb 2026 | **S2/S4 $2,500 · S6/S8/SC $3,000** | 36–53% / 47–60% | Overhaul's own rec (small/large split). Fine on small units under both cost readings. |
| 12 | Interior upgrade — clear cedar / thermowood (per-model) | S2 $1,000 · S4 $1,500 · S6 $2,500 · S8 $3,500 · SC $4,500 | Thermowood delta stressed: $1,104 / $1,362 / $1,619 / $1,876 / $2,006 | POCO/Lunawood catalogue + Mar 2026 Fraser quote (holds, doc 31); knotty WRC $3.90/sqft Northwood Feb 2026 | **S2 $2,200 · S4 $2,600 · S6 $3,000 · S8 $3,500 · SC $5,000** | 49.8 / 47.6 / 46.0 / 46.4 / 59.9% (stressed) | S2 at $1,000 was **negative on every sale** (cost ~$1,104 stressed). Delta = ($9.21 − $3.90)/sqft × net area × 1.1 waste. Clear cedar priced at parity — verification flag §7.7. |
| 13 | Lighting package | +$1,500 | $1,093 → $1,172 | simplysecured.ca 2026-07-28 (105°C IP67 cove kit $455–600 + dimmer) + 4 h install | **+$2,000** | 45.4% / 41.4% | $1,500 was priced on a $45 Amazon strip that is not heat-rated. Compliant-kit basis at 45% stressed. |
| 14 | Bluetooth speakers — **standard set** | +$1,000 | $360 → $396 | master-materials Feb 2026 ($160–180 pair+amp, market-corroborated doc 30) + 3 h | **Keep $1,000** | 64.0% / 60.4% | Holds comfortably. Two-tier split per Lee 2026-07-29; label honestly as the standard set. |
| 14b | Bluetooth speakers — **premium set** (Polk Atrium 5 pair + Fosi BT30D Pro 2.1 amp, all-weather) | not offered | $764 → $820 | polkaudio.com/en-ca + fosiaudio.com 2026-07-29 (Atrium 5 C$399/pair MSRP; BT30D Pro US$109.99 ×1.41 = $155) + $30 wire/mounts + 3 h | **NEW +$1,500** | 49.1% / 45.3% | Answers "what speaker is it" with a name. MSRP-costed → margins are floors. Derivation §5B; Atrium 4/$1,300 alternate recorded there. Package keeps the standard set — item 18 unchanged. |
| 15 | WiFi controller (new line, per Lee) | +$2,000 | $1,020 → $1,083 | homecraftsaunas.com 2026-07-28 (WiFi touchpad $550 + contactor $350) + 2 h | **Confirm $2,000** | 49.0% / 45.9% | Holds at the full-stack cost including the contactor doc 30 flagged. No double-collect with the Revive line (§4 note). |
| 16 | Additional window — standard (~6 sqft) | +$1,500 | $753 → $815 | Begbie Feb 2026 ($48/sqft top of band + crating share) + 4 h | **Keep $1,500** | 49.8% / 45.7% | Clears 45% stressed once crating is shared with the base window's order (§5). |
| 17 | Additional window — full-size (~23 sqft, Clarke-class) | not offered (sold inside the $1,500 line — the zero-margin defect) | $1,884 → $2,026 | Begbie Feb 2026 ($1,104 glass) + header framing + 8 h | **NEW +$3,700** | 49.1% / 45.2% | The tiering fix. Labour delta (8 h vs 4 h) and header framing shown in §5, per Lee's condition. |
| 18 | Premium Finish Package (per-model) | $7,000 / $7,500 / $8,500 / $9,500 / $10,500 | Sum of component costs, stressed: $5,435 / $5,693 / $5,950 / $6,207 / $6,337 (worst-case cedar cost) | Component lines above | **$9,200 / $9,600 / $10,500 / $11,000 / $12,500** | 40.9 / 40.7 / 43.3 / 43.6 / 49.3% (stressed, worst case) | À la carte now sums to $9,700–13,000; package = à la carte − $500. **"Save $1,000" becomes "Save $500"** — the current claim is −$1,000 (critic N5); $500 is the largest saving that keeps every model above the 40% floor. |
| 19 | Kuuma Banya | +$3,000 | ~$6,150–6,700 landed (doc 30 §4) | lamppakuuma.com 2026-07-28 | **CUT** | −105% to −123% | Lee's decision. Every sale lost ~$2,700–3,300. Closes P6. |

**Package saving recomputation (item 18, shown):** à la carte = interior upgrade + cedar exterior + WiFi $2,000 + lighting $2,000 + speakers $1,000 → S2 $9,700 · S4 $10,100 · S6 $11,000 · S8 $11,500 · SC $13,000. The saving claim must be true against the *cheapest* qualifying combination (cedar, not standing seam), so package = that sum − $500. A $1,000 saving would put the S2/S4 packages at 37.4–37.5% stressed GM in the worst cedar-cost case — under the floor — which is why the saving is $500, not $1,000. With standing seam chosen instead, the customer's real saving is $1,000–1,500 and the claim only gets truer. Speakers went two-tier 2026-07-29 (§5B): the package carries the **standard** $1,000 set, so nothing in this recomputation moves; a buyer upgrading to the Polk tier pays the $500 delta on top of the package.

---

## 2. Changing rooms — the itemised takeoff

Lee's question: where do $8,500 and $10,500–11,000 come from, and are the costs real? Answer below, line by line, quantities from geometry, labour by task. **The honest number is not lower than $8,500 — it is higher.** The audit's recommended prices, not just its current ones, fail Lee's own 40% floor once the takeoff is itemised.

**Correction folded in (per Lee, 2026-07-29):** the house standard always puts a T&G accent face on the entrance wall — the base build's end wall is never metal. Three consequences: the partition's changing-room face already carries finished T&G paid for in the base price (no recladding charge), the old −$115 "metal not fitted" credit was crediting metal that was never planned (removed), and the new exterior end wall — now the unit's entrance wall — is clad in T&G, not metal. By geometric coincidence the T&G quantity is unchanged: the 32 sqft dropped at the partition reappears as the entrance wall's accent face. Net cost effect −$35 (3') / +$15 (4'); recommended prices unchanged.

### 2.1 What a changing room actually adds (geometry, not a formula)

A changing room extends the box by 3' or 4' at the entry end, full 7' width, 7' ceiling. What is genuinely new construction:

- **Floor + roof extension:** 21 sqft (3') / 28 sqft (4').
- **Two side-wall segments:** 2 × (3'×7') = 42 sqft (3') / 56 sqft (4').
- **One new exterior end wall:** 7'×7' = 49 sqft, carrying a new exterior door.
- **The partition is NOT new framing — and not new cladding either.** The sauna's original end wall (with its glass door) already exists in the base build and simply becomes the partition. Its outer face already carries the base build's T&G accent treatment (house standard: the entrance wall is always the accent wall, never metal — per Lee, 2026-07-29), so the add-on charges nothing for it and credits nothing.
- **The accent wall migrates to the new entrance wall.** The changing room's new exterior end wall becomes the unit's entrance wall, so it gets the exterior T&G accent face, not metal. Metal panels cover only the two new side-wall segments.
- **One new door** (the exterior door into the changing room). The sauna glass door is the base build's door, unchanged. Priced as a bought-in Tesli tempered unit at $650 (saunadoor.ca, Jul 2026) rather than $500 materials + 8–16 h in-house build — doc 31 §2's own finding that buying beats building.
- Bench seat, hooks, one light and switch, fasteners.

T&G area, 3' room — interior: sides 42 + end wall (49 − 17 door) + ceiling 21 = 95 sqft; exterior accent on the new entrance wall: 32 sqft; **total 127 sqft** (the partition face charges nothing — its accent T&G is in the base price). 4' room: interior 56 + 32 + 28 = 116 + exterior 32 = **148 sqft**.

### 2.2 Materials takeoff — 3' room (3' × 7' × 7', 21 sqft)

Unit prices are the same supplier-sourced set as `pricing-first-principles.md` §2 (master-materials Feb 2026 unless noted).

| # | Line item | Quantity basis | Cost |
|---|---|---|---|
| 1 | Skid runner extension (PT 2x6, 3 runners × 3', doubled, hardware) | 3 pcs + hw | $60 |
| 2 | Floor framing PT 2x6 (3 joists × 7' + rim 13 LF = 34 LF) | 5 pcs @ $12 | $60 |
| 3 | Subfloor PT ply | 1 sheet @ $80 | $80 |
| 4 | Wall framing 2x4 SPF — studs 13 × 7' = 91 LF, plates 13 × 3 = 39 LF, door-opening framing 25 LF, ceiling joists 24 LF → 179 LF × 1.10 waste = 197 LF | 25 pcs @ $5 | $125 |
| 5 | Roof framing 2x6 (3 rafters, shed extension) | 3 pcs @ $6.50 | $20 |
| 6 | Wall sheathing ½" ply (91 sqft gross) | 3 sheets @ $42 | $126 |
| 7 | Roof sheathing | 1 sheet @ $42 | $42 |
| 8 | Tyvek WRB | part roll | $40 |
| 9 | Rain-screen strapping | 9 pcs @ $3.50 | $32 |
| 10 | Insulation R14 (net wall 74 + ceiling 21 = 95 sqft × 0.9 bay factor) | 2 bags @ $62.50 | $125 |
| 11 | Vapour barrier + tape (poly grade — not sauna foil; this is not a hot room) | part roll | $40 |
| 12 | 1x6 knotty WRC T&G — interior 95 sqft + entrance-wall accent 32 sqft = 127 sqft → 305 LF × 1.10 ÷ 8' | 42 pcs @ $13 | $546 |
| 13 | Interior trim 1x4 cedar | 6 pcs @ $7 | $42 |
| 14 | Metal wall panels — side walls only, 6 LF (entrance wall is the T&G accent wall) | 2 @ $50 | $100 |
| 15 | Credit removed — the base build never planned metal on this wall (accent-wall standard, per Lee 2026-07-29) | — | $0 |
| 16 | Exterior trim (J-track, corners, drip) | flat | $60 |
| 17 | Roofing — 1 panel $50 + membrane share $30 + flashing $30 | | $110 |
| 18 | Fascia + stain share | | $60 |
| 19 | Exterior door, bought-in tempered 8mm (Tesli, saunadoor.ca Jul 2026) | 1 | $650 |
| 20 | Door hardware (hinges, handle, latch) | | $75 |
| 21 | Bench seat, hooks, robe rail | | $150 |
| 22 | Electrical — light, switch, wiring extension | | $75 |
| 23 | Fasteners, foam, sealant | | $150 |
| | **3' materials total** | | **$2,768** |

### 2.3 Materials takeoff — 4' room (4' × 7' × 7', 28 sqft)

| # | Line item | Quantity basis | Cost |
|---|---|---|---|
| 1 | Skid runner extension | 3 runners × 4' | $70 |
| 2 | Floor framing PT 2x6 (4 joists + rim = 43 LF) | 6 pcs @ $12 | $72 |
| 3 | Subfloor PT ply | 1 sheet | $80 |
| 4 | Wall framing 2x4 (studs 105 + plates 45 + opening 25 + ceiling 31 = 206 LF × 1.10) | 29 pcs @ $5 | $145 |
| 5 | Roof framing 2x6 | 4 pcs | $26 |
| 6 | Wall sheathing (105 sqft gross) | 4 sheets @ $42 | $168 |
| 7 | Roof sheathing | 1 sheet | $42 |
| 8 | Tyvek WRB | part roll | $45 |
| 9 | Rain-screen strapping | 11 pcs | $39 |
| 10 | Insulation R14 (net 116 sqft × 0.9) | 2 bags | $125 |
| 11 | Vapour barrier + tape | | $45 |
| 12 | 1x6 WRC T&G — interior 116 sqft + entrance-wall accent 32 sqft = 148 sqft → 355 LF × 1.10 ÷ 8' | 49 pcs @ $13 | $637 |
| 13 | Interior trim 1x4 | 7 pcs | $49 |
| 14 | Metal wall panels — side walls only, 8 LF | 3 @ $50 | $150 |
| 15 | Credit removed — accent-wall standard (see §2.2) | — | $0 |
| 16 | Exterior trim | flat | $65 |
| 17 | Roofing — 2 panels $100 + membrane $35 + flashing $35 | | $170 |
| 18 | Fascia + stain share | | $70 |
| 19 | Exterior door, bought-in (Tesli) | 1 | $650 |
| 20 | Door hardware | | $75 |
| 21 | Bench, hooks, rail | | $175 |
| 22 | Electrical | | $75 |
| 23 | Fasteners, foam, sealant | | $175 |
| | **4' materials total** | | **$3,148** |

### 2.4 Labour — by task at $60/hr, not by square foot

| Task | 3' room (h) | 4' room (h) |
|---|---|---|
| Skid extension, floor framing, subfloor | 5 | 6 |
| Wall framing (13/15 LF + door opening) | 6 | 7 |
| Roof framing, sheathing, membrane, metal, tie-in to existing roof | 5 | 6 |
| Wall sheathing, Tyvek, strapping | 4 | 5 |
| Insulation + vapour barrier | 3 | 3 |
| Interior T&G + trim (127/148 sqft, finish grade) | 12 | 13 |
| Exterior cladding (metal sides + T&G accent entrance wall), trim, fascia, stain | 5 | 6 |
| Exterior door install (bought-in unit — no build hours) | 3 | 3 |
| Bench, hooks, finishing, QC | 4 | 4 |
| Electrical (light, switch, feed) | 2 | 2 |
| **Total** | **49 h = $2,940** | **55 h = $3,300** |

### 2.5 The 2.5 hr/sqft formula vs the task estimate — reconciled

| Method | 3' room | 4' room |
|---|---|---|
| 2.5 hr/sqft formula (pricing-overhaul basis) | 52.5 h | 70.0 h |
| 1.75 hr/sqft ("simpler space" rate, doc 31 §3.2) | 36.75 h | 49.0 h |
| **Task-level estimate (above)** | **49 h** | **55 h** |

The reconciliation: **per-square-foot formulas mis-scale small additions.** Roughly 20 of the 49 hours (skid extension, roof tie-in, door hang, electrical, exterior wall's fixed trim) cost the same whether the room is 3' or 4' — they are fixed tasks, not area tasks. So the effective rate is ~2.3 hr/sqft at 21 sqft falling to ~2.0 hr/sqft at 28 sqft. The 2.5 formula lands near the truth on the 3' room by coincidence (its overshoot happens to cover the fixed-task floor at that size) and overshoots by 15 h on the 4'. Doc 31's 1.75 rate undercounts the fixed tasks by ~12 h on the 3'. Neither formula is the estimate; the task table is.

### 2.6 Cost rollup and price grid

| | 3' room | 4' room |
|---|---|---|
| Materials | $2,768 | $3,148 |
| Labour (49 h / 55 h @ $60) | $2,940 | $3,300 |
| **Direct cost** | **$5,708** | **$6,448** |
| Stress cost (mat ×1.05, hrs ×1.15) | **$6,287** | **$7,100** |
| Current price → GM nominal / stressed | $3,500 → **−63% / −80%** | $4,500 → **−43% / −58%** |
| Audit's proposed $8,500 / $10,500 → GM | 32.8% / 26.0% — **fails the 40% floor** | 38.6% / 32.4% — **fails the floor** |
| 40% floor (stressed) | $10,478 | $11,833 |
| Strict convention, 45% stressed | $11,431 | $12,909 |
| **Recommended** | **$11,000** (48.1% nom / 42.8% stressed) | **$12,500** (48.4% / 43.2%) |

**Answer to Lee's question directly:** the audit's cost range ($4,700–5,900 for the 3') was real — this independent takeoff lands at $5,708 (post accent-wall correction), inside-to-above it. The costs were, if anything, slightly *understated*: the audit's model omitted the bought-in door premium, the electrical, and real hardware lines. Three methods now agree within ~15% (audit inheritance, doc 31's $/LF marginal model, this takeoff). What was wrong was the *price* derived from them: $8,500 was 45% GM on the friendliest labour scenario un-stressed, which is not the house convention. At the convention, the 3' room is an $11,000–11,400 item.

If $11,000/$12,500 kills demand, the correct lever is **spec reduction, not price reduction**: an uninsulated, single-wall-interior version drops roughly $525 of materials and ~11 h, landing near $9,000 at the same convention. That is a different product, priced honestly — available as a second tier if Lee wants it.

### 2.7 The trailer question — yes, a changing room can pull a larger chassis

Box length = model length + changing room **+ deck** — the length add-ons stack (an S6 + 3' changing room + 2' deck is a 14' box). Trailer deck must cover the box. New-trailer BC pricing, doc 31 §1.6 (Jul 2026): 7×14 $5,790 (Southland/Nanaimo Trailers) · 7×16 $7,995 (Big Tex, BC dealers) · 7×18 $8,490.

| Build | Box length | Deck required | Chassis cost step |
|---|---|---|---|
| S4 + 4' | 11' | 14' — no change | $0 |
| S6 + 3' | 12' | 14' — no change | $0 |
| S6 + 4' | 13' | 14' (tight) or 16' | $0–2,205 |
| S8 + 3' | 14' | **16'** | **+$2,205** |
| S8 + 4' | 15' | 16' | +$2,205 |
| SC + 3' | 15'+ | 16' | +$2,205 |
| SC + 4' | 16'+ | **18'** | **+$2,700 vs 14' basis** |

**Rule:** no length add-on — changing room **or deck** — ever absorbs chassis growth. A front deck adds its depth to box length exactly as a changing room does (S8 + 3' deck → 16' chassis, +$2,205), and the two stack. On trailer builds, the trailer line item is quoted by **final box length** (and GVWR re-checked) at quote time — this is exactly why the trailer is a separate line in the pricing model. Skid builds are unaffected. This was the uncaptured cost the audit flagged; it is now captured as a quoting rule, not buried in the add-on.

---

## 2B. Semi-enclosed decks — the itemised takeoff (added 2026-07-29)

Follow-up to the changing-room correction. The deck rows were the sheet's fattest margins (70%+), but they were costed as a bare platform — frame, cedar decking, 6/8 h; the overhaul reference never audited decks at all. **SSC's actual front-deck build is usually semi-enclosed: two framed side walls with the roof carried over the deck, and that is what buyers should expect when they choose the option (per Lee, 2026-07-29).** Costed at that spec, the 2' deck at $2,000 sells below cost and the 3' at $3,000 barely clears it. Resolution (Lee's call, same date): **two tiers** — the open platform keeps a label-honest $2,000/$3,000, and the semi-enclosed build becomes its own priced option (decision-table rows 8b/9b).

### 2B.1 What the semi-enclosure adds

- Two framed side walls, deck-depth × full 7' height: 2 × 14 = 28 sqft (2') / 2 × 21 = 42 sqft (3').
- Roof extension over the deck (14 / 21 sqft), tied into the existing shed roof.
- Cladding per the house standard (§2 correction): metal on the outer faces — side walls are never the accent wall — and finish-grade 1x6 WRC T&G on the deck-facing inner faces (per Lee, 2026-07-29).
- Open front. No door, no insulation, no vapour barrier, no electrical — which is why it runs roughly half the cost of a changing room of the same depth.
- Chassis: a deck adds its depth to box length exactly as a changing room does, and they stack — §2.7's rule is generalised accordingly.

### 2B.2 Materials — added scope only (the platform is rows 8/9's existing basis: $224 + 6 h / $299 + 8 h)

Same unit-price set as §2.2 (master-materials Feb 2026).

| # | Line item | 2' | 3' |
|---|---|---|---|
| 1 | Wall framing 2x4 (54 / 64 LF × 1.10 waste) | $40 | $45 |
| 2 | Wall sheathing ½" ply (28 / 42 sqft gross) | $42 | $84 |
| 3 | Tyvek WRB share | $15 | $20 |
| 4 | Rain-screen strapping | $11 | $14 |
| 5 | Metal panels — outer faces only (accent-wall standard) | $100 | $100 |
| 6 | Inner-face 1x6 WRC T&G (28 / 42 sqft, finish grade) | $117 | $182 |
| 7 | Roof framing 2x6 (3 rafter extensions) | $20 | $20 |
| 8 | Roof sheathing | $21 | $42 |
| 9 | Roofing — panel + membrane + flashing shares | $95 | $105 |
| 10 | Fascia + stain share | $40 | $45 |
| 11 | Exterior trim (J-track, corners, drip) | $40 | $45 |
| 12 | Fasteners, sealant | $60 | $70 |
| | **Added materials** | **$601** | **$772** |
| | Platform basis (rows 8/9) | $224 | $299 |
| | **Materials total** | **$825** | **$1,071** |

### 2B.3 Labour — by task at $60/hr

| Task | 2' (h) | 3' (h) |
|---|---|---|
| Platform (inherited rows 8/9 basis) | 6 | 8 |
| Wall framing, sheathing, wrap, strapping | 4 | 5 |
| Exterior metal + trim | 2 | 2 |
| Inner-face T&G, finish grade | 3 | 4 |
| Roof framing, sheathing, membrane, metal, tie-in to existing roof | 4 | 5 |
| Stain, finishing, QC | 1 | 1 |
| **Total** | **20 h = $1,200** | **25 h = $1,500** |

The same fixed-task floor as §2.5 applies: roof tie-in, metal/trim, and finishing barely move between 2' and 3' — which is why the 3' is not 50% more labour than the 2'.

### 2B.4 Rollup and price grid

| | 2' semi-enclosed | 3' semi-enclosed |
|---|---|---|
| Materials | $825 | $1,071 |
| Labour (20 h / 25 h @ $60) | $1,200 | $1,500 |
| **Direct cost** | **$2,025** | **$2,571** |
| Stress cost (mat ×1.05, hrs ×1.15) | **$2,246** | **$2,850** |
| Old single-line price → GM nominal / stressed | $2,000 → **−1.3% / −12.3%** | $3,000 → 14.3% / **5.0%** |
| 40% floor (stressed) | $3,743 | $4,750 |
| **Recommended (÷0.55, rounded up)** | **+$4,100** (50.6% nom / 45.2% stressed) | **+$5,200** (50.6% / 45.2%) |

Sensitivity, recorded not offered: a walls-only variant (no roof extension) lands at ~$1,800 / $2,300 stressed → $3,300 / $4,200 at convention. Per Lee the roof is part of the semi-enclosed spec; the figure exists only so a quote-time custom variant has a floor.

**The class, named:** this is the third instance of the same defect — the cost model describing a leaner product than the one that leaves the shop (changing room: metal-credit/partition assumptions; full-size window: sold inside the small-window line; deck: semi-enclosed built, platform priced). Any future add-on line gets costed against the **as-built spec**, not the minimum spec.

---

## 3. The wood-fired replacement — IKI, verified

### 3.1 Brand verification

Lee's words: "eekie stoves, which are more readily available for pricing." **The brand is IKI — verified.** IKI (IKI-Kiuas) is a **Finnish** manufacturer — the task brief's "Lithuanian" guess was wrong, they are made in Finland — of stone-jacketed wood-burning and electric sauna stoves. Phonetically IKI is "ee-kee", an exact match; HUUM ("hoom") does not fit the phonetics, and it also fails Lee's stated reason: HUUM's Canadian wood-stove pricing is thinner on the ground, while IKI has a **Canadian dealer with published CAD prices** — B Saunas, 25 Morrow Road, Barrie, ON, 1 (705) 727-0404, info@bsaunas.com. That is what "more readily available for pricing" buys: domestic supply, no border, no broker, no surtax question — every one of the failure modes that made the Kuuma a ~$3,000-per-sale loss.

### 3.2 Models and costs (bsaunas.com, checked 2026-07-28)

| Model | Price (CAD) | Rated room volume | Stone capacity | Fits |
|---|---|---|---|---|
| **Mini-IKI** | $4,320.00 | 176–423 cu ft (5–12 m³) | 264 lb (120 kg) | S2 (245 cu ft), S4 (343) |
| **Original-IKI** | $4,640.00 | 353–882 cu ft (10–25 m³) | 485 lb (220 kg) | S4 (borderline-min), S6 (441), S8/SC (539+) |
| Mini-IKI Plus | $4,704.00 | — | — | (option) |
| Original-IKI Plus | $5,024.00 | — | — | (option) |

Full wood lineup runs to $6,144 (KIVI-IKI SL Fireplace). Chimney pipe **not included**; stones **sold separately** (20 kg boxes, price unpublished — proxy below); freight is quote-by-postal-code from Barrie (no flat rate), or pick-up in Barrie. Stock status not shown online — confirm by phone before the first order.

Model assignment: **S4 → Mini-IKI** (343 cu ft sits inside Mini's 176–423; the Original's 353 minimum is above the S4 room). **S6/S8/SC → Original-IKI** (S6's 441 cu ft exceeds the Mini's 423 ceiling). S2 stays `electricOnly` — current site policy, unchanged.

### 3.3 Incremental cost stacks and prices

Common components: chimney kit $700 (Home Depot, master-materials Feb 2026 — the same kit carried for the Harvia M3; IKI needs its 4"→6" adapter, price unpublished, small); stones at $50/box proxy (Homecraft Whistler-quarry stones, doc 30 — B Saunas' own 20 kg boxes are quote-at-checkout); freight allowance $500 (quote-only; the only published comparable is Lamppa's typical pallet freight $200–600 USD ≈ $280–850 CAD — allowance flagged in §7.4); labour delta +8 h vs an electric install (chimney penetration, flashing, clearances, ~120–220 kg stone loading — internal estimate, no external benchmark exists).

**S4 — Mini-IKI (+$9,800):**

| Component | CAD |
|---|---|
| Mini-IKI stove | $4,320 |
| Stones, 6 × 20 kg boxes @ $50 proxy | $300 |
| Chimney kit | $700 |
| Freight allowance (Barrie → Squamish, quote pending) | $500 |
| Credit — H-Series 7.5kW + rocks not fitted | −$1,260 |
| **Materials incremental** | **$4,560** |
| Labour delta 8 h @ $60 | $480 |
| **Direct** | **$5,040** |
| Stressed (mat ×1.05 + hrs ×1.15) | **$5,340** |
| **Price: $5,340 ÷ 0.55 = $9,709 → +$9,800** | GM 48.6% nom / 45.5% stressed |

**S6/S8 — Original-IKI (+$10,800):** stove $4,640 + stones 11 × $50 = $550 + chimney $700 + freight $500 − credit $1,260 = **$5,130** materials; + 8 h = direct **$5,610**; stressed **$5,939**; ÷ 0.55 = $10,797 → **+$10,800** (48.1% / 45.0%).

**SC — Original-IKI (+$8,200):** the SC's included heater is the Revive 9kW stack, so the credit is bigger: stove $4,640 + stones $550 + chimney $700 + freight $500 − credit $2,625 (Revive + contactor + touchpad + rocks, low end = the safe high price) = **$3,765**; + 8 h = **$4,245**; stressed **$4,505**; ÷ 0.55 = $8,191 → **+$8,200** (48.2% / 45.1%). If the SC client was taking the **Harvia Pro 20** as their included heater instead, the derivation gives ~+$6,600 (credit $1,910, chimney already in base) — the site carries the higher number and the consultation adjusts *down*, which is the direction Lee asked for. Same logic on S4–S8 if a client was taking the included Harvia M3: quote-time comes down ~$2,700 from the listed figure. The configurator's "final pricing confirmed after consultation" note covers this.

**Optional second tier, Lee's call — Harvia Pro 20 as a value wood option (+$4,100):** stove $1,909.95 (sauna.ca, in stock 2026-07-28) + chimney $700 + stones $150 + freight $100 − credit $1,260 = $1,600; + 8 h = $2,080; stressed $2,232; ÷ 0.55 = $4,058 → **+$4,100** (45.2% stressed). Doc 30 recommended this stove; it is also already the SC's standard wood spec. A single wood option at $9,800–10,800 will convert rarely; a $4,100 Pro 20 tier keeps a real wood-fired path at full margin. Not implemented in §6 unless Lee wants it — flagged as a recommendation, not a decision.

---

## 4. The SC heater path and the standard-heater credit — resolved

### 4.1 P1, corrected arithmetic (the sentence Lee was asked to sign)

The plan's line — "the working stack (contactor $275–350 + touchpad $300 + rocks $200–350) is $2,625–2,850" — omitted the heater from its own parenthesis and dropped the credit from its own margin. The real chain, every step printed:

```
Revive 9kW heater                      $1,850   (homecraftsaunas.com, 2026-07-28)
Contactor box (required — no built-in) $275–350
Regular touchpad                       $300     (WiFi touchpad belongs to the WiFi line, not here)
Rocks (7 boxes @ $50, or Revive set)   $200–350
FULL STACK                             $2,625–2,850

Less: H-Series 7.5kW not fitted       −$1,175   (live listing, re-verified 2026-07-28)
TRUE INCREMENTAL COST                  $1,450–1,675

At the current +$2,000:  (2,000 − 1,675)/2,000 = 16.3%  to  (2,000 − 1,450)/2,000 = 27.5%
```

That is where "16–27%" comes from — reachable only through the credit. Thin, not negative; it fails the 45% target and the 40% floor.

### 4.2 P3 — the credit is $1,175, and the instability points the safe way

**Credit = $1,175** (H-Series 7.5kW 240V, homecraftsaunas.com/product/7-5-kw-h-series-heater/, price and add-to-cart re-verified live **2026-07-28**; no discontinuation notice). The known wobble: the 3-phase variant is out of stock and H-Series naming has vanished from the heater tag page; if Homecraft winds the line down, the standard 7.5kW becomes the Apex Mini at $1,950.

**The trigger and its direction:** if the credit becomes $1,950, incremental cost on every heater upgrade *falls* by $775 — margins at the prices below get **better**, not worse. The $775 exposure lands on **base-model cost** (S2–S8 standard heater), which is a base-price problem outside this sheet, not an add-on problem. Pricing the add-ons on the $1,175 credit is therefore the conservative, upward-biased choice on both sides. Resolved: **use $1,175; no contingency needed on the add-on lines; watch H-Series stock for the base models.**

### 4.3 S2–S8 electric upgrade — Revive 9kW at +$3,500

Top-of-range costs per the bias rule: stack $2,850 − credit $1,175 = **$1,675** parts + 2 h labour delta (contactor mounting + control wiring vs the H-Series' integrated controls — internal estimate) = **$1,795 direct**; stressed $1,759 + $138 = **$1,897**; ÷ 0.55 = $3,449 → **+$3,500** (48.7% nom / 45.8% stressed; 40% floor holds at $3,200). Doc 30's +$2,750 was 45% on un-stressed low-end cost — under the house convention it runs 31% stressed, below floor, so it is superseded. Any Homecraft trade discount improves this further (§7.1).

Product note, not priced: a 9kW Revive on an S2 (245 cu ft) is oversized for the room. Worth considering hiding the upgrade on S2 the way wood already is — flagged for Lee, no code change specced.

**No double-collect with WiFi:** the +$3,500 includes the *regular* touchpad. If the client also buys the $2,000 WiFi line, the WiFi touchpad ($550) replaces the regular one ($300) — SSC's cost rises $250, the client pays the $2,000 WiFi price, margin improves. No interaction fix needed.

### 4.4 SC path — Apex 15kW at +$2,800 (P7 closed)

On SC the same slot replaces a **Revive 9kW**, not a $1,175 H-Series — so the incremental is smaller than the audit's $3,500 (which was derived on the H-Series credit and belongs to a configuration the site doesn't sell). Deltas only, same assumptions both sides:

```
Heater delta:  Apex 15kW $3,000 − Revive $1,850            = $1,150
Rocks delta:   larger stone mass on the 15kW (estimate)     = $150
Controls delta: $0 — doc 30 §5.4 leaves Apex integrated
               controls unresolved; if both units need the
               contactor+touchpad they cancel; if the Apex
               is integrated, cost falls $575–650 in SSC's
               favour. $0 is the upward-biased assumption.
Labour delta:  heavier unit, larger in-unit conductors, 2 h = $120
DIRECT                                                        $1,420
Stressed: $1,300 × 1.05 + $138                              = $1,503
Price: $1,503 ÷ 0.55 = $2,733 → +$2,800   (49.3% nom / 46.3% stressed)
```

At the current $2,000 the SC path runs 29% nominal — thin, not the below-cost disaster; the "-$1,000 per sale" story was the full-cost basis, which Lee's incremental decision retires. The SC price being *lower* than the S2–S8 price ($2,800 vs $3,500) is correct and defensible: the SC client already paid for a better heater, so the step up costs less. The modal must set the value per model, not just the label (§6 change 4).

---

## 5. Window tiering — two tiers with the labour delta shown (P4 closed)

Doc 30 said flat $2,500; doc 31 said the flat price is the *cause* of the zero-margin defect and to tier by size. **Doc 31 wins** — one price for a 6 sqft lite and a 23 sqft Clarke-class unit is how the line went negative — with one correction to doc 31's own costing, in SSC's favour: Begbie's $300 crating is **flat per order**, and every build already orders the base window, so an additional window shares the crate. Carried at $150 share, not $300.

Lee's condition: the tiers must account for the extra labour a larger opening costs, not just the glass. Shown:

| | Standard (~6 sqft) | Full-size (~23 sqft, Clarke-class) |
|---|---|---|
| Glass @ $48/sqft (top of Begbie band, Feb 2026) | $288 | $1,104 (matches the actual Clarke invoice $1,099.89) |
| Crating share ($300 flat/order, shared with base window) | $150 | $150 |
| Opening framing | $75 (king studs, sill, flashing) | $150 (structural header, jacks, extra flashing/trim — a 7'-wide wall with a 23 sqft hole needs a real header) |
| **Labour** | **4 h = $240** (cut, frame, flash, set — one person can lift a 6 sqft IGU) | **8 h = $480** (reframe wall section, two-person lift — a tempered dual-pane at ~6 lb/sqft is a ~140 lb unit — larger flashing perimeter, interior+exterior trim) |
| **Direct cost** | **$753** | **$1,884** |
| Stressed | $815 | $2,026 |
| Convention price (÷ 0.55) | $1,482 | $3,684 |
| **Price** | **$1,500 (keep)** | **NEW +$3,700** |
| GM nominal / stressed | 49.8% / 45.7% | 49.1% / 45.2% |

The labour delta between tiers is **4 h + $75 of structure = $315 of direct cost**, and it is in the price. $3,700 also survives the un-shared-crating case ($300 full crating → stressed $2,184 → 41.0% GM, still above floor). Doc 31's $3,200–3,500 band dies at the floor once the honest 8 h is carried — $3,500 is 37.6% stressed — which is why the tier lands at $3,700. Begbie re-quote before publishing (§7.9); the basis is a five-month-old supplier invoice, the strongest kind of source short of a fresh quote.

Small tier stays $1,500 — with the crating share corrected it clears 45% stressed exactly as priced, so Lee's accepted "thinner margin" is not even needed there.

---

## 5B. Speaker tiers — the premium set (added 2026-07-29)

Lee's prompt: clients have questioned what speaker the $1,000 line actually buys, and the honest answer was a generic Amazon pair ($160–180, master-materials). Could a genuinely sophisticated set fit the existing price? **No — every name-brand option fails the 40% floor at $1,000** (best case 32.9% stressed). Resolution (per Lee, 2026-07-29): **two tiers** — the standard set keeps $1,000 with an honest label, and a premium set becomes its own option. The package carries the standard set, so item 18's math is untouched.

### 5B.1 The options costed (all-weather rated; 3 h install, $30 wire/mount share)

Sources: polkaudio.com/en-ca MSRP per pair, checked 2026-07-29 (Atrium 4 C$299 · Atrium 5 C$399 · Atrium 6 C$499); fosiaudio.com 2026-07-29 (BT20A Pro US$79.99 → C$113 · BT30D Pro 2.1-ch US$109.99 → C$155, both at the 1.41 doc-30 rate). MSRP-costed — Atrium 4 runs ~C$200 street on Amazon.ca, so every margin below is a floor.

| Set | Materials | Direct | Stressed | GM at $1,000 (stressed) | Convention price | GM there (nom / stressed) |
|---|---|---|---|---|---|---|
| Standard (current Amazon pair + amp) | $180 | $360 | $396 | 60.4% — holds | — | — |
| Polk Atrium 4 + Fosi BT20A Pro | $442 | $622 | $671 | 32.9% — fails floor | $1,300 | 52.2% / 48.4% |
| **Polk Atrium 5 + Fosi BT30D Pro (2.1-ch) — CHOSEN** | $584 | $764 | $820 | 18.0% | **+$1,500** | 49.1% / 45.3% |
| Polk Atrium 6 + BT30D Pro | $684 | $864 | $925 | 7.5% | $1,700 | 49.2% / 45.6% |

**Chosen tier: Atrium 5 + BT30D Pro at +$1,500** — in a good/better menu a $500 gap with visibly bigger hardware (5" drivers, sub-capable amp) is a real choice; the Atrium 4 variant at $1,300 is recorded here as the smaller-step alternate if Lee prefers it. Atrium 6/$1,700 rejected: the acoustic step over the 5 doesn't justify a third audio tier.

### 5B.2 Honesty constraint for the site copy

"All-weather" covers rain, humidity, and temperature swings — **no outdoor speaker is rated for hot-room ceiling temperatures.** The premium tier's site copy must state the actual mounting practice (speakers live outside the peak-heat zone). The install-practice fact is Lee's to state [DOCKED]; the wording is George's.

---

## 6. What changes in code

Line numbers verified against the working tree 2026-07-28. Changes 1–3 are pure value edits; 4–6 need the small per-model machinery that `interiorUpgrade` already uses.

| # | File : line | Old | New |
|---|---|---|---|
| 1 | `js/data.js:84` | `heater: 'Harvia Pro20 or Homecraft 9kW Apex'` | `heater: 'Harvia Pro 20 or Homecraft Revive 9kW'` — **P8**. No 9kW Apex exists (Apex line is 10/12/15/18kW). This one edit also fixes both public render points, `js/modal.js:97` (spec grid) and `js/compare.js:28` (compare table) — they read from data, no edits there. |
| 2 | `js/data.js` `interiorUpgrade` (:18, :34, :53, :69, :85) | 1000 / 1500 / 2500 / 3500 / 4500 | **2200 / 2600 / 3000 / 3500 (keep) / 5000** |
| 3 | `js/data.js` `premiumFinishPrice` (:19, :35, :54, :70, :86) | 7000 / 7500 / 8500 / 9500 / 10500 | **9200 / 9600 / 10500 / 11000 / 12500** |
| 4 | `js/data.js` — new per-model fields | — | `electricHeaterUpgrade: 3500` (s2–s8) / `2800` (sc); `woodFired: null` (s2) / `9800` (s4) / `10800` (s6, s8) / `8200` (sc); `woodFiredLabel: 'Mini-IKI (Wood-fired)'` (s4) / `'Original-IKI (Wood-fired)'` (s6, s8, sc); `exteriorStandingSeam: 3000/3000/3500/4000/4000`; `exteriorCedar: 2500/2500/3000/3000/3000` |
| 5 | `src/_includes/modals/sauna.njk:58–60` | `value="2000"` / `+$2,000` | `value="3500"` / `+$3,500` (default markup). `js/modal.js:200–206` must set the input **value** and `#heaterElectricPrice` text per model from `electricHeaterUpgrade` — today it swaps only the label, which is exactly how one slot came to sell two unpriced heaters (P7). |
| 6 | `sauna.njk:62–66` | Kuuma Banya, `value="3000"`, `+$3,000` | **Kuuma removed** (P6). Replace with the IKI option: default markup `value="10800"`, label `Original-IKI (Wood-fired)`, `+$10,800`; `js/modal.js:184–192` (the existing per-model wood enable/disable block) additionally sets value, label and price text from `woodFired`/`woodFiredLabel`. S2 stays hidden (`electricOnly`). |
| 7 | `sauna.njk:77` | `value="3500"` / `+$3,500` | `value="11000"` / `+$11,000` |
| 8 | `sauna.njk:82` | `value="4500"` / `+$4,500` | `value="12500"` / `+$12,500` |
| 9 | `sauna.njk:88–105` (deck group) | two options, `value="2000"` / `value="3000"`, labels "2' Front deck" / "3' Front deck" | Relabel the existing options **"2' open deck platform"** / **"3' open deck platform"** (values unchanged) and ADD two options: **"2' semi-enclosed deck — two finished side walls, covered roof"** `value="4100"` and **"3' semi-enclosed deck"** `value="5200"`, both `data-addon="deck"` in the same radio group. The current label sells the semi-enclosed expectation at the platform price — the deck version of the window tiering defect. Takeoff §2B; final label copy is George's (register, not prices). |
| 10 | `sauna.njk:115` (standing seam) | `value="2500"` | `value="exteriorStandingSeam"`, price span gets an id, `modal.js` resolves per model (mirror the `interiorUpgrade` pattern) |
| 11 | `sauna.njk:120` (cedar exterior) | `value="2500"` | `value="exteriorCedar"`, same pattern |
| 12 | `sauna.njk:136, :141` | `+$1,500` default price text | `+$2,600` (modal's default model is S4) |
| 13 | `sauna.njk:161` | "**Save $1,000** vs selecting individually" | "**Save $500** vs selecting individually" — the current claim is checkably false (−$1,000, critic N5); at the new prices $500 is true on every model against the cheapest qualifying combination |
| 14 | `sauna.njk:170` | `+$7,500` default | `+$9,600` |
| 15 | `sauna.njk:177` (single window checkbox) | one checkbox `value="1500"` | **Two** checkboxes: `value="1500"` "Additional window (standard size)" and `value="3700"` "Additional full-size window (~23 sq ft)" with distinct `data-addon` keys; quote serializer must carry both |
| 16 | `sauna.njk:182` (lighting) | `value="1500"` / `+$1,500` | `value="2000"` / `+$2,000` |
| 17 | `sauna.njk:187` (speakers) | single option, `value="1000"` | Relabel the existing option as the **standard set** and ADD a premium option: **"Premium audio — Polk Atrium 5 all-weather pair + 2.1 Bluetooth amp"** `value="1500"`, same `data-addon` group (radio, like decks). Final label copy is George's; mounting-practice line per §5B.2. |
| 18 | `sauna.njk` — new option after speakers | — | WiFi controller checkbox: `value="2000"`, `data-addon="wifi"`, "WiFi heater controller", `+$2,000`. This brings `js/modal.js:317`'s currently-dead wifi selector alive and makes the Premium package's WiFi line individually purchasable for the first time — the root of the false-saving claim. |
| 19 | Adjacent one-liner (critic P10, same files) | both bench radios `value="0"` (`sauna.njk:148, :153`); `modal.js:356` filters `value !== '0'` so **neither bench choice ever reaches the quote** | give U-shaped a distinct token and pass the bench group through the serializer — **scoped to the bench group only**; the other six `value="0"` radios are genuine "included" defaults whose suppression is correct |

Two implementation notes for Ted, from the critic's gating findings: any change to `js/` or `styles.css` must bump the `?v=` cache stamps in `head.njk`/`scripts.njk` in the same commit (N1 — CSS/JS are cached a year, `immutable`), and `~/marvin/content/reference/operations/models.json` must be updated with the same values in the same pass or the two-system drift this whole exercise exists to end starts again (P9).

**Out of scope of this sheet:** the five base model prices ($22,500–57,000). They are the pricing-overhaul's base-price work stream, not configurator lines; nothing here touches them. One carry-over for that stream (per Lee, 2026-07-29): every base build includes a T&G accent face on the entrance wall — base-model materials takeoffs must clad three walls in metal and one in T&G, never four in metal.

---

## 7. Still unverifiable — stated plainly

1. **SSC's Homecraft trade discount.** Every Homecraft figure here is public retail; no dealer pricing is published anywhere. Every heater/controls margin in this sheet is therefore a floor. One email (Sales@homecraftsaunas.com) tightens every one of them upward.
2. **H-Series longevity.** The $1,175 credit was re-verified live 2026-07-28, but the 3-phase variant is out of stock and the line has vanished from Homecraft's tag page. If it dies, add-on margins here *improve* (§4.2); base-model cost rises $775 — watch it for the base-price work, not this sheet.
3. **Whether Apex heaters have integrated controls** (doc 30 §5.4, still open). Priced at $0 delta, the upward-biased side; if integrated, the SC path gains another $575–650 of margin. Confirm with Homecraft in the same email as (1).
4. **IKI freight, Barrie → Squamish.** Quote-by-postal-code only; $500 allowance carried (the only published comparable: Lamppa's typical pallet freight $200–600 USD). A ±$300 quote swing moves the wood-fired prices ±~$570 at margin. One call to B Saunas (1-705-727-0404) closes it — do this before the first wood-fired quote goes out, not before the site ships.
5. **IKI stone pricing.** B Saunas sells 20 kg boxes at quote-at-checkout; carried at the $50/box Homecraft proxy ($300 Mini / $550 Original). Same call as (4).
6. **IKI stock at B Saunas.** Not shown online. Same call.
7. **Clear cedar 1x6 T&G price.** No published Canadian price exists (doc 31 §5.1); priced at thermowood parity. If Northwood/Fisher quote at the 3× knotty end (~$11.70/sqft), the S8 clear-cedar line drops to ~21% GM at $3,500 — one phone call **before** the interior-upgrade prices publish, or split clear cedar from thermowood pricing when the quote lands.
8. **The metal panel supplier and cost** — still "TBD" in master-materials, still the softest input in the model. The standing-seam recs ride the top of the overhaul's $2,900–4,000 band; requote the line when the supplier is confirmed. (Published market materials at $8–18/sqft would say even $4,000 is thin on an S8 — a reason to treat these prices as floors, not to delay shipping them.)
9. **Begbie glass** — Feb 2026 invoice basis, no public price list. Re-quote before the window tiers publish; no market evidence of movement.
10. **Every labour delta** (2 h controls, 8 h chimney, 4 h/8 h window installs, and the changing-room and semi-enclosed-deck task tables). No external benchmark for custom mobile sauna labour exists — doc 31 searched and found nothing citable. These are named estimates, arguable line by line in §2.4 and §2B.3, and the two-tracked-builds action from the pricing overhaul is still the only thing that settles the rate.
11. **Chimney kit at $700** (Home Depot, master-materials Feb 2026) — reconfirm the SKU at order time; the IKI 4"→6" adapter price is unpublished (small).
12. **Polk/Fosi buy route and price.** The premium audio tier (§5B) is costed at manufacturer MSRP; Atrium 5 street pricing runs materially lower (Atrium 4 ~C$200 vs C$299 MSRP on Amazon.ca), so the 45.3% stressed GM is a floor. Confirm the buy route (Amazon.ca vs a distributor) at first order; and Lee states the mounting practice for the site copy (§5B.2, DOCKED).

## 8. Sources

**Live checks this pass (2026-07-28):** homecraftsaunas.com/product/7-5-kw-h-series-heater/ ($1,175, live) · bsaunas.com/iki-wood-burning-sauna-stoves/ (full IKI wood lineup, CAD) · bsaunas.com/product/original-iki-wood-burning-sauna-stove/ ($4,640, 353–882 cu ft, 485 lb stones) · bsaunas.com/product/mini-iki-wood-burning-sauna-stove/ ($4,320, 176–423 cu ft, 264 lb stones).

**Live checks 2026-07-29 (speaker tiers, §5B):** polkaudio.com/en-ca/product/outdoor-speakers/atrium-4/112577.html (Atrium 4 C$299/pair · Atrium 5 C$399/pair · Atrium 6 C$499/pair, MSRP) · fosiaudio.com/products/fosi-audio-bt30d-pro-bluetooth-5-0-2-1-channel-540w-power-amplifier (BT30D Pro US$109.99; BT20A Pro US$79.99 shown as comparison) · USD→CAD at the doc-30 rate 1.41.

**Doc 30** (`30-pricing-heaters-equipment.md`, 2026-07-28): Revive 9kW $1,850 · Apex 10/12/15/18 $2,400/$2,800/$3,000/$3,300 · no 9kW Apex · WiFi touchpad $550, contactors $275/$350, touchpad $300, stones $50/box · Harvia Pro 20 $1,909.95 (sauna.ca, in stock) · Kuuma landed $6,140–6,704+ · lighting kit simplysecured.ca ~$455–600 · speakers market $42–155.

**Doc 31** (`31-pricing-materials.md`, 2026-07-28): labour $60/hr verified (Job Bank Nov 2025, Markoni 2026) · thermowood $9.21/sqft holds (POCO Jan 2025 + Fraser Mar 2026) · Begbie $37–48/sqft + $300 crating (invoices Feb 2026) · Tesli doors $350–800 (saunadoor.ca) · trailers 7×14 $5,790 / 7×16 $7,995 / 7×18 $8,490 (Nanaimo Trailers / Big Tex BC, Jul 2026) · metal panel band flag.

**Internal:** `pricing-first-principles.md` (2026-07-27, session scratchpad — not retained; unit prices, geometry method, and stress convention carried into §2 and doc 31) · `pricing-overhaul-reference.md` (2026-07-21) — 45%/40% convention, add-on audit, changing-room cost ranges · master-materials.md (Feb 2026) — all lumber/insulation/VB/hardware unit prices · critic rev. 3 (2026-07-28) — P1–P10, N1, N5 · Lee's decisions, per Lee 2026-07-28 · accent-wall standard (entrance wall = T&G accent, included in base price; never metal), per Lee 2026-07-29 · semi-enclosed deck standard (two side walls + roof carried over the deck, T&G inner faces; product split into open-platform and semi-enclosed tiers), per Lee 2026-07-29.



