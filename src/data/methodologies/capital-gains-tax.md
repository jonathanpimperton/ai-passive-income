---
title: "How We Calculate: Capital Gains Tax"
slug: "capital-gains-tax"
toolSlug: "capital-gains-tax"
formula: "US: Tax = gain × applicable rate (0/15/20% long-term or ordinary rates short-term) + NIIT if applicable. UK: Tax = (gain − £3,000 exempt) × 18% or 24%"
variables:
  - name: "Purchase Price (Cost Basis)"
    description: "The original price paid for the asset, used to calculate the gain"
  - name: "Sale Price"
    description: "The price the asset was sold for (or expected sale price)"
  - name: "Holding Period (US)"
    description: "Whether the asset was held for more than one year (long-term) or one year or less (short-term)"
  - name: "Filing Status (US)"
    description: "Single, married filing jointly, or head of household — affects bracket thresholds"
  - name: "Taxable Income"
    description: "Other income that determines which capital gains bracket applies"
  - name: "Tax Band (UK)"
    description: "Whether the taxpayer is a basic rate or higher/additional rate taxpayer"
assumptions:
  - "US: Uses 2026 federal long-term capital gains brackets and ordinary income brackets"
  - "US: Short-term gains are stacked on top of existing taxable income and taxed at ordinary rates"
  - "US: Long-term gains rate is determined by total taxable income (ordinary + gains combined)"
  - "US: NIIT (3.8%) applies when modified AGI exceeds $200,000 (single) or $250,000 (married)"
  - "UK: Uses 2026/27 rates — 18% basic rate, 24% higher/additional rate (unified from October 2024)"
  - "UK: Annual exempt amount of £3,000 deducted before applying CGT rates"
  - "UK: Basic rate taxpayers may have part of their gain taxed at 18% and the rest at 24% if it pushes them into the higher rate band"
  - "No state/local taxes are included in the US calculation"
  - "No allowable expenses (improvement costs, selling fees) are deducted from the gain"
limitations:
  - "US: Does not include state capital gains tax (California charges up to 13.3%, many states charge 0%)"
  - "US: Does not model the primary residence exclusion ($250K/$500K)"
  - "US: Does not handle Section 1250 recapture (depreciation on rental property)"
  - "US: Does not model qualified opportunity zone deferrals"
  - "UK: Does not model Private Residence Relief, lettings relief, or entrepreneurs' relief (Business Asset Disposal Relief)"
  - "UK: Does not handle gains on UK residential property by non-UK residents"
  - "Neither country: Does not account for allowable costs (legal fees, improvement costs) that reduce the taxable gain"
  - "Does not model tax-loss harvesting (offsetting gains with losses from other sales)"
dataSources:
  - name: "IRS — Topic 409: Capital Gains and Losses"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS — Net Investment Income Tax"
    url: "https://www.irs.gov/individuals/net-investment-income-tax"
  - name: "IRS — 2026 Tax Inflation Adjustments"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill"
  - name: "GOV.UK — Capital Gains Tax rates"
    url: "https://www.gov.uk/capital-gains-tax/rates"
  - name: "GOV.UK — Capital Gains Tax annual exempt amount"
    url: "https://www.gov.uk/capital-gains-tax/allowances"
---

## What This Calculator Does

The Capital Gains Tax calculator estimates your US or UK tax liability when you sell an asset for a profit. It shows the tax owed, effective rate, and a breakdown of how the tax is calculated across different brackets and rates.

For the US, it compares short-term vs long-term holding strategies and includes the Net Investment Income Tax (NIIT) for high earners. For the UK, it applies the annual exempt amount and determines the split between basic and higher rate CGT.

## How the US Calculation Works

### Long-Term Gains (Held > 1 Year)

1. Calculate the gain: sale price − purchase price
2. Add gain to existing taxable income to determine which bracket applies
3. Apply the applicable long-term rate (0%, 15%, or 20%) to the gain
4. If modified AGI exceeds the NIIT threshold, add 3.8% on investment income above the threshold

### Short-Term Gains (Held ≤ 1 Year)

Short-term gains are taxed as ordinary income. The gain "stacks" on top of your existing taxable income:

1. Calculate tax on (existing income + gain) using federal brackets
2. Subtract tax on existing income alone
3. The difference is the tax on the short-term gain
4. Add NIIT if applicable

This stacking means a large short-term gain can push you into a higher marginal bracket.

## How the UK Calculation Works

1. Calculate the gain: sale price − purchase price
2. Deduct the annual exempt amount (£3,000 for 2026/27)
3. For basic rate taxpayers: determine how much unused basic rate band remains after salary/income
4. Tax gains within the remaining basic rate band at 18%, and any excess at 24%
5. For higher/additional rate taxpayers: all taxable gains at 24%

## How Each Variable Affects the Result

**Holding Period (US):** The single biggest factor. Long-term rates (0-20%) are roughly half of short-term rates (10-37%) for most taxpayers. An extra day of holding can save thousands.

**Taxable Income:** Determines which bracket your gains fall into. In the US, low-income investors can pay 0% on long-term gains. In the UK, income affects how much basic rate band remains for the 18% rate.

**Filing Status (US):** Married filers have roughly double the bracket thresholds of single filers, meaning more of their gains fall into lower brackets.

**NIIT (US):** Only affects high earners, but adds a full 3.8% to the effective rate. There's no way to avoid it beyond reducing AGI below the threshold.

## Common Uses

- Estimating tax before selling stocks, ETFs, or crypto
- Comparing the benefit of holding an additional year (short vs long-term)
- Planning year-end tax-loss harvesting strategies
- Budgeting for property disposal (buy-to-let in the UK)

## Why This Calculator Exists

Capital gains tax rates are not intuitive — they depend on your income, filing status, holding period, and country. This calculator shows the exact tax in seconds, making it possible to compare scenarios and make informed decisions about when to sell.
