# CalcPath — AI Passive Income Project

## Read Order

Before building anything, read these two files in order:

1. **`docs/build-spec.md`** — What to build and why: target audience, personas, value proposition, competitive positioning, customer journey, tools list, build order, file structure, content schema, SEO, keyword targets, monetization, revenue targets, KPIs, post-launch operations, content marketing roadmap, legal pages, "done" checklist
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
- **MailerLite** (free tier) — email capture, 500 subscribers, automations included, 12K emails/mo. Upgrade to Growing Business ($10/mo) at 500+ subs.
- **Google Search Console / Analytics** — SEO tracking (free)
- **Satori + Sharp** — build-time OG image generation
- **jsPDF** — client-side PDF export of calculator results

> **Why Astro over Next.js?** This is a static tools site — we use ~10% of Next.js's features. Astro ships zero JS by default (better Core Web Vitals = better SEO), Cloudflare acquired Astro's company (first-class support), and React components work natively as islands.

## Site Identity

- **Name:** CalcPath
- **Domain:** `calcpath.pages.dev` (free at launch) → `calcpath.com` (~$10/yr via Cloudflare Registrar)
- **Logo:** SVG wordmark — navy "Calc" + blue "Path" (built in code, no external tools)
- **Tagline:** "See your numbers instantly — no signup, no ads." (USP; see build-spec.md Value Proposition section)

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

### Stage 4: Build, Test & Launch (In Progress)

**Sprint 1 — Foundation (Complete):**
- Astro 5 + TypeScript + Tailwind CSS v4 + React scaffold
- Design system: all color/typography/spacing tokens, self-hosted Inter + JetBrains Mono fonts
- Content architecture: Zod-validated content collection (glob loader), 15 tool markdown files with full frontmatter
- Page templates: BaseLayout, ToolPageLayout (breadcrumbs, H1, affiliate disclosure, worked examples, FAQ, related tools)
- 22 pages: homepage, tools index, 15 tool pages, about, privacy, terms, disclosure, 404
- Navigation: sticky header with category dropdown, mobile hamburger with focus trap
- Footer: 4-column grid with all links
- Components: Logo, Breadcrumb, FaqSection, RelatedTools, AffiliateDisclosure, EmailCapture, CookieConsent, PlaceholderCalc
- Financial math library: compound interest, loan amortization, savings goal (27 unit tests passing)
- SEO: WebApplication, FAQPage, BreadcrumbList, WebSite structured data schemas
- Static assets: SVG favicon, PNG icons, manifest, robots.txt, sitemap

**Sprint 2 — Next:**
- Build 6 core financial calculators (compound interest, loan, investment, retirement, debt payoff, savings goal)
- Build QR code generator + password generator

**Sprint 3 — After:**
- Build 6 secondary calculators + JSON formatter

**Sprint 4-5 — Polish & Launch:**
- Educational content, comparison tables, PDF export, embeddable widgets, OG images
- Deploy to Cloudflare Pages, submit to Google Search Console

## Constraints

- **$0 budget** — free tiers only (Cloudflare Pages, etc.)
- **AI-built** — Claude Code does all development
- **Low maintenance** — should run mostly unattended once live
- **Legal/ethical** — no scraped content, no spam, proper attribution, FTC-compliant affiliate disclosures

## For New Claude Code Sessions

When starting a new session on this project:

1. **Check you're on the default branch** — all completed work is merged here. Do NOT continue on old `claude/*` branches from previous sessions.
2. **Read this file first**, then follow the Read Order above (`docs/build-spec.md` → `docs/design-system.md`).
3. **Current status:** Stage 4, Sprint 1 (Foundation) is complete. Sprint 2 (core calculators) is next. All 15 tool pages exist with placeholder calculators — next step is building real calculator components starting with compound interest.
4. **Before finishing a session:** Always create a PR to merge your `claude/*` branch back into the default branch so the next session inherits all work. Never leave work stranded on a feature branch.

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
