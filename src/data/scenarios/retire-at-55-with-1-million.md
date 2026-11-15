---
title: "Can I Retire at 55 with $1 Million?"
slug: "retire-at-55-with-1-million"
description: "$1 million supports about {{ 1000000 * 4 / 100 | usd }} a year at a 4% withdrawal. What $1,500 a month from age 30 builds by 55, and how to bridge to Social Security."
keywords: ["retire at 55", "retire with 1 million", "early retirement calculator", "retirement savings plan", "FIRE movement"]
toolSlug: "retirement-savings"
toolCategory: "income-and-planning"
inputs:
  Current Age: "30"
  Retirement Age: "55"
  Current Savings: "$50,000"
  Monthly Contribution: "$1,500"
  Expected Return: "7%"
resultSummary: "{{ retirementFV(50000, 1500, 7, 25).nominal | usd }} by age 55"
affiliateContext: "Open a retirement account"
affiliatePrograms:
  - "Betterment"
datePublished: "2026-03-02"
dateModified: "2026-11-15"
---

## $1 million supports about {{ 1000000 * 4 / 100 | usd }} a year from age 55

**Under the widely used 4% rule, $1 million supports withdrawals of about {{ 1000000 * 4 / 100 | usd }} a year ({{ 1000000 * 4 / 100 / 12 | usd }} a month) before tax. A more cautious 3.5% rate, often suggested for retirements that may last 35 to 40 years, gives about {{ 1000000 * 3.5 / 100 | usd }} a year ({{ 1000000 * 3.5 / 100 / 12 | usd }} a month).** Whether that is enough depends on your spending and on how you cover the years before Social Security and Medicare begin. Both are covered below.

Getting to $1 million is realistic on these inputs. **Starting with $50,000 at age 30 and contributing $1,500 a month at a 7% average annual return (compounded monthly), you would have about {{ retirementFV(50000, 1500, 7, 25).nominal | usd }} by age 55.** The balance first passes $1 million about {{ yearsToTarget(50000, 1500, 7, 1000000) | num(1) }} years in, at age {{ 30 + yearsToTarget(50000, 1500, 7, 1000000) | floor | int }}.

## Growth from age 30 to 55: contributions vs. compounding

Over 25 years you put in {{ retirementFV(50000, 1500, 7, 25).contributions | usd }} of your own money ($1,500 x 300 months, plus the $50,000 start). The remaining {{ retirementFV(50000, 1500, 7, 25).growth | usd }} comes from investment returns: by age 55, {{ retirementFV(50000, 1500, 7, 25).growth / retirementFV(50000, 1500, 7, 25).nominal * 100 | pct }} of the balance is growth.

Here is how the balance grows over time (7% a year, compounded monthly, deposits at the end of each month):

- **By age 35 (5 years in):** {{ retirementFV(50000, 1500, 7, 5).nominal | usd }}, of which {{ retirementFV(50000, 1500, 7, 5).growth / retirementFV(50000, 1500, 7, 5).nominal * 100 | pct }} is growth.
- **By age 40 (10 years in):** {{ retirementFV(50000, 1500, 7, 10).nominal | usd }}, {{ retirementFV(50000, 1500, 7, 10).growth / retirementFV(50000, 1500, 7, 10).nominal * 100 | pct }} growth.
- **By age 45 (15 years in):** {{ retirementFV(50000, 1500, 7, 15).nominal | usd }}, {{ retirementFV(50000, 1500, 7, 15).growth / retirementFV(50000, 1500, 7, 15).nominal * 100 | pct }} growth.
- **By age 50 (20 years in):** {{ retirementFV(50000, 1500, 7, 20).nominal | usd }}, {{ retirementFV(50000, 1500, 7, 20).growth / retirementFV(50000, 1500, 7, 20).nominal * 100 | pct }} growth.
- **By age 55 (25 years in):** {{ retirementFV(50000, 1500, 7, 25).nominal | usd }}, {{ retirementFV(50000, 1500, 7, 25).growth / retirementFV(50000, 1500, 7, 25).nominal * 100 | pct }} growth.

The share that comes from growth rises every year, because each year's returns are earned on a larger balance. The harder question is not whether you can accumulate $1 million. It is whether $1 million will sustain you for 30 or more years of retirement.

## The hidden costs of retiring a decade early

