# CalcRun Growth Plan — March 2026

> This replaces the original build-spec sprint roadmap (Sprints 1-7) which is fully complete.
> The site is live at www.calcrun.com with 111 pages. The challenge is no longer "build it" — it's "get people to find it and make money from it."

---

## Where We Are Today

### What's built
- 37 tools (14 financial calculators, 7 utility, 15 file converters, 1 economic)
- 57 pre-calculated scenario pages targeting long-tail searches
- 7 comparison articles with data tables and educational content
- Email capture on all financial calculators (MailerLite + MailerSend)
- PDF export, share buttons, embeddable widgets
- Dark mode, currency selector, WCAG AA accessible
- 215 unit tests + 69 E2E tests
- Deployed on Cloudflare Pages, GA4 tracking live

### What's earning money
- NordPass + NordVPN: live tracked CJ links (security tools only)
- All other financial affiliates: pending approval or unapplied

### What's not working yet
- No organic traffic (new domain, Google sandbox)
- No email subscribers (no traffic = no signups)
- No affiliate revenue from financial products (the high-value ones)
- No external backlinks beyond initial submissions
- MailerLite drip automation not configured
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

**The funnel bottleneck is traffic.** Everything else (affiliates, email, content) is ready but idle. The plan below is ordered by expected impact on traffic, then by expected impact on revenue per visitor.

---

## Phase 1: Launch Push (Week 1-2)

**Goal:** Get first 500+ real visitors. Validate that people use the calculators and some percentage opt into email.

These are all manual actions by the owner. Claude Code can prep the content, but posting requires human accounts.

### 1A. Reddit — Answer, Don't Advertise

Reddit is the fastest path to real traffic for a new site. But self-promotion posts get deleted. The strategy:

**Method:** Search each subreddit for unanswered questions that your calculators solve. Write a helpful answer with the calculation, then link to the calculator as a source.

| Subreddit | Members | Question Types to Answer | Link To |
|-----------|---------|-------------------------|---------|
| r/UKPersonalFinance | 740K | "What's my take-home on £X?", "ISA or pension?", student loan questions | UK Salary calculator, ISA comparison article |
| r/personalfinance | 18M | "Should I pay off debt or invest?", "How much house can I afford?" | Debt payoff, mortgage payment, rent vs buy |
| r/firsttimehomebuyer | 300K+ | "Monthly payment on $X mortgage?", "Rent vs buy in my city?" | Mortgage scenarios, rent vs buy |
| r/financialindependence | 2.1M | "How much do I need to retire at 55?", "What savings rate for FIRE?" | Retirement scenarios, compound interest |
| r/FIREUK | 45K | UK-specific FIRE, pension vs ISA, tax efficiency | UK salary, ISA comparison, retirement |
| r/StudentLoans | 250K+ | "How long to pay off $50K?", student loan impact on take-home | Debt payoff, salary calculators |
| r/povertyfinance | 1.2M | Emergency fund questions, debt payoff strategies | Emergency fund, debt snowball comparison |

**Cadence:** 2-3 genuine answers per week, spread across subreddits. Never more than 1 per sub per week. Build karma first if accounts are new.

**What Claude Code can prep:** Draft answers for common question types, with the right calculator link and a natural sentence introducing it. Store in `docs/launch/reddit-answers.md`.

### 1B. Product Hunt Launch

Already prepped in `docs/launch/product-hunt.md`. Key points:
- Schedule Tuesday-Thursday, 12:01 AM PT (when the day resets)
- Have 5+ supporters ready to upvote and comment in the first hour
- The maker comment is critical — be genuine, not salesy
- Follow up in comments all day

### 1C. Hacker News — Show HN

**Title:** "Show HN: Financial calculators with real-time results, no signup, no ads"

HN audience loves: minimalist tools, technical quality, privacy-first, no-BS. The Astro + React islands architecture is interesting to developers. The "client-side file processing" angle appeals to privacy-conscious HN readers.

