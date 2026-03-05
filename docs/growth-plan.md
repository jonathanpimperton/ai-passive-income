# CalcRun Growth Plan — March 2026

> This replaces the original build-spec sprint roadmap (Sprints 1-7) which is fully complete.
> The site is live at www.calcrun.com with 111 pages. The challenge is no longer "build it" — it's "get people to find it and make money from it."

---

## Where We Are Today

### What's built
- 37 tools (14 financial calculators, 7 utility, 15 file converters, 1 economic)
- 102 scenario pages targeting long-tail searches (UK/US salary, mortgage, investment, debt)
- 15 comparison articles with data tables and educational content
- 14 methodology/"How We Calculate" pages (one per financial calculator)
- Inline affiliate cards in 8 calculator result panels (ResultAffiliate component)
- Affiliate sections on all comparison articles and relevant scenario pages
- Scroll-triggered email capture bar on all financial calculator pages
- Email capture on all financial calculators (MailerLite + MailerSend)
- Custom OG images for all scenarios and comparisons (build-time Satori generation)
- PDF export, share buttons, embeddable widgets
- Dark mode, currency selector, WCAG AA accessible
- 215 unit tests + 69 E2E tests
- 178 pages total, deployed on Cloudflare Pages, GA4 tracking live

### What's earning money
- NordPass + NordVPN: live tracked CJ links (security tools only)
- All other financial affiliates: pending approval or unapplied

### What's not working yet
- No organic traffic (new domain, Google sandbox)
- No email subscribers (no traffic = no signups)
- No affiliate revenue from financial products (the high-value ones)
- No external backlinks beyond initial submissions
- MailerLite drip automation not configured (setup guide ready at docs/mailerlite-drip-setup.md)
- No outreach or content marketing has happened

### Honest assessment
The site is technically excellent but commercially dormant. It's a restaurant with great food and zero customers. Everything from here is about getting people through the door.

---

## The Revenue Model (How This Actually Makes Money)

```
Traffic Source          -->  Calculator Page  -->  Revenue Event
                             (the product)
Google organic search  \                     -->  On-page affiliate click ($50-500/conversion)
Reddit/social referral  }--> Use calculator  -->  "Email my results" --> Drip --> Affiliate click
Direct/bookmarks       /     Read content    -->  Embeddable widget --> Backlink --> More traffic
Pinterest              /                     -->  Return visit --> Different calculator --> Affiliate
```

**The funnel bottleneck is traffic.** Everything else (affiliates, email, content) is ready but idle.

---

# PART A: Claude Code Action Plan

Everything below can be built autonomously by Claude Code. Ordered by priority.

---

## Sprint 23 — Monetization: Affiliate Placement Expansion (P0) — COMPLETE

**Goal:** Every high-intent page should have a natural path to affiliate revenue. Currently, comparison articles (7 pages) and scenario pages (57 pages) have zero affiliate links. That's 64 pages of high-intent content with no revenue path.

### 23A. Affiliate Sections in Comparison Articles

The 7 comparison articles are the highest-intent pages on the site. Someone reading "ISA vs General Investment Account" is actively choosing where to put money.

**What to build:** Add `affiliatePrograms` and `affiliateContext` fields to the comparison content collection schema. Update each comparison markdown file with relevant partners. Render the existing `AffiliateLinks.astro` component on comparison pages between the educational content and the bottom CTA.

| Article | Affiliate Section Title | Partners |
|---------|------------------------|----------|
| ISA vs General Investment | "Where to open a Stocks & Shares ISA" | InvestEngine, Nutmeg |
| 15yr vs 30yr Mortgage | "Compare mortgage rates" | LendingTree |
| Roth vs Traditional 401(k) | "Open a retirement account" | Betterment, Wealthfront |
| Snowball vs Avalanche Debt | "Consolidate at a lower rate" | SoFi |
| Renting vs Buying 2026 | "Get pre-approved for a mortgage" | LendingTree |
| Index Funds vs Active Funds | "Start investing with low fees" | Betterment, InvestEngine, Wealthfront |
| High-Yield Savings vs CDs | "Top high-yield savings accounts" | SoFi, Ally |

### 23B. "Take the Next Step" on Scenario Pages

57 scenario pages answer specific questions but then just say "Try it with your numbers." After the answer, add a contextual affiliate CTA.

**What to build:** Add optional `affiliatePrograms` + `affiliateContext` to scenario content schema. Render affiliate cards between the bottom CTA and the prose content on `[scenario].astro`.

