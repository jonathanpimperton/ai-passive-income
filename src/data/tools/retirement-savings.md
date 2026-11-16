---
name: "Retirement Savings Calculator"
slug: "retirement-savings"
category: "income-and-planning"
description: "Retirement savings calculator: project your balance at retirement from savings, deposits, return and inflation, in today's money, with US and UK milestones."
keywords:
  - "retirement calculator"
  - "retirement savings calculator"
  - "how much to save for retirement"
  - "401k calculator"
  - "retirement planning calculator"
relatedTools:
  - "retirement-contribution"
  - "retirement-age"
  - "compound-interest"
  - "investment-return"
  - "inflation"
  - "savings-goal"
affiliateContext: "Start your retirement savings with an account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
calculationMethod: "Future value of a lump sum plus monthly deposits at the end of each month, compounded monthly, then divided by (1 + inflation)^years for today's money"
lastUpdated: "2026-11-15"
dataSources:
  - name: "IRS: 2026 401(k) and IRA limits (Notice 2025-67)"
    url: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500"
  - name: "IRS: 401(k) contribution limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "GOV.UK: State Pension age"
    url: "https://www.gov.uk/state-pension-age"
  - name: "GOV.UK: increasing the normal minimum pension age"
    url: "https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age"
faq:
  - question: "How much do I need to save for retirement?"
    answer: "A common rule of thumb is 25 times your yearly spending, the 4% rule turned around. If you spend $50,000 a year, that is {{ 50000 * 25 | usd }}. It varies with your lifestyle, healthcare costs, other income such as Social Security or a UK State Pension, and your retirement age. Enter what you have, what you save and a return, and the calculator shows where you end up in future money and in today's money."
  - question: "How much should I contribute to my 401(k)?"
    answer: "At least enough to get the full employer match, which is an immediate return on that money. Beyond it, many planners suggest saving 15% or more of gross income across all retirement accounts. The 2026 limit on employee 401(k) contributions is {{ usFact('k401Limit', year=2026) | usd }}, or {{ usFact('k401Limit', year=2026) + usFact('k401CatchUp', year=2026) | usd }} with the age 50 catch-up of {{ usFact('k401CatchUp', year=2026) | usd }}. Ages 60 to 63 can add a higher catch-up of {{ usFact('k401CatchUp60to63', year=2026) | usd }} instead (IRS Notice 2025-67). The calculator flags a monthly saving above the limit."
  - question: "What is the 4% rule for retirement?"
    answer: "The 4% rule says you can withdraw 4% of your savings in the first year of retirement and adjust that amount for inflation every year after, and the money should last about 30 years in historical US markets. With $1,000,000 saved, the first year's withdrawal is {{ 1000000 * 4 / 100 | usd }}. It is a guideline, not a guarantee, and a longer retirement calls for a lower rate."
  - question: "When should I start saving for retirement?"
    answer: "As early as you can. Saving $500 a month at 7% for 35 years gives {{ retirementFV(0, 500, 7, 35, inflation=3).nominal | usd }}; the same $500 for 25 years gives {{ retirementFV(0, 500, 7, 25, inflation=3).nominal | usd }}. Ten extra years of saving adds {{ retirementFV(0, 500, 7, 35, inflation=3).nominal - retirementFV(0, 500, 7, 25, inflation=3).nominal | usd }}, much more than the {{ 500 * 12 * 10 | usd }} deposited, because the early money compounds for longer."
  - question: "How does inflation affect my retirement savings?"
    answer: "Inflation lowers what your money buys. At 3% a year, $1,000,000 today buys what {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} buys now once 30 years have passed, and it would take {{ inflationAdjust(1000000, 3, 30) | usd }} then to match today's $1,000,000. That is why the calculator shows a today's-money figure beside the future balance."
  - question: "How does the calculator work for a UK pension?"
    answer: "Switch the currency to pounds. The projection is the same, but the milestones are UK ones: you can usually take benefits from a private or workplace pension from {{ ukFact('pensionAccessAge') | int }}, and the normal minimum pension age rises to {{ ukFact('pensionAccessAgeFrom2028') | int }} on 6 April 2028. The State Pension age is between 66 and 68 depending on your date of birth, so check the GOV.UK timetable for yours. The 401(k) limit note applies to US users only."
