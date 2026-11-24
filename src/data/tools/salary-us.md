---
name: "US Salary & Take-Home Calculator"
slug: "salary-us"
category: "income-and-planning"
description: "US take-home pay a month and a year for {{ taxYear('us') }}: federal tax, FICA, 401(k), overtime and a state tax estimate, from a salary or an hourly rate."
keywords:
  - "salary to hourly calculator"
  - "hourly to salary"
  - "annual salary calculator"
  - "take-home pay calculator US"
  - "US paycheck calculator"
  - "overtime calculator"
  - "net pay calculator"
  - "monthly take-home pay US"
affiliateContext: "Make your take-home pay work harder"
affiliatePrograms:
  - "Betterment"
  - "SoFi"
  - "Ally"
relatedTools:
  - "mortgage-affordability"
  - "retirement-contribution"
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "net-worth"
  - "inflation"
lastUpdated: "2026-11-16"
dataSources:
  - name: "IRS tax brackets and standard deduction, tax year 2026"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill"
  - name: "IRS Rev. Proc. 2026-35 (tax year 2027 brackets and deductions)"
    url: "https://www.irs.gov/pub/irs-drop/rp-26-35.pdf"
  - name: "Social Security wage base"
    url: "https://www.ssa.gov/oact/cola/cbb.html"
  - name: "401(k) contribution limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "IRS: overtime and senior deductions for 2025 to 2028"
    url: "https://www.irs.gov/newsroom/working-families-tax-cuts-tax-deductions-for-working-americans-and-seniors"
faq:
  - question: "How do I convert my salary to an hourly rate?"
    answer: "Divide your annual salary by the hours you work in a year. A full-time schedule of 40 hours a week for 52 weeks is 2,080 hours, so $60,000 a year is {{ 60000 / 2080 | usd(2) }} an hour. In the calculator's hourly mode, enter your rate, hours a week and weeks a year and it gives the annual figure and your take-home. Paid time off raises your effective hourly rate."
  - question: "How much will I take home on a $50,000, $75,000 or $100,000 salary?"
    answer: "For a single filer in {{ taxYear('us') }} with a 5% effective state tax and no 401(k): $50,000 leaves {{ usPay(50000, state=5).monthly | usd }} a month ({{ usPay(50000, state=5).takeHome | usd }} a year), $75,000 leaves {{ usPay(75000, state=5).monthly | usd }} a month ({{ usPay(75000, state=5).takeHome | usd }} a year) and $100,000 leaves {{ usPay(100000, state=5).monthly | usd }} a month ({{ usPay(100000, state=5).takeHome | usd }} a year). With no state income tax the same salaries leave {{ usPay(50000).monthly | usd }} a month ({{ usPay(50000).takeHome | usd }} a year), {{ usPay(75000).monthly | usd }} a month ({{ usPay(75000).takeHome | usd }} a year) and {{ usPay(100000).monthly | usd }} a month ({{ usPay(100000).takeHome | usd }} a year). The calculator shows the monthly and annual figure side by side for your own numbers."
  - question: "What is the difference between gross pay and net pay?"
    answer: "Gross pay is your total earnings before deductions. Net pay, or take-home pay, is what reaches your bank account after federal income tax, state income tax, Social Security ({{ usFact('ssRate') | pct(auto) }}), Medicare ({{ usFact('medicareRate') | pct(auto) }}) and pre-tax deductions such as 401(k) contributions or health insurance premiums. The calculator shows both a monthly and an annual net figure."
  - question: "How much of my salary goes to taxes in the US?"
    answer: "It depends on income, filing status and state. For {{ taxYear('us') }}, a single filer in a state with no income tax pays {{ usPay(50000).taxRate | pct1 }} of a $50,000 salary to federal tax and FICA, {{ usPay(75000).taxRate | pct1 }} of $75,000 and {{ usPay(150000).taxRate | pct1 }} of $150,000. A state income tax comes on top: at a 5% effective state rate, $75,000 takes {{ usPay(75000, state=5).taxRate | pct1 }} in total and leaves {{ usPay(75000, state=5).monthly | usd }} a month ({{ usPay(75000, state=5).takeHome | usd }} a year). Your own effective state rate is your state tax divided by your income, from last year's return."
  - question: "How do I calculate overtime pay?"
    answer: "Under the Fair Labor Standards Act (FLSA), covered workers earn 1.5 times their regular hourly rate for hours over 40 in a week. At $25 an hour, overtime pays {{ 25 * 1.5 | usd(2) }} an hour. Some states add their own rules; California, for example, requires overtime after 8 hours in a day. For tax years 2025 to 2028 the extra half of FLSA overtime pay is also deductible, up to $12,500 ($25,000 married filing jointly), phasing out above $150,000 ($300,000 jointly) of income. The calculator applies that deduction when you tick that your overtime is required by federal law."
  - question: "Is a $50,000 salary good in the US?"
    answer: "It depends on where you live and what you spend. A single filer on $50,000 takes home {{ usPay(50000).monthly | usd }} a month ({{ usPay(50000).takeHome | usd }} a year) after federal tax and FICA in a state with no income tax, and {{ usPay(50000, state=5).monthly | usd }} a month ({{ usPay(50000, state=5).takeHome | usd }} a year) with a 5% state tax. Compare that with your rent, commute and debts rather than with a national average: housing costs alone can differ several-fold between cities."
  - question: "Which US states have no income tax?"
    answer: "Nine states do not tax wages: Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming. New Hampshire's tax on interest and dividends ended for tax periods starting 1 January 2025 (NH Department of Revenue Administration). The calculator takes a flat effective state rate, so enter 0 for these states. At a 5% state rate, a $100,000 salary pays {{ usPay(100000, state=5).state | usd }} a year more than the same salary in a no-tax state."
  - question: "Which tax year does the calculator use?"
    answer: "It starts on the current calendar year when its figures exist, and has a tax-year choice for 2026 and 2027. The 2027 figures come from IRS Rev. Proc. 2026-35: the single standard deduction rises from {{ usFact('standardDeduction', year=2026) | usd }} to {{ usFact('standardDeduction', year=2027) | usd }} and the Social Security wage base from {{ usFact('ssWageBase', year=2026) | usd }} to {{ usFact('ssWageBase', year=2027) | usd }}. The 401(k) employee limit rises from {{ usFact('k401Limit', year=2026) | usd }} to {{ usFact('k401Limit', year=2027) | usd }} (IRS Notice 2026-66)."
