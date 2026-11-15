---
title: "How We Calculate: Stamp Duty (SDLT)"
slug: "stamp-duty"
toolSlug: "stamp-duty"
formula: "SDLT = Σ (portion of price in each band × (band rate + surcharges)). Surcharges: +5% for additional properties and +2% for non-UK residents, each applied to every band, but only when the price is £40,000 or more."
variables:
  - name: "Property Price"
    description: "The total purchase price of the residential property"
  - name: "Buyer Type"
    description: "First-time buyer, home mover (standard), or additional property. It decides which rate table and which surcharge apply"
  - name: "Non-UK Resident"
    description: "Whether the buyer is not UK resident for SDLT (broadly, fewer than 183 days in the UK in the 12 months before the purchase). It adds the 2% surcharge"
  - name: "Band Rates"
    description: "Progressive rates that apply only to the part of the price inside each band, not to the whole price"
assumptions:
  - "Rates are for residential property in England and Northern Ireland only (Scotland has LBTT and Wales has LTT)"
  - "The rates are those in force since 1 April 2025. SDLT changes on announced dates and not on 6 April, so the calculator is not tied to a tax year. They were checked against GOV.UK on 12 November 2026"
  - "First-time buyer relief applies only to prices up to £500,000. Above that, standard rates apply to the whole price, with no relief at all"
  - "Additional properties pay a 5% surcharge on top of the standard rate in every band, including the 0% band"
  - "Non-UK residents pay a further 2% surcharge on top of every rate in every band, including the 0% bands, first-time buyer rates and the higher rates for additional properties"
  - "Neither surcharge applies when the price is below £40,000. In that case the calculator shows the standard result and says the surcharge was skipped"
  - "Non-residential and mixed-use properties have different rates and are not covered"
limitations:
  - "Does not cover Scotland (LBTT) or Wales (LTT), which have their own rates"
  - "Does not model non-residential or mixed-use property rates"
  - "Does not model company buyers: higher flat rates can apply when a company buys a dwelling worth over £500,000"
  - "Does not model reliefs such as shared ownership, transfers on divorce or charity purchases"
  - "Does not model multiple dwellings relief, which was abolished from 1 June 2024 for transactions after that date (with transitional rules for contracts exchanged on or before 6 March 2024)"
  - "For leasehold purchases the £40,000 test uses the premium, and the non-resident rules also look at the annual rent, so check the GOV.UK guidance"
  - "Does not calculate the filing deadline or penalties for late payment"
dataSources:
  - name: "GOV.UK: Stamp Duty Land Tax residential property rates (includes first-time buyer relief and higher rates)"
    url: "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates"
  - name: "GOV.UK: Higher rates for additional residential properties"
    url: "https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property"
  - name: "GOV.UK: Rates of Stamp Duty Land Tax for non-UK residents"
    url: "https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents"
  - name: "HMRC SDLT Manual SDLTM09740: higher rates do not apply below £40,000"
    url: "https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09740"
  - name: "HMRC SDLT Manual SDLTM09870: non-UK resident surcharge examples"
    url: "https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09870"
  - name: "GOV.UK: Abolition of Multiple Dwellings Relief from 1 June 2024"
    url: "https://www.gov.uk/government/publications/stamp-duty-land-tax-abolition-of-multiple-dwellings-relief-from-1-june-2024"
---

## What This Calculator Does

The Stamp Duty calculator works out the SDLT (Stamp Duty Land Tax) owed on a residential purchase in England and Northern Ireland. It applies the right progressive bands for the buyer type (first-time buyer, home mover or additional property buyer) and adds the 2% non-UK resident surcharge if you tick it.

SDLT is a **progressive tax**: each part of the price is taxed at its own rate, not one rate on the whole amount. This is a common misconception that makes people overestimate their bill.

## How the Calculation Works

1. Choose the rate table from the buyer type. First-time buyer relief rates apply only if the price is {{ ukFact('sdltFtbCap') | gbp }} or less. Above that cap, standard rates apply to the whole price.
2. Work out the surcharge. If the buyer is buying an additional property, add {{ ukFact('sdltSurcharge') | pct }}. If the buyer is a non-UK resident, add 2%. Both surcharges are skipped when the price is below £40,000.
3. For each band, multiply the part of the price inside the band by that band's rate plus the surcharge.
4. Add up the band taxes to get the total SDLT.
5. The effective rate is the total SDLT divided by the price.

### Example: £350,000 Standard Purchase

| Band | Portion | Rate | Tax |
|---|---|---|---|
| £0 to £125,000 | £125,000 | 0% | £0 |
| £125,001 to £250,000 | £125,000 | 2% | £2,500 |
| £250,001 to £350,000 | £100,000 | 5% | £5,000 |
| **Total** | | **{{ sdlt(350000) / 350000 * 100 | pct(2) }}** | **{{ sdlt(350000) | gbp }}** |

## Surcharges

**Additional property (5%):** the surcharge is added to every band, including the 0% band, so the first £125,000 of an additional property is taxed at 5% and not 0%. It applies when the price is £40,000 or more.

**Non-UK resident (2%):** a further 2 percentage points on every band, including the zero rates and the first-time buyer rates, and on top of the higher rates for additional properties. It also applies when the price is £40,000 or more. HMRC's examples show how it works: a £700,000 standard purchase by a non-UK resident costs £39,000 (the standard £25,000 plus 2% of £700,000), and a £200,000 first-time buyer purchase costs £4,000 (0% in the relief bands plus 2% of £200,000). The calculator reproduces both figures.

**Below £40,000:** neither surcharge applies, so the calculator charges standard rates and tells you the surcharge was skipped.

## How Each Variable Affects the Result

**Property Price:** SDLT rises progressively. Crossing {{ ukFact('sdltNilBand') | gbp }} triggers the first tax (2p on the first £1 above it), while above £925,000 each extra £1 is taxed at 10%.

**Buyer Type:** The biggest differentiator. At £400,000, a first-time buyer pays {{ sdlt(400000, buyer=ftb) | gbp }}, a home mover pays {{ sdlt(400000) | gbp }}, and an additional property buyer pays {{ sdlt(400000, buyer=additional) | gbp }}.

## Key Rate Thresholds

Watch for these price points:

- **{{ ukFact('sdltNilBand') | gbp }}:** standard SDLT starts (0% below, 2% above)
- **{{ ukFact('sdltFtbNilBand') | gbp }}:** first-time buyer relief rate rises (0% below, 5% above for first-time buyers)
- **{{ ukFact('sdltFtbCap') | gbp }}:** first-time buyer cap. A first-time buyer pays {{ sdlt(500000, buyer=ftb) | gbp }} at £500,000 and {{ sdlt(500001, buyer=ftb) | gbp }} at £500,001, because the relief disappears entirely above the cap
- **£925,000:** the 10% band starts
- **£1,500,000:** the 12% band starts
- **£40,000:** the 5% additional-property surcharge and the 2% non-resident surcharge start to apply
