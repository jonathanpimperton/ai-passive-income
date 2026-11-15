CALC-UX-B report. One thing first: the harness would not let me write findings.md ("subagents should return findings as text, not write report files"), so the findings are below in brief format. Please save them as `review/CALC-UX-B/findings.md` if you need the file. Scripts, JSON logs, screenshots and PDFs are all in C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CALC-UX-B/ (file names below are relative to that folder). The preview stayed up the whole time. I used 3 live page loads with GA blocked and submitted nothing.

## 1. Counts
S1 x7, S2 x3, S3 x12, S4 x2 (24 findings). All are tagged NEW except B-18 (NEVER-FIXED).

## 2. S1 and S2 findings

**S1**
- **B-01 (Verified on live, Reach High): typing "50,000" gives 50.** `SliderInput.tsx:103` treats a single comma as a decimal point.
  - Affects every SliderInput field on 22 of the 23 financial calculators. It has been live since commit d6834fc (4 Mar 2026).
  - On live compound-interest, "50,000" gives $104,387 (live-comma.json).
  - Other parses: "$50k" gives 50, "1e9" gives 19, and EUR "25.000" gives 25.
  - In the P4 journey, typing 25,000 and 1,000/mo gives **$953 instead of $953,207** on three tools. In P5, typing 8,000 gives $100.
- **B-02 (Verified, Chromium + WebKit): Investment Return "Time" tab freezes the tab forever** when the target can't be reached within 100 years.
  - Example: default $10k, $0/mo, 3%, target $1M.
  - Cause: `InvestmentReturnCalc.tsx:189` charts `Math.ceil(Infinity)` years, so the schedule loop never ends (freeze2-*.json, freeze3.json).
- **B-03 (Verified, Reach Low): with localStorage blocked, 19 of 23 calculators unmount completely.**
  - Cause: `currency.ts:23` and `ResultAffiliate.tsx:193` throw.
  - The visitor sees the H1 and then affiliate cards where the calculator was (storage-chromium.json, storage-webkit.json, CALC-UX-B-nostorage-compound-interest-chromium.png).
- **B-04 (Verified): Net Worth multiplies typed decimals by 100.** Typing "5000.00" gives 500,000 and "1234.56" gives 123,456 (`NetWorthCalc.tsx:78-83`).
- **B-05 (Verified, Reach High): Credit Card Payoff gives a meaningless answer for "$8,000 at 24% paying the minimum".**
  - Both minimum modes return "100+ years", and the 2% mode shows "Total Interest $320, Total Paid $160".
  - Cause: when the payment doesn't cover interest, the simulation stops at month 2 and reports partial totals (`CreditCardPayoffCalc.tsx:86`). The same nonsense appears in the exported PDF.
- **B-06 (Verified): Debt Payoff silently ignores any debt row with no name.** "Add Debt" creates unnamed rows. A $3,000 debt was left out of the totals and the payoff date (`DebtPayoffCalc.tsx:105`, CALC-UX-B-15-dp-blank-name-row.png).
- **B-07 (behaviour Verified, legal reading Likely): "Email my results" ticks the marketing box by default.**
  - The request carries `subscribe:true`, and worker.ts:832 then enrols the address in MailerLite.
  - ICO guidance says pre-ticked boxes are not valid consent (accessed 9 Nov 2026).

**S2**
- **B-08 (Verified): Debt Payoff shows "$NaN" totals** when an APR is blank or non-numeric.
- **B-09 (Verified, Reach High): affiliate cards contradict the visitor's region.**
  - GBP/EUR visitors are shown US-only providers (Betterment, SoFi, Ally, Wealthfront).
  - Stamp duty (a UK-only tool) shows LendingTree to every first-time visitor.
  - The mortgage "Your home may be repossessed" warning appears on credit-card, debt, car and loan pages.
  - Placement itself is fine: the card always sits after the answer, never before it.
