---
title: "How We Calculate: Investment Return"
slug: "investment-return"
toolSlug: "investment-return"
formula: "A = P(1 + i)^k + D × [((1 + i)^k − 1) / i], where i = (1 + r/n)^(n/12) − 1 is the equivalent monthly rate and k is the number of months. Each solve mode rearranges this formula for one unknown."
variables:
  - name: "P"
    description: "Starting investment amount (principal)"
  - name: "D"
    description: "Deposit made every month (always monthly, whatever the compounding frequency)"
  - name: "r"
    description: "Annual expected return rate as a decimal. May be negative when it is the unknown being solved for"
  - name: "n"
    description: "Compounding frequency per year (1, 2, 4, 12 or 365; default 12). It sets the growth rate only"
  - name: "i"
    description: "The equivalent monthly rate, (1 + r/n)^(n/12) − 1. With monthly compounding i = r/12"
  - name: "k"
    description: "Number of months (the time horizon in years × 12). In Time mode it is the unknown, found in whole months"
  - name: "A"
    description: "Final portfolio value (in End Amount mode) or the target value (in the other solve modes)"
assumptions:
  - "Returns compound at the chosen frequency (monthly by default)"
  - "The return rate is constant for the entire period"
  - "A deposit is made every month, at the end of the month (default) or the start (user-selectable)"
  - "No withdrawals are made during the investment period"
  - "Dividends and capital gains are automatically reinvested"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Real-world returns are volatile: a constant rate is an idealised average"
  - "Does not model sequence-of-returns risk (the order of good and bad years matters)"
  - "Ignores fund expense ratios, advisory fees, and trading costs (use the investment fee calculator for those)"
  - "Does not account for taxes on dividends, capital gains, or withdrawals"
  - "The Return Rate solver searches rates from −99% to +100% a year. Above 100% it reports 'Over 100% a year', and when the money paid in already exceeds the target it reports the negative rate that gets there"
  - "The Time solver counts whole months up to 100 years. Past that it reports 'Not within 100 years'"
dataSources:
  - name: "NYU Stern (Damodaran): Historical Returns on Stocks, Bonds and Bills"
    url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html"
  - name: "FDIC: National rates and rate caps (savings account averages)"
    url: "https://www.fdic.gov/national-rates-and-rate-caps"
  - name: "Investor.gov (SEC): Compound Interest Calculator"
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator"
---

## What This Formula Does

The investment return calculator uses the same compound growth formula as the compound interest calculator, framed as five solve-for-X modes. Instead of only computing the end balance, you can ask: "What monthly contribution do I need?", "What return rate is required?", "How much should I start with?", or "How long will it take?"

Each mode rearranges the same formula. Deposits are always monthly, and the compounding frequency only sets the equivalent monthly rate `i`, so the five modes always agree with each other and with the compound interest calculator.

## The Five Solve Modes

**End Amount:** Given a starting amount, monthly contribution, return rate and time, calculate the final value. This is the standard forward calculation. For example, $10,000 plus $200 a month at 7% for 20 years ends at {{ compoundFV(10000, 200, 7, 20) | usd }}.

**Contribution:** Given a starting amount, target, return rate and time, solve for the monthly contribution with a closed-form rearrangement of the formula. To reach $100,000 from $10,000 in 20 years at 7% needs {{ savingsMonthly(100000, 10000, 7, 240) | usd(2) }} a month. If the starting amount alone would already reach the target, the calculator says so and shows $0.

**Return Rate:** Given a starting amount, monthly contribution, target and time, solve for the annual return needed. There is no closed form, so the calculator searches (bisection, 200 steps) between −99% and +100% a year and stops once the result is exact to far less than a cent. For $10,000 plus $200 a month to reach $100,000 in 20 years it finds {{ requiredRate(10000, 200, 100000, 20) | pct(2) }} a year. If the money you will pay in already exceeds the target, the answer is a negative rate and the page says so. If even 100% a year falls short, it says "Over 100% a year".

**Starting Amount:** Given a monthly contribution, target, return rate and time, solve for the lump sum needed today, again in closed form. If the deposits alone reach the target, it shows $0. For example, $200 a month at 7% for 20 years grows to {{ compoundFV(0, 200, 7, 20) | usd }} with nothing to start, which already clears a $100,000 target.

**Time:** Given a starting amount, monthly contribution, return rate and target, find how long it takes. The calculator steps month by month, up to 100 years, and reports the first month-end at which the balance reaches the target, in whole months. To reach $1,000,000 from $10,000 plus $500 a month at 7% takes {{ savingsMonths(1000000, 10000, 500, 7) | months }}. If the target is never reached within 100 years, it says so and shows the balance at the limit.

## How Each Variable Affects the Result

**Starting Amount (P):** Provides a foundation that compounds over the whole horizon, so a larger start benefits from the most compounding time.

**Monthly Contribution (D):** For most investors, regular contributions are the main driver. At 7% over 30 years, depositing $500 a month instead of $200 ends {{ compoundFV(0, 500, 7, 30) - compoundFV(0, 200, 7, 30) | usd }} higher.

**Return Rate (r):** The average annual return, which is the least certain input. As a reference point, the NYU Stern historical returns table (Aswath Damodaran) shows US stocks (the S&P 500) with a compound average close to 10% a year before inflation since 1928 and a lower figure after inflation (open the table for the current numbers). Savings rates differ widely by account: the FDIC's national average for savings accounts was 0.38% in its release of 19 October 2026, and online high-yield accounts pay more, so enter your own account's quoted rate.

**Time (t):** Compounding makes longer horizons disproportionately powerful. Starting 10 years earlier can beat doubling your contribution: $200 a month for 30 years at 7% ends at {{ compoundFV(0, 200, 7, 30) | usd }}, while $400 a month for 20 years ends at {{ compoundFV(0, 400, 7, 20) | usd }}.

## Beginning vs. End of the Month

Choosing "start of each month" means each deposit earns one extra month of growth, which multiplies the deposit part of the formula by `(1 + i)`. At 7% with $10,000 to start, $200 a month and 20 years, that raises the final balance from {{ compoundFV(10000, 200, 7, 20) | usd }} to {{ compoundFV(10000, 200, 7, 20, timing=beginning) | usd }}, which is {{ (compoundFV(10000, 200, 7, 20, timing=beginning) / compoundFV(10000, 200, 7, 20) - 1) * 100 | pct(2) }}.

## Common Misconceptions

The constant return rate is the biggest simplification. Real markets have years of 20% gains and years of 20% losses. A portfolio that averages 7% does not end up where one earning exactly 7% every year does. Volatility reduces the compounded growth rate (volatility drag). The calculator shows an idealised path, not a prediction.

Another error is ignoring fees. Over 30 years, a 1% annual fee takes {{ (1 - compoundFV(100000, 500, 6, 30) / compoundFV(100000, 500, 7, 30)) * 100 | pct1 }} off the final balance in the investment fee calculator's example ($100,000 plus $500 a month at 7% gross).
