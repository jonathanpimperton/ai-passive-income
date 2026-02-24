# CalcRun Build Spec

> Single source of truth for building CalcRun. Consolidated from strategy + plan-optimization docs.
> For design details (colors, typography, layout, UI patterns), see `design-system.md`.

---

## What We're Building

A focused financial calculator site called **CalcRun** (`calcrun.com`).

- **Astro** + Tailwind CSS v4 + React islands on Cloudflare Pages (free tier)
- **18 MVP tools** (14 financial calculators + 4 utility tools)
- **Affiliate-first monetization** (not ad-dependent)
- **Deep educational content** per tool for E-E-A-T and topical authority
- **Email capture** ("email me my results") on financial calculators → automated drip → affiliate conversions

### Why Financial Niche

| Factor | Financial | Generic multi-category |
|--------|-----------|----------------------|
| Affiliate potential | $50-$500/conversion | $5-$50 mixed |
| AI Overview defensibility | Charts, tables, projections can't be text snippets | Simple tools already answered in SERP |
| Topical authority | Deep in one domain = Google trusts it | Thin across many = Google ignores it |
| Audience intent | High commercial intent | Mixed |

### Market Context

The financial calculator space is large and proven:

| Competitor | Monthly Traffic (Est.) | Domain Age | Revenue Model |
|------------|----------------------|------------|---------------|
| Calculator.net | 80-100M visits | 20+ years | Display ads |
| Omni Calculator | 23-30M visits | 8+ years | Display ads, API licensing |
| NerdWallet | 20-30M visits | 15+ years | Affiliate, lead gen |
| Bankrate | 15-20M visits | 25+ years | Affiliate, display ads |
| SmartAsset | 10-15M visits | 12+ years | Lead gen (sells to advisors) |

**Adjacent market — file converters:** The file converter space is even larger. iLovePDF (~220M visits/mo), Smallpdf (~37-56M visits/mo), Convertio (~25M visits/mo), and FreeConvert (~21M visits/mo) dominate. Almost all require server uploads — a privacy gap we can exploit with client-side converters. See Phase 2 Expansion below.

**Our realistic slice:** A new site capturing 0.001%-0.01% of this traffic = 3,000-30,000 monthly visits in year 2. This aligns with our revenue projections. We don't need to "beat" any competitor — we need to rank for a handful of long-tail keywords that collectively bring enough traffic to sustain affiliate conversions.

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
| **Calculator.net** | Dated 2010-era design, no real-time results (requires submit button + page reload), no educational content, basic output, 120-row unfiltered tables, no mobile-first design, ad-heavy | Modern UI, real-time results (no submit button), interactive charts, educational content, PDF export, mobile-first, zero ads |
| **Bankrate** | Buried in display ads, slow load, content pushed below fold | Zero ads at launch, fast Astro SSG, clean layout |
| **NerdWallet** | Account wall on some features, lead-gen focused, data harvested | No accounts, no data harvesting, results always free |
| **SmartAsset** | "Talk to a financial advisor" form gates results, sells your data to advisors | Results always visible, email capture is optional and clearly labeled |
| **Omni Calculator** | Good content but clinical/academic tone, no affiliate recommendations | Approachable tone, actionable next steps, "here's what to do with these numbers" |
| **Spreadsheets** | Requires setup, no visuals, not shareable, easy to make formula errors | Zero setup, interactive charts, PDF export, pre-built with correct math |

### Lessons from Calculator.net (Market Leader Analysis)

Calculator.net is the category king (~100M visits/mo, 20+ years). Studying their approach reveals both patterns to adopt and gaps to exploit:

**What they do well (adopt):**
- **"Solve for X" multi-tab pattern:** Their investment calculator lets users pick which variable to solve for (end amount, contribution, return rate, starting amount, time). This turns one calculator into 5 use cases. Adopt for investment + retirement calculators.
- **Comprehensive amortization tables:** Month-by-month breakdowns with deposits, interest, and running balances. Users love this granularity.
- **9 compounding frequency options:** Annually through continuously, plus beginning/end-of-period contribution timing.
- **Deep educational content:** 1,000+ words per calculator with formulas, worked examples, historical context. This is the E-E-A-T play that validates our content strategy.
- **Internal linking network:** Every calculator links to 5-6 related calculators, creating an internal link web. With only 18 tools, our related tools section is even more critical.

**Where they're weak (exploit):**
- **No real-time results** — submit button + page reload. CalcRun updates instantly as you drag a slider. This is our single biggest UX differentiator.
- **Ad-heavy, cluttered layout** — multiple 300x250 display ads throughout. Our "no ads" positioning directly attacks this.
- **Dated design** — looks like 2010. No hover effects, no animations, no visual hierarchy, no sliders. CalcRun's modern design is a generational leap.
- **No mobile-first thinking** — tables and layouts don't adapt to mobile.
- **No scenario comparison** — can't save and compare two sets of inputs.
- **No email/export** — no "email me this" or PDF download. This is our email capture mechanism.
- **No affiliate context** — pure ad monetization. They never say "here are the best accounts for this rate." Our comparison tables fill this gap.

---

## Value Proposition & Competitive Positioning

### Value Proposition

