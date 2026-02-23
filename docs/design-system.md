# Design, Branding & UX Plan

> Planning pass focused on aesthetics, styling, UI/UX, navigation, and branding.
> Informed by competitor analysis (NerdWallet, Bankrate, SmartAsset, Calculator.net)
> and UX research (Nielsen Norman Group, Baymard Institute).

---

## 1. Site Name & Branding

### Chosen Name: **CalcRun**

**CalcRun** — calculator + path. "Calc" immediately signals what the site does; "Path" implies guidance, journey, and planning — exactly right for financial tools that help people chart a course.

| Criterion | Status |
|-----------|--------|
| Short (8 chars) | Yes |
| Easy to spell and say | Yes |
| No competing brands in finance | Yes — only unrelated "calpath.com" (pathology lab) |
| .com purchased | Yes — `calcrun.com` owned via Cloudflare Registrar |
| .com likely available | Yes — no active site found |
| SEO-friendly | Yes — "calc" is a high-value keyword root |

**Rejected alternatives and why:**
- CalcWise — 6+ competing sites, .pages.dev taken by a direct competitor
- ClearCalc — .pages.dev taken, brand conflicts with ClearCalcs (engineering SaaS)
- FinCalc — .com is an established 30-year-old financial calculator provider
- PlanBetter — .com taken (crypto site), very generic phrase
- NumVault — clean availability but "vault" sounds like storage, not guidance
- FigureFlow — brand overlap with AI CFO startup in finance space

### Domain Strategy ($0 Launch)

.com domains are not free (~$10/year minimum). The plan:

| Phase | Domain | Cost |
|-------|--------|------|
| **Active** | `calcrun.com` (purchased via Cloudflare Registrar) | ~$10/year |
| **Redirect** | `calcrun.pages.dev` → 301 redirect to `calcrun.com` | $0 |

**Why this works:**
- Cloudflare Pages free tier allows commercial use (unlike Vercel)
- HTTPS, global CDN, unlimited bandwidth included
- Adding a custom domain later takes 2 minutes in the Cloudflare dashboard
- 301 redirects transfer ~90–99% of SEO equity
- Migrate before significant backlinks accumulate (within first 3 months)

**Why .pages.dev is fine to start:**
- New domains are in the Google sandbox regardless (6–12 months to gain traction)
- Building content and getting indexed matters more than TLD in month 1
- $0 budget constraint is real — this is the single unavoidable future cost

### Logo: SVG Wordmark (Built in Code)

The logo is a **two-tone wordmark** — "Calc" in deep navy, "Path" in blue. Created as inline SVG, no external design tools needed.

**Primary wordmark (header, footer, about page):**

```svg
<svg role="img" aria-labelledby="logo-title" xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 180 40" fill="none">
  <title id="logo-title">CalcRun</title>
  <text font-family="Inter, ui-sans-serif, system-ui, sans-serif"
        font-weight="700" font-size="28" y="30">
    <tspan fill="#0A2540">Calc</tspan><tspan fill="#2563EB">Path</tspan>
  </text>
</svg>
```

