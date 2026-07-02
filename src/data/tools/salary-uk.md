---
name: "UK Salary & Take-Home Calculator"
slug: "salary-uk"
category: "income-and-planning"
description: "2026/27 income tax, National Insurance, student loans, and pension — gross to net breakdown."
keywords:
  - "UK salary calculator"
  - "UK take-home pay calculator"
  - "UK tax calculator"
  - "PAYE calculator"
  - "National Insurance calculator"
  - "student loan repayment calculator UK"
  - "salary after tax UK"
affiliateContext: "Boost your take-home pay with tax-efficient saving"
affiliatePrograms:
  - "Nutmeg"
  - "InvestEngine"
relatedTools:
  - "salary-us"
  - "net-worth"
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "inflation"
  - "retirement-contribution"
lastUpdated: "2026-07-02"
dataSources:
  - name: "HMRC Income Tax rates 2026/27"
    url: "https://www.gov.uk/income-tax-rates"
  - name: "National Insurance rates and categories"
    url: "https://www.gov.uk/national-insurance-rates-letters"
  - name: "Student loan repayment thresholds"
    url: "https://www.gov.uk/repaying-your-student-loan/what-you-pay"
  - name: "Scottish Income Tax rates 2026/27"
    url: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/"
  - name: "State Pension rates"
    url: "https://www.gov.uk/new-state-pension/what-youll-get"
faq:
  - question: "How much tax will I pay on my UK salary?"
    answer: "UK Income Tax uses a progressive band system for the 2026/27 tax year: you pay 0% on the first £12,570 (Personal Allowance), 20% on £12,571–£50,270 (Basic Rate), 40% on £50,271–£125,140 (Higher Rate), and 45% above £125,140 (Additional Rate). Scotland has its own rates ranging from 19% to 48%. Your total deductions also include National Insurance at 8% on earnings between £12,570 and £50,270, then 2% above that."
  - question: "What is the 60% tax trap?"
    answer: "Between £100,000 and £125,140, your Personal Allowance is reduced by £1 for every £2 earned over £100,000. This creates an effective marginal tax rate of about 60% in that band (40% Income Tax + 20% from lost allowance). Salary sacrifice into a pension is one common strategy to reduce taxable income below £100,000 and reclaim the full Personal Allowance."
  - question: "How much National Insurance will I pay?"
    answer: "For the 2026/27 tax year, employees pay Class 1 National Insurance at 8% on earnings between £12,570 and £50,270 per year, and 2% on earnings above £50,270. Your employer also pays 15% on your earnings above £5,000 (this doesn't come out of your pay). NI contributions count toward your State Pension entitlement — you need 35 qualifying years for the full State Pension."
  - question: "How do student loan repayments work in the UK?"
    answer: "Student loan repayments are deducted from your salary once you earn above the threshold for your plan. Plan 1 (pre-2012 England/Wales, Scotland, NI): 9% above £26,900/year. Plan 2 (post-2012 England/Wales): 9% above £29,385/year. Plan 4 (Scotland post-2012): 9% above £33,795/year. Plan 5 (from 2023, first repayments began April 2026): 9% above £25,000/year. Postgraduate Loan: 6% above £21,000/year. You can have both a Plan and Postgraduate Loan deducted simultaneously."
  - question: "What is salary sacrifice and how does it affect my take-home pay?"
    answer: "Salary sacrifice is an arrangement where you give up part of your gross salary in exchange for a non-cash benefit, most commonly pension contributions. The benefit is that both you and your employer save on National Insurance — 8% and 15% respectively. For example, sacrificing £5,000 from a £50,000 salary saves you approximately £400 in NI and your employer saves £750, which good employers add to your pension. The trade-off is lower gross salary, which can affect mortgage applications and some benefits."
  - question: "Do I pay Scottish Income Tax rates?"
    answer: "If you live in Scotland (regardless of where your employer is based), you pay Scottish Income Tax rates, which differ from the rest of the UK. For 2026/27, Scotland has six bands: Starter (19%), Basic (20%), Intermediate (21%), Higher (42%), Advanced (45%), and Top (48%). The main impact is felt above £43,663 where Scotland charges 42% vs 40% in the rest of the UK, and above £125,140 where Scotland charges 48% vs 45%."
workedExamples:
  - title: "Take-home pay on a £35,000 salary"
    inputs:
      annualSalary: 35000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 5
    description: "A £35,000 salary with no student loan and 5% pension contribution (auto-enrolment). Income Tax: £4,136/year (20% on £20,680 after the Personal Allowance and pension relief). National Insurance: £1,794/year (8% on £22,430). Pension: £1,750/year. Total deductions: £7,680. Annual take-home: £27,320, or approximately £2,277 per month."
  - title: "Higher-rate taxpayer with student loan"
    inputs:
      annualSalary: 55000
      taxCode: "1257L"
      studentLoan: "plan2"
      pensionContribution: 5
    description: "A £55,000 salary with Plan 2 student loan and 5% pension. Income Tax: £8,332/year (£7,540 at 20% + £792 at 40% after pension relief). National Insurance: £3,111/year (£3,016 at 8% + £95 at 2%). Student loan: £2,305/year (9% above £29,385). Pension: £2,750. Total deductions: £16,498. Monthly take-home: approximately £3,209."
  - title: "The 60% tax trap at £110,000"
    inputs:
      annualSalary: 110000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 0
    description: "At £110,000, the Personal Allowance is reduced by £5,000 (half of the £10,000 above £100,000), leaving a £7,570 allowance. This means Income Tax is approximately £33,432 — effectively 60% on the £100K-£110K portion. Total with NI: £37,643 in deductions. Many taxpayers at this level use salary sacrifice to bring taxable income below £100,000 and reclaim the full Personal Allowance, saving thousands."
