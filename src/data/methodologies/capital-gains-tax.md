---
title: "How We Calculate: Capital Gains Tax"
slug: "capital-gains-tax"
toolSlug: "capital-gains-tax"
formula: "US long-term: each slice of the gain is taxed at the rate of the bracket it falls in (0%, 15% or 20%), stacked on top of other taxable income, plus 3.8% NIIT on the lesser of the gain and (estimated MAGI − threshold). US short-term: tax on (income + gain) minus tax on income, at ordinary rates, plus NIIT. UK: (gain − annual exempt amount) taxed at 18% inside the unused basic rate band and 24% above it."
variables:
  - name: "Purchase Price (Cost Basis)"
    description: "The original price paid for the asset, used to calculate the gain"
  - name: "Sale Price"
    description: "The price the asset was sold for (or the expected sale price)"
  - name: "Holding Period (US)"
    description: "Whether the asset was held for more than one year (long-term) or one year or less (short-term)"
  - name: "Filing Status (US)"
    description: "Single, married filing jointly, or head of household, which changes the bracket and NIIT thresholds"
  - name: "Other Taxable Income (US)"
    description: "Your ordinary taxable income after deductions, not counting this gain. It sets where the gain starts in the brackets"
  - name: "Annual Income (UK)"
    description: "Your total taxable income before the Personal Allowance. The calculator works out the tax band and how much basic rate band is left from it, so there is no separate taxpayer-type input"
assumptions:
  - "US: uses the federal figures for the tax year the rates data currently points at (2026 today, 2027 from 1 January 2027): long-term capital gains thresholds, ordinary income brackets and standard deductions. The current thresholds are printed in the steps below"
  - "US: a long-term gain is stacked on top of other taxable income and taxed slice by slice: the part of it that falls below the 0% top is taxed at 0%, the part between the 0% and 15% tops at 15%, and the rest at 20%"
  - "US: a short-term gain is taxed at ordinary income rates, stacked on top of other taxable income"
  - "US: NIIT (3.8%) is charged on the lesser of the gain and the amount by which modified AGI exceeds $200,000 (single or head of household) or $250,000 (married filing jointly). The calculator estimates modified AGI as other taxable income + the standard deduction + the gain, which assumes the standard deduction and no other adjustments"
  - "UK: uses the rates for the {{ taxYear('uk') }} tax year: 18% in the unused basic rate band and 24% above it (the same rates for all assets since 30 October 2024)"
  - "UK: the annual exempt amount (£3,000) is deducted from the gain first. The remaining gain is charged at 18% up to the unused basic rate band and at 24% above it"
  - "UK: unused basic rate band = basic rate band − (income − Personal Allowance). The Personal Allowance is tapered above £100,000 of income"
  - "UK: Scottish taxpayers use the UK basic rate band too: HMRC's manual says to assume the individual is not a Scottish or Welsh taxpayer when working out the available basic rate band"
  - "No state or local taxes are included in the US calculation"
  - "No allowable costs (improvements, selling fees) are deducted from the gain: enter your cost basis net of them if you want them counted"
  - "The country tab, not the currency selector, chooses the model. With no stored choice the tab follows your detected region (UK opens the UK tab, anywhere else the US tab). A stored GBP currency opens the UK tab, and USD or EUR open the US tab"
limitations:
  - "US: does not include state capital gains tax (California taxes gains as ordinary income at up to 13.3% and many states charge nothing)"
  - "US: does not model the primary residence exclusion ($250,000 single, $500,000 married filing jointly)"
  - "US: does not handle Section 1250 recapture (depreciation on rental property), the 28% collectibles rate or qualified opportunity zone deferrals"
  - "US: the NIIT figure is an estimate because modified AGI is estimated. Real MAGI can be higher or lower depending on adjustments, and the tax can differ by a few hundred dollars near the threshold"
  - "UK: does not model Private Residence Relief, Business Asset Disposal Relief, or gains on UK residential property by non-UK residents"
  - "Neither country: does not model allowable costs separately, carried-forward losses or tax-loss harvesting"
dataSources:
  - name: "IRS Topic 409: Capital gains and losses"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS Topic 559: Net Investment Income Tax"
    url: "https://www.irs.gov/taxtopics/tc559"
  - name: "IRS: Questions and answers on the Net Investment Income Tax"
    url: "https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax"
  - name: "IRS: 2026 tax inflation adjustments, including amendments from the One Big Beautiful Bill"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill"
  - name: "IRS: 2027 tax inflation adjustments"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts"
  - name: "GOV.UK: Capital Gains Tax rates"
    url: "https://www.gov.uk/capital-gains-tax/rates"
  - name: "GOV.UK: Capital Gains Tax annual exempt amount"
    url: "https://www.gov.uk/capital-gains-tax/allowances"
  - name: "HMRC Capital Gains Manual CG21204: Available basic rate band"
    url: "https://www.gov.uk/hmrc-internal-manuals/capital-gains-manual/cg21204"
---

## What This Calculator Does

The Capital Gains Tax calculator estimates your US or UK tax when you sell an asset at a profit. It shows the tax owed, the effective rate, and how the tax was built up across brackets and rates.

For the US it compares short-term and long-term holding and includes the Net Investment Income Tax (NIIT) for higher earners. For the UK it applies the annual exempt amount and splits the gain between the basic and higher CGT rates.

## How the US Calculation Works

### Long-Term Gains (Held More Than 1 Year)

