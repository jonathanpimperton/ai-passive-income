CALCRUN REVIEW PLAN: PRODUCT SURFACE + RISK CARTOGRAPHY (planner 2)
Recon was light. Items marked [seen] I observed directly, using a few live curl probes and some greps. Everything else is a hypothesis for reviewers to confirm or kill.

1. SURFACE INVENTORY
- Build output: dist has 143 HTML files (142 real pages plus the /labs/story meta-refresh page). The sitemap lists 141 URLs. There are 108 build-time OG PNGs: 46 tools, plus scenarios, comparisons, 4 hubs and a default (src/pages/og/*).
- Tools (46): defined in src/data/tools/*.md, routed through src/pages/tools/[category]/[tool].astro, with components in src/components/tools/.
  - 23 financial: saving-and-growth 6, debt-and-loans 7, income-and-planning 7, economic 3.
  - 7 utility and 16 file tools.
  - The PlaceholderCalc fallback is still wired in.
- Content: 41 scenarios plus 4 hubs computed at build time (src/pages/scenarios/{uk,us}-take-home-pay, mortgage-payments-by-amount, investment-growth). Also 16 comparisons, 23 /how-we-calculate pages, and the static pages: about, author, accessibility, disclosure, privacy, terms, embed, tools index, 404.
- Homepage: src/pages/index.astro (1588 lines, GSAP ScrollTrigger; sessionStorage intro flag at line 198; desktop scroll-snap at line 1484) plus src/components/homepage/DecisionEngine.tsx (648 lines). The live HTML is 177KB [seen].
- Shared UI: ToolPageLayout.astro (762 lines) and Navigation.astro (793 lines). The pieces most likely to break:
  - SliderInput.
  - CurrencySelector/currency.ts: localStorage key, defaults to USD, no geo detection.
  - ShareButton: strips the query string, so it shares the bare URL with no inputs.
  - ExportPdfButton/pdf-export.ts, EmailResultsButton, EmailCapture, ScrollEmailBar.
  - ResultAffiliate, CookieBanner.astro, ThemeToggle.
- Data:
  - src/lib/uk-rates.ts and us-rates.ts: both LAST_CHECKED 2026-07-02.
  - The rate engines (uk-tax-calc, us-tax-calc, calculator-utils, capital-gains, stamp-duty, car-finance, solar-payback) and docs/tax-values-2026.json.
  - Hardcoded data elsewhere: InflationCalc has a US-only CPI table ending at 2025; SolarPaybackCalc says "Ofgem cap ~24.5p/kWh (Q2 2026)".
- Edge:
  - worker.ts: POST /api/subscribe has no Turnstile and relies on a WAF rule nobody has verified. POST /api/email-results uses Turnstile, MailerSend and MailerLite.
  - public/_headers: a global CSP plus a separate /tools/* CSP.
  - public/_redirects: 69 x 301.
  - wrangler.toml: [assets] has no not_found_handling setting.
- QA tooling:
  - vitest: about 365 tests, including stress, cross-check and freshness tests.
  - Playwright: 53 tests, Chromium only, run against the dev server on port 4321, which does not apply _headers.
  - Scripts: qa-link-check, qa-responsive-sweep, qa-shot-matrix.
  - Gaps: nothing tests the production CSP, headers, redirects, 404 or API. The HEIC test only checks that the page loads (there is no HEIC fixture). There are no edge-input tests, no WebKit or Firefox runs, and no checks of og:image or JSON-LD.

2. TOP RISK HOT-SPOTS (ranked)
1. HEIC to JPG is probably broken on the live site for non-Safari users. heic-to creates a Worker from a blob: URL and uses new Function. The live /tools/* CSP has no worker-src, no blob: and no 'wasm-unsafe-eval' [seen]. Preview and dev never apply _headers, so no existing test can catch this. The same class of risk applies to the PDF tools (pdf.js), papaparse and xlsx. The pdf.worker MIME type is fine [seen].
2. Live 404s return HTTP 404 with a 0-byte body, so the custom 404.html never shows [seen]. Several paths land there:
   - URL-trimmed paths such as /tools/debt-and-loans/ [seen].
   - Retired scenario URLs without a trailing slash, e.g. /scenarios/40k-salary-uk-take-home 404s instead of redirecting [seen].
3. Tax-year cliff. The freshness guard will fail every build from 1 Jan 2027 because US_TAX_YEAR is '2026', which blocks deploys. The IRS 2027 adjustments, SSA wage base and 401k limits are probably already published. The UK Autumn Budget 2026 is due around now. Nov 2025 Budget items may be missing from the comparisons: cash ISA limit of 12k from Apr 2027, dividend and savings rate rises, threshold freezes, Plan 2 freeze.
4. Wrong numbers in tax tools:
   - UK salary: tax codes K/BR/D0/NT/S/C/W1/M1, Scottish bands, the 100k taper, student loan combinations, pension modes.
   - US salary: flat state %, 401k caps and catch-up, OBBBA deductions not modelled.
   - SDLT first-time-buyer cliff at 500k.
   - CGT in both countries.
   - State Pension age 66 to 67 phasing.
5. Region follows the currency selector, which defaults to USD. UK visitors see US PMI, tax and CPI assumptions until they switch. EUR is "neutral". Inflation uses US CPI for everyone. localStorage access is unguarded, so sandboxed embeds may crash.
6. Degenerate inputs: a 0% rate (annuity divide-by-zero), payment at or below interest (debt calc caps at 600 months, card calc at 1200), unreachable Newton-Raphson solver targets, huge values, and NaN/Infinity flowing into charts, PDFs and the email payload (20KB cap).
7. Consent and GA: analytics_storage defaults to granted, with Decline as an opt-out; that is a UK/EU legal posture question. The gtag also fires on localhost preview.
8. /api/subscribe can be list-bombed, and the email HTML is built from inputs the client sends.
9. Number Theater homepage: scroll-snap fighting trackpads, focus landing in hidden acts, resize/orientation mid-pin, back/forward cache (bfcache), 200% zoom, LCP/CLS.
10. URL hygiene: slash-less URLs get a 307 (temporary) rather than 301/308 [seen]. Check fragment-target redirects and duplicate hosts (pages.dev / workers.dev).
11. Embeds: frame-ancestors * plus XFO SAMEORIGIN; the cookie banner, GA and email modules all load inside third-party iframes; /embed lists only the 4 financial categories.
12. Client-side parsers: the hand-rolled Markdown sanitiser misses java\tscript:, data:, vbscript: and <base>. Also the SVG sanitiser, js-yaml alias bombs, fast-xml-parser entities, JWT/Base64 with unicode, URIError on bad URL decodes, and the password generator's RNG.
13. Live/local drift: the DecisionEngine bundle hash in today's dist differs from live [seen]. One docs-only commit is unpushed.
14. Stale market claims: default mortgage rates, "mid-2026" savings rates, renting-vs-buying-2026, solar tariffs, the "Last checked 2 July 2026" badges.

3. WORK PACKAGES (my lens)

WP-1 Money maths and rates correctness
- Scope: every financial engine, the inline maths in the 23 calculator components, DecisionEngine, and every figure printed in hubs, scenarios, comparisons and methodologies.
- Methods:
  - Static read, plus `npx vitest run` as a baseline.
  - Scratchpad scripts that import repo libs by absolute path (via esbuild or vitest from the repo's node_modules).
  - Cross-check against primary sources (GOV.UK, gov.scot, HMRC, IRS Rev. Proc., SSA, BLS, Ofgem) with an independent hand calculation.
  - Cross-surface consistency: the same inputs must give the same answer on the calculator, hub table, scenario prose, homepage engine and email/PDF.
- Attacks:
  - UK incomes at 0 / 12,570 / 50,270 / 100,000 / 125,140 / 10M, the full tax-code list, Scottish bands, plan combinations.
  - SDLT at 300k / 500k / 500,001 / 925k / 1.5M with first-time-buyer and additional-property flags.
  - CGT incomes that straddle a band.
  - US bracket edges for every filing status, the 184,500 SS cap, Medicare at 200k, 401k over the cap.
  - 0% rates and 100-year horizons.
- 2027 readiness: list every constant that changes on 1 Jan or 6 Apr 2027 and whether its new value is published yet.
- Evidence: inputs, the site's output, an independent result with a date-stamped source URL, the delta, and file:line.

WP-2 Calculator break-it (browser)
- Scope: the 23 calculator UIs and their chrome (SliderInput, CurrencySelector, Share, PDF, Email UI, ResultAffiliate, ScrollEmailBar).
- Methods: Playwright against preview on port 4399 (Chromium desktop, 360x740, iPhone profile), with GA blocked and /api/* mocked via page.route (200 / 400 / 403 / 413 / 429 / 502 / offline).
- Attacks:
  - Typed or pasted inputs: abc, -5, 1e9, 1,000,000.50, "$50k", empty then blur, max+1.
  - Keyboard on non-linear sliders, which the July review claims is fixed.
  - Switching currency mid-entry, checking USD/GBP/EUR logic per tool, and a tampered localStorage currency value.
  - PDF export at maximum schedule length and in dark mode.
  - Email payload size at maximum inputs against the 20KB cap.
  - Back/forward state, plus any console or hydration errors and visible NaN / Infinity / -0.
- Evidence: URL, inputs, screenshot path, console excerpt, file:line.

WP-3 File and utility tools, client-side security
- Methods:
  - Preview with the CSP emulated: route.fulfill injecting the exact /tools/* CSP from public/_headers.
  - One confirming live run per CSP-sensitive tool (HEIC, the 4 PDF tools, Excel, CSV) with GA blocked. Files stay in the browser.
  - Generate fixtures in the scratchpad using repo libs (pdf-lib, xlsx). Put any downloaded sample (e.g. a real .heic) in its own empty directory.
- Attacks:
  - Files: 0-byte, wrong extension, corrupt, encrypted PDF, 500-page PDF, 50MB and 16k-px images, CMYK, EXIF rotation, animated WebP.
  - Content: SVG with script or external references; CSV with BOM, semicolons, ragged rows or formula injection; a 50MB JSON file; a YAML alias bomb; XML entity expansion.
  - Utilities: malformed and alg:none JWTs, non-Latin1 Base64, bad % sequences, password RNG and modulo bias, QR at maximum capacity.
  - Confirm no file content leaves the browser (request log).
- Evidence: fixture recipe, browser, CSP or console text, output validation, time and memory.

WP-4 Production edge, API, embeds (live only)
- Methods: curl only, at most about 150 requests at about 1 per second.
- Checks:
  - Headers per route class: /, /tools/*, /embed/, /og/*, /_astro/*, /fonts/*, 404.
  - The 404 body.
  - Slash, case, index.html and query-string variants.
  - All 69 redirects, both with and without the trailing slash: status, Location, fragment, chains.
  - Apex, http, pages.dev and workers.dev hosts.
  - robots.txt and sitemap live versus dist.
  - Parity: fetch the differing live bundle and diff it against dist.
  - CSP against the third-party origins logged by WP-2/3/5.
- API:
  - Allowed: OPTIONS from an evil origin, GET (expect 405), invalid JSON, empty body, oversize body, invalid email strings, bad slug.
  - NEVER send a syntactically valid email to /api/subscribe.
  - At most one /api/email-results call, with test@example.com and a fake Turnstile token, expecting 403.
  - Static review of worker.ts: sanitizeText, template injection, CORS, fail-open paths.
- Embeds: a scratchpad HTML page on a second localhost port that iframes live and preview ?embed pages, including sandbox="allow-scripts".
- Owner-dashboard asks (cannot be tested): WAF rules, which secrets are set, MailerSend quota.

WP-5 Homepage Number Theater, site chrome, consent
- Methods:
  - Preview at 360 / 768 / 1280 / 1920 and 1280x600, in light and dark, with reduced motion, with JS off, first visit versus return, keyboard-only, and at 200% zoom.
  - CDP performance traces (LCP, CLS, TBT, JS bytes), plus one live trace with GA blocked.
- Attacks:
  - Wheel and trackpad against the snap, Tab into hidden acts, resize mid-pin, "Watch the intro again", back/forward from a tool page.
  - Mega menu and mobile menu focus and Escape; theme flash on every page type.
  - Cookie Decline: log the intercepted collect URLs (the gcs param) without sending them.
  - Compare the privacy page with actual behaviour; run axe on every page type in both themes.
- Evidence: screenshots, trace files, axe JSON, console output.

4. OVERLAP AND SEQUENCING
- Shared preview:
  - Nobody runs npm run build or writes to dist; the preview depends on it.
  - Nobody restarts the preview server. If it dies, report it.
  - Do not use the repo's Playwright config: it spawns a dev server and writes test-results/ into the repo.
  - Scripts and outputs go only in each agent's own scratchpad; use NODE_PATH to reach the repo's node_modules.
- Block GA on the preview as well as live: the tag is hardcoded, so localhost hits land in the same GA4 property.
- Live traffic: WP-4 owns all curl against live. WP-3 and WP-5 make only a handful of live browser loads, with GA blocked.
- Ownership:
  - WP-1 owns whether numbers are correct; WP-2 hands wrong figures to WP-1.
  - Prose figures and facts belong to WP-1. Titles, intent, indexing, internal links and sitemap lastmod (only 12 tools carry one [seen]) belong to the SEO/journey planner.
  - Homepage mechanics, a11y and performance belong to WP-5; narrative and conversion belong to the journeys package.
- docs/review-2026-07.md lists fixes as done: debt rollover, solar slider no-op, slider keyboard, Scottish bands, subscribe fail-open, SDLT/CGT moved to the central rates module. Re-verify each one and tag findings as regression, never-fixed or new.
- Evidence standard for every finding:
  - ID, severity S1 to S4 (S1 is a wrong money figure, a broken tool, or a legal/security issue; S4 is polish), confidence (confirmed / probable / hypothesis).
  - Environment: live or preview, browser, viewport, theme, currency.
  - URL, repro steps, expected versus actual (with a source for any maths).
  - Artefacts by absolute path: screenshots, curl -i excerpts, CSP or console lines, file:line.
  - No finding is accepted without a repro or a code pointer.

### Critical Files for Implementation
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\public\_headers
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\wrangler.toml
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\worker.ts
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\lib\us-rates.ts
- C:\Users\jonat\projects\0. Archive - completed projects in use\CalcRun\src\components\tools\HeicToJpgConverter.tsx