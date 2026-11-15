---
title: "Plan 5 Student Loan: {{ ukFact('studentLoanRate') | pct }} Over {{ ukFact('plan5Threshold') | gbp }} a Year"
slug: "plan-5-student-loans-explained"
description: "Plan 5 student loans: {{ ukFact('studentLoanRate') | pct }} of income over {{ ukFact('plan5Threshold') | gbp }}, written off after 40 years. Exact repayments at £30K to £50K, compared with Plan 2 ({{ taxYear('uk') }})."
keywords: ["plan 5 student loan", "plan 5 student loan threshold", "plan 5 repayments", "plan 5 vs plan 2", "student loan plan 5 explained", "how much do i repay plan 5", "when do plan 5 repayments start"]
toolSlug: "salary-uk"
toolCategory: "income-and-planning"
inputs:
  Annual Salary: "£40,000"
  Student Loan: "Plan 5"
  Tax Year: "{{ taxYear('uk') }}"
resultSummary: "{{ ukStudentLoan(40000, plan=plan5) / 12 | gbp(2) }} a month, {{ ukStudentLoan(40000, plan=plan5) | gbp }} a year, repaid on £40,000"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "What is the Plan 5 student loan threshold?"
    answer: "{{ ukFact('plan5Threshold') | gbp }} a year for {{ taxYear('uk') }}. You repay {{ ukFact('studentLoanRate') | pct }} of everything you earn above it, deducted automatically through PAYE. Below {{ ukFact('plan5Threshold') | gbp }}, you repay nothing."
  - question: "When do Plan 5 repayments start?"
    answer: "The April after you leave your course, per GOV.UK. Plan 5 covers students in England who started courses from August 2023, so someone who began a three-year degree in autumn 2023 and finished in summer 2026 makes their first repayment in April 2027. On a shorter course the first repayment comes earlier."
  - question: "Which students are on Plan 5?"
    answer: "Students in England who started an undergraduate course, PGCE or other eligible course on or after 1 August 2023. Welsh students who started from September 2012, including after 2023, are on Plan 2. Scotland uses Plan 4 and Northern Ireland uses Plan 1."
  - question: "How much do you repay on Plan 5 at £30,000?"
    answer: "{{ ukStudentLoan(30000, plan=plan5) | gbp }} a year, about {{ ukStudentLoan(30000, plan=plan5) / 12 | gbp(2) }} a month — {{ ukFact('studentLoanRate') | pct }} of the {{ 30000 - ukFact('plan5Threshold') | gbp }} above the {{ ukFact('plan5Threshold') | gbp }} threshold. On the same salary, a Plan 2 borrower repays {{ ukStudentLoan(30000, plan=plan2) | gbp }} a year, because Plan 2's threshold is {{ ukFact('plan2Threshold') | gbp }}."
  - question: "When is a Plan 5 loan written off?"
    answer: "40 years after the April you were first due to repay, per GOV.UK — a decade longer than Plan 2's 30 years. Any balance still outstanding at that point is cancelled."
  - question: "Is Plan 5 worse than Plan 2?"
    answer: "It takes more from lower salaries, sooner: the {{ ukFact('plan5Threshold') | gbp }} threshold means {{ ukStudentLoan(30000, plan=plan5) - ukStudentLoan(30000, plan=plan2) | gbp }} a year more in repayments than Plan 2 at £30,000, and the write-off is 40 years instead of 30. In its favour, Plan 5 charges interest at RPI only, with no added percentage, so balances grow more slowly."
---

## {{ ukFact('studentLoanRate') | pct }} of everything you earn over {{ ukFact('plan5Threshold') | gbp }}

**Plan 5 — the loan for students in England who started courses from August 2023 — takes {{ ukFact('studentLoanRate') | pct }} of your income above {{ ukFact('plan5Threshold') | gbp }} a year.** On a £40,000 salary that is {{ ukStudentLoan(40000, plan=plan5) | gbp }} a year, or {{ ukStudentLoan(40000, plan=plan5) / 12 | gbp(2) }} a month, leaving take-home pay of {{ ukTakeHome(40000, plan=plan5) | gbp }} a year ({{ ukTakeHome(40000, plan=plan5) / 12 | gbp }} a month) after tax, National Insurance, and the loan.

## When will I start repaying?

