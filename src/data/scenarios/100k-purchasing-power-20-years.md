---
title: "$100,000 in 20 Years: Worth {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} Today"
slug: "100k-purchasing-power-20-years"
description: "At 3% inflation, $100,000 buys what {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} buys today after 20 years. Rates from 2% to 7%, cash vs bonds vs stocks, and what it means for savings."
keywords: ["100k purchasing power", "inflation calculator 20 years", "what will 100000 buy", "inflation impact on savings"]
toolSlug: "inflation"
toolCategory: "economic"
inputs:
  Amount: "$100,000"
  Inflation Rate: "3%"
  Time Period: "20 years"
resultSummary: "Worth only {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} in today's dollars"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## $100,000 will buy only {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} worth of today's goods

**At 3% average annual inflation, $100,000 loses {{ (100000 - inflationAdjust(100000, 3, 20, mode=value)) / 100000 * 100 | pct }} of its purchasing power over 20 years.** In two decades the same $100,000 buys what {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} would buy today. Put another way: you would need {{ inflationAdjust(100000, 3, 20) | usd }} in 20 years to match the buying power of $100,000 today.

## How 3% feels small but compounds into something large

Three percent inflation barely registers year to year. A $4.00 coffee becomes {{ inflationAdjust(4, 3, 1) | usd(2) }}. A $50,000 car becomes {{ inflationAdjust(50000, 3, 1) | usd }}. The increases feel minor. But compounding works against you with inflation just as it works for you with investments.

Here is how $100,000 in purchasing power erodes over time at 3%:

- **After 5 years:** worth {{ inflationAdjust(100000, 3, 5, mode=value) | usd }} in today's dollars (lost {{ 100000 - inflationAdjust(100000, 3, 5, mode=value) | usd }})
- **After 10 years:** worth {{ inflationAdjust(100000, 3, 10, mode=value) | usd }} (lost {{ 100000 - inflationAdjust(100000, 3, 10, mode=value) | usd }})
- **After 15 years:** worth {{ inflationAdjust(100000, 3, 15, mode=value) | usd }} (lost {{ 100000 - inflationAdjust(100000, 3, 15, mode=value) | usd }})
- **After 20 years:** worth {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} (lost {{ 100000 - inflationAdjust(100000, 3, 20, mode=value) | usd }})
- **After 30 years:** worth {{ inflationAdjust(100000, 3, 30, mode=value) | usd }} (lost {{ 100000 - inflationAdjust(100000, 3, 30, mode=value) | usd }})

The first decade takes away {{ (100000 - inflationAdjust(100000, 3, 10, mode=value)) / 100000 * 100 | pct }} of your buying power. The second decade takes a further {{ (inflationAdjust(100000, 3, 10, mode=value) - inflationAdjust(100000, 3, 20, mode=value)) / 100000 * 100 | pct }} of the original amount. By year 30 you have lost {{ (100000 - inflationAdjust(100000, 3, 30, mode=value)) / 100000 * 100 | pct }}.

## Different inflation rates, very different outcomes

The Federal Reserve's longer-run goal is 2% inflation, measured by the PCE price index, but the actual rate moves around. Here is how $100,000 fares at different steady rates over 20 years:

| Inflation rate | Purchasing power after 20 years | Lost |
|---------------|-------------------------------|------|
| 2% | {{ inflationAdjust(100000, 2, 20, mode=value) | usd }} | {{ 100000 - inflationAdjust(100000, 2, 20, mode=value) | usd }} |
| 3% | {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} | {{ 100000 - inflationAdjust(100000, 3, 20, mode=value) | usd }} |
| 4% | {{ inflationAdjust(100000, 4, 20, mode=value) | usd }} | {{ 100000 - inflationAdjust(100000, 4, 20, mode=value) | usd }} |
| 5% | {{ inflationAdjust(100000, 5, 20, mode=value) | usd }} | {{ 100000 - inflationAdjust(100000, 5, 20, mode=value) | usd }} |
| 7% | {{ inflationAdjust(100000, 7, 20, mode=value) | usd }} | {{ 100000 - inflationAdjust(100000, 7, 20, mode=value) | usd }} |

