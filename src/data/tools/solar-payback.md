---
name: "Solar Panel Payback Calculator"
slug: "solar-payback"
category: "saving-and-growth"
description: "Estimate how long solar panels take to pay for themselves — with or without a battery, based on your tariff and usage."
keywords:
  - "solar panel payback period"
  - "solar panel ROI calculator"
  - "solar panel savings calculator"
  - "solar battery payback"
  - "solar panel cost calculator"
  - "how long do solar panels take to pay back"
  - "solar panel investment return"
relatedTools:
  - "compound-interest"
  - "investment-return"
  - "roi"
  - "savings-goal"
  - "investment-fee"
faq:
  - question: "How long do solar panels take to pay for themselves?"
    answer: "A typical 4kW system in the UK costs around £7,000 and generates roughly £600–£900 of savings per year, giving a payback period of 8–12 years. In the US, a 8kW system at $20,000 before the federal tax credit typically pays back in 7–10 years (faster in sunny states). Adding a battery extends payback by 3–5 years because of the extra upfront cost, but increases self-consumption from ~30% to ~75% and protects against future tariff rises."
  - question: "Does adding a solar battery make financial sense?"
    answer: "It depends on the gap between your electricity tariff and export tariff. In the UK, you pay ~24.5p/kWh but the Smart Export Guarantee only pays ~3–6p/kWh — so every kWh you store and use yourself saves ~20p compared to exporting it. A 5kWh battery costing £4,500 that shifts ~4.5kWh/day (after 90% round-trip efficiency losses) from export to self-consumption saves roughly £330/year extra, paying back in about 13 years. With rising energy prices and falling battery costs, the economics are improving each year. Without time-of-use tariffs or frequent power cuts, a battery is still marginal purely on financial grounds."
  - question: "What is self-consumption rate and why does it matter?"
    answer: "Self-consumption is the percentage of generated solar electricity that you use directly in your home rather than exporting to the grid. Without a battery, a typical household self-consumes only 25–35% because panels generate most electricity during midday when many people are at work. With a battery, self-consumption rises to 60–80% because surplus daytime generation is stored for evening use. Higher self-consumption means greater savings — you avoid buying grid electricity at the full tariff rate, rather than exporting at a much lower rate."
  - question: "What is the Smart Export Guarantee (SEG) and how much does it pay?"
    answer: "The Smart Export Guarantee is a UK scheme requiring licensed electricity suppliers to pay households for surplus solar electricity exported to the grid. SEG rates vary widely by supplier, from 1p/kWh to around 15–25p/kWh for some agile/time-of-use tariffs. Standard fixed SEG rates typically pay 3–6p/kWh. Some suppliers offer higher rates if you also buy your electricity from them. Octopus Energy's Agile Outgoing tariff can pay above 15p/kWh during peak demand, but rates fluctuate by the half-hour. For a conservative estimate, use 4–5p/kWh."
  - question: "How does panel degradation affect long-term savings?"
    answer: "Solar panels gradually lose output over their lifetime due to weathering and cell degradation. The industry standard degradation rate is about 0.5% per year — so after 25 years, a panel produces roughly 88% of its original output. High-quality panels (LG, SunPower, REC) may degrade at 0.3% per year. This means a 4kW system generating 3,600 kWh in year 1 would generate about 3,170 kWh in year 25. The calculator accounts for this decline in each year's savings estimate."
  - question: "Are solar panels still worth it in 2026 without a government subsidy?"
    answer: "Yes, for most UK and US homeowners. In the UK, solar panels have been VAT-free (0%) since 2022 and this continues through March 2027, effectively saving ~17% on system cost. Electricity prices remain high (24.5p/kWh under the Ofgem cap), making the payback period attractive at 8–12 years against a 25-year panel warranty. In the US, the federal 30% Residential Clean Energy Credit expired at the end of 2025 for new homeowner installations, but many state-level incentives remain. Even without federal credits, falling panel costs mean payback periods under 10 years in most sunny states."
  - question: "How much electricity does a solar panel system generate per year?"
    answer: "Output depends on system size, location, and roof orientation. In the UK, expect 800–1,100 kWh per kWp per year (a south-facing roof in southern England gets ~900 kWh/kWp; Scotland may get ~800). In the US, the range is wider: 1,200 kWh/kWp in the northern states up to 1,600+ kWh/kWp in the Southwest. A 4kW UK system generates roughly 3,200–4,400 kWh per year. A 8kW US system generates roughly 9,600–12,800 kWh per year."
