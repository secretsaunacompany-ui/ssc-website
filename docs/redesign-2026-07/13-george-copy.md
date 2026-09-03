# SSC Website — Replacement Copy (Revision 2, sourced)
George (copywriter) — 2026-07-28, revised same day after source-integrity review

**PRICE FIGURES SUPERSEDED (2026-08-06):** every dollar figure in this document predates the pricesVersion 3–4 reprices and is stale ($22,500 S2 is now $23,500; $29,000 S4 is now $29,500; the /saunas/ schema price list at §item 9 is wholly superseded). The number authority is `41-models-v2.json` (canonical models.json + `js/data.js`, pricesVersion lock enforced by `npm run prices-version:test`). A WP-3 implementer quoting this doc's copy verbatim MUST re-derive every price from the live source — the prose and structure here remain the copy authority; the numbers do not.

Every factual sentence below carries one of five annotations:
`[src: path:line]` verifiable in the repo · `[src: brief]` in the design brief, quoted accurately · `[src: per Lee, 2026-07-28]` Lee's verbatim interview material carried in the brief · `[UNSOURCED — CUT]` claim removed · `[NEEDS LEE]` visible placeholder, cannot ship as written.
Anything I couldn't annotate is gone. A weaker sentence that is true beats a stronger one that is not.

---

## 0a. Audit trail — every claim removed or downgraded in this revision

| # | Original claim | Disposition |
|---|---|---|
| 1 | "GST 5% + PST 7% (per brief)" — cited in four places | **False citation withdrawn.** The brief contains neither GST nor PST. Whether PST applies to a custom sauna build (goods vs improvement to real property) is a live tax question. All four tax lines replaced with [NEEDS LEE] placeholders pending Jon's answer. No tax figure publishes until then. |
| 2 | "still doing it twenty-five years on" | **Downgraded.** The site claims "Built to last 25+ years outdoors" (`saunas.njk:126`) — a durability target. I converted it into an operating history the company does not have. Rewritten to the target. |
| 3 | "A $30 session is the top of a $30,000 funnel" | **Cut the figure.** No session price exists anywhere in the repo or brief. The funnel argument survives without the number. |
| 4 | "run daily" at the four named venues; "earn their living… running daily"; "working daily" | **Downgraded.** The venues verify (`locations.njk:34–70`); "daily" appears nowhere. Rewritten to what the source supports: the saunas operate at these venues. |
| 5 | "Running today at breweries, beaches, and a seaside hotel" | **Corrected.** One brewery, one beach, one hotel verify. Plurals removed, and the SC-specific claim narrowed to the two venues that actually run SC models. |
| 6 | "There's no charge for any of it" (whole consultation stage) | **Narrowed.** Source supports free site visits only (`src/squamish.njk:28`). Free-consultation claim removed. |
| 7 | "a fixed quote and a build slot… buys your materials" | **Cut to what verifies.** Only the 30% deposit verifies (`faq.json:40`). "Fixed quote" also contradicted the disclaimer I kept ("Final pricing is confirmed after consultation"). "Build slot" and "buys your materials" removed. |
| 8 | "Bookings already in the system will resume on their own" | **[NEEDS LEE].** A functional claim about an external booking system I cannot verify. |
| 9 | Kuopio study relabel with "(Verified: …)" | **Withdrawn.** My reasoning was sound but I supplied no link, DOI, or document path — Critical Rule 6. The existing on-site label stays until a real citation is attached. |
| 10 | Heater list "Harvia, Kuuma, and HUUM" | **Homecraft restored.** It is the standard electric heater in the configurator (`modals/sauna.njk`) and in the warranty list (`warranty.njk:59`). My edited list read more premium than what customers receive. |
| 11 | SC dimensions "12' × 7'+" | **Flagged as a repo contradiction.** Schema says "7' x 12'+" (`saunas.njk:84`); the visible card says "12' × 7'+" (`saunas.njk:269`). Copy now uses 7' × 12'+ to match the schema and the 7'-first pattern of every other model; Ted must align both instances. |
| 12 | "the name is 2-5 Year Limited Warranty everywhere else on the site" | **Corrected.** It is correct in exactly one place (`warranty.njk:13`). "2-5 Limited Warranty" (no "Year") appears in `faq.json:30` and `faq.json:31` — the latter is the schema answer feeding Google rich results. Fix list now enumerates every instance. |
| 13 | "We typically respond within one business day" as a pre-submission promise, five places | **Withdrawn to [NEEDS LEE].** `thank-you.njk:5` is a post-submission courtesy line; I moved it onto the quote button as a pre-submission commitment. Wim flagged reply-time twice as "Lee must supply, do not invent." The thank-you page keeps its existing line; every pre-submission use is a placeholder. |
| 14 | "Secret Sauna Company is Lee and Anthony" | **[NEEDS LEE].** The brief says names are fine but "keep it slightly vague rather than a solo-founder story," and my own open item asks Lee to confirm the vagueness level. Placeholder until he does. |
| 15 | "We send progress photos as it comes together, and you're welcome to come see it mid-build" | **Cut / downgraded.** Progress photos are unsourced; the shop-visit invitation references a shop that closed May 2026 [src: brief]. Rewritten to the sourced "we keep you updated throughout" (`faq.json:5`). |
| 16 | "Most of what's sold as a sauna in this country can't say any of that" | **Cut.** Broad competitive claim with no source. The comparison grid makes the argument with specifics; the slogan version added nothing true. |
| 17 | "You leave this stage with a recommendation, a budget range, and an honest answer" | **Downgraded.** "Budget range" unsourced. Rewritten to the site's own language: a custom design plan (`contact.njk:5`). |

---

## 0b. The Big Idea, corrected

My audit line ("built by the hands you shook") was right about the idea and wrong about the register. Lee's correction is the brief: no wink, no cleverness, no corn [src: brief]. The architecture-studio register carries differentiation by *stating practice as fact*. Nakashima's site doesn't say "the only woodworker who..." It says what the studio does, plainly, and the plainness is the confidence.

**The Big Idea, restated for this register:** *One studio does everything. The conversation, the drawing, the build, the delivery. That is the whole pitch, said without raising its voice.* [src: per Lee, 2026-07-28 — "here we play every role"]

Every page below is written to that. Sentences are short and declarative. Claims are specific, and now every specific claim traces to a source or wears a placeholder.

