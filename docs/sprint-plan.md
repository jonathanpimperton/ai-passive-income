# CalcRun — Remaining Sprints Plan

## Context

Sprints 1-6 are complete. The product (31 tools, design, content, SEO structure) is solid.
The business engine is not connected — email capture, affiliate links, deployment, and analytics
are all missing or incomplete. This plan covers everything needed to go from "beautiful product"
to "functioning business generating revenue."

---

## Sprint 7: PDF Export Fix (Side Issue)

**Goal:** Fix the two PDF export problems: scrollbar artifacts and bad page breaks.

### Problem 1: Scrollbar Artifacts
The results panel contains tables wrapped in `overflow-x-auto` divs. html-to-image captures
these faithfully — including visible scrollbars and scroll shadows. In the PDF this looks broken.

**Fix approach:** Before capture, temporarily remove overflow/scroll styles from all scrollable
containers inside the results element. Restore after capture.

**Files to modify:**
- `src/lib/pdf-export.ts` — add pre-capture style overrides:
  1. Query all `[class*="overflow"]` elements inside `resultsElement`
  2. Store their original `overflow`, `overflowX`, `overflowY` styles
  3. Set `overflow: visible` on all of them before calling `toCanvas()`
  4. Restore in the `finally` block (same pattern as `data-pdf-hide` elements)

### Problem 2: Table Header / Body Split Across Pages
The current chunking algorithm blindly slices the canvas at pixel boundaries. This causes:
- Table title ("Year-by-Year Breakdown") orphaned at bottom of page 1
- Table column headers on page 1, data rows on page 2
- Rows cut in half at page boundaries

**Fix approach:** The chunking logic needs awareness of "section boundaries" in the captured
content. Since we're working with a single canvas (rasterized image), we can't introspect DOM
structure. Instead:

**Option A (simpler, chosen):** Before capture, mark logical sections with sentinel elements.
After capture, use those sentinels' pixel positions to find "safe break points" — places where
a page break won't split a visual section.

Implementation:
1. In each calculator component, add `data-pdf-section` attributes to major visual blocks:
   - The big number / summary section
   - Each breakdown card group
   - Each chart container
   - The schedule table (as one unit — title + headers + body)
2. In `pdf-export.ts`, before calling `toCanvas()`:
   - Query all `[data-pdf-section]` elements
   - Record their `offsetTop` and `offsetHeight` relative to `resultsElement`
   - These become "section boundaries" in pixel space
3. In the chunking loop, instead of slicing at arbitrary pixel positions:
   - Calculate the maximum pixels that fit on the current page
   - Find the last section boundary that fits entirely
   - Slice there instead of at the raw pixel limit
   - If a single section is taller than a page, fall back to raw slicing (unavoidable)

**Files to modify:**
- `src/lib/pdf-export.ts` — rewrite chunking loop with section-aware breaks
- `src/components/tools/CompoundInterestCalc.tsx` — add `data-pdf-section` to:
  - Summary/big number div, chart div, schedule table wrapper (title + table together)
- `src/components/tools/LoanAmortizationCalc.tsx` — same pattern
- `src/components/tools/InvestmentReturnCalc.tsx` — same pattern
- `src/components/tools/MortgagePaymentCalc.tsx` — same pattern
- `src/components/tools/RetirementSavingsCalc.tsx` — same pattern
- All other calculator components — add `data-pdf-section` to major blocks

### Problem 3: Collapsible Tables
Collapsible year-group tables (CompoundInterest, LoanAmortization, Mortgage, Investment) may
be collapsed when exported. The PDF should show the year-level summary only (as rendered),
not try to force-expand all rows.

