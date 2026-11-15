---
title: "How We Calculate: Mortgage Payment"
slug: "mortgage-payment"
toolSlug: "mortgage-payment"
formula: "US: Total Monthly = P&I + Property Tax + Insurance + PMI. UK and euro area: Total Monthly = P&I only (tax, insurance and PMI are not modelled)."
variables:
  - name: "P&I (Principal & Interest)"
    description: "Calculated using the standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1], where P is the loan amount (home price minus down payment), r is the monthly interest rate (annual rate / 12), and n is total months"
  - name: "Property Tax (US only)"
    description: "Annual property tax (home price × tax rate %) divided by 12. Default rate 1.0%, adjustable from 0% to 5%"
  - name: "Home Insurance (US only)"
    description: "Annual homeowners insurance premium divided by 12. Default $1,800 a year"
  - name: "PMI (US only)"
    description: "Private mortgage insurance: PMI rate × original loan amount / 12, charged only while the down payment is below 20% of the price. Default 0.6% a year, adjustable from 0% to 2%"
  - name: "Extra Payment"
    description: "Optional additional monthly amount applied directly to principal"
  - name: "Interest Rate"
    description: "Annual fixed rate. The default is a published market benchmark for your region (see UK / EUR Mode below); type your own quote to replace it"
assumptions:
  - "The mortgage has a fixed interest rate for the entire term, compounded monthly (annual rate / 12)"
  - "Loan terms are chosen from preset buttons: 15, 20 or 30 years for USD; 20, 25, 30 or 35 years for GBP; 20, 25 or 30 years for EUR"
  - "Property tax is applied to the original home price and stays the same for the whole term. Real property taxes change as assessed values change"
  - "PMI applies when the down payment is below 20% of the home price, and is charged on the original loan amount"
  - "The default PMI rate is 0.6% of the loan a year, the midpoint of Freddie Mac's range of $30 to $70 a month per $100,000 borrowed (0.36% to 0.84% a year). You can change it"
  - "Home insurance is a fixed annual premium held constant for the whole term. Real premiums typically rise"
  - "Extra payments reduce principal immediately each month, and the last payment is capped at the balance remaining"
  - "In GBP and EUR mode, property tax, insurance and PMI are all zero"
limitations:
  - "Does not model adjustable-rate mortgages (ARM)"
  - "PMI is shown as a flat monthly figure and is not removed when equity reaches 20% (most lenders drop it at that point, which makes the real payment lower later)"
  - "Does not include HOA fees, closing costs, points, or origination fees"
  - "Does not model the mortgage interest tax deduction"
  - "UK and euro-area lenders' product fees, valuation and legal costs are not included"
dataSources:
  - name: "Consumer Financial Protection Bureau: Loan Estimate explainer"
    url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/"
  - name: "Freddie Mac: Breaking down private mortgage insurance (PMI rate range)"
    url: "https://myhome.freddiemac.com/buying/breaking-down-pmi"
  - name: "Freddie Mac: Primary Mortgage Market Survey (US default rate)"
    url: "https://www.freddiemac.com/pmms"
---

## What This Formula Does

The mortgage payment calculator builds on the standard loan amortization formula. In US mode it adds the costs a borrower pays each month beyond principal and interest: property tax, insurance, and PMI when the down payment is small. In UK and euro mode it shows principal and interest only.

The core principal-and-interest calculation is the same one the loan amortization calculator uses (both read one shared engine, so the two tools cannot disagree). The difference is the starting point: this calculator takes a home price and a down payment percentage, derives the loan amount, and then layers on the extra monthly costs.

## How Each Variable Affects the Result

**Home Price and Down Payment:** Together these set the loan amount. A larger down payment means a smaller loan, which reduces both the P&I payment and total interest. In the US, putting down 20% or more also removes PMI.

**Interest Rate:** The largest single factor after the loan amount. On a $350,000 home with 20% down (a $280,000 loan), 5.5% instead of 7.0% over 30 years is {{ loanPayment(280000, 7, 30) - loanPayment(280000, 5.5, 30) | usd }} a month lower ({{ loanPayment(280000, 5.5, 30) | usd(2) }} against {{ loanPayment(280000, 7, 30) | usd(2) }}), and {{ loanTotalInterest(280000, 7, 30) - loanTotalInterest(280000, 5.5, 30) | usd }} less interest over the term.

