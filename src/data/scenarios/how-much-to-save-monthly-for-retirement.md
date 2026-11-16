---
title: "Retire by 65 with $1M: Save {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a Month From 30"
slug: "how-much-to-save-monthly-for-retirement"
description: "Saving {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month from age 30 at 7% reaches $1 million by 65. See how starting age changes the amount, and what $1 million is worth in today's money."
keywords: ["how much to save for retirement", "retirement savings per month", "save for retirement by 65", "monthly retirement savings calculator"]
toolSlug: "retirement-contribution"
toolCategory: "income-and-planning"
inputs:
  Current Age: "30"
  Retirement Age: "65"
  Current Savings: "$0"
  Target: "$1,000,000"
  Expected Return: "7%"
resultSummary: "{{ savingsMonthly(1000000, 0, 7, 420) | usd }}/month from age 30 at 7% returns"
affiliateContext: "Open a retirement account"
affiliatePrograms:
  - "Betterment"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## You need {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month, and the earlier you start, the less it costs

**Starting at age 30 with nothing saved, investing {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month at a 7% average annual return (compounded monthly) gets you to $1 million by age 65.** That is about {{ savingsMonthly(1000000, 0, 7, 420) * 12 | usd }} a year, a manageable amount for many working professionals. Wait until 40, and the required monthly amount is about {{ savingsMonthly(1000000, 0, 7, 300) / savingsMonthly(1000000, 0, 7, 420) | num(1) }} times as much.

## The math: 35 years of compound growth

Over 35 years you contribute about {{ savingsMonthly(1000000, 0, 7, 420) * 420 | usd }} ({{ savingsMonthly(1000000, 0, 7, 420) | usd }} x 420 months). The remaining {{ 1000000 - savingsMonthly(1000000, 0, 7, 420) * 420 | usd }}, or {{ (1000000 - savingsMonthly(1000000, 0, 7, 420) * 420) / 1000000 * 100 | pct }} of your million dollars, comes from investment returns. Time is doing most of the work.

- **By age 35 (5 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 5).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 5).contributions | usd }})
- **By age 40 (10 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 10).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 10).contributions | usd }})
- **By age 45 (15 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 15).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 15).contributions | usd }})
- **By age 50 (20 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 20).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 20).contributions | usd }})
- **By age 55 (25 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 25).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 25).contributions | usd }})
- **By age 60 (30 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 30).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 30).contributions | usd }})
- **By age 65 (35 years):** {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 35).nominal | usd }} (contributed {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 35).contributions | usd }})

At age 40 the balance is {{ retirementFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 10).nominal / 1000000 * 100 | pct }} of the target. Most of the growth comes after 50, when the base is large enough for compounding to show. This is normal, and it is why sticking with the plan through the slow early years matters.

## Starting age changes everything

| Starting age | Years to 65 | Monthly savings needed | Total contributed |
|-------------|------------|----------------------|-------------------|
| 22 | 43 | {{ savingsMonthly(1000000, 0, 7, 516) | usd }} | {{ savingsMonthly(1000000, 0, 7, 516) * 516 | usd }} |
| 25 | 40 | {{ savingsMonthly(1000000, 0, 7, 480) | usd }} | {{ savingsMonthly(1000000, 0, 7, 480) * 480 | usd }} |
| 30 | 35 | {{ savingsMonthly(1000000, 0, 7, 420) | usd }} | {{ savingsMonthly(1000000, 0, 7, 420) * 420 | usd }} |
| 35 | 30 | {{ savingsMonthly(1000000, 0, 7, 360) | usd }} | {{ savingsMonthly(1000000, 0, 7, 360) * 360 | usd }} |
| 40 | 25 | {{ savingsMonthly(1000000, 0, 7, 300) | usd }} | {{ savingsMonthly(1000000, 0, 7, 300) * 300 | usd }} |
| 45 | 20 | {{ savingsMonthly(1000000, 0, 7, 240) | usd }} | {{ savingsMonthly(1000000, 0, 7, 240) * 240 | usd }} |
| 50 | 15 | {{ savingsMonthly(1000000, 0, 7, 180) | usd }} | {{ savingsMonthly(1000000, 0, 7, 180) * 180 | usd }} |

Starting at 25 instead of 30 saves you {{ savingsMonthly(1000000, 0, 7, 420) - savingsMonthly(1000000, 0, 7, 480) | usd }} a month. Starting at 40 instead of 30 costs you {{ savingsMonthly(1000000, 0, 7, 300) - savingsMonthly(1000000, 0, 7, 420) | usd }} a month more, about {{ savingsMonthly(1000000, 0, 7, 300) / savingsMonthly(1000000, 0, 7, 420) | num(1) }} times the amount. Every year of delay is expensive because you lose a year of compounding at the end, where growth is fastest.

