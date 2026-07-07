---
name: "Capital Gains Tax Calculator"
slug: "capital-gains-tax"
category: "economic"
description: "Capital gains tax calculator for US and UK — estimate CGT on shares, property, and other assets with long-term and short-term rates."
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
  - "inflation"
  - "stamp-duty"
  - "salary-us"
  - "salary-uk"
affiliateContext: "Keep more of your investment gains with tax-efficient platforms"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
  - "Nutmeg"
  - "InvestEngine"
lastUpdated: "2026-07-02"
dataSources:
  - name: "IRS — Capital Gains and Losses"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS — Net Investment Income Tax"
    url: "https://www.irs.gov/individuals/net-investment-income-tax"
  - name: "GOV.UK — Capital Gains Tax rates"
    url: "https://www.gov.uk/capital-gains-tax/rates"
  - name: "GOV.UK — Capital Gains Tax annual exempt amount"
    url: "https://www.gov.uk/capital-gains-tax/allowances"
faq:
  - question: "What is capital gains tax?"
    answer: "Capital gains tax (CGT) is a tax on the profit you make when you sell an asset for more than you paid for it. It applies to investments (stocks, crypto, funds), property (other than your main home in most cases), and other valuable assets. Both the US and UK tax capital gains, but the rates and rules differ significantly."
  - question: "What is the difference between short-term and long-term capital gains in the US?"
    answer: "In the US, assets held for more than one year qualify for long-term capital gains rates (0%, 15%, or 20% depending on income). Assets held for one year or less are short-term gains, taxed at your ordinary income tax rate (up to 37%). This means holding for over a year can roughly halve your tax bill on investment gains."
  - question: "What is the UK Capital Gains Tax annual exempt amount?"
    answer: "For the 2026/27 tax year, the annual exempt amount is £3,000. This means the first £3,000 of gains in a tax year is completely tax-free. This was reduced from £6,000 in 2023/24 and £12,300 in 2022/23 — a significant cut. You can't carry unused exemption forward to future years."
  - question: "Do I pay capital gains tax on my main home?"
    answer: "In both the US and UK, your primary residence generally has special treatment. In the UK, Private Residence Relief means you usually pay no CGT when selling your main home. In the US, you can exclude up to $250,000 ($500,000 married) of gain on a primary residence if you've lived there 2 of the last 5 years."
  - question: "What is the Net Investment Income Tax (NIIT)?"
    answer: "The NIIT is an additional 3.8% US tax on investment income (including capital gains) for high earners. It applies to the lesser of your net investment income or the amount by which your modified AGI exceeds $200,000 (single) or $250,000 (married filing jointly). This means high earners effectively pay 23.8% on long-term gains (20% + 3.8%) at the top bracket."
  - question: "What are the UK CGT rates from October 2024?"
    answer: "From 30 October 2024, UK CGT rates were unified across all asset types at 18% for basic rate taxpayers and 24% for higher/additional rate taxpayers. Previously, non-property gains were taxed at lower rates (10%/20%), but the October 2024 Budget equalised them with the property rates."
workedExamples:
  - title: "US: Selling $50,000 of stock held for 2 years"
    inputs:
      country: "US"
      purchasePrice: 50000
      salePrice: 80000
      holdingPeriod: "long"
      taxableIncome: 75000
    description: "A single filer with $75,000 taxable income selling stock for a $30,000 long-term gain owes $4,500 in federal capital gains tax (15% rate) with no NIIT. The 15% rate applies because their total income ($105,000) exceeds the 0% threshold but stays below the 20% threshold. Had they sold within a year, the same gain would be taxed at 22% ($6,600) — holding longer saved $2,100."
  - title: "UK: Selling a buy-to-let for £50,000 profit"
    inputs:
      country: "UK"
      purchasePrice: 200000
      salePrice: 250000
      taxpayerType: "higher"
    description: "A higher-rate UK taxpayer selling a buy-to-let property with a £50,000 gain pays £11,280 in CGT: the first £3,000 is covered by the annual exempt amount, and the remaining £47,000 is taxed at 24%. The effective rate on the total gain is 22.56%. Using an ISA wrapper for investments would shelter gains entirely — worth considering for future investments."
  - title: "US: High-income investor selling with NIIT"
    inputs:
      country: "US"
      purchasePrice: 100000
      salePrice: 300000
      holdingPeriod: "long"
      taxableIncome: 250000
    description: "A single filer earning $250,000 who sells assets for a $200,000 long-term gain faces $30,000 in federal CGT (the gain stacks on top of income and falls entirely in the 15% bracket, which runs to $545,500) plus $7,600 in NIIT (3.8% on the full gain, since income exceeds the $200,000 NIIT threshold). Total tax: $37,600, effective rate 18.8%. Tax-loss harvesting — selling losing positions to offset gains — could reduce this bill."
---

## What Is Capital Gains Tax?

Capital gains tax is a tax on the profit from selling an asset for more than you paid. It applies to stocks, bonds, mutual funds, real estate (other than your main home in most cases), cryptocurrency, and other investments.

The key question in both the US and UK is: **how much of your gain do you actually keep after tax?**

> **2026 update:** UK rates remain 18%/24% (unified since October 2024), with the annual exempt amount still just £3,000. In the US, long-term capital gains brackets were adjusted for inflation.

## US Capital Gains Tax (2026)

### Long-Term vs Short-Term

The US distinguishes sharply between:
- **Long-term gains** (held over 1 year): taxed at preferential rates of 0%, 15%, or 20%
- **Short-term gains** (held 1 year or less): taxed at ordinary income rates (10%–37%)

This is the single biggest factor in your tax bill. Holding an extra month can save thousands.

### Long-Term Capital Gains Brackets (2026)

| Taxable Income (Single) | Rate |
|---|---|
| Up to $49,450 | 0% |
| $49,451 – $545,500 | 15% |
| Over $545,500 | 20% |

### Net Investment Income Tax (NIIT)

High earners also face an additional **3.8% NIIT** on investment income when modified AGI exceeds $200,000 (single) or $250,000 (married). This effectively creates a top rate of **23.8%** on long-term capital gains.

## UK Capital Gains Tax (2026/27)

### Rates (From 30 October 2024)

The rates were simplified and increased:
- **Basic rate taxpayers:** 18% on all gains
- **Higher/additional rate taxpayers:** 24% on all gains

The rate depends on your total taxable income plus gains — if gains push you into the higher rate band, part is taxed at 18% and the rest at 24%.

### Annual Exempt Amount

The first **£3,000** of gains each tax year is tax-free. This was cut from £12,300 just two years ago — a dramatic reduction that means even modest gains now trigger a tax bill.

## Strategies to Reduce Capital Gains Tax

1. **Hold for over a year (US):** The difference between short-term and long-term rates can halve your tax bill
2. **Use ISAs (UK):** Gains within an ISA wrapper are completely tax-free — no annual limit on growth
3. **Tax-loss harvesting:** Sell losing investments to offset gains in the same tax year
4. **Use your annual exempt amount (UK):** Realise up to £3,000 in gains each year tax-free
5. **Primary residence exemption:** Both countries offer significant relief on your main home

## When to Use This Calculator

- Before selling investments to estimate your tax bill
- Comparing short-term vs long-term holding strategies (US)
- Planning end-of-year tax-loss harvesting
- Deciding between taxable accounts and tax-sheltered wrappers (ISAs, 401(k)s)
