---
title: "How We Calculate: Solar Panel Payback"
slug: "solar-payback"
toolSlug: "solar-payback"
formula: "Payback Year = first year where Σ(Annual Savings) ≥ Net System Cost, with Annual Savings = Self-consumed kWh × Tariff + Exported kWh × Export Tariff − Maintenance"
variables:
  - name: "System Cost"
    description: "Total installation cost of the solar panel system before any incentives"
  - name: "Battery Cost"
    description: "Cost of the battery storage system, added to the total cost if the battery option is selected"
  - name: "Grant or Tax Credit"
    description: "Upfront incentive subtracted from the gross cost to give the net cost. Default 0: the US 25D residential credit does not apply to systems placed in service after 31 December 2025"
  - name: "System Size (kWp)"
    description: "Rated panel capacity in kilowatts-peak, which sets annual generation"
  - name: "kWh per kWp"
    description: "Annual energy output per kWp installed. It depends on location and roof orientation. Default 900 for the UK and euro area, 1,375 for the US"
  - name: "Panel Degradation Rate"
    description: "Annual decline in panel output, default 0.5% a year"
  - name: "Base Self-Consumption Rate"
    description: "Share of generated electricity used in the home without a battery, default 30%"
  - name: "Battery Capacity (kWh)"
    description: "Usable storage capacity, used to work out how much surplus generation moves from export to self-consumption"
  - name: "Battery Round-Trip Efficiency"
    description: "Fixed at 0.9 (90%). A 5 kWh battery delivers 4.5 kWh of usable energy per day"
  - name: "Electricity Tariff"
    description: "Price paid per kWh for grid electricity, applied to self-consumed solar generation"
  - name: "Export Tariff"
    description: "Payment per kWh exported to the grid (Smart Export Guarantee in the UK, net metering in the US)"
  - name: "Energy Price Inflation"
    description: "Annual rise in both tariffs, default 3%"
  - name: "Annual Maintenance Cost"
    description: "Yearly cost of cleaning, inspection and repairs"
  - name: "Analysis Period"
    description: "Years simulated, default 25"
assumptions:
  - "Panel output falls at a constant annual percentage (no extra first-year loss)"
  - "The electricity tariff and the export tariff both rise at the same energy price inflation rate"
  - "The base self-consumption rate stays constant"
  - "Maintenance cost stays constant (it is not inflated), and inverter replacement is assumed to be inside it"
  - "The battery does not degrade over the period (a simplification in the buyer's favour)"
  - "Battery round-trip efficiency is 90%, and the battery cycles once a day"
  - "Effective self-consumption is capped at 95%, because some generation always happens when the house is not using power"
  - "All generation is either self-consumed or exported, with no curtailment"
  - "A flat average tariff applies, with no time-of-use pricing"
  - "The regional defaults below are starting points taken from the sources listed. Replace them with your quote and your tariff"
limitations:
  - "Does not model seasonal or monthly variation in generation"
  - "Does not model time-of-use tariffs or variable export rates"
  - "Does not model battery degradation (capacity and efficiency fall over time)"
  - "Roof orientation, pitch and shading are not modelled: adjust kWh per kWp to reflect them"
  - "Does not include inverter replacement as a separate cost (typically needed at 12 to 15 years)"
  - "Energy price inflation may not match general inflation, and energy prices are volatile"
  - "Does not allow for changes to export schemes (Smart Export Guarantee rates, net metering rules)"
  - "Maintenance costs are not inflation-adjusted"
  - "The ROI shown is the saving over the whole analysis period relative to the net cost, not a yearly rate, and it is not shown when the net cost is zero or less"