**Property Tax Rate (US):** Varies by location, so the calculator lets you set it from 0% to 5%. On a $350,000 home, a 0.5% rate is {{ 350000 * 0.5 / 100 / 12 | usd }} a month and a 2.5% rate is {{ 350000 * 2.5 / 100 / 12 | usd }} a month. Check your county assessor for the real rate.

**PMI (US):** Adds cost when your down payment is below 20%. At the default 0.6% rate on a $280,000 loan, PMI is {{ 280000 * 0.6 / 100 / 12 | usd }} a month. The calculator shows PMI only when your down payment is under 20%, and the rate is an input, so use the quote from your lender. This money builds no equity: it protects the lender, not you.

**Loan Term:** A 15-year mortgage has a higher monthly payment than a 30-year one but costs far less in interest. On a $280,000 loan at 7% the 15-year payment is {{ loanPayment(280000, 7, 15) | usd }} a month against {{ loanPayment(280000, 7, 30) | usd }}, and total interest is {{ loanTotalInterest(280000, 7, 15) | usd }} against {{ loanTotalInterest(280000, 7, 30) | usd }}, which is {{ (1 - loanTotalInterest(280000, 7, 15) / loanTotalInterest(280000, 7, 30)) * 100 | pct }} less. (At the same rate. In practice 15-year loans are usually quoted at a lower rate than 30-year loans, which widens the gap.)

## UK / EUR Mode

The calculator follows the currency selector. Choosing GBP or EUR changes four things:

- **No tax, insurance or PMI.** Property tax, insurance and PMI are US concepts. In GBP and EUR mode they are set to zero and hidden, and the headline is the principal-and-interest payment only. Council tax, buildings insurance and any service charge are not included.
- **Loan terms.** The preset term buttons are 20, 25, 30 and 35 years for GBP and 20, 25 and 30 years for EUR. UK mode starts at 25 years, the others at 30.
- **Default rate.** The starting rate is a published benchmark, and the source and date are shown beside the rate. For USD it is the Freddie Mac PMMS weekly average (the 15-year average for terms of 15 years or less, otherwise the 30-year average). For GBP it is the Bank of England's average quoted 2-year fixed rate at 75% loan-to-value. For EUR it is the ECB's composite cost of borrowing for house purchase. These are starting points, not quotes. Type your own rate to replace them.
- **Labels.** "Down payment" becomes "Deposit" and "Amortization Schedule" becomes "Repayment Schedule" for GBP.

## The Full Amortization Schedule

The calculator generates a year-by-year schedule showing how each payment divides between principal and interest. Years are collapsible to reveal monthly detail. This makes the front-loading of interest visible: on a 30-year loan at 7%, the first month in which you pay more principal than interest is month {{ loanCrossoverMonth(280000, 7, 30) | int }}, which is in the year {{ loanCrossoverMonth(280000, 7, 30) / 12 | ceil | int }} row of the schedule.

## Extra Payments

Adding an extra monthly payment reduces your principal directly. The calculator shows how much interest you save and how many months earlier the loan is repaid. On a $280,000 loan at 7% over 30 years, an extra $200 a month saves {{ overpaymentSaving(280000, 7, 30, monthly=200).interestSaved | usd }} in interest and clears the loan {{ overpaymentSaving(280000, 7, 30, monthly=200).monthsSaved | months }} early.

## Common Misconceptions

The most dangerous misconception is that the interest rate is the only thing that matters. Two mortgages at the same rate can have very different true costs once property tax, insurance, and PMI are included. Compare the total monthly payment, not only P&I.

Another mistake is ignoring PMI. Some buyers stretch to put 10% down without realising they will pay PMI for years. On a $350,000 home with 10% down, PMI at 0.6% adds {{ 350000 * 0.9 * 0.6 / 100 / 12 | usd(2) }} a month on top of the P&I. In some cases it is worth waiting to save a full 20% down payment.
