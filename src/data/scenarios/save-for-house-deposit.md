---
title: "$60,000 Down Payment in 3 Years: {{ savingsMonthly(60000, 5000, 4, 36) | usd }} a Month"
slug: "save-for-house-deposit"
description: "Saving a $60,000 house deposit in 3 years from $5,000 takes {{ savingsMonthly(60000, 5000, 4, 36) | usd }} a month at an assumed 4%. Targets for other home prices and a realistic budget."
keywords: ["save for house deposit", "down payment savings plan", "60000 down payment", "how to save for a house"]
toolSlug: "savings-goal"
toolCategory: "saving-and-growth"
inputs:
  Target Amount: "$60,000"
  Current Savings: "$5,000"
  Time Frame: "3 years"
  Expected Return: "4% (assumed)"
resultSummary: "{{ savingsMonthly(60000, 5000, 4, 36) | usd }}/month (starting with $5,000)"
affiliateContext: "Earn more on your savings"
affiliatePrograms:
  - "SoFi"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## You need to save about {{ savingsMonthly(60000, 5000, 4, 36) | usd }} per month for 3 years

**Starting with $5,000 and earning an assumed 4% in a high-yield savings account, you need to save approximately {{ savingsMonthly(60000, 5000, 4, 36) | usd }} per month to reach $60,000 in 3 years.** Over 36 months, you contribute {{ savingsMonthly(60000, 5000, 4, 36) * 36 | usd }} out of pocket. Interest adds {{ compoundEarned(5000, savingsMonthly(60000, 5000, 4, 36), 4, 3) | usd }}, including growth on your starting $5,000. The interest helps, but at a 3-year horizon the heavy lifting is your monthly contribution.

## Why $60,000?

A $60,000 down payment is {{ 60000 / 300000 * 100 | pct }} of a $300,000 home, the usual threshold to avoid private mortgage insurance (PMI). PMI commonly costs between 0.5% and 1.5% of the loan a year, or {{ 240000 * 0.5 / 100 / 12 | usd }}–{{ 240000 * 1.5 / 100 / 12 | usd }} a month on a $240,000 loan. Avoiding it saves {{ 240000 * 0.5 / 100 | usd }}–{{ 240000 * 1.5 / 100 | usd }} a year.

For higher-priced homes, 20% down requires proportionally more. Your $5,000 starting balance stays the same, so the monthly figure grows a little more slowly than the price:

| Home price | 20% down payment | Monthly savings (3 years, 4%) |
|-----------|-----------------|------------------------------|
| $250,000 | {{ 250000 * 20 / 100 | usd }} | {{ savingsMonthly(250000 * 20 / 100, 5000, 4, 36) | usd }} |
| $300,000 | {{ 300000 * 20 / 100 | usd }} | {{ savingsMonthly(300000 * 20 / 100, 5000, 4, 36) | usd }} |
| $400,000 | {{ 400000 * 20 / 100 | usd }} | {{ savingsMonthly(400000 * 20 / 100, 5000, 4, 36) | usd }} |
| $500,000 | {{ 500000 * 20 / 100 | usd }} | {{ savingsMonthly(500000 * 20 / 100, 5000, 4, 36) | usd }} |

