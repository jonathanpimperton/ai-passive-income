---
title: "ISA vs General Investment Account: Which to Use?"
slug: "isa-vs-general-investment"
description: "Compare Stocks & Shares ISAs with general investment accounts. See the tax savings, contribution limits, and when each account type makes sense."
keywords:
  - "ISA vs general investment account"
  - "stocks and shares ISA worth it"
  - "ISA tax benefits UK"
relatedTools:
  - "investment-return"
  - "compound-interest"
  - "capital-gains-tax"
  - "salary-uk"
  - "roi"
verdict: "Fill your ISA first, after any employer pension match, and use a general investment account only for money above the £20,000 allowance. On £20,000 a year for 20 years at 7%, capital gains tax alone on selling the whole general-account pot at the end would be about {{ ukCgt(compoundFV(0, 20000 / 12, 7, 20) - 400000, 30000) | gbp }} for a basic-rate taxpayer, before any dividend tax paid along the way."
comparisonTable:
  - feature: "Annual contribution limit"
    option1: "£20,000"
    option2: "Unlimited"
  - feature: "Tax on dividends"
    option1: "None"
    option2: "Taxed above £500 allowance (10.75–39.35%)"
  - feature: "Tax on capital gains"
    option1: "None"
    option2: "Taxed above the {{ ukFact('cgtAnnualExempt') | gbp }} allowance ({{ ukFact('cgtBasicRate') | pct }} or {{ ukFact('cgtHigherRate') | pct }})"
  - feature: "Tax on interest"
    option1: "None"
    option2: "Taxed above personal savings allowance"
  - feature: "Access to funds"
    option1: "Anytime. A flexible ISA also lets you put back what you took out in the same tax year without using more allowance"
    option2: "Anytime"
  - feature: "Inheritance"
    option1: "Counts towards your estate for inheritance tax; a surviving spouse gets an extra ISA allowance (APS)"
    option2: "Counts towards your estate for inheritance tax"
affiliateContext: "Where to open a Stocks & Shares ISA"
affiliatePrograms:
  - "InvestEngine"
  - "Nutmeg"
faq:
  - question: "Is a Stocks & Shares ISA better than a general investment account?"
    answer: "For the first £20,000 a year, yes. Everything inside an ISA is free of capital gains tax, dividend tax and income tax. A general investment account is taxed on dividends above £500 a year and on gains above {{ ukFact('cgtAnnualExempt') | gbp }}. Use the ISA first, then a general account for the excess."
  - question: "How much tax does an ISA save?"
    answer: "It depends on the size of the pot and your tax band. As a floor: £20,000 a year for 20 years at 7% grows to {{ compoundFV(0, 20000 / 12, 7, 20) | gbp }}. Selling that pot from a general account would trigger about {{ ukCgt(compoundFV(0, 20000 / 12, 7, 20) - 400000, 30000) | gbp }} of capital gains tax for a basic-rate taxpayer with other income of £30,000, or about {{ ukCgt(compoundFV(0, 20000 / 12, 7, 20) - 400000, 60000) | gbp }} for a higher-rate taxpayer on £60,000. Dividend tax on the way up comes on top."
  - question: "What is Bed and ISA?"
    answer: "You sell investments held in a general account and buy them again inside your ISA, using your annual allowance. Future growth is then tax-free, but the sale can trigger capital gains tax if the gain is above your annual exempt amount."
  - question: "Can I move shares from an employee scheme into an ISA?"
    answer: "Shares from SAYE and SIP schemes can generally be transferred into a Stocks & Shares ISA within 90 days, usually without a capital gains tax charge. EMI shares cannot be transferred this way, and other shares need the Bed and ISA route."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "GOV.UK — Individual Savings Accounts"
    url: "https://www.gov.uk/individual-savings-accounts"
  - name: "HM Treasury — Budget 2026 (cash ISA limit kept at £20,000)"
    url: "https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html"
  - name: "GOV.UK — Tax on dividends"
    url: "https://www.gov.uk/tax-on-dividends"
  - name: "GOV.UK — Capital Gains Tax rates and allowances"
    url: "https://www.gov.uk/capital-gains-tax/rates"
