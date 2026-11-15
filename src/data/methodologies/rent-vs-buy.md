---
title: "How We Calculate: Rent vs. Buy"
slug: "rent-vs-buy"
toolSlug: "rent-vs-buy"
formula: "Compare net worth at the end of the horizon, starting from equal cash. Buyer = home value × (1 − selling costs) − loan balance + buyer's portfolio. Renter = renter's portfolio. Whichever path costs less each month invests the difference. Advantage = Buyer − Renter."
variables:
  - name: "Home Price"
    description: "Purchase price of the home"
  - name: "Down Payment %"
    description: "Percentage of the price paid upfront (sets the loan amount)"
  - name: "Mortgage Rate"
    description: "Annual fixed mortgage interest rate, compounded monthly. The default is a published market benchmark for the region"
  - name: "Loan Term"
    description: "Mortgage length in years (slider from 10 to 35)"
  - name: "Buying Costs"
    description: "Costs of purchase as a percentage of the price (closing costs; in the UK, stamp duty and fees). Default 3% in the US, 0% in the UK and euro area"
  - name: "Selling Costs"
    description: "Costs of selling at the end of the horizon, as a percentage of the sale price. Default 6% in the US, 0% in the UK and euro area"
  - name: "Property Tax Rate"
    description: "Annual property tax (UK/EUR mode: council tax and other annual charges) as a percentage of the purchase price. Default 1.0%"
  - name: "Home Insurance"
    description: "Annual homeowners insurance premium. Default $1,800"
  - name: "HOA"
    description: "Monthly homeowners association fee (UK/EUR mode: service charge or ground rent)"
  - name: "Maintenance Rate"
    description: "Annual maintenance cost as a percentage of the purchase price. Default 1%"
  - name: "Home Appreciation"
    description: "Expected annual home price growth. Default 3%"
  - name: "Monthly Rent"
    description: "Current monthly rent"
  - name: "Rent Increase"
    description: "Annual rent increase percentage, applied at the end of each year. Default 3%"
  - name: "Renters Insurance"
    description: "Monthly renters insurance cost"
  - name: "Investment Return"
    description: "Annual return on invested cash, compounded monthly. Default 7%"
  - name: "Marginal Tax Rate (US)"
    description: "Combined federal and state rate applied to deductions that exceed the standard deduction"
  - name: "Filing Status, State and Local Income Tax, Other Itemized Deductions (US)"
    description: "Inputs to the itemising test: filing status sets the standard deduction; state and local income tax shares the SALT cap with property tax; other deductions are ones you have anyway"
  - name: "Time Horizon"
    description: "Whole years to compare both paths (1 to 30)"
assumptions:
  - "The mortgage has a fixed rate and the term you choose"
  - "Both households start with the same cash: the down payment plus the buyer's purchase costs. The buyer spends it on the purchase and the renter invests all of it"
  - "Every month both households spend the same total on housing. Whichever path is cheaper that month invests the difference, so a buyer with a surplus invests it as well"
  - "Investment returns compound monthly at annual % / 12, and the investments are treated as tax-sheltered"
  - "Rent rises at a constant annual rate, applied at the end of each year"
  - "Home value rises at a constant annual rate"
  - "Property tax and maintenance are percentages of the original purchase price. Insurance, HOA and renters insurance are flat amounts"
  - "Buyer's net worth at the end of the horizon is home value, less selling costs, less the remaining loan balance, plus the buyer's portfolio"
  - "US only: mortgage interest and property tax save tax only to the extent that itemising beats the standard deduction for the chosen filing status. Property tax and state income tax share the $40,400 SALT cap for 2026"
  - "UK and euro area: no mortgage interest tax relief is modelled (the UK abolished it in 2000)"
  - "No PMI is modelled, whatever the down payment"
  - "No capital gains tax on the home sale (the US main-home exclusion, UK private residence relief)"
