---
title: "How We Calculate: Retirement Savings"
slug: "retirement-savings"
toolSlug: "retirement-savings"
formula: "Nominal Balance = P(1 + r/12)^(12t) + PMT × [((1 + r/12)^(12t) - 1) / (r/12)]; Real Balance = Nominal / (1 + i)^t"
variables:
  - name: "P"
    description: "Current retirement savings balance"
  - name: "PMT"
    description: "Monthly contribution to retirement accounts"
  - name: "r"
    description: "Expected annual investment return rate as a decimal"
  - name: "t"
    description: "Years until retirement (retirement age minus current age)"
  - name: "i"
    description: "Expected annual inflation rate as a decimal"
  - name: "Nominal Balance"
    description: "Future value in nominal (today's dollar amounts won't buy as much)"
  - name: "Real Balance"
    description: "Future value adjusted for inflation — what the money is actually worth in today's purchasing power"
assumptions:
  - "Returns compound monthly"
  - "Contributions are made at the end of each month"
  - "The return rate and inflation rate both remain constant"
  - "No withdrawals before retirement"
  - "Contributions remain the same amount each month (not adjusted for raises)"
  - "Does not model employer matching contributions"
  - "Does not model tax-deferred vs. Roth vs. taxable account differences"
limitations:
  - "Assumes constant returns — does not model market volatility or sequence-of-returns risk"
  - "Inflation adjustment is a simple end-of-period division, not year-by-year compounding (this is a slight simplification)"
  - "Does not model Social Security benefits, pension income, or other retirement income sources"
  - "Does not account for contribution limit increases over time (IRS limits are adjusted annually)"
  - "Does not model the withdrawal phase — only the accumulation phase"
  - "Does not factor in employer 401(k) matching"
  - "Does not account for catch-up contributions after age 50"
dataSources:
  - name: "IRS — Retirement Topics: 401(k) and Profit-Sharing Plan Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "Social Security Administration — Retirement Benefits"
    url: "https://www.ssa.gov/benefits/retirement/"
  - name: "Bureau of Labor Statistics — CPI Inflation Calculator"
    url: "https://www.bls.gov/data/inflation_calculator.htm"
---

## What This Formula Does

The retirement savings calculator projects how much money you'll have at retirement based on your current savings, monthly contributions, expected investment returns, and time horizon. It then adjusts the result for inflation to show what that money will actually be worth in terms of today's purchasing power.

The nominal calculation uses the standard compound growth formula with monthly compounding. The inflation adjustment divides the nominal balance by `(1 + i)^t`, where `i` is the annual inflation rate and `t` is years until retirement. This converts future dollars into today's dollars, giving you a realistic sense of your retirement purchasing power.

## How Each Variable Affects the Result

**Current Age and Retirement Age:** These determine your time horizon. The difference between retiring at 60 versus 65 is five fewer years of contributions and five fewer years of compounding — this can reduce the final balance by 30-40%.

**Current Savings (P):** Money already saved has the maximum compounding time. Even a modest head start makes a significant difference. $50,000 at age 30 growing at 7% for 35 years becomes approximately $533,000 — with no additional contributions.

**Monthly Contribution (PMT):** The variable you have the most control over. Increasing contributions by even $100/month can add $100,000+ to your retirement balance over a 30-year horizon.

**Return Rate (r):** Historical S&P 500 returns average about 10% nominal (7% after inflation). Conservative portfolios with more bonds might return 5-6%. This calculator lets you test different assumptions.

**Inflation Rate (i):** The default is 3%, close to the long-run US average. Higher inflation erodes purchasing power faster. At 3% inflation over 35 years, $1 million in nominal dollars is worth about $355,000 in today's money.

## Milestone Markers

The chart displays key age milestones as reference lines:
- **Age 50:** Eligible for catch-up contributions ($7,500 extra for 401(k) in 2024)
- **Age 59.5:** Can withdraw from 401(k)/IRA without the 10% early withdrawal penalty
- **Age 62:** Earliest age for Social Security benefits (at a reduced amount)
- **Age 67:** Full Social Security retirement age for most people born after 1960

## Common Misconceptions

The most common mistake is planning with nominal dollars alone. Saying "I'll have $2 million" sounds comfortable, but if that's 35 years away and inflation averages 3%, that $2 million buys what $710,000 buys today. Always check the inflation-adjusted number.

Another mistake is ignoring the accumulation curve. Retirement savings growth is not linear — it accelerates. The last 10 years of saving typically produce more wealth than the first 20 years. This makes starting early extremely valuable, even with small amounts.

## Related Calculators

This calculator answers "How much will I have?" For the other two retirement questions, see:
- **[Retirement Contribution Calculator](/tools/income-and-planning/retirement-contribution)** — "How much should I save each month?"
- **[Retirement Age Calculator](/tools/income-and-planning/retirement-age)** — "When can I retire?"
