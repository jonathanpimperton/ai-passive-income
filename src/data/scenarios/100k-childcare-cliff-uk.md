---
title: "£100K Childcare Cliff: When a Pay Rise Costs You"
slug: "100k-childcare-cliff-uk"
description: "£100k childcare cliff: cross £100,000 adjusted net income and you lose Tax-Free Childcare and 30 funded hours on top of the 60% tax trap. What it really costs."
keywords: ["100k childcare cliff", "tax free childcare 100k limit", "30 free hours 100k salary", "adjusted net income childcare", "lose free childcare over 100k", "childcare 100k threshold uk"]
toolSlug: "salary-uk"
toolCategory: "income-and-planning"
inputs:
  Annual Salary: "£100,000"
  Childcare schemes: "Tax-Free Childcare + 30 hours"
  Tax Year: "{{ taxYear('uk') }}"
resultSummary: "A £5,000 rise nets {{ ukTakeHome(105000) - ukTakeHome(100000) | gbp }} and can cost up to £2,000 of childcare support"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "Do you lose Tax-Free Childcare at £100,000?"
    answer: "Yes. GOV.UK's eligibility rules say you cannot get Tax-Free Childcare if you — or your partner — have adjusted net income over £100,000. It is a cliff edge, not a taper: £1 over the threshold ends eligibility entirely."
  - question: "Is the £100,000 childcare limit based on salary or adjusted net income?"
    answer: "Adjusted net income — broadly your total taxable income minus gross pension contributions and Gift Aid donations. A £105,000 salary with a £5,000 gross pension contribution has adjusted net income of {{ ukPay(105000, pensionAmount=5000, method=net).ani | gbp }}, which is not over the limit, so it can keep both schemes."
  - question: "Can a pay rise actually leave you worse off in the UK?"
    answer: "Through tax alone, no — you always keep something, even if only {{ 100 - ukMarginalRate(110000) | int }}p per pound in the £100,000–{{ ukFact('additionalRateThreshold') | gbp }} band. But if a rise pushes adjusted net income over £100,000 and you lose Tax-Free Childcare and the 30 funded hours, the lost support can exceed what the rise adds, making the effective marginal cost more than 100%."
  - question: "How do parents keep childcare support above a £100,000 salary?"
    answer: "The test is adjusted net income, not salary, so the standard approach is pension contributions: many people in this band contribute enough to bring adjusted net income to £100,000 or below, which preserves childcare eligibility and restores the Personal Allowance at the same time. Whether that suits you depends on your circumstances."
---

## Cross £100,000 and you can lose more than you gain

**At £100,000, a £1,000 pay rise adds {{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }} to your take-home — and if it tips your adjusted net income over the threshold, it can simultaneously end every penny of your government childcare support.** For a parent using Tax-Free Childcare and the 30 funded hours, that trade can cost more than the rise pays: an effective marginal rate above 100%.