---

## 1. Home — `src/_includes/pages/home.njk`

### Hero
The page opens on the full-bleed photograph with nothing on it (per the approved mood board) [src: brief]. On first scroll, this arrives:

> **Secret Sauna Company designs and builds Finnish saunas in Squamish, British Columbia.** [src: brief — "SSC builds custom Finnish-style saunas in Squamish, BC"]
>
> Every build is ours from the first conversation to the day it arrives. [src: per Lee, 2026-07-28 — "start a conversation… present them with the final product at the end"] Drawn here, built here, delivered from down the road. [src: brief — built in Squamish; src/squamish.njk:24 — delivered directly]

No button in this first block. The mood board's whole argument is that the page earns attention before it asks for anything; the first CTA belongs one section down. **Dependency (Wim/Jen):** if the journey design wants a hero CTA anyway, use the quiet text link `See the saunas` and nothing else.

Alternates for the headline, if Lee wants to compare:
- A (recommended, above): the practice statement. It reads like a studio nameplate.
- B: **Finnish saunas, designed and built in Squamish.** Leaner, but closer to category copy; Storm could nearly run it.
- C: **We design, build, and deliver Finnish saunas from Squamish.** Same content as A with "we" leading; slightly warmer, slightly less nameplate.

### Section: Our Saunas (four offering cards)
Section heading: **Our saunas**
Intro line: **Five standard models, custom builds, and mobile units. All framed and insulated like a building, because they are one.** [src: saunas.njk:229–274 — five models; faq.json:10 — 2x4 framing, Rockwool]

Card copy:

**Standard builds**
S2 through SC. Two-person micro saunas to fourteen-person commercial rooms. [src: saunas.njk:209, :266] Fully insulated Finnish construction from $22,500. [src: saunas.njk:121, :213]
Link: `View the models →`

**Custom builds**
Designed for the property, not adapted to it. Backyard rooms, hillside sites, commercial installations. Each one starts with how you'll use it. [src: about.njk:13 — "Every sauna begins with questions: How will you use it?"]
Link: `Explore custom work →`

**Mobile builds**
Road-ready saunas on trailers. This is where the company started, and we still build them. [src: per Lee, 2026-07-28 — "as we'd first done on a trailer"]
Link: `See mobile options →`

**Try a session**
Sit in one before you decide. Our saunas run at partner locations around BC; book an hour and judge the heat yourself. [src: locations.njk:34–70 — four bookable venues]
Link: `Book a session →`
*(Booking sessions are paused during the fire ban; the booking page carries that notice. Keep the link live.)* [src: brief — booking decision row]

Note: my audit said Try a Session deserves better than fourth-card billing. It still does. **Dependency (Wim):** if the journey work reorders these, put Try a Session second. A one-hour session is the cheapest way anyone ever meets the product, and it sits at the top of a five-figure funnel. [src: saunas.njk:213 — from $22,500; session price itself: no source exists, figure removed]

### Section: construction (replaces "Built with care, built to last")
Heading: **Insulated like a house, because it is one** [src: saunas.njk:117 — "Built Like Your Home" badge]

> We frame with 2x4s, insulate with Rockwool, seal with a vapour barrier, and clad the outside in metal. [src: faq.json:10; saunas.njk:122] Inside is Western Red Cedar, locally sourced when we can get it, or Thermowood where the project calls for more stability. [src: faq.json:10; home.njk:60]
>
> That construction is why our saunas reach proper Finnish temperatures at 80 to 100°C [src: saunas.njk:124], hold heat through a Canadian winter [src: about.njk:39], and are built to last 25 years and more outdoors. [src: saunas.njk:126 — "Built to last 25+ years outdoors"]

*(Cut from this block: "still doing it twenty-five years on" — converted a durability target into an operating history [UNSOURCED — CUT]; "Most of what's sold as a sauna in this country can't say any of that" [UNSOURCED — CUT]. The comparison grid on /saunas/ makes that argument with specifics.)*

### Section: Rooted in Finnish tradition (three feature blocks)
Heading: **Rooted in Finnish tradition**

**Proper löyly.** Real steam off hot stones at 80 to 100°C. [src: saunas.njk:124] The fundamentals haven't changed in centuries and we don't change them.

**Materials that last.** Western Red Cedar, Thermowood, stainless hardware [src: home.njk:80], and Harvia, Homecraft, Kuuma, and HUUM heaters. [src: warranty.njk:59 — full list, Homecraft restored] Chosen for decades of use in all seasons. [src: home.njk:80]

**Design that serves the heat.** Bench placement and window position settled in 3D before production begins. [src: about.njk:15] Airflow, heat retention, and moisture management designed first. [src: about.njk:39]

*(Previous version's "bench heights set to the stove, ceilings kept low enough to hold the steam" described Finnish design doctrine from the research library, not a verifiable SSC practice statement [UNSOURCED — CUT]; replaced with the site's own sourced design claims.)*

### Section: process teaser (replaces the four inline steps)
The full four steps move to the restored `/process/` page [src: brief — process page decision row]. Home keeps a short hand-off:

Heading: **How a build happens**

> Four stages: a conversation, a design you approve in 3D [src: about.njk:15], a build in Squamish [src: brief], and delivery to your site. A typical build takes four to six weeks [src: faq.json:5], with payments staged so you're never ahead of the work. [src: faq.json:40 — 30/30/30/10]

Link: `See the full process →` (to `/process/`)

### Section: testimonials
Keep the section shell; Lee's review campaign will fill it [src: brief — testimonials decision row]. Until real attributed reviews arrive, run **two** of the three existing quotes; two anonymous quotes read thinner-but-honest, three read like padding. Keep the first quote as-is, since Anthony is co-owner and the brief confirms his name stays [src: brief — ownership decision row]:

1. "Great sauna, great people! Anthony and Lee provide the best authentic sauna experience in the Sea to Sky." — Client, Squamish BC [src: existing site testimonial, verbatim]
2. "Outstanding quality sauna. Great experience with them. Highly recommend." — Client, Squamish BC [src: existing site testimonial, verbatim]

Change the attribution label from "Private Client" to "Client" (reads less like a shield). Section heading: **From our clients**. **[NEEDS LEE]:** replace with attributed reviews the moment the campaign lands them.