| Scenario Type | CTA | Partners |
|---------------|-----|----------|
| Mortgage payment scenarios (8 pages) | "Compare rates from multiple lenders" | LendingTree |
| Investment/compound interest scenarios (10 pages) | "Start investing today" | Betterment, Wealthfront, InvestEngine |
| Salary scenarios (6 pages) | No affiliate — educational only | — |
| Debt payoff scenarios (4 pages) | "Consolidate your debt at a lower rate" | SoFi |
| Retirement scenarios (4 pages) | "Open a retirement account" | Betterment |
| Savings/emergency fund scenarios (5 pages) | "Earn more on your savings" | SoFi, Ally |
| Comparison-type scenarios (7 pages) | Match to relevant comparison article affiliate section | Various |

### 23C. Inline Calculator-Result Affiliates

After someone calculates their mortgage payment, they're ready to act. Show a contextual card IN the results panel.

**What to build:** Add an optional `resultAffiliate` configuration to relevant calculator components. Render a small affiliate card below the main result number. Only shown after the user has interacted with the calculator (not on first load — that feels pushy).

| Calculator | Card Text | Partner |
|------------|-----------|---------|
| Mortgage Payment | "Compare rates from multiple lenders" | LendingTree |
| Compound Interest | "Open a high-yield account to start growing" | Betterment |
| Debt Payoff | "See if you can consolidate at a lower rate" | SoFi |
| Retirement Savings | "Open a retirement account" | Betterment |
| Investment Return | "Start investing with low fees" | Betterment, InvestEngine |
| Savings Goal | "Earn more on your savings" | SoFi, Ally |
| Loan Amortization | "Compare loan rates" | LendingTree, SoFi |
| Rent vs Buy | "Get pre-approved for a mortgage" | LendingTree |

---

## Sprint 24 — Content: More Comparison Articles (P1) — COMPLETE

**Goal:** Expand the comparison article library from 7 to 15. Each targets a commercial-intent search query and includes an affiliate section.

| Article | Search Intent | Affiliate Fit |
|---------|--------------|---------------|
| Pay Off Debt vs Invest | Commercial | Betterment, SoFi |
| Fixed vs Variable Rate Mortgage | Commercial | LendingTree |
| Lump Sum vs Dollar-Cost Averaging | Informational | Betterment, InvestEngine |
| LISA vs Regular ISA (UK) | Commercial | Nutmeg, InvestEngine |
| Pension vs ISA (UK) | Informational | Nutmeg |
| Cash ISA vs Savings Account (UK) | Commercial | — |
| Emergency Fund: Savings Account vs Money Market | Informational | SoFi, Ally |
| Roth IRA vs Roth 401(k) | Informational | Betterment |

Same content collection schema, same page template. Each gets 500-800 words + comparison table + verdict + affiliate section.

---

## Sprint 25 — Content: Scale Scenario Pages to 100+ (P1) — COMPLETE

**Goal:** Target ultra-specific long-tail searches that big sites don't bother with.

### 25A. UK Salary Scenarios
Every £5K from £20K to £100K: "£25,000 salary UK take-home", "£35,000 salary UK take-home", etc. ~17 new pages. Calculate using `uk-rates.ts` values for accuracy.

### 25B. US Salary Scenarios
Every $10K from $40K to $200K: "$50,000 salary take-home", "$80,000 salary after taxes", etc. ~17 new pages.

### 25C. Mortgage Amount Scenarios
Every $50K from $150K to $750K at 6-6.5% rate: "$250,000 mortgage monthly payment", "$450,000 mortgage payment", etc. ~13 new pages.

### 25D. Investment Growth Scenarios
Common amounts ($5K, $10K, $25K, $50K, $100K) at common timeframes (5, 10, 20, 30 years) at 7% return. ~10-15 new pages.

---

## Sprint 26 — SEO & Trust: Smart OG Images + Methodology Pages (P1-P2) — COMPLETE

### 26A. Smart OG Images for Scenario Pages — DONE

Custom OG images for all scenario pages showing resultSummary as large text, title, and input pills. Category-colored backgrounds. Comparison articles also get custom OG images with verdict snippet.

Tool OG images updated: removed "Free · No signup · No ads" tagline, replaced with "calcrun.com".

### 26B. Methodology / "How We Calculate" Pages — DONE

