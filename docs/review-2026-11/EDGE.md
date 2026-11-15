EDGE review (live-only behaviour + worker.ts security), 9 Nov 2026. Probes ran from Cloudflare's LHR (London) edge.

**findings.md was not written.** The agent harness refuses report .md files from subagents. The full findings are in the appendix below, in the brief's format, ready to paste into C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/EDGE/findings.md. All evidence files do exist in that folder:
- curl-log.txt (every curl command and its headers)
- redirects-log.tsv
- dns.log
- hstspreload-status.json, hstspreload-preloadable.json
- embed-results.json
- parity/*.diff
- bodies/*
- embedtest/*.mjs
- screenshots EDGE-01 to EDGE-09 (*.png)

## 1. Counts
S1: 0 | S2: 5 | S3: 6 | S4: 8, plus one addendum that only adds evidence to items you already logged.

## 2. S1/S2 findings
- **EDGE-01 (S2, Likely):** /api/subscribe has no bot gate.
  - No Turnstile, and the honeypot is trivially skipped.
  - It accepts cross-origin text/plain POSTs with no preflight; a POST from Origin: https://evil.example was processed (400 "Invalid JSON", curl-log [218]).
  - The live rate limit allows about 4-5 POSTs per 10 s per IP, then blocks for 10 s (429 Retry-After:10, [222]-[227]). The code comment claims 5 per minute.
  - So anyone can list-bomb arbitrary third-party addresses, including through visitors' browsers on any hostile page, which bypasses the per-IP limit.
- **EDGE-02 (S2, Likely):** /api/email-results works as a branded phishing/spam relay.
  - Attacker-written text (40 fields x 200 chars; URLs, bidi and zero-width characters allowed; a 28px "highlight" box) goes from hello@calcrun.com, DKIM-aligned, to any recipient.
  - My live payload ("Verify at https://evil.example", sent from an evil Origin) passed every server check. The only thing that stopped it was the missing Turnstile token (403, [230]).
  - `subscribe:true` also enrols the victim address in MailerLite.
- **EDGE-03 (S2, Verified mechanism / reach is a Hypothesis):** when localStorage throws, calculators vanish entirely.
  - This happens when a user blocks site data, and in storage-blocked iframes.
  - The island hydrates and is then emptied (55,621 to 0 characters). Seen on the live embed and on 4/4 local tools.
  - Root cause: unguarded storage calls in currency.ts:23/28, ScrollEmailBar.tsx:30-83 and the theme script at BaseLayout.astro:57.
- **EDGE-04 (S2, Verified):** inside an embed, clicking any link outside /tools/ turns the widget into a blank error box. This includes the FTC "Full disclosure" link, breadcrumb "Home" and "How we calculate". The destinations send frame-ancestors 'none' (EDGE-08 screenshot, console "Refused to frame").
- **EDGE-05 (S2, Verified):** the embed is the whole tool page minus header and footer.
  - Pages are 6,405-12,710 px tall inside the fixed 700 px snippet, so there is double scrolling.
  - At 360 px the visible 700 px shows zero inputs and no result.
  - The mobile result bar overlaps the H1, and the cookie banner covers the bottom 61-79 px.
  - The "Powered by" credit sits 2,469-4,311 px down.
  - Affiliate blocks and the email form render inside the embed.
  - gtag loads in the third-party iframe with analytics consent defaulting to granted.
  - The embed follows the visitor's OS dark mode, not the host page.

## 3. Top strengths
1. The redirect map is exact. All 69 trailing-slash sources give a single-hop 301 to the precise destination. All 14 destinations return 200, and all 52 #anchor ids exist on the live pages.
2. Headers and caching are correct.
   - One enforced CSP per response class; the `!` detach syntax works.
   - A live tool page, including Turnstile, raised zero CSP violations.
   - Caching tiers are right: immutable hashed assets and fonts, 1-day OG images, 304s on assets with ETags.
   - Brotli on, HTTP/2 negotiated, HTTP/3 and ECH advertised.
3. The API fails closed and leaks nothing.
   - All three secrets are evidently set, inferred from which error each probe reached.
   - The 20 KB cap holds even for chunked bodies.
   - Error bodies are generic, and the email template escapes everything.
   - Production matches HEAD: the live site is not stale.

## 4. Coverage gaps
- **Done:** 234 logged curl requests to calcrun.com, at about 1 per second.
  - Redirects: 138 probes plus 10 destination fetches.
  - API: 18 probes, only ever invalid or RFC-invalid addresses.
  - 9 live harness page loads with GA blocked.
  - 17 DNS-over-HTTPS queries and the hstspreload.org API.
  - Static read of all of worker.ts.
- **Not done:**
  - GA CSP behaviour (GA is blocked by design).
  - The Turnstile success path (headless Chromium gets error 600010).
  - Any real send or subscribe, and a fake-token probe (not on the allowed list).
  - The workers.dev host (I don't know the account subdomain).
  - WebKit and Firefox embed tests.
  - Real browsers with third-party cookies blocked (I simulated storage failure instead).
  - TLS grading, IPv6, other Cloudflare edge locations.
  - Anything that only shows in your dashboards.

## 5. findings.md path
Not created, because the harness blocks it. Intended path: C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/EDGE/findings.md

---------------------------------------------------------------
# APPENDIX: full findings

### EDGE-01  /api/subscribe has no bot gate: anyone (or any third-party web page) can list-bomb arbitrary addresses
- Severity S2 / Confidence Likely (live-verified up to parsing; the rest from code) / Reach High / NEVER-FIXED
- Where: live /api/subscribe; worker.ts:409-482; EmailCapture.tsx:36, ScrollEmailBar.tsx:62
- Repro:
  1. `curl -X POST https://www.calcrun.com/api/subscribe -H 'Origin: https://evil.example' -H 'Content-Type: text/plain' --data-binary '{bad json'` returns 400 `{"error":"Invalid JSON"}` ([218]). The request was processed, so a browser on any site can send it with `fetch(...,{mode:'no-cors'})` and no preflight.
  2. Code: the only checks are the size cap, JSON parsing, a regex and the honeypot. There is no Turnstile, no Origin check, no Content-Type check and no per-address throttle.
  3. Five POSTs in about 8 s: the 5th returns 429 `error code: 1015`, Retry-After 10 ([222]). The block also covered /api/email-results ([225],[226]) and lifted after 10 s ([227]).
- Expected vs actual:
  - worker.ts:11-17 says the limit is 5 per minute. The real limit is about 4-5 per 10 s per IP, i.e. about 25-30 per minute.
  - At that rate the MailerLite free cap (500 subscribers) fills from one IP in under 20 minutes. A hostile page using its visitors' browsers bypasses the per-IP limit entirely.
  - The result is third-party addresses added without consent, followed by spam complaints and a likely MailerLite account suspension.
- Fix: require a Turnstile token on /api/subscribe; enforce Origin == https://www.calcrun.com and Content-Type application/json; turn on MailerLite double opt-in for API sign-ups.

### EDGE-02  /api/email-results relays attacker text from hello@calcrun.com to any inbox
- Severity S2 / Confidence Likely / Reach High / NEW
- Where: worker.ts:239-318, 213-221, 493-703, 769-792, 831-838
- Repro: I POSTed from an evil Origin with:
  - an RFC-invalid address `probe@<invalid>.<invalid>`;
  - slug compound-interest;
  - inputs `[{"label":"Visit","value":"https://evil.example/login"}]`;
  - results `[{"label":"Account notice","value":"Verify at https://evil.example","highlight":true}]`;
  - no token.
  The response was 403 "Verification required" ([230]). Every content check passed.
- Why it matters:
  - sanitizeText escapes HTML, so markup injection is not possible. But URLs, bidi overrides and zero-width characters pass, and mail clients auto-link plain-text URLs.
  - The caller chooses any recipient. The mail goes from CalcRun <hello@calcrun.com> with a calcrun.com DKIM signature.
  - Turnstile tokens are cheap to obtain, so the real gate is only the per-IP rate limit.
  - Siteverify is called without remoteip and the returned hostname is never checked.
- Fix:
  - Keep a per-tool label allowlist on the server.
  - Accept only numeric, currency or percent values; reject http, www., @, and bidi/zero-width characters.
  - Throttle per recipient (KV).
  - Check the siteverify hostname.

### EDGE-03  Calculators disappear when localStorage throws
- Severity S2 / Confidence Verified (simulated SecurityError) / Reach Low first-party, Medium in embeds (Hypothesis) / NEW
- Repro: embedtest/storage-blocked.mjs (live embed) and storage-blocked-local2.mjs (local preview).
  - With storage throwing, the island hydrates and is then emptied (innerHTML 55,621 to 0). Sliders and results are gone, and the affiliate block moves up into the gap (EDGE-07 screenshot). There are 1-3 uncaught SecurityErrors per page.
  - Control run with working storage: the slider moves the result from $144,573 to $164,766.
- Root cause:
  - currency.ts:23 and :28, reached from CurrencySelector.tsx:42, NetWorthCalc.tsx:114 and ResultAffiliate.
  - ScrollEmailBar.tsx:30/37/51/83.
  - BaseLayout.astro:57.
  - CookieBanner already uses try/catch, so the right pattern exists in the codebase.
- Fix: one safeStorage helper with an in-memory fallback, plus a regression test that runs a tool with throwing storage. CALC-UX-B owns persistence; I'm filing it because it bites hardest in embeds.

### EDGE-04  Clicking a non-/tools/ link inside an embed blanks the widget
- Severity S2 / Confidence Verified / Reach Low / NEW
- Repro: embed compound-interest, click "Full disclosure". The iframe becomes chrome-error://, and the console shows "Refused to frame 'https://www.calcrun.com/' because an ancestor violates ... frame-ancestors 'none'" (EDGE-08 screenshot, embed-click.mjs).
  - 15-21 internal links per embed have no target, so they navigate the iframe itself.
  - Links that stay under /tools/ do load, but as the full site with header, because ?embed is not carried over.
- Fix: `<base target="_blank">` in embed mode, or a dedicated embed template.

### EDGE-05  The embed is the whole page: on a phone the 700 px snippet shows no calculator, and GA plus a cookie banner run inside host sites
- Severity S2 / Confidence Verified / Reach Low / NEVER-FIXED
- Measured (embed-results.json):

| Embed | Content height inside 700 px iframe |
|---|---|
| salary-uk at 360 px | 9,743 px |
| salary-uk at 760 px | 6,405 px |
| compound-interest at 360 px | 11,579 px |
| compound-interest at 760 px | 7,762 px |
| mortgage-payment (dark) | 6,670 px |

  - The host page and the iframe both scroll. There is no auto-resize.
  - At 360 px the visible window holds only breadcrumbs, H1, the tax-year badge, the affiliate disclosure and the cookie banner (EDGE-01 screenshot).
  - #mobile-result-bar is positioned `fixed top-16`, which assumes the site header is present, so it overlaps the H1.
  - The cookie banner covers the bottom 61-79 px.
  - The "Powered by" credit sits at 2,469-4,311 px.
  - 2-4 affiliate links, 1 email form, tabs, FAQ and related tools all render inside.
  - gtag.js is requested on every embed load, with analytics_storage defaulting to granted.
  - The embed follows the visitor's OS dark mode, not the host (EDGE-05 screenshot).
  - embed-mode CSS (global.css:672-707) hides only header, footer and decoration.
- Fix:
  - A minimal embed route containing the calculator, the result and one attribution line.
  - In embed mode, no GA, no cookie banner, no email capture and no affiliate blocks.
  - A postMessage auto-height script and an optional ?theme parameter.

### EDGE-06  The embed snippet produces no backlink (S3, Likely, Reach Medium, NEVER-FIXED)
- /embed/ offers 23 calculators. The snippet is just the iframe, with title and loading=lazy set.
- The only attribution link is inside the iframe, so it does not count as a backlink for calcrun.com. The page says "Attribution required", but the snippet gives the host nothing to keep.
- Fix: append a branded `<p>Calculator by <a href="https://www.calcrun.com/tools/...">CalcRun</a></p>` after the iframe (embed.astro:66-67).

### EDGE-07  Sandboxed embeds are dead (S3, Verified, Reach Low, NEW)
- With sandbox="allow-scripts" the frame has a "null" origin, and fonts plus every module script are blocked by CORS. /_astro/* and /fonts/* send no Access-Control-Allow-Origin.
- Console shows "Failed to fetch dynamically imported module ...MortgagePaymentCalc". Both islands stay unhydrated, and the theme script throws (EDGE-06 screenshot).
- Fix: add `Access-Control-Allow-Origin: *` to /_astro/* and /fonts/* in _headers, plus the EDGE-03 storage guard.

### EDGE-08  HSTS doesn't cover the apex and the domain isn't preloaded (S3, Verified, Reach Medium, NEVER-FIXED)
- https://calcrun.com/ returns a 301 with no HSTS header ([30],[64]).
- hstspreload.org reports status "unknown" and preloadable error response.no_header.
- includeSubDomains on www covers only *.www.calcrun.com.
- Redirect chain: http://calcrun.com, then https://calcrun.com, then www.
- Fix: enable zone-level HSTS, then submit to the preload list.

### EDGE-09  No DMARC record (S3, Verified, Reach Medium, NEW)
- _dmarc.calcrun.com returns NXDOMAIN.
- SPF is fine (5 DNS lookups, ~all). DKIM exists for mlsend2 (MailerSend) and litesrv (MailerLite), both 1024-bit. MX points to Cloudflare Email Routing. There is no CAA record.
- Google requires DMARC only for senders of 5,000+ messages a day (support.google.com/a/answer/81126, accessed 9 Nov 2026), but without it the domain is easy to spoof and you get no reports.
- Fix: publish `p=none` with rua reporting, move to quarantine later, and drop `a mx` from SPF.

### EDGE-10  MailerLite 422 counted as success (S3, Verified, Reach High, NEW)
- worker.ts:368-374 treats 422 as "already subscribed". MailerLite's docs say an existing subscriber gets 200, a new one 201, and 422 means invalid data (developers.mailerlite.com/docs/subscribers.html, accessed 9 Nov 2026).
- Rejected addresses therefore show success. If the group ID or a field ever becomes invalid, every signup silently "succeeds" while nothing is stored.
- Fix: accept only 200/201, and log 422s.

### EDGE-11  Misleading errors when rate-limited; bare API responses (S4, Verified)
- The 429 body is plain text (`error code: 1015`). The clients' `.json()` call fails, so users see "Network error" or "Something went wrong. Please try again."
- Worker responses (the 405 and all API JSON) carry no HSTS, nosniff or CSP.

### EDGE-12  CORS gaps (S4, Verified)
- Production reflects any http://localhost origin ([215]).
- OPTIONS on a nonexistent /api/ path returns 204 with CORS headers ([216]).
- Evil origins correctly get no Access-Control-Allow-Origin header ([213]).

### EDGE-13  CSP hygiene (S4, Verified)
- 'unsafe-inline' in script-src; it also allows inline event handlers.
- fonts.googleapis.com and fonts.gstatic.com are allowed, but no built page references them (dist grep).
- No base-uri, form-action, object-src 'none', upgrade-insecure-requests or COOP.
- gtag.js references stats.g.doubleclick.net and www.google.com/ccm, which the CSP doesn't allow. This only matters if Google Signals gets turned on (Hypothesis).
- frame-ancestors * applies to every /tools/* page, not just ?embed.
- Estimated grade: about A by securityheaders.com criteria, about B+ by Mozilla Observatory-style scoring.

### EDGE-14  HTML never returns 304; missing hashed assets 404 with "immutable" (S4)
- HTML is `max-age=0, must-revalidate` with no ETag or Last-Modified, so revalidation is always a full 200 (22 KB br, 177 KB raw for the homepage, [233]).
- Likely cause: Cloudflare's injected bot-detection script modifies the HTML and strips the ETag (Hypothesis).
- A missing /_astro file returns 404 with `max-age=31536000, immutable` ([19]).
- Other assets behave correctly (304s on ETag'd files, br, h2/h3).

### EDGE-15  Live is not stale; local-vs-live differences come from the Windows build (S4, Verified)
- 8 of 10 pages are identical after normalising CRLF line endings, Cloudflare's injected script and island uids.
- Bundle hash differences come only from `\r` in className template literals (CRLF checkout on Windows).
- Real differences: the "related comparisons" set on pension-vs-isa-uk and the scenario link order. Both depend on `getCollection()` order, which differs by OS.
- robots.txt is identical apart from line endings; the sitemap is byte-identical.
- Fix: `.gitattributes` with `eol=lf`, and sort collections explicitly.

### EDGE-16  calcrun.pages.dev is NXDOMAIN (S4, Verified)
- The docs say it redirects to www. The Pages project appears deleted, so the name may be claimable by anyone.
- No public links to it were found.

### EDGE-17  Cloudflare edge injections (S4, Verified)
- Bot "JS detections" adds an inline script plus 3 requests to every page view.
- Page Shield's Report-Only CSP (`connect-src 'none'`) appears on a sample of responses, so every fetch on those page views sends a report.
- These stop a move to hash-based CSP and strip HTML ETags. They are not mentioned in the privacy policy (HOME-CHROME owns that text).

### EDGE-18  security.txt expires 2027-03-10 (S4)
- Add it to the freshness calendar; an expired file is invalid under RFC 9116.

### EDGE-19  X-Frame-Options SAMEORIGIN alongside frame-ancestors * on /tools/* (S4)
- Embedding works only because modern browsers ignore XFO when frame-ancestors is present. The pair contradicts itself.
- Fix: drop XFO there and add a comment.

### Evidence addendum for already-logged items
**Blank 404.** The custom page already exists and is served at /404 with 200 and noindex ([63]); /404.html redirects there with a 307. So the fix is one line: `not_found_handling="404-page"`.

URL shapes verified to hit the blank 404:
- Retired scenarios without a trailing slash: 68 of 68.
- Uppercase variants: /About/ and /TOOLS/INCOME-AND-PLANNING/SALARY-UK/.
- Parent paths: /tools/debt-and-loans/, /how-we-calculate/, /labs/.
- Wrong category: /tools/utility/salary-uk/. Git history shows no tool ever changed category, so there are no legacy URLs of this kind.
- Junk and common probes: /about/%20, /favicon.ico, /sitemap.xml, /api/unknown.

**Slash-less 307s.** These also apply to /index.html, /about/index.html, /about.html, //tools/, double slashes mid-path, and %2D/%2F-encoded paths. All normalise correctly, but with temporary 307s. /labs/story goes 307, then 301, then /.

### What works well (verified)
1. The redirect map: 69/69 one-hop 301s, 14/14 destinations return 200, 52/52 anchors exist.
2. Headers and caching:
   - one enforced CSP per response class;
   - nosniff, Referrer-Policy and Permissions-Policy on all assets;
   - correct cache tiers and 304s;
   - br, h2, h3;
   - _headers and _redirects are not publicly served;
   - .mjs and the manifest have correct MIME types.
3. The API fails closed, all secrets are set, size caps hold, errors are generic and the rate limit is live.
4. Production equals source.
5. Embeds work cross-origin in Chromium, with keyboard focus entering the iframe and a visible 3 px focus ring.
6. SPF, DKIM, MX and security.txt are in place.

### Owner must check (dashboard-only)
- **WAF rate-limit rule:** actual expression and threshold (observed about 4-5 per 10 s, shared across both endpoints).
- **MailerLite:**
  - double opt-in for API sign-ups;
  - subscriber growth versus signups, and any junk addresses;
  - group 180838346043426395 still valid;
  - drip automation status.
- **MailerSend:** quota and usage, complaint rate, and the activity log for odd recipients or odd result text.
- **Turnstile:** hostname allowlist and error rates.
- **Email Routing:** a rule for hello@ exists with a verified destination.
- **workers.dev:** whether it is enabled (wrangler.toml has no `workers_dev=false`).
- **calcrun.pages.dev:** consider re-claiming the name.
- **Zone settings:** zone-level HSTS, Bot Fight Mode / JS detections and Page Shield — are they intentional?
- **Workers observability/logs:** not enabled in wrangler.toml.
- **GA4:** whether Google Signals is on, and how much ?embed traffic exists.

### Out-of-lane observations (one line each)
- In dark mode, #mobile-result-bar (ToolPageLayout.astro:139) has light grey text on a light grey background and is unreadable (CALC-UX-B / A11Y).
- Turnstile throws an uncaught error (600010) because there's no error-callback; the user waits 5 s and then sees "Verification required" (CALC-UX-B).
- "Related comparisons" are just the first 5 in collection order: the UK pension page shows US comparisons (CONTENT / GROWTH-SEO).
- The /embed/ copy says "Free Widget Code" / "free, forever" (CONTENT).
- The embed page emits a script after `</html>` (HOME-CHROME).
- With no worker-src, any blob: worker is blocked by the production CSP (FILES).
- 'unsafe-inline' makes any HTML-preview tool a self-XSS sink (DEVTOOLS).
- There is no /how-we-calculate/ index page (GROWTH-SEO).

### Request count and safety
- 234 curl requests to calcrun.com, all logged.
- 9 live browser loads through the harness, with GA blocked and /api mocked.
- No syntactically valid email address was ever sent, and no forms were submitted against live.
- The local test server on port 4500 has been stopped.