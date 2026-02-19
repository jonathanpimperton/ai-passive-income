# Financial Model: Free Tools Site

**Date:** 2026-02-18
**Stage:** Stage 1 — Revenue Projections

---

## Assumptions

| Variable | Value | Source |
|----------|-------|--------|
| Ad network (months 0-6) | Ezoic | No traffic minimum |
| Ad network (month 6+) | Ezoic → Mediavine at 50K sessions | Industry standard |
| Ezoic RPM (blended) | $5-$10 | Publisher case studies (2-5x AdSense) |
| Mediavine RPM (blended) | $15-$25 | Publisher reports |
| Affiliate conversion rate | 1-2% | Industry average |
| Avg affiliate commission | $50-$150 | Hosting/SaaS programs |
| Traffic source | 80%+ organic search | Tool site benchmarks |
| Ad blocker rate | ~33% | General consumer audience |
| Geography target | US/UK/CA/AU (Tier 1) | Maximize RPM |
| Tool build rate | 3-5 tools/week initially | AI-built |
| Hosting cost | $0 | Cloudflare Pages free tier |
| Database cost | $0 | None needed — pure static site |
| Domain cost | $0-$12/year | Optional; can use .pages.dev |
| Ezoic revenue share | ~10% | Deducted from gross ad revenue |
| Mediavine revenue share | ~25% | Deducted from gross ad revenue |

---

## Revenue Streams

### Stream 1: Display Ads (Primary)

Ezoic from day one (skip AdSense — declining RPMs, 32% revenue cut).

### Stream 2: Affiliate Links (Secondary)

Contextual affiliate links on relevant tool pages:
- Financial calculators → banking/fintech affiliates
- SEO tools → Semrush, Ahrefs affiliates (40% recurring)
- Password/security tools → VPN affiliates
- General tools → hosting affiliates (WP Engine: up to $500/sale)

### Stream 3: Premium Features (Future — Month 12+)

Optional paid tier for power users:
- No ads
- Batch processing
- API access
- Export options
- $3-5/month or $29/year

---

**Note on ad revenue figures below:** All ad revenue projections are **net of ad network revenue share** (Ezoic ~10%, Mediavine ~25%). The RPM figures used ($5-$10 Ezoic, $15-$25 Mediavine) reflect what publishers actually receive after the network's cut.

---

## Conservative Projection (50 tools in 6 months)

Assumes: slower SEO traction, Tier 1 traffic only, Ezoic RPM of $6 (net).

| Month | Tools Live | Monthly PV | Ad Revenue | Affiliate | Total |
|-------|-----------|-----------|------------|-----------|-------|
| 1-2 | 10-20 | 0-100 | $0 | $0 | $0 |
| 3 | 25 | 200-500 | $1-$3 | $0 | ~$2 |
| 4 | 35 | 500-1,500 | $3-$9 | $0 | ~$6 |
| 5 | 45 | 1,500-3,000 | $9-$18 | $0-$25 | ~$20 |
| 6 | 50 | 3,000-5,000 | $18-$30 | $0-$50 | ~$40 |
| 9 | 60 | 8,000-15,000 | $48-$90 | $25-$100 | ~$120 |
| 12 | 75 | 20,000-40,000 | $120-$240 | $50-$200 | ~$300 |
| 18 | 100 | 50,000-100,000 | $300-$600 | $100-$500 | ~$700 |
| 24 | 120 | 100,000-200,000 | $600-$1,200 | $200-$1,000 | ~$1,500 |

**Conservative: ~$300/month at month 12, ~$1,500/month at month 24.**

---

## Moderate Projection (75 tools in 6 months)

Assumes: reasonable SEO traction, Tier 1 focus, Ezoic → Mediavine transition at month 9-12, RPM rising from $6 to $15.

| Month | Tools Live | Monthly PV | Ad Revenue | Affiliate | Total |
|-------|-----------|-----------|------------|-----------|-------|
| 1-2 | 15-30 | 0-200 | $0 | $0 | $0 |
| 3 | 40 | 500-1,000 | $3-$6 | $0 | ~$5 |
| 4 | 55 | 1,500-3,000 | $9-$18 | $0-$25 | ~$20 |
| 5 | 65 | 3,000-8,000 | $18-$48 | $0-$50 | ~$50 |
| 6 | 75 | 8,000-15,000 | $48-$90 | $25-$100 | ~$120 |
| 9 | 90 | 25,000-50,000 | $150-$500 | $100-$300 | ~$500 |
| 12 | 110 | 50,000-100,000 | $750-$1,500 | $200-$600 | ~$1,500 |
| 18 | 140 | 150,000-300,000 | $2,250-$4,500 | $500-$1,500 | ~$4,500 |
| 24 | 160 | 300,000-500,000 | $4,500-$7,500 | $1,000-$3,000 | ~$8,000 |

