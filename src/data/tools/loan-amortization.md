---
name: "Loan Amortization Calculator"
slug: "loan-amortization"
category: "debt-and-loans"
description: "See your monthly payment, total interest, and a full payment schedule for any fixed-rate loan."
keywords:
  - "loan amortization calculator"
  - "amortization schedule calculator"
  - "loan payment calculator"
  - "mortgage amortization schedule"
  - "amortization table"
relatedTools:
  - "compound-interest"
  - "debt-payoff"
  - "rent-vs-buy"
  - "savings-goal"
  - "roi"
affiliateContext: "Compare rates and save thousands on your loan"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
calculationMethod: "Uses standard amortization formula: M = P[r(1+r)^n]/[(1+r)^n-1]"
faq:
  - question: "What is loan amortization?"
    answer: "Loan amortization is the process of paying off a loan through regular, scheduled payments over time. Each payment is split between principal (reducing what you owe) and interest (the cost of borrowing). Early payments are mostly interest; later payments are mostly principal."
  - question: "How is a monthly loan payment calculated?"
    answer: "Monthly payments use the formula M = P[r(1+r)^n] / [(1+r)^n - 1], where P is the loan principal, r is the monthly interest rate (annual rate / 12), and n is the total number of payments. This formula ensures equal payments that fully pay off the loan by the end of the term."
  - question: "How much interest will I pay over the life of a loan?"
    answer: "Total interest depends on your loan amount, interest rate, and term length. For example, a $300,000 mortgage at 7% over 30 years costs about $418,527 in total interest — more than the original loan amount. Shorter terms and extra payments dramatically reduce total interest."
  - question: "What happens if I make extra payments on my loan?"
    answer: "Extra payments go directly toward reducing your principal balance, which means less interest accrues in future months. Even small extra payments can save thousands in interest and shave years off your loan. Our calculator shows exactly how much you'd save."
  - question: "What is the difference between amortization and simple interest?"
    answer: "With amortization, each payment covers both interest and principal, and the interest portion decreases over time as the balance shrinks. Simple interest loans charge interest only on the remaining balance without a fixed payoff schedule. Most mortgages and auto loans use amortization."
workedExamples:
  - title: "30-year fixed mortgage"
    inputs:
      loanAmount: 300000
      interestRate: 7
      loanTerm: 30
    description: "A $300,000 mortgage at 7% fixed for 30 years results in a monthly payment of $1,996. Over the life of the loan, you'd pay $418,527 in interest — totaling $718,527. In the first year, only about $3,456 goes toward principal while $20,496 goes to interest."
  - title: "5-year auto loan"
    inputs:
      loanAmount: 35000
      interestRate: 6.5
      loanTerm: 5
    description: "A $35,000 car loan at 6.5% over 5 years means a monthly payment of $685. Total interest paid: $6,100. Unlike a mortgage, auto loans are short enough that the principal-to-interest ratio shifts quickly — by year 3, most of each payment goes to principal."
  - title: "15-year vs 30-year mortgage comparison"
    inputs:
      loanAmount: 250000
      interestRate: 6.5
      loanTerm: 15
    description: "The same $250,000 loan at 6.5%: a 15-year term has a $2,178 monthly payment with $142,088 total interest. A 30-year term has a $1,580 payment but $319,019 in total interest. The 15-year costs $598/month more but saves $176,931 in interest."
---

## What Is Loan Amortization?

Loan amortization is the process of paying off a debt through regular, equal payments over a set period. Each payment splits between two purposes: reducing what you owe (principal) and paying the cost of borrowing (interest). The schedule of all these payments — showing exactly how much goes to principal and interest each month — is called an amortization table.

Most common loans use amortization: mortgages, auto loans, personal loans, and student loans. The key characteristic is that your monthly payment stays the same, but the split between principal and interest shifts dramatically over time.

> **Key takeaway:** Your monthly payment never changes, but where the money goes changes completely — early payments mostly enrich the lender, while later payments mostly build your equity.

## How Amortization Works