---

## Why use the ISA allowance first

A Stocks & Shares ISA shelters your investments from all UK tax — no capital gains tax, no dividend tax, no income tax on interest. Ever. There's no requirement to declare ISA holdings on your tax return.

On a £20,000 annual contribution [growing at 7% for 20 years](/tools/saving-and-growth/investment-return/), the pot reaches {{ compoundFV(0, 20000 / 12, 7, 20) | gbp }} on {{ 20000 * 20 | gbp }} paid in. Selling that pot from a general investment account would cost about **{{ ukCgt(compoundFV(0, 20000 / 12, 7, 20) - 400000, 30000) | gbp }}** in capital gains tax for a basic-rate taxpayer with other income of £30,000, and about **{{ ukCgt(compoundFV(0, 20000 / 12, 7, 20) - 400000, 60000) | gbp }}** for a higher-rate taxpayer. That is the capital gains tax alone, on one sale at the end. Dividend tax paid along the way comes on top, and the ISA avoids both.

The £20,000 annual limit resets every April. Unused allowance doesn't carry forward. Every year you don't use it is tax-free growth permanently lost.

## When a general investment account is needed

**You have maxed your ISA.** If you are investing more than £20,000 a year, the excess goes into a general account or a pension.

**Company share schemes.** Shares from an employer scheme often sit outside an ISA at first. Shares from SAYE and SIP schemes can generally be transferred into a Stocks & Shares ISA within 90 days, usually without a capital gains tax charge. EMI shares cannot, and other shares need the Bed and ISA route below.

**Short-term trading.** If you trade frequently, the [capital gains tax](/tools/economic/capital-gains-tax/) annual allowance ({{ ukFact('cgtAnnualExempt') | gbp }}) and losses can offset gains. Some traders prefer the flexibility of a general account for tax-loss harvesting — deliberately selling losing positions to offset gains.

## The Bed and ISA strategy

If you have investments in a general account, you can:

1. Sell holdings in your general account
2. Buy the same holdings inside your ISA (using up to £20,000 of allowance)
3. Future growth is now tax-free

You'll crystallise any capital gain on the sale, but the {{ ukFact('cgtAnnualExempt') | gbp }} annual CGT allowance may cover it. Over time, this gradually moves your wealth into the tax-free wrapper.

## ISA vs pension

The ISA's main competitor isn't the general account — it's [your pension](/comparisons/pension-vs-isa-uk/) (SIPP or workplace). Pensions offer tax relief on contributions (20-45% depending on your bracket) but lock your money away until age 55 (rising to 57 from April 2028).

The priority order for most people:

1. **Workplace pension** up to employer match (it's a guaranteed 100% return)
2. **ISA** up to £20,000 (accessible, tax-free)
3. **Additional pension contributions** (if you won't need the money before 57)
4. **General investment account** (for anything above these limits)

One exception to this order: if your income is between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }} you lose £1 of personal allowance for every £2 above {{ ukFact('paTaperThreshold') | gbp }}, so extra pension contributions can be worth far more than the ISA. See the [60% tax trap](/scenarios/60-percent-tax-trap-uk/).

## Cash ISA vs Stocks & Shares ISA

With the personal savings allowance (£1,000 for basic rate, £500 for higher rate), [most people don't pay tax on cash savings anyway](/comparisons/cash-isa-vs-savings-account/). Using your ISA allowance on cash wastes its potential — the real value of an ISA is sheltering investment *growth* from capital gains and dividend tax, which can be substantial over decades.

Unless you're a higher-rate taxpayer with large cash holdings, put your ISA allowance into stocks and shares. The rules leave that choice to you: the planned cut to the Cash ISA limit was cancelled at the Budget on 28 October 2026, so the whole £20,000 can still go into cash. For long-term money, though, stocks and shares remain the better use of the allowance.
