# CalcRun Implementation Plan

Consolidated from Claude critical review, ChatGPT deep audit, ChatGPT master plan.
Validated against codebase. Edited with owner revenue-first filter. March 2026.

---

## Hard Rules

1. **No new scenario cluster until current top pages have updated trust, tracking, and affiliate next steps.**
2. **No new calculator until data shows which existing pages convert.**
3. **Every change targets a money page first.** Site-wide rollout comes later.
4. **Measurement before optimisation.** Track baselines before changing layouts.
5. **Trust claims must be strictly true.** Only state credentials you can stand behind publicly.
6. **Prioritise pages by revenue potential and affiliate CTR, not traffic alone.** A lower-traffic page with strong intent can outperform a high-traffic informational page.

---

## Money Pages — The Shortlist

These are the pages that matter most in month 1. All Phase 1-2 work targets these first, not every page equally.

1. UK Salary Calculator
2. US Salary Calculator
3. Mortgage Payment Calculator
4. Compound Interest Calculator
5. Top 5 scenario pages by traffic (check GSC)
6. Top comparison pages with natural affiliate fit (pension-vs-isa-uk, 15yr-vs-30yr-mortgage, roth-vs-401k, snowball-vs-avalanche)
7. Homepage
8. About page

---

## Baseline Audit (Before Any Changes)

Capture these numbers before touching layouts or affiliate placements. Without baselines, improvements are unprovable.

- [x] Google Search Console: indexed page count, top pages by clicks, top pages by impressions
  - **Snapshot (3 Mar 2026):** 3 pages indexed, 37 discovered not indexed, 3 crawled not indexed, 4 redirect errors (bare domain). Near-zero impressions.
- [ ] GA4: pageviews by page, top landing pages, device split, geo split (US vs UK) — **check GA4 realtime/reports**
- [ ] Affiliate dashboards: clicks, conversions, EPC by partner (CJ for NordPass/NordVPN) — **check CJ dashboard**
- [ ] Email capture: current subscriber count, capture rate estimate — **check MailerLite**
- [x] Outbound clicks: affiliate click tracking added in Sprint 36 (GA4 `affiliate_click` event)

Save this snapshot. Compare at 30 and 90 days.

---

## Phase 1 — Immediate (Week 1-2) ✅ CODE COMPLETE

Run all four tracks in parallel. They touch different files.

### Sprint 30: Data Accuracy (CRITICAL) ✅ COMPLETE

Wrong numbers on money pages kill trust and conversions. Fix before anything else.

**30A: UK Employer NI Rate**

The UK salary page says employer NI is 13.8% above £9,100. Official HMRC 2025/26 rates: **15% above £5,000**.

Files:
- `src/lib/uk-rates.ts` — Add employer NI constants: `employerRate: 0.15`, `employerSecondaryThreshold: 5_000`
- `src/data/tools/salary-uk.md` — Update lines 43, 47, 101, 107: all "13.8%" -> "15%", all "£9,100" -> "£5,000". Recalculate salary sacrifice examples.
- `src/components/calculators/SalaryUkCalculator.tsx` — Verify calculator imports from `uk-rates.ts`, not hardcoded. If hardcoded, refactor.
- UK salary scenario pages — Check for employer NI text; update if present
- `src/data/methodologies/salary-uk.md` — Update if referencing old figures
- `worker.ts` QUICK_TIPS — Update if UK salary tip references old rates

**30B: US Salary Data**

US Salary page uses 2024 brackets ($11,600 for 10% band) and 2024 SS wage base ($168,600). Update to 2025: 10% band $11,925, SS wage base $176,100.

Files:
- Create `src/lib/us-rates.ts` — Central module mirroring `uk-rates.ts` pattern. 2025 federal brackets, SS wage base $176,100, standard deduction $15,000 single. Source: IRS + SSA.
- `src/data/tools/salary-us.md` — Update line 95 ($11,600 -> $11,925), line 101 ($168,600 -> $176,100), all bracket figures
- `src/components/calculators/SalaryUsCalculator.tsx` — Refactor to import from `us-rates.ts`
- US salary scenario pages — Verify worked examples

