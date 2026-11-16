---
name: "Mortgage Payment Calculator"
slug: "mortgage-payment"
category: "debt-and-loans"
description: "Mortgage payment calculator: monthly principal and interest, total interest and schedule, with extra payments, taxes, insurance and PMI for US, UK and euro loans."
keywords:
  - "mortgage calculator"
  - "mortgage payment calculator"
  - "home loan calculator"
  - "monthly mortgage payment"
  - "how much house can I afford"
  - "mortgage amortization"
  - "mortgage interest calculator"
affiliateContext: "Compare mortgage rates and find the best deal"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
relatedTools:
  - "mortgage-affordability"
  - "loan-amortization"
  - "rent-vs-buy"
  - "stamp-duty"
  - "savings-goal"
  - "compound-interest"
lastUpdated: "2026-11-15"
dataSources:
  - name: "Mortgage amortization formula (Investopedia)"
    url: "https://www.investopedia.com/terms/a/amortization.asp"
  - name: "CFPB: understand loan options"
    url: "https://www.consumerfinance.gov/owning-a-home/loan-options/"
  - name: "Freddie Mac Primary Mortgage Market Survey (default US rates)"
    url: "https://www.freddiemac.com/pmms"
  - name: "Freddie Mac: breaking down PMI (default PMI rate)"
    url: "https://myhome.freddiemac.com/buying/breaking-down-pmi"
faq:
  - question: "How is a monthly mortgage payment calculated?"
    answer: "The standard formula is M = P[r(1+r)^n]/[(1+r)^n - 1], where P is the loan principal, r is the monthly interest rate (annual rate divided by 12) and n is the number of payments (years x 12). On a $300,000 loan at 7% for 30 years, principal and interest come to {{ loanPayment(300000, 7, 30) | usd }} a month. That leaves out property tax, homeowners insurance and PMI. On a $350,000 home the calculator's starting assumptions (1.0% tax, $1,800 insurance) add {{ 350000 * 1 / 100 / 12 + 1800 / 12 | usd }} a month."
  - question: "What is included in a mortgage payment?"
    answer: "A full US payment (often called PITI) has four parts: principal (paying down the balance), interest (the cost of borrowing), property tax and homeowners insurance, the last two usually collected in escrow. With less than 20% down you also pay PMI (private mortgage insurance). Freddie Mac puts PMI at roughly $30 to $70 a month for every $100,000 borrowed, which is {{ 30 * 12 / 100000 * 100 | pct(2) }} to {{ 70 * 12 / 100000 * 100 | pct(2) }} of the loan a year (accessed 12 November 2026). The calculator uses the midpoint, {{ (30 + 70) / 2 * 12 / 100000 * 100 | pct(auto) }}, and lets you change it. In UK and euro mode there is no tax, insurance or PMI line."
  - question: "How much does an extra payment save on a mortgage?"
    answer: "A lot, because the extra goes straight to principal and cuts interest in every remaining month. On a $300,000 mortgage at 7% for 30 years, adding $200 a month saves {{ overpaymentSaving(300000, 7, 30, monthly=200).interestSaved | usd }} in interest and ends the loan {{ overpaymentSaving(300000, 7, 30, monthly=200).monthsSaved | months }} early. Adding one-twelfth of your payment each month ({{ loanPayment(300000, 7, 30) / 12 | usd }}, the same total as one extra payment a year) saves {{ overpaymentSaving(300000, 7, 30, monthly=loanPayment(300000, 7, 30) / 12).interestSaved | usd }} and takes off {{ overpaymentSaving(300000, 7, 30, monthly=loanPayment(300000, 7, 30) / 12).monthsSaved | months }}. Check your loan allows overpayments without a fee."
  - question: "What is the difference between a 15-year and a 30-year mortgage?"
    answer: "A 15-year loan has a higher payment and far less interest. On $300,000 at the Freddie Mac survey rates ({{ rate('us30') | pct(2) }} for 30 years, {{ rate('us15') | pct(2) }} for 15; {{ rateSource('us30') }}), the 30-year payment is {{ loanPayment(300000, rate('us30'), 30) | usd }} a month with {{ loanTotalInterest(300000, rate('us30'), 30) | usd }} of interest. The 15-year payment is {{ loanPayment(300000, rate('us15'), 15) | usd }} a month ({{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more) with {{ loanTotalInterest(300000, rate('us15'), 15) | usd }} of interest, which saves {{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }}. A survey rate is a market snapshot, not a quote."
  - question: "How much house can I afford?"
    answer: "A common guide is the 28/36 rule: housing costs (payment, tax, insurance, PMI and HOA dues) of no more than 28% of gross monthly income, and total debt payments of no more than 36%. On a $100,000 household income, 28% is {{ 100000 * 28 / 100 / 12 | usd }} a month. With $50,000 for the down payment, no other debts, a 7% rate and 30 years, that supports a home of about {{ usAffordability(100000, 0, 50000, 7, 30).maxPrice | usd }}. The mortgage affordability calculator applies both limits and shows which one binds. Lenders may approve more than the guide allows, but a higher payment leaves less room for everything else."
  - question: "Should I pay points to lower my mortgage rate?"
    answer: "One discount point costs 1% of the loan and typically lowers the rate by about 0.25 percentage points, though lenders differ. On a $300,000 loan, one point costs {{ 300000 / 100 | usd }} and cutting 7% to 6.75% saves {{ loanPayment(300000, 7, 30) - loanPayment(300000, 6.75, 30) | usd }} a month, so it takes {{ 3000 / (loanPayment(300000, 7, 30) - loanPayment(300000, 6.75, 30)) | months }} to break even. If you will keep the loan longer than that, paying points usually saves money. If you may sell or refinance sooner, skip them."
