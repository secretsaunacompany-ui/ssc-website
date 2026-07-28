# 31 — Material & Fabrication Pricing Verification (2026)

**Date:** 2026-07-28
**Purpose:** Verify SSC's cost assumptions against current Canadian market pricing so add-on prices can be reset against reality. Several add-ons currently sell below cost (changing rooms, extra window, thermowood S2 interior).
**Currency:** CAD unless noted. All prices pre-tax.
**Status:** COMPLETE — all five sections populated and sourced.

**Baseline being tested:** the first-principles cost model (scratchpad `pricing-first-principles.md`, 2026-07-27) and `pricing-overhaul-reference.md` (2026-07-21). Key assumptions under interrogation:
- Labour at $60/hr, 2.5 hr/sqft build formula
- Lunawood thermowood at Jan 2025 catalogue prices (Arctic Layer 1x6 $9.21/sqft @ >45 pcs)
- IGU glass $37–48/sqft (Begbie, Feb 2026)
- Metal siding $50/panel ("TBD" supplier — flagged softest input)
- 18' flatbed trailer $5,000–6,000 (Sunrise)
- Epoxy $6.07/sqft (Swell, Feb 2026)

---

## 1. Verified Pricing Table

Confidence key: **High** = current published price or SSC supplier invoice/quote ≤6 months old. **Med** = current market range from multiple sources, not SSC-specific. **Low** = directional only (US source, dated, or single uncorroborated figure).

