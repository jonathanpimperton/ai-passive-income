---
name: "Mortgage Payment Calculator"
slug: "mortgage-payment"
category: "debt-and-loans"
description: "Calculate your monthly mortgage payment, total interest paid, and full amortization schedule. See how extra payments save you thousands — free, no signup."
keywords:
  - "mortgage calculator"
  - "mortgage payment calculator"
  - "home loan calculator"
  - "monthly mortgage payment"
  - "how much house can I afford"
  - "mortgage amortization"
  - "mortgage interest calculator"
affiliateContext: "Compare mortgage rates from top lenders"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
relatedTools:
  - "loan-amortization"
  - "rent-vs-buy"
  - "savings-goal"
  - "compound-interest"
  - "salary-us"
faq:
  - question: "How is a monthly mortgage payment calculated?"
    answer: "The standard formula is M = P[r(1+r)^n]/[(1+r)^n – 1], where P is the loan principal, r is the monthly interest rate (annual rate ÷ 12), and n is the total number of payments (years × 12). On a $300,000 loan at 7% for 30 years, the monthly principal and interest payment is $1,996. This doesn't include property taxes, homeowners insurance, or PMI, which can add $300-$800/month."
  - question: "What is included in a mortgage payment?"
    answer: "A full mortgage payment (often called PITI) includes four components: Principal (paying down the loan balance), Interest (the cost of borrowing), Taxes (property taxes, usually escrowed), and Insurance (homeowners insurance, also usually escrowed). If your down payment is less than 20%, you'll also pay PMI (Private Mortgage Insurance), typically 0.5-1% of the loan amount per year."
  - question: "How much does an extra payment save on a mortgage?"
    answer: "Extra payments can save tens of thousands in interest. For example, on a $300,000 mortgage at 7% for 30 years, adding just $200/month to your payment saves approximately $76,000 in total interest and pays off the loan 6 years early. Even one extra payment per year (splitting monthly payment into biweekly payments) can shave 4-5 years off a 30-year mortgage."
  - question: "What is the difference between a 15-year and 30-year mortgage?"
    answer: "A 15-year mortgage has higher monthly payments but significantly lower total interest. On a $300,000 loan at 6.5% (30-year) vs 5.75% (15-year, typically lower rate): the 30-year payment is $1,896/month with $382,633 total interest. The 15-year payment is $2,494/month ($598 more) but total interest is only $148,858 — saving you $233,775. The 15-year builds equity much faster."
  - question: "How much house can I afford?"
    answer: "A common guideline is the 28/36 rule: spend no more than 28% of gross monthly income on housing costs (mortgage + taxes + insurance) and no more than 36% on total debt payments. On a $100,000 household income, that's a maximum housing payment of roughly $2,333/month. At 7% interest with 20% down, that supports approximately a $350,000 home. Lenders may approve more, but stretching beyond 28% leaves less buffer for other expenses."
  - question: "Should I pay points to lower my mortgage rate?"
    answer: "Each discount point costs 1% of the loan amount and typically reduces the rate by 0.25%. On a $300,000 loan, one point costs $3,000 and saves about $50/month at current rates. The break-even point is 60 months (5 years). If you plan to stay in the home longer than 5 years, paying points usually saves money long-term. If you might sell or refinance sooner, skip the points."
workedExamples:
  - title: "Monthly payment on a $350,000 home with 20% down"
    inputs:
      homePrice: 350000
      downPayment: 20
      interestRate: 7.0
      loanTerm: 30
    description: "Home price $350,000 with 20% down ($70,000) gives a $280,000 loan. At 7% fixed for 30 years: monthly P&I is $1,863. Total interest over 30 years: $390,453 — more than the original loan amount. Adding estimated taxes ($292/month) and insurance ($146/month), the full monthly payment is approximately $2,301."
  - title: "Comparing 15-year vs 30-year mortgage"
    inputs:
      loanAmount: 300000
      interestRate15: 5.75
      interestRate30: 6.5
    description: "On a $300,000 loan: the 30-year at 6.5% costs $1,896/month with $382,633 total interest. The 15-year at 5.75% costs $2,494/month with $148,858 total interest. The 15-year costs $598 more per month but saves $233,775 in interest. After 10 years, the 15-year loan has $126,000 remaining balance vs $237,000 on the 30-year."
  - title: "Impact of extra payments"
    inputs:
      loanAmount: 280000
      interestRate: 7.0
      loanTerm: 30
      extraMonthlyPayment: 300
    description: "A $280,000 loan at 7% for 30 years has a base payment of $1,863/month. Adding $300/month extra toward principal: the loan is paid off in 22.5 years instead of 30 (7.5 years early), saving approximately $108,000 in total interest. The total cost drops from $670,814 to $562,470."
---

Educational content will be added during Sprint 4.
