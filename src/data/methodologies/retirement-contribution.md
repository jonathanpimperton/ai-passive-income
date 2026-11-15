---
title: "How We Calculate: Retirement Contribution"
slug: "retirement-contribution"
toolSlug: "retirement-contribution"
formula: "C = (Target − P × (1 + r/12)^m) × (r/12) / ((1 + r/12)^m − 1), with m = months to retirement (C = (Target − P) / m when r = 0)"
variables:
  - name: "C"
    description: "Required monthly contribution to reach the target"
  - name: "Target"
    description: "Desired retirement balance at retirement age, in future money"
  - name: "P"
    description: "Current retirement savings balance"
  - name: "r"
    description: "Expected annual investment return as a decimal (default 7%), applied monthly at r/12"
  - name: "m"
    description: "Months until retirement: (retirement age − current age) × 12, rounded to whole months"
  - name: "i"
    description: "Expected annual inflation rate (default 3%). Used only to show the target in today's money"
assumptions:
  - "Returns compound monthly at the annual rate divided by 12"
  - "Contributions are made at the end of each month"
  - "The return rate and the inflation rate both stay constant"
  - "No withdrawals before retirement"
  - "The contribution stays fixed (it is not raised with salary growth)"
  - "Employer matching contributions are not added: the result is the total that has to go in, from you and your employer together"
  - "Tax-deferred, Roth and taxable accounts are treated the same: all growth is untaxed"
  - "US mode compares the required monthly amount with the employee 401(k) deferral limit for your age and warns if it is higher. Employer contributions do not count toward that limit"
  - "The currency selector changes the milestone markers and labels (see the retirement savings page); there is no exchange-rate conversion"
limitations:
  - "Assumes constant returns: does not model market volatility"
  - "A fixed contribution is unrealistic over decades: most people increase savings as income grows"
  - "Does not model Social Security, State Pension or other retirement income"
  - "Contribution limits are checked only against the 401(k) employee limit for the current tax year; IRA limits and later-year changes are not modelled"
  - "Does not model the withdrawal phase, only the accumulation phase"
  - "The 401(k) limit check ignores employer contributions and employer plan rules"
dataSources:
  - name: "IRS: Retirement Topics, 401(k) and Profit-Sharing Plan Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "Social Security Administration: Retirement Benefits (the SSA site blocks automated link checks)"
    url: "https://www.ssa.gov/benefits/retirement/"
  - name: "GOV.UK: State Pension age timetable"
    url: "https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable"
---

## What This Formula Does

The retirement contribution calculator solves the compound growth equation in reverse. Instead of computing a future balance from a known contribution, it finds the contribution needed to reach a specific target.

The calculation has two steps:

1. **Subtract the growth of existing savings.** Your current savings grow by themselves. The formula first works out what they become by retirement, `P × (1 + r/12)^m`. The gap between that and your target is what your monthly contributions have to fill.

2. **Solve for the monthly contribution.** Using the future value of an annuity rearranged for C, it finds the monthly deposit that fills the gap exactly.

## How Each Variable Affects the Result

**Target Balance:** Direct relationship: doubling the target roughly doubles the required contribution (not exactly, because the growth of existing savings is subtracted first).

**Current Savings (P):** Every dollar already saved reduces the contribution you need. $50,000 saved at age 30 and left to grow at 7% becomes {{ compoundFV(50000, 0, 7, 35) | usd }} by 65, so contributions only have to cover the gap to the target. To reach $1,000,000 in 35 years at 7%, $50,000 saved today lowers the monthly amount from {{ savingsMonthly(1000000, 0, 7, 420) | usd }} to {{ savingsMonthly(1000000, 50000, 7, 420) | usd }}.

**Return Rate (r):** Higher returns lower the required contribution. At 7%, reaching $1,000,000 from nothing in 35 years takes {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month. At 5% it takes {{ savingsMonthly(1000000, 0, 5, 420) | usd }}. A 2-point difference in return changes the contribution by {{ (savingsMonthly(1000000, 0, 5, 420) / savingsMonthly(1000000, 0, 7, 420) - 1) * 100 | pct }}.

**Time (t):** The most powerful variable. More time means each contribution has longer to compound. Starting 10 years later (25 years to go instead of 35) raises the monthly amount to reach $1,000,000 at 7% from {{ savingsMonthly(1000000, 0, 7, 420) | usd }} to {{ savingsMonthly(1000000, 0, 7, 300) | usd }}.

## Inflation Adjustment

The calculator also shows your target in today's money, using `Target / (1 + i)^t`. If your target is $1,000,000 and inflation averages 3% for 35 years, it has the purchasing power of {{ inflationAdjust(1000000, 3, 35, mode=value) | usd }} in today's dollars. This helps you judge whether the target is enough.

## US, UK and Euro Mode

The formula is the same in every mode. In US mode, if the required monthly amount is above the employee 401(k) deferral limit for your age (the base limit plus the catch-up from age 50, or the higher catch-up at 60 to 63), the calculator shows a warning, because the plan as entered would not fit in a 401(k) alone. In UK mode the chart marks pension access age and State Pension age instead, and in euro mode it shows no milestones. The retirement savings methodology page lists the milestones.

## Edge Cases

**Growth alone is enough:** if your existing savings will grow past the target on their own, the calculator returns $0 and says so.

**No time left:** if your retirement age is the same as your current age and the target is not already met, there is no time to save and the calculator says so instead of showing a number.

**Short horizons:** with a very short time horizon, the required contribution is very high because there is little time for growth, and the result is mostly money paid in rather than investment growth.

## Why This Calculator Exists

"How much do I need to save each month?" is the retirement question people most want answered, and it is the one you cannot eyeball. Working it backwards from a target puts a monthly figure on a goal and shows how much the assumptions behind it matter.
