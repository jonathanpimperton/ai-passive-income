---
title: "Retire at 50: Save {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a Month From Age 25"
slug: "retire-at-50-fire"
description: "Saving {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a month from age 25 at 7% builds about $1.5 million by 50. Savings rates, withdrawal strategy and the 25x rule."
keywords: ["retire at 50", "FIRE retirement", "financial independence retire early", "how to retire at 50"]
toolSlug: "retirement-savings"
toolCategory: "income-and-planning"
inputs:
  Current Age: "25"
  Retirement Age: "50"
  Current Savings: "$10,000"
  Monthly Contribution: "{{ savingsMonthly(1500000, 10000, 7, 300) | usd }}"
  Expected Return: "7%"
resultSummary: "~{{ savingsMonthly(1500000, 10000, 7, 300) | usd }}/month from age 25 (targeting $1.5M)"
affiliateContext: "Open a retirement account"
affiliatePrograms:
  - "Betterment"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## You need roughly {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a month from age 25 to retire at 50

**Starting with $10,000 at age 25 and investing {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a month at a 7% average annual return (compounded monthly), you accumulate approximately {{ retirementFV(10000, 1781, 7, 25).nominal | roundTo(100000) | usd }} by age 50.** Using the 4% rule, that provides {{ 1500000 * 4 / 100 | usd }} a year in retirement income ({{ 1500000 * 4 / 100 / 12 | usd }} a month), before tax and before any Social Security. That is a moderate lifestyle without needing a paycheck, if your spending stays at or below that level.

## The FIRE equation: 25 times your annual expenses

FIRE (Financial Independence, Retire Early) centers on one formula: save 25 times your annual expenses, then withdraw 4% a year. The 4% rule comes from historical US data and was designed for a 30-year retirement, so it is a guide rather than a guarantee, and it is on the optimistic side for a retirement of 40 years or more.

| Annual expenses | Savings target (25x) | Monthly savings at 7% for 25 years, from $10,000 |
|----------------|---------------------|-----------------------------------|
| $40,000 | {{ 40000 * 25 | usd }} | {{ savingsMonthly(40000 * 25, 10000, 7, 300) | usd }} |
| $50,000 | {{ 50000 * 25 | usd }} | {{ savingsMonthly(50000 * 25, 10000, 7, 300) | usd }} |
| $60,000 | {{ 60000 * 25 | usd }} | {{ savingsMonthly(60000 * 25, 10000, 7, 300) | usd }} |
| $80,000 | {{ 80000 * 25 | usd }} | {{ savingsMonthly(80000 * 25, 10000, 7, 300) | usd }} |

The lower your expenses, the easier FIRE becomes, both because the savings target drops and because you can save a larger share of your income.

## Growth timeline: age 25 to 50

- **Age 28 (3 years):** about {{ retirementFV(10000, 1781, 7, 3).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 3).contributions | usd }})
- **Age 30 (5 years):** about {{ retirementFV(10000, 1781, 7, 5).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 5).contributions | usd }})
- **Age 35 (10 years):** about {{ retirementFV(10000, 1781, 7, 10).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 10).contributions | usd }})
- **Age 40 (15 years):** about {{ retirementFV(10000, 1781, 7, 15).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 15).contributions | usd }})
- **Age 45 (20 years):** about {{ retirementFV(10000, 1781, 7, 20).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 20).contributions | usd }})
- **Age 50 (25 years):** about {{ retirementFV(10000, 1781, 7, 25).nominal | usd }} (contributed {{ retirementFV(10000, 1781, 7, 25).contributions | usd }})

You contribute {{ retirementFV(10000, 1781, 7, 25).contributions | usd }} in total, counting the $10,000 start. Investment returns add {{ retirementFV(10000, 1781, 7, 25).growth | usd }}, which is {{ retirementFV(10000, 1781, 7, 25).growth / retirementFV(10000, 1781, 7, 25).nominal * 100 | pct }} of the final balance. The portfolio first passes $1 million about {{ yearsToTarget(10000, 1781, 7, 1000000) | num(1) }} years in, at age {{ 25 + yearsToTarget(10000, 1781, 7, 1000000) | floor | int }}.

## What savings rate do you need?

