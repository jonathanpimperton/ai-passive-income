CalcRun review plan: users, journeys, UX and growth lens (planner 2). Plain ASCII; GBP written as "GBP".

0. RECON FACTS (checked 9 Nov 2026; reviewers must re-confirm before filing)
- The live 404 page is blank. curl https://www.calcrun.com/nope/ returns HTTP 404 with Content-Length 0. dist/404.html exists, but wrangler.toml [assets] has no not_found_handling.
- Retired doorway URLs 301 only when the trailing slash is present. /scenarios/150k-salary-after-taxes without the slash goes to the blank 404. Slash-less live pages return 307, not 301.
- No URL state anywhere: zero URLSearchParams or replaceState in src/components.
  - The scenario CTA "Try it with your numbers" (src/pages/scenarios/[scenario].astro:93) opens the tool at its defaults.
  - Share copies a bare URL.
  - Only theme and currency persist.
- Region/currency defaults to USD for every visitor (src/lib/currency.ts getSavedCurrency). It is labelled "Display currency" but it changes the maths (PITI/PMI, DTI and so on). Visiting UK Salary does not set GBP for the next tool.
- Homepage:
  - It is a 700vh scroll track with the main nav hidden (hideNav). Only a "Skip to the calculators" pill shows.
  - The H1 is "Get clarity on your financial decisions".
  - Intro gating uses sessionStorage, which is per tab, so the intro probably replays on every fresh Google or new-tab arrival.
- Salary calculators:
  - US Salary uses one flat state-tax % slider (default 5%) with no state picker.
  - UK Salary has no hourly/weekly input (US Salary does) and its slider tops out at GBP 250k.
- Tool titles have no year or keyword modifier ("Stamp Duty Calculator | CalcRun"). The UK take-home SERP is full of "2026/27" titles and query-parameter pages (uktax.tools ?income=, salarytax.uk ?gross=).
- A WebSearch for "calcrun.com calculator" returned no calcrun.com results.
- Only 12 of the 141 sitemap URLs have a lastmod.
- The /tools/ meta says "all 44"; there are 46 tools.
- The embed snippet has a fixed height of 700 and does not resize.
- tests/fixtures has no HEIC file.
- Freshness:
  - The IRS published its tax-year-2027 adjustments on 5 Nov 2026 (IR-2026-133).
  - Search results suggest a UK Budget on 28 Oct 2026. This is unverified; confirm on GOV.UK.
  - The Nov-2025 Budget measures (cash ISA change from April 2027, +2pp on savings/dividend/property income tax, salary-sacrifice NI cap) do not obviously appear in the ISA/pension comparisons.
  - The rates guard only fails a build on push. The live site will keep showing "2026" US rates silently after 1 Jan.

1. PERSONAS AND LIKELY ENTRY POINTS
At about 40 visits/day, expect mostly direct/owner/bot traffic plus long-tail UK pages and file tools via Bing/DDG. First step: ask the owner for a GSC Performance export (pages and queries), the GSC Pages indexing report, and GA4 landing pages by device and country for the last 120 days. Re-weight the journeys below if that data comes in.
- P1 UK employee (biggest content investment).
  - Queries: "50k after tax uk", "take home pay 2026/27", "60% tax trap", "100k childcare", "plan 5 student loan", "pay rise take home".
  - Entry pages: /scenarios/uk-take-home-pay/#50k, 60-percent-tax-trap-uk, 100k-childcare-cliff-uk, pay-rise-shock-uk, plan-5-student-loans-explained, salary-uk.
- P2 UK buyer or investor.
  - Queries: "stamp duty first time buyer", "300k mortgage uk", "pension vs isa", "lisa vs isa", "cgt second home".
- P3 US worker or buyer.
  - Queries: "75k after taxes [state]", "paycheck calculator 2026", "how much house can I afford", "300k mortgage 7%".
  - Entry pages: us-take-home-pay hub, mortgage hubs, affordability.