workedExamples:
  - title: "Comparing hourly vs salaried job offers"
    inputs:
      annualSalary: 65000
      hourlyRate: 35
      hoursPerWeek: 40
      overtimeHours: 5
    description: "A salaried offer at $65,000 a year works out at {{ 65000 / 2080 | usd(2) }} an hour over 2,080 hours. A job at $35 an hour pays {{ 35 - 65000 / 2080 | usd(2) }} more per hour: {{ 35 * 40 * 52 | usd }} a year at 40 hours, which is {{ 35 * 40 * 52 / 65000 * 100 - 100 | pct }} more than the salary. With 5 overtime hours a week at time and a half, gross pay rises to {{ 35 * 40 * 52 + 5 * 35 * 1.5 * 52 | usd }}, or {{ (35 * 40 * 52 + 5 * 35 * 1.5 * 52) / 65000 * 100 - 100 | pct }} more. Take-home, single with a 5% state tax: the salary leaves {{ usPay(65000, state=5).monthly | usd }} a month ({{ usPay(65000, state=5).takeHome | usd }} a year) and the hourly job at 40 hours leaves {{ usPay(72800, state=5).monthly | usd }} a month ({{ usPay(72800, state=5).takeHome | usd }} a year). The calculator's overtime deduction then lowers the tax on the overtime case."
  - title: "Take-home pay on a $75,000 salary with a 401(k)"
    inputs:
      annualSalary: 75000
      filingStatus: "single"
      stateTaxRate: 5
      retirement401k: 6
    description: "A single filer on $75,000 with a 5% state tax and 6% into a 401(k), for tax year {{ taxYear('us') }}. Take-home is {{ usPay(75000, state=5, k401=6).monthly | usd }} a month, or {{ usPay(75000, state=5, k401=6).takeHome | usd }} a year. Federal tax is {{ usPay(75000, state=5, k401=6).federal | usd }}, state tax {{ usPay(75000, state=5, k401=6).state | usd }}, FICA {{ usPay(75000, state=5, k401=6).fica | usd }} and the 401(k) {{ usPay(75000, state=5, k401=6).k401 | usd }}. Without the 401(k), take-home would be {{ usPay(75000, state=5).monthly | usd }} a month ({{ usPay(75000, state=5).takeHome | usd }} a year): the 401(k) costs about {{ (usPay(75000, state=5).takeHome - usPay(75000, state=5, k401=6).takeHome) / 12 | usd }} a month of take-home for {{ usPay(75000, state=5, k401=6).k401 / 12 | usd }} a month saved."
  - title: "Part-time to full-time equivalent"
    inputs:
      hourlyRate: 22
      hoursPerWeek: 25
    description: "Working 25 hours a week at $22 an hour is {{ 22 * 25 * 52 | usd }} a year, or {{ usPay(22 * 25 * 52, state=5).monthly | usd }} a month after tax (single, 5% state tax; {{ usPay(22 * 25 * 52, state=5).takeHome | usd }} a year). The full-time equivalent at 40 hours a week is {{ 22 * 40 * 52 | usd }} a year, or {{ usPay(22 * 40 * 52, state=5).monthly | usd }} a month ({{ usPay(22 * 40 * 52, state=5).takeHome | usd }} a year). The comparison helps when you weigh extra hours or a second job."
