---
title: "PCP vs HP vs Personal Loan: Which Costs Least?"
slug: "pcp-vs-hp-vs-personal-loan"
description: "PCP vs HP vs personal loan on a £25,000 car: monthly payments, total cost, ownership and mileage limits compared, with the maths behind every figure."
keywords:
  - "PCP vs HP"
  - "PCP vs personal loan"
  - "HP vs personal loan"
  - "car finance comparison"
  - "cheapest way to finance a car"
relatedTools:
  - "car-finance"
  - "loan-amortization"
verdict: "On a £25,000 car over four years, the personal loan is the cheapest way to end up owning it: {{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }} all-in, against {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} on HP and {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} on PCP with the balloon paid. PCP only wins if you treat it as renting: {{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} a month is the lowest payment on the table, but the car goes back unless you find {{ carFinance(25000, 2500, 48).balloon | gbp }} at the end. Decide whether you are buying the car or buying the payment, then compare total amount payable, not APRs or monthly payments."
comparisonTable:
  - feature: "Monthly payment"
    option1: "{{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} (lowest)"
    option2: "{{ carFinance(25000, 2500, 48).hpMonthly | gbp }} (highest)"
    option3: "{{ carFinance(25000, 2500, 48).loanMonthly | gbp }}"
  - feature: "Total cost to own the car, deposit included"
    option1: "{{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} (including the {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon)"
    option2: "{{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }}"
    option3: "{{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }} (lowest)"
  - feature: "Total interest paid"
    option1: "{{ carFinance(25000, 2500, 48).pcpTotalInterest | gbp }}"
    option2: "{{ carFinance(25000, 2500, 48).hpTotalInterest | gbp }}"
    option3: "{{ carFinance(25000, 2500, 48).loanTotalInterest | gbp }}"
  - feature: "Who owns the car"
    option1: "The lender, until you pay the balloon"
    option2: "The lender, until the final payment"
    option3: "You, from day one"
  - feature: "Mileage limits"
    option1: "Yes: excess-mileage charges apply"
    option2: "None"
    option3: "None"
  - feature: "Flexibility"
    option1: "Return, refinance or keep at the end"
    option2: "Fixed term; can settle early"
    option3: "Sell the car or repay whenever"
  - feature: "Best for"
    option1: "A new car every three or four years"
    option2: "Owning, with dealer convenience"
    option3: "Lowest total borrowing cost"
datePublished: "2026-07-07"
dateModified: "2026-11-16"
sources:
  - name: "FCA — Car finance claims (motor finance compensation scheme)"
    url: "https://www.fca.org.uk/consumers/car-finance-complaints"
  - name: "Consumer Credit Act 1974, section 95A (early settlement compensation)"
    url: "https://www.legislation.gov.uk/ukpga/1974/39/section/95A"
  - name: "MoneySavingExpert — PCP explained"
    url: "https://www.moneysavingexpert.com/loans/personal-contract-purchase/"
faq:
  - question: "Is PCP cheaper than HP?"
    answer: "Monthly, yes. In total, no. On our £25,000 example, PCP costs {{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} a month against HP's {{ carFinance(25000, 2500, 48).hpMonthly | gbp }}, because PCP only repays the car's expected depreciation. But PCP charges interest on the full amount borrowed for the whole term, including the {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon you have not paid off. Keep the car and PCP's total is {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} against {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} on HP, which is {{ carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).hpTotalPaid | gbp }} more for the same car."
  - question: "Can I settle car finance early?"
    answer: "Yes. Personal loans, HP and PCP agreements can all be settled early, with a rebate of unearned interest under the Consumer Credit Act. For fixed-rate deals where you repay more than £8,000 in a 12-month period, the lender may charge compensation of at most 1% of the amount repaid early (0.5% if less than a year remains). HP and PCP also carry a voluntary termination right: once you have paid half the total amount payable, you can hand the car back and walk away, subject to fair wear and tear."
  - question: "What happens at the end of a PCP agreement?"
    answer: "You choose one of three exits: pay the {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon (the guaranteed minimum future value) and keep the car; hand the car back with nothing more to pay if it is within the mileage and condition limits; or trade it in, using any value above the balloon as the deposit on the next deal. Most PCP customers roll into a new agreement, which is what the product is designed to encourage."
  - question: "Should I take dealer finance or a bank loan?"
    answer: "Get a personal loan quote from your bank before you visit the showroom, then ask the dealer to beat it on total amount payable, not monthly payment. In this example the dealer's HP rate is {{ 8.9 - 5.6 | num(1) }} percentage points above the loan rate, and the loan rate of 5.6% is an example: check current best-buy rates. Dealers earn commission on finance they arrange and must tell you how they are paid if you ask."
  - question: "Can I claim compensation for past car finance?"
    answer: "Possibly. The FCA has a compensation scheme for car finance agreements made between 6 April 2007 and 1 November 2024 where the broker's arrangements with the lender were not disclosed. Parts of the scheme are suspended pending a legal challenge, so check the FCA's car finance claims page for the current position. You do not need a claims management company."
---

## The same car, three very different bills

