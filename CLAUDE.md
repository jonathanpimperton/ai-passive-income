# CalcPath — AI Passive Income Project

## Read Order

Before building anything, read these two files in order:

1. **`docs/build-spec.md`** — What to build: tools list, build order, file structure, content schema, SEO, monetization, revenue targets, "done" checklist
2. **`docs/design-system.md`** — How it looks: branding (name, logo, favicon, OG images), colors, typography, calculator UI patterns, navigation, mobile, accessibility, visual polish

Historical docs (exploration, market research, financial model, original strategy/plan-optimization) are archived in `docs/archive/` for reference only. They are **not needed for building** — everything was consolidated into the two files above.

## Mission

Build a zero-investment online business that generates passive income, built entirely by AI (Claude Code). No upfront monetary investment — only free-tier services and tools.

## Tech Stack

- **Astro** + **TypeScript** — static site generation, zero JS by default, React islands for interactive tools
- **Tailwind CSS v4** — rapid UI development (CSS-based `@theme` config, NOT `tailwind.config.ts`)
- **React** — interactive calculator components (via Astro islands with `client:load`)
- **recharts** — interactive chart visualization in calculator results
- **Lucide React** — consistent icon language across the site
- **Cloudflare Pages** (free tier) — hosting, CDN, unlimited bandwidth, commercial use allowed
- **Kit (ConvertKit)** (free tier) — email capture, 10K subscribers, 1 automated drip sequence
- **Google Search Console / Analytics** — SEO tracking (free)
- **Satori + Sharp** — build-time OG image generation
- **jsPDF** — client-side PDF export of calculator results

> **Why Astro over Next.js?** This is a static tools site — we use ~10% of Next.js's features. Astro ships zero JS by default (better Core Web Vitals = better SEO), Cloudflare acquired Astro's company (first-class support), and React components work natively as islands.

## Site Identity

- **Name:** CalcPath
- **Domain:** `calcpath.pages.dev` (free at launch) → `calcpath.com` (~$10/yr via Cloudflare Registrar)
- **Logo:** SVG wordmark — navy "Calc" + blue "Path" (built in code, no external tools)
- **Tagline:** "Navigate your financial future"

## Project Stages

### Stage 1: Exploration (Complete)
Evaluated 6 business models. Decision: **Free Online Tools Site**.

### Stage 2: Detailed Plan (Complete)
Market research, competitor analysis, financial model, and strategy defined.

**Chosen approach:**
- 12 complex financial calculators + 3 high-value utility tools (15 MVP total)
- Affiliate-first monetization (not ad-dependent)
- Email capture ("email me my results") → automated drip → affiliate conversions
- Embeddable calculator widgets for passive backlinks
- Deep educational content per tool for E-E-A-T
- FTC-compliant affiliate disclosures on every page

### Stage 3: Plan Optimization + Design (Complete)
MVP cut from 20 generic tools to 15 focused tools (12 financial + 3 utility).
Switched from Next.js to Astro. Dropped simple tools that AI Overviews replace.
Full design system defined: branding, colors, typography, calculator UI, navigation, accessibility.

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
