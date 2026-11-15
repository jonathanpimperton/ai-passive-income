MATH-UK final report. The brief asks for a findings.md, but this agent's Write tool refused report .md files ("Subagents should return findings as text"). So the summary comes first and the full findings file follows as an appendix. Everything else is in C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-UK/ : scripts, JSON outputs and screenshots, including ref.mjs (my own implementation from primary sources) and lib/site.mjs (esbuild bundle of the repo libs plus the component-only SalaryUkCalc functions, copied verbatim by line range).

## 1. Counts by severity
20 findings: S1 = 3, S2 = 8, S3 = 8, S4 = 1. No live-site loads were made.

## 2. S1 and S2 findings
- **MATH-UK-01 (S1, Verified):** with salary sacrifice turned on, the student loan is charged on salary before the sacrifice (SalaryUkCalc.tsx:168). HMRC CSLM17055 says it should be on pay after sacrifice. Take-home is understated by 9% of the sacrificed amount (6% for a Postgraduate Loan), e.g. £157.50 at £35k / 5% / Plan 2 and £540 at £60k / 10%. Email results and PDF export show the same wrong figure.
- **MATH-UK-02 (S1, Verified):** typing an S-prefix code such as S1257L does not apply Scottish rates, although the methodology says it does. Take-home is overstated by £1,496 at £50k and £3,300 at £100k.
- **MATH-UK-03 (S1, Verified, Reach Low):** SD0 is taxed at 40% (should be 21%) and SD1 at 48% (should be 42%). SD2 and SD3 are silently ignored. At £35k, SD0 shows £14,000 tax against a correct £7,350.
- **MATH-UK-04 (S2):** the £100k allowance taper is applied for "1257L" but not for C1257L or the emergency codes (W1/M1/X). At £110k a Welsh code gives £2,000 more take-home; the gap reaches £5,028 at £125,140 and above.
- **MATH-UK-08 (S2):** all three UK retirement charts put "Pension access" at age 55 and "State Pension age" at 66 for every user. For the default 30-year-old the correct ages are 57 and 68.
- **MATH-UK-09 (S2):** Budget 2026 (28 Oct 2026, Chancellor John Healey) cancelled the cut to the Cash ISA limit. Three comparison pages still say it drops to £12,000 from April 2027.
- **MATH-UK-10 (S2):** since 29 Oct 2026 the LISA withdrawal charge for first-time buyers buying above £450k is 20%. The stamp-duty first-time-buyer scenario and the LISA comparison still say 25%.
- **MATH-UK-11 (S2):** uk-300k-mortgage-payment says stamp duty on a £300k property is £2,500. That is the pre-April-2025 figure; the correct amount is £5,000, which the site's own calculator shows.
- **MATH-UK-12 (S2):** the £100k scenario says a £5,000 pension contribution saves "£2,500 … on top of the normal 40% relief". The restored allowance is worth £1,000, so the benefit is overstated by £1,500.
- **MATH-UK-14 (S2):** on the UK tab of the capital gains tool, choosing "Higher / additional" overrides the income entered. £40k income with a £50k gain gives £11,280 against a correct £10,664.
- **MATH-UK-15 (S2):** the US capital gains NIIT test uses taxable income in place of MAGI (the methodology says MAGI). NIIT is understated by up to $612 single, $918 head of household and $1,224 married filing jointly.

## 3. Top 3 strengths (verified)
1. **The core UK salary engine is exact.** I ran 1,560 edge cases plus 20,000 random ones (England/Wales/NI and Scottish rates, every loan plan, pension 0/5/10% net-pay and sacrifice). Income tax, NI and student loans match my implementation to the penny everywhere except the sacrifice-plus-loan case.
2. **Every published UK figure I recomputed reproduces.** That covers all 21 hub rows and 5 loan rows, all 37 rows of docs/tax-values-2026.json, the 60% trap, pay-rise, Plan 5, £30k/£50k/£100k scenarios (including the Scottish £30,732), the second-home CGT and first-time-buyer stamp-duty scenarios, and the homepage UK engine and chips. In all 36 browser cases I drove, the UI showed exactly what the library computes.
3. **Stamp duty and UK CGT are exact on mainstream inputs, and the prior-review fixes hold.** I re-verified on GOV.UK and the Budget 2026 OOTLAR Annex A that:
   - the Scottish 2026/27 bands are correct;
   - stamp duty and CGT now read their rates from uk-rates.ts;
   - 111 tests across the 5 UK-relevant files pass;
   - every 2026/27 constant is current as of 9 Nov 2026.

