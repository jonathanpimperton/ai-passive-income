---
title: "How We Calculate: Retirement Age"
slug: "retirement-age"
toolSlug: "retirement-age"
formula: "Binary search: find t where P(1 + r/12)^(12t) + PMT × [((1 + r/12)^(12t) - 1) / (r/12)] = Target"
variables:
  - name: "t"
    description: "Years until retirement — the value being solved for"
  - name: "P"
    description: "Current retirement savings balance"
  - name: "PMT"
    description: "Monthly contribution to retirement accounts"
  - name: "r"
    description: "Expected annual investment return rate as a decimal"
  - name: "Target"
    description: "Desired retirement savings balance"
assumptions:
  - "Returns compound monthly"
  - "Contributions are made at the end of each month"
  - "The return rate remains constant over the entire period"
  - "No withdrawals before retirement"
  - "Contributions remain the same amount each month"
  - "Does not model employer matching contributions"
  - "Maximum retirement age capped at 90"
limitations:
  - "Assumes constant returns — does not model market volatility or sequence-of-returns risk"
  - "A fixed contribution over decades is unrealistic — most people increase savings over time"
  - "Does not model Social Security benefits, pension income, or other retirement income"
  - "Does not account for catch-up contributions after age 50"
  - "Does not model the withdrawal phase"
  - "If the target is unreachable by age 90, the calculator caps at 90"
dataSources:
  - name: "IRS — Retirement Topics: 401(k) and Profit-Sharing Plan Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "Social Security Administration — Retirement Benefits"
    url: "https://www.ssa.gov/benefits/retirement/"
---

## What This Formula Does

The retirement age calculator finds the point in time when your projected savings cross your target balance. Unlike the balance calculator (which takes a time horizon and computes the result) or the contribution calculator (which solves for monthly amount), this one solves for time — the hardest of the three variables to isolate algebraically.

## Why Binary Search?

The compound interest equation with both principal and regular contributions doesn't have a clean closed-form solution for time. The standard formula `t = ln(FV/PV) / (n × ln(1 + r/n))` only works when there are no ongoing contributions. With contributions, the equation becomes:

`P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)] = Target`

This can't be solved for `t` algebraically because `t` appears in two terms that can't be combined. Binary search is the standard numerical approach:

1. Start with a range: 0 years to (90 - current age) years
2. Test the midpoint: compute the balance at that many years
3. If the balance is below the target, search the upper half
4. If it's above, search the lower half
5. Repeat until convergence (within 0.1% of the target)

The search converges in about 20-30 iterations, which is instantaneous.

## How Each Variable Affects the Result

**Current Savings (P):** A larger starting balance means fewer years needed. The relationship is not linear — $100,000 extra in savings might save you 3-5 years depending on the return rate.

**Monthly Contribution (PMT):** Higher contributions reduce the timeline significantly. The effect is strongest at lower contribution levels — going from $500 to $1,000/month saves more years than going from $2,000 to $2,500.

**Return Rate (r):** Higher returns compress the timeline. At 7%, reaching $1M takes about 32 years from $50K with $500/month. At 10%, it takes about 25 years. That 3% difference buys you 7 years.

**Target Balance:** Larger targets extend the timeline, but not proportionally. Doubling the target from $1M to $2M might add only 8-10 years because of the exponential nature of compound growth — the last $1M accumulates much faster than the first.

## Edge Cases

If the current savings already exceed the target, the calculator returns the current age immediately. If the target is unreachable by age 90 with the given inputs (very low savings rate relative to target), the calculator caps at 90.

## Accuracy

The binary search converges to within 0.1% of the target balance, then rounds to the nearest year. The result is presented as a whole number age (e.g., "Age 62") with the years remaining shown alongside. For planning purposes, this level of precision is more than sufficient — real-world returns will vary year to year regardless.
