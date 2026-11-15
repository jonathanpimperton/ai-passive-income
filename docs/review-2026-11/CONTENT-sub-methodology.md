# CalcRun -- "How we calculate" methodology pages: sub-review

Reviewer: CONTENT sub-reviewer (methodology). Review date 9 Nov 2026. Repo read-only; content last edited 7 Jul 2026.
Scope: all 23 pages in `src/data/methodologies/*.md`, rendered by `src/pages/how-we-calculate/[tool].astro`.
I spot-checked the built HTML (`dist/how-we-calculate/*/index.html`) and it matches the source for every claim quoted below.

Method: I read every page in full. I read the calculator component and lib code behind each one. I re-ran the code's math in
standalone Python replicas (scratch scripts in `.../sub-methodology/scripts/`: `cc.py`, `ex.py`, `rvb.py`, `fee.py`, `loan.py`,
`aff.py`, `uk.py`) and checked figures against primary sources. Every link was fetched at about 1 request per second (`links.tsv`).
When curl got a 403, I re-checked the URL with WebFetch.

Severity scale used. S1 means the page states a rule that is wrong, or that the tool does not apply, so the result shown for the
user's own inputs is wrong or misrepresented. S2 means the page is materially misleading: wrong worked-example money figures, or a
misdescribed method, while the tool itself computes correctly. S3 is minor. S4 is a nit.

Code paths are relative to `<repo>/src/`. Page line numbers are file lines in `src/data/methodologies/<slug>.md`.

## Per-page summary

| slug | explains method 0-3 | drift issues | dated issues | sources ok/total |
|---|---|---|---|---|
| salary-uk | 2 | S-prefix does not switch to Scottish bands; SD0/SD1 mapped to wrong rates (MTH-03); personal pension described as relief-at-source/post-tax but code uses net-pay (MTH-06); student loan charged on pre-sacrifice pay (MTH-11); 60% flag uses gross (MTH-33) | "2026/27" AT-RISK 6 Apr 2027; hand-copied values (MTH-24) | 4/4 |
| salary-us | 2 | OBBBA overtime deduction not modelled or disclosed; auto overtime above 40 hrs not described (MTH-12) | 2026 values correct, but 2027 successors were published 14 Oct and 5 Nov 2026, AT-RISK 1 Jan 2027 (MTH-24) | 2/3 (SSA unverifiable, bot-blocked) |
| stamp-duty | 3 | omits 2% non-resident surcharge and the GBP40k floor (code surcharges below it); MDR date wrong (MTH-23) | "unchanged for 2026/27" AT-RISK 6 Apr 2027 | 2/3 (FTB link soft-broken) |
| capital-gains-tax | 1 | US long-term method described as one rate on the whole gain; code slices across brackets (MTH-07); NIIT MAGI proxy undisclosed (MTH-13) | 2026 brackets AT-RISK 1 Jan 2027 | 5/5 |
| mortgage-payment | 1 | page says PMI 0.5% default, code hard-codes 0.7% (MTH-05); HOA in formula but no HOA input; "1 to 50 year" terms vs 3 fixed buttons (MTH-09); UK/EUR mode undocumented (MTH-10) | none | 1/2 (Freddie Mac 404) |
| mortgage-affordability | 1 | page says it applies min(28% front-end, 36% back-end); code applies only one 36% limit (MTH-02); PMI 0.7% vs 0.5%; "no HOA" vs HOA input (MTH-15); UK mode undocumented (MTH-10) | none | 1/2 (Freddie Mac 404) |
| credit-card-payoff | 2 | worked example wrong by about 2.7x (MTH-04); 600 vs 1,200-month cap (MTH-28) | none | 1/2 (CFPB 404) |
| debt-payoff | 2 | matches code; misattributes research to HBS (MTH-31) | none | 1/2 (CFPB link is a debt-collection page) |
| retirement-savings | 2 | example uses annual compounding against monthly code (MTH-20); UK milestones undocumented (MTH-10); inflation limitation wrong (MTH-35) | catch-up "$7,500 in 2024" AGED (MTH-21) | 2/3 (SSA unverifiable) |
| retirement-age | 2 | worked example wrong (32/25 yrs vs 29.8/22.7) (MTH-18) | none | 1/2 (SSA unverifiable) |
| retirement-contribution | 3 | examples verify ($555/$880); "$533K" uses annual compounding (MTH-20) | none | 1/2 (SSA unverifiable) |
| compound-interest | 3 | examples use annual compounding against the monthly default (MTH-20) | none | 2/2 |
| investment-return | 3 | "$475K" example wrong, tool gives $366K (MTH-19) | "savings 4-5%" aging | 1/2 (Vanguard 404) |
| investment-fee | 1 | page says annual compounding, code compounds monthly; formula wrong as written; table not reproducible; $173K vs $275K (MTH-08) | none | 0/3 |
| loan-amortization | 3 | minor example drift (MTH-29) | none | 2/2 (CFPB "mortgage math" page has no math) |
| savings-goal | 3 | "$75/month" vs $94 (MTH-30) | "HYSA 4-5% (as of 2025)" AGED | 2/2 |
| emergency-fund | 2 | page says iterative with growth on current savings; code is closed-form and ignores that growth (MTH-22) | "today's 4-5%" AGED | 2/2 |
| inflation | 2 | 2024 CPI wrong; "$63,000" example wrong (MTH-16) | "2025 CPI is an estimate" AGED: published 321.9, code 319.0; no 2026 | 3/3 |
| net-worth | 2 | generic but accurate | none | 2/2 |
| roi | 3 | matches code | none | 1/2 (CFA 404) |
| rent-vs-buy | 1 | the stated net-position rule double-counts the down payment and the renter's contributions, which flips the default verdict (MTH-01); buyer surplus not invested; transaction-cost claim contradicts the model (MTH-14); UK mode undocumented (MTH-10) | none | 3/3 |
| solar-payback | 3 | battery self-consumption computed once (MTH-36) | Ofgem 24.5p AGED (cap 26.32p ex-VAT, Oct-Dec 2026); 0% VAT AT-RISK 31 Mar 2027 (MTH-17) | 2/4 (NREL domain dead; Ofgem page has no rates) |
| car-finance | 3 | APR/12 applied to UK representative APR (MTH-27); example within GBP40 of tool | none | 2/3 (FCA 404) |

