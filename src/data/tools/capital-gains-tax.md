---
name: "Capital Gains Tax Calculator"
slug: "capital-gains-tax"
category: "economic"
description: "Estimate US federal capital gains tax with NIIT, or UK CGT for {{ taxYear('uk') }} with the annual exempt amount and your income band, on shares, property and funds."
keywords:
  - "capital gains tax calculator"
  - "capital gains tax rate"
  - "long term capital gains tax"
  - "short term capital gains tax"
  - "CGT calculator UK"
  - "capital gains tax 2026"
  - "investment tax calculator"
relatedTools:
  - "investment-return"
  - "investment-fee"
  - "roi"
  - "stamp-duty"
  - "salary-uk"
  - "salary-us"
  - "inflation"
affiliateContext: "Keep more of your investment gains with tax-efficient platforms"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
  - "Nutmeg"
  - "InvestEngine"
lastUpdated: "2026-11-15"
dataSources:
  - name: "IRS: Capital gains and losses (Topic 409)"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS: Net Investment Income Tax"
    url: "https://www.irs.gov/individuals/net-investment-income-tax"
  - name: "IRS: Sale of your main home (Topic 701)"
    url: "https://www.irs.gov/taxtopics/tc701"
  - name: "GOV.UK: Capital Gains Tax rates"
    url: "https://www.gov.uk/capital-gains-tax/rates"
  - name: "GOV.UK: Capital Gains Tax annual exempt amount"
    url: "https://www.gov.uk/capital-gains-tax/allowances"
  - name: "GOV.UK: Tax when you sell your home (Private Residence Relief)"
    url: "https://www.gov.uk/tax-sell-home"
faq:
  - question: "What is capital gains tax?"
    answer: "Capital gains tax (CGT) is a tax on the profit you make when you sell an asset for more than you paid for it. It applies to investments such as shares, funds and crypto, to property other than your main home in most cases, and to other valuable assets. The US and the UK both tax gains, but with different rates and rules, so the calculator has a tab for each."
  - question: "What is the difference between short-term and long-term capital gains in the US?"
    answer: "In the US, an asset held for more than one year qualifies for long-term rates of 0%, 15% or 20%, depending on your taxable income. An asset held for one year or less gives a short-term gain, taxed at your ordinary income tax rate, up to 37%. For a single filer with {{ 75000 | usd }} of other taxable income, a {{ 30000 | usd }} gain costs {{ usCgt(30000, 75000) | usd }} if held long term and {{ usCgt(30000, 75000, holding=short) | usd }} if held short term, a saving of {{ usCgt(30000, 75000, holding=short) - usCgt(30000, 75000) | usd }}."
  - question: "What is the UK Capital Gains Tax annual exempt amount?"
    answer: "For {{ taxYear('uk') }} the annual exempt amount is {{ ukFact('cgtAnnualExempt') | gbp }}, so the first {{ ukFact('cgtAnnualExempt') | gbp }} of gains in a tax year is tax-free. It was £12,300 in 2022/23, £6,000 in 2023/24 and has been £3,000 since April 2024 (GOV.UK). You cannot carry an unused amount forward to a later year."
  - question: "Do I pay capital gains tax on my main home?"
    answer: "Usually not, in either country, but the rules differ. In the UK, Private Residence Relief normally means no CGT when you sell your main home. In the US, you can exclude up to $250,000 of gain ($500,000 for married couples filing jointly) on a main home you have owned and lived in for at least 2 of the last 5 years (IRS Topic 701)."
  - question: "What is the Net Investment Income Tax (NIIT)?"
    answer: "The NIIT is an extra {{ usFact('niitRate') | pct(auto) }} US tax on investment income, including capital gains, for higher earners. It applies to the smaller of your net investment income and the amount your modified adjusted gross income (MAGI) exceeds {{ usFact('niitThreshold') | usd }} for single filers or {{ usFact('niitThreshold', status=married) | usd }} for married couples filing jointly. The calculator estimates MAGI as your other taxable income plus the standard deduction plus the gain. At the top bracket, the NIIT takes the long-term rate from 20% to {{ 20 + usFact('niitRate') | pct1 }}."
  - question: "What are the UK CGT rates, and why does my rate depend on my income?"
    answer: "Since 30 October 2024 the rates are the same for every asset type: {{ ukFact('cgtBasicRate') | pct }} for gains that fall within your unused basic rate band and {{ ukFact('cgtHigherRate') | pct }} above it. The calculator works out the band from the income you enter: your taxable income (income minus the Personal Allowance) uses up part of the {{ ukFact('basicBand') | gbp }} band first. With {{ 40000 | gbp }} of income and a {{ 50000 | gbp }} gain, {{ ukFact('basicBand') - (40000 - ukFact('personalAllowance')) | gbp }} of the gain is left in the basic band at {{ ukFact('cgtBasicRate') | pct }} and the rest at {{ ukFact('cgtHigherRate') | pct }}, so the tax is {{ ukCgt(50000, 40000) | gbp }}."