**30C: Tax Year Labels**

Add visible "Tax year: 2025/26" (UK) / "Tax year: 2025" (US) badge in calculator UI itself, not just page header. Verify existing badges (Sprint 21B) are prominent and accurate.

**Done when:**
- [x] `npm run build` + `npm test` pass with new rate values
- [x] UK: 15% / £5,000 everywhere. US: 2025 brackets + $176,100 everywhere.
- [x] Tax year badges visible on UK Salary and US Salary calculator results panels. (Inflation excluded — it uses user-specified rates, not tax-year-specific data.)
- [x] `lastUpdated` refreshed on all changed files
- [x] US rates centralised in `src/lib/us-rates.ts`, calculator imports from it
- [x] UK employer NI constant added to `uk-rates.ts` for content accuracy (calculator does not model employer NI — it is informational text only)
- [x] Scenario pages QA'd: all 31 salary scenarios verified consistent (summary, headline, body figures match calculator math)

---

### Sprint 31: Trust Layer ✅ COMPLETE

**31A: About Page — Human Authority**

File: `src/pages/about.astro`

Add a "Who built this" section:
- "Built by Jonathan, an ACA-qualified accountant."
- Brief professional background: finance experience, multi-jurisdictional (UK, US, Australia)
- Why the site exists: brief, personal, authentic
- Keep to 1-2 paragraphs. Warm but not inflated.

Keep it simple. One voice: "Built by." Do not layer "built by" and "reviewed by" unless you genuinely intend to maintain a separate editorial review process long term. For a solo site, one clean claim is more believable.

**31B: Source Quality on Money Pages Only**

Strengthen "Sources & Methodology" on the shortlist pages only (not all 17 calculators):
- UK Salary: verify GOV.UK links are current
- US Salary: add IRS and SSA source links
- Mortgage: add CFPB or Freddie Mac sources (US); Bank of England base rate (UK)
- Compound Interest: verify formula sources

Ensure "Last checked: [date]" is visible and accurate on these pages. That is sufficient — no update log or rate history needed yet.

**31C: Contextual Disclosure on Money Pages**

File: `src/components/ui/AffiliateLinks.astro`

- Replace generic "affiliate links" note with contextual language per page type:
  - Investment pages: "We may earn a commission if you open an account through these links. Capital at risk."
  - Loan pages: "We may earn a commission. Your home may be repossessed if you don't keep up repayments."
  - General: "We may earn a commission at no cost to you."
- Add 1-line "How we choose partners" adjacent to affiliate cards

**Done when:**
- [x] About page has real name, credentials, personal voice — one clean trust claim
- [x] Shortlist pages have strong source sections
- [x] Affiliate disclosure is contextual with risk disclaimers where relevant

---

### Sprint 36: Measurement (Parallel) ✅ CODE COMPLETE — owner needs to verify events in GA4

**Must run alongside Sprints 31-32, not after.** You need baselines before changing affiliate layouts.

**36A: GA4 Event Taxonomy**

Privacy-preserving events (never log financial input values):

| Event | Parameters | Trigger |
|---|---|---|
| `calculator_interaction` | tool_slug | User changes any input |
| `affiliate_click` | partner, placement (inline/take-next-step/scenario), page_type | Affiliate outbound click |
| `scenario_try_it_click` | scenario_slug, tool_slug | "Try it" CTA click |
| `email_capture_submit` | variant (tool/newsletter/scroll) | Email form submitted |
| `pdf_export_click` | tool_slug | Export PDF button clicked |
| `scroll_depth` | depth (50/90), page_type | Scroll milestones |

Keep it lean. 6 events, not 15. Add more only when these prove useful.

**36B: Affiliate Click Attribution**

- Add `data-affiliate-partner` and `data-affiliate-placement` attributes to all affiliate links in `AffiliateLinks.astro` and `ResultAffiliate.tsx`
- Fire `affiliate_click` on every outbound affiliate click
- This enables EPC calculation by page once affiliate dashboards have data

