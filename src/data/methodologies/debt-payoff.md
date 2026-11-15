---
title: "How We Calculate: Debt Payoff"
slug: "debt-payoff"
toolSlug: "debt-payoff"
formula: "Month-by-month simulation: add interest to every debt, pay each debt's minimum, then spend the pool (extra payment + minimums of cleared debts) on the open debts in strategy order: smallest balance first (snowball) or highest rate first (avalanche)"
variables:
  - name: "Balance"
    description: "Current outstanding balance for each debt. Must be above zero"
  - name: "Rate"
    description: "Annual interest rate (APR) for each debt, entered as a percentage between 0% and 1,000% and used as a decimal internally"
  - name: "Minimum Payment"
    description: "Required minimum monthly payment for each debt. Enter 0 if there is none"
  - name: "Extra Monthly Payment"
    description: "Amount per month beyond all the minimums, directed to one targeted debt at a time"
assumptions:
  - "Interest compounds monthly on each debt (balance × annual rate / 12)"
  - "The minimum is paid on every open debt every month, capped at its balance"
  - "When a debt is cleared, its minimum rolls into the pool permanently, so the total monthly payment stays the same from the first month to the last"
  - "The pool is spent on the open debts in strategy order, and anything left over after one debt is cleared goes straight to the next"
  - "No new charges are added to any debt during payoff"
  - "No late fees, penalties, or rate changes occur"
  - "The simulation runs for 600 months (50 years). After that the outcome is either 'never' or 'not cleared within 50 years' (see below)"
  - "Up to 10 debts. Rows with a blank or impossible field are left out and the form says why. Blank rows are ignored, an unnamed debt is called 'Debt 1', 'Debt 2' and so on, and two debts with the same name are kept apart"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Does not model variable interest rates (for example promotional 0% periods)"
  - "Does not recalculate minimums: some credit cards reduce the minimum as the balance falls, so use the credit card payoff calculator for that"
  - "Does not model the tax deductibility of some interest (student loans, mortgages)"
  - "Does not include balance transfer fees or consolidation costs"
  - "Assumes the extra payment is made every month without interruption"
  - "Does not compare paying down debt against investing the money instead"
dataSources:
  - name: "Consumer Financial Protection Bureau: How to reduce your debt (highest-rate and smallest-balance methods)"
    url: "https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/"
  - name: "Harvard Business Review: Research, The Best Strategy for Paying Off Credit Card Debt (Remi Trudel, Boston University)"
    url: "https://hbr.org/2016/12/research-the-best-strategy-for-paying-off-credit-card-debt"
---

## What This Calculator Does

Unlike most calculators on this site, the debt payoff calculator does not use a single formula. It runs a month-by-month simulation of two repayment strategies and shows which one is cheaper and faster.

Each month, the simulation:
1. Adds one month of interest to every open debt (balance × annual rate / 12)
2. Pays the minimum on each open debt
3. Spends the pool (the extra payment plus the minimums of debts already cleared) on the open debts in strategy order
4. Records a debt as cleared when its balance reaches zero, and rolls its minimum into the pool

## Snowball vs. Avalanche

**Debt Snowball (smallest balance first):** the pool goes to the debt with the smallest remaining balance. When that debt is cleared, its minimum joins the pool and goes to the next smallest. You see debts disappear sooner, which many people find motivating.

**Debt Avalanche (highest rate first):** the pool goes to the debt with the highest interest rate, whatever its balance. This costs the least interest, but it can feel slower when the highest-rate debt is also a large one.

Worked example with the calculator's defaults: a credit card of $6,500 at 22.99% (minimum $195), a personal loan of $3,500 at 11.5% (minimum $120) and a car loan of $12,000 at 6.5% (minimum $350), with $200 extra a month. The total payment is $865 every month ($665 of minimums plus $200).

| Strategy | Months to clear | Total interest | Order cleared |
|---|---|---|---|
| Avalanche | 30 | $3,105.52 | Credit card (month 20), personal loan (24), car loan (30) |
| Snowball | 30 | $3,509.39 | Personal loan (month 12), credit card (24), car loan (30) |

Both finish in month 30, and snowball costs $403.87 more in interest. With no extra payment, both take 42 months, with avalanche at $5,541.15 of interest and snowball at $5,550.11. Raising the extra payment from $200 to $400 cuts avalanche to 23 months and $2,269.26 of interest.

## How Each Variable Affects the Result

**Balances:** The total sets the baseline timeline. The mix matters too: many small debts favour snowball's quick wins, while one large high-rate debt makes avalanche clearly better.

**Interest Rates:** When rates are similar across your debts, snowball and avalanche end up close. For three debts of $5,000 at 20%, $3,000 at 22% and $1,000 at 18% with $200 extra, both take 23 months and the interest differs by $44.78 ($1,892.80 against $1,937.58). When rates vary widely, avalanche saves more. A $4,000 card at 24%, a $20,000 car loan at 5% and a $1,500 loan at 5% with $300 extra cost $2,182.53 under avalanche and $2,400.50 under snowball.

**Minimum Payments:** Higher minimums reduce balances faster but leave less room for the extra payment to matter. The minimums freed up from cleared debts drive both strategies.

**Extra Monthly Payment:** The most important input. At the defaults, $100 extra a month takes avalanche to 34 months, $200 to 30 months, and $400 to 23 months.

## The Rollover Effect

The mechanism behind both strategies is the rollover: when a debt is cleared, its minimum joins the pool. Each later debt is attacked with a larger monthly amount, and in the last stretch the whole monthly payment (the $865 in the example) is going to a single debt.

## When the Debt Is Never Cleared

The calculator separates three outcomes instead of printing a number that only looks like an answer:

- **Cleared:** every debt reaches zero within 600 months, and the totals are exact.
- **Never:** the debt provably never shrinks, because every open debt's monthly interest is at least the most you can pay towards it. A $10,000 card at 24% with a $150 minimum accrues $200 of interest a month, so a $150 payment never reduces it. The tool says so and shows no total, because the true total is unbounded.
- **Not cleared within 50 years:** the balances are still falling but have not reached zero after 600 months. This happens when a debt shrinks slowly enough that it only clears, and releases its minimum, decades later. The totals shown cover the first 50 years only and are labelled that way.

## Common Misconceptions

The big debate is snowball against avalanche. Mathematically, avalanche never costs more than snowball. But research on repayment behaviour suggests that concentrating payments on one account at a time helps people stay motivated, which matters because a strategy only works if you stick to it. A 2016 Harvard Business Review article by Remi Trudel (Boston University) discusses this research. The best strategy is the one you will keep following.

Another misconception: "I should invest my extra money instead of paying down debt." It depends on the interest rates. Paying off a 22% credit card is equivalent to a guaranteed 22% return, which no investment can promise. Paying extra on a 4% loan is closer, because long-run stock returns have been higher than that on average but not guaranteed.
