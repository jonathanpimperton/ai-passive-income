---
name: "Savings Goal Calculator"
slug: "savings-goal"
category: "saving-and-growth"
description: "Savings goal calculator: the monthly amount to reach a target by a date, or how long your own deposits take, with interest compounded monthly."
keywords:
  - "savings calculator"
  - "savings goal calculator"
  - "how much to save per month"
  - "savings goal planner"
  - "savings timeline"
relatedTools:
  - "emergency-fund"
  - "compound-interest"
  - "investment-return"
  - "retirement-savings"
  - "inflation"
  - "net-worth"
affiliateContext: "Reach your goal faster with a high-yield savings account"
affiliatePrograms:
  - "Wealthfront"
  - "Ally"
calculationMethod: "Compounds the balance monthly at the annual rate divided by 12 with deposits at month end, then solves for the deposit or the time"
faq:
  - question: "How much should I save each month?"
    answer: "The 50/30/20 rule, popularised by Elizabeth Warren and Amelia Warren Tyagi, suggests 20% of after-tax income for savings and extra debt repayment. The right amount for a goal depends on the target, the date and what you already have. The calculator works backward from your goal: for $50,000 in 5 years starting with $5,000, it needs {{ savingsMonthly(50000, 5000, 5, 60) | usd }} a month at a 5% rate, against {{ savingsMonthly(50000, 5000, 0, 60) | usd }} with no interest."
  - question: "How do I calculate how long it will take to save for a goal?"
    answer: "Divide the goal by your monthly saving, then allow for the interest earned along the way. The calculator does that and plots the timeline. For example, saving $500 a month from nothing at a 5% annual rate reaches $25,000 in {{ savingsMonths(25000, 0, 500, 5) | months }}."
  - question: "Should I save in a regular account or a high-yield savings account?"
    answer: "Rates differ a lot between accounts, so compare what you can actually get today. The size of the gap is easy to work out: on a $20,000 balance, a 4% rate earns {{ 20000 * 4 / 100 | usd }} in a year and a 0.5% rate earns {{ 20000 * 0.5 / 100 | usd }}. Set the calculator's rate to your own account's, and look for easy access and deposit protection as well as the rate."
  - question: "What is the best way to save for a down payment on a house?"
    answer: "Set a clear target, usually a percentage of the price plus closing costs; 20% of a $300,000 home is {{ 300000 * 20 / 100 | usd }}. Keep the money in a safe, easy-access account, and automate the transfer on payday. The calculator shows how long it takes from your monthly saving and the interest earned."
  - question: "How does interest affect my savings goal timeline?"
    answer: "Interest shortens the timeline most on long goals. Saving $1,000 a month toward $50,000 takes {{ 50000 / 1000 | int }} months with no interest. At a 5% annual rate it takes {{ savingsMonths(50000, 0, 1000, 5) | int }} months, so interest contributes {{ compoundEarned(0, 1000, 5, savingsMonths(50000, 0, 1000, 5) / 12, compounding=12) | usd }} and saves {{ 50000 / 1000 - savingsMonths(50000, 0, 1000, 5) | int }} months of saving."
workedExamples:
  - title: "Saving for a house down payment"
    inputs:
      goalAmount: 60000
      currentSavings: 8000
      monthlyContribution: 1200
      interestRate: 5
    description: "Saving {{ 300000 * 20 / 100 | usd }}, a 20% down payment on a $300,000 home. Starting with $8,000 and saving $1,200 a month at a 5% annual rate, the goal is reached in {{ savingsMonths(60000, 8000, 1200, 5) | months }}. Interest contributes {{ compoundEarned(8000, 1200, 5, savingsMonths(60000, 8000, 1200, 5) / 12, compounding=12) | usd }} of that."
  - title: "Emergency fund from scratch"
    inputs:
      goalAmount: 15000
      currentSavings: 0
      monthlyContribution: 500
      interestRate: 4.5
    description: "Building a $15,000 emergency fund from zero by saving $500 a month at a {{ 4.5 | pct(auto) }} annual rate takes {{ savingsMonths(15000, 0, 500, 4.5) | months }}. With no interest it would take {{ 15000 / 500 | int }} months; interest contributes {{ compoundEarned(0, 500, 4.5, savingsMonths(15000, 0, 500, 4.5) / 12, compounding=12) | usd }}."
  - title: "Vacation fund with a deadline"
    inputs:
      goalAmount: 5000
      currentSavings: 500
      timelineMonths: 12
      interestRate: 5
    description: "Planning a $5,000 vacation in 12 months with $500 already saved needs {{ savingsMonthly(5000, 500, 5, 12) | usd }} a month at a 5% annual rate. Interest contributes about {{ compoundEarned(500, savingsMonthly(5000, 500, 5, 12), 5, 1, compounding=12) | usd }}: small on a short timeline, but better than nothing in a spending account."