**For people making financial decisions** who need clarity on the numbers,
**CalcRun** provides **free, instant, no-signup financial calculators** with interactive charts and plain-English explanations —
**unlike NerdWallet and SmartAsset**, which gate results behind account forms and sell your data to financial advisors.

### One-Line USP

> **"See your numbers instantly — no signup, no ads, no data harvesting."**

This is the copy direction for the homepage hero, meta descriptions, and social sharing. It directly attacks the three biggest pain points with competitors.

### Competitive Positioning Map

```
                    Deep Content / Education
                            ▲
                            │
              NerdWallet ●  │  ● CalcRun (us)
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
| Month 6-12 | Backlinks from embeds | Embeddable widgets with "Powered by CalcRun" generate passive backlinks |
| Year 1+ | Domain authority | Accumulated SEO equity, indexed pages, backlink profile |
| Year 2+ | Brand recognition | Direct traffic from bookmarks and word-of-mouth |

**The email list is the real moat.** Google can change algorithms, AI Overviews can eat traffic, but an email list is an owned channel. This is why email capture is on every financial calculator from day 1. (Not on utility tools — a QR code or formatted JSON isn't something you email yourself.)

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
| **Return visits** | User bookmarks CalcRun, returns for other calculators | Month 3+ |
| **Related tool clicks** | "Related Calculators" section drives 2-3 pages/session | Launch |
| **Comparison table clicks** | "Best High-Yield Savings Accounts" table on calculator pages | Launch |
| **Shared results** | User emails PDF to spouse/friend, friend visits site | Month 1+ |
| **Embedded widgets** | Finance blogger embeds our calculator, readers click through | Month 6+ |

---

## MVP: 18 Tools

### Core Financial Calculators (6 — build first, Sprint 1-2)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 1 | **Compound Interest Calculator** | Interactive chart, compounding frequency toggle (9 options: annually–continuously), **contribution timing** (beginning/end of period), exportable results, **collapsible year-group schedule table** | saving-and-growth | "Open a high-yield savings account" → Betterment, Marcus, Wealthfront |
| 2 | **Loan Amortization Calculator** | Full amortization table (**collapsible year groups**, not 120+ raw rows), principal vs interest chart, downloadable schedule | debt-and-loans | "Compare loan rates" → LendingTree, SoFi |
| 3 | **Investment Return Calculator** | DRIP option, dividend reinvestment, comparison chart, **"Solve for X" tabs** (end amount / contribution / return rate / starting amount / time) | saving-and-growth | "Start investing" → Betterment, Wealthfront |
| 4 | **Retirement Savings Calculator** | Age-based projections, inflation-adjusted, milestone markers, **"Solve for X" tabs** (retirement age / monthly savings / target amount) | income-and-planning | "Open a retirement account" → Betterment, Vanguard |
| 5 | **Debt Payoff Calculator** | Snowball vs avalanche comparison, total interest saved | debt-and-loans | "Consolidate your debt" → SoFi, LendingClub |
| 6 | **Savings Goal Calculator** | Timeline visualization, reverse calculator ("how much per month?") | saving-and-growth | "High-yield savings" → Marcus, Ally |

### Secondary Financial Calculators (8 — Sprint 3)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 7 | **US Salary & Take-Home Calculator** | Federal + state taxes, FICA, 401(k), filing status, overtime, salary-to-hourly | income-and-planning | None |
| 8 | **UK Salary & Take-Home Calculator** | Income Tax bands (incl. Scottish rates), National Insurance, student loan plans (1/2/4/5/PG), pension auto-enrolment, salary sacrifice, 60% tax trap | income-and-planning | None |
| 9 | **Mortgage Payment Calculator** | Monthly P&I, PITI breakdown, extra payment impact, 15 vs 30-year comparison, amortization schedule | debt-and-loans | "Compare mortgage rates" → LendingTree, SoFi |
| 10 | **Inflation Calculator** | Historical CPI data, purchasing power chart | economic | None |
| 11 | **ROI Calculator** | Annualized return, total return, comparison mode | saving-and-growth | None |
| 12 | **Net Worth Calculator** | Categorized assets/liabilities, visual breakdown | income-and-planning | None |
| 13 | **Rent vs Buy Calculator** | Total cost comparison over N years, break-even point | debt-and-loans | "Get pre-approved" → LendingTree |
| 14 | **Emergency Fund Calculator** | Expense-based, 3/6/12 month targets | income-and-planning | None |

### Utility Tools (4 — Sprint 2-3)

| # | Tool | Key Features | Category | Affiliate Context |
|---|------|-------------|----------|-------------------|
| 15 | **QR Code Generator** | Multiple format options, downloadable PNG/SVG | utility | None |
| 16 | **Password Generator** | Customizable, strength meter | utility | "Use a password manager" → 1Password, NordPass |
| 17 | **Percentage Calculator** | What is X% of Y, percentage change, percentage difference, reverse percentage | utility | None |
| 18 | **JSON Formatter/Validator** | Syntax highlighting | utility | None |

**Why include utility tools despite the financial niche focus?** These 4 tools are a calculated trade-off against topical authority. QR code, password generator, and percentage calculator have very high search volumes with low competition — they bring traffic that may discover financial tools via the homepage and navigation. Password generator has affiliate potential (1Password, NordPass). Percentage calculator is the highest-traffic simple calculator keyword and serves as a top-of-funnel entry point. They're fast to build (1-2 days total) so the cost is low. If after 6 months they show no crossover traffic to financial tools, consider removing them to tighten topical authority. JSON formatter is the weakest fit (developer audience, high ad-blocker rate) — build it last, cut it first if needed.

**No affiliate context (by design):** US/UK salary, inflation, ROI, emergency fund, net worth, QR code, percentage calculator, JSON formatter. Don't force it — forced recommendations hurt trust.

**Post-MVP expansion (financial calculators):** Credit card payoff, auto loan, college savings (529), tax bracket, budget (50/30/20), down payment, break-even, profit margin calculators. Note: 529 and budget tools serve new segments (parents, young savers) that strengthen existing audience. Break-even and profit margin serve small business — a potential new segment, but one with strong affiliate potential (invoicing, accounting SaaS). Evaluate based on search demand data at the time.

---

## Phase 2 Expansion: Client-Side File Converters (Post-Launch)

### Strategic Rationale

File converters are a **traffic acquisition strategy**, not a rebranding. CalcRun's identity, messaging, and revenue model remain anchored in financial calculators. Converters serve three purposes:

1. **Traffic volume** — File conversion queries (image compress, HEIC to JPG, PNG to JPG) get 10-100x more searches than financial calculator queries. This traffic builds domain authority that lifts financial calculator rankings.
2. **Cross-promotion funnel** — Every converter page prominently links to financial calculators. A percentage of converter visitors discover and use the higher-value tools.
3. **Privacy differentiation** — Every major competitor (iLovePDF ~220M visits/mo, Smallpdf ~56M, Convertio ~25M) uploads files to servers. CalcRun processes everything client-side. "Your files never leave your device" is a genuine competitive advantage.

**What this is NOT:** A pivot, a rebrand, or an equal product line. The homepage hero stays financial. The tagline stays financial. Financial calculators remain the primary navigation category. Converters live in a secondary "File Tools" category. If converters show no cross-traffic to financial tools after 6 months, evaluate cutting them.

### Phase 2 Tools: Client-Side File Converters (8 tools)

Build after the 18 MVP tools are live and generating organic traffic (Month 4-6+).

**Tier A — Build first (zero/tiny bundle, high traffic, easy wins):**

| # | Tool | Library | Bundle Size | Category |
|---|------|---------|------------|----------|
| 16 | **Image Compressor** | Canvas API + compressorjs | 3.5 KB | file-tools |
| 17 | **Image Resizer** | Canvas API (native) | 0 KB | file-tools |
| 18 | **Image Format Converter** (PNG↔JPG, WebP↔JPG, etc.) | Canvas API (native) | 0 KB | file-tools |
| 19 | **SVG to PNG Converter** | Canvas API (native) | 0 KB | file-tools |

**Tier B — Build second (small-medium bundle, high value):**

| # | Tool | Library | Bundle Size | Category |
|---|------|---------|------------|----------|
| 20 | **HEIC to JPG Converter** | heic-to (libheif WASM) | ~1.15 MB (lazy) | file-tools |
| 21 | **CSV ↔ JSON Converter** | PapaParse | ~20 KB | file-tools |

**Tier C — Build third (moderate traffic, developer audience):**

| # | Tool | Library | Bundle Size | Category |
|---|------|---------|------------|----------|
| 22 | **Markdown ↔ HTML Converter** | marked | ~12 KB | file-tools |
| 23 | **Images to PDF** | jsPDF (already in project) | 0 KB (reuse) | file-tools |

### What NOT to Build (Server Required)

| Converter | Why Not |
|-----------|---------|
| PDF to Word | Requires OCR + layout reconstruction — server-only |
| PDF to Excel | Requires table extraction AI — server-only |
| MP4 to MP3 / video converters | ffmpeg.wasm is 22 MB WASM, 2x slower than native, needs COOP/COEP headers, kills Core Web Vitals |
| Word to PDF | Mammoth.js converts .docx to HTML only, not faithful PDF rendering |
| Excel parsing | SheetJS is 7.5 MB unpacked — too heavy |

### File Converter Technical Requirements

- **All processing client-side** — files never leave the browser. Zero server infrastructure.
- **Lazy loading mandatory** — all WASM/library code loaded via dynamic import on user interaction (file drop or button click), not on page load. Protects Core Web Vitals.
- **Privacy badge** on every converter page: "100% Private — Your files never leave your device."
- **Batch support** where feasible (image compress, image format convert).
- **Drag-and-drop upload** with progress indicator.
- **Consistent UI** — same two-column layout as calculators (settings left, output/preview right).
- **Cross-promotion** — "Related Tools" section on converters links prominently to financial calculators.
- **SEO targeting** — target privacy-modified long-tails first: "compress image without uploading," "convert HEIC to JPG privately," "PNG to JPG no upload." Lower KD than head terms, aligned with our positioning.

### File Converter Monetization (Honest Assessment)

File converters have weaker affiliate opportunities than financial calculators:

| Affiliate Angle | Commission | Natural Fit |
|----------------|-----------|-------------|
| NordVPN / NordPass | Up to 100% (1-mo), 40% (longer), 30% recurring | Strong — privacy branding aligns perfectly |
| Cloud storage (iDrive, Dropbox) | $5-50/signup | Moderate — "store your converted files securely" |
| PDF software (PDFelement, PDF Expert) | $10-50/sale | Moderate — for PDF converter users |
| Adobe Creative Cloud | Subscription commission | Weak — users chose free tools to avoid Adobe |

**Revenue expectation:** Converters are high-traffic, low-RPM. Each visitor is worth 5-10x less than a financial calculator visitor. The value is in domain authority boost and cross-promotion, not direct converter revenue.

---

## Build Order

### Sprint 1: Foundation + First 3 Calculators (Days 1-4)

**Infrastructure:**
- Scaffold Astro + TypeScript + Tailwind CSS v4 + React
- Design system: `ToolPageLayout.astro`, `CalculatorLayout.tsx`, `Logo.astro`
- Homepage with tool grid
- Static pages: about, privacy, affiliate disclosure, terms of use
- Cookie consent banner component (conditionally load Google Analytics)
- SEO: sitemap, robots.txt, structured data helpers
- Content collection schema (see Technical Architecture below)
- Vitest + unit tests for financial math functions
- Affiliate disclosure component
- Email capture component + MailerLite integration
- Download and self-host Inter font + set up Tailwind `@theme` tokens

**First 3 tools:** Compound interest, Loan amortization, Savings goal

### Sprint 2: More Calculators + Utility Tools (Days 5-8)

Investment return, Retirement savings, Debt payoff, QR code generator, Password generator

### Sprint 3: Remaining Tools (Days 9-12)

US Salary & Take-Home, UK Salary & Take-Home, Mortgage Payment, Inflation, ROI, Net worth, Rent vs buy, Emergency fund, Percentage calculator, JSON formatter

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
- Set up MailerLite automation: 1 universal 3-email drip (tag by calculator, conditional content)
- Create first 10-20 programmatic scenario pages (500+ unique words each)
- Create 5-10 Pinterest infographic pins
- Share: Product Hunt, Reddit (r/personalfinance, r/financialindependence), Dev.to article
- Apply to Betterment affiliate program

**Total: ~4 weeks** (5 sprints × 4 days = 20 working days)

> **Timeline is aspirational.** Sprint 4 (polish + monetization + launch) packs educational content, FAQ sections, worked examples, comparison tables, PDF export, embeddable widgets, OG images, AND performance audit into 4 days. If timeline slips, ship in two waves: **Wave 1** (Sprints 1-3) — 18 tools live with basic educational content. **Wave 2** (Sprints 4-5) — deep content, embeds, programmatic pages, polish. Prioritize getting the 6 core financial calculators to production quality over getting all 18 tools to draft quality.

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
│   ├── terms.astro                        # Terms of use (not financial advice, disclaimers)
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
│       ├── CookieConsent.tsx             # Cookie consent banner (React island)
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
| Charts | recharts | React-native, no wrapper needed. ~40KB gzip — test CWV impact on first calculator before committing to all 18. If too heavy, consider Lightweight Charts by TradingView (~40KB but Canvas-based, faster rendering) or hand-rolled SVG for simpler charts. |
| Icons | Lucide React | Free, MIT, consistent 24px line style |
| Styling | Tailwind CSS v4 | CSS-based config, rapid development, small bundles |
| Hosting | Cloudflare Pages (free) | Unlimited bandwidth, commercial use, edge delivery |
| Content | Astro content collections | Structured tool metadata + educational content |
| Testing | Vitest | Ensure financial math is correct |
| PDF export | jsPDF (client-side) | No server needed |
| OG images | Satori + Sharp/resvg-js | Build-time generation, zero runtime cost |
| Email | MailerLite free tier | 500 subs, automations included, client-side form POST |

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
    category: z.enum(['saving-and-growth', 'debt-and-loans', 'income-and-planning', 'economic', 'utility', 'file-tools']),
    description: z.string(),                    // SEO meta description
    keywords: z.array(z.string()),              // Target keywords
    relatedTools: z.array(z.string()),          // Slugs of 4-6 related tools
    affiliateContext: z.string().optional(),     // "Open a high-yield savings account"
    affiliatePrograms: z.array(z.string()).optional(), // ["Betterment", "Marcus"]
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
    workedExamples: z.array(z.object({      // Optional — financial calculators have 2-3,
      title: z.string(),                    // utility tools can omit
      inputs: z.record(z.string(), z.union([z.string(), z.number()])),
      description: z.string(),
    })).optional(),
  }),
});

export const collections = { tools };
```

