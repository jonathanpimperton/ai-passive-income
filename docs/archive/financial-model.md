# Financial Model: Financial Calculator Site (Revised Feb 19)

**Date:** 2026-02-19 (revised from Feb 18)
**Stage:** Post-Stage 3 — Realistic Revenue Projections

> **Note:** The original financial model (Feb 18) projected $1,500/mo at month 12 and $8,000/mo at month 24 for a generic 75-tool site. After researching 2026 market conditions (AI Overviews, ad RPM crash, new domain sandbox), these projections were found to be 10-20x too optimistic. This revised model reflects honest expectations for a focused 15-tool financial calculator site.

---

## Assumptions

| Variable | Value | Source |
|----------|-------|--------|
| **Primary revenue** | Affiliates | Financial tools have $50-$500/conversion |
| **Secondary revenue** | Display ads (Ezoic, then Mediavine) | Added only after 50+ daily visitors |
| Ezoic EPMV (realistic for new site) | $5-$8 | Publisher case studies, not marketing claims |
| Mediavine RPM | $15-$25 | At 50K sessions/month |
| Financial affiliate conversion rate | 1-2% of clicks | Industry average |
| Email capture opt-in rate | 3-8% | "Email me my results" soft capture |
| Email → affiliate conversion | 2-5% | Drip sequence with relevant recommendations |
| Ad blocker rate | ~33% | General consumer audience |
| Geography target | US/UK/CA/AU (Tier 1) | Maximize RPM and affiliate eligibility |
| Hosting cost | $0 | Cloudflare Pages free tier |
| Email service cost | $0 | Kit (ConvertKit) free tier — 10K subscribers |
| Database cost | $0 | None needed — pure static site |
| Domain cost | $0 at launch, ~$10/year later | Launch on `calcpath.pages.dev` ($0). Buy `calcpath.com` via Cloudflare Registrar (~$10/yr) within months 1–3 before backlinks accumulate. The .pages.dev subdomain hurts affiliate program acceptance and user trust. See `design-and-branding.md` Section 1 for migration plan. |

---

## Revenue Streams (Prioritized)

### Stream 1: Affiliate Partnerships (Primary — from Day 1)

Financial calculators have the best affiliate fit of any tool category. Users are actively making money decisions when they use these tools.

**Phased program enrollment:**

| Phase | Programs | Commission | Requirement |
|-------|---------|-----------|-------------|
| Day 1 | Betterment | $25-$1,250/referral | None — accepts anyone 18+ |
| Month 2+ | LendingTree, SoFi | $50-$150/lead, $80-$150/sale | Some content + active site |
| Month 3+ | Wealthfront | $35-$55/conversion | Quality review — needs polished site |
| Month 6+ (10K visitors) | NerdWallet | Up to $100/referral | 10K monthly unique visitors required |

**Per-calculator affiliate mapping:**

| Calculator | Affiliate context | Target program |
|-----------|------------------|---------------|
| Compound interest | "Open a high-yield savings account" | Betterment, Marcus, Wealthfront |
| Loan amortization | "Compare loan rates" | LendingTree, SoFi |
| Investment return | "Start investing" | Betterment, Wealthfront |
| Retirement | "Open a retirement account" | Betterment, Vanguard |
| Debt payoff | "Consolidate your debt" | SoFi, LendingClub |
| Savings goal | "High-yield savings" | Marcus, Ally |
| Rent vs buy | "Get pre-approved" | LendingTree |

### Stream 2: Email List → Affiliate Conversions (from Month 1)

Soft email capture ("Email me a PDF of my results") on every calculator. NOT gating results — the calculator is always free.

