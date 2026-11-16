---
title: "How We Calculate: US Salary (Take-Home Pay)"
slug: "salary-us"
toolSlug: "salary-us"
formula: "Take-Home = Gross Income − Federal Income Tax − Social Security − Medicare − State Tax − 401(k). Federal taxable income = Gross − 401(k) − Standard Deduction − Overtime Deduction − Senior Deduction. Monthly take-home = annual take-home / 12."
variables:
  - name: "Gross Income"
    description: "Annual salary, or an hourly rate converted to annual pay (hours × weeks), including overtime paid at 1.5×"
  - name: "Tax Year"
    description: "2026 or 2027. The calculator starts on the calendar year once its data exists (2026 until 1 January 2027, then 2027) and lets you pick either. The choice lasts for your browser session"
  - name: "Federal Income Tax"
    description: "Progressive tax on income after the 401(k), the standard deduction and any overtime or senior deduction, using the IRS marginal brackets for the year and filing status"
  - name: "Social Security (OASDI)"
    description: "{{ usFact('ssRate') | pct1 }} of gross pay up to the wage base: {{ usFact('ssWageBase', year=2026) | usd }} for 2026 and {{ usFact('ssWageBase', year=2027) | usd }} for 2027"
  - name: "Medicare"
    description: "{{ usFact('medicareRate') | pct(2) }} of all gross pay, plus an additional {{ usFact('additionalMedicareRate') | pct1 }} on pay above {{ usFact('additionalMedicareThreshold') | usd }} (single and head of household) or {{ usFact('additionalMedicareThreshold', status=married) | usd }} (married filing jointly)"
  - name: "State Tax"
    description: "Your effective state income tax rate, entered as a percentage and applied to pay after the 401(k). The calculator has no state brackets. The default is 5%"
  - name: "401(k)"
    description: "Pre-tax retirement contribution as a percentage of gross pay, capped at the IRS employee limit for the year ({{ usFact('k401Limit', year=2026) | usd }} for 2026)"
  - name: "Filing Status"
    description: "Single, Married Filing Jointly, or Head of Household. It sets the bracket thresholds, the standard deduction and the phase-out thresholds"
  - name: "Overtime"
    description: "Hours above 40 a week in hourly mode, or extra overtime hours a week in annual mode, paid at 1.5× the base rate. A switch says whether the overtime is required by federal law (FLSA), which decides whether the 2025-2028 overtime deduction can apply"
  - name: "Aged 65 or Older"
    description: "Whether you (or, for a joint return, one or both spouses) are 65 or over. It adds the extra standard deduction and the 2025-2028 senior deduction"
assumptions:
  - "Uses the IRS federal brackets and standard deductions for the tax year selected (IRS Rev. Proc. 2025-32 for 2026 and Rev. Proc. 2026-35 for 2027)"
  - "State tax is one effective percentage of pay after the 401(k). No state standard deduction or brackets are applied (California and New York have progressive brackets, so enter your own effective rate)"
  - "401(k) contributions reduce federal and state taxable pay but not FICA (Social Security and Medicare)"
  - "Overtime hours are paid at 1.5× the base hourly rate. In annual mode the base rate is salary divided by (hours per week × weeks per year)"
  - "The overtime deduction counts only the premium half of pay for hours over 40 in a week (FLSA section 7). Overtime for hours at or under 40 a week never qualifies, and a salary that covers more than 40 hours earns no premium unless overtime is entered"
  - "Modified adjusted gross income for the overtime and senior phase-outs is taken as gross pay minus the 401(k)"
  - "Pay is from one job, and no other income is included"
  - "Monthly take-home is annual take-home divided by 12 (bi-weekly by 26, weekly by 52), from the same result, with no separate rounding. The per-hour figure divides by hours worked in the year"
