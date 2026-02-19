# Design, Branding & UX Plan

> Planning pass focused on aesthetics, styling, UI/UX, navigation, and branding.
> Informed by competitor analysis (NerdWallet, Bankrate, SmartAsset, Calculator.net)
> and UX research (Nielsen Norman Group, Baymard Institute).

---

## 1. Site Name & Branding

### Naming Criteria

A financial tool site name should be:

1. **Short** — 1–2 words, under 12 characters ideal
2. **Trust-evoking** — hint at finance/calculation without being generic
3. **Memorable** — easy to spell, no hyphens or numbers
4. **Available as .com** — non-.com domains hurt credibility for financial sites
5. **Unique enough to rank** — avoid competing with established brands for the brand keyword

### Naming Archetypes

| Archetype | Examples | Pros | Cons |
|-----------|----------|------|------|
| **Descriptive-compound** | NerdWallet, Bankrate, SmartAsset | Instantly clear | Hard to find .com |
| **Function-first** | Calculator.net, CalcXP | SEO-friendly | Generic, forgettable |
| **Outcome-focused** | Empower, Wealthfront | Aspirational | May not signal "tools" |
| **Branded/invented** | Finlo, Calqulate, Numra | Unique, ownable | Needs brand-building |

### Candidate Names

Evaluate against criteria above. Final pick depends on .com availability.

| Name | Style | Rationale |
|------|-------|-----------|
| **CalcWise** | Descriptive-compound | Calculator + wisdom. Signals smart financial tools. |
| **FigureFlow** | Branded | "Figure" = numbers/finance; "Flow" = ease of use. |
| **ClearCalc** | Descriptive-compound | Clarity + calculation. Clean and trustworthy. |
| **NumVault** | Branded | Numbers + vault (security/finance). Short. |
| **PlanBetter** | Outcome-focused | Directly states the benefit. |
| **FinCalc** | Function-first | Finance + calculator. Direct, SEO-friendly. |
| **CalcStack** | Descriptive-compound | Stack of calculators. Developer-adjacent feel. |

**Recommendation:** Lean toward descriptive-compound style (CalcWise, ClearCalc, FinCalc) — these communicate what the site does without explanation, which matters for a new brand with zero recognition.

### Logo Direction

- **Wordmark-first** — no icon-only logo needed at this scale
- Clean sans-serif treatment of the site name
- Optional: subtle calculator/chart motif integrated into a letterform
- Must work at small sizes (favicon, OG images, embed attribution)
- **Favicon:** First letter or 2-letter abbreviation in brand primary color on white

### Brand Voice

