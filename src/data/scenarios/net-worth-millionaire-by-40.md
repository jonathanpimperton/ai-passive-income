---
title: "$1M by 40 Starting at 25: {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} a Month at 7%"
slug: "net-worth-millionaire-by-40"
description: "Starting at 25 with $10,000, reaching $1 million by 40 takes {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} a month at an assumed 7%. What it means for income, savings rate and a later start."
keywords: ["millionaire by 40", "1 million net worth", "how to reach 1m by 40", "millionaire path calculator"]
toolSlug: "savings-goal"
toolCategory: "saving-and-growth"
inputs:
  Current Age: "25"
  Target Age: "40"
  Starting Net Worth: "$10,000"
  Target Net Worth: "$1,000,000"
  Return: "7% a year (assumed)"
resultSummary: "{{ savingsMonthly(1000000, 10000, 7, 180) | usd }}/month at 7% returns for 15 years"
affiliateContext: "Grow your net worth faster"
affiliatePrograms:
  - "Betterment"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## You need to invest roughly {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} per month from age 25

**Starting with $10,000 at age 25 and earning an assumed 7% average annual return, you need to invest approximately {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} per month to reach $1 million in net worth by age 40.** That is {{ savingsMonthly(1000000, 10000, 7, 180) * 12 | usd }} per year. That is {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 120000 * 100 | pct }} of gross pay on a $120,000 household income, so it usually takes a high income or two earners. The 7% is a planning assumption, not a forecast: real returns vary a lot from year to year.

## The math behind $1 million in 15 years

Your $10,000 starting balance grows to {{ compoundFV(10000, 0, 7, 15) | usd }} on its own at 7% over 15 years. The remaining {{ 1000000 - compoundFV(10000, 0, 7, 15) | usd }} must come from monthly contributions and their compound growth.

- **Total contributed over 15 years:** $10,000 + ({{ savingsMonthly(1000000, 10000, 7, 180) | usd }} × 180 months) = {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 180 | usd }}
- **Investment returns:** {{ compoundEarned(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 15) | usd }}
- **Final balance:** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 15) | roundTo(1000) | usd }}

About {{ compoundEarned(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 15) / 10000 | num(0) }}% of your million comes from investment returns, so compounding is doing real work even on this relatively short timeline.

## Growth milestones

Saving {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} a month and earning 7% a year:

- **Age 27 (2 years):** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 2) | usd }} (contributed {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 24 | usd }})
- **Age 30 (5 years):** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 5) | usd }} (contributed {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 60 | usd }})
- **Age 33 (8 years):** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 8) | usd }} (contributed {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 96 | usd }})
- **Age 36 (11 years):** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 11) | usd }} (contributed {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 132 | usd }})
- **Age 40 (15 years):** {{ compoundFV(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 15) | roundTo(1000) | usd }} (contributed {{ 10000 + savingsMonthly(1000000, 10000, 7, 180) * 180 | usd }})

The first $250,000 takes about {{ yearsToTarget(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 250000) | num(1) }} years. The next $250,000 takes about {{ yearsToTarget(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 500000) - yearsToTarget(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 250000) | num(1) }} more, and the last $500,000 about {{ 15 - yearsToTarget(10000, savingsMonthly(1000000, 10000, 7, 180), 7, 500000) | num(1) }}. The hardest part is the first few years, when contributions dominate and growth feels slow.

## What income level makes this realistic?

{{ savingsMonthly(1000000, 10000, 7, 180) | usd }}/month requires different savings rates depending on income:

| Household income | Monthly savings needed | Savings rate |
|-----------------|----------------------|-------------|
| $80,000 | {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} | {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 80000 * 100 | pct }} of gross |
| $120,000 | {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} | {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 120000 * 100 | pct }} of gross |
| $160,000 | {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} | {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 160000 * 100 | pct }} of gross |
| $200,000 | {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} | {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 200000 * 100 | pct }} of gross |
| $250,000 | {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} | {{ savingsMonthly(1000000, 10000, 7, 180) * 12 / 250000 * 100 | pct }} of gross |

At $120,000 household income, hitting {{ savingsMonthly(1000000, 10000, 7, 180) | usd }}/month is doable if you keep housing costs under 25% of gross, avoid lifestyle inflation, and max out tax-advantaged accounts first. At $80,000 it takes nearly half of gross pay, which is unrealistic for most people.

## Tax-advantaged accounts are your best tools

Before investing {{ savingsMonthly(1000000, 10000, 7, 180) | usd }}/month in a taxable account, max out tax-advantaged options. The limits below are the 2026 figures:

