---
title: "Fixed vs Variable Rate Mortgage: Which Costs Less?"
slug: "fixed-vs-variable-rate-mortgage"
description: "UK fixed vs tracker mortgage on £250,000: today's payments, what a Bank Rate rise does to them, and the break-even rate that decides which costs less."
keywords:
  - "fixed vs variable rate mortgage"
  - "fixed vs tracker mortgage UK"
  - "mortgage rate comparison"
relatedTools:
  - "mortgage-payment"
  - "loan-amortization"
  - "mortgage-affordability"
verdict: "Fix if a payment rise would hurt, which for most borrowers it would. On a £250,000 repayment mortgage over 25 years, a 5-year fix at {{ rate('uk5yr') | pct(2) }} costs less than a tracker at Bank Rate plus 1 point unless Bank Rate averages below {{ rate('uk5yr') - 1 | pct(2) }} over the fix. Compare that break-even with where you expect Bank Rate to go from today's {{ rate('boe') | pct(2) }}. Take the tracker only if you could afford the payment after a 2-point rise and want to leave without an early repayment charge."
comparisonTable:
  - feature: "Monthly payment on £250,000 over 25 years (today)"
    option1: "{{ loanPayment(250000, rate('uk5yr'), 25) | gbp }} (5-year fix at {{ rate('uk5yr') | pct(2) }})"
    option2: "{{ loanPayment(250000, rate('boe') + 1, 25) | gbp }} (tracker at Bank Rate plus 1 point, {{ rate('boe') + 1 | pct(2) }} today)"
  - feature: "Payment if the rate rises 2 points after two years"
    option1: "Unchanged until the fix ends"
    option2: "{{ loanPayment(loanBalance(250000, rate('boe') + 1, 25, 24), rate('boe') + 3, 23) | gbp }}"
  - feature: "Rate risk"
    option1: "None during the fixed period"
    option2: "Payments move with the Bank Rate"
  - feature: "Early repayment charges"
    option1: "Usually apply during the fix, as a percentage of what you repay that often falls each year"
    option2: "Often none, especially on trackers"
  - feature: "Overpayments"
    option1: "Usually capped at a share of the balance each year; check your lender's limit"
    option2: "Usually allowed without limit"
  - feature: "Budgeting"
    option1: "Easy: the payment cannot change"
    option2: "Harder: you must plan for increases"
  - feature: "Falling onto the lender's standard rate"
    option1: "Revert-to rates average {{ rate('ukRevert') | pct(2) }}, so {{ loanPayment(250000, rate('ukRevert'), 25) - loanPayment(250000, rate('uk5yr'), 25) | gbp }} a month more than the fix"
    option2: "Not applicable; a tracker already follows Bank Rate"
faq:
  - question: "Is a fixed or a tracker mortgage cheaper?"
    answer: "It depends on where Bank Rate goes. Compare the fixed rate with the tracker's margin over Bank Rate. In the example here, the fix is {{ rate('uk5yr') | pct(2) }} and the tracker is Bank Rate plus 1 point, so the tracker is cheaper only if Bank Rate averages below {{ rate('uk5yr') - 1 | pct(2) }} for the whole fix. Bank Rate is {{ rate('boe') | pct(2) }} today."
  - question: "What happens to my payment if Bank Rate rises?"
    answer: "On a tracker, it rises soon after. On £250,000 over 25 years at Bank Rate plus 1 point, a 2-point rise after two years takes the monthly payment from {{ loanPayment(250000, rate('boe') + 1, 25) | gbp }} to {{ loanPayment(loanBalance(250000, rate('boe') + 1, 25, 24), rate('boe') + 3, 23) | gbp }}. On a fix it does not change until the fixed period ends."
  - question: "What happens when my fixed rate ends?"
    answer: "You move to the lender's standard variable (revert-to) rate unless you remortgage. The Bank of England's average quoted revert-to rate was {{ rate('ukRevert') | pct(2) }} ({{ rateSource('ukRevert') }}). On £250,000 over 25 years that is {{ loanPayment(250000, rate('ukRevert'), 25) - loanPayment(250000, rate('uk5yr'), 25) | gbp }} a month more than the 5-year fix average. Start comparing deals three to six months before the fix ends."
  - question: "Is a 2-year or 5-year fix better?"
    answer: "A 5-year fix gives certainty for longer and usually carries a larger early repayment charge. A 2-year fix brings your next decision forward and exposes you to the rates at that time. Lenders already price in the rate moves they expect, so choose by how long you need your payment to stay fixed, not by guessing the rate."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "Bank of England — Monetary Policy Summary, November 2026"
    url: "https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/november-2026"
  - name: "Bank of England — Quoted household interest rates (Bankstats series IUMBV34, IUMBV42, IUMTLMV), October 2026"
    url: "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2026&Dateto=now&SeriesCodes=IUMBV34,IUMBV42,IUMTLMV&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"
  - name: "Federal Reserve — FOMC statement, 28 October 2026"
    url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm"
---

## How each rate type works

**Fixed rate:** your interest rate stays the same for an agreed period, typically 2 or 5 years in the UK. If you fix at {{ rate('uk5yr') | pct(2) }}, you pay {{ rate('uk5yr') | pct(2) }} whatever happens to central bank rates. When the fix ends you move to the lender's standard variable (revert-to) rate unless you remortgage.

