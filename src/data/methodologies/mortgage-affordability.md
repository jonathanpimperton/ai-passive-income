---
title: "How We Calculate: Mortgage Affordability"
slug: "mortgage-affordability"
toolSlug: "mortgage-affordability"
formula: "Max Home Price = (Monthly Income × Front-End DTI Ratio) / (Monthly Payment per $1 of Loan + Property Tax Rate/12 + Insurance/12 + PMI/12)"
variables:
  - name: "Annual Gross Income"
    description: "Total pre-tax household income used to determine borrowing capacity"
  - name: "Monthly Debts"
    description: "Existing monthly obligations (car loans, student loans, credit cards, etc.)"
  - name: "Down Payment"
    description: "Cash available upfront, expressed as a percentage of the home price"
  - name: "Interest Rate"
    description: "Annual mortgage interest rate, converted to monthly (rate / 12)"
  - name: "Loan Term"
    description: "Mortgage duration in years (typically 15 or 30)"
  - name: "Front-End DTI Ratio"
    description: "Maximum percentage of gross income spent on housing costs (typically 28%)"
  - name: "Back-End DTI Ratio"
    description: "Maximum percentage of gross income spent on all debts including housing (typically 36%)"
  - name: "Property Tax Rate"
    description: "Annual property tax as a percentage of home value (varies by location, ~1% average)"
  - name: "Homeowner's Insurance"
    description: "Annual insurance premium estimate"
  - name: "PMI Rate"
    description: "Private mortgage insurance, required when down payment is below 20% (~0.5-1% of loan annually)"
assumptions:
  - "Lenders use the lower of front-end and back-end DTI constraints to determine maximum loan amount"
  - "Front-end DTI limit is 28% of gross monthly income (housing costs only)"
  - "Back-end DTI limit is 36% of gross monthly income (all debts including housing)"
  - "PMI is required when down payment is below 20%, estimated at 0.7% of loan amount annually"
  - "Property tax and insurance are included in the monthly payment calculation"
  - "Fixed-rate mortgage with level payments over the full term"
  - "No HOA fees or other recurring housing costs are included"
limitations:
  - "Does not account for local property tax variation (rates range from 0.3% to 2.5%+ across US counties)"
  - "Does not factor in HOA fees, maintenance reserves, or utility costs"
  - "Does not model ARM (adjustable-rate mortgage) scenarios"
  - "Does not verify income or apply lender-specific credit score requirements"
  - "Actual lending decisions depend on credit score, employment history, and debt details not captured here"
  - "PMI rates vary by credit score and down payment — 0.7% is an average estimate"
  - "Does not account for closing costs, which typically add 2-5% of the home price"
dataSources:
  - name: "Consumer Financial Protection Bureau — Debt-to-Income Ratio"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/"
  - name: "Freddie Mac — Understanding Your Debt-to-Income Ratio"
    url: "https://myhome.freddiemac.com/buying/understanding-debt-to-income-ratio"
---

## What This Calculator Does

The mortgage affordability calculator answers "How much house can I afford?" by working backwards from your income and debts to find the maximum home price you can qualify for.

Unlike the mortgage payment calculator (which takes a home price and tells you the monthly payment), this calculator takes your financial profile and tells you the ceiling.

## The Two DTI Constraints

Lenders evaluate affordability using two debt-to-income (DTI) ratios:

**Front-End Ratio (28% guideline):** Your total monthly housing costs (principal, interest, property tax, insurance, and PMI if applicable) should not exceed 28% of your gross monthly income. This is the "housing ratio."

**Back-End Ratio (36% guideline):** Your total monthly debts — housing costs plus all other obligations like car payments, student loans, and credit card minimums — should not exceed 36% of gross monthly income. This is the "total debt ratio."

The calculator applies both constraints and uses the more restrictive one. If you have significant existing debts, the back-end ratio is usually the binding constraint.

## How the Calculation Works

1. Calculate the maximum allowable monthly housing payment from both DTI limits
2. Subtract estimated property tax, insurance, and PMI from that amount to get the available principal + interest payment
3. Work backwards from the monthly P&I payment to find the maximum loan amount using the standard amortization formula
4. Add the down payment to get the maximum home price

The monthly payment formula in reverse: Loan Amount = Monthly Payment × [(1 + r)^n - 1] / [r × (1 + r)^n], where r is the monthly rate and n is total months.

## How Each Variable Affects the Result

**Income:** The primary driver. Every $10,000 increase in annual income raises affordability by roughly $30,000-40,000 in home price, depending on rates and existing debts.

**Monthly Debts:** Directly reduces affordability through the back-end DTI constraint. A $400/month car payment can reduce your maximum home price by $100,000+.

**Down Payment:** A higher percentage means less needs to be borrowed, and at 20%+, PMI is eliminated. Both effects increase the maximum home price.

**Interest Rate:** Small rate changes have outsized effects. At 6.5%, $2,000/month in P&I supports a ~$316K loan. At 7.5%, the same payment supports only ~$287K — a $29,000 difference from just 1% more.

**Property Tax Rate:** Higher tax rates eat into the monthly budget, reducing the loan amount. The difference between a 0.5% and 2% tax rate can shift affordability by $50,000+.

## The 28/36 Rule Isn't Universal

The 28/36 guideline is the conventional standard, but actual lending varies:

- FHA loans allow back-end DTI up to 43% (sometimes 50% with compensating factors)
- VA loans have no front-end DTI limit
- Some conventional lenders allow up to 45% back-end DTI with strong credit and reserves
- The calculator defaults to 28/36 because it represents sustainable, comfortable affordability — not the maximum a lender might approve

Being approved for more than the 28/36 guideline doesn't mean it's wise. The calculator's conservative defaults are intentional: they leave room for maintenance, emergencies, and living expenses that mortgage qualification doesn't account for.
