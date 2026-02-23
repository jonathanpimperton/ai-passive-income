# Stage 3: Plan Optimization (Revised Feb 19)

**Date:** 2026-02-19 (revised from Feb 18)
**Goal:** Cut scope to focused MVP, fix framework choice, set realistic expectations

---

## What Changed in This Revision

The original plan (Feb 18) was revised after critical research into 2026 market conditions:

1. **Framework:** Next.js → **Astro** (Cloudflare deprecated their Next.js adapter; Astro is first-class on CF Pages)
2. **Scope:** 20 generic tools → **15 focused tools** (12 financial + 3 utility)
3. **Cut simple tools:** Word counter, tip calculator, case converter, lorem ipsum, UUID, Base64, URL encoder, timestamp converter — all cut because Google AI Overviews answer these directly in the SERP
4. **Niche focus:** Generic multi-category → **financial calculators only** for topical authority
5. **Monetization:** Ads-first → **affiliates-first** (at low traffic, one affiliate conversion = months of ad revenue)
6. **Revenue expectations:** $1,500/mo at month 12 → **$65-$250/mo** at month 12 (honest)

---

## What's Solid (Unchanged)

1. **$0 cost structure** — Cloudflare Pages free tier (unlimited bandwidth, 500 builds/mo, commercial use allowed). No database needed. Client-side tools generate no server load.

2. **AI buildability** — Self-contained calculator tools are ideal for AI development. Each tool is an independent unit with clear inputs/outputs, no external dependencies, and testable in isolation.

3. **No cold start** — Unlike a directory or marketplace, a single working tool provides value from day one.

4. **Affiliate-first is correct** — At low traffic, a single fintech affiliate conversion ($50-$500) dwarfs months of ad revenue ($5-$60/month).

---

## MVP: 15 Tools

### Core Financial Calculators (6 — build first)

These are the most complex, most defensible against AI Overviews, and have the best affiliate fit:

1. **Compound interest calculator** — interactive chart, compounding frequency toggle, exportable results
2. **Loan amortization calculator** — full amortization table, principal vs interest breakdown chart, downloadable schedule
3. **Investment return calculator** — DRIP option, dividend reinvestment, comparison chart
4. **Retirement savings calculator** — age-based projections, inflation-adjusted, milestone markers
5. **Debt payoff calculator** — snowball vs avalanche comparison, total interest saved visualization
6. **Savings goal calculator** — timeline visualization, reverse calculator ("how much per month?")

### Secondary Financial Calculators (6 — build second)

7. **Salary ↔ hourly converter** — overtime, tax withholding estimation, take-home pay
8. **Inflation calculator** — historical CPI data, purchasing power chart
9. **ROI calculator** — annualized return, total return, comparison mode
10. **Net worth calculator** — categorized assets/liabilities, visual breakdown
11. **Rent vs buy calculator** — total cost comparison over N years, break-even point
12. **Emergency fund calculator** — expense-based, 3/6/12 month targets

### Utility Tools (3 — build alongside)

13. **QR code generator** — high search volume, multiple format options, downloadable PNG/SVG
14. **Password generator** — customizable, strength meter, general audience
15. **JSON formatter/validator** — high search volume, syntax highlighting

---

## Build Order

### Sprint 1: Foundation + First 3 Calculators (Days 1-4)

**Infrastructure:**
- Scaffold Astro + TypeScript + Tailwind CSS v4 + React integration
- Design system: `ToolPageLayout.astro` (reusable wrapper for all tool pages)
- `CalculatorLayout` React component (shared input/result/chart pattern)
- Homepage with tool grid
- About page, privacy policy page, **affiliate disclosure page** (required for FTC compliance and ad network approval)
- SEO foundation: sitemap, robots.txt, structured data helpers
- Content collection schema for tool metadata (see Content Collection Schema in Technical Architecture section below)
- **Vitest setup** + unit tests for financial math functions (compound interest, amortization — financial math MUST be correct)
- **Affiliate disclosure component** (visible on every page with affiliate links)
- **Email capture component** ("Email me a PDF of my results" — soft opt-in, NOT gating results)
- **MailerLite integration** for email list (free tier: 500 subscribers, automations included — start with 1 universal 3-email drip. Upgrade to $10/mo Growing Business plan at 500+ subs)

**First 3 tools:**
1. Compound interest calculator
2. Loan amortization calculator
3. Savings goal calculator

