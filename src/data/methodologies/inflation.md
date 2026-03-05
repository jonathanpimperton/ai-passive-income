---
title: "How We Calculate: Inflation & Purchasing Power"
slug: "inflation"
toolSlug: "inflation"
formula: "Future Value = Present Value × (CPI_end / CPI_start) [historical mode]; Future Value = Present Value × (1 + inflation_rate)^years [projection mode]"
variables:
  - name: "Present Value"
    description: "The dollar amount you want to adjust for inflation"
  - name: "CPI_start"
    description: "Consumer Price Index value in the starting year (historical mode)"
  - name: "CPI_end"
    description: "Consumer Price Index value in the ending year (historical mode)"
  - name: "inflation_rate"
    description: "Assumed annual inflation rate as a decimal (projection mode)"
  - name: "years"
    description: "Number of years into the future (projection mode)"
  - name: "Future Value"
    description: "What the present value amount would cost in the target year (or what it was equivalent to in a past year)"
assumptions:
  - "Historical mode uses average annual CPI-U (Consumer Price Index for All Urban Consumers) data from BLS"
  - "CPI data covers 1913 to 2025"
  - "Projection mode assumes a constant annual inflation rate"
  - "Inflation compounds annually"
  - "The CPI basket of goods is treated as representative of general purchasing power"
limitations:
  - "CPI measures a specific basket of goods — individual spending patterns may experience higher or lower inflation"
  - "CPI does not fully capture housing cost increases in many markets"
  - "Historical CPI methodology has changed over time (hedonic quality adjustments, geometric weighting), making long-range comparisons imperfect"
  - "Projection mode uses a fixed rate — real inflation fluctuates year to year"
  - "Does not model category-specific inflation (healthcare, education, and housing often inflate faster than general CPI)"
  - "2025 CPI value is an estimate"
dataSources:
  - name: "Bureau of Labor Statistics — CPI Data"
    url: "https://www.bls.gov/cpi/"
  - name: "Bureau of Labor Statistics — CPI Inflation Calculator"
    url: "https://www.bls.gov/data/inflation_calculator.htm"
  - name: "Federal Reserve Bank of Minneapolis — Consumer Price Index"
    url: "https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1913-"
---

## What This Calculator Does

The inflation calculator operates in two modes:

**Historical Mode:** Takes a dollar amount and two years (start and end) and calculates what that amount is equivalent to in the other year's dollars. It uses actual CPI-U data from the Bureau of Labor Statistics, covering 1913 to 2025. The formula is `amount × (CPI_end / CPI_start)`. This tells you, for example, that $100 in 1990 had the same purchasing power as approximately $240 in 2025.

**Future Projection Mode:** Takes a dollar amount, an assumed inflation rate, and a number of years, then projects the future cost. The formula is `amount × (1 + rate)^years`. This tells you, for example, that at 3% annual inflation, something that costs $1,000 today will cost about $1,344 in 10 years.

## How CPI Works

The Consumer Price Index (CPI-U) measures the average change in prices paid by urban consumers for a basket of goods and services. The basket includes food, housing, clothing, transportation, medical care, recreation, education, and communication. Each category is weighted by its share of typical household spending.

CPI is expressed as an index number relative to a base period (1982-84 = 100). A CPI of 313 (approximately 2024) means that the typical basket of goods costs 3.13 times what it cost in 1982-84.

The calculator stores average annual CPI values from 1913 onward. To calculate inflation between any two years, it divides the CPI of the ending year by the CPI of the starting year.

## How Each Variable Affects the Result

**Amount:** Scales linearly. If $100 in 1990 equals $240 in 2025, then $1,000 in 1990 equals $2,400 in 2025.

**Time Period:** Inflation compounds, so longer periods produce proportionally larger adjustments. At 3% annual inflation, prices double roughly every 24 years. At 2%, doubling takes about 36 years.

**Inflation Rate (projection mode):** Small changes in the assumed rate have large effects over long periods. The difference between 2% and 4% inflation over 30 years is enormous: $1,000 becomes $1,811 at 2% but $3,243 at 4%.

## Common Uses

- **Salary comparison:** "Is a $60,000 salary today better than $45,000 was in 2010?" (Yes — $45,000 in 2010 is equivalent to about $63,000 in 2025.)
- **Investment returns:** "My investment grew from $10,000 to $18,000 over 15 years. What's the real return?" Calculate inflation-adjusted value, then compare.
- **Retirement planning:** "If I need $50,000/year in retirement, what will that cost in 30 years?" At 3% inflation, roughly $121,000.
- **Historical context:** "What would a $25,000 car in 1995 cost today?"

## Common Misconceptions

CPI is an average across millions of consumers. Your personal inflation rate depends on your spending patterns. If you spend disproportionately on healthcare or education (both of which have inflated faster than general CPI for decades), your effective inflation rate may be higher than headline CPI.

Another misconception is that inflation is always bad. Moderate inflation (2-3%) is generally considered healthy for an economy. Deflation (falling prices) sounds appealing but historically correlates with economic depression and rising unemployment.

The "shrinkflation" phenomenon — where the price stays the same but the package gets smaller — is captured by CPI (BLS adjusts for package size changes) but not always noticed by consumers.

## Why This Calculator Exists

Inflation is invisible and relentless. Most people underestimate how much purchasing power erodes over decades. This calculator makes the erosion concrete — whether you're comparing historical prices, planning for future costs, or evaluating whether a raise actually kept up with the cost of living.
