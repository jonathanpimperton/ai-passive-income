DEVTOOLS final report. I couldn't write findings.md: this environment refuses report .md files from subagents, so the full findings are inline below (part B). Every script, JSON result and screenshot is in the evidence folder:
C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/DEVTOOLS/ (written as DEVTOOLS/ below).

# A. Summary (brief format)

**1. Counts by severity:** S1 = 1, S2 = 10, S3 = 13, S4 = 4. All are NEW (the July review never covered these tools) except DEVTOOLS-19, which is NEVER-FIXED.

**2. S1 and S2 findings**
- **DEVTOOLS-01 (S1, Verified):** the Markdown preview runs attacker script in the www.calcrun.com origin.
  - The sanitiser is hand-rolled. A noscript/xmp mutation-XSS runs as soon as the user clicks Preview.
  - Control-character-obfuscated `javascript:` links, SVG `xlink:href` and SVG `animate` links run on click.
  - Reproduced in Chromium, Firefox and WebKit, with the production CSP and without it, and once on the live site.
  - The CSP doesn't stop it because script-src includes 'unsafe-inline'.
- **DEVTOOLS-02 (S2, Verified):** the same sanitiser lets pasted HTML take over the page. `<base href>` points every site link at an attacker host, `<meta refresh>` redirects the page, and a `style` overlay can cover it with a fake "sign in" link. CSP does not block any of these.
- **DEVTOOLS-03 (S2, Verified):** the password strength meter is too generous and contradicts the page's own table. Eight lowercase letters is rated "Good, reasonable for most accounts"; 64 bits is rated "Strong" where the table says "Moderate".
- **DEVTOOLS-04 (S2, Verified):** the JSON formatter changes numbers without warning and still says "Valid". 64-bit integers lose precision and 1e400 becomes null. Minify then overwrites the user's input with the changed copy.
- **DEVTOOLS-05 (S2, Verified):** XML to JSON rewrites values. Zip 02134 becomes 2134, "+44..." loses the plus, 0x1F becomes 31, 1.10 becomes 1.1, and mixed text is scrambled. Broken XML is accepted and returned as {} with no error.
- **DEVTOOLS-06 (S2, Verified):** JSON to XML outputs invalid XML for ordinary JSON. There is no root element when the object has several keys, and keys like "first name" become invalid tag names, all under an `<?xml?>` header.
- **DEVTOOLS-07 (S2, Verified):** CSV to JSON gives wrong output on the first paste. Quoted newlines become fake rows and semicolon or tab files collapse into one column. The output silently corrects itself after the next keystroke, because the PapaParse library loads late and the result isn't recalculated.
- **DEVTOOLS-08 (S2, Verified):** JSON to CSV silently drops data. Columns come only from the first object, nested values print as "[object Object]" (the FAQ says otherwise), and an array of plain values gives blank lines.
- **DEVTOOLS-09 (S2, Verified):** Base64 decoding corrupts binary data. The download of a PNG comes back as decoded.txt with U+FFFD bytes. URL-safe Base64 and data: URLs are rejected with the raw browser `atob` error.
- **DEVTOOLS-10 (S2, Verified):** the percentage calculator reports "0% no change" for 0 to 50, and "0%" for "5 is what % of 0".
- **DEVTOOLS-11 (S2, Verified payload):** the QR page's Wi-Fi worked example ("SSID:...;Password:...;") encodes plain text, not the `WIFI:T:WPA;S:..;P:..;;` format phones join from. The page also promises Wi-Fi and vCard modes the tool doesn't have.

**3. Top 3 strengths (verified)**
- **No input leaves the browser.** I typed a unique marker into all 11 tools and captured every request, including POST bodies: none contained it, and no request contained the generated password. The JWT decoder made 0 requests after input.
- **Password randomness is sound.** It uses `crypto.getRandomValues` with rejection sampling (no modulo bias) and a secure shuffle. In 200,000 samples run on the repo's own code: 0 wrong lengths, 0 missing character classes, all 88 characters present. Exclude-ambiguous is correct, and the tool works offline after loading.
- **QR output is correct.** Every code decoded with an independent decoder (jsQR) back to the exact input, including Unicode. The PNG and SVG downloads are valid and decode. The YAML and XML parser defaults are also safe: no Norway problem, no external entities, no billion-laughs expansion.

