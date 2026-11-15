---
title: "How We Calculate: Car Finance Comparison"
slug: "car-finance"
toolSlug: "car-finance"
formula: "Monthly Payment = PV × r / (1 − (1+r)^−n) for HP/Loan; PCP: r × (PV − FV/(1+r)^n) / (1 − (1+r)^−n); True Cost = Total Paid + Opportunity Cost. Monthly rate r = (1 + APR)^(1/12) − 1 for GBP and EUR; APR / 12 for USD."
variables:
  - name: "Car Price"
    description: "On-the-road purchase price of the vehicle"
  - name: "Deposit"
    description: "Upfront payment or trade-in value, subtracted from the car price to give the finance amount. The calculator keeps at least 1,000 financed"
  - name: "Finance Amount (PV)"
    description: "Car price minus deposit: the amount being financed"
  - name: "Term (n)"
    description: "Number of monthly payments"
  - name: "APR"
    description: "Annual Percentage Rate. For GBP and EUR it is treated as an annual effective rate and converted to a monthly rate as (1 + APR)^(1/12) − 1. For USD it is treated as a nominal rate and divided by 12"
  - name: "Balloon / GMFV (FV)"
    description: "PCP only: the Guaranteed Minimum Future Value, the large final payment required to keep the car. Entered as a percentage of the price (default 40%, capped at 60% and at the finance amount)"
  - name: "Expected Investment Return"
    description: "Annual return rate used to calculate opportunity cost for all options: what your money could earn if not spent on the car. Default 4.5%"
assumptions:
  - "Fixed interest rate throughout the term (no variable or tracker rates)"
  - "Monthly payments are level (equal amount each month)"
  - "The monthly rate follows each region's APR convention: UK and EU APR is an annual effective rate (Consumer Credit (Total Charge for Credit) Regulations 2010), and US APR is the monthly rate times 12 (Regulation Z, Appendix J)"
  - "PCP balloon payment accrues interest throughout the term as part of the outstanding balance"
  - "No early repayment penalties or fees are modelled"
  - "No dealer administration fees, option-to-purchase fees, or documentation fees are included"
  - "Vehicle depreciation is not modelled: the calculator focuses on borrowing cost, not asset value"
  - "Opportunity cost uses closed-form compound growth: upfront payment × ((1+r)^n − 1) + monthly × (((1+r)^n − 1)/r − n), with r the monthly investment return (annual rate / 12)"
  - "All four options are compared over the same term for a fair comparison"
limitations:
  - "Does not account for PCP mileage limits and excess mileage charges"
  - "Does not model vehicle depreciation or residual value"
  - "Does not include GAP insurance, dealer fees, or extended warranty costs"
  - "Does not factor in the tax implications of different financing methods"
  - "The 'cheapest' comparison assumes you keep the car: PCP is cheaper if you return it (but you don't own the car)"
  - "Opportunity cost assumes a fixed annual return rate, ignoring market volatility"
  - "Does not model negative equity (owing more than the car is worth)"
  - "UK-specific: does not account for Voluntary Termination rights under the Consumer Credit Act 1974"
  - "PCP is a UK product. With USD selected the same maths runs with the US APR convention, but US balloon and lease structures differ"
dataSources:
  - name: "MoneySavingExpert: Personal Contract Purchase (PCP)"
    url: "https://www.moneysavingexpert.com/loans/personal-contract-purchase/"
  - name: "Bankrate: Average auto loan interest rates"
    url: "https://www.bankrate.com/loans/auto-loans/rates/"
  - name: "FCA: Our work on motor finance"
    url: "https://www.fca.org.uk/news/news-stories/our-work-motor-finance"
  - name: "legislation.gov.uk: Consumer Credit (Total Charge for Credit) Regulations 2010, Schedule (APR equation)"
    url: "https://www.legislation.gov.uk/uksi/2010/1011/schedule/made"
  - name: "CFPB: Regulation Z, 12 CFR 1026 Appendix J (APR computation)"
    url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/j/"
---

## What This Calculator Does

The car finance comparison calculator answers "Which way of paying for a car costs the least?" by calculating the monthly payment, total cost, total interest, and **true cost** for four ways of paying side by side: PCP, HP, personal loan, and cash.

**True Cost** = Total Paid + Opportunity Cost. Opportunity cost is the investment growth you give up by spending money earlier. Cash has the highest opportunity cost (all the money goes on day one), while PCP has the lowest (smaller monthly payments leave more cash invested for longer, and the balloon is deferred to the end).

Unlike single-purpose calculators, this tool compares all options with the same car price, deposit and term, so the only differences are the APRs, the PCP balloon percentage and the expected investment return.

## The Two Payment Formulas