Counts: S1 = 3, S2 = 5, S3 = 19, S4 = 9 (36 findings).

---

## S1

### MTH-01 Rent vs Buy: the stated "net position" rule double-counts cash and flips the default verdict to "rent"
- Severity S1 / Confidence Verified / Class WRONG (method and code agree, and both are wrong)
- Where: rent-vs-buy.md:69 ("for buying ... home equity ... minus all costs paid. For renting ... portfolio value minus all rent and insurance paid"), :5. Code: components/tools/RentVsBuyCalc.tsx:123 (`totalBuyCost = downPayment`), :127 (`renterInvestment = downPayment`), :155 (only the renter invests the monthly difference), :174 (`netCostBuy = totalBuyCost - equity + downPayment`), :177 (`netCostRent = totalRentCost - (renterInvestment - downPayment)`), :200 (verdict).
- Evidence: both households start with the same cash and spend the same each month. The renter invests the down payment (DP) plus the monthly difference. The correct comparison is therefore ending equity vs ending portfolio. The code's rule is `netCostBuy - netCostRent = (portfolio - equity) + DP + sum(monthly diffs)`, so buying is penalised by the renter's entire contribution total. A replica of the code at its defaults ($350k home, 20% down, 6.5%, 10 yrs, rent $1,800) produced:
  - Tool output: buy net cost $174,033 vs rent $145,551, so "renting wins" by $28.5k.
  - Actual year-10 positions: buyer equity $232,998 vs renter portfolio $173,869. The buyer is $59k better off on essentially equal cash outlay, so the verdict flips.
  - GBP mode at the same inputs: the tool says rent wins by $118k, but equity is $233.0k vs portfolio $226.4k, so buy narrowly wins.
  - A second bias points the same way. When rent exceeds the buy cost (later years), the buyer's surplus is never invested: $1,984 by year 10, $218k by year 30.
  - Script: `scripts/rvb.py`.
- Fix direction: compare ending equity against ending portfolio, with both sides investing any monthly surplus. Then rewrite :5 and :69 to state that rule.

### MTH-02 Mortgage Affordability: the page promises min(28% housing, 36% total) DTI; the tool applies only a single 36% limit
- Severity S1 / Confidence Verified / Class DRIFT
- Where: mortgage-affordability.md:5 (formula built on the Front-End DTI), :28-30, :64 ("applies both constraints and uses the more restrictive one"), :94. Code: components/tools/MortgageAffordabilityCalc.tsx:59 (`dtiLimit: 36`), :120 (`maxTotalHousing = grossMonthlyIncome * (dtiLimit/100) - monthlyDebt`). There is no front-end check anywhere.
- Evidence ($80k income, $40k down, 6.75%, 30 yr, 1.2% tax, $1,500 insurance):
  - With $500/month debts the two methods nearly coincide: tool $259,547 vs page method $255,329.
  - With $0 debts: tool $322,817 vs page method $255,329, a $67.5k (+26%) higher ceiling than the page says.
  - The page also sells the result as the "conservative" 28/36 figure (:94-96).
  - Script: `scripts/aff.py`.
