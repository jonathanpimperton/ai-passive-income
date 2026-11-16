---
title: "15-Year vs 30-Year Mortgage: Which Saves You More?"
slug: "15-year-vs-30-year-mortgage"
description: "15-year vs 30-year mortgage on a $300,000 loan at current rates: monthly payment, total interest, the investing argument tested, and who can qualify."
keywords:
  - "15 year vs 30 year mortgage"
  - "mortgage term comparison"
  - "15 year mortgage pros and cons"
relatedTools:
  - "mortgage-payment"
  - "loan-amortization"
  - "mortgage-affordability"
  - "compound-interest"
verdict: "Take the 15-year if its payment, with taxes and insurance, fits under 28% of your gross income, you hold six months of expenses in reserve and you owe nothing at a higher rate. Otherwise take the 30-year and prepay when you can. On a $300,000 loan the 15-year saves {{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }} of interest. Whether investing the difference beats that depends on the return you assume, which the table below tests at 5%, 8% and 10%."
comparisonTable:
  - feature: "Rate (weekly average, {{ rateSource('us30') }})"
    option1: "{{ rate('us15') | pct(2) }}"
    option2: "{{ rate('us30') | pct(2) }}"
  - feature: "Monthly principal and interest on $300,000"
    option1: "{{ loanPayment(300000, rate('us15'), 15) | usd }}"
    option2: "{{ loanPayment(300000, rate('us30'), 30) | usd }}"
  - feature: "Total interest paid"
    option1: "{{ loanTotalInterest(300000, rate('us15'), 15) | usd }}"
    option2: "{{ loanTotalInterest(300000, rate('us30'), 30) | usd }}"
  - feature: "Interest saved by the 15-year"
    option1: "{{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }}"
    option2: "—"
  - feature: "Loan balance after 5 years"
    option1: "{{ loanBalance(300000, rate('us15'), 15, 60) | usd }}"
    option2: "{{ loanBalance(300000, rate('us30'), 30, 60) | usd }}"
  - feature: "Extra cash needed each month"
    option1: "{{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more"
    option2: "—"
  - feature: "Income needed at 28% (with $600 a month taxes and insurance)"
    option1: "{{ (loanPayment(300000, rate('us15'), 15) + 600) / 0.28 * 12 | roundTo(1000) | usd }}"
    option2: "{{ (loanPayment(300000, rate('us30'), 30) + 600) / 0.28 * 12 | roundTo(1000) | usd }}"
affiliateContext: "Compare mortgage rates"
affiliatePrograms:
  - "LendingTree"
faq:
  - question: "Is a 15-year mortgage worth it?"
    answer: "It is when the payment fits comfortably. On a $300,000 loan at the survey rates the 15-year costs {{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more a month and saves {{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }} of interest. It is a poor fit if that extra payment would leave you without an emergency fund or force you to cut retirement saving."
  - question: "Is it better to take a 30-year mortgage and invest the difference?"
    answer: "Only if your investments reliably beat the mortgage rate by a wide margin. At the survey rates, a 5% return a year leaves the 15-year path with {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 5, 15) | usd }} and the 30-year path with {{ compoundFV(0, (loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)), 5, 30) | usd }} after 30 years; at 8% it is {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 8, 15) | usd }} against {{ compoundFV(0, (loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)), 8, 30) | usd }}; at 10% it is {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 10, 15) | usd }} against {{ compoundFV(0, (loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)), 10, 30) | usd }}. Invested money can fall, while interest you do not pay is a certain saving."
  - question: "Can I get a 30-year mortgage and pay it off like a 15-year?"
    answer: "Yes, if the loan has no prepayment penalty (most US mortgages have none). Paying the 15-year payment amount of {{ loanPayment(300000, rate('us15'), 15) | usd }} a month on a 30-year loan at {{ rate('us30') | pct(2) }} clears it in {{ overpaymentSaving(300000, rate('us30'), 30, monthly=loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)).months | months }}, but you pay more interest than on a true 15-year loan because the 30-year rate is higher."
  - question: "How much income do I need for a 15-year mortgage?"
    answer: "As a rule of thumb lenders start from housing costs at or below 28% of gross income. With $600 a month for taxes and insurance, a $300,000 loan needs about {{ (loanPayment(300000, rate('us15'), 15) + 600) / 0.28 * 12 | roundTo(1000) | usd }} a year on the 15-year and about {{ (loanPayment(300000, rate('us30'), 30) + 600) / 0.28 * 12 | roundTo(1000) | usd }} on the 30-year. Lenders can approve higher ratios, so treat 28% as a guide to comfort, not a hard limit."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "Freddie Mac — Primary Mortgage Market Survey (weekly 15-year and 30-year averages)"
    url: "https://www.freddiemac.com/pmms"
  - name: "CFPB — What is a debt-to-income ratio?"
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-why-is-the-43-debt-to-income-ratio-important-en-1791/"
---

## The core trade-off

A 15-year mortgage costs more each month and saves a large amount of interest. The figures below are for a $300,000 loan at the Freddie Mac survey averages: {{ rate('us15') | pct(2) }} for 15 years and {{ rate('us30') | pct(2) }} for 30 years ({{ rateSource('us30') }}). Those are national averages, not a quote, so [run your own rate](/tools/debt-and-loans/mortgage-payment/).