dataSources:
  - name: "Ofgem: Changes to the energy price cap, 1 October to 31 December 2026"
    url: "https://www.ofgem.gov.uk/news/changes-energy-price-cap-between-1-october-and-31-december-2026"
  - name: "Ofgem: Smart Export Guarantee annual report, April 2024 to March 2025"
    url: "https://www.ofgem.gov.uk/transparency-document/smart-export-guarantee-annual-report-april-2024-march-2025"
  - name: "DESNZ: Solar PV cost data"
    url: "https://www.gov.uk/government/statistics/solar-pv-cost-data"
  - name: "DESNZ: Digest of UK Energy Statistics, chapter 6 (renewable sources)"
    url: "https://www.gov.uk/government/statistics/renewable-sources-of-energy-chapter-6-digest-of-united-kingdom-energy-statistics-dukes"
  - name: "GOV.UK: VAT on energy-saving materials and heating equipment (Notice 708/6)"
    url: "https://www.gov.uk/guidance/vat-on-energy-saving-materials-and-heating-equipment-notice-7086"
  - name: "NREL: Photovoltaic Degradation Rates, an analytical review"
    url: "https://docs.nlr.gov/docs/fy12osti/51664.pdf"
  - name: "EIA: Electric Power Monthly, table 5.3 (US residential average price)"
    url: "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3"
  - name: "Berkeley Lab: U.S. Distributed Solar and Storage Data, 2026 Update"
    url: "https://eta-publications.lbl.gov/sites/default/files/2026-08/distributed_solar_storage-2026_data_update_final.pdf"
  - name: "NREL Annual Technology Baseline: Residential PV"
    url: "https://atb.nlr.gov/electricity/2024/residential_pv"
  - name: "IRS: Residential Clean Energy Credit"
    url: "https://www.irs.gov/credits-deductions/residential-clean-energy-credit"
  - name: "Eurostat: Electricity prices for household consumers (nrg_pc_204)"
    url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table"
---

## What This Calculator Does

The solar panel payback calculator answers "How long until my panels pay for themselves?" by simulating generation, savings and cumulative return year by year over an analysis period (25 years by default).

Unlike a simple calculator that divides cost by one year's savings, this model allows for panel degradation, rising energy prices, and the difference between electricity you use and electricity you export. All three change the payback period a lot.

## How the Year-by-Year Simulation Works

For each year from 1 to the analysis period:

1. **Annual generation** = System Size × kWh per kWp × (1 − degradation)^(year − 1)
2. **Effective self-consumption** (with a battery):
   - Daily generation = annual generation ÷ 365
   - Daily surplus = daily generation × (1 − base self-consumption rate)
   - Battery capture = the smaller of the daily surplus and (battery capacity × round-trip efficiency)
   - Effective self-consumption = base rate + battery capture ÷ daily generation, capped at 95%
   - Without a battery it is just the base rate. This is recalculated every year on that year's output, because degraded panels leave a smaller surplus. The percentage shown for year 1 is rounded for display only.
3. **Split the generation:** generation × effective self-consumption = self-consumed kWh. The rest is exported.
4. **Value it:** self-consumed kWh × the electricity tariff (the grid power you do not buy), plus exported kWh × the export tariff.
5. **Raise both tariffs** by the energy price inflation rate for the next year.
6. **Subtract maintenance:** annual savings = self-consumption savings + export income − maintenance.
7. **Accumulate** the annual savings into a running total.
8. **Check payback:** the first year in which the running total reaches the net system cost.

The payback month is interpolated: if the crossover happens part-way through a year, the calculator works out the month from the share of that year's savings still needed, to the nearest whole month.

Net system cost = installation cost + battery cost (if selected) − grant or credit. If the grant covers the whole cost (net cost zero or less), the calculator says there is nothing to pay back and shows no ROI. If annual savings are never positive because maintenance costs more than the panels save, it says the system never pays back.

## Regional Defaults (USD, GBP, EUR)

The currency selector sets starting values for inputs you have not changed. Each is a published or modelled starting point, checked on 12 November 2026, and you should replace it with your own quote.

