---
title: "How We Calculate: Mortgage Affordability"
slug: "mortgage-affordability"
toolSlug: "mortgage-affordability"
formula: "US: Housing Payment Limit = min(28% × gross monthly income, 36% × gross monthly income − other monthly debts); Max Loan solved from that limit after tax, insurance, HOA and PMI; Max Price = Max Loan + Down Payment. UK: Max Loan = min(income multiple × income, loan whose payment at a stressed rate fits within 50% of take-home pay). Euro area: one combined payment limit as a share of gross income."
variables:
  - name: "Annual Gross Income"
    description: "Total pre-tax household income used to determine borrowing capacity"
  - name: "Monthly Debts"
    description: "Existing monthly obligations (car loans, student loans, credit card minimums, etc.). Default 500 for USD and EUR, 0 for GBP"
  - name: "Down Payment / Deposit"
    description: "Cash available upfront. It is added to the maximum loan to give the maximum price"
  - name: "Interest Rate"
    description: "Annual mortgage rate, converted to monthly (rate / 12). The default is a published market benchmark for the region, not a quote"
  - name: "Loan Term"
    description: "Mortgage duration. Buttons: 15 or 30 years for USD; 20, 25, 30 or 35 for GBP; 20, 25 or 30 for EUR"
  - name: "Housing Limit (Front-End DTI), US"
    description: "Maximum share of gross income spent on housing (P&I + property tax + insurance + HOA + PMI). Default 28%, adjustable 20% to 45%"
  - name: "All-Debt Limit (Back-End DTI), US"
    description: "Maximum share of gross income spent on housing plus all other debts. Default 36%, adjustable 28% to 50%"
  - name: "Property Tax Rate, US"
    description: "Annual property tax as a percentage of the home price. Default 1.0%"
  - name: "Homeowners Insurance, US"
    description: "Annual premium. Default $1,800"
  - name: "HOA Fees, US"
    description: "Monthly homeowners association fee. Default $0; counts toward the housing payment"
  - name: "PMI Rate, US"
    description: "Annual private mortgage insurance as a percentage of the loan, charged while the down payment is below 20% of the price. Default 0.6%"
  - name: "Income Multiple Cap, UK"
    description: "Maximum loan as a multiple of gross income. Default 4.5x, adjustable 4x to 5.5x"
  - name: "Stress Test Margin, UK"
    description: "Points added to the higher of your rate and the average lender revert-to rate. Default 1 point; 0 means no stress test"
  - name: "Max Share of Take-Home Pay, UK"
    description: "Ceiling on the stressed payment plus other commitments as a share of monthly take-home pay. Default 50%"
  - name: "Max Share of Gross Income, EUR"
    description: "Ceiling on the loan payment plus other debts as a share of gross income. Default 36%"
assumptions:
  - "Fixed-rate mortgage with level payments over the full term, compounded monthly"
  - "US: the housing payment is limited to the LOWER of 28% of gross monthly income and 36% of gross monthly income minus other debts. Both percentages are adjustable"
  - "US: the housing payment includes P&I, property tax (on the purchase price), insurance, HOA and PMI"
  - "US: PMI applies when the down payment is below 20% of the price, at 0.6% of the loan a year by default (the midpoint of Freddie Mac's $30 to $70 a month per $100,000 range)"
  - "US: the answer is calculated directly, not by repeated guessing, so the same inputs always give the same price"
  - "UK: the default income multiple is 4.5x, the level above which the Bank of England limits lenders' share of new lending. Most lenders still cap near it"
  - "UK: the stress test uses the higher of your product rate and the Bank of England's average revert-to rate, plus the margin. A margin of 0 checks the payment at your own rate, as for fixes of five years or more"
  - "UK: the stressed payment plus other commitments must stay within 50% of take-home pay. That is a budgeting guide from the government-backed MoneyHelper tool, not a lender rule"
  - "UK: take-home pay is estimated for one earner on standard rest-of-UK income tax and employee National Insurance, with no pension or student loan. Edit it for joint applicants, Scottish taxpayers or deductions"
  - "Euro area: one combined limit on the loan payment plus other debts, as a share of gross income"
  - "UK and euro area: property tax, insurance, HOA and PMI are not modelled"
limitations:
  - "Does not account for local property tax variation: the property tax rate is one flat input"
  - "Does not include maintenance, utilities or other ownership costs beyond HOA"
  - "Does not model ARM (adjustable-rate mortgage) scenarios"
  - "Does not verify income or apply lender-specific credit score requirements"
  - "Actual lending decisions depend on credit score, employment history, and debt details not captured here"
  - "PMI rates vary by credit score and down payment, and the calculator shows PMI as one flat rate until the down payment reaches 20%"
  - "Does not account for closing costs"
  - "28/36 is a rule of thumb. Real lenders set their own limits and many go higher, so the result is a budgeting guide and not a lending decision"
  - "UK: 4.5x is a market-wide limit and lenders' own criteria differ. Joint applications, bonuses and self-employed income are treated by lenders in ways the calculator does not model"
  - "Euro area: rules differ by country and several cap payments as a share of net income, so treat the 36% of gross income default as a single illustrative limit"
