# CalcRun — AI Passive Income Project

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
- Affiliate programs on all financial tools — geography-relevant (US: Betterment, SoFi, Marcus; UK: Nutmeg, Moneybox, InvestEngine; plus Wealthfront, Vanguard, LendingTree, etc.)
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
- `src/lib/affiliate-data.ts` — 14 affiliate partners with UTM URL builder (Betterment, Marcus, Wealthfront, SoFi, LendingTree, LendingClub, Ally, Vanguard, 1Password, NordPass, NordVPN, Nutmeg, Moneybox, InvestEngine)
- `src/components/ui/AffiliateLinks.astro` — Partner cards with icon, name, tagline, category badge, "Learn more" CTA. Links use `rel="noopener sponsored"` for FTC compliance
- Wired into ToolPageLayout directly below calculator (highest-intent placement). Only renders on pages with `affiliatePrograms` in frontmatter (20 of 37 tools)
- FTC-compliant: AffiliateDisclosure banner above calculator + inline note below cards + full `/disclosure` page

**Sprint 10 — Navigation Polish (Complete):**
- Desktop dropdown: expanded from 2-column "Calculators" to 3-column "Tools" (740px) with Utility and File Tools sections
- "View all 37+ tools" link in dropdown
- Mobile menu: added all utility tools (7) and file tools (15) sections
- All 37 tools now discoverable from navigation

**Remaining sprints:**
- Sprint 11: Email capture + MailerLite integration (wire EmailCapture component into tool pages, connect to MailerLite API, 3-email drip)
- Sprint 12: GA4 integration (add measurement ID to track affiliate clicks and conversions)
- Sprint 13: Content + growth + launch (programmatic scenario pages, share buttons, Product Hunt / Reddit launch)

**External blockers (require manual action by owner):**
- **Affiliate program signups** — Apply to Impact.com + CJ Affiliate (most partners are on these two networks). Apply to each partner individually. Once approved, provide tracking URLs to update `src/lib/affiliate-data.ts`
- **MailerLite account** — Sign up (free, ~15 min), create subscriber group, provide API key for Sprint 11
- **GA4 property** — Create at analytics.google.com, provide Measurement ID (G-XXXXXXXXXX) for Sprint 12
- **Google Search Console** — Already set up with sitemap submitted. Owner needs to manually Request Indexing for top 5 pages
- **Cloudflare redirect rule** — Add redirect from `calcrun.com/*` to `https://www.calcrun.com/$1` in Cloudflare dashboard

## Design Quality Standards (MANDATORY for All Sprints)

Every new component, page, or feature MUST meet these standards. This is not optional polish — it's the baseline quality bar.

### Visual Richness
- **Every card** must have a Lucide icon (use `ToolIcon.astro` for Astro, `lucide-react` for React). Never ship a text-only card.
- **Card hover effects**: lift (`hover:-translate-y-0.5` or `hover:-translate-y-1`), shadow deepening, icon color inversion (`bg-primary-50 text-primary-500` → `bg-primary-500 text-white`), gradient bottom accent line.
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
- `rounded-2xl` on major cards, `rounded-xl` on smaller elements, `rounded-lg` on inputs/buttons.
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
2. **Read this file first**, then follow the Read Order above (`docs/build-spec.md` → `docs/design-system.md`).
3. **Current status:** Site is live at `https://www.calcrun.com`. Sprint 10 complete. 37 tools built (14 financial + 7 utility + 15 file tools + 1 economic). Affiliate links component live on 20 tool pages. Navigation shows all tools. Security headers and SVG sanitization in place. Google Search Console set up with sitemap submitted. Next: Sprint 11 (email capture + MailerLite) — blocked on owner creating MailerLite account.
4. **Git workflow:** Push directly to `claude/master` — no feature branches, no PRs. Cloudflare Pages auto-deploys from this branch.
5. **Contact email:** hello@calcrun.com (only email account — don't reference other addresses).
6. **Known npm vulnerabilities (unfixable):** 5 moderate lodash issues deep in `@astrojs/check` dependency chain (fix requires breaking change), 1 high xlsx issue (no upstream fix). Both are build-time only — never shipped to users.

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
