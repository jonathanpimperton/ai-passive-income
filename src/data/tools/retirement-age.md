---
name: "Retirement Age Calculator"
slug: "retirement-age"
category: "income-and-planning"
description: "Retirement age calculator: find the age your savings reach a target at a given monthly contribution and return, with US and UK pension milestones."
keywords:
  - "when can I retire"
  - "retirement age calculator"
  - "early retirement calculator"
  - "when to retire"
  - "FIRE calculator"
relatedTools:
  - "retirement-savings"
  - "retirement-contribution"
  - "investment-return"
  - "compound-interest"
  - "inflation"
  - "investment-fee"
affiliateContext: "Start your retirement savings with an account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
calculationMethod: "Month-by-month projection until the balance reaches the target"
lastUpdated: "2026-11-15"
dataSources:
  - name: "IRS: 401(k) contribution limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "IRS: additional tax on early distributions (topic 558)"
    url: "https://www.irs.gov/taxtopics/tc558"
  - name: "Social Security: retirement age and benefit reduction"
    url: "https://www.ssa.gov/benefits/retirement/planner/agereduction.html"
  - name: "GOV.UK: State Pension age"
    url: "https://www.gov.uk/state-pension-age"
  - name: "GOV.UK: increasing the normal minimum pension age"
    url: "https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age"
faq:
  - question: "At what age can I realistically retire?"
    answer: "It depends on your savings rate, your return and your target. Take a 30-year-old with $50,000 saved, a $1,000,000 target and 7% a year: at $500 a month they reach the target at age {{ 30 + yearsToTarget(50000, 500, 7, 1000000) | floor | int }} (in {{ yearsToTarget(50000, 500, 7, 1000000) * 12 | months }}). At $1,000 a month it is age {{ 30 + yearsToTarget(50000, 1000, 7, 1000000) | floor | int }} (in {{ yearsToTarget(50000, 1000, 7, 1000000) * 12 | months }}), and at $2,000 a month age {{ 30 + yearsToTarget(50000, 2000, 7, 1000000) | floor | int }}."
  - question: "Can I retire early with $500,000?"
    answer: "Under the 4% rule of thumb, $500,000 supports about {{ 500000 * 0.04 | usd }} a year. If that covers your spending, possibly with Social Security or a pension added, you can stop work. If you spend $40,000 a year you need {{ 40000 / 0.04 | usd }} on that rule, so you keep saving. Enter your target and the calculator finds the age you reach it."
  - question: "What is a good target to retire at 50?"
    answer: "Retiring at 50 means 15 or more years before Social Security (US, from 62) or the State Pension (UK, 66 to 68) and before Medicare at 65, so your savings cover everything in between. Planners often use a lower withdrawal rate for a longer retirement. At 3.3%, spending of $50,000 a year needs about {{ 50000 / 0.033 | roundTo(100000) | usd }}, and $30,000 a year needs about {{ 30000 / 0.033 | roundTo(100000) | usd }}. Treat both as starting points, not guarantees."
  - question: "How does increasing my savings rate affect my retirement age?"
    answer: "A lot, because the extra deposits also compound. For a 30-year-old with $50,000 and a $1,000,000 target at 7%, going from $500 to $1,000 a month moves the date forward by {{ yearsToTarget(50000, 500, 7, 1000000) - yearsToTarget(50000, 1000, 7, 1000000) | num(1) }} years, and going from $1,000 to $2,000 a month moves it forward by another {{ yearsToTarget(50000, 1000, 7, 1000000) - yearsToTarget(50000, 2000, 7, 1000000) | num(1) }} years. The second doubling costs twice as much for about the same time saved."
  - question: "What is the difference between this and the FIRE number?"
    answer: "The FIRE (financial independence, retire early) number is usually 25 times annual spending, the 4% rule turned around: spending of $40,000 a year gives {{ 25 * 40000 | usd }}. This calculator finds when you reach any target you set. For FIRE, enter 25 times your spending as the target."
  - question: "Should I factor in Social Security?"
    answer: "Before 62 it will not help. From 62, check your estimated benefit at ssa.gov and subtract it from your yearly spending before you set the target. If you need $50,000 a year and Social Security pays $20,000, your savings need to cover $30,000 a year: {{ 30000 / 0.04 | usd }} on the 4% rule instead of {{ 50000 / 0.04 | usd }}."
  - question: "How does this work for a UK pension?"
    answer: "Choose pounds as your currency and the calculator uses UK milestones. You can usually take benefits from a private or workplace pension from {{ ukFact('pensionAccessAge') | int }}, and the normal minimum pension age rises to {{ ukFact('pensionAccessAgeFrom2028') | int }} on 6 April 2028. The State Pension age is between 66 and 68 depending on your date of birth: check the GOV.UK timetable for yours. The savings projection itself works the same way."
