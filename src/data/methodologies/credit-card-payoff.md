---
title: "How We Calculate: Credit Card Payoff"
slug: "credit-card-payoff"
toolSlug: "credit-card-payoff"
formula: "Month-by-month simulation: interest = opening balance × APR / 12; payment = minimum + extra (capped at balance + interest); new balance = balance + interest − payment; repeat until zero or 600 months"
variables:
  - name: "Current Balance"
    description: "Outstanding credit card balance to be paid off"
  - name: "APR"
    description: "Annual percentage rate on the card, divided by 12 for the monthly rate and charged on the balance at the start of each month"
  - name: "Minimum Payment"
    description: "One of three modes: a fixed amount; a percentage of the balance with a floor (default 2%); or the month's interest plus a percentage of the balance with a floor (default 1%)"
  - name: "Floor"
    description: "The lowest the percentage-based minimum can fall: $25 with USD selected, £5 with GBP selected. It is not editable"
  - name: "Extra Monthly Payment"
    description: "Amount paid on top of the minimum every month, applied to the balance after that month's interest"
assumptions:
  - "Interest is charged monthly at APR / 12 on the balance at the start of the month"
  - "Fixed mode: the same minimum every month. Percentage mode: the larger of the percentage of the balance and the floor, so the payment falls as the balance falls. Interest-plus mode: the larger of (that month's interest + a percentage of the balance) and the floor, which always reduces the balance"
  - "Extra payments are added to the minimum and go to the balance after interest"
  - "The final payment is capped at what is owed"
  - "No new purchases or charges are added during payoff"
  - "No late fees, penalty APRs, or grace period effects"
  - "The APR stays constant throughout"
  - "The simulation runs for 600 months (50 years). A debt not cleared by then is reported as 'not cleared within 50 years', with totals for the 50 years only"
  - "The currency selector changes the symbol and the percentage-mode floor ($25 or £5) and nothing else"
limitations:
  - "Does not model introductory 0% APR periods or balance transfers"
  - "Does not model variable APRs (for example a rate tied to the prime rate)"
  - "Does not include cash back, rewards, or annual fees"
  - "Many issuers charge a daily rate on the average daily balance and add the interest once a month, which is close to this model. Issuers that compound daily charge more: on the default example the payoff would take 178 months instead of 167, with about 9% more interest"
  - "Percentage-based minimums are modelled in the three simple forms above, and some issuers use more complex formulas"
  - "Does not handle several cards: use the Debt Payoff calculator for multi-card strategies"
dataSources:
  - name: "Consumer Financial Protection Bureau: How does my credit card company calculate the amount of interest I owe?"
    url: "https://www.consumerfinance.gov/ask-cfpb/how-does-my-credit-card-company-calculate-the-amount-of-interest-i-owe-en-51/"
  - name: "FCA Handbook: CONC 6.7 (minimum payments on credit card accounts, UK)"
    url: "https://handbook.fca.org.uk/handbook/conc6/conc6s7"
  - name: "FDIC: Account Management and Loss Allowance Guidance (FFIEC, January 2003), minimum payments"
    url: "https://www.fdic.gov/news/financial-institution-letters/2003/FIL0302a.html"
  - name: "Federal Reserve: Consumer Credit (G.19)"
    url: "https://www.federalreserve.gov/releases/g19/current/"
---

## What This Calculator Does

The credit card payoff calculator simulates your payoff month by month, showing when the balance reaches zero and how much interest you pay in total. It also shows what paying extra does, which is almost always dramatic.

Unlike the Debt Payoff calculator (several debts, snowball and avalanche), this one looks at a single card and shows the "minimum payment trap" in concrete numbers.

## How the Simulation Works

Each month, the calculator:
1. Charges interest on the balance at the start of the month: balance × (APR / 12)
2. Works out the payment: the minimum plus any extra, or what is owed if that is less
3. Subtracts the payment from the balance plus interest
4. Repeats until the balance is zero or 600 months have passed

**Three minimum-payment modes.** Cards differ, so the calculator has three:
- **Fixed amount:** you enter the minimum, and it stays the same every month.
- **% of balance:** the larger of a percentage of the balance (default 2%) and a floor ($25, or £5 with GBP selected). The payment falls as the balance falls.
- **Interest + %:** the larger of that month's interest plus a percentage of the balance (default 1%) and the floor. UK rules require this structure (the FCA's CONC 6.7 requires a minimum of at least the interest, fees and charges plus 1% of the amount outstanding), it is common in the US, and US bank regulators expect minimums that pay the balance down over a reasonable time. It always reduces the balance.

## The Minimum Payment Trap, Explained

Credit card companies set minimums that maximise interest revenue. Take a $5,000 balance at 22.99% APR paid at a fixed $100 a month:
- Month 1: {{ 5000 * 22.99 / 100 / 12 | usd }} of the payment is interest and only $4 reaches the balance
- Month 12: interest is still $95
- Total: 13 years 11 months (167 payments) and $11,694 in interest, more than double the original balance

If instead the minimum is 2% of the balance (with a $25 floor), the payment starts at $100 and shrinks as the balance falls. After 50 years (600 months) the balance is still $3,017 and you have paid $45,140 in interest. Falling payments keep the debt alive.

If the payment is no more than the first month's interest, the balance never falls. At 22.99% on $5,000, interest is {{ 5000 * 22.99 / 100 / 12 | usd(2) }} in month 1, so a $95 payment never clears the card, and the calculator says so instead of showing a total. A $96 payment clears it, but in 324 months at $26,025 of interest.

## How Extra Payments Break the Cycle

Extra payments go to the balance once that month's interest is covered. This works in your favour:

1. A lower balance means less interest next month
2. Less interest means more of the next payment goes to the balance
3. More principal paid means a lower balance still

On the $5,000 example, paying $150 a month instead of $100 clears the card in 54 months (4 years 6 months) with $3,045 of interest. That saves $8,649 of interest and more than 9 years. A fixed payment of {{ loanPayment(5000, 22.99, 5) | usd(2) }} a month would clear the card in exactly 5 years.

## How Each Variable Affects the Result

All the figures below use the $5,000 example.

**Balance:** At a fixed $250 a month, $5,000 clears in 26 months with $1,366 of interest and $10,000 clears in 77 months with $9,153. Doubling the balance roughly triples the time and more than multiplies the interest by six.

**APR:** The most influential rate. At $150 a month, a card at 16.99% takes 46 months and costs $1,813 in interest, one at 22.99% takes 54 months and $3,045, and one at 29.99% takes 73 months and $5,878.

**Minimum Payment:** Higher fixed minimums speed payoff. Percentage minimums that shrink with the balance are what create the trap: they feel like payments but barely keep up with interest. With 2% of the balance plus $50 extra, the same $5,000 clears in 92 months with $4,546 of interest. In Interest + 1% mode, with no extra, it clears in 232 months with $8,489 of interest.

**Extra Payment:** The input you control most directly. The calculator shows the exact interest and time saved for any extra amount.

## How Interest Is Charged in Real Life

Most issuers charge interest daily: the APR divided by 365 (some use 360) is applied to the average daily balance over the billing cycle, and the interest is added once a month. That is close to what this calculator does. Some issuers compound daily, adding each day's interest to the next day's balance. For the default example that would raise the payoff from 167 to 178 months and interest from $11,694 to $12,787, about 9% more. Your statement and cardholder agreement give the exact method for your card.