**Moderate: ~$1,500/month at month 12, ~$8,000/month at month 24.**

---

## Optimistic Projection (100 tools in 6 months, strong SEO)

Assumes: fast indexing, multiple viral tools, Mediavine at month 8, financial calculator niche hits, RPM $15-$25.

| Month | Tools Live | Monthly PV | Ad Revenue | Affiliate | Total |
|-------|-----------|-----------|------------|-----------|-------|
| 6 | 100 | 15,000-30,000 | $90-$300 | $50-$200 | ~$300 |
| 12 | 150 | 100,000-200,000 | $1,500-$5,000 | $500-$1,500 | ~$4,500 |
| 18 | 200 | 300,000-600,000 | $4,500-$15,000 | $1,500-$5,000 | ~$12,000 |
| 24 | 250 | 500,000-1,000,000 | $7,500-$25,000 | $3,000-$10,000 | ~$22,000 |

**Optimistic: ~$4,500/month at month 12, ~$22,000/month at month 24.**

---

## Benchmark Validation

| Benchmark Site | Monthly PV | Est. Revenue | Revenue/Tool |
|---------------|-----------|-------------|-------------|
| RapidTables | 50M | ~$33K/mo | ~$165/tool/mo |
| Omni Calculator | 30M | ~$500K/mo | ~$130/tool/mo |
| SmallSEOTools | 11M | ~$108K/mo | ~$900/tool/mo |
| 10015.io | 700K | ~$2-5K/mo | ~$30-70/tool/mo |

At scale, successful tool sites earn **$30-$900/tool/month**. Early-stage sites will earn much less per tool until domain authority builds.

---

## Break-Even Analysis

With $0 operating costs (Cloudflare Pages free tier, no database needed), there is no break-even point — every dollar is profit. The real question is **time to meaningful income**:

| Target | Conservative | Moderate | Optimistic |
|--------|-------------|----------|-----------|
| $100/month | Month 9 | Month 6 | Month 4 |
| $500/month | Month 15 | Month 9 | Month 7 |
| $1,000/month | Month 18 | Month 11 | Month 9 |
| $5,000/month | Month 30+ | Month 18 | Month 14 |

---

## Kill Criteria

Define failure conditions to avoid sunk cost:

| Condition | Timeline | Action |
|-----------|---------|--------|
| <500 monthly PV with 30+ tools indexed | Month 6 | Audit SEO, pivot niche focus |
| <2,000 monthly PV | Month 9 | Review tool selection, consider different categories |
| <$50/month revenue | Month 12 | Reassess monetization strategy or pivot entirely |
| <10,000 monthly PV | Month 15 | Consider abandoning project |
| Cloudflare Pages build limit hit | Any | Reduce deploy frequency or upgrade to Pro ($20/mo) |

---

## Key Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Google algorithm change | Medium | High | Diversify traffic sources, build email list |
| AdSense/Ezoic approval denied | Low-Medium | High | Ensure quality content, privacy/about pages |
| AI overviews steal tool traffic | Medium | Medium | Build tools that can't be replaced by a text answer |
| Cloudflare Pages build limits hit | Very Low | Low | Unlimited bandwidth; 500 builds/mo is ample |
| Competition copies tools | Medium | Low | Design quality + speed + SEO authority as moat |
| Ad blocker adoption increases | Medium | Medium | Affiliate revenue as hedge; target non-technical audience |

---

## Monetization Sequencing

| Phase | Timeline | Action |
|-------|---------|--------|
| 1. Build & index | Months 1-3 | Build tools, submit to Google Search Console, no monetization |
| 2. First ads | Month 3-4 | Apply for Ezoic once 50+ daily visitors |
| 3. Add affiliates | Month 4-6 | Contextual affiliate links on financial/SEO tool pages |
| 4. Upgrade ads | Month 9-12 | Apply for Mediavine at 50K sessions/month |
| 5. Premium tier | Month 12+ | Optional paid features for power users |
| 6. Direct ads | Month 18+ | Cold-email sponsors for direct ad placements ($30+ CPM) |