---

## Turn a vague goal into a monthly number

A savings goal calculator works from a target and either a date or a monthly amount. It has two modes. Give it a goal and a deadline and it returns the monthly saving needed. Give it a monthly saving and it returns how long the goal takes. In both, interest compounds monthly at the annual rate divided by 12, with each deposit made at the end of the month.

The most useful step is replacing "I want to save more" with a figure and a date. Once you have both, the arithmetic tells you what to do each month.

## What interest adds

<div class="stat-highlight">
  <span class="stat-number">{{ compoundEarned(0, 1000, 5, savingsMonths(50000, 0, 1000, 5) / 12, compounding=12) | usd }}</span>
  <span class="stat-text">of interest on a $50,000 goal reached by saving $1,000 a month at a 5% annual rate, which brings the goal {{ 50000 / 1000 - savingsMonths(50000, 0, 1000, 5) | int }} months earlier than saving the same amount with no interest.</span>
</div>

The more time the money has, the more interest matters. Saving $1,000 a month toward $50,000 takes {{ 50000 / 1000 | int }} months with no interest and {{ savingsMonths(50000, 0, 1000, 5) | int }} at 5%. On a goal under a year away, interest is a rounding error: the vacation example below earns {{ compoundEarned(500, savingsMonthly(5000, 500, 5, 12), 5, 1, compounding=12) | usd }}.

The rate in the calculator is an assumption you set. Use your own account's rate, and check it is a rate you are actually earning.

## Match the account to the timeline

| Time until you need the money | What suits it |
|---|---|
| Under 1 year | An easy-access savings account: safe and liquid. |
| 1 to 3 years | Easy-access savings or fixed-term deposits, depending on whether you might need the money early. |
| 3 to 5 years | Mostly savings, perhaps with a small allocation to lower-risk investments. |
| 5 years or more | A diversified investment account, only if you can sit through falls without selling. |

> **Tip:** do not put money you need within 2 to 3 years into shares. A fall in the year before you need a deposit is the case this avoids. Use the investment return calculator for long-horizon goals.

## The 50/30/20 rule

A simple budgeting rule, popularised by Elizabeth Warren and Amelia Warren Tyagi in *All Your Worth*, splits after-tax income three ways:

- **50%** needs: housing, food, insurance, minimum debt payments.
- **30%** wants: dining out, entertainment, subscriptions.
- **20%** savings and extra debt repayment.

On $4,500 a month after tax, 20% is {{ 4500 * 20 / 100 | usd }}. At a 5% annual rate that reaches $25,000 in {{ savingsMonths(25000, 0, 4500 * 20 / 100, 5) | months }}. Treat 20% as a starting point: raising the monthly figure is the fastest way to bring the date forward, and the calculator shows what each extra $100 does.

## When to use the calculator

- You have a dollar target and a date.
- You want the monthly saving that gets you there.
- You want to test scenarios: $200 more a month, or the deadline six months later.
- You are comparing account rates and want to see the difference in time.

## Mistakes that derail goals

1. **A target you cannot sustain.** Start with an amount you can keep up, then raise it with a pay rise or when a debt ends.
2. **Manual transfers.** They get skipped. Automate the transfer for payday.
3. **Saving in your spending account.** Money there gets spent. A separate account creates useful friction.
4. **Ignoring inflation on distant goals.** At 3% a year (an assumption), something that costs $50,000 today costs {{ inflationAdjust(50000, 3, 5) | usd }} in 5 years. Use the inflation calculator and aim for the future price.

## What to do next

Set the goal and the date, run the numbers, then set up an automatic transfer for the monthly amount. A plan that needs no willpower, because the money moves by itself, is the one that works.
