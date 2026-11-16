---
name: "Stamp Duty Calculator"
slug: "stamp-duty"
category: "economic"
description: "Stamp duty (SDLT) calculator for England and Northern Ireland: first-time buyers, home movers, additional properties and non-UK residents, band by band."
keywords:
  - "stamp duty calculator"
  - "SDLT calculator"
  - "stamp duty land tax"
  - "stamp duty first time buyer"
  - "stamp duty rates 2026"
  - "additional property stamp duty"
  - "how much stamp duty"
relatedTools:
  - "mortgage-affordability"
  - "mortgage-payment"
  - "rent-vs-buy"
  - "savings-goal"
  - "salary-uk"
  - "capital-gains-tax"
lastUpdated: "2026-11-15"
dataSources:
  - name: "GOV.UK: Stamp Duty Land Tax residential rates, including first-time buyer relief"
    url: "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates"
  - name: "GOV.UK: Higher rates for additional properties"
    url: "https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property"
  - name: "GOV.UK: Rates of SDLT for non-UK residents"
    url: "https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents"
  - name: "HMRC SDLT manual: the £40,000 threshold for higher rates"
    url: "https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09740"
faq:
  - question: "What is Stamp Duty Land Tax (SDLT)?"
    answer: "SDLT is a tax you pay when you buy property or land in England and Northern Ireland above a certain price. It is charged on the part of the price inside each band, like income tax, not as one rate on the whole price. Scotland has its own Land and Buildings Transaction Tax (LBTT), and Wales has Land Transaction Tax (LTT)."
  - question: "What are the stamp duty rates from April 2025?"
    answer: "From 1 April 2025 the nil-rate band went back to {{ ukFact('sdltNilBand') | gbp }}, from the temporary £250,000. Standard rates are 0% up to {{ ukFact('sdltNilBand') | gbp }}, 2% from {{ ukFact('sdltNilBand') + 1 | gbp }} to £250,000, 5% from £250,001 to £925,000, 10% from £925,001 to £1.5 million and 12% above that. First-time buyers pay 0% up to {{ ukFact('sdltFtbNilBand') | gbp }} and 5% from {{ ukFact('sdltFtbNilBand') + 1 | gbp }} to {{ ukFact('sdltFtbCap') | gbp }}. The figures were checked against GOV.UK on 15 November 2026."
  - question: "Do first-time buyers pay stamp duty?"
    answer: "First-time buyers get relief on homes up to {{ ukFact('sdltFtbCap') | gbp }}: 0% on the first {{ ukFact('sdltFtbNilBand') | gbp }} and 5% on the part between {{ ukFact('sdltFtbNilBand') + 1 | gbp }} and {{ ukFact('sdltFtbCap') | gbp }}. Above {{ ukFact('sdltFtbCap') | gbp }} the relief is lost entirely and standard rates apply to the full price. A first-time buyer pays {{ sdlt(500000, buyer=ftb) | gbp }} on {{ 500000 | gbp }} but {{ sdlt(500001) | gbp }} on {{ 500001 | gbp }}, a cliff edge of {{ sdlt(500001) - sdlt(500000, buyer=ftb) | gbp }}."
  - question: "How much is the additional property surcharge?"
    answer: "Since 31 October 2024 the surcharge on additional residential properties (buy-to-let and second homes) is {{ ukFact('sdltSurcharge') | pct }} on top of the standard rate in every band. The first {{ ukFact('sdltNilBand') | gbp }} is taxed at {{ ukFact('sdltSurcharge') | pct }} instead of 0%, and the next £125,000 at {{ 2 + ukFact('sdltSurcharge') | pct }} instead of 2%. The higher rates do not apply when the price is under £40,000 (HMRC SDLT manual), so the surcharge is charged only at £40,000 and above."
  - question: "Is there a surcharge for buyers who live abroad?"
    answer: "Yes. Buyers who are not UK resident for SDLT, meaning they were in the UK for fewer than 183 days in the 12 months before buying, pay a further 2% in every band, including the zero-rate band, on purchases of £40,000 or more. It stacks with the additional property surcharge and with first-time buyer rates. For a {{ 450000 | gbp }} home mover, the calculator's non-UK resident box takes SDLT from {{ sdlt(450000) | gbp }} to {{ sdlt(450000) + 450000 * 2 / 100 | gbp }}. Some buyers can reclaim the surcharge later; GOV.UK sets out the conditions."
  - question: "When do I pay stamp duty?"
    answer: "You file the SDLT return and pay within 14 days of completion, the day you legally own the property. Your solicitor or conveyancer normally does this as part of the purchase. Late payment brings interest and penalties from HMRC."
  - question: "Is stamp duty different in Scotland and Wales?"
    answer: "Yes. Scotland uses LBTT and Wales uses LTT, each with its own bands and rates. This calculator covers SDLT for England and Northern Ireland only."