limitations:
  - "UK and euro area buying and selling costs start at 0% because they vary too much to give one honest default. Add yours under Advanced Settings, or the comparison favours buying. Stamp duty can be taken from the stamp duty calculator"
  - "The standard deduction is held at today's amount and the SALT cap phase-down above $505,000 of income is not modelled"
  - "Property tax and insurance are not adjusted for home appreciation"
  - "Does not model rent control or lease-specific terms"
  - "Does not account for the non-financial value of owning a home, or the flexibility of renting"
  - "Maintenance is averaged, but real maintenance is lumpy: a new roof costs thousands every 20 years or so"
  - "Does not model home equity loans, HELOCs or refinancing"
  - "Ignores capital gains tax on the sale above the US exclusion ($250,000 single, $500,000 married filing jointly) and on investment gains"
dataSources:
  - name: "Freddie Mac: What are closing costs and how much will I pay? (buying cost range)"
    url: "https://myhome.freddiemac.com/blog/homebuying/what-are-closing-costs-and-how-much-will-i-pay"
  - name: "Freddie Mac: Costs of selling a home (agent commission range)"
    url: "https://myhome.freddiemac.com/selling/costs-of-selling"
  - name: "Cornell Law School LII: 26 U.S.C. 164 (SALT deduction cap)"
    url: "https://www.law.cornell.edu/uscode/text/26/164"
  - name: "IRS Topic 701: Sale of your home (main-home gain exclusion)"
    url: "https://www.irs.gov/taxtopics/tc701"
  - name: "Federal Reserve Bank of Philadelphia Working Paper 24-12 (long-run US house prices)"
    url: "https://www.philadelphiafed.org/-/media/FRBP/Assets/working-papers/2024/wp24-12.pdf"
  - name: "Zillow Research: housing data"
    url: "https://www.zillow.com/research/data/"
  - name: "Bureau of Labor Statistics: Consumer Price Index (rent CPI)"
    url: "https://www.bls.gov/cpi/"
---

## What This Calculator Does

The rent vs. buy calculator runs a month-by-month simulation of two households that start with the same cash and spend the same amount on housing each month, then compares what each is worth at the end of the time horizon.

The buyer spends the down payment and purchase costs on a home and pays the mortgage, property tax, insurance, maintenance and any HOA. The renter invests the same starting cash and pays rent and renters insurance. Each month, whichever household has the lower housing cost invests the difference, so both always put the same total amount of money into housing and investing.

At the end of the horizon the calculator compares net worth:

- **Buyer:** home value, minus selling costs, minus the remaining loan, plus the buyer's investment portfolio (non-zero only if renting would have cost more in some months).
- **Renter:** the renter's investment portfolio.

The difference between the two is the verdict. If the cash flows were identical the difference would be exactly zero. An earlier version of this model counted the down payment twice and let only the renter invest, which tilted the answer toward renting. The current rule compares like with like.

## How the Simulation Works

Each month the simulation tracks:

**Buy path:** the mortgage payment (principal and interest), property tax, insurance, HOA and maintenance, less any tax saving (US only). The loan balance falls as principal is repaid and the home value rises with appreciation.

**Rent path:** rent (raised once a year) plus renters insurance. The renter's portfolio starts with the full starting cash and grows monthly.

**The gap:** if buying costs more this month than renting, the renter invests the gap. If renting costs more, the buyer invests the gap. Both portfolios earn the investment return.

The **break-even year** is the first year from which buying stays ahead to the end of the horizon. If renting is ahead at the horizon, the calculator also checks whether buying would pull ahead if you stayed up to 50 years, and says which year.

## Worked Example (UK)

Property price £350,000; deposit 20% (£70,000); mortgage rate 5.5% over 25 years; buying costs 3% (£10,500); selling costs 2%; property charges 0%; buildings insurance £400 a year; maintenance 1% a year; home price growth 3%; rent £1,400 a month, rising 3% a year; contents insurance £10 a month; investment return 7%; horizon 10 years.

- Both households start with £80,500: the £70,000 deposit plus the £10,500 of buying costs.
- First month: the buyer pays £2,044.44 (a £1,719.44 mortgage payment plus £325 of insurance and maintenance). The renter pays £1,410. The buyer's monthly cost stays above the renter's for all 10 years, so the renter invests the difference every month and the buyer's portfolio stays at zero.
- After 10 years the home is worth £470,371. Selling costs are £9,407 and the remaining loan is £210,437, so the buyer's net worth is £250,526.
- The renter's portfolio is £241,246.
- Buying is ahead by £9,280, and buying stays ahead from year 8.

