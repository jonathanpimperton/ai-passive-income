---
name: "UK Salary & Take-Home Calculator"
slug: "salary-uk"
category: "income-and-planning"
description: "UK take-home pay a month and a year for {{ taxYear('uk') }}: income tax, NI, student loan and pension, with tax codes, Scottish rates and a payslip match."
keywords:
  - "UK salary calculator"
  - "UK take-home pay calculator"
  - "UK tax calculator"
  - "PAYE calculator"
  - "National Insurance calculator"
  - "student loan repayment calculator UK"
  - "salary after tax UK"
  - "monthly take-home pay UK"
affiliateContext: "Boost your take-home pay with tax-efficient saving"
affiliatePrograms:
  - "Nutmeg"
  - "InvestEngine"
relatedTools:
  - "mortgage-affordability"
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "stamp-duty"
  - "capital-gains-tax"
  - "net-worth"
lastUpdated: "2026-11-16"
dataSources:
  - name: "HMRC Income Tax rates {{ taxYear('uk') }}"
    url: "https://www.gov.uk/income-tax-rates"
  - name: "National Insurance rates and categories"
    url: "https://www.gov.uk/national-insurance-rates-letters"
  - name: "Student loan repayment thresholds"
    url: "https://www.gov.uk/repaying-your-student-loan/what-you-pay"
  - name: "When you start repaying a student loan"
    url: "https://www.gov.uk/repaying-your-student-loan/when-you-start-repaying"
  - name: "Scottish Income Tax rates {{ taxYear('uk') }}"
    url: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/"
  - name: "DWP: review of the auto-enrolment earnings trigger and qualifying earnings band for 2026/27"
    url: "https://www.gov.uk/government/publications/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627"
  - name: "GOV.UK: income contingent student loan repayment plans, England 2025-26 statistics"
    url: "https://www.gov.uk/government/statistics/student-loans-in-england-2025-to-2026/income-contingent-student-loan-repayment-plans-interest-rates-and-calculations-england"
  - name: "Workplace pensions: what you, your employer and the government pay (GOV.UK)"
    url: "https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay"
  - name: "Changes to salary sacrifice for pensions from April 2029"
    url: "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029"
  - name: "State Pension rates"
    url: "https://www.gov.uk/new-state-pension/what-youll-get"