- Fix direction: either add the 28% housing cap to the solver, or rewrite the page and formula to say that one combined DTI limit (default 36%) is applied.

### MTH-03 UK Salary: the "S prefix: Scottish bands apply" rule is not implemented, and Scottish D-codes use the wrong rates
- Severity S1 / Confidence Verified / Class DRIFT + WRONG
- Where: salary-uk.md:105 ("S prefix: Scottish bands apply"), :102. Code: components/tools/SalaryUkCalc.tsx:72 (strips S/C and returns only an allowance), :111 (bands depend solely on the `isScottish` toggle), :66 (`SD0` -> 40%), :68 (`SD1` -> 48%). SD2/SD3 are unrecognised and fall back to the standard calculation.
- Evidence:
  - A Scottish employee who enters their payslip code S1257L at £50,000 is taxed on rUK bands, £7,486. The correct Scottish 2026/27 figure is £8,982, so tax is understated by £1,496/yr (`scripts/uk.py`).
  - HMRC Scottish codes are SBR 20%, SD0 21%, SD1 42%, SD2 45%, SD3 48%. The tool's SD0 overcharges a second job by 19 points, and SD1 overcharges by 6 points.
  - The Scottish band data itself is correct. gov.scot 2026-27 shows Starter £12,571-16,537, Basic -29,526, Intermediate -43,662, Higher -75,000, Advanced -125,140, Top above (https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/, accessed 9 Nov 2026), and this matches uk-rates.ts:136-145.
  - Sources: https://www.litrg.org.uk/tax-and-nic/how-tax-collected/pay-you-earn-paye/special-paye-codes and https://www.gov.uk/hmrc-internal-manuals/paye-manual/paye11025 (accessed 9 Nov 2026).
- Fix direction: an S prefix should set Scottish mode. Map SBR/SD0/SD1/SD2/SD3 to 20/21/42/45/48%. Otherwise delete the claim at :105.

## S2

### MTH-04 Credit Card Payoff: the headline "minimum payment trap" example is wrong by roughly 2.7x
- Severity S2 / Confidence Verified / Class WRONG
- Where: credit-card-payoff.md:57-60, :72. Code: components/tools/CreditCardPayoffCalc.tsx:47-116 (the simulation itself is correct).
- Evidence for $5,000 at 22.99% with a $100 fixed minimum, run through an exact replica of `simulatePayoff` (`scripts/cc.py`):

  | Figure | Page says | Tool computes |
  |---|---|---|
  | Month-12 interest | $88 | $94.81 |
  | Payoff time | "7+ years" | 167 months (13 yr 11 mo) |
  | Total interest | "$4,300+" | $11,694 |
  | +$50/month: interest saved | $2,435 | $8,649 (payoff 54 months, $3,045 interest) |
  | +$50/month: time saved | "4+ years" | 9.4 years |

  The page understates both the trap and the benefit of paying extra. This is borderline S1, because a user deciding whether to pay $50 extra is told the payoff is a quarter of the real one.
- Fix direction: regenerate the example from the tool's own function, and add a test that pins it.

### MTH-05 Mortgage Payment: the page says PMI defaults to 0.5% (with a $117/mo example); the tool hard-codes 0.7% with no input
- Severity S2 / Confidence Verified / Class DRIFT
- Where: mortgage-payment.md:23 ("PMI rate defaults to 0.5%"), :56 ("$117/month"), :14. Code: components/tools/MortgagePaymentCalc.tsx:247 (`principal * 0.007`). There is no PMI input.
- Evidence: on a $280k loan the tool shows $163/mo, not $117/mo, and the user cannot change the rate. The sister page uses the reverse values: affordability states 0.7% while its code defaults to 0.5% (see MTH-15).
- Fix direction: expose a PMI rate input, or state "fixed 0.7% estimate" and recompute the example.

