---
title: "Inflation: $1M Buys Only {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} After 30 Years"
slug: "inflation-impact-on-retirement"
description: "At 3% inflation, $1 million buys what {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} buys today after 30 years. How the 4% rule and Social Security cope, and how to plan for it."
keywords: ["inflation retirement", "1 million retirement inflation", "retirement purchasing power", "inflation erosion savings"]
toolSlug: "inflation"
toolCategory: "economic"
inputs:
  Retirement Fund: "$1,000,000"
  Inflation Rate: "3%"
  Retirement Length: "30 years"
resultSummary: "Buys only {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} worth of goods after 30 years"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## Your $1 million buys only {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} worth of goods after 30 years

**At 3% annual inflation, $1 million in purchasing power declines to the equivalent of {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} over a 30-year retirement.** A retiree who needs $40,000 a year in today's dollars will need {{ inflationAdjust(40000, 3, 30) | usd }} a year after 30 years of 3% inflation to keep the same lifestyle. This is why inflation is sometimes called the silent killer of retirement plans.

## Decade-by-decade erosion

Here is what $1 million buys in today's dollars as the years pass:

| Year | Purchasing power | Equivalent monthly spending |
|------|-----------------|---------------------------|
| 0 | {{ 1000000 | usd }} | {{ 1000000 / 12 | usd }} |
| 5 | {{ inflationAdjust(1000000, 3, 5, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 5, mode=value) / 12 | usd }} |
| 10 | {{ inflationAdjust(1000000, 3, 10, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 10, mode=value) / 12 | usd }} |
| 15 | {{ inflationAdjust(1000000, 3, 15, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 15, mode=value) / 12 | usd }} |
| 20 | {{ inflationAdjust(1000000, 3, 20, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 20, mode=value) / 12 | usd }} |
| 25 | {{ inflationAdjust(1000000, 3, 25, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 25, mode=value) / 12 | usd }} |
| 30 | {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} | {{ inflationAdjust(1000000, 3, 30, mode=value) / 12 | usd }} |

A retiree drawing $40,000 a year (4% of $1 million) maintains their lifestyle at first. But if that $40,000 never increased, by year 15 it would buy only {{ inflationAdjust(40000, 3, 15, mode=value) | usd }} worth of today's goods. By year 30 it would buy just {{ inflationAdjust(40000, 3, 30, mode=value) | usd }}, which is {{ inflationAdjust(40000, 3, 30, mode=value) / 40000 * 100 | pct }} of what it covered at the start.

## Why the 4% rule needs an inflation adjustment

The original 4% rule (William Bengen, Journal of Financial Planning, October 1994) already allows for inflation: you withdraw 4% in the first year, then raise the dollar amount by inflation each year. On $1 million at 3% inflation:

- **Year 1:** withdraw {{ 1000000 * 4 / 100 | usd }}
- **Year 5:** withdraw {{ inflationAdjust(40000, 3, 4) | usd }}
- **Year 10:** withdraw {{ inflationAdjust(40000, 3, 9) | usd }}
- **Year 20:** withdraw {{ inflationAdjust(40000, 3, 19) | usd }}
- **Year 30:** withdraw {{ inflationAdjust(40000, 3, 29) | usd }}

Bengen found that, in US data back to 1926, a 4% first-year withdrawal with inflation increases lasted at least 30 years from every starting year he tested, for portfolios with roughly half to three-quarters in stocks. It is a historical result, not a guarantee. Because the withdrawals keep rising, the portfolio has to keep growing, which means staying invested in stocks even in retirement.

## Inflation and Social Security

Social Security includes annual cost-of-living adjustments (COLAs) indexed to inflation. In theory this protects the government benefit from erosion. In practice:

- COLAs are based on the CPI-W, which may not reflect what retirees actually spend on (healthcare, for example, often rises faster than general prices).
- The Social Security Administration estimates the average retired-worker benefit at about $2,170 a month from January 2027, after a 3.6% COLA (SSA fact sheet, announced 14 October 2026). If your own costs rise faster than the CPI-W, that benefit loses purchasing power.
- COLAs are applied once a year, so there is a lag in high-inflation years.

Retirees who depend mainly on Social Security are partly protected. Those relying on fixed pensions with no COLA are fully exposed.

## Strategies to protect against inflation in retirement

1. **Keep a meaningful share in stocks during early retirement.** A portfolio that is all bonds or cash cannot generate the real growth needed to outpace inflation over 30 years. How much is right depends on your risk tolerance and other income.

2. **Consider TIPS (Treasury Inflation-Protected Securities).** The principal adjusts with CPI, providing a guaranteed real return. Holding part of your bond allocation in TIPS adds explicit inflation protection.

3. **Delay Social Security.** Each year you wait between 62 and 70 raises your monthly benefit, by roughly 5% to 8% a year depending on the age. A larger base benefit also means larger COLA increases in dollar terms.

4. **Build a rental income stream.** Rents generally track inflation, providing a natural hedge. A rental producing $1,500 a month today would produce about {{ inflationAdjust(1500, 3, 20) | usd }} a month in 20 years if rents rise 3% a year.

5. **Plan for healthcare inflation specifically.** Healthcare costs have often risen faster than general prices. Budget separately for medical expenses and consider long-term care insurance.

## The bottom line

$1 million is a reasonable retirement target, but only if your withdrawal strategy accounts for inflation. A flat $40,000 a year withdrawal would leave you feeling significantly poorer in real terms within 15 years. At 3% inflation, prices are about {{ inflationAdjust(100, 3, 25) / 100 | num(1) }} times higher after 25 years, so build your plan assuming your expenses will roughly double over a long retirement.

Use the [Inflation Calculator](/tools/economic/inflation/) to model how any amount loses purchasing power over time, and see [what $100,000 buys in 20 years](/scenarios/100k-purchasing-power-20-years/) for the same math on a smaller amount. The method is in [how we calculate inflation](/how-we-calculate/inflation/).

Sources (checked 15 November 2026): [Social Security Administration, cost-of-living adjustment](https://www.ssa.gov/cola/) for the 3.6% COLA and the average-benefit estimate; William P. Bengen, "Determining Withdrawal Rates Using Historical Data", Journal of Financial Planning, October 1994, for the 4% rule.
