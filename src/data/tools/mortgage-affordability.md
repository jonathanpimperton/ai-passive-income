---
name: "Mortgage Affordability Calculator"
slug: "mortgage-affordability"
category: "debt-and-loans"
description: "Mortgage affordability calculator: enter income, debts and deposit for the most you can borrow and pay a month, using US 28/36, UK income-multiple and euro rules."
keywords:
  - "how much house can I afford"
  - "mortgage affordability calculator"
  - "home buying budget"
  - "house affordability"
  - "mortgage qualification calculator"
  - "how much mortgage can I get"
  - "DTI calculator"
affiliateContext: "Get pre-approved and compare mortgage rates"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
relatedTools:
  - "mortgage-payment"
  - "loan-amortization"
  - "rent-vs-buy"
  - "savings-goal"
  - "salary-us"
  - "salary-uk"
  - "stamp-duty"
lastUpdated: "2026-11-15"
dataSources:
  - name: "CFPB: what is a debt-to-income ratio?"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/"
  - name: "Freddie Mac: how much home can I afford?"
    url: "https://myhome.freddiemac.com/blog/homebuying/how-much-can-you-afford"
  - name: "Freddie Mac Seller/Servicer Guide: monthly debt payment-to-income ratio"
    url: "https://guide.freddiemac.com/app/guide/section/5401.2"
  - name: "Freddie Mac: breaking down PMI (default PMI rate)"
    url: "https://myhome.freddiemac.com/buying/breaking-down-pmi"
  - name: "Freddie Mac Primary Mortgage Market Survey (default US rates)"
    url: "https://www.freddiemac.com/pmms"
  - name: "FCA: interest rate stress test rule (UK)"
    url: "https://www.fca.org.uk/firms/interest-rate-stress-test-rule"
  - name: "Bank of England and PRA: high loan-to-income lending, October 2026 (UK)"
    url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2026/october/high-loan-to-income-lending-policy-statement"
  - name: "MoneyHelper mortgage affordability calculator: how it works (UK)"
    url: "https://www.gov.uk/algorithmic-transparency-records/money-and-pensions-service-mortgage-affordability-calculator"
