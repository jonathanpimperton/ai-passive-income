---
title: "How We Calculate: Debt Payoff"
slug: "debt-payoff"
toolSlug: "debt-payoff"
formula: "Month-by-month simulation: apply interest, make minimum payments on all debts, then direct extra payment to target debt (smallest balance for snowball, highest rate for avalanche)"
variables:
  - name: "Balance"
    description: "Current outstanding balance for each debt"
  - name: "Rate"
    description: "Annual interest rate for each debt (as a decimal internally, entered as a percentage)"
  - name: "Minimum Payment"
    description: "Required minimum monthly payment for each debt"
  - name: "Extra Monthly Payment"
    description: "Additional amount per month beyond all minimums, directed to one targeted debt"
assumptions:
  - "Interest compounds monthly on each debt (balance × annual rate / 12)"
  - "Minimum payments are made on all debts every month"
  - "When a debt is paid off, its freed-up minimum payment rolls into the extra payment pool"
  - "Extra payments are directed to a single debt determined by the chosen strategy"
  - "No new charges are added to any debt during payoff"
  - "No late fees, penalties, or interest rate changes occur"
  - "The simulation runs until all balances reach zero or 600 months (50 years), whichever comes first"
limitations:
  - "Does not model variable interest rates (e.g., credit cards with promotional 0% periods)"
  - "Does not account for minimum payment recalculations — some credit cards reduce minimums as balances drop"
  - "Does not model tax deductibility of certain interest (student loans, mortgages)"
  - "Does not factor in balance transfer fees or debt consolidation costs"
  - "Assumes consistent extra payments every month without interruption"
  - "Does not compare against investing the extra money instead of accelerating debt payoff"
dataSources:
  - name: "Consumer Financial Protection Bureau — Paying Down Debt"
    url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/"
  - name: "Harvard Business Review — Research on Debt Repayment Motivation"
    url: "https://hbr.org/2016/12/research-the-best-strategy-for-paying-off-credit-card-debt"
---

## What This Calculator Does

Unlike the other calculators on this site, the debt payoff calculator does not use a single closed-form formula. Instead, it runs a month-by-month simulation of two competing repayment strategies and shows you which one is cheaper and faster.

Each month, the simulation:
1. Applies one month of interest to every debt (balance × annual rate / 12)
2. Makes the minimum payment on each debt
3. Directs the extra payment amount to one targeted debt
4. When a debt hits zero, its minimum payment rolls into the available extra payment pool

The "targeted debt" depends on the strategy you choose.

## Snowball vs. Avalanche

**Debt Snowball (smallest balance first):** Each month, your extra payment goes toward the debt with the smallest remaining balance. When that debt is eliminated, its minimum payment "snowballs" into the extra payment, which then attacks the next smallest debt. This strategy produces quick psychological wins — you see debts disappear faster, which research shows helps people stay motivated.

**Debt Avalanche (highest rate first):** Each month, your extra payment goes toward the debt with the highest interest rate, regardless of balance size. This is the mathematically optimal strategy — it minimizes total interest paid. But it can feel slower because high-rate debts may also have large balances.

## How Each Variable Affects the Result

**Balances:** The total amount of debt determines the baseline timeline. But the distribution matters too — many small debts favor snowball's motivational wins, while one large high-rate debt makes avalanche clearly better.

**Interest Rates:** When rates are similar across debts (e.g., all between 18-22%), the difference between snowball and avalanche is minimal. When rates vary widely (e.g., a 5% car loan and a 24% credit card), avalanche saves significantly more.

**Minimum Payments:** Higher minimums reduce balances faster but leave less room for the extra payment to make an impact. The freed-up minimum from paid-off debts is the engine of both strategies.

**Extra Monthly Payment:** The single most important input. Even $100/month extra can cut years off a multi-debt payoff timeline. The calculator shows the exact impact.

## The Rollover Effect

The key mechanism in both strategies is the rollover: when a debt is eliminated, its minimum payment gets added to the extra payment pool. This creates acceleration — each subsequent debt is attacked with a larger and larger monthly amount. By the time you reach the last debt, you may be throwing $500-1,000/month at it when the original extra payment was only $200.

## Common Misconceptions

The biggest debate is "snowball vs. avalanche." Mathematically, avalanche always wins or ties — it can never cost more than snowball. But behavioral research from Harvard Business School found that people using the snowball method are more likely to actually eliminate their debt, because the early wins keep them motivated. The best strategy is the one you'll stick with.

Another misconception: "I should invest my extra money instead of paying down debt." This depends on the interest rates involved. Paying off a 22% credit card is equivalent to earning a guaranteed 22% return — no investment offers that. But paying extra on a 4% car loan while the stock market averages 7-10% is less clear-cut.

## Why This Calculator Exists

Debt repayment is an emotional and mathematical challenge. This calculator removes the guesswork by simulating both strategies side-by-side with your actual numbers, showing the payoff timeline, total interest paid, and the order debts will be eliminated. It turns an overwhelming situation into a concrete plan.