**Done when:**
- [x] All 6 events firing in GA4 real-time — code deployed, needs owner to verify in GA4 dashboard
- [x] Affiliate clicks tracked with partner + placement
- [x] No financial input values logged

---

### Manual Essentials (Owner — Week 1-2)

These are not side notes. They directly affect growth, tracking, and compliance.

1. [x] **Google Search Console** — Set up, sitemap submitted. 3 pages indexed as of 3 Mar 2026. Request indexing on money pages via URL Inspection tool.
2. [x] **Cloudflare redirect** — DONE (6 Mar 2026). A record for root domain + wildcard redirect rule deployed. Verified working externally. 4 GSC redirect errors should clear on next crawl.
3. [ ] **Affiliate follow-ups** — Chase pending programs. Check CJ, Awin, Pro Affiliate Partner dashboards.
4. [ ] **Cookie consent review** — Deferred until measurable UK traffic. Revisit when GA4 shows UK visitors.
5. [x] **Turnstile secret key** — DONE (6 Mar 2026). New Turnstile widget created (invisible mode, www.calcrun.com). Site key updated in code. Secret key added to Cloudflare Pages env vars.

**Affiliate Partner Status (for planning — do not hardcode assumptions):**

| Partner | Status | Role in plan |
|---|---|---|
| NordPass | LIVE (CJ) | Use on security pages |
| NordVPN | LIVE (CJ) | Use on security pages |
| Betterment | Pending (Pro Affiliate Partner) | Preferred for US investing pages — fallback: Wealthfront or SoFi if declined |
| Nutmeg | Pending (Awin) | Preferred for UK investing pages — fallback: InvestEngine |
| InvestEngine | Not yet applied (direct) | Apply now — backup for all UK investing recommendations |
| LendingTree | Pending (CJ) | Preferred for US mortgage/loan pages — fallback: SoFi |
| Wealthfront | Not yet applied | Secondary US investing option — apply via Impact direct |
| SoFi | Not yet applied | Secondary US multi-product — apply via Impact direct |
| Ally | Declined (CJ) | Remove from active planning. Reapply later if site grows. |

Frame affiliate strategy around roles (preferred / pending / fallback), not specific partners. The strategy should survive if any single program declines or is delayed.

---

## Phase 2 — Monetisation Improvement (Week 3-4) ✅ CODE COMPLETE

Only start after Phase 1 measurement is live. Changes should be trackable.

### Sprint 32: Affiliate Flow ✅ COMPLETE

**32A: Scenario Page Layout — CTA Before Affiliate**

File: `src/pages/scenarios/[scenario].astro`

Reorder to:
1. Answer card (big result + input pills)
2. "Try it with your numbers" CTA — prominent
3. Educational prose
4. AffiliateLinks — moved **after** content
5. Final CTA card

The user gets: answer -> calculator link -> education -> affiliate. Affiliate feels like a natural next step, not an interruption.

**32B: Affiliate Partner Strategy Per Page**

For each money page on the shortlist, define:
- **Primary partner** (preferred candidate, with fallback if pending)
- **"Best for" label** — e.g., "Best for beginners", "Best for low fees"
- **Whether secondary partners add value or just create choice overload**

Create a mapping in `src/lib/affiliate-data.ts` using roles not hardcoded partners:

```
// Page-level affiliate strategy
// Use preferred partner if approved, otherwise fallback
AFFILIATE_PAGE_MAP = {
  'compound-interest': { role: 'us-investing', label: 'Best for automated investing' },
  'salary-uk': { role: 'uk-investing', label: 'Best for UK investors' },
  'mortgage-payment': { role: 'us-mortgage', label: 'Compare mortgage rates' },
  ...
}
```

Resolve roles to actual partners based on current approval status. Cut weak or generic partners from pages where they don't fit. One strong recommendation beats three generic ones.

**32C: Monetise UK Comparison Pages**

Add `affiliateContext` + `affiliatePrograms` to UK comparisons that currently have no affiliate offers:
- `cash-isa-vs-savings-account.md` — confirmed: no affiliate offers currently
- `lisa-vs-regular-isa.md` — check and add
- `emergency-fund-savings-vs-money-market.md` — check and add

