---
title: "How We Calculate: UK Salary (Take-Home Pay)"
slug: "salary-uk"
toolSlug: "salary-uk"
formula: "Take-Home = Gross Salary - Income Tax - National Insurance - Student Loan - Pension Contribution"
variables:
  - name: "Gross Salary"
    description: "Annual salary before any deductions"
  - name: "Personal Allowance"
    description: "Tax-free income threshold (£12,570 for 2025/26), tapered by £1 for every £2 earned above £100,000, fully removed at £125,140"
  - name: "Income Tax"
    description: "Calculated on taxable income (gross minus personal allowance) through progressive bands"
  - name: "National Insurance"
    description: "Employee Class 1 contributions: 8% on earnings between £12,570 and £50,270, then 2% above £50,270"
  - name: "Student Loan"
    description: "9% of income above the plan-specific threshold (6% for postgraduate loans)"
  - name: "Pension"
    description: "Employee contribution as a percentage of gross salary — can be salary sacrifice (pre-tax) or after-tax"
assumptions:
  - "Uses 2025/26 tax year rates and thresholds"
  - "Standard tax code 1257L unless a custom tax code is entered"
  - "Employee is aged under State Pension age (NI Class 1 applies)"
  - "Pension contributions are either salary sacrifice (reduces taxable income and NI-able earnings) or personal (post-tax, no NI reduction)"
  - "Only one student loan plan is active at a time"
  - "Scottish income tax bands apply when the Scottish resident toggle is selected"
  - "No additional income sources (dividends, rental income, savings interest)"
limitations:
  - "Does not model employer NI contributions (15% above £5,000 for 2025/26)"
  - "Does not include tax on benefits in kind (company car, private medical, etc.)"
  - "Does not model Marriage Allowance transfer (10% of PA transferable between spouses)"
  - "Does not handle multiple concurrent student loan plans"
  - "Does not calculate tax relief on pension contributions above the annual allowance (£60,000)"
  - "Does not model Child Benefit High Income Charge (clawback above £60,000)"
  - "Does not include the dividend allowance (£500 for 2025/26) or savings interest allowance"
  - "Tax code parsing handles common codes (numeric+L, K codes, BR, D0, D1, NT) but not all HMRC codes"
dataSources:
  - name: "GOV.UK — Income Tax Rates and Bands"
    url: "https://www.gov.uk/income-tax-rates"
  - name: "GOV.UK — National Insurance Rates"
    url: "https://www.gov.uk/national-insurance-rates-letters"
  - name: "GOV.UK — Student Loan Repayment"
    url: "https://www.gov.uk/repaying-your-student-loan/what-you-pay"
  - name: "Scottish Government — Scottish Income Tax 2025-2026"
    url: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/"
---

## What This Calculator Does

The UK salary calculator converts your gross annual salary into take-home pay by applying HMRC's income tax bands, National Insurance contributions, student loan repayments, and pension contributions — all using verified 2025/26 tax year rates.

The calculation follows the same logic HMRC uses: start with gross income, determine the Personal Allowance, calculate tax on the taxable portion through progressive bands, add NI contributions, subtract student loan repayments if applicable, and deduct pension contributions.

## Income Tax (2025/26)

Income tax is applied to taxable income (gross salary minus Personal Allowance) through progressive bands:

| Band | Taxable Income | Rate |
|------|---------------|------|
| Personal Allowance | First £12,570 | 0% |
| Basic Rate | £12,571 to £50,270 | 20% |
| Higher Rate | £50,271 to £125,140 | 40% |
| Additional Rate | Over £125,140 | 45% |

**Personal Allowance Taper:** For income above £100,000, the Personal Allowance is reduced by £1 for every £2 earned. This creates an effective marginal rate of 60% between £100,000 and £125,140 — you lose £1 of allowance (worth 40p in tax) for every £2 earned, on top of the 40% rate.

**Scottish Residents:** Scotland has its own six-band income tax system with rates from 19% (Starter) to 48% (Top). Toggle the Scottish resident option to apply these bands instead.

## National Insurance (Employee Class 1)

NI is calculated on earnings, not taxable income (pension relief does not reduce NI unless using salary sacrifice):

- **Primary Threshold to Upper Earnings Limit (£12,570 to £50,270):** 8%
- **Above Upper Earnings Limit (over £50,270):** 2%

Earnings below £12,570 incur no NI.

## Student Loan Repayments

Repayments are 9% of income above the plan-specific threshold (6% for postgraduate loans):

| Plan | Threshold (2025/26) | Rate |
|------|---------------------|------|
| Plan 1 (pre-2012 England/Wales) | £26,065 | 9% |
| Plan 2 (post-2012 England/Wales) | £28,470 | 9% |
| Plan 4 (Scotland) | £32,745 | 9% |
| Plan 5 (from 2023) | £25,000 | 9% |
| Postgraduate Loan | £21,000 | 6% |

## Pension Contributions

Two modes are available:

**Salary Sacrifice:** The pension contribution is deducted before tax and NI are calculated. This saves both income tax and NI. A 5% salary sacrifice contribution on a £40,000 salary reduces both tax and NI liability.

**Personal Contribution:** Deducted from net pay. Your pension provider claims basic rate tax relief (20%) from HMRC automatically. Higher rate taxpayers must claim the additional relief through self-assessment.

## Tax Code Parsing

The calculator recognizes common HMRC tax codes:

- **1257L** (standard): Uses normal Personal Allowance calculation
- **BR/D0/D1**: Flat-rate codes — all income taxed at basic/higher/additional rate
- **NT**: No tax
- **K codes** (e.g., K475): Negative allowance — adds to taxable income (used when benefits in kind exceed your allowance)
- **S prefix**: Scottish bands apply
- **C prefix**: Welsh rates apply (currently identical to England)

## Common Misconceptions

The 60% effective rate between £100,000 and £125,140 surprises many people. It is not a separate tax band — it's the combined effect of the 40% rate plus the Personal Allowance taper. Pension contributions that reduce income below £100,000 can be highly tax-efficient for this reason.

Another misconception: "salary sacrifice costs me money." For most employees, salary sacrifice pension contributions are strictly better than personal contributions because they save NI (8% or 2%) on top of income tax. The trade-off is a slightly lower gross salary for mortgage and loan applications.

## Why This Calculator Exists

HMRC's own online tools are basic and don't handle Scottish tax, custom tax codes, or salary sacrifice pensions in a single interface. This calculator combines all of these into one tool with instant results, showing annual, monthly, weekly, and daily take-home figures.
