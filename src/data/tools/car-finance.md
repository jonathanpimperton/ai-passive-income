---
name: "Car Finance Comparison Calculator"
slug: "car-finance"
category: "debt-and-loans"
description: "Car finance calculator comparing PCP, HP, a personal loan and cash: monthly payment, total paid, the true cost with forgone returns, and which is cheapest."
keywords:
  - "car finance calculator"
  - "PCP vs HP calculator"
  - "car finance comparison"
  - "car loan calculator"
  - "personal contract purchase calculator"
  - "hire purchase calculator"
  - "cheapest way to finance a car"
affiliateContext: "Compare car loan rates from leading lenders"
affiliatePrograms:
  - "LendingTree"
  - "SoFi"
relatedTools:
  - "loan-amortization"
  - "debt-payoff"
  - "savings-goal"
  - "roi"
  - "credit-card-payoff"
  - "mortgage-payment"
faq:
  - question: "What is the cheapest way to buy a car?"
    answer: "Cash has the lowest total paid, because there is no interest, but it ties up money that could earn a return elsewhere. The calculator therefore ranks the options by true cost: everything paid, plus what the money would have earned if you had spent it later. On a £25,000 car with a £2,500 deposit over 48 months, at the calculator's starting rates, total paid is {{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }} for a personal loan, {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} for HP and {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} for PCP if you keep the car and pay the balloon. The right option depends on what you value: the lowest monthly payment (PCP), the lowest cost of borrowing (usually a personal loan), or no debt (cash)."
  - question: "What is PCP (Personal Contract Purchase)?"
    answer: "PCP finances the car's expected depreciation rather than its full price. You pay a deposit, then lower monthly payments over the term, then choose: pay a final 'balloon' (the Guaranteed Minimum Future Value, GMFV) to keep the car, hand it back, or use any equity towards a new deal. Interest is charged on the whole amount financed for the whole term, including the part that becomes the balloon. You do not own the car unless you pay the balloon, and mileage and condition limits apply. On the £25,000 example above, PCP costs {{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} a month against {{ carFinance(25000, 2500, 48).hpMonthly | gbp }} for HP."
  - question: "Is PCP or HP better value?"
    answer: "For the same APR, HP costs less in total if you want to own the car, because it repays the full amount and has no balloon accruing interest. In the £25,000 example, keeping the car costs {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} on PCP against {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} on HP, {{ carFinance(25000, 2500, 48).pcpTotalPaid - carFinance(25000, 2500, 48).hpTotalPaid | gbp }} more. PCP is better value if you plan to hand the car back at the end and want the lowest monthly payment, as you pay for the depreciation, not the whole car."
  - question: "Why is a personal loan often cheaper than dealer finance?"
    answer: "Banks and credit unions compete on rate, and a loan from them is usually cheaper than a dealer's PCP or HP. At the calculator's starting rates (5.6% for a loan, 8.9% for HP) the £25,000 example costs {{ carFinance(25000, 2500, 48).loanTotalInterest | gbp }} in interest on the loan against {{ carFinance(25000, 2500, 48).hpTotalInterest | gbp }} on HP. A personal loan is also unsecured and you own the car from day one. Dealers can offer 0% finance, but the price of the car can be higher to pay for it, so compare the total amount payable and ask for the cash price. These starting rates are assumptions, not market quotes."
  - question: "What is the balloon payment in PCP and what if I cannot pay it?"
    answer: "The balloon is the amount the lender guarantees the car will be worth at the end of the agreement. The calculator starts at 40% of the price: {{ carFinance(25000, 2500, 48).balloon | gbp }} on a £25,000 car. If you cannot or do not want to pay it, you can usually hand the car back, if it is within the mileage and condition limits, or use any equity as a deposit on a new deal, or refinance the balloon. The guarantee is set cautiously, so the car is often worth more than the balloon, and the difference is your equity."
  - question: "Should I buy a car with cash or finance it?"
    answer: "With cash you pay no interest, but the money cannot earn a return. The calculator charges that as an opportunity cost, with a 4.5% return as its starting assumption. On the £25,000 example, cash then has a true cost of {{ carFinance(25000, 2500, 48).cashTrueCost | gbp }} against {{ carFinance(25000, 2500, 48).loanTrueCost | gbp }} for the personal loan, so cash is cheapest. If you could earn 8% instead, the loan's true cost is {{ carFinance(25000, 2500, 48, invest=8).loanTrueCost | gbp }} against {{ carFinance(25000, 2500, 48, invest=8).cashTrueCost | gbp }} for cash, so financing and investing wins. If you could earn only 2%, cash is cheaper still. Do not spend your emergency fund on the car either way."
  - question: "What APR should I use?"
    answer: "Use the rates you have been quoted. The calculator starts from PCP 7.9% with a 40% balloon, HP 8.9%, a personal loan 5.6% and a 4.5% return on money you keep; these are modelling assumptions and not market averages. Rates depend on your credit record, the term, the lender and whether the car is new or used. For US averages by credit tier, see Bankrate; for UK, compare personal loans and dealer finance through a comparison site and get a loan quote before you visit a dealer, because it gives you a rate to negotiate against."
  - question: "Does the calculator use the same APR convention everywhere?"
    answer: "No. A UK or euro APR is an effective annual rate, so the calculator converts it to the monthly rate that compounds to that annual figure. A US auto loan quotes a nominal APR, charged at one twelfth a month. The calculator switches the rule with the currency you choose, so enter the APR exactly as it appears on your quote."