### Section: trusted-by strip (new)
One line, set small in the utility style, above or below testimonials:

> Our saunas run at The Good Sauna (Vancouver), Gatherwell (Ambleside), the Sea Edge Hotel (Parksville), and the Brackendale Art Gallery. [src: locations.njk:34, :48, :57, :70 — all four venues verified; "daily" removed, unsourced]

These are named commercial venues operating SSC builds. [src: locations.njk — each card names the model in service] Worth more than any anonymous quote. **Dependency (Jen/Saul):** whether this renders as text or a logo strip is theirs; the copy works either way.

### Closing CTA
Heading: **Start with your space**

> Tell us about the site and how you'd use it. We'll come back with a design plan and a number. [src: contact.njk:5 — "we'll create a custom design plan"]

Primary button: `Get a Quote`
Secondary (text link, not a second button): `Compare the models`
Footer line: Or write to us directly: secretsaunacompany@gmail.com [src: brief — email only, no phone]

This standardizes the primary CTA sitewide to **Get a Quote** (currently "Get Your Quote" / "Get My Quote" / "Get in Touch" coexist). One phrase, everywhere, per my audit §5.

---

## 2. About — `src/_includes/pages/about.njk`

Full rewrite. "We" throughout [src: brief — "We = Lee and Anthony"].

### Hero
H1: **About**
Sub (replaces "Designed by Finnish Standards, Inspired by Tradition and Rooted in Science" — retired everywhere, including the footer):

> **A sauna company in Squamish, British Columbia.** [NEEDS LEE — headcount phrasing]

*(Was "A small sauna company… [src: brief]". The brief contains the word "small"
zero times; it says keep the headcount **"slightly vague."** "Small" is a claim
about the size of the business, and my own Open Item #4 already asks Lee to
confirm how vague he wants this. Citing the brief for it was the same defect the
review caught nine of — introduced while fixing the other nine. The neutral
version above ships safely; the adjective waits for his answer.)*

### Section: the story
Heading: **Where this started**

> There are saunas hidden in the woods around Squamish. Wood-fired, hand-built, passed along by word of mouth. We loved them. Then our backyard filled up with people who'd heard about them too. [src: per Lee, 2026-07-28 — "the hidden secret saunas that exist within the woods in Squamish… overrun with tourists in our own backyard"]
>
> So we built our own, on a trailer, and towed it to the riverside. [src: per Lee, 2026-07-28 — "as we'd first done on a trailer, by bringing it to the riverside"] It meant the experience we'd been chasing could go wherever we liked. [src: per Lee, 2026-07-28 — "being able to use it wherever we like"] That first mobile build is still the company in miniature: Finnish construction, done properly, put somewhere worth sitting. [src: per Lee, 2026-07-28 — "attention to the Finnish traditions for how to properly build a sauna"]
>
> Secret Sauna Company is **[NEEDS LEE: headcount phrasing — brief says names are fine but "keep it slightly vague rather than a solo-founder story"; options: "Lee and Anthony" / "a small crew" / "two builders" — Lee picks before this ships]**. The Finnish tradition here isn't a design theme; it's heritage, and building to it is a point of pride. [src: per Lee, 2026-07-28 — "a passion that reflects my cultural heritage… very proud"] We've kept the company small on purpose. In most industries you end up a single cog. Here we play every role: the first conversation, the drawings, the build, the delivery, the walkthrough. [src: per Lee, 2026-07-28 — "Often in other industries you're a single cog; here we play every role"] It means wearing a lot of hats. It also means the person who designed your sauna is the person who built it. [src: per Lee, 2026-07-28 — "It means we wear a lot of hats"]

