CALC-UX-A report: income, property and tax calculators (salary-uk, salary-us, mortgage-payment, mortgage-affordability, stamp-duty, rent-vs-buy, capital-gains-tax, car-finance, loan-amortization, retirement-age)

I could not write findings.md. The harness refused it ("Subagents should return findings as text, not write report files"), so the full findings are appended after the summary. All evidence (scripts, JSON, 129 screenshots) is in C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CALC-UX-A (written `$A` below). No live page loads were made, GA was blocked by the harness, and no forms were submitted. The preview server was up throughout.

## 1. Counts
21 findings: **S1: 3, S2: 6, S3: 11, S4: 1**.

## 2. S1 and S2 findings
- **S1 CALC-UX-A-01 (Verified, High, NEVER-FIXED):** every number box reads a thousands comma as a decimal point.
  - "50,000" or "£50,000" becomes 50. UK salary is then clamped to £10,000 and take-home shows £9,500.
  - Where 50 is still in range there is no message at all: deposit $50, debts $50, car deposit $50, stamp-duty price £50.
  - "50k" becomes 50, "1e9" becomes 19, and the EU format "450.000" becomes 450.
  - Cause: the shared SliderInput.tsx:102-109, so all 23 calculators are affected.
- **S1 CALC-UX-A-02 (Verified, Med):** the inputs on screen can disagree with the result.
  - On a slow phone, typing before the calculator finishes loading (~6 s, ready at ~10.5 s) leaves "52000" and Plan 2 in the fields while the result shows the £35k default (£27,320).
  - Back navigation without the browser's page cache does the same: the browser restores the fields (Firefox restores text boxes too) but the results reset to defaults.
- **S1 CALC-UX-A-03 (Verified, Med; MATH-UK to confirm):** UK student loan is worked out on pay before salary sacrifice.
  - GOV.UK says the loan uses the same pay figure as National Insurance, which sacrifice reduces.
  - At £52k, Plan 2, 5% sacrifice the tool shows £2,035; it should be £1,801 (£234/yr over). At £46.5k it is £209/yr over.
- **S2 CALC-UX-A-04 (Verified):** Scottish tax codes go wrong.
  - S1257L applies rest-of-UK rates (£1,750/yr too generous at £60k) while the hint confirms the code.
  - SD0 is applied as 40% (should be 21%) and SD1 as 48% (should be 42%). SD2 and SD3 are silently ignored.
- **S2 CALC-UX-A-05 (Verified):** the £100k / 60% trap journey (J3) isn't served.
  - The trap warning stays on after sacrificing below £100k.
  - With £9,999 sacrificed on £110k, adjusted net income is £100,001 (over the childcare cliff), yet the allowance card shows the full £12,570.
  - There is no adjusted-net-income figure and pension can only be entered as a %. The scenario page promises the tool can do this.
- **S2 CALC-UX-A-06 (Verified, Low):** six calculators render blank when the saved currency value is invalid or the browser blocks site storage (RangeError / SecurityError).
- **S2 CALC-UX-A-07 (Verified):** car finance keeps a stale deposit larger than the car price, giving "$15,000 interest" on a $5,000 car.
- **S2 CALC-UX-A-08 (Verified):** the UK buyer chain (J4) feels American and makes you re-type everything.
  - Affordability opens with PMI/HOA/"Down Payment". In GBP its headline still uses a US 36% debt-to-income model.
  - Rates default to 6.75–7.0%, there is no 35-year term, and price/deposit don't carry: 11 interactions and 41 s.
- **S2 CALC-UX-A-21 (Verified from the built HTML; CONTENT overlap):** the hub tables contradict the calculators embedded on the same page.
  - UK £35k: table £28,720 vs calculator £27,320.
  - US: the $75k calculator figure ($57,843) is below the table's $70k row ($58,075).
  - Mortgage: $350k costs $2,329 a month in the table (loan amount) but $1,863 in the calculator (home price).