**What Claude Code can prep:** Draft the HN post text. Store in `docs/launch/hackernews.md`.

### 1D. Dev.to Article

Already outlined in `docs/launch/devto-article.md`. This targets developers who may:
- Link to it from their blogs (backlinks)
- Use the embeddable widgets
- Share it with non-developer friends who need calculators

---

## Phase 2: Revenue Per Visitor (Week 2-4)

**Goal:** Maximize revenue from each visitor that arrives. Do this BEFORE scaling traffic — otherwise you're scaling a leaky bucket.

These are all buildable by Claude Code.

### 2A. Affiliate Sections in Comparison Articles (HIGH IMPACT)

The 7 comparison articles are the highest-intent pages on the site. Someone reading "ISA vs General Investment Account" is actively choosing where to put money. Currently, these pages have zero affiliate links.

**Add to each comparison article:**

| Article | Affiliate Section Title | Partners |
|---------|------------------------|----------|
| ISA vs General Investment | "Where to open a Stocks & Shares ISA" | InvestEngine, Nutmeg |
| 15yr vs 30yr Mortgage | "Compare mortgage rates" | LendingTree |
| Roth vs Traditional 401(k) | "Open a retirement account" | Betterment, Wealthfront |
| Snowball vs Avalanche Debt | "Consolidate at a lower rate" | SoFi |
| Renting vs Buying 2026 | "Get pre-approved for a mortgage" | LendingTree |
| Index Funds vs Active Funds | "Start investing with low fees" | Betterment, InvestEngine, Wealthfront |
| High-Yield Savings vs CDs | "Top high-yield savings accounts" | SoFi, Ally |

**Implementation:** Add `affiliatePrograms` array to comparison content schema. Render `AffiliateLinks.astro` component below educational content on comparison pages, same as tool pages.

### 2B. "Take the Next Step" on Scenario Pages (HIGH IMPACT)

57 scenario pages answer specific questions but then just say "Try it with your numbers." After the answer, add a contextual affiliate CTA:

| Scenario Type | CTA | Partners |
|---------------|-----|----------|
| Mortgage payment scenarios (8 pages) | "Compare rates from multiple lenders" | LendingTree |
| Investment/compound interest scenarios (10 pages) | "Start investing today" | Betterment, Wealthfront, InvestEngine |
| Salary scenarios (6 pages) | No affiliate — educational only | — |
| Debt payoff scenarios (4 pages) | "Consolidate your debt at a lower rate" | SoFi |
| Retirement scenarios (4 pages) | "Open a retirement account" | Betterment |
| Savings/emergency fund scenarios (5 pages) | "Earn more on your savings" | SoFi, Ally |
| Comparison-type scenarios (7 pages) | Match to relevant comparison article affiliate section | Various |

**Implementation:** Add optional `affiliatePrograms` + `affiliateContext` to scenario content schema. Render affiliate cards between the bottom CTA and the prose content.

### 2C. Inline Calculator-Result Affiliates (MEDIUM IMPACT)

After someone calculates their mortgage payment, they're ready to act. Show a contextual card IN the results panel:

- Mortgage payment calc: "Compare rates from multiple lenders" (LendingTree)
- Compound interest calc: "Open a high-yield account to start growing" (Betterment)
- Debt payoff calc: "See if you can consolidate at a lower rate" (SoFi)
- Retirement calc: "Open a retirement account" (Betterment)

**Implementation:** Add an optional `resultAffiliate` prop to calculator components that renders a small card below the main result number. Only shown after the user has interacted (not on first load — that feels pushy).

### 2D. Smart OG Images for Scenario Pages (MEDIUM IMPACT)

Currently all scenario pages use the parent tool's generic OG image. When shared on social media, "Compound Interest Calculator" tells you nothing. But an OG image showing "£10,000 invested for 20 years at 7% = £38,697" drives clicks.

**Implementation:** Extend the Satori OG generation to render `resultSummary` + 2-3 key inputs on scenario OG images. Different background color per category.

---

## Phase 3: Content Expansion (Month 1-3)

