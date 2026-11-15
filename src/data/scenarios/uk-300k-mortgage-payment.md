---
title: "£300k UK Mortgage: {{ loanPayment(300000, 5.5, 25) | gbp }} a Month at 5.5%"
slug: "uk-300k-mortgage-payment"
description: "£300,000 UK repayment mortgage at 5.5% over 25 years: {{ loanPayment(300000, 5.5, 25) | gbp }} a month and {{ loanTotalInterest(300000, 5.5, 25) | gbp }} interest. Overpayments, stamp duty, and how current rates change it."
keywords: ["300k mortgage uk", "300000 mortgage payment uk", "uk mortgage calculator", "300k mortgage monthly payment"]
toolSlug: "mortgage-payment"
toolCategory: "debt-and-loans"
inputs:
  Loan Amount: "£300,000"
  Interest Rate: "5.5%"
  Loan Term: "25 years"
resultSummary: "{{ loanPayment(300000, 5.5, 25) | gbp }} a month ({{ loanTotalInterest(300000, 5.5, 25) | gbp }} total interest)"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## Your monthly payment is {{ loanPayment(300000, 5.5, 25) | gbp }} — and you pay {{ loanTotalInterest(300000, 5.5, 25) | gbp }} in interest

**A £300,000 repayment mortgage at 5.5% over 25 years costs {{ loanPayment(300000, 5.5, 25) | gbp }} per month.** Over the full term, you will pay {{ 300000 + loanTotalInterest(300000, 5.5, 25) | gbp }} in total. The {{ loanTotalInterest(300000, 5.5, 25) | gbp }} in interest is {{ loanTotalInterest(300000, 5.5, 25) / 300000 * 100 | pct }} of the original loan amount.

5.5% is an illustration, not a quote. The Bank of England's average quoted rates for a 75% loan-to-value fix in October 2026 were {{ rate('uk2yr') | pct(2) }} for two years and {{ rate('uk5yr') | pct(2) }} for five ({{ rateSource('uk2yr') }}); Bank Rate then rose to {{ rate('boe') | pct(2) }} on 5 November, so offers today may be higher. At those averages the payment on £300,000 over 25 years is {{ loanPayment(300000, rate('uk2yr'), 25) | gbp }} (two-year fix) or {{ loanPayment(300000, rate('uk5yr'), 25) | gbp }} (five-year fix). Rates are a snapshot, not a forecast.

## UK mortgage basics: repayment vs interest-only

Most UK mortgages are repayment (capital + interest), meaning each monthly payment reduces the balance. The alternative — interest-only — charges just the interest each month ({{ 300000 * 5.5 / 100 / 12 | gbp }} on £300K at 5.5%) but leaves the full £300,000 due at the end of the term.

Interest-only mortgages were common before 2008 but lenders now require a credible repayment strategy (usually investments or property sale). For this scenario, we use a standard repayment mortgage.

## How the payments split over 25 years

| End of year | Interest in that year's last payment | Principal in that payment | Balance remaining |
|------|-----------------|-------------------|------------------|
| 1 | {{ loanMonth(300000, 5.5, 25, 12).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 12).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 12) | gbp }} |
| 5 | {{ loanMonth(300000, 5.5, 25, 60).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 60).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 60) | gbp }} |
| 10 | {{ loanMonth(300000, 5.5, 25, 120).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 120).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 120) | gbp }} |
| 15 | {{ loanMonth(300000, 5.5, 25, 180).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 180).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 180) | gbp }} |
| 20 | {{ loanMonth(300000, 5.5, 25, 240).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 240).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 240) | gbp }} |
| 25 | {{ loanMonth(300000, 5.5, 25, 300).interest | gbp }} | {{ loanMonth(300000, 5.5, 25, 300).principal | gbp }} | {{ loanBalance(300000, 5.5, 25, 300) | gbp }} |