The tax side of this is the well-known [60% tax trap](/scenarios/60-percent-tax-trap-uk/) — {{ ukFact('higherRate') | pct }} income tax, plus {{ ukMarginalRate(110000) - ukFact('niUpperRate') - ukFact('higherRate') | pct }} from the Personal Allowance taper, plus {{ ukFact('niUpperRate') | pct }} National Insurance, leaves {{ 100 - ukMarginalRate(110000) | int }}p from each extra pound between £100,000 and {{ ukFact('additionalRateThreshold') | gbp }}. The childcare side is less discussed and sharper, because it is not a taper. It is a cliff. For what £100,000 itself pays, see the [£100,000 breakdown](/scenarios/100k-salary-uk-tax/) ({{ ukTakeHome(100000) | gbp }} a year, {{ ukTakeHome(100000) / 12 | gbp }} a month) or the [£100,000 row of the take-home table](/scenarios/uk-take-home-pay/#100k).

## Two schemes, one cliff edge

Two separate schemes hang off the same £100,000 test:

- **[Tax-Free Childcare](https://www.gov.uk/tax-free-childcare)** — the government adds £2 for every £8 you pay into a childcare account, up to £2,000 per child per year (£500 per quarter). Per GOV.UK, you are not eligible if you *or your partner* have adjusted net income over £100,000.
- **[Free childcare for working parents](https://www.gov.uk/free-childcare-if-working/check-youre-eligible)** (the 30 funded hours in England) — the same rule applies: if either parent's adjusted net income is over £100,000, the household loses the working-parent entitlement.

Both are all-or-nothing. There is no phase-out band: £99,999 qualifies in full, £100,001 qualifies for nothing. And because the test applies to each parent individually, one parent crossing the line ends eligibility no matter what the other earns.

## The maths of going just over

The tax figures are exact ({{ taxYear('uk') }}, standard tax code — verify them in the [take-home table](/scenarios/uk-take-home-pay/#100k)):

- A **£1,000 rise** at £100,000 nets you **{{ 1000 * (100 - ukMarginalRate(110000)) / 100 | gbp }}**.
- A **£5,000 rise** (to £105,000) nets you **{{ ukTakeHome(105000) - ukTakeHome(100000) | gbp }}** a year, which is {{ (ukTakeHome(105000) - ukTakeHome(100000)) / 12 | gbp }} a month.

Now set that against what the cliff takes away. The Tax-Free Childcare top-up alone is worth up to £2,000 per child per year. A parent claiming the full top-up for one child who accepts a £5,000 rise gains {{ ukTakeHome(105000) - ukTakeHome(100000) | gbp }} in take-home and loses up to £2,000 in support — worse off by up to {{ 2000 - (ukTakeHome(105000) - ukTakeHome(100000)) | gbp }} overall, before the 30 funded hours are even counted. The cash value of the funded hours depends on your provider's rates and how many weeks you use, but for families with a child in nursery full-time it is typically the larger of the two losses.

That is the compounding effect in one sentence: in this zone, a rise that looks like £5,000 on paper can arrive as a net loss — the marginal cost of earning more can exceed 100%.

## It's adjusted net income, not salary

The threshold is tested against **adjusted net income** — broadly, total taxable income minus gross pension contributions and Gift Aid donations ([GOV.UK's definition](https://www.gov.uk/guidance/adjusted-net-income)). Your headline salary is not the number that matters.

This is why the standard response to the cliff is pensions: many people in this band contribute enough to their pension to bring adjusted net income to £100,000 or below. Take the £105,000 earner: a £5,000 gross pension contribution brings adjusted net income to {{ ukPay(105000, pensionAmount=5000, method=net).ani | gbp }}. Doing so preserves Tax-Free Childcare and the funded hours *and* restores the Personal Allowance — the same contribution defuses both the cliff and the 60% trap at once, and the contribution costs you {{ ukTakeHome(105000) - ukPay(105000, pensionAmount=5000, method=net).takeHome | gbp }} of take-home (or {{ ukTakeHome(105000) - ukPay(105000, pensionAmount=5000, method=sacrifice).takeHome | gbp }} through salary sacrifice) rather than the full £5,000. Whether that is right for you depends on your cash-flow needs and circumstances; this describes how the rules work, not what you should do.

## Check where you stand before the rise lands

If an offer, bonus, or pay review is about to carry you across £100,000, run the numbers first. The [UK Salary Calculator](/tools/income-and-planning/salary-uk/) shows your adjusted net income, flags when it is over the £100,000 childcare limit, and gives the extra yearly pension contribution that would bring it back to £100,000, so you can compare keeping the support against taking the cash. It has no field for the childcare support itself, so weigh that separately using your own nursery bills and the Tax-Free Childcare top-up. For the wider picture of what pay rises are worth at every level, see [what you actually keep from a £10,000 rise](/scenarios/pay-rise-shock-uk/).