### 1.1 Wood

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Lunawood Arctic Layer 19x142 (1x6) cladding | per pc | $58.88 retail (Composite Deck Shop, ON dealer) vs POCO Jan 2025 catalogue $61.92 (12.8') | https://compositedeckshop.com/pages/lunawood-thermowood ; POCO catalogue in `thermowood-pricing-reference.md` | Jul 2026 / Jan 2025 | High |
| Lunawood Arctic Layer 1x6 — SSC volume price | per sqft | **$9.21–9.42 @ >45 pcs still holds.** Fraser (POCO) quoted 16' Arctic Layer at $80.33 retail in Mar 2026 vs $82.56 in the Jan 2025 catalogue — pricing drifted DOWN ~3%, not up. Independent ON dealer retail corroborates. | POCO catalogue + Fraser Goldsmith quote Mar 2026 (SSC email thread, per `thermowood-pricing-reference.md`); cross-check compositedeckshop.com | Mar–Jul 2026 | High |
| Lunawood Panel 19x117 (1x5) | per sqft | $6.72–6.87 @ >45 pcs (Jan 2025 catalogue; no contradicting 2026 data found — dealer retail levels corroborate the catalogue tier) | POCO catalogue, `thermowood-pricing-reference.md` | Jan 2025, corroborated Jul 2026 | Med-High |
| Lunawood SHP 42x42 (2x2) bench stock | per LF | $2.03 @ >45 pcs (Jan 2025). CDS carries only the 42x92 batten ($4.99/LF retail ≈ POCO's $4.51 retail — consistent) | POCO catalogue; https://compositedeckshop.com/pages/lunawood-thermowood | Jan 2025 / Jul 2026 | Med-High |
| WRC 1x6 T&G knotty (STK) | per pc (8') | $13.00 = $1.63/LF = ~$3.90/sqft | Northwood (MJ), SSC supplier, Feb 2026 (`master-materials.md`) | Feb 2026 | High |
| WRC 1x6 T&G clear | per LF | **No published Canadian price found online** — Canadian mills (Quality Cedar, Log Home Store, Hamshaw) are quote-only. US indicative: clear/CVG T&G runs 2–3x knotty. Action: one phone call to Northwood/Fisher. | https://www.qualitycedarproducts.ca/product-page/clear-cedar ; https://www.loghomestore.ca/product/1x6-tongue-and-groove-cedar/ | Jul 2026 | Low — see §5 |
| WRC 2x2 clear S4S KD (bench slats) | per LF | $2.00 (Fisher quote: 1,240 ft = $2,485.95) / Northwood $2.35 clear, $1.55 STK | Fisher Coating + Northwood, Feb 2026 (`master-materials.md`) | Feb 2026 | High |
| WRC 2x4 S4S KD 16' | per pc | $19.50 ($1.22/LF) | Fisher Coating, Sep/Oct 2025 (`master-materials.md`) | Oct 2025 | Med-High |
| SPF 2x4x8 stud | per pc | $4–6 (SSC's Rona range; Rona/Home Depot product pages confirmed live at this tier but exact web price not retrievable — retailer blocks fetch) | https://www.rona.ca/en/product/2-in-x-4-in-x-8-ft-spf-stud-grade-lumber-ep248s-0971047 ; `master-materials.md` Feb 2026 | Feb–Jul 2026 | Med-High |

### 1.2 Glass

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Sealed tempered IGU, solar-coated | per sqft | $37–48 pre-tax + $300 flat crating (Begbie invoices: Clarke 22.9 sqft @ ~$48; Jonathan 33.3 sqft @ ~$37) | Begbie Glass invoices, Feb 2026 (`master-materials.md`) | Feb 2026 | High |
| IGU, generic North American market | per sqft | US market: insulated glazing $8–25/sqft materials; $20–40/sqft typical replacement supply. Begbie's $37–48 is for TEMPERED both-lite + solar coating — a premium spec; the generic band is not comparable like-for-like. No cheaper BC tempered-IGU quote found online (fabricators are quote-only). | https://oneanddoneprep.com/glass-cost-price-u-s-buyers/ ; https://designtransitionstudio.com/insulated-glass-panels-cost-price-ranges-u-s-buyers/ | 2026 | Med (directional) |
| Sauna door, frameless all-glass tempered (24"x72"-class) | each | **$350–800** (Tesli, Canadian importer: DUO $350 → STEEL MAGNETIC $800) | https://saunadoor.ca/ | Jul 2026 | High |
| Sauna door, framed glass (aluminum frame) | each | **$800–1,000** (Tesli Antalya line) | https://saunadoor.ca/ | Jul 2026 | High |
| SSC in-house door | each | $300–700 materials (historical) — Tesli's finished doors bracket this; buying finished at $350–450 may beat in-house build time entirely | `master-materials.md` | Feb 2026 | Med |

### 1.3 Exterior

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Standing seam metal, installed | per sqft | $13–20 (Vancouver); Canada-wide $13–30 | https://professionalmetalroofing.ca/how-much-a-metal-roof-costs-canada/ ; https://barrierboss.ca/blogs/news/metal-roofing-cost-canada-2026 | 2026 | Med-High |
| Standing seam metal, material only | per sqft | ~$8–18 (top of the $4.50–18 materials band) | https://barrierboss.ca/blogs/news/metal-roofing-cost-canada-2026 | 2026 | Med |
| Exposed-fastener panel (corrugated/rib), installed | per sqft | 26ga corrugated $7–10; R-panel/rib $8–12 | https://renoquotes.com/en/blog/metal-roof-cost-per-square-foot-in-canada-in-2026 | 2026 | Med |
| Exposed-fastener panel, material only | per sqft | ~$2.50–5 (low end of the $4.50–18 band is rib/corrugated; SSC's $50 per 3'x9' panel = $1.85/sqft is BELOW the published band — plausible only as contractor-priced light-gauge; **flag: confirm SSC's actual panel supplier + gauge**) | https://barrierboss.ca/blogs/news/metal-roofing-cost-canada-2026 ; `master-materials.md` ("TBD" supplier) | 2026 | **Low — softest input, unchanged** |
| Shou sugi ban / charred cedar, material | per sqft | $8 (NW Shou Sugi Ban prefinished charred cedar, 6" exposure) to $13–27 typical N.American supply+install band; install labour $2–5 | https://www.northwestshousugiban.com/information ; https://www.angi.com/articles/shou-sugi-ban-siding-price.htm | 2026 | Med |
| Charred cedar, Canadian distributors | — | Nakamoto Forestry (US/Canada) and Charred Wood Canada (Degmeda) — quote-only, no published CAD/sqft | https://nakamotoforestry.com/ ; https://charredwood.ca/ | Jul 2026 | — |

### 1.4 Flooring

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Commercial epoxy, installed (pro) | per sqft | $5–15 commercial; $5–12 typical pro jobs; 100% solids commercial grade $10+; Vancouver +15–25% over drier regions | https://coated.ca/how-much-does-epoxy-garage-floor-coating-cost-in-canada-a-2026-pricing-guide/ ; https://crowncoatings.ca/what-does-a-commercial-epoxy-floor-cost/ | 2026 | Med-High |
| Epoxy material only (SSC self-install) | per sqft | $6.07 (Swell Composites invoice, $777/128 sqft) — sits mid-band vs the installed market, i.e. SSC's material cost alone ≈ what pros charge installed at the low end. Reasonable; not understated. | Swell Composites invoice Feb 2026 (`master-materials.md`) | Feb 2026 | High |
| Porcelain tile, installed (alternative) | per sqft | $16–26 Vancouver installed; material only $1–5. **Not competitive with epoxy for SSC**: tile adds weight and cracks on a flexing trailer deck — cost aside, wrong spec for mobile builds. | https://vcfloor.ca/tile-flooring-prices-in-canada/ ; https://www.angi.com/articles/tile-flooring-choices-descriptions-and-costs.htm | 2026 | Med |

### 1.5 Envelope

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Rockwool Comfortbatt R14 (2x4, 59.7–60.1 sqft/bag) | per bag | SSC's $60–65 (Feb 2026, Rona). Home Depot Canada carries the SKU; live web price not retrievable (retailer blocks automated fetch). No evidence of movement. | https://www.homedepot.ca/product/rockwool-r14-comfortbatt-15-25-inch-by-47-inch-by-3-5-inch-59-7-sq-ft-/1000122327 ; `master-materials.md` | Feb–Jul 2026 | Med-High |
| Rockwool Comfortbatt R22 (2x6, 37.5–39.8 sqft/bag) | per bag | Not in SSC's records. HD Canada SKU exists (1000123043); price not retrievable online. Typical shelf ratio vs R14 is ~1.15–1.3x per bag for ~2/3 the coverage → ~$1.9–2.2/sqft vs R14's ~$1.05/sqft. **Needs a shelf check.** | https://www.homedepot.ca/product/rockwool-r22-comfortbatt-15-25-inch-by-47-inch-by-5-5-inch-39-8-sq-ft-/1000123043 | Jul 2026 | Low |
| Sauna foil vapour barrier | per roll | Island Sauna (BC): ~$50 for 22m roll; Tesli 25m² (269 sqft) roll; Monarch 250 sqft/roll. SSC's ~$90/roll (Feb 2026, Amazon 310 sqft) is consistent per-sqft (~$0.29–0.35/sqft market). | https://www.islandsauna.ca/product-page/sauna-foil-vapor-barrier ; https://tesli.ca/product/tesli-sauna-thermal-vapour-barrier-foil/ ; `master-materials.md` | Jul 2026 | High |

### 1.6 Fabrication

| Item | Unit | Price | Source | Date | Conf. |
|---|---|---|---|---|---|
| Flatbed trailer, NEW 7x14, 7,700 lb GVWR | each | $5,790 (2026 Southland, Nanaimo Trailers) | https://www.nanaimotrailers.com (Southland 7x14 listing, per AutoTrader/dealer search results) | Jul 2026 | High |
| Flatbed trailer, NEW 7x16, 7,000 lb GVWR | each | $7,995 (Big Tex landscape/flatbed, BC dealer network); 7x12 $7,495, 7x14 $7,695 | BC dealer listings via https://www.autotrader.ca/trailers/lst/reg_bc | Jul 2026 | Med-High |
| Flatbed trailer, NEW 7x18 | each | 7,700 lb GVWR unit at Nanaimo Trailers SOLD (price unlisted); the 15,400 lb GVWR 7x18 equipment trailer is **$8,490**. Expect $6,500–8,500 for 18' tandem 7,000+ GVWR new in BC. | https://www.nanaimotrailers.com/inventory/Hs41/2026-southland-7x18-7-700lb-gvw-flatbed-trailer.htm | Jul 2026 | Med |
| Flatbed trailer, USED 18–20' | each | Spot market only (Craigslist/FB Marketplace Vancouver); listings ephemeral and wildly variable ($5K–$17K+ seen for flat decks of mixed size/condition). No stable price to cite. | https://vancouver.craigslist.org/search/tra ; https://www.facebook.com/marketplace/vancouver/flatbed-trailers/ | Jul 2026 | Low |
| Roller shutters, security (residential window, installed) | per window | Manual $300–700; motorized $500–1,000; total installed $600–1,400 (Canada-wide) | https://rollerup.ca/roller-shutters-cost-in-canada/ ; https://awningsandmore.ca/how-much-do-security-shutters-cost-in-calgary-2026-price-buying-guide/amp/ | 2026 | Med-High |
| Roller shutters, trailer-mount (SSC spec, 2 windows) | per unit | $2,500–4,000 installed — SSC's own Jul 2026 research (Talius BC 1-888-550-6205; ROLCO AB 1-800-733-0440). Market residential band above corroborates: 2 motorized windows $1,000–2,800 + custom trailer mounting closes the gap. Both vendors quote-only. | `~/marvin/research/roller-shutters-mobile-sauna-bc-20260721/report.md` (2026-07-21) | Jul 2026 | Med-High |

---

## 2. Deltas vs SSC Assumptions

| SSC assumption | 2026 market finding | Delta | Margin effect |
|---|---|---|---|
| Labour $60/hr | Wage median $32/hr (Job Bank); Vancouver billing $50–75/hr day-rate equivalent; specialist finish work bills higher | **Holds.** Low-mid of billing band | None. Do not cut. Commercial quotes could justify $70–75/hr (+$1,200–1,800 on an SC) |
| Thermowood: Arctic Layer 1x6 $9.21/sqft @>45 pcs (Jan 2025 catalogue) | Fraser quoted Mar 2026 ~3% BELOW catalogue; ON dealer retail ($58.88/pc) corroborates catalogue tier | **Holds, slightly favourable** | None. Thermowood add-on repricing ($2,200 S2 / $2,600 S4) stands on verified costs |
| IGU $37–48/sqft + $300 crating (Begbie) | No cheaper BC tempered-IGU source found online; generic IGU bands ($20–40 US) are for non-tempered spec — not comparable | **Holds** | Extra-window repricing stands; tier by size (see §2.1) |
| Metal panel $50 per 3'x9' panel ($1.85/sqft), supplier "TBD" | Published Canadian materials band $2.50–5/sqft for rib/corrugated | **Likely UNDERSTATED 35–170%** | Standing-seam/metal add-on costs may be $200–800 higher per build than modelled. Confirm the actual supplier before repricing metal add-ons |
| Standing seam add-on $2,500 | Installed market $13–20/sqft Vancouver. An S6/S8 exterior ≈ 200–250 sqft → $2,600–5,000 market equivalent | Current price ≈ market COST | Confirms overhaul's scale recommendation ($2,900–4,000 by area) |
| Trailer $5,000–6,000 (Sunrise, 6'x8'–6'x14') | New BC 2026: 7x14 $5,790; 7x16 $7,995; 7x18 est. $6,500–8,500 | **UNDERSTATED for 18'+ by ~$1,000–2,500** | First-principles trailer line ($5,500 midpoint) is a 14' price. An 18' tandem basis should be ~$7,000. Trailer line price rises accordingly (hybrid treatment: ≈$12,200 vs $10,600) |
| Rockwool R14 $60–65/bag | HD Canada SKU live; no evidence of movement; exact shelf price unfetchable online | Holds (Med-High) | None |
| Foil VB ~$90/roll | BC suppliers $50/22m roll; per-sqft consistent | Holds | None |
| Epoxy $6.07/sqft material (Swell) | Pro-installed market $5–15/sqft commercial | Holds | None. SSC self-install stays cheapest path; tile is wrong spec for mobile builds |
| Roller shutters $2,500–4,000 per 2-window set | Residential installed $600–1,400/window; trailer mounting premium closes the gap | Holds | Price as quoted-per-job add-on, never flat-rate |
| In-house door $300–700 materials + build labour | Tesli finished frameless doors $350–800 delivered in Canada | **Buying may beat building** | A $450 finished door vs $500 materials + 8–16 h build labour ($480–960) → potential $500–1,000 saving per build. Worth one test order |

### 2.1 Extra window — the zero-margin line, resolved by tiering

The audit's "$1,500 cost" and the first-principles model's "$555 cost" are **both right — for different windows**:
- **Small lite (~6 sqft):** $222–288 glass + $300 crating + framing ~$75 + install 2–4 h ($120–240) = **$720–900 cost** → current $1,500 price is a 40–52% GM. Fine.
- **Full-size lite (Clarke-class, ~23 sqft):** $1,100 glass + crating share + framing ~$100 + install 4–6 h ($240–360) = **$1,650–1,900 cost** → $1,500 price is **negative margin**; even the recommended $2,500 is only ~30% GM stressed.

**Action:** two price tiers. Small window $1,500 (keep). Full-size window **$3,200–3,500** (45% GM on $1,800–1,900 stressed cost). One "extra window" price for both sizes is how this line went negative.

---

## 3. Changing-Room Verdict

**The audit's cost range is real. The current prices ($3,500 / $4,500) are indefensible at any labour assumption tested. Minimum defensible prices: 3' room $8,000–8,500; 4' room $10,000–10,500.**

### 3.1 Rebuilt cost from the takeoff model (not inherited from the 2.5 hr/sqft formula)

Marginal cost per added foot of 7'-wide box length, from the first-principles takeoff (S6→S8 delta): **~$458/LF materials**. A changing room adds: extended floor/walls/roof/cladding at that rate, plus an interior partition wall with door (~$300 framing/cladding + $500 door), plus exterior door hardware. No heater, no foil VB, no full bench — those savings are already excluded because the $458/LF is envelope-only.

| | 3' room (21 sqft) | 4' room (28 sqft) |
|---|---|---|
| Envelope materials (3–4 LF × $458) | $1,375 | $1,830 |
| Partition wall + interior door | $800 | $800 |
| Hooks, small bench, trim | $150 | $150 |
| **Materials** | **~$2,325** | **~$2,780** |
| Labour @ 2.5 hr/sqft (formula) | 52.5 h = $3,150 | 70 h = $4,200 |
| Labour @ 1.75 hr/sqft (simpler space, see 3.2) | 37 h = $2,205 | 49 h = $2,940 |
| **Direct cost (labour range)** | **$4,530–5,475** | **$5,720–6,980** |
| Stress cost (mat ×1.05, hrs ×1.15) | $5,000–6,065 | $6,300–7,750 |
| **Price @ 45% GM** | **$9,100–11,000** | **$11,450–14,100** |
| Price @ 35% GM (add-on floor) | $7,700–9,300 | $9,700–11,900 |

The audit's $4,700–5,900 (3') and $6,000–7,500 (4') ranges are **reproduced almost exactly by an independent takeoff**. This is no longer a formula artifact — two methods agree.

### 3.2 The 2.5 hr/sqft assumption, interrogated

- **It cannot be validated externally.** No published labour-hour benchmark for custom mobile sauna construction exists (searched; nothing citable). Only SSC's own tracked hours can settle it — the pricing-overhaul action item (§3.6, two tracked builds) remains the answer.
- **Internal plausibility check:** 2.5 hr/sqft puts an S4 at 122.5 h ≈ 3 solo weeks for a complete insulated, clad, benched, wired mobile building. That is not an inflated figure for finish-grade work.
- **But a changing room is not sauna space.** The phase breakdown in the first-principles model allocates ~20% of hours to heater/electrical/bench/foil phases a changing room mostly lacks. **1.75–2.0 hr/sqft is the honest rate for changing-room area.** The table above carries both.
- **The verdict survives either rate.** At the friendliest rate tested (1.75 hr/sqft), the 3' room still costs $4,530 direct — $1,000 more than its $3,500 price. The audit's "every sale is a ~$2,000 gift" is, if anything, understated once the partition wall and door are priced in.

### 3.3 What to charge

- **3' changing room: $8,500** (45% GM at the simpler-labour rate; ~35% GM if 2.5 hr/sqft proves right). Matches the pricing-overhaul recommendation independently.
- **4' changing room: $10,500–11,000** ($10,500 = low end of the defensible band; the overhaul's number was the floor, not the middle).
- If those prices kill demand, the correct response is **spec reduction** (uninsulated, single-wall interior, no partition door — genuine cost removal), never price reduction on the current spec.

---

## 4. Labour Rate Finding

**Verdict: $60/hr is defensible as an internal cost basis, and if anything is at the LOW end of what this work bills at market in the Lower Mainland / Sea-to-Sky in 2026. It is not materially wrong in the dangerous direction. The bigger risk in SSC's model is the hours formula, not the rate (see §3).**

### Evidence, wage side (what an employed carpenter earns)

| Source | Figure | Date |
|---|---|---|
| Job Bank (StatCan LFS 2023–24, updated Nov 2025) — BC carpenters | Low $23.00 / **Median $32.00** / High $43.71 per hr | Nov 2025 · https://www.jobbank.gc.ca/marketreport/wages-occupation/6388/BC |
| Job Bank — Lower Mainland–Southwest region | Low $22.50 / Median $31.50 / High $43.00 | Nov 2025, same URL |
| Indeed — finish carpenter, BC average | $31.88/hr | Jun 2026 · https://ca.indeed.com/career/finish-carpenter/salaries/British-Columbia |
| PayScale — finish carpenter, Vancouver | C$33.43/hr (range C$25–45) | 2026 · https://www.payscale.com/research/CA/Job=Finish_Carpenter/Hourly_Rate/896c7026/Vancouver-BC |
| Job Bank — carpenter-contractor, Canada | $25.00–$51.17/hr | Nov 2025 · https://www.jobbank.gc.ca/marketreport/wages-occupation/14534/ca |
| Job Bank — general contractor, BC | $31.00–$75.00/hr | Nov 2025 · https://www.jobbank.gc.ca/marketreport/wages-occupation/24314/BC |

### Evidence, billing side (what clients are charged)

| Source | Figure | Date |
|---|---|---|
| Markoni Renovations (Vancouver reno contractor) | Vancouver carpentry: **$400–600/day** (= $50–75/hr at 8 hr); Burnaby $380–580, Surrey $390–590 | 2026 · https://markonirenovations.com/blog/cade-faq/what-are-the-carpenter-rates-in-vancouver-bc/ |
| HomeGuide (US national, USD — directional only) | Finish carpenters $40–100 USD/hr; detailed decorative work $80–200 USD/hr | 2026 · https://homeguide.com/costs/carpenter-hourly-rates |

### Interpretation

- As a **wage**, $60/hr is ~85% above the BC median ($32) and ~35% above even the high decile ($43.71). SSC is not paying anyone this; it is the owners' imputed labour value.
- As a **billing rate** — which is what it functions as inside a cost-plus-margin model — $60/hr sits at the low-middle of the Vancouver market ($50–75/hr day-rate equivalent) and below what specialist finish carpentry actually bills. Squamish/Sea-to-Sky rates track Vancouver or higher due to trades scarcity (no independent Squamish-specific published rate found — see §5).
- **Implication for the changing-room dispute:** the $60/hr rate cannot be blamed for the cost overruns. If the changing rooms cost $4,700–5,900 to build against a $3,500 price, cutting the rate to the $32 median wage would only be valid if SSC values owner time at employee wages — which contradicts the pricing-overhaul target of $60K/yr owner comp on ~1,000 billable hours ($60/hr exactly). The rate is internally consistent with SSC's own compensation target.
- **Do not lower it.** If anything, commercial quotes should use $70–75/hr to match what the Vancouver market bills for comparable finish work.

---

## 5. Unverifiable Items

Stated plainly, per the research mandate:

1. **Clear WRC 1x6 T&G price (CAD/LF).** Every Canadian mill found (Quality Cedar, Log Home Store, Hamshaw) is quote-only online. US listings suggest 2–3x knotty, but no Canadian number can be cited. **One phone call to Northwood or Fisher resolves it.**
2. **Exact current shelf price of Rockwool R14/R22, SPF 2x4, and Rona lumber SKUs.** Rona and Home Depot Canada block automated price retrieval (403/timeout). SKUs confirmed live; SSC's Feb 2026 figures are the best available numbers and nothing suggests movement. A 10-minute store visit or logged-in web check closes this.
3. **The metal panel supplier and true panel cost.** Still marked "TBD" in master-materials. $50/panel is below every published band — it may be a real contractor price or a stale memory. This was flagged as the softest input in the first-principles model and remains so. **Blocking item for repricing metal-exterior add-ons.**
4. **The 2.5 hr/sqft labour formula.** No external benchmark exists for custom mobile sauna labour hours. Unverifiable by research, by anyone. Only tracked hours on the next two builds settle it (§3.2).
5. **Squamish/Sea-to-Sky-specific billing rates.** No published carpenter billing data for Squamish specifically; Vancouver rates used as proxy. Direction of error is favourable (Sea-to-Sky trades scarcity pushes rates up, not down).
6. **Talius / ROLCO shutter quotes.** Both quote-only. SSC's own Jul 2026 research report is one week old and remains the best source; market corroboration in §1.6.
7. **Used trailer market.** Craigslist/FB Marketplace spot listings only — no citable stable price. New-trailer pricing (§1.6) is solid; used is buy-when-you-see-it.
8. **Kuuma wood-fired landed cost.** Not researched this pass (heater pricing was verified in the Jul 2026 overhaul session). The overhaul's FREEZE recommendation stands until an actual landed invoice exists.

---

## Bottom line

Three assumptions were the load-bearing ones, and all three survived contact with the market: **labour $60/hr holds (low side of billing reality), thermowood Jan 2025 pricing holds (Mar 2026 quote 3% lower), Begbie glass holds (no cheaper tempered alternative surfaced).** The two that broke: the **metal panel cost** (understated, supplier still unidentified) and the **trailer basis** (a 14' price applied to an 18' spec — add $1,000–2,500). The changing rooms lose money under every labour assumption tested, including the friendliest; $8,500 / $10,500+ are the floors. The extra-window zero-margin problem is a tiering error, not a pricing error — split it into small ($1,500, keep) and full-size ($3,200+).
