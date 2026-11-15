GROWTH-SEO final report. One deviation from the brief: the harness refused my Write of findings.md ("Subagents should return findings as text, not write report files"). I did not work around the block, so findings.md does not exist. The full findings file is the second part of this message; please save it as `.../review/GROWTH-SEO/findings.md`. Every data artefact the findings cite is already in:
C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/GROWTH-SEO/

The artefacts are:
- `seo-audit.csv`: 143 pages x 35 columns.
- `seo-summary.json` and `anchor-texts.json`: aggregates and anchor text per target.
- `year-scan.csv`: year strings per page.
- `serp-benchmark.csv`: the SERP benchmark.
- `overlap-top.json`: content overlap between scenario, hub and comparison pages.
- `googlebot-render.json`: render measurements.
- Screenshots `GROWTH-SEO-01-*.png`, `GROWTH-SEO-02-*.png` and their `-thumb.png` versions.
- Scripts `*.mjs`.

## 1. Counts by severity
S1: 0. S2: 3. S3: 4. S4: 3. Ten findings in total.

## 2. S1 and S2 findings
- **GROWTH-SEO-01 (S2, Likely, NEW):** to a Googlebot-style renderer the homepage is almost blank.
  - Test setup: fresh session, viewport expanded to full height, no scrolling.
  - Only 112 of 1,200 main-content words are visible. The H1 sits about 6,000px down a black theatre.
  - "Run your numbers", "Popular calculators", "Comparisons" and "Instant answers" all compute to opacity 0. After the viewport expands, the light product content moves to y≈86,000-92,000px.
  - Interior pages render 100% visible, so the problem is homepage-only.
  - Fix: render the light product first for every visitor and make the intro opt-in. Do not sniff Googlebot's user agent to skip it, because that is cloaking.
- **GROWTH-SEO-02 (S2, Verified, NEVER-FIXED):** the embed programme earns zero backlinks.
  - The snippet is a bare iframe. The "Powered by CalcRun" link lives inside the framed calcrun.com page, so the host page carries no link back.
  - Fix: add a visible attribution link outside the iframe, then do outreach.
- **GROWTH-SEO-03 (S2, Verified, NEW; adds the SEO angle to the logged guard item):** the 2027 rollover has started and the site is not ready.
  - IRS published TY2027 figures on 5 Nov 2026 (Rev. Proc. 2026-35), SSA published the 2027 wage base of $192,300 on 14 Oct, and the UK Budget was delivered on 28 Oct (Chancellor John Healey).
  - There are no 2027 pages. The year is coupled to titles on 6 pages, descriptions on 10 and URLs on 3.
  - A single `US_TAX_YEAR` cannot serve both TY2026 filing season and 2027 paychecks.
  - Builds freeze on 1 Jan, which also blocks unrelated fixes.

S3 findings:
- 04: tax-tool titles lack the year, and scenario titles lack the answer, which competing titles carry as standard.
- 05: 0 of 46 tool pages link to any comparison; 20 of 23 methodology pages have exactly one inlink.
- 06: the brand search "calcrun" is owned by running apps and calcrun.net; there is no Bing verification or IndexNow; deep pages are absent from the non-Google index I could search.
- 07: US salary scenarios silently assume New York or California, while the results for those searches are salary-by-state pages.

S4 findings:
- 08: structured data yields little in Google today. FAQ rich results ended on 7 May 2026; og:type and og:locale mismatches.
- 09: six standalone scenarios duplicate the intent of a hub row.
- 10: 18 titles are over 60 characters.

Out-of-lane, likely S2 for MATH-UK/CONTENT: the 28 Oct Budget made live content stale.
- The scrapped "£12k Cash ISA from April 2027" claim appears in three comparisons: cash-isa-vs-savings-account.md:99, isa-vs-general-investment.md:90 and lisa-vs-regular-isa.md:108.
- The old LISA 25% penalty above £450k appears in lisa-vs-regular-isa.md:75 and stamp-duty-first-time-buyer-2026.md:71.