faq:
  - question: "What is the 28/36 rule for mortgage affordability?"
    answer: "It is a guideline for how much of your gross income can go on housing and debt. The front-end ratio (28%) caps your housing costs (principal, interest, property tax, insurance, PMI and HOA dues). The back-end ratio (36%) caps housing plus all your other monthly debt payments. On a $100,000 income that is {{ 100000 * 28 / 100 / 12 | usd }} a month for housing and {{ 100000 * 36 / 100 / 12 | usd }} a month in total. The calculator uses the lower of the two limits after your other debts."
  - question: "Which limit sets my maximum, and how do debts and DTI change it?"
    answer: "Whichever limit is lower. On an $80,000 income with $500 a month of other debts, the 28% housing cap is {{ usAffordability(80000, 500, 40000, rate('us30'), 30).frontEndBudget | usd }} a month and the 36% all-debt limit leaves {{ usAffordability(80000, 500, 40000, rate('us30'), 30).backEndBudget | usd }}, so the housing cap sets the answer: {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }} with $40,000 down. Debts up to {{ 80000 * 36 / 100 / 12 - 80000 * 28 / 100 / 12 | usd }} a month don't change that. Above it the back-end limit takes over: at $1,000 a month of debts the maximum falls to {{ usAffordability(80000, 1000, 40000, rate('us30'), 30).maxPrice | usd }}. Raising only the back-end limit to 43% changes nothing here; you also have to raise the front-end limit (at 31% and 43% the maximum is {{ usAffordability(80000, 500, 40000, rate('us30'), 30, frontEnd=31, backEnd=43).maxPrice | usd }}). Both limits are in the advanced settings."
  - question: "Does a larger down payment let me afford a more expensive home?"
    answer: "Yes, in two ways. The deposit adds to the price directly, and once it reaches 20% of the price the PMI charge disappears, which frees monthly budget for a larger loan. On an $80,000 income with $500 a month of debts, $40,000 down gives a maximum of {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }} with {{ usAffordability(80000, 500, 40000, rate('us30'), 30).monthlyPMI | usd }} a month of PMI, and $60,000 down gives {{ usAffordability(80000, 500, 60000, rate('us30'), 30).maxPrice | usd }} with {{ usAffordability(80000, 500, 60000, rate('us30'), 30).monthlyPMI | usd }} a month of PMI. The extra $20,000 raises the maximum by {{ usAffordability(80000, 500, 60000, rate('us30'), 30).maxPrice - usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }}, more than the deposit itself, because the PMI charge falls away once the deposit passes 20% of the price."
  - question: "How much does PMI cost and when does it go away?"
    answer: "Freddie Mac puts PMI at roughly $30 to $70 a month for every $100,000 borrowed (accessed 12 November 2026), which is {{ 30 * 12 / 100000 * 100 | pct(2) }} to {{ 70 * 12 / 100000 * 100 | pct(2) }} of the loan a year. The calculator uses the midpoint, {{ (30 + 70) / 2 * 12 / 100000 * 100 | pct(auto) }}, and you can change it. PMI applies while your down payment is under 20% of the price. Under the federal Homeowners Protection Act the lender must cancel it automatically when your balance reaches 78% of the original value, and you can ask for it at 80%. The calculator treats PMI as part of the payment that sets your budget and does not model it ending."
  - question: "What monthly debts count toward my DTI ratio?"
    answer: "Recurring debt payments: car loans, student loans, credit card minimums, personal loans, child support, alimony and other instalment debt, plus the new housing payment. Utilities, groceries, phone bills and subscriptions don't count. Lenders pull your credit report to check, so include everything on it. Paying off a small loan before you apply raises the maximum only if your back-end limit is the binding one, as in the second answer above."
  - question: "Should I buy the most expensive house I can afford?"
    answer: "Not necessarily. Lender approval is a ceiling, not a target. The 28% limit is measured on gross income, so it takes more of your take-home pay than it sounds: for a single filer on $100,000 with a 5% state tax, {{ 100000 * 28 / 100 | usd }} a year of housing is {{ 100000 * 28 / 100 / usPay(100000, state=5).takeHome * 100 | pct }} of take-home pay. A payment at the limit leaves little for repairs, retirement saving, an emergency fund or a change in income. Use the calculator to find your maximum, then consider a lower target."
  - question: "How does the UK calculation work?"
    answer: "Switch the currency to pounds. A UK lender typically caps the loan at about 4.5 times income and also checks that you could still pay if rates rose. The calculator takes the smaller of the two limits. The stress test uses the higher of your rate and lenders' average standard variable rate ({{ rate('ukRevert') | pct(2) }}, {{ rateSource('ukRevert') }}) plus 1 point, and requires the stressed payment plus your other commitments to stay within 50% of take-home pay, a budgeting line used by MoneyHelper, not a lender rule. For a £60,000 income with a £40,000 deposit over 25 years at {{ rate('uk2yr') | pct(2) }} ({{ rateSource('uk2yr') }}), that gives a maximum price of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).maxPrice | gbp }}, from a stress-test limit of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).stressLimitLoan | gbp }} and an income-multiple limit of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).ltiLimitLoan | gbp }} (the lower sets the loan). Take-home pay is estimated for one earner unless you edit it."