**Why calculators first (not simple tools)?** The previous plan started with easy string tools to "validate the template." But those tools were cut. Starting with the core product (financial calculators) validates the actual value proposition — the chart/table/interactive output that makes these tools defensible.

### Sprint 2: More Calculators + Utility Tools (Days 5-8)

4. Investment return calculator
5. Retirement savings calculator
6. Debt payoff calculator
7. QR code generator
8. Password generator

### Sprint 3: Remaining Tools (Days 9-12)

9. Salary ↔ hourly converter
10. Inflation calculator
11. ROI calculator
12. Net worth calculator
13. Rent vs buy calculator
14. Emergency fund calculator
15. JSON formatter/validator

### Sprint 4: Polish + Monetization + Launch (Days 13-16)

- Educational content for all tools (500-1,000 words per financial calculator)
- FAQ sections with schema markup
- "Related calculators" internal linking
- Worked examples (2-3 per calculator)
- Contextual affiliate recommendations per tool (start with Betterment — no minimum requirements)
- **"Best X" comparison tables** on each financial calculator page (highest affiliate CTR placement)
- **PDF export** for calculator results (client-side, jsPDF — increases perceived value + email capture incentive)
- **Embeddable widget versions** of calculators (iframe-friendly layout + embed code generator page)
- Performance audit (Core Web Vitals)
- OG image generation
- Deploy to Cloudflare Pages

### Sprint 5: SEO, Share & Growth Setup (Days 17-20)

- Submit to Google Search Console
- Verify sitemap indexing
- Test all tools across browsers (Chrome, Firefox, Safari, mobile)
- **Set up MailerLite automation:** 1 universal 3-email drip sequence (free tier includes automations with branching logic)
- **Create first 10-20 programmatic scenario pages** (e.g., "Monthly payment on $300K mortgage at 7%") — with 500+ unique words each
- **Create 5-10 Pinterest infographic pins** for top calculators
- Share on Product Hunt
- Post on Reddit (r/personalfinance, r/financialindependence)
- Write Dev.to article about the build
- **Apply to Betterment affiliate program** (no traffic minimums)

**Total MVP timeline: ~4 weeks to deployed with 15 tools + growth infrastructure.** (5 sprints × 4 days = 20 working days)

---

## Technical Architecture (Astro)

### Why Astro, Not Next.js

| Factor | Next.js 15 (static export) | Astro |
|--------|---------------------------|-------|
| JS shipped for non-tool pages | Full React runtime (~80-150KB) | Zero |
| JS shipped for tool pages | React runtime + tool code | Only tool island code |
| Cloudflare Pages support | Legacy path (adapter deprecated Sep 2025) | First-class (Cloudflare owns Astro) |
| Features we'd use | ~10-20% | ~80%+ |
| Content management | Manual | Built-in content collections |
| Static site generation | Requires `output: export` config + workarounds | Default behavior |

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
│   │   ├── CalculatorLayout.tsx           # Shared input/result/chart layout for all calculators
│   │   ├── CompoundInterestCalc.tsx
│   │   ├── LoanAmortizationCalc.tsx
│   │   └── ...
│   └── /ui                                # Astro/HTML components
│       ├── ToolPageLayout.astro           # Reusable tool page wrapper
│       ├── Logo.astro                     # SVG wordmark logo component
│       ├── FaqSection.astro               # FAQ with schema markup
│       ├── RelatedTools.astro             # Related tools links
│       ├── AffiliateDisclosure.astro      # FTC disclosure component
│       ├── ComparisonTable.astro          # "Best X" affiliate comparison table
│       ├── EmailCapture.tsx               # "Email me my results" opt-in (React island)
│       └── EmbedCode.astro               # Embed code snippet for widgets
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
│   ├── Inter-VariableFont_opsz,wght.woff2  # Self-hosted Inter (variable weights)
│   ├── Inter-Bold.ttf                      # For Satori OG image generation
│   ├── Inter-Regular.ttf                   # For Satori OG image generation
│   └── JetBrainsMono-Regular.woff2         # JSON formatter tool
├── favicon.svg                             # SVG favicon with dark mode
├── favicon.ico                             # 32x32 ICO fallback
├── apple-touch-icon.png                    # 180x180 iOS bookmark
├── icon-192.png                            # Android/PWA manifest
├── icon-512.png                            # Android/PWA splash
└── manifest.webmanifest                    # PWA manifest
```

### Content Collection Schema

Define in `src/content.config.ts` (Astro 5+ Content Layer API):

```ts
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

> **Note:** Astro 5+ uses the Content Layer API (glob loader) instead of the legacy `type: 'content'`. Tool data files live in `src/data/tools/` and are loaded at build time.

