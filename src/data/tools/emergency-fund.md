---
name: "Emergency Fund Calculator"
slug: "emergency-fund"
category: "income-and-planning"
description: "Emergency fund calculator: your 3, 6 and 12 month targets from your monthly expenses, and how long each takes at your savings rate."
keywords:
  - "emergency fund calculator"
  - "how much emergency fund"
  - "3 month emergency fund"
  - "emergency savings"
relatedTools:
  - "savings-goal"
  - "debt-payoff"
  - "credit-card-payoff"
  - "net-worth"
  - "compound-interest"
affiliateContext: "Start building your safety net with a high-yield savings account"
affiliatePrograms:
  - "Betterment"
  - "Ally"
  - "Wealthfront"
calculationMethod: "Adds up essential monthly expenses for 3, 6 and 12 month targets, then counts the months to each at your deposits and savings rate"
faq:
  - question: "How much should I have in my emergency fund?"
    answer: "The usual guideline is 3 to 6 months of essential expenses. If your job is stable and your income predictable, 3 months may be enough. If you are self-employed, have variable income or are the only earner, aim for 6 to 12 months. Essential expenses are housing, food, utilities, insurance, transport and minimum debt payments, not discretionary spending. At $3,500 a month those targets are {{ 3500 * 3 | usd }}, {{ 3500 * 6 | usd }} and {{ 3500 * 12 | usd }}."
  - question: "Where should I keep my emergency fund?"
    answer: "In a savings account that is separate from your spending account. It needs to be accessible within a day or two but not so easy to reach that you spend it. Avoid investing it in shares: a market fall can arrive at the same time as a job loss. Savings rates vary by bank and move with central bank rates, so compare current offers. The calculator lets you set the rate, starting at 4%, and counts interest on the savings you already hold as well as on each deposit."
  - question: "Should I build an emergency fund before paying off debt?"
    answer: "Start with a small cushion, often $1,000 to $2,000, so a surprise bill does not go back on a card. Then put extra money on high-interest debt, and build the full fund once that debt is gone. Without any cushion, an unexpected expense pushes you back into debt and undoes your progress. The debt payoff calculator shows how long the debt takes."
  - question: "What counts as an emergency?"
    answer: "Job loss, major medical bills, essential car or home repairs and unexpected family needs. Not emergencies: holidays, gifts, a sale on a TV, or routine car maintenance, which is a planned expense. The clearer your definition, the less likely you are to dip into the fund for something else."
  - question: "How long does it take to build an emergency fund?"
    answer: "It depends on your target and your monthly deposit. Starting from nothing at a 4% savings rate, a $15,000 fund (6 months of $2,500) takes {{ emergencyMonths(15000, 0, 500, 4) | months }} at $500 a month and {{ emergencyMonths(15000, 0, 300, 4) | months }} at $300 a month. The calculator works out your own timeline for the 3, 6 and 12 month targets."
workedExamples:
  - title: "Single professional, moderate expenses"
    inputs:
      monthlyExpenses: 3500
      currentSavings: 2000
      monthlySavingsCapacity: 600
      savingsRate: 4
    description: "At $3,500 a month in essential expenses the targets are {{ 3500 * 3 | usd }} for 3 months, {{ 3500 * 6 | usd }} for 6 months and {{ 3500 * 12 | usd }} for 12 months. Starting with $2,000 and saving $600 a month at a 4% savings rate, the 3-month target takes {{ emergencyMonths(10500, 2000, 600, 4) | months }} and the 6-month target {{ emergencyMonths(21000, 2000, 600, 4) | months }}. Interest adds about {{ compoundEarned(2000, 600, 4, emergencyMonths(10500, 2000, 600, 4) / 12, compounding=annually) | usd }} by the time the 3-month target is reached."
  - title: "Family of four with a single income"
    inputs:
      monthlyExpenses: 5800
      currentSavings: 500
      monthlySavingsCapacity: 400
      savingsRate: 4
    description: "A family with $5,800 a month in essential expenses (mortgage, food, insurance, utilities, minimum payments) on one income should aim for 6 to 12 months: {{ 5800 * 6 | usd }} to {{ 5800 * 12 | usd }}. Starting with $500 and saving $400 a month at 4%, the 6-month target takes {{ emergencyMonths(34800, 500, 400, 4) | months }} and the 12-month target {{ emergencyMonths(69600, 500, 400, 4) | months }}. That is a long road: cutting expenses for a while, or raising the monthly deposit, shortens it quickly."
  - title: "Freelancer needing a larger cushion"
    inputs:
      monthlyExpenses: 4200
      currentSavings: 8000
      monthlySavingsCapacity: 800
      savingsRate: 4
    description: "A freelancer with variable income targets 9 months at $4,200 a month: {{ 4200 * 9 | usd }}. With $8,000 saved and $800 a month at a 4% rate, they reach it in {{ emergencyMonths(37800, 8000, 800, 4) | months }}, of which about {{ compoundEarned(8000, 800, 4, emergencyMonths(37800, 8000, 800, 4) / 12, compounding=annually) | usd }} is interest."