- Kit (ConvertKit) free tier: 10K subscribers, **1 visual automation** (tag subscribers by calculator used; use conditional content blocks in a single 3-email drip)
- Expected opt-in rate: 3-8%
- Automated drip: 1 universal 3-email sequence with conditional content per calculator tag
- Email → affiliate conversion: 2-5% (higher than cold site traffic because they've already engaged with the tool)

This is the highest-leverage addition to the plan. NerdWallet's entire business model is built on this: free tool → capture user intent → monetize through recommendations.

### Stream 3: Display Ads (Secondary — Month 6+)

Don't add ads until 50+ daily visitors consistently. Ezoic's heavy ad loading hurts Core Web Vitals, which hurts SEO.

| Network | When | Expected EPMV |
|---------|------|--------------|
| Ezoic | 50+ daily visitors (~1,500/mo) | $5-$8 |
| Mediavine | 50K sessions/month | $15-$25 |

### Stream 4: Embeddable Widgets (Indirect — backlinks → traffic → revenue)

Not direct revenue, but embeddable calculators generate passive backlinks from finance bloggers. More backlinks → higher DA → more traffic → more affiliate/ad revenue.

---

## Realistic Revenue Projection

**Single scenario (honest):**

| Month | Tools Live | Monthly PV | Affiliate Revenue | Ad Revenue | Email Subs | Total |
|-------|-----------|-----------|-------------------|------------|------------|-------|
| 1-3 | 15 | 0-200 | $0 | $0 | 0-50 | **$0** |
| 4-6 | 15-20 | 200-1,000 | $0-$50 | $0 | 50-200 | **$0-$50** |
| 7-9 | 20-25 | 1,000-3,000 | $25-$100 | $0 | 200-500 | **$25-$100** |
| 10-12 | 25-30 | 3,000-8,000 | $50-$200 | $15-$50 | 500-1,000 | **$65-$250** |
| 13-18 | 30-40 | 8,000-20,000 | $100-$500 | $40-$160 | 1,000-2,500 | **$140-$660** |
| 19-24 | 40-50 | 20,000-50,000 | $200-$1,000 | $100-$400 | 2,500-5,000 | **$300-$1,400** |
| Year 3+ | 50-80 | 50,000-150,000 | $500-$3,000 | $250-$1,500 | 5,000-10,000 | **$750-$4,500** |

**Year 1 total: $0-$500.** Most of this comes in the last 3-4 months as SEO kicks in.
**Year 2 total: $2,000-$10,000.** Affiliate conversions compound as email list and traffic grow.

### Where the money actually comes from (month 12)

In the moderate case (~$150/month):
- 1-2 affiliate conversions/month at $50-$100 each = ~$100
- Display ads on ~5,000 PV at $5-8 EPMV = ~$25-$40
- Email drip affiliate conversions = ~$10-$20

At this stage, **a single good affiliate conversion is worth more than an entire month of ad revenue.** This is why affiliates-first is the right strategy.

---

## The Email List Multiplier

This is the most underappreciated revenue lever. Here's the math:

| Metric | Without email | With email |
|--------|--------------|-----------|
| Monthly visitors | 5,000 | 5,000 |
| Affiliate link clicks (2% of visitors) | 100 | 100 |
| Affiliate conversions (1% of clicks) | 1 | 1 |
| Email captures (5% of visitors) | 0 | 250 |
| Email → affiliate clicks (15% open × 5% click) | 0 | ~19 |
| Email affiliate conversions (2% of email clicks) | 0 | ~0.4 |
| **Total monthly conversions** | **1** | **1.4** |
| **At $75 avg commission** | **$75** | **$105** |

40% more revenue from the same traffic, for near-zero additional effort. Over 12 months with a growing list, this compounds significantly.

> **Note:** The "~19 email affiliate clicks" assumes an accumulated list of ~2,500 subscribers (roughly 10 months at 250 captures/month). In month 1, the impact is minimal. By month 12+, it's substantial.

---

## Break-Even Analysis

With $0 operating costs, every dollar is profit. The question is time to meaningful income:

| Target | Expected Timeline |
|--------|-----------------|
| $50/month | Month 8-12 |
| $100/month | Month 10-14 |
| $500/month | Month 18-24 |
| $1,000/month | Month 24-30 |
| $5,000/month | Year 3+ (if everything goes well) |

---

## Adaptation Triggers

$0 operating cost means we never quit — we adapt. These are signals to change approach.

| Signal | Timeline | Adaptation |
|--------|---------|-----------|
| <200 monthly PV with 15+ tools indexed | Month 8 | Audit SEO, rework keyword targets, push backlink strategy |
| <1,000 monthly PV | Month 12 | Add programmatic scenario pages, try adjacent niches, increase outreach |
| Zero affiliate conversions despite 1K+ visitors | Month 12 | Redesign CTAs, test placements, try different programs |
| Zero email signups | Month 6 | Redesign capture UX, test different value propositions |
| Traffic plateaus | Any | Expand tool count, add comparison content, push embeddable widgets |
| Google algorithm tanks rankings | Any | Lean on email list, Pinterest, Reddit. Rebuild SEO with adjusted content. |

---

## Key Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Google algorithm change | Medium | High | Email list as owned channel; Pinterest as backup traffic |
| Financial affiliate programs reject application | Medium | High | Start with Betterment (no minimums); apply to others as traffic grows |
| AI Overviews replace calculator queries | Medium | Medium | Build complex interactive tools (charts, tables, downloads) AI can't replicate |
| Ezoic hurts Core Web Vitals | Medium | Medium | Delay ads until traffic justifies the UX trade-off |
| Ad blocker adoption increases | Medium | Low | Affiliate revenue is unaffected by ad blockers |
| FTC enforcement on affiliate disclosures | Low | Very High | Add clear disclosures from day 1 ($53K per violation) |

---

## Comparison to Previous Model

| Metric | Previous Model (Feb 18) | Revised Model (Feb 19) |
|--------|------------------------|----------------------|
| Month 12 revenue | $300-$1,500/mo | **$65-$250/mo** |
| Month 24 revenue | $1,500-$8,000/mo | **$300-$1,400/mo** |
| Primary revenue stream | Display ads | **Affiliates** |
| Tools at month 6 | 50-75 | **15-20** |
| Email list | Not planned | **Core strategy** |
| Financial model basis | Theoretical RPM benchmarks | **Publisher data + affiliate program research** |
