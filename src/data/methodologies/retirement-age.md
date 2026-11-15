---
title: "How We Calculate: Retirement Age"
slug: "retirement-age"
toolSlug: "retirement-age"
formula: "Find the first month m at which B(m) = B(m−1) × (1 + r/12) + C reaches the Target, starting from B(0) = P, for m up to (90 − current age) × 12"
variables:
  - name: "m"
    description: "Months from today until the balance first reaches the target: the value being solved for. The age shown is current age + m / 12"
  - name: "P"
    description: "Current retirement savings balance, B(0)"
  - name: "C"
    description: "Monthly contribution to retirement accounts, added at the end of each month"
  - name: "r"
    description: "Expected annual investment return as a decimal (default 7%), applied monthly at r/12"
  - name: "Target"
    description: "Desired retirement savings balance"
  - name: "i"
    description: "Expected annual inflation rate (default 3%). Used only to show the balance in today's money"
assumptions:
  - "Returns compound monthly at the annual rate divided by 12"
  - "Contributions are made at the end of each month"
  - "The return rate stays constant over the entire period"
  - "No withdrawals before retirement"
  - "Contributions stay the same each month"
  - "Employer matching contributions are not added: include them in your monthly contribution if you want them counted"
  - "The search runs up to age 90"
  - "The currency selector changes the milestone markers and labels (see the retirement savings page for the US, UK and euro-area milestones); there is no exchange-rate conversion"
limitations:
  - "Assumes constant returns: does not model market volatility or sequence-of-returns risk"
  - "A fixed contribution over decades is unrealistic: most people increase savings over time"
  - "Does not model Social Security, State Pension, workplace pensions or other retirement income"
  - "Does not model catch-up contributions or contribution limits (the US 401(k) limit check is on the retirement savings and contribution calculators)"
  - "Does not model the withdrawal phase"
  - "If the target is not reached by age 90 the calculator says so instead of giving an age"
dataSources:
  - name: "IRS: Retirement Topics, 401(k) and Profit-Sharing Plan Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "Social Security Administration: Retirement Benefits (the SSA site blocks automated link checks)"
    url: "https://www.ssa.gov/benefits/retirement/"
  - name: "GOV.UK: State Pension age timetable"
    url: "https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable"
---

## What This Formula Does

The retirement age calculator finds the point in time when your projected savings first reach your target balance. The retirement savings calculator takes a time horizon and computes the balance, and the contribution calculator solves for the monthly amount. This one solves for time.

## How the Search Works

The compound growth equation with regular contributions has no clean closed-form solution for time, because the time appears in two terms that cannot be combined. The calculator therefore steps forward one month at a time:

1. Start with your current savings.
2. Each month, grow the balance by the monthly rate (annual return / 12), then add your contribution.
3. Stop at the first month where the balance is at or above the target.
4. If you reach age 90 first, stop and report that the target is not reached.

This always finishes, in at most (90 − current age) × 12 steps, and the answer is exact to the month. The balance on the month it is reached is a little above the target, because you stop at a month-end and not part-way through one. The result is shown as years and months (for example, 29 years 10 months), with the age you will be and the balance then.

## How Each Variable Affects the Result

All the figures here start from the defaults: age 30, $50,000 saved, $500 a month, 7% return, $1,000,000 target.

With these inputs, you reach the target in {{ savingsMonths(1000000, 50000, 500, 7) | months }}, at age {{ 30 + savingsMonths(1000000, 50000, 500, 7) / 12 | num(1) }}.

**Current Savings (P):** A larger starting balance means fewer years, but not in a straight line. Starting with $150,000 instead of $50,000 cuts the time from {{ savingsMonths(1000000, 50000, 500, 7) | months }} to {{ savingsMonths(1000000, 150000, 500, 7) | months }}.

**Monthly Contribution (C):** Higher contributions shorten the timeline, and the effect is strongest at low contribution levels. Going from $500 to $1,000 a month cuts the time from {{ savingsMonths(1000000, 50000, 500, 7) | months }} to {{ savingsMonths(1000000, 50000, 1000, 7) | months }}. Going from $2,000 to $2,500 a month cuts it from {{ savingsMonths(1000000, 50000, 2000, 7) | months }} to {{ savingsMonths(1000000, 50000, 2500, 7) | months }}.

**Return Rate (r):** Higher returns compress the timeline. At 10% instead of 7%, the same plan reaches $1,000,000 in {{ savingsMonths(1000000, 50000, 500, 10) | months }} instead of {{ savingsMonths(1000000, 50000, 500, 7) | months }}.

**Target Balance:** Larger targets take longer, but not in proportion. Doubling the target to $2,000,000 takes {{ savingsMonths(2000000, 50000, 500, 7) | months }}, which is {{ savingsMonths(2000000, 50000, 500, 7) - savingsMonths(1000000, 50000, 500, 7) | months }} more, because the second million accumulates faster than the first.

## Edge Cases

**Already there:** if your current savings already meet the target, the calculator shows your current age and says you are already there.

**Not reachable by 90:** if the target is not reached by age 90, the calculator says so and shows the balance you would have at 90, how far short it is, and the monthly contribution that would reach the target exactly at 90. For example, $50,000 with no contributions at a 1% return reaches only $91,083 by age 90, $908,917 short of $1,000,000, and would need $921.83 a month from today to get there.

## Accuracy

The result is exact to the month for the inputs you enter, using the engine shared with the other retirement calculators. Real-world returns will vary year to year regardless, so treat the age as an estimate and re-run it with a lower return to see how sensitive it is.
