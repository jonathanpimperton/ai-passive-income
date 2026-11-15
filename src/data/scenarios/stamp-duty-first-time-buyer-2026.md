---
title: "First-Time Buyer Stamp Duty: {{ sdlt(425000, buyer=ftb) | gbp }} on £425,000"
slug: "stamp-duty-first-time-buyer-2026"
description: "First-time buyer stamp duty in England and NI: £0 up to {{ ukFact('sdltFtbNilBand') | gbp }}, 5% to {{ ukFact('sdltFtbCap') | gbp }}, then no relief. FTB vs standard SDLT at £300k, £425k, £500k and £625k."
keywords: ["stamp duty first time buyer", "first time buyer stamp duty {{ taxYear('uk') }}", "first time buyer SDLT relief", "stamp duty relief threshold", "how much stamp duty first time buyer"]
toolSlug: "stamp-duty"
toolCategory: "economic"
inputs:
  Property price: "£425,000"
  Buyer type: "First-time buyer"
  Region: "England / Northern Ireland"
resultSummary: "{{ sdlt(425000, buyer=ftb) | gbp }} SDLT (vs {{ sdlt(425000) | gbp }} standard)"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "How much stamp duty does a first-time buyer pay in {{ taxYear('uk') }}?"
    answer: "Nothing on the first {{ ukFact('sdltFtbNilBand') | gbp }}, then 5% on the portion between {{ ukFact('sdltFtbNilBand') | gbp }} and {{ ukFact('sdltFtbCap') | gbp }} — but only if the property costs {{ ukFact('sdltFtbCap') | gbp }} or less. At £300,000 the bill is {{ sdlt(300000, buyer=ftb) | gbp }}, at £425,000 it is {{ sdlt(425000, buyer=ftb) | gbp }}, and at £500,000 it is {{ sdlt(500000, buyer=ftb) | gbp }}. Above {{ ukFact('sdltFtbCap') | gbp }} the relief disappears entirely and standard rates apply to the whole price."
  - question: "What happens if the property costs more than £500,000?"
    answer: "First-time buyer relief does not taper — it switches off completely. At £500,000 a first-time buyer pays {{ sdlt(500000, buyer=ftb) | gbp }}; at £500,001 the bill jumps to {{ sdlt(500001, buyer=ftb) | gbp }} because the whole purchase reverts to standard rates. One extra pound of purchase price costs {{ sdlt(500001, buyer=ftb) - sdlt(500000, buyer=ftb) | gbp }} in tax, so prices just over the cap are worth negotiating down."
  - question: "Does first-time buyer relief apply in Scotland and Wales?"
    answer: "No. SDLT and this relief cover England and Northern Ireland only. Scotland charges Land and Buildings Transaction Tax (LBTT), which has its own smaller first-time buyer relief, and Wales charges Land Transaction Tax (LTT), which has no first-time buyer relief at all."
  - question: "Do both buyers have to be first-time buyers to get the relief?"
    answer: "Yes. Every purchaser on the deed must be a first-time buyer — someone who has never owned or part-owned residential property anywhere in the world, including inherited property. If one of you has owned before, the whole purchase is taxed at standard rates. You must also intend to live in the property as your main home."
---

## {{ sdlt(425000, buyer=ftb) | gbp }} at £425,000 — {{ sdlt(425000) - sdlt(425000, buyer=ftb) | gbp }} less than the standard bill

**A first-time buyer purchasing a £425,000 home in England or Northern Ireland pays {{ sdlt(425000, buyer=ftb) | gbp }} in Stamp Duty Land Tax in the {{ taxYear('uk') }} tax year — {{ sdlt(425000) - sdlt(425000, buyer=ftb) | gbp }} less than the {{ sdlt(425000) | gbp }} a standard buyer pays on the same property.** Between {{ ukFact('sdltFtbNilBand') | gbp }} and {{ ukFact('sdltFtbCap') | gbp }}, the relief is worth exactly {{ sdlt(300000) | gbp }} at every price, because it removes the tax on the first {{ ukFact('sdltFtbNilBand') | gbp }}, which standard buyers pay.

But the relief has a hard edge: it only exists on properties costing {{ ukFact('sdltFtbCap') | gbp }} or less. Cross that line by a single pound and the entire discount vanishes.

## How the relief works

