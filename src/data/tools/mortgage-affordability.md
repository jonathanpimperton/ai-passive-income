---
name: "Mortgage Affordability Calculator"
slug: "mortgage-affordability"
category: "debt-and-loans"
description: "Enter your income, debts, and down payment to see how much house you can afford and what your payment would be."
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
lastUpdated: "2026-03-05"
dataSources:
  - name: "Consumer Financial Protection Bureau — Debt-to-Income ratios"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/"
  - name: "Freddie Mac — Qualification guidelines"
    url: "https://www.freddiemac.com/blog/homeownership/20180921-understanding-debt-to-income-ratio"
faq:
  - question: "What is the 28/36 rule for mortgage affordability?"
    answer: "The 28/36 rule is a guideline lenders use to assess borrower risk. The 'front-end' ratio (28%) means your total housing costs — principal, interest, taxes, and insurance — should not exceed 28% of your gross monthly income. The 'back-end' ratio (36%) means your total monthly debt payments including housing should stay below 36% of gross income. On a $100,000 income, that means a maximum housing payment of $2,333/month and total debt of $3,000/month. Many lenders will approve up to 43-45% DTI, but staying at or below 36% leaves more room for savings and unexpected expenses."
  - question: "How does the DTI limit affect how much house I can afford?"
    answer: "Debt-to-income ratio is the single biggest factor in determining your maximum mortgage. At 36% DTI on an $80,000 salary, your max total debt payment is $2,400/month. If you already pay $500/month in car and student loans, that leaves $1,900 for housing. At 43% DTI, the same income allows $2,867 total, leaving $2,367 for housing. That difference translates to roughly $60,000-$70,000 more in home buying power. This calculator lets you adjust the DTI limit to see how it changes your result."
  - question: "Does a larger down payment let me afford a more expensive home?"
    answer: "Yes, in two ways. First, a larger down payment reduces the loan amount, which means lower monthly payments for the same home price. Second, if your down payment reaches 20% or more of the purchase price, you avoid PMI (Private Mortgage Insurance), which typically costs 0.5-1% of the loan amount per year. Skipping PMI frees up more of your monthly budget for a larger loan. On a $350,000 home, going from 10% to 20% down saves roughly $130-$260/month in PMI alone."
  - question: "How much does PMI cost and when does it go away?"
    answer: "PMI typically costs 0.5% to 1% of the loan amount per year, paid monthly. On a $300,000 loan, that is $125-$250 per month. PMI is required when your down payment is less than 20% of the home's value. Under federal law (Homeowners Protection Act), your lender must automatically cancel PMI when your loan balance reaches 78% of the original purchase price. You can request cancellation at 80%. PMI is temporary — once you build enough equity through payments or appreciation, it goes away."
  - question: "What monthly debts count toward my DTI ratio?"
    answer: "DTI includes all recurring monthly debt obligations: car loans, student loans, credit card minimum payments, personal loans, child support, alimony, and any other installment debt. It does not include utilities, groceries, cell phone bills, streaming subscriptions, or other discretionary expenses. Lenders pull your credit report to verify debts, so include everything that shows up there. If you can pay off a small debt before applying, it directly increases how much house you can qualify for."
  - question: "Should I buy the most expensive house I can afford?"
    answer: "Not necessarily. Just because a lender approves you for a certain amount doesn't mean that is the right budget for your situation. A mortgage at the maximum DTI leaves very little room for retirement savings, emergency funds, travel, or lifestyle flexibility. Many financial planners recommend keeping housing costs closer to 25% of take-home pay (not gross income), which is considerably less than the 28% of gross income the 28/36 rule allows. Use this calculator to find your maximum, then consider whether a lower target better fits your overall financial plan."
workedExamples:
  - title: "Family earning $100K with $50K down"
    inputs:
      annualIncome: 100000
      monthlyDebt: 600
      downPayment: 50000
      interestRate: 6.75
      loanTerm: 30
    description: "Gross monthly income is $8,333. At a 36% DTI limit, maximum total debt payments are $3,000/month. Subtracting $600 in existing debts leaves $2,400 for housing. After accounting for estimated taxes ($332/month at 1.2%), insurance ($125/month), and PMI ($117/month — down payment is 15.1%), the available P&I budget is about $1,826. That supports a loan of approximately $282,000, putting the maximum home price at roughly $332,000."
  - title: "Single earner with $80K salary and no debt"
    inputs:
      annualIncome: 80000
      monthlyDebt: 0
      downPayment: 40000
      interestRate: 6.75
      loanTerm: 30
    description: "With $80,000 income and zero existing debt, the full 36% DTI allocation ($2,400/month) goes toward housing. After property tax (~$323/month), insurance ($125/month), and PMI ($118/month — down payment is 12.4% of the home price), approximately $1,834 is available for P&I. This supports a loan of around $283,000, giving a max home price of about $323,000 with the $40,000 down payment. No debt is a significant advantage — compare this to the default scenario where $500/month in debts reduces buying power by over $60,000."
  - title: "High income couple, 15-year mortgage"
    inputs:
      annualIncome: 200000
      monthlyDebt: 800
      downPayment: 100000
      interestRate: 6.0
      loanTerm: 15
    description: "At $200,000 combined income, gross monthly is $16,667. A 36% DTI allows $6,000/month total, minus $800 existing debt leaves $5,200 for housing. After taxes ($605/month), insurance ($125/month), and PMI ($210/month — down payment is 16.5%), the available P&I budget is about $4,260. On a 15-year term this supports a loan near $505,000, giving a max home price around $605,000. The 15-year term saves roughly $200,000+ in total interest compared to 30 years."
