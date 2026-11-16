---
name: "Net Worth Calculator"
slug: "net-worth"
category: "income-and-planning"
description: "Net worth calculator: add up your assets and liabilities, see the total with a chart of both sides, and compare it with Federal Reserve medians by age."
keywords:
  - "net worth calculator"
  - "how to calculate net worth"
  - "personal net worth tracker"
  - "am I on track"
relatedTools:
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "investment-return"
  - "retirement-contribution"
  - "salary-us"
affiliateContext: "Grow your net worth with a smart investment account"
affiliatePrograms:
  - "Betterment"
  - "SoFi"
  - "Wealthfront"
calculationMethod: "Total assets minus total liabilities"
dataSources:
  - name: "Federal Reserve: Changes in U.S. Family Finances from 2022 to 2025 (Survey of Consumer Finances), Table 2"
    url: "https://www.federalreserve.gov/publications/files/scf26.pdf"
faq:
  - question: "What is net worth and how do you calculate it?"
    answer: "Net worth is the total value of everything you own (assets) minus everything you owe (liabilities). Assets include cash, investments, property and retirement accounts. Liabilities include mortgages, student loans, credit card debt and car loans. Net worth = assets - liabilities. The calculator accepts decimals and suffixes such as 25k, and shows a negative result clearly."
  - question: "What is the median net worth by age?"
    answer: "The Federal Reserve's Survey of Consumer Finances for 2025 (published October 2026, in 2025 dollars) gives these medians by age of the head of the family: under 35, $33,000; 35 to 44, $155,600; 45 to 54, $253,700; 55 to 64, $411,900; 65 to 74, $431,300; 75 and over, $504,900. The median for all families is $215,900. Means are much higher, because a few very wealthy families pull them up: the mean for 35 to 44 is $681,900, about {{ 681900 / 155600 | num(1) }} times the median."
  - question: "Is it normal to have a negative net worth?"
    answer: "Yes, especially when you are young. Student loans, a new mortgage or a car loan can put debts above assets, and the Federal Reserve's 2025 median for families under 35 was only $33,000, so many in that group have little or less than nothing. The direction matters more than the level: if your net worth rises from one year to the next, you are on track. A person with {{ 3000 + 5000 + 8000 + 12000 | usd }} of assets and {{ 35000 + 8000 + 2000 | usd }} of debts is {{ 3000 + 5000 + 8000 + 12000 - (35000 + 8000 + 2000) | abs | usd }} under water, and paying down the loans changes that fast."
  - question: "Should I include my home in my net worth?"
    answer: "Yes. Count it at its market value and count the mortgage as a liability; the difference is your home equity. A $400,000 home with a $300,000 mortgage adds {{ 400000 - 300000 | usd }} to your net worth. Use recent comparable sales for the value, not a hopeful estimate."
  - question: "How often should I calculate my net worth?"
    answer: "Quarterly suits most people: often enough to see a trend, not so often that market swings dominate. Monthly makes sense while you are paying down debt or building savings. Daily checks add noise, because short-term market moves mean little."
workedExamples:
  - title: "Recent graduate, age 25"
    inputs:
      assets: "checking $3,000, savings $5,000, 401k $8,000, car $12,000"
      liabilities: "student loans $35,000, car loan $8,000, credit card $2,000"
    description: "Assets are {{ 3000 + 5000 + 8000 + 12000 | usd }} and liabilities {{ 35000 + 8000 + 2000 | usd }}, so net worth is -{{ 3000 + 5000 + 8000 + 12000 - (35000 + 8000 + 2000) | abs | usd }}. The Federal Reserve's 2025 median for families under 35 is $33,000, and a negative figure is common with student loans. The loans are the whole story here: clearing them is what moves the number."
  - title: "Mid-career professional, age 38"
    inputs:
      assets: "home $380,000, 401k $185,000, savings $25,000, brokerage $40,000, car $18,000"
      liabilities: "mortgage $290,000, student loans $12,000, car loan $10,000"
    description: "Assets are {{ 380000 + 185000 + 25000 + 40000 + 18000 | usd }} and liabilities {{ 290000 + 12000 + 10000 | usd }}, so net worth is {{ 380000 + 185000 + 25000 + 40000 + 18000 - (290000 + 12000 + 10000) | usd }}. That is {{ 336000 / 155600 | num(1) }} times the 2025 median of $155,600 for ages 35 to 44 (Federal Reserve, Survey of Consumer Finances)."
  - title: "Pre-retiree, age 58"
    inputs:
      assets: "home $520,000, 401k $680,000, IRA $120,000, savings $45,000, brokerage $95,000"
      liabilities: "mortgage $85,000, car loan $15,000"
    description: "Assets are {{ 520000 + 680000 + 120000 + 45000 + 95000 | usd }} and liabilities {{ 85000 + 15000 | usd }}, so net worth is {{ 520000 + 680000 + 120000 + 45000 + 95000 - (85000 + 15000) | usd }}, about {{ 1360000 / 411900 | num(1) }} times the 2025 median of $411,900 for ages 55 to 64. The investable part, excluding the home, is {{ 680000 + 120000 + 45000 + 95000 | usd }}; on the 4% rule that supports about {{ (680000 + 120000 + 45000 + 95000) * 0.04 | usd }} a year in withdrawals, before Social Security. The home is real wealth, but it only pays you if you sell or downsize."