## 3. Top 3 strengths (verified)
1. The prior review's slider keyboard fix holds: all 18 non-linear sliders step correctly with arrows, PageUp/Down, Home and End.
2. Nothing breaks under abuse: 1,173 hostile inputs across 69 fields produced no NaN, Infinity or blank results, with clear clamp and invalid-input notices.
3. Phone layout holds: zero horizontal overflow at 360/390/412 px on every tool, even with maximum values. Rotation, theme switching mid-task and Reset all keep state cleanly, and the mobile result bar mirrors the headline on 10/10 tools.

## 4. Coverage gaps
- J2 was not in my brief.
- WebKit can't throttle CPU or network, so J1's Slow 4G was approximated with per-request delays and its timings are optimistic.
- The browser page cache (bfcache) can't be exercised in Playwright, so the Back finding covers the no-cache path only.
- Not tested:
  - Touch-drag on sliders.
  - Real clipboard paste events (typing was used instead; it is the same parser).
  - The iOS keyboard on a real device.
- Firefox was used only for the Back/reload checks.
- Competitors: 4 fetched (thesalarycalculator, listentotaxman, calculator.net, SmartAsset). MoneySavingExpert, NerdWallet and Omni were not fetched.
- The device sweep's mini-bar step failed on loan-amortization (the invisible-field issue in A-15); its layout was covered separately.

## 5. Findings file
Not written (harness block); the full text is below. Evidence is in `$A` (`attack/`, `sweep/`, `probes*.json`, `perf.json`, `journeys-*.json`, `shots/`).

---
# FULL FINDINGS

### CALC-UX-A-01 "50,000" becomes 50: a thousands comma is read as a decimal point
- S1 / Verified / High / NEVER-FIXED. Sprint 15B (commit d6834fc) claimed "Supports pasted values with commas/currency symbols".
- Where: every SliderInput text box on all 10 tools (shared component).
- Repro: salary-uk → Annual Salary → clear → type `50,000` → Tab.
- Expected vs actual: £50,000 should give £37,520 take-home. Actual: the field becomes £10,000 with "Adjusted to the minimum of £10,000" and take-home is £9,500.
- These were tested and gave 50 with **no message**:
  - Affordability Down Payment `$50,000` → $50
  - Monthly debts `50,000` → $50
  - Mortgage extra payment and insurance → $50
  - Car deposit `$50,000` → $50
  - Retirement current savings → 50
  - Stamp-duty price `£50,000` → £50 (so `£425,000` takes the same path to £425 and £0 duty)
- Other tested inputs:

  | Input | Result |
  |---|---|
  | `50k`, `£50k` | 50 |
  | `1e9` | 19 |
  | `1.000.000,50` | 1 |
  | `52.000` | 52 |
  | EUR mode `450.000` | 450, clamped to €50,000 |
  | `50000`, `50 000` | correct |

- Evidence: `$A/attack/*.json`, `$A/an-salary.txt`, `$A/an-mort.txt`, `$A/probes2.json` (eurTyped450dot000). Code: SliderInput.tsx:102-109 (lone comma becomes "."; the comment calls it UK format, but it is the continental one).
- Fix direction: a comma followed by exactly 3 digits is a thousands separator; a comma is a decimal only before 1-2 digits or in EUR mode. Accept k/m. Show a "did you mean" prompt on magnitude mismatch. Unit-test the parser.

### CALC-UX-A-02 The result can belong to different inputs than the ones on screen (early typing, Back)
- S1 / Verified / Med / NEW.
- A. Pre-hydration typing (Pixel 7, CPU 6x, Slow 4G; GBP saved):
  - Inputs are visible at about 6 s. I typed 52000 and picked Plan 2; the island hydrated at about 10.5 s.
  - Afterwards the field still shows "52000" and Plan 2, but the headline and mini-bar show £27,320 (the £35k default, no loan).
  - On mortgage-payment the typed 425,000 was silently reset to 350,000.
- B. Back navigation without the page cache:
  - Steps: salary-uk set to 52,000, Plan 2, code K475 → go to another page → Back.
  - Chromium and WebKit restore the select (Plan 2); the results have no student loan and are for £35k.
  - Firefox also restores 52,000 and K475, while the headline is £27,320.