14 methodology pages built at `/how-we-calculate/[tool]`. Content collection with Zod schema (formula, variables, assumptions, limitations, dataSources). Dynamic route with 3-column layout, monospace formula card, variable pills, prose content, sidebar with CTA + data sources. All 14 files QA-verified (valid slugs, real formulas, authoritative sources, no AI-slop).

---

## Sprint 27 — New High-Value Calculators (P2)

Only build these if earlier sprints show traction (traffic or email signups). Each targets a high-search-volume keyword with clear affiliate fit.

| Calculator | Why | Affiliate Fit | Build Effort |
|------------|-----|---------------|--------------|
| **Mortgage Affordability** ("How much house can I afford?") | Top 5 mortgage search query | LendingTree | Medium — income, debts, down payment, rates |
| **Credit Card Payoff** (minimum payment trap) | Distinct from general debt payoff, high volume | Balance transfer card affiliates | Low — simpler than debt payoff |
| **Investment Fee Calculator** ("How much are fund fees costing you?") | FIRE community loves this, strong sharing potential | Low-fee platform affiliates (Betterment, InvestEngine) | Low — compound interest variant |

---

## Sprint 28 — MailerLite Drip Email Automation (P1) — GUIDE READY, NEEDS API IMPLEMENTATION

**Goal:** 10-email evergreen drip sequence for all subscribers. Setup guide at `docs/mailerlite-drip-setup.md` with branded HTML templates. Two paths: newsletter subscribers get welcome + full drip; results subscribers skip welcome (results email is their welcome), start at Email 2. Every email includes affiliate CTA.

### 28A. Day 3 — Educational Email

Subject line varies by calculator slug. Pure value, no affiliate links. Builds trust.

| Calculator Slug | Subject | Content Theme |
|----------------|---------|---------------|
| compound-interest | "The one number that changes everything" | How compounding frequency affects results |
| mortgage-payment | "What your lender won't tell you" | Extra payments and their impact |
| debt-payoff | "The fastest path out of debt" | Snowball vs avalanche comparison |
| investment-return | "What 1% in fees really costs you" | Fee drag on long-term returns |
| retirement-savings | "The retirement number most people get wrong" | Inflation-adjusted planning |
| savings-goal | "Why your savings target might be too low" | Emergency fund sizing |
| salary-uk | "3 things most people miss on their payslip" | Tax codes, pension, student loan |
| salary-us | "Your 401(k) is costing you (or saving you)" | Pre-tax contribution math |
| loan-amortization | "Month 1 vs Month 120: Where your money goes" | How amortization shifts over time |
| roi | "ROI without this adjustment is meaningless" | Inflation-adjusted returns |
| net-worth | "What your net worth should be at your age" | Age-based benchmarks |
| rent-vs-buy | "The hidden costs that tip the scales" | Maintenance, opportunity cost |
| emergency-fund | "3 months or 6 months? Here's how to decide" | Job stability, dependents |
| inflation | "Your money lost X% of its value since 2020" | Concrete purchasing power examples |

### 28B. Day 7 — Soft Affiliate Recommendation

Subject: "One thing that could help with [topic]." Includes 1-2 partner recommendations per calculator slug with affiliate links and FTC disclosure.

| Calculator Slug | Recommended Partners | CTA |
|----------------|---------------------|-----|
| compound-interest, investment-return, roi | Betterment, InvestEngine | "Start investing with low fees" |
| mortgage-payment, loan-amortization, rent-vs-buy | LendingTree | "Compare rates from multiple lenders" |
| debt-payoff | SoFi | "See if you can consolidate at a lower rate" |
| retirement-savings | Betterment | "Open a retirement account" |
| savings-goal, emergency-fund | SoFi | "Earn more on your savings" |
| salary-uk | InvestEngine, Nutmeg | "Start investing tax-efficiently" |
| salary-us | Betterment, Wealthfront | "Put your money to work" |
| net-worth | Betterment | "Grow your net worth faster" |
| inflation | SoFi | "Beat inflation with high-yield savings" |

### 28C. Implementation

Use MailerLite API to:
1. Create an automation workflow triggered on joining group `180838346043426395` ("Calculator Results")
2. Wait 3 days → send Day 3 email (conditional content by `calculator_slug` field)
3. Wait 4 more days → send Day 7 email (conditional content with affiliate links)

Email HTML uses the same table-based branded template as the existing results email in `worker.ts`.

---

## Sprint 29 — Engagement: Scroll-Triggered Email + Seasonal Content (P2-P3)

