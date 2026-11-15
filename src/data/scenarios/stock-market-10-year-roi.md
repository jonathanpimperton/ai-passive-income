---
title: "Stock Market 10-Year ROI: $10,000 Grows to {{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }}"
slug: "stock-market-10-year-roi"
description: "$10,000 at the S&P 500's long-run 10% average grows to {{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }} in 10 years. Best and worst 10-year periods since 1928, and what to expect."
keywords: ["stock market roi 10 years", "average stock market return", "S&P 500 10 year return", "stock market average roi"]
toolSlug: "roi"
toolCategory: "saving-and-growth"
inputs:
  Investment: "$10,000"
  Annual Return: "10%"
  Time Period: "10 years"
resultSummary: "{{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }} at 10% average annual return"
affiliateContext: "Start investing with low fees"
affiliatePrograms:
  - "Betterment"
  - "InvestEngine"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## $10,000 becomes {{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }} at the historical average

**The S&P 500 returned about 10.0% a year on average (nominal, dividends included) from 1928 to 2025.** At 10% a year, compounded annually, $10,000 invested in a broad US stock index grows to {{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }} over 10 years. After adjusting for inflation at an assumed 3% a year, the real return is about {{ ((1 + 10 / 100) / (1 + 3 / 100) - 1) * 100 | pct1 }} and the same result is worth {{ inflationAdjust(compoundFV(10000, 0, 10, 10, compounding=annually), 3, 10, mode=value) | usd }} in today's purchasing power. (US consumer prices actually rose about {{ cpiAdjust(100, 1928, 2025).averageAnnual | pct1 }} a year over 1928 to 2025 by the BLS index.)

## Not every decade delivers 10%

The "10% average" is just that, an average. Individual 10-year periods vary a great deal. The figures below are calculated from Aswath Damodaran's annual S&P 500 total returns (dividends included, nominal), 1928 to 2025, using calendar-year windows. There are 89 overlapping ten-year windows in that data.

**Best 10-year periods:**
- 1949 to 1958: +20.1% a year ($10,000 became $62,482)
- 1950 to 1959: +19.5% a year ($59,186)
- 1989 to 1998: +19.1% a year ($57,164)

**Worst 10-year periods:**
- 1929 to 1938: -1.7% a year ($10,000 became $8,450)
- 1999 to 2008: -1.4% a year ($8,721)
- 2000 to 2009: -0.9% a year ($9,086)
- 1930 to 1939: -0.9% a year ($9,113)

Only 5 of the 89 windows lost money in nominal terms: the ones starting in 1928, 1929 and 1930, and the ones starting in 1999 and 2000. The median window returned 11.0% a year, and 46 of the 89 returned 10% or more.

The "lost decade" of 2000 to 2009, which included the dot-com crash and the 2008 financial crisis, ended with $10,000 invested at the start of 2000 worth $9,086. Over just the first three years, 2000 to 2002, the same $10,000 fell to $6,257, a loss of 37%.

## What drives the variation

Three factors explain most of the difference between good and bad decades:

1. **Starting valuation.** How expensive stocks are when you buy is one of the better-known predictors of future 10-year returns, though not a reliable timing tool. High price-to-earnings ratios, as in 2000, have tended to precede lower returns. Low ratios, as in 2009, have tended to precede higher ones.

2. **Inflation and interest rates.** From 1969 to 1979 US consumer prices rose about {{ cpiAdjust(100, 1969, 1979).averageAnnual | pct1 }} a year (BLS), faster than the S&P 500's 5.9% a year over 1970 to 1979, so real returns were negative. The 2010s had low inflation and low interest rates, and the S&P 500 returned 13.4% a year over 2010 to 2019.

3. **Earnings growth.** Corporate profits drive stock prices over the long term. The 1950s (19.5% a year) and the 1990s (18.1% a year) were the strongest decades in the data.

## How $10,000 grows at different return rates

Annual compounding, 10 years:

| Annual return | After 10 years | Total gain |
|--------------|---------------|-----------|
| 5% | {{ compoundFV(10000, 0, 5, 10, compounding=annually) | usd }} | {{ compoundEarned(10000, 0, 5, 10, compounding=annually) | usd }} |
| 7% | {{ compoundFV(10000, 0, 7, 10, compounding=annually) | usd }} | {{ compoundEarned(10000, 0, 7, 10, compounding=annually) | usd }} |
| 10% | {{ compoundFV(10000, 0, 10, 10, compounding=annually) | usd }} | {{ compoundEarned(10000, 0, 10, 10, compounding=annually) | usd }} |
| 12% | {{ compoundFV(10000, 0, 12, 10, compounding=annually) | usd }} | {{ compoundEarned(10000, 0, 12, 10, compounding=annually) | usd }} |

A 10% return grows your money {{ compoundFV(10000, 0, 10, 10, compounding=annually) / 10000 | num(1) }} times over a decade. At 7% it grows {{ compoundFV(10000, 0, 7, 10, compounding=annually) / 10000 | num(1) }} times, roughly doubling.

## Dollar-cost averaging vs lump sum

If you invest $10,000 all at once, you are exposed to the market's price on that single day. An alternative is dollar-cost averaging: investing {{ 10000 / 12 | usd }} a month over 12 months.

Vanguard's 2012 study of US, UK and Australian markets found that investing a lump sum immediately beat spreading it over 12 months in about two-thirds of the periods tested, because markets rise more often than they fall. Dollar-cost averaging reduces the risk of buying at a peak: $10,000 invested at the start of 2000 was worth $6,257 by the end of 2002. Our [lump sum vs dollar-cost averaging comparison](/comparisons/lump-sum-vs-dollar-cost-averaging/) goes through the trade-off.

For money you already have, a lump sum has been the better bet more often than not. For money you earn monthly, such as salary contributions to a 401(k), dollar-cost averaging happens naturally and is the only practical approach.

## The key takeaway

Ten years is long enough for stocks to be a reasonable bet but short enough that bad luck can leave you flat or behind. In the 79 overlapping 20-year windows in the same data, the worst was +2.4% a year (1929 to 1948) before inflation. If you have a 10-year horizon, plan around the 5% to 10% range in the table above, and prepare for results well outside it.

Use the [ROI Calculator](/tools/saving-and-growth/roi/) to compute returns on any investment amount and time period. The method is in [how we calculate ROI](/how-we-calculate/roi/).

Sources (checked 15 November 2026): [Damodaran, historical returns on stocks, bonds and bills (annual S&P 500 total returns, 1928-2025)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html), with window returns and dollar results calculated from that series; [BLS CPI-U, all items (series CUUR0000SA0)](https://data.bls.gov/timeseries/CUUR0000SA0) for the inflation figures. Vanguard, "Dollar-cost averaging just means taking risk later" (2012), for the lump-sum comparison.
