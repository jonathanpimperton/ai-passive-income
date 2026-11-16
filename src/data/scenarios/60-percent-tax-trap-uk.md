---
title: "UK 60% Tax Trap: You Keep {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} of Every £1,000"
slug: "60-percent-tax-trap-uk"
description: "60% tax trap UK: between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }} the Personal Allowance taper leaves you {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} from every extra £1,000. Exact take-home at each step, {{ taxYear('uk') }}."
keywords: ["60 tax trap uk", "60 percent tax trap", "100k tax trap", "personal allowance taper", "marginal tax rate over 100k uk", "tax on 120k salary uk"]
toolSlug: "salary-uk"
toolCategory: "income-and-planning"
inputs:
  Salary range: "£100,000–{{ ukFact('additionalRateThreshold') | gbp }}"
  Tax Code: "1257L"
  Tax Year: "{{ taxYear('uk') }}"
resultSummary: "{{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} kept of every extra £1,000"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "What is the 60% tax trap in the UK?"
    answer: "Between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }} of adjusted net income, your Personal Allowance is withdrawn at £1 for every £2 earned over £100,000. Combined with {{ ukFact('higherRate') | pct }} income tax, that creates an effective {{ ukMarginalRate(110000) - ukFact('niUpperRate') | pct }} income tax rate on this band — {{ ukMarginalRate(110000) | pct }} once {{ ukFact('niUpperRate') | pct }} National Insurance is included."
  - question: "Is the marginal rate in the trap 60% or 62%?"
    answer: "Both figures are correct: {{ ukMarginalRate(110000) - ukFact('niUpperRate') | pct }} is the effective income tax rate alone ({{ ukFact('higherRate') | pct }} tax plus {{ ukMarginalRate(110000) - ukFact('niUpperRate') - ukFact('higherRate') | pct }} from the shrinking allowance). Adding {{ ukFact('niUpperRate') | pct }} employee National Insurance brings the total marginal deduction to {{ ukMarginalRate(110000) | pct }}, which is why £1,000 extra gross adds only {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} to take-home."
  - question: "How much of the £100,000 to {{ ukFact('additionalRateThreshold') | gbp }} band do you actually keep?"
    answer: "Earning the full band means {{ ukFact('additionalRateThreshold') - 100000 | gbp }} of extra gross pay, of which you keep {{ ukTakeHome(ukFact('additionalRateThreshold')) - ukTakeHome(100000) | gbp }} — {{ (ukTakeHome(ukFact('additionalRateThreshold')) - ukTakeHome(100000)) / (ukFact('additionalRateThreshold') - 100000) * 100 | pct }}. Take-home rises from {{ ukTakeHome(100000) | gbp }} a year ({{ ukTakeHome(100000) / 12 | gbp }} a month) at £100,000 to {{ ukTakeHome(ukFact('additionalRateThreshold')) | gbp }} a year ({{ ukTakeHome(ukFact('additionalRateThreshold')) / 12 | gbp }} a month) at {{ ukFact('additionalRateThreshold') | gbp }}."
  - question: "What happens to the marginal rate above {{ ukFact('additionalRateThreshold') | gbp }}?"
    answer: "It falls. Once the Personal Allowance is fully gone, the taper stops and income above {{ ukFact('additionalRateThreshold') | gbp }} is taxed at the {{ ukFact('additionalRate') | pct }} additional rate plus {{ ukFact('niUpperRate') | pct }} National Insurance — a {{ ukMarginalRate(130000) | pct }} marginal rate, lower than the {{ ukMarginalRate(110000) | pct }} in the trap."
  - question: "How do people avoid the 60% tax trap?"
    answer: "The standard mitigation is pension contributions: adjusted net income is measured after gross pension contributions, so many people in this band contribute enough to bring it below £100,000, which restores the full allowance. Gift Aid donations also reduce adjusted net income. What suits you depends on your circumstances."
---

## Every extra £1,000 in this band is worth {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }}

**Between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }}, each extra £1,000 you earn adds just {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} to your take-home pay.** The marginal deduction rate is {{ ukMarginalRate(110000) | pct }} — higher than the {{ ukMarginalRate(200000) | pct }} someone on £200,000 pays on their next pound, and the highest rate on the standard income tax and NI schedule.

Across the whole band the numbers are stark: earning the full {{ ukFact('additionalRateThreshold') - 100000 | gbp }} from £100,000 to {{ ukFact('additionalRateThreshold') | gbp }} adds {{ ukTakeHome(ukFact('additionalRateThreshold')) - ukTakeHome(100000) | gbp }} a year ({{ (ukTakeHome(ukFact('additionalRateThreshold')) - ukTakeHome(100000)) / 12 | gbp }} a month) to your take-home. You keep {{ 100 - ukMarginalRate(110000) | int }}p of every pound. If you are asking what £100,000 itself pays, the [£100,000 breakdown](/scenarios/100k-salary-uk-tax/) has it: {{ ukTakeHome(100000) | gbp }} a year, {{ ukTakeHome(100000) / 12 | gbp }} a month.

## Why the trap exists

Nothing in the headline tax bands says "60%". The trap comes from the Personal Allowance taper: once adjusted net income passes £100,000, your {{ ukFact('personalAllowance') | gbp }} tax-free allowance is withdrawn at **£1 for every £2** over the threshold. It is fully gone at {{ ukFact('additionalRateThreshold') | gbp }}.

Follow one extra £100 earned at £110,000:

- **{{ 100 * ukFact('higherRate') / 100 | gbp }}** — income tax at the {{ ukFact('higherRate') | pct }} higher rate
- **{{ 100 / 2 * ukFact('higherRate') / 100 | gbp }}** — the £100 removes {{ 100 / 2 | gbp }} of Personal Allowance, and that {{ 100 / 2 | gbp }} becomes taxable at {{ ukFact('higherRate') | pct }}
- **{{ 100 * ukFact('niUpperRate') / 100 | gbp }}** — employee National Insurance at {{ ukFact('niUpperRate') | pct }}

Total: {{ ukMarginalRate(110000) | gbp }} deducted, {{ 100 - ukMarginalRate(110000) | gbp }} kept. The taper effectively doubles the higher rate's bite without any band changing its published rate — which is exactly why so many people only discover the trap when their first payslip after a rise looks wrong.

## Take-home through the trap ({{ taxYear('uk') }})

| Salary | Personal allowance | Income tax | National Insurance | Take-home (year) | Take-home (month) |
|---|---|---|---|---|---|
| £100,000 | {{ ukPay(100000).personalAllowance | gbp }} | {{ ukIncomeTax(100000) | gbp }} | {{ ukNi(100000) | gbp }} | {{ ukTakeHome(100000) | gbp }} | {{ ukTakeHome(100000) / 12 | gbp }} |
| £110,000 | {{ ukPay(110000).personalAllowance | gbp }} | {{ ukIncomeTax(110000) | gbp }} | {{ ukNi(110000) | gbp }} | {{ ukTakeHome(110000) | gbp }} | {{ ukTakeHome(110000) / 12 | gbp }} |
| £120,000 | {{ ukPay(120000).personalAllowance | gbp }} | {{ ukIncomeTax(120000) | gbp }} | {{ ukNi(120000) | gbp }} | {{ ukTakeHome(120000) | gbp }} | {{ ukTakeHome(120000) / 12 | gbp }} |
| {{ ukFact('additionalRateThreshold') | gbp }} | {{ ukPay(ukFact('additionalRateThreshold')).personalAllowance | gbp }} | {{ ukIncomeTax(ukFact('additionalRateThreshold')) | gbp }} | {{ ukNi(ukFact('additionalRateThreshold')) | gbp }} | {{ ukTakeHome(ukFact('additionalRateThreshold')) | gbp }} | {{ ukTakeHome(ukFact('additionalRateThreshold')) / 12 | gbp }} |

Each £10,000 step inside the trap adds exactly {{ ukTakeHome(110000) - ukTakeHome(100000) | gbp }} to annual take-home — {{ (ukTakeHome(110000) - ukTakeHome(100000)) / 12 | gbp }} a month for {{ 10000 / 12 | gbp }} a month of gross pay. Figures use the standard 1257L code and England/Wales/NI rates; see the [£100,000 row](/scenarios/uk-take-home-pay/#100k) and the [£110,000](/scenarios/uk-take-home-pay/#110k) and [£120,000](/scenarios/uk-take-home-pay/#120k) rows of the full take-home table for every salary from £20,000 to £150,000, or the breakdown of [tax at exactly £100,000](/scenarios/100k-salary-uk-tax/) — the last point before the trap opens.

## Above {{ ukFact('additionalRateThreshold') | gbp }}, the pressure releases

This is the strangest feature of the trap: once the allowance is fully withdrawn, the taper stops. Income above {{ ukFact('additionalRateThreshold') | gbp }} faces the {{ ukFact('additionalRate') | pct }} additional rate plus {{ ukFact('niUpperRate') | pct }} NI — a **{{ ukMarginalRate(130000) | pct }} marginal rate**. Earning your way from £120,000 to £130,000 means your marginal rate *falls* from {{ ukMarginalRate(120000) | pct }} to {{ ukMarginalRate(130000) | pct }} partway through. The UK tax system charges its steepest rate not at the top, but in the middle of six figures.

## The standard mitigation: pension contributions

The taper is based on **adjusted net income**, not salary — and adjusted net income is calculated after deducting gross pension contributions and Gift Aid donations. This is why the near-universal response to the trap is pensions: many people earning in this band contribute enough to bring adjusted net income below £100,000, which restores the full Personal Allowance. Every pound contributed inside the trap effectively avoids the {{ ukMarginalRate(110000) - ukFact('niUpperRate') | pct }} rate, and salary sacrifice arrangements save the {{ ukFact('niUpperRate') | pct }} NI as well. [Tax at £100,000](/scenarios/100k-salary-uk-tax/) works through a £5,000 contribution on a £105,000 salary.

Whether that trade-off makes sense for you depends on cash-flow needs, existing pension provision, and annual allowance limits — this is a description of how the rules work, not personal advice.

If you have children in childcare, the £100,000 threshold does something worse than taper: it is a cliff edge for Tax-Free Childcare and funded hours. [The £100K childcare cliff](/scenarios/100k-childcare-cliff-uk/) covers why a rise there can cost more than it pays. And for how rises land at lower salaries, see [what a £40,000 to £50,000 rise is actually worth](/scenarios/pay-rise-shock-uk/).

Model your own numbers in the [UK Salary Calculator](/tools/income-and-planning/salary-uk/). It shows your adjusted net income, flags the trap, and gives the extra yearly pension contribution that would bring you back to £100,000. The method is in [how we calculate UK take-home pay](/how-we-calculate/salary-uk/).
