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

## Target Audience & Personas

### Who Uses Financial Calculators

Financial calculator users are **people on the edge of a money decision**. They're not browsing — they're about to act (open an account, take out a loan, change their savings plan). This high intent is why financial affiliates pay $50-$500 per conversion.

### Customer Segments

| Segment | Age | Life Trigger | Top Tools | Affiliate Fit |
|---------|-----|-------------|-----------|---------------|
| **Young savers** | 22-30 | First real job, student debt, starting to save | Compound interest, Savings goal, Debt payoff, Emergency fund | High-yield savings (Marcus, Betterment) |
| **Home decision-makers** | 28-45 | Buying vs renting, mortgage shopping | Rent vs buy, Loan amortization, Savings goal | Mortgage leads (LendingTree) |
| **Career optimizers** | 25-40 | Job offer evaluation, raise negotiation | Salary converter, Net worth, ROI | Low (no natural affiliate) |
| **Pre-retirees** | 45-65 | Retirement planning, portfolio check | Retirement savings, Investment return, Inflation | Retirement accounts (Betterment, Vanguard) |
| **Debt resolvers** | Any | Drowning in payments, consolidation research | Debt payoff, Loan amortization | Debt consolidation (SoFi, LendingClub) |

### Ideal Customer Profile

- **Geography:** US, UK, Canada, Australia (Tier 1 English-speaking — maximizes affiliate eligibility and RPM)
- **Income:** $40K-$150K household (enough to invest/save but not enough to have a financial advisor)
- **Digital behavior:** Googles financial questions, uses free tools, compares options before committing
- **Financial literacy:** Moderate — understands basics (interest, loans) but wants help with the math
- **Ad blocker usage:** ~33% (general consumer, not tech-heavy — much lower than developer audiences at 52-76%)

### What They Don't Want

