---
title: "How We Calculate: Car Finance Comparison"
slug: "car-finance"
toolSlug: "car-finance"
formula: "Monthly Payment = P × r(1+r)^n / ((1+r)^n − 1) for HP/Loan; PCP: r × (PV − FV/(1+r)^n) / (1 − (1+r)^−n)"
variables:
  - name: "Car Price"
    description: "On-the-road purchase price of the vehicle"
  - name: "Deposit"
    description: "Upfront payment or trade-in value, subtracted from car price to give the finance amount"
  - name: "Finance Amount (PV)"
    description: "Car price minus deposit — the amount being financed"
  - name: "Term (n)"
    description: "Number of monthly payments, typically 24–60 months"
  - name: "APR (r)"
    description: "Annual Percentage Rate, converted to monthly rate (APR/12) for the payment formula"
  - name: "Balloon / GMFV (FV)"
    description: "PCP only: the Guaranteed Minimum Future Value — the large final payment required to keep the car"
  - name: "Savings Return Rate"
    description: "Cash only: expected annual return if the car price were invested instead of spent"
assumptions:
  - "Fixed interest rate throughout the term (no variable or tracker rates)"
  - "Monthly payments are level (equal amount each month)"
  - "PCP balloon payment accrues interest throughout the term as part of the outstanding balance"
  - "No early repayment penalties or fees are modelled"
  - "No dealer administration fees, option-to-purchase fees, or documentation fees are included"
  - "Vehicle depreciation is not modelled — the calculator focuses on borrowing cost, not asset value"
  - "Cash opportunity cost uses compound annual growth rate, not month-by-month returns"
  - "All four options are compared over the same term for a fair comparison"
limitations:
  - "Does not account for PCP mileage limits and excess mileage charges"
  - "Does not model vehicle depreciation or residual value"
  - "Does not include GAP insurance, dealer fees, or extended warranty costs"
  - "Does not factor in the tax implications of different financing methods"
  - "The 'cheapest' comparison assumes you keep the car — PCP is cheaper if you return it (but you don't own the car)"
  - "Cash opportunity cost assumes a fixed annual return rate, ignoring market volatility"
  - "Does not model negative equity scenarios (owing more than the car is worth)"
  - "UK-specific: does not account for Voluntary Termination rights under the Consumer Credit Act 1974"
dataSources:
  - name: "MoneySavingExpert — PCP Deals"
    url: "https://www.moneysavingexpert.com/loans/personal-contract-purchase/"
  - name: "Bankrate — Average Auto Loan Interest Rates"
    url: "https://www.bankrate.com/loans/auto-loans/rates/"
  - name: "FCA — Motor Finance Data"
    url: "https://www.fca.org.uk/data/motor-finance-data"
---

## What This Calculator Does

The car finance comparison calculator answers "Which way of paying for a car costs the least?" by calculating the monthly payment, total cost, and total interest for four financing methods side by side: PCP, HP, Personal Loan, and Cash.

Unlike single-type calculators, this tool lets you compare all options simultaneously with the same car price, deposit, and term — so the only variables are the APRs and PCP balloon percentage.

## The Two Payment Formulas

### HP and Personal Loan (Standard Amortization)

Both HP and personal loans use the same formula — the standard amortizing loan:

**Monthly Payment = PV × r × (1+r)^n / ((1+r)^n − 1)**

Where PV = finance amount, r = monthly interest rate (APR/12), n = number of months. The loan is fully repaid by the end — no balloon or residual.

### PCP (Balloon Payment Loan)

PCP uses a modified formula because a large balance (the balloon/GMFV) remains at the end:

**Monthly Payment = r × (PV − FV/(1+r)^n) / (1 − (1+r)^−n)**

Where FV = balloon amount. This produces lower monthly payments because you're not paying off the full finance amount. But you're paying interest on the full PV throughout the term, including the portion that becomes the balloon.

When APR is 0%, both formulas simplify to: Monthly = (PV − FV) / n for PCP, and Monthly = PV / n for HP/Loan.

## How Each Variable Affects the Result

**Car price** scales everything proportionally. A £5,000 increase adds roughly £100–£120 to the monthly HP/Loan payment on a 48-month term at typical rates.

**Deposit** reduces the finance amount directly. Every £1,000 extra deposit saves roughly £20–£25/month on a 48-month term and reduces total interest by £100–£200.

**Term length** has opposite effects on monthly payment and total cost. Extending from 36 to 60 months drops the monthly payment by ~35% but increases total interest by ~60%. Shorter terms cost more per month but much less overall.

**APR** is the key differentiator between finance types. The gap between PCP (7.9%) and a personal loan (5.6%) on £22,500 over 48 months is £1,600+ in total interest. Always compare total interest, not just APR or monthly payment.

**Balloon percentage (PCP only)** determines how much of the car you're actually paying off. A higher balloon means lower monthly payments but a bigger lump sum at the end — and more interest overall because the outstanding balance stays higher throughout.

## Why Total Cost Is What Matters

Monthly payment is what you feel in your budget each month. But total cost is what you actually pay for the car. PCP deliberately minimises the monthly payment by deferring a large portion of the cost to the balloon — but the interest on that deferred amount still accrues.

Example on a £25,000 car (£2,500 deposit, 48 months):
- PCP at 7.9%: £370/mo, but £30,265 total (if keeping)
- Personal Loan at 5.6%: £524/mo, but £27,641 total

The personal loan costs £154/mo more but saves £2,624 over the term. That's £55/month in real savings — the PCP buyer pays more for the convenience of lower monthly payments.