## 3. Top 3 strengths (verified)
1. **Clean technical base.** All 141 indexable pages are self-canonical (www, trailing slash) and in the sitemap, which is byte-identical to live. There are 0 internal links to redirected, 404 or slashless URLs, so the July 307 problem is fixed. There are no noindex leaks, and /labs/story/ is handled correctly.
2. **Unique metadata and clean structured data at scale.** 143 unique titles, 141 unique descriptions (all 160 characters or fewer), one H1 per page, and 0 JSON-LD parse errors. All 61 editorial pages have full Article schema (author, dates, image).
3. **The doorway clean-up worked.** The highest 5-gram overlap between any two of the 61 scenario, hub and comparison pages is now 22.7%, against 44-53% in July. Hubs are answer-first, server-rendered tables and render fully to the crawler simulation. Every page is two clicks or fewer from the homepage.

## 4. Why only about 40 visits a day, and what would grow it
The causes, with evidence, are in the findings file:
- No authority or distribution.
- The calculator space is flooded with new AI-built sites, many on pages.dev; even the UK long tail has 9-25 competitors.
- A young domain that was reset in July.
- A homepage that renders blank to crawlers.
- No brand ownership.
- Answer boxes absorbing clicks.
- File and developer tools diluting topical focus.

Highest-value moves, in order:
1. Fix the embed attribution link.
2. Year-driven, answer-first titles.
3. 2027 readiness before 1 Jan.
4. An owner GSC pass (the data gate for everything else).
5. Fix the stale Budget claims.
6. A product-first homepage.
7. A UK 2027/28 hub around February.

The findings file also has the ranked backlog (18 items scored impact x effort) and a 12-item do-not-do list.

## 5. Coverage gaps
- No GSC, GA4 or Bing Webmaster access, so indexed counts, queries and landing-page traffic are unknown.
- WebSearch is not Google and is US-biased; I had no Google UK results and no search-volume or keyword-difficulty data.
- Common Crawl returned 504 on 8 attempts, so presence in LLM training corpora is unverified.
- The Bing `site:` fetch was inconclusive.
- No backlink index was available.
- Live requests used: 3 (robots.txt and two sitemaps). Every other render ran against the preview.
- I checked no money figures, made no content-quality judgements and did not test live embeds.

## 6. findings.md
It could not be written (blocked by the harness). Intended path, for you to save it:
C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/GROWTH-SEO/findings.md

=====================================================================
FULL FINDINGS (save as findings.md)
=====================================================================

# GROWTH-SEO findings: CalcRun independent review (9 Nov 2026)

Severity counts: S1 0, S2 3, S3 4, S4 3. The artefacts are in the GROWTH-SEO folder (list above).