faq:
  - question: "How much tax will I pay on my UK salary?"
    answer: "For {{ taxYear('uk') }} you pay 0% on the first {{ ukFact('personalAllowance') | gbp }} (the Personal Allowance), {{ ukFact('basicRate') | pct }} on {{ ukFact('personalAllowance') + 1 | gbp }} to {{ ukFact('higherRateThreshold') | gbp }}, {{ ukFact('higherRate') | pct }} on {{ ukFact('higherRateThreshold') + 1 | gbp }} to {{ ukFact('additionalRateThreshold') | gbp }} and {{ ukFact('additionalRate') | pct }} above that. Scotland has its own six bands, from 19% to 48%. On top of income tax, employees pay National Insurance at {{ ukFact('niMainRate') | pct }} on earnings between {{ ukFact('niPrimaryThreshold') | gbp }} and {{ ukFact('niUpperEarningsLimit') | gbp }}, then {{ ukFact('niUpperRate') | pct }} above that."
  - question: "How much will I take home on a £30,000, £50,000 or £75,000 salary?"
    answer: "With no pension and no student loan, on the standard 1257L code for {{ taxYear('uk') }}: £30,000 leaves {{ ukTakeHome(30000) / 12 | gbp }} a month ({{ ukTakeHome(30000) | gbp }} a year), £50,000 leaves {{ ukTakeHome(50000) / 12 | gbp }} a month ({{ ukTakeHome(50000) | gbp }} a year) and £75,000 leaves {{ ukTakeHome(75000) / 12 | gbp }} a month ({{ ukTakeHome(75000) | gbp }} a year). A pension contribution or a student loan lowers these, as the worked examples show. The calculator gives the monthly and the annual figure side by side for your own salary."
  - question: "What is the 60% tax trap?"
    answer: "Between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }} of adjusted net income your Personal Allowance shrinks by £1 for every £2 you earn. That costs an extra {{ ukFact('higherRate') / 2 | pct }} on top of the {{ ukFact('higherRate') | pct }} higher rate, so each extra pound of pay loses {{ ukFact('higherRate') * 1.5 | pct }} to income tax alone, and {{ ukMarginalRate(110000) | pct }} once National Insurance is counted (the calculator's figure at £110,000). A pension contribution that brings your income back under {{ ukFact('paTaperThreshold') | gbp }} restores the allowance."
  - question: "How much National Insurance will I pay?"
    answer: "For {{ taxYear('uk') }}, employees pay Class 1 National Insurance at {{ ukFact('niMainRate') | pct }} on earnings between {{ ukFact('niPrimaryThreshold') | gbp }} and {{ ukFact('niUpperEarningsLimit') | gbp }} a year, and {{ ukFact('niUpperRate') | pct }} on earnings above {{ ukFact('niUpperEarningsLimit') | gbp }}. Your employer separately pays {{ ukFact('employerNiRate') | pct }} on pay above {{ ukFact('employerNiThreshold') | gbp }}; that does not come out of your salary. NI builds your State Pension record: you need 35 qualifying years for the full new State Pension, currently {{ ukFact('statePensionWeekly') | gbp(2) }} a week."
  - question: "How do student loan repayments work in the UK?"
    answer: "Repayments are taken through payroll once you earn above your plan's threshold. Plan 1 (started before September 2012 in England or Wales, or any start in Northern Ireland): {{ ukFact('studentLoanRate') | pct }} above {{ ukFact('plan1Threshold') | gbp }} a year. Plan 2 (England from September 2012 to July 2023; Wales from September 2012): {{ ukFact('studentLoanRate') | pct }} above {{ ukFact('plan2Threshold') | gbp }}. Plan 4 (Scotland): {{ ukFact('studentLoanRate') | pct }} above {{ ukFact('plan4Threshold') | gbp }}. Plan 5 (England, courses starting from August 2023): {{ ukFact('studentLoanRate') | pct }} above {{ ukFact('plan5Threshold') | gbp }}, with repayments starting the April after you finish or leave your course, so the first borrowers began in April 2026 and a three-year degree started in autumn 2023 starts in April 2027 (GOV.UK student loan statistics 2025-26, checked 16 November 2026). Postgraduate Loan: {{ ukFact('postgradRate') | pct }} above {{ ukFact('postgradThreshold') | gbp }}, taken on top of an undergraduate plan. The calculator holds one loan at a time, so if you have both, add the Postgraduate Loan figure to the plan figure yourself."
  - question: "What is salary sacrifice and how does it change my take-home pay?"
    answer: "With salary sacrifice you give up part of your gross salary and your employer pays it into your pension instead. Income tax, your National Insurance and your student loan are then all worked out on the lower pay. For example, sacrificing £5,000 from a £50,000 salary saves you {{ ukNi(50000) - ukNi(50000, pensionAmount=5000, method=sacrifice) | gbp }} in National Insurance and saves your employer {{ 5000 * ukFact('employerNiRate') / 100 | gbp }}. For a higher-rate taxpayer on £60,000, a £5,000 sacrifice saves {{ 5000 - (ukTakeHome(60000) - ukTakeHome(60000, pensionAmount=5000, method=sacrifice)) | gbp }} in tax and NI ({{ 5000 - (ukTakeHome(60000, scottish=true) - ukTakeHome(60000, scottish=true, pensionAmount=5000, method=sacrifice)) | gbp }} on Scottish rates). Two cautions: a lower gross salary can reduce a mortgage offer and some benefits, and from 6 April 2029 NI relief on sacrificed pension contributions above £2,000 a year is due to end. The calculator does not apply that cap."
  - question: "Do I pay Scottish Income Tax rates?"
    answer: "If you live in Scotland, whoever your employer is, you pay Scottish rates. For {{ taxYear('uk') }} there are six bands: Starter 19%, Basic 20%, Intermediate 21%, Higher 42%, Advanced 45% and Top 48%. From £43,663 Scotland charges 42% against {{ ukFact('higherRate') | pct }} in the rest of the UK, and above {{ ukFact('additionalRateThreshold') | gbp }} it charges 48% against {{ ukFact('additionalRate') | pct }} (Scottish Government bands for 2026/27). Tick the Scottish box in the calculator, or enter a code with an S prefix. Scottish student loans are Plan 4."
  - question: "Why is my payslip take-home lower than the calculator's?"
    answer: "With relief at source your pension provider adds 20% tax relief, but payroll does not give the extra relief that taxpayers above the 20% rate are owed: higher- and additional-rate taxpayers, and in Scotland the intermediate rate and above. The calculator's headline includes that relief. The 'On your payslip' line leaves it out, and the extra amount is shown beside it. You claim the difference through Self Assessment or a tax code change. A payslip can also differ from the calculator by a few pounds, because PAYE spreads tax across the year and rounds each month."
  - question: "How do I enter my pension from a payslip?"
    answer: "Choose '£ a year' and enter the amount taken from your pay: your payslip's monthly pension line multiplied by 12. For relief at source the calculator then adds the provider's 20% (the payslip amount x 1.25) to show what goes into the pension pot. Pick the way your employer pays it (net pay, relief at source or salary sacrifice), because that decides how it reaches payroll."
  - question: "Is my pension percentage of my salary or of qualifying earnings?"
    answer: "Many auto-enrolment schemes, such as NEST, take the percentage of earnings between £6,240 and £50,270 a year, not of full pay (GOV.UK; the DWP's 2026/27 review kept the band unchanged, confirmed on 18 December 2025). Choose 'Qualifying earnings' under 'Percentage of' to match. Check your scheme's rules, because some use full salary. The legal minimum for auto-enrolment is 8% of qualifying earnings in total, with at least 3% from your employer."
  - question: "What do the BR, D0 and D1 tax codes mean?"
    answer: "They tax all your pay from that job at one rate: BR at {{ ukFact('basicRate') | pct }}, D0 at {{ ukFact('higherRate') | pct }} and D1 at {{ ukFact('additionalRate') | pct }}, with no Personal Allowance (it is being used against another job or pension). The Scottish equivalents are SBR, SD0, SD1, SD2 and SD3. The Scottish tick-box does not change BR, D0 or D1, which follow the code, so enter the S version for a Scottish second job."