workedExamples:
  - title: "£25,000 car with £2,500 deposit over 4 years"
    inputs:
      carPrice: 25000
      deposit: 2500
      termMonths: 48
      pcpApr: 7.9
      pcpBalloonPct: 40
      hpApr: 8.9
      loanApr: 5.6
    description: "PCP at 7.9% with a 40% balloon of {{ carFinance(25000, 2500, 48).balloon | gbp }}: {{ carFinance(25000, 2500, 48).pcpMonthly | gbp }} a month, {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} paid in total with the balloon, {{ carFinance(25000, 2500, 48).pcpTotalInterest | gbp }} of interest. HP at 8.9%: {{ carFinance(25000, 2500, 48).hpMonthly | gbp }} a month, {{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }} in total. Personal loan at 5.6%: {{ carFinance(25000, 2500, 48).loanMonthly | gbp }} a month, {{ carFinance(25000, 2500, 48).loanTotalPaid | gbp }} in total. Cash: {{ carFinance(25000, 2500, 48).cashTotalPaid | gbp }} with {{ carFinance(25000, 2500, 48).cashOpportunityCost | gbp }} of forgone return at 4.5%. On true cost, cash ({{ carFinance(25000, 2500, 48).cashTrueCost | gbp }}) edges the personal loan ({{ carFinance(25000, 2500, 48).loanTrueCost | gbp }}), with HP at {{ carFinance(25000, 2500, 48).hpTrueCost | gbp }} and PCP at {{ carFinance(25000, 2500, 48).pcpTrueCost | gbp }}. If you could invest at 8%, the loan wins."
  - title: "£15,000 used car, short 2-year term"
    inputs:
      carPrice: 15000
      deposit: 3000
      termMonths: 24
      pcpApr: 9.9
      hpApr: 8.9
      loanApr: 6.5
    description: "On a short term the interest is lower across the board. Personal loan at 6.5%: {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanMonthly | gbp }} a month, {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanTotalPaid | gbp }} in total, {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanTotalInterest | gbp }} of interest. HP at 8.9%: {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).hpMonthly | gbp }} a month, {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).hpTotalPaid | gbp }} in total, {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).hpTotalInterest | gbp }} of interest. PCP at 9.9% with a 40% balloon ({{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).balloon | gbp }}): {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).pcpMonthly | gbp }} a month, {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).pcpTotalPaid | gbp }} including the balloon. The personal loan has the lowest total paid, and the monthly gap to HP is only {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).hpMonthly - carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanMonthly | gbp }}. Paying cash adds {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).cashOpportunityCost | gbp }} of forgone return at 4.5%, so on true cost cash ({{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).cashTrueCost | gbp }}) is just ahead of the loan ({{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanTrueCost | gbp }})."
  - title: "$35,000 new car in the US with a 0% dealer deal"
    inputs:
      carPrice: 35000
      deposit: 5000
      termMonths: 60
      hpApr: 0
      loanApr: 6.8
    description: "A 0% dealer deal on a $35,000 car with $5,000 down finances {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).financeAmount | usd }} at {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).hpMonthly | usd }} a month for 60 months, with no interest: {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).hpTotalPaid | usd }} paid in total. The same amount from a bank at 6.8% costs {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).loanMonthly | usd }} a month and {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).loanTotalPaid | usd }} in total, which is {{ carFinance(35000, 5000, 60, convention=nominal, hpApr=0, loanApr=6.8).loanTotalInterest | usd }} of interest. The 0% deal is the cheapest option on true cost too. Dealers sometimes offer a choice between 0% and a cash rebate: if the rebate is larger than the interest you would pay a bank, take the rebate and borrow elsewhere."