- P4 Saver/FIRE (US and UK): compound interest, investment-growth hub, retire-at-55, roth vs traditional.
- P5 Debt-stressed: credit-card payoff, snowball vs avalanche, 50k-credit-card-debt-payoff.
- P6 Utility user (high volume, low loyalty): heic to jpg, compress/merge pdf, json formatter, jwt decode, png to ico. Up against iLovePDF, Smallpdf, Squoosh, jwt.io.
- P7 Embedder (blogger or teacher): /embed/.
- P8 Sharer or returning visitor.
- P9 Access-constrained: screen reader, keyboard-only, 200-400% zoom, low-end Android on 3G.
- Secondary: EUR/Irish user (de-DE number format, no salary tool).

2. JOURNEY SCRIPTS
Format: start | device | goal | steps | success | likely failure.

J1 UK pay rise
- Start: /scenarios/pay-rise-shock-uk/
- Device: iPhone 13 (WebKit), Slow 4G.
- Goal: own numbers for GBP 46.5k to 52k, Plan 2, 5% salary sacrifice.
- Steps: read the answer, click the CTA, enter old and new salary, compare monthly net. Then share the link and reopen it in a fresh context. Then a "next day" revisit with storage kept.
- Success: monthly delta within 60s.
- Likely failure: inputs lost on handoff, no old-vs-new compare, recipient sees defaults.

J2 Legacy or anchor arrival
- Start: /scenarios/45k-salary-uk-take-home/ (301) and the slash-less variant.
- Device: Pixel 7.
- Success: the #45k row is visible and highlighted, not under the sticky header, and the year is obvious.
- Likely failure: blank 404 on the slash-less URL; the embedded calculator below sits at defaults.

J3 GBP 100k trap
- Start: /scenarios/60-percent-tax-trap-uk/ and 100k-childcare-cliff-uk.
- Device: desktop 1366.
- Goal: "how much should I sacrifice to get under 100k, with 2 kids?"
- Likely failure: no solve-for-sacrifice; childcare not modelled in the tool.

J4 UK first-time buyer chain
- Start: Google to stamp-duty-first-time-buyer-2026, then the stamp-duty tool (GBP 425k), then mortgage-affordability, then mortgage-payment.
- Device: mobile.
- Success: GBP and UK framing carry through every step.
- Likely failure: USD default, PMI/property-tax fields, US vocabulary, re-entering inputs.
- Variant: switch to EUR and judge formatting and what is on offer.

J5 US buyer chain
- Start: mortgage-affordability (USD 85k household, USD 400 car loan), then mortgage-payment, then the mortgage hub, then rent-vs-buy.
- Device: Galaxy A-class profile (CPU 4x, Slow 4G).
- Likely failure: re-entry between tools, defaults that disagree (rate, term), affiliate cards before the answer.

J6 US paycheck
- Start: Google "75k after taxes texas" to /scenarios/75k-salary-after-taxes/, then the US tool.
- Likely failure: no state picker, so the 5% default overstates tax for TX; 2026 vs 2027 confusion; no per-paycheck (biweekly) view.

J7 Homepage, first vs repeat visit
- Profiles: fresh context at 375x667 and 1440x900.
- Measure scrolls and seconds to the first usable calculator, with and without the skip pill.
- Then open / in 3 new tabs, use back/forward after skip, rotate the phone, use reduced motion, and check what a no-JS visitor sees.
- Likely failure: the intro replays per tab, nav hidden, vague H1 for search arrivals.

J8 Developer
- Start: json-formatter. Paste broken JSON: trailing comma, single quotes, NaN, BOM, a 5MB file, 200-level nesting.
- Then jwt-decoder with an expired token and a malformed token.
- Keyboard only. Check the network tab.
- Success: exact line/column errors, no freeze, zero network calls.

J9 Phone HEIC
- Start: heic-to-jpg on WebKit iPhone and Chromium Android.
- Steps: three real HEICs (48MP, Live Photo, rotated), batch convert, download all, then image-compressor for email.
- Likely failure: memory crash, Safari download handling, EXIF orientation, unclear progress.

J10 PDF job
- Steps: merge a 30MB PDF, an encrypted PDF and a corrupt PDF; compress the result; split pages 3-5.
- Device: CPU 6x throttle.
- Success: clear per-file errors, output smaller than input, sensible file names.

