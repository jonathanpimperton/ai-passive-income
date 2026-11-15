MATH-US: final report. The harness would not let me write findings.md (subagents can't write report .md files), so the full findings are below this summary. To file them, paste the whole message into `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-US/findings.md`. The scripts, outputs and screenshots are already in that folder. The preview server was up for the whole run, I made no live page loads, and the repo was not modified (`npx vitest run`: 365/365 pass).

## 1. Counts (46 findings after dedupe)
- **S1:** 5
- **S2:** 16
- **S3:** 20
- **S4:** 5

ID prefixes:
- **MATH-US-nn:** components and libraries (my own work).
- **MATH-US-Fnn:** freshness, IRS 2027 and stale market claims (fork).
- **MATH-US-Cnn:** recomputation of content figures (fork).

## 2. S1 and S2 findings

| ID | Sev | What's wrong | Confidence |
|---|---|---|---|
| 01 | S1 | Rent vs Buy verdict biased toward renting by at least the down payment. The down payment is counted twice, and the renter's own invested savings are counted as gains. Defaults say "renting saves $28,482"; correct accounting says buying is ahead by $61,238. At 7% it says renting saves $49,632, while the page's own worked example says buy +$45k. 100% cash with all inputs zero gives "renting saves you $350,000". The verdict is wrong in 16% of random input sets. Merges C02. | Verified (UI) |
| 02 | S1 | Credit card: when the payment doesn't cover the interest, it shows "costs $308 in interest, 100+ years" instead of "never". This triggers at the default $100 minimum for any balance over $5,220. Adding $50 shows "saves you $1". | Verified (UI) |
| C01 | S1 | retire-at-55 scenario headline says $1,214,400; correct is $1,501,378 (the $50k starting balance is ignored). All 9 figures on the page are wrong. | Verified |
| C04 | S1 | 50k-salary-hourly page: invented net hourly figure, 2025 tax rules, and wrong 401(k) savings and bracket claims. | Verified |
| C05 | S1 | Minimum-payment-trap content understated 2–3x. The methodology says "$4,300, 7+ yrs"; correct is $11,694 over 13y 11m. The $50k card-debt table is also wrong. | Verified |
| 03 | S2 | Debt payoff: a debt that never pays down shows "50 years" and "$39,952,282 interest", plus "Avalanche saves $39,850,368". The 600-month cap is not flagged. | Verified (UI) |
| 04 | S2 | Debt payoff: a blank rate gives "$NaN" in the totals and the email payload. An unnamed debt is silently left out. | Verified (UI) |
| 05 | S2 | Mortgage affordability applies only 36% back-end DTI, though its methodology says lenders use the lower of 28/36. Overstates by 16–26% for low-debt buyers ($80k income, $0 debts: $322,817 vs $255,329). Merges C12. | Verified |
| 06 | S2 | Affordability PMI solver oscillates near 20% down. About 10% of input sets don't converge and the result understates by up to 28%. $80k down gives $391,133, which is less than the $391,350 for $75k down; correct is $400,000. | Verified (UI) |
| 07 | S2 | Homepage "Can I afford this house?" shows $396,902, 27% above the full tool at the same inputs ($312,570). It spends 36% of gross income on principal and interest only. | Verified (UI) |
| 08 | S2 | Homepage "When can I retire?" (and RetirementAgeCalc): an unreachable target shows "Age 90 — 25 years of saving to reach $1,000,000"; the actual balance is $81k. | Verified (UI) |
| F01 | S2 | OBBBA overtime deduction not applied although the salary tool has an overtime input. Federal tax overstated by up to $3,000 ($2,059 at $36/hr with 10 OT hours, single). | Verified |
| F02 | S2 | Solar page examples and FAQ claim roughly 2x faster payback than the tool computes (UK default: "~11 yr" vs 20y 9m). Merges C03. | Verified |
| F03 | S2 | Rate-environment claims are now wrong: "5.5–6.5%" vs Freddie Mac PMMS 7.18% on 5 Nov 2026; the Fed raised in September 2026. | Verified |
| C06 | S2 | Debt payoff worked examples are impossible ("avalanche saves $2,340" where both strategies pay debts in the same order) or far off. | Verified |
| C07 | S2 | Extra-payment savings on mortgage and loan pages understated by 21–35% (+$200 on $300k: page says $76k, correct is $116,640). | Verified |
| C08 | S2 | Growth projections wrong on core pages (investment-return: $347k vs $201,937; compound-interest: $263k vs $365,991). | Verified |
| C09 | S2 | Index vs active fee-drag figures wrong ($49k vs $209,392). | Verified |
| C10 | S2 | Comparison conclusions contradict their own assumptions (15 vs 30 year, rent vs buy, Roth vs traditional). | Verified |
| C11 | S2 | 2025 tax rules and SCF 2019 net-worth data presented as current. | Verified |
| C13 | S2 | State-tax estimates on salary pages wrong (California "~30%" vs 21.6%). | Verified |

## 3. Top 3 strengths
1. **US tax engine is exact for 2026.** Federal tax and FICA matched my independent implementation at all 60,093 test points ($0.00 difference: every filing status, every bracket edge ±$1). All 18 hub rows match. Every 2026 constant matches Rev. Proc. 2025-32 except one head-of-household threshold ($2 maximum effect). All rates live in one file, us-rates.ts.
2. **The prior debt-rollover fix holds.** 10,000 random portfolios showed 0 mismatches against an independent constant-budget snowball/avalanche.
3. **The core engines are exact.** Mortgage amortization with extra payments: worst error $0.0000 over 20k cases. Monthly compounding: relative error 1.9e-11. Contribution and starting-amount solvers round-trip to 1e-16. The return-rate solver missed 0 of 20k. Car finance true cost equals the future value of all outflows. The solar library equals an independent year loop. The mortgage and investment hubs are exact to the dollar. Region gating is correct: PMI, property tax and insurance are zeroed outside USD, and the interest deduction is US-only.

## 4. Coverage gaps
- I did not submit email or PDF. The payload was inferred from the getResults code and the values shown in the UI.
- Chromium only; homepage also checked on Pixel 7. No WebKit or Firefox.
- NetWorth and EmergencyFund were code-read only, with no random grid.
- LoanAmortization and RetirementAge UIs were not driven; their shared libraries were verified.
- State tax spot-checked for California and New York only.
- UK-only pages excluded (MATH-UK's lane).
- The 2027 401(k)/IRA notice is not yet published, so those 2027 limits are unknown.

## 5. findings.md
Not written (blocked by the harness). The full content follows below. Supporting files:
- Scripts and outputs: `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-US/`
- Screenshots: `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-US/shots/`
- Content rows: `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-US/fork-content/rows.csv`

=====================================================================
# FULL FINDINGS (MATH-US)
Environment for all UI findings: preview http://127.0.0.1:4399, Chromium 1280x1000 via the shared harness, light theme, USD unless stated. Script names are relative to `C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-US/`, and screenshots are in `.../MATH-US/shots/`.

## A. Calculators and libraries

### MATH-US-01  Rent vs Buy biased toward renting by at least the down payment
- **Severity / Confidence / Reach / Tag:** S1 / Verified / High / NEW
- **Where:** /tools/debt-and-loans/rent-vs-buy/ (USD, GBP and EUR)
- **Repro:**
  1. Open at defaults: $350k home, 20% down, 6.5%, rent $1,800, 10 years.
  2. Headline: "Over 10 years, renting saves you $28,482".
  3. Set the rate to 7%: "renting saves you $49,632".
  4. Switch to GBP: "renting saves you £133,581".
- **Cause:**
  - RentVsBuyCalc.tsx:123 initialises `totalBuyCost = downPayment`, then :174 computes `netCostBuy = totalBuyCost − equity + downPayment`. The down payment is counted twice.
  - :177 computes `netCostRent = totalRent − (renterInvestment − downPayment)`. `renterInvestment` includes the monthly differences the renter paid in (:155-160), so those deposits count as gains.
  - The methodology describes the same accounting.
- **Expected:** compared with an independent same-budget net-worth model (rvb.mjs), using the site's cost items and no transaction costs.

  | Case | Site | Correct |
  |---|---|---|
  | Defaults | renting saves $28,482 | buying ahead by $61,238 |
  | 7% rate | renting saves $49,632 | buying ahead by $46,626 (tool page worked example says "≈$45,000") |
  | 5 years | rent by $63,930 | buy by $23,255 |
  | GBP | rent by £133,581 | buy by £5,870 |
  | Identical paths (100% cash, all inputs zero) | rent by $350,000 | $0 |

  - Over 20,000 random input sets the verdict is wrong in 16.0% of cases.
  - The content fork (C02) independently found the double count. Its fix (remove the second down-payment term) alone still leaves the renter's-deposits error.
- **Evidence:**
  - Screenshots: MATH-US-01-rvb-rate7-1280.png, MATH-US-01b-rvb-rate7-panel-1280.png, MATH-US-11-rvb-gbp-1280.png
  - Output: rvb-out.txt
  - The tool page's worked examples (tools/rent-vs-buy.md:35-56) all contradict the tool.
- **Fix:** compare end-of-horizon net worth, with the cheaper path investing the monthly difference. Count the down payment once. Add an "identical paths give 0" unit test.

### MATH-US-02  Credit card: "never pays off" shown as "costs $308 in interest, 100+ years"
- **Severity / Confidence / Reach / Tag:** S1 / Verified / Med-High / NEW
- **Repro:**
  1. Open /tools/debt-and-loans/credit-card-payoff/ with the default $100 fixed minimum at 22.99%.
  2. Set the balance to 8,000. Shown: "100+ years", Total Interest $308, Total Paid $100, and the trap banner "costs $308 in interest and takes 100+ years".
  3. Add $50 extra. The banner reads "Adding $50/mo extra saves you $1 in interest".
- **Expected:** monthly interest is $153.27, more than the payment, so the balance never falls and interest is unbounded. The site shows two months of interest.
  - $5,000 at a 1% minimum shows "$192, 100+ years".
  - $50,000 at 35% with a $100 minimum shows "$2,956".
- **Cause:** CreditCardPayoffCalc.tsx:86-95 returns `months: 1200` with the partial totals accumulated so far, and getResults() sends the same figures to email and PDF.
- **Evidence:** MATH-US-02-cc-8000-min100-1280.png, MATH-US-02b-cc-8000-extra50-1280.png, debt-out.txt
- **Fix:** detect payment ≤ interest up front. Show "Never — payment doesn't cover the $153/mo interest" and the minimum payment needed; suppress the totals.

### MATH-US-03  Debt payoff: a debt that never pays down reported as "50 years", with $40M interest
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW
- **Repro:**
  1. Keep the defaults and add a debt of $20,000 at 24.99% with a $200 minimum. Set extra to $0.
  2. Snowball: "50 years, Total Interest $39,952,282". Banner: "Avalanche saves you $39,850,368".
  3. With that debt alone: "50 years", interest $2.44bn.
- **Cause:** calculator-utils.ts:364-366 stops at 600 months with no flag, and DebtPayoffCalc.tsx:116 prints "50 years".
- **Evidence:** MATH-US-03c-debt-underwater-1280.png, debt-out.txt
- **Fix:** return a capped/never-paid flag and replace the result and the "saves" banner when it is set.

### MATH-US-04  Debt payoff: blank rate gives $NaN; unnamed debt silently dropped
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW
- **Repro:**
  1. Add a debt with balance 9000, rate 21, minimum 250 and no name. Total Debt stays $42,000.
  2. Name it and clear the rate. Both strategy cards show "Total Interest $NaN / Total Paid $NaN".
- **Cause:** `parseDebts` (DebtPayoffCalc.tsx:101-112) doesn't validate the rate and requires a name. getResults (:255-260) emails "$NaN". Duplicate names also collapse in the payoff order.
- **Evidence:** MATH-US-03b-debt-blank-rate-1280.png, debt-out.txt
- **Fix:** treat a blank rate as 0% (or show an inline error); default the name to "Debt n".

### MATH-US-05  Affordability ignores the 28% front-end limit its methodology says it uses
- **Severity / Confidence / Reach / Tag:** S2 / Verified / High / NEW. Merges C12.
- **Where:** methodology mortgage-affordability.md:5, :28-30, :60-62 says lenders use the lower of 28% front-end and 36% back-end. The tool (MortgageAffordabilityCalc.tsx:120) applies only gross × 36% − debts.
- **Expected vs actual** (afford4.mjs; UI confirmed $312,570):

  | Inputs | Site | 28/36 rule | Overstatement |
  |---|---|---|---|
  | $80k income, $0 debts, $40k down | $322,817 | $255,329 | +26.4% |
  | $75k / $0 / $50k | $312,570 | $250,000 | +25.0% |
  | $120k / $300 / $60k | $454,172 | $390,902 | +16.2% |

  - The tool page partly discloses "defaults to 36%".
  - From C12: the page's down-payment table is 7–9% above the tool, and its PMI column tapers where the tool's PMI is all-or-nothing.
- **Fix:** cap housing at min(front-end, back-end − debts), or correct the methodology.

### MATH-US-06  Affordability PMI solver oscillates at the 20%-down boundary
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW
- **Repro:** income 100,000, debts 300. A $75k down payment gives $391,350; an $80k down payment gives $391,133. Correct for $80k down is $400,000 (exactly 20% down, no PMI, PITI $2,534 against a $2,700 budget).
- **Cause:** the loop at MortgageAffordabilityCalc.tsx:144-178 alternates between $416,706 and $391,133 and stops after 20 iterations.
- **Scale:** over 30,000 random sets, about 10% don't converge. Where the oscillation crosses the PMI boundary, understatement is p90 $75.5k (11.8%) and at most $221k (28%). The site never overstates.
- **Evidence:** MATH-US-06-afford-down80k-1280.png, afford2-out.txt
- **Fix:** solve on each side of the 5× down-payment point (where PMI stops applying) in closed form and take the larger feasible result.

### MATH-US-07  Homepage mortgage engine overstates the full tool by about 27%
- **Severity / Confidence / Reach / Tag:** S2 / Verified (desktop + Pixel 7) / High / NEW
- **Repro:**
  1. The homepage defaults show "You could afford up to $396,902 — $2,250/mo at 6.75%".
  2. Click "Open full calculator": it shows $259,547 at its own defaults, or $312,570 at the same inputs with $0 debts.
- **Cause:** DecisionEngine.tsx:126-141 spends 36% of gross on principal and interest only (no tax, insurance, PMI or debts). Against the 28/36 rule the homepage figure is +59%.
- **Evidence:** MATH-US-05b-home-mortgage-default-1280.png, MATH-US-12-home-mortgage-pixel7.png, afford-out.txt
- **Fix:** reuse the tool's solver.

### MATH-US-08  Unreachable retirement target shows "Age 90 — 25 years of saving to reach $1,000,000"
- **Severity / Confidence / Reach / Tag:** S2 / Verified / High / NEW
- **Repro:** homepage Retire tab, age 65, $100/mo. The panel shows "Age 90", "25 years of saving to reach $1,000,000". The balance at 90 is $81,007.
- **Cause:** `solveForRetirementAge` (calculator-utils.ts:294-317) returns maxAge with no check that the target is reachable. It is used by DecisionEngine.tsx:293-301 and RetirementAgeCalc.tsx:103.
- **Evidence:** MATH-US-05-home-retire-65-100-1280.png, compound-out.txt
- **Fix:** return null or Infinity, then show "not reached by 90" with the shortfall.

### MATH-US-09  Compounding-frequency selector also changes when deposits are made
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Med / NEVER-FIXED (described as an "approximation" with no size given)
- **Cause:** calculator-utils.ts:31-49 turns the monthly contribution into PMT×12/n deposited once per compounding period.
- **Expected vs actual** ($10k + $200/mo, 7%, 20 years):

  | Compounding, timing | Site | Correct | Error |
  |---|---|---|---|
  | Annual, end | $137,086 | $140,204 | −2.2% |
  | Annual, beginning | $143,973 | $140,778 | +2.3% |
  | Daily, end | | | +0.2% |

  - The daily-vs-monthly gain is shown as $705; the true gain is $409.
  - Monthly compounding is exact.
- **Evidence:** compound-out.txt
- **Fix:** keep deposits monthly and use the equivalent monthly rate.

### MATH-US-10  Investment Return Time tab shows "17 yrs 12 mo"
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Low-Med / NEW
- **Repro:** start 7,000, monthly 1,450, 8.5%, target 765,000.
- **Cause:** InvestmentReturnCalc.tsx:153, where Math.round of the fractional months can return 12.
- **Evidence:** MATH-US-07-ir-time-12mo-1280.png

### MATH-US-11  Solar: a grant equal to the system cost shows "25+ years" (never pays back)
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Low / NEW
- **Repro:** set the credit to 7,000, equal to the cost.
- **Cause:** solar-payback.ts:117 requires netCost > 0, and :138 sets ROI to 0.
- **Evidence:** MATH-US-08-solar-credit-equals-cost-1280.png

### MATH-US-12  Salary: take-home hourly exceeds gross hourly when overtime is entered
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Med / NEW
- **Repro:** $75k salary, state 0, 10 overtime hours a week. The table shows Hourly $36 gross and $39 take-home; correct take-home is $31.30.
- **Cause:** SalaryCalc.tsx:72 and :114 divide by base hours only.
- **Evidence:** MATH-US-10-salary-ot-hourly-1280.png

### MATH-US-13  Rent vs Buy deducts all mortgage interest, with no itemised-vs-standard test
- **Severity / Confidence / Reach / Tag:** S3 / Verified / High (US mode) / NEVER-FIXED (disclosed only as a methodology limitation)
- **Expected vs actual:** 10-year tax saving at defaults:
  - Site: $37,345 (RentVsBuyCalc.tsx:144)
  - Single filer against the $16,100 standard deduction: $11,165
  - Married filing jointly against $32,200: $0
- **Evidence:** rvb3.mjs

### MATH-US-14  Rate defaults don't change by region
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Low-Med / NEW
- **Expected vs actual:**
  - The EUR default is 7%, against the ECB composite rate of 3.54% (July 2026; https://www.ecb.europa.eu/press/stats/mfi/html/ecb.mir260902~d54675e442.en.html, accessed 2026-11-09). The €280k, 25-year payment is about 40% too high.
  - Affordability in EUR mode uses 36% of gross income. Euro-area norms are typically based on net income, and this isn't disclosed.

### MATH-US-15  Salary (married filing jointly): combined wages treated as one worker under one Social Security cap
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Low-Med / NEW (undisclosed)
- **Expected vs actual:** for 2 × $120k entered as $240k, Social Security is charged once ($11,439) instead of $14,880. Take-home is overstated by $3,441 (us-tax-calc.ts:136).

### MATH-US-16  ROI: total loss shows annualized return 0.00% instead of −100%
- **Severity / Confidence / Reach / Tag:** S4 / Verified / Low / NEW
- **Cause:** RoiCalc.tsx:40
- **Evidence:** MATH-US-09-roi-total-loss-1280.png

### MATH-US-17  Nits
- **Severity / Confidence / Reach / Tag:** S4 / Verified / Low / NEW
- Return-rate solver shows 0.00% when the target is below total contributions (a negative return is actually needed). calculator-utils.ts:225.
- Investment fee: when the fee exceeds the gross return, contributions don't lose value, overstating the balance by 13–28% (calculator-utils.ts:39-44).
- Affordability returns "max price = down payment" even when tax and insurance alone exceed the budget (MortgageAffordabilityCalc.tsx:153-157).
- The credit-card methodology says the cap is 600 months; the code uses 1,200. The 2% percentage-minimum case truncates interest at 100 years ($72k shown vs $88k true).
- Salary email/PDF label "Annual Salary" shows the hourly rate in hourly mode (SalaryCalc.tsx:124).

### MATH-US-18  US hub embeds the salary calculator at 5% state tax under a "no state tax" table
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Med / NEW
- **Expected vs actual:** all 18 rows are exact. The embedded calculator shows $57,843 for $75k, while the table's own rule gives $61,593.
- **Fix:** pass state = 0 to the embedded calculator.

### MATH-US-19  Rent vs Buy, affordability and credit-card payoff maths still sits untested inside .tsx files
- **Severity / Confidence / Reach / Tag:** S3 / Verified / n/a / NEVER-FIXED
- **Detail:** this is the root cause of 01, 02, 05 and 06. Code locations: RentVsBuyCalc.tsx:111-205, MortgageAffordabilityCalc.tsx:111-203, CreditCardPayoffCalc.tsx:45-102.
- **Fix:** move the logic into src/lib with invariant tests.

## B. Freshness and policy (fork; sources accessed 2026-11-09)

### MATH-US-F01  OBBBA overtime deduction not modelled
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW
- **Expected vs actual:** federal tax is overstated by:
  - $2,059 at $36/hr with 10 overtime hours, single
  - $390 at $25/hr with 5 hours, married filing jointly
  - $936 at $30/hr and 50 hours, head of household
  - $3,000 (the deduction cap) at $45/hr with 15 hours
- **Source:** https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors
- **Evidence:** SalaryCalc.tsx:80-90; fork-fresh/ot.mjs
- **Fix:** subtract the capped, phased-out overtime premium from taxable income, or disclose it.

### MATH-US-F02  Solar examples and FAQ claim about twice the payback speed the tool computes
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW. Merges C03.
- **Expected vs actual:**

  | Example | Page | Tool |
  |---|---|---|
  | UK 4kW, £7k | ~11 yr, >£12k | 20y 9m, £9,137 |
  | UK + battery | ~13 yr | 16y 2m |
  | US 8kW, $20k | ~12 yr | 17y 9m |
  | US, net metering | <9 yr | 10y 8m |

  - The FAQ's "£600–900/yr" compares with £228 in year 1.
- **Evidence:** solar-payback.md:22, :43, :51, :60
- **Fix:** generate the examples from the library.

### MATH-US-F03  Rate-environment claims now wrong
- **Severity / Confidence / Reach / Tag:** S2 / Verified / Med / NEW
- **Expected vs actual:**
  - renting-vs-buying-2026.md:48 says "5.5–6.5%". PMMS for 5 Nov 2026 is 7.18% (30-yr) and 6.57% (15-yr); https://www.freddiemac.com/pmms. The example at :54 uses 6%; at market its payment is $2,439, not $2,158.
  - fixed-vs-variable-rate-mortgage.md:67-69 says Fed funds 3.50–3.75% with cuts ahead. Actual is 3.75–4.00% after a 17 Sep 2026 hike.

### MATH-US-F04  Default mortgage rates below market and inconsistent; homepage rate hard-coded
- **Severity / Confidence / Reach / Tag:** S3 / Verified / High / NEW
- **Expected vs actual:**
  - Defaults are 7.0% (MortgagePaymentCalc.tsx:193), 6.75% (MortgageAffordabilityCalc.tsx:54), 6.5% (RentVsBuyCalc.tsx:29) and 6.5% (LoanAmortizationCalc.tsx:101).
  - The homepage rate is fixed at 6.75% (DecisionEngine.tsx:126).
  - The mortgage hub covers 5–7%, so every column is below the current market.
- **Fix:** one shared default-rate constant with an "as of" date.

### MATH-US-F05  CPI table: 2025 value is stale and there is no 2026 point
- **Severity / Confidence / Reach / Tag:** S3 / Verified / High / NEVER-FIXED
- **Expected vs actual:**
  - InflationCalc.tsx:46 has 2025 = 319.0; BLS gives 322.115 (https://data.bls.gov/timeseries/CUUR0000SA0).
  - The default case shows $1,852.50; correct is $1,870.58, and $1,956.68 using Sep 2026 CPI (5.3% low).
  - Content examples are about 5% off.

### MATH-US-F06  IRS and SSA have published 2027 values
- **Severity / Confidence / Reach / Tag:** S3 / Verified / High / NEW (the build failure itself was already logged)
- **Detail:**
  - IR-2026-133 / Rev. Proc. 2026-35 (5 Nov 2026) and the SSA 2027 wage base of $192,300 are out.
  - 2027 take-home is $68–561/yr higher than the site shows.
  - us-take-home-pay.astro:190-192 has a Social Security sentence that becomes false in 2027.
  - About 14 prose files hard-code 2026 IRS figures.
  - The 2027 401(k)/IRA notice is not yet published.
- **Sources:** https://www.irs.gov/pub/irs-drop/rp-26-35.pdf ; https://www.ssa.gov/news/en/cola/factsheets/2027.html

| 2027 values | Single | MFJ | HoH |
|---|---|---|---|
| Bracket tops | 12,800 / 52,025 / 109,125 / 208,325 / 264,550 / 661,375 | 25,600 / 104,050 / 218,250 / 416,650 / 529,100 / 793,650 | 18,250 / 69,650 / 109,100 / 208,300 / 264,550 / 661,350 |
| Standard deduction | 16,600 | 33,200 | 24,925 |
| LTCG 0% top | 51,050 | 102,100 | 68,350 |
| LTCG 15% top | 563,200 | 633,600 | 598,400 |

### MATH-US-F07  Senior deduction and the age-65 additional standard deduction not modelled or disclosed
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Med / NEW
- **Expected vs actual:** federal tax overstated by $966 (single, 65+, $60k) and $1,836 (married filing jointly, both 65+, $90k).

### MATH-US-F08  Pages edited in July 2026 still quote 2025 limits
- **Severity / Confidence / Reach / Tag:** S3 / Verified / Low / NEVER-FIXED. Merges part of C11.
- **Expected vs actual:**
  - how-much-to-save-monthly-for-retirement.md:59-62: IRA $7,000 and 401(k) $23,500, vs 2026 limits of $7,500 and $24,500.
  - net-worth-at-30.md:73: 401(k) $23,500.
  - Retirement-savings methodology :67: the 2024 catch-up figure.
  - The age 60–63 catch-up ($11,250) is missing everywhere.

### MATH-US-F09  Head-of-household 32% threshold wrong
- **Severity / Confidence / Reach / Tag:** S4 / Verified / Low / NEW
- **Expected vs actual:** us-rates.ts:32 has 201,775; Rev. Proc. 2025-32 gives 201,750. Maximum effect $2.

### MATH-US-F10  USD visitors to the solar tool get UK defaults
- **Severity / Confidence / Reach / Tag:** S3 / Verified / High / NEW
- **Expected vs actual:**
  - Defaults are 24.5¢/kWh, 900 kWh/kWp and $7k for 4kW (SolarPaybackCalc.tsx:30-45).
  - At the EIA average of 18.16¢, the system never pays back.
  - A US-typical setup (8kW, $20k, 1,400 kWh/kWp) pays back in 18y 10m.
  - The FAQ mentions a "federal tax credit", but that credit ended 31 Dec 2025.

### MATH-US-F11  Tips deduction and car-loan-interest deduction absent and undisclosed
- **Severity / Confidence / Reach / Tag:** S4 / Verified / Low / NEW

## C. Content (fork; rows in fork-content/rows.csv)
About 340 figures across 78 pages: about 180 match and about 115 are wrong.

| ID | Sev / Conf / Reach | Finding |
|---|---|---|
| C01 | S1 / Verified / Med | retire-at-55-with-1-million.md:14, 22, 24: "$1,214,400" vs $1,501,378. It is the contributions-only figure, so the $50k start is ignored; all 9 figures on the page are wrong. |
| C04 | S1 / Verified / High | 50k-salary-hourly-rate.md:12-50: "$19.05/hr" vs $20.36. Uses the 2025 standard deduction; 401(k) saving shown as $660 vs $360; false bracket claim; California $1,400 vs $1,040. |
| C05 | S1 / Verified / High | credit-card-payoff methodology :60, :72 says "$4,300, 7+ yrs" vs $11,694 over 13y 11m; "+$50 saves $2,435" vs $8,649. The 50k-credit-card table is 14–25% off. debt-payoff.md:31, :81 is internally inconsistent. |
| C06 | S2 / Verified / Med | debt-payoff.md:45 "avalanche saves $2,340" is impossible (same payoff order, difference $0). :51 is off. The pay-off-30k-debt figures are off. |
| C07 | S2 / Verified / High | mortgage-payment.md and loan-amortization.md extra-payment savings understated 21–35%. |
| C08 | S2 / Verified / High | Growth figures wrong: compound-interest.md:55, :88, :119; investment-return.md:50 ($347k vs $201,937); net-worth-millionaire-by-40; 60k-salary-with-401k; retire-at-50-fire. |
| C09 | S2 / Verified / Med | index-funds-vs-active-funds.md:21-22, :54-57 fee drag wrong ($49k vs $209,392). The fee methodology uses annual compounding while the tool compounds monthly. |
| C10 | S2 / Verified / Med | 15-vs-30-year: :91 conclusion reversed by the page's own assumptions. renting-vs-buying-2026.md:71 omits the $1,025/mo extra cost of owning. roth-vs-traditional:188: equal rates give equal outcomes. |
| C11 | S2 / Verified / Med | 60k-salary-with-401k uses the 2025 standard deduction. net-worth-at-30 uses SCF 2019 data; the 2022 figures came from secondary reporting. |
| C13 | S2 / Verified / High | salary-us.md:41 says California is "~30%" (correct 21.6%) and Texas "~22%" (correct 17.9%). 100k-salary state and New York City figures are off. pay-rise-shock-us:190 is off. The hourly worked example shows $79,625 vs $86,450. |
| C14 | S3 / Verified / Med | 50k-car-loan-4-years balances, interest and savings off; car-finance.md 0% example off. |
| C15 | S3 / Verified / Low | compound-daily-vs-monthly figures off (20% row 4x understated). |
| C16 | S3 / Verified / Med | Savings-goal pages drift up to 4%; save-for-house-deposit table scales linearly. |
| C17 | S3 / Likely / Low | student-loan-payoff-50k uses outdated SAVE and phase-out figures; refinance saving off. |
| C18 | S3 / Verified / Low-Med | Rent-vs-buy page principal share "~30%" (actual 12.7%); bonds line in 100k-purchasing-power; Roth match described as a "tax law requirement"; investment-return methodology gap. |
| C19 | S4 / Verified / Low | Off-by-one withdrawals; poverty-line claim; Social Security break-even; inconsistent return claim; cap text; annual-compounding numbers beside monthly formulas. |

## What works well (verified)
1. US federal tax and FICA exact at 60,093 test points; 18 hub rows exact; 2026 constants single-sourced in us-rates.ts and correct apart from F09.
2. The debt rollover fix holds: 0 mismatches over 10,000 random portfolios.
3. Amortization, compound-interest and solver engines exact (see strengths above).
4. Region gating in the mortgage tools is correct.
5. The mortgage and investment hubs and the Phase-3 recomputed pages are exact to the dollar (300k-mortgage-7-percent, 500-per-month, 100000-invested-30-years, snowball-vs-avalanche, lump-sum-vs-DCA).

## Out-of-lane observations
- NetWorth value inputs reformat on every keystroke, so decimals can't be typed (CALC-UX-B).
- The car finance tool presents UK products (PCP/HP) to USD users; this is a known open owner call.
- New Hampshire's interest-and-dividends tax has been repealed (CONTENT).
- UK Ofgem cap is 26.32p vs the 24.5p solar default (MATH-UK).
- rental-property-roi UK Section 24 figures don't reconcile (MATH-UK).

## Coverage
- **Components and libraries:** all 19 target components plus 5 libraries code-reviewed. Random grids:

  | Engine | Random cases |
  |---|---|
  | Tax/FICA | 60,093 |
  | Debt payoff | 10,000 |
  | Card payoff | 5,000 |
  | Compound / solvers | 40k–100k |
  | Affordability | 30,000 |
  | Rent vs buy | 20,000 |
  | Amortization | 20,000 |

- **UI:** 13 findings verified in the UI on the preview.
- **Hubs:** US (18 rows), mortgage (70 cells plus prose) and investment (36 cells plus prose) recomputed.
- **Homepage engine:** mortgage and retire tabs driven; compound and take-home tabs checked via the library only.
- **Content:** 78 pages, about 340 figures.
- **Not done:** listed in section 4 above.