1. Calculate the gain: sale price − purchase price.
2. Stack the gain on top of your other taxable income. The gain occupies the range from your other taxable income up to that income plus the gain.
3. Tax each slice of that range at the long-term rate of the bracket it falls in. The 0% bracket ends and the 15% bracket starts at {{ usFact('ltcgZeroTop') | usd }} of taxable income for a single filer ({{ usFact('ltcgZeroTop', status=married) | usd }} for married filing jointly, {{ usFact('ltcgZeroTop', status=head) | usd }} for head of household). The 15% bracket ends and the 20% bracket starts at {{ usFact('ltcg15Top') | usd }} (single), {{ usFact('ltcg15Top', status=married) | usd }} (married) and {{ usFact('ltcg15Top', status=head) | usd }} (head of household).
4. Add the NIIT if estimated modified AGI is above the threshold (below).

A gain is not taxed at one rate. A single filer with $40,000 of other taxable income and a $20,000 long-term gain has {{ usFact('ltcgZeroTop') - 40000 | usd }} of the gain taxed at 0% (it fills the 0% bracket up to {{ usFact('ltcgZeroTop') | usd }}) and the other {{ 20000 - (usFact('ltcgZeroTop') - 40000) | usd }} at 15%, for {{ usCgt(20000, 40000) | usd(2) }} in total. Applying 15% to the whole gain would give $3,000, nearly twice as much.

### Short-Term Gains (Held 1 Year or Less)

Short-term gains are taxed as ordinary income and stack on top of your other taxable income:

1. Calculate tax on (other income + gain) using the federal brackets.
2. Subtract the tax on other income alone.
3. The difference is the tax on the short-term gain.
4. Add NIIT if it applies.

Stacking means a big short-term gain can push part of it into a higher bracket. A single filer with $150,000 of other taxable income and a $100,000 short-term gain owes {{ usCgt(100000, 150000, holding=short) | usd(2) }} in total (federal tax plus NIIT), against {{ usCgt(100000, 150000) | usd(2) }} if the gain were long-term.

### Net Investment Income Tax

NIIT is 3.8% of the lesser of (a) the gain and (b) modified AGI above the threshold, which is {{ usFact('niitThreshold') | usd }} for single and head of household filers and {{ usFact('niitThreshold', status=married) | usd }} for married filing jointly. The calculator does not ask for your AGI. It estimates modified AGI as your other taxable income + the standard deduction ({{ usFact('standardDeduction') | usd }} for a single filer) + the gain, which is right if you take the standard deduction and have no other adjustments. In the example above (a single filer with $150,000 of other taxable income and a $100,000 gain), estimated modified AGI is {{ 150000 + usFact('standardDeduction') + 100000 | usd }}, which is {{ 150000 + usFact('standardDeduction') + 100000 - usFact('niitThreshold') | usd }} over the single threshold, so NIIT is {{ usFact('niitRate') | pct1 }} of that, or {{ (150000 + usFact('standardDeduction') + 100000 - usFact('niitThreshold')) * usFact('niitRate') / 100 | usd(2) }}. The long-term federal tax is {{ 100000 * 15 / 100 | usd }}, because the whole gain lands in the 15% bracket.

## How the UK Calculation Works

1. Calculate the gain: sale price − purchase price.
2. Deduct the annual exempt amount ({{ ukFact('cgtAnnualExempt') | gbp }} for {{ taxYear('uk') }}).
3. Work out your taxable income: annual income minus the Personal Allowance ({{ ukFact('personalAllowance') | gbp }}, reduced above {{ ukFact('paTaperThreshold') | gbp }} of income).
4. Unused basic rate band = {{ ukFact('basicBand') | gbp }} minus that taxable income (never below zero).
5. Gains inside the unused basic rate band are taxed at {{ ukFact('cgtBasicRate') | pct }} and the rest at {{ ukFact('cgtHigherRate') | pct }}.

Example: income £35,000 and a £30,000 gain. Taxable income is £35,000 − {{ ukFact('personalAllowance') | gbp }}, which leaves {{ ukFact('basicBand') - (35000 - ukFact('personalAllowance')) | gbp }} of basic rate band unused. The taxable gain is {{ 30000 - ukFact('cgtAnnualExempt') | gbp }}, so {{ min(30000 - ukFact('cgtAnnualExempt'), ukFact('basicBand') - (35000 - ukFact('personalAllowance'))) | gbp }} is taxed at {{ ukFact('cgtBasicRate') | pct }} and {{ 30000 - ukFact('cgtAnnualExempt') - min(30000 - ukFact('cgtAnnualExempt'), ukFact('basicBand') - (35000 - ukFact('personalAllowance'))) | gbp }} at {{ ukFact('cgtHigherRate') | pct }}, for {{ ukCgt(30000, 35000) | gbp(2) }} of tax.

The band is worked out from your income, so you do not choose a taxpayer type. Scottish taxpayers use the UK basic rate band here, because HMRC's manual says to assume the individual is not a Scottish or Welsh taxpayer for this purpose.

## How Each Variable Affects the Result

**Holding Period (US):** The biggest factor. Long-term rates (0%, 15% or 20%) are well below short-term rates (10% to 37%) for most people. In the example above the long-term tax is {{ usCgt(100000, 150000) | usd }} and the short-term tax is {{ usCgt(100000, 150000, holding=short) | usd }}.

**Taxable Income:** Sets where your gain starts in the brackets. In the US, low-income investors can pay 0% on long-term gains. In the UK, income decides how much basic rate band is left for the 18% rate.

**Filing Status (US):** Married filing jointly has about double the single thresholds, so more of the gain falls into lower brackets.

**NIIT (US):** Affects higher earners only, and adds up to 3.8% on the part of the gain above the threshold. Reducing modified AGI below the threshold is the only way to avoid it.

## Common Uses

- Estimating the tax before selling stocks, ETFs or crypto
- Seeing what waiting past one year saves (short-term against long-term)
- Budgeting for a property disposal (a buy-to-let in the UK)
