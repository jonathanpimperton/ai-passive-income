---
name: "Compound Interest Calculator"
slug: "compound-interest"
category: "saving-and-growth"
description: "Compound interest calculator: growth with monthly deposits at the start or end of each month, five compounding options and a year-by-year table."
keywords:
  - "compound interest calculator"
  - "how to calculate compound interest"
  - "investment growth calculator"
  - "compound interest formula"
relatedTools:
  - "investment-return"
  - "savings-goal"
  - "retirement-savings"
  - "investment-fee"
  - "inflation"
  - "retirement-contribution"
  - "retirement-age"
affiliateContext: "Ready to grow your savings? Open a high-yield account"
affiliatePrograms:
  - "Betterment"
  - "Ally"
  - "Wealthfront"
lastUpdated: "2026-11-15"
dataSources:
  - name: "Compound interest formula — SEC Investor.gov"
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator"
  - name: "How compounding works — Investopedia"
    url: "https://www.investopedia.com/terms/c/compoundinterest.asp"
calculationMethod: "A = P(1 + r/n)^(nt), with deposits added every month"
faq:
  - question: "What is compound interest?"
    answer: "Compound interest is interest calculated on both the initial principal and the interest already added. Simple interest is calculated only on the principal. Over many years the difference is large: $10,000 at 7% a year, compounded monthly, becomes {{ compoundFV(10000, 0, 7, 30) | usd }} in 30 years, where simple interest would give {{ 10000 + 10000 * 0.07 * 30 | usd }}."
  - question: "How does compounding frequency affect my returns?"
    answer: "More frequent compounding pays slightly more, because interest joins the balance sooner. The gap is small: at 5% a year, $10,000 reaches {{ compoundFV(10000, 0, 5, 10, compounding=1) | usd }} in 10 years compounded annually and {{ compoundFV(10000, 0, 5, 10, compounding=365) | usd }} compounded daily. Over one year, daily compounding beats monthly by about {{ (compoundFV(10000, 0, 5, 1, compounding=365) - compoundFV(10000, 0, 5, 1)) / 100 | pct(2) }} of the balance."
  - question: "What is the compound interest formula?"
    answer: "A = P(1 + r/n)^(nt), where A is the final amount, P the principal, r the annual rate as a decimal, n the number of compounding periods a year and t the number of years. With monthly deposits the calculator adds each deposit to the balance every month and grows the balance at the equivalent monthly rate, (1 + r/n)^(n/12) - 1. With no deposits the result is exactly the formula."
  - question: "How much will $10,000 grow with compound interest?"
    answer: "It depends on the rate and the time. At 5% a year, compounded monthly, $10,000 grows to {{ compoundFV(10000, 0, 5, 10) | usd }} in 10 years and {{ compoundFV(10000, 0, 5, 20) | usd }} in 20 years with no further deposits. At 7% it grows to {{ compoundFV(10000, 0, 7, 10) | usd }} in 10 years and {{ compoundFV(10000, 0, 7, 20) | usd }} in 20."
  - question: "Is compound interest the same as APY?"
    answer: "APY (Annual Percentage Yield) is the interest you earn over one year including compounding. An account with a 5% annual rate compounded monthly has an APY of {{ compoundFV(10000, 0, 5, 1) / 100 - 100 | pct(2) }}. The rate you type into the calculator is the nominal annual rate before compounding (the APR), so enter a bank's APY only after converting it, or the result will run slightly high."
  - question: "Do my deposits compound at the same frequency as the interest?"
    answer: "No. Deposits are always monthly, and the compounding setting only changes the growth rate (annual, semi-annual, quarterly, monthly or daily). Choose 'Start of each month' if your deposit lands before that month's interest is added, or 'End of each month' if it lands after."