Markdown body of each tool file = educational content (500-1,000 words financial, 200+ utility).

### Educational Content Quality Guidelines

| Guideline | Standard |
|-----------|----------|
| **Reading level** | Grade 8-10 (Flesch-Kincaid). Most users are financially literate enough to search for calculators but not experts. Avoid jargon; when unavoidable (APR, amortization, CAGR), define it inline on first use. |
| **Structure** | Every financial tool's content follows: (1) What is [concept]? (2) How does it work? (3) When/why should you use this calculator? (4) Key terms explained. (5) Common mistakes to avoid. |
| **E-E-A-T signals** | Cite formulas used ("We calculate compound interest using A = P(1 + r/n)^(nt)"). Link to authoritative sources (Federal Reserve, SEC, IRS) where relevant. Show calculation methodology is transparent. Include "last updated" date. |
| **Originality** | All content must be original — no scraped or paraphrased content from competitors. The educational angle should add value beyond what the calculator itself shows (e.g., "Here's what most people miss about compound interest: the first 10 years feel slow, but years 20-30 are where the real growth happens"). |
| **Actionable framing** | End each section with "what to do next" — not financial advice, but practical next steps: "Now that you've seen your numbers, here are three things to consider." This bridges the educational content to the affiliate recommendations without being pushy. |
| **Tone** | Second person ("your savings," "your monthly payment"). Trustworthy but approachable — explain like a knowledgeable friend, not a textbook. See design-system.md Brand Voice for full guidelines. |

