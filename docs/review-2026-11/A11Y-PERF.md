A11Y-PERF report. I could not write `findings.md`: the environment blocks subagents from writing report files ("Subagents should return findings as text"). The full findings are pasted below instead, so this is longer than ~900 words. All evidence (screenshots, logs, scripts) is in `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/A11Y-PERF/`, written `<A>/` below. The preview server was up throughout.

## 1. Counts
**S1: 1, S2: 5, S3: 13, S4: 8.**

## 2. S1 and S2

- **A11Y-PERF-01 (S1, Verified, Reach Med, NEW): values typed before hydration stay in the inputs, but the results keep showing the defaults.**
  - Setup: salary-uk on a throttled phone. The form is visible at 3.8 s (mid) and the island hydrates at 7.3 s; on low it is 5.0 s and 12 s.
  - If you type 52000, pick Plan 2 and enter 8 % before hydration, the inputs keep those values. The headline and mini-bar stay at £27,320, the default for £35k. The calculator's own answer for those inputs is £34,775, so the user is under-told by about £7.5k a year with no warning. Salary alone: £27,320 shown vs £37,506 correct.
  - Reproduced in Chromium, WebKit and Firefox. Same on mortgage-payment.
  - It applies to every SSR-controlled island: 23 calculators, 4 hubs, and the homepage engine.
  - Evidence: `<A>/A11Y-PERF-07-pretype-desync-chromium.png`, `<A>/pretype2.log`.
- **A11Y-PERF-02 (S2, Verified, NEW): collapsed panels (`max-h-0 opacity-0`) stay focusable and visible to screen readers.**
  - Affected: the "Email my results" form on every calculator, the Advanced settings on compound / investment-return / loan-amortization, and the homepage mobile accordion.
  - On compound-interest, Tab 27 lands on the invisible compounding select. ArrowDown silently changes it to daily and the headline moves from $144,573 to $145,278.
- **A11Y-PERF-03 (S2, Likely, NEW): the whole results panel is `aria-live` on all 23 calculators.**
  - The region is 233-1,832 characters and includes the chart, the buttons and the affiliate card.
  - One slider ArrowRight changes 55-217 text nodes. Typing the tax code "1257L" causes 241 mutations.
  - JSON formatter: the `role=alert` re-renders on almost every keystroke. Valid output re-queues the whole JSON (28,126 characters) per keystroke.
  - Mutation counts are verified; I did not run a real screen reader, so the speech effect is inferred.
- **A11Y-PERF-04 (S2, Verified, NEW): at true 400 % zoom (320x200), only 8 % of the viewport is uncovered.** The sticky header, mini-bar and cookie banner cover the rest, and the salary input is hidden.
- **A11Y-PERF-05 (S2, Verified, NEVER-FIXED): calculators take too long to respond on phones, and "lazy recharts" was never done.**
  - Time until the calculator responds: 5.0-5.7 s on mid, 12.3-13.8 s on low. Homepage engine: 7.0 s / 19.9 s.
  - TBT: 2.1-2.7 s on mid, up to 9.5 s on low.
  - Recharts is about 110 KB gz, eager on every calculator page, out of ~200 KB gz total. There is no modulepreload, so loading is a serial waterfall.
- **A11Y-PERF-06 (S2, Verified, NEW): in dark mode on mobile, the result mini-bar is a light band with an invisible figure (1.09:1) on all calculators.**
  - Root cause: `dark:bg-neutral-900/95` combined with the inverted neutral tokens (`ToolPageLayout.astro:139`, `global.css:719`).

## 3. Top strengths (verified)
1. **Reflow:** 0 of 70 page x width runs (320 px and 640 px) have horizontal page scroll.
2. **Keyboard and sliders:** both journeys complete with visible focus.
   - salary-uk: 7 Tabs after the skip link, ending at £36,948.
   - JSON: paste, read the error, fix, 4 Tabs to Copy, copied to the clipboard.
   - The tablists follow the full APG pattern; the mobile menu traps focus and Escape returns it.
   - All 111 sliders have correct `aria-valuetext`. Non-linear slider keys now work, which fixes the July 2.1.1 failure.
3. **Code-splitting, CDN and motion:**
   - heic-to (2.7 MB), pdf-lib and xlsx/jspdf load lazily; content pages ship ~1 KB of JS.
   - Live: zstd, CF HIT, immutable caching, TTFB 68-156 ms.
   - Reduced motion is fully honoured; focus outlines survive forced colours.
   - 21 of 35 pages are axe-clean in every theme and viewport, and the old homepage contrast failures are gone.