### HP and Personal Loan (Standard Amortization)

HP and personal loans use the same formula, the standard amortizing loan:

**Monthly Payment = PV × r × (1+r)^n / ((1+r)^n − 1)**

Where PV = finance amount, r = monthly interest rate, n = number of months. The loan is fully repaid by the end, with no balloon.

### PCP (Balloon Payment Loan)

PCP uses a modified formula because a large balance (the balloon or GMFV) remains at the end:

**Monthly Payment = r × (PV − FV/(1+r)^n) / (1 − (1+r)^−n)**

Where FV = balloon amount. This produces lower monthly payments because you are not paying off the whole finance amount, but you pay interest on the full PV throughout the term, including the part that becomes the balloon.

When the APR is 0%, both formulas simplify to Monthly = (PV − FV) / n for PCP and Monthly = PV / n for HP and loans.

## How the Monthly Rate Is Set

The APR is an annual figure, and the calculator converts it to a monthly rate in the way each region defines it:

- **GBP and EUR:** the APR is an annual effective rate, so r = (1 + APR)^(1/12) − 1. This follows the UK APR equation (Consumer Credit (Total Charge for Credit) Regulations 2010, which discounts each payment by (1 + APR) to the power of the time in years) and the EU equivalent. At 7.9% APR, r is 0.6356% a month.
- **USD:** Regulation Z defines the APR as the periodic rate multiplied by the number of periods in a year, so r = APR / 12. At 7.9% APR, r is 0.6583% a month.

Using APR / 12 for a UK APR would slightly overstate the payment, by a few pounds a month on a typical agreement. In the worked example below, the PCP payment is £366.54 under the UK convention and £370.41 under the US one.

## How Each Variable Affects the Result

All the figures in this section use the worked example below (£25,000 car, £2,500 deposit, 48 months, GBP).

**Car price** scales everything proportionally. A £5,000 increase adds £116.19 a month to the personal loan payment and £123.37 to the HP payment.

**Deposit** reduces the finance amount directly. Another £1,000 of deposit saves £23.24 a month on the loan (£115 less interest) and £24.67 a month on HP (£184 less interest).

**Term length** has opposite effects on monthly payment and total cost. Extending the HP agreement from 36 to 60 months cuts the monthly payment from £710.86 to £462.23 (35% lower) but raises total interest from £3,091 to £5,234 (69% higher). Shorter terms cost more per month and far less overall.

**APR** is the key difference between finance types. The gap between PCP at 7.9% and a personal loan at 5.6% on £22,500 over 48 months is £2,496 in total interest (£5,094 against £2,598). Compare total interest, not just APR or monthly payment.

**Balloon percentage (PCP only)** sets how much of the car you are paying off. A higher balloon means lower monthly payments but a bigger lump sum at the end, and more interest overall because the outstanding balance stays higher throughout.

## Why True Cost Is What Matters

The monthly payment is what you feel in your budget. **True cost**, total payments plus opportunity cost, is what you give up for the car. Cash looks cheapest on total payments alone, but tying up all your capital on day one has a cost.

Worked example, UK convention: a £25,000 car, £2,500 deposit, 48 months, 4.5% expected return, PCP at 7.9% with a 40% balloon (£10,000), HP at 8.9%, personal loan at 5.6%.

| Option | Monthly | Total paid | Opportunity cost | True cost |
|---|---|---|---|---|
| Cash | none | £25,000 | £4,920 | £29,920 |
| Personal loan 5.6% | £522.87 | £27,598 | £2,837 | £30,434 |
| HP 8.9% | £555.19 | £29,149 | £2,981 | £32,130 |
| PCP 7.9% | £366.54 | £30,094 | £2,136 | £32,230 |

Cash wins here because the 4.5% expected return is below the loan APRs. If your expected return exceeds the APR, financing and investing the difference becomes cheaper on true cost. Adjust the return rate in the calculator to find the break-even point.

## How Opportunity Cost Is Calculated

Each payment you make could have been invested instead, and its opportunity cost depends on how long it had left to grow:

- **Upfront payment (deposit or cash):** grows for the full term, so it has the highest opportunity cost
- **Monthly payments:** earlier payments have more time to grow, so their opportunity cost shrinks over the term
- **Balloon payment (PCP):** paid at the very end, so it has zero opportunity cost

The closed-form formula avoids month-by-month loops:

**Opportunity Cost = Upfront × ((1+r)^n − 1) + Monthly × (((1+r)^n − 1)/r − n)**

Where r = monthly return rate (annual rate / 12) and n = total months.

This is why PCP, despite the highest total interest, can have the lowest opportunity cost: smaller monthly payments and a deferred balloon leave more of your money invested for longer.
