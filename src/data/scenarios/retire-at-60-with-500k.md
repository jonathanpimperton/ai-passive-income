---
title: "Retire at 60 on $500K: {{ 500000 * 4 / 100 | usd }} a Year at 4%"
slug: "retire-at-60-with-500k"
description: "$500,000 supports about {{ 500000 * 4 / 100 | usd }} a year at a 4% withdrawal rate. How Social Security at 62 changes the math, and strategies to make it last."
keywords: ["retire at 60 with 500k", "500k retirement", "can I retire with 500000", "early retirement 500k"]
toolSlug: "retirement-savings"
toolCategory: "income-and-planning"
inputs:
  Current Savings: "$500,000"
  Retirement Age: "60"
  Monthly Withdrawal: "{{ 500000 * 4 / 100 / 12 | usd }}"
  Expected Return: "5%"
resultSummary: "{{ 500000 * 4 / 100 | usd }}/year (4% rule) + Social Security at 62"
affiliateContext: "Open a retirement account"
affiliatePrograms:
  - "Betterment"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## $500K supports {{ 500000 * 4 / 100 | usd }} a year: tight but possible with a plan

**At a 4% withdrawal rate, $500,000 provides {{ 500000 * 4 / 100 | usd }} a year ({{ 500000 * 4 / 100 / 12 | usd }} a month) in retirement income.** With no other income, that is only about {{ (500000 * 4 / 100 / 15960 - 1) * 100 | pct }} above the 2026 federal poverty guideline for a one-person household ($15,960), but the picture improves once Social Security starts at 62. Whether $500K is enough depends on your expenses, other income and how you bridge the gap.

## The first two years: the hardest part

Retiring at 60 means {{ 62 - 60 | int }} years without Social Security (the earliest claim age is 62). During those years your $500K must cover everything:

- **{{ 500000 * 4 / 100 | usd }} a year from the portfolio** (4% withdrawal)
- **No Social Security** until 62
- **No Medicare** until 65

If your annual expenses are $30,000, the portfolio alone falls short by {{ 30000 - 500000 * 4 / 100 | usd }} a year. You would need part-time income, a pension, or a larger withdrawal (5% is {{ 500000 * 5 / 100 | usd }}, 6% is {{ 500000 * 6 / 100 | usd }}) to bridge the gap. A higher withdrawal rate also raises the risk of running out later.

## Social Security changes the math at 62

Your benefit depends on your own earnings record and when you claim. For illustration, assume a full-retirement-age (67) benefit of $2,000 a month in today's money; your own estimate is on your Social Security statement at ssa.gov. For people born in 1960 or later, claiming at 62 pays 70% of the full benefit, 65 pays about 86.7%, and 70 pays 124% (SSA early and delayed claiming rules).

At 62 that is {{ 2000 * 70 / 100 | usd }} a month ({{ 2000 * 70 / 100 * 12 | usd }} a year). Combined with the 4% portfolio withdrawal:

- **Annual income at 62:** {{ 500000 * 4 / 100 | usd }} + {{ 2000 * 70 / 100 * 12 | usd }} = {{ 500000 * 4 / 100 + 2000 * 70 / 100 * 12 | usd }}
- **Monthly income:** {{ (500000 * 4 / 100 + 2000 * 70 / 100 * 12) / 12 | usd }}

{{ 500000 * 4 / 100 + 2000 * 70 / 100 * 12 | usd }} a year is livable in many parts of the US, particularly if your home is paid off. In low-cost areas it can cover a modest retirement. In high-cost cities it would be a stretch. For comparison, the Social Security Administration estimates the average retired-worker benefit at about $2,170 a month from January 2027 (SSA fact sheet, announced 14 October 2026).

## Delaying Social Security to 67 vs claiming at 62

Using the same illustrative $2,000 full benefit:

| Claiming age | Share of full benefit | Monthly benefit | Annual benefit | Breakeven age vs claiming at 62 |
|-------------|----------------------|----------------|---------------|-------------------|
| 62 | 70% | {{ 2000 * 70 / 100 | usd }} | {{ 2000 * 70 / 100 * 12 | usd }} | n/a |
| 65 | 86.7% | {{ 2000 * 86.7 / 100 | usd }} | {{ 2000 * 86.7 / 100 * 12 | usd }} | {{ 65 + (2000 * 70 / 100) * (65 - 62) / (2000 * 86.7 / 100 - 2000 * 70 / 100) | num(1) }} |
| 67 (full) | 100% | {{ 2000 | usd }} | {{ 2000 * 12 | usd }} | {{ 67 + (2000 * 70 / 100) * (67 - 62) / (2000 - 2000 * 70 / 100) | num(1) }} |
| 70 | 124% | {{ 2000 * 124 / 100 | usd }} | {{ 2000 * 124 / 100 * 12 | usd }} | {{ 70 + (2000 * 70 / 100) * (70 - 62) / (2000 * 124 / 100 - 2000 * 70 / 100) | num(1) }} |

