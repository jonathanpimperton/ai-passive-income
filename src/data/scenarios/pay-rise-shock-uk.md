---
title: "£40k to £50k Rise: +{{ (ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp }} a Month, +{{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }} a Year"
slug: "pay-rise-shock-uk"
description: "A £40,000 to £50,000 pay rise adds {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp }} a month ({{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }} a year) to take-home, {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 10000 * 100 | pct }} of the rise. Where the rest goes, and why rises near £100K keep far less."
keywords: ["pay rise take home uk", "40k to 50k pay rise", "how much of a pay rise do you keep uk", "pay rise after tax uk", "10000 pay rise take home", "pay rise calculator uk"]
toolSlug: "salary-uk"
toolCategory: "income-and-planning"
inputs:
  Salary before: "£40,000"
  Salary after: "£50,000"
  Tax year: "{{ taxYear('uk') }}"
resultSummary: "+{{ (ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp }} a month, +{{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }} a year"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "How much of a £10,000 pay rise do you keep in the UK?"
    answer: "It depends where the rise sits. Between {{ ukFact('personalAllowance') | gbp }} and {{ ukFact('higherRateThreshold') | gbp }} you keep {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 10000 * 100 | pct }} ({{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }} of £10,000) after {{ ukFact('basicRate') | pct }} income tax and {{ ukFact('niMainRate') | pct }} National Insurance. Between {{ ukFact('higherRateThreshold') | gbp }} and £100,000 you keep {{ 100 - ukMarginalRate(60000) | int }}%. Between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }} the Personal Allowance taper cuts it to {{ 100 - ukMarginalRate(110000) | int }}%."
  - question: "Why do I only keep {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 10000 * 100 | pct }} of my pay rise?"
    answer: "Every pound of a rise inside the basic-rate band loses {{ ukFact('basicRate') | int }}p to income tax and {{ ukFact('niMainRate') | int }}p to employee National Insurance — {{ ukMarginalRate(50000) | int }}p in total. Your existing salary keeps its Personal Allowance, so only the new pounds are taxed, all at the basic rate."
  - question: "Does a pay rise increase the tax on the salary I already earn?"
    answer: "No. UK income tax is marginal — only the pounds above each threshold are taxed at the higher rate. A rise from £40,000 to £50,000 changes nothing about how your first £40,000 is taxed. The one exception is above £100,000, where extra income also shrinks your Personal Allowance."
  - question: "How much of a pay rise do you keep above £100,000?"
    answer: "Only {{ 100 - ukMarginalRate(110000) | int }}%. Between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }} the Personal Allowance taper adds an effective {{ ukMarginalRate(110000) - ukFact('niUpperRate') - ukFact('higherRate') | pct }} on top of {{ ukFact('higherRate') | pct }} income tax and {{ ukFact('niUpperRate') | pct }} National Insurance, so each extra £1,000 adds just {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} to your take-home."
---

## A £10,000 rise puts {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp }} a month in your pocket

**Move from £40,000 to £50,000 and your annual take-home pay rises from {{ ukTakeHome(40000) | gbp }} to {{ ukTakeHome(50000) | gbp }} — an extra {{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }} a year, or {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp }} a month.** You keep {{ (ukTakeHome(50000) - ukTakeHome(40000)) / 10000 * 100 | pct }} of the rise. The other {{ 10000 - (ukTakeHome(50000) - ukTakeHome(40000)) | gbp }} goes to HMRC before it ever reaches your bank account.

That is a genuinely good outcome by UK standards. Every pound between £40,000 and £50,000 sits inside the basic-rate band, which is the cheapest place a pay rise can land.

## The before and after

| | £40,000 | £50,000 |
|---|---|---|
| Income tax | {{ ukIncomeTax(40000) | gbp }} | {{ ukIncomeTax(50000) | gbp }} |
| National Insurance | {{ ukNi(40000) | gbp }} | {{ ukNi(50000) | gbp }} |
| **Take-home (year)** | **{{ ukTakeHome(40000) | gbp }}** | **{{ ukTakeHome(50000) | gbp }}** |
| **Take-home (month)** | **{{ ukTakeHome(40000) / 12 | gbp }}** | **{{ ukTakeHome(50000) / 12 | gbp }}** |
| Effective rate | {{ ukPay(40000).taxRate | pct1 }} | {{ ukPay(50000).taxRate | pct1 }} |