---

## A cushion between you and the credit card

An emergency fund is money set aside for shocks such as job loss, medical bills, a car breakdown or an urgent home repair. It decides whether a surprise bill is paid from savings or from a credit card, and a card balance can cost far more than the bill (see the credit card payoff calculator).

With the calculator's starting expenses of $3,500 a month, a 6-month target is {{ 3500 * 6 | usd }}. Starting from $2,000 and saving $500 a month at 4%, it takes {{ emergencyMonths(21000, 2000, 500, 4) | months }} to get there. That timeline, more than the target itself, is what to plan around.

## How much you need

The usual guideline is 3 to 6 months of essential expenses: the minimum you must cover if income stopped, not dining out or subscriptions. The right target depends on your situation:

| Months of expenses | Fits | Why |
| --- | --- | --- |
| **3 months** | Two-earner household, stable jobs, good insurance, little debt | A second income is a built-in cushion |
| **6 months** | Single earner, children, moderate job risk | Longer job searches and higher stakes |
| **9 to 12 months** | Self-employed, freelance or variable income, volatile industry | Income gaps are unpredictable and can last months |

These are guidelines. Any amount beats none: even $1,000 covers many car repairs and medical co-pays.

## Where to keep it

Your fund should be liquid (reachable in a day or two, not locked in a CD or investment account), safe from market falls, and separate from your spending account, ideally at a different bank. An easy-access savings account meets all three and pays interest while it waits. Rates change, so look up current offers; the calculator starts at 4% and lets you change it. At that rate a $15,000 fund earns about {{ 15000 * 4 / 100 | usd }} in a year.

> **Tip:** keep the fund at a different bank from your current account. The extra day it takes to transfer is enough friction to stop impulse spending, while the money stays reachable for a real emergency.

## Building it step by step

1. **Start small.** If you have nothing saved, aim for $1,000 first. At $100 a month that is {{ emergencyMonths(1000, 0, 100, 4) | months }}.
2. **Automate.** Move money to savings on payday, before you can spend it.
3. **Handle expensive debt first, with a cushion in place.** Keep a small fund while you clear high-interest debt, or an unexpected bill puts you back in it.
4. **Refill after use.** If you spend from it, make restoring it your first financial priority.

> **Example:** saving $200 per paycheck, 26 paychecks a year, is {{ 200 * 26 | usd }} a year, about {{ 200 * 26 / 12 | usd }} a month. At 4% that grows to about {{ compoundFV(0, 200 * 26 / 12, 4, 1, compounding=annually) | usd }} after a year and {{ compoundFV(0, 200 * 26 / 12, 4, 2, compounding=annually) | usd }} after two, just over a 3-month fund at $3,500 a month ({{ 3500 * 3 | usd }}).

## What counts as an emergency

Emergencies: job loss, medical or dental emergencies, essential car or home repairs, urgent family needs, insurance deductibles after an accident. Not emergencies: holidays, gifts, electronics sales, routine car maintenance (plan for that separately), or wanted-but-not-needed purchases.

If you have to ask whether something is an emergency, it probably is not. A separate sinking fund for predictable irregular costs, such as car maintenance, gifts and annual subscriptions, keeps your emergency fund for real emergencies.

## Using the calculator

Enter your monthly essentials by category, what you have already saved, what you can add each month and your savings rate. The calculator shows the 3, 6 and 12 month targets, how many months each takes, and the balance month by month. If you are starting from zero, set a first goal of $1,000 and an automatic transfer today: even $50 every two weeks is {{ 50 * 26 | usd }} a year.
