---
title: "CGT on a Second Home {{ taxYear('uk') }}: {{ ukCgt(100000, 60000) | gbp }} on £100,000"
slug: "cgt-second-home-2026-27"
description: "UK capital gains tax on a second home in {{ taxYear('uk') }}: {{ ukFact('cgtBasicRate') | pct }} and {{ ukFact('cgtHigherRate') | pct }} rates, the {{ ukFact('cgtAnnualExempt') | gbp }} allowance, a worked £100,000 gain, and the 60-day reporting deadline."
keywords: ["capital gains tax second home", "CGT on second property UK", "capital gains tax property {{ taxYear('uk') }}", "selling a second home tax", "60 day CGT reporting"]
toolSlug: "capital-gains-tax"
toolCategory: "economic"
inputs:
  Purchase price: "£200,000"
  Sale price: "£300,000"
  Taxpayer band: "Higher rate (£60,000 salary)"
  Tax year: "{{ taxYear('uk') }}"
resultSummary: "{{ ukCgt(100000, 60000) | gbp }} CGT on a £100,000 gain"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "What rate of capital gains tax do I pay on a second home in {{ taxYear('uk') }}?"
    answer: "{{ ukFact('cgtBasicRate') | pct }} on any gain that fits inside your unused basic-rate band, and {{ ukFact('cgtHigherRate') | pct }} on the rest. Higher and additional-rate taxpayers pay {{ ukFact('cgtHigherRate') | pct }} on the whole taxable gain. Because a large property gain is added to your income when working out which band it falls in, most of a typical second-home gain ends up taxed at {{ ukFact('cgtHigherRate') | pct }} even for basic-rate earners."
  - question: "How much is the capital gains tax allowance in {{ taxYear('uk') }}?"
    answer: "The annual exempt amount is {{ ukFact('cgtAnnualExempt') | gbp }}. Only the gain above {{ ukFact('cgtAnnualExempt') | gbp }} is taxable, and the allowance cannot be carried forward — if you don't use it in a tax year, it's gone. Couples who own a property jointly each get their own {{ ukFact('cgtAnnualExempt') | gbp }}, so {{ 2 * ukFact('cgtAnnualExempt') | gbp }} of a jointly held gain can be tax-free."
  - question: "When do I have to report and pay CGT on a property sale?"
    answer: "Within 60 days of completion. UK residents who sell a residential property with tax to pay must file a property return and pay the CGT due through HMRC's online service within 60 days — separately from, and much earlier than, the normal self-assessment deadline. GOV.UK warns you may have to pay interest and a penalty if you do not report and pay on time."
  - question: "Do I pay CGT if the property used to be my main home?"
    answer: "Only on part of the gain. Private Residence Relief exempts the years you lived in the property as your main home, plus the final 9 months of ownership, apportioned over the total time you owned it. If you have always let the property out and never lived in it, the full gain is taxable."
---

## {{ ukCgt(100000, 60000) | gbp }} to HMRC on a £100,000 gain

**Sell a second home in {{ taxYear('uk') }} for £300,000 that you bought for £200,000, and as a higher-rate taxpayer (for example on a £60,000 salary) you'll pay {{ ukCgt(100000, 60000) | gbp }} in capital gains tax — {{ ukCgt(100000, 60000) / 100000 * 100 | pct1 }} of the gain.** After the {{ ukFact('cgtAnnualExempt') | gbp }} annual exempt amount, the remaining {{ 100000 - ukFact('cgtAnnualExempt') | gbp }} is taxed at the {{ ukFact('cgtHigherRate') | pct }} residential property rate.

Unlike your main home, a second property — a holiday home, a buy-to-let, an inherited house you kept — gets no private residence exemption. The gain is taxable, and HMRC expects the money within 60 days of completion, not at the next self-assessment.

## How the {{ ukCgt(100000, 60000) | gbp }} is worked out

The calculation runs in three steps:

1. **Gain:** £300,000 sale − £200,000 purchase = {{ 300000 - 200000 | gbp }}
2. **Annual exempt amount:** {{ 300000 - 200000 | gbp }} − {{ ukFact('cgtAnnualExempt') | gbp }} = {{ 300000 - 200000 - ukFact('cgtAnnualExempt') | gbp }} taxable
3. **Rate:** higher-rate taxpayer, so the whole {{ 300000 - 200000 - ukFact('cgtAnnualExempt') | gbp }} × {{ ukFact('cgtHigherRate') | pct }} = **{{ ukCgt(100000, 60000) | gbp }}**

