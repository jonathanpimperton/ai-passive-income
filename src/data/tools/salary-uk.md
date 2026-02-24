---
name: "UK Salary & Take-Home Calculator"
slug: "salary-uk"
category: "income-and-planning"
description: "Calculate your UK take-home pay after Income Tax, National Insurance, student loan repayments, and pension. See annual, monthly, weekly, and daily breakdowns."
keywords:
  - "UK salary calculator"
  - "UK take-home pay calculator"
  - "UK tax calculator"
  - "PAYE calculator"
  - "National Insurance calculator"
  - "student loan repayment calculator UK"
  - "salary after tax UK"
relatedTools:
  - "salary-us"
  - "net-worth"
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "inflation"
faq:
  - question: "How much tax will I pay on my UK salary?"
    answer: "UK Income Tax uses a progressive band system for the 2025/26 tax year: you pay 0% on the first £12,570 (Personal Allowance), 20% on £12,571–£50,270 (Basic Rate), 40% on £50,271–£125,140 (Higher Rate), and 45% above £125,140 (Additional Rate). Scotland has its own rates ranging from 19% to 48%. Your total deductions also include National Insurance at 8% on earnings between £12,570 and £50,270, then 2% above that."
  - question: "What is the 60% tax trap?"
    answer: "Between £100,000 and £125,140, your Personal Allowance is reduced by £1 for every £2 earned over £100,000. This creates an effective marginal tax rate of about 60% in that band (40% Income Tax + 20% from lost allowance). Salary sacrifice into a pension is one common strategy to reduce taxable income below £100,000 and reclaim the full Personal Allowance."
  - question: "How much National Insurance will I pay?"
    answer: "For the 2025/26 tax year, employees pay Class 1 National Insurance at 8% on earnings between £12,570 and £50,270 per year, and 2% on earnings above £50,270. Your employer also pays 13.8% on your earnings above £9,100 (this doesn't come out of your pay). NI contributions count toward your State Pension entitlement — you need 35 qualifying years for the full State Pension."
  - question: "How do student loan repayments work in the UK?"
    answer: "Student loan repayments are deducted from your salary once you earn above the threshold for your plan. Plan 1 (pre-2012 England/Wales, Scotland, NI): 9% above £24,990/year. Plan 2 (post-2012 England/Wales): 9% above £27,295/year. Plan 4 (Scotland post-2012): 9% above £31,395/year. Plan 5 (from 2023): 9% above £25,000/year. Postgraduate Loan: 6% above £21,000/year. You can have both a Plan and Postgraduate Loan deducted simultaneously."
  - question: "What is salary sacrifice and how does it affect my take-home pay?"
    answer: "Salary sacrifice is an arrangement where you give up part of your gross salary in exchange for a non-cash benefit, most commonly pension contributions. The benefit is that both you and your employer save on National Insurance — 8% and 13.8% respectively. For example, sacrificing £5,000 from a £50,000 salary saves you approximately £400 in NI and your employer saves £690, which good employers add to your pension. The trade-off is lower gross salary, which can affect mortgage applications and some benefits."
  - question: "Do I pay Scottish Income Tax rates?"
    answer: "If you live in Scotland (regardless of where your employer is based), you pay Scottish Income Tax rates, which differ from the rest of the UK. For 2025/26, Scotland has six bands: Starter (19%), Basic (20%), Intermediate (21%), Higher (42%), Advanced (45%), and Top (48%). The main impact is felt above £43,663 where Scotland charges 42% vs 40% in the rest of the UK, and above £125,140 where Scotland charges 48% vs 45%."
workedExamples:
  - title: "Take-home pay on a £35,000 salary"
    inputs:
      annualSalary: 35000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 5
    description: "A £35,000 salary with no student loan and 5% pension contribution (auto-enrolment). Income Tax: £4,486/year (20% on £22,430 above Personal Allowance). National Insurance: £1,794/year (8% on £22,430). Pension: £1,750/year. Total deductions: £8,030. Annual take-home: £26,970, or approximately £2,248 per month."
  - title: "Higher-rate taxpayer with student loan"
    inputs:
      annualSalary: 55000
      taxCode: "1257L"
      studentLoan: "plan2"
      pensionContribution: 5
    description: "A £55,000 salary with Plan 2 student loan and 5% pension. Income Tax: £8,486/year (£7,540 at 20% + £946 at 40%). National Insurance: £3,108/year (£3,016 at 8% + £92 at 2%). Student loan: £2,493/year (9% above £27,295). Pension: £2,750. Total deductions: £16,837. Monthly take-home: approximately £3,180."
  - title: "The 60% tax trap at £110,000"
    inputs:
      annualSalary: 110000
      taxCode: "1257L"
      studentLoan: "none"
      pensionContribution: 0
    description: "At £110,000, the Personal Allowance is reduced by £5,000 (half of the £10,000 above £100,000), leaving a £7,570 allowance. This means Income Tax is approximately £31,632 — effectively 60% on the £100K-£110K portion. Total with NI: £38,312 in deductions. Many taxpayers at this level use salary sacrifice to bring taxable income below £100,000 and reclaim the full Personal Allowance, saving thousands."
---

Educational content will be added during Sprint 4.