If {{ savingsMonthly(60000, 5000, 4, 36) | usd }}/month is too aggressive, you have three options: extend the timeline, lower the target home price, or accept a smaller down payment (10%, or 3.5% with an FHA loan). The [mortgage payment calculator](/tools/debt-and-loans/mortgage-payment/) shows what a smaller down payment does to the monthly cost, and [mortgage payments by amount](/scenarios/mortgage-payments-by-amount/#300k) lists loan sizes side by side.

## Where to keep down payment savings

With a 3-year timeline, your savings need to be safe and accessible, not in the stock market.

- **High-yield savings account:** Best option. FDIC-insured up to $250,000 per depositor, per bank ([FDIC](https://www.fdic.gov/deposit-insurance)), no market risk, instant access. The rate is variable and tracks the Federal Reserve's target range, which was 3.75-4.00% after the 17 September 2026 decision ([Federal Reserve, read 15 November 2026](https://www.federalreserve.gov/monetarypolicy/openmarket.htm)). At the assumed 4%, interest adds {{ compoundEarned(5000, savingsMonthly(60000, 5000, 4, 36), 4, 3) | usd }} over the 3 years; if your account pays less, the monthly amount rises.
- **Short-term CDs (6–12 month terms):** Often a little higher rate, but locked for the term. Ladder 6-month CDs so one matures every 6 months as you approach your purchase date.
- **Money market account:** Similar to a high-yield savings account, with slightly higher rates at some banks.
- **Treasury bills (3–6 month):** Interest is exempt from state and local tax. Available through TreasuryDirect.

Avoid stocks, crypto, or other volatile assets for money you need in 3 years. A 20% market drop in year 2 could delay your home purchase by years.

## Realistic monthly budgets to hit {{ savingsMonthly(60000, 5000, 4, 36) | usd }}

On a $70,000 salary, federal income tax and FICA alone leave {{ usTakeHome(70000) / 12 | usd }} a month ({{ taxYear('us') }} rates, single filer, no state tax). This budget assumes $4,500 a month of take-home pay instead, which is what you would keep in a state with an income tax of about {{ (usTakeHome(70000) / 12 - 4500) * 12 / 70000 * 100 | pct1 }} of pay. Saving {{ savingsMonthly(60000, 5000, 4, 36) | usd }} then means living on {{ 4500 - savingsMonthly(60000, 5000, 4, 36) | usd }}:

| Category | Monthly budget |
|----------|---------------|
| Rent (with roommates) | $900–$1,200 |
| Groceries | $250–$350 |
| Transportation | $200–$350 |
| Utilities + phone | $150–$200 |
| Insurance | $100–$150 |
| Everything else | $300–$500 |
| **Left after spending** | **{{ 4500 - (1200 + 350 + 350 + 200 + 150 + 500) | usd }}–{{ 4500 - (900 + 250 + 200 + 150 + 100 + 300) | usd }}** |

The budget lines are illustrative estimates. The room left after spending is larger than the {{ savingsMonthly(60000, 5000, 4, 36) | usd }} you need even at the top of every range, so this budget works with something to spare. It gets tight if rent or "everything else" runs above the ranges, and you can ease it by splitting rent with a partner or roommate. A dual-income household saving toward the same goal has much more flexibility.

## Accelerating the timeline

- **Automate on payday:** Set up a direct deposit split so {{ savingsMonthly(60000, 5000, 4, 36) * 12 / 26 | usd }} goes to your house fund every paycheck (biweekly). You never see the money in your spending account.
- **Tax refund:** A $3,000 refund, for example, adds {{ 3000 / savingsMonthly(60000, 5000, 4, 36) | num(1) }} months of savings in one deposit.
- **Side income:** Even $500/month from freelancing or a part-time job reduces the required savings from your salary to {{ savingsMonthly(60000, 5000, 4, 36) - 500 | usd }}/month.
- **Employer bonus:** A $5,000 annual bonus deposited into savings covers {{ 5000 / savingsMonthly(60000, 5000, 4, 36) | num(1) }} months of the {{ savingsMonthly(60000, 5000, 4, 36) | usd }} target.

## If 3 years is too aggressive

Extending to 4 years drops the monthly requirement to {{ savingsMonthly(60000, 5000, 4, 48) | usd }}. At 5 years, it falls to {{ savingsMonthly(60000, 5000, 4, 60) | usd }}. The trade-off: home prices keep moving while you save. If prices rose 3% a year, a $300,000 home would cost {{ inflationAdjust(300000, 3, 3) | usd }} after 3 years and {{ inflationAdjust(300000, 3, 5) | usd }} after 5. At 5% a year those figures would be {{ inflationAdjust(300000, 5, 3) | usd }} and {{ inflationAdjust(300000, 5, 5) | usd }}. Those growth rates are illustrations, not forecasts. Factor expected price growth into the timeline you choose, because a 20% deposit on a higher price is a higher target.

Use the [Savings Goal Calculator](/tools/saving-and-growth/savings-goal/) to model your specific target, timeline, and starting balance.