First-time buyers pay SDLT on these bands (rates in force since 1 April 2025, per [GOV.UK's residential SDLT rates](https://www.gov.uk/stamp-duty-land-tax/residential-property-rates)):

- **0%** on the first {{ ukFact('sdltFtbNilBand') | gbp }}
- **5%** on the portion from {{ ukFact('sdltFtbNilBand') | gbp }} to {{ ukFact('sdltFtbCap') | gbp }}

Standard buyers pay 0% up to {{ ukFact('sdltNilBand') | gbp }}, 2% from {{ ukFact('sdltNilBand') | gbp }} to £250,000, and 5% from £250,000 to £925,000. The first-time buyer schedule effectively extends the nil-rate band from {{ ukFact('sdltNilBand') | gbp }} to {{ ukFact('sdltFtbNilBand') | gbp }} — which is why the saving is a flat {{ sdlt(300000) | gbp }} (2% of {{ 250000 - ukFact('sdltNilBand') | gbp }} plus 5% of £50,000) at any qualifying price above {{ ukFact('sdltFtbNilBand') | gbp }}.

## The numbers at four price points

| Property price | First-time buyer | Standard buyer | Relief saves |
|---|---|---|---|
| £300,000 | {{ sdlt(300000, buyer=ftb) | gbp }} | {{ sdlt(300000) | gbp }} | {{ sdlt(300000) - sdlt(300000, buyer=ftb) | gbp }} |
| £425,000 | {{ sdlt(425000, buyer=ftb) | gbp }} | {{ sdlt(425000) | gbp }} | {{ sdlt(425000) - sdlt(425000, buyer=ftb) | gbp }} |
| £500,000 | {{ sdlt(500000, buyer=ftb) | gbp }} | {{ sdlt(500000) | gbp }} | {{ sdlt(500000) - sdlt(500000, buyer=ftb) | gbp }} |
| £625,000 | {{ sdlt(625000, buyer=ftb) | gbp }} | {{ sdlt(625000) | gbp }} | {{ sdlt(625000) - sdlt(625000, buyer=ftb) | gbp }} |

Up to {{ ukFact('sdltFtbNilBand') | gbp }}, a first-time buyer pays no stamp duty at all. From there to {{ ukFact('sdltFtbCap') | gbp }} the effective rate stays low — {{ sdlt(425000, buyer=ftb) / 425000 * 100 | pct(2) }} of the purchase price at £425,000, {{ sdlt(500000, buyer=ftb) / 500000 * 100 | pct(auto) }} at £500,000. At £625,000 the first-time buyer pays exactly what everyone else pays: {{ sdlt(625000, buyer=ftb) | gbp }}, or {{ sdlt(625000, buyer=ftb) / 625000 * 100 | pct1 }} of the price.

## The £500,000 cliff

The relief is all-or-nothing. At £500,000 the bill is {{ sdlt(500000, buyer=ftb) | gbp }}; at £500,001 it is {{ sdlt(500001, buyer=ftb) | gbp }} — standard rates applied to the whole price, not just the pound above the cap.

That makes the pricing around the cap unusually important. If you are negotiating on a property listed at £505,000, getting the price to £500,000 saves {{ sdlt(505000, buyer=ftb) - sdlt(500000, buyer=ftb) | gbp }} in tax on top of the £5,000 price reduction. Equally, paying for fixtures or furnishings separately (at a fair, documented value) rather than rolling them into the property price can legitimately matter near the threshold — though HMRC scrutinises apportionments that look artificial.

## Who qualifies

The conditions are stricter than many buyers expect:

- **Never owned before, anywhere.** You cannot have owned or part-owned residential property in the UK or abroad — including a share of an inherited house.
- **Everyone on the purchase.** If buying jointly, all purchasers must qualify. One previous owner on the deed removes the relief for the whole transaction.
- **You will live there.** The property must be intended as your only or main residence — buy-to-let purchases don't qualify.
- **England and Northern Ireland only.** Scotland (LBTT) and Wales (LTT) have separate systems with different reliefs.

The full rules and rate tables are on GOV.UK: [SDLT residential property rates](https://www.gov.uk/stamp-duty-land-tax/residential-property-rates) (the first-time buyer table is on that page).

## Mind the other cap: the LISA stops at £450,000

If your deposit is sitting in a Lifetime ISA, note that the two schemes' limits don't line up. SDLT relief runs to {{ ukFact('sdltFtbCap') | gbp }}, but a LISA can only be used without a charge on a first home costing **£450,000 or less**. Buy at £470,000 and you'd keep the stamp duty relief ({{ sdlt(470000) - sdlt(470000, buyer=ftb) | gbp }} saved on the {{ sdlt(470000) | gbp }} standard bill) but pay a 20% charge to use your LISA money. GOV.UK says "If the property costs more than £450,000, you'll pay a 20% withdrawal charge" ([withdrawing money from your Lifetime ISA](https://www.gov.uk/lifetime-isa/withdrawing-money-from-your-lifetime-isa)); the reduced 20% rate applies to withdrawals from 29 October 2026 and was 25% before ([HMRC policy paper](https://www.gov.uk/government/publications/lifetime-isa-withdrawal-charge/reduce-lifetime-isa-withdrawal-charge-for-properties-over-the-property-price-cap)). The 20% charge takes back the government bonus, so between £450,000 and {{ ukFact('sdltFtbCap') | gbp }} you get the stamp duty relief but not the LISA bonus. See [LISA vs regular ISA](/comparisons/lisa-vs-regular-isa/) for how the charge works.

## Check your own purchase

Every figure above comes from the same band-by-band calculation the [Stamp Duty Calculator](/tools/economic/stamp-duty/) runs. Enter your actual price and buyer type to see the bill, the effective rate, and how the tax splits across bands — including the {{ ukFact('sdltSurcharge') | pct }} surcharge if you are buying an additional property rather than your first. The method is in [how we calculate stamp duty](/how-we-calculate/stamp-duty/). Once you know the tax, [what a £300,000 mortgage costs a month](/scenarios/uk-300k-mortgage-payment/) shows the repayment side of the same purchase.