- Evidence: `$A/probe5.json`; `$A/shots/CALC-UX-A-p30-prehydration-salary-uk-pixel7-throttled.png`; `$A/shots/CALC-UX-A-p31-posthydration-salary-uk-pixel7-throttled.png`; `$A/probes4.json`; `$A/shots/CALC-UX-A-p28-back-nav-desync-salary-uk-{chromium,webkit,firefox}.png`.
- Fix direction: on mount, read the live DOM values into state, or keep inputs disabled until hydrated. Add autocomplete="off". Use client:load/visible for the primary calculator.

### CALC-UX-A-03 Student loan calculated on pay before salary sacrifice (J1)
- S1 / Verified (behaviour + source) / Med / NEW. MATH-UK owns the final call.
- Repro: 52,000, Plan 2, 5% pension, Salary Sacrifice ON → Student Loan £2,035, the same as with sacrifice off.
- Expected: GOV.UK says to use "the same gross pay amount" as Class 1 NICs (https://www.gov.uk/guidance/special-rules-for-student-loans, accessed 9 Nov 2026). (49,400 − 29,385) × 9% = £1,801.
- Delta: £234/yr at £52k; £209/yr at £46.5k (£1,540 shown vs £1,331).
- Evidence: `$A/probes.json` (j1_52000, j1_52000_nosac); SalaryUkCalc.tsx:168 passes gross `salary`.
- Fix direction: pass the post-sacrifice NIC pay into calcStudentLoan. Check whether the hubs reuse this logic.

### CALC-UX-A-04 Scottish tax codes are mishandled
- S2 / Verified / Low-Med / NEW.
- Tested at £60k, pension 0:
  - `S1257L` → £45,357 (rest-of-UK rates), while the hint says "Personal Allowance £12,570". The Scottish toggle gives £43,607, so the code path is £1,750/yr off.
  - `SD0` → 40% (GOV.UK: intermediate rate, 21%).
  - `SD1` → 48% (GOV.UK: higher rate, 42%).
  - `SD2`/`SD3` → silently standard rates (should be 45% / 48%).
- Source: https://www.gov.uk/tax-codes/what-your-tax-code-means (accessed 9 Nov 2026).
- Evidence: `$A/probes.json` (taxcodes), `$A/probes2.json` (sd); SalaryUkCalc.tsx:65-72.
- Fix direction: an S prefix switches on Scottish bands, or prompts the user to. Map SD0-SD3 correctly.

### CALC-UX-A-05 The £100k trap / childcare-cliff job isn't served (J3)
- S2 / Verified / Med / NEW.
- At £110k with sacrifice on, from 5% to 9.5%, the amber "60% tax trap... consider salary sacrifice" box never clears. It keys off gross salary (SalaryUkCalc.tsx:196).
- At 9.09% (£9,999 sacrificed) adjusted net income is £100,001, which is over the cliff for Tax-Free Childcare and 30 hours, yet the allowance card shows the full £12,570.
- There is no adjusted-net-income output, no childcare flag, and no "sacrifice needed" figure. Pension is % only, with a 0.5% slider step.
- The childcare scenario promises the calculator lets you "see exactly what level of contribution keeps adjusted net income below the threshold".
- Evidence: `$A/journeys-J3_J4_J5_J6.json` (J3); `$A/shots/CALC-UX-A-J3-03-tool-110k-9.5pct-sacrifice-desktop.png`; `$A/shots/CALC-UX-A-p01-salary-uk-trap-after-sacrifice-desktop.png`.
- Fix direction: base the warning on adjusted net income; show an ANI row and "sacrifice £X to reach £100k"; allow £ pension input; add an optional childcare flag.

### CALC-UX-A-06 Calculators render blank when the stored currency is invalid or storage is blocked
- S2 / Verified / Low / NEW. Overlaps CALC-UX-B (currency persistence) and EDGE (embeds).
- `calcrun.currency` set to `garbage` or `€` → the island renders nothing on all 6 currency tools (RangeError: Invalid currency code).
- localStorage that throws (as when site data is blocked) → mortgage-payment and rent-vs-buy are blank (SecurityError).
- `XYZ` → "XYZ 1,863" headlines next to "$" input prefixes, with no currency button selected.
- Evidence: `$A/probes2.json` (tamper, storageBlocked); `$A/shots/CALC-UX-A-p20-currency-garbage-mortgage-payment-desktop.png`; `$A/shots/CALC-UX-A-p21-currency-XYZ-mortgage-payment-desktop.png`; `$A/shots/CALC-UX-A-p22-storage-blocked-mortgage-payment-desktop.png`. Code: currency.ts:21-24, ResultAffiliate.tsx:193.
- Fix direction: whitelist the stored value and wrap storage in try/catch. Hypothesis for EDGE: third-party-iframe embeds with storage blocked would blank too.

### CALC-UX-A-07 Car finance keeps a stale deposit larger than the price
- S2 / Verified / Low-Med / NEW.
- Repro: set deposit 20,000 (price 25,000), then price 5,000.
- Actual: the deposit stays 20,000 (slider max $4,000). PCP, HP and Loan each show "Total paid $20,000 / Interest $15,000 / Monthly —" and a "$0 balloon"; Cash is marked best value.
- Evidence: `$A/shots/CALC-UX-A-p05-car-finance-stale-deposit-desktop.png`, `$A/probes.json` (carStale); CarFinanceCalc.tsx:77.
- Fix direction: clamp the deposit to price − 1,000 when the price changes, with a notice.

### CALC-UX-A-08 UK buyer chain: US framing and no carry-over (J4)
- S2 / Verified / Med / NEW. The USD default itself is already logged and not re-filed.
- Device: Pixel 7, CPU 4x, Slow 4G.
- Stamp duty: £6,250 at £425k for a first-time buyer, but there is no next-step link; only the Related Tools grid.
- Affordability:
  - Opens in USD with Down Payment, Property Tax, Homeowners Insurance, HOA and PMI.
  - In GBP the headline still uses a 36% debt-to-income model ("Max housing payment (36% of income)"); the 4.5x income cap appears only as a note.
  - The rate stays at 6.75%. UK terms are 20/25/30 only, with no 35-year term.
- Mortgage-payment reopens at 350,000 / 20% / 7.0%, so I re-typed the price and deposit: 11 interactions, 41 s.
- US wording remains in GBP mode: "Home Price", "Amortization Schedule", and a $ icon on the Deposit card.
- Evidence: `$A/journeys-J3_J4_J5_J6.json` (J4), `$A/shots/CALC-UX-A-J4-01..04-*.png`.
- Fix direction: UK income-multiple (and joint income) model, a UK default rate, a 35-year term, URL hand-off of price/deposit, and a call-to-action under the duty result.

### CALC-UX-A-21 Hub tables contradict the calculators embedded on the same page
- S2 / Verified (built HTML) / Med (top hub entry pages) / NEW. CONTENT owns cross-surface consistency.
- /scenarios/uk-take-home-pay/: the table's £35,000 row gives £28,720 (no pension). The embedded calculator defaults to £35,000 with 5% pension and gives £27,320.
- /scenarios/us-take-home-pay/: there is no $75k row. The embedded calculator gives $75,000 → $57,843 (5% state default), lower than the table's $70,000 row ($58,075, no state tax).
- /scenarios/mortgage-payments-by-amount/: the table's "$350,000" (loan) at 7% costs $2,329. The embedded calculator's $350,000 is a home price with 20% down and gives $1,863.
- Evidence: dist/scenarios/{uk-take-home-pay,us-take-home-pay,mortgage-payments-by-amount}/index.html (SSR text).
- Fix direction: seed the embedded calculator with the table's assumptions (0% pension, 0% state, loan = price, 0% down), or label the difference beside it.

### CALC-UX-A-09 Default assumptions differ between mortgage tools (J5)
- S3 / Verified / Med / NEW.
- Rate: affordability 6.75%, mortgage-payment 7.0%, rent-vs-buy 6.5%, loan-amortization 6.5%.
- Property tax 1.2% vs 1.0%; insurance $1,500 vs $1,800; PMI 0.5% vs 0.7%.
- Every tool restarts at $350k, ignoring the $291,182 that affordability just produced ($85k income, $400 debt).
- The mortgage hub shows a 5-7% table and has no link to rent-vs-buy.
- Reference: Freddie Mac 5 Nov 2026 = 7.18% (https://www.wcax.com/2026/11/05/average-us-30-year-mortgage-rate-falls-718-this-week-its-third-straight-decline/, accessed 9 Nov 2026).
- Evidence: J5 in the journeys JSON, `$A/shots/CALC-UX-A-J5-*.png`.
- Fix direction: one shared, dated defaults module; carry the price; add a hub link to rent-vs-buy.

### CALC-UX-A-10 Tax code field fails silently
- S3 / Verified / Low-Med / NEW.
- `K`, `XYZ`, `-1257L` are silently treated as standard, with the "Leave blank" hint.
- `12570` (someone typing their allowance) → PA £125,700 and zero tax at £60k. `9999L` and `99999L` are accepted.
- No autocapitalize, autocorrect or spellcheck attributes for iOS.
- Evidence: `$A/probes.json`, `$A/probes3.json` (taxCodeAttrs).
- Fix direction: validate the format, show "not recognised", warn on implausible allowances.

### CALC-UX-A-11 Typed values only apply on blur or Enter
- S3 / Verified / High / NEVER-FIXED (by design).
- While typing, neither the result nor the mini-bar changes (`$A/probes3.json` minibar midType), which contradicts "Results update in real-time". On phones you must tap Done.
- Fix direction: parse live without reformatting the field.

### CALC-UX-A-12 The value shown in a field isn't always the value used
- S3 / Verified / Med / NEW.
- loan-amortization: typing 6.75 shows "6.8" but calculates $1,946 (6.8% gives $1,956).
- The same toFixed(1) display applies to car-finance APRs, the UK pension %, the US state % and the 401(k) %.
- 1,000,000.50 displays as "1,000,001". Hours and weeks fields show "3.14159265358979".
- Evidence: `$A/probes.json`, `$A/an-salary.txt`.

### CALC-UX-A-13 Returning GBP/EUR visitors get a hydration error and see USD until load
- S3 / Verified / Med / NEW.
- With GBP or EUR saved, React error #418 fires on mortgage-payment, affordability, rent-vs-buy, car-finance and loan-amortization.
- Cause: ResultAffiliate.tsx:193 reads localStorage during render.
- The server-rendered "$1,863", "Down Payment" and "Home Price" show until hydration, which is 9-14 s on the low-end profile.
- Evidence: `$A/probes3.json` (hyd418), `$A/probe5.json`.
- Fix direction: decide the currency in an effect; add a pre-paint currency hint.

### CALC-UX-A-14 Low-end perceived performance
- S3 / Verified (lab) / Med / NEW. A11Y-PERF owns lab perf.
- Profile: Pixel 7, CPU 6x, Slow 4G, cold cache.

  | Tool | First paint | Ready (hydrated) | 20 slider key steps |
  |---|---|---|---|
  | salary-uk | 1.8 s | 8.7 s | 4.7 s |
  | salary-us | 2.3 s | 10.1 s | 0.9 s |
  | mortgage-payment | 2.3 s | 13.7 s | 6.1 s |
  | mortgage-affordability | 2.0 s | 9.4 s | 5.4 s |
  | stamp-duty | 2.5 s | 11.7 s | 4.6 s |
  | rent-vs-buy | 2.2 s | 9.1 s | 5.4 s |
  | capital-gains-tax | 2.4 s | 9.2 s | 1.8 s |
  | car-finance | 2.4 s | 9.1 s | 5.8 s |
  | loan-amortization | 3.0 s | 13.1 s | 9.3 s |
  | retirement-age | 2.2 s | 8.9 s | 1.1 s |

- Evidence: `$A/perf.json`.

### CALC-UX-A-15 Collapsed "Advanced settings" field in loan-amortization is still tabbable
- S3 / Verified / Low / NEW (A11Y overlap).
- Tab moves from "Advanced settings" onto the invisible #la-extra and its slider, which are hidden only by max-h-0/opacity-0.
- Evidence: `$A/probes.json` (loanTabSeq, loanHiddenFocusables).
- Fix direction: inert or hidden after collapse.

### CALC-UX-A-16 Rent-vs-buy negative axis labels are unformatted
- S3 / Verified / Med / NEW.
- At price $1M the axis reads "$-700000, $-350000, $0, $350K, $700K"; huge values give "$-8000000".
- Evidence: `$A/probes3.json` (rvbTicks), `$A/shots/CALC-UX-A-p25-rent-vs-buy-negative-ticks-desktop.png`; RentVsBuyCalc.tsx:394.

### CALC-UX-A-17 Affordability display defects
- S3 / Verified / Med / NEW.
- With debts over the 36% budget: "You can afford up to $0 — With a $40,000 down payment and $0 loan".
- With debts at 0: "Less existing debt -$0" (or "-£0").
- In GBP at 412 px, "£2,100" wraps onto two lines ("£2,10" / "0").
- The UK donut chart has a single segment.
- Evidence: `$A/shots/CALC-UX-A-p13-affordability-zero-desktop.png`, `$A/shots/CALC-UX-A-J4-03-affordability-gbp-pixel7.png`, `$A/probe6.json`.

### CALC-UX-A-18 Mobile first screen has no calculator; the mini-bar shows an unrequested figure
- S3 / Verified / High / NEW.
- At 360-412 px the first input is below the fold on all 10 tools (H1, description, badge, disclosure and cookie banner take the screen).
- The mini-bar appears at load with the default result (e.g. £27,320 for an unseen £35k) and overlaps the breadcrumb.
- Evidence: `$A/shots/CALC-UX-A-sweep-salary-uk-w360-viewport.png`, `$A/probes3.json` (atLoad).

### CALC-UX-A-19 UK capital gains: the tax-band switch contradicts the income field
- S3 / Verified / Low / NEW.
- Gain £30k, income £30k: Basic gives £5,264; Higher/additional gives £6,480 (income ignored, £1,216 more).
- Evidence: `$A/probe6.json`; capital-gains.ts:140-152.

### CALC-UX-A-20 Stamp-duty chart tooltip and highlight
- S4 / Verified / Low / NEW.
- The tooltip reads "Price 400000", and the user's own price isn't highlighted: `isCurrent` is computed but unused (StampDutyCalc.tsx:81).

## Journey scorecards (0-3 each: Intent / Time-to-own-number / Trust / Continuity / Friction)

| Journey | Device / network | Intent | Time | Trust | Continuity | Friction | Total |
|---|---|---|---|---|---|---|---|
| J1 UK pay rise | iPhone 13 WebKit, emulated Slow 4G | 1 | 0 | 1 | 1 | 1 | 4/15 |
| J3 £100k trap | Desktop Chromium | 2 | 2 | 0 | 1 | 1 | 6/15 |
| J4 UK first-time buyer chain | Pixel 7, CPU 4x, Slow 4G | 2 | 1 | 1 | 0 | 1 | 5/15 |
| J5 US buyer chain | Pixel 7, CPU 6x, Slow 4G | 2 | 3 | 1 | 0 | 2 | 8/15 |
| J6 US paycheck (Texas) | 360x740, CPU 4x, Slow 4G | 2 | 3 | 1 | 1 | 2 | 9/15 |

- **J1:** the scenario loaded in 10.2 s. "Try it with your numbers" opens the tool at £35k defaults (29-30 s).
  - First own number (£46,500, Plan 2, 5% sacrifice → £2,815/month) at 42.2 s after 5 interactions.
  - Second (£52,000 → £3,088/month) at 49.8 s after 7 interactions.
  - There is no old-vs-new comparison, the headline is annual rather than monthly, and both figures carry the A-03 error.
- **J3:** the scenario pages explain adjusted net income well, but the tool can't answer the question; the user must work out £10,001 or more alone.
- **J4:** duty was 1 interaction and 11 s (good on its own); the full chain was 11 interactions and 41 s.
- **J5:** affordability reached $291,182 in 14.3 s with 2 interactions; after that every default and the price reset.
- **J6:** bi-weekly $2,369 at 13.6 s with 3 interactions. The 2026 badge is shown with no 2027 note, there is no semi-monthly row, and the hub has no $75k row and contradicts itself (A-21).

## Missing-job gap analysis
Public pages, fetched 9 Nov 2026: thesalarycalculator.co.uk/salary.php, listentotaxman.com, calculator.net/mortgage-calculator.html, smartasset.com/taxes/paycheck-calculator.

| Job | CalcRun | Leaders |
|---|---|---|
| UK pay entered hourly / daily / weekly / monthly | Annual only | listentotaxman and thesalarycalculator support it |
| UK output periods | Annual / monthly / weekly / daily; no 4-weekly, fortnightly or hourly | Both UK leaders cover these |
| Bonus month | None | thesalarycalculator: side-by-side normal vs bonus month |
| Two jobs | None | thesalarycalculator has a page for it |
| Pension | % only | £ or %, relief-at-source / net-pay / employer types |
| Adjusted net income | Not shown | thesalarycalculator shows it |
| Compare two scenarios | None on any of the 10 tools | thesalarycalculator compare pages |
| US frequency and deductions | No semi-monthly or per-paycheck view; 401(k) % only | SmartAsset: 8 frequencies; HSA/health/FSA, dependents, extra withholding |
| Mortgage overpayments | Monthly extra only | calculator.net: yearly and one-time extras, biweekly, start date |
| UK mortgages | No remortgage, fixed period, fees, 35-year term, or income-multiple affordability | Standard on UK tools |
| Stamp duty | No Scotland (LBTT), Wales (LTT) or non-resident surcharge | Covered elsewhere |

Defaults:
- UK £35k + 5% pension: good.
- US $75k + 5% state: wrong for TX/FL.
- US mortgage 7.0%: plausible.
- UK mode 6.75-7.0%: high.
- Car finance defaults to USD with UK PCP/HP products (owner call already open).

## What works well (verified)
1. Non-linear slider keyboard support: all 18 sliders step correctly (`$A/attack` kb[]).
2. No NaN, Infinity, undefined or blank results across 1,173 abuse states. Clear clamp and invalid notices; an emptied field reverts.
3. Zero horizontal overflow at 360/390/412 px on all tools, even at maximum values; values survive rotation (`$A/sweep`, `$A/probes3.json`).
4. The mini-bar mirrors the headline on 10/10 tools and never covered the focused input.
5. Mid-task theme switching keeps values and recolours charts. Reset restores the regional term. GBP mode relabels to Deposit and hides and zeroes the US-only costs (`$A/probes2.json`).
6. Stamp duty: first-time buyer gets the right number in one interaction, with clear relief-cap wording.

## Out-of-lane one-liners
- All LOAN_TOOLS, including car finance and debt payoff, carry a mortgage "home may be repossessed" warning (CALC-UX-B).
- The GBP-locked stamp-duty page shows a US LendingTree card for anyone whose saved currency isn't GBP/EUR — that is every first-time visitor (CALC-UX-B).
- At 360 px, the affiliate name plus "Best for" label overflows by 5-15 px (CALC-UX-B).
- The cookie banner covers about 90 px of results on mobile (HOME-CHROME).
- Collapsed email panel inputs are still focusable (CALC-UX-B/A11Y).
- role="radio" button groups lack arrow-key support (A11Y).
- Turnstile error 110200 appears on localhost only.
- Hub/scenario figures may inherit the A-03 student-loan logic (MATH-UK).

## Coverage
- **Input attacks:** 69 text fields × 16 attacks plus Enter = 1,173 states across 10 tools and 12 modes.
- **Keyboard:** 69 sliders × 13 keys.
- **Device sweep:** 10 tools × 4 profiles (40 runs, including huge values and the mini-bar).
- **Low-end:** 10 tools × 1 run, plus pre-hydration typing on 2 tools.
- **State tests:**
  - Currency tampering × 6 tools; blocked storage × 3; GBP/EUR hydration × 6.
  - EUR typing; switching currency mid-task; theme; Reset.
  - Back and reload on 3 engines; rotation × 3.
  - 31 tax codes.
- **Journeys:** J1, J3-J6 once each.
- **Limits** are as listed in summary section 4. Charts and expanded amortisation schedules at 360 px were checked for overflow only, not visually reviewed for every tool.