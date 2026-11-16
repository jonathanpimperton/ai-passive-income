---
name: "Retirement Contribution Calculator"
slug: "retirement-contribution"
category: "income-and-planning"
description: "Retirement contribution calculator: the monthly amount to save to reach your retirement target by a chosen age, with the target shown in today's money."
keywords:
  - "how much to save for retirement"
  - "retirement contribution calculator"
  - "monthly retirement savings"
  - "retirement savings per month"
  - "how much to save per month for retirement"
relatedTools:
  - "retirement-savings"
  - "retirement-age"
  - "investment-return"
  - "compound-interest"
  - "savings-goal"
  - "net-worth"
affiliateContext: "Start your retirement savings with an account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
calculationMethod: "Solves the future value of an annuity for the monthly deposit"
faq:
  - question: "How much should I save for retirement each month?"
    answer: "It depends on your age, current savings, target and expected return. To reach $1,000,000 by 65 from nothing at 7% a year, a 30-year-old needs {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month. A 40-year-old needs {{ savingsMonthly(1000000, 0, 7, 300) | usd }} a month. The earlier you start, the less you need each month."
  - question: "What is a good retirement savings target?"
    answer: "A common rule of thumb, the 4% rule, says you need about 25 times your yearly spending. Spending of $50,000 a year points to {{ 50000 * 25 | usd }}. If Social Security or a pension covers $24,000 of that, your savings only need to provide $26,000 a year, which is {{ (50000 - 24000) * 25 | usd }}. Adjust for the lifestyle you expect."
  - question: "How does inflation affect how much I need to save?"
    answer: "Prices rise, so a target set in today's money needs to be larger in future dollars. At 3% inflation, $1,000,000 in 35 years buys what {{ inflationAdjust(1000000, 3, 35, mode=value) | roundTo(1000) | usd }} buys today. The calculator shows the target in nominal and in today's money, so you can judge what the savings will actually buy."
  - question: "Should I increase my contributions over time?"
    answer: "Yes, where you can. The calculator assumes one fixed monthly amount, but your pay will probably grow. Raising your contribution when you get a pay rise brings the target closer than the fixed amount shown here would."
  - question: "What return rate should I use?"
    answer: "The rate is an assumption, not a forecast, so test several. To reach $1,000,000 in 35 years from nothing, you need {{ savingsMonthly(1000000, 0, 5, 420) | usd }} a month at 5%, {{ savingsMonthly(1000000, 0, 7, 420) | usd }} at 7% and {{ savingsMonthly(1000000, 0, 9, 420) | usd }} at 9%. A portfolio with a lot of bonds or cash earns less than one in stocks, and stocks fall as well as rise, so plan on the lower figure."
  - question: "Does this include employer matching?"
    answer: "No. The result is the amount you need to save in total, whoever pays it. Count your employer's contribution towards it. A 50% match on the first 6% of pay is an immediate 50% return on those contributions, so contribute at least enough to get the full match."
  - question: "How does this work for a UK pension?"
    answer: "Choose pounds as the currency and the calculator shows UK milestones. You can usually take benefits from a private or workplace pension from {{ ukFact('pensionAccessAge') | int }}, rising to {{ ukFact('pensionAccessAgeFrom2028') | int }} on 6 April 2028. The State Pension age depends on your date of birth and is between 66 and 68; the GOV.UK State Pension age checker gives yours. The monthly amount is the total going into the pension, including employer contributions and tax relief."