- **15-year:** {{ loanPayment(300000, rate('us15'), 15) | usd }} a month, {{ loanTotalInterest(300000, rate('us15'), 15) | usd }} of interest in total.
- **30-year:** {{ loanPayment(300000, rate('us30'), 30) | usd }} a month, {{ loanTotalInterest(300000, rate('us30'), 30) | usd }} of interest in total.

The 15-year saves {{ loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15) | usd }}, which is {{ (loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15)) / 300000 * 100 | pct }} of the amount you borrowed. The catch is the payment: {{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} more every month, money you cannot spend, invest or hold as a buffer.

## The decision rule

Take the **15-year** only if all of these are true:

- Principal, interest, taxes and insurance stay under **28% of gross income**, with your other debts still under about 36%.
- You hold **six months of expenses** in cash after the down payment and closing costs.
- You have no [debt at a higher rate than the mortgage](/comparisons/pay-off-debt-vs-invest/), such as credit cards or private student loans.
- Your income is stable enough that the higher payment does not depend on a bonus or a second earner.

If any one of these fails, take the **30-year** and treat the 15-year payment as a target rather than an obligation. The last section shows how little that costs you. 28% and 36% are rules of thumb: conventional underwriting can approve higher ratios, so they describe comfort, not eligibility.

## Does investing the difference beat the 15-year?

This is the usual argument for the 30-year, so test it fairly. Assume the same total outlay either way: the 15-year payment of {{ loanPayment(300000, rate('us15'), 15) | usd }} a month for 30 years. The 15-year borrower pays it for 15 years and then invests all of it for 15 years. The 30-year borrower pays {{ loanPayment(300000, rate('us30'), 30) | usd }} and invests the other {{ loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30) | usd }} for the full 30 years. After year 30 both own the house outright.

| Return on invested money, per year | 15-year borrower ends with | 30-year borrower ends with |
|---|---|---|
| 5% | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 5, 15) | usd }} | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30), 5, 30) | usd }} |
| 8% | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 8, 15) | usd }} | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30), 8, 30) | usd }} |
| 10% | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15), 10, 15) | usd }} | {{ compoundFV(0, loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30), 10, 30) | usd }} |

Compare the two columns at each return in the table above. Two things drive the result:

- **The 15-year loan carries a lower rate.** If both loans carried the same 6% rate, investing the difference at 8% would leave the 30-year borrower {{ compoundFV(0, loanPayment(300000, 6, 15) - loanPayment(300000, 6, 30), 8, 30) - compoundFV(0, loanPayment(300000, 6, 15), 8, 15) | usd }} ahead. The lower 15-year rate shifts the result toward the 15-year.
- **The 30-year borrower is in debt for longer.** After 15 years they hold {{ compoundFV(0, loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30), 8, 15) | usd }} invested at 8%, but still owe {{ loanBalance(300000, rate('us30'), 30, 180) | usd }} on the mortgage.

Treat the table as a statement about risk. Interest you do not pay is certain. Returns on investments are not, and most borrowers do not invest the difference every month for 30 years.

## Can you even qualify?

On the same $300,000 loan, assuming $600 a month for property tax and insurance and a 28% limit:

| | 15-year | 30-year |
|---|---|---|
| Principal and interest | {{ loanPayment(300000, rate('us15'), 15) | usd }} a month | {{ loanPayment(300000, rate('us30'), 30) | usd }} a month |
| With $600 taxes and insurance | {{ loanPayment(300000, rate('us15'), 15) + 600 | usd }} a month | {{ loanPayment(300000, rate('us30'), 30) + 600 | usd }} a month |
| Gross income needed at 28% | about {{ (loanPayment(300000, rate('us15'), 15) + 600) / 0.28 * 12 | roundTo(1000) | usd }} | about {{ (loanPayment(300000, rate('us30'), 30) + 600) / 0.28 * 12 | roundTo(1000) | usd }} |

The 15-year needs roughly {{ (loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)) / 0.28 * 12 | roundTo(1000) | usd }} more income for the same loan. For many buyers the 15-year is limited by qualification before strategy comes into it. The [mortgage affordability calculator](/tools/debt-and-loans/mortgage-affordability/) shows what your income supports.

## The middle path: a 30-year loan, paid like a 15-year

Most US borrowers choose the 30-year, and most do not invest every spare dollar. A practical compromise is to take the 30-year for the lower required payment and send extra money to principal when you can.

Know what the flexibility costs. Pay {{ loanPayment(300000, rate('us15'), 15) | usd }} a month on the 30-year loan at {{ rate('us30') | pct(2) }} and you are debt-free in {{ overpaymentSaving(300000, rate('us30'), 30, monthly=loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)).months | months }}, having paid {{ overpaymentSaving(300000, rate('us30'), 30, monthly=loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)).interest | usd }} of interest. That is {{ overpaymentSaving(300000, rate('us30'), 30, monthly=loanPayment(300000, rate('us15'), 15) - loanPayment(300000, rate('us30'), 30)).interest - loanTotalInterest(300000, rate('us15'), 15) | usd }} more than the true 15-year, because the rate premium never goes away. In return you can drop back to the {{ loanPayment(300000, rate('us30'), 30) | usd }} payment in any month you need to. See [how prepayment works](/tools/debt-and-loans/loan-amortization/) for your own numbers.
