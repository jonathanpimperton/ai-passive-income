---
title: "How We Calculate: Retirement Savings"
slug: "retirement-savings"
toolSlug: "retirement-savings"
formula: "Nominal Balance = P(1 + r/12)^m + C × [((1 + r/12)^m − 1) / (r/12)], with m = months to retirement; Today's Money = Nominal / (1 + i)^t"
variables:
  - name: "P"
    description: "Current retirement savings balance"
  - name: "C"
    description: "Monthly contribution to retirement accounts, paid at the end of each month"
  - name: "r"
    description: "Expected annual investment return as a decimal (default 7%), compounded monthly at r/12"
  - name: "m and t"
    description: "Months and years until retirement (retirement age minus current age; m = 12 × t, rounded to whole months)"
  - name: "i"
    description: "Expected annual inflation rate as a decimal (default 3%), applied as a constant yearly rate"
  - name: "Nominal Balance"
    description: "The future balance in future money, which will buy less than the same number of dollars (or pounds, or euros) does today"
  - name: "Today's Money"
    description: "The nominal balance divided by (1 + i)^t: what the balance is worth in today's purchasing power"
assumptions:
  - "Returns compound monthly at the annual rate divided by 12"
  - "Contributions are made at the end of each month"
  - "The return rate and the inflation rate both stay constant"
  - "No withdrawals before retirement"
  - "Contributions stay the same each month (no raises)"
  - "Employer matching contributions are not added: enter them as part of your monthly contribution if you want them included"
  - "Tax-deferred, Roth and taxable accounts are treated the same: all growth is untaxed"
  - "US mode compares your monthly contribution with the employee 401(k) deferral limit for your age and shows a warning if it is higher. Employer contributions do not count toward that limit"
  - "The currency selector changes the milestone markers and labels (see UK and Euro Mode); there is no exchange-rate conversion"
limitations:
  - "Assumes constant returns: does not model market volatility or sequence-of-returns risk"
  - "Inflation is a constant rate, so real returns are only as good as that guess"
  - "Does not model Social Security, State Pension, workplace pensions or other retirement income"
  - "Contribution limits are checked only against the 401(k) employee limit for the current tax year; IRA limits and later-year limit changes are not modelled"
  - "Does not model the withdrawal phase, only the accumulation phase"
  - "The 401(k) limit check ignores employer contributions and employer plan rules"
  - "UK milestone ages follow the law as it stands today. The State Pension age timetable can be changed by future legislation"
dataSources:
  - name: "IRS: Retirement Topics, 401(k) and Profit-Sharing Plan Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
  - name: "Social Security Administration: Retirement Benefits (the SSA site blocks automated link checks)"
    url: "https://www.ssa.gov/benefits/retirement/"
  - name: "Cornell Law School LII: 20 CFR 404.409, full retirement age by birth year"
    url: "https://www.law.cornell.edu/cfr/text/20/404.409"
  - name: "GOV.UK: State Pension age timetable"
    url: "https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable"
  - name: "GOV.UK: Increasing the normal minimum pension age"
    url: "https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age/increasing-normal-minimum-pension-age"
  - name: "Bureau of Labor Statistics: CPI Inflation Calculator"
    url: "https://www.bls.gov/data/inflation_calculator.htm"
---

## What This Formula Does

The retirement savings calculator projects how much you will have at retirement from your current savings, monthly contributions, expected investment return and time horizon. It then adjusts the result for inflation to show what that money is worth in today's purchasing power.

The nominal calculation is the standard compound growth formula with monthly compounding and end-of-month contributions. The inflation adjustment divides the nominal balance by `(1 + i)^t`, where `i` is the annual inflation rate and `t` is the years until retirement. This is compounding inflation year by year at a constant rate, so it is exact for a constant rate.

## How Each Variable Affects the Result