dataSources:
  - name: "Consumer Financial Protection Bureau: What is a debt-to-income ratio?"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/"
  - name: "HUD Housing Counselors Training, Module 2.1 Study Guide (28% front-end and 36% back-end guidelines)"
    url: "https://hudhousingcounselors.hud.gov/wp-content/uploads/2026/08/study-module-2-1.pdf"
  - name: "Fannie Mae Selling Guide B3-6-02: Debt-to-Income Ratios"
    url: "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios"
  - name: "Freddie Mac: Breaking down private mortgage insurance (PMI rate range)"
    url: "https://myhome.freddiemac.com/buying/breaking-down-pmi"
  - name: "Bank of England: High loan-to-income lending policy statement (PS19/26), October 2026"
    url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2026/october/high-loan-to-income-lending-policy-statement"
  - name: "FCA: Interest rate stress test rule (MCOB 11.6.18R)"
    url: "https://www.fca.org.uk/firms/interest-rate-stress-test-rule"
  - name: "GOV.UK: MoneyHelper mortgage affordability calculator, algorithmic transparency record"
    url: "https://www.gov.uk/algorithmic-transparency-records/money-and-pensions-service-mortgage-affordability-calculator"
---

## What This Calculator Does

The mortgage affordability calculator answers "How much house can I afford?" by working backwards from your income and debts to find the highest price that fits a set of rules. It uses a different set of rules depending on the currency you select: the US 28/36 guideline for USD, an income multiple plus a stress test for GBP, and one combined payment limit for EUR.

Unlike the mortgage payment calculator (which takes a price and tells you the monthly cost), this one takes your finances and tells you the ceiling.

## US Mode: The 28/36 Guideline

The calculator limits the monthly housing payment to the lower of two numbers:

**Front-end limit (28% of gross monthly income):** P&I, property tax, insurance, HOA and PMI together should not exceed 28% of gross monthly income.

**Back-end limit (36% of gross monthly income, minus other debts):** housing plus all other monthly debts should not exceed 36% of gross monthly income. The housing payment can use whatever is left after your debts.

Whichever limit is lower sets the budget. With high income and few debts the front-end limit binds. With larger debts the back-end limit binds. At $80,000 of income the two limits meet at {{ 80000 / 12 * (36 - 28) / 100 | usd }} of other debts a month: below that, extra debt changes nothing, and above it every extra dollar of debt takes a dollar off the housing budget.

28/36 is a rule of thumb, not a rule. HUD's housing counselor training says a front-end ratio of 28% is typically considered affordable for a conventional loan, and that the maximum back-end ratio for conventional loans was traditionally 36%, with limits that can rise to 45%. Lenders set their own limits, and the CFPB notes that DTI limits differ between lenders. Fannie Mae's Selling Guide sets only a total DTI limit (36% for manually underwritten loans, up to 45% with a stronger credit profile and reserves, and 50% for loans approved through its Desktop Underwriter system) and no separate housing-only limit. Being approved for more than 28/36 does not make a payment comfortable. Both percentages are adjustable in the calculator.

## How the US Calculation Works

1. Work out the housing budget: the lower of the front-end and back-end limits.
2. Subtract insurance and HOA, which are fixed monthly amounts.
3. The rest must cover principal and interest, property tax (a percentage of the price) and PMI (a percentage of the loan, if the down payment is under 20%). Because price = loan + down payment, this is a linear equation in the loan, and the calculator solves it directly.
4. PMI depends on the down payment as a share of the price, so the calculator solves the equation both with and without PMI. If the with-PMI solution still leaves you below 20% down, PMI applies. Otherwise the loan is the smaller of the no-PMI solution and the loan that gives exactly 20% down.
5. Add the down payment to the loan to get the maximum price.

The monthly payment formula in reverse: Loan Amount = Monthly Payment × [(1 + r)^n - 1] / [r × (1 + r)^n], where r is the monthly rate and n is total months.

If your debts alone use up the limit, the tool says nothing is affordable. If property tax, insurance and HOA alone exceed the budget, it says the costs exceed the budget.

## Worked Example (US)

Annual income $80,000; other debts $500 a month; down payment $40,000; rate 7%; 30 years; property tax 1.0%; insurance $1,800 a year; no HOA; PMI 0.6%; limits 28% and 36%.