workedExamples:
  - title: "Monthly payment on a $350,000 home with 20% down"
    inputs:
      homePrice: 350000
      downPayment: 20
      interestRate: 7.0
      loanTerm: 30
    description: "A $350,000 home with 20% down ({{ 350000 * 20 / 100 | usd }}) leaves a {{ 350000 * 80 / 100 | usd }} loan. At 7% fixed for 30 years, principal and interest are {{ loanPayment(280000, 7, 30) | usd }} a month and total interest is {{ loanTotalInterest(280000, 7, 30) | usd }}, more than the loan itself. With the default 1.0% property tax ({{ 350000 * 1 / 100 / 12 | usd }} a month) and $1,800 a year of insurance ({{ 1800 / 12 | usd }} a month), the full monthly payment is {{ loanPayment(280000, 7, 30) + 350000 * 1 / 100 / 12 + 1800 / 12 | usd }}. There is no PMI at 20% down."
  - title: "Comparing a 15-year and a 30-year mortgage"
    inputs:
      homePrice: 300000
      downPayment: 0
      loanTerm: 30
      interestRate30: "market rate"
      interestRate15: "market rate"
    description: "A $300,000 loan at the Freddie Mac survey rates ({{ rate('us30') | pct(2) }} for 30 years, {{ rate('us15') | pct(2) }} for 15; {{ rateSource('us30') }}). The 30-year payment is {{ loanPayment(300000, rate('us30'), 30) | usd }} a month with {{ loanTotalInterest(300000, rate('us30'), 30) | usd }} total interest. The 15-year payment is {{ loanPayment(300000, rate('us15'), 15) | usd }} a month, {{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more, with {{ loanTotalInterest(300000, rate('us15'), 15) | usd }} total interest, a saving of {{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }}. After 10 years the 15-year loan owes {{ loanBalance(300000, rate('us15'), 15, 120) | usd }} against {{ loanBalance(300000, rate('us30'), 30, 120) | usd }} on the 30-year."
  - title: "Impact of extra payments"
    inputs:
      homePrice: 350000
      downPayment: 20
      interestRate: 7.0
      loanTerm: 30
      extraMonthlyPayment: 300
    description: "A {{ 350000 * 80 / 100 | usd }} loan at 7% for 30 years has a base payment of {{ loanPayment(280000, 7, 30) | usd }} a month. Adding $300 a month toward principal pays the loan off in {{ overpaymentSaving(280000, 7, 30, monthly=300).months | months }} instead of 30 years, {{ overpaymentSaving(280000, 7, 30, monthly=300).monthsSaved | months }} early, and saves {{ overpaymentSaving(280000, 7, 30, monthly=300).interestSaved | usd }} in interest. Total interest falls from {{ overpaymentSaving(280000, 7, 30, monthly=300).baseInterest | usd }} to {{ overpaymentSaving(280000, 7, 30, monthly=300).interest | usd }}."
---

## What your lender's quote leaves out

A mortgage payment is the monthly amount you pay to repay a home loan. The basic payment covers principal and interest. In the US the real monthly cost also includes property tax, homeowners insurance and, with less than 20% down, PMI. Together these make up PITI.

> **Why it matters:** on a $350,000 home with 10% down at 7%, principal and interest are {{ loanPayment(315000, 7, 30) | usd }} a month. Add 1.0% property tax, $1,800 of insurance and PMI at 0.6% and the payment is about {{ (350000 * 1 / 100 / 12 + 1800 / 12 + 315000 * 0.6 / 100 / 12) / loanPayment(315000, 7, 30) * 100 | pct }} higher.

## How the monthly payment is calculated

<div class="stat-highlight">
  <span class="stat-number">{{ loanTotalInterest(300000, 7, 30) - loanTotalInterest(300000, 6, 30) | usd }}</span>
  <span class="stat-text">is the extra interest from a 7% rate instead of 6% on a $300,000 30-year mortgage. That one percentage point adds {{ loanPayment(300000, 7, 30) - loanPayment(300000, 6, 30) | usd }} a month for the life of the loan.</span>
</div>

The standard formula is **M = P[r(1+r)^n]/[(1+r)^n - 1]**, where P is the loan amount, r is the monthly rate (the annual rate divided by 12) and n is the number of monthly payments.

The rate carries more weight than most buyers expect. On $300,000 over 30 years, moving from 6% to 7% costs {{ loanPayment(300000, 7, 30) - loanPayment(300000, 6, 30) | usd }} a month. The calculator starts from the current Freddie Mac survey rate, {{ rate('us30') | pct(2) }} for a 30-year loan ({{ rateSource('us30') }}). That is a market average, not an offer: quotes for the same borrower can differ noticeably, so get several.

