---
name: "Salary & Take-Home Calculator"
slug: "salary"
category: "income-and-planning"
description: "Convert salary to hourly rate, see take-home pay after taxes, and calculate overtime pay. Compare job offers instantly — free, no signup, no ads."
keywords:
  - "salary to hourly calculator"
  - "hourly to salary"
  - "annual salary calculator"
  - "take-home pay calculator"
  - "overtime calculator"
relatedTools:
  - "net-worth"
  - "retirement-savings"
  - "savings-goal"
  - "emergency-fund"
  - "inflation"
faq:
  - question: "How do I convert my salary to an hourly rate?"
    answer: "Divide your annual salary by the number of working hours in a year. For a standard full-time schedule (40 hours/week, 52 weeks/year), that's 2,080 hours. So a $60,000 salary equals approximately $28.85 per hour. If you get paid time off, the actual hourly rate is effectively higher."
  - question: "What is the difference between gross pay and net pay?"
    answer: "Gross pay is your total earnings before any deductions. Net pay (take-home pay) is what actually hits your bank account after federal taxes, state taxes, Social Security (6.2%), Medicare (1.45%), and any pre-tax deductions like 401(k) contributions or health insurance premiums."
  - question: "How much of my salary goes to taxes?"
    answer: "For most Americans, total tax burden (federal + state + FICA) ranges from 20-35% of gross income. The exact amount depends on your filing status, state of residence, deductions, and income level. Someone earning $75,000 in California pays roughly 30% in total taxes, while the same salary in Texas (no state income tax) is about 22%."
  - question: "How do I calculate overtime pay?"
    answer: "Under the Fair Labor Standards Act (FLSA), overtime is 1.5 times your regular hourly rate for hours worked beyond 40 per week. If your regular rate is $25/hour, overtime is $37.50/hour. Some states have additional overtime rules — California requires overtime after 8 hours in a single day."
  - question: "Is a $50,000 salary good?"
    answer: "It depends heavily on location. $50,000 in Des Moines, Iowa has roughly the same purchasing power as $85,000 in San Francisco. The national median household income is about $75,000. Our calculator helps you see the real take-home pay so you can evaluate based on your actual expenses."
workedExamples:
  - title: "Comparing hourly vs salaried job offers"
    inputs:
      annualSalary: 65000
      hourlyRate: 35
      hoursPerWeek: 40
    description: "A salaried offer at $65,000/year vs an hourly position at $35/hour. The salary equals $31.25/hour (at 2,080 hours/year). The hourly job pays $3.75/hour more, plus overtime opportunities. At just 5 hours overtime per week, the hourly job earns $79,625/year — 22% more than the salary."
  - title: "Take-home pay on a $75,000 salary"
    inputs:
      annualSalary: 75000
      filingStatus: "single"
      state: "New York"
      retirement401k: 6
    description: "A single filer earning $75,000 in New York, contributing 6% to their 401(k). Approximate monthly take-home: $4,150. Federal taxes: $8,400/year, state/local taxes: $4,200/year, FICA: $5,738/year, 401(k): $4,500/year. Total deductions: about $22,838, leaving $52,162 net."
  - title: "Part-time to full-time equivalent"
    inputs:
      hourlyRate: 22
      hoursPerWeek: 25
    description: "Working 25 hours/week at $22/hour brings in $28,600/year. The full-time equivalent (40 hours/week) would be $45,760. This comparison helps when evaluating whether to take on additional hours or a second job."
---

Educational content will be added during Sprint 4.