US prices did not rise at a steady rate in recent years. By the BLS consumer price index (annual averages), prices rose {{ cpiAdjust(100, 2021, 2022).cumulativeChange | pct1 }} in 2022 and {{ cpiAdjust(100, 2022, 2023).cumulativeChange | pct1 }} in 2023. If prices rose 5% a year for 20 years, $100,000 would lose {{ (100000 - inflationAdjust(100000, 5, 20, mode=value)) / 100000 * 100 | pct }} of its value. At 7% a year, it would lose {{ (100000 - inflationAdjust(100000, 7, 20, mode=value)) / 100000 * 100 | pct }}.

## What this means for cash savings

If you leave $100,000 in a checking account earning 0.01% interest for 20 years, the balance is still about {{ compoundFV(100000, 0, 0.01, 20) | usd }}, but at 3% inflation it buys what {{ inflationAdjust(compoundFV(100000, 0, 0.01, 20), 3, 20, mode=value) | usd }} buys today. A savings account paying 4.5% (an example rate, not a current quote) turns $100,000 into {{ compoundFV(100000, 0, 4.5, 20) | usd }}, which is worth {{ inflationAdjust(compoundFV(100000, 0, 4.5, 20), 3, 20, mode=value) | usd }} in today's dollars. Real growth is positive, but slow.

This is the core argument for investing for the long term. US large-company stocks (the S&P 500, including dividends) returned about 10.0% a year in nominal terms from 1928 to 2025 according to Aswath Damodaran's NYU Stern data. US consumer prices rose about {{ cpiAdjust(100, 1928, 2025).averageAnnual | pct1 }} a year over the same period (BLS annual averages), so the average return after inflation was about {{ ((1 + 10.02 / 100) / (1 + cpiAdjust(100, 1928, 2025).averageAnnual / 100) - 1) * 100 | pct1 }} a year. Past returns do not predict the next 20 years, and individual decades differ widely.

**What $100,000 becomes after 20 years, in today's dollars, at 3% inflation (illustrative nominal returns, not forecasts):**
- Cash earning nothing (0%): {{ inflationAdjust(100000, 3, 20, mode=value) | usd }} of purchasing power
- Bonds at 5% nominal, compounded monthly: {{ compoundFV(100000, 0, 5, 20) | usd }} nominal, worth {{ inflationAdjust(compoundFV(100000, 0, 5, 20), 3, 20, mode=value) | usd }} in today's dollars
- Stocks at 10% nominal, compounded monthly: {{ compoundFV(100000, 0, 10, 20) | usd }} nominal, worth {{ inflationAdjust(compoundFV(100000, 0, 10, 20), 3, 20, mode=value) | usd }} in today's dollars

On these assumptions the gap between cash and stocks is {{ inflationAdjust(compoundFV(100000, 0, 10, 20), 3, 20, mode=value) - inflationAdjust(100000, 3, 20, mode=value) | usd }} of real purchasing power over 20 years. Inflation is a silent tax that makes holding large amounts of cash expensive over long periods.

## Practical implications

- **Retirement planning:** If you retire at 65 and need $50,000 a year in today's dollars, you will need {{ inflationAdjust(50000, 3, 20) | usd }} a year in nominal dollars by age 85 at 3% inflation. Your income sources must grow or your spending must shrink. The [inflation and retirement scenario](/scenarios/inflation-impact-on-retirement/) works through a $1 million fund.
- **Salary negotiation:** A 3% annual raise is not a raise; it is keeping pace with inflation. You need above-inflation raises to improve your standard of living.
- **Fixed-rate debt:** Inflation benefits borrowers. A 30-year mortgage with fixed payments gets cheaper in real terms every year. This is one reason homeownership is seen as an inflation hedge.

Use the [Inflation Calculator](/tools/economic/inflation/) to see how inflation affects any amount over any time period. The method is in [how we calculate inflation](/how-we-calculate/inflation/).

Sources (checked 15 November 2026): [Federal Reserve, why the Fed aims for 2 percent inflation](https://www.federalreserve.gov/faqs/economy_14400.htm); [BLS CPI-U, all items (series CUUR0000SA0)](https://data.bls.gov/timeseries/CUUR0000SA0) for annual averages; [Damodaran, historical returns on stocks, bonds and bills](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html) for S&P 500 returns 1928-2025.
