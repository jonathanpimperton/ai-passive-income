## CONTENT reviewer: final report

**`findings.md` was not created.** The harness blocks subagents from writing report files ("Subagents should return findings as text"), so the full findings file is pasted in Part B below.

Two sub-reviewers wrote reports into my folder and did save their files:
- Comparisons: `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CONTENT/sub-comparisons/comparisons-findings.md`
- Methodology: `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CONTENT/sub-methodology/methodology-findings.md`

Screenshots, `landing.json`, `linkcheck.tsv` and the shingle TSVs are in the same CONTENT folder.

---

# Part A: summary

### 1. Counts
- **This report:** S1: 4, S2: 15, S3: 12, S4: 1 roll-up (6 nits).
- **Sub-reports, beyond what is relayed here:**
  - Comparisons: 25 S3 and 41 S4.
  - Methodology: 19 S3 and 9 S4.

### 2. S1 and S2 findings

**S1**
- **CONTENT-01:** The "Can I retire at 55 with $1M" headline of $1,214,400 drops the $50k starting balance. The correct figure is $1,501,378, which is also what the linked tool computes. Every milestone on the page is wrong too. Verified.
- **CONTENT-02:** The rent-vs-buy method and engine don't count the renter's invested contributions as money paid out. At the defaults the verdict flips from rent to buy (sub-reviewer's MTH-01). Likely.
- **CONTENT-03:** The mortgage-affordability page promises the lower of 28% and 36% of income. The code applies 36% only, which overstates affordability by about 26% (MTH-02). Verified.
- **CONTENT-04:** The UK salary methodology says an "S" tax-code prefix applies Scottish rates. The code strips the prefix, and the SD0/SD1 codes are mapped to the wrong rates (MTH-03). Verified.

**S2**
- **CONTENT-05:** "$100K after tax" gets three answers. The homepage tile ($6,598/mo) links to a California page ($6,212/mo), and the US hub's "Go deeper" links go to CA/NY pages with no signpost. These are cannibal pairs. Verified.
- **CONTENT-06:** On the same hub page, the table and the embedded calculator disagree.
  - UK: the table says £28,720 for £35k; the calculator says £27,320 because it defaults to a 5% pension.
  - US: the calculator shows $57,843 for $75k, less than the table's $70k row.
  - Verified.
- **CONTENT-07:** The 62 legacy anchor redirects land on a row with the column headers scrolled off. At 390px the take-home columns are off-screen. The highlight is faint in light mode and missing on zebra rows in dark mode. Verified.
- **CONTENT-08:** The UK £300k mortgage page says SDLT is £2,500 (the pre-April 2025 rule). The correct figure is £5,000, and that contradicts the site's own first-time-buyer page. Its overpayment table is also wrong (the lump-sum saving is understated by about 50%), and its rate context has been overtaken (Moneyfacts now 5.97%/6.00%). Verified.
- **CONTENT-09:** The £100k UK page claims the pension saving that escapes the taper is £2,500; it is £1,000. Verified.
- **CONTENT-10:** The Budget on 28 Oct 2026 has aged four pages.
  - The Cash ISA cut to £12k was cancelled; three pages still say it is coming.
  - The LISA charge for first-time buyers above £450k is now 20%, not 25%; the LISA comparison and the stamp duty first-time-buyer page still say 25%.
  - The LISA closes to new savers in 2029, which no page mentions.
  - Verified (ITV, MSE, Vanguard).
- **CONTENT-11:** Interest rates now go the other way from what the copy says. Bank Rate is 4.00%, and the US 30-year mortgage average (7.18%) is above the hub's "top of range" 7%. The fixed-vs-variable and rent-vs-buy articles still talk about cuts or stable rates. Verified.
- **CONTENT-12:** Three comparison conclusions reverse or are overstated on the articles' own numbers: rent-vs-buy break-even, 15 vs 30 years, and index vs active. Verified by the sub-reviewer's script.
- **CONTENT-13:** Two US rule errors.
  - Roth 401(k): the article treats a hardship distribution or leaving the employer as penalty-free; the 10% penalty still applies (leaving only escapes it at 55+).
  - Roth vs Traditional: the article ignores the 2026 rule that higher earners' catch-up contributions must be Roth.
  - Verified.
- **CONTENT-14:** The net-worth-at-30 headline uses 2019 survey figures ($13,900 median). The 2022 survey shows a median of about $39,000. Likely.
- **CONTENT-15:** The UK rental ROI page says landlords pay "tax on gross rent". The figures that follow are wrong: about £1,140 against the page's £3,030. Verified, low reach.
- **CONTENT-16:** The ACA credential can't be verified (no ICAEW or LinkedIn link). Three problems sit around it:
  - The author page claims every page is "written and reviewed by one person", while the repo's CLAUDE.md says the site is AI-built.
  - Errors survived that claimed review.
  - The claim that stale rates "cannot silently ship" is false.
  - Likely.
- **CONTENT-17:** The About page says "nothing is sent to a server". That is false for Email-my-results, which posts inputs and results to the server. Verified in code.
- **CONTENT-18:** Five more methodology-vs-tool money contradictions: credit-card payoff, PMI, UK pension method, US capital gains, and investment fees (MTH-04 to MTH-08). Verified by the sub-reviewer.
- **CONTENT-19:** The California state tax on the $100k page looks about $1.7-2k too low. The US pay-rise page promises a state setting the calculator doesn't have. Likely; for MATH-US to confirm.

### 3. Top strengths
1. **The doorway problem is fixed.** The median scenario shares 6.7% of its five-word sequences with 10 or more other scenarios, and that is template text. Topical reuse is 1.7%. The July review measured 44-53% overlap.
2. **The seven July high-intent pages are excellent:** 60% trap, childcare cliff, UK and US pay rise, Plan 5, stamp duty for first-time buyers, and capital gains tax on a second home. They open with the answer, their arithmetic reproduces, and they cover real traps. They also all keep the answer in the first viewport.
3. **Hub figures agree with the homepage and the scenarios on the same assumptions:** £39,520, $79,180, $811,650 and $1,896. Published and modified dates match git history.

### 4. Coverage gaps
- No live-site loads.
- No Slow-4G timing.
- About 27 older scenarios were checked by headline figure and dated-phrase search only; 10 headline figures were recomputed, and 6 small drifts went to MATH-US.
- FAQs on the 8 tool pages were checked by search only.
- I did not parse the Fed survey PDF, verify current savings-account rates, or verify the 2027 IRS figures.
- Government sites that returned 403 were not re-checked in a browser.

### 5. Files
`findings.md` was not created (harness block); the full content is in Part B. Supporting files are in `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CONTENT/`.

---

# Part B: full findings content (what `findings.md` would contain)

**Paths.**
- `CONTENT/` = `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/CONTENT/`.
- Repo paths are relative to `C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun/`.

**Environment.** Preview at http://127.0.0.1:4399, using the shared harness (Chromium, GA blocked, liveHeaders). Date: 9 Nov 2026.

**Sub-reviewers.** I spot-checked their S1s in code: the 36%-only affordability rule, the S-prefix strip, and the rent-vs-buy asymmetry. I verified the Budget facts myself.

## Landing scorecard

**Method.** First viewport at 390x844 and 1366x768, first visit with the cookie banner showing. Shots are named `CONTENT/shots/CONTENT-nn-<slug>-<vp>.png`; measurements are in `CONTENT/landing.json`.

**Scale.** Each column is scored 0-3. Continuity is capped at 2 because no calculator handoff carries inputs (already logged).

| # | Page | Target query | Intent | Trust | Cont. | Quality | Key issue |
|---|---|---|---|---|---|---|---|
| 1 | /scenarios/uk-take-home-pay/ | £45k after tax uk | 2 | 2 | 1 | 3 | Columns cut off at 390 (23); calculator contradicts table (06); no links to trap or cliff (21) |
| 2 | /scenarios/us-take-home-pay/ | 90k after taxes | 2 | 1 | 1 | 2 | Calculator shows $75k below the $70k row (06); unsignposted CA link (05) |
| 3 | /scenarios/mortgage-payments-by-amount/ | $300k mortgage 6.5% | 2 | 2 | 2 | 3 | 6.5%/7% columns off-screen at 390; 7% called "top of range" while the market is 7.18% (11, 23) |
| 4 | /scenarios/investment-growth/ | $500/mo 30 years | 1 | 3 | 2 | 3 | No figure in first viewport at 390 (23) |
| 5 | /scenarios/pay-rise-shock-uk/ | 40k to 50k rise | 3 | 3 | 1 | 3 | Calculator has no before/after mode (20) |
| 6 | /scenarios/pay-rise-shock-us/ | 25k raise after tax | 3 | 2 | 1 | 3 | CA/NY estimate low; "set your state" (19, 20) |
| 7 | /scenarios/60-percent-tax-trap-uk/ | 60% tax trap | 3 | 3 | 1 | 3 | Calculator doesn't show adjusted net income; banner uses gross pay (20) |
| 8 | /scenarios/100k-childcare-cliff-uk/ | 100k childcare cliff | 2 | 3 | 1 | 3 | Quick Answer gives the tax figure, not the childcare loss (20, 31) |
| 9 | /scenarios/plan-5-student-loans-explained/ | plan 5 repayments | 3 | 2 | 2 | 3 | Start-date timing (24) |
| 10 | /scenarios/stamp-duty-first-time-buyer-2026/ | FTB stamp duty 2026 | 3 | 2 | 2 | 3 | LISA charge now 20% (10); soft-broken GOV.UK link (28) |
| 11 | /scenarios/cgt-second-home-2026-27/ | cgt second home | 3 | 3 | 2 | 3 | Strong |
| 12 | /scenarios/uk-300k-mortgage-payment/ | £300k mortgage payment | 3 | 1 | 2 | 2 | SDLT, overpayment table, rates (08) |
| 13 | /scenarios/retire-at-55-with-1-million/ | retire at 55 with $1M | 1 | 0 | 1 | 2 | Headline $287k too low (01) |
| 14 | /scenarios/50k-credit-card-debt-payoff/ | pay off 50k credit card | 3 | 3 | 2 | 2 | Minor rounding |
| 15 | /scenarios/100k-salary-take-home/ | 100k after taxes | 2 | 1 | 1 | 2 | CA-only answer; contradicts homepage and hub (05, 19) |
| 16 | /scenarios/50k-salary-uk-take-home/ | 50k after tax uk | 3 | 2 | 2 | 2 | Stale median salary (26) |
| 17 | /comparisons/pension-vs-isa-uk/ | pension vs isa | 3 | 2 | 1 | 2 | Verdict contradicts 60% trap advice (21) |
| 18 | /comparisons/lisa-vs-regular-isa/ | lifetime isa worth it | 3 | 1 | 1 | 2 | Budget changes (10) |
| 19 | /comparisons/roth-vs-traditional-401k/ | roth vs traditional | 3 | 1 | 1 | 2 | Catch-up mandate (13) |
| 20 | /comparisons/15-year-vs-30-year-mortgage/ | 15 vs 30 | 3 | 1 | 1 | 2 | Conclusion reverses (12) |
| 21 | /tools/income-and-planning/salary-uk/ | uk salary calculator | 2 | 3 | 2 | 2 | Sticky result at 390 shows £27,320 for the £35k default; templated copy (29) |
| 22 | /author/ | trust | n/a | 1 | n/a | 2 | Credential can't be verified (16) |

Notes on the scorecard:
- On all 16 scenario and comparison pages tested, the Quick Answer or Verdict is in the first viewport at both sizes. Retire-at-55 is in view but wrong.
- The investment hub's first table row at 390 sits at y=770, under the cookie banner at 785.
- The header is sticky at 65px.
- One console error appears on every page; not investigated.

## Findings

### CONTENT-01: Retire at 55 headline is $287k too low and contradicts the tool
- **Severity:** S1 / Verified / Reach: Med / NEVER-FIXED
- **Where:** /scenarios/retire-at-55-with-1-million/; `src/data/scenarios/retire-at-55-with-1-million.md:12,24,28-36,51-55`
- **Repro:**
  1. The Quick Answer says "$1,214,400 by age 55" for: age 30 to 55, $50k saved, $1,500/month, 7%.
  2. Feed those inputs to the tool's own engine: `compoundInterest(50000,1500,0.07,25,12)` (`RetirementSavingsCalc.tsx:103`, `calculator-utils.ts:19-52`).
- **Expected vs actual:**
  - The correct balance is $1,501,378 (annual compounding gives $1,409,854).
  - $1,214,400 is the value of the contributions alone; the $50k start was dropped.

  | Figure | Page | Correct |
  |---|---|---|
  | Age 35 | $160.8k | $178.3k |
  | Age 40 | $319.5k | $360.1k |
  | Age 45 | $549.2k | $617.9k |
  | Age 50 | $870.4k | $983.3k |
  | $1,000/mo | $878.6k | $1.096M |
  | Start at 25 | $1.775M | $2.236M |
  | 5% return | $911.2k | $1.067M |

  - The claim that gains are "over half" of the balance by age 45 is false: 37% at the page's figure, 48% at the correct one.
  - Intent mismatch: the query asks whether $1M at 55 will last. The sustainability answer is buried.
- **Evidence:** `CONTENT/shots/CONTENT-13-retire-55-390.png`
- **Fix:** Generate the figures from the engine at build time. Lead with "$1M supports about $40k a year at 4% / $35k at 3.5%".

### CONTENT-02: Rent vs buy rule and engine favour renting (relay MTH-01)
- **Severity:** S1 / Likely / Reach: Med / NEW
- **Where:** `src/data/methodologies/rent-vs-buy.md:69`; `RentVsBuyCalc.tsx:174,177`
- **Problem:** The renter's invested monthly difference is counted as an asset, but never as money paid out.
- **Expected vs actual:** At the defaults the tool says renting wins by $28.5k. On equal cash outlay, the buyer's equity is $233k against the renter's $174k portfolio. GBP mode flips the same way.
- **Evidence:** `CONTENT/sub-methodology/scripts/rvb.py`
- **Fix:** Count the renter's contributions as outlay. MATH-US owns this.

### CONTENT-03: Mortgage affordability applies 36% only (relay MTH-02)
- **Severity:** S1 / Verified / Reach: High / NEW
- **Where:** `src/data/methodologies/mortgage-affordability.md:18-20,29-30,60` vs `MortgageAffordabilityCalc.tsx:120`
- **Expected vs actual:** With no other debts the tool shows $322.8k. The page's own method gives $255.3k, so the tool is about 26% high.
- **Fix:** Apply the lower of the 28% and 36% limits, or rewrite the page.

### CONTENT-04: S-prefix tax code ignored (relay MTH-03)
- **Severity:** S1 / Verified / Reach: Med / NEW
- **Where:** `salary-uk.md:105` (methodology) vs `SalaryUkCalc.tsx:72` (`replace(/^[SC]/,'')`), and `:67-68`
- **Problems:**
  - SD0 is mapped to 40% (should be 21%); SD1 to 48% (should be 42%).
  - S1257L at £50k gives £7,486 tax; the Scottish figure is about £8,982.
- **Fix:** Make the S prefix apply Scottish bands and fix the SD codes. MATH-UK owns this.

### CONTENT-05: Three answers to "$100K after tax"
- **Severity:** S2 / Verified / Reach: High / NEW
- **Where:** `src/pages/index.astro:166`; `us-take-home-pay.astro:236,240`; `100k-salary-take-home.md:2,12`
- **Repro:**
  1. Homepage "Instant answers" says "$100K salary after tax $6,598/mo" and links to the scenario.
  2. The scenario's Quick Answer is "~$74,540/yr ($6,212/mo)" with a "State: California" pill.
  3. The US hub row says $79,180, and its "Take-home on $100,000" link goes to the same CA page.
  4. The hub's "$75,000 after taxes" link goes to a NY page ($57,891). Pay-rise-US says $61,593 for $75k. The calculator says $57,843.
- **Evidence:** `CONTENT/shots/CONTENT-15-us-100k-390.png`, `CONTENT-02-us-hub-1366.png`
- **Fix:**
  - Retitle and re-slug the scenarios "...in California" / "...in New York", or fold them into the hub.
  - Point the homepage tile to the hub's #100k row.
  - Label the hub links with the state.

### CONTENT-06: Hub table vs embedded calculator on the same page
- **Severity:** S2 / Verified / Reach: High / NEW
- **Where:**
  - UK: `uk-take-home-pay.astro:227` with defaults at `SalaryUkCalc.tsx:124-131` (£35k, 5% pension)
  - US: `us-take-home-pay.astro:228` with defaults at `SalaryCalc.tsx:31-40` ($75k, 5% flat state tax)
- **Expected vs actual:**
  - UK: the table's £35k row says £28,720; the calculator below says £27,320.
  - US: the calculator says $57,843 for $75k, below the $70k row ($58,075).
- **Evidence:** `CONTENT/shots/CONTENT-embed-01-uk-take-home-pay-1366.png`, `-02-us-take-home-pay-1366.png`
- **Fix:** Start the embedded calculator on the same assumptions as the table (no pension, no state tax), or show the differing assumptions next to the number.

### CONTENT-07: Legacy anchor landings are unlabelled and the highlight is weak or missing
- **Severity:** S2 / Verified / Reach: Med / NEW
- **Where:** 62 anchored 301s in `public/_redirects`; `uk-take-home-pay.astro:127-130` (`scroll-mt-24 target:bg-primary-50` plus zebra striping); `global.css:782`
- **Repro:** `node CONTENT/anchors.mjs` (9 anchors × 2 viewports × 2 themes)
- **What happens:**
  - The row lands at y=176, fully visible below the header. That part is good.
  - The table header is always scrolled off (top between -7 and -633px), and column headers aren't sticky.
  - At 390 the take-home columns are off-screen.
  - In light mode the highlight (#EDFAFA against white or #F7F7F5) is barely visible.
  - In dark mode, zebra rows (#45k, #95k, #90k, #750k, #500-per-month, #50000) get no highlight at all: rgb(40,44,52), the same as the stripe.
- **Evidence:** `CONTENT/shots/CONTENT-anchor-01-45k-390-light.png`, `CONTENT-anchor-01-45k-1366-dark.png`
- **Fix:**
  - Sticky table header.
  - On mobile, put the take-home column second.
  - Make the `:target` style strong enough to beat the zebra rule.
  - Optionally add a summary card driven by the URL hash.

### CONTENT-08: UK £300k mortgage page
- **Severity:** S2 / Verified / Reach: Med / NEVER-FIXED
- **Where:** `uk-300k-mortgage-payment.md:54,75-82,86-92`
- **Stamp duty:** The page says standard SDLT on £300k+ "adds £2,500". It is £5,000 since April 2025, and the site's own `stamp-duty-first-time-buyer-2026.md:45` says £5,000. Source: gov.uk/stamp-duty-land-tax/residential-property-rates.
- **Overpayment table:**

  | Overpayment | Page | Correct |
  |---|---|---|
  | £100/mo | 22y3m, saves £33.8k | 22y6m, saves £29.9k |
  | £200/mo | 20y, saves £59.1k | 20y5m, saves £53.1k |
  | £500/mo | saves £108.3k | saves £99.7k |
  | £30k lump sum | saves ~£38k | 20y4m, saves £73.9k |

- **Rates:** The page assumes a 2-year fix at 5.0% and a 5-year fix at 5.5%. Moneyfacts in Nov 2026: 5.97% and 6.00%, after Bank Rate rose to 4.00% on 5 Nov (moneyfactscompare.co.uk, 9 Nov 2026).
- **Fix:** Take SDLT from the stamp-duty engine and recompute the table from the amortisation library. State rates as "at X% (market Y% on <date>)".

### CONTENT-09: £100k UK page overstates the pension saving
- **Severity:** S2 / Verified / Reach: Med / NEW
- **Where:** `100k-salary-uk-tax.md:57-60`
- **Claim:** "£5,000 pension... adjusted income to £95,000... You save £2,500 in tax ... on top of the normal 40% relief"
- **Correct:** For a £105k earner, the restored allowance is £2,500, which saves £1,000 of tax. Total relief is £3,000 (60%). The contribution takes adjusted income to £100k, not £95k.
- **Fix:** Rewrite using the £105k example already on the page.

### CONTENT-10: Budget 28 Oct 2026 has aged four pages
- **Severity:** S2 / Verified / Reach: High / NEW
- **Where:**
  - Cash ISA cut still described as coming: `cash-isa-vs-savings-account.md:99`, `isa-vs-general-investment.md:90`, `lisa-vs-regular-isa.md:108`
  - LISA charge stated as 25%: `lisa-vs-regular-isa.md:75,103`, `stamp-duty-first-time-buyer-2026.md:71`
  - The LISA closing to new savers on 6 Apr 2029 is not mentioned.
- **Facts:**
  - The Cash ISA limit stays at £20,000.
  - The LISA charge for first-time buyers above £450k is 20% from 29 Oct 2026.
- **Sources:** itv.com 28 Oct 2026; moneysavingexpert.com/news/2026/10/cash-isa-limit-cut-cancelled; Vanguard 2026 Budget PDF; sub-reviewer items CMP-01, 02, 11.
- **Fix:** Update the four pages and add a Budget-watch step to the owner's calendar.

### CONTENT-11: Rate direction has reversed
- **Severity:** S2 / Verified / Reach: High / NEW
- **Where:**
  - `fixed-vs-variable-rate-mortgage.md:65-71` (expects holds or cuts)
  - `renting-vs-buying-2026.md:48` ("5.5-6.5%")
  - Mortgage hub "5%-7%" range and "$300k at 7% ... top of the range"
  - HYSA vs CDs article (CMP-20)
- **Facts:** Freddie Mac on 5 Nov 2026: 30-year 7.18%, 15-year 6.57%. Bank Rate 4.00%. The sub-reviewer reports a Fed hike in September 2026; I have not verified that.
- **Fix:** A dated "market rate" constant on each page, extend the hub's rate columns, and drop rate forecasts.

### CONTENT-12: Three comparison conclusions fail on their own numbers (relay CMP-05, 06, 24)
- **Severity:** S2 / Verified (sub-reviewer script) / Reach: Med / NEW
- **Cases:**
  - Rent vs buy (`renting-vs-buying-2026.md:69-71`) says buying is "$29.4k ahead" at 5 years; on its own inputs the renter is about $24.6k ahead.
  - 15 vs 30 (`15-year-vs-30-year-mortgage.md:87-91`) says the 15-year often wins; the 30-year plus investing ends about $216k ahead.
  - Index vs active: $566.4k / $498.2k should be about $598.1k / $502.3k.
- **Fix:** Generate the numbers from the calculation libraries and re-derive the verdicts.

### CONTENT-13: US retirement rule errors (relay CMP-07, 08)
- **Severity:** S2 / Verified / Reach: Med / NEW
- **Where:** `roth-ira-vs-roth-401k.md:89`; `roth-vs-traditional-401k.md:30-32`
- **Errors:**
  - A hardship distribution is not an exception to the 10% penalty, and leaving the employer only helps at age 55+.
  - From 2026, catch-up contributions for people whose prior-year wages exceed $150k must be Roth.
- **Fix:** Correct both and cite IRS Topic 558 and the SECURE 2.0 catch-up rules.

### CONTENT-14: Net worth at 30 uses 2019 survey data
- **Severity:** S2 / Likely / Reach: Med / NEVER-FIXED
- **Where:** `net-worth-at-30.md:12,22`
- **Problem:** The headline "$76,300 average, $13,900 median" is from the 2019 Survey of Consumer Finances. The 2022 survey gives a median of about $39,000 and a mean of about $183,500 (CNBC Select and NerdWallet citing the Fed SCF Oct 2023, federalreserve.gov/publications/files/scf23.pdf).
- **Fix:** Use the 2022 figures and show the survey year on the page. The 2025 survey is due late 2026.

### CONTENT-15: UK rental ROI states the wrong tax rule
- **Severity:** S2 / Verified / Reach: Low / NEVER-FIXED
- **Where:** `rental-property-roi.md`, tax section
- **Problems:**
  - "Tax on gross rent at 40%... £3,030 instead of £1,080" is wrong. Tax is on rent minus expenses: 40% of £6,600 less 20% of £7,500 = £1,140. Under the old rules the result was £0 (a loss).
  - "EPC C by 2028" is aged; the current target is 2030.
  - The Renters' Rights Act is missing.
  - The page shows a US-only Betterment affiliate.
- **Fix:** Correct the rule and the numbers.

### CONTENT-16: The author credential can't be verified and the review claim is undermined
- **Severity:** S2 / Likely / Reach: High / NEVER-FIXED (the July plan asked for ICAEW and LinkedIn links)
- **Where:** `src/pages/author.astro`, `seo.ts:85-89`, `Byline.astro`, /about/
- **Problems:**
  - There is no verification path: no ICAEW directory link, no LinkedIn, no history. A web search found no profile; that is not conclusive.
  - The author page says everything is "written and reviewed by one person". The repo's CLAUDE.md says the site is "built entirely by AI", and the site never mentions AI assistance.
  - Errors survived the claimed review (CONTENT-01, 08, 09, 14, 15). There is no "reviewed on" date.
  - The author page says stale rates "cannot silently ship". The live site isn't rebuilt, so they can. This is evidence for the already-logged freshness-guard item.
  - The About page promises fixes "within 24 hours".
- **Fix:**
  - A verification link and a separate "Reviewed on" date.
  - A one-line AI-assistance disclosure.
  - Accurate wording on the freshness guard.
  - Drop the 24-hour promise.

### CONTENT-17: About page privacy claim is false for Email-my-results
- **Severity:** S2 / Verified / Reach: Med / NEW
- **Where:** `about.astro:38,76` ("nothing is sent to a server"; "never leave your device")
- **Evidence:** `EmailResultsButton.tsx:128-136` POSTs the inputs and results to /api/email-results, which sends them through MailerSend.
- **Fix:** Qualify the claim. The privacy policy has the same problem (see out-of-lane).

### CONTENT-18: Five more methodology-vs-tool contradictions (relay MTH-04 to 08)
- **Severity:** S2 / Verified / Reach: Med / NEW
- **Cases:**
  - Credit-card payoff: the page says "7+ yrs, $4,300+"; the tool says 13y11m and $11,694. The "+$50/mo saves $2,435" figure should be $8,649.
  - PMI: the page says 0.5%; the code hard-codes 0.7% (`MortgagePaymentCalc.tsx:247`).
  - UK pension: the page describes relief-at-source; the code deducts the pension before tax (net pay).
  - US capital gains: the page uses a single rate; the tool splits across brackets ($3,000 vs $1,582.50).
  - Investment fee: the page says annual compounding; the code is monthly. The page gives $275k and $173k; the tool says $306k.
- **Fix:** Generate the worked examples from the calculation engine.

### CONTENT-19: State-tax narratives understate California
- **Severity:** S2 / Likely / Reach: Med / NEW
- **Where:** `100k-salary-take-home.md:27`; `pay-rise-shock-us.md:59`
- **Expected vs actual:**
  - The page puts CA tax at ~$4,640. With the 9.3% bracket starting around $72k and SDI at about 1.2-1.3% uncapped, the true figure is about $6.3-6.6k.
  - On the $25k raise, CA takes about 10.6%, not the "5-6%" stated.
  - Sources: ftb.ca.gov tax news Oct 2026; NerdWallet.
  - "Set your state" contradicts the already-logged flat-rate state slider.
- **Fix:** MATH-US to recompute; change the copy to "set a state tax rate".

### CONTENT-20: Pages promise calculator capabilities that don't exist
- **Severity:** S3 / Verified / Reach: High / NEW
- **Cases:**
  - The childcare cliff page (line 60) promises you can find the pension contribution that keeps adjusted net income below £100k. The tool never shows adjusted net income.
  - The 60% trap banner keys off gross salary (`SalaryUkCalc.tsx:196`). It stays on after a pension takes adjusted income below £100k and still says "Consider salary sacrifice" (`:439-442`).
  - The pension input is a percentage only (`:382`).
  - Pay-rise-UK (line 78) says the tool shows "exactly what any rise is worth"; neither salary tool has a before/after mode.
- **Fix:** Soften the copy now and build the missing tools (CONTENT-31).

### CONTENT-21: Content-cluster gaps and a pension-vs-ISA contradiction
- **Severity:** S3 / Verified / Reach: High / NEW
- **Gaps:**
  - The UK hub doesn't link to the trap, cliff or pay-rise pages (`uk-take-home-pay.astro:178,232-240`).
  - The stamp duty first-time-buyer page has only 2 inbound links.
  - The pension-vs-ISA verdict ("fill ISA before more pension", "guaranteed 100% return") contradicts the 60% trap and childcare cliff advice for £100k-£125k earners, and doesn't link to them.
  - "Related Scenarios" shows the first 4 entries for the same tool in collection order.
  - The comparison sidebar is the same on every page.
- **Fix:** Add hub links, add a £100k exception to the pension-vs-ISA verdict, and make related links topical.

### CONTENT-22: Semantic cannibalisation
- **Severity:** S3 / Verified / Reach: Med / NEW
- **Clusters:**
  - "60% tax trap": 100k-salary-uk-tax (its description targets the trap) vs 60-percent-tax-trap-uk vs the childcare cliff page.
  - "$300k mortgage": 300k-mortgage-7-percent vs the hub's #300k row vs uk-300k-mortgage-payment.
  - "$100k/$75k after tax" (CONTENT-05).
- **Text overlap is low** (39-69 shared five-word sequences, `CONTENT/pair_overlap.tsv`). The problem is query overlap, not copied text.
- **Fix:** Narrow the scope of each page.

### CONTENT-23: Mobile hub tables hide the answer columns
- **Severity:** S3 / Verified / Reach: High / NEW
- **At 390px:**
  - UK hub: take-home (year) is cut off; take-home (month) and effective rate are off-screen.
  - Mortgage hub: the 6.5% and 7% columns are off-screen.
  - Investment hub: no figure at all in the first viewport.
  - None of the tables gives a cue that it scrolls sideways.
- **Evidence:** `CONTENT/shots/CONTENT-01-uk-hub-390.png`, `-03-mortgage-hub-390.png`, `-04-invest-hub-390.png`
- **Fix:** Put the key column second, add a scroll cue, and add a one-line summary above each table.

### CONTENT-24: Plan 5 start date
- **Severity:** S3 / Verified / Reach: Med / NEW
- **Where:** `plan-5-student-loans-explained.md:19,32,54`
- **Problems:**
  - The page says "the first cohort made their first-ever deductions in 2026/27". GOV.UK says repayment starts "the April after you leave your course" (gov.uk/repaying-your-student-loan/when-you-start-repaying), so students on 3-year degrees from Sept 2023 start in April 2027.
  - The page omits that Welsh students stay on Plan 2 after 2023.
  - It is missing the Plan 2 threshold freeze from April 2027 and the Plan 5 RPI uprating.
- **Fix:** Add a "When will I start repaying?" section up top.

### CONTENT-25: Comparisons are exposed to AI Overviews, with weak verdicts and few FAQs
- **Severity:** S3 / Verified / Reach: High / NEVER-FIXED
- **Evidence:**
  - 12 of 16 articles have High exposure to Google AI Overviews.
  - 5 verdicts score 1/3.
  - Only 1 of 16 articles has an FAQ.
  - The emergency-fund article renders its table headers as "Option A/B" (`[comparison].astro:46-49`).
  - The best articles (PCP, pay-off-debt) win on reproducible worked numbers.
- **Fix:** Turn verdicts into decision rules with thresholds, backed by a prefilled calculator.

### CONTENT-26: Dated and time-bombed claims
- **Severity:** S3 / mixed confidence / Reach: High / NEW
- **Aged facts:**
  - UK median "~£35k" (`50k-salary-uk-take-home.md:35`): ONS ASHE 2025 full-time median is £39,039. Verified.
  - NHS Band 8a cited for a £50k salary. Likely wrong.
  - SS average "$1,907 in 2025" is the 2024 figure. Likely.
  - Federal poverty line "$15,060 in 2024". Verified stale.
  - HYSA "currently 4-5%". Hypothesis.
- **Time bombs:**
  - US "2026" labels age on 1 Jan 2027; the sub-reviewer says IRS 2027 values were published on 5 Nov 2026.
  - UK "2026/27" labels age on 6 Apr 2027.
  - Two slugs carry "2026".
  - State pension "currently £241.30" (`salary-uk.md:104`).
- **Fix:** Generate year labels from the rates module, keep years out of slugs, and keep a list of non-rate facts to refresh.

### CONTENT-27: Small cross-surface inconsistencies
- **Severity:** S3 / Verified / Reach: Med / NEW
- **Cases:**
  - New York tax: the salary-us worked example shows $4,200 state/local *with* a 401(k) (`salary-us.md:55-60`), while the 75k scenario shows $3,702 *without* one.
  - The homepage tile "UK £500/mo" links to a dollar-only table.
  - Retire-at-55 sends its CTA to the retirement-age tool but its body to retirement-savings.

### CONTENT-28: Broken and soft-broken sources
- **Severity:** S3 / Verified / Reach: Med / NEW
- **Where:** `CONTENT/linkcheck.tsv` (33 URLs)
- **Results:**
  - **404:**
    - fca.org.uk/data/motor-finance-data (car-finance tool)
    - freddiemac DTI blog, which redirects to a 404 on myhome.freddiemac.com (affordability tool)
  - **Unreachable:** nrel.gov/docs/fy12osti/51664.pdf (solar tool).
  - **Soft-broken:** gov.uk/stamp-duty-land-tax/relief-for-first-time-buyers redirects to the generic SDLT page.
  - **403 (probably bot-blocking):** bls.gov, consumerfinance.gov ×2, ssa.gov.
  - **No external sources at all:** only 13 of 41 scenarios cite any.
  - **Sub-reports:** 8 broken methodology sources; 9 of 13 comparison sources are generic hub pages.
- **Fix:** A scheduled link check and claim-level citations.

### CONTENT-29: Tool-page copy follows a visible template
- **Severity:** S3 / Verified / Reach: Med / NEVER-FIXED
- **Pattern:** Every tool page uses "What Is a X? / How X Works / When to Use / Common Mistakes / What to Do Next", and "Key takeaway" boxes appear on 22 pages. Stock AI phrases are rare; the tell is the structure.
- **Fix:** Replace the generic sections with each page's best worked insight.

### CONTENT-30: Stale affiliate disclosure
- **Severity:** S3 / Verified / Reach: Low / NEVER-FIXED
- **Problems:**
  - The page is dated Feb 2026.
  - It lists partners that declined or were never applied to, as "has or intends to establish".
  - Individual paid links aren't labelled.
  - The "not on commission rates" line is repeated as boilerplate.
- **Fix:** List only active programmes and label paid links.

### CONTENT-31: Missing content the personas need next
- **Severity:** S3 / gap analysis / Reach: High / NEW
- **Gaps:**
  1. **After the 60% trap and childcare cliff:** an adjusted-net-income / salary-sacrifice planner. It should give the pension contribution needed to reach £100k, the tax saved, and the childcare support kept (the £2,000 Tax-Free Childcare top-up plus funded hours). It should also model the £2,000 salary-sacrifice NI cap from April 2029.
  2. **After the pay-rise pages:** a before/after offer mode with a marginal-rate curve.
  3. **After Plan 5:** a start-date explainer and a lifetime repayment vs write-off projection.
  4. **After the first-time-buyer stamp duty page:** a UK first-home cost stack (SDLT, LISA with the 20% charge, 25-year mortgage at ~6%) and a UK mortgage hub on 25-year terms.
  5. **After retire-at-55:** a UK early-retirement page (pension access 55, rising to 57 in 2028, with an ISA bridge). UK_PENSION_AGES already exists in the code.
  6. **Ahead of rollovers:** 2027 and 2027/28 hub versions, plus a "what changes in 2027" page.

### CONTENT-32: Nits
- **Severity:** S4 / Verified / Reach: Low
- **Items:**
  - About and /tools/ meta say "44 tools"; there are 46.
  - UK spellings on US pages: "maths", "centres". Also "a 8.1×".
  - The CGT page says the 60-day reporting rule applied "since 2020"; it was 30 days until Oct 2021.
  - Small numeric drifts, for MATH-US: credit card 80 vs 79 months; $14,421 vs $15,120; $7,471 vs $7,441; 106 vs 105 months; $165.53 vs $172; $1,376 vs $1,393; $3,065 vs $3,056; $403,874 vs $403,870.
  - The 50k UK page links to the hub's #45k row instead of #50k.
  - On mobile the breadcrumb repeats the full H1.

## What works well (verified)
1. **The doorway problem is fixed** (107 pages measured). The median scenario's template share is 6.7% and topical reuse is 1.7%, against 44-53% in July. Files: `CONTENT/boilerplate_share.tsv`, `pair_overlap.tsv`, `shingle.py`.
2. **The July pages are strong.** I recomputed their key figures and all reproduce: £78,111 / £42,516; £6,250 / £11,250; £5,250; £23,280 / £22,063.80; $7,670 / $13,170; $17,588. They cover real traps.
3. **The answer is in the first viewport** on all 16 scenario and comparison pages, at both sizes. UK pages show a 2026/27 tax-year pill.
4. **Figures are consistent across hubs, homepage and scenarios on the same assumptions:** £39,520 / £3,293, $79,180 / $6,598, $811,650, $86,542, $1,896.
5. **Dates match git history** in all 9 pages sampled.
6. **Anchors scroll correctly.** All 9 anchors tested land fully visible, 111px below the header, in both themes.
7. **From the sub-reviewers:** the stamp-duty, car-finance and solar methodology pages reproduce. The PCP comparison is exact to the penny.

## Out-of-lane observations
- **HOME-CHROME:** The cookie banner says "no tracking" while it gates GA4. The privacy policy claims numbers are never transmitted, and names MailerLite but not MailerSend.
- **CALC-UX-A:** On the salary-uk page at 390, the sticky result bar overlaps the breadcrumb.
- **A11Y-PERF:** One console error appears on every page. The accessibility statement makes two claims ("every commit axe-tested" and "tables alongside every chart") that need verifying.
- **GROWTH-SEO:** All methodology pages share one meta description. The comparison sidebar isn't topical. Old scenarios have no citations.
- **MATH-US:** CONTENT-01, CONTENT-19, and the drifts in CONTENT-32.
- **MATH-UK:**
  - CONTENT-04, 08 and 09.
  - Student loan repayments are charged on salary before salary sacrifice; HMRC says after (CSLM16030, from the sub-reviewer).
- **Affiliates:** Betterment appears on the UK rental page, and a US-only affiliate appears on the fixed-vs-variable UK page.

## Coverage
**Done:**
- **Hubs:** all 4 read in full. Table vs prose vs embedded calculator checked on 8 pages. 36 anchor landings tested.
- **Scenarios:**
  - All 41 text-extracted, with duplication measured across all 107 pages.
  - About 15 read in full.
  - The rest checked by frontmatter, opening paragraph and a search for dated phrases; 10 headline figures recomputed.
- **Comparisons and methodology:** all 16 comparisons and all 23 methodology pages reviewed by the sub-reviewers. I read pension-vs-isa myself and spot-checked 3 methodology S1s in code.
- **Static pages:** about, author, disclosure, accessibility and privacy read.
- **Tool pages:** 8 financial tool pages checked (headings, worked examples, dated-claim search); 3 worked examples recomputed.
- **Screenshots and links:** 44 landing screenshots; 33 external URLs checked by me, more than 60 in total including the sub-reviewers'.

**Not done:**
- No live-site loads and no Slow-4G timing.
- About 27 older scenarios were not read line by line, and the tool FAQs were not fully fact-checked.
- No SERP or competitor comparison.
- The Fed survey PDF was not parsed (pypdf is missing).
- The government sites that returned 403 were not re-checked in a browser.
- Current savings-account rates and the 2027 IRS figures were not verified.