**4. Coverage gaps**
- QR codes were checked with jsQR only, not scanned with a real phone camera.
- XSS was not re-run without CSP in Firefox or WebKit (Chromium was).
- Performance numbers were taken while other reviewers' jobs shared the machine; no throttled mobile runs.
- Copy fallbacks were not exercised, and JSON/YAML/XML/CSV/Markdown downloads were not byte-checked.
- base64decode.org returned 403 and jsoncrack's page was unreadable, so neither was compared.

**5. Findings location:** no findings.md (blocked). Full content is below; evidence is in the DEVTOOLS/ folder above.

# B. Full findings

## S1

### DEVTOOLS-01 Markdown preview runs attacker script in the site origin
- **Rating:** S1 / Verified / Reach Low (the user must paste or drop untrusted Markdown, then click Preview) / NEW.
- **Where:** /tools/file-tools/markdown-html/. Tested in Chromium 141, Firefox and WebKit, with the production CSP and without, plus one confirmation on the live site.
- **Repro:** paste a short Markdown document containing a noscript/xmp mutation payload, then click Preview; it runs without any further click. (The runnable payload and the variant strings were redacted from this public copy on 15 Nov 2026, after the fix went live on 13 Nov 2026. The private corpus is kept outside the repo.)
- **Variants that ran on click:** links with control-character-obfuscated `javascript:` schemes (in raw HTML, inline Markdown links and reference-style links), SVG `xlink:href` links, and SVG `animate` elements that set `href`.
- **Cause:** `sanitizeHtml()` in MarkdownHtmlConverter.tsx:22-32 has two holes.
  - It parses with DOMParser, where `<noscript>` content is treated as markup, then re-inserts the result into the live page, where `<noscript>` is raw text. This is the classic noscript mutation-XSS.
  - It only blocks `href` values that start with "javascript:" after trim and lower-casing, so obfuscated schemes and `xlink:href` get through.