**No code change needed** — the current behavior (capture what's visible) is correct. Users
who want monthly detail can expand before exporting.

### Verification
- Run Playwright tests on all 14 calculators
- Visually inspect the downloaded PDFs for:
  - No scrollbar artifacts
  - No split table headers
  - No orphaned headings
  - Clean page breaks between logical sections
  - Footer on every page

---

## Sprint 8: Email Capture & MailerLite Integration

**Goal:** Wire up the email capture funnel — the "north star metric" per the build spec.

### 8.1 Wire EmailCapture into Tool Pages

The `EmailCapture` component (`src/components/ui/EmailCapture.tsx`) is fully built and styled
but never rendered on any page.

**Changes:**
- `src/components/ui/ToolPageLayout.astro`:
  - After the calculator slot (after line ~91), add a new section for email capture
  - Only render on financial calculator pages (not utility tools, not file converters)
  - Condition: `affiliateContext` exists (same condition used for AffiliateDisclosure —
    financial tools have it, utility tools don't)
  - The EmailCapture component needs `client:visible` (lazy hydration — only loads when
    user scrolls to it)

- `src/pages/tools/[category]/[tool].astro`:
  - Import EmailCapture
  - Pass `toolSlug` and `toolName` props

**Placement:** Below the results panel, above the worked examples. This is the natural moment:
the user has seen their results and is deciding what to do next. "Want a copy?" is the softest
possible capture.

### 8.2 Homepage Email Capture

Add a lightweight email signup section to the homepage between the Popular Tools section and
the All Tools section.

**Copy:** "Get financial insights delivered weekly — tips, calculators, and strategies."
**Design:** Primary-50 background card with email input + subscribe button. Match the existing
EmailCapture component styling for consistency.

**File:** `src/pages/index.astro` — add new section after the Popular Tools grid.

### 8.3 Footer Email Capture

Add a compact email signup to the footer, before the 4-column link grid.

**File:** `src/components/ui/Footer.astro` — add email form row at top of footer.

### 8.4 MailerLite Integration

Update `EmailCapture.tsx` to POST to the actual MailerLite API:

1. Replace the TODO with a real fetch to MailerLite's subscriber API:
   ```
   POST https://connect.mailerlite.com/api/subscribers
   Headers: Authorization: Bearer {API_KEY}, Content-Type: application/json
   Body: { email, fields: { calculator: toolSlug }, groups: [GROUP_ID] }
   ```

2. The API key should NOT be in client-side code. Options:
   - **Option A (recommended):** Use MailerLite's embedded form endpoint (JSONP/form POST)
     which doesn't require an API key. This is what their free tier supports.
   - **Option B:** Use a Cloudflare Pages Function (serverless) as a proxy that holds the
     API key. More control but more complexity.

   Go with Option A for launch. The embedded form endpoint is:
   ```
   POST https://assets.mailerlite.com/jsonp/{ACCOUNT_ID}/subscribe
   Body: FormData with fields[email], fields[calculator_slug]
   ```

3. Add proper error handling:
   - Network failure → show retry message
   - Invalid email → show validation message
   - Already subscribed → show success (MailerLite handles this gracefully)

**External setup required (manual, not code):**
- Create MailerLite account (free tier: 500 subs, 12K emails/mo)
- Create subscriber group "Calculator Users"
- Create custom field "calculator_slug"
- Get the embedded form ID / account ID
- Set up the 3-email drip automation (see 8.5)

### 8.5 Email Drip Sequence (MailerLite Configuration)

Per the build spec, set up a 3-email automation triggered on new subscriber:

| Email | Timing | Subject | Content |
|-------|--------|---------|---------|
| 1 | Immediate | "Your {calculator} results" | PDF attachment or summary + 1 relevant tip |
| 2 | Day 3 | "What most people get wrong about {topic}" | Educational, NO affiliate links |
| 3 | Day 7 | "One thing that could help" | Soft affiliate recommendation with comparison |

Use MailerLite's automation builder with conditional content blocks based on the
`calculator_slug` custom field. Each calculator maps to different content:
- compound-interest → high-yield savings (Betterment, Marcus)
- mortgage-payment → mortgage comparison (LendingTree, SoFi)
- debt-payoff → debt consolidation (SoFi, LendingClub)
- etc. (full mapping in build-spec.md)

### Verification
- EmailCapture visible on all 14 financial calculator pages
- EmailCapture NOT visible on utility tools or file converters
- Homepage email signup renders correctly
- Footer email signup renders correctly
- Form submission to MailerLite succeeds (test with real email)
- Drip sequence triggers (test with real email)
- Mobile layout correct on all email capture placements

---

## Sprint 9: Affiliate Links & Revenue Engine

**Goal:** Display actual affiliate product recommendations on financial calculator pages.

### 9.1 Build AffiliateLinks Component

Create `src/components/ui/AffiliateLinks.astro` that renders clickable affiliate partner cards.

**Data source:** Each tool's frontmatter already has:
```yaml
affiliateContext: "Open a high-yield savings account to maximize compound growth"
affiliatePrograms: ["Betterment", "Marcus by Goldman Sachs", "Wealthfront"]
```

**Component design:**
- Section heading: "Compare Top Options" or the `affiliateContext` text
- Grid of partner cards (2-3 columns on desktop, 1 on mobile)
- Each card: partner logo/name, brief description, "Learn More →" CTA button
- FTC disclosure line below: "We may earn a commission — this doesn't cost you extra."
- Cards use the standard design system (rounded-2xl, border, shadow-card, hover lift)

**Affiliate link data:** Create `src/lib/affiliate-data.ts` with a lookup table:
```typescript
const AFFILIATE_PARTNERS: Record<string, {
  name: string;
  url: string;         // affiliate tracking URL
  description: string; // one-line value prop
  category: string;    // savings, mortgage, debt, investment, retirement
}> = { ... }
```

Initially populate with placeholder URLs (most affiliate programs need approval first).
Replace with real tracking URLs as programs are approved.

**UTM parameters:** All affiliate links should include:
```
?utm_source=calcrun&utm_medium=affiliate&utm_campaign={tool-slug}
```

### 9.2 Add AffiliateLinks to Tool Pages

**File:** `src/components/ui/ToolPageLayout.astro`
- Insert AffiliateLinks section after the FAQ, before Related Tools
- Only render when `affiliatePrograms` array has items
- Section background: `bg-primary-50` (differentiates from surrounding white/neutral sections)

**Placement rationale:** After FAQ = the user is educated, has used the calculator, read the
content, and is now considering next steps. This is the highest-intent moment for affiliate CTR.

Order on page:
1. Calculator (interactive)
2. Email capture ("Want a copy?")
3. Worked examples
4. Educational content
5. FAQ
6. **Affiliate recommendations** ← NEW
7. Related tools

### 9.3 Comparison Tables (High Priority Revenue Multiplier)

Per build spec: "'Best X' comparison tables on financial calculator pages (highest affiliate
CTR placement)."

For the top 5 highest-intent tools, add inline comparison tables in the educational content:

| Tool | Table Title | Columns |
|------|-------------|---------|
| Compound Interest | "Best High-Yield Savings Accounts" | Name, APY, Min Deposit, Link |
| Mortgage Payment | "Compare Mortgage Lenders" | Name, Rates From, Min Score, Link |
| Debt Payoff | "Best Debt Consolidation Loans" | Name, APR Range, Min Score, Link |
| Investment Return | "Best Investment Platforms" | Name, Fees, Min Investment, Link |
| Retirement Savings | "Best Retirement Accounts" | Name, Account Types, Fees, Link |

**Implementation:** Add comparison table data to each tool's markdown frontmatter as a new
`comparisonTable` field, or hardcode in the educational content markdown sections.

### 9.4 Apply to Affiliate Programs

**External setup (manual):**
- Day 1: Betterment (accepts anyone 18+, $25-$1,250/referral)
- Month 2: LendingTree, SoFi ($50-$150/lead)
- Month 3: Wealthfront ($35-$55/conversion), Marcus
- Month 6: NerdWallet (needs 10K monthly uniques)

### Verification
- AffiliateLinks renders on financial calculator pages with partner cards
- AffiliateLinks does NOT render on utility tools or file converters
- All affiliate links open in new tab with `rel="noopener sponsored"`
- FTC disclosure visible near affiliate links
- Comparison tables render in educational content for top 5 tools
- Mobile layout correct (cards stack to single column)

---

## Sprint 10: Deployment & SEO Activation

**Goal:** Get the site live and visible to Google.

### 10.1 Deploy to Cloudflare Pages

**Steps:**
1. Connect GitHub repo to Cloudflare Pages dashboard
2. Configure build command: `npm run build`
3. Configure output directory: `dist`
4. Set custom domain: `calcrun.com` (already purchased via Cloudflare Registrar)
5. Configure `calcrun.pages.dev` → `calcrun.com` redirect
6. Enable HTTPS (automatic with Cloudflare)
7. Verify deployment succeeds and all pages load

### 10.2 Google Search Console

**Steps:**
1. Add `calcrun.com` property to GSC
2. Verify via DNS TXT record (Cloudflare DNS dashboard)
3. Add `<meta name="google-site-verification" content="...">` to `src/layouts/BaseLayout.astro`
4. Submit sitemap: `https://calcrun.com/sitemap-index.xml`
5. Request indexing for homepage and top 5 calculator pages
6. Monitor Coverage report for errors

**File to modify:** `src/layouts/BaseLayout.astro` — add verification meta tag in `<head>`.

### 10.3 Google Analytics 4

**Steps:**
1. Create GA4 property for calcrun.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add GA4 script to `BaseLayout.astro` — but ONLY load after cookie consent
4. The cookie consent banner already exists — wire GA4 to its accept/decline state
5. Track these custom events:
   - `calculator_use` — when a calculator renders results
   - `email_signup` — when EmailCapture form submits successfully
   - `affiliate_click` — when an affiliate link is clicked
   - `pdf_export` — when Export PDF completes
   - `embed_copy` — when embed code is copied

**Files to modify:**
- `src/layouts/BaseLayout.astro` — add conditional GA4 script
- `src/components/ui/EmailCapture.tsx` — fire `email_signup` event
- `src/components/ui/ExportPdfButton.tsx` — fire `pdf_export` event
- `src/components/ui/AffiliateLinks.astro` — fire `affiliate_click` event

### 10.4 Verify OG Images

After deployment, spot-check that OG images load for 5-10 tool pages:
```
https://calcrun.com/og/compound-interest.png
https://calcrun.com/og/mortgage-payment.png
etc.
```

Test with Facebook's Sharing Debugger and Twitter's Card Validator.

### 10.5 Verify Structured Data

After deployment, test 5-10 pages with Google's Rich Results Test:
- Homepage (WebSite schema)
- 3 financial calculator pages (WebApplication + FAQ + Breadcrumb schemas)
- 1 file converter page
- 1 utility tool page

Fix any validation errors.

### Verification
- Site live at calcrun.com with HTTPS
- All 45 pages load (39 original + any new pages from this plan)
- GSC property verified, sitemap submitted
- GA4 tracking active (respecting cookie consent)
- OG images rendering on social platforms
- Structured data passing Rich Results Test

---

## Sprint 11: Navigation & UX Polish

**Goal:** Fix the discoverability and navigation gaps identified in the review.

### 11.1 Add Utility Tools to Navigation Dropdown

The desktop dropdown and mobile menu only show financial calculator categories.
QR Code, Password Generator, JSON Formatter, and Percentage Calculator are invisible
from the nav.

**Files to modify:**
- `src/components/ui/Navigation.astro`:
  - Add "Utility" as a 5th category section in the desktop dropdown grid
  - Add "Utility" section in mobile menu
  - Style consistently with existing category sections

### 11.2 Add File Tools to Navigation

The 13 file converters are also hidden from navigation. Add a "File Tools" section or a
"More Tools" link that surfaces them.

**Decision:** Don't add all 13 file tools to the dropdown (too many). Instead:
- Add a "File & Converter Tools" category header with the top 4 (Image Compress, PDF Merge,
  CSV↔JSON, Markdown↔HTML)
- Add "View all 31+ tools →" link at the bottom of the dropdown

### 11.3 Add Search to /tools Page

With 31 tools, visual scanning is too slow. Add client-side search.

**Implementation:**
- Add a search input at the top of `/tools` page
- Filter tools by name and description as user types
- Use a simple Astro client script (no React island needed)
- Debounce input at 150ms
- Show "No tools found" if no matches
- Clear button (X) in search input

**File:** `src/pages/tools/index.astro` — add search input and filter script.

### 11.4 Add "Embed This Calculator" CTA on Tool Pages

The embed system exists but isn't promoted. Add a small link on each financial calculator
page that says "Embed this calculator on your site →" linking to `/embed`.

**File:** `src/components/ui/ToolPageLayout.astro` — add link after Related Tools section,
only on financial calculator pages.

### 11.5 Expand Homepage Scenario Hooks

Currently 3 scenario hooks at the bottom of the homepage. Expand to 6 to cover more personas:

Current:
1. "Wondering if you can retire at 55?" → Retirement Savings
2. "Evaluating a job offer?" → US Salary
3. "Buying your first home?" → Mortgage Payment

Add:
4. "Building an emergency fund?" → Emergency Fund
5. "Should you pay off debt or invest?" → Debt Payoff
6. "Comparing investment strategies?" → Investment Return

**File:** `src/pages/index.astro` — add 3 more hook cards (responsive grid: 2×3 on desktop).

### 11.6 Add "How It Works" Section to Homepage

Below the hero, add a brief 3-step explainer:
1. Pick a calculator
2. Enter your numbers
3. See instant results — no signup needed

**File:** `src/pages/index.astro` — add section after hero, before stats bar.

### Verification
- Utility tools visible in desktop dropdown and mobile menu
- File tools surface in navigation (top 4 + "view all" link)
- Search works on /tools page (filters by name and description)
- "Embed this calculator" link visible on financial tool pages
- 6 scenario hooks on homepage (responsive grid)
- "How It Works" section on homepage

---

## Sprint 12: Content, Growth & Launch Preparation

**Goal:** Create the content assets needed for organic growth and initial traction.

### 12.1 Programmatic Scenario Pages (10-20 pages)

Pre-filled calculator pages targeting long-tail queries:
- "compound interest on $10,000 at 7% for 20 years"
- "mortgage payment on $300,000 at 6.5%"
- "$50,000 salary take home pay"
- "how long to pay off $20,000 in debt"
- etc.

**Implementation:**
- Create `src/data/scenarios/` directory with markdown files
- Each scenario pre-fills calculator inputs via URL params or frontmatter
- Unique 500+ word content per page (not just the calculator with different numbers)
- Target 10 scenarios at launch, expand to 50-100 in months 3-6

**Route:** `/tools/{category}/{slug}/scenario/{scenario-slug}`

### 12.2 Social Share Buttons

Add lightweight share buttons near the Export PDF button:
- Copy link to clipboard
- Share to Twitter/X
- Share to LinkedIn

**File:** Create `src/components/ui/ShareButtons.tsx` — render alongside ExportPdfButton.

### 12.3 "Copy Results" Button

Add a "Copy to clipboard" button that copies a plain-text summary of results.
Complement to PDF export — faster for pasting into emails or messages.

**File:** Create copy logic in each calculator or as a shared utility.

### 12.4 Launch Checklist & Marketing

**Pre-launch (code):**
- [ ] All sprints 7-11 complete
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` — all tests passing
- [ ] All 14 calculators export valid PDFs (Playwright test)
- [ ] Email capture works end-to-end (real MailerLite submission)
- [ ] At least 1 affiliate link is live (Betterment approval)
- [ ] Cookie consent → GA4 tracking verified

**Launch day (manual):**
- [ ] Deploy final build to Cloudflare Pages
- [ ] Verify all pages load on calcrun.com
- [ ] Submit sitemap to Google Search Console
- [ ] Request indexing for homepage + top 5 tools
- [ ] Post to Product Hunt
- [ ] Post to r/personalfinance, r/financialindependence (genuinely helpful, not spammy)
- [ ] Publish Dev.to article: "How I Built a Financial Calculator Site with Astro + React"

**Week 1 post-launch:**
- [ ] Monitor GSC for crawl errors
- [ ] Monitor MailerLite for first signups
- [ ] Check GA4 for traffic patterns
- [ ] Fix any broken pages or 404s

### 12.5 Ongoing Operations Setup

Document the weekly/monthly/quarterly maintenance routine from the build spec:

**Weekly (30 min):**
- Check GSC for crawl errors
- Review email signups + bounce rate
- Check affiliate dashboards
- Scan for 404s

**Monthly (2-3 hours):**
- Publish 1-2 new tools or scenario pages
- Update comparison table rates
- Review analytics for opportunities
- Check competitors

**Quarterly (half day):**
- Refresh financial data in comparison tables
- Revenue vs projection review
- Apply to new affiliate programs
- Core Web Vitals audit

---

## Sprint Summary & Dependencies

| Sprint | Focus | Depends On | Effort |
|--------|-------|-----------|--------|
| 7 | PDF Export Fix | Nothing | Small (1 session) |
| 8 | Email Capture + MailerLite | MailerLite account (external) | Medium (1-2 sessions) |
| 9 | Affiliate Links + Revenue | Affiliate program applications (external) | Medium (1-2 sessions) |
| 10 | Deploy + SEO Activation | Sprints 7-9, Cloudflare + GSC setup (external) | Small (1 session) |
| 11 | Navigation + UX Polish | Nothing (can parallel with 8-9) | Medium (1 session) |
| 12 | Content + Growth + Launch | Sprints 7-11 complete | Medium (1-2 sessions) |

**Critical path:** Sprint 8 (email) → Sprint 9 (affiliates) → Sprint 10 (deploy) → Sprint 12 (launch)

**Can run in parallel:** Sprint 7 (PDF fix) and Sprint 11 (nav/UX) have no dependencies.

**External blockers:**
- MailerLite account creation (Sprint 8) — free, ~15 min manual setup
- Betterment affiliate application (Sprint 9) — apply immediately, approval takes days
- Cloudflare Pages connection (Sprint 10) — needs GitHub repo access
- Google Search Console verification (Sprint 10) — needs DNS access

---

## Definition of Done (All Sprints)

The site is "business-ready" when:
- [ ] 31 tools live and functional on calcrun.com
- [ ] Email capture working on all 14 financial calculators + homepage + footer
- [ ] MailerLite collecting subscribers with 3-email drip active
- [ ] Affiliate links displayed on financial calculator pages
- [ ] At least 1 affiliate program approved and tracking
- [ ] GA4 tracking events (calculator use, email signup, affiliate click, PDF export)
- [ ] Google Search Console verified, sitemap submitted
- [ ] Core Web Vitals all green
- [ ] PDF export produces clean multi-page PDFs with no scrollbar artifacts
- [ ] Navigation surfaces all 31 tools (not just financial calculators)
- [ ] 10+ programmatic scenario pages live
- [ ] Product Hunt and Reddit launch posts published