workedExamples:
  - title: "Take-home pay on a £35,000 salary"
    inputs:
      annualSalary: 35000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 5
    description: "A £35,000 salary with no student loan and 5% into a workplace pension through net pay. Take-home is {{ ukPay(35000, pension=5, method=net).monthly | gbp }} a month, or {{ ukPay(35000, pension=5, method=net).takeHome | gbp }} a year. Income Tax is {{ ukPay(35000, pension=5, method=net).incomeTax | gbp }} a year ({{ ukFact('basicRate') | pct }} on the pay above the {{ ukFact('personalAllowance') | gbp }} Personal Allowance once the pension comes off), National Insurance is {{ ukPay(35000, pension=5, method=net).ni | gbp }} ({{ ukFact('niMainRate') | pct }} on {{ 35000 - ukFact('niPrimaryThreshold') | gbp }}) and the pension is {{ ukPay(35000, pension=5, method=net).pension | gbp }}. Total deductions: {{ 35000 - ukPay(35000, pension=5, method=net).takeHome | gbp }}."
  - title: "Higher-rate taxpayer with a student loan"
    inputs:
      annualSalary: 55000
      taxCode: "1257L"
      studentLoan: "plan2"
      pensionContribution: 5
    description: "A £55,000 salary with a Plan 2 student loan and 5% into a pension through net pay. Take-home is {{ ukPay(55000, pension=5, method=net, plan=plan2).monthly | gbp }} a month, or {{ ukPay(55000, pension=5, method=net, plan=plan2).takeHome | gbp }} a year. Income Tax is {{ ukPay(55000, pension=5, method=net, plan=plan2).incomeTax | gbp }}, National Insurance {{ ukPay(55000, pension=5, method=net, plan=plan2).ni | gbp }}, the student loan {{ ukPay(55000, pension=5, method=net, plan=plan2).studentLoan | gbp }} ({{ ukFact('studentLoanRate') | pct }} above {{ ukFact('plan2Threshold') | gbp }}) and the pension {{ ukPay(55000, pension=5, method=net, plan=plan2).pension | gbp }}. Total deductions: {{ 55000 - ukPay(55000, pension=5, method=net, plan=plan2).takeHome | gbp }}. Another £100 of pay would lose {{ ukMarginalRate(55000, plan=plan2) | pct }} to tax, NI and the loan."
  - title: "The 60% tax trap at £110,000"
    inputs:
      annualSalary: 110000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 0
    description: "At £110,000 the Personal Allowance is cut by {{ (110000 - ukFact('paTaperThreshold')) / 2 | gbp }} (half of the pay above {{ ukFact('paTaperThreshold') | gbp }}), leaving {{ ukPay(110000).personalAllowance | gbp }}. Income Tax is {{ ukIncomeTax(110000) | gbp }} and National Insurance {{ ukNi(110000) | gbp }}, so take-home is {{ ukTakeHome(110000) / 12 | gbp }} a month, or {{ ukTakeHome(110000) | gbp }} a year. Paying {{ 110000 - ukFact('paTaperThreshold') | gbp }} into a pension by salary sacrifice brings pay back to {{ ukFact('paTaperThreshold') | gbp }}, restores the full allowance, and lowers take-home by only {{ ukTakeHome(110000) - ukTakeHome(110000, pensionAmount=110000 - ukFact('paTaperThreshold'), method=sacrifice) | gbp }} a year ({{ (ukTakeHome(110000) - ukTakeHome(110000, pensionAmount=110000 - ukFact('paTaperThreshold'), method=sacrifice)) / 12 | gbp }} a month)."
