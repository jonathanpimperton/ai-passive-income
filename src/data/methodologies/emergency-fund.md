---
title: "How We Calculate: Emergency Fund"
slug: "emergency-fund"
toolSlug: "emergency-fund"
formula: "Target = Monthly Essential Expenses × Months of Coverage; i = (1 + AER)^(1/12) − 1; balance after n months B(n) = PV(1 + i)^n + PMT × ((1 + i)^n − 1) / i; time to target = first whole month with B(n) ≥ Target"
variables:
  - name: "Monthly Essential Expenses"
    description: "Sum of housing, food, transportation, utilities, insurance, debt payments, and other necessary monthly costs"
  - name: "Months of Coverage"
    description: "How many months of expenses your fund should cover (3, 6, and 12 months are shown at the same time)"
  - name: "Current Savings (PV)"
    description: "Amount already saved toward your emergency fund. It earns interest like every new deposit"
  - name: "Monthly Saving (PMT)"
    description: "How much you save toward the fund each month, at the end of the month"
  - name: "Savings Rate (AER)"
    description: "Annual equivalent rate (AER in the UK, APY in the US) on your savings account, as the bank quotes it. The default is 4%"
  - name: "i"
    description: "The monthly rate equivalent to the AER: (1 + AER)^(1/12) − 1. Because the AER already includes monthly compounding, $1,000 left for 12 months at a 4% AER grows to exactly $1,040"
assumptions:
  - "Monthly expenses stay constant over the savings period"
  - "Monthly savings contributions are consistent"
  - "The savings rate is an AER/APY and stays fixed"
  - "Interest is earned on your current savings and on every deposit, and compounds monthly at the equivalent monthly rate"
  - "No withdrawals from the fund during the savings period"
  - "Three coverage targets are calculated at the same time: 3, 6 and 12 months"
  - "The currency selector changes the symbol only: there is no exchange-rate conversion and no regional rule"
limitations:
  - "Does not account for expense inflation: costs typically rise over time"
  - "Does not model irregular expenses (car repair, medical bills) that might require the fund during the savings period"
  - "Does not distinguish between discretionary and non-discretionary expenses within each category"
  - "Savings account rates change often, so the rate you enter today may not last"
  - "Does not calculate the opportunity cost of holding cash instead of investing"
  - "Does not model the tax on interest earned on savings"
  - "The time search stops at 50 years, then reports that the target is not reached"
dataSources:
  - name: "Consumer Financial Protection Bureau: An essential guide to building an emergency fund"
    url: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/"
  - name: "Federal Reserve: Economic Well-Being of U.S. Households (SHED)"
    url: "https://www.federalreserve.gov/consumerscommunities/shed.htm"
  - name: "FDIC: National rates and rate caps (savings account averages)"
    url: "https://www.fdic.gov/national-rates-and-rate-caps"
---

## What This Calculator Does

The emergency fund calculator works out two things: how large your emergency fund should be, and how long it will take to build. It adds up your monthly essential expenses by category, multiplies by the number of months of cover you want, and then works out a savings timeline from your current balance and monthly saving.

It shows three targets at once: 3, 6 and 12 months of expenses, so you can see both a minimum cushion and a more cautious goal.

## How the Target Is Calculated

The target is your total monthly essential expenses times the number of months. With the calculator's default expenses of $3,500 a month, the targets are:

- **3 months:** {{ 3500 * 3 | usd }}
- **6 months:** {{ 3500 * 6 | usd }}
- **12 months:** {{ 3500 * 12 | usd }}

## How the Timeline Is Calculated

The savings rate you enter is treated as an AER or APY: the annual rate a bank quotes with compounding already included. The calculator converts it to a monthly rate with `i = (1 + AER)^(1/12) − 1`. Each month it then grows the balance by `i` and adds your monthly saving, and it reports the first whole month in which the balance reaches the target. Interest is earned on the savings you already hold, not only on new deposits.

If your current savings already meet the target, the timeline is zero. If you save nothing and your balance earns no interest, the target is never reached and the tool says so. If you save nothing but your existing balance earns interest, interest alone can get there (the tool marks this case).

With the defaults ($2,000 saved, $500 a month, 4% AER), the 3-month target takes 17 months, the 6-month target 36 months and the 12-month target 71 months. At a 0% rate the same plan takes 17, 38 and 80 months, so interest saves 0, 2 and 9 months. The FDIC's national average savings rate was 0.38% in its release of 19 October 2026, and at that rate the 12-month target takes 79 months, so the rate you actually earn matters.

## What Counts as Essential Expenses

The calculator splits expenses into seven categories:

**Housing:** Rent or mortgage payment, property tax, renters or homeowners insurance.

**Food:** Groceries and essential food costs. Leave out restaurants and delivery, which you would cut in an emergency.

**Transportation:** Car payment, fuel, insurance, public transit passes. Include only what you need to get to work.

**Utilities:** Electricity, gas, water, internet, phone. Include services you cannot cut in a crisis.

**Insurance:** Health, life and disability insurance premiums: policies that must continue even if your income stops.

**Debt Payments:** Minimum required payments on all debts. You must keep paying these during an emergency.

**Other:** Medications, childcare, pet care, or any other non-negotiable expense.

## How Much Emergency Fund Do You Need?

Common guidance is three to six months of essential expenses, and the right amount depends on your situation:

- **3 months:** may be enough for dual-income households with stable employment, low debt and good health cover.
- **6 months:** a common choice for most people. It is meant to cover a typical job search.
- **12 months:** suits single-income households, the self-employed, people with variable income (commission, freelance), and those in specialised fields where a job search takes longer.

## Common Misconceptions

Many people include discretionary spending in their emergency fund calculation. The fund does not need to sustain your normal lifestyle, only a survival budget. Taking out dining out, entertainment, subscriptions and travel lowers the target, sometimes by a lot.

Another mistake is investing the emergency fund in stocks or other volatile assets. The point of an emergency fund is that the money is there when you need it, without the risk of being down 20% on the day you lose your job. Savings accounts and money market funds are appropriate. Brokerage accounts are not.

## Why an Emergency Fund Matters

The Federal Reserve's Economic Well-Being of U.S. Households in 2025 report (survey run in October 2025, published 13 May 2026) found that 63% of adults would cover a $400 emergency expense entirely with cash, savings or a credit card paid off at the next statement. The other 37% would pay another way or could not pay. An emergency fund stops a temporary setback from becoming a debt spiral.
