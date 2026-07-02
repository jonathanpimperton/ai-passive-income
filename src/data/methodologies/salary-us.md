---
title: "How We Calculate: US Salary (Take-Home Pay)"
slug: "salary-us"
toolSlug: "salary-us"
formula: "Take-Home = Gross Income - Federal Income Tax - Social Security Tax - Medicare Tax - State Tax - 401(k) Contribution"
variables:
  - name: "Gross Income"
    description: "Annual salary (or hourly rate converted to annual), including overtime if applicable"
  - name: "Federal Income Tax"
    description: "Progressive tax on income after standard deduction, using IRS marginal brackets"
  - name: "Social Security (OASDI)"
    description: "6.2% of gross income up to the 2026 wage base limit ($184,500)"
  - name: "Medicare"
    description: "1.45% of all gross income, plus an additional 0.9% on income above $200,000 (single) or $250,000 (married)"
  - name: "State Tax"
    description: "Flat percentage entered by the user (varies by state, 0-13.3%)"
  - name: "401(k)"
    description: "Pre-tax retirement contribution as a percentage of gross income, capped at the IRS limit ($24,500 for 2026)"
  - name: "Filing Status"
    description: "Single, Married Filing Jointly, or Head of Household — determines bracket thresholds and standard deduction"
assumptions:
  - "Uses 2026 federal tax brackets and standard deductions"
  - "The standard deduction is applied (not itemized deductions)"
  - "State tax is a flat percentage — does not model individual state bracket systems"
  - "401(k) contributions reduce federal and state taxable income but NOT FICA (Social Security and Medicare)"
  - "Overtime is paid at 1.5× the regular hourly rate"
  - "No local/city income taxes"
  - "No additional income beyond salary/wages"
  - "No tax credits (child tax credit, earned income credit, etc.)"
limitations:
  - "State tax is modeled as a flat rate, not state-specific brackets (states like California and New York have progressive brackets)"
  - "Does not include local income taxes (New York City, many Ohio cities, etc.)"
  - "Does not model the Earned Income Tax Credit, Child Tax Credit, or other credits"
  - "Does not handle itemized deductions (mortgage interest, state/local tax deduction, charitable giving)"
  - "Does not model HSA or FSA pre-tax contributions"
  - "Does not calculate employer-side payroll taxes"
  - "Does not handle the Additional Medicare Tax threshold differences between filing statuses with precision (uses simplified thresholds)"
  - "401(k) catch-up contributions for age 50+ ($8,000 additional) are not modeled"
dataSources:
  - name: "IRS — Tax Brackets and Rates"
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill"
  - name: "Social Security Administration — FICA and SECA Tax Rates"
    url: "https://www.ssa.gov/oact/ProgData/taxRates.html"
  - name: "IRS — 401(k) Contribution Limits"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits"
---

## What This Calculator Does

The US salary calculator converts your gross annual income (or hourly rate) into net take-home pay by applying federal income tax, FICA taxes (Social Security and Medicare), a user-specified state tax rate, and optional pre-tax 401(k) contributions.

## Federal Income Tax (2026)

Federal income tax uses progressive marginal brackets. Each bracket applies only to income within that range, not to your entire income. The standard deduction is subtracted from gross income before applying brackets.

**Standard Deductions (2026):**
- Single: $16,100
- Married Filing Jointly: $32,200
- Head of Household: $24,150

**Single Filer Brackets (2026):**

| Taxable Income | Marginal Rate |
|---------------|---------------|
| $0 - $12,400 | 10% |
| $12,401 - $50,400 | 12% |
| $50,401 - $105,700 | 22% |
| $105,701 - $201,775 | 24% |
| $201,776 - $256,225 | 32% |
| $256,226 - $640,600 | 35% |
| Over $640,600 | 37% |

A single filer earning $75,000 has a taxable income of $58,900 ($75,000 minus $16,100 standard deduction). They pay 10% on the first $12,400, 12% on $12,401-$50,400, and 22% on $50,401-$58,900. The total federal tax is approximately $7,670 — an effective rate of about 10.2%.

## FICA Taxes

FICA (Federal Insurance Contributions Act) taxes fund Social Security and Medicare. Unlike income tax, FICA has no standard deduction — it's calculated on gross income.

**Social Security:** 6.2% on the first $184,500 of wages (2026 wage base). Income above this cap is exempt. Maximum Social Security tax: $11,439.

**Medicare:** 1.45% on all wages, with no cap. An additional 0.9% applies to wages above $200,000 for single filers ($250,000 for married filing jointly). This Additional Medicare Tax was introduced by the Affordable Care Act.

Total FICA for most workers is 7.65% of gross income (6.2% + 1.45%). Your employer pays an additional 7.65% on your behalf.

## 401(k) Pre-Tax Contributions

401(k) contributions reduce federal and state taxable income but do not reduce FICA wages. The IRS contribution limit for 2026 is $24,500 (under age 50). The calculator caps contributions at this limit.

A 10% 401(k) contribution on a $75,000 salary saves approximately $1,650 in federal tax (at the 22% marginal rate) while reducing take-home pay by $5,850 — effectively getting $7,500 into your retirement account at a cost of $5,850 in take-home pay.

## State Tax

State income tax varies from 0% (Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, Wyoming) to 13.3% (California's top bracket). The calculator uses a flat rate for simplicity. For states with progressive brackets, use your effective rate (total state tax divided by gross income) for the most accurate result.

## Hourly Mode and Overtime

When using hourly mode, the calculator converts to annual income:
- **Regular hours:** hourly rate × hours per week × weeks per year
- **Overtime hours:** hourly rate × 1.5 × overtime hours × weeks per year

This reflects the Fair Labor Standards Act requirement for time-and-a-half overtime pay for non-exempt employees.

## Common Misconceptions

The most widespread misconception about US taxes is that "moving into a higher tax bracket" means all your income is taxed at the higher rate. This is false. Only the income within each bracket is taxed at that bracket's rate. Earning $1 more than a bracket threshold never results in a net loss.

Another common mistake is conflating marginal and effective tax rates. Someone in the "22% bracket" likely has an effective federal rate closer to 11-14%. The marginal rate only applies to the next dollar earned.

## Why This Calculator Exists

US tax calculations involve multiple overlapping systems (federal income tax, Social Security, Medicare, state tax) with different rules for each. This calculator combines them into a single view showing annual, monthly, biweekly, weekly, and hourly take-home figures — making it practical for budgeting, job comparison, and retirement planning.