---

## What you take home on a UK salary

Take-home pay is your gross salary minus Income Tax, employee National Insurance, any pension contribution and any student loan repayment. Payroll (PAYE) takes these out before the money reaches you, so your payslip shows gross and net side by side.

**On a £35,000 salary with 5% into a pension, you take home {{ ukPay(35000, pension=5, method=net).monthly | gbp }} a month ({{ ukPay(35000, pension=5, method=net).takeHome | gbp }} a year).** That is the calculator's starting position. At £55,000 with a Plan 2 student loan and the same pension it is {{ ukPay(55000, pension=5, method=net, plan=plan2).monthly | gbp }} a month ({{ ukPay(55000, pension=5, method=net, plan=plan2).takeHome | gbp }} a year). The calculator gives both: the monthly figure is what lands in your account, the annual one is what a mortgage lender asks about.

> **Worth knowing:** a pay rise at £35,000 keeps {{ 100 - ukMarginalRate(35000) | pct }} of each extra pound. At £55,000 with a Plan 2 loan it keeps {{ 100 - ukMarginalRate(55000, plan=plan2) | pct }}, and between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }} only {{ 100 - ukMarginalRate(110000) | pct }}.

## How UK Income Tax works

<div class="stat-highlight">
  <span class="stat-number">{{ ukFact('higherRate') * 1.5 | pct }}</span>
  <span class="stat-text">of each extra pound lost to income tax between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }}, because the Personal Allowance is withdrawn there. A pension contribution is the usual way out.</span>
</div>