## 4. Coverage gaps
- The email payload was checked by reading the code only, not captured over the wire (Turnstile loads a third-party script).
- I did not open the PDF export.
- I only tested in Chromium at 1280px.
- I could not confirm the 2027/28 State Pension rate (£250.70/week, secondary sources only) or Scotland's 2027/28 bands (secondary sources say the Scottish Budget is 3 Dec 2026).
- I left pcp-vs-hp-vs-personal-loan, uk-inflation-grocery-prices and the UK branch of the mortgage tools to MATH-US.

## 5. findings.md path
It could not be written because the agent's Write tool refused it. Intended path: C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/MATH-UK/findings.md. Full content below.

=====================================================================
# APPENDIX -- full findings

## Primary sources used (all accessed 9 Nov 2026)
- **Income tax:** gov.uk/income-tax-rates.
- **Budget 2026 OOTLAR Annex A**, giving 2026-27 and 2027-28 rates for income tax, savings/property/dividend income, NI, CGT, ISAs, and stamp duty including the non-resident rates: gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances
- **HM Treasury Budget 2026 press release** (28 Oct 2026): gov.uk/government/news/budget-2026-breathing-space-for-today-hope-for-the-future
- **LISA withdrawal charge notice:** gov.uk/government/publications/lifetime-isa-withdrawal-charge/reduce-lifetime-isa-withdrawal-charge-for-properties-over-the-property-price-cap
- **Savings/property income rates notice** (24/44/49% from 6 Apr 2027): gov.uk/government/publications/income-tax-changes-to-tax-rates-for-property-and-savings-income
- **Scottish income tax:** gov.uk/scottish-income-tax
- **Employer rates and thresholds 2026-27:** gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
- **Student loans:** gov.uk/repaying-your-student-loan/what-you-pay ; HMRC CSLM17055.
- **Tax codes:** gov.uk/tax-codes/print
- **Stamp duty:** gov.uk/stamp-duty-land-tax/residential-property-rates ; HMRC SDLTM09740 (£40k rule).
- **State Pension:** gov.uk/new-state-pension/what-youll-get
- **Minimum pension age 57:** gov.uk/government/publications/increasing-normal-minimum-pension-age
- **State Pension age 67/68:** Pensions Act 2007 Sch 3, via an East Sussex council timetable.
- **US:** IRS TY2026 newsroom page; taxfoundation.org 2026 brackets.
- **Secondary sources:**
  - MSE Budget 2026 article;
  - ICAEW on the £2,000 salary-sacrifice NI cap from April 2029.

### MATH-UK-01  Student loan charged on salary before salary sacrifice -- S1 / Verified / Reach Med / NEW
- **Where:** /tools/income-and-planning/salary-uk/ (also embedded on /scenarios/uk-take-home-pay/).
- **Repro:**
  1. Open the tool at its defaults (£35,000, 5% pension).
  2. Set the student loan to Plan 2.
  3. Turn salary sacrifice on.
- **Site shows:** student loan £505, take-home £26,954.
- **Correct (CSLM17055, loan on pay after sacrifice):** student loan £347.85, take-home £27,111.75.
- **Deltas (take-home understated):**

| Salary | Sacrifice | Loan | Delta |
|---|---|---|---|
| £35k | 5% | Plan 2 | £157.50 |
| £45k | 8% | Plan 2 | £324 |
| £60k | 10% | Plan 2 | £540 |
| £60k | 10% | Postgraduate | £360 |
| £105k | 5% | Plan 2 | £472.50 |
| £40k | 5% | Plan 5 | £180 |

- **How it was isolated:** this is the only mismatch class across 1,560 grid and 20,000 random cases.
- **Also:** the "saves you £140/year in NI" note leaves out the loan saving.
- **Code:** SalaryUkCalc.tsx:168 (should use niIncome) and :180-182. Email and PDF read the same result (:241-254).
- **Evidence:** MATH-UK-03-salary-35k-plan2-5-sacrifice-1280.png, ui-salary.json.
- **Fix:** calculate the loan on niIncome, add a unit test, and include the loan saving in the message.

### MATH-UK-02  S-prefix tax code does not apply Scottish rates -- S1 / Verified / Reach Med / NEW
- **Repro:** £50,000, pension 0, code S1257L, Scottish switch off.
- **Site shows:** hint "Personal Allowance: £12,570", tax £7,486 (rest-of-UK rates).
- **Correct (Scottish):** £8,982.
- **Take-home overstated by:** £15 at £35k, £1,496 at £50k, £1,750 at £60k, £3,300 at £100k, £3,800 at £110k (the taper is also lost), £7,054 at £200k. At £20k it is £40 the other way.
- **Contradicts the site's own copy:** methodologies/salary-uk.md:105 says "S prefix: Scottish bands apply"; tools/salary-uk.md:117 says Scottish codes "start with S".
- **Code:** SalaryUkCalc.tsx:71-72.
- **Evidence:** MATH-UK-05-salary-50k-S1257L-toggle-off-p0-1280.png, cmp-codes.json.