### Component Pattern: Dynamic Route + React Island

```astro
<!-- /pages/tools/[category]/[tool].astro -->
---
import BaseLayout from '@layouts/BaseLayout.astro';
import ToolPageLayout from '@components/ui/ToolPageLayout.astro';
import { getCollection } from 'astro:content';

// All tool components must be statically imported — Astro requires
// direct imports for client:* hydration directives to work.
import CompoundInterestCalc from '@components/tools/CompoundInterestCalc.tsx';
import LoanAmortizationCalc from '@components/tools/LoanAmortizationCalc.tsx';
import InvestmentReturnCalc from '@components/tools/InvestmentReturnCalc.tsx';
import RetirementSavingsCalc from '@components/tools/RetirementSavingsCalc.tsx';
import DebtPayoffCalc from '@components/tools/DebtPayoffCalc.tsx';
import SavingsGoalCalc from '@components/tools/SavingsGoalCalc.tsx';
import SalaryCalc from '@components/tools/SalaryCalc.tsx';
import SalaryUkCalc from '@components/tools/SalaryUkCalc.tsx';
import MortgagePaymentCalc from '@components/tools/MortgagePaymentCalc.tsx';
import InflationCalc from '@components/tools/InflationCalc.tsx';
import RoiCalc from '@components/tools/RoiCalc.tsx';
import NetWorthCalc from '@components/tools/NetWorthCalc.tsx';
import RentVsBuyCalc from '@components/tools/RentVsBuyCalc.tsx';
import EmergencyFundCalc from '@components/tools/EmergencyFundCalc.tsx';
import QrCodeGenerator from '@components/tools/QrCodeGenerator.tsx';
import PasswordGenerator from '@components/tools/PasswordGenerator.tsx';
import PercentageCalculator from '@components/tools/PercentageCalculator.tsx';
import JsonFormatter from '@components/tools/JsonFormatter.tsx';

export async function getStaticPaths() {
  const tools = await getCollection('tools');
  return tools.map(tool => ({
    params: { category: tool.data.category, tool: tool.data.slug },
    props: { tool },
  }));
}

const { tool } = Astro.props;
const slug = tool.data.slug;
---
<BaseLayout title={`Free ${tool.data.name} Online`} description={tool.data.description}>
  <ToolPageLayout tool={tool}>
    {slug === 'compound-interest' && <CompoundInterestCalc client:load />}
    {slug === 'loan-amortization' && <LoanAmortizationCalc client:load />}
    {slug === 'investment-return' && <InvestmentReturnCalc client:load />}
    {slug === 'retirement-savings' && <RetirementSavingsCalc client:load />}
    {slug === 'debt-payoff' && <DebtPayoffCalc client:load />}
    {slug === 'savings-goal' && <SavingsGoalCalc client:load />}
    {slug === 'salary-us' && <SalaryCalc client:load />}
    {slug === 'salary-uk' && <SalaryUkCalc client:load />}
    {slug === 'mortgage-payment' && <MortgagePaymentCalc client:load />}
    {slug === 'inflation' && <InflationCalc client:load />}
    {slug === 'roi' && <RoiCalc client:load />}
    {slug === 'net-worth' && <NetWorthCalc client:load />}
    {slug === 'rent-vs-buy' && <RentVsBuyCalc client:load />}
    {slug === 'emergency-fund' && <EmergencyFundCalc client:load />}
    {slug === 'qr-code' && <QrCodeGenerator client:load />}
    {slug === 'password-generator' && <PasswordGenerator client:load />}
    {slug === 'percentage-calculator' && <PercentageCalculator client:load />}
    {slug === 'json-formatter' && <JsonFormatter client:load />}
  </ToolPageLayout>
</BaseLayout>
```

