# AI Passive Income

## Mission

Build a zero-investment online business that generates passive income, built entirely by AI (Claude Code). No upfront monetary investment — only free-tier services and tools.

## Tech Stack

- **Astro** + **TypeScript** — static site generation, zero JS by default, React islands for interactive tools
- **Tailwind CSS v4** — rapid UI development
- **React** — interactive calculator components (via Astro islands)
- **Cloudflare Pages** (free tier) — hosting, CDN, unlimited bandwidth, commercial use allowed
- **Kit (ConvertKit)** (free tier) — email capture, 10K subscribers, 1 automated drip sequence
- **Google Search Console / Analytics** — SEO tracking (free)

> **Why Astro over Next.js?** This is a static tools site — we use ~10% of Next.js's features. Astro ships zero JS by default (better Core Web Vitals = better SEO), Cloudflare acquired Astro's company (first-class support), and React components work natively as islands.

## Project Stages

### Stage 1: Exploration (Complete)
Evaluated 6 business models. Decision: **Free Online Tools Site**.
See `docs/stage-1-exploration.md` and `docs/viability-assessment.md`.

### Stage 2: Detailed Plan (Complete → Revised)
Market research, competitor analysis, financial model, and strategy defined.
See `docs/market-research.md`, `docs/financial-model.md`, `docs/strategy.md`.

**Revised direction (Feb 19):** Focused financial calculator site. Original plan spread across 4 categories (financial, privacy, utility, developer) — revised to focus on financial niche for topical authority. Simple tools (word counter, tip calculator, etc.) cut because Google AI Overviews answer them directly.

**Chosen approach:**
- 12 complex financial calculators + 3 high-value utility tools (15 MVP total)
- Affiliate-first monetization (not ad-dependent)
- Email capture ("email me my results") → automated drip → affiliate conversions
- Embeddable calculator widgets for passive backlinks
- Deep educational content per tool for E-E-A-T
- FTC-compliant affiliate disclosures on every page

**Revenue expectations (realistic):**
- Year 1: $0-$500 total (building SEO equity on a new domain)
- Year 2: $2,000-$10,000 total, ramping from ~$100/mo to ~$1,400/mo (affiliates + Ezoic/Mediavine)
- Year 3+: $750-$4,500/month if things go well
- See `docs/financial-model.md` for detailed breakdowns

### Stage 3: Plan Optimization (Complete → Revised)
MVP cut from 20 generic tools to 15 focused tools (12 financial + 3 utility).
Switched from Next.js to Astro. Dropped simple tools that AI Overviews replace.
See `docs/plan-optimization.md` and `docs/strategy.md`.

### Stage 4: Build, Test & Launch (Next)
1. Scaffold Astro + TypeScript + Tailwind CSS v4 + React
2. Build tool page layout and component architecture
3. Build 6 core financial calculators (compound interest, loan, investment, retirement, debt payoff, savings goal)
4. Build 6 secondary calculators (salary, inflation, ROI, net worth, rent-vs-buy, emergency fund)
5. Build 3 utility tools (QR code, password generator, JSON formatter)
6. Add educational content, FAQ sections, structured data
7. Add affiliate links with FTC disclosure, comparison tables, email capture, embeddable widgets
8. Deploy to Cloudflare Pages, submit to Google Search Console

## Constraints

- **$0 budget** — free tiers only (Cloudflare Pages, etc.)
- **AI-built** — Claude Code does all development
- **Low maintenance** — should run mostly unattended once live
- **Legal/ethical** — no scraped content, no spam, proper attribution, FTC-compliant affiliate disclosures

## Running

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Build
npm run build

# Run tests
npm test
```