*(Cut: "It came out better than it had any right to" — I claimed it was Lee's own cadence; it isn't in the brief's verbatim material [UNSOURCED — CUT]. Also cut: "and the person who answers when you write to us" — plausible, unverified, and reply-handling is on the [NEEDS LEE] list already.)*

### Section: How we build
Keep the existing "How We Build" copy with one tightening. Current text is good. Replace only the first paragraph's opener:

> Every sauna begins with questions. How will you use it? Who gathers there? What does the space need to feel right? We listen first, then design. [src: about.njk:13 — light edit of existing copy]
>
> Before production begins, we model your sauna in 3D so you can see exactly what the finished build will look like. Bench placement, window position, cladding: the details get settled together on screen, not argued about on site. [src: about.njk:15 — light edit of existing copy]

### Section: Materials & construction / Performance & durability
Keep both columns as written (audit verdict: specific, confident, evidence-led). One line change in "Performance & durability": replace "Our saunas work reliably in Canadian winters and through years of heavy use" with:

> Our saunas hold temperature through a Canadian winter and stand up to years of heavy use. [src: about.njk:39 — restatement of existing claim] Several are working right now at commercial venues around BC. [src: locations.njk:34–70]

*(Cut: "earn their living at commercial sites, running daily" — "daily" and the earnings framing are unsourced [UNSOURCED — CUT]; the venue claim survives at the strength the source supports.)*

### Section: Working together (bridge banner)
Replace current text with:

> The process is transparent, the timelines are honest, and you'll always know which stage your build is in. [src: faq.json:5 — "we keep you updated throughout"] The details live on the process page.

Link: `How a build happens →` (to `/process/`)

### Section: Our vision
Keep the heading and lead line, they're genuinely on-brand:

> At Secret Sauna Co. we want to give everyone the feeling of discovering their own secluded, secret sauna. [src: existing about.njk copy, verbatim]

Keep the three blocks (Genuine Finnish Experience / Minimal Environmental Impact / Form Follows Function) but rewrite the first block's body to close the loop:

**Genuine Finnish experience.** Strong löyly, proper heat [src: saunas.njk:124], construction methods that predate the wellness industry by centuries. [rhetorical framing of the traditional-method claim, src: per Lee, 2026-07-28 — "Finnish traditions for how to properly build a sauna"]

Other two blocks unchanged.

---

## 3. Process — new page, `src/process.njk` + `src/_includes/pages/process.njk`

Restore `/process/` as a real page (currently a redirect to /about/) [src: brief — process decision row]. The job is confidence: a $22,500 to $57,000+ purchase [src: saunas.njk:213, :273] from a small company needs the buyer to see exactly what happens to their money and their weeks. Facts: 4 to 6 week typical build [src: faq.json:5], 30/30/30/10 payments [src: faq.json:40]. Tax treatment: **[NEEDS LEE — see §0a item 1; Jon to confirm whether PST applies before any tax line publishes]**.

### Hero
H1: **How a build happens**
Sub: **Four stages, four to six weeks [src: faq.json:5], and you approve the design in 3D before we cut a board. [src: about.njk:15]**

### 01 — Consultation

> It starts with your space. Send us photos, a rough size, and how you picture using it, or just tell us you're not sure yet. For local projects we'll come look at the property before quoting: foundation, access, electrical. [src: src/squamish.njk:28 — "We'll come look at your property before quoting. Foundation, access, electrical -- we sort it out in person."] Site visits are included. [src: src/squamish.njk:27 — feature titled "Site Visits Included"]
>
> You leave this stage with a custom design plan and a straight answer about whether what you want is worth building. [src: contact.njk:5 — "we'll create a custom design plan"; the straight-answer clause is voice, not a factual claim]

*(Cut: "There's no charge for any of it" — source covers site visits only, not the whole stage [UNSOURCED — CUT]. Cut: "a budget range" [UNSOURCED — CUT].)*

### 02 — Design & planning

> We turn the conversation into drawings, then into a 3D model of your actual sauna. You'll see the bench placement, the window position, the cladding. We refine it together until it's right. [src: about.njk:15]
>
> When you approve the design, you get a quote. A 30% deposit confirms your build. [src: faq.json:40 — "30% deposit"; "fixed quote," "build slot," and "buys your materials" all removed, unsourced, and "fixed" contradicted the retained disclaimer]

### 03 — Construction

> Your sauna is framed, insulated, wired, and clad in Squamish, by us. [src: brief; faq.json:10] We keep you updated throughout. [src: faq.json:5]
>
> A typical build takes four to six weeks. Timelines vary by project, and if yours needs longer, we tell you at quoting, not at week five. [src: faq.json:5 — "Timelines vary depending on the project, and we keep you updated throughout"]

*(Cut: "We send progress photos" [UNSOURCED — CUT]; cut: the mid-build visit invitation — the shop closed May 2026 [src: brief] and no current visiting arrangement is on record.)*

### 04 — Delivery & support

> We deliver and place the sauna ourselves. [src: src/squamish.njk:24 — "delivered directly"; north-shore.njk — "deliver direct to your property"] We walk you through operation and care before we leave, and every sauna ships with a detailed owner's manual. [src: warranty.njk:93] Every wired sauna also ships with third-party electrical certification and full documentation. [src: faq.json:30]
>
> Then we stay reachable. The 2-5 Year Limited Warranty is honoured by the people who built the thing. [src: warranty.njk:13 — warranty name; the "people who built it" clause follows from the owner-builder structure, src: per Lee, 2026-07-28]

*(Downgraded: "coordinate the electrical hookup where needed" appears in my FAQ addition below only where the existing install claims support it; here it's trimmed to what warranty.njk and faq.json state.)*

### Section: How payment works
Heading: **Staged payments, so you're never ahead of the work** [src: faq.json:40]

> - **30%** deposit on design approval. [src: faq.json:40]
> - **30%** at the halfway point of construction. [src: faq.json:40]
> - **30%** as the build nears completion. [src: faq.json:40]
> - **10%** on delivery. [src: faq.json:40]
>
> We accept a variety of payment methods and settle the details with you at quoting. [src: faq.json:40]
> **[NEEDS LEE / JON: tax line. Do not publish any GST/PST statement until Jon confirms the tax treatment of a custom sauna build (goods vs improvement to real property). Placeholder: "Prices are quoted before tax." full stop, nothing more specific.]**

### Closing CTA
Heading: **Start the first stage**

> Tell us about your space. [the "costs nothing and commits you to nothing" line is cut — only site visits are sourced as free, see §0a item 6]

Button: `Get a Quote`

---

## 4. Saunas — `src/_includes/pages/saunas.njk`

**Restructure per Lee's decision: models first, comparison after.** [src: brief — /saunas/ order decision row] New page order: hero → Standard Builds (model grid) → Compare Models table → comparison grid (repositioned) → science stats → Commercial & Custom → Our Work gallery.

### Hero
H1: **The saunas**
Sub: **Five standard models, custom and commercial builds, and mobile units. All built in Squamish.** [src: saunas.njk model grid; brief]

### Section: Standard builds (now first)
Heading: **Standard builds**
Intro: **Every model ships with three-tier Western Red Cedar benches, full insulation, panoramic windows, and metal exterior cladding. Wood-fired or electric across the range.** [src: saunas.njk:287 — "All models include three-tier Western Red Cedar benches, full insulation, panoramic windows, and metal exterior cladding"; :241, :256 — wood-burning or electric]

Model cards (existing copy is close; tightened, register-matched):

**S2** · 2–3 Person · 7' × 5' · From $22,500 [src: saunas.njk:209–214]
> The most compact build. Full Finnish performance in a footprint that fits a small backyard. Two layouts: maximize seating, or give the upper bench more room. [src: saunas.njk:210 — existing card, tightened]

**S4** · 4–5 Person · 7' × 7' · From $29,000 [src: saunas.njk:224–229]
> The most popular residential model. Flexible bench configuration with room to find your preferred heat across all three tiers. [src: saunas.njk:224 — existing card, tightened]

**S6** · 6–7 Person · 7' × 9' · From $35,500 [src: saunas.njk:239–244]
> Room for a proper group session. Wood-burning or electric, optional front deck. Built mobile on a trailer or semi-permanent on skids. [src: saunas.njk:241 — existing card, tightened]

**S8** · 8–10 Person · 7' × 11' · From $44,000 [src: saunas.njk:254–259]
> The largest standard build. Full three-tier benching with room to move. Wood-burning or electric, with optional front deck. [src: saunas.njk:256 — existing card, tightened]

**SC** · 10–14+ Person · 7' × 12'+ · From $57,000 [src: saunas.njk:84 schema — "7' x 12'+"; **note for Ted:** the visible card at saunas.njk:269 says "12' × 7'+" — the repo contradicts itself; align both to 7' × 12'+, matching the schema and the 7'-first pattern of every other model]
> Commercial-grade throughout: epoxy flooring, reinforced benches, upgraded trim. Optional changing room and front deck. [src: saunas.njk:271 — existing card] Working now at a Vancouver brewery and a seaside hotel. [src: locations.njk:48 — SC model at Container Brewing via The Good Sauna; locations.njk:70 — SC model at Sea Edge Seaside Hotel, Parksville] Custom sizes available. [src: saunas.njk:271]

*(Corrected from "Running today at breweries, beaches, and a seaside hotel": one brewery and one hotel run SC models; the Ambleside build is a custom model, not an SC [src: locations.njk:59 — "Model: Custom Build"], so it leaves this card's claim.)*

CTA under grid: `Get a Quote`

### Section: Compare models
Keep heading **Compare models** and the generated table. Intro line unchanged.

### Section: comparison grid (repositioned as defence)
This was the page-opening argument; now it defends the models the reader has just seen. New heading and intro:

Heading: **Why we build them this way**
Intro: **If you've been comparing, you've seen barrel saunas and infrared cabins at a lower price. Here's what the difference buys.** [the "third of the price" figure is cut — competitor pricing is not sourced in this repo [UNSOURCED — CUT]]

Keep all three comparison cards exactly as written, including the badges ("Built Like Your Home" / "Common Alternative" / "Not a True Sauna"). [src: saunas.njk:113–130 and following — existing copy, verbatim] Best copy asset on the site; not a word changes. One addition below the grid, closing the loop to the warranty:

> The construction difference is also why we put a 2-5 Year Limited Warranty behind every build [src: warranty.njk:13], and why every wired sauna leaves with third-party electrical certification. [src: faq.json:30] `Read the warranty →`

### Section: science stats
Keep heading **Rooted in science** and all three cards exactly as they stand, including the third source label "— 20-year Finnish study". [src: saunas.njk:171–185 — existing copy, verbatim]

*(Withdrawn: my relabel to "Kuopio Ischaemic Heart Disease study, 20-year follow-up." The attribution is very likely correct, but I supplied no link, DOI, or document path, and Critical Rule 6 says an uncited fact is untraceable. **[NEEDS LEE / research pass]:** if we want the sharper label, someone fetches the actual citation (the JAMA Internal Medicine 2015 sauna-cardiovascular paper) and attaches the DOI to this document first. Until then the existing label ships unchanged — it makes no claim we can't back.)*

### Section: Commercial & custom
Heading unchanged. Intro rewritten:

> From wellness operators and hotel spas to event venues and rental fleets. Our SC platform is working at commercial venues around BC [src: locations.njk:48, :70 — "daily" removed], and we design custom builds where a standard footprint doesn't fit. [src: saunas.njk:271 — custom sizes; locations.njk:59 — custom build in commercial service]

Card copy (both cards) can stand as written.

### Section: Our Work gallery
Keep as is. Heading **Our work**, intro **A selection of recent builds across British Columbia.**

---

## 5. Remaining pages

### Contact — `src/_includes/pages/contact.njk`
H1: **Get a Quote** (standardized phrase)
Sub (replaces "no obligation, no pressure", which is pressure's business card):

> **Tell us about your space. We'll come back with a design plan and a number.** [src: contact.njk:5 — "we'll create a custom design plan"]

Form: keep the entire structure and all labels; it's the best microcopy on the site. Two changes:
- Submit button: keep **`Get My Quote`**. Rationale: the sitewide CTA that *leads here* is "Get a Quote"; the button that *submits* may stay first-person because it describes the reader's own action. This is the one sanctioned variant.
- Contact info block: keep Email; "Based in" value stays **Squamish, British Columbia** [src: contact.njk:107]. No phone number anywhere [src: brief — phone decision row]. **[RESOLVED 2026-07-30: reply-time answered — "within three business days, usually the next day" (per Lee 2026-07-28, doc 20 D46; doc 21 E3 closed). The thank-you page's existing post-submission line (thank-you.njk:5) is untouched and stays where it is.]**

### Warranty — `src/_includes/pages/warranty.njk`
No copy changes to the body; strongest trust page on the site. Naming fix, all instances enumerated (my previous "everywhere else is already correct" was wrong — it's correct in exactly one place):
- `warranty.njk:13` — already reads "2-5 Year Limited Warranty." Correct, no change. [src: warranty.njk:13]
- `warranty.njk:4` (meta/description) — reads "2-5 Limited Warranty." Fix to "2-5 Year Limited Warranty."
- `faq.json:30` (displayed answer) — reads "2-5 Limited Warranty." Fix.
- `faq.json:31` (schemaAnswer — **feeds Google rich results**) — reads "2-5 Limited Warranty." Fix. This one matters most; it's the version search engines republish.
Cross-links added from home and /saunas/ per above.

### Locations — `src/_includes/pages/locations.njk`
H1: **Where to sit in one**
Sub: **Our saunas run at partner locations around BC. Book a session and judge the heat yourself.** [src: locations.njk:34–70]

Reframe each venue card as *client + venue* (the unplayed card from my audit — these are businesses that chose SSC builds):
- **Brackendale Art Gallery** — Brackendale, BC. Our flagship session location. A wood-fired SSC sauna in the forest behind the gallery. *(SUPERSEDED 2026-09-02, per Lee: the phrase "with cold plunge" is struck. Cold plunge is removed from site copy sitewide; do not reinstate it from this document.)* [src: locations.njk:34–38] *(Also the address of record: 41950 Government Rd, Squamish. [src: brief — address decision row])*
- **The Good Sauna** — 1216 Franklin St, Vancouver. An SC model at Container Brewing in Strathcona. [src: locations.njk:46–50]
- **Gatherwell** — Ambleside Beach, West Vancouver. A custom SSC build on the waterfront at Ambleside Park. [src: locations.njk:57–61]
- **The Finnish Sauna Co., Sea Edge** — 209 Island Hwy W, Parksville. An SC model metres from the ocean at the Sea Edge Seaside Hotel. [src: locations.njk:68–72]

Closing line for the section: **Every one of these is an SSC build, working in public. Consider them our references.** [src: locations.njk — all four verified; "run hard" removed as an intensity claim with no source]
Remove all Aldergrove references sitewide (home card + locations meta description). [src: brief — address decision row]

### Book — `src/book.njk` + `src/_includes/pages/coming-soon.njk`
The system is live; sessions are paused for the fire ban [src: brief — booking decision row]. Replace the "offline while we rebuild" copy [src: book.njk:4 — current stale description]:

H1: **Book a session**
Sub: **Sessions are paused during the fire ban.** [src: brief]

> Our wood-fired session saunas are shut down while the fire ban is in effect, and bookings reopen when it lifts. [src: brief — "sessions are paused during the fire ban"]
>
> **[NEEDS LEE: what happens to bookings already in the system — do they resume automatically, get rescheduled, or get refunded? This is a functional claim about the booking platform; I can't verify it and won't guess. One sentence from Lee completes this block.]**
>
> Custom build inquiries aren't affected. [src: brief — the pause applies to sessions; build inquiries flow through the site]

Buttons: `Get a Quote` / `Browse the Saunas`
**[NEEDS LEE]:** confirm whether electric-heated session locations (if any) also pause during the ban, or only wood-fired. Copy above names wood-fired only, which is what the flagship runs. [src: locations.njk:36 — Brackendale is wood-fired]

### Gallery — `src/gallery.njk`
No heading copy found needing change beyond alt-text conventions (§6). If the page carries an intro, use: **Recent builds, in the places they ended up.**

### FAQ — `_data/faq.json` (edits + additions)
Edits:
- Infrared answer → *"Generally no. We build traditional Finnish saunas: hot air, real steam, and a few thousand years of track record."* [register rewrite of existing answer; the tradition claim is the site's own, src: saunas.njk comparison card]
- Warranty answer → change "2-5 Limited Warranty" to "2-5 Year Limited Warranty" in **both** `faq.json:30` and the schemaAnswer at `faq.json:31`. [src: warranty.njk:13 — canonical name]
- Payment answer → **no tax append until Jon rules on PST** (see §0a item 1). The existing answer stands as-is. [src: faq.json:40]
Additions (all factual from existing site content, no new claims):
- **Q: Can I try a sauna before buying one?** A: Yes. Our saunas run at partner locations around BC, including the Brackendale Art Gallery in Squamish. Book a session, sit in the heat for an hour, and then decide. [src: locations.njk:34–70] *(Session bookings pause during fire bans. [src: brief])*
- **Q: Who actually builds my sauna?** A: We do. Secret Sauna Company is a small operation; we play every role from the first conversation to delivery. [src: per Lee, 2026-07-28 — "here we play every role"]
- **Q: Do you install the sauna?** A: Yes. We deliver and place every build ourselves and walk you through operation and care before we leave. [src: src/squamish.njk:24 — direct delivery; warranty.njk:93 — care instructions provided at delivery]

### 404 — `src/_includes/pages/404.njk`
No changes. "This page doesn't exist, but we do" stays forever. Remove the canonical tag (SEO §7).

### Thank-you — `src/_includes/pages/thank-you.njk`
Keep structure. The existing reply-time line stays exactly where it is and as it is: *"We typically respond within one business day"* [src: thank-you.njk:5 — existing, post-submission, untouched]. It does not move anywhere pre-submission (see §0a item 13).

H1: **Message received**
> Thanks for reaching out. Your details are in front of us, not in a queue somewhere. While you wait, the process page shows what happens next.
Buttons: `How a Build Happens` (to /process/) / `Explore the Saunas`

### Privacy — `src/_includes/pages/privacy.njk`
Single factual fix: replace Square with **Helcim** as the payment processor. [src: brief — payments decision row] **Note per the critic (X2): the replacement clause is legal copy and needs Pierre or Petra review, not Ted authorship. My earlier instruction assigning the wording to Ted is withdrawn.**

### Service-area pages — preserve list + surgical fixes
These are the best-written section of the site. **Preserve verbatim:** "Close enough for site visits, far enough that we're not paying Vancouver shop rates. That keeps your quote reasonable." / "Sauna isn't a trend here anymore -- it's infrastructure." / "We design around your property's constraints, not against them." / the whole Whistler intro. [src: existing service-area pages, verbatim] Change only stale shop facts [src: brief — Progress Way shop closed May 2026]:

**squamish.njk** (most affected):
- Subtitle: ~~"Built where we live. Our workshop is right here on Progress Way."~~ → **"Built where we live."**
- Meta description: drop "Our workshop is here -- local builds, no shipping delays." → **"Handcrafted Finnish saunas built in Squamish, British Columbia, by the people who design them. Western Red Cedar construction from $22,500."** [src: faq.json:10; saunas.njk:213]
- Intro para 1: → *"Secret Sauna Company is based in Squamish. Your sauna is built here, minutes from where it'll be installed. No freight costs, no shipping damage, no waiting on a truck from across the country."* [src: brief — based in Squamish; src/squamish.njk:24 — existing no-freight claims, retained]
- Feature card "No Shipping Required": → *"Your sauna is built in Squamish and delivered directly. No cross-country freight, no crating damage, no delays."* [src: src/squamish.njk:24 — existing copy minus the workshop reference]
- Local content: → *"From residential backyard builds to commercial installations, Squamish is where our work takes shape."* Replace the shop-visit invitation with: *"Want to sit in one first? Our wood-fired sauna at the Brackendale Art Gallery is open for sessions."* (link to /locations/) [src: locations.njk:34–38; brief — flagship venue]

**sea-to-sky.njk:** "Our workshop is in Squamish, which puts us right in the middle of the corridor" → *"We're based in Squamish, right in the middle of the corridor."* / "constructed at our Squamish workshop" (×2) → *"built in Squamish"*. "we build it all from our Squamish workshop" → *"we build it all here in Squamish."* [src: brief — shop closed; the geography claims are unchanged from existing copy]

**whistler.njk:** feature card "30 Minutes from Our Workshop" → **"30 Minutes Up the Highway"**, body: *"Squamish to Whistler is a short drive. We handle delivery ourselves."* [src: src/squamish.njk:24 — direct delivery; "no third-party logistics" phrasing dropped as an absolute claim not in the source]

**north-shore.njk:** "We build in our workshop and deliver direct to your property" → *"We build in Squamish and deliver direct to your property."* [src: existing north-shore copy minus workshop]

**vancouver.njk:** "Workshop-Built Quality" card → heading **"Built Whole, Not Assembled"**, body: *"Built complete in Squamish, not assembled on-site from a kit. Proper joinery, proper finish, proper construction."* Intro "you get workshop-built quality (not a field-assembled kit)" → *"you get a sauna built whole in Squamish (not a field-assembled kit)"*. [src: existing vancouver copy, workshop reference removed]

---

## 6. Microcopy

### Contact form (`contact.njk`)
Keep every existing label; they're right. Additions:
- `phone` helper text (under the optional field): *Only if you'd rather talk than type. We won't cold-call you.*
- `message` placeholder stays: "E.g., backyard size, specific features, questions you have..."
- **Error state, inline per field:** name: *We need a name to address you by.* / email: *This one's required, so we know where to send the reply.*
- **Submit failure (network/Formspree error):** *That didn't go through. Try once more, or email us directly at secretsaunacompany@gmail.com.*
- **Success:** handled by the thank-you redirect (copy in §5).

### Configurator modal (`_includes/modals/sauna.njk`)
The modal is being rebuilt to submit directly [src: brief — configurator decision row]. The button promises exactly what it does:
- Button (replaces "Request Quote for This Configuration"): **`Send This Configuration`**
- Helper line under the button: *Goes straight to us with your model, options, and total. We'll reply with a formal quote within three business days, usually the next day.* **[RESOLVED 2026-07-30: reply-time per Lee 2026-07-28, doc 21 E3 closed.]**
- Keep the honest disclaimer: *Final pricing is confirmed after consultation. Custom requests welcome.* [src: existing modal copy]
- Direct submission needs identity fields. Labels: **Name** / **Email**, plus one optional: **Anything about your site we should know? (optional)**
- Running total label: **Your configuration**, with the sum captioned *Estimated total, before tax*. **[NEEDS LEE / JON: no GST/PST percentages here or anywhere until the tax treatment is confirmed — see §0a item 1. "Before tax" alone is safe and stays.]**
- **Success (in-modal):** *Configuration sent. We've got it, and a formal quote will follow within three business days — usually the next day.* **[RESOLVED 2026-07-30: reply-time per Lee 2026-07-28, doc 21 E3 closed.]**
- **Failure:** *That didn't send. Your configuration is still here; try again, or email us at secretsaunacompany@gmail.com.*
- Addon "none" rows keep the "—" price placeholder in the price column; it reads cleaner than "$0". *(Display glyph in a table cell, not prose; the no-em-dash rule governs copy.)*
- **Price integrity note (from the critic, core dim 8):** no configurator total ships until the Revive 9kW add-on price is reconciled with `models.json` and supplier cost. That's Ted/Lee territory, but this copy explicitly must not lend confidence to an unreconciled number.

### Booking touchpoints during the fire ban
No badges, no red text on "Book a session" links; the booking page explains. If Wim wants an inline notice, one utility-style line: *Sessions paused during the fire ban.* [src: brief]

### Empty states
- Blog (if kept linked): **Nothing here yet.** *We're building saunas faster than we're writing about them. The gallery is the better read for now.* (Audit recommendation stands: unlink until two posts exist.)
- Gallery filter with no results: *Nothing in this set yet.*

### Alt-text conventions
Pattern: **what it is + material or model if visible + place, if public.** Factual, no bolted-on keywords, no "beautiful / stunning / luxury."
- Good: "S6 sauna interior, Western Red Cedar benches" / "Wood-fired sauna at Brackendale Art Gallery, Squamish"
- Replace the likes of "Luxury Finnish sauna exterior with modern metal cladding in forest setting" with "Sauna exterior, metal cladding, forest site"
- Full-bleed atmosphere plates: short and honest ("Steam rising inside a cedar sauna"). Purely decorative backgrounds: `alt=""`.

### Footer
- Retire the tagline "Designed by Finnish Standards, Inspired by Tradition and Rooted in Science."
- Replacement footer line, one and quiet: **Finnish saunas, designed and built in Squamish, BC.** [src: brief]
- Contact: email only. No phone. [src: brief — phone decision row]

---

## 7. Meta — titles, descriptions, schema fixes

Titles aimed at 60 characters or fewer; descriptions 140 to 160.

| Page | Title | Meta description |
|---|---|---|
| Home | Secret Sauna Company \| Finnish Saunas Built in Squamish, BC | Finnish saunas designed and built in Squamish, British Columbia. Standard models from $22,500, custom and commercial builds, and sessions you can book before you buy. [src: saunas.njk:213; locations.njk] |
| Saunas | Sauna Models & Custom Builds \| Secret Sauna Company | Five standard Finnish sauna models from $22,500 to $57,000, plus custom and commercial builds. Fully insulated, Western Red Cedar, wood-fired or electric. [src: saunas.njk:213–273, :287] |
| About | About \| Secret Sauna Company, Squamish BC | A sauna company in Squamish. Born from the hidden saunas in the local woods and a first build on a trailer. Finnish tradition, built properly. [src: per Lee, 2026-07-28 — origin story only; "small" removed pending the headcount answer, see §hero note] |
| Process | How a Build Happens \| Secret Sauna Company | Four stages from conversation to delivery. 3D design approval, a four-to-six-week build in Squamish, staged 30/30/30/10 payments, and support after delivery. [src: about.njk:15; faq.json:5, :40] |
| Contact | Get a Quote \| Secret Sauna Company | Tell us about your space and how you'd use it. We'll come back with a design plan and a number. [src: contact.njk:5 — reply-time clause removed pending Lee] |
| Warranty | 2-5 Year Limited Warranty \| Secret Sauna Company | Two years on workmanship, five on structure, third-party electrical certification on every wired build. What's covered, what isn't, and how claims work. [src: faq.json:30; warranty.njk:13] |
| Locations | Where to Sit in One \| Secret Sauna Company | SSC saunas run at partner venues around BC: Brackendale Art Gallery, The Good Sauna, Gatherwell at Ambleside, and the Sea Edge Hotel in Parksville. [src: locations.njk:34–70] |
| Book | Book a Sauna Session \| Secret Sauna Company | Sessions are paused during the current fire ban and reopen when it lifts. Custom build inquiries are unaffected. [src: brief] |
| Gallery | Our Work \| Secret Sauna Company | Recent sauna builds across British Columbia: residential, commercial, and mobile. |
| FAQ | Frequently Asked Questions \| Secret Sauna Company | Build timelines, materials, foundations, wood-fired vs electric, payment structure, warranty, and delivery. Straight answers. [src: faq.json — topics enumerated match the file] |
| Privacy | Privacy Policy \| Secret Sauna Company | Keep functional; update processor to Helcim. [src: brief] |
| 404 | Page Not Found \| Secret Sauna Company | None needed; remove the canonical. |
| Squamish | Sauna Builder in Squamish, BC \| Secret Sauna Company | Replacement written in §5. |
| Whistler / Vancouver / North Shore / Sea-to-Sky | Keep current titles | Keep current descriptions; they carry no workshop claims. |

Homepage gains a page-level description (it currently falls back to the head.njk default).

### Schema fixes (restated for Ted, from audit §6 + brief overrides)
1. `head.njk` LocalBusiness: remove `streetAddress: 38918 Progress Way`, `openingHours`, and the Progress Way `hasMap` link. [src: brief — shop closed May 2026] Replace the address with Brackendale Art Gallery (41950 Government Rd, Squamish) **or** drop street-level address entirely. **[NEEDS LEE: which — anchoring the business schema to a venue he doesn't own has tradeoffs.]**
2. `telephone`: remove the empty field entirely; no phone on the site. [src: brief]
3. Lee's `jobTitle` "Co-Owner & Builder" **stays** — my audit said change it; the brief overrules (Anthony remains co-owner). [src: brief — ownership decision row]
4. Remove `SearchAction` schema; no site search exists.
5. Align `sameAs` Facebook URL with the footer's actual profile URL.
6. Drop `aggregateRating` until the review campaign produces a real corpus; keep individual `review` markup only for quotes shown on-page. [src: brief — testimonials decision row]
7. 404: remove canonical-to-homepage.
8. Sitemap: drop `weekly` changefreq on the empty blog; `monthly` on home.
9. Product schema on /saunas/: prices accurate as-is ($22,500 / $29,000 / $35,500 / $44,000 / $57,000) [src: saunas.njk:20, offers blocks]; **but fix the SC dimension contradiction** (schema :84 vs card :269, see §4).

---

## 8. Voice reference — for whoever writes SSC copy next

### The register in one sentence
State practice as fact; let the plainness carry the confidence.

### Rules, with before/after drawn from this rewrite

**1. Say what only SSC can say.** If the sentence would run unedited on a competitor's site, it isn't finished.
- Before: "Authentic Finnish Saunas, Handcrafted in British Columbia"
- After: "Secret Sauna Company designs and builds Finnish saunas in Squamish, British Columbia. Every build is ours from the first conversation to the day it arrives."

**2. Evidence, not declaration.** Never announce a virtue; show the spec that proves it.
- Before: "Built with care, built to last"
- After: "We frame with 2x4s, insulate with Rockwool, seal with a vapour barrier, and clad the outside in metal."

**3. No spa-brochure abstraction.** Three abstract nouns in a row is the tell.
- Before: "Escape to the restorative heat of a real cedar sauna"
- After: "Real steam off hot stones at 80 to 100°C."

**4. The story is specific or it's nothing.** Name the place, the annoyance, the trade-off.
- Before: "our aspiration was to recreate those exceptional, nature-immersed moments"
- After: "Then our backyard filled up with people who'd heard about them too. So we built our own, on a trailer, and towed it to the riverside."

**5. Never say "no pressure."** Low pressure is demonstrated by respecting the reader's time, not claimed.
- Before: "no obligation, no pressure"
- After: "Tell us about your space. We'll come back with a design plan and a number."

**6. Buttons promise exactly what they do.**
- Before: "Request Quote for This Configuration" (which historically delivered nothing)
- After: "Send This Configuration," with "Goes straight to us with your model, options, and total."

**7. Best foot forward, then defend it.** Lead with the thing itself; comparison and science follow as supporting evidence.
- Before: /saunas/ opened with "Why Traditional Finnish Saunas?" before showing a single model.
- After: models first; the comparison grid follows under "Why we build them this way."

**8. Retire slogans; keep sentences.** Anything in Title Case with symmetrical clauses is dead on arrival.
- Before: "Designed by Finnish Standards, Inspired by Tradition and Rooted in Science"
- After: "Finnish saunas, designed and built in Squamish, BC."

**9. House mechanics.** No em dashes in page copy. No exclamation marks. No superlatives. Contractions always. Numbers do the persuading: 80 to 100°C, R-13+, four to six weeks, 30/30/30/10, 2 and 5 years.

**10. When a fact is missing, flag it; never fill it. And when a fact is stated, source it.** Every [NEEDS LEE] and every [src:] in this document is those two rules working. A claim without a path back to its evidence does not ship, however good it sounds. This rewrite exists because I broke that rule nine times; the annotations are the fix and the discipline going forward.

### The one test
Read it aloud. If it sounds like a person who builds saunas describing what they do, it passes. If it sounds like a website, start over.

---

## Open items for Lee (consolidated)
1. **Tax treatment** — does PST apply to a custom sauna build (goods vs improvement to real property)? Jon to rule. No GST/PST figure publishes anywhere until then. Blocks: process payment section, FAQ payment answer, configurator caption. "Before tax" alone is the safe interim.
2. **Reply-time promise** — Lee supplies "within X business days" or nothing ships pre-submission. Blocks: contact info block, configurator helper + success copy, Contact meta description. Thank-you page keeps its existing line regardless.
3. **Booked sessions during the fire ban** — do existing bookings resume automatically, get rescheduled, or get refunded? One sentence completes the Book page.
4. **Fire ban scope** — do all session locations pause, or only wood-fired ones?
5. **Headcount phrasing** — "Lee and Anthony," "a small crew," or "two builders"? The brief says slightly vague; Lee picks the level.
6. **Testimonials** — awaiting the review campaign; interim reduced to two quotes, "Client" attribution.
7. **Schema street address** — Brackendale Art Gallery, or no street address at all?
8. **Blog** — unlink until two posts exist (recommended), or keep the empty state from §6?
9. **Kuopio study label** — sharper attribution available once someone attaches the real citation (DOI or link). Existing label ships unchanged until then.
10. **Note superseded from my audit:** the existing testimonial naming Anthony stays (he's co-owner), and `jobTitle: Co-Owner & Builder` stays. My audit said otherwise; the brief corrects me and this document follows the brief.
