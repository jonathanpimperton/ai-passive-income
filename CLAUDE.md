# AI Passive Income

## Mission

Build a zero-investment online business that generates passive income, built entirely by AI (Claude Code). No upfront monetary investment — only free-tier services and tools.

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript** — SSR/SSG for SEO, free Vercel hosting
- **Tailwind CSS v4** — rapid UI development
- **Supabase** (free tier) — Postgres database, auth, storage
- **Vercel** (free tier) — hosting, edge functions, analytics
- **Google Search Console / Analytics** — SEO tracking (free)

## Project Stages

### Stage 1: Exploration (Complete)
Evaluated 6 business models. Decision: **Free Online Tools Site**.
See `docs/stage-1-exploration.md` and `docs/viability-assessment.md`.

### Stage 2: Detailed Plan (Complete)
Market research, competitor analysis, financial model, and strategy defined.
See `docs/market-research.md`, `docs/financial-model.md`, `docs/strategy.md`.

**Chosen direction:** Modern, well-designed free tools site targeting:
1. Financial calculators (highest RPM: $8-$40)
2. Privacy & compliance tools (underserved, growing demand)
3. General utility tools (high volume, traffic builders)

**Monetization:** Ezoic ads → Mediavine at 50K sessions → affiliates → direct ads
**Revenue target:** $300/mo (month 12) to $8,000/mo (month 24) moderate case

### Stage 3: Plan Optimization
- Review plan for feasibility and risks
- Optimize for fastest time-to-revenue
- Identify what to cut from MVP
- Plan content/SEO strategy

### Stage 4: Initial Build
- Scaffold Next.js project
- Build core pages and data model
- Implement MVP features
- Set up deployment pipeline

### Stage 5: Testing & Review
- Cross-browser testing
- Performance optimization (Core Web Vitals)
- SEO audit (meta tags, structured data, sitemap)
- Content review
- Analytics setup

### Stage 6: Go Live
- Deploy to production
- Submit to Google Search Console
- Seed initial content
- Monitor and iterate

## Constraints

- **$0 budget** — free tiers only (Vercel, Supabase, Cloudflare, etc.)
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