- **UK (GBP):** a 4 kWp system costing £7,000 (DESNZ 2025/26 median of about £1,780 per kW for systems up to 4 kW), a 5 kWh battery at £4,500 (an assumption), an electricity tariff of 26.32p per kWh (the Ofgem price cap for 1 October to 31 December 2026, Direct Debit average, with no VAT on electricity from 1 October 2026 to 31 March 2027), an export tariff of 4.5p (Ofgem's Smart Export Guarantee report: untied tariffs averaged 4.39p in April 2024 to March 2025), 900 kWh per kWp (DUKES load factors give 806 to 972 kWh per kW), and £150 a year of maintenance (an assumption).
- **US (USD):** a 7.5 kWp system costing $22,500 and a 13.5 kWh battery costing $15,750 (Berkeley Lab's 2026 update: median residential system 7.7 kW and 13.5 kWh storage, with cash prices of about $3.0 per watt and $2.1 per watt more for paired storage), an electricity tariff of 18.04 cents per kWh (EIA residential average, 12 months to August 2026), an export tariff equal to it because net metering credits exports at the retail rate (successor tariffs often pay less), 1,375 kWh per kWp (NREL ATB capacity factor of 15.7%), and $225 a year of maintenance (NREL ATB fixed O&M of $30 per kW-year). The federal 25D residential credit is not available for systems placed in service after 31 December 2025, so the grant starts at $0.
- **EUR:** only the electricity price is a euro-area figure (28.79 cents per kWh, the Eurostat EU-27 household average for the first half of 2026, all taxes included). The system cost, size, yield, export rate and battery use the UK physical assumptions, so enter your own.

In the UK, installation of solar panels is currently zero-rated for VAT, and the rate rises to 5% from 1 April 2027 (GOV.UK VAT Notice 708/6). The calculator's cost field says so. Quotes after that date will include the VAT.

## How Each Variable Affects the Result

The figures in this section come from the UK defaults (4 kWp, 900 kWh per kWp, 30% self-consumption, 26.32p tariff, 4.5p export, 3% inflation, 25 years, no battery).

**Electricity tariff** is the most influential input. Each extra 1p per kWh of import tariff adds {{ 3600 * 30 / 100 * 1 / 100 | gbp(2) }} to year-1 savings (1,080 self-consumed kWh × 1p). A larger system self-consumes more kWh, so the same 1p adds more.

**Self-consumption rate** sets the value of each kWh. At 26.32p import and 4.5p export, a self-consumed kWh is worth {{ 26.32 / 4.5 | num(1) }} times an exported one. A 5 kWh battery lifts a 30% base self-consumption rate to 76% in year 1 on the UK defaults. With the battery included, the UK example pays back in 15 years and 0 months against 19 years and 8 months without it, and 25-year savings rise from £9,807 to £22,873.

**Net metering and batteries (US):** under net metering at the full retail rate an exported kWh is worth the same as a self-consumed one, so a battery adds cost and no savings. At the US defaults the battery version takes 18 years 3 months to pay back against 11 years 10 months without it.

**System cost** is the number the savings have to repay. Lower installed cost shortens payback in proportion. A battery adds to the cost, and improves savings only where the import tariff is well above the export tariff.

**Energy price inflation** compounds. At 3% a year, a 26.32p tariff becomes {{ inflationAdjust(26.32, 3, 10) | num(1) }}p after 10 years and {{ inflationAdjust(26.32, 3, 20) | num(1) }}p after 20. Higher inflation makes solar more attractive over time.

**Panel degradation** reduces generation over the period. At the standard 0.5% a year, year-25 output is 3,192 kWh on the UK defaults against 3,600 kWh in year 1, about 11% lower. Rising tariffs partly offset that, so year-25 savings (£567) are still higher than year-1 savings (£248) in the UK example.

## Worked Example (UK defaults, no battery)

A 4 kWp system costing £7,000, with the defaults above, generates 3,600 kWh in year 1. Year-1 savings are £248, the net cost is £7,000, and the system pays for itself in 19 years 8 months. Over 25 years it saves £9,807 in total, a return of 40.1% on the £7,000 cost. These results depend entirely on the inputs: a lower quote, a higher self-consumption rate or a battery with the right tariff will shorten the payback.