workedExamples:
  - title: "30-year-old targeting $1 million"
    inputs:
      currentAge: 30
      retirementAge: 65
      currentSavings: 0
      targetBalance: 1000000
      annualReturn: 7
    description: "Starting from nothing at 30, you need {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month to reach $1,000,000 by 65 at 7%. That is {{ savingsMonthly(1000000, 0, 7, 420) * 12 | usd }} a year, about {{ savingsMonthly(1000000, 0, 7, 420) * 12 / 50000 * 100 | pct }} of a $50,000 salary. Your deposits total {{ savingsMonthly(1000000, 0, 7, 420) * 420 | usd }}; growth supplies the other {{ 1000000 - savingsMonthly(1000000, 0, 7, 420) * 420 | usd }}."
  - title: "40-year-old with $100,000 saved targeting $1.5 million"
    inputs:
      currentAge: 40
      retirementAge: 65
      currentSavings: 100000
      targetBalance: 1500000
      annualReturn: 7
    description: "With $100,000 saved and 25 years to go, you need {{ savingsMonthly(1500000, 100000, 7, 300) | usd }} a month. Your existing savings grow to {{ compoundFV(100000, 0, 7, 25) | usd }} on their own, so your deposits cover the remaining {{ 1500000 - compoundFV(100000, 0, 7, 25) | usd }}. Total paid in, savings and deposits together: {{ 100000 + savingsMonthly(1500000, 100000, 7, 300) * 300 | usd }}."
  - title: "25-year-old targeting $2 million at 55"
    inputs:
      currentAge: 25
      retirementAge: 55
      currentSavings: 10000
      targetBalance: 2000000
      annualReturn: 8
    description: "An ambitious goal: $2,000,000 by 55 from $10,000 at 8%. You need {{ savingsMonthly(2000000, 10000, 8, 360) | usd }} a month. That is a high savings rate, but growth does most of the work: the {{ 10000 + savingsMonthly(2000000, 10000, 8, 360) * 360 | usd }} you pay in, savings included, grows to $2,000,000. An 8% return is a high assumption, so test 6% too."
---

## The monthly amount for a fixed date

This calculator answers one question: how much do I need to save each month to reach my target by a chosen retirement age? You enter your age, the retirement age, what you have saved, the target and an expected return. It solves for the monthly deposit.

**To reach $1,000,000 by 65 starting from nothing at 7%, a 30-year-old needs {{ savingsMonthly(1000000, 0, 7, 420) | usd }} a month.** The calculator also shows the target in today's money, using an inflation rate you set (default 3%), so you can see what the goal is really worth.

## How the amount is worked out

The calculator works backwards from the target. Each month your balance grows at one twelfth of the annual return and your deposit is added at the end of the month. It finds the deposit that makes the balance equal the target on the chosen date. Two parts matter: the growth of what you already have, which compounds for the whole period, and the growth of each deposit, which compounds from the day it goes in. If your current savings alone grow to the target, the answer is "no monthly saving needed".

## The cost of waiting

<div class="stat-highlight">
  <span class="stat-number">{{ savingsMonthly(1000000, 0, 7, 240) / savingsMonthly(1000000, 0, 7, 480) | num(1) }}x</span>
  <span class="stat-text">is how much more a 45-year-old must save each month than a 25-year-old to reach $1,000,000 at 65, at 7%. The money has 20 years less to compound.</span>
</div>

Monthly saving needed to reach $1,000,000 at 65, from nothing, at 7%:

| Starting age | Monthly saving |
|---|---|
| 25 | {{ savingsMonthly(1000000, 0, 7, 480) | usd }} |
| 30 | {{ savingsMonthly(1000000, 0, 7, 420) | usd }} |
| 35 | {{ savingsMonthly(1000000, 0, 7, 360) | usd }} |
| 40 | {{ savingsMonthly(1000000, 0, 7, 300) | usd }} |
| 45 | {{ savingsMonthly(1000000, 0, 7, 240) | usd }} |

A 25-year-old needs {{ savingsMonthly(1000000, 0, 7, 480) / savingsMonthly(1000000, 0, 7, 360) * 100 | pct }} of what a 35-year-old needs. The cost of waiting is not linear, because each year of delay removes a year of compounding from everything you save.

## Choosing a target and a rate

Two numbers carry most of the uncertainty. A target is often set from spending: yearly spending divided by 4% gives a first estimate, so $40,000 a year points to {{ 40000 / 0.04 | usd }}. And the return is an assumption: the same $1,000,000 goal needs {{ savingsMonthly(1000000, 0, 5, 420) | usd }} a month at 5%, {{ savingsMonthly(1000000, 0, 7, 420) | usd }} at 7% and {{ savingsMonthly(1000000, 0, 9, 420) | usd }} at 9%, from age 30. Run your own case at a cautious rate as well as a hopeful one.

A common rule of thumb is to save about 15% of gross income for retirement including any employer contribution, and people aiming to retire early save much more. Treat percentages like that as starting points, not rules.

## What to do next

Enter your current savings, a realistic return and your retirement age. If the monthly amount is more than you can afford, try a later retirement age, a smaller target or a lower expected spend, and see the [retirement age calculator](/tools/income-and-planning/retirement-age/) for when a smaller deposit would get you there. A few years' delay often cuts the monthly amount by a lot.