workedExamples:
  - title: "When can I retire with $1 million?"
    inputs:
      currentAge: 35
      currentSavings: 100000
      monthlyContribution: 1000
      targetBalance: 1000000
      annualReturn: 7
    description: "A 35-year-old with $100,000 saved and $1,000 a month at 7% reaches $1,000,000 at age {{ 35 + yearsToTarget(100000, 1000, 7, 1000000) | floor | int }}, in {{ yearsToTarget(100000, 1000, 7, 1000000) * 12 | months }}. Savings and deposits account for {{ 100000 + 1000 * yearsToTarget(100000, 1000, 7, 1000000) * 12 | usd }} of the balance, and growth supplies the other {{ compoundFV(100000, 1000, 7, yearsToTarget(100000, 1000, 7, 1000000)) - 100000 - 1000 * yearsToTarget(100000, 1000, 7, 1000000) * 12 | usd }}."
  - title: "FIRE target at an aggressive savings rate"
    inputs:
      currentAge: 28
      currentSavings: 50000
      monthlyContribution: 2500
      targetBalance: 1500000
      annualReturn: 8
    description: "Saving $2,500 a month at 8% from a $50,000 start reaches $1,500,000 at age {{ 28 + yearsToTarget(50000, 2500, 8, 1500000) | floor | int }}, in {{ yearsToTarget(50000, 2500, 8, 1500000) * 12 | months }}: retirement before 50. Savings and deposits come to {{ 50000 + 2500 * yearsToTarget(50000, 2500, 8, 1500000) * 12 | usd }} and growth adds {{ compoundFV(50000, 2500, 8, yearsToTarget(50000, 2500, 8, 1500000)) - 50000 - 2500 * yearsToTarget(50000, 2500, 8, 1500000) * 12 | usd }}. An 8% return is a high assumption, so test 6% as well."
  - title: "Modest saver aiming for a comfortable retirement"
    inputs:
      currentAge: 40
      currentSavings: 75000
      monthlyContribution: 500
      targetBalance: 750000
      annualReturn: 7
    description: "A 40-year-old with $75,000 saved and $500 a month at 7% reaches $750,000 at age {{ 40 + yearsToTarget(75000, 500, 7, 750000) | floor | int }}, in {{ yearsToTarget(75000, 500, 7, 750000) * 12 | months }}. On the 4% rule that supports about {{ 750000 * 0.04 | usd }} a year, before any Social Security."
---

## Retirement age is the answer, not the input

Most retirement calculators fix an age and report a balance. This one runs the other way: give it your savings, your monthly deposit, your expected return and a target balance, and it finds the age you reach the target.

**At the calculator's starting numbers (age 30, $50,000 saved, $500 a month, 7%, a $1,000,000 target) you reach the target at age {{ 30 + yearsToTarget(50000, 500, 7, 1000000) | floor | int }}, in {{ yearsToTarget(50000, 500, 7, 1000000) * 12 | months }}.** The date moves a long way for small changes in the monthly deposit, which is the point of the tool.

## How the date is found