workedExamples:
  - title: "Family earning $100K with $50K down"
    inputs:
      annualIncome: 100000
      monthlyDebt: 600
      downPayment: 50000
      interestRate: "market rate (30-year)"
      loanTerm: 30
    description: "Gross monthly income is {{ usAffordability(100000, 600, 50000, rate('us30'), 30).grossMonthly | usd }}. The 28% housing cap is {{ usAffordability(100000, 600, 50000, rate('us30'), 30).frontEndBudget | usd }}; the 36% limit leaves {{ usAffordability(100000, 600, 50000, rate('us30'), 30).backEndBudget | usd }} after the $600 of debts, so the housing cap binds. Inside that budget go property tax ({{ usAffordability(100000, 600, 50000, rate('us30'), 30).monthlyTax | usd }}), insurance ({{ usAffordability(100000, 600, 50000, rate('us30'), 30).monthlyInsurance | usd }}) and PMI ({{ usAffordability(100000, 600, 50000, rate('us30'), 30).monthlyPMI | usd }}, because the down payment is {{ 50000 / usAffordability(100000, 600, 50000, rate('us30'), 30).maxPrice * 100 | pct1 }}). That leaves {{ usAffordability(100000, 600, 50000, rate('us30'), 30).monthlyPI | usd }} for principal and interest at {{ rate('us30') | pct(2) }} ({{ rateSource('us30') }}), a loan of {{ usAffordability(100000, 600, 50000, rate('us30'), 30).maxLoan | usd }} and a maximum price of {{ usAffordability(100000, 600, 50000, rate('us30'), 30).maxPrice | usd }}."
  - title: "Single earner with an $80K salary and no debt"
    inputs:
      annualIncome: 80000
      monthlyDebt: 0
      downPayment: 40000
      interestRate: "market rate (30-year)"
      loanTerm: 30
    description: "With $80,000 income, no other debts and $40,000 down, the 28% housing cap of {{ usAffordability(80000, 0, 40000, rate('us30'), 30).frontEndBudget | usd }} a month sets the limit. After property tax ({{ usAffordability(80000, 0, 40000, rate('us30'), 30).monthlyTax | usd }}), insurance ({{ usAffordability(80000, 0, 40000, rate('us30'), 30).monthlyInsurance | usd }}) and PMI ({{ usAffordability(80000, 0, 40000, rate('us30'), 30).monthlyPMI | usd }}), {{ usAffordability(80000, 0, 40000, rate('us30'), 30).monthlyPI | usd }} is left for principal and interest at {{ rate('us30') | pct(2) }}. The loan is {{ usAffordability(80000, 0, 40000, rate('us30'), 30).maxLoan | usd }} and the maximum price {{ usAffordability(80000, 0, 40000, rate('us30'), 30).maxPrice | usd }}. Adding $500 a month of other debt gives the same {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }}, because the housing cap is still the lower limit; at $1,000 a month the maximum falls to {{ usAffordability(80000, 1000, 40000, rate('us30'), 30).maxPrice | usd }}."
  - title: "High-income couple, 15-year mortgage"
    inputs:
      annualIncome: 200000
      monthlyDebt: 800
      downPayment: 100000
      interestRate: "market rate (15-year)"
      loanTerm: 15
    description: "On $200,000 gross, the 28% housing cap is {{ usAffordability(200000, 800, 100000, rate('us15'), 15).frontEndBudget | usd }} a month, below the {{ usAffordability(200000, 800, 100000, rate('us15'), 15).backEndBudget | usd }} the 36% limit leaves after $800 of debts. Property tax is {{ usAffordability(200000, 800, 100000, rate('us15'), 15).monthlyTax | usd }} and PMI {{ usAffordability(200000, 800, 100000, rate('us15'), 15).monthlyPMI | usd }}, so {{ usAffordability(200000, 800, 100000, rate('us15'), 15).monthlyPI | usd }} goes to principal and interest at {{ rate('us15') | pct(2) }} ({{ rateSource('us15') }}). That supports a loan of {{ usAffordability(200000, 800, 100000, rate('us15'), 15).maxLoan | usd }} and a price of {{ usAffordability(200000, 800, 100000, rate('us15'), 15).maxPrice | usd }}. The same budget over 30 years at {{ rate('us30') | pct(2) }} supports {{ usAffordability(200000, 800, 100000, rate('us30'), 30).maxPrice | usd }}: the shorter term buys less house per month in exchange for far less interest."
---

## What sets your maximum

The answer depends on three things: what you earn, what you already owe and what you have saved for a deposit. The calculator works backwards from your income to the highest price that fits standard lending guidelines.

