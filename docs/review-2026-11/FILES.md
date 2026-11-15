FILES reviewer report. I couldn't create findings.md: the subagent tool policy blocks report files ("Subagents should return findings as text"), and I didn't work around it. The full findings file is below, ready to save as `.../review/FILES/findings.md`. The summary in your requested format comes first.

All paths below are relative to this folder: C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/FILES — scripts are `*.mjs` / `*.py` at its top level, raw JSON and logs are in `out/`, screenshots in `shots/`, fixtures in `fixtures/`. The preview server was up throughout. I used 6 live page loads; GA was blocked and no files went anywhere.

## SUMMARY (brief format)
**1. Counts:** S1 2 · S2 9 · S3 10 · S4 1 (bundle of nits) = 22 findings.

**2. S1 / S2**
- **FILES-01 (S1, Verified LIVE in all 3 engines):** HEIC→JPG is broken on production for every browser without native HEIC support, so Chrome, Edge, Firefox and Android all fail. The `/tools/*` CSP blocks heic-to's blob: Worker, and that worker also needs eval. The user sees a misleading "Try Safari or Chrome 128+" error. It has probably been broken since the CSP was tightened on 10 Mar 2026 (commit e4d4cef). No test converts a HEIC file, and no test applies `_headers`.
- **FILES-02 (S1, Verified):** Encrypted PDFs silently produce broken output, including owner-password-only files that open without a password (typical of bank statements). Compress shows a success message and emits a file that cannot be opened (pdf.js: "No password given"; pypdf: no Root). Merge and Split emit blank pages. The FAQ promises an error message instead.
- **FILES-03 (S2, Verified):** The image compressor makes PNG/WebP/already-compressed files *larger* and still labels them "compressed". It silently turns PNGs into lossy JPGs and destroys WebP transparency. Its JPEGs are 18–37% bigger than MozJPEG's.
- **FILES-04 (S2, Verified):** Images→PDF renders transparent PNGs on a black background.
- **FILES-05 (S2, Verified):** Excel→PDF prints dates as serial numbers, drops currency and percent formatting, and truncates numbers ("10123…") on wide sheets.
- **FILES-06 (S2, Verified):** Excel→PDF garbles non-Latin text (Łódź→"Aódz", 東京→"gqN¬"). CSVs without a BOM turn £ into "Â£".
- **FILES-07 (S2, Verified ×3 engines):** SVG→PNG strips `<style>`, so CSS-styled SVGs (Illustrator's default export) come out solid black. Sizes given in % or cm produce wrong dimensions or distortion.
- **FILES-08 (S2, Verified):** PDF Compress only recompresses DCT JPEGs, so PDFs with Flate/PNG images get 0% and an "already well-optimized" message. It reports "N images recompressed" when none were. Its FAQ describes a different algorithm.
- **FILES-09 (S2, Verified in Chromium):** Split "Every page" and PDF→Image "Download all" fire N separate downloads with no ZIP. Only 20 of 500 and 10 of 500 files arrived.
- **FILES-10 (S2, Verified):** Changing settings after upload does nothing, and re-picking the same file fires no change event. This is a dead end in all 12 tools that use FileDropZone.
- **FILES-11 (S2, Verified):** The Image Resizer always outputs PNG. Shrinking a 6 MB JPEG to 2000 px gives a 6.7–7.7 MB file, and its worked example promises a "batch" feature the tool doesn't have.

**3. Top strengths**
- **Privacy claim holds on live.** After uploading and compressing a 6 MB photo there were 30 requests, all GETs with 0-byte bodies. Across 72 preview runs there were no third-party requests except GA.
- **PDF compressor in-place replacement claim verified.** JPEG-heavy PDFs shrank 22.07→1.82 MB (−92%) and 45.3→1.40 MB (−97%) in 2–3.5 s, text intact, no duplicate image objects.
- **Merge, split and EXIF handling are solid.** A 510-page merge took 0.5 s and broken inputs get per-file named errors. EXIF orientation is correct and GPS metadata is stripped. 11 of 12 tools work under the production CSP in all 3 engines.

**4. Coverage gaps:** No real iOS or Android devices (emulation only). The Safari native-HEIC path is untestable here because Playwright WebKit on Windows can't decode HEIC. No low-memory crash testing and no network throttling. The PDF and Excel deep-dive ran on Chromium only. Bookmarks, CJK PDFs and screen-reader output were not tested.

**5. findings.md:** Not written (blocked). Content follows.

---
# FILES findings (save as …/review/FILES/findings.md)

**Scope**
- Date: 9 Nov 2026. Preview: 127.0.0.1:4399.
- "CSP-emulated" means the harness option `liveHeaders:true`, which applies the production `/tools/*` CSP to the preview.
- Fixtures were generated with PIL, pypdf (for encryption), pdf-lib, sharp and SheetJS.
- Real HEIC samples: `dl-heic/example.heic` (libheif, 1280×854) and `dl-heic/image1.heic` (3992×2992).

### FILES-01  HEIC→JPG broken on production for all non-Safari browsers
- S1 / Verified (live, 3 engines) / Reach High for this tool / NEW (undetected ~8 months)
- **Where:** https://www.calcrun.com/tools/file-tools/heic-to-jpg/ — Chromium 141, Firefox 142, WebKit, desktop.
- **Repro:** Open the page. Choose `example.heic`.
- **Expected:** a JPG.
- **Actual:** "HEIC conversion not supported in this browser. Try Safari or Chrome 128+." Console: `Refused to create a worker from 'blob:https://www.calcrun.com/…' because it violates … script-src` (no worker-src).
  - Without CSP the same build converts fine: 12 MP in 11.7 s; a 2-file batch in 16.4 s.
  - Adding only `worker-src 'self' blob:` still fails, because the worker hits an eval block in Firefox.
  - It works only when `worker-src blob:` and `'unsafe-eval'` are both added (`heic_fixprobe.mjs`).
- **Root cause:** `HeicToJpgConverter.tsx` imports the default `heic-to` build, whose worker source contains `new Function`. `public/_headers` has had a restrictive `script-src` since e4d4cef (10 Mar 2026).
- **Tests can't catch it:** the `tests/file-converters.spec.ts` HEIC test only checks the page loads. The suite runs on the dev server, which ignores `_headers`.
- **Wrong browser claims:**
  - The error text tells Chrome 141 users to use "Chrome 128+".
  - `heic-to-jpg.md` lines 60–73 claim Chrome 128+ has native HEIC. False: Chrome has no native HEIC (https://www.testmuai.com/learning-hub/heif-browser-support/, accessed 9 Nov 2026).
- **Evidence:**
  - Live screenshots: `shots/FILES-01-live-chromium-heic-to-jpg-desktop.png`, `FILES-02-…firefox…`, `FILES-03-…webkit…`
  - `out/live-confirm.json`
  - `out/csp-matrix-*.json` (CSP fail in 3 engines, no-CSP pass in 3 engines)
- **Fix:**
  - Switch to `import { heicTo } from 'heic-to/csp'` and add `worker-src 'self' blob:` to the heic-to-jpg CSP.
  - Add a converter E2E test that applies `_headers`, as the harness does.
  - Correct the error text and the content.

### FILES-02  Encrypted PDFs: corrupt or blank output, no warning (compress / merge / split)
- S1 / Verified / Reach Med / NEW
- **Where:** pdf-compress, pdf-merge and pdf-split on preview with CSP emulated, Chromium.
- **Repro:** Upload `fixtures/enc-owner-only-aes128.pdf`. This file opens without a password and only restricts editing, the common bank-statement pattern. Then run Compress, Merge with `text-3p.pdf`, or Split "1-2".
- **Compress:**
  - The UI shows "20% smaller … Download".
  - The output `enc-owner-only-aes128_compressed.pdf` cannot be opened: pdf.js throws `PasswordException: No password given`; pypdf says "Cannot find Root object".
  - The 22 MB `enc-owner-only-photos.pdf` gives an unopenable file while the UI says "10 images recompressed".
- **Merge:** pages 4–6 of `merged.pdf` are blank (no text, no shapes).
- **Split:** the output has 2 blank pages.
- **User-password PDFs** (`enc-user-pw-aes128.pdf`) are also "accepted" by all three tools and produce broken or blank output. Only PDF→Image refuses them, with "may be encrypted or corrupted".
- **Root cause:** `PDFDocument.load(bytes, { ignoreEncryption: true })` everywhere. The `pdf-split.md` FAQ says "You'll see an error message if the file can't be read" — false.
- **Evidence:**
  - `out/pdf-deep-chromium.json` (cases `cmp-enc-*`, `mrg-owner-enc`, `mrg-user-enc`, `spl-*-enc`)
  - `out/pdf/chromium-*/*`
  - `shots/FILES-pdf-chromium-cmp-enc-owner-only-photos.pdf.png`
- **Fix:** Detect `/Encrypt` and refuse with a clear message, or decrypt (for example with pdf.js or qpdf-wasm). Never emit output from undecrypted streams.

### FILES-03  Image Compressor enlarges files, silently changes format, weak JPEG encoder
- S2 / Verified / Reach High / NEW
- **Where:** /tools/file-tools/image-compressor/ (Chromium; Firefox and WebKit similar). Defaults: q80, no resize.
- **Results** (original → CalcRun output, against a Squoosh-class baseline from sharp's mozjpeg/libimagequant):

| Input | CalcRun output | Squoosh-class baseline |
|---|---|---|
| Transparent PNG | 4.2 KB → 14.1 KB (3.4× larger) | 1.6 KB |
| Opaque 1920×1080 screenshot PNG | 124.7 KB → 139.8 KB, saved as `.jpg` (lossy text) | 34.9 KB |
| Palette PNG | 2.5 KB → 9.3 KB JPG | 1.3 KB |
| q40 JPEG | 178.9 → 183.6 KB | — |
| 16000×12000 JPEG | 14.68 → 18.08 MB | — |
| Transparent WebP | 678 B → 8.0 KB JPG, transparency replaced with white | — |
| 12 MP photo | 6.08 → 2.74 MB | 2.37 MB (MozJPEG q80) |
| 3000 px → 1920 px batch | 451 KB | 286 KB |

- When the output is larger, the UI just hides the percentage. It still says "file compressed" and offers the larger file.
- The frontmatter targets the keyword "compress PNG without losing quality".
- **Evidence:** `out/img-deep-chromium.json` (`cmp-*`), `out/img/…`, `shots/FILES-img-chromium-image-compressor-screenshot-1920x1080.png.png`
- **Fix:**
  - Never return a file larger than the input.
  - Keep the input format by default (PNG→PNG with quantization, e.g. a libimagequant/oxipng wasm).
  - Warn before any format change.
  - Consider MozJPEG via wasm.

### FILES-04  Images→PDF: transparent PNG pages get a black background
- S2 / Verified / Reach Med / NEW
- **Repro:** Images to PDF → upload `transparent-800x600.png` → Download PDF.
- **Actual:** the image area is black (0,0,0) around the red circle. `generatePdf` draws onto an unfilled canvas and then calls `toDataURL('image/jpeg')`.
- The page description targets "PNG to PDF".
- **Evidence:** `shots/FILES-21-images-to-pdf-transparent-png-black-bg.png`
- **Fix:** Fill white before `drawImage` (the compressor already does this), or embed PNG.

### FILES-05  Excel→PDF misrenders data: serial dates, lost formats, truncated numbers
- S2 / Verified / Reach Med / NEW
- **Repro:** Upload `fixtures/report.xlsx` (date cells formatted dd/mm/yyyy, £#,##0.00 and 0%) → Download as PDF. Then upload `wide-30cols.xlsx`.
- **Actual:**
  - Dates print as "46204.041666666664". A real Excel date prints as a bare serial such as "46204"; the fraction comes from my fixture's timezone.
  - Amounts print as "1234.5" instead of £1,234.50; VAT prints as 0.2 instead of 20%.
  - On the 30-column sheet every 7-digit number is cut to "10123…" — silent data loss in a financial document.
  - Only the first row is treated as the header; a merged title row becomes the header.
- **Cause:** `sheet_to_json(ws, { header: 1, defval: '' })` defaults to raw values. The `wrapText` ellipsis logic applies to numbers too.
- **Evidence:** `shots/FILES-22-excel-to-pdf-dates-unicode.png`, `shots/FILES-23-excel-wide-30cols-truncation.png`, `out/pdf/chromium-xls-*`
- **Fix:** Use `raw:false` (formatted text) or `cellDates`. Never truncate numerics; shrink the font, wrap, or split columns across pages.

### FILES-06  Excel→PDF garbles non-Latin text; CSV without BOM gives mojibake
- S2 / Verified / Reach Med / NEW
- **Actual:**
  - In the PDF: "Łódź"→"Aódz", "東京"→"gqN¬", Greek→"•»»·½¹º¬", "Москва"→">A:20". The cause is jsPDF's built-in Helvetica (WinAnsi only).
  - In the preview and the PDF: `utf8-nobom.csv` (the Google Sheets and most bank-export format) shows "ZÃ¼rich", "Â£100" and "cafÃ©". With a BOM the preview is correct but the PDF still garbles non-Latin-1 characters.
- **Evidence:** `shots/FILES-24-excel-csv-bom-unicode.png`, `out/pdf-deep-chromium.json` (`xls-utf8-*`)
- **Fix:** Decode CSV as UTF-8 (pass `codepage: 65001` or read as text). Embed a Unicode TTF in jsPDF.

### FILES-07  SVG→PNG: `<style>` stripped (black output), % and unit sizes wrong
- S2 / Verified (Chromium, Firefox, WebKit) / Reach Med / REGRESSION (introduced by the 2417224 sanitizer)
- **Actual:**
  - `illustrator-style.svg` (classes styled in `<style>`, Illustrator's default "Internal CSS") renders all-black (0,0,0) in all engines.
  - `width="100%" height="100%" viewBox="0 0 1000 500"` → 200×200 output, a distorted square.
  - `width="10cm"` → 20×10 px, because units are parsed as px.
  - The sanitizer adds no security here: the SVG is rendered through `<img>`, which never runs script or fetches. `script.svg` and `external-refs.svg` made zero requests even before sanitization mattered.
- **Evidence:** `shots/FILES-sri-chromium-svg-illustrator-style.svg.png`, `out/sri-*.json`
- **Fix:** Keep `<style>`; at most strip `@import` and `url(http…)`. Resolve % and units through viewBox or a computed bounding box.

### FILES-08  PDF Compress: no compression for Flate images, misreported counts, wrong FAQ
- S2 / Verified / Reach High / NEVER-FIXED (the code comment admits Flate images are skipped)
- **Actual:**
  - `flate-images-3p.pdf` (22.6 MB of PNG-style images) → 22.6 MB, with the message "3 images recompressed … This PDF is already well-optimized".
  - `jpx-image.pdf` gives "1 image recompressed" with 0 bytes saved.
  - `enc-owner-only-photos.pdf` gives "10 images recompressed" with 3 KB saved (and a corrupt file; see FILES-02).
  - The counter increments for skipped images.
  - The FAQ says the tool "renders each PDF page as an image" and that text becomes unsearchable. That is the opposite of the UI's "text stays crisp".
  - Worked examples cite 45 MB and 200 MB inputs; the per-file limit is 50 MB.
  - iLovePDF (public page) offers 3 compression levels.
- **Evidence:** `out/pdf-deep-chromium.json` (`cmp-*`), `shots/FILES-pdf-chromium-cmp-flate-images-3p.pdf.png`
- **Fix:**
  - Decode Flate RGB/Gray images (pako) and re-encode them as JPEG.
  - Count only images actually replaced.
  - Rewrite the FAQ to match the algorithm.

### FILES-09  N-file downloads with no ZIP: most files never arrive
- S2 / Verified (Playwright Chromium; real browsers Likely) / Reach Med / NEW
- **Split:**
  - "Every page" on `text-500p.pdf` creates 500 blob URLs and clicks; only 20 download events were delivered.
  - On 10 pages all 10 arrived. In real Chrome the second automatic download triggers a "download multiple files" permission prompt.
- **PDF→Image:** "Download all" on 500 pages delivered 10 of 500. On iOS only the first download is expected to work (Hypothesis).
- **Evidence:** `out/pdf-deep-chromium.json` (`spl-every-500`, `p2i-500p-all`)
- **Fix:** Offer a single ZIP (fflate) for every multi-output action.

### FILES-10  Re-running with new settings is impossible without a reload
- S2 / Verified / Reach High / NEW
- **Repro:** In the compressor, upload `photo.jpg` (2.74 MB result) → set quality to 30 → result still 2.74 MB → choose `photo.jpg` again → no change event fires.
- **Cause:** FileDropZone never resets `input.value`, so the input keeps `C:\fakepath\photo-4032x3024.jpg` and selecting the same file fires nothing. The same applies to all tools using FileDropZone.
- **Evidence:** `reselect.mjs`, `focus_slider.mjs`, `shots/FILES-30-compressor-reselect-same-file.png`
- **Fix:** Reset `e.target.value=''` after reading, and re-process existing results when settings change, as Squoosh does with live tuning.

### FILES-11  Image Resizer always outputs PNG (bigger than the input); content promises batch
- S2 / Verified / Reach Med / NEW
- **Actual:**
  - A 6.08 MB 4032×3024 JPEG resized to 2000×1500 gives a PNG of 6.67 MB (Chromium), 7.69 MB (Firefox) or 7.03 MB (WebKit).
  - Loading the image auto-encodes a full-size PNG (32 MB), taking 3 s (Chromium) to 31.8 s (WebKit) before Download is enabled.
  - Clearing the width field forces "1"×"1", so typing 800 produces "1800". The input clamps on every keystroke.
  - The worked example "Batch thumbnails … all images resize in one click … under 50KB" describes features the single-file, PNG-only tool doesn't have.
- **Evidence:** `out/sri-*.json` (`rsz-*`)
- **Fix:**
  - Output the same format as the input with a quality slider.
  - Debounce and encode only on download.
  - Allow an empty field while typing.
  - Fix the copy.

### FILES-12  Silent failures (CLAUDE.md §7 rules)
- S3 / Verified / Reach Med / NEVER-FIXED
- Files over 50 MB, or over 10 MB on png-to-ico, are dropped with no message (picker and drag-drop).
- Images→PDF silently drops undecodable files: 3 of 4 dropped, no alert.
- Resizer: a corrupt image shows "0 × 0px" and nothing else.
- Resizer 200% on a 16000×12000 image: the canvas fails silently. The label says 32000×24000, and the 258 MB download named `_32000x24000.png` is actually 16000×12000 (WebKit).
- SVG with a huge viewBox, or a corrupt SVG: nothing happens. In Firefox the spinner sticks on "Converting…" forever (uncaught `InvalidStateError: Canvas exceeds max size`).
- Compressor batch errors are counts only ("2 images failed"), with no file names.
- PDF Compress on junk input shows a raw JS error ("Cannot read properties of undefined (reading 'Pages')") and "0 pages".
- No tool has a cancel control.
- **Evidence:** `out/img-deep-chromium.json`, `out/sri-*.json`, `out/ux-checks.log`, `shots/FILES-sri-firefox-svg-huge-viewbox.svg.png`, `shots/FILES-pdf-chromium-i2p-corrupt-mix.png`
- **Fix:** Show a named per-file error for oversize, decode failure or canvas limit (canvas-size check). Add a cancel control.

### FILES-13  PDF→Image renders JPEG2000 images blank
- S3 / Verified (both CSP modes) / Reach Low-Med / NEW
- **Repro:** Convert `jpx-image.pdf`; the image area comes out white.
- **Console:** "JpxImage#instantiateWasm: Ensure that the `wasmUrl` API parameter is provided" and "Failed to resolve module specifier 'nullopenjpeg_nowasm_fallback.js'".
- `cMapUrl` and `standardFontDataUrl` are not set either, which is a Hypothesis risk for CJK and non-embedded fonts.
- **Evidence:** `out/pdf2img-chromium.json`
- **Fix:** Ship `pdfjs-dist/wasm`, cmaps and standard_fonts, pass their URLs, and allow `'wasm-unsafe-eval'` for the worker if needed.

### FILES-14  PDF Compress drops /SMask and /Decode; CMYK colours shift
- S3 / Verified / Reach Low-Med / NEW
- The image dict is rebuilt from scratch. At q20, `jpeg-smask.pdf` loses its transparency: regions that showed the yellow page now render opaque red.
- CMYK JPEGs are recolored by the browser's naive CMYK→RGB conversion. pdf.js renders before and after with a large saturation shift.
- **Evidence:** `shots/FILES-20-pdfcompress-cmyk-before-after.png`
- **Fix:** Copy /SMask, /Mask, /Decode and /Intent; skip CMYK or ICC images, or convert with a profile.

### FILES-15  pdf.js workers and documents never destroyed (memory leak)
- S3 / Verified (count; memory impact Likely) / Reach Low / NEW
- Each PDF→Image upload plus convert spawns 2 workers and never terminates them: 12 live workers after 6 runs, each holding a copy of a 22 MB PDF.
- **Evidence:** `workers.mjs` output
- **Fix:** Reuse a single `PDFWorker` and call `loadingTask.destroy()` / `pdfDoc.destroy()`.

### FILES-16  Mobile: results off-screen after picking files; tiny tap targets
- S3 / Verified (emulated Pixel 7 / iPhone 13) / Reach Med / NEW
- After choosing files, results start 880–1111 px down against a 664–839 px viewport (HEIC, compressor). Nothing visible changes and there's no auto-scroll.
- Reorder buttons are 14×14 px; "Clear all" and "Download all" are 16 px tall.
- Copy says "Drop files here or click to browse" on touch devices.
- No horizontal overflow at 390/412 px.
- **Evidence:** `out/ux-checks-2.json`, `shots/FILES-m-*`
- **Fix:** Scroll to or announce results, use 44 px targets, and touch-aware copy.

### FILES-17  Inaccurate content and claims on converter pages
- S3 / Verified / Reach Med / NEVER-FIXED
- Chrome HEIC claims (see FILES-01).
- PDF Compress FAQ (see FILES-08).
- `pdf-split.md` encrypted-PDF FAQ (see FILES-02).
- Images→PDF empty state says "reorder by dragging", but there are only arrow buttons.
- Resizer "Batch thumbnails" example (see FILES-11).
- **Fix:** Align the copy with actual behaviour.

### FILES-18  HEIC (and all outputs) strip EXIF including capture date; odd file names
- S3 / Verified / Reach Med / NEW
- Every output has no EXIF. That's good for GPS privacy, but HEIC→JPG photo archives lose "date taken".
- `x.jpg` → `x.jpg.jpg`; `.heif` files are not renamed.
- **Fix:** Offer "keep date/time" (copy the DateTimeOriginal tag) and strip any extension.

### FILES-19  Merge/Split drop AcroForm
- S3 / Verified / Reach Low / NEW
- `form-1p.pdf` (fields `applicant.name`, `agree`) → merged and split outputs have widgets but no /AcroForm, so the fields can't be filled.
- **Fix:** Copy the AcroForm fields.

### FILES-20  WebP output on Safari likely mislabelled
- S3 / Hypothesis / Reach Low / NEW
- Safari's `canvas.toBlob('image/webp')` returns PNG (WebKit bug 226950: https://bugs.webkit.org/show_bug.cgi?id=226950, accessed 9 Nov 2026). The file would still be named `.webp`.
- Playwright WebKit on Windows does encode WebP, so I couldn't reproduce it.
- **Fix:** Check `blob.type`, warn, and fall back.

### FILES-21  xlsx 0.18.5 with known CVEs is shipped to users; CLAUDE.md says build-time only
- S3 / Verified (shipped) / Reach Low / NEVER-FIXED
- `dist/_astro/xlsx.DGuHH-KN.js` contains `version="0.18.5"` and parses user files in the browser.
- Known CVEs: CVE-2023-30533 (prototype pollution, fixed 0.19.3) and CVE-2024-22363 (ReDoS, fixed 0.20.2); fixed builds are only on cdn.sheetjs.com (https://cdn.sheetjs.com/advisories/CVE-2023-30533.html).
- CLAUDE.md line 536 says it is "never shipped to users". It is.
- **Fix:** Install 0.20.3 from the SheetJS CDN tarball.

### FILES-22  Images→PDF has no size control
- S3 / Verified / Reach Med / NEW
- 20 phone photos (54 MB) → 54 MB `images.pdf` in 12.6 s. There is no downscale or quality option, so assignment portals with 10–20 MB limits will reject the result.
- The filename is always `images.pdf`.

### FILES-23 (S4 bundle)  Nits
- Split: "1–3" (en dash) extracts page 1 only; "3-" is unsupported; Extract stays enabled at "0 page(s)".
- The Excel tool accepts a PDF and renders binary garbage.
- Animated GIF/WebP: first frame only, with no notice.
- PDF→Image: no password prompt for user-password PDFs.

## What works well (verified)
1. **The privacy claim holds at the network level.**
   - Live image-compressor run: 30 requests after upload, all GET with 0-byte bodies to calcrun.com prefetches (`out/live-privacy.json`).
   - Preview runs had no third-party requests apart from GA (blocked).
   - SVG script/onload/external references made zero requests in all 3 engines.
2. **The PDF compressor's in-place stream replacement works for JPEG PDFs.** 22.07→1.82 MB (−92%, 1.9 s); 45.3→1.40 MB (−97%, 3.5 s). Text is extractable afterwards, and the output has 10 images for 10 inputs (no duplicates).
3. **Merge and split are fast and robust.** A 510-page merge took 0.5 s; a 71 MB merge took 0.75 s. Broken files get named errors ("Could not read 3 files: zero.pdf, random.pdf, jpeg-named-as.pdf"). Unicode filenames are preserved.
4. **EXIF orientation is correct** in the compressor, the format converter and Images→PDF (the red marker lands top-right). GPS/EXIF is stripped.
5. **Batch throughput is good.** 20 × 6 MP JPEGs compress and resize in 4.6 s; a 500-page PDF converts to JPG in 26 s.
6. **11 of 12 tools work under the production CSP in Chromium, Firefox and WebKit.** Drag-and-drop highlights and works, and Enter on the drop zone opens a multi-file chooser.

## Competitive notes (public pages, accessed 9 Nov 2026)
- **heictojpg.com:** server upload ("Your files are deleted immediately after conversion"), up to 200 photos per batch.
- **iLovePDF compress:** 3 levels; server-side.
- **Squoosh:** client-side MozJPEG/OxiPNG/WebP/AVIF with live tuning.
- **CalcRun's position:** its honest differentiator is real local processing. Today it loses on HEIC (broken), PNG compression, multi-file download (no ZIP) and Excel fidelity.

## Out-of-lane observations
- Astro `prefetchAll` fired about 28 page prefetches on a tool page on live, which costs mobile data (A11Y-PERF/EDGE).
- Live pages POST to `/cdn-cgi/challenge-platform` (Cloudflare bot JavaScript); the privacy copy doesn't mention it (EDGE/HOME-CHROME).
- The cookie banner covers tool settings at 412 px.
- The breadcrumb reads "Calculators > File Tools" (HOME-CHROME).
- The shared harness's liveHeaders `route.fetch` throws unhandled `TargetClosed`/`ECONNRESET` on prefetches after a context closes. Other reviewers' scripts can crash unless they call `ctx.unrouteAll({behavior:'ignoreErrors'})`.

## Coverage
- **CSP matrix:** 12 tools × {CSP, no CSP} × {Chromium, Firefox, WebKit} = 72 runs.
- **Live:** 6 loads (HEIC in 3 engines, pdf-to-image, excel-to-pdf, compressor privacy).
- **Image deep-dive:** 27 cases on Chromium. SVG/resizer/ICO: 26 cases × 3 engines.
- **PDF/Excel/Images→PDF deep-dive:** 60 cases, Chromium only.
- **UX:** 4 drag-drop, keyboard, 2 repeated-run, 8 mobile (2 devices × 4 tools).
- **HEIC fix probe:** 2 CSP variants × 2 engines.
- **Not done:**
  - Real iOS/Android devices.
  - Safari's native HEIC path.
  - iOS canvas-area limits (Hypothesis: 24 MP iPhone photos may exceed older iOS limits).
  - Low-memory crash thresholds.
  - Slow-network timing (the HEIC chunk is 2.7 MB).
  - PDF/Excel edge cases in Firefox and WebKit.
  - Bookmarks/outlines, CJK PDFs, screen readers.

I left one leftover Playwright Firefox process (started 18:01) and node PID 7960 running because they may belong to other reviewers.