workedExamples:
  - title: "College graduate starting to save"
    inputs:
      initialInvestment: 1000
      monthlyContribution: 200
      interestRate: 7
      years: 30
    description: "A 22-year-old invests $1,000 and adds $200 a month at 7% a year, compounded monthly. By age 52 the balance is {{ compoundFV(1000, 200, 7, 30) | usd }}. Only {{ 1000 + 200 * 12 * 30 | usd }} of that came from deposits; {{ compoundEarned(1000, 200, 7, 30) | usd }} is interest."
  - title: "Comparing starting ages"
    inputs:
      initialInvestment: 5000
      monthlyContribution: 300
      interestRate: 7
      years: 30
    description: "Start with $5,000, add $300 a month at 7% a year, and compare 30 years (age 25 to 55) with 20 years (age 35 to 55). The 30-year saver ends with {{ compoundFV(5000, 300, 7, 30) | usd }}; the 20-year saver with {{ compoundFV(5000, 300, 7, 20) | usd }}. The extra 10 years add {{ compoundFV(5000, 300, 7, 30) - compoundFV(5000, 300, 7, 20) | usd }}, far more than the extra {{ 300 * 12 * 10 | usd }} deposited."
  - title: "High-yield savings account"
    inputs:
      initialInvestment: 10000
      monthlyContribution: 500
      interestRate: 5
      years: 5
    description: "Put $10,000 in a savings account at a 5% annual rate compounded monthly and add $500 a month. After 5 years the balance is {{ compoundFV(10000, 500, 5, 5) | usd }}, of which {{ compoundEarned(10000, 500, 5, 5) | usd }} is interest: a sound base for an emergency fund or a down payment. Savings rates move with the market, so treat 5% as an example, not a quote."
---

## Interest on your interest

With simple interest you earn only on your original deposit. With compound interest each period's interest joins the balance, and the next period earns on the larger balance. The base grows a little every cycle, and over decades the effect is large: **$10,000 at 7% a year, compounded monthly, becomes {{ compoundFV(10000, 0, 7, 30) | usd }} in 30 years.** Time matters more than the rate, because every extra year compounds on everything before it.

## How the calculator compounds

The formula behind a lump sum is **A = P(1 + r/n)^(nt)**, where:

- **A** = final amount
- **P** = principal (your starting amount)
- **r** = annual interest rate (as a decimal)
- **n** = number of times interest compounds per year
- **t** = number of years

The calculator offers five compounding choices: annually, semi-annually, quarterly, monthly and daily. Deposits are always monthly. The compounding choice sets the growth rate, applied each month as the equivalent monthly rate (1 + r/n)^(n/12) - 1, so a balance held for a whole year grows by exactly (1 + r/n)^n. You also choose whether each deposit goes in at the start or the end of the month. The year-by-year table opens into months.

## Why the first years feel slow

<div class="stat-highlight">
  <span class="stat-number">{{ (compoundFV(10000, 0, 7, 30) - compoundFV(10000, 0, 7, 20)) / compoundEarned(10000, 0, 7, 30) * 100 | pct }}</span>
  <span class="stat-text">of the growth on $10,000 over 30 years at 7% arrives in the final 10 years, because the balance being compounded keeps getting bigger.</span>
</div>

Early growth looks linear and a little disappointing. At 7%, compounded monthly, $10,000 is worth {{ compoundFV(10000, 0, 7, 5) | usd }} after 5 years, {{ compoundFV(10000, 0, 7, 10) | usd }} after 10, {{ compoundFV(10000, 0, 7, 20) | usd }} after 20 and {{ compoundFV(10000, 0, 7, 30) | usd }} after 30. The balance doubles in roughly {{ yearsToTarget(10000, 0, 7, 20000) | num(1) }} years, and each doubling adds more dollars than the one before.

This is why starting early beats starting big. A saver who puts in $200 a month for only 10 years, from 22 to 32, and then stops, has {{ compoundFV(compoundFV(0, 200, 7, 10), 0, 7, 30) | usd }} at 62. A saver who starts at 32 and puts in $200 a month for the whole 30 years has {{ compoundFV(0, 200, 7, 30) | usd }}. The first saver paid in {{ 200 * 12 * 10 | usd }}; the second paid in {{ 200 * 12 * 30 | usd }}.

> **Example:** at 7% a year, $10,000 left alone earns {{ compoundEarned(10000, 0, 7, 20) | usd }} in its first 20 years and {{ compoundFV(10000, 0, 7, 30) - compoundFV(10000, 0, 7, 20) | usd }} in the next 10.

## Compounding frequency: how much does it matter?

Here is $10,000 at 5% over 10 years with each option the calculator offers:

