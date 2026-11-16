---
title: "Pay Off Debt vs Invest: Which Should You Do First?"
slug: "pay-off-debt-vs-invest"
description: "Pay off debt or invest? Worked numbers at 22%, 7% and 3.5% on $20,000, the after-tax break-even rate, and why the employer match comes first."
keywords:
  - "pay off debt or invest"
  - "debt vs investing calculator"
  - "should I pay off debt before investing"
relatedTools:
  - "debt-payoff"
  - "credit-card-payoff"
  - "investment-return"
  - "compound-interest"
verdict: "Take the employer match first. Then pay off debt costing more than about 7% before investing, invest first when the debt costs under about 5%, and split the money in between. On $20,000 with $500 a month for five years, investing first leaves you {{ payoffBalance(20000, 22, 500, 60) + compoundFV(0, 500 - 20000 * 22 / 1200, 7, 5) - 20000 | abs | usd }} worse off than paying off a 22% card, but {{ compoundFV(0, 500 - 20000 * 3.5 / 1200, 7, 5) - 20000 - compoundFV(0, 500, 7, (60 - loanPayoff(20000, 3.5, 500).months) / 12) | usd }} better off than paying off a 3.5% loan."
comparisonTable:
  - feature: "Return you earn"
    option1: "Guaranteed: equals the debt's interest rate"
    option2: "Not guaranteed: stock returns vary widely from year to year"
  - feature: "Net position after 5 years, $20,000 at 22%"
    option1: "{{ -payoffBalance(20000, 22, 500, 60) | usd }}"
    option2: "{{ compoundFV(0, 500 - 20000 * 22 / 1200, 7, 5) - 20000 | usd }}"
  - feature: "Net position after 5 years, $20,000 at 7%"
    option1: "{{ compoundFV(0, 500, 7, (60 - loanPayoff(20000, 7, 500).months) / 12) | usd }}"
    option2: "{{ compoundFV(0, 500 - 20000 * 7 / 1200, 7, 5) - 20000 | usd }}"
  - feature: "Net position after 5 years, $20,000 at 3.5%"
    option1: "{{ compoundFV(0, 500, 7, (60 - loanPayoff(20000, 3.5, 500).months) / 12) | usd }}"
    option2: "{{ compoundFV(0, 500 - 20000 * 3.5 / 1200, 7, 5) - 20000 | usd }}"
  - feature: "Risk"
    option1: "None: paying down debt is certain"
    option2: "Markets can fall 20% or more in a year"
  - feature: "Liquidity"
    option1: "None: the money is gone"
    option2: "High: investments can be sold"
  - feature: "Tax advantages"
    option1: "None, unless the interest is deductible"
    option2: "401(k), IRA, pension and ISA tax breaks"
  - feature: "Best when the debt rate is..."
    option1: "Above about 7%"
    option2: "Below about 5%"
affiliateContext: "Start investing once debt is cleared"
affiliatePrograms:
  - "Betterment"
  - "SoFi"
faq:
  - question: "Should I pay off debt or invest first?"
    answer: "Compare the debt's rate with what you can expect to keep from investing after tax. Above about 7%, pay the debt first. Below about 5%, invest first. Between the two, split the money. Whatever the rate, capture any employer match on your 401(k) or workplace pension before doing either."
  - question: "Is it better to pay off a student loan or invest?"
    answer: "It depends on the rate. Student loan rates vary by loan and by year, so check yours. If it falls between about 5% and 7%, the gap with investing is small and a guaranteed return from paying the loan is competitive. Above 7% pay it first. Below 5% investing usually comes out ahead."
  - question: "Does the employer match come before paying off credit card debt?"
    answer: "Yes. A match of 50% on contributions up to 6% of your salary is an immediate 50% return, which no credit card rate matches. Put in enough to get the full match, then send everything else to the high-rate debt."
  - question: "How much does waiting to invest cost?"
    answer: "Less than it looks if you keep servicing the debt. On $500 a month at 7%, investing for all 30 years gives {{ compoundFV(0, 500, 7, 30) | usd }}. If a $20,000 loan at 4% is paid first, the same $500 a month ends 30 years with {{ compoundFV(0, 500, 7, (360 - loanPayoff(20000, 4, 500).months) / 12) | usd }}. If you instead pay only the loan's interest and invest the rest, you end with {{ compoundFV(0, 500 - 20000 * 4 / 1200, 7, 30) | usd }} but still owe $20,000."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "IRS — Topic no. 409, Capital gains and losses"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS — 2026 contribution limits (IR-2025-111)"
    url: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500"
  - name: "GOV.UK — Individual Savings Accounts"
    url: "https://www.gov.uk/individual-savings-accounts"
  - name: "GOV.UK — Workplace pensions"
    url: "https://www.gov.uk/workplace-pensions"