> **Why explicit imports instead of a dynamic `componentMap`?** Astro's `client:*` hydration directives only work on statically imported components. Dynamic imports resolved at runtime cannot receive `client:load` — the Astro compiler needs to know at build time which components are islands. This is verbose but it's the only pattern that works. See [Astro Islands docs](https://docs.astro.build/en/concepts/islands/) and [Issue #11701](https://github.com/withastro/astro/issues/11701).

### Build Setup Notes (Sprint 1)

- **Tailwind CSS v4:** Uses CSS-based config, NOT `tailwind.config.ts`. Install `tailwindcss` + `@tailwindcss/vite`, add Vite plugin to `astro.config.mjs`, use `@import "tailwindcss"` in global CSS. Auto-detects content files.
- **MailerLite integration:** Static site uses MailerLite's embeddable form endpoint — no server/API key needed. Create form in MailerLite dashboard, get form ID, submit via client-side POST.
- **Path aliases:** Configure in `tsconfig.json`: `"@components/*": ["src/components/*"]`, `"@layouts/*": ["src/layouts/*"]`, `"@lib/*": ["src/lib/*"]`
- **Programmatic pages (Sprint 5):** `/pages/scenarios/[scenario].astro` with separate content collection. Each pre-fills a calculator + 500+ words unique analysis.

### Build Risks to Manage

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **recharts bundle size (~40KB gzip per page)** | Each calculator island ships ~90-100KB JS total (React + recharts + component). Could push INP > 200ms on slow devices. | Build compound interest calc first, deploy preview, run Lighthouse on mid-range phone. If CWV fails, switch charting library before building remaining tools. Limit chart data points (yearly, not monthly, for long horizons). |
| **Educational content quality** | Google's 2024-2026 core updates: 87% negative impact on mass-produced AI content without expert oversight. Educational content is the SEO differentiator — if rushed, it reads generic and Google ignores it. | Write core 6 calculator content with care. Each piece must answer: "What does this tell the user that the calculator alone doesn't?" Reference verifiable formulas, authoritative sources (Fed, SEC, IRS), and genuinely unique insights. Start secondary calculators with shorter content (200-300 words), expand post-launch. |
| **MailerLite 500 subscriber cap** | Free tier locks sending at 500 subs. Expected to hit around month 3-6. | Upgrade to Growing Business plan ($10/mo) when approaching 500. By month 3-6, early affiliate revenue should cover this. Budget $10/mo as the first unavoidable cost (alongside ~$10/yr for domain). |

---

## SEO Strategy

### Per-Tool Page Structure

```
Title:       "Free [Tool Name] Online | CalcRun"
Description: "[Action verb] [what the tool does]. Free, instant, no signup — no ads or data harvesting."
H1:          "[Tool Name]"
URL:         /tools/[category]/[tool-slug]
Schema:      WebApplication type + FAQ schema
OG Image:    Auto-generated (tool name + CalcRun branding)
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
- Product Hunt launch (once 18 tools live)
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
1. **Email capture** — "Email me a PDF of my results" on all 12 financial calculators (not utility tools — emailing a password is a security anti-pattern, QR codes are downloadable images, JSON is copy/paste). MailerLite free tier (500 subs, automations included; upgrade to $10/mo Growing Business plan at 500+ subs). 3-email drip: results PDF → educational content → affiliate recommendation. Email list is the insurance policy against Google algorithm changes.
2. **Embeddable widgets** — iframe versions with "Powered by CalcRun" backlink. Omni Calculator got 564K+ backlinks this way.
3. **"Best X" comparison tables** — on every financial calculator page. Highest affiliate CTR placement.

**MEDIUM priority:**
4. **Programmatic scenario pages** — pre-filled calculators for long-tail queries ("monthly payment on $300K mortgage at 7%"). Launch with 10-20 (Sprint 5), scale to 50-100 during Phase 2 growth. 500+ unique words each. 60% of programmatic SEO fails — do carefully.
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
| US Salary & Take-Home | salary to hourly calculator, US take-home pay calculator | annual salary calculator, hourly to salary, overtime calculator, US paycheck calculator, net pay calculator |
| UK Salary & Take-Home | UK salary calculator, UK take-home pay calculator | UK tax calculator, PAYE calculator, National Insurance calculator, student loan repayment calculator UK, salary after tax UK |
| Mortgage Payment | mortgage calculator, mortgage payment calculator | home loan calculator, monthly mortgage payment, how much house can I afford, mortgage amortization, mortgage interest calculator |
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
| Percentage Calculator | percentage calculator, percent calculator | what is X percent of Y, percentage change calculator, percent increase calculator, percentage difference calculator |
| JSON Formatter | JSON formatter, JSON beautifier | JSON validator, format JSON online, JSON pretty print |

### File Converter Tools (Phase 2)

| Tool | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| Image Compressor | compress image online, image compressor | reduce image size, compress JPG, compress PNG without losing quality |
| Image Resizer | resize image online, image resizer | resize image for Instagram, resize photo, bulk image resize |
| Image Format Converter | PNG to JPG, JPG to PNG, WebP to JPG | convert image format online, WebP to PNG, image converter |
| SVG to PNG | SVG to PNG converter, convert SVG to PNG | SVG to JPG, SVG to image online |
| HEIC to JPG | HEIC to JPG converter, convert HEIC to JPG | HEIC to PNG, iPhone photo converter, HEIC converter no upload |
| CSV to JSON | CSV to JSON converter, JSON to CSV | convert CSV to JSON online, CSV to JSON online free |
| Markdown to HTML | Markdown to HTML converter | Markdown preview online, convert Markdown to HTML |
| Images to PDF | JPG to PDF, PNG to PDF | combine images to PDF, image to PDF converter |

**Privacy-first long-tail targets** (lower KD, aligned with CalcRun's positioning):
- "compress image without uploading"
- "convert HEIC to JPG privately"
- "PNG to JPG no upload"
- "image converter no server"
- "offline image compressor online"

### Keyword Strategy Notes

- **Title tag formula:** "Free [Primary Keyword] Online | CalcRun"
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
| Email signups this week | MailerLite dashboard | Consistent flow; zero = problem |
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
| Tools indexed in Google | 18/18 | 26/26+ (18 MVP + 8 converters) | 30+ |

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
| File converters show zero cross-traffic to financial tools | Month 10 (6 months post-converter launch) | Cut converters to tighten topical authority, or keep only if they build domain authority measurably |
| Google algorithm wipes rankings | Any | Email list is insurance. Lean into Pinterest, Reddit, direct traffic. |

---

## Post-Launch Operations

### Weekly (30 minutes)

| Task | Tool | Purpose |
|------|------|---------|
| Check Search Console for crawl errors | Google Search Console | Catch indexing issues early |
| Review new email signups + bounce rate | MailerLite dashboard | Ensure email capture is working |
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
| 18 MVP tools live with educational content | 18 pages | Core product |
| 10-20 programmatic scenario pages | 10-20 pages | Long-tail keyword capture |
| Submit to Google Search Console | 1 | Start indexing |
| Product Hunt launch | 1 | Initial traffic spike + backlinks |
| Reddit posts (r/personalfinance, r/financialindependence) | 3-5 | Referral traffic, genuinely helpful not spammy |
| Dev.to article ("How I Built a Financial Calculator Site with Astro") | 1 | Developer audience, backlink |

### Phase 2: Growth (Month 4-6)

**Goal:** Expand keyword footprint, build backlinks, add file converter traffic funnel.

| Action | Volume | Purpose |
|--------|--------|---------|
| Add 5-10 new calculators from post-MVP list | 5-10 tools | More keyword targets |
| **Build Tier A file converters** (image compress, resize, format convert, SVG to PNG) | 4 tools | High-traffic keywords, zero bundle cost, builds domain authority |
| **Build Tier B file converters** (HEIC to JPG, CSV↔JSON) | 2 tools | Growing search queries, privacy differentiation |
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
| **Clear statement** | "CalcRun earns commissions from some links on this site. This helps us keep the tools free." |
| **What it means for users** | "You pay nothing extra. The products cost the same whether you use our link or go directly." |
| **How we choose recommendations** | "We only recommend products we've researched. Affiliate relationships don't influence our calculator results — the math is the math." |
| **List of affiliate relationships** | Name each program (Betterment, LendingTree, SoFi, etc.) with a brief description. Update as programs are added. |
| **Not financial advice** | "CalcRun provides educational tools and information, not personalized financial advice. Consult a qualified financial advisor for decisions specific to your situation." |

### Terms of Use (`/terms`) — keep simple

| Section | Content |
|---------|---------|
| **Calculator accuracy** | "Results are estimates based on the inputs you provide. Actual results may vary. We test our math rigorously but cannot guarantee accuracy for your specific situation." |
| **Not financial advice** | "CalcRun is an educational tool, not a financial advisor. We don't know your full financial picture." |
| **Use at your own risk** | Standard disclaimer — no liability for decisions made based on calculator results. |
| **Intellectual property** | Calculator code and content are copyrighted. Embeddable widgets are provided under fair use with required attribution ("Powered by CalcRun"). |

### Cookie Consent

- **Required for EU visitors** if using Google Analytics
- Simple banner: "We use cookies for analytics to improve the site. [Accept] [Decline]"
- If declined, don't load Google Analytics script
- Use a lightweight cookie consent solution (cookie-consent-banner or build a simple one — no heavy third-party scripts)
- Store consent preference in localStorage (not a cookie, ironically)

---

## About Page (`/about`)

The About page is a trust signal. For an AI-built project, honesty is critical — don't fabricate a team.

### What to Say

| Section | Content Direction |
|---------|------------------|
| **Mission** | "CalcRun exists to make financial math simple. Every calculator is free, instant, and private — we never ask for your data or bury results behind signup forms." |
| **What we do** | "We build free financial calculators with clear explanations, interactive charts, and downloadable results. Our tools help you see your numbers so you can make informed decisions." |
| **How we're different** | Reference USP: no signup walls, no data harvesting, no ad clutter. "Other financial sites gate results behind forms or sell your info to financial advisors. We don't." |
| **How we make money** | Be transparent: "We earn commissions when you click affiliate links to financial products. This costs you nothing extra and helps keep our tools free. We never recommend a product to earn a commission — see our [disclosure](/disclosure)." |
| **What we don't do** | "We don't provide personalized financial advice. We build tools that help you understand the math. For advice tailored to your situation, consult a qualified financial advisor." |

### What NOT to Say

- Don't say "our team of financial experts" — there is no team
- Don't say "AI-powered" or "built by AI" — NNGroup research shows this hurts credibility for straightforward tools
- Don't invent team member bios or stock photos of people
- Use "we" (the brand, CalcRun) not "I" — brands can speak in plural

### Tone

Mission-focused, not personality-focused. The About page is about what CalcRun does for users, not about who's behind it. This is standard for tool sites (Calculator.net, Omni Calculator, and most tool sites don't have "team" pages).

---

## Email Drip Sequence Detail

### Structure: 1 Universal Drip, Segment-Aware via Tags

MailerLite free tier includes automation workflows with branching logic. The drip is a single 3-email sequence with **conditional content blocks** that change based on which calculator tag the subscriber came from. The free tier supports up to 500 subscribers with 12,000 emails/month — upgrade to Growing Business ($10/mo) when subscriber count exceeds 500 (expected around month 3-6).

### Sequence

| Email | Timing | Subject Line Direction | Content |
|-------|--------|----------------------|---------|
| **Email 1** | Immediate | "Your [Calculator Name] results" | PDF attachment or link with their full calculation breakdown. Brief tip related to their calculator. Minimal — deliver the value they asked for. |
| **Email 2** | Day 3 | "What most people get wrong about [topic]" | Educational content related to their calculator. E.g., compound interest → "The real impact of starting 5 years earlier." Debt payoff → "Why minimum payments cost you $X extra." No affiliate links in this email — pure value. |
| **Email 3** | Day 7 | "One thing that could help" | Soft affiliate recommendation. E.g., compound interest → "If you're looking for a place to start, here are high-yield savings accounts we've researched." Includes comparison table or single recommendation. Clear affiliate disclosure. |

### Conditional Content by Calculator Tag

| Tag | Email 2 Topic | Email 3 Recommendation |
|-----|--------------|----------------------|
| `compound-interest` | The power of starting early + compounding frequency impact | High-yield savings: Betterment, Marcus |
| `loan-amortization` | How extra payments save thousands in interest | Compare loan rates: LendingTree, SoFi |
| `investment-return` | DRIP vs. non-DRIP returns over 20 years | Start investing: Betterment, Wealthfront |
| `retirement-savings` | The retirement gap: how most people undersave | Open retirement account: Betterment, Vanguard |
| `debt-payoff` | Snowball vs. avalanche: which actually works better | Consolidate debt: SoFi, LendingClub |
| `savings-goal` | The 50/30/20 rule and where savings fits | High-yield savings: Marcus, Ally |
| `rent-vs-buy` | Hidden costs of buying most calculators miss | Get pre-approved: LendingTree |
| `mortgage-payment` | How extra payments save tens of thousands in interest | Compare mortgage rates: LendingTree, SoFi |
| `salary-us`, `salary-uk`, `inflation`, `roi`, `net-worth`, `emergency-fund` | General financial planning tip | No affiliate — educational only |

**Utility tools (QR code, password generator, percentage calculator, JSON formatter) have no email capture.** Emailing a password is a security risk, QR codes are downloadable images, percentages are instant lookups, and JSON output is copy/paste. These tools serve traffic diversification, not the email funnel.

### Key Rules
- **Never send more than 3 emails** unless user actively engages (opens, clicks). Respect the "no spam" promise.
- **Every email has an unsubscribe link** (MailerLite handles this automatically).
- **Affiliate disclosure in Email 3:** "This email contains affiliate links. See our [disclosure](link)."
- **MailerLite branding:** Free tier includes MailerLite branding at bottom of emails. Acceptable for launch; remove when upgrading to paid tier.

---

## "Done" Checklist

MVP is shipped when:

**Tools & Content:**
- [ ] 18 tools live and functional (Sprint 1: 18 placeholder pages live; Sprint 2-3: real calculators)
- [x] Financial math has unit tests (Vitest) that pass (27 tests covering compound interest, loan amortization, savings goal, formatting)
- [ ] All tool pages have educational content (500+ words financial, 200+ utility)
- [x] FAQ sections with schema markup on all tools (3-5 questions each, targeting long-tail keywords)
- [x] Worked examples on all financial calculators (2-3 each)

**Monetization & Email:**
- [ ] Affiliate links with FTC disclosure on applicable calculators
- [ ] "Best X" comparison tables on financial calculator pages
- [ ] Email capture ("Email me my results as PDF") on all 12 financial calculators (not utility tools)
- [ ] MailerLite integrated with 1 universal 3-email drip (tags per calculator)
- [ ] Embeddable widget versions + embed code generator

**Site Structure & Legal:**
- [x] Homepage with tool grid and category filtering
- [x] About page (who we are, what we do, no fake team bios)
- [x] Privacy policy (client-side data, analytics, email usage, GDPR/CCPA)
- [x] Affiliate disclosure page (FTC-compliant, lists all programs)
- [x] Terms of use (not financial advice, estimates only, use at own risk)
- [x] Cookie consent banner for analytics (EU compliance)

**Technical & SEO:**
- [x] Sitemap, robots.txt, structured data (WebApplication + FAQ + Breadcrumb) — OG images pending
- [x] `npm run build` succeeds with zero errors
- [ ] Core Web Vitals pass (LCP < 2.5s, INP < 200ms, CLS < 0.1) — needs real deployment test
- [x] Mobile responsive + WCAG AA accessible
- [ ] Deployed to Cloudflare Pages
- [ ] Submitted to Google Search Console

**Launch & Growth:**
- [ ] Applied to Betterment affiliate program
- [ ] First 10-20 programmatic scenario pages live
- [ ] Google Analytics configured with cookie consent

**Phase 2 — File Converters (Post-Launch, Month 4-6+):**
- [ ] Tier A file converters live: image compressor, image resizer, image format converter, SVG to PNG
- [ ] Tier B file converters live: HEIC to JPG, CSV↔JSON
- [ ] Tier C file converters live: Markdown↔HTML, images to PDF
- [ ] Privacy badge ("Files never leave your device") on all converter pages
- [ ] Cross-promotion links from converters to financial calculators
- [ ] Evaluate converter→calculator cross-traffic at 6 months post-launch