Only add where the product genuinely fits the comparison topic.

**Done when:**
- [x] Scenario pages: affiliate below content, not between CTAs
- [x] Each money page has one clear primary recommendation with "best for" label
- [x] UK comparisons with natural fit have affiliate offers
- [x] All changes trackable via Sprint 36 events

---

### Sprint 33: Homepage & Nav Coherence ✅ COMPLETE

**33A: UK Prompts on Homepage**

File: `src/pages/index.astro`

Add 1-2 UK question prompts alongside US ones in hero:
- "How much of my salary goes to HMRC?"
- "What does salary sacrifice actually save me?"

US prompts stay. UK ones are additive. Low effort, high signal.

**33B: Visual Separation for Non-Finance Tools**

In the homepage "All Tools" grid, add clearer visual separation for Utility and File Tools sections. Different subheading, slightly different background, or collapsed by default.

Do NOT move to `/dev/` or `/utilities/` yet. Test visual separation first. Only migrate URLs if data shows the current approach hurts financial page performance.

**Done when:**
- [x] Homepage has UK prompts
- [x] Finance tools visually lead, utility/file tools clearly secondary

---

## Decision Gate: Phase 2 -> Phase 3

**Phase 3 only starts if Phase 1 and 2 are live, tracking is verified, and at least 2-4 weeks of usable data has been collected.**

Before proceeding, review:
- Are GA4 events firing correctly?
- Do you have baseline affiliate CTR by page?
- Are money pages indexed in GSC?
- Has at least one affiliate partner beyond NordPass/NordVPN been approved?

If yes to most: proceed to Phase 3.
If no: stay in Phase 2, focus on unblocking what's missing.

---

## Phase 3 — Controlled Expansion (Week 5-8, only after gate)

### Sprint 34: Selective Scenario Work

**34A: Reframe Top Scenario Titles**

Rewrite titles on the **10-15 highest-traffic scenarios only** (check GSC data from Phase 1-2). Keep them grounded and specific — curiosity, not clickbait.

Good: "Why a £10,000 raise adds less than you think after tax"
Good: "What $10,000 becomes in 20 years if you start now"
Bad: "This brutal salary trap is destroying your paycheck"
Bad: "The shocking truth about your mortgage"

Update `title` in frontmatter. Slugs stay the same.

**34B: 5-8 New High-Intent Scenarios Only**

Build the highest-confidence scenarios based on Reddit research + search volume signals:

Priority (build these):
1. "Why a $20,000 raise only adds $X/month" (US salary, primary market)
2. "Why a £5,000 raise only adds £X/month" (UK salary, secondary market)
3. "The 60% tax trap: why earning £110K barely beats £100K" (UK, high search intent)
4. "£200K mortgage at 4.5% over 25 years" (UK first-time buyer)
5. "What 3 missed years of 401k contributions costs you" (US, compound interest)

Maybe (only if capacity allows and data supports):
6. "Starting retirement savings at 25 vs 35"
7. "£300K mortgage at 5% over 25 years"
8. "Remortgage shock: 2% to 5%"

Do not build 20+ scenarios. Build 5, measure, then decide.

**Done when:**
- [ ] 10-15 existing titles reframed
- [ ] 5-8 new scenarios live with proper frontmatter, content, affiliate CTAs
- [ ] OG images generated (but do not let this gate publishing)

---

### Sprint 35: Two Calculators Only

Build the two with highest confidence for differentiation + affiliate fit. The other four from the original review are deferred until data proves demand.

**35A: Salary Sacrifice + Student Loan Calculator (UK)**

URL: `/tools/income-and-planning/salary-sacrifice-calculator`

Why first: Genuinely differentiated. No mainstream calculator handles pension salary sacrifice + student loan repayment interaction. Natural fit for UK investing affiliates.

Inputs: Gross salary, student loan plan, pension contribution %, employer match %
Key output: "Your £X pension contribution effectively costs you only £Y" (after tax/NI/student loan savings)

**35B: Debt Payoff vs Invest Calculator**