In the US the guide is your debt-to-income ratio (DTI), the share of gross monthly income that goes on debt payments. Freddie Mac's lending guide gives 36% as its guideline and treats a manually underwritten loan above 45% as ineligible; automated underwriting can allow more. The calculator applies two limits and uses the lower.

> **Debts only matter when they bind.** On an $80,000 income the housing cap (28%, {{ usAffordability(80000, 500, 40000, rate('us30'), 30).frontEndBudget | usd }} a month) is lower than the 36% all-debt limit until your other debts pass {{ 80000 * 36 / 100 / 12 - 80000 * 28 / 100 / 12 | usd }} a month. Below that, paying off a car loan won't raise your maximum. Above it, each extra $100 of monthly debt takes roughly {{ usAffordability(80000, 1000, 40000, rate('us30'), 30).maxPrice - usAffordability(80000, 1100, 40000, rate('us30'), 30).maxPrice | usd }} off it.

## The 28/36 rule, step by step

<div class="stat-highlight">
  <span class="stat-number">{{ 100000 * 28 / 100 / 12 | usd }}</span>
  <span class="stat-text">a month is the housing budget on a $100,000 income under the 28% rule. The 36% rule allows {{ 100000 * 36 / 100 / 12 | usd }} a month in total, including other debts.</span>
</div>

- **Front-end ratio (28%):** housing costs (principal, interest, property tax, insurance, HOA dues and PMI) of no more than 28% of gross monthly income.
- **Back-end ratio (36%):** housing plus every other debt payment of no more than 36% of gross monthly income.

The calculator then:

1. Takes the lower of 28% of gross monthly income and 36% of gross monthly income minus your other debts. That is your housing budget.
2. Subtracts property tax (default 1.0% of the price a year), homeowners insurance (default $1,800 a year), HOA dues and PMI (default 0.6% of the loan a year, if your down payment is under 20%).
3. Treats what is left as the principal-and-interest payment and works out the loan it supports.
4. Adds your down payment to get the maximum price.

PMI depends on the loan and the loan depends on PMI, so the calculator solves each side of the 20%-down line directly rather than guessing and repeating, and reports the maximum price on the side where the numbers are consistent. Both limits, the PMI rate and the property tax and insurance assumptions are adjustable.

> **Rates matter.** The calculator starts from the current Freddie Mac survey rate, {{ rate('us30') | pct(2) }} for 30 years ({{ rateSource('us30') }}), which is an average, not a quote. A half-point rise to {{ rate('us30') + 0.5 | pct(2) }} cuts the maximum price on an $80,000 income with $500 a month of debts and $40,000 down from {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }} to {{ usAffordability(80000, 500, 40000, rate('us30') + 0.5, 30).maxPrice | usd }}.

## Down payment and PMI

A 20% down payment avoids PMI, but saving 20% of a $400,000 home ({{ 400000 * 20 / 100 | usd }}) takes years. Here is how the deposit changes the maximum price for an $80,000 income with $500 a month of other debts, 30 years at {{ rate('us30') | pct(2) }} ({{ rateSource('us30') }}):

| Deposit | Maximum price | Deposit as % of price | PMI a month |
|---|---|---|---|
| $20,000 | {{ usAffordability(80000, 500, 20000, rate('us30'), 30).maxPrice | usd }} | {{ 20000 / usAffordability(80000, 500, 20000, rate('us30'), 30).maxPrice * 100 | pct1 }} | {{ usAffordability(80000, 500, 20000, rate('us30'), 30).monthlyPMI | usd }} |
| $40,000 | {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice | usd }} | {{ 40000 / usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice * 100 | pct1 }} | {{ usAffordability(80000, 500, 40000, rate('us30'), 30).monthlyPMI | usd }} |
| $60,000 | {{ usAffordability(80000, 500, 60000, rate('us30'), 30).maxPrice | usd }} | {{ 60000 / usAffordability(80000, 500, 60000, rate('us30'), 30).maxPrice * 100 | pct1 }} | {{ usAffordability(80000, 500, 60000, rate('us30'), 30).monthlyPMI | usd }} |
| $80,000 | {{ usAffordability(80000, 500, 80000, rate('us30'), 30).maxPrice | usd }} | {{ 80000 / usAffordability(80000, 500, 80000, rate('us30'), 30).maxPrice * 100 | pct1 }} | {{ usAffordability(80000, 500, 80000, rate('us30'), 30).monthlyPMI | usd }} |