The horizon matters. At 3 years the renter is ahead by £11,275 and at 5 years by £6,342. Buying is ahead by £2,416 at 8 years, £30,720 at 15 years and £98,191 at 25 years. Without any buying or selling costs, the same example shows buying ahead by £39,789 from the first year, so the costs of moving in and out are what make short stays favour renting.

## US Mode: The Deduction Test

In US mode, mortgage interest and property tax save tax only if your itemised deductions beat the standard deduction. For each year the calculator compares:

- With the home: the larger of the standard deduction, or other itemised deductions + mortgage interest + the smaller of (property tax + state and local income tax) and the SALT cap.
- Without the home: the larger of the standard deduction, or other itemised deductions + the smaller of state and local income tax and the SALT cap.

The saving is your marginal rate times the difference. Example: with a 2026 single-filer standard deduction of $16,100, $18,000 of first-year interest and $3,500 of property tax, itemised deductions are $21,500 and the home adds {{ (18000 + 3500 - 16100) * 22 / 100 | usd }} of tax saving at a 22% rate. In a later year with $9,000 of interest, itemising ($12,500) falls below the standard deduction and the saving is $0. The SALT cap for 2026 is $40,400 under 26 U.S.C. 164(b)(7) as amended by Public Law 119-21; the standard deduction used is the one for the tax year the rates module currently points at.

## UK / EUR Mode

Selecting GBP or EUR changes the model in these ways:

- **No tax deduction.** The mortgage interest deduction and the itemising test are switched off.
- **Labels.** Property tax becomes annual property charges (council tax and similar) and HOA becomes service charge or ground rent.
- **Transaction costs start at zero.** The US defaults of 3% to buy and 6% to sell (Freddie Mac suggests 2% to 5% for closing costs and 3% to 8% for agent commission) do not transfer to the UK or euro area, where stamp duty, transfer taxes and notary fees vary by price and country. A note under the result reminds you when either is zero.
- **Terms and rates.** UK mode starts at a 25-year term. The default mortgage rate is the regional benchmark: for GBP the Bank of England's average quoted 2-year fixed rate at 75% loan-to-value, for EUR the ECB composite cost of borrowing for house purchase. Type your own rate to replace it.

## How Each Variable Affects the Result

**Time Horizon:** The most influential input. Buying costs and selling costs are paid once, while equity builds slowly, so short stays tend to favour renting and long stays tend to favour buying (see the example above).

**Home Appreciation vs. Investment Return:** If investments return 10% and homes appreciate 3%, the renter's portfolio pulls ahead. If appreciation is 5% and investments return 6%, buying is more competitive. These two rates are the core tension in the comparison, and both are guesses.

**Rent Increase Rate:** If rent rises faster than inflation, renting becomes more expensive every year and the break-even moves earlier.

**Down Payment:** A larger down payment takes more cash out of investments (the opportunity cost) but means a smaller mortgage. The net effect depends on how the mortgage rate compares with the investment return.

**Transaction Costs:** Higher buying and selling costs push the break-even later. In the worked example above, at 5 years buying leads by £16,658 with no transaction costs and trails by £6,342 with them.

## Common Misconceptions

The biggest misconception is "rent is throwing money away". Rent pays for housing, which you need regardless. The real question is whether the non-equity costs of owning (interest, taxes, insurance, maintenance) are more or less than comparable rent. In expensive markets they often exceed it.

Another: "my home is an investment". For most people a primary residence is something you consume, not just invest in. You can't sell it without needing somewhere else to live. Long-run house price growth after inflation is modest: the Philadelphia Fed's 30-city series from 1890 has real prices reaching almost four times their 1890 level by 2006, a little over 1% a year, well below long-run stock market returns. The figure depends heavily on the period and index used.

## Why This Calculator Exists

"Should I rent or buy?" is one of the most consequential financial decisions people face, and the answer depends on local conditions, how long you will stay, and your circumstances. This calculator replaces gut feeling with a side-by-side comparison using your numbers, and shows the rule it uses so you can check it.