## 4. Coverage gaps
- No real screen reader and no real low-end device. The jank finding (F-16) comes from headless software rendering.
- WebKit and Firefox were used only for F-01.
- Not axe- or keyboard-tested individually:
  - 11 of 23 calculators
  - 9 of 16 converters (and none in a file-uploaded state)
  - 5 of 7 utilities
  - 38 of 41 scenarios
  - 13 of 16 comparisons
  - 21 of 23 methodology pages
- Live: only 3 of ~10 allowed loads used.
- **Gate amendment, made after the harness blocked the measurement:** the harness always registers routes, and Playwright disables the HTTP cache when it does, so a warm-cache return visit can't be measured inside it. For `return-visit.mjs` only I used an unrouted context instead. GA, GTM and Turnstile were blocked at DNS level, and the browser talked only to a local read-only copy of dist on 127.0.0.1:4499 with the production cache headers and no /api. No production request was possible.

## 5. findings.md
Not written (blocked); the full content follows.

---

# FULL FINDINGS (as intended for findings.md)

Profiles:
- **mid:** 150 ms RTT, 1.6 Mbps, 4x CPU, Pixel 7.
- **low:** 400 ms RTT, 400 kbps, 6x CPU, Pixel 7.
- **lab:** unthrottled Pixel 7.
- **desktop:** unthrottled 1350x940.

Preview serves gzip and live serves zstd.

### S1

**A11Y-PERF-01: values typed before hydration are kept, but the results stay at the defaults.**
- S1 / Verified / Reach Med / NEW.
- Where: salary-uk and mortgage-payment.
  - Chromium Pixel 7 on mid and low throttle.
  - Chromium, WebKit (iPhone 13) and Firefox with a 6 s JS delay.
- The same mechanism applies to every `client:idle`/`client:visible` island that SSRs controlled inputs.
- Repro:
  1. Open salary-uk on a throttled profile. Form visible at 3.8 s, hydrated at 7.3 s (mid); 5.0 s and 12 s (low).
  2. Before hydration, type 52000, choose Plan 2, set pension to 8.
  3. Wait for hydration.