### MATH-UK-03  Scottish D codes use the wrong rates -- S1 / Verified / Reach Low / NEW
- **Wrong rates:**
  - SD0 is taxed at 40%; GOV.UK says the Scottish intermediate rate, 21%. At £35k: £14,000 against £7,350.
  - SD1 is taxed at 48%; it should be 42%.
- **Codes ignored:** SD2 (45%) and SD3 (48%) are not recognised. They fall back to standard 1257L tax (£4,486 at £35k against £15,750 for SD2) with the default hint, so the user isn't told.
- **Code:** SalaryUkCalc.tsx:66-68.
- **Evidence:** MATH-UK-07-salary-35k-SD0-p0-1280.png.

### MATH-UK-04  Taper applied for "1257L" but not C1257L or emergency codes -- S2 / Verified / Reach Low-Med / NEW
- **At £110k:** "1257L" gives tax £33,432 and take-home £72,357 (with the trap warning). "C1257L" gives £31,432 and £74,357 (no warning).
- **Same behaviour:** "1257L W1", "M1", "1257LX" and "S1257L".
- **Size:** £2,000 at £110k, up to £5,028 at £125,140 and above. Welsh bands are the same as England's.
- **Code:** SalaryUkCalc.tsx:62 (only the literal "1257L" is treated as standard) and :80-84.

### MATH-UK-05  No feedback on unrecognised codes; K-code 50% cap missing -- S3 / Verified / Reach Low / NEW
- **Silent fallback:** "abc", "??", "L1257", "D2" and "-1257L" quietly use 1257L.
- **K-code cap missing:** K9999 at £20k shows tax £40,456 and take-home "£-21,050". GOV.UK caps K-code tax at 50% of pay.
- **Other oddities:** "12" is read as a £120 allowance; "9999999999" gives £0 tax.

### MATH-UK-06  60% trap banner tests gross salary, not adjusted net income -- S3 / Verified / NEW
- **Repro:** £105k with a 10% net-pay pension. Adjusted net income is £94.5k and the full allowance is correctly computed.
- **Banner still says:** you are in the trap, and to "consider salary sacrifice".
- **Code:** SalaryUkCalc.tsx:196.

### MATH-UK-07  Pension input: undisclosed simplification and mislabelled method -- S3 / Verified / Reach High / NEVER-FIXED
- **(a) Percentage of total pay:** the hint says "auto-enrolment default: 5%", but the percentage is applied to total salary, not qualifying earnings (£6,240-£50,270).
  - At the £35k default the site shows pension £1,750 and take-home £27,320.
  - On a qualifying-earnings basis it would be £1,438 and £27,569 (+£249).
- **(b) Wrong method name:** the methodology calls the non-sacrifice mode relief at source / "post-tax" (salary-uk.md:23, :95). The code actually models a net-pay arrangement.
- **Code:** SalaryUkCalc.tsx:154-166 and :391.

### MATH-UK-08  UK retirement charts place pension milestones at 55 and 66 for everyone -- S2 / Verified / Reach Med / NEW
- **Where:** retirement-savings, retirement-age and retirement-contribution tools, with GBP selected.
- **What it shows:** "Pension access (57 from 2028)" at age 55 and "State Pension age (67 from 2028)" at 66.
- **What is correct for the default 30-year-old:** minimum pension age 57 (it applies to anyone now under about 53) and State Pension age 68 (born after 5 Apr 1978).
- **Labels:** they also overlap.
- **Code:** RetirementAgeCalc.tsx:53-61, the same block in RetirementSavingsCalc and RetirementContributionCalc, and uk-rates.ts:64-73.
- **Evidence:** MATH-UK-36-retirement-savings-uk-milestones-1280.png, MATH-UK-37-retirement-savings-uk-spa-marker-1280.png.
- **Fix:** work the ages out from the user's current age (State Pension age bands 66/67/68 by date of birth).

### MATH-UK-09  Cancelled Cash ISA cut still announced -- S2 / Verified / Reach Med / NEW (outdated by events)
- **Affected lines:** lisa-vs-regular-isa.md:108, cash-isa-vs-savings-account.md:99, isa-vs-general-investment.md:90 ("drop to £12,000 from April 2027").
- **Pages still show:** "Updated 7 July 2026".
- **Source:** HMT, 28 Oct 2026: "The £20,000 cash ISA limit is preserved for everyone". OOTLAR also lists the ISA limit as £20,000 for 2027-28.

