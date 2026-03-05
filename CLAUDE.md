# CalcRun — AI Passive Income Project

## Read Order

Before building anything, read these files in order:

1. **`docs/growth-plan.md`** — **START HERE.** Current status, what to build next, priority matrix, revenue projections. This is the active roadmap.
2. **`docs/build-spec.md`** — Original spec: target audience, personas, value proposition, competitive positioning, customer journey, tools list, file structure, content schema, SEO, keyword targets, monetization, revenue targets, KPIs, post-launch operations. The sprint roadmap (Sprints 1-7) is complete — see growth-plan.md for what's next.
3. **`docs/design-system.md`** — How it looks: branding, colors, typography, calculator UI patterns, navigation, mobile, accessibility, visual polish.

Historical docs (exploration, market research, financial model, original strategy/plan-optimization) are archived in `docs/archive/` for reference only.

## Mission

Build a zero-investment online business that generates passive income, built entirely by AI (Claude Code). No upfront monetary investment — only free-tier services and tools.

## Tech Stack

- **Astro** + **TypeScript** — static site generation, zero JS by default, React islands for interactive tools
- **Tailwind CSS v4** — rapid UI development (CSS-based `@theme` config, NOT `tailwind.config.ts`)
- **React** — interactive calculator components (via Astro islands with `client:idle`)
- **recharts** — interactive chart visualization in calculator results
- **Lucide React** — consistent icon language across the site
- **Zod** — schema validation for email API endpoint (worker.ts)
- **Cloudflare Turnstile** — bot prevention on email endpoint (invisible CAPTCHA)
- **Cloudflare Pages** (free tier) — hosting, CDN, unlimited bandwidth, commercial use allowed
- **MailerLite** (free tier) — email capture, 500 subscribers, automations included, 12K emails/mo. Upgrade to Growing Business ($10/mo) at 500+ subs.
- **Google Search Console / Analytics** — SEO tracking (free)
- **Satori + Sharp** — build-time OG image generation
- **jsPDF + html-to-image** — client-side PDF export of calculator results (html-to-image replaced html2canvas which crashed on Tailwind v4's oklab() colors)

> **Why Astro over Next.js?** This is a static tools site — we use ~10% of Next.js's features. Astro ships zero JS by default (better Core Web Vitals = better SEO), Cloudflare acquired Astro's company (first-class support), and React components work natively as islands.

## Site Identity

- **Name:** CalcRun
- **Domain:** `www.calcrun.com` (via Cloudflare Registrar). All canonical URLs use `www.`. `calcrun.pages.dev` redirects to it.
- **Logo:** SVG wordmark — navy "Calc" + blue "Run" (built in code, no external tools)
- **Tagline:** "See your numbers instantly — no signup, no ads." (USP; see build-spec.md Value Proposition section)

## Project Stages

### Stage 1: Exploration (Complete)
Evaluated 6 business models. Decision: **Free Online Tools Site**.

### Stage 2: Detailed Plan (Complete)
Market research, competitor analysis, financial model, and strategy defined.

**Chosen approach:**
- 14 financial calculators + 4 utility tools (18 MVP) + 13 file converters (31 total)
- File converters built as traffic acquisition (not a rebrand — financial calculators remain the core identity)
- Affiliate-first monetization (not ad-dependent)
- Email capture ("email me my results") → automated drip → affiliate conversions
- Embeddable calculator widgets for passive backlinks
- Deep educational content per tool for E-E-A-T
- FTC-compliant affiliate disclosures on every page

### Stage 3: Plan Optimization + Design (Complete)
MVP expanded from 15 to 18 focused tools (14 financial + 4 utility).
Switched from Next.js to Astro. Dropped simple tools that AI Overviews replace.
Full design system defined: branding, colors, typography, calculator UI, navigation, accessibility.

### Stage 4: Build, Test & Launch (Complete — Live at www.calcrun.com)

**Sprint 1 — Foundation + Visual Polish (Complete):**
- Astro 5 + TypeScript + Tailwind CSS v4 + React scaffold
- Design system: all color/typography/spacing tokens, self-hosted Inter + JetBrains Mono fonts
- Content architecture: Zod-validated content collection (glob loader), 31 tool markdown files with full frontmatter
- Page templates: BaseLayout, ToolPageLayout (breadcrumbs, tool icon, H1, affiliate disclosure, section backgrounds, worked examples, FAQ, related tools)
- 39 pages: homepage, tools index, 31 tool pages, embed, about, privacy, terms, disclosure, 404
- **Visual polish pass:** Every page upgraded to premium quality:
  - Homepage: animated gradient hero with floating orbs, trust indicators, gradient text, dual CTAs
  - All tool cards: Lucide icons with hover icon-fill animation, gradient bottom accent on hover
  - Navigation: frosted glass header (backdrop-blur), icons in dropdown + mobile menu, slide animation
  - Tools index: dark gradient page header, gradient dividers between categories
  - About page: mission card, 2×2 feature grid with icons, visual hierarchy
  - Legal pages (privacy, terms, disclosure): card-based sections with icons, dark gradient headers
  - 404 page: decorative illustration with concentric circles, accent dots
  - Footer: trust badges, gradient divider, arrow icons
  - FAQ section: styled chevron badges, hidden disclosure markers, gradient dividers
  - Related tools: gradient background, icon cards with hover accents
  - Placeholder calculator: two-column skeleton with shimmer animation (matches real calculator dimensions)
  - Category filter: smooth fade/scale animation (not display:none)
  - Mobile menu: slide-in panel with backdrop blur, animated open/close
  - Tool page layout: section background differentiation (white/neutral-50/primary-50)
- `ToolIcon.astro` component: 30+ Lucide SVG icons rendered as inline SVG in Astro components
- Shimmer animation in global CSS for skeleton loading states
- Enhanced shadows (softer default, more pronounced hover)
- `::selection` color, `:focus-visible` ring, `scroll-behavior: smooth`
- Financial math library: compound interest, loan amortization, savings goal (81 unit tests passing)
- SEO: WebApplication, FAQPage, BreadcrumbList, WebSite structured data schemas
- Static assets: SVG favicon, PNG icons, manifest, robots.txt, sitemap

**Sprint 2 — Core Calculators + Utilities (Complete):**
- 6 core financial calculators: compound interest, loan amortization, investment return, retirement savings, debt payoff, savings goal
- Compound interest + loan: collapsible year-group schedule tables (not raw 120-row dumps)
- Investment + retirement: "Solve for X" multi-tab pattern (solve for end amount, contribution, return rate, starting amount, or time)
- QR code generator + password generator

**Sprint 3 — Secondary Calculators + Utilities (Complete):**
- 8 secondary calculators: US salary, UK salary, mortgage payment, inflation, ROI, net worth, rent vs buy, emergency fund
- Percentage calculator + JSON formatter
- UK salary: HMRC tax code parsing (1257L, BR, D0, D1, NT, K codes)
- US salary: 401(k) pre-tax contribution with IRS $23,500 cap

**Sprint 4 — SEO + Content + Monetization (Complete):**
- SEO: meta descriptions ≤160 chars, keywords, structured data on all tools
- Educational content: 500-1000 words per tool, comparison tables, key terms
- 5+ FAQ items per tool with substantive answers
- 3 worked examples per tool with realistic scenarios
- Affiliate programs on financial tools — geography-relevant (US: Betterment, SoFi, Wealthfront, LendingTree, Ally; UK: Nutmeg, InvestEngine; Security: NordPass, NordVPN). See Sprint 14 for current partner status.
- Utility tools correctly exclude affiliates (no forced product fits)
- Slider QA: fixed min/max ranges across 9 calculators (17 sliders)
- Accessibility: aria-label/aria-controls/role attributes on all interactive elements

**Sprint 5 — Client-Side File Converters (Complete):**
- 13 client-side file converters as traffic acquisition strategy:
  - Image tools: compress, resize, format convert, SVG→PNG, HEIC→JPG, images→PDF
  - Document tools: CSV↔JSON, Markdown↔HTML, Excel→PDF
  - PDF tools: compress, merge, split, PDF→image
- PDF→Word removed — requires server-side OCR/layout reconstruction for acceptable quality
- Word→PDF removed — client-side docx-preview + html2canvas cannot reliably match Word's page breaks. Orphaned deps (`pdfmake`, `html-to-pdfmake`, `docx-preview`) cleaned up.
- PDF Compressor fix: replaced `doc.embedJpg()` (which duplicated objects, making files bigger) with in-place `PDFRawStream` replacement via `context.assign()`
- All processing client-side — "Your files never leave your device" privacy positioning
- Cross-promotion links from converter pages to financial calculators
- NOT a rebrand — financial calculators remain the core identity, homepage hero, and primary revenue driver

**Sprint 6 — Polish & Launch (Complete):**
- OG image generation: Satori + Sharp, build-time PNG for all 37 tools + default (1200×630px, category-colored)
- PDF export: jsPDF with branded template, ExportPdfButton on all 14 financial calculators (lazy-loaded)
- Embeddable widgets: `?embed` strips chrome, "Powered by CalcRun" attribution, `/embed` page with code generator
- Bundle analysis: all heavy deps (heic-to, xlsx, pdf-lib, jsPDF) properly code-split and page-specific

**Sprint 7 — PDF Export Fix (Complete):**
- Replaced html2canvas with html-to-image (html2canvas crashed on Tailwind v4's oklab() colors)
- Scrollbar artifacts fixed: overflow/sticky styles neutralised before capture, restored in `finally` block
- Section-aware page breaks: `data-pdf-section` attributes on 59 visual blocks across all 14 calculators; chunking loop breaks at section boundaries instead of raw pixel slicing
- Row-level break points: `<tbody> <tr>` tops collected as additional candidates — tables never sliced mid-row
- Mortgage toggle button hidden in PDF via `data-pdf-hide`
- Amortization schedule always included in PDF via `data-pdf-force-show` (renders in DOM but hidden with inline style when toggle off; force-shown during capture)
- Break points measured AFTER hiding `data-pdf-hide` elements and neutralising styles so positions match captured canvas
- Playwright test suite: all 14 calculators verified producing valid multi-page PDFs

**Sprint 8 — Security + URL Canonicalization (Complete):**
- SVG sanitization in SvgToPngConverter (strips script/style/iframe/foreignObject, removes on* attributes and javascript: URLs)
- Security headers via `public/_headers` (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Switched all canonical URLs from `calcrun.com` to `www.calcrun.com` across 8 files (astro.config, robots.txt, BaseLayout, seo.ts, embed, ToolPageLayout, QrCodeGenerator, CLAUDE.md)
- Fixed mobile hamburger menu (CSS spec: backdrop-filter on header created containing block for position:fixed children)
- Updated contact email from privacy@calcrun.com to hello@calcrun.com on privacy page

**Sprint 9 — Affiliate Links + Revenue Engine (Complete):**
- `src/lib/affiliate-data.ts` — 9 affiliate partners with UTM URL builder + tracked CJ links (Betterment, Wealthfront, SoFi, LendingTree, Ally, NordPass, NordVPN, Nutmeg, InvestEngine). Removed dead partners (Marcus, Vanguard, Moneybox, 1Password, LendingClub — no affiliate programs or declined)
- `src/components/ui/AffiliateLinks.astro` — Partner cards with icon, name, tagline, category badge, "Learn more" CTA. Links use `rel="noopener sponsored"` for FTC compliance
- Wired into ToolPageLayout directly below calculator (highest-intent placement). Only renders on pages with `affiliatePrograms` in frontmatter (15 of 37 tools — removed forced affiliates from 5 image tools)
- FTC-compliant: AffiliateDisclosure banner above calculator + inline note below cards + full `/disclosure` page

**Sprint 10 — Navigation Polish (Complete):**
- Desktop dropdown: expanded from 2-column "Calculators" to 3-column "Tools" (740px) with Utility and File Tools sections
- "View all 37+ tools" link in dropdown
- Mobile menu: added all utility tools (7) and file tools (15) sections
- All 37 tools now discoverable from navigation

**Sprint 11 — Google Analytics 4 (Complete):**
- GA4 measurement ID `G-K0ZB3P48QG` integrated in BaseLayout `<head>` via `is:inline` scripts
- Tracks all page views and events site-wide

**Sprint 12 — Email Capture + MailerLite Integration (Complete):**
- `worker.ts` — Cloudflare Worker entry point: handles `POST /api/subscribe` (MailerLite proxy, CORS, honeypot), delegates all other requests to static assets via `ASSETS` binding
- `EmailCapture.tsx` rewritten: real `/api/subscribe` POST, honeypot field, `variant` prop (`tool` | `newsletter`), GA4 `email_signup` event, specific error messages
- EmailCapture rendered on all 14 financial/economic tool pages (saving-and-growth, debt-and-loans, income-and-planning, economic categories) between calculator and affiliate links via `client:visible`
- Homepage newsletter signup section between Popular Tools and All Tools
- MailerLite group ID `180838346043426395` ("Calculator Results"), `calculator_slug` custom field for segmentation
- `.env.example` documenting `MAILERLITE_API_KEY`

**Sprint 12b — Email My Results + MailerSend (Complete):**
- `EmailResultsButton.tsx` — inline "Email my results" button with expandable email form, honeypot, GA4 `email_results` event, `data-pdf-hide`
- `src/lib/email-types.ts` — shared `ResultItem` + `EmailResultsBody` interfaces
- `worker.ts` — added `/api/email-results` POST route: validates input, builds branded HTML email via `buildResultsEmail()`, sends via MailerSend API, also subscribes user to MailerLite drip
- Branded HTML email template: CalcRun header, inputs summary, highlighted results, quick tip per calculator, CTA button
- `getResults()` callback added to all 14 financial calculators, returning key computed values as `ResultItem[]`
- `EmailResultsButton` rendered next to `ExportPdfButton` on all 14 financial calculators
- MailerSend free tier: 500 emails/month (adequate for early stage)
- Quick tips map: 14 calculator-specific financial tips included in results emails

**Sprint 13 — Content + Growth + Launch (Complete):**
- `ShareButton.tsx` — dropdown popover with 5 share options (Copy Link, Twitter/X, Facebook, LinkedIn, Reddit). Matches ExportPdfButton styling, `data-pdf-hide`, GA4 `share_tool` event, outside click + Escape close, `aria-expanded`/`role="menu"` accessibility
- ShareButton integrated into all 14 financial calculators (first child in button row)
- 15 programmatic scenario pages for long-tail SEO (`src/data/scenarios/`):
  - Content collection with Zod schema in `content.config.ts`
  - 15 markdown files with frontmatter (title, slug, description, keywords, toolSlug, toolCategory, inputs, resultSummary) + 500-600 words educational content
  - Dynamic route `src/pages/scenarios/[scenario].astro` — dark gradient header, answer card with big result number + input pills, "Try it yourself" CTA, prose content, sidebar with parent calculator + related scenarios
  - Index page `src/pages/scenarios/index.astro` — grouped by parent tool, 3-column grid
  - `ScenarioLinks.astro` — renders related scenarios on tool pages (between FAQ and Related Tools)
  - Navigation updated with "Scenarios" link in dropdown
- Email results logo fixed: icon-192.png image in branded HTML email header
- Affiliate push improved: 2 partner recommendations per calculator in email (was 1), custom CTAs, redesigned blue container card layout
- `AffiliateLinks.astro` enhanced: category badges, larger icon containers, hover lift effects, shadow on CTA buttons
- Launch prep docs: `docs/launch/product-hunt.md`, `docs/launch/reddit-posts.md`, `docs/launch/devto-article.md`
- 61 pages total (37 tools + 15 scenarios + 9 static pages)

**Sprint 14 — Affiliate Registration + Partner Cleanup (Complete):**
- Researched all 14 original affiliate partners — found Marcus, Vanguard, Moneybox have NO affiliate programs
- Removed 5 dead partners from `affiliate-data.ts`: Marcus, Vanguard, Moneybox, 1Password (CJ declined), LendingClub (not on CJ)
- Removed forced NordPass/NordVPN affiliates from 5 image tool pages (no natural product fit)
- Added `tracked?: boolean` flag to `AffiliatePartner` interface — tracked links skip UTM param appending
- NordPass LIVE: CJ tracking link `https://go.nordpass.io/aff_c?offer_id=490&aff_id=34741&url_id=25686`
- NordVPN LIVE: CJ tracking link `https://go.nordvpn.net/aff_c?aff_id=2495&offer_id=312&url_id=2584`
- Updated all 10 affected tool markdown frontmatter files with replacement partners
- Updated `worker.ts` email affiliate recommendations (replaced all dead partner references)
- Updated `disclosure.astro` partner list
- Added Impact.com site verification meta tag to `BaseLayout.astro`
- CJ publisher ID: NordPass=34741, NordVPN=2495

**Remaining Sprint 14 work:** All complete. Scenarios scaled to 102 (Sprint 25). Comparisons expanded to 15 (Sprint 24). Affiliate placements expanded (Sprint 23).

**Sprint 15 — Security Hardening + Critical UX Bugs (Complete):**
- **15A Security:** Cloudflare Turnstile bot prevention on `/api/email-results` (front-end invisible widget + server-side token verification). Zod schema validation for all email request fields (email, toolSlug, inputs, results, turnstileToken). Request size cap (20KB) before JSON parse. Server-side tool name derivation from `TOOL_REGISTRY` (client `toolName` ignored). `sanitizeText()` strips non-printable chars, CRLF, collapses whitespace, HTML-escapes. Honeypot field. `maxLength` attributes on client-side email inputs.
- **15B SliderInput fix:** Added `isEditing`/`editingValue` local state pattern. During focus, shows raw user input (no formatting). On blur, parses, clamps to min/max, formats. Supports pasted values with commas/currency symbols. Enter key commits. No more backspace bug, no reformatting during typing.
- **15C Mobile fixes:** `touch-action: pan-y` on range inputs prevents horizontal scroll. `overflow-x: hidden` on calculator containers. Result numbers use `clamp()` font sizing. Stat cards responsive grid. Input `text-base` (16px) prevents iOS zoom-on-focus.
- **15D Raised input limits:** Principal 1M→10M, monthly contribution 10K→50K, time 50→100yr, salary caps raised to 1M across all 14 calculators.

**Sprint 16 — Trust, Typography, Color & Currency (Complete):**
- **16A Typography:** Libre Baskerville (serif, headings H1-H2) + DM Sans (sans, body/UI). Self-hosted woff2 in `public/fonts/`, preloaded in BaseLayout. `font-display: swap`. Inter removed. `tabular-nums lining-nums` on financial figures. All inputs 16px minimum.
- **16B Color palette:** Deep teal primary (#0B6E6E), warm coral accent (#E8604C), off-white background (#FAFAF8), navy-tinted text (#1A1A2E). Full `@theme` token system in global.css with semantic tokens (bg, surface, surface-alt). Chart colors updated from blue/green to teal/green across all calculators.
- **16D Trust signals:** `src/lib/uk-rates.ts` central rates module (2025/26 tax year — income tax, NI, state pension 230.25/week, student loans, Scottish tax). UK Salary calculator imports from central module. "Updated for 2025/26" badge on calculator pages. "How this is calculated" expandable section. Source links to GOV.UK.
- **16E Currency selector:** `useCurrency()` hook + `CurrencySelector` component (USD/GBP/EUR pill selector). `formatCurrency()` accepts currency code. Persists in localStorage. Locked to GBP on UK Salary, USD on US Salary. Applied to all 11 generic financial calculators.

**Sprint 17 — Content De-AI-ification (Complete):**
- **17C:** All 14 financial calculator descriptions rewritten — specific, under 160 chars, no AI-slop phrases ("delve", "seamless", "game-changer" etc.). Example: compound-interest.md → "See growth over time — monthly contributions, compounding frequency, and a year-by-year table."

**Sprint 18 — Card Design & Layout (Complete):**
- **18A Card refinement:** `rounded-2xl` → `rounded-lg` on major cards. `hover:-translate-y-1` → `hover:-translate-y-0.5`. Removed gradient bottom accent lines from tool cards. Sparkles icon → arrow-up-right on affiliate cards.
- **18B Sticky results:** `lg:sticky lg:top-20 lg:self-start` on results panels across all 14 financial calculators.
- **18D Anti-AI signals removed:** Simplified 404 illustration (removed concentric circles/accent dots). Gradient accent lines removed from card hovers.

**Sprint 19 — Dark Mode + Accessibility (Complete):**
- **19A Dark mode:** Full dark theme via `[data-theme="dark"]` CSS custom property overrides in global.css. `ThemeToggle.astro` sun/moon button in header (desktop + mobile). FOUC prevention via inline `<script>` in `<head>` reading localStorage before paint. Respects `prefers-color-scheme`. Persists in `calcrun.theme` localStorage key. Dark tokens: bg #121418, surface #1E2128, surface-alt #282C34, lifted teal primary, same coral family for accent.
- **19B Accessibility:** Focus ring upgraded to 3px coral via `color-mix()`. `scroll-padding-top: 80px` for sticky header focus occlusion (WCAG 2.4.11). Dark mode overrides for all text/border/input/card elements maintain WCAG AA contrast.

**Sprint 20 — QA Automation (Complete):**
- 53 new Playwright E2E tests across 3 files:
  - `tests/calculators.spec.ts` (16 tests): All 14 financial calculator interaction tests + currency selector + share/email/export buttons
  - `tests/pages.spec.ts` (29 tests): Homepage, tools index, 14 calculator SEO (h1, JSON-LD, meta desc, og:image), 3 scenarios, static pages, navigation dropdown, dark mode toggle + persistence
  - `tests/accessibility.spec.ts` (8 tests): axe-core WCAG AA on homepage, 3 calculator pages, scenarios index, dark mode (homepage + calculator)
- `@axe-core/playwright` dev dependency added
- `playwright.config.ts` updated with `webServer` config to auto-start dev server
- Known issues found: Rent vs Buy page missing JSON-LD structured data, 14 color-contrast violations on homepage (text-neutral-400, bg-accent-600, bg-primary-500 with white text all below 4.5:1)
- Total test count: 215 unit (vitest) + 70 E2E (playwright) = 285 tests

**Sprint 21 — Homepage Redesign + Data Fixes + Trust + Copy Cleanup (Complete):**
- **21A UK Data Fix (CRITICAL):** Student loan thresholds in `uk-rates.ts` updated to 2025/26 values (Plan 1: £26,065, Plan 2: £28,470, Plan 4: £32,745). State Pension £221.20→£230.25 in `salary-uk.md`. All worked examples, FAQ answers, and 2 scenario pages (`30k-salary-uk-student-loan.md`, `40k-salary-uk-take-home.md`) recalculated with correct figures.
- **21B Trust Badge Fix:** `ToolPageLayout.astro` — replaced category-based badge logic with tool-specific whitelist (`TAX_DEPENDENT_TOOLS: salary-uk, salary-us, inflation`). Tax year badge only on those 3 tools; other tools show "Last updated {date}" instead. Homepage trust strip: "Updated for 2025/26 tax year" → "Tax rates verified for 2025/26".
- **21C Homepage Restructure:** Reordered sections: Hero → Trust → Popular → Questions → All Tools (grouped) → Newsletter. All Tools section now grouped by category with 1 featured card + compact single-line list per category. Removed category filter pills and associated JS. All 3 CTA scenario cards now have descriptions. "Try it free" → "Try this calculator".
- **21D "Free" Language Removal (~28 files):** Removed "free", "no signup", "no upload", "private" suffixes from: meta titles (`index.astro`, `tools/index.astro`), trust strip, `BaseLayout.astro` default description, `seo.ts` site description, `about.astro`, 23 tool `.md` description fields, `tools-data.ts` entries.
- **21E Footer + Email Copy:** Footer tagline simplified, removed "Private"/"Instant" trust badges. `EmailCapture.tsx`: "Get free financial tips" → "Get financial tips", "Get free tips" → "Get tips". `EmailResultsButton.tsx`: "Also send me free financial tips" → "Also send me financial tips".

**Sprint 22 — Curated Directory + Comparison Articles + Performance (Complete):**
- **22A Directory redesign:** Homepage and tools index rebuilt with two-column category layout (info left, card grid right). Uniform medium-sized cards for all tools. Progressive disclosure for File Tools (show 8, toggle rest). Staggered entrance animations via IntersectionObserver. Category taglines and accent colors in `tools-data.ts`.
- **22B Dark mode fix:** ScenarioLinks box gradient `to-white` didn't dark-mode override — replaced with solid `bg-neutral-50` class that has proper global override. Added `.scenario-box` border override in global.css.
- **22C Comparison articles:** 7 articles with content collection schema, dynamic route `[comparison].astro`, index page. Articles: 15yr vs 30yr mortgage, Roth vs 401k, snowball vs avalanche, rent vs buy 2026, index vs active funds, HYSA vs CDs, ISA vs general investment. Each has comparison table, verdict card, ~500-800 words educational content, related calculator sidebar, cross-links to other comparisons.
- **22D Performance:** All 37 tool components switched from `client:load` to `client:idle` — defers React hydration until browser idle for better Core Web Vitals.
- **22E Navigation:** Comparisons link added to desktop dropdown and mobile menu.
- 111 pages total. 215 unit tests + 69 E2E = 284 tests (1 known flaky HEIC test).

**Sprint 23 — Affiliate Placement Expansion (Complete):**
- **23A:** Affiliate sections added to all 7 comparison articles (AffiliateLinks.astro component, geography-relevant partners per article)
- **23B:** "Take the Next Step" affiliate CTAs on 57 scenario pages (contextual partner recommendations by scenario type)
- **23C:** `ResultAffiliate.tsx` — inline affiliate cards in 8 calculator result panels, shown after user interaction. Config maps tool slugs to partner cards with contextual CTAs.

**Sprint 24 — More Comparison Articles (Complete):**
- 8 new comparison articles (total 15): Pay Off Debt vs Invest, Fixed vs Variable Rate Mortgage, Lump Sum vs DCA, LISA vs Regular ISA, Pension vs ISA (UK), Cash ISA vs Savings Account, Emergency Fund Savings vs Money Market, Roth IRA vs Roth 401(k)
- Each with comparison table, verdict card, affiliate section, 500-800 words

**Sprint 25 — Scale Scenario Pages to 100+ (Complete):**
- 45 new scenario pages (total 102): UK salary every £5K (£20K-£95K), US salary every $10K ($40K-$200K), mortgage amounts $150K-$750K at 6.5%, investment growth at common amounts/timeframes
- All with calculated results, input pills, educational content, affiliate CTAs where relevant

**Sprint 26 — Smart OG Images + Methodology Pages (Complete):**
- **26A:** Custom OG images for all scenario and comparison pages (Satori + Sharp, build-time). Tool OG images updated: removed "Free" tagline, replaced with "calcrun.com".
- **26B:** 14 methodology/"How We Calculate" pages at `/how-we-calculate/[tool]`. Content collection with Zod schema (formula, variables, assumptions, limitations, dataSources). 3-column layout, monospace formula card, variable pills, sidebar with CTA + data sources.

**Sprint 28 — MailerLite Drip Automation (Partially Complete):**
- `worker.ts` updated: `subscribeToMailerLite()` accepts `signupSource` param ('newsletter' | 'results') for conditional automation branching
- `scripts/setup-mailerlite-drip.ts` — one-command setup: creates custom fields, automation drafts, verifies group
- `docs/mailerlite-drip-setup.md` — full guide with branded HTML templates for 10-email sequence
- MailerLite API limitation: cannot add email steps/delays programmatically — draft creation + manual email paste in UI required

**Sprint 29A — Scroll Email Capture (Complete):**
- `ScrollEmailBar.tsx` — fixed bottom bar on financial calculator pages, appears after 60% scroll depth
- Dismissible, localStorage persistence, honeypot spam protection, GA4 tracking
- QA fixes: error message display, division-by-zero guard, z-index conflict with back-to-calc button resolved

**Sprint 27 — New High-Value Calculators (Complete):**
- 3 new financial calculators: Mortgage Affordability ("How much house can I afford?"), Credit Card Payoff (minimum payment trap), Investment Fee (expense ratio drag)
- All follow full calculator pattern: SliderInput, real-time results, recharts charts, currency selector, PDF export, email results, share button, ResultAffiliate inline cards
- 3 new methodology pages: `/how-we-calculate/mortgage-affordability`, `/how-we-calculate/credit-card-payoff`, `/how-we-calculate/investment-fee`
- Wired into all integration points: [tool].astro, tools-data.ts, ResultAffiliate.tsx, worker.ts (TOOL_REGISTRY, QUICK_TIPS, AFFILIATE_RECS)
- 184 pages total (40 tools, 17 financial calculators)

**Affiliate network accounts:**
- **CJ Affiliate** — Active. NordPass approved, NordVPN approved, 1Password declined, Ally declined. Pending: LendingTree, Barclays US Online Savings, Experian, Axos Bank, BMO Harris Bank
- **Impact.com** — Marketplace application DECLINED (low traffic, new site). Can apply directly to brands via their Impact signup pages. Reapply to marketplace once traffic grows.
- **Awin** — Application submitted, pending review. Once approved, apply to Nutmeg (advertiser ID 15889) for UK investing pages.
- **Pro Affiliate Partner** — Signed up (manages Betterment's affiliate program). Pending review.

**Current affiliate partner status in `affiliate-data.ts` (9 partners):**
| Partner | Status | Network | Tracked Link |
|---------|--------|---------|-------------|
| Betterment | Pending | Pro Affiliate Partner | No |
| Wealthfront | Not yet applied | Unknown (try Impact direct) | No |
| SoFi | Not yet applied | Impact.com (direct) | No |
| LendingTree | Pending approval | CJ Affiliate | No |
| Ally | Declined (CJ) | Reapply later | No |
| NordPass | **LIVE** | CJ Affiliate | Yes |
| NordVPN | **LIVE** | CJ Affiliate | Yes |
| Nutmeg | Pending Awin approval | Awin (advertiser 15889) | No |
| InvestEngine | Not yet applied | Direct (investengine.com/affiliate) | No |

**External blockers (require manual action by owner):**
- **Awin → Nutmeg** — Once Awin approves, search for Nutmeg (advertiser ID 15889) and apply
- **InvestEngine** — Apply directly at investengine.com/affiliate
- **Wealthfront** — Find affiliate program (try Impact.com direct signup or contact partnerships)
- **SoFi** — Apply via Impact.com direct (not marketplace)
- **CJ pending approvals** — Wait for LendingTree, Barclays, Experian, Axos, BMO decisions
- **Pro Affiliate Partner → Betterment** — Awaiting review
- **Update `affiliate-data.ts`** — As each partner approves, add their tracked URL and set `tracked: true`
- **MailerLite drip automation** — Run `scripts/setup-mailerlite-drip.ts` to create drafts, then paste HTML from `docs/mailerlite-drip-setup.md` in MailerLite UI (API cannot add email steps)
- **Cloudflare redirect rule** — Add redirect from `calcrun.com/*` to `https://www.calcrun.com/$1` in Cloudflare dashboard
- **Product Hunt launch** — Use `docs/launch/product-hunt.md` content. Schedule for Tuesday-Thursday morning
- **Reddit posts** — Use `docs/launch/reddit-posts.md` content. Post to r/personalfinance, r/financialindependence, r/sideproject. Also: r/UKPersonalFinance, r/FIREUK, r/povertyfinance, r/firsttimehomebuyer, r/StudentLoans (answer existing questions with calculator as source, don't just self-promote)
- **Dev.to article** — Write full article from `docs/launch/devto-article.md` outline
- **Hacker News** — "Show HN: Financial calculators with real-time results, no signup"
- **Quora** — Answer financial calculation questions, link to scenario pages
- **Pinterest** — Create shareable infographics from comparison articles

**Resolved blockers:**
- ~~MailerLite custom field~~ — `calculator_slug` created
- ~~Google Search Console~~ — Indexing requested on top pages
- ~~Cloudflare env vars~~ — `MAILERLITE_API_KEY` + `MAILERSEND_API_KEY` added
- ~~MailerSend domain verification~~ — `calcrun.com` sender domain verified (DNS records added)
- ~~Affiliate partner research~~ — All 14 original partners researched, dead ones removed, replacements decided
- ~~CJ Affiliate account~~ — Active, NordPass + NordVPN approved and live
- ~~Impact.com site verification~~ — Meta tag added to BaseLayout.astro
- ~~Affiliate code cleanup~~ — Dead partners removed, tracked links added, tool pages updated

## Design Quality Standards (MANDATORY for All Sprints)

Every new component, page, or feature MUST meet these standards. This is not optional polish — it's the baseline quality bar.

### Visual Richness
- **Every card** must have a Lucide icon (use `ToolIcon.astro` for Astro, `lucide-react` for React). Never ship a text-only card.
- **Card hover effects**: lift (`hover:-translate-y-0.5`), shadow deepening, icon color inversion (`bg-primary-50 text-primary-500` → `bg-primary-500 text-white`).
- **Section dividers**: use gradient lines (`bg-gradient-to-r from-transparent via-primary-300/30 to-transparent`) not plain borders.
- **Page headers** for non-tool pages: dark gradient background (`bg-[linear-gradient(135deg,#0A2540_0%,#1A3A5C_50%,#0A2540_100%)]`) with white text.
- **Section backgrounds** alternate: white for primary content, `neutral-50` for secondary, `primary-50` for CTAs/related sections.

### Calculator UI (Sprint 2+)
- Two-column layout: inputs (40%) left, results (60%) right. Stacked on mobile.
- Every numeric input gets **both** a slider and text field, synced together.
- Results update in **real-time** — no submit button (key differentiator vs Calculator.net). `aria-live="polite"` on results.
- Big number result: 30px+ font, bold, prominent. Context line below explaining what it means.
- Charts use recharts with the color sequence from design-system.md Section 2.
- Progressive disclosure: 3–5 essential inputs visible, advanced collapsed behind toggle.
- **"Solve for X" tabs** on investment + retirement calculators (user picks which variable to solve for).
- **Collapsible schedule tables**: year-by-year default, click to expand monthly detail. Sticky headers, zebra striping. Never dump 120+ raw rows.
- **Contribution timing toggle**: beginning/end of period (on compound interest, investment return).
- Skeleton shimmer (`.shimmer-line` class) while React islands hydrate.

### Typography & Spacing
- **Fonts:** Libre Baskerville (serif) for H1-H2 headings, DM Sans (sans) for body/UI, JetBrains Mono for code.
- `rounded-lg` on major cards, `rounded-xl` on smaller elements, `rounded-lg` on inputs/buttons.
- Generous padding: `p-6` minimum on cards, `py-16 sm:py-20` on sections.
- Body text never below 16px. Descriptions use `leading-relaxed`.
- Headings use `tracking-[-0.02em]`. Financial numbers use `tabular-nums`.

### Animations & Transitions
- `transition-all duration-200` on interactive elements. `duration-150` for simple color changes.
- All animations respect `prefers-reduced-motion` (already handled in global CSS).
- Menu/modal open/close: slide + fade with backdrop blur.
- Filter/sort: fade out (`opacity-0 scale-95`) then hide, show then fade in.

### Accessibility
- WCAG AA contrast minimum on all text. Use `accent-600` (not `accent-500`) for text on white.
- Every interactive element reachable via Tab with visible `:focus-visible` ring.
- All icons are `aria-hidden="true"` (decorative) or have accessible labels.
- Form inputs have visible `<label>` elements, not just placeholders.

### What NOT to Do
- No text-only cards or plain list items where cards should be.
- No `display: none` toggling — always animate transitions.
- No flat/borderless cards — always `border border-neutral-200/80 shadow-card`.
- No pages with just a heading and text wall — use icons, cards, or visual elements.
- No generic placeholder states — use shimmer skeletons matching real component dimensions.

## Constraints

- **$0 budget** — free tiers only (Cloudflare Pages, etc.)
- **AI-built** — Claude Code does all development
- **Low maintenance** — should run mostly unattended once live
- **Legal/ethical** — no scraped content, no spam, proper attribution, FTC-compliant affiliate disclosures

## For New Claude Code Sessions

When starting a new session on this project:

1. **Check you're on the default branch** — all completed work is merged here. Do NOT continue on old `claude/*` branches from previous sessions.
2. **Read this file first**, then `docs/growth-plan.md` (active roadmap), then `docs/build-spec.md` and `docs/design-system.md` as needed.
3. **Current status:** Site is live at `https://www.calcrun.com`. Sprints 1-29A complete (including Sprint 27). 184 pages (40 tools + 102 scenarios + 15 comparisons + 17 methodology + 1 comparison index + 9 static). 215 unit + 69 E2E = 284 tests. NordPass + NordVPN live via CJ. Inline affiliate cards on 11 calculators, affiliate sections on all comparisons + relevant scenarios. Scroll email capture bar on all financial calculators. **The bottleneck is traffic, not product.** See `docs/growth-plan.md` for full roadmap.
4. **Git workflow:** Push directly to `claude/master` — no feature branches, no PRs. Cloudflare Pages auto-deploys from this branch.
5. **Contact email:** hello@calcrun.com (only email account — don't reference other addresses).
6. **Known npm vulnerabilities (unfixable):** 5 moderate lodash issues deep in `@astrojs/check` dependency chain (fix requires breaking change), 1 high xlsx issue (no upstream fix). Both are build-time only — never shipped to users.

## Growth Roadmap

See **`docs/growth-plan.md`** for the full plan, split into:
- **Part A (Claude Code sprints):** Sprints 23-29A ALL COMPLETE. 40 tools (17 financial calculators), 102 scenarios, 15 comparisons, 17 methodology pages. Sprint 29B (seasonal content) and 29C (Pinterest infographics) are future.
- **Part B (Human actions):** MailerLite drip (run setup script + paste HTML), Reddit answers, Product Hunt, HN, affiliate follow-ups, Cloudflare config, widget outreach, Quora, forums, Pinterest

**Next steps:** All planned Claude Code sprints complete. Focus shifts to human actions (Part B) for traffic acquisition. Sprint 29B/C are available if more content is needed.

## Running

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Build
npm run build

# Run unit tests (vitest — 215 tests)
npm test

# Run E2E tests (playwright — 69 tests, auto-starts dev server)
npx playwright test

# Run specific E2E test suites
npx playwright test calculators   # 16 calculator interaction tests
npx playwright test pages         # 29 page load/SEO/nav/dark mode tests
npx playwright test accessibility # 8 axe-core WCAG AA tests
npx playwright test file-converters # 17 file converter tests
```

## Pre-Commit QA Checklist (MANDATORY)

Every session that writes code MUST run through this checklist before committing. These checks come from recurring QA issues found across multiple sprints — skipping them guarantees rework.

### 1. Build & Tests
- [ ] `npm run build` — 0 errors, all pages generated
- [ ] `npm test` — all tests passing
- [ ] No new `[WARN]` messages in build output (investigate any that appear)

### 2. SEO (every tool markdown file)
- [ ] **Meta descriptions ≤160 chars** — Google truncates beyond this. Count characters for every new/edited `description` field in `src/data/tools/*.md`. This has been wrong on multiple tools before.
- [ ] **`affiliateContext` + `affiliatePrograms`** — Add to every tool where there's a natural product fit (financial tools → investment/savings platforms). Don't force affiliates on utility tools (QR code, JSON formatter) with no natural fit.
- [ ] **FAQ array** — 5+ questions per tool, substantive answers
- [ ] **`relatedTools` array** — 4-7 cross-references, all slugs valid
- [ ] **`workedExamples`** — 3 realistic scenarios per tool

### 3. Accessibility (every new component)
- [ ] **WCAG AA contrast** — Never use `accent-500` or `primary-500` for text on white backgrounds. Use `accent-600`/`primary-600` minimum. This has been wrong multiple times.
- [ ] **`aria-hidden="true"`** on ALL decorative icons/SVGs
- [ ] **`aria-expanded`** synced on all toggleable elements (dropdowns, collapsibles)
- [ ] **`aria-live="polite"`** on dynamic content regions (calculator results)
- [ ] **Keyboard navigation** — Every interactive element reachable via Tab, toggleable via Enter/Space, dismissible via Escape
- [ ] **Focus management** — Focus traps in modals/menus, focus returns to trigger on close
- [ ] **Visible `<label>` elements** on all form inputs (not just `aria-label` — use `aria-label` only when a visual label is genuinely impractical)
- [ ] **Skip-to-content link** in BaseLayout (already exists — don't remove it)

### 4. Design System (every new component/page)
- [ ] **No duplicate icons** — Check `src/lib/tools-data.ts` before assigning a Lucide icon. Emergency Fund and Password Generator had the same icon once.
- [ ] **Every card has**: `border border-neutral-200/80 shadow-card` + Lucide icon + hover effects (lift, shadow, icon color inversion)
- [ ] **Section dividers** — gradient lines (`via-primary-300/30`), never plain `<hr>` or `border-b`
- [ ] **No `display: none` in JS** — Use CSS classes for show/hide. Animate with opacity/transform first, then apply a `.card-hidden` class if needed for layout collapse.
- [ ] **No inline styles in JS** — Use CSS classes toggled via `classList.add/remove`, not `el.style.x = y`
- [ ] **Rounded corners** — `rounded-2xl` on major cards, `rounded-xl` on smaller elements, `rounded-lg` on inputs
- [ ] **Section backgrounds alternate** — white → neutral-50 → primary-50. Never two adjacent sections with the same background.

### 5. Tailwind v4 Tokens
- [ ] **Every color used in a utility class MUST be defined in `@theme`** in `src/styles/global.css`. Tailwind v4 only generates utilities for explicitly defined tokens. If you use `bg-neutral-400` but `--color-neutral-400` isn't in `@theme`, it silently fails. This has broken styling before.

### 6. Assets & Meta
- [ ] **OG image URLs are absolute** — Must start with `https://www.calcrun.com/`, not relative paths
- [ ] **Favicon/manifest references** point to files that actually exist in `public/`
- [ ] **No hardcoded URLs** in components — Use helper functions (`getToolPath()`, etc.)

### 7. Runtime Error Handling (every component with async operations)

This section exists because a PDF export bug shipped where `html2canvas` failure left the Export PDF button permanently hidden (`display: none`) with no user feedback. The root cause: DOM state was modified before an async operation, but restore code wasn't in a `finally` block. Silent `catch {}` blocks hid the failure from users entirely.

- [ ] **DOM/style mutations before async ops use `try/finally`** — If you set `el.style.display = 'none'` or modify classList before an `await`, the restore MUST be in a `finally` block. Never rely on code after the `await` for cleanup — it won't run if the `await` throws.
- [ ] **No silent `catch {}` blocks** — Every `catch` must either: (a) set an error state that's shown to the user, or (b) re-throw. `catch { /* silent */ }` is banned. The PDF export bug shipped because the catch swallowed the error and the user saw nothing. If you genuinely want to degrade gracefully, still set state that lets the user know something fell back.
- [ ] **Dynamic `import()` calls have `.catch()` or are in `try/catch`** — If a lazy import of a library fails (network error, CDN down), the component must show an error, not silently hang with "Loading..." forever. Every `import('lib').then(...)` needs a `.catch(...)`. Every `await import('lib')` needs to be in `try/catch`.
- [ ] **`Image` elements have `onerror` handlers** — `new Image()` with `onload` but no `onerror` means a corrupt/missing image silently hangs the UI. Always add `img.onerror`.
- [ ] **`FileReader` elements have `onerror` handlers** — Same pattern. `reader.onload` without `reader.onerror` means a failed read silently hangs.
- [ ] **Batch operations report ALL errors, not just the last** — If processing N files in a loop and setting `setError(msg)` on each failure, only the last error survives. Collect errors into an array and display a summary (e.g., "3 of 5 files failed").
- [ ] **`Promise.allSettled` rejections are surfaced** — If you use `Promise.allSettled` and filter to `fulfilled` results, you MUST also check `rejected` results and tell the user which items failed and why.
- [ ] **Loading/processing state always resets on error** — If `setProcessing(true)` is called, verify that every code path (success, error, early return) calls `setProcessing(false)`. A stuck spinner is as bad as a disappearing button.
- [ ] **Object URLs are revoked on error paths** — `URL.createObjectURL()` leaks memory if not revoked. Verify revocation happens in both success and error paths.

### 8. Code Quality
- [ ] **No unused imports** — Remove any imports that aren't referenced
- [ ] **No `console.log`** — Remove before committing
- [ ] **No invalid CSS class names** — Verify Tailwind classes exist (e.g., `text-negative-500` is not a valid class — use `text-red-600`)
- [ ] **CSS classes referenced in JS exist in CSS** — If JS adds `classList.add('hiding')`, verify `.hiding` is defined in a `<style>` block or global CSS
