---
name: "Loan Amortization Calculator"
slug: "loan-amortization"
category: "debt-and-loans"
description: "Loan amortization calculator: monthly payment, total interest and a year-by-year schedule for any fixed-rate loan, with extra payments and US, UK or euro rates."
keywords:
  - "loan amortization calculator"
  - "amortization schedule calculator"
  - "loan payment calculator"
  - "mortgage amortization schedule"
  - "amortization table"
relatedTools:
  - "mortgage-payment"
  - "debt-payoff"
  - "car-finance"
  - "rent-vs-buy"
  - "credit-card-payoff"
  - "compound-interest"
  - "savings-goal"
affiliateContext: "Compare rates and save thousands on your loan"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
calculationMethod: "Uses standard amortization formula: M = P[r(1+r)^n]/[(1+r)^n-1]"
dataSources:
  - name: "Freddie Mac Primary Mortgage Market Survey (default US rates)"
    url: "https://www.freddiemac.com/pmms"
  - name: "CFPB: understand loan options"
    url: "https://www.consumerfinance.gov/owning-a-home/loan-options/"
faq:
  - question: "What is loan amortization?"
    answer: "Amortization is paying off a loan through regular, scheduled payments. Each payment is split between interest (the cost of borrowing, charged on what you still owe) and principal (the part that reduces the balance). Because the balance falls, the interest share falls and the principal share rises. On a $300,000 loan at 7% over 30 years, the first payment is {{ 100 - loanMonth(300000, 7, 30, 1).principalShare | pct }} interest and the last is {{ loanMonth(300000, 7, 30, 360).principalShare | pct }} principal."
  - question: "How is a monthly loan payment calculated?"
    answer: "The formula is M = P[r(1+r)^n] / [(1+r)^n - 1], where P is the loan amount, r is the monthly interest rate (the annual rate divided by 12) and n is the number of monthly payments. It gives equal payments that clear the balance exactly at the end of the term. On $300,000 at 7% over 30 years that is {{ loanPayment(300000, 7, 30) | usd }} a month."
  - question: "How much interest will I pay over the life of a loan?"
    answer: "It depends on the amount, the rate and the term. A $300,000 mortgage at 7% over 30 years costs {{ loanTotalInterest(300000, 7, 30) | usd }} in interest, more than the amount borrowed. A $35,000 car loan at 6.5% over 5 years costs {{ loanTotalInterest(35000, 6.5, 5) | usd }}. Shorter terms and extra payments cut the total sharply."
  - question: "What happens if I make extra payments on my loan?"
    answer: "Extra payments go straight to principal, so less interest builds up in every later month. On a $300,000 loan at 7% over 30 years, an extra $200 a month saves {{ overpaymentSaving(300000, 7, 30, monthly=200).interestSaved | usd }} in interest and ends the loan {{ overpaymentSaving(300000, 7, 30, monthly=200).monthsSaved | months }} early. Open the advanced settings, enter the extra amount and the schedule updates. Check first that your lender does not charge a prepayment fee."
  - question: "Which interest rate does the calculator start with?"
    answer: "It starts from a current market average for the selected currency and says where it comes from: {{ rate('us30') | pct(2) }} for a US 30-year mortgage ({{ rateSource('us30') }}), {{ rate('us15') | pct(2) }} when the term is 15 years or less, {{ rate('uk2yr') | pct(2) }} for a UK two-year fixed mortgage ({{ rateSource('uk2yr') }}) and {{ rate('eur') | pct(2) }} for euro-area house purchase ({{ rateSource('eur') }}). These are mortgage averages, so for a car, personal or student loan type in the rate you were quoted. The term can be anything from 1 to 50 years."
  - question: "What is the difference between amortization and simple interest?"
    answer: "Most mortgages, car loans and personal loans amortize: a fixed payment covers interest and principal together, and the interest portion shrinks as the balance shrinks. A simple-interest loan usually amortizes too, but interest accrues daily on the outstanding balance, so paying early or late changes how much of a payment goes to interest. This calculator assumes equal monthly payments with interest charged monthly, so it will differ slightly from a loan that accrues daily."
workedExamples:
  - title: "30-year fixed mortgage"
    inputs:
      loanAmount: 300000
      interestRate: 7
      loanTerm: 30
    description: "A $300,000 mortgage at 7% fixed for 30 years has a monthly payment of {{ loanPayment(300000, 7, 30) | usd }}. Over the life of the loan you pay {{ loanTotalInterest(300000, 7, 30) | usd }} in interest, {{ 300000 + loanTotalInterest(300000, 7, 30) | usd }} in total. In the first year {{ loanYear(300000, 7, 30, 1).principal | usd }} goes to principal and {{ loanYear(300000, 7, 30, 1).interest | usd }} to interest."
  - title: "5-year auto loan"
    inputs:
      loanAmount: 35000
      interestRate: 6.5
      loanTerm: 5
    description: "A $35,000 car loan at 6.5% over 5 years has a monthly payment of {{ loanPayment(35000, 6.5, 5) | usd(2) }} and costs {{ loanTotalInterest(35000, 6.5, 5) | usd }} in interest. A short loan amortizes fast: {{ loanMonth(35000, 6.5, 5, 1).principalShare | pct }} of the first payment already goes to principal, rising to {{ loanMonth(35000, 6.5, 5, 60).principalShare | pct }} in the last."
  - title: "15-year vs 30-year term"
    inputs:
      loanAmount: 250000
      interestRate: 6.5
      loanTerm: 15
    description: "The same $250,000 loan at 6.5%. A 15-year term has a payment of {{ loanPayment(250000, 6.5, 15) | usd }} a month and {{ loanTotalInterest(250000, 6.5, 15) | usd }} of total interest. A 30-year term has a payment of {{ loanPayment(250000, 6.5, 30) | usd }} and {{ loanTotalInterest(250000, 6.5, 30) | usd }} of interest. The 15-year term costs {{ loanPayment(250000, 6.5, 15) - loanPayment(250000, 6.5, 30) | usd }} more a month and saves {{ loanTotalInterest(250000, 6.5, 30) - loanTotalInterest(250000, 6.5, 15) | usd }} in interest."
