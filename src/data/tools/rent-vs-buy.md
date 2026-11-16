---
name: "Rent vs Buy Calculator"
slug: "rent-vs-buy"
category: "debt-and-loans"
description: "Rent vs buy calculator: month-by-month net worth of buying and of renting and investing, the break-even year, closing and selling costs, US, UK and euro."
keywords:
  - "rent vs buy calculator"
  - "should I rent or buy"
  - "renting vs buying comparison"
  - "break-even point"
relatedTools:
  - "mortgage-affordability"
  - "mortgage-payment"
  - "loan-amortization"
  - "stamp-duty"
  - "savings-goal"
  - "investment-return"
  - "net-worth"
affiliateContext: "Ready to buy? Get pre-approved and compare rates"
affiliatePrograms:
  - "LendingTree"
calculationMethod: "Month-by-month net worth of the buyer (home equity less selling costs plus any tax saving invested) against the renter (the down payment and monthly savings invested), at the same total outlay"
lastUpdated: "2026-11-15"
faq:
  - question: "Is it cheaper to rent or buy a home?"
    answer: "It depends on the price-to-rent ratio, the mortgage rate and how long you stay, and the answer can go either way. On a $350,000 home with 20% down, a 7% mortgage and $1,800 rent, over 10 years renting and investing the difference comes out {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).difference | usd }} ahead in net worth, and buying does not pull ahead until year {{ rentVsBuy(350000, 20, 7, 30, 1800, 30).breakEvenYear | int }}. At a 5% rate, buying is ahead by {{ rentVsBuy(350000, 20, 5, 30, 1800, 10).difference | usd }} after 10 years, and with rent at $2,400 on the 7% loan buying is ahead by {{ rentVsBuy(350000, 20, 7, 30, 2400, 10).difference | usd }}. Run your own numbers rather than trusting a general rule."
  - question: "What is the 5% rule for rent vs buy?"
    answer: "The 5% rule says a home's yearly cost beyond the mortgage principal is about 5% of its value: roughly 1% property tax, 1% maintenance and 3% for the cost of capital. Multiply the price by 5% and divide by 12 to get a monthly rent threshold. For a $400,000 home that is {{ 400000 * 5 / 100 / 12 | usd }} a month, and if you can rent a comparable place for less, renting is likely cheaper. At a 7% mortgage rate the calculator agrees in that case: rent at {{ 400000 * 5 / 100 / 12 | usd }} leaves renting {{ rentVsBuy(400000, 20, 7, 30, 400000 * 5 / 100 / 12, 10).difference | usd }} ahead after 10 years. The rule is only a first test, and it depends on the rate and the price."
  - question: "How long do I need to stay to make buying worth it?"
    answer: "The break-even year depends on the inputs, not on a fixed number of years. For a $350,000 home with 20% down, 3% price growth and 3% rent growth, buying breaks even in year {{ rentVsBuy(350000, 20, 5, 30, 1800, 10).breakEvenYear | int }} at a 5% mortgage rate with $1,800 rent, in year {{ rentVsBuy(350000, 20, 7, 30, 2400, 10).breakEvenYear | int }} at 7% with $2,400 rent, and in year {{ rentVsBuy(350000, 20, 7, 30, 1800, 30).breakEvenYear | int }} at 7% with $1,800 rent. Buying has large upfront and exit costs, and the calculator includes them: closing costs of {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).closingCosts | usd }} and selling costs of {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).saleCosts | usd }} in the first example. If you might move within a few years, renting is usually cheaper."
  - question: "What hidden costs of buying do people forget?"
    answer: "Beyond the mortgage payment: property tax, homeowners insurance, maintenance, HOA dues, PMI with a small down payment, and closing and selling costs. The calculator starts from property tax of 1% a year, insurance of $1,800, maintenance of 1% of the value, closing costs of 3% and selling costs of 6% in the US. On the $350,000 example the first month's ownership cost is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyOwnershipCost | usd }} against a mortgage payment of {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyMortgage | usd }}, which is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyOwnershipCost / rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyMortgage * 100 - 100 | pct }} more. These are starting assumptions, so replace them with your own."
  - question: "Should I invest the down payment instead of buying?"
    answer: "That is the comparison the calculator makes. The renter invests the down payment and closing costs, then each month's saving. At a 7% return, a $60,000 sum grows to {{ compoundFV(60000, 0, 7, 10) | usd }} in 10 years with monthly compounding. Against that, the buyer builds equity from the principal repayments and any price growth, and in the US may save tax on mortgage interest. Which side wins turns on the mortgage rate, the rent and how fast prices and investments grow, and the calculator's 7% investment return and 3% price growth are adjustable assumptions, not forecasts."
  - question: "Does the calculator include the mortgage interest tax deduction?"
    answer: "In the US it does, but only when itemising beats the standard deduction for your filing status, using the marginal tax rate you set (22% by default) and any other itemised deductions. On the first example, the tax saving over 10 years is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).totalTaxSaving | usd }}. In the UK and euro area there is no such deduction, and buying and selling costs start at zero, so enter your own stamp duty, agent and legal fees."