workedExamples:
  - title: "US: selling stock bought for $50,000 for $80,000 after two years"
    inputs:
      country: "US"
      purchasePrice: 50000
      salePrice: 80000
      holdingPeriod: "long"
      taxableIncome: 75000
    description: "A single filer with {{ 75000 | usd }} of other taxable income sells stock held for two years at a {{ 30000 | usd }} gain. The gain stacks on top of income, so all of it falls above the {{ usFact('ltcgZeroTop') | usd }} limit of the 0% band and below the {{ usFact('ltcg15Top') | usd }} limit of the 15% band, and the federal tax is {{ usCgt(30000, 75000) | usd }}. The NIIT does not apply at this income. Had the stock been sold within a year, the same gain would be taxed as ordinary income and cost {{ usCgt(30000, 75000, holding=short) | usd }}. Holding for the second year saved {{ usCgt(30000, 75000, holding=short) - usCgt(30000, 75000) | usd }}."
  - title: "UK: selling a buy-to-let for a £50,000 profit"
    inputs:
      country: "UK"
      purchasePrice: 200000
      salePrice: 250000
      annualIncome: 60000
    description: "A UK landlord with {{ 60000 | gbp }} of other income sells a buy-to-let for a {{ 50000 | gbp }} gain. The annual exempt amount covers the first {{ ukFact('cgtAnnualExempt') | gbp }}. Income already fills the basic rate band, so the remaining {{ 50000 - ukFact('cgtAnnualExempt') | gbp }} is taxed at {{ ukFact('cgtHigherRate') | pct }}: the CGT bill is {{ ukCgt(50000, 60000) | gbp }}, an effective rate of {{ ukCgt(50000, 60000) / 50000 * 100 | pct(2) }} on the whole gain. The same gain with {{ 40000 | gbp }} of income would cost {{ ukCgt(50000, 40000) | gbp }}, because part of it still fits in the basic rate band."
  - title: "US: a high-income investor with the NIIT"
    inputs:
      country: "US"
      purchasePrice: 100000
      salePrice: 300000
      holdingPeriod: "long"
      taxableIncome: 250000
    description: "A single filer with {{ 250000 | usd }} of other taxable income sells assets for a {{ 200000 | usd }} long-term gain. The gain stacks above income and stays inside the 15% bracket (which runs to {{ usFact('ltcg15Top') | usd }}). The NIIT adds {{ usFact('niitRate') | pct(auto) }} on the whole gain, because estimated MAGI is well above the {{ usFact('niitThreshold') | usd }} threshold. Federal CGT plus NIIT comes to {{ usCgt(200000, 250000) | usd }}, an effective rate of {{ usCgt(200000, 250000) / 200000 * 100 | pct1 }}. Selling losing positions in the same year (tax-loss harvesting) would lower the gain and the bill."
---

## Two countries, two methods

Capital gains tax is charged on the profit when you sell an asset for more than you paid. The question in both the US and the UK is how much of the gain you keep, and the answer turns on different things: in the US it is how long you held the asset and your income, in the UK it is your income band and a small annual allowance.