Since 30 October 2024, the 18% and 24% CGT rates apply across all asset types, so property no longer carries a separate surcharge ([GOV.UK, CGT rates](https://www.gov.uk/capital-gains-tax/rates)) — but {{ ukFact('cgtHigherRate') | pct }} is still a serious number on a six-figure gain.

## Basic-rate taxpayers don't escape the {{ ukFact('cgtHigherRate') | pct }}

Here is the part that surprises second-home sellers: the gain itself counts when working out which rate you pay. Your taxable gain is stacked on top of your income, and only the slice that fits inside your unused basic-rate band gets the {{ ukFact('cgtBasicRate') | pct }} rate.

Take the same £100,000 gain with a £30,000 salary. Your income uses {{ 30000 - ukFact('personalAllowance') | gbp }} of the {{ ukFact('basicBand') | gbp }} basic-rate band, leaving {{ ukFact('basicBand') - (30000 - ukFact('personalAllowance')) | gbp }} unused:

- {{ ukFact('basicBand') - (30000 - ukFact('personalAllowance')) | gbp }} of the gain at {{ ukFact('cgtBasicRate') | pct }} = {{ (ukFact('basicBand') - (30000 - ukFact('personalAllowance'))) * ukFact('cgtBasicRate') / 100 | gbp(2) }}
- The remaining {{ 100000 - ukFact('cgtAnnualExempt') - (ukFact('basicBand') - (30000 - ukFact('personalAllowance'))) | gbp }} at {{ ukFact('cgtHigherRate') | pct }} = {{ (100000 - ukFact('cgtAnnualExempt') - (ukFact('basicBand') - (30000 - ukFact('personalAllowance')))) * ukFact('cgtHigherRate') / 100 | gbp(2) }}
- **Total: {{ ukCgt(100000, 30000) | gbp(2) }}** — an effective {{ ukCgt(100000, 30000) / 100000 * 100 | pct1 }} of the gain

A basic-rate earner pays only {{ ukCgt(100000, 60000) - ukCgt(100000, 30000) | gbp(2) }} less than a higher-rate earner on the same sale. On large property gains, the {{ ukFact('cgtHigherRate') | pct }} rate does most of the work regardless of your salary.

## What legitimately reduces the bill

The taxable gain is not simply sale price minus purchase price. You can deduct:

- **Buying and selling costs** — solicitor and estate agent fees, and the stamp duty you paid when you bought
- **Capital improvements** — an extension, a loft conversion, a new kitchen where none existed. Repairs, maintenance and mortgage interest don't count
- **Private Residence Relief** — if the property was ever your main home, the years you lived there (plus the final 9 months of ownership) are exempt, apportioned over your total ownership period

Jointly owned property splits the gain between owners, and each owner gets their own {{ ukFact('cgtAnnualExempt') | gbp }} exempt amount and their own band calculation — often worth thousands for couples where one partner pays basic rate.

Capital losses help too. Losses on other assets sold in the same tax year offset your gains before the exempt amount is applied, and unused losses from earlier years can be carried forward if you've reported them to HMRC. Timing also matters at the margin: completion dates either side of 6 April fall into different tax years, with a fresh {{ ukFact('cgtAnnualExempt') | gbp }} allowance — and potentially a different income picture — on the other side.

## The 60-day deadline most sellers miss

UK residents selling a residential property with CGT to pay must [report and pay within 60 days of completion](https://www.gov.uk/report-and-pay-your-capital-gains-tax/if-you-sold-a-property-in-the-uk-on-or-after-6-april-2020) using HMRC's property account — a separate filing from self-assessment. The rule began for sales completing on or after 6 April 2020 with a 30-day limit, and the limit has been 60 days since 27 October 2021. GOV.UK says you may have to pay interest and a penalty if you do not report and pay on time. If you're selling this year, have your purchase records and improvement receipts ready before completion, not after.

## Run your own numbers

The [Capital Gains Tax Calculator](/tools/economic/capital-gains-tax/) applies the {{ taxYear('uk') }} rates, the {{ ukFact('cgtAnnualExempt') | gbp }} exempt amount, and the band-stacking rule above to your own purchase price, sale price, and income — for UK property and shares, and US federal CGT too. How it works is in [how we calculate capital gains tax](/how-we-calculate/capital-gains-tax/). Official rates and allowances: [GOV.UK — CGT rates](https://www.gov.uk/capital-gains-tax/rates) and [allowances](https://www.gov.uk/capital-gains-tax/allowances).