workedExamples:
  - title: "Buying vs renting in a mid-cost city"
    inputs:
      homePrice: 350000
      downPayment: 70000
      interestRate: 7
      monthlyRent: 1800
      stayDuration: 10
    description: "A $350,000 home with 20% down ({{ rentVsBuy(350000, 20, 7, 30, 1800, 10).downPayment | usd }}) and a 7% 30-year mortgage against renting at $1,800 a month with 3% a year rent rises. The mortgage payment is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyMortgage | usd }} and the first month's total ownership cost {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyOwnershipCost | usd }}, against {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).firstMonthRentCost | usd }} for rent and renter's insurance. After 10 years the home is worth {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).finalHomeValue | usd }} and the loan balance is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).loanBalance | usd }}. Buyer net worth is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).finalBuyerNetWorth | usd }} and renter net worth {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).finalRenterNetWorth | usd }}, so {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).verdict }} wins by {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).difference | usd }} at 10 years. Buying overtakes renting in year {{ rentVsBuy(350000, 20, 7, 30, 1800, 30).breakEvenYear | int }} if you stay on."
  - title: "Expensive market, short stay"
    inputs:
      homePrice: 750000
      downPayment: 150000
      interestRate: 6.5
      monthlyRent: 2800
      stayDuration: 4
    description: "A $750,000 home with 20% down at 6.5% against renting at $2,800 a month, for four years. The mortgage payment is {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).monthlyMortgage | usd }} and the first month's ownership cost {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).monthlyOwnershipCost | usd }}. Closing costs are {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).closingCosts | usd }} and selling costs {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).saleCosts | usd }}. Renting for the four years costs {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).totalRentPaid | usd }} in rent, and {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).verdict }} comes out {{ rentVsBuy(750000, 20, 6.5, 30, 2800, 4).difference | usd }} ahead in net worth. A short stay and a high price-to-rent ratio are the case where renting wins by the most."
  - title: "First-time buyer with a small down payment"
    inputs:
      homePrice: 280000
      downPayment: 14000
      interestRate: 7
      monthlyRent: 1500
      stayDuration: 7
    description: "A $280,000 home with 5% down at 7% against renting at $1,500 a month, for seven years. The mortgage payment is {{ rentVsBuy(280000, 5, 7, 30, 1500, 7).monthlyMortgage | usd }} and the first month's ownership cost, with PMI, is {{ rentVsBuy(280000, 5, 7, 30, 1500, 7).monthlyOwnershipCost | usd }}, against {{ rentVsBuy(280000, 5, 7, 30, 1500, 7).firstMonthRentCost | usd }} for renting. After seven years {{ rentVsBuy(280000, 5, 7, 30, 1500, 7).verdict }} is ahead by {{ rentVsBuy(280000, 5, 7, 30, 1500, 7).difference | usd }}. If the stay lengthens to 30 years, buying is ahead by {{ rentVsBuy(280000, 5, 7, 30, 1500, 30).advantage | usd }}: the small deposit and the larger loan mean it takes a long time to pay off."
---

## Why the answer changes

"Should I rent or buy?" is among the biggest money decisions most people make, and the standard advice, that buying is always better because you build equity, is too simple. This calculator compares two people with the same total outlay each month. The buyer pays the mortgage, tax, insurance and upkeep and ends with home equity. The renter pays rent and invests the down payment and the difference. It reports net worth for each at the end of your stay.

At a 7% mortgage rate on a $350,000 home with $1,800 rent, renting and investing is {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).difference | usd }} ahead after 10 years, and the buyer does not catch up until year {{ rentVsBuy(350000, 20, 7, 30, 1800, 30).breakEvenYear | int }}. At 5%, the same buyer is {{ rentVsBuy(350000, 20, 5, 30, 1800, 10).difference | usd }} ahead after 10 years. The rate matters that much.

## How the answer moves

For a $350,000 home with 20% down, a 30-year mortgage and a 10-year stay:

| Mortgage rate | Monthly rent | Ahead after 10 years | By |
|---|---|---|---|
| 7% | $1,800 | {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).verdict }} | {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).difference | usd }} |
| 6% | $1,800 | {{ rentVsBuy(350000, 20, 6, 30, 1800, 10).verdict }} | {{ rentVsBuy(350000, 20, 6, 30, 1800, 10).difference | usd }} |
| 5% | $1,800 | {{ rentVsBuy(350000, 20, 5, 30, 1800, 10).verdict }} | {{ rentVsBuy(350000, 20, 5, 30, 1800, 10).difference | usd }} |
| 7% | $2,400 | {{ rentVsBuy(350000, 20, 7, 30, 2400, 10).verdict }} | {{ rentVsBuy(350000, 20, 7, 30, 2400, 10).difference | usd }} |