The calculator steps through your plan one month at a time. Each month the balance grows at one twelfth of the annual return, then your deposit is added. The answer is the first month the balance meets the target, and deposits stop there. The search runs to age 90. If the target is not met by then, it says so and shows the shortfall and the monthly deposit that would close it. If your savings already meet the target, it says "Already there". It also shows the target in today's money, using an inflation rate you set (default 3%).

## What the savings rate does

<div class="stat-highlight">
  <span class="stat-number">{{ 30 + yearsToTarget(50000, 1000, 7, 1000000) | floor | int }}</span>
  <span class="stat-text">is the age you reach $1,000,000 if you save $1,000 a month instead of $500, from the same start (age 30, $50,000, 7%). At $500 a month it is {{ 30 + yearsToTarget(50000, 500, 7, 1000000) | floor | int }}.</span>
</div>

From age 30 with $50,000 at 7% and a $1,000,000 target:

- **$500 a month:** age {{ 30 + yearsToTarget(50000, 500, 7, 1000000) | floor | int }}, after {{ yearsToTarget(50000, 500, 7, 1000000) | num(1) }} years.
- **$1,000 a month:** age {{ 30 + yearsToTarget(50000, 1000, 7, 1000000) | floor | int }}, after {{ yearsToTarget(50000, 1000, 7, 1000000) | num(1) }} years.
- **$2,000 a month:** age {{ 30 + yearsToTarget(50000, 2000, 7, 1000000) | floor | int }}, after {{ yearsToTarget(50000, 2000, 7, 1000000) | num(1) }} years.

Each doubling saves about {{ yearsToTarget(50000, 500, 7, 1000000) - yearsToTarget(50000, 1000, 7, 1000000) | num(1) }} to {{ yearsToTarget(50000, 1000, 7, 1000000) - yearsToTarget(50000, 2000, 7, 1000000) | num(1) }} years, but the second doubling costs twice as much extra each month.

## Setting the target from your spending

A target is a number you choose. A common way to choose it is to divide yearly spending by a withdrawal rate. The 4% rule of thumb says you can withdraw 4% of the pot in the first year and adjust for inflation after that, so a $40,000 budget needs {{ 40000 / 0.04 | usd }}. A longer retirement, such as one starting at 50, usually calls for a lower rate. Social Security or a pension you will receive later lowers the amount the pot has to cover.

## Ages that change the plan (US)

| Age | What happens |
|---|---|
| **50** | 401(k) catch-up contributions: {{ usFact('k401CatchUp', year=2026) | usd }} a year on top of the {{ usFact('k401Limit', year=2026) | usd }} limit (2026) |
| **55** | Rule of 55: penalty-free 401(k) withdrawals if you leave that employer in or after the year you turn 55 |
| **59½** | No 10% early-withdrawal penalty on 401(k) and IRA withdrawals |
| **60 to 63** | Higher 401(k) catch-up of {{ usFact('k401CatchUp60to63', year=2026) | usd }} a year (2026) |
| **62** | Earliest Social Security claim, with a permanently reduced benefit |
| **65** | Medicare eligibility |
| **67** | Full Social Security retirement age for anyone born in 1960 or later |
| **70** | Largest Social Security benefit: 124% of the full amount when the full retirement age is 67 |

Retiring before 59½ means paying for life from taxable savings, or using a provision such as the Rule of 55, until penalty-free withdrawals begin.

## Ages that change the plan (UK)

When you choose pounds, the calculator shows UK milestones instead. You can usually take benefits from a private or workplace pension from {{ ukFact('pensionAccessAge') | int }}, rising to {{ ukFact('pensionAccessAgeFrom2028') | int }} on 6 April 2028 (some schemes have a protected pension age). The State Pension age depends on your date of birth and is between 66 and 68 under the timetable in law today; the GOV.UK State Pension age checker gives yours.

## What to do next

Enter your own numbers and see the date. If it is later than you want, try a higher monthly deposit, a later target age, or a smaller target. Use the [retirement contribution calculator](/tools/income-and-planning/retirement-contribution/) to work out the monthly amount needed for a fixed retirement age.
