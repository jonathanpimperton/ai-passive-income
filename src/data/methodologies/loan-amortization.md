---
title: "How We Calculate: Loan Amortization"
slug: "loan-amortization"
toolSlug: "loan-amortization"
formula: "M = P × [r(1+r)^n] / [(1+r)^n - 1]"
variables:
  - name: "M"
    description: "Fixed monthly payment amount"
  - name: "P"
    description: "Principal: the total loan amount borrowed"
  - name: "r"
    description: "Monthly interest rate (annual rate divided by 12)"
  - name: "n"
    description: "Total number of monthly payments (loan term in years × 12; the term slider runs from 1 to 50 years)"
assumptions:
  - "The interest rate is fixed for the entire loan term and compounds monthly (annual rate / 12)"
  - "Payments are made monthly on schedule"
  - "No prepayment penalties apply"
  - "The loan is fully amortizing: the balance reaches zero at the end of the term"
  - "Extra payments (if specified) are applied directly to principal every month, and the last payment is capped at the balance remaining"
  - "The starting interest rate is a published mortgage benchmark for the region of the selected currency (USD, GBP or EUR); it is a starting point, not a quote, and typing your own rate replaces it"
limitations:
  - "Does not model adjustable-rate loans (ARM) where the rate changes over time"
  - "Does not include origination fees, closing costs, or other upfront charges"
  - "Does not account for payment rounding: real lenders round to the nearest cent, which can shift the final payment slightly"
  - "Extra payment savings assume the extra amount is applied every single month without fail"
  - "Does not model biweekly payment strategies"
  - "The benchmark default rate is a mortgage rate, so replace it with your own quote for a car loan, personal loan or student loan"
dataSources:
  - name: "Consumer Financial Protection Bureau: What is amortization?"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/"
  - name: "Investopedia: Amortization"
    url: "https://www.investopedia.com/terms/a/amortization.asp"
---

## What This Formula Does

The loan amortization formula calculates the fixed monthly payment required to fully repay a loan over a set number of months. "Amortization" means spreading the repayment across equal instalments that each cover both interest and principal.

The formula works because each month, interest is charged on the remaining balance. In early months, most of your payment goes toward interest. As the balance shrinks, the interest portion decreases and the principal portion increases. By the final month, nearly the entire payment is principal.

When the annual rate is zero (an interest-free loan), the calculator divides the principal by the number of months: `M = P / n`.

The same engine runs the mortgage payment calculator, so the principal-and-interest figure is identical in the two tools for the same loan.

## How Each Variable Affects the Result

**Principal (P):** Directly proportional to the payment. Borrowing twice as much means paying twice as much each month, all else being equal.

**Interest Rate (r):** Small rate differences add up over long terms. On a $300,000, 30-year loan, 6.5% instead of 6.0% costs {{ loanPayment(300000, 6.5, 30) - loanPayment(300000, 6, 30) | usd }} more a month ({{ loanPayment(300000, 6.5, 30) | usd(2) }} against {{ loanPayment(300000, 6, 30) | usd(2) }}), which is {{ loanTotalInterest(300000, 6.5, 30) - loanTotalInterest(300000, 6, 30) | usd }} more interest over the life of the loan.

**Term Length (n):** Longer terms reduce monthly payments but raise total interest. On $300,000 at 6.5%, a 30-year loan costs {{ loanTotalInterest(300000, 6.5, 30) | usd }} in interest and a 15-year loan costs {{ loanTotalInterest(300000, 6.5, 15) | usd }}, so the 30-year loan costs {{ loanTotalInterest(300000, 6.5, 30) / loanTotalInterest(300000, 6.5, 15) | num(1) }} times as much in interest.

## The Amortization Schedule

Beyond the monthly payment, the calculator generates a full schedule showing how each payment splits between principal and interest. The schedule is grouped by year with expandable monthly detail. Key columns:

- **Principal paid:** The portion reducing your loan balance
- **Interest paid:** The cost of borrowing for that period
- **Remaining balance:** What you still owe

In year 1 of the $300,000, 6.5%, 30-year loan, {{ loanYear(300000, 6.5, 30, 1).interest / (loanPayment(300000, 6.5, 30) * 12) * 100 | pct }} of what you pay goes to interest. By year 25 that share has fallen to {{ loanYear(300000, 6.5, 30, 25).interest / (loanPayment(300000, 6.5, 30) * 12) * 100 | pct }}. The share depends on the rate and term, so run your own numbers.

## Extra Payments

The advanced settings include an extra monthly payment option. Adding a small amount each month reduces principal directly, which means less interest accrues in every later month. The calculator shows how many months you shave off the loan and how much interest you save.

For example, on a $300,000 loan at 6.5% for 30 years, paying an extra $200 a month saves {{ overpaymentSaving(300000, 6.5, 30, monthly=200).interestSaved | usd }} in interest and pays the loan off {{ overpaymentSaving(300000, 6.5, 30, monthly=200).monthsSaved | months }} early.

## Common Misconceptions

People often assume that because the monthly payment is fixed, the interest cost is evenly spread. It is not: interest is front-loaded. On the $300,000 loan above, after 5 years of payments you have paid {{ loanPayment(300000, 6.5, 30) * 60 - (300000 - loanBalance(300000, 6.5, 30, 60)) | usd }} in interest and cut the balance by only {{ 300000 - loanBalance(300000, 6.5, 30, 60) | usd }}. If you sell or refinance at that point, most of what you paid was interest.

Another misconception: "I can't afford extra payments." Even $50 extra per month makes a measurable difference over a long-term loan, and the calculator makes the effect visible.

## UK and Euro-Area Rates

The currency selector changes only the starting interest rate and the currency symbol. It does not change the formula, and there is no exchange-rate conversion. For USD the default is the Freddie Mac PMMS average (15-year for terms of 15 years or less, otherwise 30-year). For GBP it is the Bank of England's average quoted 2-year fixed rate at 75% loan-to-value. For EUR it is the ECB's composite cost of borrowing for house purchase. The source and date appear beside the rate input.