---

## The simple math

The decision comes down to one comparison: your debt's interest rate against what you can expect to keep from investing after tax.

[A credit card at 22% APR](/tools/debt-and-loans/credit-card-payoff/)? Pay it off. No legal investment reliably returns 22% a year, so that debt costs more than any portfolio could earn.

A mortgage at 3.5%? Invest. Over long periods stock returns have historically beaten a rate like that, though not every year.

The gray zone sits between about 5% and 7%. Car loans, student loans and personal loans can land here. At these rates the edge of investing is slim and the guaranteed return of paying off debt is attractive.

## Where the 7% line comes from

Take your debt rate and compare it with your expected after-tax investment return. Suppose you expect 8% a year before tax. In a 401(k), IRA or pension the whole 8% compounds untaxed until you withdraw it. In a taxable account, long-term gains and qualified dividends are taxed at 15% for most people, and 0% on taxable income up to {{ usFact('ltcgZeroTop') | usd }} (single, {{ taxYear('us') }}), so an 8% return keeps about {{ 8 * (1 - 15 / 100) | pct1 }} if it were all taxed at 15%, and more when gains are deferred until you sell. That puts the dividing line around 7%, and it is why this page treats debt above about 7% as debt to pay first.

Interest and short-term gains are taxed as ordinary income at your bracket rate, so the 7% line is for long-term stock returns. It is a rule of thumb, not a calculation for your tax return.

Run both paths through the [debt payoff calculator](/tools/debt-and-loans/debt-payoff/) and the [investment return calculator](/tools/saving-and-growth/investment-return/) to see the dollars for your situation.

## Three rates, one budget: a worked example

You have $20,000 of debt and $500 a month, over five years, and any money you invest earns 7%. Compare two plans:

- **Pay first:** send the full $500 to the debt; once it is cleared, invest the $500.
- **Invest first:** pay only the debt's monthly interest, and invest the rest from day one.

| Debt rate | Pay first | Invest first |
|---|---|---|
| 22% (credit card) | {{ -payoffBalance(20000, 22, 500, 60) | usd }} | {{ compoundFV(0, 500 - 20000 * 22 / 1200, 7, 5) - 20000 | usd }} |
| 7% (car loan) | {{ compoundFV(0, 500, 7, (60 - loanPayoff(20000, 7, 500).months) / 12) | usd }} | {{ compoundFV(0, 500 - 20000 * 7 / 1200, 7, 5) - 20000 | usd }} |
| 3.5% (cheap loan) | {{ compoundFV(0, 500, 7, (60 - loanPayoff(20000, 3.5, 500).months) / 12) | usd }} | {{ compoundFV(0, 500 - 20000 * 3.5 / 1200, 7, 5) - 20000 | usd }} |

A position is what you hold minus what you still owe, after five years. The higher number is the better plan.

**At 22% APR:** $500 a month does not even clear the debt within five years. Payoff takes {{ loanPayoff(20000, 22, 500).months | months }} and costs {{ loanPayoff(20000, 22, 500).interest | usd }} in interest, and at the five-year mark you would still owe {{ payoffBalance(20000, 22, 500, 60) | usd }}. Investing instead is worse: after covering the {{ 20000 * 22 / 100 / 12 | usd }} of monthly interest, only {{ 500 - 20000 * 22 / 1200 | usd }} is left to invest. Pay the debt off, decisively.

**At 7% APR:** the debt clears in {{ loanPayoff(20000, 7, 500).months | months }} at a cost of {{ loanPayoff(20000, 7, 500).interest | usd }} in interest, and then the freed-up $500 gets invested for the rest of the five years. Investing from day one while servicing the interest finishes within a few hundred dollars of that. When the debt rate equals your expected return it is a dead heat on paper, and the guaranteed return of paying the debt usually wins the tiebreak.