### 29A. Scroll-Triggered Email Capture — COMPLETE

ScrollEmailBar component built and integrated on all financial calculator pages. Fixed bottom bar appears after 60% scroll depth, dismissible, persists in localStorage. Honeypot spam protection, GA4 tracking, error display. QA-verified: division-by-zero guard, error message state, z-index conflict with back-to-calc button resolved.

### 29B. Seasonal Content Pages

| Season | Article | When to Publish |
|--------|---------|-----------------|
| Jan-April | "2026/27 Tax Season: What's Changed for Your Take-Home Pay" | January |
| April (UK) | "New Tax Year 2026/27: Updated Rates and What They Mean" | Late March |
| Sept | "Back to School Finances: Student Loan Repayment Explained" | August |
| Nov-Dec | "Financial New Year Resolutions: Where to Start" | November |

These are standalone article pages, not tools. Similar template to comparison articles but without the comparison table.

### 29C. Pinterest Infographics (Build-Time SVG)

Generate shareable SVG infographics from comparison article data using Satori at build time:
- "15-Year vs 30-Year Mortgage: Where Your Money Goes" (two stacked bars)
- "Debt Snowball vs Avalanche: The Real Difference" (side-by-side)
- "The Power of Compound Interest" (growth curves at different starting ages)

Add a "Share image" button on comparison pages that downloads the infographic.

---

## Claude Code Sprint Priority Summary

| Sprint | What | Pages Added | Priority | Status |
|--------|------|-------------|----------|--------|
| **23** | Affiliate placements on comparisons, scenarios, calculator results | 0 (enhances 100+ existing) | **P0** | **COMPLETE** |
| **24** | 8 more comparison articles | 8 | **P1** | **COMPLETE** |
| **25** | Scale scenarios to 100+ | 45 | **P1** | **COMPLETE** |
| **26** | Smart OG images + methodology pages | 14 | **P1-P2** | **COMPLETE** |
| **27** | 2-3 new calculators | 2-3 | **P2** | Gated on traffic |
| **28** | MailerLite drip automation (10-email sequence) | 0 | **P1** | Guide ready, API implementation needed |
| **29A** | Scroll email capture | 0 | **P2** | **COMPLETE** |
| **29B** | Seasonal content pages | 4 | **P3** | Gated on traffic |
| **29C** | Pinterest infographics | 0 | **P3** | Gated on traffic |

**Next Claude Code sprint:** Sprint 28 — implement MailerLite drip automation via API (setup guide at `docs/mailerlite-drip-setup.md`). Then Sprint 27 if traffic signals warrant new calculators.

---

# PART B: Human Action Plan

Everything below requires a human with real accounts. Cannot be done by Claude Code.

---

## Immediate (This Week)

### 1. Reddit — Answer Real Questions

Don't self-promote. Find unanswered questions that your calculators solve, write helpful answers, and include a calculator link as a source.

| Subreddit | Members | Question Types | Link To |
|-----------|---------|----------------|---------|
| r/UKPersonalFinance | 740K | "What's my take-home on £X?", "ISA or pension?" | UK Salary calc, ISA comparison |
| r/personalfinance | 18M | "Should I pay off debt or invest?", "How much house can I afford?" | Debt payoff, mortgage, rent vs buy |
| r/firsttimehomebuyer | 300K+ | "Monthly payment on $X mortgage?" | Mortgage scenarios |
| r/financialindependence | 2.1M | "How much to retire at 55?", "What savings rate for FIRE?" | Retirement scenarios, compound interest |
| r/FIREUK | 45K | UK FIRE, pension vs ISA, tax efficiency | UK salary, ISA comparison |
| r/StudentLoans | 250K+ | "How long to pay off $50K?" | Debt payoff calc |
| r/povertyfinance | 1.2M | Emergency fund questions, debt snowball | Emergency fund, debt comparison |

**Cadence:** 2-3 genuine answers per week. Never more than 1 per sub per week. Build karma first on new accounts.

### 2. Product Hunt Launch

