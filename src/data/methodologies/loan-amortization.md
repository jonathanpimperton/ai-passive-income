---
title: "How We Calculate: Loan Amortization"
slug: "loan-amortization"
toolSlug: "loan-amortization"
formula: "M = P × [r(1+r)^n] / [(1+r)^n - 1]"
variables:
  - name: "M"
    description: "Fixed monthly payment amount"
  - name: "P"
    description: "Principal — the total loan amount borrowed"
  - name: "r"
    description: "Monthly interest rate (annual rate divided by 12)"
  - name: "n"
    description: "Total number of monthly payments (loan term in years × 12)"
assumptions:
  - "The interest rate is fixed for the entire loan term"
  - "Payments are made monthly on schedule"
  - "No prepayment penalties apply"
  - "The loan is fully amortizing — the balance reaches zero at the end of the term"
  - "Extra payments (if specified) are applied directly to principal each month"
limitations:
  - "Does not model adjustable-rate loans (ARM) where the rate changes over time"
  - "Does not include origination fees, closing costs, or other upfront charges"
  - "Does not account for payment rounding — real lenders round to the nearest cent, which can shift the final payment slightly"
  - "Extra payment savings assume the extra amount is applied every single month without fail"
  - "Does not model biweekly payment strategies"
dataSources:
  - name: "Consumer Financial Protection Bureau — Mortgage Math"
    url: "https://www.consumerfinance.gov/owning-a-home/"
  - name: "Investopedia — Amortization"
    url: "https://www.investopedia.com/terms/a/amortization.asp"
---

## What This Formula Does

The loan amortization formula calculates the fixed monthly payment required to fully repay a loan over a set number of months. "Amortization" means spreading the repayment across equal installments that each cover both interest and principal.

The formula works because each month, interest is charged on the remaining balance. In early months, most of your payment goes toward interest. As the balance shrinks, the interest portion decreases and the principal portion increases. By the final month, nearly the entire payment is principal.

When the annual rate is zero (an interest-free loan), the calculator simply divides the principal by the number of months: `M = P / n`.

## How Each Variable Affects the Result

**Principal (P):** Directly proportional to the payment. Borrowing twice as much means paying roughly twice as much each month, all else being equal.

**Interest Rate (r):** Even small rate differences add up over long terms. On a $300,000, 30-year loan, the difference between 6.0% and 6.5% is about $95/month — that's $34,200 over the life of the loan.

**Term Length (n):** Longer terms reduce monthly payments but dramatically increase total interest paid. A 30-year mortgage typically costs 2-3× more in total interest than a 15-year mortgage for the same principal and rate.

## The Amortization Schedule

Beyond the monthly payment, the calculator generates a full schedule showing how each payment splits between principal and interest. The schedule is grouped by year with expandable monthly detail. Key columns:

- **Principal paid:** The portion reducing your loan balance
- **Interest paid:** The cost of borrowing for that period
- **Remaining balance:** What you still owe

In year 1 of a typical 30-year mortgage, roughly 70-80% of each payment goes to interest. By year 25, that ratio inverts.

## Extra Payments

The advanced settings include an extra monthly payment option. Adding even a small amount each month directly reduces principal, which means less interest accrues in every subsequent month. The calculator shows exactly how many months you'll shave off the loan and how much interest you'll save.

For example, on a $300,000 loan at 6.5% for 30 years, paying an extra $200/month saves approximately $95,000 in interest and pays off the loan about 7 years early.

## Common Misconceptions

People often assume that because the monthly payment is fixed, the interest cost is evenly distributed. It is not. The interest is heavily front-loaded. If you sell a house or refinance after 5 years on a 30-year mortgage, you've paid mostly interest and barely reduced the principal.

Another misconception: "I can't afford extra payments." Even $50 extra per month makes a measurable difference over a long-term loan. The calculator makes this visible.

## Why This Calculator Exists

Anyone borrowing money — whether for a home, car, student loans, or personal loan — needs to understand what their payments will be and how much of that money goes to interest versus actually paying down the debt. This calculator turns the abstract into concrete month-by-month numbers.