---

## What you take home on a US salary

Take-home pay, also called net pay, is what reaches your bank account after federal income tax, state income tax, Social Security, Medicare and any pre-tax deductions such as a 401(k). The percentage lost depends on your income, filing status and state.

**On a $75,000 salary, a single filer with a 5% state tax takes home {{ usPay(75000, state=5).monthly | usd }} a month ({{ usPay(75000, state=5).takeHome | usd }} a year) for {{ taxYear('us') }}.** With no state income tax it is {{ usPay(75000).monthly | usd }} a month ({{ usPay(75000).takeHome | usd }} a year). The calculator shows the monthly and the annual figure with equal weight, so you can budget from the monthly one.

## How US federal income tax works

<div class="stat-highlight">
  <span class="stat-number">{{ usPay(75000).taxRate | pct1 }}</span>
  <span class="stat-text">of a $75,000 salary goes to federal income tax and FICA for a single filer with no state tax ({{ taxYear('us') }}). A state income tax comes on top.</span>
</div>

The US tax system is progressive: portions of your income are taxed at different rates, not the whole amount at one rate. For {{ taxYear('us') }}, single filer brackets are:

| Taxable income | Marginal rate |
|---|---|
| $0 to {{ usBracketStart(12) | usd }} | 10% |
| {{ usBracketStart(12) + 1 | usd }} to {{ usBracketStart(22) | usd }} | 12% |
| {{ usBracketStart(22) + 1 | usd }} to {{ usBracketStart(24) | usd }} | 22% |
| {{ usBracketStart(24) + 1 | usd }} to {{ usBracketStart(32) | usd }} | 24% |
| {{ usBracketStart(32) + 1 | usd }} to {{ usBracketStart(35) | usd }} | 32% |
| {{ usBracketStart(35) + 1 | usd }} to {{ usBracketStart(37) | usd }} | 35% |
| Over {{ usBracketStart(37) | usd }} | 37% |

Before tax is worked out, the standard deduction comes off: {{ usFact('standardDeduction') | usd }} for single filers and {{ usFact('standardDeduction', status=married) | usd }} for married couples filing jointly. The first {{ usFact('standardDeduction') | usd }} of a single filer's income is effectively untaxed.

> **Example:** on a $60,000 salary, taxable income is {{ usPay(60000).taxableIncome | usd }} after the standard deduction. You pay 10% on the first {{ usBracketStart(12) | usd }} and 12% on the remaining {{ usPay(60000).taxableIncome - usBracketStart(12) | usd }}: federal tax of {{ usFederalTax(60000) | usd }}, an effective rate of {{ usFederalTax(60000) / 60000 * 100 | pct1 }}.

## FICA: Social Security and Medicare

