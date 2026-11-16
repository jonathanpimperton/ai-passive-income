---
title: "Renting vs Buying a Home: Full Cost Comparison"
slug: "renting-vs-buying-2026"
description: "Rent or buy a $400,000 home? Net worth compared month by month at current mortgage rates, with the break-even year for different rents and stay lengths."
keywords:
  - "rent vs buy"
  - "should I buy a house or rent"
  - "renting vs buying comparison"
  - "how long to stay in a house to break even"
relatedTools:
  - "rent-vs-buy"
  - "mortgage-payment"
  - "mortgage-affordability"
  - "investment-return"
  - "savings-goal"
verdict: "Rent unless you expect to stay past your break-even year. On a $400,000 home with 20% down at the {{ rate('us30') | pct(2) }} survey rate, buying overtakes renting in year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 30).breakEvenYear | int }} if comparable rent is $2,200 a month, and in year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2600, 30).breakEvenYear | int }} if it is $2,600. At $2,800 of rent it is year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2800, 30).breakEvenYear | int }}. Plan on staying at least until your own break-even year before you count on buying to win."
comparisonTable:
  - feature: "Upfront cash"
    option1: "First month's rent and a deposit"
    option2: "{{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).initialCash | usd }} on a $400,000 home (20% down plus 3% closing costs)"
  - feature: "Monthly cost in month one"
    option1: "{{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).firstMonthRentCost | usd }} (rent plus renters insurance)"
    option2: "{{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).monthlyOwnershipCost | usd }} (mortgage, property tax, insurance, maintenance)"
  - feature: "Builds equity"
    option1: "No, but the down payment can be invested"
    option2: "Yes, about {{ loanYear(320000, rate('us30'), 30, 1).principal / 12 | usd }} a month of principal in year one"
  - feature: "Maintenance and repairs"
    option1: "Landlord pays"
    option2: "You pay, budget about 1% of the home's value a year"
  - feature: "Cost of leaving after 3 years"
    option1: "Usually none beyond the lease"
    option2: "About 6% of the sale price in selling costs, plus the closing costs you paid"
  - feature: "Net worth after 7 years (rent $2,200)"
    option1: "{{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).finalRenterNetWorth | usd }}"
    option2: "{{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).finalBuyerNetWorth | usd }} (buying overtakes renting in year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 30).breakEvenYear | int }})"
  - feature: "Tax benefit"
    option1: "None"
    option2: "Mortgage interest and property tax count only if you itemize; the calculator gives {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).totalTaxSaving | usd }} over 7 years here"
affiliateContext: "Get pre-approved for a mortgage"
affiliatePrograms:
  - "LendingTree"
faq:
  - question: "How long do you have to stay in a house for buying to beat renting?"
    answer: "It depends mostly on rent against price. On a $400,000 home with 20% down at the survey rate, break-even is year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2000, 30).breakEvenYear | int }} with $2,000 rent, year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 30).breakEvenYear | int }} with $2,200, year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2400, 30).breakEvenYear | int }} with $2,400 and year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2800, 30).breakEvenYear | int }} with $2,800. Run your own price, rent and rate in the rent vs buy calculator."
  - question: "What is the price-to-rent ratio?"
    answer: "The home's price divided by a year of rent for a comparable home. A $400,000 home that rents for $2,200 a month has a ratio of {{ 400000 / (2200 * 12) | num(1) }}. The higher the ratio, the longer buying takes to break even. It is a quick screen, not a verdict: the mortgage rate and how long you will stay matter as much."
  - question: "Do mortgage rates change whether renting or buying is better?"
    answer: "Yes, a lot. With $2,200 rent and a 7-year stay, at a 5% mortgage the buyer's net worth after 7 years is {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).finalBuyerNetWorth | usd }} and the renter's is {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).finalRenterNetWorth | usd }}; at the {{ rate('us30') | pct(2) }} survey rate it is {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).finalBuyerNetWorth | usd }} and {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).finalRenterNetWorth | usd }}. Re-run the comparison at the rate you are actually quoted."
  - question: "Does this include mortgage insurance?"
    answer: "No. The figures assume 20% down. With less than 20% down you usually pay private mortgage insurance until you reach 20% equity, which makes buying slightly worse than shown. The rent vs buy calculator does not model it either."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "Freddie Mac — Primary Mortgage Market Survey"
    url: "https://www.freddiemac.com/pmms"
  - name: "FHFA — House Price Index, August 2026 (released 27 October 2026)"
    url: "https://www.fhfa.gov/news/news-release/fhfa-house-price-index-up-0.3-percent-in-august-up-2.4-percent-from-last-year"
  - name: "Federal Reserve — FOMC statement, 16 September 2026"
    url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm"
---

## Where rates and prices stand

Freddie Mac's weekly survey put the average 30-year fixed rate at {{ rate('us30') | pct(2) }} ({{ rateSource('us30') }}), after the Federal Reserve raised its target range in September. Home prices are rising slowly: the FHFA House Price Index was up 2.4% in the year to August 2026.

The old rule that buying beats renting after five years depends on rent and on the mortgage rate. Test it on the numbers below: with $2,200 of rent, after 5 years the buyer's net worth is {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 5).finalBuyerNetWorth | usd }} and the renter's is {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 5).finalRenterNetWorth | usd }}. A higher rate makes the mortgage payment larger, and slower price growth means the home does less of the work.

## The true monthly cost of owning

Most buyers focus on the mortgage payment and forget the rest. For a $400,000 home with 20% down, a {{ 400000 * 0.8 | usd }} loan, the {{ rate('us30') | pct(2) }} survey rate and the calculator's defaults, month one costs:

- **Mortgage (principal and interest):** {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).monthlyMortgage | usd }}
- **Property tax:** {{ 400000 * 0.01 / 12 | usd }} (1% of the price a year)
- **Insurance:** {{ 1800 / 12 | usd }} ($1,800 a year)
- **Maintenance:** {{ 400000 * 0.01 / 12 | usd }} (1% of the price a year)
- **Total:** {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).monthlyOwnershipCost | usd }}

If comparable rent is $2,200, the renter's first month costs {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).firstMonthRentCost | usd }} with renters insurance, so owning costs about {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).monthlyOwnershipCost - rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).firstMonthRentCost | usd }} a month more. Only about {{ loanYear(320000, rate('us30'), 30, 1).principal / 12 | usd }} a month of the first year's mortgage payments goes to principal, because most of the early payment is interest ({{ loanYear(320000, rate('us30'), 30, 1).interest | usd }} in year one).

## How long until buying wins

The [rent vs buy calculator](/tools/debt-and-loans/rent-vs-buy/) compares net worth month by month. Both households start with the same cash, {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).initialCash | usd }}. The buyer puts it into the house; the renter invests it. Each month the household with the cheaper housing cost invests the difference. Buyer net worth is the sale price less 6% selling costs, less the loan balance, plus any investments. Other inputs are the calculator's defaults: 3% a year price growth, 3% a year rent increases, 7% investment return.

| If you stay (rent $2,200 a month) | Net worth gap | Ahead |
|---|---|---|
| 3 years | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 3).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 3).verdict }} |
| 5 years | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 5).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 5).verdict }} |
| 7 years | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).verdict }} |
| 10 years | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 10).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 10).verdict }} |
| 15 years | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 15).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 15).verdict }} |

Rent has a large effect on the answer, so here is the break-even year for the same home at different rents:

| Monthly rent | Price-to-rent ratio | Buying breaks even in year |
|---|---|---|
| $2,000 | {{ 400000 / (2000 * 12) | num(1) }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2000, 30).breakEvenYear | int }} |
| $2,200 | {{ 400000 / (2200 * 12) | num(1) }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 30).breakEvenYear | int }} |
| $2,400 | {{ 400000 / (2400 * 12) | num(1) }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2400, 30).breakEvenYear | int }} |
| $2,600 | {{ 400000 / (2600 * 12) | num(1) }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2600, 30).breakEvenYear | int }} |
| $2,800 | {{ 400000 / (2800 * 12) | num(1) }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2800, 30).breakEvenYear | int }} |

The price-to-rent ratio is the price divided by a year of rent. Find your own row by dividing the price you are looking at by twelve times the rent for a comparable home.

## What moves the answer

For a 7-year stay with $2,200 rent, three inputs move the result most:

| Change | Net worth gap | Ahead |
|---|---|---|
| Survey rate ({{ rate('us30') | pct(2) }}), 3% price growth | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7).verdict }} |
| 6% mortgage rate | {{ rentVsBuy(400000, 20, 6, 30, 2200, 7).difference | usd }} | {{ rentVsBuy(400000, 20, 6, 30, 2200, 7).verdict }} |
| 5% mortgage rate | {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).difference | usd }} | {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).verdict }} |
| 2% price growth | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7, appreciation=2).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7, appreciation=2).verdict }} |
| 4% price growth | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7, appreciation=4).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2200, 7, appreciation=4).verdict }} |
| Rent of $2,600 a month | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2600, 7).difference | usd }} | {{ rentVsBuy(400000, 20, rate('us30'), 30, 2600, 7).verdict }} |

Price growth matters because the buyer owns the whole home but the renter's investments only grow at the investment return. Recent growth has been slow, so test your own market at 2% as well as 3%. The mortgage rate matters because it sets the monthly cost the renter can invest instead.

## When renting clearly wins

- **You might move within about five years.** Selling costs of 6% and closing costs of 3% are lost money. In the first table above, compare the net worth gap after 3, 5 and 7 years.
- **The price-to-rent ratio is high.** In the break-even table, a ratio of {{ 400000 / (2000 * 12) | num(1) }} takes {{ rentVsBuy(400000, 20, rate('us30'), 30, 2000, 30).breakEvenYear | int }} years to pay off.
- **You would drain your [emergency fund](/tools/income-and-planning/emergency-fund/) for the down payment.** Owning without reserves is dangerous, and one major repair can force you into debt.
- **You would put down less than 20%.** Mortgage insurance and a bigger loan make buying worse than these figures.

## When buying clearly wins

- **You will stay past the break-even year for your own rent and price.** Use the [rent vs buy calculator](/tools/debt-and-loans/rent-vs-buy/) with your numbers; do not borrow the break-even from someone else's market.
- **Rent is high relative to prices.** At $2,800 of rent buying breaks even in year {{ rentVsBuy(400000, 20, rate('us30'), 30, 2800, 30).breakEvenYear | int }}; a stay that long or longer is what makes buying reasonable.
- **You can lock in a lower rate.** If you are quoted well below the survey average, re-run the table: at 5% the buyer's net worth after 7 years is {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).finalBuyerNetWorth | usd }} and the renter's is {{ rentVsBuy(400000, 20, 5, 30, 2200, 7).finalRenterNetWorth | usd }}.
- **You value stability.** No landlord can sell the property or raise the rent, which has real value even though no spreadsheet counts it.

## The investment alternative

The strongest argument for renting is investing the down payment and the monthly cost difference instead. The calculator assumes 7% a year, which it applies to both households. If you would not actually invest the difference, buying works as forced saving, and the real result is better for the buyer than the table shows. If you would invest it, the table is the right comparison. Be honest about which describes you.
