---
title: "How We Calculate: Stamp Duty (SDLT)"
slug: "stamp-duty"
toolSlug: "stamp-duty"
formula: "SDLT = Σ (portion of price in each band × band rate). For additional properties, add 5% surcharge to each band rate."
variables:
  - name: "Property Price"
    description: "The total purchase price of the residential property"
  - name: "Buyer Type"
    description: "First-time buyer, home mover (standard), or additional property — determines which rate table and surcharges apply"
  - name: "Band Rates"
    description: "Progressive tax rates that apply only to the portion of the price within each band (not the full price)"
assumptions:
  - "Rates are for residential property in England and Northern Ireland only (not Scotland LBTT or Wales LTT)"
  - "Uses rates effective from 1 April 2025 (post-temporary relief reversion)"
  - "First-time buyer relief applies only to properties up to £500,000 — above this, standard rates apply to the full price"
  - "Additional property surcharge of 5% (from 31 October 2024) applies on top of standard rates at every band"
  - "Non-residential and mixed-use properties have different rates (not covered)"
  - "Does not include any reliefs beyond first-time buyer relief (e.g., multiple dwellings relief was abolished April 2024)"
limitations:
  - "Does not cover Scotland (LBTT) or Wales (LTT) — these have separate rate structures"
  - "Does not model non-residential or mixed-use property rates"
  - "Does not account for corporate buyers (15% flat rate on properties over £500,000)"
  - "Reliefs such as shared ownership, property transfer in divorce, and charity purchases are not modeled"
  - "Does not calculate the exact payment deadline or penalties for late payment"
dataSources:
  - name: "GOV.UK — Stamp Duty Land Tax residential rates"
    url: "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates"
  - name: "GOV.UK — Higher rates for additional properties"
    url: "https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property"
  - name: "GOV.UK — First-time buyer relief"
    url: "https://www.gov.uk/stamp-duty-land-tax/relief-for-first-time-buyers"
---

## What This Calculator Does

The Stamp Duty calculator computes the SDLT (Stamp Duty Land Tax) owed on a residential property purchase in England and Northern Ireland. It applies the correct progressive band rates based on the buyer type: first-time buyer, home mover, or additional property buyer.

SDLT is a **progressive tax** — each portion of the price is taxed at its own rate, not a flat rate on the whole amount. This is a common misconception that leads people to overestimate their tax bill.

## How the Calculation Works

1. Determine which rate table applies based on buyer type
2. For first-time buyers above £500,000, fall back to standard rates
3. For additional properties, add the 5% surcharge to each band's rate
4. Calculate tax in each band: `portion of price in band × effective rate`
5. Sum all band taxes for total SDLT
6. Compute effective rate: `total SDLT ÷ property price × 100`

### Example: £350,000 Standard Purchase

| Band | Portion | Rate | Tax |
|---|---|---|---|
| £0 – £125,000 | £125,000 | 0% | £0 |
| £125,001 – £250,000 | £125,000 | 2% | £2,500 |
| £250,001 – £350,000 | £100,000 | 5% | £5,000 |
| **Total** | | **2.14%** | **£7,500** |

## How Each Variable Affects the Result

**Property Price:** SDLT increases progressively. The jump from £125,000 to £125,001 triggers the first tax (£0.02), but the jump from £925,000 to £925,001 adds 10% on the marginal pound. Higher bands have steeper marginal rates.

**Buyer Type:** The biggest differentiator. At £400,000, a first-time buyer pays £5,000, a home mover pays £10,000, and an additional property buyer pays £25,000. The same property, three very different tax bills.

## Key Rate Thresholds

Watch for these price points where SDLT behaviour changes:

- **£125,000:** Standard SDLT starts (0% below, 2% above)
- **£300,000:** First-time buyer relief ends (0% below, 5% above for FTBs)
- **£500,000:** First-time buyer cap — above this, no FTB relief at all
- **£925,000:** 10% band starts
- **£1,500,000:** 12% band starts

## Why This Calculator Exists

SDLT is one of the largest upfront costs of buying a home, yet many buyers don't factor it into their budget until late in the process. This calculator shows the exact bill in seconds, broken down by band, so you can plan accurately and compare the impact at different price points.