workedExamples:
  - title: "Starting retirement savings at 30"
    inputs:
      currentAge: 30
      retirementAge: 65
      currentSavings: 25000
      monthlyContribution: 750
      annualReturn: 7
    description: "A 30-year-old with $25,000 saved who contributes $750 a month at 7% reaches {{ retirementFV(25000, 750, 7, 35, inflation=3).nominal | usd }} by 65. With 3% inflation that is {{ retirementFV(25000, 750, 7, 35, inflation=3).real | usd }} in today's money, which supports about {{ retirementFV(25000, 750, 7, 35, inflation=3).real * 0.04 | usd }} a year in today's money on the 4% rule. Of the balance, {{ retirementFV(25000, 750, 7, 35, inflation=3).contributions | usd }} is savings and deposits and {{ retirementFV(25000, 750, 7, 35, inflation=3).growth | usd }} is growth."
  - title: "Catching up at 45"
    inputs:
      currentAge: 45
      retirementAge: 67
      currentSavings: 100000
      monthlyContribution: 1500
      annualReturn: 7
    description: "A 45-year-old with $100,000 saved who raises contributions to $1,500 a month at 7% reaches {{ retirementFV(100000, 1500, 7, 22, inflation=3).nominal | usd }} by 67, which is {{ retirementFV(100000, 1500, 7, 22, inflation=3).real | usd }} in today's money at 3% inflation. The 4% rule on that supports about {{ retirementFV(100000, 1500, 7, 22, inflation=3).real * 0.04 | usd }} a year in today's money, before Social Security. Starting earlier would have needed far less each month."
  - title: "Maximizing 401(k) contributions"
    inputs:
      currentAge: 28
      retirementAge: 60
      currentSavings: 15000
      monthlyContribution: 2042
      annualReturn: 8
    description: "A 28-year-old with $15,000 who contributes the 2026 401(k) limit of {{ usFact('k401Limit', year=2026) | usd }} ({{ usFact('k401Limit', year=2026) / 12 | usd }} a month) at 8% reaches {{ retirementFV(15000, usFact('k401Limit', year=2026) / 12, 8, 32, inflation=3).nominal | usd }} by 60, which is {{ retirementFV(15000, usFact('k401Limit', year=2026) / 12, 8, 32, inflation=3).real | usd }} in today's money. That supports about {{ retirementFV(15000, usFact('k401Limit', year=2026) / 12, 8, 32, inflation=3).real * 0.04 | usd }} a year in today's money on the 4% rule, five years before a 65 retirement. It assumes the limit stays level; in practice it rises most years."
---

## Are you saving enough?

A retirement savings calculator projects what you will have when you stop working from your current savings, your monthly saving, an expected return and your timeline. It answers the question most workers carry around: am I saving enough?

The answer depends on the numbers you put in, and the number that moves it most is time. At 7%, $500 a month for 35 years reaches {{ retirementFV(0, 500, 7, 35, inflation=3).nominal | usd }}, or {{ retirementFV(0, 500, 7, 35, inflation=3).real | usd }} in today's money at 3% inflation. The same $500 for 25 years reaches only {{ retirementFV(0, 500, 7, 25, inflation=3).nominal | usd }}.

## How the projection works

<div class="stat-highlight">
  <span class="stat-number">{{ retirementFV(0, 500, 7, 35, inflation=3).nominal / retirementFV(0, 500, 7, 25, inflation=3).nominal | num(1) }}x</span>
  <span class="stat-text">is how much larger the balance is after 35 years of saving $500 a month than after 25 years, at 7%. The extra ten years more than double the result.</span>