**Favicon (blue rounded square with white "CP" initials):**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    @media (prefers-color-scheme: dark) {
      .bg { fill: #1E3A5F; }
    }
  </style>
  <rect class="bg" width="32" height="32" rx="6" fill="#2563EB"/>
  <text x="16" y="23" font-family="Inter, ui-sans-serif, system-ui, sans-serif"
        font-size="18" font-weight="700" fill="white"
        text-anchor="middle">CP</text>
</svg>
```

**Logo variations to create:**

| File | Usage |
|------|-------|
| `Logo.astro` component | Header, footer (uses page's loaded Inter font) |
| `public/favicon.svg` | SVG favicon with dark mode support |
| `public/favicon.ico` | 32x32 ICO fallback (generated from SVG via RealFaviconGenerator) |
| `public/apple-touch-icon.png` | 180x180 iOS bookmark (generated from SVG) |
| `public/icon-192.png` | Android/PWA manifest (generated from SVG) |
| `public/icon-512.png` | Android/PWA splash (generated from SVG) |

**Favicon HTML (in Astro base layout):**
```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

### OG Image Generation (Build Time)

Auto-generated per tool page using **Satori + Sharp** in an Astro static endpoint:

- Template: deep navy background (#0A2540), white text, "CalcRun" top-left, tool name large, one-line description, URL bottom-left
- 1200x630px (standard OG image size)
- Generated at build time via `src/pages/og/[slug].png.ts` — zero runtime cost
- Requires Inter `.ttf` files in `public/fonts/` (downloaded from Google Fonts)
- Dependencies: `satori`, `sharp`, `@resvg/resvg-js`

### Brand Voice

- **Trustworthy but approachable** — not stuffy, not casual
- **USP messaging:** "See your numbers instantly — no signup, no ads, no data harvesting." Use this direction in hero, meta descriptions, social sharing. (See build-spec.md Value Proposition section for full positioning.)
- Plain language over jargon (explain APR, CAGR, amortization inline)
- Second person: "your savings," "your monthly payment"
- Helpful framing: "Here's what this means for you" after every result
- No "AI-powered" marketing — NNGroup research shows this undermines credibility for straightforward calculators
- No fake team bios or stock photos — About page focuses on mission and transparency (see build-spec.md About Page section)

---

## 2. Color System

### Why Blue + Green

Color psychology research and competitor analysis both point the same direction:
- **Blue** conveys trust, stability, reliability (used by ~80% of financial institutions)
- **Green** signals growth, wealth, positive outcomes
- **Together** they say "trustworthy growth" — exactly right for financial tools

### Palette

```
Primary:
  --color-primary-900:  #0A2540   (deep navy — headers, hero backgrounds)
  --color-primary-700:  #1A3A5C   (dark blue — secondary text, active states)
  --color-primary-500:  #2563EB   (blue — links, interactive elements)
  --color-primary-300:  #93C5FD   (medium blue — hover states, disabled interactive elements)
  --color-primary-200:  #BFDBFE   (light-medium blue — subtle borders, selected backgrounds)
  --color-primary-100:  #DBEAFE   (light blue — hover backgrounds, highlights)
  --color-primary-50:   #EFF6FF   (pale blue — section backgrounds)

Accent (positive/growth):
  --color-accent-600:   #059669   (deep green — positive values, gains)
  --color-accent-500:   #10B981   (green — CTA buttons, positive indicators)
  --color-accent-100:   #D1FAE5   (light green — success backgrounds)

Warning/Negative:
  --color-warning-500:  #F59E0B   (amber — caution states)
  --color-negative-500: #EF4444   (red — losses, errors, debt indicators)
  --color-negative-100: #FEE2E2   (light red — error backgrounds)

Neutrals:
  --color-neutral-900:  #111827   (near-black — body text)
  --color-neutral-700:  #374151   (dark gray — secondary text)
  --color-neutral-500:  #6B7280   (medium gray — placeholder text, borders)
  --color-neutral-200:  #E5E7EB   (light gray — dividers, card borders)
  --color-neutral-100:  #F3F4F6   (off-white — backgrounds, zebra stripes)
  --color-neutral-50:   #F9FAFB   (near-white — page background)
  --color-white:        #FFFFFF   (white — cards, input fields)
```

### Usage Rules

- **Body text:** neutral-900 on white — WCAG AAA contrast (15.4:1)
- **Links:** primary-500 on white — WCAG AA contrast (4.6:1)
- **Green CTA buttons:** use accent-600 (#059669) for text on white backgrounds (~4.5:1 contrast). accent-500 (#10B981) on white is only 3.3:1 — **fails WCAG AA for normal text**. Use accent-500 only as a background with white text, or for large text (24px+).
- **Green for positive outcomes only** — gains, savings, growth projections
- **Red sparingly** — only for errors, losses, debt amounts
- **Blue for interactive elements** — links, buttons, active inputs, chart highlights
- **Never use color alone** to convey information (accessibility: use icons + labels too)

### Contrast Verification

Run these pairs through [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) before launch:

| Pair | Hex Values | Expected Ratio | WCAG Target |
|------|-----------|----------------|-------------|
| Body text on white | #111827 on #FFFFFF | ~15.4:1 | AAA — pass |
| Links on white | #2563EB on #FFFFFF | ~4.6:1 | AA — pass |
| White on green button | #FFFFFF on #059669 | ~4.5:1 | AA — pass |
| White on navy (OG images) | #FFFFFF on #0A2540 | ~16:1 | AAA — pass |
| Green on navy (chart) | #10B981 on #0A2540 | ~5.5:1 | AA — pass |

Test chart colors for colorblind safety using [Leonardo by Adobe](https://leonardocolor.io/) or [Coloring for Colorblindness](https://davidmathlogic.com/colorblind/).

### Chart Colors

For recharts visualizations, use this sequence for multi-series data:

```
Series 1: #2563EB  (blue — primary data)
Series 2: #10B981  (green — positive comparison)
Series 3: #F59E0B  (amber — secondary comparison)
Series 4: #8B5CF6  (purple — tertiary)
Series 5: #EC4899  (pink — if 5th series needed)
```

Tooltip background: white with neutral-200 border and soft shadow.

---

## 3. Typography

### Font Stack

```
Headings: Inter (700 weight)
Body:     Inter (400 weight, 500 for emphasis)
Numbers:  Inter (tabular-nums feature for aligned columns)
Code:     JetBrains Mono (JSON formatter tool only)
```

**Why Inter:** Free (Google Fonts), excellent number rendering with tabular-nums, variable weight support (300–900), wide language coverage, designed specifically for screens. Used broadly in fintech. Ships as a single variable font file for performance.

**Alternative if a serif/sans pairing is preferred:** Merriweather (headings) + Inter (body). Serif headings add authority. But all-Inter is cleaner and simpler to maintain.

### Font Setup (Stage 4, Step 1)

Self-host for performance (no external Google Fonts request = faster LCP):

1. Download Inter variable font from [Google Fonts](https://fonts.google.com/specimen/Inter):
   - `Inter-VariableFont_opsz,wght.woff2` — the single variable file (weights 100–900)
   - `Inter-Bold.ttf` and `Inter-Regular.ttf` — needed for Satori OG image generation (Satori requires .ttf)
2. Place in `public/fonts/`
3. Add `@font-face` in global CSS:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter-VariableFont_opsz,wght.woff2') format('woff2');
}
```

4. Also download JetBrains Mono for the JSON formatter tool:
   - `JetBrainsMono-Regular.woff2`
   - Place in `public/fonts/`

### Type Scale

Using a 1.25 ratio (major third) anchored at 16px body:

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Display | 36px / 2.25rem | 700 | 1.2 | Homepage hero only |
| H1 | 30px / 1.875rem | 700 | 1.3 | Tool page title |
| H2 | 24px / 1.5rem | 700 | 1.35 | Section headings |
| H3 | 20px / 1.25rem | 600 | 1.4 | Subsection headings |
| Body | 16px / 1rem | 400 | 1.6 | Paragraphs, descriptions |
| Body strong | 16px / 1rem | 500 | 1.6 | Labels, emphasis |
| Small | 14px / 0.875rem | 400 | 1.5 | Captions, disclaimers, metadata |
| Tiny | 12px / 0.75rem | 400 | 1.5 | Legal text, affiliate disclosures fine print |

### Mobile Adjustments

| Element | Desktop | Mobile (< 640px) |
|---------|---------|-------------------|
| Display | 36px | 28px |
| H1 | 30px | 24px |
| H2 | 24px | 20px |
| Body | 16px | 16px (no change) |

**Rule:** Body text never goes below 16px on any screen size.

---

## 4. Spacing & Layout System

### Spacing Scale

Based on 4px increments (Tailwind defaults):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (icon + label) |
| sm | 8px | Inline spacing, small padding |
| md | 16px | Component internal padding |
| lg | 24px | Between related elements |
| xl | 32px | Between content sections |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page section padding (desktop) |

### Page Layout

- **Max content width:** 1200px (centered)
- **Page horizontal padding:** 16px mobile, 24px tablet, 32px desktop
- **Content column max width:** 768px for prose (educational content, FAQs)
- **Calculator max width:** 1024px (needs room for 2-column input + results)

### Card Design

```
Background:    white
Border:        1px solid neutral-200
Border radius: 12px (rounded-xl in Tailwind)
Padding:       24px (p-6)
Shadow:        0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
               (shadow-md in Tailwind)
Hover shadow:  0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)
               (shadow-lg — for clickable cards only)
```

---

## 5. Calculator UI Design

This is the core product — it must be excellent.

### Input Design: Slider + Field Hybrid

Every numeric input gets **both** a slider and a text field, synced together:

```
┌─────────────────────────────────────────────────────┐
│  Initial Investment                                  │
│  ┌──────────────┐                                   │
│  │ $ 10,000     │    ←  text input (editable)       │
│  └──────────────┘                                   │
│  ○──────────●──────────────────────  $0 — $500K     │
│               ↑ slider (draggable)                  │
└─────────────────────────────────────────────────────┘
```

**Why both:** Sliders encourage exploration (users test scenarios); text fields allow precision. NNGroup and Baymard both recommend the hybrid approach.

**Input rules:**
- Currency inputs: `$` prefix, comma-separated thousands, 2 decimal places
- Percentage inputs: `%` suffix, 1 decimal place
- Year/month inputs: integer only with unit label
- All inputs get `inputmode="decimal"` on mobile (shows number pad, not full keyboard)
- Smart defaults for every field (realistic values, clearly labeled as defaults)
- Inline validation — highlight out-of-range values immediately, don't wait for submit

### Categorical Inputs

- **Dropdowns** for compounding frequency, loan term presets, risk tolerance
- **Toggle switches** for binary choices (monthly/annual, Roth/Traditional)
- **Radio buttons** for 2–4 mutually exclusive options visible at once

### Progressive Disclosure

Calculators with 6+ inputs should split into:

1. **Essential inputs** (3–5) — visible by default
2. **Advanced options** — collapsed behind "Advanced settings" toggle

Example for compound interest calculator:
- **Essential:** Initial investment, monthly contribution, time period, interest rate
- **Advanced:** Compounding frequency, contribution timing (beginning/end of period), tax rate, inflation adjustment

### "Solve for X" Multi-Tab Pattern

For investment and retirement calculators, offer tabs that let users pick which variable to solve for. This turns one calculator into 3-5 use cases and multiplies keyword surface area. Learned from Calculator.net's most effective UX pattern.

```
┌─────────────┬──────────────┬─────────────┬──────────────┬──────────┐
│ End Amount  │ Contribution │ Return Rate │ Start Amount │  Time    │
│  (active)   │              │             │              │          │
└─────────────┴──────────────┴─────────────┴──────────────┴──────────┘
```

**Design rules:**
- Active tab: `bg-white`, `border-b-2 border-primary-500`, `font-medium text-primary-900`
- Inactive tabs: `bg-neutral-50`, `text-neutral-600`, `hover:text-primary-500`
- Tabs are horizontally scrollable on mobile (no wrapping)
- The active tab field becomes the **output** (big number result); all other fields become inputs
- Smooth transition when switching tabs (fade content, don't jump)

### Schedule Tables (Growth, Amortization)

Schedule tables (year-by-year or month-by-month) are high-value content users expect. But dumping 120+ raw rows (Calculator.net's approach) is a UX anti-pattern. Our design:

```
┌──────┬────────────┬─────────────┬──────────────┬──────────────┐
│ Year │ Deposit    │ Interest    │ Balance      │   ▼          │
├──────┼────────────┼─────────────┼──────────────┼──────────────┤
│ 2026 │ $12,000    │ $650        │ $22,650      │   ▼ Expand   │
│ 2027 │ $12,000    │ $1,782      │ $36,432      │   ▼ Expand   │
│ 2028 │ $12,000    │ $3,117      │ $51,549      │   ▼ Expand   │
└──────┴────────────┴─────────────┴──────────────┴──────────────┘
              [ Show monthly detail ]
```

**Design rules:**
- **Default view:** Year-by-year summary (compact, ~5-30 rows)
- **Expand:** Click year row to show monthly breakdown for that year (accordion style, `200ms` transition)
- **Toggle:** "Show annual" / "Show monthly" switch above table
- **Sticky header:** Column headers stick during scroll (`position: sticky; top: 0`)
- **Zebra striping:** Alternating `white` / `neutral-50` rows
- **Number alignment:** Right-aligned with `tabular-nums`, currency formatted
- **Mobile:** Horizontal scroll with sticky first column, or reflow to card layout per row

### Result Display

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│    Your investment could grow to                         │
│                                                          │
│    $247,632                                              │
│    ██████████████████████████                             │
│                                                          │
│    Total contributions:  $120,000                        │
│    Interest earned:      $127,632                        │
│                                                          │
│    ┌─── Growth chart ──────────────────────────┐         │
│    │    📈                                      │         │
│    │         (line chart: balance over time)    │         │
│    │                                            │         │
│    └────────────────────────────────────────────┘         │
│                                                          │
│    [📧 Email me my results]  [📄 Download PDF]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Result rules:**
- **Real-time calculation** — no submit button. Results update instantly as inputs change.
- **Big number first** — the primary result (total, monthly payment, etc.) is prominent: 30px+ font, bold, primary-900 color
- **Context line** — always explain what the number means in terms the user cares about. These should be calculator-specific, not generic:
  - Compound interest: "That's $X in interest earned — $Y more than a regular savings account"
  - Loan amortization: "You'll pay $X in total interest over the life of the loan"
  - Debt payoff: "Avalanche saves you $X compared to minimum payments"
  - Retirement: "At this rate, you'll have X% of your target by age 65"
  - Savings goal: "Saving $X/month, you'll reach your goal in Y months"
  - Salary: "That's $X/hour before taxes, $Y/hour after estimated withholding"
- **Breakdown** — secondary numbers (principal vs interest, contributions vs growth) in a clear list or table
- **Chart** — line chart for growth over time, pie chart for composition breakdowns, bar chart for comparisons (snowball vs avalanche)
- **Action buttons** — email results, download PDF, reset calculator
- **No results gating** — results are always visible. Email capture is optional ("email me a copy").

### Two-Column Calculator Layout (Desktop)

```
┌────────────────────────┬─────────────────────────────────┐
│                        │                                 │
│   INPUTS               │   RESULTS                      │
│                        │                                 │
│   [ form fields ]      │   Big number: $247,632          │
│   [ sliders     ]      │   Breakdown table               │
│   [ dropdowns   ]      │   Chart                         │
│                        │   Action buttons                │
│   [Advanced ▼]         │                                 │
│                        │                                 │
└────────────────────────┴─────────────────────────────────┘
```

- Inputs: left column (~40% width)
- Results: right column (~60% width) — sticky on scroll so results stay visible while adjusting advanced inputs
- **Mobile:** Stack vertically — inputs on top, results below (results scroll into view after input)

### Form States

| State | Visual Treatment |
|-------|-----------------|
| Default | neutral-200 border, white background |
| Focused | primary-500 border (2px), primary-50 background, ring shadow |
| Error | negative-500 border, negative-100 background, error text below |
| Disabled | neutral-100 background, neutral-400 text |

### Reset & Comparison

- **Reset button** — always available, resets all inputs to defaults
- **"Compare scenarios" option** for complex calculators — let users save a result set and compare side-by-side (stretch goal, not MVP)

---

## 6. Navigation & Information Architecture

### Site Structure

```
[Logo / Site Name]   [Calculators ▼]  [Tools]  [About]

Calculators dropdown:
├── Saving & Growth
│   ├── Compound Interest Calculator
│   ├── Investment Return Calculator
│   ├── Savings Goal Calculator
│   └── ROI Calculator
├── Debt & Loans
│   ├── Loan Amortization Calculator
│   ├── Debt Payoff Calculator
│   └── Rent vs. Buy Calculator
├── Income & Planning
│   ├── Retirement Savings Calculator
│   ├── Salary & Take-Home Calculator
│   ├── Net Worth Calculator
│   └── Emergency Fund Calculator
└── Economic
    └── Inflation Calculator

Tools link:
→ /tools (lists all 15 tools including utility tools)

Utility tools (not in Calculators dropdown — different category):
├── QR Code Generator
├── Password Generator
└── JSON Formatter

File Tools (Phase 2 — secondary category, not in Calculators dropdown):
├── Image Compressor
├── Image Resizer
├── Image Format Converter
├── SVG to PNG Converter
├── HEIC to JPG Converter
├── CSV ↔ JSON Converter
├── Markdown ↔ HTML Converter
└── Images to PDF
```

### Nav Design

- **Desktop:** Horizontal top nav, sticky on scroll, white background with subtle bottom border
- **Mobile:** Hamburger menu (right side), full-screen overlay when open
- **Logo** on the left, always links to homepage
- **Limit main nav to 4–5 items** — Calculators (dropdown), Tools, About, plus optional CTA
- **No mega menus** — a simple grouped dropdown is enough for 15 tools
- **Active state:** primary-500 underline on current section

### Homepage

```
┌──────────────────────────────────────────────────────────┐
│  [Nav bar]                                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Free Financial Calculators                              │
│  See your numbers instantly — no signup, no ads.         │
│                                                          │
│  [Browse Calculators →]                                  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Popular Calculators                                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Compound │  │  Loan    │  │Retirement│               │
│  │ Interest │  │  Amort.  │  │ Savings  │               │
│  │    →     │  │    →     │  │    →     │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Investment│  │Debt Pay- │  │  Salary  │               │
│  │ Return   │  │  off     │  │Take-Home │               │
│  │    →     │  │    →     │  │    →     │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  All Tools                                               │
│                                                          │
│  [Saving & Growth]  [Debt & Loans]  [Income & Planning]  │
│  [Economic]  [Utility Tools]                             │
│                                                          │
│  (filterable grid of all 15 tools)                       │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Footer: About | Privacy | Terms | Affiliate Disclosure   │
│          © 2026 CalcRun                                 │
└──────────────────────────────────────────────────────────┘
```

### Homepage Design Notes

- **No hero image** — uses a dark gradient background instead (see Section 11: Visual Polish)
- **Popular tools first** — 6 highest-value calculators as cards in a 3×2 grid (2×3 on mobile). Selected to cover all 5 customer segments: compound interest (young savers), loan amortization (home decision-makers), retirement (pre-retirees), investment return (young savers/pre-retirees), debt payoff (debt resolvers), salary (career optimizers)
- **Category filter bar** — horizontal pills to filter the full tool grid
- **Tool cards:** Title, one-line description, arrow icon. Clean, scannable.
- **No testimonials or social proof at launch** — we have none yet. Add later when real.

### Tool Page Layout (Detailed)

```
[Nav bar]

[Breadcrumb: Home > Calculators > Saving & Growth > Compound Interest]

H1: Compound Interest Calculator
Subtitle: See how your money grows over time with compound interest.

[Affiliate Disclosure: small banner]

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [Calculator component — inputs + results]               │
│                                                          │
└──────────────────────────────────────────────────────────┘

H2: How to Use This Calculator
(2–3 paragraphs explaining inputs and outputs)

H2: Understanding Compound Interest
(educational content, 500–1,000 words)

H2: Worked Examples
(2–3 real scenarios with specific numbers)

H2: Frequently Asked Questions
(3–5 FAQs with schema markup, accordion style)

H2: Related Calculators
(4–6 cards linking to related tools)

[Optional: Affiliate comparison table if applicable]

[Footer]
```

### Breadcrumbs

- Present on all tool pages for navigation and SEO
- Format: `Home > Category > Tool Name`
- Schema markup: BreadcrumbList structured data

### Internal Linking Widget: "Related Calculators"

```
┌──────────────────────────────────────────────────────┐
│  Related Calculators                                  │
│                                                      │
│  ┌────────────────┐  ┌────────────────┐              │
│  │ Investment      │  │ Savings Goal   │              │
│  │ Return Calc.    │  │ Calculator     │              │
│  │ See how your    │  │ How long to    │              │
│  │ portfolio...  → │  │ reach your...→ │              │
│  └────────────────┘  └────────────────┘              │
│                                                      │
│  ┌────────────────┐  ┌────────────────┐              │
│  │ Retirement      │  │ Inflation      │              │
│  │ Savings Calc.   │  │ Calculator     │              │
│  │ Plan for your   │  │ What will      │              │
│  │ retirement... → │  │ $X be worth..→ │              │
│  └────────────────┘  └────────────────┘              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- 2×2 grid on desktop, single column on mobile
- Each card: tool name, one-line description, arrow

---

## 7. Mobile Design

### Breakpoints

| Name | Min width | Layout |
|------|-----------|--------|
| Mobile | 0px | Single column, hamburger nav |
| Tablet | 640px (sm) | 2-column grids, expanded nav |
| Desktop | 1024px (lg) | Full layout, sticky results panel |

### Mobile-Specific Rules

1. **Single-column layout** for all content
2. **Calculator:** inputs stacked vertically, results below (not side-by-side)
3. **Tap targets:** minimum 44×44px for all buttons and interactive elements
4. **Input fields:** full width, 48px height minimum
5. **Sliders:** larger handles (24px diameter) for touch
6. **Number inputs:** use `inputmode="decimal"` to trigger number pad
7. **Charts:** simplified on mobile — reduce labels, increase touch targets on tooltips
8. **Tables:** horizontal scroll with sticky first column, or reflow to card layout
9. **Sticky CTA:** "Email Results" or "Download PDF" button pinned to bottom of screen when results are visible
10. **No hover-dependent interactions** — everything works on tap

### Mobile Navigation

- Hamburger icon (right side of nav bar)
- Opens full-screen overlay with all nav items
- Categories are expandable accordion sections
- Close button (X) in top right
- Tapping outside the menu closes it

---

## 8. Affiliate & Monetization UI

### Affiliate Disclosure Component

```
┌──────────────────────────────────────────────────────────┐
│  ℹ️  Some links on this page are affiliate links. We     │
│  may earn a commission at no extra cost to you.          │
│  [Full disclosure →]                                     │
└──────────────────────────────────────────────────────────┘
```

- Appears at the top of any page with affiliate links (below H1, above calculator)
- Subtle but visible — neutral-100 background, neutral-700 text, left border in primary-500
- Links to full `/disclosure` page
- **Not dismissible** — FTC requires it to be visible

### Comparison Table Design

For "Best X" tables (high-converting affiliate placement):

```
┌──────────────────────────────────────────────────────────┐
│  Best High-Yield Savings Accounts (2026)                 │
├──────────────┬──────────┬──────────┬─────────────────────┤
│  Provider    │   APY    │  Min.    │                     │
│              │          │  Deposit │                     │
├──────────────┼──────────┼──────────┼─────────────────────┤
│  Provider A  │  5.05%   │  $0      │  [Visit Site →]     │
│  Provider B  │  4.90%   │  $0      │  [Visit Site →]     │
│  Provider C  │  4.75%   │  $100    │  [Visit Site →]     │
└──────────────┴──────────┴──────────┴─────────────────────┘
│  Last updated: Feb 2026. Rates subject to change.        │
└──────────────────────────────────────────────────────────┘
```

- Clean table with alternating row backgrounds (white / neutral-50)
- CTA buttons in accent-600 (#059669) green — "Visit Site" is the action (accent-500 fails WCAG AA on white)
- "Last updated" date visible (trust signal)
- Mobile: reflow to card layout (one provider per card, stacked)

### Email Capture Component

Appears **after** calculator results (never gates results):

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  📧  Want a copy of your results?                        │
│                                                          │
│  We'll email you a PDF with your full breakdown.         │
│                                                          │
│  ┌──────────────────────────┐  ┌──────────────────┐      │
│  │  your@email.com          │  │  Send my results │      │
│  └──────────────────────────┘  └──────────────────┘      │
│                                                          │
│  No spam. Unsubscribe anytime.                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Positioned directly below the results card
- Single email field + submit button (minimal friction)
- Reassurance copy: "No spam. Unsubscribe anytime."
- On success: green checkmark + "Check your inbox!"
- **Never a modal or popup** — inline only

---

## 9. Accessibility

### WCAG AA Compliance (Minimum)

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | 4.5:1 for normal text, 3:1 for large text — verified against our palette |
| Keyboard navigation | All inputs, buttons, links reachable via Tab. Visible focus rings. |
| Screen readers | ARIA labels on all form inputs, `aria-live` on result regions for real-time updates |
| Focus management | When calculator results update, announce to screen readers via `aria-live="polite"` |
| Alt text | All charts get descriptive `aria-label` summarizing the data |
| Motion | Respect `prefers-reduced-motion` — disable chart animations, transitions |
| Semantic HTML | Proper heading hierarchy (H1→H2→H3), landmark roles, form labels |
| Color independence | Never use color alone — pair with icons, labels, or patterns |

### Form Accessibility

- Every input has a visible `<label>` (not just placeholder text)
- Error messages linked to inputs via `aria-describedby`
- Required fields marked with `aria-required="true"` and visible indicator
- Slider values announced to screen readers on change
- Group related inputs with `<fieldset>` + `<legend>`

---

## 10. Micro-Interactions & Feedback

### Transitions

- **Default transition:** 150ms ease-in-out for hover states, focus rings, color changes
- **Slider thumb:** smooth tracking, no delay
- **Chart animations:** gentle draw-in on first render (600ms), respect reduced-motion preference
- **Accordion expand:** 200ms height transition for FAQ and advanced options

### Feedback States

| Action | Feedback |
|--------|----------|
| Input change | Results update in real-time (< 100ms) |
| Slider drag | Value display updates continuously |
| Email submit | Button shows spinner → success checkmark |
| PDF download | Button shows "Generating..." → auto-downloads |
| Reset | All fields animate back to defaults |
| Error (invalid input) | Field border turns red, error text appears below |

### Loading

- Calculators are React islands — they hydrate on page load
- Show a skeleton placeholder (gray shimmer) while the island hydrates
- No full-page loading spinners — Astro SSG means the HTML is instant

---

## 11. Visual Polish & Appeal

The site must look **modern, clean, and visually compelling** — not just functional. These details separate a professional site from a generic one.

### Homepage Hero

Not a generic hero image. Instead, a **subtle animated gradient** background (blue-to-teal) behind the headline, with the tool grid below. This creates visual interest without stock photos.

```css
.hero {
  background: linear-gradient(135deg, #0A2540 0%, #1A3A5C 50%, #0A2540 100%);
  /* Subtle animated gradient shift */
}
```

White text on the gradient. Clean, authoritative, modern.

### Card Hover Effects

Tool cards on the homepage aren't flat — they have subtle depth and respond to interaction:

- **Default:** white card, light shadow, neutral-200 border
- **Hover:** card lifts slightly (`transform: translateY(-2px)`), shadow deepens, border shifts to primary-100
- **Transition:** 150ms ease-out — feels snappy, not sluggish
- **Category icon:** each card gets a small, simple SVG icon (chart icon for investment tools, shield for security tools, etc.) in primary-500

### Gradient Accents

Use subtle gradients sparingly for visual richness:
- **Result highlight bar** behind the big number: faint blue-to-green gradient (primary-50 to accent-100)
- **CTA buttons:** solid accent-600 green, not gradient (gradients on buttons look dated)
- **Section dividers:** thin gradient line (primary-500 to accent-500) instead of a plain gray border — used once or twice per page, not everywhere

### Whitespace Is the Luxury

The #1 differentiator from cluttered competitor sites (Calculator.net, Bankrate):
- 48px+ between major sections
- 64px page section padding on desktop
- Cards breathe — 24px internal padding minimum
- No sidebar clutter — full-width content with a max-width constraint
- The page should feel spacious, not cramped

### Visual Hierarchy Techniques

- **Big number results** in 36px+ bold with a colored background card — this is the moment the user came for
- **Subtle background color shifts** to separate page zones: white for calculator, neutral-50 for educational content, primary-50 for related tools section
- **Consistent icon language:** 20px line-style icons (not filled) from a free icon set (Lucide or Heroicons). Used in nav, tool cards, FAQ accordion triggers, and action buttons.
- **Rounded corners everywhere** — 12px on cards, 8px on inputs, 6px on small elements. Rounded feels friendly and modern.

### Typography Refinement

Beyond the type scale, these details matter:
- **Tabular numerals** (`font-variant-numeric: tabular-nums`) on all number displays — columns align, comparison tables look professional
- **Letter-spacing** on headings: `-0.02em` for H1 and Display (tighter tracking on large text looks polished)
- **Paragraph max-width:** 65–75 characters per line for educational content (768px container handles this naturally)
- **Link underlines:** use `text-decoration-thickness: 1px` and `text-underline-offset: 2px` for elegant, readable links

### Icons

Use **Lucide** (free, MIT license, 1000+ icons, consistent 24px line style):
- `calculator` — financial tools
- `trending-up` — investment/growth tools
- `shield-check` — password generator
- `qr-code` — QR code tool
- `braces` — JSON formatter
- `piggy-bank` — savings tools
- `home` — rent vs buy
- `wallet` — salary/income tools
- `target` — goal-based tools
- `arrow-right` — card navigation arrows

Install: `npm install lucide-react` (works with React islands)

### Empty/Loading States

Even loading states should look good:
- **Skeleton screens** for calculator hydration: gray shimmer rectangles matching the input layout
- **Chart placeholder:** subtle grid pattern with a faded line, replaced by real chart on hydrate
- **No content layout shift** — skeleton dimensions match final component dimensions exactly (prevents CLS)

### Subtle Animations (with reduced-motion respect)

```css
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 150ms ease-out, box-shadow 150ms ease-out; }
  .card:hover { transform: translateY(-2px); }

  .result-number { animation: countUp 600ms ease-out; }
  .chart-line { animation: drawIn 800ms ease-out; }
}
```

Every animation must be wrapped in a `prefers-reduced-motion` check. Users who opt out of motion see instant state changes with no animation.

---

## 12. Embeddable Widget Design

### Minimal Embed Version

Stripped-down calculator for embedding on third-party sites:

- Calculator inputs + results only (no educational content, no nav, no footer)
- White background, self-contained card with subtle border
- "Powered by CalcRun" link at bottom — links back to full tool page
- Responsive within iframe (fills container width)
- Max height: 600px with internal scroll if needed

### Embed Attribution

```
Powered by CalcRun — Free Financial Calculators
```

- 12px text, neutral-500 color, links to homepage
- Always visible, not removable by embed user

---

## 13. OG Images & Social Sharing

See **Section 1 > OG Image Generation** for the full Satori + Sharp implementation plan.

**Summary:** 1200x630px, navy background, white text, CalcRun branding, tool name + description. Generated at build time via Astro static endpoint — zero runtime cost.

---

## 14. File Converter UI Design (Phase 2)

File converters use the same design system and quality standards as calculators, but with a drag-and-drop file upload pattern instead of numeric inputs. The core identity remains financial calculators — converters are a secondary category that shares the design language.

### File Upload Area

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│       ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐         │
│       │                                        │         │
│       │    📁  Drop your files here             │         │
│       │    or click to browse                  │         │
│       │                                        │         │
│       │    Supports: PNG, JPG, WebP, SVG       │         │
│       └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘         │
│                                                          │
│    🔒 Your files never leave your device                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Design rules:**
- Dashed border (`border-2 border-dashed border-neutral-300`), `rounded-2xl`, `bg-neutral-50`
- Drag active state: `border-primary-500 bg-primary-50` with scale pulse
- Upload icon: Lucide `upload-cloud` at 48px, `text-neutral-400`
- Accepted formats listed below the drop zone in `text-sm text-neutral-500`
- Privacy badge: Lock icon + "Your files never leave your device" in `text-accent-600` below drop zone. This is mandatory on every converter page.

### Converter Two-Column Layout

Same pattern as calculators — settings left, output right:

```
┌────────────────────────┬─────────────────────────────────┐
│                        │                                 │
│   SETTINGS             │   OUTPUT / PREVIEW              │
│                        │                                 │
│   [Drop zone]          │   Preview of converted file     │
│   [Format dropdown]    │   File size comparison          │
│   [Quality slider]     │   [Download] [Download All]     │
│                        │                                 │
└────────────────────────┴─────────────────────────────────┘
```

- Settings column: file upload drop zone, format/quality options
- Output column: preview of converted file, before/after file size, download buttons
- Mobile: stacked vertically (upload → settings → output)
- Batch support: file list with individual progress bars, "Download All" as ZIP

### Privacy Badge Component

Required on every file converter page:

```
┌──────────────────────────────────────────────────────────┐
│  🔒  100% Private — Your files never leave your device.  │
│  All processing happens in your browser.                 │
└──────────────────────────────────────────────────────────┘
```

- Background: `accent-100` (light green)
- Border-left: `4px solid accent-600`
- Icon: Lucide `shield-check` in `accent-600`
- Text: `neutral-900` with `text-sm`

---

## 15. Dark Mode

**Decision: Not for MVP.**

Rationale:
- Financial tool sites are expected to be light-themed (trustworthy, open feel)
- Dark mode doubles the design surface area and testing matrix
- No competitor in this space offers dark mode as a differentiator
- Can be added later if users request it

The color system uses CSS custom properties, so adding dark mode later means only defining an alternate set of values.

---

## 15. Design Tokens Summary (Tailwind CSS v4)

All design decisions above map to Tailwind CSS v4 `@theme` configuration in the global CSS file:

```css
@import "tailwindcss";

@theme {
  /* Primary (blue — trust) */
  --color-primary-900: #0A2540;
  --color-primary-700: #1A3A5C;
  --color-primary-500: #2563EB;
  --color-primary-300: #93C5FD;
  --color-primary-200: #BFDBFE;
  --color-primary-100: #DBEAFE;
  --color-primary-50: #EFF6FF;

  /* Accent (green — growth/positive) */
  --color-accent-600: #059669;
  --color-accent-500: #10B981;
  --color-accent-100: #D1FAE5;

  /* Negative (red — errors/losses) */
  --color-negative-500: #EF4444;
  --color-negative-100: #FEE2E2;

  /* Warning (amber) */
  --color-warning-500: #F59E0B;

  /* Neutrals */
  --color-neutral-900: #111827;
  --color-neutral-700: #374151;
  --color-neutral-500: #6B7280;
  --color-neutral-200: #E5E7EB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-50: #F9FAFB;

  /* Typography */
  --font-family-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
}
```

---

## 16. Design Checklist: Pre-Build

Before writing component code, confirm these decisions are locked:

- [x] **Site name chosen** — CalcRun. Live at `calcrun.com` (purchased via Cloudflare Registrar, ~$10/year). `calcrun.pages.dev` redirects to it.
- [x] **Color palette finalized** — blue/green trust palette with contrast-verified pairs (see Section 2).
- [x] **Font loaded** — Inter variable font `.woff2` self-hosted in `public/fonts/`. `@font-face` in global CSS. Inter `.ttf` for Satori OG image generation. JetBrains Mono for JSON formatter.
- [x] **Lucide icons installed** — `lucide-react` in package.json. Icon names assigned per tool in `tools-data.ts`.
- [x] **Tailwind theme configured** — all design tokens from Section 15 in global CSS `@theme` block, plus `accent-700` for WCAG AA hover states.
- [x] **Logo SVG created** — `Logo.astro` component implemented. Favicon variants generated (SVG, 32px PNG, 180px apple-touch, 192/512px PWA icons).
- [ ] **Calculator layout validated** — build compound interest calculator first, test the input/result pattern at 375px (iPhone SE) and 1024px+ before building the rest.
- [ ] **"Solve for X" tabs validated** — test multi-tab pattern on investment calculator before applying to retirement.
- [ ] **Schedule table pattern validated** — test collapsible year-group table on compound interest before applying to loan amortization.
- [ ] **Visual polish verified** — card hovers, gradient accents, whitespace, skeleton loading all implemented and looking good before scaling to all 15 tools.
- [ ] **File converter UI validated** (Phase 2) — test drag-and-drop upload + privacy badge on image compressor before building remaining converters.

---

## Sources & References

- Nielsen Norman Group: [12 Design Recommendations for Calculator and Quiz Tools](https://www.nngroup.com/articles/recommendations-calculator/)
- Baymard Institute: [Improve Form Slider UX](https://baymard.com/blog/slider-interfaces)
- Eleken: [Fintech Design Guide — Patterns That Build Trust](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- Mojo Agency: [12 Financial Services Web Design Tips for 2025](https://mojo-agency.com/12-financial-services-web-design-tips-for-2025/)
- Creative Adviser: [Financial Services Website Common Mistakes](https://creativeadviser.co.uk/financial-services-websites-mistakes/)
- WeBuild: [Calculator UX Design for Fintech](https://webuild.io/calculator-ux-design-for-fintech/)
- Phoenix Strategy Group: [Color Palettes for Financial Dashboards](https://www.phoenixstrategy.group/blog/best-color-palettes-for-financial-dashboards)