**What is Product Hunt?** A website (producthunt.com) where people share new tech products. Every day, products get upvoted and the top products get thousands of visitors. Makers (that's you) post their product and engage with the community. A top-5 finish on a given day can bring 2,000-5,000 visitors in 24 hours plus lasting backlinks. It's free to post.

**How to do it:**
1. Create an account at producthunt.com
2. Click "Post" and submit CalcRun with the content from `docs/launch/product-hunt.md`
3. Schedule for Tuesday, Wednesday, or Thursday — 12:01 AM Pacific Time (that's when the daily cycle resets and you get maximum exposure time)
4. Tell anyone who'd support you to visit the page and upvote + leave a comment in the first hour (momentum matters)
5. Be active in the comments section all day — answer questions genuinely, not with marketing-speak
6. The "maker comment" (your first comment on your own product) should explain why you built it — "I was frustrated that every calculator online was covered in ads and required signups, so I built something better" is the right tone

### 3. Hacker News — Show HN

**What is Hacker News (HN)?** A tech news aggregator at news.ycombinator.com run by Y Combinator. "Show HN" is a format where makers share something they built. The audience is developers, engineers, and tech founders. A front-page Show HN gets 10,000-50,000 visitors. It's free — you just post a link with a title.

**How to do it:**
1. Create an account at news.ycombinator.com
2. Click "submit" at the top
3. Title: "Show HN: Financial calculators with real-time results, no signup, no ads"
4. URL: https://www.calcrun.com
5. In the text box (optional), write 2-3 sentences about the tech stack — HN loves technical details. Mention: Astro + React islands, zero JS by default, all file processing runs client-side (nothing uploaded), Cloudflare Pages hosting, built entirely by AI.
6. Post at around 8-10 AM US Eastern time (peak HN traffic)
7. Monitor the comments page — respond to every comment, especially technical questions about the stack, design decisions, or how it compares to competitors. Be honest about what's good and what's not — HN rewards authenticity and punishes marketing-speak.

**Important HN culture notes:** Don't ask people to upvote (against the rules). Don't use corporate language. Be direct and technical. If someone criticizes something, agree and say how you'd improve it — that earns respect.

---

## Short-Term (Month 1-2)

### 4. Dev.to Article

Outline is in `docs/launch/devto-article.md`. "How I Built a Financial Calculator Site with Astro and React Islands." Gets developer backlinks and embed widget users.

### 5. Affiliate Account Follow-Ups

| Action | Where |
|--------|-------|
| Check CJ Affiliate for LendingTree, Barclays, Experian, Axos, BMO decisions | cj.com dashboard |
| Check Awin approval status; if approved, apply to Nutmeg (advertiser 15889) | awin.com dashboard |
| Check Pro Affiliate Partner for Betterment approval | proaffiliatepartner.com |
| Apply to InvestEngine directly | investengine.com/affiliate |
| Try Wealthfront via Impact.com direct signup or partnerships contact | Impact.com or wealthfront.com |
| Try SoFi via Impact.com direct signup | Impact.com |

**As each partner approves:** Tell Claude Code to update `affiliate-data.ts` with the tracked URL and set `tracked: true`.

### 6. Cloudflare Configuration

| Action | Where |
|--------|-------|
| Add redirect rule: `calcrun.com/*` → `https://www.calcrun.com/$1` | Cloudflare dashboard > Rules > Redirect Rules |
| Create Turnstile secret key, add `TURNSTILE_SECRET_KEY` to Pages env vars | Cloudflare dashboard > Turnstile |
| Set WAF rate limit: `/api/email-results` POST, 5 requests/min/IP | Cloudflare dashboard > Security > WAF |

---

## Medium-Term (Month 2-6)

### 7. Embeddable Widget Outreach

The embed system works (`?embed` mode). Actively pitch it to personal finance bloggers.

**Target:** Bloggers with 1K-50K monthly visitors who write about mortgages, investing, or debt payoff and already link to competitor calculators.

**Pitch:** "I noticed your article about [topic] links to [competitor]. I built a free embeddable version your readers can use directly on your page — real-time results, no ads, mobile-friendly. Here's a preview: [link]. Just copy this code: [embed code]."

**How to find targets:** Search Google for `"compound interest calculator" inurl:blog` or `"mortgage calculator" site:wordpress.com`. Look for blogs linking to Calculator.net or Bankrate calculators.

### 8. Quora Answers

Answer financial calculation questions on Quora. Write the answer directly, then link to the scenario page as a source.

Target questions like:
- "How much will $10,000 grow in 10 years?"
- "What's the monthly payment on a $300,000 mortgage?"
- "Should I use the debt snowball or avalanche method?"

### 9. Finance Forum Participation

| Forum | Audience | Approach |
|-------|----------|----------|
| MoneySavingExpert Forum | UK personal finance, 2M+ members | Answer tax/salary/ISA questions |
| Bogleheads Forum | US investing community | Answer index fund/retirement questions |
| Mr Money Mustache Forum | FIRE community | Answer savings rate/compound interest questions |

Same approach as Reddit: answer questions, cite calculators/scenarios as sources.

### 10. Pinterest

Create a Pinterest business account. Pin infographics from comparison articles (Claude Code can generate these as build-time SVGs). Financial pins have 3-4 month lifespans and compound.

---

## Long-Term (Month 6+)

### 11. Google Search Console Monitoring

**Weekly:** Check impressions, clicks, top queries, and indexing status. Look for:
- New queries appearing (expand content around them)
- Queries where you rank position 5-20 (optimize those pages)
- Pages not indexed (investigate and fix)

### 12. Consider Display Ads

Only after 50+ daily visitors consistently. Ezoic is the easiest to start. Put ads on file converter pages only (low affiliate value) — keep financial calculator pages clean.

### 13. Seasonal Content Timing

| When | Action |
|------|--------|
| January | Publish tax season content (ask Claude Code to build it in December) |
| Late March | Publish UK new tax year content (ask Claude Code to update rates + build article) |
| August | Publish student loan content for back-to-school |
| November | Push NordPass/NordVPN Black Friday promotions |

---

## Human Action Priority Summary

| Priority | Action | Time Required | When |
|----------|--------|---------------|------|
| **P0** | Reddit: answer 2-3 questions | 30 min/week ongoing | This week |
| **P0** | Product Hunt launch (see section 2 for how) | 1 day | This week |
| **P0** | Hacker News Show HN (see section 3 for how) | 30 min + monitor comments | This week |
| **P0** | Provide MailerLite API key to Claude Code | 5 min | This week |
| **P1** | Affiliate account follow-ups | 1 hour | This week |
| **P1** | Cloudflare redirect + Turnstile + WAF | 30 min | This week |
| **P1** | Dev.to article | 2-3 hours | Month 1 |
| **P1** | Widget outreach (5-10 bloggers) | 2-3 hours | Month 1-2 |
| **P2** | Quora answers (ongoing) | 20 min/week | Month 1+ |
| **P2** | Finance forum participation | 30 min/week | Month 2+ |
| **P2** | Pinterest account + pinning | 1 hour setup, 15 min/week | Month 2+ |
| **P3** | Display ads evaluation | 1 hour | Month 6+ |

---

# Revenue Projections

| Timeline | Traffic | Revenue | Key Driver |
|----------|---------|---------|------------|
| Month 1 (now) | 50-200/mo | $0 | Reddit/PH/HN referral traffic |
| Month 2-3 | 200-800/mo | $0-$25 | First organic impressions, referral continues |
| Month 4-6 | 500-2,000/mo | $0-$100 | Organic growth, more content indexed |
| Month 7-12 | 2,000-8,000/mo | $50-$300 | SEO traction, email list building |
| Month 12-18 | 5,000-20,000/mo | $150-$750 | Established authority, drip revenue |
| Month 18-24 | 10,000-50,000/mo | $400-$2,000 | Compounding content + email + SEO |

**Year 1 total: $100-$1,000.** This is a "planting seeds" year. Real revenue is year 2+.

**Break-even:** The site costs ~$10/year (domain). Profitable immediately in accounting terms. Meaningful passive income ($500+/month) is a year 2 target.

---

## What NOT to Do

- **Don't add display ads yet.** Pennies with current traffic, hurts CWV and trust.
- **Don't build more tools just to have more.** 37 tools is enough — the bottleneck is traffic, not product.
- **Don't pay for traffic.** Financial keywords cost $5-50/click — unsustainable at $0 budget.
- **Don't redesign the site.** It looks good. Stop polishing, start distributing.
- **Don't automate Reddit/social posting.** Platforms detect and ban automation. Human participation only.
- **Don't expect results in month 1.** SEO takes 6-12 months. Early push is validation, not sustainable traffic.

---

## Success Metrics

### Weekly (15 min — human)
- Google Search Console: impressions trending up?
- GA4: any traffic this week? Where from?
- MailerLite: any new subscribers?

### Monthly (1 hour — human)
- Total pageviews and trend
- Email list size
- Affiliate clicks (any at all = good signal)
- New pages indexed in Google

### North Star Metric
**Email list size.** The one asset that compounds independently of Google. If it's growing, the business is working.
