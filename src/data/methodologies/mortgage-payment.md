---
title: "How We Calculate: Mortgage Payment"
slug: "mortgage-payment"
toolSlug: "mortgage-payment"
formula: "Total Monthly = P&I + Property Tax + Insurance + PMI + HOA"
variables:
  - name: "P&I (Principal & Interest)"
    description: "Calculated using the standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1], where P is the loan amount (home price minus down payment), r is the monthly interest rate, and n is total months"
  - name: "Property Tax"
    description: "Annual property tax (home price × tax rate %) divided by 12"
  - name: "Home Insurance"
    description: "Annual homeowners insurance premium divided by 12"
  - name: "PMI"
    description: "Private Mortgage Insurance — required when down payment is below 20%, calculated as a percentage of the loan amount divided by 12"
  - name: "HOA"
    description: "Monthly Homeowners Association fee (if applicable)"
  - name: "Extra Payment"
    description: "Optional additional monthly amount applied directly to principal"
assumptions:
  - "The mortgage has a fixed interest rate for the entire term"
  - "Property tax rate is applied to the original home price (does not account for reassessment)"
  - "PMI is required when the down payment is less than 20% of the home price"
  - "PMI rate defaults to 0.5% of the loan amount annually"
  - "Home insurance is a fixed annual premium"
  - "Extra payments reduce principal immediately each month"
  - "No escrow shortages or adjustments"
limitations:
  - "Does not model adjustable-rate mortgages (ARM)"
  - "Property tax is static — real property taxes change as assessed values change"
  - "Does not account for PMI cancellation when equity reaches 20% (most lenders remove PMI at this threshold)"
  - "Insurance premiums are treated as constant — they typically increase annually"
  - "Does not include closing costs, points, or origination fees"
  - "Does not model mortgage interest tax deduction"
  - "HOA fees are static — they often increase annually"
dataSources:
  - name: "Consumer Financial Protection Bureau — Mortgage Estimates"
    url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/"
  - name: "Freddie Mac — Understanding Your Mortgage"
    url: "https://myhome.freddiemac.com/buying/understanding-your-mortgage"
---

## What This Formula Does

The mortgage payment calculator builds on the standard loan amortization formula but adds the costs that mortgage borrowers actually pay each month beyond principal and interest. Your real monthly housing payment includes property tax, insurance, and potentially PMI and HOA fees.

The core principal-and-interest calculation uses the same formula as the loan amortization calculator. But unlike a generic loan calculator, this one starts with the home price and down payment percentage to derive the loan amount automatically, and then layers on the additional monthly costs.

## How Each Variable Affects the Result

**Home Price and Down Payment:** These together determine your loan amount. A larger down payment means a smaller loan, which reduces both the P&I payment and the total interest over the loan's life. Putting down 20% or more also eliminates PMI.

**Interest Rate:** The largest single factor in your monthly cost after the loan amount itself. On a $350,000 home with 20% down, the difference between 5.5% and 7.0% is about $280/month — over $100,000 in total interest over 30 years.

**Property Tax Rate:** Varies dramatically by location. Some areas charge 0.5% of home value annually; others charge over 2.5%. This alone can add $300-700/month to your payment on a typical home.

**PMI:** Adds cost when your equity is below 20%. At a 0.5% rate on a $280,000 loan, PMI costs about $117/month. This is money that builds no equity — it protects the lender, not you.

**Loan Term:** The calculator supports terms from 1 to 50 years. A 15-year mortgage has a higher monthly payment than a 30-year but saves a substantial amount in total interest — often 50-60% less.

## The Full Amortization Schedule

The calculator generates a year-by-year amortization schedule showing how each payment divides between principal and interest. Years are collapsible to reveal monthly detail. This makes the interest front-loading visible: in a typical 30-year mortgage, you won't pay more principal than interest in a single month until roughly year 18-20.

## Extra Payments

Adding extra monthly payments directly reduces your principal. The calculator shows exactly how much interest you save and how many months earlier the loan pays off. Even modest extra payments — $100-200/month — can shave years off a 30-year mortgage.

## Common Misconceptions

The most dangerous misconception is thinking the interest rate is the only thing that matters. Two mortgages with the same rate can have very different true costs depending on property tax, insurance, and PMI. Always compare the total monthly payment, not just the P&I.

Another mistake is ignoring PMI. Some buyers stretch to put 10% down without realizing they'll pay PMI for years. In some cases, it's worth waiting to save a full 20% down payment to avoid this cost entirely.

## Why This Calculator Exists

Buying a home is the largest financial commitment most people make. Knowing your true monthly cost — not just the advertised P&I — is essential for budgeting and for comparing properties in different tax jurisdictions. This calculator shows the complete picture.