### GROWTH-SEO-01  The homepage renders as a near-blank dark canvas to a Googlebot-style, no-scroll renderer (9% of words visible)
- Severity S2 / Confidence Likely (reproduced in simulation; Google's renderer internals are not public) / Reach High (most-linked page and brand landing) / Tag NEW (the R2 homepage shipped 3 Jul 2026, after the July review)
- Where: preview `/`, Chromium, Googlebot smartphone user agent at 412x732, fresh session with no `calcrun.introSeen` flag (Googlebot is stateless). The viewport was then expanded to the full document height, as a tall-page renderer does. No scroll.
- Repro: `node googlebot-render.mjs`, then `node googlebot-render2.mjs`.
- Expected: H1 and product sections visible. Interior pages do pass this test:

  | Page | Visible words |
  |---|---|
  | UK hub | 525/525 |
  | pension-vs-isa-uk | 1277/1277 |
  | /tools/ | 673/673 |
  | /scenarios/ | 663/663 |
  | salary-uk | 1395/1699 (collapsed tabs and TOC) |

- Actual:
  - Fresh session: 112 of 1,200 main words visible, and the H1 sits at y=6,045px in a black theatre.
  - Grow/Keep/Owe, "Run your numbers", "Popular calculators", "Comparisons", "Instant answers" and the newsletter all compute to opacity 0.
  - After the viewport expands, ScrollTrigger re-measures. The pin-spacer grows and the light sections move to y≈86,500-92,000px, still at opacity 0.
  - Intro-seen state: 555/1,200 words visible, but the H1 has opacity 0 and a zero-size box.
- Evidence: GROWTH-SEO-02-home-googlebot-tall-412-thumb.png and -1280-thumb.png, googlebot-render.json. Owner check: Search Console URL Inspection on `/`, then View tested page, then Screenshot.
- Fix: make the light product the default first paint for everyone; the theatre goes below it or plays on an explicit "Watch the intro". No user-agent sniffing.

### GROWTH-SEO-02  The embed programme earns zero backlinks
- Severity S2 / Verified / Reach Med / NEVER-FIXED. CLAUDE.md pitches embeds as "passive backlinks".
- Where: dist/embed/index.html (23 snippets); src/components/ui/ToolPageLayout.astro:209-214, where the badge renders only in embed mode.
- Repro: copy any snippet. It is a bare `<iframe src=".../?embed" height="700">` with nothing outside the iframe.
- Expected: a visible attribution link in the host page. terms.astro:24 already requires "a link back to calcrun.com".
- Actual: the only link sits inside the framed calcrun.com document, so search engines credit it to calcrun.com, not to the embedding site. The height is fixed, with no auto-resize.
- Fix:
  - Snippet = iframe + `<p><a href="https://www.calcrun.com/tools/...">Compound interest calculator</a> by CalcRun</p>`, with branded, non-keyword-stuffed anchors because Google treats keyword-rich widget links as link spam.
  - Add postMessage auto-height.
  - Then outreach to UK/US personal-finance bloggers, school money-education pages, credit unions and HR/payroll blogs.

### GROWTH-SEO-03  The 2027 rollover is open with no 2027 content, titles and URLs carry the year, and the US model holds one year
- Severity S2 / Verified / High / NEW. This extends the logged guard item.
- Where: us-rates.ts:14 `US_TAX_YEAR='2026'`, uk-rates.ts:15 `'2026/27'`, year-scan.csv.
- Facts:
  - IRS IR-2026-133 / Rev. Proc. 2026-35, published 5 Nov 2026: single standard deduction $16,600, MFJ $33,200, HoH $24,925; 10% bracket up to $12,800, 37% above $661,375 (single).
  - SSA 2027 wage base $192,300, announced 14 Oct 2026.
  - UK Autumn Budget 28 Oct 2026; Scottish Budget 3 Dec 2026.
- Actual:
  - Year appears in titles on 6 pages, descriptions on 10, H1s on 6, and "2026/27" in body text on 20 pages.
  - Year is in the URL on 3 pages: /comparisons/renting-vs-buying-2026/, /scenarios/stamp-duty-first-time-buyer-2026/, /scenarios/cgt-second-home-2026-27/.
  - No page targets "2027 tax brackets", "2027 paycheck calculator" or "take home pay 2027/28".
  - From 1 Jan, filing intent (TY2026, Jan to 15 Apr) and paycheck intent (2027) need both years. The guard blocks all deploys from 1 Jan.
- Fix:
  - Treat the tax year as data: a year selector, with titles generated from the constant.
  - Ship the US 2027 view before 1 Jan (MATH-US verifies the figures) and keep 2026 for filing.
  - Publish the UK 2027/28 view and hub around Feb 2027.
  - Do a one-time 301 of the year-in-URL slugs to evergreen slugs at that refresh.

### GROWTH-SEO-04  Tax tool titles omit the year and scenario titles omit the answer
- Severity S3 / Verified / High / NEW
- Current titles:
  - salary-uk: "UK Salary & Take-Home Calculator | CalcRun"
  - salary-us: the same pattern
  - stamp-duty: "Stamp Duty Calculator | CalcRun". The tool covers England & NI only, but the description says "UK property".
  - 50k-salary-uk-take-home: "Take-Home Pay on a £50,000 Salary in 2026/27", with no figure.
- What competitors do:
  - "take home pay calculator uk 2026/27": nearly every result has "2026/27" in the title.
  - "50k after tax uk": winners put the figure in the title (payprecision.co.uk "£50k after tax in the UK: £39,520 take-home pay"; accotax.co.uk "...2026/27: £3,293 a Month").
- Fix:
  - Generate titles from the year constant, e.g. "UK Take-Home Pay Calculator 2026/27: Salary After Tax & NI".
  - Put the answer in numeric scenario titles.
  - Add "England & NI" on stamp duty.

### GROWTH-SEO-05  Internal links run one way
- Severity S3 / Verified / Med / NEW
- Tool to comparison: 0 of 46 tool pages link to any comparison. Comparisons link to tools via `relatedTools`, but there is no reverse link.
- Weakly linked comparisons:
  - 5 of 16 comparisons have 2 inlinks or fewer.
  - pcp-vs-hp-vs-personal-loan, high-yield-savings-vs-cds and roth-ira-vs-roth-401k are linked only from /comparisons/.
  - The PCP article is not linked from /tools/debt-and-loans/car-finance/.
- Methodology: 20 of 23 pages have exactly 1 inlink, so the July "de-orphaned" fix holds but is minimal.
- Scenario links: credit-card-payoff, mortgage-affordability, rent-vs-buy and car-finance link to 0 scenarios.
- Reachability itself is fine: every page is 2 clicks or fewer from `/` through the mega-nav.
- Fix:
  - Add a "Compare your options" block on tool pages, built by reversing `relatedTools`.
  - Link methodology pages from hubs, scenarios and comparisons.
  - Fix scenario `toolSlug` (e.g. 50k-credit-card-debt-payoff should point to credit-card-payoff).

### GROWTH-SEO-06  CalcRun barely exists outside Google
- Severity S3 / Likely / Med / NEW
- Evidence (WebSearch, non-Google, 9 Nov 2026):
  - The query "calcrun" returns the Calc Run running app, CalcuRun and unrelated pages.
  - The query "calcrun.com" returns the homepage plus calcrun.net, a running-calculator site with the same name.
  - Across about 25 queries only `/` and /compound-interest/ ever surfaced.
  - An exact-title search for the childcare-cliff page finds nothing.
- On the site: no Bing verification meta and no IndexNow key file. A Bing `site:` fetch was inconclusive.
- Why it matters: Bing feeds ChatGPT search and Copilot, so this is LLM-citation exposure.
- Fix:
  - Verify Bing Webmaster Tools (import from GSC) and submit the sitemap.
  - IndexNow: either a key file plus a post-deploy ping, or Cloudflare Crawler Hints once verified on Workers assets.
  - Top-level Organization JSON-LD with a PNG logo and sameAs links.
  - A homepage title that disambiguates the brand.

### GROWTH-SEO-07  US salary scenarios silently assume a state
- Severity S3 / Verified / Med / NEW
- Examples:
  - 75k-salary-after-taxes: the title says "Federal and State"; only the description reveals New York.
  - 100k-salary-take-home: the description reveals California.
- "75k after taxes texas": 18 of 18 results are salary x state pages, 9 of them on pages.dev, vercel or netlify.
- Fix:
  - Put the state in the title and H1, or reframe the page as federal + FICA.
  - The cheapest credible state coverage is a no-income-tax-states mode (9 states, exact).

### GROWTH-SEO-08  Structured data is correct but yields little in Google today
- Severity S4 / Verified / Low / NEW
- No rich results available:
  - FAQPage on 54 pages: Google stopped showing FAQ rich results on 7 May 2026 (Google FAQPage docs). Keep the visible FAQs.
  - WebApplication on 46 pages without ratings, so no Software App rich result. Never fabricate ratings.
- Metadata mismatches:
  - og:type is "website" on all 61 Article pages, with no article:published_time.
  - og:locale is en_US on all 142 pages, including UK pages.
  - priceCurrency is USD on UK tools.
  - Organization appears only nested as publisher, with an SVG logo.
- Nits:
  - The 404 canonical points to /404/.
  - Heading-level skips on jwt-decoder and the 404 page.

### GROWTH-SEO-09  Six standalone scenarios duplicate a hub row's intent
- Severity S4 / Likely / Low / NEW
- Pairs:

  | Standalone scenario | Matching hub row |
  |---|---|
  | 50k-salary-uk-take-home | uk-take-home-pay#50k |
  | 100k-salary-uk-tax | uk-take-home-pay#100k |
  | 75k-salary-after-taxes | us-take-home-pay#75k |
  | 100k-salary-take-home | us-take-home-pay#100k |
  | 300k-mortgage-7-percent | mortgage-payments-by-amount |
  | 100000-invested-30-years | investment-growth#100000 |

- Text overlap is low: max 22.7% raw, 19.1% excluding boilerplate; 1,816 of 1,830 pairs are under 10%.
- Fix: act only if GSC shows both URLs alternating for the same query.

### GROWTH-SEO-10  18 titles exceed 60 characters; hub H1s differ from their titles
- Severity S4 / Verified / Low / NEW
- Examples: investment-growth (82 characters), pcp-vs-hp (79), 100k-childcare-cliff (76).
- Fix: drop the " | CalcRun" suffix when the title is over 55 characters.

## Technical SEO audit numbers (143 files)

| Check | Result |
|---|---|
| Sitemap | 141 of 141 indexable pages are in the sitemap; it is byte-identical to live; no extras. Excluded: /404.html and /labs/story/. lastmod on 12 of 141 (logged). |
| Canonicals | Self, www and trailing slash on 141 of 141. |
| robots.txt (live) | Allow everything, plus the sitemap line. No X-Robots-Tag headers. |
| noindex | Only on the 404 page and the /labs/story/ meta-refresh stub (noindex, canonical to /, not in the sitemap, 301 in `_redirects`). |
| Titles | All unique. 18 over 60 characters, 17 under 30, year in 6. |
| Descriptions | All unique and 160 characters or fewer. |
| H1 | One per page; the labs stub has 0. |
| hreflang | None, which is correct. UK and US pages are not equivalents, and geo-aware tools are single URLs. |
| JSON-LD | 134 pages, 0 parse errors. BreadcrumbList 133 (one each), Article 61, WebApplication 46, FAQPage 54, ProfilePage 1, WebSite 1, HowTo 0. |
| OG images | Absolute URLs, file present on 142. |
| Internal links | 0 links to redirected, missing or slashless URLs. Max click depth 2 (64 pages at depth 1, 76 at depth 2). |
| Image alt | 0 images missing alt. |
| Page weight | HTML 140-199KB (20-27KB gzipped). |

## Why about 40 visits a day (evidence)
There is no GSC or GA4 access. The last known GSC snapshot (implementation-plan.md:39, 3 Mar 2026) showed 3 pages indexed. The July review found about 7 indexed and zero off-page authority.

1. **No authority or distribution.**
   - No external mentions were found.
   - Embeds pass no links.
   - Product Hunt, Reddit and HN are still pending, and distribution was deferred on 2 Jul.
   - This is YMYL finance, where reputation counts heavily.
2. **The calculator space is flooded.**
   - "take home pay calculator uk 2026/27": about 15 calculators, plus 10 more exact-match domains in an extended search.
   - "75k after taxes texas": 18 of 18 results are programmatic pages, half of them on pages.dev or similar.
   - The childcare-cliff long tail: 9 dedicated calculators.
   - Parasite spam also ranks.
3. **A young domain that was reset.** 68 URLs were 301'd and titles and design were redone on 7 Jul, so quality reassessment lags.
4. The homepage renders blank to crawlers (finding 01).
5. No brand ownership (finding 06).
6. **Clicks go to answer boxes.** Numeric questions and X-vs-Y comparisons are answered on the results page; the head terms belong to NerdWallet, Bankrate, Which?, MSE and Rightmove.
7. **File and developer tools dilute focus.** 23 of 46 tools sit in results owned by Adobe, Smallpdf, jsonlint and jwt.io.
8. **Region mismatch.** Shared URLs default to USD for UK visitors (logged).

Caveat: WebSearch is not Google. It surfaced none of the Google UK incumbents (thesalarycalculator, listentotaxman, MSE), so treat its results as a measure of competitor density, not Google rankings.

## SERP benchmark (per-query detail in serp-benchmark.csv)

| Query | Difficulty |
|---|---|
| take home pay uk 2026/27 | Very hard |
| 50k after tax uk | Hard |
| 60% tax trap | Very hard |
| stamp duty first time buyer | Very hard |
| salary calculator us 2026 | Very hard |
| 75k after taxes texas | Hard (and no state engine) |
| how much house can i afford | Very hard |
| mortgage calculator | Very hard |
| compound interest calculator | Very hard |
| credit card payoff calculator | Very hard |
| pension vs isa | Very hard |
| heic to jpg, compress pdf, json formatter, jwt decoder | Very hard |

CalcRun appeared for none of these, except the compound-interest page on a brand-qualified query.

Features the winning results share:
- The year in the title.
- The figure in the title.
- One URL per salary or per state.
- Query-parameter URLs that get indexed (uktax.tools ?income=25000).
- Brand authority.

Realistic niches:
1. **First weeks of new-year and new-policy queries.**
   - 2027/28 take-home pay, the 2027 paycheck, Scottish 2027/28 rates after 3 Dec.
   - Budget-2026 measures: savings and dividend tax from Apr 2027, the Pension Tax Allowance, LISA and First-Time Buyer ISA.
2. **Decision tools that AI Overviews cannot answer.** Example: salary-sacrifice optimiser for the £100k cliffs (Phase 5).
3. **Deep UK combinations** served through URL-state results, not static pages.

## Strategy
- **Freeze file/dev tools.** Don't delete or noindex them without GA4 data.
- **Doorway risk is now low on text, residual on intent.** Don't rebuild one URL per salary.
- **AI Overviews / LLM.** Hubs are extraction-ready. Exposure needs Bing/Brave indexing plus unique facts; publish open take-home JSON/CSV as a linkable, citable asset. llms.txt is optional and low value.

## Freshness calendar

| Date | Event | Action |
|---|---|---|
| 14 Oct 2026 | SSA 2027 COLA and wage base $192,300 | |
| 28 Oct 2026 | UK Budget: thresholds frozen to 2031; Cash ISA £12k cut scrapped; LISA change from 29 Oct; savings/dividend changes Apr 2027; Pension Tax Allowance | 4 pages are now stale |
| 5 Nov 2026 | IRS Rev. Proc. 2026-35 | Build US 2027 now |
| 3 Dec 2026 | Scottish Budget | |
| 1 Jan 2027 | US rollover; guard fails builds | Retitle the US hub (title/H1 "2026"), salary-us description and US scenarios; keep TY2026 to 15 Apr |
| Jan-Mar 2027 | HMRC 2027/28 pages, student-loan thresholds, Spring Statement (dates unverified) | UK 2027/28 hub plus year toggle around Feb |
| 6 Apr 2027 | UK rollover; guard fails | Titles: uk-take-home-pay, 50k-uk, cgt-second-home. Descriptions: salary-uk, 60% trap, plan-5. 20 pages carry "2026/27" in body. 301 the 3 year-in-URL slugs. |
| 6 Aug 2027 | `LAST_CHECKED` (2026-07-02) passes 400 days; guard fails | Re-verify and bump dates |

## Ranked backlog
Score = impact x (6 - effort).

| ID | Item | Score | Tag |
|---|---|---|---|
| B1 | Embed attribution link + auto-height, then outreach | 16 | Quick win (code) + Strategic (outreach) |
| B2 | Year-driven and answer-first titles | 15 | Quick win |
| B3 | 2027 readiness: year as data, US 2027 by 1 Jan, guard warns before it blocks | 15 | Strategic, deadline-bound |
| B4 | Owner GSC pass: homepage screenshot, indexing report, 16-month export, request indexing of the hubs | 15 | Quick win |
| B5 | Stale Budget claims on 4 pages | 15 | Quick win |
| B6 | Product-first homepage | 12 | Quick win to Strategic |
| B7 | UK 2027/28 hub around Feb | 12 | Strategic |
| B8 | Bing Webmaster Tools + IndexNow + Organization sameAs | 10 | Quick win |
| B9 | Reverse internal links + scenario toolSlug fix | 10 | Quick win |
| B10 | URL-state shareable results (logged item, growth framing) | 9 | Strategic |
| B11 | Open take-home dataset + 2027/28 marginal-cliff chart | 9 | Strategic |
| B12 | Owner-expert forum answers and journalist quotes, about 2h/week | 8 | Strategic |
| B13 | No-income-tax-states mode | 8 | Strategic |
| B14 | og:type/locale fixes, title trims, lastmod | 5 | Quick win |
| B15 | llms.txt | 5 | Not worth it (harmless) |
| B16 | Separate UK URLs + hreflang | 4 | Not worth it at 40/day |
| B17 | Full 50-state engine | 3 | Not worth it at 40/day |
| B18 | More file/dev tools | 3 | Not worth it |

## Do not do
1. Rebuild per-salary or per-amount doorway pages.
2. Fake rating schema.
3. Sniff Googlebot's user agent to skip the intro.
4. hreflang between UK and US pages.
5. The year in new URLs.
6. Another URL-structure migration.
7. Bought links, link exchanges or keyword-stuffed widget anchors.
8. Unprompted Reddit link drops.
9. Chasing head terms with new content.
10. 2027 pages with guessed figures before the primary source publishes.
11. Relying on FAQ rich results (gone since 7 May 2026) or HowTo (gone since Sep 2023).
12. Deleting or noindexing file tools without GA4 data.

## What works well (verified)
1. **Clean canonical, sitemap and link base.** The July 307 issue is fixed, and /labs/story/ is handled correctly.
2. **Unique metadata and structured data at scale.** 143 unique titles, 0 JSON-LD errors, full Article schema on 61 pages.
3. **The doorway clean-up worked.** Max overlap is 22.7%, against 44-53% before.
4. **Hubs and interior pages are answer-first.** Server-rendered tables, fully visible to the crawler simulation.
5. **Depth of 2 clicks or fewer site-wide.**

## Out-of-lane
- **MATH-UK/CONTENT (likely S2): the 28 Oct Budget made live content stale.**
  - Scrapped "£12k Cash ISA" claim: cash-isa-vs-savings-account.md:99, isa-vs-general-investment.md:90, lisa-vs-regular-isa.md:108.
  - Old LISA 25%-above-£450k penalty: lisa-vs-regular-isa.md:75, stamp-duty-first-time-buyer-2026.md:71.
  - MSE (28 Oct) and Royal London (20%) disagree on the new LISA charge; verify on gov.uk.
- **EDGE:** check that Cloudflare AI Crawl Control or Bot Fight Mode is not blocking GPTBot, ClaudeBot or PerplexityBot.
- **EDGE/CALC-UX-B:** AffiliateLinks renders inside `?embed` mode (ToolPageLayout.astro:204-207).
- **HOME-CHROME:** in the intro-seen state the H1 is invisible.
- **A11Y-PERF:** the homepage ships 426KB of direct JS/CSS, and every page carries about 30KB of duplicated mobile-menu markup.
- **CONTENT:** the stamp-duty description says "UK" but the tool covers England & NI only.

## Coverage
- **Tested:**
  - All 143 dist HTML files.
  - The full link graph.
  - Year scan and overlap analysis (61 pages).
  - Crawler-style renders on 8 preview page/state combinations.
  - About 30 WebSearch queries and 4 WebFetch reads (irs.gov, Google FAQPage docs, Royal London, MSE).
  - 3 live requests: robots.txt and two sitemaps.
- **Not done:**
  - GSC, GA4 or Bing Webmaster data.
  - Google UK results, search volume or keyword difficulty.
  - Common Crawl (504 on 8 attempts).
  - A backlink index.
  - Content quality, money figures, live embeds.

## Sources (accessed 9 Nov 2026)
- irs.gov IR-2026-133: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts
- SSA COLA: https://www.ssa.gov/news/en/cola/index.html and https://www.journalofaccountancy.com/news/2026/oct/social-security-wage-base-and-cola-announced-for-2027/
- Royal London Budget summary: https://adviser.royallondon.com/technical-central/pensions/budgets-and-acts/2026-Autumn-Budget/
- MSE on the Cash ISA cut: https://www.moneysavingexpert.com/news/2026/10/cash-isa-limit-cut-cancelled/
- MSE on the LISA: https://www.moneysavingexpert.com/news/2026/10/budget-lifetime-isa/
- Google FAQPage docs: https://developers.google.com/search/docs/appearance/structured-data/faqpage
- SERP example URLs are in serp-benchmark.csv.