The crossover from interest-heavy to principal-heavy payments comes just after year 12: principal is {{ loanMonth(300000, 5.5, 25, 144).principalShare | pct1 }} of the payment at the end of year 12 and {{ loanMonth(300000, 5.5, 25, 150).principalShare | pct1 }} by payment 150. In the first five years, you pay {{ loanPayment(300000, 5.5, 25) * 60 - (300000 - loanBalance(300000, 5.5, 25, 60)) | gbp }} in interest and only {{ 300000 - loanBalance(300000, 5.5, 25, 60) | gbp }} in principal.

## UK-specific costs on top of the mortgage

These extra lines are illustrative planning figures for an average home, not data for your area.

| Cost | Estimated monthly |
|------|------------------|
| Mortgage P&I | {{ loanPayment(300000, 5.5, 25) | gbp }} |
| Council tax (Band D, illustrative) | £175 |
| Buildings insurance | £25–£40 |
| Service charge (if leasehold) | £100–£300 |
| Maintenance (1% of £300,000 a year, a common rule of thumb) | {{ 300000 / 100 / 12 | gbp }} |
| **Total housing cost** | **~{{ loanPayment(300000, 5.5, 25) + 175 + 25 + 100 + 300000 / 100 / 12 | gbp }}–{{ loanPayment(300000, 5.5, 25) + 175 + 40 + 300 + 300000 / 100 / 12 | gbp }}** |

