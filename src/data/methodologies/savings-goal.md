---
title: "How We Calculate: Savings Goal"
slug: "savings-goal"
toolSlug: "savings-goal"
formula: "C = (FV − PV × (1 + r/12)^m) × (r/12) / ((1 + r/12)^m − 1), with C = (FV − PV) / m when r = 0"
variables:
  - name: "C"
    description: "Required monthly savings amount, paid at the end of each month"
  - name: "FV"
    description: "Future value: your savings goal amount"
  - name: "PV"
    description: "Present value: your current savings balance"
  - name: "r"
    description: "Annual interest or return rate as a decimal (default 5%), applied monthly at r/12"
  - name: "m"
    description: "Number of months to reach the goal. In Time to Goal mode it is the unknown, found in whole months"
assumptions:
  - "Interest compounds monthly at the annual rate divided by 12"
  - "Contributions are made at the end of each month"
  - "The interest rate stays constant"
  - "Current savings earn the same rate as new contributions"
  - "No withdrawals occur"
  - "No taxes on interest earned"
  - "No fees or transaction costs"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Assumes a fixed interest rate, but savings account rates change often"
  - "Does not account for taxes on interest income"
  - "Does not model inflation: a goal of $50,000 in 10 years will not buy what $50,000 buys today"
  - "The Time to Goal search stops at 100 years and then says the goal is not reached"
  - "Does not distinguish between account types (savings, CD, investment)"
dataSources:
  - name: "FDIC: National rates and rate caps (savings, money market and CD averages)"
    url: "https://www.fdic.gov/national-rates-and-rate-caps"
  - name: "Investopedia: Future Value of an Annuity"
    url: "https://www.investopedia.com/terms/f/future-value-annuity.asp"
  - name: "NYU Stern (Damodaran): Historical Returns on Stocks, Bonds and Bills"
    url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html"
---

## What This Formula Does

The savings goal calculator answers a straightforward question: "How much do I need to save each month to reach a specific amount by a specific date?" Or, turned around: "If I save this much each month, when will I get there?"

The formula first works out how much your existing savings grow on their own: `PV × (1 + r/12)^m`. It subtracts that from your goal to find what must come from monthly contributions, then solves the future value of an annuity for the monthly payment.

When the interest rate is zero the maths simplifies to `C = (FV − PV) / m`: divide the remaining amount by the number of months.

## The Two Solve Modes

**Monthly Savings Needed:** Enter your goal, current savings, timeline and expected rate. The calculator tells you how much to save each month. Two special cases are reported as such: if your current savings already meet the goal it says so, and if growth on your current savings alone reaches the goal in time it says you are on track and shows the projected balance, with a monthly saving of $0.

**Time to Goal:** Enter your goal, current savings, monthly contribution and expected rate. The calculator steps forward one month at a time (grow the balance by r/12, then add your contribution) and reports the first month in which the balance reaches the goal, in whole months. If the goal is not reached within 100 years it says so and shows the balance at that point.

## How Each Variable Affects the Result

All the examples below use the defaults: a $50,000 goal, 5% a year, 60 months.

**Goal Amount (FV):** Your target. With nothing saved you need {{ savingsMonthly(50000, 0, 5, 60) | usd(2) }} a month.

**Current Savings (PV):** Money already saved reduces the monthly amount needed, and it has the whole timeline to grow. Starting with $5,000 instead of $0 cuts the monthly amount from {{ savingsMonthly(50000, 0, 5, 60) | usd(2) }} to {{ savingsMonthly(50000, 5000, 5, 60) | usd(2) }}, a saving of {{ savingsMonthly(50000, 0, 5, 60) - savingsMonthly(50000, 5000, 5, 60) | usd(2) }} a month.

**Interest Rate (r):** Use the rate your money will actually earn. For savings accounts and CDs that is the quoted APY: the FDIC's national average was 0.38% for savings accounts, 0.63% for money market accounts and 1.76% for 12-month CDs in its release of 19 October 2026. Online high-yield accounts pay more, so enter your account's rate. For a long goal invested in stocks, historical returns have been higher but vary a great deal (see the NYU Stern table), and the actual path will be bumpy.

**Timeline (m):** Shorter timelines mean higher monthly contributions. Doubling the timeline from 5 to 10 years cuts the monthly amount from {{ savingsMonthly(50000, 0, 5, 60) | usd(2) }} to {{ savingsMonthly(50000, 0, 5, 120) | usd(2) }}, to {{ savingsMonthly(50000, 0, 5, 120) / savingsMonthly(50000, 0, 5, 60) * 100 | pct }} of the original, a little less than half because interest does more of the work.

## Choosing the Right Rate

The rate you enter should match where the money will be held:

- **Money you need within a few years:** use the rate your savings account or CD quotes. Do not assume stock market returns for short-term goals, because a market fall could set you back.
- **Longer goals:** a diversified investment portfolio may be reasonable if the goal date is flexible, but treat the return as an assumption and test a lower one.

## Common Misconceptions

People often set a savings goal without allowing for inflation. At 2% to 3% a year, a $60,000 target today would be {{ inflationAdjust(60000, 2, 5, mode=cost) | usd }} to {{ inflationAdjust(60000, 3, 5, mode=cost) | usd }} in five years. For long-term targets, consider raising the goal by your own estimate of inflation, and use the inflation calculator for historical figures.

Another mistake is using an aggressive return for a short-term goal. A stock market return of 10% is a long-run average, and in any single two-year period returns can be negative.