limitations:
  - "Does not include local income taxes (New York City, many Ohio cities, etc.)"
  - "Does not model the Earned Income Tax Credit, Child Tax Credit, or other credits"
  - "Does not handle itemised deductions (mortgage interest, state and local tax deduction, charitable giving)"
  - "Does not include the 2025-2028 tips deduction (up to $25,000) or car-loan interest deduction (up to $10,000)"
  - "Does not model HSA or FSA pre-tax contributions"
  - "Does not calculate employer-side payroll taxes"
  - "Works out Social Security and Additional Medicare on one income. For two earners the Social Security cap applies per person, so two salaries can owe more Social Security than shown, and the calculator flags that for joint returns"
  - "The 401(k) is capped at the standard employee limit for the year. Catch-up contributions for age 50+ are not modelled"
  - "For 2027 the IRS had not published the 401(k) limit when this page was checked (15 November 2026). The calculator carries the 2026 limit and says so until the notice is out"
  - "Married filing separately is not offered"
dataSources:
  - name: "IRS: 2026 tax inflation adjustments, including amendments from the One Big Beautiful Bill"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill"
  - name: "IRS: 2027 tax inflation adjustments (IR-2026-133)"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts"
  - name: "IRS Rev. Proc. 2025-32 (2026 brackets, standard deduction and the 65+ additional amounts)"
    url: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf"
  - name: "IRS Rev. Proc. 2026-35 (2027 brackets, standard deduction and the 65+ additional amounts)"
    url: "https://www.irs.gov/pub/irs-drop/rp-26-35.pdf"
  - name: "Tax Foundation: State individual income tax rates and brackets, 2026 (states with no wage tax)"
    url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/"
  - name: "IRS Topic 751: Social Security and Medicare withholding rates"
    url: "https://www.irs.gov/taxtopics/tc751"
  - name: "Social Security Administration: 2027 cost-of-living adjustment fact sheet (wage base; the SSA site blocks automated link checks)"
    url: "https://www.ssa.gov/news/en/cola/factsheets/2027.html"
  - name: "IRS: 401(k) contribution limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "IRS: Tax deductions for working Americans and seniors (overtime, tips, car-loan interest, senior)"
    url: "https://www.irs.gov/newsroom/working-families-tax-cuts-tax-deductions-for-working-americans-and-seniors"
  - name: "Cornell Law School LII: 26 U.S.C. 225 (qualified overtime compensation)"
    url: "https://www.law.cornell.edu/uscode/text/26/225"
  - name: "Cornell Law School LII: 26 U.S.C. 151 (senior deduction, subsection (d)(5)(C))"
    url: "https://www.law.cornell.edu/uscode/text/26/151"
---

## What This Calculator Does

The US salary calculator converts your gross annual income (or hourly pay) into take-home pay by applying federal income tax, FICA (Social Security and Medicare), a state tax rate you enter, and an optional pre-tax 401(k) contribution. The headline gives take-home pay a month and a year with equal weight, and the monthly figure is the annual figure divided by 12 from the same result. The table below it also shows bi-weekly, weekly and per-hour figures.

For a $75,000 salary, single, with the calculator's default 5% state rate and no 401(k), take-home pay for 2026 is {{ usPay(75000, state=5, year=2026).monthly | usd }} a month and {{ usPay(75000, state=5, year=2026).takeHome | usd }} a year.

## Tax Year: 2026 and 2027

Both years are live from late in the year until mid-April, one for the return you are filing and one for the paychecks you are getting. The calculator starts on the calendar year once its data exists (2026 until 1 January 2027, then 2027). A selector switches to the other year and remembers the choice for your browser session. The 2026 figures come from IRS Rev. Proc. 2025-32 and the 2027 figures from Rev. Proc. 2026-35 (IR-2026-133, 5 November 2026); the 65+ amounts are in those revenue procedures (sections 4.14(3) and 3.15(3)). Social Security wage bases are from the SSA.

## Federal Income Tax

Federal income tax uses progressive marginal brackets. Each bracket applies only to income within that range, not to all of your income. The standard deduction (and any overtime or senior deduction) is subtracted before the brackets apply, and a pre-tax 401(k) comes off first.

**Standard deductions:**

| Filing status | 2026 | 2027 |
|---------------|------|------|
| Single | {{ usFact('standardDeduction', status=single, year=2026) | usd }} | {{ usFact('standardDeduction', status=single, year=2027) | usd }} |
| Married Filing Jointly | {{ usFact('standardDeduction', status=married, year=2026) | usd }} | {{ usFact('standardDeduction', status=married, year=2027) | usd }} |
| Head of Household | {{ usFact('standardDeduction', status=head, year=2026) | usd }} | {{ usFact('standardDeduction', status=head, year=2027) | usd }} |