| Frequency | Final balance | Gain vs annual |
|---|---|---|
| Annually | {{ compoundFV(10000, 0, 5, 10, compounding=1) | usd }} | n/a |
| Semi-annually | {{ compoundFV(10000, 0, 5, 10, compounding=2) | usd }} | {{ compoundFV(10000, 0, 5, 10, compounding=2) - compoundFV(10000, 0, 5, 10, compounding=1) | usd }} |
| Quarterly | {{ compoundFV(10000, 0, 5, 10, compounding=4) | usd }} | {{ compoundFV(10000, 0, 5, 10, compounding=4) - compoundFV(10000, 0, 5, 10, compounding=1) | usd }} |
| Monthly | {{ compoundFV(10000, 0, 5, 10) | usd }} | {{ compoundFV(10000, 0, 5, 10) - compoundFV(10000, 0, 5, 10, compounding=1) | usd }} |
| Daily | {{ compoundFV(10000, 0, 5, 10, compounding=365) | usd }} | {{ compoundFV(10000, 0, 5, 10, compounding=365) - compoundFV(10000, 0, 5, 10, compounding=1) | usd }} |

Annual versus monthly is worth {{ compoundFV(10000, 0, 5, 10) - compoundFV(10000, 0, 5, 10, compounding=1) | usd }} over a decade. Monthly versus daily is worth {{ compoundFV(10000, 0, 5, 10, compounding=365) - compoundFV(10000, 0, 5, 10) | usd }}. Compare the rate and the fees before the compounding schedule.

## Deposit timing: start or end of the month

A deposit at the start of the month earns that month's interest; one at the end does not. With $500 a month at 7% for 30 years, start-of-month deposits finish {{ compoundFV(0, 500, 7, 30, timing=beginning) - compoundFV(0, 500, 7, 30) | usd }} ahead of end-of-month deposits ({{ compoundFV(0, 500, 7, 30, timing=beginning) | usd }} against {{ compoundFV(0, 500, 7, 30) | usd }}). It costs nothing to choose the earlier date, but it is small next to saving more.

## Two changes worth testing

At the calculator's starting numbers ($10,000, $200 a month, 7%, 20 years) the result is {{ compoundFV(10000, 200, 7, 20) | usd }}. Try each change on its own:

- **$100 more a month** gives {{ compoundFV(10000, 300, 7, 20) | usd }}, a gain of {{ compoundFV(10000, 300, 7, 20) - compoundFV(10000, 200, 7, 20) | usd }}.
- **One point more return** (8% instead of 7%) gives {{ compoundFV(10000, 200, 8, 20) | usd }}, a gain of {{ compoundFV(10000, 200, 8, 20) - compoundFV(10000, 200, 7, 20) | usd }}.

At these numbers the extra deposit is worth more than the extra point, and unlike a return it is under your control.

## Key terms

- **Principal:** your starting deposit or investment amount.
- **APR (Annual Percentage Rate):** the stated annual rate before compounding. This is the rate you enter.
- **APY (Annual Percentage Yield):** the effective annual rate after compounding. A 5% APR compounded monthly is a {{ compoundFV(10000, 0, 5, 1) / 100 - 100 | pct(2) }} APY.
- **Rule of 72:** divide 72 by the rate to estimate the years to double your money. At 7% that is {{ 72 / 7 | num(1) }} years.

## Mistakes that cost money

1. **Ignoring inflation.** A 5% return with 3% inflation is about {{ (1.05 / 1.03 - 1) * 100 | pct1 }} real growth.
2. **Withdrawing early.** A withdrawal costs the amount and all the interest it would have earned. $10,000 left alone for 20 years at 7% earns {{ compoundEarned(10000, 0, 7, 20) | usd }}.
3. **Trusting an average.** A year of +50% followed by -50% averages 0% but leaves {{ 100 * 1.5 * 0.5 | usd }} of every $100. Steady returns compound better than volatile ones with the same average.
4. **Forgetting fees.** Fees compound against you. On $500 a month for 30 years, 6% instead of 7% leaves {{ compoundFV(0, 500, 7, 30) - compoundFV(0, 500, 6, 30) | usd }} less. The [investment fee calculator](/tools/saving-and-growth/investment-fee/) shows the effect of a fund's expense ratio.

## What to do next

Enter your own starting amount, monthly deposit and rate, then change one input at a time. If your savings sit in an account paying far below the going rate for savings accounts, compare rates, and keep money you need within a few years in cash or something equally safe rather than in investments that can fall.