- **Why CSP doesn't help:** the live CSP contains `script-src 'unsafe-inline'`, which allows inline handlers and javascript: URLs.
- **Matrix result:** 32 payloads per engine. 2 of 11 auto-run payloads executed and 8 of 13 click payloads executed. Plain onerror, `<script>`, `<iframe srcdoc>`, plain and mixed-case `javascript:`, `&colon;`, `data:text/html` and `<object>` were all blocked.
- **Impact:** arbitrary JavaScript in the site origin.
  - It can rewrite the page under the CalcRun brand, redirect, and read or change localStorage.
  - It can make same-origin POSTs to /api/*.
  - There are no login sessions, so the damage is bounded, but previewing Markdown you didn't write is the tool's whole purpose.
- **Evidence:**
  - DEVTOOLS-08-md-xss-live-desktop.png (marker banner injected on the live site).
  - md-xss-results-chromium-live.json, md-xss-results-firefox-live.json, md-xss-results-webkit-live.json, md-xss-results-chromium-none.json.
  - Scripts md-xss.mjs and live-xss.mjs.
- **Fix direction:** use DOMPurify (already present in package-lock as a dependency of jspdf) without re-serialising, or render the preview in a sandboxed iframe without allow-scripts. Separately, remove 'unsafe-inline' from script-src by hashing the inline scripts.

## S2

### DEVTOOLS-02 Pasted HTML can hijack the whole page
- **Rating:** S2 / Verified / Reach Low / NEW. Same tool, all 3 engines.
- **What gets through:** type "intro", a blank line, then one of these, and click Preview.
  - `<base href="https://evil.example/">`: `document.baseURI` becomes evil.example and the header nav link "/" now points to https://evil.example/.
  - `<meta http-equiv="refresh" content="1;url=...">`: the page navigates away after 1 second.
  - An `<a>` with `style="position:fixed;inset:0;z-index:max"` and the text "Session expired - sign in again": it covers the full viewport, and the centre point hits the attacker link.
- **Why it matters:** none of these is script, so they survive even a strict CSP. The sanitiser keeps base, meta, link and all style attributes. `<link rel=stylesheet href=data:...>` is blocked only by CSP; without CSP it turned the page red.
- **Evidence:** md-xss-results-*-live.json (entries base-href, meta-refresh, style-overlay).
- **Fix direction:** same as 01, and drop the style attribute.

### DEVTOOLS-03 Password strength meter is too generous and contradicts the page
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Example:** 8 characters, lowercase only, is shown as "Good, 38 bits, reasonable for most accounts", right beside the tool's own "~2.1e+11 possible passwords". That is seconds of offline guessing.
- **Thresholds in code** (PasswordGenerator.tsx:22-36): under 28 bits Weak, under 36 Fair, under 60 Good, under 128 Strong.
  - So 10 characters with all classes (64.6 bits) is "Strong: resistant to brute-force, great for important accounts".
  - The page's own table (password-generator.md lines 67-74) says 40-50 bits is "Weak, crackable with consumer hardware" and 60-70 bits is "Moderate".
  - The default 16 characters (103 bits) shows "Strong" where the table says "Very strong".
- **Evidence:** DEVTOOLS-07-pw-8-lowercase-desktop.png, pct-pw-results.json, pw-dist-output.txt.
- **Fix direction:** one shared threshold table for the meter and the copy, and an estimated crack time.

### DEVTOOLS-04 JSON formatter changes numbers silently; Minify overwrites the input
- **Rating:** S2 / Verified in 3 engines / Reach Med / NEW.
- **Repro:** paste `{"id":12345678901234567890,"id2":9007199254740993,"price":1.10,"big":1e400}`.
- **Result:** "Valid", with output `12345678901234567000`, `9007199254740992`, `1.1` and `null`.
  - Minify replaces the input with these changed values, so the original is gone.
  - Duplicate keys collapse silently.
- **Cause:** a JSON.parse/stringify round trip (JsonFormatter.tsx:25-31, 81-83).
- **Evidence:** json-bigint.mjs, json-results.json, DEVTOOLS-01-json-bigint-desktop.png.
- **Fix direction:** a lossless parser (or the JSON.parse reviver `context.source`), a warning, and minified output in the output pane instead of the input.

### DEVTOOLS-05 XML to JSON coerces and loses data
- **Rating:** S2 / Verified in browser and in Node with the repo's library / Reach Med / NEW.
- **Repro input:**
  ```
  <order id="00123"><zip>02134</zip><phone>+441234567890</phone><ver>1.10</ver><code>0x1F</code><p>Hello <b>world</b> and <i>you</i>!</p></order>
  ```
- **Result:** zip 2134, phone 441234567890, ver 1.1, code 31, `"#text":"Helloand!"` and id 123.
  - "this is not xml at all" returns {} and `<a><b></a>` returns `{"a":{"b":""}}`, both with no error.
  - `&#169;` is left undecoded.
- **Cause:** parseTagValue and parseAttributeValue are true and there is no validator (JsonXmlConverter.tsx:88-95).
- **Evidence:** conv-browser-results.json, xml-yaml-node-output.txt.
- **Fix direction:** keep values as strings by default, plus XMLValidator with line/column errors.

### DEVTOOLS-06 JSON to XML outputs invalid XML
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Repro:** `{"name":"Alice","age":30,"first name":"A","tags":["x","y"]}` gives four sibling root elements and `<first name>`.
  - The browser's own XML parser rejects it: "Extra content at the end of the document".
  - Arrays become `<0>`.
  - The component comment promises a "configurable root element" (JsonXmlConverter.tsx:3) that doesn't exist.
- **Evidence:** conv-browser-results.json.
- **Fix direction:** a root wrapper, escaping of invalid tag names, `<item>` for array members, and validating the output before showing it.

### DEVTOOLS-07 CSV to JSON is wrong on the first paste
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Repro:** pasting `name,note\n"Alice","line1\nline2"\nBob,x` gives 3 rows, including a fake `{"name":"line2"}`.
  - Semicolon and tab files become a single column.
  - Typing one space then silently switches to the correct output.
- **Cause:**
  - PapaParse is only imported on the first input change (CsvJsonConverter.tsx:183).
  - The conversion memo depends only on [input, mode] (lines 99-102), so a paste is parsed by the naive split-on-newline-and-comma fallback (lines 45-53) and never recalculated.
  - File uploads are fine.
- **Evidence:** csv-results.json, csv-tests-output.txt.
- **Fix direction:** load PapaParse on mount, add papaLoaded to the memo dependencies, and remove the fallback.

### DEVTOOLS-08 JSON to CSV drops data
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Examples:**
  - `[{"a":1},{"a":2,"b":3}]` gives `a\n1\n2`; column b is gone.
  - Nested values print as "[object Object]", contradicting the FAQ in csv-json.md line 40.
  - `[1,2,3]` gives blank lines with no error.
- **Evidence:** csv-results.json.
- **Fix direction:** build the header from the keys of all rows, JSON.stringify nested cells, and show an error for non-object rows.

### DEVTOOLS-09 Base64 decoding corrupts binary
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Repro:** decoding `iVBORw0KGgoA//6A` and downloading gives decoded.txt.
  - The file is 20 bytes instead of 12: hex efbfbd504e47...efbfbd, i.e. the PNG bytes replaced by U+FFFD.
  - There's no warning that the data is binary, and file mode only produces text.
  - URL-safe Base64 and `data:` URLs fail with the raw "Failed to execute 'atob' on 'Window'..." message.
- **Evidence:** small-tools-results.json, b64-decoded-download.bin.
- **Fix direction:** decode to bytes, detect binary, offer a binary download or preview, accept the URL-safe alphabet and data: prefixes.

### DEVTOOLS-10 Percentage calculator divide-by-zero
- **Rating:** S2 / Verified / Reach Med / NEW.
- **Result:** going from 0 to 50 shows a big "0%" and "0% no change", while the page's own formula line shows division by |0|. "5 is what % of 0" shows 0%.
- **Cause:** PercentageCalculator.tsx:90 and 100.
- **Evidence:** DEVTOOLS-06-pct-from-zero-desktop.png, pct-pw-results.json.
- **Fix direction:** show "Undefined: original value is 0" plus the absolute change.

### DEVTOOLS-11 QR Wi-Fi example is broken; promised modes are missing
- **Rating:** S2 / Verified payload / Reach Low-Med / NEW.
- **Problem:** the example in qr-code.md lines 39-52, "SSID:ConferenceWiFi;Password:welcome2026;", decodes as plain text. The format phones join from is `WIFI:T:WPA;S:..;P:..;;` (ZXing Barcode-Contents wiki, accessed 9 Nov 2026). The description still claims "their phone automatically connects".
- **Other mismatches:**
  - The vCard example has no VERSION line and uses a literal "\n".
  - Example sizes of 300, 500 and 200 px don't exist; the tool offers 128, 256 and 512.
  - The copy promises Wi-Fi and vCard codes, but the tool is a single text box.
- **Evidence:** qr-results.json (page-wifi-example).
- **Fix direction:** correct the examples, then add Wi-Fi, vCard, email and SMS payload builders.

## S3

- **DEVTOOLS-12 YAML problems** (Verified):
  - Multi-document files (Kubernetes manifests) fail with "expected a single document".
  - Dates turn into ISO timestamps, and .inf/.nan become null.
  - A 272-byte alias bomb blocked the page for 15 seconds and then crashed the tab; conversion runs synchronously on every keystroke.
  - Fix direction: loadAll, a JSON schema option, an expansion cap, and a Web Worker.
  - Evidence: conv-browser-results.json, xml-yaml-node-output.txt.
- **DEVTOOLS-13 Swapping direction loses input** (Verified):
  - On json-xml and json-yaml, the toggle replaces the user's input with sample data. Base64 and URL clear it.
  - XML pasted while in JSON mode shows only a raw JSON error, with no "looks like XML" hint. CSV and Markdown swap correctly.
  - Code: JsonXmlConverter.tsx:135-141, JsonYamlConverter.tsx:121-127.
  - Evidence: conv-browser-results.json, misc-results.json.
- **DEVTOOLS-14 Large inputs freeze the page** (Verified; times inflated by shared CPU):
  - JSON: 1.15 MB took 2.9 s plus 1.1 s per keystroke; 5.9 MB took 16 s plus 5.9 s per keystroke; 61 MB gave no output after 180 s.
  - XML: 3.4 MB took 20.6 s plus 2.9 s per keystroke, yet the FAQ says "10MB typically convert instantly".
  - The JSON tool parses the input 3 times per keystroke with no debounce or worker.
  - Valid JSON nested 5,000 deep is reported as Invalid ("Maximum call stack size exceeded").
  - Evidence: json-perf-output.txt.
- **DEVTOOLS-15 JWT decoder implies validity it doesn't check** (Verified):
  - A token whose nbf is in the future shows a green "Valid, expires in 59 days".
  - alg:none gets no warning, and RS256 tokens are said to need "the secret key" (it's the public key).
  - A millisecond exp shows "18 Jul 58827, Valid".
  - A "Bearer " prefix produces a raw atob error, and a JWE only says "got 5 parts".
  - Evidence: small-tools-results.json, DEVTOOLS-03 and DEVTOOLS-04 screenshots.
- **DEVTOOLS-16 Password length box** (Verified):
  - It clamps on every keystroke: typing "20" gives 80, "12" gives 82, and the box can't be cleared.
  - Code: PasswordGenerator.tsx:283-287. It's the same bug class Sprint 15B fixed in SliderInput.
- **DEVTOOLS-17 Markdown fidelity** (Verified):
  - There is no `.prose h1` style, so "# Title" previews as body text.
  - The production CSP img-src blocks every external image, so README badges show as broken.
  - The sanitiser also strips the HTML output users copy or download (iframes, forms, inputs, style) with no notice.
- **DEVTOOLS-18 Raw engine error messages** (Verified):
  - On Safari/WebKit, JSON errors carry no line or column at all. Chromium gives no position for NaN.
  - There is no line highlighting or repair hint; jsonformatter.org has both.
- **DEVTOOLS-19 Mobile editors** (Verified, NEVER-FIXED versus the CLAUDE.md "16px inputs" claim):
  - Every editor input in all 11 tools computes to 14px, so iOS zooms on focus.
  - Tap targets are tiny: Copy 48x16, Reset 47-50x16, Minify 40x20, the sort checkbox 12x12.
  - On iPhone 13 the generated password sits below the fold.
  - There is no horizontal overflow on any tool.
  - Evidence: mobile-output.txt, DEVTOOLS-10..31 screenshots.
- **DEVTOOLS-20 Silent failures** (Verified for the first two; read in code for the rest):
  - Base64 decode-from-file of an invalid file shows nothing.
  - FileDropZone ignores over-limit files with no message (a 51 MB file on Base64 does nothing).
  - If the Markdown, XML or YAML library fails to load, the tool shows "Loading..." forever.
  - If PapaParse fails to load, CSV silently falls back to the broken parser.
  - Evidence: misc-results.json.
- **DEVTOOLS-21 CSV formula injection** (Verified): JSON to CSV writes `=HYPERLINK(...)`, `+`, `-` and `@` cells verbatim.
- **DEVTOOLS-22 QR capacity UX** (Verified; scannability Likely):
  - The counter is fixed at "/ 2,953" while the real limit is 2,331 bytes at the default level M and 1,273 at H.
  - It counts characters, not bytes.
  - Over-limit input gets the raw "too big" error.
  - "Small 128" can produce a 724 px file still named 128x128.
  - Dense codes come out at 1.0-1.9 px per module, and jsQR failed on several.
  - Evidence: qr-results.json, qr-density-output.txt.
- **DEVTOOLS-23 Percentage formatting** (Verified):
  - 0.001% of 1 shows "0.00", and 7% of 100 shows "7.00" while 15% of 200 shows "30".
  - 2 to 3 shows "+50%" with no percentage-point note; the term never appears on the page.
  - 150% of 200 shows "Remaining -50%".
- **DEVTOOLS-24 CSV options** (Verified):
  - Ragged rows abort the whole conversion with "(row 0)", a 0-based index.
  - A header-only file gives [] silently.
  - There are no delimiter, header or skip options; convertcsv.com has all of them.

## S4

- **DEVTOOLS-25:** with Sort keys on, a `__proto__` key disappears (JsonFormatter.tsx:248-259). A CSV `__proto__` column is also dropped.
- **DEVTOOLS-26:** the password generator and JWT decoder load the googletagmanager script, and the live site also loads Cloudflare's challenge script, in the same origin as the secrets. No leak was observed.
- **DEVTOOLS-27:** content errors.
  - The password page's crack times don't agree (8 characters "8 hours", 12 characters "3,000 years").
  - The YAML table says "yes = boolean", which is YAML 1.1 behaviour; this tool uses YAML 1.2.
  - The Base64 page calls TextEncoder part of the "Web Crypto API".
- **DEVTOOLS-28:** the URL decoder has no "+ as space" option and shows a raw "URI malformed" with no position.

## What works well (verified)
1. **Privacy.** In the marker sweep across all 11 tools, 0 requests contained input or the generated password (privacy-sweep-results.json).
2. **Password randomness.** Rejection sampling and a secure shuffle; 200k-sample results are given in part A.
3. **QR output.** Every code decodes with jsQR, Unicode round-trips, error-correction levels change the version, and the SVG is valid.
4. **Parser defaults.**
   - YAML 1.2 avoids the Norway problem, and JSON to YAML quotes ambiguous strings, so round trips are identical.
   - External XML entities are refused and billion-laughs entities aren't expanded.
   - HTML to Markdown is inert: no script runs and no images are fetched.
5. **One raw-HTML sink.** MarkdownHtmlConverter is the only component using dangerouslySetInnerHTML.
6. **Unicode.** Correct in Base64 text, JWT and URL encoding; Base64 file encoding is byte-identical to Node's.
7. **No horizontal overflow** at 360 px or on iPhone 13.

## Competitor snapshot (accessed 9 Nov 2026)
- **jsonformatter.org:** tree view, line highlighting, upload/download, Load URL, repair.
- **jwt.io:** signature verification with a secret.
- **convertcsv.com:** delimiter auto-detect, header and skip options, nested output.
- **Bitwarden:** passphrase mode, 5-128 length, crack-time estimate.
- **qr-code-generator.com:** typed payloads (vCard, WiFi, SMS, email), but the free tier is JPG only. CalcRun's free PNG and SVG is an advantage.

## Out-of-lane (one line each)
- The cookie banner is `role="alert"`.
- Each tool page prefetches about 33 other pages.
- The live site loads Cloudflare's challenge-platform JS and POSTs to /cdn-cgi/challenge-platform.
- /tools/* sends both XFO SAMEORIGIN and frame-ancestors *.
- The JWT amber badge contrast is about 3:1.
- The password panel is aria-live, so screen readers read out each password.
- The shared harness's liveHeaders route handler throws uncaught on a route.fetch ECONNRESET; I guarded it in my own lib.mjs.

## Coverage
- Markdown XSS: 32 payloads in each of 4 configurations (128 runs), plus 1 live confirmation and the HTML to Markdown direction.
- JSON: 14 cases in each of 3 engines, plus 1, 6 and 61 MB inputs and depth tests.
- XML: 24 library-level cases plus 7 browser checks. YAML: 16 plus 5.
- CSV: 11 cases on the paste path and 11 typed, 1 upload, 7 JSON to CSV.
- JWT: 14 cases. Base64: 9. URL: 7.
- Password: 200k samples plus the UI checks.
- QR: 15 decodes, a 48-cell density matrix, and PNG/SVG downloads.
- Percentage: 16 input pairs.
- Mobile: 11 tools on 2 devices. Dark mode: 6 tools.
- Privacy: request sweep on all 11 tools.
- Gaps are listed in part A.