### MTH-06 UK Salary: non-sacrifice pension described as relief-at-source / "post-tax", but coded as a net-pay arrangement
- Severity S2 / Confidence Verified / Class DRIFT
- Where: salary-uk.md:23 ("personal (post-tax, no NI reduction)"), :95 ("Deducted from net pay. Your pension provider claims basic rate tax relief ... Higher rate taxpayers must claim ... through self-assessment"). Code: components/tools/SalaryUkCalc.tsx:158-161 (both modes subtract the pension before income tax; comment "Both reduce taxable income for Income Tax").
- Evidence at £60k with 5% non-sacrifice:
  - The code taxes £57k (£10,232) and deducts £3,000, so take-home falls by £1,800.
  - A relief-at-source member's payslip shows tax £11,432 and a £2,400 net contribution, so take-home falls by £2,400.
  - The tool therefore shows £600/yr more than that member's payslip.
  - Below the Personal Allowance the net-pay treatment gives zero relief, while relief at source gives 20%.
  - The page describes one regime and the code implements the other.
- Fix direction: label the mode "net pay arrangement (pre-tax)", or add a relief-at-source option and describe both.

### MTH-07 Capital Gains Tax (US): the page describes one rate on the whole gain; the code correctly slices the gain across brackets
- Severity S2 / Confidence Verified / Class DRIFT (the page is wrong, the tool is right)
- Where: capital-gains-tax.md:5 ("Tax = gain x applicable rate"), :22, :62-63 ("Add gain to existing taxable income to determine which bracket applies ... Apply the applicable long-term rate ... to the gain"). Code: lib/capital-gains.ts:86-98 (per-slice `Math.max(bracketStart, taxableIncome)`, line 93).
- Evidence: single filer, $40,000 other taxable income, $20,000 long-term gain.
  - Page method: $60k total is above $49,450, so 15% x $20k = $3,000.
  - Tool: 0% on $9,450 plus 15% on $10,550 = $1,582.50.
  - An accountant following the page overstates the tax by about 90%.
  - The page also lists no 2026 long-term thresholds ($49,450 / $545,500 single, etc., which are in us-rates.ts:158-177), so it cannot be reproduced as written.
- Fix direction: describe the stacking and slicing, and print the threshold table.

### MTH-08 Investment Fee: the formula and compounding are misstated, the worked table is not reproducible, and the page contradicts itself
- Severity S2 / Confidence Verified / Class DRIFT + WRONG
- Where: investment-fee.md:5 and :57 (an annual-period formula with C described as the *monthly* contribution), :20 ("Returns compound annually"), :65-72 (table), :94 ("1% costs $173,000"). Code: components/tools/InvestmentFeeCalc.tsx:70 (`compoundInterest(..., years)`, which defaults to n=12, i.e. monthly).
- Evidence:
  - Taken literally, the formula adds only $500 a year in contributions instead of $6,000.
  - For $100k, $500/mo, 7% gross, 30 yrs, the tool gives final values $1,410,807 / $1,252,269 / $1,104,515 / $975,545 at 0.03/0.5/1/1.5% fees. The page gives $1.336M / $1.195M / $1.062M / $944k.
  - The tool's cost of a 1% fee is $306k, against the page's $275k. The page's own closing line then says $173k.
  - Script: `scripts/fee.py`.
- Fix direction: state monthly compounding with monthly contributions, regenerate the table from code, and remove the $173k line.

## S3

### MTH-09 Mortgage Payment: phantom HOA and loan-term claims
- S3 / Verified / DRIFT. Where: mortgage-payment.md:5 and :15-16 (HOA in the formula and variables), :58 ("supports terms from 1 to 50 years"). Code: components/tools/MortgagePaymentCalc.tsx:243-248 (no HOA term in `totalMonthly`), :348 (term buttons are only 15/20/30 for US and 20/25/30 for UK/EUR).
- Fix: remove HOA and the 1-50 year claim, or add both features.

### MTH-10 Geo-aware modes are undocumented on every methodology page
- S3 / Verified / DRIFT (omission).
- Code behaviour in GBP/EUR mode:
  - MortgagePaymentCalc.tsx:243-246 zeroes property tax, insurance and PMI.
  - MortgageAffordabilityCalc.tsx:71-74 and :114-117 drop tax, insurance, HOA and PMI, and :569-572 add a UK 4.5x loan-to-income warning.
  - RentVsBuyCalc.tsx:51-57 relabels property tax as council tax and HOA as service charge, and :144 switches off the mortgage-interest deduction.
  - RetirementSavingsCalc.tsx:42-60 swaps in UK pension-age milestones (55/57 and SPA 66/67).
- The pages are US-only: mortgage-payment.md, mortgage-affordability.md, rent-vs-buy.md:42, retirement-savings.md:64-70. A UK reader gets a method that is not the one applied to them.
- Fix: add a short "UK / EUR mode" section to each page.

