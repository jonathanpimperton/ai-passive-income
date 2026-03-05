---
title: "How We Calculate: Savings Goal"
slug: "savings-goal"
toolSlug: "savings-goal"
formula: "PMT = (FV - PV × (1 + r/12)^m) × (r/12) / ((1 + r/12)^m - 1)"
variables:
  - name: "PMT"
    description: "Required monthly savings amount"
  - name: "FV"
    description: "Future value — your savings goal amount"
  - name: "PV"
    description: "Present value — your current savings balance"
  - name: "r"
    description: "Annual interest/return rate as a decimal"
  - name: "m"
    description: "Number of months to reach the goal"
assumptions:
  - "Interest compounds monthly"
  - "Contributions are made at the end of each month"
  - "The interest rate remains constant"
  - "Current savings earn the same rate as new contributions"
  - "No withdrawals occur"
  - "No taxes on interest earned"
  - "No fees or transaction costs"
limitations:
  - "Assumes a fixed interest rate — savings account rates change frequently"
  - "Does not account for taxes on interest income"
  - "Does not model inflation — a goal of $50,000 in 10 years won't buy what $50,000 buys today"
  - "The time-to-goal solver is capped at 100 years"
  - "Does not distinguish between account types (savings, CD, investment)"
dataSources:
  - name: "FDIC — Savings Account Rates"
    url: "https://www.fdic.gov/resources/bankers/national-rates/"
  - name: "Investopedia — Future Value of an Annuity"
    url: "https://www.investopedia.com/terms/f/future-value-annuity.asp"
---

## What This Formula Does

The savings goal calculator answers a straightforward question: "How much do I need to save each month to reach a specific dollar amount by a specific date?" Or, flipped around: "If I save this much each month, when will I reach my goal?"

The formula first calculates how much your existing savings will grow on their own: `PV × (1 + r/12)^m`. It then subtracts that from your goal to find the remaining amount that must come from monthly contributions. Finally, it solves the future value of annuity formula for the monthly payment.

When the interest rate is zero, the math simplifies to: `PMT = (FV - PV) / m` — just divide the remaining amount by the number of months.

## The Two Solve Modes

**Monthly Savings Needed:** Enter your goal amount, current savings, timeline, and expected return rate. The calculator tells you exactly how much to save each month. This is the primary mode.

**Time to Goal:** Enter your goal amount, current savings, monthly contribution, and expected return rate. The calculator tells you how many months and years it will take to reach your target. Uses binary search with convergence to within $1.

## How Each Variable Affects the Result

**Goal Amount (FV):** Your target. Common goals include emergency funds ($10,000-30,000), house deposits ($40,000-80,000), car purchases ($15,000-40,000), and education funds ($50,000-200,000).

**Current Savings (PV):** Money you've already saved reduces the monthly amount needed. Even a small head start matters because it compounds over the full time horizon. Starting with $5,000 instead of $0 on a 5-year goal at 5% saves roughly $75/month in required contributions.

**Interest Rate (r):** For savings goals, use rates appropriate to where the money will be held. High-yield savings accounts: 4-5% (as of 2025). CDs: 4-5%. Conservative investment portfolio: 5-7%. Aggressive stock portfolio: 7-10% (but with risk of loss, unsuitable for short-term goals).

**Timeline (m):** Shorter timelines mean higher monthly contributions. Doubling your timeline roughly halves the required monthly amount (more if the interest rate is significant).

## Choosing the Right Rate

The interest rate you enter should match your actual savings vehicle:

- **Under 2 years:** Use a high-yield savings account or short-term CD rate (4-5%). Don't invest in stocks for short-term goals — a market drop could set you back.
- **2-5 years:** A mix of savings and conservative investments might be appropriate. Use 4-6%.
- **5+ years:** If the goal is flexible, a diversified investment portfolio's historical average (6-8%) may be reasonable. Accept that the actual path will be bumpy.

## Common Misconceptions

People often set a savings goal without accounting for inflation. A house deposit of $60,000 today might need to be $70,000+ in five years if home prices and general costs continue rising. Consider inflating your goal by 2-3% per year for long-term targets.

Another mistake is using aggressive return rates for short-term goals. A stock market return of 10% is a long-run average — in any given 2-year period, returns could be negative. For goals under 3 years, stick to savings account or CD rates.

## Why This Calculator Exists

Every major purchase or financial milestone requires a savings plan. This calculator turns a vague aspiration ("I want to save for a house") into a concrete monthly action ("I need to save $850/month for the next 4 years"). That specificity makes the difference between hoping and planning.