Between $20,000 and $40,000 the extra deposit raises the maximum by {{ usAffordability(80000, 500, 40000, rate('us30'), 30).maxPrice - usAffordability(80000, 500, 20000, rate('us30'), 30).maxPrice | usd }}, less than the $20,000 itself, because property tax on a pricier home takes back part of the monthly budget. Where the deposit crosses 20% of the price, PMI drops away and the maximum jumps by more than the deposit.

## UK and euro-area mortgages

Switch the currency to pounds or euros and the model changes.

**UK.** A UK lender typically lends up to about 4.5 times income (the limit is adjustable from 4 to 5.5 times) and checks that you could still afford the payment if rates rose. The stress rate is the higher of your rate and the average standard variable rate ({{ rate('ukRevert') | pct(2) }}, {{ rateSource('ukRevert') }}) plus a margin of 1 point, and the stressed payment plus other commitments must stay within 50% of take-home pay. The calculator shows both limits and uses the smaller. Terms are 20, 25, 30 or 35 years, and there is no property tax, PMI or HOA line. Take-home pay is estimated for a single earner in England, Wales and Northern Ireland unless you edit it, and a deposit under 5% brings a warning.

For a £60,000 household income, no other commitments, a £40,000 deposit and 25 years at {{ rate('uk2yr') | pct(2) }} ({{ rateSource('uk2yr') }}):

- The income-multiple limit allows a loan of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).ltiLimitLoan | gbp }}.
- The stress test, at {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).stressRatePct | pct(2) }}, allows {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).stressLimitLoan | gbp }}. The lower of the two sets the loan.
- The maximum price is {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).maxPrice | gbp }}, a loan of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).maxLoan | gbp }} ({{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).incomeMultiple | num(2) }} times income) with a payment of {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).monthlyPI | gbp }} a month, {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).shareOfTakeHome | pct }} of the {{ ukAffordability(60000, 0, 40000, rate('uk2yr'), 25).monthlyTakeHome | gbp }} take-home pay the calculator estimates.

Add Stamp Duty and legal costs to the price. The stamp duty calculator covers England and Northern Ireland.

**Euro area.** Rules differ by country, so the calculator uses one combined limit: loan payments plus other debts of no more than 36% of gross income (adjustable). On €60,000 with no other debts, a €40,000 deposit and 25 years at {{ rate('eur') | pct(2) }} ({{ rateSource('eur') }}), the payment budget is {{ eurAffordability(60000, 0, 40000, rate('eur'), 25).paymentBudget | eur }} a month and the maximum price {{ eurAffordability(60000, 0, 40000, rate('eur'), 25).maxPrice | eur }}. Many euro-area lenders measure debt service against net income instead, so treat the result as a first estimate.

## Mistakes that cost money

1. **Using take-home pay for the ratios.** Lenders measure DTI on gross income, so what is approved can feel tight against what lands in your account.
2. **Leaving out property tax and insurance.** Both come out of the same budget as the mortgage. The calculator assumes 1.0% and $1,800 a year; check your county's rate and get an insurance quote.
3. **Overlooking PMI.** Under 20% down it takes a slice of the budget every month, which lowers the loan you can support.
4. **Buying at the maximum.** The maximum is a ceiling. A price 10% to 15% below it leaves room for repairs and saving.

## When to use this calculator

- **Before house-hunting**, to set a realistic price range.
- **Deciding how much to save**, to see what the deposit buys.
- **Choosing between 15 and 30 years**, to see how the term changes the price your budget supports.
- **Weighing debt payoff**, to see whether clearing a loan raises your maximum at all.

Once you have a range, use the [Mortgage Payment Calculator](/tools/debt-and-loans/mortgage-payment/) to price a specific home and test extra payments.