J11 Embedder
- Start: /embed/. Copy the mortgage iframe into a local scratch HTML page at 360px and 1200px.
- Likely failure: clipping at 700px, double scrollbars, cookie banner or chrome inside the iframe, attribution rel, iframe title.

J12 Inclusive run
- Run J1 and J8 keyboard-only, plus an accessibility-tree snapshot.
- Check the homepage H1 character spans, slider arrow and PageUp behaviour, and aria-live chatter on each keystroke.
- Check 200% and 400% zoom, 320px reflow, forced-colors and dark mode.

3. WORK PACKAGES (my lens: 6. Merge U5 into U2 and U1 into U6 if capped.)

WP-U1 Search arrival and landing fit
- Targets: 4 hubs, 9 high-intent scenarios (pay-rise UK/US, 60% trap, childcare cliff, plan-5, stamp-duty FTB, cgt-second-home, uk-300k-mortgage, 75k-after-taxes), 6 top tools, 4 comparisons.
- Methods:
  - Write each page's target query from its title and keywords.
  - Screenshot the first viewport at 390x844 and 1366x768.
  - Score: does it answer the query above the fold?
  - Run J1-J6 entry legs.
  - Check that the hub row, the scenario and the tool agree at the same inputs.
  - Check cannibal pairs: 100k-salary-take-home vs the US hub #100k, 50k-salary-uk-take-home vs the UK hub #50k, uk-300k vs the mortgage hub.
- Break it: anchors, slash-less legacy URLs, wrong region, figures that disagree.

WP-U2 Calculator task UX and robustness (mobile-first)
- Targets: the 23 financial calculators. Priority: salary-uk, salary-us, both mortgage tools, stamp-duty, credit-card, debt payoff, compound, retirement x3, car-finance, solar.
- Methods: Playwright iPhone 13 (WebKit) and Pixel 7. Type and paste "50,000", "GBP50k", "50k", decimals, negative, 0, empty, 1e9, above slider max, EUR-style commas.
- Also check:
  - result visible on mobile without hunting;
  - chart and schedule readability at 360px;
  - region switch mid-task; reset; PDF export (local only);
  - plausibility of UK vs US defaults;
  - missing jobs vs leaders (state picker, UK hourly, bonus, two jobs, overpayments, remortgage).
- The other planner owns maths correctness. Flag implausible numbers only.

WP-U3 Homepage, wayfinding, retention and sharing
- Targets: J7, nav, header search, /tools/, /scenarios/, /comparisons/, footer, live 404 experience, breadcrumbs, related-tools and scenario-links logic, Share output, J11, theme/currency persistence, manifest.
- Search tests: "tax", "mortgage uk", "heic", "pdf", the typo "morgage", "take home".
- Break it: deep-link #daylight, resize mid-intro, scroll restoration, many tabs.

WP-U4 Inclusive and constrained access
- Targets: axe-core on 15 representative pages, light and dark; then J12.
- Low-end profile: CPU 6x plus 3G (400ms RTT, 400kbps), using Chromium CDP Network.emulateNetworkConditions and Emulation.setCPUThrottlingRate.
- Measure: time to a usable calculator, whether you can type into the skeleton before client:idle hydration, homepage GSAP jank, font-swap layout shift, HTML weight (home 177KB, salary-uk 181KB).
- Split with the other planner: they own lab performance metrics; U4 owns perceived experience.

WP-U5 File and developer tool jobs
- Targets: all 23 utility and file tools. Priority: heic-to-jpg, pdf-compress, pdf-merge, image-compressor, images-to-pdf, json-formatter, jwt-decoder, qr-code, password-generator, png-to-ico.
- Fixtures: tests/fixtures plus synthetic large or odd files in a scratch dir. Source a real HEIC sample into its own empty dir (untrusted-data rules).
- Methods: Chromium and WebKit; picker and drag-drop; batch, cancel, download names; output size vs input; network log to verify "never leaves your device"; tab-crash thresholds.
- Never upload anything to competitors. Compare their features from public pages only.