- **Trustworthy but approachable** — not stuffy, not casual
- Plain language over jargon (explain APR, CAGR, amortization inline)
- Second person: "your savings," "your monthly payment"
- Helpful framing: "Here's what this means for you" after every result
- No "AI-powered" marketing — NNGroup research shows this undermines credibility for straightforward calculators

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
- **Green for positive outcomes only** — gains, savings, growth projections
- **Red sparingly** — only for errors, losses, debt amounts
- **Blue for interactive elements** — links, buttons, active inputs, chart highlights
- **Never use color alone** to convey information (accessibility: use icons + labels too)

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
- **Advanced:** Compounding frequency, tax rate, inflation adjustment

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
- **Context line** — always explain what the number means: "That's $X more than if you kept it in a savings account" or "This is 28% of your monthly income"
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
│   ├── Loan Payment Calculator
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
│  Plan smarter with tools that show you the numbers.      │
│                                                          │
│  [Browse Calculators →]                                  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Popular Calculators                                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Compound │  │  Loan    │  │Retirement│               │
│  │ Interest │  │ Payment  │  │ Savings  │               │
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
│  Footer: About | Privacy | Affiliate Disclosure          │
│          © 2026 [Site Name]                              │
└──────────────────────────────────────────────────────────┘
```

### Homepage Design Notes

- **No hero image** — the value prop is the tools, not a stock photo
- **Popular tools first** — 6 most-used calculators as cards in a 3×2 grid (2×3 on mobile)
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
- CTA buttons in accent-500 (green) — "Visit Site" is the action
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

## 11. Embeddable Widget Design

### Minimal Embed Version

Stripped-down calculator for embedding on third-party sites:

- Calculator inputs + results only (no educational content, no nav, no footer)
- White background, self-contained card with subtle border
- "Powered by [SiteName]" link at bottom — links back to full tool page
- Responsive within iframe (fills container width)
- Max height: 600px with internal scroll if needed

### Embed Attribution

```
Powered by [SiteName] — Free Financial Calculators
```

- 12px text, neutral-500 color, links to homepage
- Always visible, not removable by embed user

---

## 12. OG Images & Social Sharing

### Template

Each tool page gets an auto-generated OG image:

```
┌──────────────────────────────────────────────┐
│                                              │
│  [Site Logo]                                 │
│                                              │
│  Compound Interest                           │
│  Calculator                                  │
│                                              │
│  See how your money grows over time.         │
│                                              │
│  [site-url.com]                              │
│                                              │
└──────────────────────────────────────────────┘
```

- 1200×630px (standard OG image size)
- Deep navy background (primary-900), white text
- Site logo top-left, URL bottom-left
- Tool name in large Display font
- One-line description below
- Generated at build time (Astro can generate these with `@vercel/og` or a custom canvas script)

---

## 13. Dark Mode

**Decision: Not for MVP.**

Rationale:
- Financial tool sites are expected to be light-themed (trustworthy, open feel)
- Dark mode doubles the design surface area and testing matrix
- No competitor in this space offers dark mode as a differentiator
- Can be added later if users request it

The color system uses CSS custom properties, so adding dark mode later means only defining an alternate set of values.

---

## 14. Design Tokens Summary (Tailwind CSS v4)

All design decisions above map to Tailwind CSS v4 `@theme` configuration in the global CSS file:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-900: #0A2540;
  --color-primary-700: #1A3A5C;
  --color-primary-500: #2563EB;
  --color-primary-100: #DBEAFE;
  --color-primary-50: #EFF6FF;

  --color-accent-600: #059669;
  --color-accent-500: #10B981;
  --color-accent-100: #D1FAE5;

  --color-negative-500: #EF4444;
  --color-negative-100: #FEE2E2;

  --color-warning-500: #F59E0B;

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

## 15. Design Checklist: Pre-Build

Before writing component code, confirm these decisions are locked:

- [ ] **Site name chosen** and .com domain registered (or at minimum reserved)
- [ ] **Color palette** finalized (the one above is the proposal — adjust if needed)
- [ ] **Font loaded** — add Inter to the Astro layout via Google Fonts or self-hosted
- [ ] **Tailwind theme** configured with design tokens above
- [ ] **Calculator layout** — build one calculator first (compound interest) and validate the input/result pattern before building the rest
- [ ] **Mobile tested** — verify calculator layout on 375px width (iPhone SE) before building all 12

---

## Sources & References

- Nielsen Norman Group: [12 Design Recommendations for Calculator and Quiz Tools](https://www.nngroup.com/articles/recommendations-calculator/)
- Baymard Institute: [Improve Form Slider UX](https://baymard.com/blog/slider-interfaces)
- Eleken: [Fintech Design Guide — Patterns That Build Trust](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- Mojo Agency: [12 Financial Services Web Design Tips for 2025](https://mojo-agency.com/12-financial-services-web-design-tips-for-2025/)
- Creative Adviser: [Financial Services Website Common Mistakes](https://creativeadviser.co.uk/financial-services-websites-mistakes/)
- WeBuild: [Calculator UX Design for Fintech](https://webuild.io/calculator-ux-design-for-fintech/)
- Phoenix Strategy Group: [Color Palettes for Financial Dashboards](https://www.phoenixstrategy.group/blog/best-color-palettes-for-financial-dashboards)