## What $1 million is worth when you retire

The $1 million target is a future-dollar figure. At 3% inflation, $1 million in 35 years buys what {{ inflationAdjust(1000000, 3, 35, mode=value) | usd }} buys today. To have the buying power of $1 million today you would need about {{ inflationAdjust(1000000, 3, 35) | usd }} in 35 years, which takes a monthly saving of about {{ savingsMonthly(inflationAdjust(1000000, 3, 35), 0, 7, 420) | usd }} on the same assumptions. The [retirement contribution calculator](/tools/income-and-planning/retirement-contribution/) shows both the nominal and the inflation-adjusted result for your own numbers.

## Where to invest: tax-advantaged accounts first

The {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month can go into tax-advantaged accounts:

1. **401(k) with an employer match:** If your employer matches 50% of contributions up to 6% of salary, a $60,000 earner gets {{ 60000 * 6 / 100 * 50 / 100 | usd }} a year of free money. That means you only need about {{ savingsMonthly(1000000, 0, 7, 420) - 60000 * 6 / 100 * 50 / 100 / 12 | usd }} a month of your own money to reach the same total.
2. **Roth IRA:** {{ 7500 / 12 | usd }} a month maxes out the $7,500 annual limit for 2026. Growth is tax-free in retirement. Roth IRA contributions phase out at higher incomes, so check your eligibility.
3. **Traditional IRA:** The same $7,500 limit (2026), with a tax deduction now (subject to income and workplace-plan rules) and tax on withdrawal.

For most people the order is: 401(k) up to the match, then a Roth IRA up to the limit, then back to the 401(k) up to its {{ usFact('k401Limit', year=2026) | usd }} limit for 2026.

## What if you can only afford $300 a month?

At $300 a month and 7% returns from age 30, you reach approximately {{ compoundFV(0, 300, 7, 35) | usd }} by 65. That is not $1 million, but at 4% it provides {{ compoundFV(0, 300, 7, 35) * 4 / 100 | usd }} a year, a meaningful supplement to Social Security.

Ways to close the gap:
- **Raise your contribution as your pay grows.** Each extra $100 a month adds about {{ compoundFV(0, 100, 7, 35) | usd }} by 65 on these assumptions.
- **Use any employer match.** A full dollar-for-dollar match of 3% to 6% of a $60,000 salary is {{ 60000 * 3 / 100 / 12 | usd }} to {{ 60000 * 6 / 100 / 12 | usd }} a month, without costing you anything.
- **Work to 67.** Two extra years of contributions and growth add {{ compoundFV(0, 300, 7, 37) - compoundFV(0, 300, 7, 35) | usd }} on the $300 plan, and {{ compoundFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 37) - compoundFV(0, savingsMonthly(1000000, 0, 7, 420), 7, 35) | usd }} on the {{ savingsMonthly(1000000, 0, 7, 420) | usd }} plan.

## Is $1 million enough?

At a 4% withdrawal rate, $1 million provides {{ 1000000 * 4 / 100 | usd }} a year. The Social Security Administration estimates the average retired-worker benefit at about $2,170 a month ({{ 2170 * 12 | usd }} a year) from January 2027 (SSA fact sheet, announced 14 October 2026), and your own benefit depends on your earnings record. If you receive the average benefit, total income is about {{ 1000000 * 4 / 100 + 2170 * 12 | usd }} a year before tax. The $1 million is a future-dollar figure and the benefit is in 2027 dollars, so the real total will differ, as the section above shows.

Whether that is enough depends on:
- **Housing costs:** If your mortgage is paid off, your income goes much further.
- **Healthcare:** Medicare starts at 65 but does not cover everything. Premiums, deductibles and long-term care are extra.
- **Lifestyle:** Travel, hobbies and helping family members need additional budget.

Use the [Retirement Contribution Calculator](/tools/income-and-planning/retirement-contribution/) to find the exact monthly savings for your age, current balance and target. The formulas are in [how we calculate retirement contributions](/how-we-calculate/retirement-contribution/). For a lump-sum view, see [what $100,000 grows to in 30 years](/scenarios/100000-invested-30-years/).

Sources (checked 15 November 2026): [IRS, 2026 retirement limits (IR-2025-111)](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500) for the $24,500 401(k) and $7,500 IRA limits; [Social Security Administration, cost-of-living adjustment](https://www.ssa.gov/cola/) for the 2027 average-benefit estimate.
