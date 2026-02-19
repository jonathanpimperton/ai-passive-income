# CalcPath Build Spec

> Single source of truth for building CalcPath. Consolidated from strategy + plan-optimization docs.
> For design details (colors, typography, layout, UI patterns), see `design-system.md`.

---

## What We're Building

A focused financial calculator site called **CalcPath** (`calcpath.pages.dev` at launch).

- **Astro** + Tailwind CSS v4 + React islands on Cloudflare Pages (free tier)
- **15 MVP tools** (12 financial calculators + 3 utility tools)
- **Affiliate-first monetization** (not ad-dependent)
- **Deep educational content** per tool for E-E-A-T and topical authority
- **Email capture** ("email me my results") → automated drip → affiliate conversions

### Why Financial Niche

| Factor | Financial | Generic multi-category |
|--------|-----------|----------------------|
| Affiliate potential | $50-$500/conversion | $5-$50 mixed |
| AI Overview defensibility | Charts, tables, projections can't be text snippets | Simple tools already answered in SERP |
| Topical authority | Deep in one domain = Google trusts it | Thin across many = Google ignores it |
| Audience intent | High commercial intent | Mixed |

---

## MVP: 15 Tools

### Core Financial Calculators (6 — build first, Sprint 1-2)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 1 | **Compound Interest Calculator** | Interactive chart, compounding frequency toggle, exportable results | saving-and-growth | "Open a high-yield savings account" → Betterment, Marcus, Wealthfront |
| 2 | **Loan Amortization Calculator** | Full amortization table, principal vs interest chart, downloadable schedule | debt-and-loans | "Compare loan rates" → LendingTree, SoFi |
| 3 | **Investment Return Calculator** | DRIP option, dividend reinvestment, comparison chart | saving-and-growth | "Start investing" → Betterment, Wealthfront |
| 4 | **Retirement Savings Calculator** | Age-based projections, inflation-adjusted, milestone markers | income-and-planning | "Open a retirement account" → Betterment, Vanguard |
| 5 | **Debt Payoff Calculator** | Snowball vs avalanche comparison, total interest saved | debt-and-loans | "Consolidate your debt" → SoFi, LendingClub |
| 6 | **Savings Goal Calculator** | Timeline visualization, reverse calculator ("how much per month?") | saving-and-growth | "High-yield savings" → Marcus, Ally |

### Secondary Financial Calculators (6 — Sprint 3)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 7 | **Salary ↔ Hourly Converter** | Overtime, tax withholding, take-home pay | income-and-planning | None |
| 8 | **Inflation Calculator** | Historical CPI data, purchasing power chart | economic | None |
| 9 | **ROI Calculator** | Annualized return, total return, comparison mode | saving-and-growth | None |
| 10 | **Net Worth Calculator** | Categorized assets/liabilities, visual breakdown | income-and-planning | None |
| 11 | **Rent vs Buy Calculator** | Total cost comparison over N years, break-even point | debt-and-loans | "Get pre-approved" → LendingTree |
| 12 | **Emergency Fund Calculator** | Expense-based, 3/6/12 month targets | income-and-planning | None |

### Utility Tools (3 — Sprint 2-3)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 13 | **QR Code Generator** | Multiple format options, downloadable PNG/SVG | utility | None |
| 14 | **Password Generator** | Customizable, strength meter | utility | "Use a password manager" → 1Password, NordPass |
| 15 | **JSON Formatter/Validator** | Syntax highlighting | utility | None |

**No affiliate context (by design):** Salary, inflation, ROI, emergency fund, net worth, QR code, JSON formatter. Don't force it — forced recommendations hurt trust.

**Post-MVP expansion:** Credit card payoff, auto loan, college savings (529), tax bracket, budget (50/30/20), down payment, break-even, profit margin calculators.

---

## Build Order

### Sprint 1: Foundation + First 3 Calculators (Days 1-4)

**Infrastructure:**
- Scaffold Astro + TypeScript + Tailwind CSS v4 + React
- Design system: `ToolPageLayout.astro`, `CalculatorLayout.tsx`, `Logo.astro`
- Homepage with tool grid
- Static pages: about, privacy, affiliate disclosure
- SEO: sitemap, robots.txt, structured data helpers
- Content collection schema (see Technical Architecture below)
- Vitest + unit tests for financial math functions
- Affiliate disclosure component
- Email capture component + Kit (ConvertKit) integration
- Download and self-host Inter font + set up Tailwind `@theme` tokens

**First 3 tools:** Compound interest, Loan amortization, Savings goal

### Sprint 2: More Calculators + Utility Tools (Days 5-8)

Investment return, Retirement savings, Debt payoff, QR code generator, Password generator

### Sprint 3: Remaining Tools (Days 9-12)