workedExamples:
  - title: "First-time buyer purchasing a £300,000 flat"
    inputs:
      propertyPrice: 300000
      buyerType: "first-time"
    description: "A first-time buyer buying a {{ 300000 | gbp }} property pays {{ sdlt(300000, buyer=ftb) | gbp }} in stamp duty, because the whole price sits inside the {{ ukFact('sdltFtbNilBand') | gbp }} first-time buyer nil-rate band. The relief saves {{ sdlt(300000) - sdlt(300000, buyer=ftb) | gbp }} compared with the standard rates, which would charge 2% on the band from {{ ukFact('sdltNilBand') | gbp }} to £250,000 ({{ sdlt(250000) | gbp }}) and 5% on the £50,000 above it ({{ sdlt(300000) - sdlt(250000) | gbp }})."
  - title: "Moving home to a £450,000 house"
    inputs:
      propertyPrice: 450000
      buyerType: "standard"
    description: "Buying a {{ 450000 | gbp }} property as a home mover costs {{ sdlt(450000) | gbp }} in SDLT: nothing on the first {{ ukFact('sdltNilBand') | gbp }}, {{ sdlt(250000) | gbp }} on the next £125,000 (at 2%) and {{ sdlt(450000) - sdlt(250000) | gbp }} on the remaining £200,000 (at 5%). The effective rate is {{ sdlt(450000) / 450000 * 100 | pct(2) }}. Add it to your moving budget alongside solicitor fees, surveys and removals."
  - title: "Buy-to-let investment at £250,000"
    inputs:
      propertyPrice: 250000
      buyerType: "additional"
    description: "An additional property at {{ 250000 | gbp }} costs {{ sdlt(250000, buyer=additional) | gbp }} in SDLT. The {{ ukFact('sdltSurcharge') | pct }} surcharge applies to every band: {{ ukFact('sdltSurcharge') | pct }} on the first {{ ukFact('sdltNilBand') | gbp }} ({{ sdlt(125000, buyer=additional) | gbp }}) plus {{ 2 + ukFact('sdltSurcharge') | pct }} on the next £125,000 ({{ sdlt(250000, buyer=additional) - sdlt(125000, buyer=additional) | gbp }}), an effective rate of {{ sdlt(250000, buyer=additional) / 250000 * 100 | pct }}. A home mover would pay {{ sdlt(250000) | gbp }} on the same price."
---

## How stamp duty is worked out

Stamp Duty Land Tax (SDLT) applies to property purchases in England and Northern Ireland. You pay each rate only on the part of the price inside its band, so a £450,000 home does not cost 5% of £450,000. The band-by-band table in the calculator shows exactly where each pound of tax comes from.

> **Changed in April 2025:** the nil-rate band went back to {{ ukFact('sdltNilBand') | gbp }} from £250,000, and the first-time buyer band to {{ ukFact('sdltFtbNilBand') | gbp }} from £425,000. These are the rates in force at the time this page was last checked (15 November 2026).

## Current SDLT rates (from 1 April 2025)

