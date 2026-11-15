---
title: "£30k With Plan 2: {{ ukTakeHome(30000, plan=plan2) | gbp }} a Year, {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a Month"
slug: "30k-salary-uk-student-loan"
description: "£30,000 with a Plan 2 student loan is {{ ukTakeHome(30000, plan=plan2) | gbp }} a year, {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a month after tax, NI and the loan ({{ taxYear('uk') }}). How much goes to the loan and why."
keywords: ["30k salary student loan", "plan 2 student loan repayment", "30000 salary take home uk", "student loan threshold 2026"]
toolSlug: "salary-uk"
toolCategory: "income-and-planning"
inputs:
  Annual Salary: "£30,000"
  Tax Code: "1257L"
  Student Loan: "Plan 2"
  Tax Year: "{{ taxYear('uk') }}"
resultSummary: "{{ ukTakeHome(30000, plan=plan2) | gbp }} a year, {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a month"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## You take home {{ ukTakeHome(30000, plan=plan2) | gbp }} a year — {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a month

**On a £30,000 salary with a Plan 2 student loan, your take-home pay is {{ ukTakeHome(30000, plan=plan2) | gbp }} a year, or {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a month, after income tax, National Insurance, and loan repayments.** Without the student loan, you would take home {{ ukTakeHome(30000) | gbp }} — the loan costs you {{ ukStudentLoan(30000, plan=plan2) | gbp }} per year or about {{ ukStudentLoan(30000, plan=plan2) / 12 | gbp }} per month.

## Full deduction breakdown

**Income tax: {{ ukIncomeTax(30000) | gbp }}**
- Personal allowance: {{ ukPay(30000).personalAllowance | gbp }}
- Taxable income: £30,000 − {{ ukPay(30000).personalAllowance | gbp }} = {{ 30000 - ukPay(30000).personalAllowance | gbp }}
- Tax at {{ ukFact('basicRate') | pct }}: {{ ukIncomeTax(30000) | gbp }}

**National Insurance: {{ ukNi(30000) | gbp }}**
- NI-liable: {{ 30000 - ukFact('niPrimaryThreshold') | gbp }} at {{ ukFact('niMainRate') | pct }} = {{ ukNi(30000) | gbp }}

**Student loan (Plan 2): {{ ukStudentLoan(30000, plan=plan2) | gbp }}**
- Repayment threshold: {{ ukFact('plan2Threshold') | gbp }} per year
- Repayable income: £30,000 − {{ ukFact('plan2Threshold') | gbp }} = {{ 30000 - ukFact('plan2Threshold') | gbp }}
- Repayment at {{ ukFact('studentLoanRate') | pct }}: {{ 30000 - ukFact('plan2Threshold') | gbp }} × {{ ukFact('studentLoanRate') / 100 | num(2) }} = {{ ukStudentLoan(30000, plan=plan2) | gbp(2) }}

**Total deductions: {{ 30000 - ukTakeHome(30000, plan=plan2) | gbp }}**
**Take-home: {{ ukTakeHome(30000, plan=plan2) | gbp }} a year, {{ ukTakeHome(30000, plan=plan2) / 12 | gbp }} a month** (rounding applies)

## How Plan 2 repayments actually work

Student loan repayments in the UK are not like a standard debt where you choose how much to pay. The rules are fixed:

- **Threshold:** You only repay when earning above {{ ukFact('plan2Threshold') | gbp }} per year ({{ taxYear('uk') }} rate)
- **Rate:** {{ ukFact('studentLoanRate') | pct }} of everything above the threshold
- **Collection:** Deducted automatically through PAYE, like tax
- **Write-off:** Any remaining balance is wiped 30 years after the April you were first due to repay (per [GOV.UK](https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled))

At £30,000, you are only {{ 30000 - ukFact('plan2Threshold') | gbp }} above the threshold, so repayments are minimal. Your employer deducts about {{ ukStudentLoan(30000, plan=plan2) / 12 | gbp }} per month. If your salary drops below {{ ukFact('plan2Threshold') | gbp }}, repayments stop automatically.

## What this means for your actual debt

{{ ukStudentLoan(30000, plan=plan2) | gbp }} per year in repayments barely touches the interest being added to most Plan 2 balances. Plan 2 interest depends on your income: on GOV.UK on 15 November 2026 it was 4.1% at {{ ukFact('plan2Threshold') | gbp }} or less, rising to 6% at £52,885 or more ([GOV.UK, what you pay](https://www.gov.uk/repaying-your-student-loan/what-you-pay)). At £30,000 you are just over the threshold, so the rate is close to the 4.1% floor.

If you owe £40,000, interest at 4.1% adds {{ 40000 * 4.1 / 100 | gbp }} a year, so a {{ ukStudentLoan(30000, plan=plan2) | gbp }} repayment means the balance is growing. This is normal and by design — the system functions more like a graduate tax than a traditional loan. Whether your balance is repaid or written off depends on what you earn over the 30 years.

Whether to make voluntary overpayments depends on your balance and expected career earnings. If you expect to earn well above £50,000 for most of your career, you will likely repay in full and overpaying saves interest. If your career trajectory is more modest, the write-off will clear the remaining balance and overpayments would be money wasted.

## Salary milestones and repayment amounts

- **{{ ukFact('plan2Threshold') | gbp }} or below:** No repayment
- **£30,000:** {{ ukStudentLoan(30000, plan=plan2) | gbp }}/year ({{ ukStudentLoan(30000, plan=plan2) / 12 | gbp }}/month)
- **£35,000:** {{ ukStudentLoan(35000, plan=plan2) | gbp }}/year ({{ ukStudentLoan(35000, plan=plan2) / 12 | gbp }}/month)
- **£40,000:** {{ ukStudentLoan(40000, plan=plan2) | gbp }}/year ({{ ukStudentLoan(40000, plan=plan2) / 12 | gbp }}/month)
- **£50,000:** {{ ukStudentLoan(50000, plan=plan2) | gbp }}/year ({{ ukStudentLoan(50000, plan=plan2) / 12 | gbp }}/month)

Each £1,000 pay rise above the threshold adds {{ 1000 * ukFact('studentLoanRate') / 100 | gbp }}/year ({{ 1000 * ukFact('studentLoanRate') / 100 / 12 | gbp(2) }}/month) in student loan repayments on top of the {{ ukMarginalRate(30000) | pct }} income tax and NI you already pay. The effective marginal rate for someone with a Plan 2 loan earning between {{ ukFact('plan2Threshold') | gbp }} and {{ ukFact('higherRateThreshold') | gbp }} is {{ ukMarginalRate(30000, plan=plan2) | pct }} ({{ ukFact('basicRate') | pct }} tax + {{ ukFact('niMainRate') | pct }} NI + {{ ukFact('studentLoanRate') | pct }} student loan).

## Nearby salaries

At £25,000 you would be below the {{ ukFact('plan2Threshold') | gbp }} Plan 2 threshold entirely — no repayment at all, and take-home of {{ ukTakeHome(25000, plan=plan2) | gbp }} a year ({{ ukTakeHome(25000, plan=plan2) / 12 | gbp }} a month) after just tax and NI ([£25,000 row](/scenarios/uk-take-home-pay/#25k) of the UK take-home table). At £35,000 the deduction starts to register: you keep {{ ukTakeHome(35000) | gbp }} a year ({{ ukTakeHome(35000) / 12 | gbp }} a month) before the loan ([£35,000 row](/scenarios/uk-take-home-pay/#35k)), and Plan 2 takes another {{ ukStudentLoan(35000, plan=plan2) | gbp }} a year. The pattern is worth knowing when weighing a pay rise: below the threshold each extra pound loses {{ ukMarginalRate(25000) | pct }} to tax and NI, and every pound above it carries the full {{ ukMarginalRate(30000, plan=plan2) | pct }} marginal rate.

Every salary from £20,000 to £150,000, plus a student loan table showing Plan 2 and Plan 5 side by side, is in the [UK take-home pay reference](/scenarios/uk-take-home-pay/#30k) (the £30,000 row is the one before the loan). For the newest plan, see [Plan 5 student loans explained](/scenarios/plan-5-student-loans-explained/).

## Plan 1 vs Plan 2 comparison

If you started university before September 2012, you are on Plan 1, which has a lower threshold of {{ ukFact('plan1Threshold') | gbp }} but the same {{ ukFact('studentLoanRate') | pct }} rate. On £30,000, Plan 1 repayments would be {{ ukStudentLoan(30000, plan=plan1) | gbp }}/year — about {{ ukStudentLoan(30000, plan=plan1) / ukStudentLoan(30000, plan=plan2) | num }} times the Plan 2 amount because of the lower threshold. Plan 5 covers courses in England that started from 1 August 2023 (Welsh students are on Plan 2, Scottish students on Plan 4). Repayments begin the April after you leave your course, so someone who started a three-year degree in autumn 2023 makes their first repayment in April 2027. The Plan 5 threshold is {{ ukFact('plan5Threshold') | gbp }}, so on £30,000 you would repay {{ ukStudentLoan(30000, plan=plan5) | gbp }}/year.

Use the [UK Salary Calculator](/tools/income-and-planning/salary-uk/) to see your exact take-home with any student loan plan, pension contributions, or tax code.