**Goal:** Expand the keyword footprint. More pages = more chances to rank for long-tail searches.

### 3A. More Comparison Articles (5-8 more)

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

### 3B. More Scenario Pages (Scale to 80-100)

Target ultra-specific searches that comparison sites don't bother with:

**Salary scenarios (UK):** Every £5K from £20K to £100K ("£35,000 salary UK take-home", "£55,000 salary UK take-home"). These have VERY specific search volume.

**Salary scenarios (US):** Every $10K from $40K to $200K. State-specific variants for CA, NY, TX, FL.

**Mortgage scenarios:** Every $50K from $150K to $750K at current rate ranges.

**Investment scenarios:** "How much will $X grow in Y years" for common amounts ($5K, $10K, $25K, $50K, $100K) and common timeframes (5, 10, 20, 30 years).

### 3C. New High-Value Calculators (2-3)

| Calculator | Search Volume Signal | Affiliate Revenue Potential | Build Effort |
|------------|---------------------|---------------------------|--------------|
| **Mortgage Affordability** ("How much house can I afford?") | Very high — one of the top 5 mortgage searches | High — LendingTree, mortgage lenders | Medium (income, debt, down payment inputs) |
| **Credit Card Payoff** (minimum payment trap calculator) | High — distinct from general debt payoff | High — balance transfer card affiliates | Low (simpler than debt payoff) |
| **Investment Fee Calculator** ("How much are fund fees costing you?") | Medium — FIRE community loves this | High — low-fee platform affiliates | Low (compound interest variant) |

### 3D. Methodology / "How We Calculate" Pages

One page per financial calculator explaining the exact formula, assumptions, data sources, and edge cases. This is a strong E-E-A-T signal for Google.

**Example:** `/how-we-calculate/compound-interest` shows:
- The formula: A = P(1 + r/n)^(nt) + PMT * [((1 + r/n)^(nt) - 1) / (r/n)]
- What each variable means
- How we handle beginning vs end-of-period contributions
- Data sources for default rates
- Limitations and assumptions

These pages also serve as link targets when other sites reference your calculations.

---

## Phase 4: Backlink Building (Month 2-6)

**Goal:** Build domain authority so Google ranks your pages higher.

### 4A. Embeddable Widget Outreach

The embed system already works (`?embed` mode). Now actively pitch it:

**Target:** Personal finance bloggers with 1K-50K monthly visitors who write about mortgages, investing, or debt payoff. They often link to external calculators already.

**Pitch:** "I noticed your article about [topic] links to [competitor calculator]. I built a free embeddable version that your readers can use directly on your page — real-time results, no ads, mobile-friendly. Here's a preview: [embed demo link]. Just copy-paste this code: [embed code]."

**What Claude Code can prep:** An outreach email template and a list of blog posts that link to competitor calculators (requires manual searching by the owner).

### 4B. Pinterest Infographics

Financial infographics on Pinterest have 3-4 month lifespans and compound over time. Create simple, shareable graphics from comparison data:

- "15-Year vs 30-Year Mortgage: Where Your Money Goes" (two stacked bars)
- "Debt Snowball vs Avalanche: The Real Difference" (comparison infographic)
- "The Power of Compound Interest" (growth curve at different ages)
- "How Much House Can You Afford?" (income-to-mortgage ratio visual)

**What Claude Code can build:** SVG infographic templates using Satori that can be batch-generated for each comparison article. Add a "Pin this" or "Share image" button on comparison pages.

### 4C. Quora Answers

Thousands of questions on Quora match your scenario pages exactly:
- "How much will $10,000 grow in 10 years?"
- "What's the monthly payment on a $300,000 mortgage?"
- "Should I use the debt snowball or avalanche method?"