</div>

Your existing savings grow at your expected return, and each monthly deposit starts to compound from the month it goes in. The calculator compounds monthly, adds deposits at the end of each month, and divides by inflation to give a today's-money figure.

Three inputs matter most:

1. **Time.** Years until retirement is the biggest factor. Starting ten years earlier more than doubles the balance in the example above.
2. **Contribution.** Every increase in your monthly saving compounds over the full period.
3. **Return.** The calculator takes one constant rate. A diversified stock portfolio has returned more than bonds or cash over the long run but with large swings, so test a cautious rate and a hopeful one. At $500 a month for 35 years, 5% gives {{ retirementFV(0, 500, 5, 35, inflation=3).nominal | usd }}, 7% gives {{ retirementFV(0, 500, 7, 35, inflation=3).nominal | usd }} and 9% gives {{ retirementFV(0, 500, 9, 35, inflation=3).nominal | usd }}.

## Turning a balance into an income

The most quoted guide is the 4% rule: withdraw 4% of your savings in year one of retirement, then adjust for inflation. To use it backwards, multiply the yearly income you need from savings by 25. If you want $60,000 a year, that is {{ 60000 * 25 | usd }}. If Social Security covers $24,000 of it, savings have to provide $36,000, which needs {{ 36000 * 25 | usd }}.

> **Tip:** the 4% rule assumes about a 30-year retirement. If you plan to stop before 60, many planners use a lower withdrawal rate, 3.5% or 3%.

## Retirement account types (US)

| Account | Contributions | Withdrawals | Main benefit |
|---|---|---|---|
| **401(k) / 403(b)** | Pre-tax, reduces taxable income | Taxed as income | Employer match |
| **Traditional IRA** | Often tax-deductible | Taxed as income | Lower tax now |
| **Roth IRA** | After-tax | Tax-free | Tax-free growth |
| **HSA** | Tax-deductible | Tax-free for medical costs | Tax advantage on both ends |

The 2026 IRA limit is $7,500 (IRS Notice 2025-67), which is $625 a month. A 30-year-old who puts $500 a month into a Roth IRA at 7% accumulates {{ retirementFV(0, 500, 7, 35, inflation=3).nominal | usd }} by 65, and the growth comes out tax-free on qualified withdrawals.

## What the calculator includes, and what it leaves out

It includes your savings, monthly deposit, return, retirement age and inflation. It does not include taxes on withdrawals, fees on the investments (see the [investment fee calculator](/tools/saving-and-growth/investment-fee/)), Social Security or State Pension income, or the pattern of market returns. It treats the return as the same every year.

## When to use this calculator

- **Check you are on track.** Compare the today's-money result with what you expect to spend.
- **Test scenarios.** Retire three years earlier, save 5% more, or earn 1% less.
- **Work backwards.** Use the [retirement contribution calculator](/tools/income-and-planning/retirement-contribution/) for the monthly amount a target needs.
- **See the cost of delay.** Compare starting now with starting in a year.

## Mistakes that cost money

1. **Underestimating costs.** Healthcare can be one of the largest costs in retirement, and prices rise faster than the headline rate. Do not plan on today's spending without allowing for it.
2. **Ignoring inflation.** $1,000,000 in 30 years buys what {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} buys today at 3% inflation. Judge the result in today's money.
3. **Forgetting other income.** Most Americans qualify for Social Security, which reduces what savings must cover. Check your projected benefit at ssa.gov. UK savers should do the same with their State Pension forecast on GOV.UK.
4. **Leaving the employer match unused.** If you are not contributing enough to get the full match, you are turning down money.

## What to do next

Run your numbers at a cautious return, 5% to 7%, and 3% inflation. If the result falls short, raise the monthly saving and see how much it moves the answer. If you are not yet getting your full employer match, do that first.