For {{ taxYear('uk') }} everyone gets a Personal Allowance of {{ ukFact('personalAllowance') | gbp }}: income up to that is tax-free. Above it, income is taxed at {{ ukFact('basicRate') | pct }} up to {{ ukFact('higherRateThreshold') | gbp }}, {{ ukFact('higherRate') | pct }} up to {{ ukFact('additionalRateThreshold') | gbp }}, and {{ ukFact('additionalRate') | pct }} above that.

Your tax code tells your employer how much allowance to apply. The standard code 1257L means a {{ ukFact('personalAllowance') | gbp }} allowance. If HMRC changes it (a company car, an underpayment from last year, a second job), your take-home changes with it. Enter the code from your payslip and the calculator uses it. Codes such as BR, D0 and D1 tax all your pay at one flat rate.

## The 60% tax trap

Between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }}, your Personal Allowance falls by £1 for every £2 of income. You pay the {{ ukFact('higherRate') | pct }} higher rate on the pay itself and lose allowance that would have saved {{ ukFact('higherRate') / 2 | pct }} more, so each extra pound loses {{ ukFact('higherRate') * 1.5 | pct }} to income tax. With National Insurance it is {{ ukMarginalRate(110000) | pct }}.

The standard way out is a pension contribution, ideally by salary sacrifice, that brings your adjusted net income back to {{ ukFact('paTaperThreshold') | gbp }}. At £110,000, putting {{ 110000 - ukFact('paTaperThreshold') | gbp }} into a pension that way lowers take-home by {{ ukTakeHome(110000) - ukTakeHome(110000, pensionAmount=110000 - ukFact('paTaperThreshold'), method=sacrifice) | gbp }} a year, so the pot gains {{ 110000 - ukFact('paTaperThreshold') | gbp }} for a net cost of {{ ukTakeHome(110000) - ukTakeHome(110000, pensionAmount=110000 - ukFact('paTaperThreshold'), method=sacrifice) | gbp }}. Try different contribution levels in the calculator to find your own break-even.

## National Insurance

Employees pay Class 1 National Insurance at {{ ukFact('niMainRate') | pct }} on earnings between {{ ukFact('niPrimaryThreshold') | gbp }} and {{ ukFact('niUpperEarningsLimit') | gbp }}, then {{ ukFact('niUpperRate') | pct }} above that. Your employer pays {{ ukFact('employerNiRate') | pct }} on pay above {{ ukFact('employerNiThreshold') | gbp }}. That is not deducted from your salary, but it is part of what you cost.

NI counts towards your State Pension. You need 35 qualifying years for the full new State Pension, currently {{ ukFact('statePensionWeekly') | gbp(2) }} a week. If you have gaps you can pay voluntary Class 3 contributions to fill them.

| Annual pay | Employee NI | Employer NI |
|---|---|---|
| Up to {{ ukFact('employerNiThreshold') | gbp }} | 0% | 0% |
| {{ ukFact('employerNiThreshold') | gbp }} to {{ ukFact('niPrimaryThreshold') | gbp }} | 0% | {{ ukFact('employerNiRate') | pct }} |
| {{ ukFact('niPrimaryThreshold') | gbp }} to {{ ukFact('niUpperEarningsLimit') | gbp }} | {{ ukFact('niMainRate') | pct }} | {{ ukFact('employerNiRate') | pct }} |
| Above {{ ukFact('niUpperEarningsLimit') | gbp }} | {{ ukFact('niUpperRate') | pct }} | {{ ukFact('employerNiRate') | pct }} |

## Scottish Income Tax

If you live in Scotland, you pay Scottish rates whoever your employer is. There are six bands rather than three, so Scotland charges 42% from £43,663 (the rest of the UK charges {{ ukFact('higherRate') | pct }}, from {{ ukFact('higherRateThreshold') + 1 | gbp }}) and 48% above {{ ukFact('additionalRateThreshold') | gbp }} (against {{ ukFact('additionalRate') | pct }}). Lower earners pay a little less than in England; higher earners pay more. The band figures are the Scottish Government's for {{ taxYear('uk') }}.

