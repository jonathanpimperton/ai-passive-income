---
title: "$300K Mortgage at 7%: {{ loanPayment(300000, 7, 30) | usd(2) }} a Month"
slug: "300k-mortgage-7-percent"
description: "The monthly payment on a $300,000 mortgage at 7% over 30 years is {{ loanPayment(300000, 7, 30) | usd(2) }} for principal and interest, with {{ loanTotalInterest(300000, 7, 30) | usd }} in total interest."
keywords: ["300k mortgage payment", "mortgage at 7 percent", "$300000 mortgage monthly payment", "mortgage payment calculator"]
toolSlug: "mortgage-payment"
toolCategory: "debt-and-loans"
inputs:
  Loan Amount: "$300,000"
  Interest Rate: "7%"
  Loan Term: "30 years"
  Down Payment: "$0 (calculating loan amount only)"
  Includes: "Principal and interest only"
resultSummary: "{{ loanPayment(300000, 7, 30) | usd(2) }} a month"
affiliateContext: "Compare mortgage rates from multiple lenders"
affiliatePrograms:
  - "LendingTree"
datePublished: "2026-03-02"
dateModified: "2026-11-15"
---

## {{ loanPayment(300000, 7, 30) | usd(2) }} a month at 7%

**On a $300,000 mortgage at 7% interest over 30 years, your monthly payment is {{ loanPayment(300000, 7, 30) | usd(2) }} for principal and interest alone.** Over the life of the loan you would pay {{ loanTotalInterest(300000, 7, 30) | usd }} in total interest, which is {{ loanTotalInterest(300000, 7, 30) / 300000 * 100 | pct }} of the amount you borrowed.

For comparison, Freddie Mac's weekly average for a 30-year fixed mortgage was {{ rate('us30') | pct(2) }} ({{ rateSource('us30') }}). At that rate the same $300,000 loan costs {{ loanPayment(300000, rate('us30'), 30) | usd(2) }} a month. A weekly average is a market snapshot, not a quote: your own rate depends on your credit, down payment and lender. The [mortgage payments table](/scenarios/mortgage-payments-by-amount/#300k) shows this loan at other rates.

## Where each dollar of your payment goes

Your {{ loanPayment(300000, 7, 30) | usd(2) }} monthly payment covers two components that shift over time. In the first month, {{ loanMonth(300000, 7, 30, 1).interest | usd }} goes to interest and only {{ loanMonth(300000, 7, 30, 1).principal | usd }} to principal ({{ loanMonth(300000, 7, 30, 1).principalShare | pct1 }}). After 10 years the principal share has only reached {{ loanMonth(300000, 7, 30, 120).principalShare | pct1 }}. At month 242, just past year 20, it reaches {{ loanMonth(300000, 7, 30, 242).principalShare | pct }}, and in the final year nearly all of each payment ({{ loanMonth(300000, 7, 30, 360).principalShare | pct }} in the last month) reduces the balance.

The amortization schedule makes the slow start concrete. After five years of payments ({{ loanPayment(300000, 7, 30) * 60 | usd }} paid in), you still owe {{ loanBalance(300000, 7, 30, 60) | usd }}, so you have cleared only {{ 300000 - loanBalance(300000, 7, 30, 60) | usd }} of principal. After ten years the balance is {{ loanBalance(300000, 7, 30, 120) | usd }}, and at the 20-year mark you still owe {{ loanBalance(300000, 7, 30, 240) | usd }}. This is why extra principal payments are most powerful early in the loan: every dollar of principal you retire in year one stops accruing 7% interest for the next 29 years.

Here is how the numbers add up over the full 30 years:

- **Total of all payments:** {{ 300000 + loanTotalInterest(300000, 7, 30) | usd }}
- **Total interest paid:** {{ loanTotalInterest(300000, 7, 30) | usd }}
- **Principal repaid:** $300,000

You pay {{ loanTotalInterest(300000, 7, 30) | usd }} in interest on a $300,000 loan, {{ loanTotalInterest(300000, 7, 30) / 300000 * 100 | pct }} of what you borrowed. That is the cost of borrowing at 7% for three decades.

## Can you afford a $300K mortgage?

A common lender guideline keeps total housing costs (principal, interest, property tax and homeowners insurance) at or below 28% of gross income. If principal and interest alone were 28% of your income, you would need {{ loanPayment(300000, 7, 30) / 28 * 100 | usd }} a month, or about {{ loanPayment(300000, 7, 30) / 28 * 100 * 12 | roundTo(100) | usd }} a year. Property tax, insurance and (with under 20% down) private mortgage insurance come on top, so the income you need is higher. The [mortgage affordability calculator](/tools/debt-and-loans/mortgage-affordability/) works backwards from your income and debts to a price.

## How rate changes and extra payments shift the cost

- **You put 20% down on a $375,000 home:** Your loan amount stays $300,000, but you avoid private mortgage insurance (PMI), a monthly charge on loans with less than 20% down.
- **Rates drop to 6%:** Your monthly payment falls to {{ loanPayment(300000, 6, 30) | usd(2) }}, saving {{ loanPayment(300000, 7, 30) - loanPayment(300000, 6, 30) | usd }} a month, or {{ loanTotalInterest(300000, 7, 30) - loanTotalInterest(300000, 6, 30) | usd }} over the life of the loan.
- **You choose a 15-year term:** The payment rises to {{ loanPayment(300000, 7, 15) | usd(2) }}, but total interest falls to {{ loanTotalInterest(300000, 7, 15) | usd }}, saving {{ loanTotalInterest(300000, 7, 30) - loanTotalInterest(300000, 7, 15) | usd }}. (Shorter terms usually come with a lower rate, which widens the gap; the 15-year average was {{ rate('us15') | pct(2) }}, {{ rateSource('us15') }}.)
- **You make one extra payment a year:** Paying a thirteenth payment ({{ loanPayment(300000, 7, 30) | usd }}) every year clears the mortgage {{ overpaymentSaving(300000, 7, 30, yearly=loanPayment(300000, 7, 30)).monthsSaved | months }} early, in {{ overpaymentSaving(300000, 7, 30, yearly=loanPayment(300000, 7, 30)).months | months }}, and saves {{ overpaymentSaving(300000, 7, 30, yearly=loanPayment(300000, 7, 30)).interestSaved | usd }} in interest.

## Nearby loan amounts

At the same 7% rate over 30 years, [a $250,000 loan](/scenarios/mortgage-payments-by-amount/#250k) costs {{ loanPayment(250000, 7, 30) | usd(2) }} a month and [a $350,000 loan](/scenarios/mortgage-payments-by-amount/#350k) costs {{ loanPayment(350000, 7, 30) | usd(2) }}. The relationship is linear: every $50,000 of borrowing adds {{ loanPayment(50000, 7, 30) | usd }} to the monthly payment at this rate, which makes it easy to translate a change in purchase price or down payment into your monthly budget.

Every fraction of a percent matters at this loan size. Use the [Mortgage Payment Calculator](/tools/debt-and-loans/mortgage-payment/) to model your exact scenario: adjust the rate, term and down payment, and see how extra payments change the total cost. The formula and its assumptions are on the [mortgage payment methodology page](/how-we-calculate/mortgage-payment/).