Salary converter, Inflation, ROI, Net worth, Rent vs buy, Emergency fund, JSON formatter

### Sprint 4: Polish + Monetization + Launch (Days 13-16)

- Educational content (500-1,000 words per financial calculator, 200+ for utility)
- FAQ sections with schema markup
- "Related calculators" internal linking (4-6 per tool)
- Worked examples (2-3 per calculator)
- Affiliate recommendations per tool (start with Betterment — no traffic minimums)
- "Best X" comparison tables on financial calculator pages
- PDF export (jsPDF, client-side)
- Embeddable widget versions + embed code generator page
- Performance audit (Core Web Vitals)
- OG image generation (Satori + Sharp)
- Deploy to Cloudflare Pages

### Sprint 5: SEO, Share & Growth (Days 17-20)

- Submit to Google Search Console, verify sitemap indexing
- Browser testing (Chrome, Firefox, Safari, mobile)
- Set up Kit automation: 1 universal 3-email drip (tag by calculator, conditional content)
- Create first 10-20 programmatic scenario pages (500+ unique words each)
- Create 5-10 Pinterest infographic pins
- Share: Product Hunt, Reddit (r/personalfinance, r/financialindependence), Dev.to article
- Apply to Betterment affiliate program

**Total: ~4 weeks** (5 sprints × 4 days = 20 working days)

---

## Technical Architecture

### Why Astro

| Factor | Next.js 15 (static export) | Astro |
|--------|---------------------------|-------|
| JS shipped for non-tool pages | Full React runtime (~80-150KB) | Zero |
| Cloudflare Pages support | Deprecated adapter | First-class (Cloudflare owns Astro) |
| Features we'd use | ~10-20% | ~80%+ |
| Content management | Manual | Built-in content collections |

### File Structure

```
/src
├── /pages
│   ├── index.astro                        # Homepage
│   ├── about.astro                        # About
│   ├── privacy.astro                      # Privacy policy
│   ├── 404.astro                          # Custom 404 page
│   ├── disclosure.astro                   # Affiliate disclosure (FTC required)
│   ├── embed.astro                        # Embed code generator page
│   ├── /og
│   │   └── /[slug].png.ts                 # Auto-generated OG images (Satori + Sharp)
│   └── /tools
│       ├── index.astro                    # All tools listing
│       └── /[category]
│           └── /[tool].astro              # Tool page (static, renders React island)
├── /components
│   ├── /tools                             # React islands ('client:load')
│   │   ├── CalculatorLayout.tsx           # Shared input/result/chart layout
│   │   ├── CompoundInterestCalc.tsx
│   │   ├── LoanAmortizationCalc.tsx
│   │   └── ...                            # One per tool
│   └── /ui                                # Astro/HTML components
│       ├── ToolPageLayout.astro           # Reusable tool page wrapper
│       ├── Logo.astro                     # SVG wordmark logo
│       ├── FaqSection.astro               # FAQ with schema markup
│       ├── RelatedTools.astro             # Related tools links
│       ├── AffiliateDisclosure.astro      # FTC disclosure component
│       ├── ComparisonTable.astro          # "Best X" affiliate comparison table
│       ├── EmailCapture.tsx               # "Email me my results" (React island)
│       └── EmbedCode.astro               # Embed code snippet
├── content.config.ts                      # Content collection definitions (Astro 5+)
├── /data
│   └── /tools                             # Tool data files (loaded by content layer)
│       ├── compound-interest.md           # Tool metadata + educational content
│       └── ...
├── /layouts
│   └── BaseLayout.astro                   # Root layout with nav, footer
└── /lib
    ├── calculator-utils.ts                # Shared financial math functions
    ├── pdf-export.ts                      # Client-side PDF generation (jsPDF)
    └── seo.ts                             # Structured data helpers

/public
├── /fonts
│   ├── Inter-VariableFont_opsz,wght.woff2 # Self-hosted Inter (variable weights)
│   ├── Inter-Bold.ttf                     # For Satori OG image generation
│   ├── Inter-Regular.ttf                  # For Satori OG image generation
│   └── JetBrainsMono-Regular.woff2        # JSON formatter tool
├── favicon.svg                            # SVG favicon with dark mode
├── favicon.ico                            # 32x32 ICO fallback
├── apple-touch-icon.png                   # 180x180 iOS bookmark
├── icon-192.png                           # Android/PWA manifest
├── icon-512.png                           # Android/PWA splash
└── manifest.webmanifest                   # PWA manifest
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Astro | Zero JS default, React islands, first-class CF Pages |
| Interactive tools | React via `client:load` | Best ecosystem for forms, charts, state |
| Charts | recharts | React-native, tree-shakeable, no wrapper needed |
| Icons | Lucide React | Free, MIT, consistent 24px line style |
| Styling | Tailwind CSS v4 | CSS-based config, rapid development, small bundles |
| Hosting | Cloudflare Pages (free) | Unlimited bandwidth, commercial use, edge delivery |
| Content | Astro content collections | Structured tool metadata + educational content |
| Testing | Vitest | Ensure financial math is correct |
| PDF export | jsPDF (client-side) | No server needed |
| OG images | Satori + Sharp/resvg-js | Build-time generation, zero runtime cost |
| Email | Kit (ConvertKit) free tier | 10K subs, 1 visual automation, client-side form POST |

### Content Collection Schema

```ts
// src/content.config.ts (Astro 5+ Content Layer API)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/tools' }),
  schema: z.object({
    name: z.string(),                           // "Compound Interest Calculator"
    slug: z.string(),                           // "compound-interest"
    category: z.enum(['saving-and-growth', 'debt-and-loans', 'income-and-planning', 'economic', 'utility']),
    description: z.string(),                    // SEO meta description
    keywords: z.array(z.string()),              // Target keywords
    relatedTools: z.array(z.string()),          // Slugs of 4-6 related tools
    affiliateContext: z.string().optional(),     // "Open a high-yield savings account"
    affiliatePrograms: z.array(z.string()).optional(), // ["Betterment", "Marcus"]
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
    workedExamples: z.array(z.object({
      title: z.string(),
      inputs: z.record(z.string(), z.union([z.string(), z.number()])),
      description: z.string(),
    })),
  }),
});

