---
name: "Solar Panel Payback Calculator"
slug: "solar-payback"
category: "saving-and-growth"
description: "Solar panel payback calculator: payback time, year-one savings and 25-year return for UK, US and euro-area homes, with or without a battery."
keywords:
  - "solar panel payback period"
  - "solar panel ROI calculator"
  - "solar panel savings calculator"
  - "solar battery payback"
  - "solar panel cost calculator"
  - "how long do solar panels take to pay back"
  - "solar panel investment return"
relatedTools:
  - "roi"
  - "savings-goal"
  - "investment-return"
  - "compound-interest"
  - "inflation"
faq:
  - question: "How long do solar panels take to pay for themselves?"
    answer: "It depends on what the panels save you. A 4kW UK system costing £7,000, with electricity at 26.32p/kWh and exports at 4.5p/kWh, pays back in {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} if you use 30% of the output yourself, and in {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=50, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} at 50%. A 7.5kW US system costing $22,500, with electricity and exports both at 18.04 cents, pays back in {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }}. Your own result depends on your quote, your tariff and how much of the output you use at home."
  - question: "Does adding a solar battery make financial sense?"
    answer: "Only when the gap between what you pay for electricity and what you are paid for exports is large. In the UK, with a 26.32p import price against a 4.5p export price, a 5kWh battery costing £4,500 lifts self-consumption from 30% to {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).selfConsumption | int }}% and shortens payback from {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} to {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).paybackTotalMonths | months }}. Under US net metering, where exports earn the retail rate, a battery adds cost without adding savings: payback goes from {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }} to {{ solarPayback('us', battery=true, systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375, batteryCost=15750, batteryCapacity=13.5).paybackTotalMonths | months }} with a 13.5kWh battery costing $15,750. A battery also gives backup power in an outage, which the payback figure does not value."
  - question: "What is self-consumption and why does it matter?"
    answer: "Self-consumption is the share of the electricity your panels generate that you use at home instead of exporting. Each self-used kWh saves the full import price, while each exported kWh earns only the export rate. The calculator starts at 30%, which is an assumption: households that are home in the daytime use more. Raising it from 30% to 50% on the UK example above moves payback from {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} to {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=50, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }}. Running the washing machine and dishwasher in the daytime, or adding a battery, raises it."
  - question: "What is the Smart Export Guarantee (SEG) and how much does it pay?"
    answer: "The Smart Export Guarantee is a UK scheme that requires larger electricity suppliers to pay households for solar electricity they export. In Ofgem's report for April 2024 to March 2025, tariffs not tied to the supplier's import tariff averaged 4.39p/kWh, while tariffs tied to it averaged 14.54p/kWh. Rates differ widely by supplier, and some pay more if you also buy your electricity from them. The calculator uses 4.5p/kWh for the UK; enter your own supplier's rate."
  - question: "How does panel degradation affect long-term savings?"
    answer: "Panels lose a little output every year. The calculator assumes 0.5% a year, a figure that is already common for some manufacturers; the US National Laboratory of the Rockies (formerly NREL) assumes 0.7% a year in its baseline. At 0.5% a year, the UK example generates {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 | int }} kWh in year 1 and {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationFinal | int }} kWh in year 25, which is {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationFinal / solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 * 100 | pct }} of the first year. Each year's savings in the calculator already reflect that decline."
  - question: "Are solar panels still worth it in 2026 without a government subsidy?"
    answer: "It depends on the price you pay for electricity and on what you do with the output. In the UK, installing solar panels is zero-rated for VAT until 31 March 2027, and the rate goes back to 5% from 1 April 2027 (HMRC VAT Notice 708/6). Electricity at the Ofgem cap of 26.32p/kWh for 1 October to 31 December 2026 gives the UK example a payback of {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }}, and a total saving of {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).totalSavings | gbp }} over 25 years. In the US, the 30% residential clean energy credit (25D) is not available for systems placed in service after 31 December 2025 (IRS), though some states and utilities still offer rebates; enter any rebate as the upfront incentive."
  - question: "How much electricity does a solar panel system generate per year?"
    answer: "Output depends on system size, location, tilt and shading. The UK calculator default is 900 kWh per kWp a year, within the 806 to 972 kWh range implied by the UK solar load factors for 2024 and 2025 in DUKES 2026. The US default is 1,375 kWh per kWp, the national mean in NLR's 2024 Annual Technology Baseline. A 4kW UK system therefore generates about {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 | int }} kWh in year 1 and a 7.5kW US system about {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).generationYear1 | int }} kWh. For your address, use NLR's PVWatts estimator."