Defaults used: 3% a year price growth and rent growth, a 7% return on the renter's investments, property tax of 1%, insurance of $1,800, maintenance of 1%, closing costs of 3% and selling costs of 6%. Change any of them in the calculator.

## The true cost of buying

<div class="stat-highlight">
  <span class="stat-number">{{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyOwnershipCost / rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyMortgage * 100 - 100 | pct }}</span>
  <span class="stat-text">is how much more the first month of owning a $350,000 home costs than the mortgage payment alone, once tax, insurance and maintenance are added at the calculator's defaults.</span>
</div>

Buying costs more than the payment on the lender's quote:

| Cost | The calculator's starting assumption | When you pay |
|---|---|---|
| Closing costs | 3% of the price in the US | At purchase |
| Property tax | 1% of the value a year | Ongoing |
| Homeowners insurance | $1,800 a year | Ongoing |
| Maintenance and repairs | 1% of the value a year | Ongoing |
| PMI | When the down payment is under 20% | Until you reach 20% equity |
| Selling costs | 6% of the sale price in the US | At sale |
| Opportunity cost | The down payment could be invested instead | Ongoing, and not visible on a statement |

On the $350,000 example, closing costs are {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).closingCosts | usd }} and selling costs after 10 years {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).saleCosts | usd }}. Over that period the buyer also pays {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).totalInterest | usd }} in interest over the loan's life, and in the US the interest deduction saves {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).totalTaxSaving | usd }}.

## The true cost of renting

Renting is simpler, but not free of cost:

- **Rent.** The calculator raises it 3% a year by default; check how fast rents rise where you live.
- **Renter's insurance.** The calculator starts at $15 a month, far below homeowners insurance.
- **No equity.** Your payments go to a landlord and not into an asset you own.
- **The investment alternative.** The money you do not spend on a down payment and ownership costs can be invested. The calculator assumes 7% a year. That is not a guarantee, and a lower return favours buying.

The question is whether the investment gain on the renter's savings beats the equity the buyer builds.

## The break-even point

The break-even year is when the buyer's net worth first overtakes the renter's and stays ahead. The calculator reports it, and tells you when there is none inside your stay. The table above shows how far it moves with the mortgage rate and the rent.

| What changes | Effect on break-even | Why |
|---|---|---|
| A high price relative to rent | Later | More capital is tied up in the home |
| A lower mortgage rate | Earlier | Less is paid in interest |
| Faster rent growth | Earlier | Buying fixes a large part of the cost |
| High property tax or HOA dues | Later | They eat into the buyer's advantage |

> **If you might move within a few years,** renting usually wins. At 7% on the $350,000 example, renting is already ahead at year 5 by {{ rentVsBuy(350000, 20, 7, 30, 1800, 5).difference | usd }}, because closing costs and selling costs take years to earn back.

## The 5% rule

A quick test: multiply the price by 5% and divide by 12. If you can rent a comparable home for less than that, renting is likely cheaper. For a $400,000 home, {{ 400000 * 5 / 100 | usd }} a year is {{ 400000 * 5 / 100 / 12 | usd }} a month. The rule is a rough first check before the full calculation, because it ignores the mortgage rate, how long you stay and how prices and rents move.

## UK and euro-area use

Switch the currency to pounds or euros and the calculator drops the US tax deduction and PMI, and starts buying and selling costs at zero. Enter your own costs: stamp duty (the [stamp duty calculator](/tools/economic/stamp-duty/) covers England and Northern Ireland), legal fees, agent fees and service charges. Mortgage terms follow the regional choices, and the default rate is a market average, not an offer.

## When to use this calculator

- **Before buying a first home,** to see how the break-even year depends on your numbers.
- **Moving to a new city,** to compare buying and renting in a different market.
- **Judging a short stay,** to see what closing and selling costs do over a few years.
- **Weighing the investment alternative,** to see what investing the down payment would give.

## Mistakes that skew the comparison

1. **Comparing rent with the mortgage payment alone.** Tax, insurance and maintenance add to it, as the {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyOwnershipCost | usd }} against {{ rentVsBuy(350000, 20, 7, 30, 1800, 10).monthlyMortgage | usd }} above shows.
2. **Assuming prices always rise.** In many markets prices have been flat or fallen for years. Test 0% growth as well as 3%.
3. **Ignoring what the down payment could earn.** {{ 60000 | usd }} invested at 7% grows to {{ compoundFV(60000, 0, 7, 10) | usd }} in 10 years.
4. **Treating rent as wasted and ownership costs as saved.** Interest, tax, insurance and maintenance are also gone for good. Only the principal repayments and price growth build equity.

> **Early mortgage payments are mostly interest.** On a $280,000 loan at 7%, only {{ loanMonth(280000, 7, 30, 1).principalShare | pct1 }} of the first payment reduces the balance.

## What to do next

Enter your price, down payment, mortgage rate, rent and the number of years you expect to stay, then read the break-even year. If you are within a year or two of it, personal factors such as stability and neighbourhood should tip the decision.