<div class="stat-highlight">
  <span class="stat-number">85%</span>
  <span class="stat-text">of your first mortgage payment goes to interest, not principal. By year 30, that flips to 95%+ going to principal — but you've already paid the bank hundreds of thousands.</span>
</div>

The monthly payment formula is **M = P[r(1+r)^n] / [(1+r)^n - 1]**, where P is the loan amount, r is the monthly interest rate, and n is the total number of payments.

What makes amortization counterintuitive is how the payment splits. In the early years of a 30-year mortgage, roughly 80-85% of each payment goes to interest. By the final years, 95%+ goes to principal. You're paying down the loan the entire time, but most of your early money is going to the bank, not to your equity.

For example, on a $300,000 mortgage at 7% over 30 years:

| Payment | Interest | Principal | Balance Remaining |
|---------|----------|-----------|-------------------|
| #1 (month 1) | $1,750 | $246 | $299,754 |
| #180 (halfway) | $1,100 | $896 | ~$218,000 |
| #360 (final) | ~$12 | ~$1,984 | $0 |

> **Example:** After 15 years and 180 payments on this mortgage, you will have paid roughly $359,280 total — yet your balance has only dropped by about $82,000. The interest front-loading is that extreme.

## Why Understanding Amortization Matters

Knowing how amortization works changes how you think about loans:

- **Early extra payments are incredibly powerful.** An extra $200 per month on a $300,000 mortgage at 7% saves approximately $76,000 in total interest and eliminates 6 years of payments. The earlier you make extra payments, the more you save because that money stops generating interest for the lender.
- **Short-term loans cost far less overall.** A 15-year mortgage has a higher monthly payment than a 30-year, but the total interest paid is typically less than half. Here's the comparison on a $250,000 loan at 6.5%:

| | 15-Year Term | 30-Year Term |
|---|---|---|
| Monthly payment | $2,178 | $1,580 |
| Total interest | $142,088 | $319,019 |
| Total cost | $392,088 | $569,019 |

> **Tip:** The 15-year mortgage costs $598/month more but saves $176,931 in interest. If you can afford the higher payment, the shorter term is almost always the better deal.

- **Refinancing makes more sense early.** If you're 20 years into a 30-year mortgage, most of your remaining payments are already going to principal. Refinancing at that point saves less than refinancing in the first 5-10 years.

## When to Use This Calculator

This calculator helps you:

- **Compare loan offers** — see the true total cost of different interest rates and terms side by side
- **Plan extra payments** — find out exactly how much you'd save by adding $100, $200, or $500 extra per month
- **Understand your existing loan** — see where you are in the amortization schedule and how much equity you've built
- **Negotiate with confidence** — when a lender offers a lower rate or shorter term, know exactly what that saves you in real dollars

## Key Terms

- **Principal** — the original amount borrowed, before interest
- **Amortization schedule** — a table showing each payment's principal and interest split, plus the remaining balance
- **APR** — the annual cost of borrowing, including fees; use this (not the interest rate alone) to compare loan offers
- **Equity** — the portion of an asset you actually own; for a home, it's the market value minus the remaining mortgage balance
- **Prepayment penalty** — a fee some lenders charge for paying off a loan early; check for this before making extra payments

## Common Mistakes

1. **Comparing only monthly payments.** A longer term has lower monthly payments but dramatically higher total cost. Always compare total interest paid.
2. **Ignoring the front-loading of interest.** Building only 5% equity in the first 5 years of a 30-year mortgage is normal, not a sign that something is wrong.
3. **Refinancing too late.** Refinancing in year 25 of a 30-year mortgage rarely saves meaningful money because you're already past the interest-heavy years.
4. **Not checking for prepayment penalties.** Before making extra payments, verify your loan terms allow it without fees.

> **Key takeaway:** The single most expensive mistake is choosing a loan based on the monthly payment alone. A 30-year loan can cost you over $150,000 more than a 15-year loan on the same amount — that difference just doesn't show up in the monthly number.

## What to Do Next

Review your amortization schedule to see where your payments are going right now. If you're in the early years of a mortgage, even small extra principal payments create outsized savings. If you're comparing loan offers, focus on the total cost column — not just the monthly payment.