The widely cited **4% rule** (from William Bengen's 1994 study and the later Trinity study) suggests you can withdraw 4% of your portfolio in the first year, then adjust that dollar amount for inflation, without running out of money over a 30-year retirement. On the {{ retirementFV(50000, 1500, 7, 25).nominal | usd }} projected above, that gives about **{{ retirementFV(50000, 1500, 7, 25).nominal * 4 / 100 | usd }} a year** ({{ retirementFV(50000, 1500, 7, 25).nominal * 4 / 100 / 12 | usd }} a month) before taxes. These are future dollars: at 3% inflation, the 25-year balance is worth {{ retirementFV(50000, 1500, 7, 25, inflation=3).real | usd }} in today's money.

But retiring at 55 creates challenges that retirees at 65 do not face:

- **Social Security gap:** You cannot claim retirement benefits before 62 (reduced), and full retirement age is 67 if you were born in 1960 or later. From 55 that is {{ 62 - 55 | int }} to {{ 67 - 55 | int }} years of living on savings alone.
- **Healthcare costs:** Medicare does not start until 65. Marketplace premiums depend on your state, plan and any subsidy, so get a quote at healthcare.gov. As a planning assumption, budget $600 to $1,200 a month ({{ 600 * 12 | usd }} to {{ 1200 * 12 | usd }} a year) for a decade. That range is our assumption, not a quote.
- **Early withdrawal penalties:** Pulling from a 401(k) or traditional IRA before age 59 and a half usually triggers a 10% penalty on top of income tax. A **Roth conversion ladder** (converting traditional IRA money to Roth five years before you need it) or the **Rule of 55** (penalty-free withdrawals from the 401(k) of the employer you leave in or after the year you turn 55) can help you avoid it. See IRS Topic 558 below.
- **Longer timeline risk:** A 55-year-old retiree needs the money to last 35 to 40 years, not 25 to 30. Some planners suggest a 3.5% withdrawal rate for early retirees, which gives about {{ retirementFV(50000, 1500, 7, 25).nominal * 3.5 / 100 | usd }} a year on the projected balance, or {{ 1000000 * 3.5 / 100 | usd }} on exactly $1 million.

A bridge strategy helps: keep 3 to 5 years of expenses in cash or short-term bonds to cover the gap before Social Security and Medicare, while the rest stays invested for growth.

## Adjusting the savings rate, timeline, and return assumptions

- **You save $1,000 a month instead of $1,500:** The balance at 55 is about {{ retirementFV(50000, 1000, 7, 25).nominal | usd }}. That is {{ retirementFV(50000, 1000, 7, 25).nominal - 1000000 | usd }} past $1 million, a thin cushion for a bad decade in the markets.
- **You start at 25 instead of 30 (same $50,000 and $1,500 a month):** Five extra years of compounding give about {{ retirementFV(50000, 1500, 7, 30).nominal | usd }}. Those five early years are worth {{ retirementFV(50000, 1500, 7, 30).nominal - retirementFV(50000, 1500, 7, 25).nominal | usd }}.
- **Markets return 5% instead of 7%:** The ending balance is about {{ retirementFV(50000, 1500, 5, 25).nominal | usd }}. The 2-point difference costs {{ retirementFV(50000, 1500, 7, 25).nominal - retirementFV(50000, 1500, 5, 25).nominal | usd }}, a reminder that fees and asset allocation matter over long horizons.
- **You add $200 a month ($1,700 in total):** The balance at 55 is about {{ retirementFV(50000, 1700, 7, 25).nominal | usd }}, which supports {{ retirementFV(50000, 1700, 7, 25).nominal * 4 / 100 | usd }} a year at 4%.

Your numbers will differ with your age, savings rate and returns. Use the [Retirement Savings Calculator](/tools/income-and-planning/retirement-savings/) with these inputs to reproduce the figures on this page, or the [Retirement Age Calculator](/tools/income-and-planning/retirement-age/) to find the age your savings reach a target. The formulas are in [how we calculate retirement savings](/how-we-calculate/retirement-savings/). For other starting points, see [retiring at 50 with the FIRE approach](/scenarios/retire-at-50-fire/) and [retiring at 60 with $500K](/scenarios/retire-at-60-with-500k/).

Sources (checked 15 November 2026): [IRS Topic 558, additional tax on early distributions](https://www.irs.gov/taxtopics/tc558) for the 10% penalty and the age-55 exception; [Social Security retirement benefits](https://www.ssa.gov/benefits/retirement/) for claiming ages and full retirement age.