Your payslip shows an "Income Tax" line either way. The Scottish rates reach it through your tax code, which starts with an S. Tick the Scottish box in the calculator, or type a code such as S1257L.

## Student loan repayments

Student loan repayments come out of your pay once you earn above your plan's threshold, until the loan is repaid or written off. They are a percentage of earnings above the threshold, not of the whole salary.

| Plan | Applies to | Threshold | Rate |
|---|---|---|---|
| Plan 1 | Started before September 2012 (England and Wales), or any start in Northern Ireland | {{ ukFact('plan1Threshold') | gbp }} a year | {{ ukFact('studentLoanRate') | pct }} |
| Plan 2 | England from September 2012 to July 2023; Wales from September 2012 | {{ ukFact('plan2Threshold') | gbp }} a year | {{ ukFact('studentLoanRate') | pct }} |
| Plan 4 | Scotland | {{ ukFact('plan4Threshold') | gbp }} a year | {{ ukFact('studentLoanRate') | pct }} |
| Plan 5 | England, courses starting from August 2023 (repayments start the April after you finish or leave your course: April 2026 for the first borrowers, April 2027 for a three-year degree started in autumn 2023) | {{ ukFact('plan5Threshold') | gbp }} a year | {{ ukFact('studentLoanRate') | pct }} |
| Postgraduate | Master's and doctoral loans | {{ ukFact('postgradThreshold') | gbp }} a year | {{ ukFact('postgradRate') | pct }} |

An undergraduate plan and a Postgraduate Loan can run together, so up to {{ ukFact('studentLoanRate') + ukFact('postgradRate') | pct }} of pay above the thresholds can go to loans. The calculator holds one loan at a time.

> **Example:** on a £35,000 salary with a Plan 2 loan you repay {{ ukFact('studentLoanRate') | pct }} of the pay above {{ ukFact('plan2Threshold') | gbp }}: {{ ukStudentLoan(35000, plan=plan2) | gbp }} a year, or {{ ukStudentLoan(35000, plan=plan2) / 12 | gbp }} a month.

## Matching your payslip

Three settings decide whether the calculator agrees with your payslip. Choose how your employer pays the pension (net pay, relief at source or salary sacrifice). Enter the pension as the amount taken from your pay (your payslip's monthly line multiplied by 12) if you don't know the percentage. And switch the percentage to qualifying earnings if you are in an auto-enrolment scheme such as NEST.

For relief at source the calculator shows two take-home figures. The headline includes the extra tax relief that taxpayers above the 20% rate (higher and additional rate, and in Scotland the intermediate rate and above) claim back through Self Assessment. "On your payslip" leaves it out, because payroll does not give it. The difference is shown beside both.

## Mistakes that cost money

1. **A wrong tax code.** An incorrect code means you overpay or underpay all year. Check your code against your HMRC online account at least once a year.
2. **Leaving salary sacrifice unused near a threshold.** At £60,000 a £5,000 sacrifice saves {{ 5000 - (ukTakeHome(60000) - ukTakeHome(60000, pensionAmount=5000, method=sacrifice)) | gbp }} in tax and NI; on Scottish rates it is {{ 5000 - (ukTakeHome(60000, scottish=true) - ukTakeHome(60000, scottish=true, pensionAmount=5000, method=sacrifice)) | gbp }}. The cap on NI relief from April 2029 will trim the NI part.
3. **Sticking with the minimum pension.** Auto-enrolment starts at 8% of qualifying earnings in total, with at least 3% from your employer. A higher contribution, especially by salary sacrifice, is one of the most tax-efficient ways to save.

## What to do next

Enter your salary and any pension and student loan. If your tax code isn't 1257L, enter it to see the effect on your allowance. If you earn near {{ ukFact('paTaperThreshold') | gbp }}, try pension contributions to see how much of the taper you can reverse.