Figures use the standard 1257L tax code, England/Wales/NI rates for {{ taxYear('uk') }}, no pension or student loan. The [£40,000 row](/scenarios/uk-take-home-pay/#40k) and [£50,000 row](/scenarios/uk-take-home-pay/#50k) of the UK take-home pay table show the same numbers, and the table covers every salary from £20,000 to £150,000 on the same basis. The [£50,000 page](/scenarios/50k-salary-uk-take-home/) breaks the new salary down line by line.

## Where the {{ 10000 - (ukTakeHome(50000) - ukTakeHome(40000)) | gbp }} goes

The whole rise is taxed at the basic-band marginal rate:

- **Income tax at {{ ukFact('basicRate') | pct }}** — {{ 10000 * ukFact('basicRate') / 100 | gbp }} of the £10,000
- **Employee National Insurance at {{ ukFact('niMainRate') | pct }}** — {{ 10000 * ukFact('niMainRate') / 100 | gbp }}

Notice that your *effective* rate barely moves — from {{ ukPay(40000).taxRate | pct1 }} to {{ ukPay(50000).taxRate | pct1 }} — because your Personal Allowance still shelters the first {{ ukFact('personalAllowance') | gbp }} either way. What matters for a rise is the *marginal* rate: what each new pound loses. Inside the basic band, that is a flat {{ ukMarginalRate(50000) | int }}p in the pound.

One caveat: the basic band runs out at {{ ukFact('higherRateThreshold') | gbp }}. A rise that carries you past that point starts losing {{ ukMarginalRate(60000) | int }}p in the pound ({{ ukFact('higherRate') | pct }} income tax, but National Insurance drops to {{ ukFact('niUpperRate') | pct }}) on everything above the threshold. So a £50,000 to £60,000 rise keeps {{ 100 - ukMarginalRate(60000) | int }}% of the amount over {{ ukFact('higherRateThreshold') | gbp }}, not {{ 100 - ukMarginalRate(50000) | int }}%.

## The harsher version: £95,000 to £105,000

Now run the same £10,000 rise for someone on £95,000. Take-home goes from {{ ukTakeHome(95000) | gbp }} to {{ ukTakeHome(105000) | gbp }} — just **{{ ukTakeHome(105000) - ukTakeHome(95000) | gbp }} a year, or {{ (ukTakeHome(105000) - ukTakeHome(95000)) / 12 | gbp }} a month. You keep {{ (ukTakeHome(105000) - ukTakeHome(95000)) / 10000 * 100 | pct }}.**

The rise splits into two very different halves:

- **£95,000 to £100,000** — taxed at the {{ ukMarginalRate(95000) | pct }} marginal rate. You keep {{ ukTakeHome(100000) - ukTakeHome(95000) | gbp }} of the £5,000.
- **£100,000 to £105,000** — inside the Personal Allowance taper. Every £2 earned over £100,000 removes £1 of your tax-free allowance, which pushes the marginal rate to {{ ukMarginalRate(110000) | pct }} ({{ ukFact('higherRate') | pct }} tax + {{ ukMarginalRate(110000) - ukFact('niUpperRate') - ukFact('higherRate') | pct }} from the shrinking allowance + {{ ukFact('niUpperRate') | pct }} NI). You keep just {{ ukTakeHome(105000) - ukTakeHome(100000) | gbp }} of this £5,000.

The taper runs all the way to {{ ukFact('additionalRateThreshold') | gbp }}, where the allowance is gone entirely. [The 60% tax trap](/scenarios/60-percent-tax-trap-uk/) walks through that band pound by pound — and if you have children in childcare, crossing £100,000 [can cost more than the rise pays](/scenarios/100k-childcare-cliff-uk/). The [£100,000 page](/scenarios/100k-salary-uk-tax/) has the exact take-home at the start of the band.

## Negotiate in gross, think in net

When you are weighing up an offer or a promotion, translate it before you react:

- In the basic band, a rise is worth **{{ 100 - ukMarginalRate(50000) | int }}p per pound** — £1,000 gross is {{ 1000 * (100 - ukMarginalRate(50000)) / 100 / 12 | gbp }} a month in your pocket.
- Between {{ ukFact('higherRateThreshold') | gbp }} and £100,000, it is worth **{{ 100 - ukMarginalRate(60000) | int }}p per pound** — £1,000 gross is about {{ 1000 * (100 - ukMarginalRate(60000)) / 100 / 12 | gbp }} a month.
- Between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }}, it is worth **{{ 100 - ukMarginalRate(110000) | int }}p per pound** — £1,000 gross is about {{ 1000 * (100 - ukMarginalRate(110000)) / 100 / 12 | gbp }} a month.

If a rise lands you in an expensive band, extra employer pension contributions or salary sacrifice can be worth more than the same amount as gross pay, because sacrificed salary is never taxed or NI'd in the first place. Whether that trade makes sense depends on your circumstances — the point is to compare like with like.

A student loan changes the arithmetic too: Plan 2 or [Plan 5 repayments](/scenarios/plan-5-student-loans-explained/) add another {{ ukFact('studentLoanRate') | pct }} to the marginal rate on top of everything above.

The [UK Salary Calculator](/tools/income-and-planning/salary-uk/) handles Scottish rates, pension contributions, student loans, and tax codes. It has no before-and-after mode, so for a rise run it twice, once at your current salary and once at the new one, and compare the take-home figures (it shows both a yearly and a monthly figure). The method is in [how we calculate UK take-home pay](/how-we-calculate/salary-uk/).