Take a representative deal: a **£25,000 car**, a **£2,500 deposit** and **48 months** to pay. The dealer offers PCP at 7.9% APR with a {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon (the guaranteed minimum future value, 40% of the car's price), or HP at 8.9%. Your bank offers a personal loan at 5.6% for the same {{ carFinance(25000, 2500, 48).financeAmount | gbp }}. The APRs are converted to a monthly rate the way UK lenders quote them, as effective annual rates. The figures below come from the [Car Finance Comparison Calculator](/tools/debt-and-loans/car-finance/) with its default inputs.

| | Monthly | Total paid, with deposit (of which interest) |
|---|---|---|
| **PCP** (keep it) | {{ carFinance(25000, 2500, 48).pcpMonthly | gbp(2) }} | {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} ({{ carFinance(25000, 2500, 48).pcpTotalInterest | gbp }}) |
| **HP** | {{ carFinance(25000, 2500, 48).hpMonthly | gbp(2) }} | {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} ({{ carFinance(25000, 2500, 48).hpTotalInterest | gbp }}) |
| **Loan** | {{ carFinance(25000, 2500, 48).loanMonthly | gbp(2) }} | {{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }} ({{ carFinance(25000, 2500, 48).loanTotalInterest | gbp }}) |

Three routes to the same driveway, with {{ carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).loanTotalPaid | gbp }} between the cheapest and the most expensive. The gaps come from two things: the APR, and, in PCP's case, how long the money stays borrowed.

## Why PCP's low payment costs the most

PCP's {{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} monthly payment looks unbeatable, and it is why PCP is the most common way to finance a new car in the UK. The payment is low because you only repay the car's depreciation, {{ carFinance(25000, 2500, 48).financeAmount - carFinance(25000, 2500, 48).balloon | gbp }} of the {{ carFinance(25000, 2500, 48).financeAmount | gbp }} borrowed, while the {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon waits until the end.

The catch: **interest runs on the full {{ carFinance(25000, 2500, 48).financeAmount | gbp }} for the whole term**, including the balloon you are not paying down. That is why PCP generates {{ carFinance(25000, 2500, 48).pcpTotalInterest | gbp }} of interest against HP's {{ carFinance(25000, 2500, 48).hpTotalInterest | gbp }} at a *lower* APR (7.9% against 8.9%). The deferred {{ carFinance(25000, 2500, 48).balloon | gbp }} sits there accruing interest for four years.

If you hand the car back instead of paying the balloon, you will have spent {{ carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).balloon | gbp }} (deposit plus 48 payments) for four years of driving, about {{ (carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).balloon) / 48 | gbp }} a month all-in. That is not a bad deal for always driving a car under warranty, but it is renting, not buying. Be honest with yourself about which one you are doing.

## HP: ownership on the dealer's forecourt

Hire purchase is the straightforward middle option: repay the whole {{ carFinance(25000, 2500, 48).financeAmount | gbp }} plus interest over 48 months and the car is yours after the final payment. No balloon, no mileage limits, no condition inspections.

At 8.9% APR the monthly payment is {{ carFinance(25000, 2500, 48).hpMonthly | gbp(2) }}, the highest of the three, and the total is {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }}. HP's weakness is the rate: here it is {{ 8.9 - 5.6 | num(1) }} percentage points above the loan. Its strength is availability. HP is often easier to get than an unsecured loan for the same amount because the car secures the debt, and it can be arranged in an afternoon at the dealership.

## The personal loan: cheapest ownership, from day one

Borrow {{ carFinance(25000, 2500, 48).financeAmount | gbp }} at 5.6% over 48 months and the payment is {{ carFinance(25000, 2500, 48).loanMonthly | gbp(2) }}, about {{ carFinance(25000, 2500, 48).hpMonthly - carFinance(25000, 2500, 48).loanMonthly | gbp }} a month *less* than HP, with a total cost of {{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }}. That is {{ carFinance(25000, 2500, 48).hpTotalPaid - carFinance(25000, 2500, 48).loanTotalPaid | gbp }} cheaper than HP and {{ carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).loanTotalPaid | gbp }} cheaper than PCP-and-keep, because banks price unsecured personal loans more keenly than dealers price car finance. The 5.6% is an example rate, so check what you can actually get.

You also own the car outright from day one. There is no mileage cap, you can sell whenever you like and the debt is not secured on the car. The trade-off: the best advertised rates need a strong credit score. All three routes appear on your credit file, so none avoids that question.

## How to choose

- **Want the lowest total cost of owning?** A personal loan, if your credit score gets you a competitive rate. Run the exact deal through the [Car Finance Comparison Calculator](/tools/debt-and-loans/car-finance/): it compares all three plus a cash purchase, including the opportunity cost of your deposit.
- **Want a new car every three years and never plan to own?** PCP, but compare the monthly cost including the deposit against leasing before signing, and watch the mileage allowance.
- **Want to own, but the loan rates you are offered are poor?** HP. Fixed payments, guaranteed ownership, no balloon risk.
- **Negotiate the car price first, finance second.** Dealers make margin on both, and a discounted price on 0% finance is sometimes recovered through a higher sticker price.

Whatever you pick, judge the deal on **total amount payable**. The [Loan Amortization Calculator](/tools/debt-and-loans/loan-amortization/) shows month by month how much of each payment is interest, which makes the comparison obvious.