workedExamples:
  - title: "4kW system in the UK, no battery"
    inputs:
      systemCost: 7000
      systemSize: 4
      electricityTariff: 26.32
      selfConsumption: 30
      exportTariff: 4.5
    description: "A 4kW system costing £7,000 generates {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 | int }} kWh in year 1. At 30% self-consumption, {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 * 0.30 | int }} kWh is used at home (saving {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 * 0.30 * 26.32 / 100 | gbp }} at 26.32p) and {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 * 0.70 | int }} kWh is exported (earning {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).generationYear1 * 0.70 * 4.5 / 100 | gbp }} at 4.5p). After £150 of maintenance, year-1 savings are {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).year1Savings | gbp }}. With 3% a year energy price inflation the system pays back in {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} and saves {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).totalSavings | gbp }} over 25 years."
  - title: "4kW system with a 5kWh battery in the UK"
    inputs:
      systemCost: 7000
      systemSize: 4
      batteryCost: 4500
      baseSelfConsumption: 30
      batteryCapacity: 5
    description: "The same system with a 5kWh battery (90% round-trip efficiency) lifts year-1 self-consumption from 30% to {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).selfConsumption | int }}%. Year-1 savings rise to {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).year1Savings | gbp }} after £150 of maintenance. The net cost is {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).netCost | gbp }} (panels plus battery), and the system pays back in {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).paybackTotalMonths | months }}, against {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} without it. Over 25 years total savings are {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).totalSavings | gbp }}. The battery wins here because the import price is so much higher than the export price."
  - title: "7.5kW system in the US: net metering vs a lower export rate"
    inputs:
      systemCost: 22500
      systemSize: 7.5
      electricityTariff: 18.04
      selfConsumption: 30
      exportTariff: 18.04
      kWhPerKwp: 1375
    description: "A 7.5kW system costing $22,500 generates {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).generationYear1 | int }} kWh in year 1. With net metering, every kWh is worth the 18.04 cent retail rate: year-1 savings are {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).year1Savings | usd }} after $225 of maintenance, and the system pays back in {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }}. If the utility pays only 8 cents for exports, year-1 savings fall to {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=8, selfConsumption=30, maintenance=225, kWhPerKwp=1375).year1Savings | usd }} and payback stretches to {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=8, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }}. The export rate is the figure to check first in the US."
lastUpdated: "2026-11-15"
dataSources:
  - name: "Ofgem: energy price cap, 1 October to 31 December 2026"
    url: "https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-october-and-31-december-2026"
  - name: "Ofgem: Smart Export Guarantee annual report, April 2024 to March 2025"
    url: "https://www.ofgem.gov.uk/transparency-document/smart-export-guarantee-annual-report-april-2024-march-2025"
  - name: "DESNZ: Solar PV cost data"
    url: "https://www.gov.uk/government/statistics/solar-pv-cost-data"
  - name: "HMRC VAT Notice 708/6: energy-saving materials and heating equipment"
    url: "https://www.gov.uk/guidance/vat-on-energy-saving-materials-and-heating-equipment-notice-7086"
  - name: "EIA: Electric Power Monthly, average residential price (table 5.3)"
    url: "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3"
  - name: "Berkeley Lab: U.S. Distributed Solar and Storage Data, 2026 update"
    url: "https://eta-publications.lbl.gov/sites/default/files/2026-08/distributed_solar_storage-2026_data_update_final.pdf"
  - name: "NLR Annual Technology Baseline: residential PV"
    url: "https://atb.nlr.gov/electricity/2024/residential_pv"
  - name: "NLR PVWatts: estimate output for your address"
    url: "https://pvwatts.nlr.gov/"
  - name: "IRS: Residential Clean Energy Credit"
    url: "https://www.irs.gov/credits-deductions/residential-clean-energy-credit"
calculationMethod: "Year-by-year simulation: annual generation (kWp x kWh/kWp x degradation factor), split between self-consumption and export, multiplied by escalating tariff rates, minus maintenance. Payback occurs when cumulative savings equal net system cost."
---

## What solar saves, and what it costs

Solar panels are a long-term investment that pays through a lower electricity bill and income from exported surplus. The payback period is the year when cumulative savings equal what you spent; every year after that is saving.

For a typical 4kW UK system the answer is longer than older guides say. At the Ofgem price cap of 26.32p/kWh (1 October to 31 December 2026), the calculator gives {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} at the default 30% self-consumption, and {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=50, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} at 50%. The panels carry a warranty of around 25 years, so the later years are the profit.

> **What moves the result most:** how much of the output you use yourself. The same UK system saves {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).year1Savings | gbp }} in year 1 at 30% self-consumption and {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=50, maintenance=150, kWhPerKwp=900).year1Savings | gbp }} at 50%.