### MTH-11 UK Salary: student loan is charged on pre-sacrifice salary
- S3 / Verified / WRONG (code), page silent. Code: components/tools/SalaryUkCalc.tsx:168 (`calcStudentLoan(salary, ...)`).
- HMRC CSLM16030 says repayments are based on earnings "as would be calculated for employer's secondary Class 1 NICs", and salary sacrifice reduces those earnings (https://www.gov.uk/hmrc-internal-manuals/collection-of-student-loans-manual/cslm16030, accessed 9 Nov 2026). Example: £40k with 5% sacrifice on Plan 2 overcharges by £180/yr.
- The page (salary-uk.md:79, :93) says sacrifice saves "income tax and NI" and never mentions loans.
- Fix: compute student loan on the post-sacrifice figure and say so on the page.

### MTH-12 US Salary: the OBBBA overtime deduction is not modelled or disclosed; automatic overtime above 40 hours is not described
- S3 / Verified / DRIFT (omission).
- The page cites the OBBBA-amended 2026 IRS release (salary-us.md:41) and offers an overtime input (:95-101), but federal tax ignores the 2025-2028 qualified-overtime deduction. That deduction covers the premium half, up to $12,500 ($25,000 joint), phasing out above $150k/$300k MAGI (IRS FS-2026-13 / Notice 2025-69; summary at https://taxschool.illinois.edu/post/obbba-update-qualified-tips-and-overtime-compensation-for-tax-year-2025/, accessed 9 Nov 2026).
- The tips and senior deductions are not mentioned either. The limitations (:30-38) list credits and itemizing, but not these.
- The code also treats any hours above 40 as overtime (components/tools/SalaryCalc.tsx:80-81), and applies state tax to gross minus 401(k) (:92). The page (:97-99) describes neither.
- Fix: add a limitation line, or model the premium-half deduction; document the 40-hour split.

### MTH-13 Capital Gains Tax: NIIT uses taxable income as a MAGI proxy without saying so
- S3 / Verified / DRIFT. Code: lib/capital-gains.ts:13-14 and :102 (`totalAgi = taxableIncome + gain`). The page (capital-gains-tax.md:23, :64) says "modified AGI".
- Because taxable income sits below MAGI by at least the standard deduction ($16,100 single), NIIT can be understated by up to about $612 for filers near the threshold.
- Fix: disclose the proxy, or take AGI as the input.

### MTH-14 Rent vs Buy: secondary method contradictions
- S3 / Verified / DRIFT.
- rent-vs-buy.md:83 says buying "almost always loses over 1-3 years because of the transaction costs", but the model has none (:44, :48).
- The buyer's surplus is never invested (RentVsBuyCalc.tsx:153-157; see MTH-01).
- The deduction is applied at the full marginal rate on all interest, with a 22% default (:144). This is disclosed (:49), but at defaults it is worth about $3.5k/yr and is mostly fictitious for single filers below the $16,100 standard deduction.
- Fix: correct the text, invest the buyer's surplus, and default the deduction to off or make it itemizing-aware.

### MTH-15 Mortgage Affordability: PMI and HOA statements contradict the code
- S3 / Verified / DRIFT.
- PMI: the page says 0.7% (mortgage-affordability.md:31, :41), while the code defaults to 0.5% (MortgageAffordabilityCalc.tsx:60).
- HOA: the page says "No HOA fees ... are included" (:34, :37), but there is an HOA input in the solver (:116, :150).
- Fix: align the text with the code.

### MTH-16 Inflation: CPI table is aged and partly wrong; worked examples do not match the tool
- S3 / Verified / AGED + WRONG.
- The code has CPI-U 2024 = 313.0 and 2025 = 319.0 "estimate" (components/tools/InflationCalc.tsx:45). The Minneapolis Fed table lists 2024 = 313.7, 2025 = 321.9 and 2026 est. = 333.2 (https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-, accessed 9 Nov 2026).
- The page still says "2025 CPI value is an estimate" (inflation.md:31) and covers "1913 to 2025" (:21, :45).
- inflation.md:67 says "$45,000 in 2010 is equivalent to about $63,000 in 2025". The tool gives $65,818 and the published CPI gives $66,416.
- Fix: refresh the CPI table (add 2025 actual and a 2026 YTD/estimate), recompute the examples, and add the CPI data to the freshness guard.

### MTH-17 Solar Payback: UK tariff aged, VAT expiry at risk, escalation arithmetic wrong
- S3 / Verified / AGED + AT-RISK + WRONG.
- Tariff: solar-payback.md:92 and :94 use 24.5p/kWh (the UI hint "Ofgem cap ~24.5p/kWh (Q2 2026)" is at SolarPaybackCalc.tsx:272). The Ofgem cap for 1 Oct-31 Dec 2026 is 26.32p/kWh with a 54.83p/day standing charge, "does not include VAT from 1 October 2026 to 31 March 2027" (https://www.ofgem.gov.uk/publications/changes-energy-price-cap-between-1-october-and-31-december-2026, accessed 9 Nov 2026).
- VAT: :108 "0% until March 2027" is true today but expires on 31 Mar 2027, after which it is 5% (GOV.UK VAT Notice 708/6: https://www.gov.uk/guidance/vat-on-energy-saving-materials-and-heating-equipment-notice-7086, accessed 9 Nov 2026).
- Arithmetic: :98 says "24.5p becomes 33.5p after 10 years and 45.8p after 20". At 3% the correct figures are 32.9p and 44.3p.
- Fix: refresh the tariff with a dated label, and add an expiry note on VAT.

### MTH-18 Retirement Age: worked example wrong
- S3 / Verified / WRONG. retirement-age.md:65 says reaching $1M from $50k with $500/mo takes "about 32 years" at 7% and "about 25" at 10%. The tool's solver gives 29.8 and 22.7 years (`scripts/ex.py`). The "7 years" difference and the "8-10 years" for doubling (9.4) are fine.
- Fix: regenerate the example from code.

### MTH-19 Investment Return: worked example wrong
- S3 / Verified / WRONG. investment-return.md:63 says the gap between $200 and $500/mo at 7% over 30 yrs is "roughly $475,000". The tool's math gives $365,991.
- Fix: recompute.

### MTH-20 Compound-growth examples assume annual compounding while the tools default to monthly
- S3 / Verified / DRIFT. The tool defaults to monthly (CompoundInterestCalc.tsx:155; RetirementSavingsCalc.tsx:103).
  - compound-interest.md:52: $10k at 5%/7% over 30 yrs is given as $43,219 / $76,123. The tool gives $44,677 / $81,165.
  - retirement-savings.md:56 and retirement-contribution.md:53: "$50k ... 35 years ... ~$533,000". With monthly compounding, as both pages assume (:22/:18), it is $575,308.
  - compound-interest.md:64: age 25 vs 40 is "roughly twice the compounding time". It is 40 vs 25 years to 65, i.e. 1.6x.
- Fix: recompute under monthly compounding, or label the figures "annual compounding".

### MTH-21 Retirement Savings: 401(k) catch-up figure is two years stale
- S3 / Verified / AGED. retirement-savings.md:67 says "$7,500 extra for 401(k) in 2024".
- For 2026 the figures are $8,000, and $11,250 for ages 60-63 (IRS: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits, accessed 9 Nov 2026). salary-us.md:38 and us-rates.ts:95 already say $8,000.
- Fix: source the figure from us-rates.ts.

### MTH-22 Emergency Fund: timeline method misdescribed; code ignores growth on existing savings
- S3 / Verified / DRIFT.
- The page (emergency-fund.md:5, :54) says the timeline is solved iteratively using `PV(1+r/12)^m + PMT...`.
- The code (EmergencyFundCalc.tsx:103-106) instead uses a closed form, `ceil(log((Target-PV)*r/PMT + 1)/log(1+r))`, which treats only contributions as growing and earns no interest on current savings.
- Fix: include the PV growth term (or iterate) as the page describes.

### MTH-23 Stamp Duty: material omissions and one wrong date
- S3 / Verified / WRONG + omission.
- Non-resident surcharge: the page never mentions the 2% surcharge for non-UK residents, which sits on top of all residential rates including the higher rates.
- £40k floor: the higher rates do not apply below £40,000, but the code applies the 5% surcharge at any price (lib/stamp-duty.ts:45).
- MDR date: stamp-duty.md:19 says "multiple dwellings relief was abolished April 2024". The correct date is effective-date transactions on or after 1 June 2024.
- Sources: GOV.UK higher rates page (https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property, accessed 9 Nov 2026) for the surcharge and floor; https://twmsolicitors.com/?p=17836 and other practitioner notes for the MDR date.
- Fix: add the two rules (and the floor to the code), and correct the date.

### MTH-24 Tax-year values: US successors already published; UK rollover risk; page values are hand-copied and outside the freshness guard
- S3 / Verified / AT-RISK.
- US: salary-us.md and capital-gains-tax.md state 2026 values, which are correct today. The IRS published 2027 values on 5 Nov 2026 (IR-2026-133: single standard deduction $16,600, MFJ $33,200, HoH $24,925, single 12% band from $12,800, https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts). The SSA announced the 2027 wage base of $192,300 on 14 Oct 2026 (https://www.journalofaccountancy.com/news/2026/oct/social-security-wage-base-and-cola-announced-for-2027/). Both accessed 9 Nov 2026. The pages go stale on 1 Jan 2027.
- UK: the "2026/27" labels on salary-uk, stamp-duty and capital-gains-tax expire on 6 Apr 2027. Plan 2 stays frozen at £29,385 from Apr 2027, while Plan 1/4 thresholds and the Scottish bands will move.
- Guard gap: scripts/check-rates-freshness.mjs checks only `UK_TAX_YEAR` / `US_TAX_YEAR` / last-checked dates in uk-rates.ts and us-rates.ts. The markdown hard-codes the figures, and no test reads it, so bumping the rates files leaves the methodology pages wrong.
- Hypothesis: one secondary source reports a UK Budget on 28 Oct 2026 with 2027/28 changes. It is unconfirmed, and the owner should check it.
- Fix: render the rates on these pages from uk-rates.ts and us-rates.ts, or add a crosscheck test over the markdown.

### MTH-25 Data sources: 8 broken, 3 soft-broken or mismatched (see links.tsv)
- S3 / Verified / BROKEN. All accessed 9 Nov 2026.
- Hard 404s:
  - Freddie Mac x2 (mortgage-payment.md:39, mortgage-affordability.md:47)
  - Vanguard x2 (investment-fee.md:39, investment-return.md:36)
  - CFA Institute (roi.md:37)
  - FCA motor finance data (car-finance.md:45)
- 404 via WebFetch (curl 403):
  - SEC fees guide (investment-fee.md:35)
  - CFPB credit-card interest (credit-card-payoff.md:32)
- Dead domain: NREL PDF (solar-payback.md:57). www.nrel.gov returns NXDOMAIN after the Dec 2025 rename; the same PDF is live at https://docs.nlr.gov/docs/fy12osti/51664.pdf.
- Soft or mismatched:
  - GOV.UK first-time-buyer relief redirects to the generic SDLT overview (stamp-duty.md:32).
  - The Ofgem link lands on an explainer with no rates (solar-payback.md:55).
  - The CFPB "Paying Down Debt" link is a debt-collection-rights page (debt-payoff.md:32).
  - The CFPB "Mortgage Math" link (loan-amortization.md:29) is a buying guide with no math.
- Unverifiable (bot-blocked to both tools): SSA x2 and Morningstar.
- Fix: replace or repoint these links, and add external-link checking to the QA gate (qa-link-check.mjs checks internal links only).

### MTH-26 Boilerplate and template-level E-E-A-T gaps
- S3 / Verified / BOILERPLATE.
- Copied across pages (counts from `scripts/boiler.py` over 310 list items):
  - "Contributions are made at the end of each month" appears on 4 pages (retirement-age:19, retirement-contribution:19, retirement-savings:23, savings-goal:19).
  - "Returns compound monthly" and "No withdrawals before retirement" each appear on 3.
  - "Does not model employer matching contributions" appears 3 times.
  - credit-card-payoff:22 and debt-payoff:22 share the 600-month line (which is false for credit cards; see MTH-28).
  - retirement-age:29 carries "Does not account for catch-up contributions", which is irrelevant to a solve-for-time page.
- Duplicated within the same page (an assumption restated as a limitation):
  - salary-us:24 vs :31
  - solar-payback:37/:52, :38/:49, :39/:47 and :43/:46
  - rent-vs-buy:43/:50 and :44/:48
  - capital-gains-tax:28/:36
  - retirement-savings:27/:35 and retirement-contribution:23/:31
- Template ([tool].astro:34, :50): every page gets the identical meta description and subtitle. There is no "last reviewed" date, tax-year badge, byline or Article/dateModified JSON-LD (the built page has BreadcrumbList only). The scenario and comparison pages got all of these in Phase 3.
- Marketing filler: 16 of 23 pages end with "Why This Calculator Exists".
- Fix: dedupe, then add reviewed-date, tax-year and byline to the template.

### MTH-27 Car Finance: APR/12 used as the monthly rate for UK "representative APR"
- S3 / Likely / DRIFT (undisclosed simplification).
- car-finance.md:16 and :64 state APR/12, matching lib/car-finance.ts:24. UK consumer-credit APR is an annual effective rate, so the monthly rate is (1+APR)^(1/12)-1 (0.636% vs 0.658% at 7.9%). The payment is slightly overstated (a few pounds a month).
- Fix: convert the effective APR, or disclose the simplification.

## S4

- **MTH-28 Credit card cap and wording.** The page says 600 months (credit-card-payoff.md:22); the code uses 1,200 (CreditCardPayoffCalc.tsx:65). :86 says interest is on the "ending balance", but the code uses the opening balance (:68). Verified.
- **MTH-29 Loan amortization example drift.** loan-amortization.md:46 says "$95/month ... $34,200"; actual $97.55 / $35,119. :64 says "+$200 saves ~$95,000"; actual $103,449 over 6.9 yrs. :58 says "70-80% of each payment goes to interest" in year 1; at 6.5% it is 86%. Verified (`scripts/loan.py`).
- **MTH-30 Savings goal and emergency fund.** savings-goal.md:56 says the $5k head start saves "~$75/month"; actual $94.36. :58 "HYSA 4-5% (as of 2025)" and emergency-fund.md:28 "today's 4-5%" are AGED (Likely). emergency-fund.md:94 "roughly 40% can't cover $400" is close to the 37% implied by the 2025 SHED (63% could; https://www.federalreserve.gov/consumerscommunities/shed.htm, accessed 9 Nov 2026).
- **MTH-31 Debt payoff attribution.** debt-payoff.md:71 says "Harvard Business School found". The cited HBR article is by Remi Trudel of Boston University (HBR is the publisher, not the researcher). Verified via WebFetch of the hbr.org link.
- **MTH-32 Car finance example.** car-finance.md:92-96 is within about £40 of the tool (Loan £30,509 vs £30,470; HP £32,322 vs £32,300). :84 says the PCP-vs-loan interest gap is "£1,600+"; the actual gap is £2,613. :82 says total interest rises "~60%" from 36 to 60 months; actual 68-70%. Verified.
- **MTH-33 UK salary 60% flag.** The trap flag tests gross `salary` (SalaryUkCalc.tsx:196), while the allowance uses salary minus pension. A £110k earner with 10% pension (adjusted net income £99k) is still told they are in the trap and advised to use salary sacrifice. Verified.
- **MTH-34 Inconsistent fee and interest figures.** The 1% fee's share of wealth is given as "25-30%" (investment-fee.md:46) and "20-25%" (investment-return.md:77); the tool gives 22.3%. mortgage-payment.md:52 says "over $100,000"; the actual 5.5% vs 7.0% lifetime gap is $98.3k. Verified.
- **MTH-35 Retirement savings wording.** retirement-savings.md:31 says the inflation adjustment is "not year-by-year compounding", but dividing by (1+i)^t is compounding. :70 says full retirement age 67 applies to "born after 1960"; it is born 1960 or later. Verified.
- **MTH-36 Solar step order.** solar-payback.md:72-79 puts the battery self-consumption step inside the "for each year" loop. The code computes it once on undegraded year-1 output (SolarPaybackCalc.tsx:97; lib/solar-payback.ts:17-33) and rounds it to a whole percent; neither is disclosed. Verified.

---

## Genuine strengths (up to 5)

1. **solar-payback.md:70-88** is a real step-by-step algorithm, including the battery-capture formula and payback-month interpolation. It maps line for line onto lib/solar-payback.ts:17-33 and :105-133, and a sceptical reader could rebuild it.
2. **car-finance.md:56-74 and :100-112** give closed-form PCP balloon and opportunity-cost formulas that exactly match lib/car-finance.ts:21-48. The worked example reproduces the tool to within about £40.
3. **stamp-duty.md:41-57 and :63** have ordered steps and a band table that reproduce lib/stamp-duty.ts exactly: £7,500 on £350k, and £5k / £10k / £30k at £400k for first-time / mover / additional buyers.
4. **compound-interest.md:16 and :32, plus investment-return.md:53-57,** are honest about implementation details. They disclose the PMT x 12/n conversion approximation, the Newton-Raphson 7% seed with $0.01 tolerance, and the 0-100 yr binary search, all matching lib/calculator-utils.ts:19-52 and :207-262.
5. **salary-uk.md:57-87 and salary-us.md:52-83** give full band, threshold, NI, student-loan and FICA tables. Every figure I checked matches uk-rates.ts / us-rates.ts and the primary sources (GOV.UK NI 2026-27 cat A 8%/2%; GOV.UK student loan thresholds; gov.scot 2026-27; IRS 2026 release; IRS 401(k) page). retirement-contribution.md:55 ($555 / $880 per month) also verifies exactly.

## Best / worst pages
- Best: stamp-duty, car-finance, solar-payback (runners-up: retirement-contribution, roi).
- Worst: rent-vs-buy (S1 flawed decision rule), mortgage-affordability (S1 phantom front-end cap), investment-fee (wrong formula, unreproducible table, 0/3 sources). Next worst: capital-gains-tax and mortgage-payment.