**Single filer brackets** (taxable income at which each rate starts):

| Rate | 2026 | 2027 |
|------|------|------|
| 10% | $0 | $0 |
| 12% | {{ usBracketStart(12, year=2026) | usd }} | {{ usBracketStart(12, year=2027) | usd }} |
| 22% | {{ usBracketStart(22, year=2026) | usd }} | {{ usBracketStart(22, year=2027) | usd }} |
| 24% | {{ usBracketStart(24, year=2026) | usd }} | {{ usBracketStart(24, year=2027) | usd }} |
| 32% | {{ usBracketStart(32, year=2026) | usd }} | {{ usBracketStart(32, year=2027) | usd }} |
| 35% | {{ usBracketStart(35, year=2026) | usd }} | {{ usBracketStart(35, year=2027) | usd }} |
| 37% | {{ usBracketStart(37, year=2026) | usd }} | {{ usBracketStart(37, year=2027) | usd }} |

The married filing jointly and head of household brackets are in the calculator and in the IRS releases.

A single filer earning $75,000 in 2026 has taxable income of {{ usPay(75000, year=2026).taxableIncome | usd }} ($75,000 minus the {{ usFact('standardDeduction', status=single, year=2026) | usd }} standard deduction). The federal tax is {{ usFederalTax(75000, year=2026) | usd }}, an effective federal rate of {{ usFederalTax(75000, year=2026) / 75000 * 100 | pct1 }}. The marginal rate on the last dollar is {{ usBracket(75000, year=2026) | pct }}. The same salary in 2027 owes {{ usFederalTax(75000, year=2027) | usd }}, because the deduction and the brackets move up.

**Age 65 or older.** Each person aged 65 or over adds to the standard deduction: $2,050 for an unmarried filer, $1,650 each on a joint return in 2026 ($2,100 and $1,700 in 2027), under IRS Rev. Procs. 2025-32 and 2026-35. For 2025 to 2028 there is also an enhanced senior deduction of $6,000 per person (26 U.S.C. 151(d)(5)(C)), reduced by 6% of income above $75,000 ($150,000 on a joint return). For a single filer aged 65 or over earning $60,000 in 2026, the two together cut federal tax from {{ usFederalTax(60000, year=2026) | usd }} to {{ usFederalTax(60000 - 2050 - 6000, year=2026) | usd }}.

## Overtime and the Overtime Deduction

In hourly mode the calculator converts pay to annual income. Hours up to 40 a week are paid at the base rate and hours above 40 are paid at 1.5×, plus any extra overtime hours you enter. In annual mode the base rate is your salary divided by (hours per week × weeks per year), and the overtime hours you enter are paid at 1.5× on top of the salary.

For 2025 to 2028 the extra half of time-and-a-half pay on overtime required by federal law (the FLSA) is deductible: up to $12,500 a year ($25,000 on a joint return), reduced by $100 for each full $1,000 of income above $150,000 ($300,000 on a joint return) (26 U.S.C. 225, Schedule 1-A). The calculator counts only hours over 40 in a week. Switch "My overtime is required by federal law (FLSA)" off for work that is not FLSA overtime, such as a salaried exempt role.

Example: an hourly worker on $30 an hour who works 45 hours a week for 52 weeks, single, 2026. Gross pay is {{ (40 * 30 + 5 * 30 * 1.5) * 52 | usd }}. The premium half of the overtime pay is 5 hours × $30 × 0.5 × 52 weeks, which is {{ 5 * 30 / 2 * 52 | usd }}, below the cap and below the phase-out, so the deduction is {{ 5 * 30 / 2 * 52 | usd }}. That cuts federal tax from {{ usFederalTax((40 * 30 + 5 * 30 * 1.5) * 52, year=2026) | usd }} to {{ usFederalTax((40 * 30 + 5 * 30 * 1.5) * 52 - 5 * 30 / 2 * 52, year=2026) | usd }}, a saving of {{ usFederalTax((40 * 30 + 5 * 30 * 1.5) * 52, year=2026) - usFederalTax((40 * 30 + 5 * 30 * 1.5) * 52 - 5 * 30 / 2 * 52, year=2026) | usd }}.

