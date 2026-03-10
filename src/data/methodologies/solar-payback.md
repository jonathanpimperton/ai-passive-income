---
title: "How We Calculate: Solar Panel Payback"
slug: "solar-payback"
toolSlug: "solar-payback"
formula: "Payback Year = first year where Σ(Annual Savings) ≥ Net System Cost"
variables:
  - name: "System Cost"
    description: "Total installation cost of the solar panel system before any incentives"
  - name: "Battery Cost"
    description: "Cost of battery storage system, added to total cost if battery option is selected"
  - name: "Tax Credit / Grant"
    description: "Upfront government incentive subtracted from the gross system cost to give the net cost"
  - name: "System Size (kWp)"
    description: "Rated panel capacity in kilowatts-peak, determining annual generation potential"
  - name: "kWh per kWp"
    description: "Annual energy output per kilowatt-peak installed, depends on location and roof orientation (UK ~900, US ~1,400)"
  - name: "Panel Degradation Rate"
    description: "Annual percentage decline in panel output, typically 0.5% per year"
  - name: "Base Self-Consumption Rate"
    description: "Percentage of generated electricity used directly in the home without a battery, typically 25–35%"
  - name: "Battery Capacity (kWh)"
    description: "Usable storage capacity of the battery system, used to calculate how much surplus generation can be shifted from export to self-consumption"
  - name: "Battery Round-Trip Efficiency"
    description: "Fraction of energy retained after a full charge/discharge cycle, default 0.9 (90%). A 5kWh battery at 90% efficiency delivers 4.5kWh of usable energy per cycle"
  - name: "Electricity Tariff"
    description: "Current price paid per kWh for grid electricity, applied to self-consumed solar generation"
  - name: "Export Tariff"
    description: "Payment received per kWh for electricity exported to the grid (SEG in UK, net metering in US)"
  - name: "Energy Price Inflation"
    description: "Expected annual increase in electricity tariff and export tariff rates"
  - name: "Annual Maintenance Cost"
    description: "Yearly cost of cleaning, inspection, and minor repairs"
assumptions:
  - "Panel output degrades at a constant annual percentage rate (no accelerated first-year degradation)"
  - "Electricity tariff and export tariff both increase at the same energy price inflation rate"
  - "Self-consumption rate remains constant over the analysis period"
  - "Maintenance cost remains constant (not inflation-adjusted)"
  - "No inverter replacement cost is modelled separately (assumed included in maintenance)"
  - "Battery does not degrade over the analysis period (conservative simplification)"
  - "Battery round-trip efficiency is 90% (10% energy loss per charge/discharge cycle)"
  - "Effective self-consumption is capped at 95% — some generation always occurs when no home load exists"
  - "All generated electricity is either self-consumed or exported — no curtailment"
  - "No time-of-use tariff variation — average flat rate applied"
limitations:
  - "Does not model seasonal or monthly variation in solar generation"
  - "Does not account for time-of-use tariffs or variable export rates"
  - "Does not model battery degradation (capacity and efficiency decline over time)"
  - "Roof orientation, pitch angle, and shading are not directly modelled — user must adjust kWh/kWp accordingly"
  - "Does not include inverter replacement cost as a separate event (typical at 12–15 years)"
  - "Electricity tariff inflation may not match general inflation — energy prices are volatile"
  - "Does not account for potential changes to export tariff schemes (SEG rates, net metering policies)"
  - "Maintenance costs are not inflation-adjusted in the model"
dataSources:
  - name: "Ofgem — Energy Price Cap"
    url: "https://www.ofgem.gov.uk/check-if-energy-price-cap-affects-you"
  - name: "NREL — Photovoltaic Degradation Rates"
    url: "https://www.nrel.gov/docs/fy12osti/51664.pdf"
  - name: "EnergySage — Solar Panel Cost Data"
    url: "https://www.energysage.com/local-data/solar-panel-cost/"
  - name: "EIA — US Electricity Prices"
    url: "https://www.eia.gov/electricity/monthly/"
---

## What This Calculator Does

The solar panel payback calculator answers "How long until my solar panels pay for themselves?" by simulating year-by-year energy generation, savings, and cumulative returns over a chosen analysis period (default 25 years).

Unlike simple payback calculators that divide cost by annual savings, this model accounts for panel degradation, rising energy prices, and the difference between self-consumed and exported electricity — all of which significantly affect the real payback period.

## How the Year-by-Year Simulation Works

For each year from 1 to the analysis period:

1. **Calculate annual generation**: System Size × kWh/kWp × (1 − degradation rate)^(year−1)
2. **Calculate effective self-consumption** (if battery is present):
   - Daily generation = Annual generation ÷ 365
   - Daily surplus = Daily generation × (1 − Base Self-Consumption Rate)
   - Battery capture = min(Daily surplus, Battery Capacity × Round-Trip Efficiency)
   - Effective Self-Consumption = Base Self-Consumption Rate + (Battery capture ÷ Daily generation), capped at 95%
   - Without a battery, effective self-consumption equals the base rate
3. **Split into self-consumed and exported**: Generation × effective self-consumption rate = self-consumed kWh; the remainder is exported
4. **Apply tariff rates**: Self-consumed kWh × current electricity tariff (saves buying from grid); Exported kWh × current export tariff (earns income)
5. **Escalate tariffs**: Both tariffs increase by the energy price inflation rate each year
6. **Subtract maintenance**: Annual savings = self-consumption savings + export income − maintenance cost
7. **Accumulate**: Add annual savings to the running cumulative total
8. **Check payback**: When cumulative savings first exceed the net system cost, payback is reached

The payback month is interpolated: if the crossover happens partway through a year, the calculator estimates which month within that year the break-even occurred.

## How Each Variable Affects the Result

**Electricity tariff** is the most impactful variable. Every 1p/kWh increase in tariff improves annual savings by roughly £10–£40 depending on system size and self-consumption. UK rates (24.5p/kWh) make solar significantly more attractive than low-cost US states.

**Self-consumption rate** determines the value of each kWh. At 24.5p import vs 4.5p export, a self-consumed kWh is worth 5.4× more than an exported one. A 5kWh battery with a 30% base self-consumption rate raises effective self-consumption to ~76%, nearly doubling annual savings compared to no battery.

**System cost** is the denominator of the payback equation. Lower installation costs shorten payback proportionally. Battery costs add to the numerator but improve the self-consumption rate.

**Energy price inflation** has a compounding effect. At 3% annual inflation, a 24.5p tariff becomes 33.5p after 10 years and 45.8p after 20 years. Higher inflation makes solar increasingly attractive over time.

**Panel degradation** reduces generation by ~12% over 25 years at the standard 0.5% rate. This means year-25 savings are lower than year-1, but the effect is partially offset by rising tariff rates.

## Net System Cost Calculation

The net cost is straightforward:

**Net System Cost** = Panel Installation Cost + Battery Cost (if selected) − Tax Credit or Grant

This is the break-even target for cumulative savings. In the UK, solar panels are currently VAT-free (0% until March 2027), which is already reflected in quoted installation prices. The tax credit field is for any additional grants or incentives.