---

## One number for your financial position

Net worth is the simplest snapshot of your finances: everything you own minus everything you owe. It sums savings, investments, property and debts into one figure.

The formula is **net worth = total assets - total liabilities**. With $200,000 of assets and $150,000 of debts, net worth is {{ 200000 - 150000 | usd }}.

Net worth measures wealth you have built up, where income measures what flows in. You can earn a high salary and still have a low or negative net worth if spending and debt absorb it.

## What counts as an asset

<div class="stat-highlight">
  <span class="stat-number">$33K</span>
  <span class="stat-text">is the median net worth of US families under 35 in the Federal Reserve's 2025 Survey of Consumer Finances. A low or negative figure in your 20s is common; the direction matters more.</span>
</div>

Assets are anything you own that has a money value:

- **Cash and savings:** checking, savings, money market funds
- **Investments:** brokerage accounts, stocks, bonds, funds, cryptocurrency
- **Retirement accounts:** 401(k), IRA, Roth IRA, pension value
- **Property:** your home's market value, rental property, land
- **Vehicles:** cars and boats at what they would sell for, not what you paid
- **Other:** a business you own, valuable collections, life insurance cash value

Use current market values and be conservative.

## What counts as a liability

Liabilities are everything you owe:

- **Mortgage:** the remaining balance on your home loan
- **Student loans:** federal and private
- **Auto loans:** what is left to pay
- **Credit cards:** current balances
- **Personal loans** and any other borrowing
- **Medical or tax debt** and other obligations

## Net worth by age

The Federal Reserve's Survey of Consumer Finances is the standard benchmark. For 2025 (published October 2026, in 2025 dollars):

| Age of head of family | Median net worth | Mean net worth |
|---|---|---|
| Under 35 | $33,000 | $135,400 |
| 35 to 44 | $155,600 | $681,900 |
| 45 to 54 | $253,700 | $1,244,500 |
| 55 to 64 | $411,900 | $1,878,000 |
| 65 to 74 | $431,300 | $1,897,600 |
| 75 and over | $504,900 | $1,962,200 |

Source: Federal Reserve, "Changes in U.S. Family Finances from 2022 to 2025," Table 2. For all families the median is $215,900 and the mean $1,241,500.

> **Use the median.** Half of families are above it and half below. The mean is far higher, because a small number of very wealthy families lift it: for ages 35 to 44 it is {{ 681900 / 155600 | num(1) }} times the median.

## Tracking it over time

One calculation is a snapshot. Repeating it each quarter shows whether your habits are working, even when month-to-month progress is hard to see.

The trend matters more than the level. A 28-year-old at -$30,000 who improves by $15,000 a year is in better shape than a 45-year-old at $200,000 who has not moved in five years.

> **Example:** a net worth that goes from -$10,000 to $5,000 over a year has improved by {{ 5000 + 10000 | usd }}. Direction beats position.

## Using the calculator

- **Set a baseline.** See where you stand today.
- **Track progress.** Recalculate each quarter.
- **Find priorities.** See which debts are largest and which assets are doing little.
- **Plan milestones.** Set a target for an age or a life event and compare with the medians above.

## Mistakes that distort the number

1. **Overvaluing your home.** Use recent comparable sales, not a portal estimate.
2. **Leaving out debts.** Count every card balance and personal loan.
3. **Valuing a car at its purchase price.** It is worth what someone would pay now. Kelley Blue Book or Edmunds give a private-party value, which is more useful than the trade-in or the price you paid. The same applies to boats and RVs.
4. **Checking too often.** Daily swings in market value tell you little. Quarterly is enough.

## What to do next

Calculate your net worth today and write it down with the date. Set a reminder to do it again in three months. Over time the trend will tell you more than any single number.