### MATH-UK-10  LISA charge for first-time buyers over £450k is now 20%, not 25% -- S2 / Verified / Reach Med / NEW (outdated by events)
- **Affected lines:**
  - stamp-duty-first-time-buyer-2026.md:71 ("pay a 25% penalty");
  - lisa-vs-regular-isa.md:65 and :75.
- **Source:** HMRC notice: 25% becomes 20% from 29 Oct 2026. 25% still applies to other unauthorised withdrawals.
- **Size:** on a £5,000 pot the site overstates the charge by £250.

### MATH-UK-11  Stamp duty on £300k given as £2,500 -- S2 / Verified / NEVER-FIXED
- **Where:** uk-300k-mortgage-payment.md:54 (page last modified 2026-07-02).
- **Correct:** £5,000 at £300k (the site's own calculator agrees). A £300k mortgage more likely means a ~£375k purchase, where it is £8,750.

### MATH-UK-12  Overstated benefit of a £5,000 pension contribution -- S2 / Verified / NEW
- **Where:** 100k-salary-uk-tax.md:61: "You save £2,500 in tax that you would have lost from the taper (on top of the normal 40% relief)."
- **Why it's wrong:**
  - At exactly £100k nothing has been tapered, so nothing is restored.
  - At £105k the contribution restores £2,500 of allowance, which is worth £1,000 of tax.
  - So the total saving is £3,000, not £4,500.

### MATH-UK-13  "£5,000 sacrifice at the higher rate saves £2,400" -- S3 / Verified / NEW
- **Where:** tools/salary-uk.md:138.
- **Correct:** £2,100 (40% tax + 2% NI); £2,200 for Scottish rates.

### MATH-UK-14  UK CGT: "Higher" toggle overrides the income entered -- S2 / Verified / Reach Med / NEW
- **Repro:** UK tab, gain £50k, income £40k, choose "Higher".
- **Site shows:** £11,280.
- **Correct:** £10,664 (£10,270 of unused basic band at 18%, the rest at 24%).
- **Other cases:** £30k income / £20k gain +£1,020; £20k / £100k +£1,816.
- **When the toggle matches the income:** the engine is exact.
- **Copy contradiction:** tools/capital-gains-tax.md:112 says "Basic rate taxpayers: 18% on all gains", which conflicts with the next paragraph.
- **Code:** capital-gains.ts:140-152.

### MATH-UK-15  US CGT: NIIT uses taxable income in place of MAGI -- S2 / Verified / Reach Low / NEW
- **Example (single):** taxable income $150k plus a $60k long-term gain.
  - Site NIIT: $380.
  - With MAGI including the $16,100 standard deduction: $992.
- **Maximum delta:** $612 single, $918 head of household, $1,224 married filing jointly. 4,773 of 20,000 random cases differ.
- **Code:** capital-gains.ts:101-108. The methodology says MAGI.
- **Evidence:** MATH-UK-20-cgt-us-niit-1280.png.
- **Also (S4, Likely, MATH-US lane):** head-of-household 32% bracket is $201,775 in us-rates.ts:32 against $201,750 (Tax Foundation). Max effect $2.

### MATH-UK-16  Stamp duty edge rules -- S3 / Verified / Reach Low / NEW
- **(a) Non-resident surcharge:** no option and no disclosure for the 2% surcharge. At £500k a non-resident sees £15,000 against £25,000 due.
- **(b) Under-£40k rule backwards:** the FAQ (tools/stamp-duty.md:41) says the 5% surcharge applies under £40,000. HMRC SDLTM09740 says the higher rates need a price of £40,000 or more. The site charges £2,000 at £39,999.
- **(c) Price clamp:** prices above £5M are silently clamped to £5M.
- **Otherwise:** 75 grid and 20,000 random cases are exact, and the £500,001 first-time-buyer cliff shows a warning.

### MATH-UK-17  UK hub: embedded calculator contradicts the table above it -- S3 / Verified / Reach High / NEW
- **On the same page:** the £35,000 table row says £28,720 (no pension). The calculator below opens at £35,000 with 5% pension and shows £27,320.

### MATH-UK-18  Homepage UK chip ignores pension tax relief -- S3 / Verified / Reach High / NEW
- **Chip:** "Put £100 more into your pension every month: +£121,997 after 30 years" (index.astro:92, :102).
- **With basic-rate relief:** £100 net is £125 gross, giving £152,496 (+£30,499).

### MATH-UK-19  2026 Budget / 6 April 2027 readiness -- S3 / Verified / Reach High / NEW
What happens to each UK constant on 6 Apr 2027:

| Item | 2027/28 status |
|---|---|
| UK_TAX_YEAR | '2026/27' must become '2027/28'; the freshness guard will fail builds after 5 Apr 2027 |
| Income tax (allowance £12,570, basic band £37,700, additional rate £125,140, taper from £100k) | Unchanged; announced (OOTLAR) |
| NI (£12,570 / £50,270 / 8% / 2%; employer £5,000 / 15%) | Unchanged; announced |
| Scottish bands | Not announced. Higher and above frozen to 2028-29; Scottish Budget reportedly 3 Dec 2026 |
| Plan 2 loan threshold | Frozen at £29,385; announced |
| Plan 1, Plan 4, Plan 5 thresholds | Not announced (Plan 5 gets its first uprating) |
| Postgraduate Loan | £21,000 |
| State Pension | Reported £250.70/week (secondary only). Update UK_STATE_PENSION and the hard-coded "£241.30" in salary-uk.md:104 |
| CGT (£3,000 exemption, 18/24%) | Unchanged |
| Business Asset Disposal Relief lifetime limit | £1m becomes £500k (not modelled by the site) |
| Stamp duty | Unchanged |
| Savings and property income | 24/44/49% (savings were 20/40/45%) |
| Dividends | Unchanged |

- **Effect on site content:**
  - The savings-rate rise makes cash-isa-vs-savings-account (":63 taxed at 45%" and its 20/40/45 table) outdated from April 2027. It also makes Cash ISAs more valuable, the opposite of what the page argues.
  - 15 content files hard-code "2026/27", and 32 lines hard-code loan thresholds in markdown. The freshness guard cannot see any of these.
  - The £2,000 salary-sacrifice NI cap from 6 Apr 2029 is not mentioned anywhere, although salary-uk, pension-vs-isa-uk:77 and the trap pages present unlimited NI savings.
- **Fix:** drive the figures from the libraries (as the hub already does) and add a dated "what changes in April 2027" note.

### MATH-UK-20  Minor content errors -- S4 / Verified
- salary-uk.md:46 says Plan 1 covers Scotland; Scottish loans moved to Plan 4 in 2021.
- capital-gains-tax.md:119 says the £3,000 exemption was "cut from £12,300 just two years ago"; that was four tax years ago.
- cgt-second-home:30 says the 60-day rule dates "since 2020"; it was 30 days from 2020 and 60 days from Oct 2021.
- isa-vs-general-investment.md:32 implies ISAs escape inheritance tax.
- The £50k scenario cites "NHS Band 8a" at £50k; Band 8a starts well above £50k.
- SalaryUkCalc.tsx:186-194 has dead marginal-rate code with wrong Scottish mapping (not rendered today).

### Evidence for already-logged items (not re-filed)
- **CGT region default:** the CGT tool's own country tab defaults to "United States" for every visitor, regardless of the currency selector (CapitalGainsTaxCalc.tsx:51).
- **Freshness guard:** it only checks the year string and the last-checked date. It cannot see in-year Budget changes or figures hard-coded in markdown.

### What works well
These are the three strengths in section 3 above, with the evidence in cmp-salary.mjs, cmp-hub.mjs, cmp-sdlt.mjs, cmp-cgt.mjs, ui-*.json and the vitest run.

### Out-of-lane observations
- salary-uk silently clamps text input below £10,000 up to £10,000, and £10M down to £1M (CALC-UX-A).
- Duplicate id "engine-salary" on the homepage (A11Y-PERF).
- GBP users on the retirement tools still see US-only partners and 401(k) copy (CALC-UX-B / CONTENT).
- LendingTree (US-only) is the affiliate on the UK £300k mortgage scenario.
- Retirement chart milestone labels clip.
- US head-of-household 32% bracket threshold is off by $25 (MATH-US).

### Coverage
- **Salary-uk engine:** 1,560 grid and 20,000 random cases.
- **Tax codes:** 35 codes × 13 incomes (455 cases).
- **Stamp duty:** 75 grid and 20,000 random cases.
- **CGT:** UK 156 grid and 20,000 random cases; US 20,000 random cases.
- **Browser (Chromium):** 18 salary-uk, 12 stamp duty and 7 CGT cases; 3 retirement tools in GBP; 4 homepage engine values.
- **Built HTML:** UK hub and homepage.
- **Content read in source:** 11 UK scenarios, 4 UK comparisons, 3 methodology pages, 3 tool content files.
- **Not done:** listed in section 4 above.