FIRE requires aggressive saving. {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a month is {{ 1781 * 12 | usd }} a year. As a share of gross income, that is:

| Household income | Share of gross income needed for $1,781 a month |
|-----------------|------------------------------|
| $60,000 | {{ 1781 * 12 / 60000 * 100 | pct }} |
| $80,000 | {{ 1781 * 12 / 80000 * 100 | pct }} |
| $100,000 | {{ 1781 * 12 / 100000 * 100 | pct }} |
| $120,000 | {{ 1781 * 12 / 120000 * 100 | pct }} |
| $150,000 | {{ 1781 * 12 / 150000 * 100 | pct }} |

The other way to think about FIRE is through the savings rate. If you save half of any income, and spend the other half, your target is 25 times your spending, which is {{ 25 * 50 / 100 | num(1) }} times your income. Starting from nothing at 7% a year (ignoring inflation and tax), that is reached in about {{ yearsToTarget(0, 100000 * 50 / 100 / 12, 7, 25 * 100000 * 50 / 100) | num(1) }} years, whatever the income, because the target and the monthly saving scale together. Savings rate matters more than income.

## The gap before Social Security

Retiring at 50 means {{ 62 - 50 | int }} years until Social Security can start at 62 (with a reduced benefit) and {{ 67 - 50 | int }} years until full retirement age at 67 (for anyone born in 1960 or later). During those years your portfolio is the sole income source.

Key challenges:
- **Healthcare:** There is no Medicare until 65. Marketplace premiums depend on your state, plan and any subsidy, so get a quote at healthcare.gov. As a planning assumption, budget $500 to $1,200 a month ({{ 500 * 12 | usd }} to {{ 1200 * 12 | usd }} a year). That range is our assumption, not a quote.
- **401(k) access:** Withdrawals before age 59 and a half usually carry a 10% penalty on top of income tax. The Rule of 55 (penalty-free withdrawals from the 401(k) of the employer you leave in or after the year you turn 55) does not help at 50. A Roth conversion ladder (converting traditional IRA money to Roth five years before you need it) is the usual route. See IRS Topic 558 below.
- **Sequence of returns risk:** A 30% market drop in the first year of retirement is damaging, because you are selling into it. Keep 3 to 5 years of expenses in cash or bonds so you are not forced to sell stocks in a downturn.

## Lean FIRE vs Fat FIRE

The FIRE community uses two terms:

- **Lean FIRE** ($40,000 a year or less): minimal spending, often in a low-cost area. Requires {{ 40000 * 25 | usd }}. Achievable on modest incomes with high discipline.
- **Fat FIRE** ($80,000 to $120,000 a year): comfortable spending, including travel and discretionary purchases. Requires {{ 80000 * 25 | usd }} to {{ 120000 * 25 | usd }}. Typically needs a high-income career.

The $60,000 a year target in this scenario sits in between, sometimes called regular FIRE.

## What if you start at 30 instead of 25?

With only 20 years to age 50, you would need about {{ savingsMonthly(1500000, 10000, 7, 240) | usd }} a month to reach $1.5 million at 7%. That is {{ savingsMonthly(1500000, 10000, 7, 240) - savingsMonthly(1500000, 10000, 7, 300) | usd }} more a month, which shows why starting early is the biggest lever in the FIRE equation.

If you keep saving {{ savingsMonthly(1500000, 10000, 7, 300) | usd }} a month from age 30 and stop at 50, you reach about {{ retirementFV(10000, 1781, 7, 20).nominal | usd }}. That supports {{ retirementFV(10000, 1781, 7, 20).nominal * 4 / 100 | usd }} a year at 4%, which is closer to Lean FIRE. Retiring at 55 instead gives you the same 25 years of saving as the age-25 plan, so about {{ retirementFV(10000, 1781, 7, 25).nominal | roundTo(100000) | usd }} again.

Use the [Retirement Savings Calculator](/tools/income-and-planning/retirement-savings/) to find the exact savings rate for your FIRE number, timeline and starting balance. The formulas are in [how we calculate retirement savings](/how-we-calculate/retirement-savings/). For a later retirement age, see [retiring at 55 with $1 million](/scenarios/retire-at-55-with-1-million/) and [retiring at 60 with $500K](/scenarios/retire-at-60-with-500k/).

Sources (checked 15 November 2026): [IRS Topic 558, additional tax on early distributions](https://www.irs.gov/taxtopics/tc558) for the 10% penalty and the age-55 exception; [Social Security retirement benefits](https://www.ssa.gov/benefits/retirement/) for claiming ages.
