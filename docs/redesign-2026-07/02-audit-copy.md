# SSC Website Copy & Positioning Audit
George (copywriter) — 2026-07-27
Scope: all .njk templates in `/home/leesalo/Projects/ssc-website/src/`, includes, and `_data/`. Brand reference: `content/reference/operations/ssc-brand-guidelines.md`.

---

## The verdict in one paragraph

This site is better written than most builder sites — the service-area pages have genuine voice, the CTAs are mostly specific, the warranty page is a real trust asset. But the site is selling a category, not a company. The hero, the about page, and the footer tagline could all be running on Storm Saunas' site tomorrow with zero edits. The two things that only SSC can say — **Lee is a Finnish-descent builder, and you deal with him directly** — appear nowhere in the copy. Not once. Meanwhile the site carries live references to a shop that closed in May 2026, a co-owner who is gone, and a booking system that is simultaneously "offline" and linked from the nav. Fix the stale facts first (they're liabilities), then fix the missing Big Idea (it's the growth).

**The Big Idea the site should be built on:** *The only sauna in the Sea-to-Sky built by the hands you shook.* One Finnish-blooded builder, start to finish, thirty minutes from your driveway. Storm can't say it. A kit can't say it. Right now SSC doesn't say it either.

---

## 1. Stale content — fix before anything else

These are factual liabilities, not style notes.

1. **Squamish page (`squamish.njk`) is built around the closed shop.**
   - Frontmatter subtitle: *"Our workshop is right here on Progress Way."*
   - Body: *"Our workshop is on Progress Way, which means your sauna is built minutes from where it'll be installed."*
   - Body: *"get in touch and we'll set up a shop visit."*
   Shop closed May 2026. This page invites customers to visit a workshop that doesn't exist. Highest-priority fix on the site. Reframe around "built in Squamish from partner spaces" or simply "built in Squamish" — the local claim survives the shop; the street address and shop-visit offer do not.

2. **LocalBusiness schema in `head.njk`** carries `streetAddress: 38918 Progress Way`, `openingHours: Mo-Fr 09:00-17:00`, and a `hasMap` link to the Progress Way address. Sitewide, on every page. If Google surfaces this and a customer drives there, that's a trust incident. Strip or replace address/hours/map.

3. **"Anthony" and "Co-Owner":**
   - Home testimonial + review schema: *"Anthony and Lee provide the best authentic sauna experience."* SSC is a solo-owner operation now. A testimonial naming a departed partner on the homepage undercuts the story. Swap for a testimonial that doesn't name Anthony (or trim the quote).
   - Organization schema: Lee's `jobTitle: "Co-Owner & Builder"`. Should be "Owner & Builder" — and honestly "Owner" is a business card; "Builder" is the brand.

4. **"Our Squamish workshop" phrasing recurs** on sea-to-sky ("constructed at our Squamish workshop" ×2), vancouver ("We build in Squamish" — this one's fine), whistler, blog hero ("from our Squamish workshop"), saunas page ("Handcrafted in Squamish, B.C." — fine). Keep the *Squamish-built* claim, drop the *workshop* noun where it implies a visitable facility.

5. **Booking contradiction.** `/book/` says *"Our booking system is offline while we rework it"* — but the nav "Book" link, the hero's "Or Book a Session," the home "Try a Session" card, and the BAG "Book Now" button all send people to `book.secretsaunacompany.ca`. Either the subdomain works (then fix /book/) or it doesn't (then kill the four live links). Both states existing at once guarantees someone hits a dead end. I can't verify which is true from here — needs a check.

6. **Aldergrove inconsistency.** Home card: *"Book a session at our Aldergrove location."* Locations meta description mentions Aldergrove. The locations page itself lists Brackendale Art Gallery, not Aldergrove. Pick one truth.

7. **Privacy page lists Square for payment processing.** House rule is Helcim only. If Square is genuinely gone, this is stale; verify and update.

8. **Warranty naming drift.** FAQ calls it the *"2-5 Limited Warranty"*; warranty page says *"2-5 Year Limited Warranty."* Standardize on the latter — "2-5 Limited Warranty" reads like a typo.

---

## 2. Voice and tone — page by page

### Home (`pages/home.njk`)
- **H1: "Authentic Finnish Saunas, Handcrafted in British Columbia."** This is a category label, not a headline. It's true of every builder in the province and Storm would happily run it. It summarizes; it doesn't provoke. Committee test: fail.
- **Subtitle: "Escape to the restorative heat of a real cedar sauna, built with traditional methods to last a lifetime."** "Escape to the restorative heat" is spa-brochure filler — three abstractions in a row. "Traditional methods" and "last a lifetime" are claims any brand makes; the brand guidelines themselves say *let specifics sell*.
  - Replacement direction: *"Finnish saunas, built by a Finn's grandson in Squamish. Insulated like a house, hot like Finland, delivered down the road."* Or leaner: *"Real löyly. Real cedar. Built in Squamish by the person who answers your email."* Point being: the replacement must contain something only SSC can say.
- **"Built with care, built to last" section** — the body copy here is actually good ("No shortcuts. No mass production. Just saunas built the way they should be."). The heading is a platitude sandwich. The body earns its keep; give it a heading with a spine, e.g. *"Insulated like your house, because it is one."*
- **"How we work together"** — process steps are decent, but *"We're here long after your sauna is ready"* is the kind of promise every company makes. Replace with evidence: name the warranty, name the response time.
- **Testimonials:** three quotes, all attributed *"— Private Client, Squamish BC."* Three anonymous five-star quotes read like fabrication even when real. See Trust Signals below.
- The four offering cards are solid. "Try a Session" is the best idea on the page — test-before-buy is a genuine differentiator vs. every kit seller. It deserves more than fourth-card billing.

### About (`pages/about.njk`) — the weakest page on the site
- **Hero sub / footer tagline: "Designed by Finnish Standards, Inspired by Tradition and Rooted in Science."** Title Case slogan, three symmetrical clauses, and "by Finnish Standards" is grammatically off (whose standards? Standards Finland?). This is the exact "three-point pattern" the house rules ban. It appears twice sitewide (about hero + footer). Retire it.
- **"Our Story" is written like a translated press release:** *"our aspiration was to recreate those exceptional, nature-immersed moments"* … *"Following careful study of traditional Finnish sauna design and diligent planning, we succeeded in crafting a sauna that surpassed our own expectations."* Nobody talks like this. "Diligent planning" and "surpassed our own expectations" are self-graded homework. *"Today, our aim is to extend this unique experience to you"* is a corpse of a closing line.
- **The catastrophic omission:** the About page never says who "we" is. No Lee. No name, no face, no Finnish heritage, no hands. The strongest asset SSC has — a real person of Finnish descent who personally builds every sauna and personally answers the phone — is invisible on the page whose entire job is to introduce him. Schema markup knows more about Lee than the website does.
  - Rewrite direction (first person, named): *"I'm Lee Salo. My family is Finnish; the sauna wasn't a wellness trend in my house, it was Tuesday. I started SSC because I wanted a riverside sauna and didn't have a river, so I built one on wheels. It came out better than it had any right to. I've been building them ever since — every one myself, start to finish."* That's the whole about page other builders can't write.
- The "How We Build" and "Materials & construction" sections are fine — specific, confident, evidence-led. Keep.

### Saunas (`pages/saunas.njk`) — the strongest page
- The **comparison grid (Finnish vs barrel vs infrared)** is the best copy asset on the site. Specific, opinionated, unafraid ("Not a True Sauna" as a badge — good). This answers "why not a kit" completely.
- The **science stat cards** (JAMA 40%, dementia 66%, mortality 24%) are strong. One caution: "20-year Finnish study" as a source label is vaguer than the other two; name it (it's the same Kuopio cohort — say so) or it reads like padding next to properly-cited neighbours.
- Model cards: tight, specific, priced. *"Room to find your preferred heat level across all three tiers"* is exactly the register the whole site should hit.
- What's missing: nothing here answers "why SSC vs Storm." The page beats kits and infrared, then goes silent on the direct competitor. That argument (local, direct-to-builder, test-a-session, 2-5 warranty, third-party electrical cert) exists in fragments across four pages and is assembled nowhere.

### Contact (`pages/contact.njk`)
- *"no obligation, no pressure"* — saying "no pressure" is pressure's business card. The structured form (budget, timeline, capacity) already communicates low pressure by being respectful of their time. Suggest: *"Tell us about your space. We'll come back with a design plan and a number."*
- Form itself is excellent — optional qualifiers, honest labels, "Get My Quote" button is specific. Best microcopy on the site.
- **No phone number anywhere on the site.** Schema `telephone` is an empty string; brand guidelines carry 604-245-1008. For a $22K–$57K purchase, email-only contact is a conversion leak and a trust ding. If the number is meant to be public, add it here and to schema. (Not fabricating it into the site myself — needs Lee's confirmation that it's the right, public number.)

### Service-area pages (squamish / whistler / vancouver / north-shore / sea-to-sky)
Collectively the best-written section of the site. *"Close enough for site visits, far enough that we're not paying Vancouver shop rates. That keeps your quote reasonable."* — that's a human being talking. *"Sauna isn't a trend here anymore — it's infrastructure"* — good line. *"We design around your property's constraints, not against them"* — good. Keep the register; fix only the stale shop facts (§1).

### Warranty (`pages/warranty.njk`)
Genuinely strong. Specific coverage lists, honest exclusions ("windows and glass — thermal cycling stress" is the kind of candor that sells), and the third-party electrical certification section is a differentiator presented as a differentiator. *"We build to last decades; the warranty reflects that confidence"* — good line. No changes beyond the naming drift (§1.8). **This page is underused: nothing on home or saunas links to the electrical-cert story.**

### FAQ (`_data/faq.json`)
Mostly human and useful. Two notes:
- *"traditional Finnish saunas which have a proven history over millennia"* — stiff; "which have a proven history" is filler. Try: *"Generally no. We build traditional Finnish saunas — hot air, real steam, the kind with a few thousand years of track record."*
- The rentals answer (*"you just provide the location and the guests"*) is good — but confirm rentals are still offered post-shop.

### Small pages
- 404: *"This page doesn't exist, but we do"* — genuinely good. Keep forever.
- Thank-you: fine. *"In the meantime, take a look at what we build"* — good.
- Coming-soon: fine, honest.
- Blog: empty state handled gracefully, but the blog has zero posts while claiming weekly changefreq in the sitemap. Either write two posts or unlink it.

---

## 3. Value proposition

Current implicit proposition: "authentic Finnish saunas, handcrafted, BC." That's the *category's* proposition. SSC's actual differentiators, ranked by defensibility:

1. **Direct access to the builder** — one person designs, builds, delivers, and answers warranty calls. Nowhere on the site.
2. **Finnish heritage** — Lee's descent. Nowhere on the site (only in the word "Finnish" as a style descriptor).
3. **Try before you buy** — bookable sessions at real locations. Present but buried (fourth card, locations page).
4. **Only custom builder based in the Sea-to-Sky** — implied by service-area pages, never stated as a claim.
5. **House-grade construction vs kits** — well argued on /saunas/. The one differentiator done right.
6. **2-5 warranty + third-party electrical cert** — exists, siloed on /warranty/.

Against Storm specifically (similar quality, better marketing): SSC wins on locality and the person, not on product claims. Every sentence that could describe Storm should be rewritten or cut. Against Theraluxe (30-47% pricier commercial): SSC never makes the value argument on commercial. One line on the saunas commercial section would do it: *"Commercial-grade without the resort-brand markup."*

---

## 4. Trust signals

**Present:** warranty (excellent), third-party electrical certification (excellent, buried), payment structure in FAQ (good — staged payments signal legitimacy), real commercial installations on /locations/, gallery photos, review schema.

**Weak:** all three testimonials are anonymous "Private Client, Squamish BC." One names a departed partner. AggregateRating schema of 5.0 from 3 anonymous reviews is thin enough to risk a rich-results slap and thin enough to look gamed.

**The unplayed card:** The Good Sauna, Gatherwell, Finnish Sauna Co. (Sea Edge Hotel), Brackendale Art Gallery — these are *named commercial operators who bet their businesses on SSC builds*. That's worth fifty anonymous quotes. The locations page treats them as places to visit; they should also be cited as clients: a "Trusted by" strip on the home page, and one paragraph each as mini case studies ("Container Brewing's sauna runs seven days a week — here's what we built and why it holds up").

**Missing entirely:** builder bio with a face, named-client testimonials (even first-name-plus-neighbourhood beats "Private Client"), Google Reviews link, any process/progress photography with hands in frame (the brand guidelines call process photography "SSC's strongest differentiator" — zero of it is in the copy structure).

---

## 5. CTAs

Mostly good. "Plan My Sauna Design," "Get My Quote," "Request Quote for This Configuration" are specific and honest.

- **Inconsistency:** "Get Your Quote" / "Get a Quote" / "Get in Touch" / "Contact Us" all coexist. Standardize the primary action to one phrase ("Get a Quote" or "Plan My Sauna" — pick one) and let "Contact us" be the soft secondary only.
- **Hero stacks two CTAs** (quote + booking) — the brand guidelines' own rule is one CTA per viewport. The booking CTA is the lower-commitment, higher-conversion ask for cold visitors; consider making *booking a session* the hero CTA and quote the secondary, since a $30 session is the actual top of this funnel.
- Modal note *"Final pricing confirmed after consultation. Custom requests welcome."* — good, honest microcopy.

---

## 6. SEO meta

- Titles and descriptions exist on all pages, descriptions are within length, keywords are (uselessly but harmlessly) present. Heading hierarchy is clean — one H1 per page, sensible H2/H3.
- **Homepage** relies on `site.json` default title — fine — but has no page-level meta description frontmatter (falls back to the head.njk default, which is serviceable).
- **404 canonical points at the homepage** — a soft-404/canonical confusion signal. Remove the canonical from 404.
- **SearchAction schema** declares a sitelinks search box for a site with no search. Remove.
- **sameAs mismatch:** schema says `facebook.com/secretsaunaco`; the footer links `facebook.com/profile.php?id=61556176987817`. Align.
- **Review/AggregateRating schema:** self-serving review markup on LocalBusiness is against Google's guidelines when reviews aren't from a third-party source shown on-page… they *are* shown on-page, so it's defensible, but 3 anonymous reviews is risk without reward. Consider dropping the aggregateRating until there's a real review corpus.
- LocalBusiness address/hours: see §1.2 — stale data in schema is worse than none.
- Sitemap claims `weekly` changefreq on blog/home; blog is empty. Cosmetic, but align.

---

## 7. Missing pages / content

Ranked by expected impact:

1. **Case studies (per-build project pages).** The brand guidelines already prescribe the structure (context → design intent → process → outcome). The Good Sauna and Gatherwell builds are ready-made first entries. This is simultaneously the #3 elevation priority in the brand doc, the trust fix, and the anti-Storm move. Nothing on the site currently shows *thinking*.
2. **A real "meet the builder" section** (on About, not a new page). Face, name, heritage, hands. Cheapest, highest-leverage copy change available.
3. **"Why SSC" / comparison assembly.** One page (or one home-page section) that gathers the scattered proof: builder-direct, Squamish-based, test-a-session, house-grade construction, 2-5 warranty, third-party electrical cert, named commercial clients. The parts all exist; the argument doesn't.
4. **Process page.** `/process/` currently 301s to /about/, and About's process content is three paragraphs. For a considered $30K+ purchase, a real process page (with the 30/30/30/10 payment structure, 3D renderings, timeline) reduces perceived risk. The FAQ carries half of this already.
5. **Two or three blog posts** or unlink the blog. An empty blog linked from post templates signals abandonment. Obvious first posts: "Barrel saunas: why we don't build them" (the comparison grid as longread), "What a wood-fired sauna actually costs to run," "Shou sugi ban, explained."
6. **Commercial landing page.** Commercial buyers (the Theraluxe battleground) currently share /saunas/ with backyard shoppers. Different awareness level, different objections (throughput, durability, regulations, service), different money.

---

## Priority order

**P0 — factual liabilities (this week):** Progress Way shop copy on /squamish/ + schema address/hours/map; Anthony testimonial + Co-Owner title; booking-link contradiction; Aldergrove/Brackendale mismatch; Square in privacy policy (verify).

**P1 — the Big Idea (next):** rewrite home hero H1 + subtitle around builder/heritage/locality; rewrite About "Our Story" in first person with Lee named; retire "Designed by Finnish Standards…" tagline; add "Trusted by" named-client strip.

**P2 — assembly and polish:** Why-SSC proof section; surface electrical cert + warranty on home/saunas; CTA standardization; single-CTA hero; named testimonials; drop SearchAction + 404 canonical; align Facebook URLs.

**P3 — new content:** case studies, process page, first blog posts, commercial page, phone number (pending Lee's confirmation it's public).

---

## Flags and unknowns (not guessed, per house rules)

- Booking subdomain live/dead status: unverified — needs a check before choosing which side of §1.5 to fix.
- Whether rentals and sessions continue post-shop: assumed yes from context, needs confirmation.
- Public phone number: exists in brand guidelines (604-245-1008) but I won't put it on the site without Lee confirming it's the public line.
- Square vs Helcim in privacy policy: rule says Helcim; page says Square; someone who knows the payment stack should confirm before the edit.