The breakeven age is when the extra monthly benefit from waiting has made up for the checks you skipped (ignoring inflation adjustments and investment returns). If you can bridge the gap to 67 or 70, the higher benefit adds {{ 2000 - 2000 * 70 / 100 | usd }} to {{ 2000 * 124 / 100 - 2000 * 70 / 100 | usd }} a month for life. But bridging means drawing the $500K down faster in the early years.

A middle-ground strategy: withdraw 5% ({{ 500000 * 5 / 100 | usd }} a year) from the portfolio from 60 to 67, claim Social Security at full retirement age, then cut portfolio withdrawals to 3% ({{ 500000 * 3 / 100 | usd }} a year on $500,000). At this page's assumed 5% return, withdrawing 5% a year only matches the growth, so the balance stays near $500,000 (before inflation and with no bad years), and at 67 you would have about {{ 500000 * 3 / 100 + 2000 * 12 | usd }} a year from the portfolio and Social Security together. Real markets do not return 5% every year, so treat this as a best case.

## Making $500K last 30 years

A 60-year-old might need funds for 25 to 30 years (to age 85 or 90). The 4% rule was designed for a 30-year retirement, so it technically fits, but the order of returns matters.

If the stock market drops 30% in your first year of retirement, your portfolio falls to {{ 500000 * (100 - 30) / 100 | usd }}, and the same {{ 500000 * 4 / 100 | usd }} withdrawal is then {{ 500000 * 4 / 100 / (500000 * (100 - 30) / 100) * 100 | pct1 }} of what is left. This sequence-of-returns risk is the biggest danger for early retirees.

Ways to reduce it:
- **Keep 2 to 3 years of expenses in cash or short-term bonds** ({{ 500000 * 4 / 100 * 2 | usd }} to {{ 500000 * 4 / 100 * 3 | usd }} at {{ 500000 * 4 / 100 | usd }} a year). Draw from this during market downturns instead of selling stocks at a loss.
- **Keep a meaningful stock allocation** even in retirement. You need growth to sustain 30 years of withdrawals. How much depends on your risk tolerance and other income.
- **Flexible withdrawals:** In bad market years, cut discretionary spending to a 3% withdrawal ({{ 500000 * 3 / 100 | usd }}). In good years, take up to 5% ({{ 500000 * 5 / 100 | usd }}).

## What would make $500K more comfortable?

- **A paid-off home:** A $1,000 monthly housing payment is {{ 1000 * 12 | usd }} a year, which is {{ 1000 * 12 / (500000 * 4 / 100) * 100 | pct }} of a {{ 500000 * 4 / 100 | usd }} withdrawal. Removing it makes the same income go much further.
- **Part-time work at 60 to 65:** Even $10,000 to $15,000 a year of part-time or freelance income cuts portfolio withdrawals in the critical early years.
- **A pension or annuity:** Any guaranteed income reduces the burden on the $500K.
- **Moving to a lower-cost area:** Living costs differ a lot between regions, and housing is usually the biggest gap.

Use the [Retirement Savings Calculator](/tools/income-and-planning/retirement-savings/) to model your own savings, return assumption and withdrawal plan. The formulas are in [how we calculate retirement savings](/how-we-calculate/retirement-savings/). If you are earlier in the journey, see [retiring at 55 with $1 million](/scenarios/retire-at-55-with-1-million/) and [retiring at 50 with the FIRE approach](/scenarios/retire-at-50-fire/).

Sources (checked 15 November 2026): [HHS poverty guidelines, 2026](https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines) ($15,960 for one person in the 48 contiguous states and DC, published 15 January 2026); [Social Security retirement benefits](https://www.ssa.gov/benefits/retirement/) for claiming ages and the early and delayed claiming percentages; [Social Security cost-of-living adjustment](https://www.ssa.gov/cola/) for the 2027 average-benefit estimate.