**Variable rate:** your rate moves with the market. In the UK that means a tracker (Bank of England Bank Rate plus a set margin) or a lender's standard variable rate (SVR). In the US, adjustable-rate mortgages (ARMs) fix for a set period, often 5, 7 or 10 years, and then adjust periodically, commonly every 6 or 12 months, based on an index such as SOFR. [US borrowers can fix for 15 to 30 years](/comparisons/15-year-vs-30-year-mortgage/), which is unusual elsewhere.

The figures on this page are in pounds for a UK repayment mortgage, using the Bank of England's average quoted 5-year fixed rate at 75% loan-to-value ({{ rate('uk5yr') | pct(2) }}, {{ rateSource('uk5yr') }}). They are benchmarks, not quotes.

## The maths: when does fixed save money?

Take £250,000 over 25 years. Compare a 5-year fix at {{ rate('uk5yr') | pct(2) }} with a tracker at Bank Rate plus 1 point. The 1-point margin is an example; real margins vary by lender and deal.

**Fixed at {{ rate('uk5yr') | pct(2) }}:** {{ loanPayment(250000, rate('uk5yr'), 25) | gbp }} a month. After 5 years you owe {{ loanBalance(250000, rate('uk5yr'), 25, 60) | gbp }}.

**Tracker at {{ rate('boe') + 1 | pct(2) }} today (Bank Rate {{ rate('boe') | pct(2) }} plus 1):** {{ loanPayment(250000, rate('boe') + 1, 25) | gbp }} a month.

But if Bank Rate rises 1 point after two years and another point after four, the tracker's payment goes to {{ loanPayment(loanBalance(250000, rate('boe') + 1, 25, 24), rate('boe') + 2, 23) | gbp }} and then {{ loanPayment(loanBalance(loanBalance(250000, rate('boe') + 1, 25, 24), rate('boe') + 2, 23, 24), rate('boe') + 3, 21) | gbp }}.

**The break-even:** the tracker costs less than the fix only if Bank Rate, on average over the fixed period, stays below the fixed rate minus your margin. Here that is {{ rate('uk5yr') | pct(2) }} minus 1 point, or {{ rate('uk5yr') - 1 | pct(2) }}, against today's Bank Rate of {{ rate('boe') | pct(2) }}. The fix comes out cheaper if Bank Rate averages above the break-even over the fixed period.

## Where rates are now

Central banks in the US and UK raised rates aggressively in 2022-23 to fight inflation, then began cutting in 2024. That direction has reversed. The Bank of England raised Bank Rate from 3.75% to 4% on 5 November 2026, citing inflationary pressure. The US Federal Reserve raised its target range to 3.75-4.00% on 16 September 2026 and held it there on 28 October, with two members voting for a further rise.

While rates are rising, a tracker or SVR payment goes up with each increase, and a fixed-rate borrower is protected until the fix ends. That does not make a fix automatically right: lenders price the rises they expect into fixed deals, so the real comparison is today's fixed rate against where you think Bank Rate will go over the fixed period, not against today's Bank Rate.

Short fixes (2 years) protect you for less time and bring your next decision forward. Long fixes (5 years or more) buy certainty for longer, usually with larger early repayment charges if you need to leave early.

## Break-even analysis: how to calculate yours

1. Take the fixed rate you are offered and subtract your tracker's margin. That is the Bank Rate at which the two cost the same. In the example, {{ rate('uk5yr') | pct(2) }} minus 1 point is {{ rate('uk5yr') - 1 | pct(2) }}, against today's Bank Rate of {{ rate('boe') | pct(2) }}.
2. Decide whether Bank Rate is likely to average above that level during the fix. If so, the fix is cheaper.
3. Remember what a tracker gives you in return: no early repayment charge and unlimited overpayments. If you expect to sell or remortgage within two or three years, those can be worth more than the rate.

Use a [mortgage payment calculator](/tools/debt-and-loans/mortgage-payment/) to model three scenarios: rates stay flat, rise 1 point and fall 1 point. [Compare total interest](/tools/debt-and-loans/loan-amortization/) across the full term. Where the gap is smallest, the decision matters least; where it is largest, that is how much you would be gambling. If you are unsure how much you can borrow, the [mortgage affordability calculator](/tools/debt-and-loans/mortgage-affordability/) applies a stress test.

## When to choose fixed

- You are stretching to afford the mortgage and cannot absorb a payment rise.
- You are on a tight budget with little room for surprise costs.
- You value predictability and want a payment that cannot change.
- Rates are rising and you want to hold today's level. Bank Rate rose from 3.75% to 4% on 5 November 2026.

## When to choose variable

- You could afford the payments if Bank Rate rose 2 to 3 points.
- Rate cuts are widely expected and you want to benefit at once.
- You plan to sell or remortgage within two or three years and want to avoid early repayment charges.
- You want to make large overpayments without a cap.
- The gap between fixed and tracker is wide, so the fixed premium is expensive.

## The UK remortgage cycle

Most UK borrowers remortgage every 2 to 5 years when a fix ends, so fixed versus variable is not a permanent decision. It is a 2 to 5 year bet on rate direction. Start comparing deals three to six months before your fix expires. Falling onto your lender's standard variable rate costs {{ loanPayment(250000, rate('ukRevert'), 25) - loanPayment(250000, rate('uk5yr'), 25) | gbp }} a month more than the 5-year fix average on £250,000. Set a calendar reminder for the day your fix ends, because a missed remortgage window is one of the most expensive mistakes a UK homeowner can make.