export const collections = { tools };
```

Markdown body of each tool file = educational content (500-1,000 words financial, 200+ utility).

### Component Pattern: Dynamic Route + React Island

```astro
<!-- /pages/tools/[category]/[tool].astro -->
---
import BaseLayout from '@layouts/BaseLayout.astro';
import ToolPageLayout from '@components/ui/ToolPageLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const tools = await getCollection('tools');
  return tools.map(tool => ({
    params: { category: tool.data.category, tool: tool.data.slug },
    props: { tool },
  }));
}

const { tool } = Astro.props;

const componentMap: Record<string, any> = {
  'compound-interest': () => import('@components/tools/CompoundInterestCalc.tsx'),
  'loan-amortization': () => import('@components/tools/LoanAmortizationCalc.tsx'),
  // ... one entry per tool
};
const ToolComponent = (await componentMap[tool.data.slug]()).default;
---
<BaseLayout title={`Free ${tool.data.name} Online`} description={tool.data.description}>
  <ToolPageLayout tool={tool}>
    <ToolComponent client:load />
  </ToolPageLayout>
</BaseLayout>
```

> **Build note:** Astro's `client:*` directives may require statically analyzable imports. If the `componentMap` pattern doesn't work, fall back to conditional rendering: `{slug === 'compound-interest' && <CompoundInterestCalc client:load />}`. Test early in Sprint 1.

### Build Setup Notes (Sprint 1)

- **Tailwind CSS v4:** Uses CSS-based config, NOT `tailwind.config.ts`. Install `tailwindcss` + `@tailwindcss/vite`, add Vite plugin to `astro.config.mjs`, use `@import "tailwindcss"` in global CSS. Auto-detects content files.
- **Kit integration:** Static site uses Kit's embeddable form endpoint — no server/API key needed. Create form in Kit dashboard, get form ID, submit via client-side POST.
- **Path aliases:** Configure in `tsconfig.json`: `"@components/*": ["src/components/*"]`, `"@layouts/*": ["src/layouts/*"]`, `"@lib/*": ["src/lib/*"]`
- **Programmatic pages (Sprint 5):** `/pages/scenarios/[scenario].astro` with separate content collection. Each pre-fills a calculator + 500+ words unique analysis.

---

## SEO Strategy

### Per-Tool Page Structure

```
Title:       "Free [Tool Name] Online | CalcPath"
Description: "[Action verb] [what the tool does]. Free, fast, no signup required."
H1:          "[Tool Name]"
URL:         /tools/[category]/[tool-slug]
Schema:      WebApplication type + FAQ schema
OG Image:    Auto-generated (tool name + CalcPath branding)
```

**Page sections (in order):**
1. H1 + subtitle
2. Affiliate disclosure (if applicable)
3. Interactive calculator (React island)
4. Results with charts, tables, downloadable output
5. "How to use this calculator" (200-300 words)
6. Educational content (500-1,000 words)
7. Worked examples (2-3 real scenarios)
8. FAQ (3-5 questions, accordion, schema markup)
9. Related calculators (4-6 internal links)
10. Contextual affiliate recommendation / "Best X" comparison table

### Technical SEO

- XML sitemap auto-generated
- robots.txt allowing full crawling
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Schema.org WebApplication + FAQ + BreadcrumbList markup
- Mobile-first responsive
- OG images auto-generated per tool

### Off-Page SEO

- Submit to Google Search Console on deploy day
- Product Hunt launch (once 15 tools live)
- Reddit: r/personalfinance, r/financialindependence, r/FinancialPlanning
- Dev.to article: "How I Built a Financial Calculator Site with Astro"
- Embeddable widgets = passive backlinks

---

## Monetization

### Affiliate Programs (Phased)

| Phase | Programs | Commission | Requirement |
|-------|---------|-----------|-------------|
| Day 1 | Betterment | $25-$1,250/referral | None — accepts anyone 18+ |
| Month 2+ | LendingTree, SoFi | $50-$150/lead | Some content + active site |
| Month 3+ | Wealthfront | $35-$55/conversion | Quality review |
| Month 6+ | NerdWallet | Up to $100/referral | 10K monthly uniques |

### FTC Compliance (Non-Negotiable)

**Penalties: $53,088 per violation.** Every page with affiliate links must have:
- Visible disclosure at top of page (not buried in footer)
- Plain language: "We may earn a commission if you sign up through our links."
- Disclosure proximate to affiliate links
- Dedicated `/disclosure` page
- Never make specific financial promises

### Display Ads (Later)

Don't add Ezoic until 50+ daily visitors consistently. Ads hurt Core Web Vitals → hurt SEO. Prioritize clean, fast pages that rank.

### Revenue Multipliers

**HIGH priority:**
1. **Email capture** — "Email me a PDF of my results" on every calculator. Kit free tier (10K subs, 1 automation). 3-email drip: results PDF → educational content → affiliate recommendation. Email list is the insurance policy against Google algorithm changes.
2. **Embeddable widgets** — iframe versions with "Powered by CalcPath" backlink. Omni Calculator got 564K+ backlinks this way.
3. **"Best X" comparison tables** — on every financial calculator page. Highest affiliate CTR placement.

**MEDIUM priority:**
4. **Programmatic scenario pages** — pre-filled calculators for long-tail queries ("monthly payment on $300K mortgage at 7%"). Start with 50-100, 500+ unique words each. 60% of programmatic SEO fails — do carefully.
5. **Comparison/analysis pages** — "Snowball vs avalanche," "Renting vs buying 2026." Create 5-10 at launch.

**LOW priority:**
6. **Pinterest** — Financial pins have 3.88-month lifetime. 2-3 pins per calculator. Diversification play.

---

## Revenue Expectations (Honest)

| Timeline | Revenue | Notes |
|---------|---------|-------|
| Months 1-3 | $0 | Building, in Google sandbox |
| Months 4-6 | $0-$50/mo | First affiliate clicks |
| Months 7-12 | $25-$250/mo | SEO traction, maybe Ezoic |
| Months 12-18 | $100-$660/mo | Growing authority |
| Months 18-24 | $300-$1,400/mo | Established |
| Year 3+ | $750-$4,500/mo | If things go well |

**Year 1 total: $0-$500.** Plan for $0 and be pleasantly surprised.

---

## Adaptation Triggers

$0 operating cost = never quit, always adapt.

| Signal | Timeline | Adaptation |
|--------|---------|-----------|
| <200 monthly PV with 15+ tools indexed | Month 8 | Audit SEO, rework keyword targets, push backlinks |
| Zero email signups | Month 6 | Redesign capture UX, test different value props |
| <1,000 monthly PV | Month 12 | Add programmatic pages, try adjacent niches, increase outreach |
| Zero affiliate conversions | Month 12 | Redesign CTAs, test placements, try different programs |
| Traffic plateaus | Any | Expand tools, add comparison content, push embeddable widgets |
| Google algorithm wipes rankings | Any | Email list is insurance. Lean into Pinterest, Reddit, direct traffic. |

---

## "Done" Checklist

MVP is shipped when:
- [ ] 15 tools live and functional
- [ ] Financial math has unit tests (Vitest) that pass
- [ ] All tool pages have educational content (500+ words financial, 200+ utility)
- [ ] FAQ sections with schema markup on all tools
- [ ] Affiliate links with FTC disclosure on applicable calculators
- [ ] "Best X" comparison tables on financial calculator pages
- [ ] Email capture ("Email me my results as PDF") on all calculators
- [ ] Kit integrated with 1 universal 3-email drip (tags per calculator)
- [ ] Embeddable widget versions + embed code generator
- [ ] Homepage with tool grid and category filtering
- [ ] Sitemap, robots.txt, structured data, OG images
- [ ] About, privacy, disclosure pages
- [ ] `npm run build` succeeds with zero errors
- [ ] Core Web Vitals pass (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Mobile responsive + WCAG AA accessible
- [ ] Deployed to Cloudflare Pages
- [ ] Submitted to Google Search Console
- [ ] Applied to Betterment affiliate program