## How the payback calculation works

The calculator simulates each year of the analysis period:

1. **Annual generation** is system size (kWp) times annual output per kWp, reduced by panel degradation each year.
2. **Self-consumed electricity** saves the full import tariff per kWh.
3. **Exported electricity** earns the export tariff (the Smart Export Guarantee in the UK, net metering in the US).
4. **Annual savings** are self-consumption savings plus export income minus maintenance.
5. **The tariff rises** by the energy price inflation rate each year.
6. **Payback** is the year when cumulative savings first exceed the net system cost. A system that never gets there within the analysis period is reported as such.

## With or without a battery?

A battery stores surplus daytime generation for the evening, which raises self-consumption. Whether that pays depends on the gap between the import and export price.

| Case | Without a battery | With a battery |
|---|---|---|
| UK: 4kW, £7,000; 5kWh battery, £4,500 (26.32p import, 4.5p export) | {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} | {{ solarPayback('uk', battery=true, systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900, batteryCost=4500, batteryCapacity=5).paybackTotalMonths | months }} |
| US: 7.5kW, $22,500; 13.5kWh battery, $15,750 (18.04 cents import and export) | {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }} | {{ solarPayback('us', battery=true, systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375, batteryCost=15750, batteryCapacity=13.5).paybackTotalMonths | months }} |

Batteries make financial sense when:

- the gap between your import and export price is large (the UK example: {{ 26.32 - 4.5 | num(1) }}p per kWh)
- you are on a time-of-use tariff and can charge cheaply and discharge at the peak
- you value backup power during outages

Where exports earn the full retail rate, as under US net metering, a battery adds cost and no savings.

## Key factors

**The electricity price** is the biggest driver. Every self-consumed kWh saves the import price, which was 26.32p/kWh on the UK price cap for 1 October to 31 December 2026 (Ofgem; that price excludes VAT, which is removed from domestic electricity from 1 October 2026 to 31 March 2027) and about 18.04 cents/kWh across US households in the 12 months to August 2026 (EIA).

**Self-consumption** decides how much of that value you collect. Working from home, running appliances in daylight, or adding a battery raises it.

**System cost** is the other half of the ratio. The DESNZ median for UK installations up to 4kW in 2025/26 was about £1,780 per kW, which is where the £7,000 default comes from. The Berkeley Lab 2026 data update puts the median US residential system at about 7.7kW and its cash price at about $3.00 per watt, which gives the $22,500 default for 7.5kW.

**Roof and shading** change generation. South-facing roofs generate the most, and heavy shading can cut output sharply. Use PVWatts for your own roof.

## UK and US compared

| Factor | UK | US |
|---|---|---|
| Calculator default system | 4kW at £7,000 | 7.5kW at $22,500 |
| Output per kWp | 900 kWh a year | 1,375 kWh a year |
| Electricity price | 26.32p/kWh (Ofgem cap, Oct to Dec 2026) | 18.04 cents/kWh (EIA, 12 months to Aug 2026) |
| Export payment | SEG: 4.39p average for untied tariffs (2024/25) | Net metering credits retail rate; newer tariffs pay less |
| Tax treatment | 0% VAT on installation until 31 March 2027, then 5% | 30% federal credit ended for systems placed in service after 31 December 2025 |
| Payback with these defaults | {{ solarPayback('uk', systemCost=7000, systemSize=4, tariff=26.32, exportTariff=4.5, selfConsumption=30, maintenance=150, kWhPerKwp=900).paybackTotalMonths | months }} | {{ solarPayback('us', systemCost=22500, systemSize=7.5, tariff=18.04, exportTariff=18.04, selfConsumption=30, maintenance=225, kWhPerKwp=1375).paybackTotalMonths | months }} |

The UK tariff is higher but the UK gets fewer kWh from each kWp and is paid far less for exports, so the US default pays back sooner. Euro-area visitors start from the EU household average price of 28.79 cents/kWh (Eurostat, first half of 2026) with UK system assumptions; enter your own quote and tariff.

## Using this calculator

- **Compare quotes.** Enter each system's cost and size and compare the payback.
- **Test a battery.** Switch it on and see whether your import-export gap pays for it.
- **Try different tariffs.** Change the import and export prices to model a supplier or a new export tariff.
- **Stress the future.** Change the energy price inflation to see how rising prices affect the return.

Compare the result with the [ROI Calculator](/tools/saving-and-growth/roi/) for a simple percentage return, or the [Investment Return Calculator](/tools/saving-and-growth/investment-return/) to see what the same money would earn invested.