---

## Understanding Your UK Take-Home Pay

Your take-home pay in the UK is your gross salary minus Income Tax, National Insurance, pension contributions, and (if applicable) student loan repayments. For most employees, these deductions are handled through PAYE (Pay As You Earn) — your employer calculates and deducts them before you receive your pay.

> **Key takeaway:** On a typical £35,000 salary, roughly £7,700 goes to deductions — meaning you keep about 78p of every pound earned. At £55,000, that drops to around 70p.

## How UK Income Tax Works

<div class="stat-highlight">
  <span class="stat-number">60%</span>
  <span class="stat-text">effective marginal tax rate between £100K and £125K due to the Personal Allowance taper. Salary sacrifice into a pension is the most common way to sidestep this trap.</span>
</div>

The UK uses a progressive tax band system. For the 2026/27 tax year, everyone gets a Personal Allowance of £12,570 — income up to this amount is tax-free. Income above the Personal Allowance is taxed at increasing rates: 20% Basic Rate (up to £50,270), 40% Higher Rate (up to £125,140), and 45% Additional Rate (above £125,140).

Your tax code tells your employer how much Personal Allowance to apply. The standard code 1257L means a £12,570 allowance. If HMRC adjusts your code (for example, because you receive benefits in kind or owe tax from a previous year), your effective allowance changes — which directly affects your take-home pay.

## The 60% Tax Trap

Between £100,000 and £125,140, the UK tax system creates a hidden effective rate of about 60%. For every £2 you earn above £100,000, your Personal Allowance is reduced by £1. This means you're paying 40% Income Tax *plus* effectively losing 20% of your allowance, creating a combined 60% marginal rate.

The most common strategy to avoid this trap is salary sacrifice into a pension. By reducing your taxable income to below £100,000, you reclaim the full Personal Allowance — which can save £5,000 or more in tax, while simultaneously boosting your pension pot.

> **Tip:** If you earn between £100,000 and £125,140, every £1,000 you sacrifice into a pension effectively costs you only £400 after tax savings. Run the numbers with different pension contribution levels to find your optimal strategy.

## National Insurance Contributions

Employees pay Class 1 National Insurance at 8% on earnings between £12,570 and £50,270, then 2% on earnings above £50,270. Your employer also pays 15% on your earnings above £5,000 — this doesn't come out of your pay, but it's a significant cost to your employer.

NI contributions count toward your State Pension entitlement. You need 35 qualifying years for the full new State Pension (currently £241.30 per week). If you have gaps, you can make voluntary Class 3 contributions to fill them.

| Salary Band | Employee NI Rate | Employer NI Rate |
|---|---|---|
| Below £5,000 | 0% | 0% |
| £5,000 – £12,570 | 0% | 15% |
| £12,570 – £50,270 | 8% | 15% |
| Above £50,270 | 2% | 15% |

## Scottish Income Tax

If you live in Scotland (regardless of where your employer is based), you pay Scottish Income Tax rates, which have six bands instead of three. The main difference is that Scotland charges 42% above £43,663 (vs 40% in England), and 48% above £125,140 (vs 45%). Lower earners in Scotland pay slightly less, while higher earners pay slightly more.

Your payslip will show the same "Income Tax" line whether you're in Scotland or not — the difference is applied automatically through your tax code (Scottish codes start with "S").

## Student Loan Repayments

Student loan repayments are deducted from your pay once you earn above the threshold for your plan. These are not voluntary — they're automatically deducted through PAYE until the loan is repaid or written off.

| Plan | Applies To | Threshold | Rate |
|---|---|---|---|
| Plan 1 | Pre-2012 (England/Wales, Scotland, NI) | £26,900/year | 9% |
| Plan 2 | Post-2012 (England/Wales) | £29,385/year | 9% |
| Plan 4 | Post-2012 (Scotland) | £33,795/year | 9% |
| Plan 5 | From 2023 onwards | £25,000/year | 9% |
| Postgraduate | Postgraduate loans | £21,000/year | 6% |

You can hold both a Plan (1, 2, 4, or 5) and a Postgraduate Loan simultaneously, meaning up to 15% of income above the thresholds could go to student loan repayments.

> **Example:** On a £35,000 salary with a Plan 2 loan, you'd repay 9% of income above £29,385 — that's £505/year or about £42/month deducted from your pay.

## Common Mistakes

1. **Not checking your tax code.** An incorrect tax code means you're either overpaying or underpaying tax all year. Check your code on your payslip against your HMRC online account.
2. **Missing the salary sacrifice opportunity.** Salary sacrifice saves both Income Tax and NI. A £5,000 sacrifice at the higher rate can save you £2,400 in tax and NI combined.
3. **Ignoring pension auto-enrolment.** The default 5% employee contribution (plus 3% employer) is the minimum. Increasing your contribution — especially via salary sacrifice — is one of the most tax-efficient ways to build wealth.

> **Key takeaway:** A wrong tax code is the single most common cause of unexpected tax bills. Log in to your HMRC personal tax account at least once a year to verify your code matches your circumstances.

## What to Do Next

Enter your salary and adjust the optional fields to match your situation. If your tax code differs from the standard 1257L, enter it to see the impact on your allowance. If you're earning near £100,000, experiment with pension contributions to see how much you could save by reducing your taxable income below the Personal Allowance taper threshold.