## FICA Taxes

FICA (the Federal Insurance Contributions Act) funds Social Security and Medicare. Unlike income tax it has no standard deduction: it is worked out on gross pay, and a 401(k) does not reduce it.

**Social Security:** {{ usFact('ssRate') | pct1 }} on wages up to the wage base: {{ usFact('ssWageBase', year=2026) | usd }} for 2026 and {{ usFact('ssWageBase', year=2027) | usd }} for 2027. Pay above the cap is exempt. The maximum for 2026 is {{ usFact('ssWageBase', year=2026) * usFact('ssRate') / 100 | usd }}.

**Medicare:** {{ usFact('medicareRate') | pct(2) }} on all wages, with no cap, plus an additional {{ usFact('additionalMedicareRate') | pct1 }} above {{ usFact('additionalMedicareThreshold') | usd }} for single and head of household filers ({{ usFact('additionalMedicareThreshold', status=married) | usd }} for married filing jointly).

For most workers FICA is {{ usFact('ssRate') + usFact('medicareRate') | pct(2) }} of gross pay ({{ usFact('ssRate') | pct1 }} plus {{ usFact('medicareRate') | pct(2) }}). Your employer pays a further {{ usFact('ssRate') + usFact('medicareRate') | pct(2) }}, which is not in your take-home figure. The Social Security cap applies per person, so on a joint return of two earners the calculator flags that two salaries can owe more than it shows.

## 401(k) Pre-Tax Contributions

A 401(k) contribution reduces federal and state taxable pay but does not reduce FICA wages. The calculator caps the contribution at the IRS employee limit for the year ({{ usFact('k401Limit', year=2026) | usd }} for 2026, under age 50 and with no catch-up). For 2027 the IRS had not published its limit when this page was checked, so the calculator carries the 2026 limit and says so.

A 10% contribution on a $75,000 salary puts {{ 75000 * 10 / 100 | usd }} into the 401(k). It saves {{ usFederalTax(75000, year=2026) - usFederalTax(75000, k401=10, year=2026) | usd }} of federal tax (at the {{ usBracket(75000, year=2026) | pct }} marginal rate) and lowers take-home pay by {{ usTakeHome(75000, year=2026) - usTakeHome(75000, k401=10, year=2026) | usd }} before any state tax, so {{ 75000 * 10 / 100 | usd }} goes into the retirement account at a cost of {{ usTakeHome(75000, year=2026) - usTakeHome(75000, k401=10, year=2026) | usd }} in take-home pay.

## State Tax

State income tax varies from 0% in the nine states that do not tax wages (Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming, per the Tax Foundation's list as of 1 January 2026) to double-digit top rates in a few states. The calculator takes one effective rate, defaulting to 5%, and applies it to pay after the 401(k), with no state standard deduction. For a state with progressive brackets, enter your effective rate (total state tax divided by gross income) for the most accurate result. At $75,000 a year, a 5% rate is {{ usPay(75000, state=5, year=2026).state | usd }}. Enter 0 for a state with no tax on wages.

## Not Included

The calculator does not include the 2025-2028 tips deduction (up to $25,000) or car-loan interest deduction (up to $10,000), itemised deductions, tax credits such as the Child Tax Credit, or city and county taxes. It also shows the effective deduction rate (taxes plus the 401(k) as a share of gross pay), which can look higher than your tax rate because the 401(k) is savings, not tax.

## Common Misconceptions

The most widespread misconception about US taxes is that moving into a higher bracket means all your income is taxed at the higher rate. It is not: only income within each bracket is taxed at that bracket's rate, so earning $1 more than a threshold never leaves you with less. At $75,000 a single filer is in the {{ usBracket(75000, year=2026) | pct }} bracket but pays an effective federal rate of {{ usFederalTax(75000, year=2026) / 75000 * 100 | pct1 }}.

Another common mistake is mixing up marginal and effective rates. The marginal rate only applies to the next dollar earned. Including FICA and a 5% state rate, the next dollar at $75,000 loses {{ usMarginalRate(75000, state=5, year=2026) | pct1 }}.