**Method:** Answer the question directly (don't just link), then add "I ran the full calculation here: [scenario page link]" as a source.

### 4D. Finance Forum Participation

Beyond Reddit, participate in:
- MoneySavingExpert Forum (UK — very active, 2M+ members)
- Bogleheads Forum (US — investing community, loves calculators)
- Mr Money Mustache Forum (FIRE community)

Same approach as Reddit: answer questions, link to relevant calculators/scenarios as sources.

---

## Phase 5: Conversion Optimization (Month 3-6)

**Goal:** Once traffic exists, optimize what happens when people arrive.

### 5A. MailerLite Drip Automation (OWNER ACTION)

This is the single highest-ROI action the owner can take. The email capture is built but the follow-up sequence isn't configured. Every "Email my results" subscriber is a warm lead getting zero follow-up.

**Sequence (already designed in build-spec.md):**
- Day 0: Results email (already sent via MailerSend)
- Day 3: Educational email related to their calculator + tip
- Day 7: Soft affiliate recommendation with comparison context

**Revenue potential:** At 5% email opt-in rate and 2% affiliate click rate on drip emails, 1,000 monthly visitors = 50 new subscribers = 1 affiliate click/month from email alone. At $75 avg commission, that's $75/month from email only — and it compounds as the list grows.

### 5B. A/B Test Affiliate Placements

Once there's enough traffic to measure (100+ daily visitors), test:
- Affiliate cards above vs below educational content
- Single featured partner vs comparison table of 3 partners
- Contextual CTA copy variations ("Compare rates" vs "Get pre-approved" vs "See your options")

### 5C. Exit-Intent or Scroll-Triggered Email Capture

Currently email capture is static on the page. Add a subtle prompt when users:
- Scroll past the calculator results (they've seen their numbers, now what?)
- Are about to leave (exit intent — cursor moves toward browser chrome)

Not a modal popup. A slide-in bar at the bottom: "Want these results in your inbox? Enter your email."

---

## Phase 6: Scale (Month 6-12)

### 6A. Seasonal Content

| Season | Content | Traffic Spike |
|--------|---------|---------------|
| Jan-April | "2026/27 Tax Season: What's Changed for Your Take-Home Pay" | Tax season searches |
| April (UK) | "New Tax Year 2026/27: Updated Rates and What They Mean" | UK tax year rollover |
| Sept | "Back to School Finances: Student Loan Repayment Explained" | Student loan searches |
| Nov-Dec | "Financial New Year Resolutions: Where to Start" | New year planning |
| Black Friday | NordPass/NordVPN promotion push | Security tool interest |

### 6B. Programmatic Salary Pages at Scale

If salary calculator pages show traction, generate pages for every £5K increment (UK) and every $10K increment (US). This could be 40-60 additional pages, each targeting a very specific search ("£42,000 salary UK take home").

### 6C. Consider Display Ads

Only after reaching 50+ daily visitors consistently. Ezoic or Mediavine (Mediavine requires 50K sessions/month — much later). Ads on file converter pages (low affiliate value anyway) could generate incremental revenue without compromising the financial calculator experience.

### 6D. New Tool Categories (Evaluate Based on Data)

If traffic data shows demand:
- **Tax bracket calculator** (US) — seasonal but high volume
- **Budget calculator** (50/30/20 rule) — high search volume, moderate affiliate fit
- **Down payment calculator** — natural mortgage funnel extension
- **Break-even calculator** — small business audience, SaaS affiliate potential

---

## Priority Matrix

| Action | Impact | Effort | Owner vs Claude | Priority |
|--------|--------|--------|-----------------|----------|
| Reddit answers (Phase 1A) | High (immediate traffic) | Low (ongoing) | Owner | P0 |
| Product Hunt launch (Phase 1B) | High (spike) | Low (one-time) | Owner | P0 |
| HN Show HN post (Phase 1C) | High (spike + backlinks) | Low | Owner | P0 |
| Affiliate sections in comparisons (Phase 2A) | High (revenue/visitor) | Low | Claude | P0 |
| Scenario page affiliate CTAs (Phase 2B) | High (revenue/visitor) | Low | Claude | P0 |
| MailerLite drip setup (Phase 5A) | High (compounds) | Low | Owner | P0 |
| Smart OG images for scenarios (Phase 2D) | Medium (social CTR) | Low | Claude | P1 |
| More comparison articles (Phase 3A) | Medium (content + affiliates) | Medium | Claude | P1 |
| More scenario pages (Phase 3B) | Medium (long-tail SEO) | Medium | Claude | P1 |
| Inline calculator-result affiliates (Phase 2C) | Medium (revenue/visitor) | Medium | Claude | P1 |
| Embeddable widget outreach (Phase 4A) | High (backlinks) | Medium | Owner | P1 |
| Dev.to article (Phase 1D) | Medium (backlinks) | Low | Owner | P1 |
| New calculators (Phase 3C) | Medium (new keywords) | High | Claude | P2 |
| Methodology pages (Phase 3D) | Medium (E-E-A-T) | Medium | Claude | P2 |
| Pinterest infographics (Phase 4B) | Low-Medium (diversification) | Medium | Claude + Owner | P2 |
| Quora answers (Phase 4C) | Low-Medium (referral) | Low (ongoing) | Owner | P2 |
| Scroll-triggered email capture (Phase 5C) | Low (marginal) | Low | Claude | P3 |
| Display ads (Phase 6C) | Low (needs traffic first) | Low | Owner | P3 |

---

## Revenue Projections (Updated)

The original build-spec projections assumed everything launches together. We're now past launch with zero revenue. Updated timeline:

| Timeline | Traffic | Revenue | Key Driver |
|----------|---------|---------|------------|
| Month 1 (now) | 50-200/mo | $0 | Reddit/PH/HN referral traffic |
| Month 2-3 | 200-800/mo | $0-$25 | First organic impressions, referral continues |
| Month 4-6 | 500-2,000/mo | $0-$100 | Organic growth, more content indexed |
| Month 7-12 | 2,000-8,000/mo | $50-$300 | SEO traction, email list building |
| Month 12-18 | 5,000-20,000/mo | $150-$750 | Established authority, drip revenue |
| Month 18-24 | 10,000-50,000/mo | $400-$2,000 | Compounding content + email + SEO |

**Year 1 total: $100-$1,000.** This is still a "planting seeds" year. Real revenue comes from compounding in year 2+.

**Break-even:** The site costs ~$10/year (domain). It will be "profitable" almost immediately in accounting terms. The real question is whether it generates meaningful passive income ($500+/month), which is a year 2 target.

---

## What NOT to Do

- **Don't add display ads yet.** They hurt Core Web Vitals, hurt user trust, and earn pennies with current traffic. Wait for 50+ daily visitors minimum.
- **Don't build more tools just to have more tools.** Each new calculator is 2-3 days of work. Only build ones with clear search demand and affiliate potential. The 37 tools we have are enough — the bottleneck is traffic, not product.
- **Don't pay for traffic.** The whole model is $0 investment. Google Ads for financial keywords cost $5-50/click — unsustainable.
- **Don't redesign the site.** It looks good. Stop polishing and start distributing.
- **Don't automate Reddit/social posting.** Platforms detect and ban automation. Genuine human participation only.
- **Don't expect results in month 1.** SEO is a 6-12 month game. The Reddit/PH/HN push is to validate the product and get early signals, not to build sustainable traffic.

---

## Success Metrics

### Weekly (15 min)
- Google Search Console: impressions trending up?
- GA4: any traffic this week? Where from?
- MailerLite: any new subscribers?

### Monthly (1 hour)
- Total pageviews and trend
- Email list size
- Affiliate clicks (any at all = good signal)
- New pages indexed in Google
- Reddit/social referral traffic

### Quarterly (2 hours)
- Revenue vs projection
- Which pages get the most traffic? (Double down on those topics)
- Which calculators get the most use? (Add more scenarios for those)
- Email open/click rates
- Backlink count (Google Search Console > Links)

### North Star Metric
**Email list size.** It's the one asset that compounds independently of Google, represents genuine user value, and directly drives revenue. If the email list is growing, the business is working.