Stamp Duty is a one-off cost at purchase, not monthly. In England and Northern Ireland, buying a £300,000 home costs {{ sdlt(300000) | gbp }} in SDLT at standard rates ({{ sdlt(300000, buyer=ftb) | gbp }} for a first-time buyer). If £300,000 is the mortgage on a {{ 300000 / 80 * 100 | gbp }} home bought with a 20% deposit, the bill is {{ sdlt(375000) | gbp }}, or {{ sdlt(375000, buyer=ftb) | gbp }} for a first-time buyer. These are the rates in force since 1 April 2025 ([GOV.UK](https://www.gov.uk/stamp-duty-land-tax/residential-property-rates)); check yours with the [Stamp Duty Calculator](/tools/economic/stamp-duty/) or see [first-time buyer stamp duty](/scenarios/stamp-duty-first-time-buyer-2026/).

## How rates affect a £300K mortgage

Each row below keeps the £300,000 loan and the 25-year term and changes only the rate, so you can find your own offer.

| Rate | Monthly payment | Total interest | vs 5.5% |
|------|----------------|---------------|---------|
| 4.0% | {{ loanPayment(300000, 4, 25) | gbp }} | {{ loanTotalInterest(300000, 4, 25) | gbp }} | −{{ loanPayment(300000, 5.5, 25) - loanPayment(300000, 4, 25) | gbp }}/month |
| 4.5% | {{ loanPayment(300000, 4.5, 25) | gbp }} | {{ loanTotalInterest(300000, 4.5, 25) | gbp }} | −{{ loanPayment(300000, 5.5, 25) - loanPayment(300000, 4.5, 25) | gbp }}/month |
| 5.0% | {{ loanPayment(300000, 5, 25) | gbp }} | {{ loanTotalInterest(300000, 5, 25) | gbp }} | −{{ loanPayment(300000, 5.5, 25) - loanPayment(300000, 5, 25) | gbp }}/month |
| 5.5% | {{ loanPayment(300000, 5.5, 25) | gbp }} | {{ loanTotalInterest(300000, 5.5, 25) | gbp }} | — |
| 6.0% | {{ loanPayment(300000, 6, 25) | gbp }} | {{ loanTotalInterest(300000, 6, 25) | gbp }} | +{{ loanPayment(300000, 6, 25) - loanPayment(300000, 5.5, 25) | gbp }}/month |
| 6.5% | {{ loanPayment(300000, 6.5, 25) | gbp }} | {{ loanTotalInterest(300000, 6.5, 25) | gbp }} | +{{ loanPayment(300000, 6.5, 25) - loanPayment(300000, 5.5, 25) | gbp }}/month |
| 7.0% | {{ loanPayment(300000, 7, 25) | gbp }} | {{ loanTotalInterest(300000, 7, 25) | gbp }} | +{{ loanPayment(300000, 7, 25) - loanPayment(300000, 5.5, 25) | gbp }}/month |

Each 0.5% step changes the payment by between {{ loanPayment(300000, 4.5, 25) - loanPayment(300000, 4, 25) | gbp }} (4.0% to 4.5%) and {{ loanPayment(300000, 7, 25) - loanPayment(300000, 6.5, 25) | gbp }} (6.5% to 7.0%) a month, and moves the total interest by between {{ loanTotalInterest(300000, 4.5, 25) - loanTotalInterest(300000, 4, 25) | gbp }} and {{ loanTotalInterest(300000, 7, 25) - loanTotalInterest(300000, 6.5, 25) | gbp }}. For other loan sizes, the [mortgage payments by amount](/scenarios/mortgage-payments-by-amount/#300k) table gives the payment at each rate (it shows a 30-year US-style term; the UK convention is 25 years, as here).

## Overpayments: the UK advantage

Many UK fixed-rate deals allow overpayments of up to 10% of the outstanding balance per year without early repayment charges, so check your own terms. On a £300,000 mortgage, 10% is up to {{ 300000 * 10 / 100 | gbp }} a year in extra payments.

| Overpayment | Payoff time | Interest saved |
|-------------|------------|----------------|
| £100/month | {{ overpaymentSaving(300000, 5.5, 25, monthly=100).months | months }} | {{ overpaymentSaving(300000, 5.5, 25, monthly=100).interestSaved | gbp }} |
| £200/month | {{ overpaymentSaving(300000, 5.5, 25, monthly=200).months | months }} | {{ overpaymentSaving(300000, 5.5, 25, monthly=200).interestSaved | gbp }} |
| £500/month | {{ overpaymentSaving(300000, 5.5, 25, monthly=500).months | months }} | {{ overpaymentSaving(300000, 5.5, 25, monthly=500).interestSaved | gbp }} |
| {{ 300000 * 10 / 100 | gbp }} (10%) lump sum at the start | {{ loanPayoff(300000 - 30000, 5.5, loanPayment(300000, 5.5, 25)).months | months }} | {{ loanTotalInterest(300000, 5.5, 25) - loanPayoff(300000 - 30000, 5.5, loanPayment(300000, 5.5, 25)).interest | gbp }} |

£200/month in overpayments cuts {{ overpaymentSaving(300000, 5.5, 25, monthly=200).monthsSaved | months }} off the mortgage and saves {{ overpaymentSaving(300000, 5.5, 25, monthly=200).interestSaved | gbp }}. This is often the best risk-free "return" available — equivalent to earning 5.5% tax-free on the overpaid amount.

## Fixed vs variable: the UK decision

UK mortgages typically offer 2-year or 5-year fixed periods before reverting to the lender's standard variable rate (SVR). The Bank of England's October 2026 average for variable-rate (reverting) mortgages was {{ rate('ukRevert') | pct(2) }} ({{ rateSource('ukRevert') }}), which on £300,000 over 25 years is {{ loanPayment(300000, rate('ukRevert'), 25) | gbp }} a month.

- **2-year fix at {{ rate('uk2yr') | pct(2) }}** (Bank of England October average): {{ loanPayment(300000, rate('uk2yr'), 25) | gbp }} a month, but you remortgage sooner and pay arrangement and legal fees each time.
- **5-year fix at {{ rate('uk5yr') | pct(2) }}** (Bank of England October average): {{ loanPayment(300000, rate('uk5yr'), 25) | gbp }} a month, with payment certainty for 5 years and fewer remortgaging events.
- **Tracker (Bank Rate + margin):** moves with the Bank of England rate, which was {{ rate('boe') | pct(2) }} from 5 November 2026. Your payment can fall or rise.

On a £300,000 mortgage, the gap between the October averages for a 2-year and 5-year fix is {{ loanPayment(300000, rate('uk2yr'), 25) - loanPayment(300000, rate('uk5yr'), 25) | gbp }} a month. Whether to lock in depends on how much a changing payment would hurt your budget.

Use the [Mortgage Payment Calculator](/tools/debt-and-loans/mortgage-payment/) to model your specific loan amount, rate, and term, or read [how we calculate mortgage payments](/how-we-calculate/mortgage-payment/).