lastUpdated: "2026-11-15"
dataSources:
  - name: "MoneySavingExpert: PCP deals explained"
    url: "https://www.moneysavingexpert.com/loans/personal-contract-purchase/"
  - name: "Bankrate: average auto loan rates"
    url: "https://www.bankrate.com/loans/auto-loans/rates/"
calculationMethod: "Standard amortization for HP and personal loans. PCP uses the same formula with a balloon: M = r x (PV - FV/(1+r)^n) / (1 - (1+r)^-n). True cost is total paid plus the return forgone by spending the money earlier, from the deposit and each payment. The APR convention follows the currency: effective for GBP and EUR, nominal (APR/12) for USD."
---

## Four ways to pay for the same car

How you pay for a car is one of the larger money decisions most people make every few years. On a £25,000 car with a £2,500 deposit over four years, total paid ranges from {{ carFinance(25000, 2500, 48).cashTotalPaid | gbp }} in cash to {{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }} on PCP when you keep the car.

The calculator compares four ways to pay:

| Method | You own the car? | Monthly payment | Total cost | Best for |
|---|---|---|---|---|
| **PCP** | Only if you pay the balloon | Lowest | Highest if you keep the car | Changing the car every few years |
| **HP** | Yes, at the end | Medium | Medium | Owning with fixed payments |
| **Personal loan** | Yes, from day one | Medium | Often lowest of the borrowing options | Lower rates and full ownership |
| **Cash** | Yes, immediately | None | The car price, no interest | Avoiding borrowing costs |

## How PCP works

PCP is the most common way to finance a new car in the UK. The structure:

1. **Deposit.** You pay a deposit up front.
2. **Monthly payments.** They cover the car's expected depreciation, not its full price, so they are low.
3. **Balloon (GMFV).** A large final payment if you want to keep the car.

At the end you choose: pay the balloon and keep the car, hand it back, or use any equity as a deposit on a new deal.

> **Important:** PCP charges interest on the whole amount financed for the whole term, not only on the depreciation. That is why the PCP total is often the highest even though the monthly payment is the lowest.

## What a low monthly payment hides

PCP's payment looks small because you pay off only part of the car. The interest is still worked out on everything you borrowed:

- **Finance amount:** {{ carFinance(25000, 2500, 48).financeAmount | gbp }} (a {{ 25000 | gbp }} car less a {{ 2500 | gbp }} deposit)
- **Interest accrues on:** all {{ carFinance(25000, 2500, 48).financeAmount | gbp }} for the whole term
- **Repaid in monthly payments:** {{ carFinance(25000, 2500, 48).financeAmount - carFinance(25000, 2500, 48).balloon | gbp }}, which is the depreciation part
- **Still owed at the end:** the {{ carFinance(25000, 2500, 48).balloon | gbp }} balloon, which has been accruing interest all along

That is why keeping the car costs more on PCP ({{ carFinance(25000, 2500, 48).pcpTotalPaid | gbp }}) than on HP ({{ carFinance(25000, 2500, 48).hpTotalPaid | gbp }}) for the same car.

## When each option wins

**PCP** suits someone who wants a newer car every few years and never plans to pay the balloon. In effect you rent the car with an option to buy it.

**HP** suits owning the car at the end with fixed payments and no balloon.

**A personal loan** suits the lowest cost of borrowing. You own the car from the start and can sell it whenever you like.

**Cash** suits when you have the money without touching your emergency fund. The true-cost column shows when investing the money would have beaten the loan: at 8%, the loan on the £25,000 example costs {{ carFinance(25000, 2500, 48, invest=8).loanTrueCost | gbp }} against {{ carFinance(25000, 2500, 48, invest=8).cashTrueCost | gbp }} for cash.

## Getting a better deal

1. **Get a loan quote first.** A personal loan or credit union quote gives you a rate to negotiate against before you visit the dealer.
2. **Compare the total payable**, not the monthly payment or the APR on its own. A longer term lowers the payment and can cost thousands more in interest.
3. **Agree the car price before discussing finance.** A 0% deal can come with a higher price.
4. **Check your credit record** before you apply. The rate you are offered depends on it.
5. **Shorten the term if you can.** Higher payments mean much less interest: the £15,000 example over 24 months costs {{ carFinance(15000, 3000, 24, pcpApr=9.9, hpApr=8.9, loanApr=6.5).loanTotalInterest | gbp }} of loan interest.
