# Viability Assessment: Critical Business Review

**Date:** 2026-02-18
**Stage:** Post-Exploration (Stage 1 Review)
**Verdict:** Marginal — conceptually viable but plan has significant gaps

---

## Executive Summary

The Stage 1 exploration identifies reasonable business models but lacks the quantitative rigor needed to commit resources. The scoring system biases toward "easy to build" over "likely to generate revenue." No market validation, financial modeling, or competitive analysis has been performed. The recommended direction (Niche Directory) carries the highest execution risk of the viable options.

---

## Critical Findings

### 1. Scoring System Bias

The six evaluation criteria are weighted equally, which inflates scores for ideas that are simple to build but difficult to monetize:

- **AI buildability** and **build speed** together account for 2/6 of the score but have zero correlation with revenue generation
- **Revenue potential** — the only metric that matters for an income project — is a single dimension out of six
- A project scoring 5/5 on revenue and 2/5 on everything else is worth more than one scoring 5/5 on everything except revenue

**Recommendation:** Re-weight scoring. Revenue potential and SEO potential should each be weighted 2x. Build speed and AI buildability should be 0.5x — they're enablers, not success factors.

### 2. No Market Validation

Ten niche ideas are listed for the directory but none have been evaluated. Missing:

- Keyword search volume data for any niche
- Competitor analysis for existing directories in any niche
- Evidence of unmet demand (people searching and not finding what they need)
- Assessment of provider willingness to pay for premium listings

"People actively searching for providers" is listed as a niche selection criterion but never tested. This is the single most important question and it remains unanswered.

### 3. No Financial Model

For a project titled "Passive Income," there is no revenue projection. Required:

| Metric | Benchmark | Notes |
|--------|-----------|-------|
| AdSense RPM (directory) | $5-15 | Varies by niche; directories trend lower |
| AdSense RPM (tools) | $5-15 | *Updated: real 2025 publisher RPMs are far below historical $15-25 benchmarks. AdSense RPMs have crashed industry-wide. See `market-research.md` section 5.* |
| Affiliate conversion rate | 1-3% | Click-through to purchase |
| Premium listing conversion | 1-3% | Free to paid tier |
| Time to 10K monthly pageviews | 6-12 months | New domain, no backlinks |
| Time to 100K monthly pageviews | 12-24 months | Requires consistent SEO effort |

**Napkin math for directory at $10 RPM:**
- $100/month = 10,000 pageviews needed
- $500/month = 50,000 pageviews needed
- $1,000/month = 100,000 pageviews needed

A brand-new domain with zero backlinks will take 8-18 months to reach 10K monthly pageviews, assuming strong on-page SEO and consistent content additions.

### 4. Chicken-and-Egg Problem (Directory)

Listed as a "con" but is actually the existential risk:

- AI-generated listings with unverified data are low-quality; Google penalizes them
- Users who find inaccurate listings don't return
- Providers won't pay for placement on a site with no traffic
- Premium listings can't be sold until traffic is proven — which takes months of $0 revenue
- Competing against Google Business Profiles, Yelp, and niche incumbents with zero authority

This is the #1 reason directories fail. The research treats it as a footnote.

### 5. "Passive" Income Is Misleading

A directory requires ongoing:
- Curation: removing dead links, updating information
- Moderation: handling listing disputes, spam submissions
- Content updates: Google demotes stale content
- "Claim your listing" support: manual verification process
- SEO maintenance: link building, content refreshes

The maintenance score of 4/5 is generous. Realistic: 2-3/5.

### 6. No Competitive Moat

A directory on standard tech (Next.js + Supabase) on free hosting has zero defensibility. Moats in directories require:
- Brand recognition (takes years)
- Network effects (requires critical mass)
- Proprietary data (requires original research or partnerships)
- Community (requires active engagement)

None of these are planned or accounted for.

### 7. Hybrid Approach Dilutes Focus