| Price band | Standard rate | First-time buyer | Additional property |
|---|---|---|---|
| Up to {{ ukFact('sdltNilBand') | gbp }} | 0% | 0% | {{ ukFact('sdltSurcharge') | pct }} |
| {{ ukFact('sdltNilBand') + 1 | gbp }} to £250,000 | 2% | 0%* | {{ 2 + ukFact('sdltSurcharge') | pct }} |
| £250,001 to {{ ukFact('sdltFtbNilBand') | gbp }} | 5% | 0%* | {{ 5 + ukFact('sdltSurcharge') | pct }} |
| {{ ukFact('sdltFtbNilBand') + 1 | gbp }} to {{ ukFact('sdltFtbCap') | gbp }} | 5% | 5%* | {{ 5 + ukFact('sdltSurcharge') | pct }} |
| {{ ukFact('sdltFtbCap') + 1 | gbp }} to £925,000 | 5% | 5% | {{ 5 + ukFact('sdltSurcharge') | pct }} |
| £925,001 to £1,500,000 | 10% | 10% | {{ 10 + ukFact('sdltSurcharge') | pct }} |
| Over £1,500,000 | 12% | 12% | {{ 12 + ukFact('sdltSurcharge') | pct }} |

*First-time buyer rates apply only when the price is {{ ukFact('sdltFtbCap') | gbp }} or less. Above that, standard rates apply to the full price. Source: GOV.UK, checked 15 November 2026.

## Who pays what

**First-time buyers** pay nothing on the first {{ ukFact('sdltFtbNilBand') | gbp }} and 5% on the part up to {{ ukFact('sdltFtbCap') | gbp }}. At {{ ukFact('sdltFtbNilBand') | gbp }} the relief saves {{ sdlt(300000) - sdlt(300000, buyer=ftb) | gbp }}, and at {{ ukFact('sdltFtbCap') | gbp }} it saves {{ sdlt(500000) - sdlt(500000, buyer=ftb) | gbp }}.

**Home movers** replacing their main home pay standard rates, starting at 2% above {{ ukFact('sdltNilBand') | gbp }}.

**Additional property buyers** (second homes, buy-to-let) pay the {{ ukFact('sdltSurcharge') | pct }} surcharge on every band, including the nil-rate band, on purchases of £40,000 or more. A {{ 300000 | gbp }} buy-to-let costs {{ sdlt(300000, buyer=additional) | gbp }}, against {{ sdlt(300000) | gbp }} for a home mover: {{ sdlt(300000, buyer=additional) - sdlt(300000) | gbp }} more.

**Buyers who are not UK resident** pay a further 2% in every band, on top of whichever rates apply.

## Mistakes that cost money

1. **Leaving SDLT out of the budget.** On a {{ 450000 | gbp }} home it is {{ sdlt(450000) | gbp }}, due on top of the deposit, solicitor fees, survey and moving costs.
2. **Assuming first-time buyer relief reaches above {{ ukFact('sdltFtbCap') | gbp }}.** It does not. A first-time buyer pays {{ sdlt(500000, buyer=ftb) | gbp }} at {{ ukFact('sdltFtbCap') | gbp }} and {{ sdlt(500001) | gbp }} at {{ 500001 | gbp }}, so a £1 higher price costs {{ sdlt(500001) - sdlt(500000, buyer=ftb) | gbp }} more tax.
3. **Forgetting the surcharges.** The additional property surcharge and the non-UK resident surcharge each add to every band, so they apply to the whole price from the first pound, not only to the top slice.

## When to use this calculator

- **Before making an offer.** Put SDLT into the total cost.
- **Comparing prices.** See how SDLT steps up at band edges, and at the {{ ukFact('sdltFtbCap') | gbp }} cliff for first-time buyers.
- **Buy-to-let analysis.** The surcharge changes the return on a smaller property a great deal.
- **First-time buyer planning.** Check whether your target price qualifies for relief.
