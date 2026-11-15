---
title: "How We Calculate: Inflation & Purchasing Power"
slug: "inflation"
toolSlug: "inflation"
formula: "Historical: Adjusted Amount = Amount × (CPI_end / CPI_start). Projection: Future Cost = Amount × (1 + rate)^years; Purchasing Power = Amount / (1 + rate)^years"
variables:
  - name: "Amount"
    description: "The money amount you want to adjust for inflation"
  - name: "CPI_start"
    description: "US Consumer Price Index (CPI-U) in the starting year (historical mode)"
  - name: "CPI_end"
    description: "US Consumer Price Index in the ending year (historical mode)"
  - name: "rate"
    description: "Assumed annual inflation rate as a decimal (projection mode)"
  - name: "years"
    description: "Number of years into the future (projection mode)"
  - name: "Future Cost"
    description: "What an amount of today's goods will cost after the given years. Purchasing Power is the reverse: what that amount will buy, in today's money"
assumptions:
  - "Historical mode uses US CPI-U (all urban consumers, all items, U.S. city average, not seasonally adjusted, 1982-84 = 100) from the Bureau of Labor Statistics"
  - "The data are BLS annual averages for 1913 to 2025, plus the newest monthly index (October 2026, checked 12 November 2026), which stands in for 'now' for the current year and is labelled with its month wherever it appears"
  - "Projection mode assumes a constant annual inflation rate that compounds yearly"
  - "The CPI basket of goods is treated as representative of general purchasing power"
  - "Historical mode is US data only. Projection mode works in any currency, and the currency selector changes the symbol and nothing else"
limitations:
  - "CPI measures a fixed basket of goods: individual spending patterns may see higher or lower inflation"
  - "CPI does not fully capture housing cost increases in many markets"
  - "CPI methodology has changed over time (quality adjustments, geometric weighting), so long-range comparisons are imperfect"
  - "Projection mode uses a fixed rate, but real inflation varies from year to year"
  - "Does not model category-specific inflation: healthcare, education and housing often inflate faster than general CPI"
  - "The BLS did not collect October 2025 prices (a lapse in appropriations). Its published 2025 annual average, 321.943, is the mean of the other 11 months"
  - "There is no UK or euro-area historical series: for UK figures use the ONS, and for euro-area figures use Eurostat"
dataSources:
  - name: "Bureau of Labor Statistics: CPI-U series CUUR0000SA0 (data used)"
    url: "https://data.bls.gov/timeseries/CUUR0000SA0"
  - name: "Bureau of Labor Statistics: Consumer Price Index"
    url: "https://www.bls.gov/cpi/"
  - name: "Bureau of Labor Statistics: CPI Inflation Calculator"
    url: "https://www.bls.gov/data/inflation_calculator.htm"
  - name: "Federal Reserve Bank of Minneapolis: Consumer Price Index, 1913 to date"
    url: "https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-"
---

## What This Calculator Does

The inflation calculator has two modes.

**Historical Mode:** Takes an amount and two years and calculates what the amount is equivalent to in the other year's prices, using BLS CPI-U data from 1913 to the latest month. The formula is `amount × (CPI_end / CPI_start)`. For example, $100 in 1990 had the same purchasing power as {{ 100 * 321.943 / 130.7 | usd }} in 2025 (the 2025 CPI-U annual average is 321.943 and the 1990 average is 130.7).

**Future Projection Mode:** Takes an amount, an assumed inflation rate and a number of years, and projects the future cost with `amount × (1 + rate)^years`. At 3% a year, something that costs $1,000 today costs {{ inflationAdjust(1000, 3, 10) | usd }} in 10 years.

## How CPI Works

The Consumer Price Index for All Urban Consumers (CPI-U) measures the average change in prices paid by urban consumers for a basket of goods and services: food, housing, clothing, transportation, medical care, recreation, education and communication, each weighted by its share of typical household spending.

CPI is an index number relative to a base period (1982-84 = 100). The 2024 annual average was 313.689, which means the basket cost about 3.14 times what it did in 1982-84.

The calculator stores the annual average CPI-U for every year from 1913 to 2025, plus the newest monthly index for the current year. To compare two years it divides the later CPI by the earlier one. Each result also shows the cumulative change and the compound average annual change between the two points.

## How Each Variable Affects the Result

**Amount:** Scales linearly. If $100 in 1990 equals {{ 100 * 321.943 / 130.7 | usd }} in 2025, then $1,000 in 1990 equals {{ 1000 * 321.943 / 130.7 | usd }}.

**Time Period:** Inflation compounds, so longer periods give larger adjustments. At 3% a year, prices double in under 24 years ($1,000 becomes {{ inflationAdjust(1000, 3, 24) | usd }} after 24). At 2%, doubling takes 35 years ($1,000 becomes {{ inflationAdjust(1000, 2, 35) | usd }}).

**Inflation Rate (projection mode):** Small changes in the assumed rate matter over long periods. Over 30 years, $1,000 becomes {{ inflationAdjust(1000, 2, 30) | usd }} at 2% inflation and {{ inflationAdjust(1000, 4, 30) | usd }} at 4%.

## Common Uses

- **Salary comparison:** "Is a $60,000 salary today better than $45,000 was in 2010?" $45,000 in 2010 is equivalent to {{ 45000 * 321.943 / 218.056 | usd }} in 2025 dollars (2010 average 218.056), so a $60,000 salary in 2025 buys less than $45,000 did in 2010.
- **Investment returns:** "My investment grew from $10,000 to $18,000 over 15 years. What is the real return?" Calculate the inflation-adjusted value, then compare.
- **Retirement planning:** "If I need $50,000 a year in retirement, what will that cost in 30 years?" At 3% inflation, {{ inflationAdjust(50000, 3, 30) | usd }}.
- **Historical context:** "What would a $25,000 car in 1995 cost today?" In 2025 prices (1995 average 152.4), {{ 25000 * 321.943 / 152.4 | usd }}.

## Common Misconceptions

CPI is an average across millions of consumers. Your personal inflation rate depends on what you spend money on. If you spend disproportionately on healthcare or education, which have inflated faster than general CPI for decades, your effective inflation rate may be higher than headline CPI.

Another misconception is that inflation is always bad. Moderate inflation is generally considered healthy for an economy, while falling prices have historically gone with weak demand and rising unemployment.

"Shrinkflation", where the price stays the same but the pack gets smaller, is captured by CPI (the BLS adjusts for package size changes), but consumers do not always notice it.

## Why This Calculator Exists

Inflation is invisible and relentless. Most people underestimate how much purchasing power erodes over decades. This calculator makes the erosion concrete, whether you are comparing historical prices, planning for future costs, or checking whether a raise kept up with the cost of living.