- Gross monthly income is {{ 80000 / 12 | usd }}. The front-end limit is {{ 80000 / 12 * 28 / 100 | usd(2) }}. The back-end limit is {{ 80000 / 12 * 36 / 100 | usd }} minus $500 of debts, which is {{ 80000 / 12 * 36 / 100 - 500 | usd }}. The lower number sets the budget: the front-end limit, at {{ 80000 / 12 * 28 / 100 | usd(2) }}.
- Maximum loan: $210,776. Maximum price: $250,776. The down payment is about 16% of the price, so PMI applies.
- Monthly cost at that price: P&I $1,402.30, property tax $208.98, insurance {{ 1800 / 12 | usd(2) }}, PMI $105.39. Total $1,866.67, which is 28.0% of gross income. Counting the $500 of debts, total debt is 35.5% of gross income.

## How Each Variable Affects the Result

All the changes below start from the worked example above.

**Income:** The main driver. Adding $10,000 of annual income raises the maximum price from $250,776 to $279,993, about $29,200 more.

**Monthly Debts:** Debts matter only once the back-end limit binds. At $900 a month of debts the maximum price falls from $250,776 to $204,864, and at $1,200 a month it falls to $175,803 (the PMI also drops away at that point, because the lower price leaves a 20% down payment).

**Down Payment:** A larger down payment means less to borrow, and at 20% or more PMI disappears. With $80,000 down instead of $40,000, the maximum price rises from $250,776 to $300,401, with no PMI.

**Interest Rate:** Small rate changes have a large effect. A $2,000 monthly P&I budget supports a loan of {{ 2000 / loanPayment(100000, 6.5, 30) * 100000 | usd }} at 6.5% and {{ 2000 / loanPayment(100000, 7.5, 30) * 100000 | usd }} at 7.5%, a difference of {{ 2000 / loanPayment(100000, 6.5, 30) * 100000 - 2000 / loanPayment(100000, 7.5, 30) * 100000 | usd }}.

**Property Tax Rate:** A higher rate uses more of the budget. In the worked example, a 0.5% rate allows a maximum price of $264,580 and a 2.0% rate allows $227,081.

## UK Mode

When the currency is GBP, the calculator takes the smaller of two limits and reports both.

1. **Income multiple.** The loan cannot exceed the income multiple times gross income. The default is 4.5x. The Bank of England's Financial Policy Committee limits lenders to 15% of new mortgages at 4.5x income or more. Since 28 October 2026 that 15% applies to the market as a whole, not to each lender, so some lenders go higher. The calculator lets you set 4x to 5.5x.
2. **Stress test.** The monthly payment is checked at a stressed rate: the higher of your rate and the average revert-to (standard variable) rate, plus a margin (default 1 point). That payment plus any other commitments must not exceed 50% of monthly take-home pay. Set the margin to 0 for a fixed rate of five years or more, where lenders usually skip the stress test.

The take-home figure starts as an estimate for one earner on standard rest-of-UK income tax and National Insurance, and you can overwrite it. The calculator also flags a deposit under 5% of the price. A risk box labels the stressed payment "Comfortable" at or below 40% of take-home pay, "Stretched" up to 50%, and "High risk" above that. In US mode the same box uses your total debt ratio (28% or less comfortable, up to 36% moderate, above that high risk), and in euro mode the debt-service ratio with the same 28% and 36% cut-offs.

Worked example (UK): gross household income £60,000; take-home £3,600 a month entered by hand; no other commitments; deposit £40,000; rate 5% over 25 years; income multiple 4.5x; margin 1 point; 50% limit. The calculator fixes the revert-to rate at the Bank of England average, {{ rate('ukRevert') | pct(2) }} ({{ rateSource('ukRevert') }}), and the figures below use it.

- Income multiple limit: £270,000.
- Stressed rate: the higher of your 5% and the {{ rate('ukRevert') | pct(2) }} revert-to rate, plus 1 point, is {{ rate('ukRevert') + 1 | pct(2) }}. The stressed budget is 50% of £3,600 = £1,800 a month, which supports a loan of £241,870.
- The lower limit is the stress test, so the maximum loan is £241,870 and the maximum price is £281,870. The payment at your own 5% rate is £1,413.95 a month, 39.3% of take-home pay, and the stressed payment is £1,800.

## Euro-Area Mode

When the currency is EUR, one limit applies: the loan payment plus other debts as a share of gross income (default 36%). For example, with €60,000 income, a 3.5% rate, 25 years and no other debts, the payment budget is €1,800 a month, which supports a loan of €359,552. The calculator's default of 500 a month of other debts would cut that budget to €1,300 and the loan to €259,676. Euro-area rules vary by country, and several cap payments as a share of net income, so use this as a single illustrative limit.

## Why the Result Is a Ceiling, Not a Target

Being approved for a given amount does not make that amount wise. The defaults leave room for maintenance, emergencies, and everyday living costs that mortgage qualification does not count. Treat the result as an upper bound for the search, and set your own limits lower if you want more margin.