workedExamples:
  - title: "4kW system in the UK, no battery"
    inputs:
      systemCost: 7000
      systemSize: 4
      electricityTariff: 24.5
      selfConsumption: 30
      exportTariff: 4.5
    description: "A 4kW system generating 3,600 kWh/year. At 30% self-consumption, 1,080 kWh is used directly (saving £265 at 24.5p/kWh) and 2,520 kWh is exported (earning £113 at 4.5p/kWh). After £150 maintenance, year 1 net savings are £228. With 3% energy price inflation, the system pays back in approximately 11 years and generates over £12,000 in total savings over 25 years."
  - title: "4kW system with 5kWh battery in the UK"
    inputs:
      systemCost: 7000
      systemSize: 4
      batteryCost: 4500
      baseSelfConsumption: 30
      batteryCapacity: 5
    description: "Same 4kW system, but a 5kWh battery with 90% round-trip efficiency boosts effective self-consumption to 76%. Of the 3,600 kWh generated, 2,736 kWh is self-consumed (saving £670 at 24.5p/kWh) and 864 kWh is exported (earning £39 at 4.5p/kWh). Year 1 savings are £559 after £150 maintenance. However, the net system cost is £11,500 (panels + battery), extending payback to approximately 13 years. Over 25 years, total savings exceed £23,000 — the battery adds cost but increases lifetime returns."
  - title: "8kW system in a sunny US state"
    inputs:
      systemCost: 20000
      systemSize: 8
      electricityTariff: 18
      selfConsumption: 30
      exportTariff: 8
      kWhPerKwp: 1400
    description: "An 8kW system generating 11,200 kWh/year at 1,400 kWh/kWp. At 30% self-consumption, 3,360 kWh is used (saving $605 at 18¢/kWh) and 7,840 kWh is exported ($627 at 8¢/kWh). After $400 maintenance, year 1 net savings are $832. The $20,000 system pays back in roughly 12 years. In states with full net metering (export = import rate), payback drops to under 9 years."
lastUpdated: "2026-03-10"
dataSources:
  - name: "Ofgem — Energy Price Cap Q2 2026"
    url: "https://www.ofgem.gov.uk/check-if-energy-price-cap-affects-you"
  - name: "EnergySage — Solar Panel Cost In 2026"
    url: "https://www.energysage.com/local-data/solar-panel-cost/"
  - name: "NREL — Solar Panel Degradation Rates"
    url: "https://www.nrel.gov/docs/fy12osti/51664.pdf"
calculationMethod: "Year-by-year simulation: annual generation (kWp × kWh/kWp × degradation factor), split between self-consumption and export, multiplied by escalating tariff rates, minus maintenance. Payback occurs when cumulative savings equal net system cost."
---

## Should You Install Solar Panels?

Solar panels are a long-term investment. Unlike a savings account that earns interest, panels generate returns by reducing your electricity bill and earning income from exported surplus. The payback period tells you when the cumulative savings equal what you spent — everything after that is profit.

> **Key takeaway:** In the UK, a typical 4kW system pays back in 8–12 years against a 25-year panel warranty. That means 13–17 years of essentially free electricity after the system has paid for itself.

## How the Payback Calculation Works

The calculator simulates each year over your chosen analysis period:

1. **Annual generation** = System size (kWp) × annual output per kWp, reduced by panel degradation each year
2. **Self-consumed electricity** saves you the full electricity tariff rate per kWh
3. **Exported electricity** earns the export tariff rate per kWh (Smart Export Guarantee in the UK, net metering in the US)
4. **Annual savings** = self-consumption savings + export income − maintenance costs
5. **Electricity tariff escalates** by the energy price inflation rate each year
6. **Payback** = the year when cumulative savings first exceed the net system cost

## With or Without a Battery?

A battery stores surplus daytime solar for evening use, dramatically increasing self-consumption:

| Scenario | Self-Consumption | Year 1 Savings | Added Cost | Payback Impact |
|---|---|---|---|---|
| Panels only | 25–35% | Lower | £0 | Shorter payback |
| Panels + battery | 60–80% | Higher | £3,000–£8,000 | Longer payback |

The battery improves annual savings but adds significant upfront cost. In most cases, it extends the payback period by 3–5 years but increases total lifetime savings. Batteries make more financial sense when:

- The gap between your import tariff and export tariff is large (UK: ~20p gap)
- You have time-of-use tariffs (charge battery cheap, discharge expensive)
- Energy prices are rising faster than average
- You want backup power during grid outages

## Key Factors That Affect Payback

**Electricity tariff rate** is the single biggest driver. Higher tariffs mean greater savings from every kWh you self-consume. UK rates (24.5p/kWh) make solar more attractive than many US states (18¢/kWh average).

**Self-consumption rate** determines how much value you extract from each kWh generated. Working from home, running appliances during daylight hours, or adding a battery all increase self-consumption.

**System cost** has fallen dramatically — UK prices dropped from £6,000/kW in 2010 to under £1,500/kW in 2026. Installation quality matters though: cheap panels degrade faster and underperform.

**Roof orientation** and shading affect actual generation. South-facing roofs (UK) produce the most; east/west-facing roofs produce ~15–20% less. Heavy shading can reduce output by 50% or more.

## UK vs US Differences

| Factor | UK | US |
|---|---|---|
| Typical system size | 3–5 kWp | 6–10 kWp |
| Average cost | £5,000–£9,000 | $15,000–$25,000 |
| Output per kWp | 800–1,100 kWh/year | 1,200–1,600 kWh/year |
| Electricity rate | ~24.5p/kWh | ~18¢/kWh (varies by state) |
| Export payment | SEG: 3–6p/kWh | Net metering (varies by state) |
| VAT/tax credit | 0% VAT through March 2027 | Federal 30% ITC expired Dec 2025 |

## When to Use This Calculator

Use this calculator when you are:

- **Getting quotes** and want to compare the financial return of different system sizes
- **Deciding on a battery** and need to see how it changes the payback timeline
- **Evaluating different tariffs** — switch between import rates and export rates to model different suppliers
- **Planning for the future** — adjust energy price inflation to see how rising prices affect returns

Compare results with the [ROI Calculator](/tools/saving-and-growth/roi/) for a simple percentage return, or the [Investment Return Calculator](/tools/saving-and-growth/investment-return/) to see what the same money would earn in the stock market.
