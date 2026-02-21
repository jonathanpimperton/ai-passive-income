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
- Phase 2: 8 client-side file converters as traffic acquisition (not a rebrand — financial calculators remain the core identity)
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

**Sprint 1 — Foundation + Visual Polish (Complete):**
- Astro 5 + TypeScript + Tailwind CSS v4 + React scaffold
- Design system: all color/typography/spacing tokens, self-hosted Inter + JetBrains Mono fonts
- Content architecture: Zod-validated content collection (glob loader), 15 tool markdown files with full frontmatter
- Page templates: BaseLayout, ToolPageLayout (breadcrumbs, tool icon, H1, affiliate disclosure, section backgrounds, worked examples, FAQ, related tools)
- 22 pages: homepage, tools index, 15 tool pages, about, privacy, terms, disclosure, 404
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

**Sprint 2 — Next:**
- Build 6 core financial calculators (compound interest, loan, investment, retirement, debt payoff, savings goal)
- Compound interest + loan: collapsible year-group schedule tables (not raw 120-row dumps)
- Investment + retirement: "Solve for X" multi-tab pattern (solve for end amount, contribution, return rate, starting amount, or time)
- Build QR code generator + password generator

**Sprint 3 — After:**
- Build 6 secondary calculators + JSON formatter

**Sprint 4-5 — Polish & Launch:**
- Educational content, comparison tables, PDF export, embeddable widgets, OG images
- Deploy to Cloudflare Pages, submit to Google Search Console

**Phase 2 — File Converters (Post-Launch, Month 4-6+):**
- 8 client-side file converters as traffic acquisition strategy (image compress, resize, format convert, SVG→PNG, HEIC→JPG, CSV↔JSON, Markdown↔HTML, images→PDF)
- All processing client-side — "Your files never leave your device" privacy positioning
- Cross-promotion links from converter pages to financial calculators
- NOT a rebrand — financial calculators remain the core identity, homepage hero, and primary revenue driver

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
3. **Current status:** Stage 4, Sprint 1 (Foundation) is complete. Sprint 2 (core calculators) is next. All 15 tool pages exist with placeholder calculators — next step is building real calculator components starting with compound interest. Phase 2 (8 file converters) is planned for post-launch (Month 4-6+) — see build-spec.md for details.
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