"Start with a directory but include 2-3 free tools" splits effort between two different product types with different user intents, SEO strategies, and monetization mechanics. For a zero-budget project, concentrated focus is the primary advantage.

---

## Alternative Recommendation: Free Tools Site

Given the constraints ($0 budget, AI-built, passive), the Free Tools Site (Option 2) is the stronger choice:

| Factor | Directory | Tools Site |
|--------|-----------|------------|
| Cold start problem | Severe | None |
| Content quality risk | High (AI listings may be penalized) | Low (tools are functional) |
| Time to first revenue | 6-12+ months | 3-6 months |
| Maintenance | Moderate (curation required) | Low (tools don't go stale) |
| User intent | Browsing (lower ad RPM) | Task-oriented (higher RPM) |
| AI buildability | Good for scaffold, poor for content | Excellent (self-contained units) |
| Development model | All-or-nothing | Incremental (each tool = independent bet) |
| Switching cost for users | Zero | Moderate (bookmarks, habits) |

### Why Tools Win on Risk-Adjusted Basis

1. **No cold start:** A single tool provides value with zero existing users
2. **Incremental bets:** Build one tool, ship it, see if it ranks, build the next. Each tool is independent.
3. **Higher RPMs:** Task-oriented users generate higher RPMs than browsing users. Financial calculator users in particular drive $8-$40 niche RPM ceiling. *Note: real-world blended RPMs via Ezoic/Mediavine are $5-$15 after 2024-2025 AdSense declines.*
4. **No content quality risk:** Tools are functional, not content. Google doesn't penalize a working calculator.
5. **Lower maintenance:** A JSON formatter from 2024 still works in 2026. A business listing from 2024 may have a dead phone number.

---

## Required Before Proceeding to Stage 2

Regardless of which direction is chosen, these must be completed:

### Must-Have

1. **Keyword research with data** — Google Keyword Planner, Ubersuggest, or Google Trends for 20+ target queries. Include: search volume, keyword difficulty, current top results.
2. **Competitor traffic analysis** — Use SimilarWeb (free tier) or Ahrefs free tools to estimate traffic for the top 3 competitors in the chosen niche.
3. **Financial model** — Target revenue, required traffic, estimated timeline, break-even analysis.
4. **Kill criteria** — Define failure conditions. "If we don't reach X pageviews by month Y, pivot to Z."

### Should-Have

5. **Backlink strategy** — How will a new domain with DA 0 compete against established sites? What's the link acquisition plan?
6. **Content differentiation** — What specific value does this provide that existing results don't?
7. **Monetization sequencing** — What monetization comes first (ads), what comes later (premium features), and what are the traffic thresholds for each?

---

## Revised Scoring (Proposed Re-Weighting)

Revenue potential (2x), SEO potential (2x), Zero cost (1x), Build speed (0.5x), Maintenance (1x), AI buildability (0.5x):

| Option | Old Score | Revised Score | Change |
|--------|-----------|---------------|--------|
| Niche Directory | 27/30 | 31/40 | Drops to #2 |
| Free Tools Site | 27/30 | 28.5/40 | Stays at #2 tied |
| Content Site | 23/30 | 25/40 | — |
| Micro-SaaS | 18/30 | 22.5/40 | Rises (revenue weighted) |
| Templates | 20/30 | 18.5/40 | Drops (low SEO) |

Note: Even with re-weighting, scores remain close. This underscores that the scoring framework alone is insufficient — market validation data is needed to differentiate.

---

## Bottom Line

The project is **conceptually viable** — people do make money from directories and tool sites. But the current plan is at the "interesting idea" stage, not the "viable business" stage. The gap between "this could theoretically work" and "this will likely generate income" has not been bridged.

The research needs to move from qualitative (pros/cons lists) to quantitative (search volumes, competitor traffic, revenue benchmarks, timeline projections). Without that data, any build decision is based on assumptions.

**Recommended next action:** Spend Stage 2 on market validation, not feature planning. Validate before you build.
