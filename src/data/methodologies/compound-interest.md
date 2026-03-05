---
title: "How We Calculate: Compound Interest"
slug: "compound-interest"
toolSlug: "compound-interest"
formula: "A = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)]"
variables:
  - name: "P"
    description: "Principal — the initial lump sum you start with"
  - name: "r"
    description: "Annual interest rate as a decimal (e.g., 0.07 for 7%)"
  - name: "n"
    description: "Compounding frequency — how many times per year interest is calculated (1 = annually, 4 = quarterly, 12 = monthly, 365 = daily)"
  - name: "t"
    description: "Time in years"
  - name: "PMT"
    description: "Periodic contribution amount, converted from monthly to match the compounding frequency (PMT_monthly × 12/n)"
  - name: "A"
    description: "Final balance after t years"
assumptions:
  - "Interest compounds at the specified frequency (monthly by default)"
  - "Contributions are made at the end of each compounding period (default) or the beginning (user-selectable)"
  - "The interest rate remains constant for the entire period"
  - "All contributions are equal and made on schedule"
  - "No withdrawals occur during the investment period"
  - "No taxes are applied to gains"
  - "No fees or transaction costs are deducted"
limitations:
  - "Does not account for taxes on interest or capital gains"
  - "Assumes a fixed interest rate — real-world rates fluctuate"
  - "Does not model inflation erosion of purchasing power"
  - "Ignores investment fees, fund expense ratios, or account maintenance costs"
  - "Monthly contributions are converted to per-period amounts, which is an approximation when compounding frequency differs from monthly"
dataSources:
  - name: "SEC Compound Interest Calculator"
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator"
  - name: "Investopedia — Compound Interest Formula"
    url: "https://www.investopedia.com/terms/c/compoundinterest.asp"
---

## What This Formula Does

The compound interest formula calculates how money grows when earned interest is reinvested and itself earns interest. The formula has two parts that are added together.

The first part — `P(1 + r/n)^(nt)` — calculates how much your initial deposit grows on its own, without any additional contributions. Your principal earns interest, then that interest earns interest in the next period, and so on. This exponential growth is why Albert Einstein allegedly called compound interest the eighth wonder of the world (he probably didn't say that, but the math holds up regardless).

The second part — `PMT × [((1 + r/n)^(nt) - 1) / (r/n)]` — calculates the future value of your regular contributions. Each contribution has less time to grow than the one before it, so the formula sums up the compound growth of every individual payment.

## How Each Variable Affects the Result

**Principal (P):** A larger starting amount means more money earning interest from day one. Doubling your principal roughly doubles the interest earned over any time period.

**Interest Rate (r):** Small rate differences compound into large balance differences over long periods. At 5% over 30 years, $10,000 becomes $43,219. At 7%, it becomes $76,123 — nearly double, from just 2 percentage points more.

**Compounding Frequency (n):** More frequent compounding produces slightly higher returns. Daily compounding at 7% yields about 7.25% effective annual rate, versus 7.00% for annual compounding. The difference matters most at higher rates and longer time periods, but it's rarely the dominant factor.

**Time (t):** The single most powerful variable. Because growth is exponential, the last 10 years of a 30-year investment typically generate more interest than the first 20 years combined.

## Beginning vs. End of Period

When you select "beginning of period" contributions, each payment earns one extra compounding period of interest. The formula multiplies the contribution component by `(1 + r/n)`. This models automatic investments that happen at the start of each month. End-of-period (the default) is more conservative and reflects payments made after each period closes.

## Common Misconceptions

Many people underestimate how dramatically compound interest accelerates over time. A chart of compound growth looks nearly flat in the early years, then curves sharply upward. This leads people to think saving early "doesn't matter much" — the opposite is true. Money invested at age 25 has roughly twice the compounding time of money invested at age 40.

Another common error is confusing nominal and real returns. This calculator shows nominal growth. If inflation averages 3% and your return is 7%, your real purchasing power grows at roughly 4% annually. Use the inflation calculator alongside this one for a complete picture.

## Why This Calculator Exists

Compound interest is the foundation of nearly every long-term financial decision: savings accounts, retirement funds, investment portfolios, even debt (which compounds against you). Understanding how your money grows — or how much you need to save — is the starting point for any financial plan.