The Markdown body of each tool file (in `src/data/tools/`) contains the educational content (500-1,000 words for financial, 200+ for utility).

### Component Pattern: Dynamic Route + React Island

The file structure uses dynamic routes (`[category]/[tool].astro`), not one file per tool. This means adding a new tool = adding a content file + a React component, with NO new page files.

```astro
<!-- /pages/tools/[category]/[tool].astro -->
---
import BaseLayout from '@layouts/BaseLayout.astro';
import ToolPageLayout from '@components/ui/ToolPageLayout.astro';
import { getCollection } from 'astro:content';

// Generate a page for every tool in the content collection
export async function getStaticPaths() {
  const tools = await getCollection('tools');
  return tools.map(tool => ({
    params: { category: tool.data.category, tool: tool.data.slug },
    props: { tool },
  }));
}

const { tool } = Astro.props;

// Dynamically import the correct React calculator component
const componentMap: Record<string, any> = {
  'compound-interest': () => import('@components/tools/CompoundInterestCalc.tsx'),
  'loan-amortization': () => import('@components/tools/LoanAmortizationCalc.tsx'),
  // ... one entry per tool
};
const ToolComponent = (await componentMap[tool.data.slug]()).default;
---
<BaseLayout title={`Free ${tool.data.name} Online`} description={tool.data.description}>
  <ToolPageLayout tool={tool}>
    <!-- React island: only this component ships JS -->
    <ToolComponent client:load />
  </ToolPageLayout>
</BaseLayout>
```

The surrounding page (layout, educational content, FAQ, related tools, structured data) is pure HTML — zero JavaScript. Only the interactive calculator hydrates.

> **Build notes:**
> - **Path aliases** (`@layouts/`, `@components/`) require `paths` config in `tsconfig.json`. Configure during scaffold.
> - **Dynamic imports + `client:load`**: Astro's `client:*` directives may require statically analyzable imports. If the `componentMap` pattern doesn't work at build time, fall back to conditional rendering: `{slug === 'compound-interest' && <CompoundInterestCalc client:load />}`. Test this early in Sprint 1.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Astro | Zero JS default, React islands, first-class CF Pages |
| Interactive tools | React via `client:load` | Best ecosystem for forms, charts, state |
| Charts | **recharts** (recommended) | React-native, tree-shakeable, no wrapper needed. Chart.js is lighter but needs react-chartjs-2 wrapper. |
| Rendering | Static (SSG) | Fastest, $0 server costs |
| Styling | Tailwind CSS v4 | Rapid development, small bundles |
| Hosting | Cloudflare Pages | Unlimited bandwidth, commercial use, edge delivery |
| Content | Astro content collections | Structured tool metadata + educational content |
| Testing | Vitest for calculator logic | Ensure financial math is correct |
| Accessibility | ARIA labels, keyboard nav, WCAG AA contrast | Financial tools used by broad audience incl. users with disabilities |

### Build Setup Notes

These are implementation details that prevent hesitation during Sprint 1:

- **Tailwind CSS v4 setup:** v4 uses CSS-based configuration, NOT a `tailwind.config.ts` file. Install `tailwindcss` + `@tailwindcss/vite`, add the Vite plugin to `astro.config.mjs`, and use `@import "tailwindcss"` in a global CSS file. Tailwind v4 auto-detects your content files.
- **MailerLite integration:** Static site uses MailerLite's embeddable form endpoint — no server/API key needed. Create a form in MailerLite's dashboard, get the form ID, submit via client-side POST to MailerLite's endpoint. Works on purely static sites.
- **OG images:** Use Satori (JSX → SVG) + `@resvg/resvg-js` (SVG → PNG) at build time. Generate one OG image per tool from a shared template (tool name + site branding). Or use `astro-og-canvas` for a simpler API.
- **Path aliases:** Configure in `tsconfig.json`: `"@components/*": ["src/components/*"]`, `"@layouts/*": ["src/layouts/*"]`, `"@lib/*": ["src/lib/*"]`
- **Programmatic scenario pages (Sprint 5):** Create at `/pages/scenarios/[scenario].astro` with a separate content collection for scenario data. Each scenario pre-fills a calculator and adds 500+ words of unique analysis.

---

## SEO Strategy (Focused)

### Niche Authority

Position as **the** free financial calculator resource. Every page reinforces financial expertise. Internal linking creates a tight topical cluster. This is what Google rewards in 2026 (depth over breadth).