At the start of a 30-year loan at 7%, {{ loanMonth(300000, 7, 30, 1).principalShare | pct1 }} of the first payment reduces the balance and the rest is interest. Principal does not overtake interest until payment {{ loanCrossoverMonth(300000, 7, 30) | int }}, in year {{ loanCrossoverMonth(300000, 7, 30) / 12 | ceil | int }}.

## What a US payment is made of

- **Principal and interest:** the base loan payment.
- **Property tax:** the calculator assumes 1.0% of the price a year; rates vary by state and county, so check your county assessor.
- **Homeowners insurance:** the calculator assumes $1,800 a year; get a local quote.
- **PMI:** added while the down payment is under 20%. On a $350,000 home with 10% down the loan is {{ 350000 * 90 / 100 | usd }}, and Freddie Mac's range of $30 to $70 a month per $100,000 puts PMI at {{ 315000 / 100000 * 30 | usd }} to {{ 315000 / 100000 * 70 | usd }} a month; the calculator's default of 0.6% gives {{ 315000 * 0.6 / 100 / 12 | usd }}. The calculator keeps PMI in the total for the whole term. In practice you can ask the lender to cancel it once you reach 20% equity.

## 15 years or 30: the payment gap and the interest gap

On a $300,000 loan at the Freddie Mac survey rates ({{ rateSource('us30') }}):

| | 30-year ({{ rate('us30') | pct(2) }}) | 15-year ({{ rate('us15') | pct(2) }}) |
|---|---|---|
| **Monthly principal and interest** | {{ loanPayment(300000, rate('us30'), 30) | usd }} | {{ loanPayment(300000, rate('us15'), 15) | usd }} |
| **Total interest** | {{ loanTotalInterest(300000, rate('us30'), 30) | usd }} | {{ loanTotalInterest(300000, rate('us15'), 15) | usd }} |
| **Balance after 10 years** | {{ loanBalance(300000, rate('us30'), 30, 120) | usd }} | {{ loanBalance(300000, rate('us15'), 15, 120) | usd }} |
| **Total of all payments** | {{ 300000 + loanTotalInterest(300000, rate('us30'), 30) | usd }} | {{ 300000 + loanTotalInterest(300000, rate('us15'), 15) | usd }} |

The 30-year loan keeps the payment lower and lets you buy more house for the same monthly budget, at the price of more interest. The 15-year loan costs {{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more a month, pays {{ loanTotalInterest(300000, rate('us15'), 15) / loanTotalInterest(300000, rate('us30'), 30) * 100 | pct }} as much interest in total and clears the debt 15 years sooner. Both rates move weekly, so rerun the comparison with the figures you are quoted.

## Extra payments

Interest is charged on the remaining balance, so an extra dollar of principal reduces interest in every month that follows. On a $280,000 loan at 7%, adding $200 a month saves {{ overpaymentSaving(280000, 7, 30, monthly=200).interestSaved | usd }} in interest and ends the loan {{ overpaymentSaving(280000, 7, 30, monthly=200).monthsSaved | months }} early.

The effect is largest early on, when most of each payment is interest. Paying the same extra amount ten years in saves less than starting on day one, so overpay as early as you can afford to.

## UK and euro-area mortgages

Switch the currency to pounds or euros and the calculator changes regions. The tax, insurance and PMI lines disappear, the term buttons become 20, 25, 30 and 35 years for the UK (20, 25 and 30 for the euro area) and the default rate becomes the market average: {{ rate('uk2yr') | pct(2) }} for a two-year fix at 75% loan-to-value in the UK ({{ rateSource('uk2yr') }}) and {{ rate('eur') | pct(2) }} for euro-area house purchase ({{ rateSource('eur') }}). A UK buyer should add Stamp Duty and fees on top; the stamp duty calculator covers that. A £250,000 repayment mortgage over 25 years at the UK rate is {{ loanPayment(250000, rate('uk2yr'), 25) | gbp }} a month.

## When to use this calculator

- **House shopping:** enter different prices and see the monthly effect.
- **Comparing offers:** test rates, terms and down payments side by side.
- **Planning overpayments:** see how much sooner you would be mortgage-free.
- **Budgeting the whole payment:** add tax and insurance for a realistic monthly figure.

## Mistakes that cost money

1. **Budgeting for principal and interest only.** Tax, insurance and PMI add a large share on top, as the example above shows.
2. **Borrowing the maximum approved.** A lender may approve a payment well above 28% of your income. The lower figure leaves room for repairs, savings and everything else.
3. **Treating a small down payment as free.** A smaller deposit means a larger loan, more total interest and PMI. On the $350,000 home above, 10% down instead of 20% adds {{ loanPayment(315000, 7, 30) - loanPayment(280000, 7, 30) | usd }} a month before tax, insurance and PMI.

## What to do next

Enter the price and down payment for a home you are considering and read the monthly cost. Switch between 15 and 30 years, then try an extra monthly payment to see how much sooner the loan ends.
