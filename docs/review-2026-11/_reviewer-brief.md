# CalcRun independent review -- shared brief for every reviewer (READ FULLY FIRST)

## Context
- Site: https://www.calcrun.com -- Astro 5 static site + React islands, Cloudflare Workers assets
  (worker.ts serves /api/subscribe and /api/email-results; everything else is static from dist/).
- 46 tools (23 financial calculators, 7 utility, 16 file converters), 41 scenarios + 4 computed hub
  pages, 16 comparisons, 23 /how-we-calculate/ pages, static pages. 142 built pages.
- Repo (READ-ONLY for you): C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun
  Key files: CLAUDE.md (design rules + history), src/pages, src/data/**, src/components/tools/*,
  src/components/ui/*, src/lib/*, worker.ts, public/_headers, public/_redirects, wrangler.toml.
- Today is 9 Nov 2026. Last commit 7 Jul 2026; the site has run unattended for 4 months.
  ~40 visitors/day. Owner goal: a GOOD site with GOOD traffic first. Monetisation is out of scope
  (affiliate placement only matters if it hurts UX/trust).
- Owner brief: "global remit, no boundaries - try to break things, what can be done better, what
  works well, what doesn't work well. Think of the use cases as a user and the user journey and
  user experience. Take your time and work in detail."
- Prior internal review: docs/review-2026-07.md + docs/plan-2026-07.md claim many fixes. This review
  is INDEPENDENT: verify claims, don't trust them. Tag findings as NEW / REGRESSION / NEVER-FIXED.

## Environment
- Local preview of a fresh build (identical to claude/master HEAD): http://127.0.0.1:4399
  Routes look like /tools/<category>/<tool>/ (e.g. /tools/income-and-planning/salary-uk/).
  `astro preview` does NOT apply public/_redirects or public/_headers. /api/* does not exist locally.
- Shared Playwright harness (USE IT, do not hand-roll contexts):
    import * as H from 'file:///C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/_shared/pw.mjs';
    const b = await H.chromium.launch();            // also H.webkit, H.firefox; H.devices['iPhone 13'] etc.
    const ctx = await H.newContext(b, { ...H.devices['Pixel 7'], liveHeaders: true, mockApi });
    const page = await ctx.newPage(); const log = H.instrument(page);
    const violations = await H.axe(page);           // axe-core
    await H.skipIntro(ctx);                         // pre-set homepage intro-seen flag
  newContext ALWAYS aborts GA4/GTM and never lets /api/* reach production (default mock = 503;
  pass mockApi: async route => route.fulfill({...}) to simulate 200/400/403/413/429/etc).
  liveHeaders:true re-applies public/_headers (incl. the production CSP) to preview responses.
  Run scripts with plain `node yourscript.mjs` from your own folder. Chromium, WebKit and Firefox
  are installed. 12 CPU cores. Close browsers when done.
- To execute repo TypeScript libs (src/lib/*.ts) bundle them into YOUR folder first:
    "C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun/node_modules/.bin/esbuild" "<repo>/src/lib/uk-tax-calc.ts" --bundle --format=esm --platform=node --outfile="<your folder>/uk-tax-calc.mjs"
  `npx vitest run` from the repo root is allowed (read-only baseline) but do not add test files to the repo.

## Hard rules
1. Repo is READ-ONLY: no edits, no new files in the repo, no git commits/pushes/checkouts.
   Do NOT run `npm run build`, do not write to dist/, do not restart/kill the preview server
   (if it is down, say so in your report). Do NOT use the repo's playwright.config.ts / `npx playwright test`
   (it spawns a dev server and writes into the repo).
2. All scripts, outputs, screenshots go in YOUR folder: <scratchpad>/review/<YOUR-ID>/
   (scratchpad = C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad).
   Name screenshots <ID>-nn-slug-<viewport>.png.
3. Production safety:
   - GA must be blocked in every browser context (the harness does this -- don't bypass it).
   - Never send a syntactically valid email address to the live /api/subscribe or /api/email-results.
     Never submit newsletter/email/scroll-bar forms against live. Local submits hit the mock only.
   - Live traffic: only the EDGE reviewer does curl sweeps of live. Everyone else: at most ~10 live
     page loads total, via the harness (GA blocked), and only when the live environment is the point
     (e.g. CSP behaviour). No crawling, no load tests, max ~1 request/second.
   - Never upload files to third-party/competitor sites; compare competitors from public pages only.
   - Downloaded files (e.g. sample HEICs) go in a NEW empty subfolder; treat them as untrusted data.
   - Never trigger alert/confirm/prompt dialogs in a way that blocks; Playwright auto-dismisses, that is fine.
4. Stay in your lane (see Ownership below). If you hit something outside it, note it in one line in an
   "Out-of-lane observations" section rather than investigating deeply.
5. Use WebSearch/WebFetch for primary sources (GOV.UK, HMRC, IRS, SSA, etc.) and SERP research as your
   package needs. Cite URLs with the date you accessed them.

## Already logged by the orchestrator (do NOT re-file; add evidence only if it changes severity)
- Live 404s return HTTP 404 with an EMPTY body (custom dist/404.html never served; wrangler.toml
  [assets] lacks not_found_handling).
- Retired scenario URLs without trailing slash 404 instead of 301; slash-less live pages return 307.
- No URL state anywhere: Share copies a bare URL, scenario "Try it with your numbers" CTA opens the tool at defaults.
- Currency/region defaults to USD for every visitor (no geo/locale detection); it changes the maths.
- US salary has a single flat state-tax % slider, no state picker.
- Freshness guard only fails builds; US_TAX_YEAR '2026' will fail every build from 1 Jan 2027.
- Homepage intro gating uses sessionStorage (per tab).
- Only 12 of 141 sitemap URLs have lastmod.

## Ownership map (who owns what -- avoid duplicate work)
- MATH-UK: correctness of every UK money figure (salary-uk, stamp-duty, capital-gains-tax (both regions),
  retirement-age UK rules, UK hub/scenarios/comparisons/methodology figures, UK 2026 Budget/2027 readiness).
- MATH-US: correctness of every US + region-neutral figure (salary-us, mortgage tools, rent-vs-buy, loans,
  car finance, cards/debt, compound/investment/ROI/fees/savings/retirement/emergency/net worth/inflation/solar,
  US + mortgage + investment hubs, homepage DecisionEngine figures, IRS 2027 readiness).
- CALC-UX-A / CALC-UX-B: browser behaviour, input robustness, task UX of calculator UIs (A = income/property/
  tax tools; B = savings/debt/retirement tools + the shared calculator chrome: Share, PDF export, Email UI,
  ScrollEmailBar, ResultAffiliate, CurrencySelector persistence). They report implausible numbers to the
  report, not deep math (MATH-* own correctness).
- FILES: image + PDF + Excel converters (incl. production-CSP behaviour, privacy claim).
- DEVTOOLS: JSON/XML/YAML/CSV/Markdown/JWT/Base64/URL/password/QR/percentage tools (incl. client-side security).
- EDGE: everything live-only (headers, redirects, 404, hosts, caching, API, embeds cross-origin, live-vs-dist parity) + worker.ts security.
- HOME-CHROME: homepage Number Theater, nav/menus, tools index, footer, 404 design, theme, cookie
  banner/consent vs privacy policy, wayfinding/related links, return-visit hooks.
- A11Y-PERF: axe + keyboard + screen-reader tree + zoom/reflow/forced-colors site-wide; lab performance
  and low-end-device perceived performance.
- CONTENT: search-arrival landing fit, content quality/credibility/duplication of hubs, scenarios,
  comparisons, methodology, about/author pages; figure consistency ACROSS surfaces.
- GROWTH-SEO: technical SEO (titles, meta, canonicals, hreflang, JSON-LD, sitemap, robots, OG, internal
  link graph, orphans), SERP/competitor benchmark, freshness calendar, ranked growth backlog.

## Severity / confidence / reach
- S1: wrong or misleading money figure for a plausible user; tool broken; user left on a blank/dead page;
  security or legal exposure.
- S2: likely abandonment or trust damage on a top entry page; growth lever with large upside; serious UX defect.
- S3: noticeable polish/UX issue.  S4: nit.
- Confidence: Verified (you reproduced it) / Likely / Hypothesis. A Hypothesis can never be S1.
- Reach: High (top entry pages or all UK/US users) / Med / Low.

## Finding format (write ALL findings to <your folder>/findings.md)
### <ID>-nn  <short title>
- Severity / Confidence / Reach / Tag(NEW|REGRESSION|NEVER-FIXED)
- Where: URL (preview or live), environment (browser, viewport/device, theme, currency, throttle)
- Repro: numbered steps
- Expected vs actual (for maths: your independent result + source URL + delta)
- Evidence: absolute paths to screenshots/logs, curl lines, file:line
- Fix direction: one or two lines (what, not a full patch)

Also include in findings.md:
- "What works well": at least 3 VERIFIED strengths with evidence (the owner explicitly wants these).
- "Out-of-lane observations": one-liners.
- "Coverage": exactly what you tested and what you did NOT get to (with numbers), so gaps are explicit.

## Journey rubric (for packages that walk user journeys)
Score 0-3 each: Intent match (answered in first viewport?), Time-to-own-number (mobile Slow 4G:
3 = <=20s and <=3 interactions), Trust (region-correct defaults, year/source visible, consistent figures),
Continuity (next step obvious, inputs carry, results shareable), Friction (nothing between user and answer).
"Works well" = one clear answer per page, region-correct defaults, consistent numbers, no dead ends,
thumb-usable at 360px, faster to an answer than calculator.net / thesalarycalculator for the same query.

## Final message to the orchestrator (keep it under ~900 words)
1. Counts by severity. 2. Every S1 and S2 finding: ID + one-line summary + confidence.
3. Top 3 strengths. 4. Coverage gaps. 5. Absolute path of your findings.md.
Do not paste the whole findings file into the final message.