**Current Age and Retirement Age:** These set your time horizon. Retiring at 60 instead of 65 means five fewer years of contributions and growth. With the defaults ($50,000 saved, $500 a month, 7%, starting at 30) a balance at 60 of {{ retirementFV(50000, 500, 7, 30).nominal | usd }} compares with {{ retirementFV(50000, 500, 7, 35).nominal | usd }} at 65, which is {{ (1 - retirementFV(50000, 500, 7, 30).nominal / retirementFV(50000, 500, 7, 35).nominal) * 100 | pct }} lower.

**Current Savings (P):** Money already saved has the most time to compound. $50,000 at 7% for 35 years becomes {{ compoundFV(50000, 0, 7, 35) | usd }} with no further contributions.

**Monthly Contribution (C):** The input you control most. An extra $100 a month at 7% for 30 years adds {{ compoundFV(0, 100, 7, 30) | usd }}.

**Return Rate (r):** The least certain input. As a reference point, the NYU Stern historical returns table (Aswath Damodaran) shows US stocks averaging close to 10% a year before inflation over the long run and a lower figure after inflation. A portfolio holding more bonds will be lower. Test several assumptions.

**Inflation Rate (i):** The default is 3%, near the US long-run average. At 3% inflation over 35 years, $1,000,000 of future money is worth {{ inflationAdjust(1000000, 3, 35, mode=value) | usd }} in today's money. In UK and euro mode the hint reminds you that the Bank of England and the European Central Bank both target 2%.

## Milestone Markers

The chart marks age milestones that depend on the currency selected. Contribution and tax figures come from the same rates data as the salary calculators, for the tax year they currently point at (the tool says when a year's limits are not yet published and last year's are carried over).

**USD (US):**
- **Age 50:** 401(k) catch-up contributions allowed, on top of the employee limit. For the current default tax year the limit is {{ usFact('k401Limit') | usd }} and the catch-up is {{ usFact('k401CatchUp') | usd }}.
- **Ages 60 to 63:** a higher catch-up applies. For 2026 it is $11,250 (IRS Notice 2025-67), replacing the age-50 catch-up.
- **Age 59½:** withdrawals from a 401(k) or IRA without the 10% early-withdrawal penalty.
- **Age 62:** earliest age to claim Social Security retirement benefits, at a permanently reduced amount.
- **Full retirement age:** 67 if you were born in 1960 or later, and 66 plus some months for 1955 to 1959. The calculator asks for age and not birth date, so when your age could fit two birth years it shows the range.

**GBP (UK):**
- **Pension access:** private and workplace pensions can usually be taken from 55 today. The normal minimum pension age rises to 57 on 6 April 2028. Some schemes have a protected pension age, which the calculator mentions but does not model.
- **State Pension age** from your birth date, under the timetable in law today: 66 for those born from 6 October 1954 to 5 April 1960, then 66 plus 1 to 11 months, 67 for those born from 6 March 1961 to 5 April 1977, between 67 and 68 for those born from 6 April 1977 to 5 April 1978, and 68 for those born on or after 6 April 1978. The calculator works the age out from your current age, so it can show a range.
- The US 401(k) limit check and the US milestones are not shown.

**EUR (euro area):** no milestone markers, because retirement ages and rules differ by country. Labels say "euros" and the inflation hint cites the ECB's 2% target.

## Common Misconceptions

The most common mistake is planning in nominal terms alone. "I'll have $2 million" sounds comfortable, but 35 years from now at 3% inflation, $2,000,000 buys what {{ inflationAdjust(2000000, 3, 35, mode=value) | usd }} buys today. Always check the number in today's money.

Another mistake is expecting growth to be steady. Retirement savings accelerate: with the defaults, the last 10 years of saving add {{ retirementFV(50000, 500, 7, 35).nominal - retirementFV(50000, 500, 7, 25).nominal | usd }} to the balance, more than the balance at the end of year 20 ({{ retirementFV(50000, 500, 7, 20).nominal | usd }}). That is why starting early matters even with small amounts.

## Related Calculators

This calculator answers "How much will I have?" For the other two retirement questions, see:
- **[Retirement Contribution Calculator](/tools/income-and-planning/retirement-contribution/)**: "How much should I save each month?"
- **[Retirement Age Calculator](/tools/income-and-planning/retirement-age/)**: "When can I retire?"