---

## Where each payment goes

Amortization means paying off a debt in equal instalments over a set period. Each instalment does two jobs: it pays the interest that has built up, and it reduces the principal. The table of every payment, with the interest, the principal and the balance left, is the amortization schedule. Mortgages, car loans, personal loans and most student loans work this way.

The payment stays the same, but the split does not. Early payments are mostly interest and later ones are mostly principal.

<div class="stat-highlight">
  <span class="stat-number">{{ 100 - loanMonth(300000, 7, 30, 1).principalShare | pct }}</span>
  <span class="stat-text">of the first payment on a $300,000, 30-year mortgage at 7% is interest. By the last payment interest is down to {{ 100 - loanMonth(300000, 7, 30, 360).principalShare | pct }}, but by then the lender has been paid {{ loanTotalInterest(300000, 7, 30) | usd }} in interest.</span>
</div>

The payment formula is **M = P[r(1+r)^n] / [(1+r)^n - 1]**, where P is the loan amount, r the monthly rate and n the number of payments.

On a $300,000 mortgage at 7% over 30 years the split moves like this:

| Payment | Interest | Principal | Balance remaining |
|---|---|---|---|
| Month 1 | {{ loanMonth(300000, 7, 30, 1).interest | usd }} | {{ loanMonth(300000, 7, 30, 1).principal | usd }} | {{ loanMonth(300000, 7, 30, 1).balance | usd }} |
| Month 180 (halfway) | {{ loanMonth(300000, 7, 30, 180).interest | usd }} | {{ loanMonth(300000, 7, 30, 180).principal | usd }} | {{ loanMonth(300000, 7, 30, 180).balance | usd }} |
| Month 360 (last) | {{ loanMonth(300000, 7, 30, 360).interest | usd }} | {{ loanMonth(300000, 7, 30, 360).principal | usd }} | {{ loanMonth(300000, 7, 30, 360).balance | usd }} |

> **Halfway, you have paid {{ loanPayment(300000, 7, 30) * 180 | usd }} and cut the balance by only {{ 300000 - loanBalance(300000, 7, 30, 180) | usd }}.** After five years of payments, only {{ (300000 - loanBalance(300000, 7, 30, 60)) / 300000 * 100 | pct1 }} of the loan has been repaid. That is normal for a long loan, not a sign that something is wrong.

## What to do with the schedule

- **Overpay early.** An extra $200 a month on the loan above saves {{ overpaymentSaving(300000, 7, 30, monthly=200).interestSaved | usd }} in interest and removes {{ overpaymentSaving(300000, 7, 30, monthly=200).monthsSaved | months }} of payments. The same extra amount paid later saves less, because less interest is left to avoid.
- **Weigh a shorter term.** A 15-year loan has a higher payment but a fraction of the interest. On $250,000 at 6.5%:

| | 15-year term | 30-year term |
|---|---|---|
| Monthly payment | {{ loanPayment(250000, 6.5, 15) | usd }} | {{ loanPayment(250000, 6.5, 30) | usd }} |
| Total interest | {{ loanTotalInterest(250000, 6.5, 15) | usd }} | {{ loanTotalInterest(250000, 6.5, 30) | usd }} |
| Total of all payments | {{ 250000 + loanTotalInterest(250000, 6.5, 15) | usd }} | {{ 250000 + loanTotalInterest(250000, 6.5, 30) | usd }} |

> **The 15-year loan costs {{ loanPayment(250000, 6.5, 15) - loanPayment(250000, 6.5, 30) | usd }} more a month and saves {{ loanTotalInterest(250000, 6.5, 30) - loanTotalInterest(250000, 6.5, 15) | usd }} in interest.** If the higher payment fits your budget comfortably, the shorter term is usually the better deal.

- **Time a refinance.** Refinancing helps most early in a loan, while the payments are still mostly interest. Twenty years into the 30-year loan above, about {{ 100 - loanMonth(300000, 7, 30, 241).principalShare | pct }} of each payment is still interest, so the break-even on a refinance depends on the new rate and its costs, not on the loan's age alone.

## When to use this calculator

- **Comparing loan offers:** see the total cost of different rates and terms side by side.
- **Planning extra payments:** find out what $100, $200 or $500 more a month would save.
- **Checking an existing loan:** see how much of your balance each year's payments remove.
- **Negotiating:** when a lender offers a lower rate or shorter term, know what it is worth in dollars.

## Terms worth knowing

- **Principal:** the amount borrowed, before interest.
- **Amortization schedule:** a table of each payment's interest, principal and remaining balance.
- **APR:** the annual cost of borrowing including fees. Use it, not the interest rate alone, to compare offers. This calculator takes the interest rate and ignores fees.
- **Equity:** for a home, its value minus the mortgage balance.
- **Prepayment penalty:** a fee some lenders charge for paying early. Check for one before you overpay.

## Mistakes that cost money

1. **Comparing only monthly payments.** A longer term lowers the payment and raises the total cost. Compare the interest column.
2. **Expecting equity to build evenly.** Interest is front-loaded, so the first years reduce the balance slowly.
3. **Overpaying without checking the terms.** Confirm that extra payments go to principal and carry no fee.

## What to do next

Enter the loan amount, rate and term and read the schedule. If you are comparing offers, look at the total interest, not the monthly payment alone. Then open the advanced settings and try an extra payment.
