---
title: "How We Calculate: Investment Fee Impact"
slug: "investment-fee"
toolSlug: "investment-fee"
formula: "net return = gross return − fee; i = net return / 12; FV = P(1 + i)^(12t) + C × [((1 + i)^(12t) − 1) / i], compared across two fee levels"
variables:
  - name: "Initial Investment (P)"
    description: "Starting portfolio value before any fees are applied"
  - name: "Monthly Contribution (C)"
    description: "Amount added at the end of every month"
  - name: "Gross Return (r)"
    description: "Expected annual return before fees, entered as a percentage"
  - name: "Fee (f)"
    description: "Annual expense ratio or ongoing charge, as a percentage. It is subtracted from the gross return"
  - name: "Net return"
    description: "Gross return minus the fee. It is divided by 12 to give the monthly rate i"
  - name: "Investment Period (t)"
    description: "Time horizon in years"
  - name: "Your Fee / Comparison Fee"
    description: "The two fund fees compared. Defaults are 0.5% and 1.0%"
assumptions:
  - "Returns compound monthly after the fee is deducted (net return = gross return − fee, divided by 12), and deposits are made at the end of each month"
  - "The fee is an annual percentage taken from the fund's assets continuously, so the investor sees the gross return less the fee"
  - "The gross return is the same for both funds, so the fee is the only difference between the two scenarios"
  - "No taxes, trading costs, or other drag on returns"
  - "If the fee is larger than the gross return, the net return is negative and both the starting balance and every deposit lose value"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Assumes identical gross returns for different fee levels. In reality some actively managed funds outperform, though many do not over long periods"
  - "Does not model tax drag, transaction costs, or bid-ask spreads"
  - "Does not account for advisory fees charged separately from fund expense ratios (add them to the fee you enter)"
  - "Does not factor in load fees (front-end or back-end) that some funds charge"
  - "Assumes constant fee rates, but some funds have breakpoints or fee waivers at certain asset levels"
  - "Does not compare risk-adjusted returns: a lower-fee fund may have different risk characteristics"
dataSources:
  - name: "Investor.gov (SEC): Mutual Fund and ETF Fees and Expenses"
    url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/mutual-fund-and-etf-fees-and-expenses-investor-bulletin"
  - name: "Investor.gov (SEC): How Fees and Expenses Affect Your Investment Portfolio"
    url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated"
  - name: "FINRA: Fund Analyzer"
    url: "https://tools.finra.org/fund_analyzer/"
  - name: "S&P Dow Jones Indices: SPIVA US Scorecard (active funds against their benchmarks)"
    url: "https://www.spglobal.com/spdji/en/research-insights/spiva/"
---

## What This Calculator Does

The investment fee calculator shows the long-term cost of fund fees by comparing two scenarios side by side: your fund's expense ratio against an alternative. It shows how a small annual fee compounds into a large drag on wealth over decades.

The key insight is that fees compound against you the way returns compound for you. Over 30 years, a 1% annual fee takes {{ (1 - compoundFV(100000, 500, 6, 30) / compoundFV(100000, 500, 7, 30)) * 100 | pct1 }} off the final balance in the example below.

## How the Calculation Works

The calculator runs two compound growth simulations with identical inputs except for the fee:

**Scenario A (your fee):** Net annual return = gross return − your fee
**Scenario B (comparison fee):** Net annual return = gross return − comparison fee

For each scenario, the monthly rate is i = net return / 12 and the balance after t years, with deposits C at the end of each month, is:

FV = P × (1 + i)^(12t) + C × [((1 + i)^(12t) − 1) / i]

(When the net return is zero, FV = P + 12 × t × C.) The difference between the two final values is the cost of the fee gap: the wealth you give up to the fund manager over the investment period. The calculator also reports the growth lost to your fee against a 0% fee, and the share of the lower-fee fund's earnings that the gap takes (capped at 100%; if the higher-fee fund ends below what you paid in, the part beyond all the earnings is reported as contributions lost).

## Why Small Fees Have Outsized Impact

Consider a $100,000 portfolio growing at 7% gross over 30 years with $500 a month added. The fee cost in the last column is measured against the 0.03% fund:

| Annual Fee | Net Return | Final Value | Fee Cost |
|---|---|---|---|
| 0.03% | 6.97% | {{ compoundFV(100000, 500, 6.97, 30) | usd }} | none |
| 0.50% | 6.50% | {{ compoundFV(100000, 500, 6.5, 30) | usd }} | {{ compoundFV(100000, 500, 6.97, 30) - compoundFV(100000, 500, 6.5, 30) | usd }} |
| 1.00% | 6.00% | {{ compoundFV(100000, 500, 6, 30) | usd }} | {{ compoundFV(100000, 500, 6.97, 30) - compoundFV(100000, 500, 6, 30) | usd }} |
| 1.50% | 5.50% | {{ compoundFV(100000, 500, 5.5, 30) | usd }} | {{ compoundFV(100000, 500, 6.97, 30) - compoundFV(100000, 500, 5.5, 30) | usd }} |

A 1% fee does not cost $1,000 a year. Against a 0.03% fund it costs {{ compoundFV(100000, 500, 6.97, 30) - compoundFV(100000, 500, 6, 30) | usd }} over 30 years, because every dollar taken in fees is a dollar that can no longer compound. Against a fee of 0%, the 1% fee costs {{ compoundFV(100000, 500, 7, 30) - compoundFV(100000, 500, 6, 30) | usd }}.

## How Each Variable Affects the Result

**Initial Investment:** Larger starting amounts amplify the fee impact because fees are a percentage. $500,000 at 1% costs {{ 500000 * 1 / 100 | usd }} a year in fees from day one.

**Monthly Contribution:** Regular contributions enlarge the base the fee is charged on, compounding the drag over time.

**Return Rate:** A higher gross return makes the same fee cost more in dollars, because it takes its share of a bigger pot. In the example above, the 1% fee against a 0% fee costs {{ compoundFV(100000, 500, 7, 30) - compoundFV(100000, 500, 6, 30) | usd }} at 7% gross and {{ compoundFV(100000, 500, 9, 30) - compoundFV(100000, 500, 8, 30) | usd }} at 9% gross.

**Time Period:** The most important variable. The 1% fee against a 0% fee costs {{ compoundFV(100000, 500, 7, 5) - compoundFV(100000, 500, 6, 5) | usd }} over 5 years, {{ compoundFV(100000, 500, 7, 10) - compoundFV(100000, 500, 6, 10) | usd }} over 10 years and {{ compoundFV(100000, 500, 7, 30) - compoundFV(100000, 500, 6, 30) | usd }} over 30, because the gap between the two funds widens every year.

**Fee Difference:** The size of the gap matters more than the level. Moving from 1.50% to 0.50% saves {{ compoundFV(100000, 500, 6.5, 30) - compoundFV(100000, 500, 5.5, 30) | usd }}. Moving from 0.50% to 0.03% saves {{ compoundFV(100000, 500, 6.97, 30) - compoundFV(100000, 500, 6.5, 30) | usd }}.

## What This Calculator Does NOT Tell You

Fee comparisons assume identical gross returns, which is not always true. A skilled active manager may outperform an index fund even after higher fees. S&P's SPIVA scorecards, which compare active US funds with their benchmarks, have repeatedly found that most active funds trail their benchmark over 15-year periods. Check the latest scorecard for the current share.

The calculator also does not account for advisory fees charged on top of fund expense ratios. If you pay a 0.25% advisory fee and a 0.50% fund fee, your total cost is 0.75%, and that is the figure to enter. In the UK the equivalent is the ongoing charges figure (OCF) plus any platform or adviser fee.