### Per-Tool Page Structure

1. H1: Tool name with primary keyword
2. Interactive calculator (React island)
3. Results with charts, tables, downloadable output
4. "How to use this calculator" (200-300 words)
5. Educational content (500-1,000 words on the financial concept)
6. Worked examples (2-3 real scenarios)
7. FAQ (3-5 questions, FAQ schema)
8. Related calculators (4-6 internal links)
9. Contextual affiliate recommendation

### Per-Tool Page SEO

```
Title:       "Free [Tool Name] Online | CalcRun"
Description: "[Action verb] [what the tool does]. Free, fast, no signup required."
H1:          "[Tool Name]"
URL:         /tools/[category]/[tool-slug]
Schema:      WebApplication type
OG Image:    Auto-generated (tool name + branding)
```

---

## Monetization: Affiliates First

### From Day 1: Affiliate Links

Every financial calculator gets a contextual affiliate recommendation. See `strategy.md` (Per-calculator affiliate mapping) for the full 8-tool mapping. Key examples:
- Compound interest → high-yield savings accounts (Betterment, Marcus, Wealthfront)
- Loan amortization → loan comparison (LendingTree, SoFi)
- Retirement → investment platforms (Betterment, Vanguard)
- Debt payoff → debt consolidation (SoFi, LendingClub)
- Plus: investment return, savings goal, rent vs buy, password generator

### Month 6+: Consider Ezoic

Only after 50+ daily visitors consistently. Don't add ads that hurt Core Web Vitals while SEO equity is still building.

---

## Risk Mitigations

### Risk: Google AI Overviews Replace Calculator Queries

**Mitigation:** Our tools produce interactive charts, amortization tables, personalized projections, and downloadable output. AI Overviews can answer "what is compound interest?" but can't generate a personalized 30-year growth chart with your specific inputs.

### Risk: Slow SEO Traction (Google Sandbox)

**Mitigation:**
- Target long-tail queries ("compound interest calculator with monthly contributions" not just "compound interest calculator")
- Submit sitemap day one
- Embeddable calculator widgets = passive backlinks from finance bloggers
- Product Hunt + Reddit launch for initial traffic signal

### Risk: Cloudflare Pages Free Tier Limits

**Mitigation:** Unlimited bandwidth. 500 builds/month is more than enough. No risk here.

---

## What "Done" Looks Like

MVP is shipped when:
- [ ] 15 tools are live and functional
- [ ] All financial math functions have unit tests (Vitest) that pass
- [ ] All tool pages have educational content (500+ words for financial, 200+ for utility)
- [ ] FAQ sections with schema markup on all tools
- [ ] Affiliate links on all financial calculators with FTC disclosure
- [ ] "Best X" comparison tables on financial calculator pages
- [ ] Email capture ("Email me my results as PDF") on all calculators
- [ ] MailerLite integrated with 1 universal 3-email drip sequence (tags per calculator)
- [ ] Embeddable widget versions available with embed code generator
- [ ] Affiliate disclosure page + per-page disclosure component
- [ ] Homepage with tool grid and category filtering
- [ ] Sitemap.xml generated and valid
- [ ] robots.txt allows crawling
- [ ] About page, privacy policy, and disclosure page exist
- [ ] Schema.org WebApplication markup + FAQ schema on all tool pages
- [ ] `npm run build` succeeds with zero errors
- [ ] Core Web Vitals pass (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Mobile responsive
- [ ] Basic accessibility: ARIA labels on form inputs, keyboard navigation, WCAG AA color contrast
- [ ] Deployed to Cloudflare Pages
- [ ] Submitted to Google Search Console
- [ ] Applied to Betterment affiliate program

---

## Revenue Expectations (Honest)

| Timeline | Expected Revenue | Notes |
|---------|-----------------|-------|
| Months 1-6 | $0-$50/mo | Building SEO equity, in Google sandbox |
| Months 7-12 | $25-$250/mo | First affiliate conversions, maybe Ezoic |
| Months 12-18 | $100-$660/mo | Growing organic traffic |
| Months 18-24 | $300-$1,400/mo | Established authority |
| Year 3+ | $750-$4,500/mo | If things go well |

**Year 1 total: $0-$500.** This project is a long-term bet on compounding SEO value, not a quick win.

See `financial-model.md` for detailed revenue breakdowns by source.

---

## Adaptation Triggers

See `strategy.md` and `financial-model.md` for the full adaptation trigger tables. The site costs $0 to operate — we never abandon, we adapt.