## US capital gains tax ({{ taxYear('us') }})

### Long-term vs short-term

- **Long-term gains** (held more than one year) are taxed at 0%, 15% or 20%.
- **Short-term gains** (held one year or less) are taxed as ordinary income, from 10% up to 37%.

The holding period is the biggest lever you control. A {{ 30000 | usd }} gain for a single filer with {{ 75000 | usd }} of other taxable income costs {{ usCgt(30000, 75000) | usd }} held long term and {{ usCgt(30000, 75000, holding=short) | usd }} held short term: a {{ (usCgt(30000, 75000, holding=short) - usCgt(30000, 75000)) / usCgt(30000, 75000, holding=short) * 100 | pct }} lower bill for waiting past the one-year mark.

### Long-term capital gains brackets

The rate depends on your taxable income, with the gain stacked on top of your other income:

| Taxable income | Single | Married filing jointly |
|---|---|---|
| 0% rate up to | {{ usFact('ltcgZeroTop') | usd }} | {{ usFact('ltcgZeroTop', status=married) | usd }} |
| 15% rate up to | {{ usFact('ltcg15Top') | usd }} | {{ usFact('ltcg15Top', status=married) | usd }} |
| 20% rate above | {{ usFact('ltcg15Top') | usd }} | {{ usFact('ltcg15Top', status=married) | usd }} |

A gain can straddle two brackets, and the calculator taxes each slice at its own rate.

### Net Investment Income Tax (NIIT)

Higher earners owe an extra {{ usFact('niitRate') | pct(auto) }} NIIT on investment income when modified AGI is above {{ usFact('niitThreshold') | usd }} (single) or {{ usFact('niitThreshold', status=married) | usd }} (married filing jointly). Together with the 20% top bracket that gives a top rate of {{ 20 + usFact('niitRate') | pct1 }} on long-term gains.

## UK Capital Gains Tax ({{ taxYear('uk') }})

### Rates

Since 30 October 2024 the rates have been the same for every asset type, property included:

- **{{ ukFact('cgtBasicRate') | pct }}** on the part of your gain that fits in your unused basic rate band
- **{{ ukFact('cgtHigherRate') | pct }}** on the rest

A basic-rate taxpayer can still pay {{ ukFact('cgtHigherRate') | pct }} on part of a large gain. Your taxable income (income minus the Personal Allowance) uses up the {{ ukFact('basicBand') | gbp }} band first, and whatever is left covers gains at {{ ukFact('cgtBasicRate') | pct }}. With {{ 40000 | gbp }} of income, {{ ukFact('basicBand') - (40000 - ukFact('personalAllowance')) | gbp }} is left, so a {{ 50000 | gbp }} gain costs {{ ukCgt(50000, 40000) | gbp }}. With {{ 60000 | gbp }} of income the band is full and the same gain costs {{ ukCgt(50000, 60000) | gbp }}.

### Annual exempt amount

The first {{ ukFact('cgtAnnualExempt') | gbp }} of gains each tax year is tax-free. That was £12,300 in 2022/23 and £6,000 in 2023/24, so modest gains now create a tax bill that they once did not.

## Ways to reduce capital gains tax

1. **Hold for more than a year (US).** The long-term rates are well below ordinary rates; see the {{ usCgt(30000, 75000, holding=short) - usCgt(30000, 75000) | usd }} difference above.
2. **Use an ISA (UK).** Gains inside an ISA are free of CGT, within the yearly subscription limit.
3. **Harvest losses.** Selling losing investments in the same tax year offsets gains.
4. **Use the annual exempt amount (UK).** Realise up to {{ ukFact('cgtAnnualExempt') | gbp }} of gains each year tax-free instead of saving it all for one big sale.
5. **Check main home relief.** Both countries give significant relief on a main home (see the FAQ).

## When to use this calculator

- Before selling investments, to see the tax bill and the net proceeds
- Comparing a short-term and a long-term sale (US)
- Planning end-of-year loss harvesting
- Weighing a taxable account against a tax-sheltered one (ISAs, 401(k)s)
