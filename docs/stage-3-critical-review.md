# Stage 3: Critical Review — Is CalcRun Ready for Build?

**Reviewed:** 2026-02-20
**Documents reviewed:** `build-spec.md`, `design-system.md`, `CLAUDE.md`, `README.md`, plus all archived docs (`strategy.md`, `financial-model.md`, `market-research.md`, `viability-assessment.md`, `stage-1-exploration.md`)

**Verdict: READY TO BUILD. 0 blockers, 4 risks to manage during build.**

The project has gone through extensive planning — market research, competitor analysis, financial modeling, a complete pivot from directory to financial calculators, framework switch from Next.js to Astro, hosting switch from Vercel to Cloudflare Pages, and honest revenue projections. The planning quality is genuinely strong. This review focuses on what could still derail the build.

---

## RESOLVED: Email Provider Switched from Kit to MailerLite

**Previously blocking — now resolved.**

Kit (ConvertKit) free tier does NOT include automations, conditional content, or email sequences — all paid features at $15-29/month. This would have broken the $0 budget and the entire email drip strategy.

**Resolution:** Switched to **MailerLite** free tier, which includes:
- Automation workflows with branching logic
- 500 subscribers (vs Kit's 10K — trade-off accepted)
- 12,000 emails/month
- Sign-up forms and landing pages

The 500 subscriber cap is the trade-off. Based on the financial model, we'll hit 500 subs around month 3-6, at which point the Growing Business plan ($10/mo) is needed. By then, early affiliate revenue should cover this cost. All docs updated.

---

## RISK #1: Astro Dynamic Component Map Won't Work with `client:load`

**Severity: HIGH — will cause a build failure in Sprint 1 if not addressed.**

The build spec shows this pattern for the tool page route:

```ts
const componentMap: Record<string, any> = {
  'compound-interest': () => import('@components/tools/CompoundInterestCalc.tsx'),
  'loan-amortization': () => import('@components/tools/LoanAmortizationCalc.tsx'),
};
const ToolComponent = (await componentMap[tool.data.slug]()).default;
```

**This will not work.** Astro requires `client:*` hydration directives on statically analyzable, directly imported components. Dynamic imports resolved at runtime cannot receive `client:load`. The Astro compiler needs to know at build time which components are islands.

The build spec acknowledges this risk ("Build note: Astro's `client:*` directives may require statically analyzable imports") and suggests a fallback:

```astro
{slug === 'compound-interest' && <CompoundInterestCalc client:load />}
```

**This fallback is the correct approach.** But it means explicitly importing all 15 tool components at the top of the route file and using conditional rendering. With 15 tools, this is verbose but works. The build spec should be updated to use the fallback as the primary pattern, not the `componentMap`.

**Action required:** Update `build-spec.md` to show the conditional import pattern as the primary approach. Test it immediately in Sprint 1 Day 1 before building any calculators.

Sources: [Astro Islands Docs](https://docs.astro.build/en/concepts/islands/), [Astro Dynamic Import Issue #11701](https://github.com/withastro/astro/issues/11701)

---

## RISK #2: Recharts Bundle Size vs. Core Web Vitals

**Severity: MEDIUM — won't block launch but could undermine the SEO advantage.**

The build spec says: "Astro ships zero JS by default (better Core Web Vitals = better SEO)." The design system targets LCP < 2.5s, INP < 200ms, CLS < 0.1. These are critical to the competitive positioning ("faster than Bankrate, Calculator.net").

**The reality:** Each calculator page will ship as a React island with:
- React + React DOM: ~42KB gzipped
- recharts: ~40KB gzipped
- Calculator component code: ~5-15KB gzipped
- **Total per calculator page: ~90-100KB of JS**

This is not catastrophic — it's comparable to what other calculator sites ship. But it eliminates the "zero JS" advantage on the pages that matter most (the calculator pages themselves). The zero-JS benefit only applies to non-interactive pages (homepage, about, privacy, etc.).

**The real risk:** recharts renders as SVG, which creates many DOM nodes. A compound interest chart with 30 years of monthly data = 360 data points = hundreds of SVG elements. This could push INP above 200ms on slower devices.

**Mitigations:**
1. Limit chart data points (show yearly, not monthly, for long time horizons)
2. Use `client:visible` instead of `client:load` for below-fold charts if possible
3. Test Core Web Vitals on a real mid-range phone early in Sprint 1
4. If recharts is too heavy, consider switching to [Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (~40KB but Canvas-based, much faster rendering) or building simple SVG charts from scratch for the simpler visualizations

**Action required:** Build the compound interest calculator first (the plan already does this). Run Lighthouse on a deployed preview before building the other 14 tools. If CWV scores are bad, pivot charting library early.

Sources: [Recharts Bundlephobia](https://bundlephobia.com/package/recharts), [recharts Issue #1417 (bundle size)](https://github.com/recharts/recharts/issues/1417)

---

## RISK #3: 20-Day Build Timeline Is Aggressive

**Severity: MEDIUM — scope creep is the biggest threat to shipping.**

The build plan has 5 sprints × 4 days = 20 working days to deliver:

| What | Volume |
|------|--------|
| Astro scaffolding + design system | Full setup |
| Calculator components | 15 React islands |
| Financial math functions | 12 sets of calculations with unit tests |
| Educational content | 6,000-12,000 words (500-1,000 per financial calc) |
| UI components | ~15 shared components |
| Legal pages | 4 (about, privacy, terms, disclosure) |
| Email capture | Component + integration |
| PDF export | Client-side with jsPDF |
| OG image generation | Satori + Sharp pipeline |
| Embeddable widgets | Stripped versions + embed code generator |
| Structured data | WebApplication + FAQ + BreadcrumbList schema |
| Programmatic pages | 10-20 scenario pages |
| Testing | Vitest for all financial math |
| Deployment | Cloudflare Pages + Google Search Console |

This is a lot. The infrastructure (Sprint 1) and first 3 calculators are realistic for 4 days. But Sprint 4 (polish + monetization + launch) packs educational content for 15 tools, FAQ sections, worked examples, comparison tables, PDF export, embeddable widgets, OG images, AND performance audit into 4 days.

**The risk isn't that it can't be done — it's that quality drops.** The educational content is the SEO differentiator. If it's rushed, it'll read like generic AI output, and Google will treat it accordingly. The build spec itself says "all content must be original" and "add value beyond what the calculator itself shows."

**Recommendation:**
- Accept that the 20-day timeline is aspirational, not a commitment
- Ship in two waves: **Wave 1** (Sprints 1-3): 15 tools live with basic educational content. **Wave 2** (Sprints 4-5): deep content, embeds, programmatic pages, polish
- Prioritize getting the 6 core financial calculators to production quality over getting all 15 tools to draft quality
- Don't skip unit tests for financial math — a wrong calculation destroys credibility

---

## RISK #4: Educational Content Quality Is the Make-or-Break

**Severity: MEDIUM-HIGH — this determines whether the site ranks or gets ignored.**

The build spec has excellent content guidelines (reading level, structure, E-E-A-T signals, originality, actionable framing). But the guidelines describe *what* good content looks like, not *how* it gets produced at volume.

12 financial calculators × 500-1,000 words = 6,000-12,000 words of educational content, plus 3-5 FAQ answers per tool (36-60 answers), plus 2-3 worked examples per calculator (24-36 examples).

**The Google risk is real:** mass-produced AI content without expert oversight saw 87% negative impact in recent core updates. The educational content needs to:
- Include specific, verifiable financial formulas (not just "compound interest helps your money grow")
- Reference authoritative sources (Federal Reserve, SEC, IRS) as the spec requires
- Provide genuinely unique insights (the "what most people miss" angle in the spec)
- Not read like templated output with numbers swapped

**Recommendation:**
- Write educational content for the 6 core calculators with care — these are the highest-traffic pages
- For secondary calculators and utility tools, start with shorter content (200-300 words) and expand after launch based on what ranks
- Every piece of content should answer: "What does this tell the user that the calculator alone doesn't?"

---

## WHAT'S SOLID (These Don't Need Changes)

To be clear, the vast majority of this plan is well-thought-out:

**Strategic decisions — all sound:**
- Financial niche focus with affiliate-first monetization
- Astro over Next.js (correct for this use case)
- Cloudflare Pages (free, commercial use allowed, unlimited bandwidth)
- Dropping simple tools that AI Overviews replace
- Honest revenue expectations ($0-500 year 1)
- Adaptation triggers instead of kill criteria
- No database needed (pure static site)

**Build spec quality — comprehensive:**
- Target audience personas with specific life triggers and affiliate fits
- Customer journey funnel with realistic conversion math
- Competitive positioning map identifying a genuine gap (clean design + deep content)
- Detailed content collection schema
- FTC compliance baked in from day 1
- Per-tool affiliate mapping (and knowing where NOT to force affiliates)
- Phased affiliate program enrollment based on traffic thresholds
- Complete "done" checklist

**Design system quality — thorough:**
- Contrast-verified color palette with WCAG AA compliance
- Calculator UI design with slider+field hybrid (backed by NNGroup/Baymard research)
- Typography with tabular numerals for financial data
- Mobile-specific rules and breakpoints
- Accessibility considerations (aria-live for real-time results, reduced motion)
- Visual polish details (card hovers, gradient accents, whitespace strategy)

**Market research quality — honest:**
- Real competitor traffic data with revenue benchmarks
- Ad RPM crash documented with publisher case studies
- Ad blocker rates by audience type
- New domain sandbox timeline (6-12 months)
- Financial model revised downward after market reality check

---

## SUMMARY: Risks to Manage During Build

All blockers resolved. These risks are baked into the build spec:

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| 1 | **Astro component pattern** — componentMap won't work with `client:load` | High | Fixed in build-spec: use static imports + conditional rendering. Test Sprint 1 Day 1. |
| 2 | **recharts bundle size** (~40KB gzip per page) | Medium | Build compound interest calc first, run Lighthouse before building remaining 14. |
| 3 | **20-day timeline is aggressive** | Medium | Ship in waves if needed: core calculators first, polish second. |
| 4 | **Educational content quality** is the SEO make-or-break | Medium-High | Don't rush core 6 calculator content. Reference formulas, cite authoritative sources, add genuine insights. |
| 5 | **MailerLite 500 sub cap** | Low | Upgrade to $10/mo when subs approach 500 (month 3-6). Early revenue should cover it. |

**This project is ready to build.**