- **B-10 (mechanism Verified, impact Likely): "Email my results" has no way to recover from a Turnstile failure.**
  - There is no error-callback, so a blocked Turnstile script sends an empty token, which gets a 403 "Verification required".
  - `size:'invisible'` throws an "Invalid value for parameter size" error under Cloudflare's visible and forced-challenge test keys, so challenged visitors can never get a token.
  - On live (form only expanded), headless Chromium got error 600010, which the UI never shows.

**S3 / S4 headlines**
- **PDF output:** files are image-only and 5–40 MB; dark-mode PDFs are low-contrast; mobile exports double the page count; the header and footer still use the old blue brand, the word "Free" and US-format dates.
- **PDF retry:** after a failed export, "try again" can't work until the page is reloaded (failed module imports stay cached).
- **Email errors:** Cloudflare's HTML 413/429/500 responses show as "Network error"; a hung request spins forever; Debt Payoff with 7 or more debts is rejected ("Too many input fields", confirmed by replaying through the bundled worker).
- **ScrollEmailBar:** errors are invisible on phones; it is the second email module on every calculator page, which the project rules ban.
- **Share:** says "Copied!" even when nothing was copied; the role=menu doesn't respond to arrow keys.
- **Hydration and currency:** React error #418 for GBP/EUR visitors on 6 tools; non-USD visitors see USD figures until hydration finishes.
- **Hidden email form:** when collapsed, its input and checkbox stay in the Tab order.
- **Real-time results (B-18):** results only update on blur, not while typing.
- **Debt Payoff "payoff order":** the list contradicts its own caption, and the default example shows identical snowball and avalanche results.
- **Edge values:** garbled outputs such as $690,610,009,620,613,100, a "0.00%" annualised loss, and "-$1,000,000 interest".
- **Phones:** the answer sits 1.4–3.2 screens down, and 14px inputs zoom on iOS.
- **Low-end CPU:** 0.6–1.4s lag per input change.

**Journeys** (Pixel 7, CPU 4x + Slow 4G): P4 scored 7/15 and P5 scored 6/15. P5's Trust score is 0 because of B-05 and B-09.

## 3. Top 3 strengths (verified)
1. On all 13 tools there was no horizontal overflow and no page errors at 360/390/412 px and on desktop (52 device runs). Resizing re-flows the charts correctly.
2. All 52 sliders work with the keyboard, including the non-linear ones, so the July fix holds. The mobile result bar puts the headline figure in the first viewport.
3. PDF export works in both Chromium and WebKit, never cuts a table row, and restores the page afterwards. Compound Interest and Retirement Savings give the identical $953,207 for the same inputs.

## 4. Coverage gaps
- Firefox and real iOS hardware were not run (iOS zoom and canvas limits are inferred).
- bfcache: I could only check eligibility. CDP reported no blockers caused by the pages themselves.
- EmailCapture (the homepage newsletter) was only read in code, not run.
- WebKit input-attack sweep was not separately run (same parser code).
- Deep maths was left to MATH-US.
- The 10 calculators outside my 13 were tested only for the shared chrome, not for input robustness.

What I did cover: 975 input-attack rows, 34 edge scenarios, 52 device runs, 46 storage-blocked loads, 138 affiliate/currency loads, 26 real PDFs (66 pages rendered), 20 email mock cases, 6 share runs, Turnstile with Cloudflare test keys, and both journeys.

**Out-of-lane:**
- **EDGE:** a sandboxed iframe embed can't load the `/_astro` module scripts; check CORS on production.
- **HOME-CHROME:** the head theme script reads localStorage without a guard, and a gradient divider is still present.
- **CONTENT:** a tooltip quotes the 2024 US standard deduction.
- **CALC-UX-A:** the capital gains tax tool ignores a saved GBP setting.

## 5. Findings file
It was not written (blocked). Intended path: C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CALC-UX-B/findings.md. All evidence it cites is in that folder.