URL: `/tools/debt-and-loans/debt-vs-invest`

Why second: Broad search demand, obvious affiliate adjacency (investing platforms if invest wins, refinance if payoff wins). Works for both US and UK.

Inputs: Loan balance, rate, term, lump sum, expected investment return
Key output: Net winner + breakeven rate ("You need to earn more than X% for investing to beat paying off")

**Done when:**
- [ ] Both follow full pattern (SliderInput, results, chart, currency, PDF, email, share, ResultAffiliate)
- [ ] Both have methodology page, 3 worked examples, 5+ FAQ, affiliate programs
- [ ] Wired into tools-data.ts, worker.ts
- [ ] Build and tests pass

---

## Phase 4 — Only After Data (Week 9+)

Review GA4 events, GSC data, and affiliate dashboards. Then decide:

1. **Which pages get traffic?** Double down on content for those tools/topics.
2. **Which affiliate partners get clicks?** Prioritise those, cut underperformers.
3. **UK or US converting better?** Shift expansion toward the stronger market.
4. **Scenarios or comparisons better for affiliate CTR?** Scale the format that works.
5. **Do the two new calculators get usage?** See expansion threshold below.

**Calculator expansion threshold:** Only build another calculator from the deferred list if at least one of the first two shows clear usage (meaningful pageviews), affiliate clicks, or organic traction. Do not build speculatively.

**Prioritise by revenue potential, not traffic alone.** A page with 500 visits/month and 5% affiliate CTR is worth more than a page with 2,000 visits and 0.1% CTR.

---

## Deferred Items (Not Cut — Parked)

| Item | Why deferred | Revisit when |
|---|---|---|
| Lump Sum Allocator calculator | Build after validating Debt vs Invest | Phase 4 if debt-vs-invest converts |
| Car Finance vs Cash calculator | Niche | Phase 4 if auto loan scenarios show demand |
| True Cost of Debt calculator | Overlaps existing loan amortization | Phase 4 review |
| "Am I On Track?" Retirement Checker | Needs retirement scenario data first | Phase 4 if retirement content ranks |
| Move utility tools to `/dev/` URL | Test visual separation first | Phase 4 if data shows brand dilution |
| Rate history / update log | "Last checked" date is sufficient | Not urgent |
| Source upgrades on all 17 calculators | Do money page shortlist first | After shortlist pages are solid |
| Sprint 29B seasonal content | Only after base monetisation works | When affiliate revenue is non-zero |
| Sprint 29C Pinterest infographics | Only after organic baseline exists | When organic traffic is measurable |
| Full A/B testing framework | Premature without traffic volume | When any page has 1,000+ monthly visits |

---

## Execution Summary

| Phase | Sprints | Timeline | Focus | Status |
|-------|---------|----------|-------|--------|
| **1 - Immediate** | 30 + 31 + 36 + Manual | Week 1-2 | Fix data, add trust, start tracking, unblock indexing | ✅ Code done. Manual items 2/5 remain |
| **2 - Monetise** | 32 + 33 | Week 3-4 | Improve affiliate flow, homepage, measure impact | ✅ Code done |
| **Gate** | Review data | End of Week 4 | Verify tracking, baselines, indexing progress | ⏳ Remaining: verify GA4 events + check affiliate status |
| **3 - Expand** | 34 + 35 (scoped down) | Week 5-8 | 5-8 scenarios + 2 calculators | Not started |
| **4 - Data-driven** | Decide based on metrics | Week 9+ | Scale what converts, cut what doesn't | Not started |

Total new calculator builds: **2** (not 6).
Total new scenarios: **5-8** (not 20+).
Total existing title rewrites: **10-15** (not all 102).

Every sprint has a definition of done. Every change targets money pages first. Measurement runs from week 1.

---

## Known Issues (Non-Blocking)

| Issue | Severity | Notes |
|---|---|---|
| Recharts build warning: "width(-1) and height(-1) of chart should be greater than 0" | Low | SSR renders charts without a DOM container. Charts work correctly client-side. Investigate if it causes CLS or layout issues on slow connections. |
