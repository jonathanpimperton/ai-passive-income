---
title: "£200,000 Rental Property: {{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} Total Return"
slug: "rental-property-roi"
description: "A £200,000 buy-to-let renting at £850 a month returns about {{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} a year before tax. Yield, mortgage leverage and the Section 24 tax rule."
keywords: ["rental property roi", "buy to let roi uk", "rental yield calculator", "200k rental property return"]
toolSlug: "roi"
toolCategory: "saving-and-growth"
inputs:
  Property Value: "£200,000"
  Annual Rent: "£10,200"
  Annual Expenses: "£3,600"
  Appreciation: "2.5%/year (assumed)"
resultSummary: "~{{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} annual total return"
affiliateContext: "Start investing with low fees"
affiliatePrograms:
  - "InvestEngine"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## Expect roughly {{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} annual total return: {{ (850 * 12 - 3600) / 200000 * 100 | pct1 }} yield plus 2.5% appreciation

**A £200,000 rental property bringing in £850/month in rent, after £3,600 of yearly expenses, delivers approximately {{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} annual total return before tax.** That combines a {{ (850 * 12 - 3600) / 200000 * 100 | pct1 }} net rental yield with an assumed 2.5% annual capital appreciation. It is not explosive growth, but it is a tangible asset producing regular income. The appreciation rate is an assumption, not a forecast: check the latest [UK House Price Index](https://www.gov.uk/government/collections/uk-house-price-index-reports) for what prices are doing now.

## Breaking down the numbers

**Gross rental income:** £850/month = {{ 850 * 12 | gbp }}/year
**Gross yield:** {{ 850 * 12 | gbp }} ÷ £200,000 = {{ 850 * 12 / 200000 * 100 | pct1 }}

Annual expenses eat into that:
- Letting agent fees (10% of rent): {{ 850 * 12 * 10 / 100 | gbp }}
- Maintenance and repairs: {{ 200000 * 0.6 / 100 | gbp }} (0.6% of property value)
- Insurance: £350
- Void periods (1 month/year): £850
- Gas safety, EPC, compliance: £180

**Total expenses: {{ 850 * 12 * 10 / 100 + 200000 * 0.6 / 100 + 350 + 850 + 180 | gbp }}/year**
**Net rental income: {{ 850 * 12 - 3600 | gbp }}/year**
**Net yield: {{ (850 * 12 - 3600) / 200000 * 100 | pct1 }}**

Add 2.5% capital appreciation: the property gains {{ 200000 * 2.5 / 100 | gbp }} in value per year.

**Total annual return: {{ 850 * 12 - 3600 | gbp }} + {{ 200000 * 2.5 / 100 | gbp }} = {{ 850 * 12 - 3600 + 200000 * 2.5 / 100 | gbp }} on a £200,000 asset = {{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }}**

## With a mortgage: leverage changes everything

Most buy-to-let investors do not pay cash. With a 25% deposit ({{ 200000 * 25 / 100 | gbp }}) and a 75% interest-only mortgage ({{ 200000 * 75 / 100 | gbp }}) at 5%:

- Mortgage interest: {{ 200000 * 75 / 100 * 5 / 100 | gbp }}/year
- Net rental income after mortgage: {{ 850 * 12 - 3600 | gbp }} − {{ 200000 * 75 / 100 * 5 / 100 | gbp }} = −{{ 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }}/year (negative cash flow)
- Capital appreciation: {{ 200000 * 2.5 / 100 | gbp }}/year on the full £200,000

Your cash investment is {{ 200000 * 25 / 100 | gbp }}. The total return is −{{ 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }} + {{ 200000 * 2.5 / 100 | gbp }} = {{ 850 * 12 - 3600 - 200000 * 75 / 100 * 5 / 100 + 200000 * 2.5 / 100 | gbp }}, giving a cash-on-cash return of {{ (850 * 12 - 3600 - 200000 * 75 / 100 * 5 / 100 + 200000 * 2.5 / 100) / (200000 * 25 / 100) * 100 | pct1 }}. Leverage amplifies the return on your deposit, but you are subsidising the property from your own pocket by {{ (200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600)) / 12 | gbp }}/month. The same leverage amplifies losses if prices fall.

At 4% mortgage rates instead of 5%, the mortgage interest drops to {{ 200000 * 75 / 100 * 4 / 100 | gbp }}, cash flow swings positive to {{ 850 * 12 - 3600 - 200000 * 75 / 100 * 4 / 100 | gbp }}/year, and cash-on-cash return rises to {{ (850 * 12 - 3600 - 200000 * 75 / 100 * 4 / 100 + 200000 * 2.5 / 100) / (200000 * 25 / 100) * 100 | pct1 }}. For a rate to compare with, Bank Rate was {{ rate('boe') | pct(2) }} ({{ rateSource('boe') }}); a buy-to-let mortgage rate is a lender's quote, not a published average, so use your own.

## Tax implications for UK landlords

Individual landlords can no longer deduct mortgage interest from rental income. You pay tax on your rental profit before interest, meaning rent minus allowable running costs, and then get a tax reduction of up to 20% of the finance costs. The reduction is 20% of the lowest of three amounts: the interest, your property profit, and your taxable income above the personal allowance. Any interest it cannot cover is carried forward to later years ([GOV.UK: changes to tax relief for residential landlords](https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-case-studies)). The restriction finished phasing in on 6 April 2020, and the figures below use {{ taxYear('uk') }} rates. It cuts the relief most for higher-rate (40%) taxpayers:

- **Basic-rate taxpayer ({{ ukFact('basicRate') | pct }}):** Usually little change, because the {{ ukFact('basicRate') | pct }} credit matches the {{ ukFact('basicRate') | pct }} tax. The exception is when adding the rental profit before interest pushes your total income into the higher-rate band.
- **Higher-rate taxpayer ({{ ukFact('higherRate') | pct }}):** On the leveraged example above, the profit before interest is {{ 850 * 12 - 3600 | gbp }} (£10,200 rent minus £3,600 costs), taxed at {{ ukFact('higherRate') | pct }} = {{ (850 * 12 - 3600) * ukFact('higherRate') / 100 | gbp }}. The reduction is {{ ukFact('basicRate') | pct }} of {{ min(200000 * 75 / 100 * 5 / 100, 850 * 12 - 3600) | gbp }}, because the profit is lower than the {{ 200000 * 75 / 100 * 5 / 100 | gbp }} of interest; the other {{ 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }} of interest is carried forward. That leaves a tax bill of {{ (850 * 12 - 3600) * ukFact('higherRate') / 100 - min(200000 * 75 / 100 * 5 / 100, 850 * 12 - 3600) * ukFact('basicRate') / 100 | gbp }} on a property that loses {{ 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }} a year in cash, so the cash loss after tax is {{ (850 * 12 - 3600) * ukFact('higherRate') / 100 - min(200000 * 75 / 100 * 5 / 100, 850 * 12 - 3600) * ukFact('basicRate') / 100 + 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }}. Under the old rules the interest was fully deductible, the property showed a {{ 200000 * 75 / 100 * 5 / 100 - (850 * 12 - 3600) | gbp }} loss and there was no tax to pay.

From 6 April 2027, rental profits in England, Wales and Northern Ireland are taxed at separate property income rates of 24%, 44% and 49% instead of 20%, 40% and 45% ([GOV.UK, Budget 2026: overview of tax legislation and rates](https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar)). A higher-rate landlord's {{ 850 * 12 - 3600 | gbp }} profit would then be taxed at {{ (850 * 12 - 3600) * 44 / 100 | gbp }} before any credit for interest. Check the rate of that credit for 2027/28 before relying on a post-April 2027 figure.

When you sell, capital gains tax on residential property is {{ ukFact('cgtBasicRate') | pct }} (basic rate) or {{ ukFact('cgtHigherRate') | pct }} (higher rate) on gains above the {{ ukFact('cgtAnnualExempt') | gbp }} annual exempt amount ([GOV.UK: capital gains tax rates](https://www.gov.uk/capital-gains-tax/rates)). Our [capital gains tax on a second home](/scenarios/cgt-second-home-2026-27/) page works through an example.

## How rental property compares to index funds

| Metric | £200K rental property | £200K in index funds |
|--------|----------------------|---------------------|
| Annual return | ~{{ (850 * 12 - 3600 + 200000 * 2.5 / 100) / 200000 * 100 | pct1 }} (with a 75% mortgage at 5% or 4%: {{ (850 * 12 - 3600 - 200000 * 75 / 100 * 5 / 100 + 200000 * 2.5 / 100) / (200000 * 25 / 100) * 100 | pct }}–{{ (850 * 12 - 3600 - 200000 * 75 / 100 * 4 / 100 + 200000 * 2.5 / 100) / (200000 * 25 / 100) * 100 | pct }} on the deposit) | An assumed 7%, not a forecast |
| Income | {{ 850 * 12 - 3600 | gbp }}/year net, before tax | About {{ 200000 * 2 / 100 | gbp }}/year at an assumed 2% dividend yield |
| Effort | High (management, repairs) | Minimal |
| Liquidity | Months to sell | Sell in minutes |
| Leverage | 75% LTV available | Limited |
| Tax efficiency | Complex, Section 24 | Part can sit in an ISA, tax-free, within the annual ISA allowance |

Index funds win on simplicity and liquidity. Property wins on leverage and the psychological benefit of a tangible asset. Neither is clearly better in all cases.

## Key risks

- **Void periods:** Two months empty costs {{ 850 * 2 | gbp }} and can turn a profitable year into a loss.
- **Major repairs:** A new boiler or a roof repair can cost several thousand pounds and wipe out a year's profit.
- **Interest rate rises:** A 2% rate increase on a {{ 200000 * 75 / 100 | gbp }} interest-only mortgage adds {{ 200000 * 75 / 100 * 2 / 100 | gbp }}/year.
- **Regulation:** The government confirmed on 21 January 2026 that privately rented homes in England and Wales must reach EPC C by 1 October 2030, and raised the cost cap to £10,000. It said it would seek to lay the regulations with the aim of them coming into force in 2027, so check the current rules ([GOV.UK government response](https://www.gov.uk/government/consultations/improving-the-energy-performance-of-privately-rented-homes-2025-update)). In England, the Renters' Rights Act ended section 21 "no fault" evictions on 1 May 2026, so most tenancies now run as periodic tenancies and you need a specific legal ground to regain possession ([GOV.UK: repossessing your privately rented property after 1 May 2026](https://www.gov.uk/guidance/repossessing-your-privately-rented-property-after-1-may-2026)).

Use the [ROI Calculator](/tools/saving-and-growth/roi/) to model your specific rental property numbers, including purchase costs, renovation, and expected rent. [How we calculate ROI](/how-we-calculate/roi/) shows the formula.