Every worker pays FICA (Federal Insurance Contributions Act) taxes, whatever the filing status:

- **Social Security:** {{ usFact('ssRate') | pct(auto) }} on pay up to {{ usFact('ssWageBase') | usd }} (the {{ taxYear('us') }} wage base). Your employer pays another {{ usFact('ssRate') | pct(auto) }}.
- **Medicare:** {{ usFact('medicareRate') | pct(auto) }} on all pay, plus {{ usFact('additionalMedicareRate') | pct(auto) }} on pay above {{ usFact('additionalMedicareThreshold') | usd }} for single filers or {{ usFact('additionalMedicareThreshold', status=married) | usd }} for married couples filing jointly.

No deduction or filing choice reduces FICA, and a 401(k) contribution does not either. On $75,000, FICA is {{ usPay(75000).fica | usd }} a year.

## State income tax is the big variable

The calculator takes one flat effective state rate, defaulting to 5%. That is your state tax divided by your income, not the top marginal rate of your state's tax table, which is why it is usually lower. Find yours on last year's state return. State tax is worked out after a 401(k) contribution comes off.

Here is how much the rate matters for a single filer on $75,000 ({{ taxYear('us') }}):

| Effective state rate | Take-home a month | Take-home a year |
|---|---|---|
| 0% | {{ usPay(75000, state=0).monthly | usd }} | {{ usPay(75000, state=0).takeHome | usd }} |
| 3% | {{ usPay(75000, state=3).monthly | usd }} | {{ usPay(75000, state=3).takeHome | usd }} |
| 5% | {{ usPay(75000, state=5).monthly | usd }} | {{ usPay(75000, state=5).takeHome | usd }} |
| 7% | {{ usPay(75000, state=7).monthly | usd }} | {{ usPay(75000, state=7).takeHome | usd }} |

Nine states do not tax wages (Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming), so enter 0 there. Several others charge a flat or near-flat rate. If you can work remotely from anywhere, running the same salary through different rates shows what a move is worth.

## Salary vs hourly

To convert, divide the annual salary by 2,080 hours (40 hours a week for 52 weeks). The hourly mode goes the other way: it multiplies your rate by your hours and weeks, and pays hours over 40 a week at time and a half.

Overtime changes the comparison. An hourly worker at $30 an hour who works 45 hours every week earns {{ (30 * 40 + 5 * 30 * 1.5) * 52 | usd }} a year, which is {{ (30 * 40 + 5 * 30 * 1.5) * 52 - 30 * 40 * 52 | usd }} more than the {{ 30 * 40 * 52 | usd }} base for 40 hours. Benefits belong in the comparison too: a 4% employer 401(k) match on a $62,400 salary is {{ 62400 * 0.04 | usd }} a year before any health insurance the employer pays for.

## What the calculator includes, and what it leaves out

It includes federal income tax with the standard deduction, FICA, a flat state tax, a pre-tax 401(k) (capped at the IRS limit for the year), the age 65 and over additional standard deduction and senior deduction, and the 2025 to 2028 deduction for FLSA overtime premium pay. It does not include itemised deductions, tax credits such as the child tax credit, the deductions for tips or car loan interest, other income, local taxes beyond what you put in the state rate, or health insurance and other pre-tax benefits. A tax preparer or the IRS withholding estimator covers those cases.

## Mistakes that cost money

1. **Forgetting FICA when comparing offers.** Social Security and Medicare take {{ usFact('ssRate') + usFact('medicareRate') | pct(auto) }} of every paycheck. On $75,000 that is {{ usPay(75000).fica | usd }} a year.
2. **Using a state's top rate as your state rate.** The box wants your effective rate. A 5% rate on $75,000 is {{ usPay(75000, state=5).state | usd }} a year, {{ usPay(75000, state=5).state / 12 | usd }} a month.
3. **Skipping the pre-tax 401(k).** Contributions reduce taxable income for federal and state tax, though not FICA, while building retirement savings. The 2026 employee limit is {{ usFact('k401Limit', year=2026) | usd }}.

## What to do next

Enter your salary or hourly rate, your filing status and your state rate. Compare job offers by running each through the calculator and reading the monthly figure, not the annual one alone.