**At 3.5% APR:** paying the debt first ends the five years with no debt and {{ compoundFV(0, 500, 7, (60 - loanPayoff(20000, 3.5, 500).months) / 12) | usd }} invested. Investing first ends with {{ compoundFV(0, 500 - 20000 * 3.5 / 1200, 7, 5) | usd }} invested against the $20,000 still owed, a position of {{ compoundFV(0, 500 - 20000 * 3.5 / 1200, 7, 5) - 20000 | usd }}. Cheap debt loses to the market.

## Does waiting to invest cost a fortune?

Time is on investing's side. [$500 a month at 7% for 30 years](/tools/saving-and-growth/compound-interest/) grows to **{{ compoundFV(0, 500, 7, 30) | usd }}**. But that figure assumes no debt, so it overstates what delay costs. Compare two plans with the same $500 a month and a $20,000 loan at 4%:

- **Pay the loan first,** then invest $500 a month for the rest of 30 years: **{{ compoundFV(0, 500, 7, (360 - loanPayoff(20000, 4, 500).months) / 12) | usd }}**, with no debt left.
- **Pay only the loan's interest** ({{ 20000 * 4 / 1200 | usd }} a month) and invest the rest for all 30 years: **{{ compoundFV(0, 500 - 20000 * 4 / 1200, 7, 30) | usd }}**, minus the $20,000 you still owe, so **{{ compoundFV(0, 500 - 20000 * 4 / 1200, 7, 30) - 20000 | usd }}**.

The gap is {{ compoundFV(0, 500 - 20000 * 4 / 1200, 7, 30) - 20000 - compoundFV(0, 500, 7, (360 - loanPayoff(20000, 4, 500).months) / 12) | usd }} in favor of investing first, over 30 years. That is the real price of paying off cheap debt early, and why low-rate debt rarely justifies postponing investing entirely. It assumes a 7% return that is not guaranteed.

## The exception that comes first: employer match

If your employer matches 401(k) contributions, contribute at least enough to get the full match before paying extra on any debt, even high-interest debt.

An employer matching 50% of contributions up to 6% of salary gives you an instant 50% return on that money. No credit card charges 50% APR, so the match is the best guaranteed return available to most workers.

The order for most people with debt:

1. Contribute to your 401(k) or pension up to the employer match.
2. Build a small emergency buffer ($1,000-$2,000).
3. [Attack debt above about 7% aggressively](/comparisons/snowball-vs-avalanche-debt/).
4. Once the high-rate debt is gone, split extra money between medium-rate debt and investing.

In the UK, workplace pension auto-enrolment works the same way: your employer pays in at least 3% of qualifying earnings on top of your 5%. Don't opt out to pay debt, because you would be turning down part of your pay.

## The psychological factor

Math says invest if your debt rate is 5% and markets average 8%. But people are not spreadsheets. Carrying debt causes stress for many people, and paying off a loan, even a low-rate one, removes a monthly obligation and a mental burden.

If debt keeps you up at night, the advantage of investing a few extra percentage points may not be worth the anxiety. Peace of mind has real value, even though it does not compound.

## Tax-advantaged accounts beyond the match

After capturing the match and clearing high-rate debt, you face another choice: fill tax-advantaged accounts (401(k), IRA, ISA, SIPP) or keep paying down medium-rate debt.

Contribution limits do not roll over. The 2026 employee limit for a 401(k) is {{ usFact('k401Limit', year=2026) | usd }}, and the UK ISA allowance is £20,000 a year; space you do not use in a year is gone.

For debt below about 5%, using these accounts usually wins. The tax saving alone, immediate tax relief on pension contributions or decades of tax-free growth in an ISA, tips the balance toward investing.

## The decision framework

**Pay debt first when:**

- The interest rate is above about 7%.
- The debt is variable-rate and could rise.
- It causes significant stress or limits major life decisions.
- You are unlikely to invest consistently while carrying it.

**Invest first when:**

- The debt rate is below about 5%.
- You have an employer match you are not capturing.
- Tax-advantaged limits would otherwise be wasted.
- The debt is fixed-rate with decades left, like a low-rate mortgage.

**Split the difference when:**

- The debt rate is between about 5% and 7%.
- You have both high-rate and low-rate debts: attack the expensive ones and invest alongside the cheap ones.
