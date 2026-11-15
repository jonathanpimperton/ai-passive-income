---
title: "How We Calculate: Compound Interest"
slug: "compound-interest"
toolSlug: "compound-interest"
formula: "A = P(1 + i)^k + D × [((1 + i)^k − 1) / i], where i = (1 + r/n)^(n/12) − 1 is the equivalent monthly rate and k is the number of months"
variables:
  - name: "P"
    description: "Principal: the initial lump sum you start with"
  - name: "r"
    description: "Annual interest rate as a decimal (for example 0.07 for 7%)"
  - name: "n"
    description: "Compounding frequency: how many times a year interest is added (1 = annually, 2 = semi-annually, 4 = quarterly, 12 = monthly, 365 = daily). It sets the growth rate only; deposits are always monthly"
  - name: "i"
    description: "The equivalent monthly rate, (1 + r/n)^(n/12) − 1. A balance held for a full year grows by exactly (1 + r/n)^n. With monthly compounding, i = r/12"
  - name: "D"
    description: "The deposit you make every month"
  - name: "k"
    description: "Number of months (years × 12; the calculator takes whole years from 1 to 100)"
  - name: "A"
    description: "Final balance after k months"
assumptions:
  - "Interest compounds at the chosen frequency (monthly by default)"
  - "A deposit is made every month, whatever the compounding frequency, at the end of the month (default) or the start (user-selectable)"
  - "The interest rate remains constant for the entire period"
  - "All deposits are equal and made on schedule"
  - "No withdrawals occur during the investment period"
  - "No taxes are applied to gains"
  - "No fees or transaction costs are deducted"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Does not account for taxes on interest or capital gains"
  - "Assumes a fixed interest rate: real-world rates fluctuate"
  - "Does not model inflation erosion of purchasing power"
  - "Ignores investment fees, fund expense ratios, or account maintenance costs"
  - "Deposits are monthly only: weekly or annual deposit schedules are approximated by the monthly equivalent"
dataSources:
  - name: "Investor.gov (SEC): Compound Interest Calculator"
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator"
  - name: "Investopedia: Compound Interest"
    url: "https://www.investopedia.com/terms/c/compoundinterest.asp"
---

## What This Formula Does

The compound interest formula calculates how money grows when earned interest is reinvested and itself earns interest. The formula has two parts that are added together.

The first part, `P(1 + i)^k`, is how much your initial deposit grows on its own. Your principal earns interest, then that interest earns interest in the next period, and so on.

The second part, `D × [((1 + i)^k − 1) / i]`, is the future value of your monthly deposits. Each deposit has less time to grow than the one before it, so the formula sums the growth of every deposit.

The calculator converts the compounding frequency you choose into an equivalent monthly rate `i`. With monthly compounding this is the familiar `r/12`. With annual compounding, `i = (1 + r)^(1/12) − 1`, so a balance held for a full year still grows by exactly `1 + r`. Deposits are made monthly in every case. (Before November 2026 the tool made one deposit per compounding period instead, which mis-stated annual-compounding results by about 2% when you were adding money each month. Monthly compounding results did not change.)

## How Each Variable Affects the Result

**Principal (P):** A larger starting amount means more money earning interest from day one. Doubling the principal doubles the growth on it over any period.

**Interest Rate (r):** Small rate differences compound into large balance differences over long periods. $10,000 left alone for 30 years at 5% becomes {{ compoundFV(10000, 0, 5, 30) | usd }}. At 7% it becomes {{ compoundFV(10000, 0, 7, 30) | usd }}, nearly double, from two percentage points more.

**Compounding Frequency (n):** More frequent compounding produces slightly higher returns. A 7% rate compounded daily gives an effective annual rate of {{ (compoundFV(100, 0, 7, 1, compounding=365) - 100) | pct(2) }}, against {{ (compoundFV(100, 0, 7, 1, compounding=1) - 100) | pct(2) }} for annual compounding. The difference matters most at higher rates and over longer periods, but it is rarely the dominant factor. With $200 deposited each month for 20 years from $10,000 at 7%, annual compounding ends at {{ compoundFV(10000, 200, 7, 20, compounding=1) | usd }} and monthly compounding at {{ compoundFV(10000, 200, 7, 20) | usd }}.

**Time (t):** The most powerful variable, because growth is exponential. $10,000 at 7% earns {{ compoundEarned(10000, 0, 7, 20) | usd }} in its first 20 years and {{ compoundFV(10000, 0, 7, 30) - compoundFV(10000, 0, 7, 20) | usd }} in the 10 years after that.

## Beginning vs. End of the Month

When you select "start of each month", each deposit earns one extra month of growth, so the deposit part of the formula is multiplied by `(1 + i)`. This models automatic investments that leave your account on the first of the month. End of month (the default) is more conservative. With $10,000 to start, $200 a month, 7% and 20 years, start-of-month deposits end at {{ compoundFV(10000, 200, 7, 20, timing=beginning) | usd }} against {{ compoundFV(10000, 200, 7, 20) | usd }} at the end of the month, a difference of {{ (compoundFV(10000, 200, 7, 20, timing=beginning) / compoundFV(10000, 200, 7, 20) - 1) * 100 | pct(2) }}.

## Common Misconceptions

Many people underestimate how sharply compound interest accelerates. A chart of compound growth looks nearly flat in the early years and then curves upward, which leads people to think saving early "doesn't matter much". The opposite is true. $10,000 invested at 7% has 40 years to grow if you start at 25 and 25 years if you start at 40 (both to age 65), and it ends at {{ compoundFV(10000, 0, 7, 40) | usd }} against {{ compoundFV(10000, 0, 7, 25) | usd }}, about {{ compoundFV(10000, 0, 7, 40) / compoundFV(10000, 0, 7, 25) | num(1) }} times as much.

Another common error is confusing nominal and real returns. This calculator shows nominal growth. If inflation averages 3% and your return is 7%, your purchasing power grows by roughly 4% a year. Use the inflation calculator alongside this one for a complete picture.

## Why This Calculator Exists

Compound interest is the foundation of nearly every long-term financial decision: savings accounts, retirement funds, investment portfolios, even debt (which compounds against you). Understanding how your money grows, or how much you need to save, is the starting point for any financial plan.