Per [GOV.UK](https://www.gov.uk/repaying-your-student-loan/when-you-start-repaying), the earliest you start repaying is the April after you leave your course. For Plan 5 that means a three-year degree started in autumn 2023 produces the first deduction in April 2027, and a shorter course produces it earlier. If you are not sure which plan you are on, GOV.UK lists it by country and start date: Plan 5 is England only (courses from 1 August 2023), Welsh students are on Plan 2, Scottish students on Plan 4 and Northern Irish students on Plan 1 ([which plan you are on](https://www.gov.uk/repaying-your-student-loan/which-repayment-plan-you-are-on)).

## Repayments at common salaries

| Salary | Plan 5 (per year) | Plan 5 (per month) | Plan 2 (per year) | Plan 2 (per month) |
|---|---|---|---|---|
| £30,000 | {{ ukStudentLoan(30000, plan=plan5) | gbp }} | {{ ukStudentLoan(30000, plan=plan5) / 12 | gbp(2) }} | {{ ukStudentLoan(30000, plan=plan2) | gbp }} | {{ ukStudentLoan(30000, plan=plan2) / 12 | gbp(2) }} |
| £35,000 | {{ ukStudentLoan(35000, plan=plan5) | gbp }} | {{ ukStudentLoan(35000, plan=plan5) / 12 | gbp(2) }} | {{ ukStudentLoan(35000, plan=plan2) | gbp }} | {{ ukStudentLoan(35000, plan=plan2) / 12 | gbp(2) }} |
| £40,000 | {{ ukStudentLoan(40000, plan=plan5) | gbp }} | {{ ukStudentLoan(40000, plan=plan5) / 12 | gbp(2) }} | {{ ukStudentLoan(40000, plan=plan2) | gbp }} | {{ ukStudentLoan(40000, plan=plan2) / 12 | gbp(2) }} |
| £50,000 | {{ ukStudentLoan(50000, plan=plan5) | gbp }} | {{ ukStudentLoan(50000, plan=plan5) / 12 | gbp(2) }} | {{ ukStudentLoan(50000, plan=plan2) | gbp }} | {{ ukStudentLoan(50000, plan=plan2) / 12 | gbp(2) }} |

Both plans charge the same {{ ukFact('studentLoanRate') | pct }} rate — the difference is where repayment starts. Plan 5's threshold is **{{ ukFact('plan5Threshold') | gbp }}**; Plan 2's is **{{ ukFact('plan2Threshold') | gbp }}**. That {{ ukFact('plan2Threshold') - ukFact('plan5Threshold') | gbp }} gap is worth {{ (ukFact('plan2Threshold') - ukFact('plan5Threshold')) * ukFact('studentLoanRate') / 100 | gbp }} a year at every salary above both thresholds, and it bites hardest at the bottom: at £30,000, a Plan 5 graduate repays {{ ukStudentLoan(30000, plan=plan5) | gbp }} a year while a Plan 2 graduate repays {{ ukStudentLoan(30000, plan=plan2) | gbp }} — roughly {{ ukStudentLoan(30000, plan=plan5) / ukStudentLoan(30000, plan=plan2) | num(1) }} times as much for the newer cohort.

For take-home pay before the loan at any salary, see the [UK take-home table](/scenarios/uk-take-home-pay/) ([£30,000](/scenarios/uk-take-home-pay/#30k), [£35,000](/scenarios/uk-take-home-pay/#35k), [£40,000](/scenarios/uk-take-home-pay/#40k) and [£50,000](/scenarios/uk-take-home-pay/#50k) rows); the [£30,000 with a Plan 2 loan breakdown](/scenarios/30k-salary-uk-student-loan/) shows the older plan's deductions line by line.

## How Plan 5 works

Repayments behave like a tax, not like a normal loan:

- **Automatic:** deducted through PAYE alongside income tax and NI. You never choose the amount.
- **Income-contingent:** earn below {{ ukFact('plan5Threshold') | gbp }} in a pay period and the deduction stops. Nothing accrues as "missed".
- **{{ ukFact('studentLoanRate') | pct }} above the threshold only:** a £1,000 pay rise above {{ ukFact('plan5Threshold') | gbp }} costs {{ 1000 * ukFact('studentLoanRate') / 100 | gbp }} a year in extra repayments, regardless of your balance.
- **Written off after 40 years:** per [GOV.UK](https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled), "Plan 5 loans are written off 40 years after the April you were first due to repay". For a borrower whose first repayment is April 2027, that is April 2067.

## Plan 5 vs Plan 2: the real trade

Plan 5 is a deliberately different bargain from Plan 2 (England and Wales courses starting September 2012 to July 2023 for England, and from September 2012 onwards for Wales):

- **You pay from a lower salary** — {{ ukFact('plan5Threshold') | gbp }} vs {{ ukFact('plan2Threshold') | gbp }} — so monthly deductions start earlier in your career and are larger at every income level.
- **You pay for longer** — the write-off moved from 30 years to 40, stretching repayments across most of a working life.
- **But interest is gentler** — Plan 5 charges RPI only, with no added percentage on top, unlike Plan 2's income-linked rate. On GOV.UK on 15 November 2026 Plan 5 interest was 4.1%, while Plan 2 interest after leaving the course ran from 4.1% to 6% depending on income. Balances still grow with inflation, but they no longer compound ahead of it.

A lower threshold and a longer term both raise the total a borrower repays before any write-off. Which of those costs more than the gentler interest saves depends on your own earnings path, not on the plan alone.

## What it does to your marginal rate

Stack the deductions and a Plan 5 graduate in the basic-rate band loses **{{ ukMarginalRate(30000, plan=plan5) | int }}p of each extra pound**: {{ ukFact('basicRate') | pct }} income tax, {{ ukFact('niMainRate') | pct }} National Insurance, {{ ukFact('studentLoanRate') | pct }} loan. In the higher-rate band it is **{{ ukMarginalRate(60000, plan=plan5) | int }}p** ({{ ukFact('higherRate') | pct }} + {{ ukFact('niUpperRate') | pct }} + {{ ukFact('studentLoanRate') | pct }}). That is worth knowing when you weigh up a pay rise — a £1,000 rise at £30,000 with a Plan 5 loan is {{ 1000 * (100 - ukMarginalRate(30000, plan=plan5)) / 100 | gbp }} in your pocket, not {{ 1000 * (100 - ukMarginalRate(30000)) / 100 | gbp }}. [What a pay rise is actually worth](/scenarios/pay-rise-shock-uk/) runs those numbers without a loan for comparison.

Whether voluntary overpayments make sense depends on the same question as Plan 2, stretched over a longer horizon: will your lifetime earnings clear the balance before the 40-year write-off? High and rising earners save real interest by overpaying; for others, the write-off does the work and overpayments are money gone. That depends on your career path, not a rule of thumb.

See your exact payslip with a Plan 5 loan — alongside tax codes, pension contributions, and Scottish rates — in the [UK Salary Calculator](/tools/income-and-planning/salary-uk/). The method is in [how we calculate UK take-home pay](/how-we-calculate/salary-uk/).