1. **401(k) with employer match:** {{ usFact('k401Limit', year=2026) | usd }}/year employee limit ([IRS](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)). If your employer matches 4%, that is {{ 120000 * 4 / 100 | usd }} of "free" money on $120,000 of income.
2. **Roth IRA:** $7,500/year (if income permits; same IRS announcement). Grows completely tax-free.
3. **HSA (if eligible):** $4,400/year for self-only coverage ([IRS Rev. Proc. 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf)). Triple tax benefit: deduction, tax-free growth, tax-free withdrawal for medical.
4. **Taxable brokerage:** Everything above the tax-advantaged limits goes here.

A maxed 401(k) is {{ usFact('k401Limit', year=2026) / 12 | usd }}/month, a maxed Roth IRA {{ 7500 / 12 | usd }}/month, and a maxed HSA {{ 4400 / 12 | usd }}/month. Together that is {{ (usFact('k401Limit', year=2026) + 7500 + 4400) / 12 | usd }}/month of tax-advantaged room, so you would only need {{ savingsMonthly(1000000, 10000, 7, 180) - (usFact('k401Limit', year=2026) + 7500 + 4400) / 12 | usd }}/month in a taxable account to hit the {{ savingsMonthly(1000000, 10000, 7, 180) | usd }} target. These limits move every year, so check the current figures before you plan around them.

## What if you start later?

The table keeps the same $10,000 starting balance and the same 7% return, and has fewer months to reach $1 million by 40:

| Starting age | Monthly investment needed |
|-------------|------------------------|
| 25 | {{ savingsMonthly(1000000, 10000, 7, (40 - 25) * 12) | usd }} |
| 27 | {{ savingsMonthly(1000000, 10000, 7, (40 - 27) * 12) | usd }} |
| 30 | {{ savingsMonthly(1000000, 10000, 7, (40 - 30) * 12) | usd }} |
| 32 | {{ savingsMonthly(1000000, 10000, 7, (40 - 32) * 12) | usd }} |
| 35 | {{ savingsMonthly(1000000, 10000, 7, (40 - 35) * 12) | usd }} |

Starting at 30 instead of 25 requires {{ savingsMonthly(1000000, 10000, 7, (40 - 30) * 12) - savingsMonthly(1000000, 10000, 7, (40 - 25) * 12) | usd }} more per month, about {{ (savingsMonthly(1000000, 10000, 7, (40 - 30) * 12) - savingsMonthly(1000000, 10000, 7, (40 - 25) * 12)) * 12 | usd }} extra per year. Starting at 35 takes {{ savingsMonthly(1000000, 10000, 7, (40 - 35) * 12) | usd }} a month, which is out of reach for most incomes. Time is the most powerful variable.

## Alternative paths to $1M by 40

The {{ savingsMonthly(1000000, 10000, 7, 180) | usd }}/month assumes pure savings and investment returns. Other paths include:

- **Home equity:** Suppose you buy a $400,000 home at 28 with 20% down ($80,000) and a 30-year mortgage at {{ rate('us30') | pct(2) }} ({{ rateSource('us30') }}; a market snapshot, not a quote). After 12 years, at 40, the loan balance is {{ loanBalance(400000 - 400000 * 20 / 100, rate('us30'), 30, 144) | usd }}. With no price growth that is {{ 400000 - loanBalance(400000 - 400000 * 20 / 100, rate('us30'), 30, 144) | usd }} of equity; if the home gains 3% a year (an assumption, not a forecast) it is worth {{ inflationAdjust(400000, 3, 12) | usd }} and the equity is {{ inflationAdjust(400000, 3, 12) - loanBalance(400000 - 400000 * 20 / 100, rate('us30'), 30, 144) | usd }}. Home equity counts toward net worth, which reduces what you need to invest, but you still pay interest, tax, insurance and upkeep.
- **Equity compensation:** Stock options or RSUs from a tech or startup job can accelerate net worth rapidly, or turn out to be worth nothing.
- **Business income:** Side businesses or freelancing that generate extra investable income.

Most people who hit $1M by 40 use a combination of high savings rate, employer-matched retirement accounts, and at least one of the above accelerators.

The monthly figures on this page come from the [Savings Goal Calculator](/tools/saving-and-growth/savings-goal/), set to a $1,000,000 target over 180 months. Use the [Net Worth Calculator](/tools/income-and-planning/net-worth/) to track your current net worth and see how close you are, and compare with the typical US benchmark in [net worth at 30](/scenarios/net-worth-at-30/).