- Expected: £34,775 (the calculator's own result for those inputs; salary-only £37,506).
- Actual: the inputs show 52000 / Plan 2 / 8, but the headline and mini-bar stay at £27,320 (default £35k, no loan, 5 %). Refocusing the salary field reverts it to 35000.
- Evidence: `<A>/A11Y-PERF-07-pretype-desync-{chromium,firefox,webkit}.png`, `<A>/A11Y-PERF-05-pretype-salary-uk-mid-pixel7.png`, `<A>/pretype.log`, `<A>/pretype2.log`; `SliderInput.tsx` (controlled value); `[tool].astro:139+` (`client:idle`).
- Fix direction: read the DOM values into state on mount, or disable/readonly the inputs until hydrated, or use `client:load` with a smaller bundle.

### S2

**A11Y-PERF-02: collapsed panels stay focusable and in the accessibility tree.**
- S2 / Verified / Reach Med / NEW.
- Affected: the EmailResultsButton form on every calculator (`EmailResultsButton.tsx:196-197`), `CompoundInterestCalc.tsx:333`, `InvestmentReturnCalc.tsx:452`, `LoanAmortizationCalc.tsx:266`, `DecisionEngine.tsx:624`.
- Compound interest: Tab 27 reaches the invisible `#ci-frequency`. ArrowDown changes 12 to 365 and the headline goes from $144,573 to $145,278 (`<A>/A11Y-PERF-21-compound-hidden-select-focused-1280.png`).
- salary-uk: the Tab after "Email my results" (`aria-expanded=false`) goes into an invisible email input and checkbox. The AX tree exposes them, along with a disabled Send button.
- Sweep: invisible tab stops on 102 of 106 page/viewport runs (`<A>/hidden-tabbables.json`; the scroll-reveal rows are mostly a timing artefact).
- Fix direction: add `inert` to the collapsed container, once, in the shared component.

**A11Y-PERF-03: the whole results panel is aria-live on all 23 calculators; JSON live regions are huge.**
- S2 / Likely / Reach Low / NEW.
- Calculators (`<A>/chatter.log`):
  - Region size: 233-1,832 characters, including the chart, buttons and ResultAffiliate.
  - One ArrowRight: 55-217 text nodes change (car-finance 217, mortgage 191).
  - Typing "1257L" into the tax code: 241 mutations, because it recalculates on every key.
- JSON formatter (`<A>/kbd-json.log`):
  - The `role=alert` error re-renders on 64 of 74 keystrokes.
  - The valid-output `<pre aria-live>` re-queues 28,126 characters per keystroke on a 20 KB document.
- Source: e.g. `SalaryUkCalc.tsx:424`, `MortgagePaymentCalc.tsx:395`, `JsonFormatter.tsx:180,194`.
- Fix direction: one sr-only `role=status` mirroring the headline, debounced to about 500 ms.

**A11Y-PERF-04: at 400 % zoom, fixed chrome covers 86-92 % of the viewport.**
- S2 / Verified / Reach Low / NEW.
- At 320x200: header 65 px + mini-bar 41 px + cookie banner 79 px leave 8 % free, and the salary input is hidden.
- At 341x192: 14 % free. After dismissing the banner, 105 of 200 px are still covered. At 640x400, 59 % free.
- Evidence: `<A>/A11Y-PERF-16-zoom400-salary-uk-320x200.png`.
- Fix direction: at `max-height: 500px`, make the header static, hide the mini-bar, and compact the banner.

**A11Y-PERF-05: slow time-to-usable, and recharts is still eager.**
- S2 / Verified / Reach High / NEVER-FIXED (July plan items "recharts React.lazy" and "modulepreload" are still open).

  | Profile | Page | FCP | Hydrated | TBT | Longest task |
  |---|---|---|---|---|---|
  | mid | salary-uk | 3.0 s | 5.0 s | 478 ms | 1,008 ms |
  | mid | mortgage | 2.6 s | 5.7 s | 2,120 ms | 1,644 ms |
  | mid | homepage | 2.7 s | 7.0 s | 2,741 ms | 1,727 ms |
  | low | salary-uk | 2.7 s | 12.3 s | 3,759 ms | — |
  | low | mortgage | 2.8 s | 13.8 s | 4,231 ms | — |
  | low | homepage | 3.7 s | 19.9 s | 9,461 ms | — |

- Warm-cache return visit hydrates salary-uk in 0.9 s / 1.9 s, so the cost is mostly download plus the waterfall.
- What is shipped: the `useChartTheme` chunk is 302 KB raw / 95 KB gz (it holds recharts) and is statically imported by every calculator. Recharts totals about 110 KB gz of the ~185-200 KB gz JS. modulepreload count is 0.
- Evidence: `<A>/perf-{lab,mid,low,desktop}.json`, `<A>/bundle-graph.json`, `<A>/return-visit.log`.
- Fix direction: lazy-load the chart, add modulepreload, and consider `client:load` for the main calculator.

**A11Y-PERF-06: dark-mode mobile mini-bar has an invisible figure.**
- S2 / Verified / Reach Med / NEW.
- The figure is #E5E7EB on about #DBDDE1, 1.09:1; the label is 2.27:1.
- The dark-surface sweep hit 21 calculator pages.
- Evidence: `<A>/A11Y-PERF-01-minibar-dark-pixel7.png`.
- Root cause: `ToolPageLayout.astro:139` (`dark:bg-neutral-900/95`) with the inverted `--color-neutral-900` (`global.css:719`).
- Fix direction: use a semantic surface token and lint against `dark:bg-neutral-*`.

### S3

**A11Y-PERF-07: homepage return-visit CLS of 0.256 ("poor").**
- Verified / Reach Med / NEW.
- The mobile skeleton (`index.astro:374-396`) sits above the SSR'd island, so "Can I actually afford this house?" appears twice. The skeleton is removed on hydration and the page jumps.
- Evidence: `<A>/A11Y-PERF-08-home-return-cls-sidebyside-pixel7.png`, `<A>/return-visit.log`.

**A11Y-PERF-08: desktop prefetch storm.**
- Verified / Reach High / NEW (introduced by the July `prefetchAll` + viewport setting).
- 35 prefetches (about 855 KB) on every desktop load; 31 of them are links in the `visibility:hidden` mega-menu, which still counts as "in viewport".
- Mobile: 4-9 prefetches at load, 15-20 (300-450 KB) after scrolling.
- Evidence: `<A>/prefetch-desktop.mjs` output, `<A>/perf-desktop.json`.
- Fix direction: switch to hover/tap prefetch and set `data-astro-prefetch=false` on nav links.

**A11Y-PERF-09: cookie banner and mini-bar hide keyboard focus (WCAG 2.4.11).**
- Verified / Reach Med / NEW.
- At 1366x768:
  - json "Sort keys": fully hidden.
  - mortgage: 2 controls fully hidden, 6 partly.
  - salary-uk "How it works": fully hidden.
- At 412: the salary-uk Tax Code input is fully hidden.
- At 412 and 820, the mini-bar overlaps the breadcrumb before any scroll.
- Evidence: `<A>/obscured-full.log`, `<A>/A11Y-PERF-10-focus-obscured-cookie-json-1280.png`.

**A11Y-PERF-10: header search and mega-menu gaps.**
- Verified / NEW.
- Search:
  - The input has only a placeholder for a label.
  - The button has no `aria-expanded`.
  - Results have no status announcement, and ArrowDown doesn't move into them.
  - The dropdown stays open after focus leaves (`<A>/A11Y-PERF-11-search-left-open-1280.png`).
- Mega-menu:
  - Hover-open can't be closed with Escape (1.4.13).
  - Enter leaves focus on the button.
  - 35 Tab stops inside the panel.
- Evidence: `<A>/kbd-menus.log`.

**A11Y-PERF-11: charts are unnamed focusable `role=application` (Recharts 3).**
- Verified / NEW.
- Seven calculators have no table alternative: debt-payoff, emergency-fund, inflation, net-worth, rent-vs-buy, roi, savings-goal.
- rent-vs-buy reads out only axis ticks (`<A>/aria-rent-vs-buy.yml`).
- No `<caption>` on any table.

**A11Y-PERF-12: the accessibility statement is inaccurate and stale ("Last updated: March 2026").**
- Verified / NEVER-FIXED.
- "Every commit is tested against axe-core": the only CI workflow is auto-merge.
- "All text 4.5:1": false (F-06, F-13).
- "Tabular data alongside every chart": false (F-11).
- It targets WCAG 2.1, not 2.2.
- File: `src/pages/accessibility.astro`.

**A11Y-PERF-13: contrast failures (axe).** Verified / NEW. The Sprint-20 homepage failures are fixed.
- credit-card "With Extra" `opacity-60` card: 2.41:1 (all themes).
- stamp-duty dark band row: 3.55:1.
- JSON error text: 4.41:1.
- JWT "Expired" badge: 4.15:1.

**A11Y-PERF-14: homepage naming and headings.** Verified / NEW.
- Duplicate ids `engine-income` and `engine-down` (desktop and mobile copies). The visible mobile inputs get an empty accessible name ""; on desktop the name is doubled ("Annual income Annual income").
- The daylight/return state has no H1.
- The intro H1 itself is fine (aria-label on the heading, char spans hidden).
- Evidence: `<A>/dupid2.mjs` output, `<A>/outline-home-daylight.txt`.

**A11Y-PERF-15: forced colours.** Verified / NEW.
- The 4 `role=switch` controls (Scottish, Salary sacrifice, Password generator, Solar) are invisible in both states.
- Slider tracks vanish; the cookie buttons lose their boundaries.
- Focus outlines do survive.
- Evidence: `<A>/A11Y-PERF-18-forced-switch-off-vs-on.png`, `<A>/A11Y-PERF-14-forced-salary-uk-1280.png`.

**A11Y-PERF-16: homepage theater scroll jank.**
- Likely (headless software rendering) / NEW.

  | CPU | Avg frame | p95 | Max | Frames >100 ms | Long tasks during scroll |
  |---|---|---|---|---|---|
  | 4x | 47.7 ms (~21 fps) | 133 ms | 350 ms | 23 | 46 |
  | 6x | — | 167 ms | 417 ms | — | 50 |

- Evidence: `<A>/jank.log`.

**A11Y-PERF-17: INP proxy at 6x CPU.**
- Verified / NEW.
- Worst event durations: loan-amortization slider 416 ms (drag 304 ms); rent-vs-buy 288 ms (drag 224 ms); mortgage 272 ms. salary-uk stays at or below 144 ms.
- Evidence: `<A>/inp.log`.

**A11Y-PERF-18: horizontally scrolling tables can't be reached by keyboard.**
- Verified / NEW (axe `scrollable-region-focusable`).
- Affected: the 4 hub tables at mobile width, 60%-tax-trap, snowball, the `.table-scroll` wrappers, and the JSON `<pre>`.
- Fix direction: add `tabindex=0` plus `role=region` and an `aria-label` on the wrappers.

**A11Y-PERF-19: ScrollEmailBar.** Verified / NEW.
- A third fixed overlay (63 px) appears after 60 % scroll.
- Escape doesn't dismiss it, and it adds to the obscuring in F-04 and F-09.

### S4
- **F-20:** the cookie banner is `role=alert`, assertive and atomic (`CookieBanner.astro:22`).
- **F-21:** on the homepage, `<main>` wraps the theater and the nav, so there is no banner landmark and the skip link skips nothing.
- **F-22:** JetBrains Mono (40 KB) is preloaded on /about/ and /privacy/, which never use it. The 3 font preloads (123 KB) cost ~2.5 s of 3G bandwidth.
- **F-23:** amber callouts stay #FFFBEB in dark mode (credit-card, mortgage-affordability, retirement-savings, investment-fee).
- **F-24:** the mobile menu dialog has no `aria-modal` and the background isn't inert (the focus trap and Escape do work).
- **F-25:** no table captions; hub row headers are `td`, not `th scope=row`.
- **F-26:** `#back-to-calc-btn` is focusable while `opacity:0` (`global.css:655-666`).
- **F-27:** the JSON "Copied!" state isn't announced because `aria-label` overrides it.

### What works well (verified)
1. **Reflow:** 0 of 70 page x width runs have horizontal scroll (`<A>/reflow.json`).
2. **Keyboard journeys complete with 2-3 px visible focus.** APG tablists, mobile menu trap with Escape returning focus, and the intro keyboard path skips the theater (`<A>/kbd-*.log`, `<A>/tabs.mjs`).
3. **Sliders:** 111 have correct valuetext. Non-linear keys work (+£500 / PageUp +£5,000 / Home / End). Each has a 44 px text twin, which covers 2.5.7 and 2.5.8.
4. **Motion preferences:** with reduced motion the homepage track drops from 5,873 to 3,088 px, 0 animations run, smooth scroll is off and scroll-reveal is disabled.
5. **Code-splitting and CDN:**
   - heic-to 2.7 MB, pdf-lib 519 KB, xlsx/jspdf 800 KB all load lazily; content pages ship ~1 KB of JS.
   - Live: zstd, CF HIT, immutable `/_astro` and `/fonts`, TTFB 68-156 ms, h2/h3, FCP 352-812 ms, CLS 0 (`<A>/live.json`).
6. **axe:** 21 of 35 pages are clean in every combination, including the homepage.

### Out-of-lane (one line each)
- **EDGE:** live chunk hashes differ from the local dist (e.g. live `SalaryUkCalc.DXN4v_SI.js` vs dist `CM6kopgM`), so live is not a byte-identical build of HEAD.
- **CALC-UX-A:**
  - What happens: programmatic fill (focus + select-all + insert in one task) on SliderInput concatenates "35000" and "52000", which is clamped to £1,000,000 (take-home £464,371) (`<A>/truth2.mjs`).
  - Who might hit it: speech-input users (Hypothesis).
- **DEVTOOLS:** the json-formatter textarea is sometimes pre-filled with a "John Doe" sample on reload.
- **HOME-CHROME:** /accessibility/ uses the banned icon-chip-on-every-card pattern; the "E.G. 1257L" placeholder looks odd because of `uppercase`.
- **CALC-UX-B:** ResultAffiliate sits inside the aria-live region.
- Turnstile error 110200 on preview is expected locally.

### Coverage
- **axe:** 35 pages x light/dark x 1280/Pixel 7 x two passes (after hydration, after interaction) = 140 runs.
- **Sweeps (53 pages x 2 viewports):** hidden-focus and dark-surface.
- **Keyboard:**
  - full journeys on salary-uk (1280, 820) and JSON (1280)
  - menus, search and tablists
  - 7 focus-obscured tab-throughs
- **Screen-reader semantics:** ARIA snapshots and CDP AX tree for 6 pages; chatter on 23 calculators; valuetext on 30 pages.
- **Reflow:** 35 pages at 320 and 640, plus true 400 % zoom.
- **Text spacing:** 4 pages.
- **Forced colours and reduced motion:** forced colours on 4 pages; reduced motion on home and salary-uk.
- **Perf:**
  - 6 pages x 4 profiles
  - return visit
  - pre-hydration typing in 3 engines
  - jank at 1x/4x/6x and INP at 4x/6x
  - bundle graph for 15 pages
  - 3 live loads
- Gaps are as listed in section 4 above.