WP-U6 Growth, SERP and freshness (desk review)
- SERP benchmark: 15 queries (the P1-P6 queries plus "compound interest calculator", "compress pdf", "json formatter"). Record top-10 site types, winning features (year in title, URL state, prefilled pages) and whether calcrun appears. WebSearch is US-indexed; note the UK SERP bias.
- From dist/:
  - title/meta CTR audit;
  - 5-gram overlap between neighbouring scenarios, hubs and comparisons (doorway risk);
  - inlink counts per page;
  - finance vs file-tool topical split;
  - AI-Overview exposure of comparisons.
- Freshness calendar: IRS TY2027 numbers already out; UK Budget 2026; 1 Jan US rollover; 6 Apr UK rollover; the guard only fails on push; lastmod on 12/141 URLs.
- Linkable and return-visit assets: embeds, shareable result URLs, early "2027 brackets/take-home" pages.
- Deliver a ranked backlog scored impact x effort, plus a "do not do" list (more doorways, more unsearched tools).
- Leave crawl/index/schema mechanics to the other planner.

All WPs
- Log at least 3 verified strengths ("what works well") to the same evidence standard.

Rules every reviewer must follow
- Repo is read-only. All evidence goes outside the repo, in an orchestrator-assigned dir (e.g. <scratchpad>/review/WP-Ux/). Name files WPUx-nn-slug-viewport.png.
- Block GA on BOTH live and local preview. The built HTML carries the production GA4 tag, so localhost hits would pollute the real property. Use:
  `context.route(/(googletagmanager|google-analytics|analytics\.google)\.com/, r => r.abort())`
- Never submit email-results, subscribe, newsletter or scroll-bar forms on live. On the preview, /api does not exist, so submit there only to test the error state.
- Live checks: curl GET/HEAD only, at most 1 request/second, at most about 150 per WP, no recursive crawls. For whole-site sweeps, grep dist/ instead.
- The preview ignores _redirects and _headers. Test redirects, 404s and headers on live.

Evidence standard for a finding
- ID, title, severity / reach / confidence
- URL (http://localhost:4399/... or live)
- Device profile (Playwright device, viewport, throttle, engine), theme, and localStorage state (calcrun.currency)
- Numbered steps, expected vs actual
- Screenshot or video path; for live checks, the exact curl command and status line
- Optional file:line; one-line fix direction
- Dedup against the shared list by URL + symptom before filing.

4. RUBRIC
Score each journey 0-3 on five dimensions:
- Intent match:
  - 3 = the query is answered in the first viewport;
  - 0 = you must scroll or click to understand the page.
- Time to own number (mobile, Slow 4G, from landing):
  - 3 = 20s or less and 3 interactions or fewer;
  - 2 = 45s or less;
  - 1 = 90s or less;
  - 0 = failed.
- Trust:
  - 3 = correct region by default, tax year and source visible, the same figure everywhere, plain-English explanation;
  - 0 = wrong or stale label, or figures that contradict each other.
- Continuity:
  - 3 = an obvious next step, inputs carry over, results shareable or recoverable;
  - 0 = dead end, re-entry, or blank page.
- Friction:
  - 3 = nothing between the user and the answer;
  - 0 = banners, email bars, affiliates or layout shift before the answer.

Finding severity:
- S1: blocks the job, or shows a wrong or misleading number or region to a plausible segment, or leaves users on a blank page.
- S2: likely abandonment or trust damage on a top entry page, or a growth lever with large upside.
- S3: noticeable polish issue.
- S4: nit.
Reach: High = top entry pages or all UK/US users; Med; Low.
Confidence: Verified repro, Likely, or Hypothesis. Hypotheses can never be S1.

Growth items: grade as Quick win (under 1 day, plausible traffic gain), Strategic, or Not worth it at 40 visits/day.

"Works well" at this stage means:
- one clear answer per page;
- region-correct defaults;
- consistent numbers across tools and pages;
- no dead ends;
- thumb-usable on a 360px phone;
- faster to an answer than calculator.net or thesalarycalculator for the same query.

"Doesn't work" means anything that makes a search arrival bounce within 10 seconds, forces re-entry, or undermines trust in a figure.

### Critical Files for Implementation
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\pages\index.astro
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\pages\scenarios\[scenario].astro
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\lib\currency.ts
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\components\tools\SalaryCalc.tsx
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\wrangler.toml