---
title: "How We Calculate: Return on Investment (ROI)"
slug: "roi"
toolSlug: "roi"
formula: "ROI = (Final Value + Dividends - Initial Investment) / Initial Investment × 100; Annualized ROI = (1 + ROI)^(1/years) - 1"
variables:
  - name: "Initial Investment"
    description: "The amount originally invested"
  - name: "Final Value"
    description: "The current or ending value of the investment"
  - name: "Dividends Received"
    description: "Total dividends or distributions received during the holding period"
  - name: "Years Held"
    description: "Duration of the investment in years"
  - name: "ROI"
    description: "Total return as a percentage of the initial investment"
  - name: "Annualized ROI"
    description: "The equivalent annual return rate that would produce the same total return if compounded"
assumptions:
  - "Dividends are not reinvested (they are treated as cash received)"
  - "The initial investment and final value are at the same point in currency terms (no currency conversion)"
  - "Years held is a whole or fractional number — partial years are supported"
  - "No taxes have been applied to the gains"
  - "No fees or commissions have been deducted from the values entered"
limitations:
  - "Does not account for the timing of cash flows (use XIRR for investments with multiple deposits/withdrawals)"
  - "Does not adjust for inflation"
  - "Dividends are treated as a lump sum, not time-weighted"
  - "Does not model reinvested dividends (which would compound)"
  - "Annualized ROI is undefined for investments held less than one year (still calculated, but less meaningful)"
  - "Cannot handle negative initial investments (short selling)"
  - "Total return at or below -100% will produce an annualized ROI of 0% (mathematical limitation)"
dataSources:
  - name: "Investopedia — Return on Investment"
    url: "https://www.investopedia.com/terms/r/returnoninvestment.asp"
  - name: "CFA Institute — Rates of Return"
    url: "https://www.cfainstitute.org/en/membership/professional-development/refresher-readings/rates-returns"
---

## What This Formula Does

ROI measures how much money an investment gained or lost relative to its original cost, expressed as a percentage. The basic formula is straightforward: subtract what you paid from what you got back (including dividends), then divide by what you paid.

An ROI of 50% means you earned half your original investment on top of getting your money back. An ROI of -20% means you lost a fifth of your investment.

The annualized ROI goes one step further. Because a 50% return over 2 years is more impressive than a 50% return over 10 years, annualized ROI converts the total return into an equivalent annual compound rate. The formula is `(1 + total_return)^(1/years) - 1`.

## How Each Variable Affects the Result

**Initial Investment:** The denominator of the ROI fraction. A $5,000 gain on a $10,000 investment (50% ROI) is twice as efficient as a $5,000 gain on a $100,000 investment (5% ROI), even though the dollar amount is the same.

**Final Value:** The current market value or sale price. For ongoing investments, use the current portfolio value. For completed investments, use the actual proceeds.

**Dividends Received:** Cash distributions during the holding period. These are added to the gain because they represent value extracted from the investment. If dividends were reinvested (buying more shares), they should be reflected in the final value instead, and dividends should be set to zero to avoid double-counting.

**Years Held:** Used only for the annualized calculation. Longer holding periods reduce the annualized return for the same total return. A 100% total return over 1 year is a 100% annualized return. Over 10 years, it's 7.2% annualized.

## Comparison Mode

The calculator includes a comparison mode that lets you evaluate two investments side-by-side. This is useful for comparing:
- Two stocks or funds over the same period
- The same investment over different time periods
- An active fund versus an index fund benchmark

The comparison uses a bar chart to visualize the difference in both total and annualized returns.

## Common Misconceptions

People often compare total ROI percentages without considering the time period. "My real estate returned 80%" sounds better than "my stocks returned 50%" — until you learn the real estate was over 15 years and the stocks were over 3 years. Always use annualized ROI for fair comparisons across different time horizons.

Another mistake is ignoring dividends. An investment that returned 30% in price appreciation plus 20% in total dividends has a 50% total return — twice as good as the price return alone suggests. Dividend-paying investments are systematically undervalued when people only look at price changes.

A subtler error: ROI does not account for the timing of cash flows. If you invested $10,000 initially and added $5,000 after 3 years, simple ROI doesn't properly weight the returns. For investments with multiple deposits or withdrawals, the Internal Rate of Return (IRR) or XIRR is a more accurate measure. This calculator is designed for single-deposit investments.

## Why This Calculator Exists

ROI is the most fundamental investment metric. Before making decisions about where to invest, refinance, or allocate capital, you need to measure what your current investments are actually returning — and compare that against alternatives. This calculator makes that comparison immediate and precise.
