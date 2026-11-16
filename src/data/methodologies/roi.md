---
title: "How We Calculate: Return on Investment (ROI)"
slug: "roi"
toolSlug: "roi"
formula: "ROI = (Final Value + Dividends − Initial Investment) / Initial Investment × 100; Annualized ROI = (1 + ROI)^(1/years) − 1"
variables:
  - name: "Initial Investment"
    description: "The amount originally invested. It must be greater than zero"
  - name: "Final Value"
    description: "The current or ending value of the investment. A negative entry is treated as zero"
  - name: "Dividends Received"
    description: "Total dividends or distributions received during the holding period. A negative entry is treated as zero"
  - name: "Years Held"
    description: "Duration of the investment in years, whole or fractional. Used only for the annualized figure"
  - name: "ROI"
    description: "Total return as a percentage of the initial investment"
  - name: "Annualized ROI"
    description: "The equivalent annual compound rate that would produce the same total return over the years held"
assumptions:
  - "Dividends are not reinvested: they are treated as cash received"
  - "Initial investment and final value are in the same currency. The currency selector changes the symbol only, and there is no exchange-rate conversion"
  - "Years held can be fractional, so partial years are supported"
  - "No taxes are applied to the gains"
  - "No fees or commissions are deducted from the values entered"
  - "A total loss (final value plus dividends of zero) is a return of −100%, and its annualized figure is also −100% a year"
limitations:
  - "Does not account for the timing of cash flows (use IRR or XIRR for investments with several deposits or withdrawals)"
  - "Does not adjust for inflation"
  - "Dividends are treated as a lump sum, not time-weighted"
  - "Does not model reinvested dividends (which would compound)"
  - "The annualized figure is calculated for any holding period above zero, but turning a few months into an annual rate can mislead. For a holding period of zero it shows '--'"
  - "Cannot handle a zero or negative initial investment (for example short selling)"
dataSources:
  - name: "Investopedia: Return on Investment"
    url: "https://www.investopedia.com/terms/r/returnoninvestment.asp"
  - name: "CFA Institute Research Foundation: Exponential Wealth, Chapter 3, 'Arithmetic and Geometric Mean Returns' (Equation 3.9: the geometric mean is the compound annualized return)"
    url: "https://rpc.cfainstitute.org/sites/default/files/docs/research-reports/rf_ibbotson_2026_exponentialwealth_section-1_online.pdf"
---

## What This Formula Does

ROI measures how much an investment gained or lost relative to what it cost, as a percentage. Subtract what you paid from what you got back (including dividends), then divide by what you paid.

An ROI of 50% means you earned half your original investment on top of getting your money back. An ROI of −20% means you lost a fifth of it.

For example, $10,000 invested, now worth $15,000, with $500 of dividends received over 3 years: the gain is {{ roi(10000, 15000, 500, 3).totalGain | usd }}, so ROI is {{ roi(10000, 15000, 500, 3).totalReturn | pct }}, and the annualized ROI is {{ roi(10000, 15000, 500, 3).annualized | pct1 }} a year.

Annualized ROI goes one step further. Because a 50% return over 2 years is better than a 50% return over 10 years, annualizing turns the total return into an equivalent yearly compound rate: `(1 + total_return)^(1/years) − 1`.

## How Each Variable Affects the Result

**Initial Investment:** The denominator of the ROI fraction. A $5,000 gain on $10,000 (50% ROI) is ten times as efficient as the same $5,000 on $100,000 (5% ROI), though the dollar amount is the same.

**Final Value:** The current market value or the sale price. For an ongoing investment use the current value, and for a completed one use the actual proceeds.

**Dividends Received:** Cash paid out during the holding period, added to the gain because it is value you took out of the investment. If dividends were reinvested (buying more shares), reflect them in the final value instead and set dividends to zero, to avoid counting them twice.

**Years Held:** Used only for the annualized figure. A longer holding period lowers the annualized return for the same total return. A 100% total return over 1 year is {{ annualizedReturn(100, 1) | pct }} annualized. Over 10 years it is {{ annualizedReturn(100, 10) | pct1 }} annualized.

## Comparison Mode

The calculator has a comparison mode for two investments side by side. It is useful for comparing:
- Two stocks or funds over the same period
- The same investment over different time periods
- An active fund against an index fund

A bar chart shows the difference in total and annualized returns.

## Common Misconceptions

People often compare total ROI without considering the time period. "My real estate returned 80%" sounds better than "my stocks returned 50%" until you learn the property was held 15 years and the stocks 3. Annualized, those are {{ annualizedReturn(80, 15) | pct1 }} and {{ annualizedReturn(50, 3) | pct1 }} a year. Use annualized ROI to compare different time horizons.

Another mistake is ignoring dividends. An investment that gained 30% in price and paid 20% in dividends has a 50% total return, which is much more than the price return alone suggests.

ROI also ignores the timing of cash flows. If you invested $10,000 at the start and added $5,000 after 3 years, simple ROI does not weight the returns correctly. For several deposits or withdrawals, the internal rate of return (IRR or XIRR) is more accurate. This calculator is designed for a single deposit.