---

## How Much House Can I Afford?

The answer depends on three things: how much you earn, how much you owe, and how much you have saved for a down payment. This calculator works backward from your income to find the maximum home price that fits within standard lending guidelines.

The starting point is your **debt-to-income ratio (DTI)** — the percentage of your gross monthly income that goes toward debt payments. Most lenders cap this at 36-43%, though the traditional guideline is 36%.

> **Key takeaway:** Your income sets the ceiling. Your existing debts and down payment determine where within that ceiling you land. Paying off a $300/month car loan can add $40,000+ to your home buying budget.

## The 28/36 Rule Explained

<div class="stat-highlight">
  <span class="stat-number">28%</span>
  <span class="stat-text">of gross income is the recommended maximum for housing costs (PITI). The 36% cap includes all debt.</span>
</div>

Lenders use two ratios to evaluate mortgage applications:

- **Front-end ratio (28%):** Your total housing costs — mortgage principal, interest, property taxes, insurance, HOA, and PMI — should not exceed 28% of your gross monthly income.
- **Back-end ratio (36%):** Your total monthly debt payments (housing + car loans, student loans, credit cards, etc.) should stay below 36% of gross income.

Some lenders approve borrowers at 43% or even 50% DTI for "qualified mortgages" under government rules. But a higher DTI means less margin for error — one unexpected expense can strain your budget.

This calculator defaults to 36% but lets you adjust the limit to match what your lender allows. For a conservative estimate, try 28%.

## What Goes Into the Calculation

The calculator follows this sequence:

1. **Maximum monthly housing budget** = (Gross monthly income x DTI limit) minus existing monthly debt
2. **Subtract fixed costs** from that budget: property taxes, insurance, PMI (if applicable), and HOA fees
3. **The remainder** is available for principal and interest (P&I)
4. **Work backward** from the P&I amount using the standard mortgage formula to find the maximum loan amount
5. **Add your down payment** to get the maximum home price

Because PMI depends on the loan amount (which depends on PMI), the calculator iterates until the numbers converge.

> **Tip:** Small changes in interest rate have a big impact. A 0.5% rate increase on a $300,000 loan reduces your buying power by roughly $20,000-$25,000.

## Common Mistakes When Estimating Affordability

1. **Using net income instead of gross.** Lenders calculate DTI using gross (pre-tax) income, not take-home pay. Your actual cash flow is lower, so what a lender approves may feel tight.
2. **Forgetting about property taxes and insurance.** In some areas, property taxes add $400-$800/month to the payment. Always factor these in — they reduce the amount available for the actual mortgage.
3. **Ignoring PMI.** With less than 20% down, PMI can cost $100-$300/month. That directly reduces how much loan you can support.
4. **Buying at the maximum.** Lender approval is a ceiling, not a recommendation. Staying 10-15% below your maximum leaves room for home maintenance, retirement savings, and life.

## Down Payment and PMI

A 20% down payment avoids PMI entirely. But saving 20% of a $400,000 home ($80,000) takes years for most people. Here is how different down payments affect affordability on an $80,000 income:

| Down Payment | Down % (est.) | PMI/month | Max Home Price |
|---|---|---|---|
| $20,000 | ~7% | ~$115 | ~$295,000 |
| $40,000 | ~13% | ~$95 | ~$330,000 |
| $60,000 | ~19% | ~$35 | ~$365,000 |
| $70,000 | 20%+ | $0 | ~$375,000 |

The table shows that each additional $20,000 saved adds roughly $30,000-$40,000 in buying power — partly from the larger down payment itself and partly from reduced or eliminated PMI.

## When to Use This Calculator

Use the mortgage affordability calculator when you are:

- **Starting to house-hunt** and need a realistic price range before contacting agents
- **Deciding how much to save** for a down payment and want to see the trade-offs
- **Comparing 15-year vs 30-year** terms to see which fits your budget
- **Weighing whether to pay off debt first** — test how eliminating a car payment changes your max home price

Once you know your maximum, use the [Mortgage Payment Calculator](/tools/debt-and-loans/mortgage-payment/) to explore specific home prices, see amortization schedules, and test extra payment scenarios.
