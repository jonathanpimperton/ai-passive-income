# AI Passive Income

## Mission

Build a zero-investment online business that generates passive income, built entirely by AI (Claude Code). No upfront monetary investment — only free-tier services and tools.

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript** — SSG for SEO, free Vercel hosting
- **Tailwind CSS v4** — rapid UI development
- **Vercel** (free tier) — hosting, edge delivery, analytics
- **Google Search Console / Analytics** — SEO tracking (free)

*Deferred:* Supabase (free tier) — not needed for MVP (pure static site, all tools client-side). Add later if user accounts or data storage are needed.

## Project Stages

### Stage 1: Exploration (Complete)
Evaluated 6 business models. Decision: **Free Online Tools Site**.
See `docs/stage-1-exploration.md` and `docs/viability-assessment.md`.

### Stage 2: Detailed Plan (Complete)
Market research, competitor analysis, financial model, and strategy defined.
See `docs/market-research.md`, `docs/financial-model.md`, `docs/strategy.md`.

**Chosen direction:** Modern, well-designed free tools site targeting:
1. Financial calculators (niche RPM ceiling: $8-$40; blended $5-$15 via Ezoic/Mediavine)
2. Privacy & compliance tools (underserved, growing demand)
3. General utility tools (high volume, traffic builders)

**Monetization:** Ezoic ads → Mediavine at 50K sessions → affiliates → direct ads
**Revenue target:** $300/mo (month 12) to $8,000/mo (month 24) moderate case

### Stage 3: Plan Optimization (Complete)
MVP cut from 40-50 tools to 20. Deploy target: ~3 weeks (not 3 months).
Dropped Supabase, blog, image tools, API-dependent tools from MVP.
See `docs/plan-optimization.md`.

### Stage 4: Build, Test & Launch (Next)
Sprint 1 (Days 1-3): Scaffold + first 5 tools (word counter, case converter, lorem ipsum, UUID, password generator)
Sprint 2 (Days 4-7): Core tools (base64, URL encoder, JSON formatter, timestamp, QR code)
Sprint 3 (Days 8-12): Financial calculators (compound interest, loan, savings, salary, tip, ROI, inflation)
Sprint 4 (Days 13-16): Security tools + polish (hash generator, password strength, color contrast, content, FAQ)
Sprint 5 (Days 17-20): Testing, SEO audit, deploy to Vercel, submit to Google Search Console, share on communities

## Constraints

- **$0 budget** — free tiers only (Vercel, Cloudflare, etc.)
- **AI-built** — Claude Code does all development
- **Low maintenance** — should run mostly unattended once live
- **Legal/ethical** — no scraped content, no spam, proper attribution

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