- Account creation or login walls (SmartAsset, NerdWallet require forms before showing results)
- Their data harvested and sold to financial advisors (SmartAsset's entire business model)
- Pages cluttered with ads that push content below the fold (Bankrate, Calculator.net)
- Jargon without explanation (APR, CAGR, amortization — explain inline)
- To be told what to do — they want the numbers so they can decide themselves

---

## Customer Needs & Pain Points

### Why People Search for Financial Calculators

| Need | Example Search | Emotional State | What They Want |
|------|---------------|----------------|----------------|
| **Clarity before a big decision** | "mortgage calculator" | Anxious, cautious | See the real monthly payment before committing |
| **Scenario comparison** | "should I pay off debt or invest" | Conflicted, uncertain | Compare options with their actual numbers |
| **Validation of a gut feeling** | "am I saving enough for retirement" | Worried, hopeful | Numbers that confirm or correct their plan |
| **Quick answer, no friction** | "100k salary to hourly" | Impatient, task-focused | Instant answer, no signup, no ads |
| **Understanding a concept** | "how does compound interest work" | Curious, learning | Education + a tool to play with |
| **Negotiation ammunition** | "50k salary is how much per hour" | Strategic, motivated | A number to reference in a conversation |

### Pain Points with Existing Solutions

| Competitor | What's Wrong | Our Advantage |
|------------|-------------|---------------|
| **Calculator.net** | Dated design (looks like 2008), no educational content, basic output | Modern UI, charts, educational content, PDF export |
| **Bankrate** | Buried in display ads, slow load, content pushed below fold | Zero ads at launch, fast Astro SSG, clean layout |
| **NerdWallet** | Account wall on some features, lead-gen focused, data harvested | No accounts, no data harvesting, results always free |
| **SmartAsset** | "Talk to a financial advisor" form gates results, sells your data to advisors | Results always visible, email capture is optional and clearly labeled |
| **Omni Calculator** | Good content but clinical/academic tone, no affiliate recommendations | Approachable tone, actionable next steps, "here's what to do with these numbers" |
| **Spreadsheets** | Requires setup, no visuals, not shareable, easy to make formula errors | Zero setup, interactive charts, PDF export, pre-built with correct math |

---

## Value Proposition & Competitive Positioning

### Value Proposition

**For people making financial decisions** who need clarity on the numbers,
**CalcPath** provides **free, instant, no-signup financial calculators** with interactive charts and plain-English explanations —
**unlike NerdWallet and SmartAsset**, which gate results behind account forms and sell your data to financial advisors.

### One-Line USP

> **"See your numbers instantly — no signup, no ads, no data harvesting."**

This is the copy direction for the homepage hero, meta descriptions, and social sharing. It directly attacks the three biggest pain points with competitors.

### Competitive Positioning Map

```
                    Deep Content / Education
                            ▲
                            │
              NerdWallet ●  │  ● CalcPath (us)
                            │
                            │  ● Omni Calculator
              SmartAsset ●  │
                            │
   Cluttered ───────────────┼──────────────── Clean Design
              Bankrate ●    │
                            │
        Calculator.net ●    │
                            │
                            │
                            ▼
                     Thin / Tool Only
```

**Our quadrant: Clean design + deep content.** No existing competitor fully owns this space. NerdWallet is close on design but gates features and harvests data. Omni Calculator has great content but clinical design. We combine the best of both without the downsides.

### Competitive Moat (Honest Assessment)

At launch, we have **no moat**. This is a new domain with zero authority. The moat builds over time:

| Timeline | Moat Layer | How |
|----------|-----------|-----|
| Month 1 | Design quality | Clean, fast, modern — better UX than 90% of calculator sites |
| Month 3-6 | Content depth | 500-1,000 words of educational content per tool (most competitors skip this) |
| Month 6-12 | Email list | Owned audience that no algorithm change can take away |
| Month 6-12 | Backlinks from embeds | Embeddable widgets with "Powered by CalcPath" generate passive backlinks |
| Year 1+ | Domain authority | Accumulated SEO equity, indexed pages, backlink profile |
| Year 2+ | Brand recognition | Direct traffic from bookmarks and word-of-mouth |

**The email list is the real moat.** Google can change algorithms, AI Overviews can eat traffic, but an email list is an owned channel. This is why email capture is on every calculator from day 1.

---

## Customer Journey & Conversion Funnel

### The Path from Search to Revenue

```
DISCOVER          USE             LEARN           CAPTURE         NURTURE          CONVERT
   │                │                │                │               │                │
Google search → Calculator page → Educational    → "Email me     → 3-email       → Affiliate
"compound       Instant results    content below    my results"     drip sequence    signup
 interest        with charts       + FAQ + worked   (soft capture,  (educational +   ($25-$500
 calculator"                        examples         no gate)        recommendation)   commission)
   │                │                │                │               │                │
   ▼                ▼                ▼                ▼               ▼                ▼
Impressions     Page views       Scroll depth     Email opt-in   Open/click rate  Affiliate
& CTR           & tool usage     & time on page   rate (3-8%)    (30-40% / 3-5%)  conversion
```

### Funnel Math (Month 12 Moderate Scenario)

| Stage | Volume | Rate | Result |
|-------|--------|------|--------|
| Google impressions | 100,000/mo | 3% CTR | 3,000 clicks |
| Landing on tool page | 3,000/mo | 85% use tool | 2,550 calculator uses |
| Read educational content | 2,550 | 40% scroll to content | 1,020 readers |
| Email opt-in | 2,550 tool users | 5% opt-in | 128 new subscribers |
| On-site affiliate click | 3,000 page views | 2% click affiliate | 60 affiliate clicks |
| On-site conversion | 60 clicks | 2% convert | 1.2 conversions |
| Email affiliate click | ~1,200 list size | 1.5% click per email | ~18 clicks/email send |
| Email conversion | 18 clicks | 2% convert | 0.36 conversions |
| **Total monthly conversions** | | | **~1.5** |
| **At $75 avg commission** | | | **~$115/mo** |

This aligns with the $65-$250/mo range in our revenue projections. The email list contribution is small at month 12 but compounds — by month 24 with a 3,000+ subscriber list, email-driven conversions can equal on-site conversions.

### Secondary Conversion Paths

| Path | Mechanism | Timeline |
|------|----------|----------|
| **Return visits** | User bookmarks CalcPath, returns for other calculators | Month 3+ |
| **Related tool clicks** | "Related Calculators" section drives 2-3 pages/session | Launch |
| **Comparison table clicks** | "Best High-Yield Savings Accounts" table on calculator pages | Launch |
| **Shared results** | User emails PDF to spouse/friend, friend visits site | Month 1+ |
| **Embedded widgets** | Finance blogger embeds our calculator, readers click through | Month 6+ |

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

## Keyword Targets

Primary keyword = the main term we want to rank for. Secondary = supporting long-tail queries to capture in educational content and FAQ sections.

### Financial Calculators

| Tool | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| Compound Interest | compound interest calculator | how to calculate compound interest, investment growth calculator, compound interest formula |
| Loan Amortization | loan amortization calculator, amortization schedule calculator | loan payment calculator, mortgage amortization schedule, amortization table |
| Investment Return | investment calculator, investment return calculator | stock return calculator, portfolio growth calculator, DRIP calculator |
| Retirement Savings | retirement calculator, retirement savings calculator | how much to save for retirement, 401k calculator, retirement planning calculator |
| Debt Payoff | debt payoff calculator, debt repayment calculator | snowball vs avalanche calculator, how long to pay off debt, debt free date |
| Savings Goal | savings calculator, savings goal calculator | how much to save per month, savings goal planner, savings timeline |
| Salary Converter | salary to hourly calculator, hourly to salary | annual salary calculator, take-home pay calculator, overtime calculator |
| Inflation | inflation calculator, CPI calculator | purchasing power calculator, what was X worth in Y year, inflation rate |
| ROI | ROI calculator, return on investment calculator | how to calculate ROI, investment ROI, annualized return calculator |
| Net Worth | net worth calculator | how to calculate net worth, personal net worth tracker, am I on track |
| Rent vs Buy | rent vs buy calculator | should I rent or buy, renting vs buying comparison, break-even point |
| Emergency Fund | emergency fund calculator | how much emergency fund, 3 month emergency fund, emergency savings |

### Utility Tools

| Tool | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| QR Code Generator | QR code generator, free QR code generator | create QR code, QR code maker, QR code for URL |
| Password Generator | password generator, random password generator | strong password generator, secure password, password creator |
| JSON Formatter | JSON formatter, JSON beautifier | JSON validator, format JSON online, JSON pretty print |

### Keyword Strategy Notes

- **Title tag formula:** "Free [Primary Keyword] Online | CalcPath"
- **H1:** "[Primary Keyword]" (natural, not keyword-stuffed)
- **Educational content:** Target 2-3 secondary keywords naturally within the 500-1,000 word section
- **FAQ section:** Each question should be a real long-tail query people search for
- **Programmatic pages (Sprint 5+):** Target ultra-specific queries like "monthly payment on $300,000 mortgage at 7%" or "compound interest on $10,000 at 5% for 20 years"

---

## Success Metrics & KPIs

### Weekly Check (15 minutes)

| Metric | Source | What to Look For |
|--------|--------|-----------------|
| Search impressions + clicks | Google Search Console | Trending up week-over-week |
| Top queries + positions | Google Search Console | New queries appearing, positions improving |
| Email signups this week | Kit dashboard | Consistent flow; zero = problem |
| Affiliate clicks | Affiliate dashboards | Any clicks at all in early months = good signal |

### Monthly Review (1 hour)

| Metric | Target (Month 6) | Target (Month 12) | Target (Month 24) |
|--------|------------------|--------------------|--------------------|
| Monthly pageviews | 500-1,000 | 3,000-8,000 | 20,000-50,000 |
| Organic traffic share | >50% | >60% | >65% |
| Email list size | 50-200 | 500-1,000 | 2,500-5,000 |
| Email opt-in rate | 3-5% | 5-8% | 5-8% |
| Affiliate revenue | $0-$50 | $50-$200 | $200-$1,000 |
| Pages per session | >1.5 | >2.0 | >2.0 |
| Core Web Vitals | All green | All green | All green |
| Tools indexed in Google | 15/15 | 15/15+ | 30+ |

### Quarterly Review (2 hours)

- Revenue vs projection (are we on track with the financial model?)
- Content gap analysis: what are people searching for that we don't have a tool for?
- Competitor check: has anyone launched something similar? Have existing competitors improved?
- Email list health: open rates (target >30%), unsubscribe rate (target <1%)
- Adaptation trigger review (see next section)

### North Star Metric

**Email list size.** It's the one metric that compounds independently of Google, represents genuine user value (they gave us their email), and directly drives affiliate revenue through the drip sequence. If the email list is growing, the business is growing.

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

## Post-Launch Operations

### Weekly (30 minutes)

| Task | Tool | Purpose |
|------|------|---------|
| Check Search Console for crawl errors | Google Search Console | Catch indexing issues early |
| Review new email signups + bounce rate | Kit dashboard | Ensure email capture is working |
| Check affiliate dashboards for clicks/conversions | Betterment, etc. | Track revenue, spot issues |
| Scan for broken links or 404s | Search Console or build logs | Maintain site health |

### Monthly (2-3 hours)

| Task | Purpose |
|------|---------|
| Publish 1-2 new tools or content pages | Expand keyword footprint |
| Update "last updated" dates on comparison tables | Trust signal for users and Google |
| Review analytics for unexpected traffic or drops | Catch opportunities or problems |
| Check competitor sites for new features or tools | Stay informed, find gaps |
| Review email automation performance | Optimize open rates, click rates |

### Quarterly (half day)

| Task | Purpose |
|------|---------|
| Update financial data in comparison tables (savings rates, loan rates) | Accuracy = trust |
| Revenue vs projection review | Course-correct if needed |
| Apply to new affiliate programs as traffic grows | Unlock higher commissions |
| Core Web Vitals audit | Maintain SEO advantage |
| Refresh educational content with current year data | Freshness signal for Google |
| Evaluate adaptation triggers (see above) | Decide if strategy shifts needed |

### Maintenance Philosophy

The site is built to be **low-maintenance by design**: static site (no server), no database, no user accounts, no CMS. The main ongoing work is content creation (new tools, scenario pages) and data freshness (comparison table rates). Budget 2-4 hours per week once live.

---

## Content Marketing Roadmap

### Phase 1: Launch (Month 1-3)

**Goal:** Get indexed, get first organic impressions.

| Action | Volume | Purpose |
|--------|--------|---------|
| 15 MVP tools live with educational content | 15 pages | Core product |
| 10-20 programmatic scenario pages | 10-20 pages | Long-tail keyword capture |
| Submit to Google Search Console | 1 | Start indexing |
| Product Hunt launch | 1 | Initial traffic spike + backlinks |
| Reddit posts (r/personalfinance, r/financialindependence) | 3-5 | Referral traffic, genuinely helpful not spammy |
| Dev.to article ("How I Built a Financial Calculator Site with Astro") | 1 | Developer audience, backlink |

### Phase 2: Growth (Month 4-6)

**Goal:** Expand keyword footprint, build backlinks.

| Action | Volume | Purpose |
|--------|--------|---------|
| Add 5-10 new calculators from post-MVP list | 5-10 tools | More keyword targets |
| Comparison articles ("Snowball vs Avalanche", "Renting vs Buying in 2026") | 5-10 articles | Informational queries + internal linking |
| Expand programmatic pages to 50-100 | 30-80 new pages | Long-tail traffic at scale |
| Pinterest infographic pins | 2-3 per calculator | Diversified traffic, 3.88-month pin lifespan |
| Outreach to personal finance bloggers for embed partnerships | 5-10 emails | Passive backlinks from embeddable widgets |

### Phase 3: Authority (Month 7-12)

**Goal:** Build domain authority, optimize conversions.

| Action | Volume | Purpose |
|--------|--------|---------|
| "Ultimate guide" long-form content for top 3 tools | 3 articles (2,000+ words) | Pillar content for link building |
| Seasonal content (tax season, New Year financial planning) | 2-3 pages | Time-sensitive traffic spikes |
| A/B test email capture copy and placement | Ongoing | Optimize opt-in rate toward 8% |
| A/B test affiliate CTA copy and placement | Ongoing | Optimize click-through rate |
| Evaluate podcast/YouTube as traffic sources | Research | Diversification beyond Google |

### Content Types (Prioritized)

| Type | SEO Value | Effort | Priority |
|------|----------|--------|----------|
| Calculator tool pages | Very high (transactional intent) | High (code + content) | Must-have |
| Educational content per tool | Very high (informational intent) | Medium (500-1,000 words) | Must-have |
| Programmatic scenario pages | High (long-tail volume) | Low per page (templated) | High |
| Comparison articles | High (commercial intent) | Medium (research + writing) | High |
| "Ultimate guide" pillar content | High (link-worthy) | High (2,000+ words) | Medium |
| Pinterest pins | Low-medium (traffic diversification) | Low (infographic templates) | Low |

---

## Legal Pages

### Privacy Policy (`/privacy`)

Must cover:

| Section | Content |
|---------|---------|
| **Data collected** | Email address only (via Kit email capture). No accounts, no passwords, no personal financial data. |
| **Calculator data** | All calculations run client-side in the browser. We never see, store, or transmit the numbers users enter into calculators. |
| **Analytics** | Google Analytics (anonymized IP). What we track: page views, traffic sources, device types. What we don't track: individual users, financial data, personal information. |
| **Cookies** | Analytics cookies only. No advertising cookies, no tracking pixels, no third-party data sharing. |
| **Email usage** | Emails used solely for sending requested calculator results and occasional educational content. Never sold, shared, or given to third parties. Unsubscribe link in every email. |
| **Affiliate links** | We link to third-party financial products. When you click an affiliate link, that company's privacy policy applies. We don't share your data with affiliate partners. |
| **GDPR/CCPA** | Right to deletion (email us), right to access, right to opt out. Contact email provided. |
| **Children** | Not directed at children under 13. |

### Affiliate Disclosure (`/disclosure`)

Must cover (FTC requires this — $53,088 per violation):

| Section | Content |
|---------|---------|
| **Clear statement** | "CalcPath earns commissions from some links on this site. This helps us keep the tools free." |
| **What it means for users** | "You pay nothing extra. The products cost the same whether you use our link or go directly." |
| **How we choose recommendations** | "We only recommend products we've researched. Affiliate relationships don't influence our calculator results — the math is the math." |
| **List of affiliate relationships** | Name each program (Betterment, LendingTree, SoFi, etc.) with a brief description. Update as programs are added. |
| **Not financial advice** | "CalcPath provides educational tools and information, not personalized financial advice. Consult a qualified financial advisor for decisions specific to your situation." |

### Terms of Use (footer link, not full page — keep simple)

| Section | Content |
|---------|---------|
| **Calculator accuracy** | "Results are estimates based on the inputs you provide. Actual results may vary. We test our math rigorously but cannot guarantee accuracy for your specific situation." |
| **Not financial advice** | "CalcPath is an educational tool, not a financial advisor. We don't know your full financial picture." |
| **Use at your own risk** | Standard disclaimer — no liability for decisions made based on calculator results. |
| **Intellectual property** | Calculator code and content are copyrighted. Embeddable widgets are provided under fair use with required attribution ("Powered by CalcPath"). |

### Cookie Consent

- **Required for EU visitors** if using Google Analytics
- Simple banner: "We use cookies for analytics to improve the site. [Accept] [Decline]"
- If declined, don't load Google Analytics script
- Use a lightweight cookie consent solution (cookie-consent-banner or build a simple one — no heavy third-party scripts)
- Store consent preference in localStorage (not a cookie, ironically)

---

## "Done" Checklist

MVP is shipped when:

**Tools & Content:**
- [ ] 15 tools live and functional
- [ ] Financial math has unit tests (Vitest) that pass
- [ ] All tool pages have educational content (500+ words financial, 200+ utility)
- [ ] FAQ sections with schema markup on all tools (3-5 questions each, targeting long-tail keywords)
- [ ] Worked examples on all financial calculators (2-3 each)

**Monetization & Email:**
- [ ] Affiliate links with FTC disclosure on applicable calculators
- [ ] "Best X" comparison tables on financial calculator pages
- [ ] Email capture ("Email me my results as PDF") on all calculators
- [ ] Kit integrated with 1 universal 3-email drip (tags per calculator)
- [ ] Embeddable widget versions + embed code generator

**Site Structure & Legal:**
- [ ] Homepage with tool grid and category filtering
- [ ] About page (who we are, what we do, no fake team bios)
- [ ] Privacy policy (client-side data, analytics, email usage, GDPR/CCPA)
- [ ] Affiliate disclosure page (FTC-compliant, lists all programs)
- [ ] Terms of use (not financial advice, estimates only, use at own risk)
- [ ] Cookie consent banner for analytics (EU compliance)

**Technical & SEO:**
- [ ] Sitemap, robots.txt, structured data (WebApplication + FAQ + Breadcrumb), OG images
- [ ] `npm run build` succeeds with zero errors
- [ ] Core Web Vitals pass (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Mobile responsive + WCAG AA accessible
- [ ] Deployed to Cloudflare Pages
- [ ] Submitted to Google Search Console

**Launch & Growth:**
- [ ] Applied to Betterment affiliate program
- [ ] First 10-20 programmatic scenario pages live
- [ ] Google Analytics configured with cookie consent
