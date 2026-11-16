---
name: "Debt Payoff Calculator"
slug: "debt-payoff"
category: "debt-and-loans"
description: "Debt payoff calculator comparing snowball and avalanche: your debt-free date, the order debts clear, and the total interest each strategy costs."
keywords:
  - "debt payoff calculator"
  - "debt repayment calculator"
  - "snowball vs avalanche calculator"
  - "how long to pay off debt"
  - "debt free date"
relatedTools:
  - "credit-card-payoff"
  - "loan-amortization"
  - "emergency-fund"
  - "savings-goal"
  - "net-worth"
affiliateContext: "Ready to pay off debt faster? Consolidate with a lower rate"
affiliatePrograms:
  - "SoFi"
calculationMethod: "Month-by-month simulation of snowball (smallest balance first) and avalanche (highest rate first), with freed-up minimums rolled onto the next debt"
faq:
  - question: "What is the snowball vs avalanche method?"
    answer: "Both keep paying the minimum on every debt and send all spare money to one target debt. Snowball targets the smallest balance first, for quick wins. Avalanche targets the highest interest rate first, to minimise interest. Avalanche never costs more interest than snowball, but the gap can be small or zero. With the calculator's starting debts ($6,500 at 22.99%, $3,500 at 11.5% and $12,000 at 6.5%, plus $200 extra a month) avalanche costs {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest | usd(2) }} in interest and snowball {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball').interest | usd(2) }}, a difference of {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball').interest - debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest | usd(2) }}."
  - question: "How long will it take to pay off my debt?"
    answer: "It depends on your balances, rates and how much you pay. The calculator shows the debt-free date for the strategy you choose, the month each debt clears and the total interest. Small increases in payments can take months or years off: a $15,000 balance at {{ 22 | pct }} APR takes {{ debtPayoff('15000@22/500', 0, 'avalanche').months | months }} at $500 a month and {{ debtPayoff('15000@22/700', 0, 'avalanche').months | months }} at $700."
  - question: "What if my payments never clear a debt?"
    answer: "If a debt's interest each month is at least what you pay on it, the balance never falls. The calculator then says the debt is never repaid and shows no totals, because any total it printed would be made up. If balances do fall but are not cleared within 50 years (600 months), it says so and covers only those 50 years. Raise the payment on that debt, or the extra payment, until the result becomes a date."
  - question: "Should I pay off debt or invest?"
    answer: "Paying off a debt is a guaranteed return equal to its interest rate, while investment returns are not guaranteed. A card at {{ 22.99 | pct(2) }} APR is a poor debt to keep while investing. Low-rate debt is a closer call, and an employer 401(k) match is the exception: a 50% match is an instant 50% return on the matched money, so take the match first. The pay off debt vs invest comparison walks through the trade-off with numbers."
  - question: "Does making extra payments really make a difference?"
    answer: "Yes, and the effect is larger the higher the rate. On $20,000 at {{ 22 | pct }} APR with a fixed $400 payment, you are debt-free in {{ debtPayoff('20000@22/400', 0, 'avalanche').months | months }} and pay {{ debtPayoff('20000@22/400', 0, 'avalanche').interest | usd }} in interest. Paying $600 instead takes {{ debtPayoff('20000@22/600', 0, 'avalanche').months | months }} and costs {{ debtPayoff('20000@22/600', 0, 'avalanche').interest | usd }}: {{ debtPayoff('20000@22/400', 0, 'avalanche').interest - debtPayoff('20000@22/600', 0, 'avalanche').interest | usd }} less interest."
  - question: "What is a good debt-to-income ratio?"
    answer: "Many mortgage lenders use guidelines of about 28% of gross income for housing and 36% for all debts together. Limits vary by lender and loan type, so treat them as a starting point. The mortgage affordability calculator applies the 28/36 guideline to show how a lower debt balance raises the price you can borrow for."
workedExamples:
  - title: "One card, two payment levels"
    inputs:
      totalDebt: 15000
      interestRate: 22
      monthlyPayment: 500
    description: "A $15,000 card balance at {{ 22 | pct }} APR paid at $500 a month clears in {{ debtPayoff('15000@22/500', 0, 'avalanche').months | months }} with {{ debtPayoff('15000@22/500', 0, 'avalanche').interest | usd }} of interest. Raising the payment to $700 clears it in {{ debtPayoff('15000@22/700', 0, 'avalanche').months | months }} and cuts the interest to {{ debtPayoff('15000@22/700', 0, 'avalanche').interest | usd }}, a saving of {{ debtPayoff('15000@22/500', 0, 'avalanche').interest - debtPayoff('15000@22/700', 0, 'avalanche').interest | usd }}."
  - title: "Three debts: snowball vs avalanche"
    inputs:
      debts: "credit card $6,500 at 22.99% (minimum $195), personal loan $3,500 at 11.5% ($120), car loan $12,000 at 6.5% ($350)"
      extraPayment: 200
    description: "With $200 extra a month on top of the minimums ({{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').monthlyOutlay | usd }} a month in all), both strategies finish in {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').months | months }}. Avalanche pays the 22.99% card first and clears it in month {{ debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche', 1) | int }}, then the personal loan in month {{ debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche', 2) | int }}. Snowball pays the smallest balance, the personal loan, first and clears it in month {{ debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball', 2) | int }}, then the card in month {{ debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball', 1) | int }}. Total interest is {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest | usd(2) }} for avalanche and {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball').interest | usd(2) }} for snowball."
  - title: "Student loan payoff"
    inputs:
      totalDebt: 45000
      interestRate: 5.5
      monthlyPayment: 600
    description: "A $45,000 loan at {{ 5.5 | pct(auto) }} paid at $600 a month clears in {{ debtPayoff('45000@5.5/600', 0, 'avalanche').months | months }} with {{ debtPayoff('45000@5.5/600', 0, 'avalanche').interest | usd }} of interest. Adding $100 a month clears it in {{ debtPayoff('45000@5.5/700', 0, 'avalanche').months | months }} and saves {{ debtPayoff('45000@5.5/600', 0, 'avalanche').interest - debtPayoff('45000@5.5/700', 0, 'avalanche').interest | usd }} of interest."
---

## Which debt to pay first, and what it costs

A debt payoff calculator takes your balances, rates and minimum payments, adds the extra you can afford, and shows the month you are debt-free and the interest you pay on the way. Its main job is to compare strategies for the order of payment: snowball and avalanche.

Carrying debt is compound interest working against you, at the debt's rate instead of an investment's. The calculator makes the cost visible by simulating each month for every debt and rolling the minimum of each cleared debt onto the next, so your total monthly payment stays constant.

## Snowball vs avalanche

**Avalanche** ranks debts by interest rate, highest first. You pay the minimum on everything and put all extra money on the highest-rate debt, then roll its payment to the next. It minimises total interest.

**Snowball** ranks debts by balance, smallest first. You clear the smallest debt quickly, which gives a win, then roll its payment onward. It can cost more interest, though not always.

<div class="stat-highlight">
  <span class="stat-number">{{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'snowball').interest - debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest | usd }}</span>
  <span class="stat-text">more interest for snowball than avalanche on the calculator's starting debts with $200 extra a month. Both finish in the same {{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').months | months }}.</span>
</div>

The gap depends on your debts. When the smallest balance also carries the highest rate, both strategies pay the debts in the same order and the result is identical. The calculator reports the order each strategy clears them, so you can see which case you are in. You can also read a fuller comparison in [snowball vs avalanche](/comparisons/snowball-vs-avalanche-debt/).

> **Tip:** if you cannot decide, start with avalanche and switch if your motivation fades. A structured plan beats ad hoc payments either way.

## How extra payments change the result

Every extra dollar reduces the balance that future interest is charged on. On $20,000 at {{ 22 | pct }} APR with a fixed $400 payment you are debt-free in {{ debtPayoff('20000@22/400', 0, 'avalanche').months | months }} and pay {{ debtPayoff('20000@22/400', 0, 'avalanche').interest | usd }} in interest. A fixed $600 payment finishes in {{ debtPayoff('20000@22/600', 0, 'avalanche').months | months }} and pays {{ debtPayoff('20000@22/600', 0, 'avalanche').interest | usd }}, so the extra $200 a month saves {{ debtPayoff('20000@22/400', 0, 'avalanche').interest - debtPayoff('20000@22/600', 0, 'avalanche').interest | usd }}.

## Pay off debt or invest?

Compare the debt's interest rate with the return you could reasonably expect after tax, remembering that paying off a debt earns its rate with certainty and investing does not.

- **High-rate card debt:** pay it first. No investment reliably beats a card APR.
- **Low-rate debt:** a closer call. For a mortgage you can compare your rate with the current market rate, {{ rate('us30') | pct(2) }} for a 30-year US mortgage ({{ rateSource('us30') }}).
- **An employer 401(k) match:** take it before anything else. A 50% match is an instant 50% return and a 100% match doubles the money.

The [pay off debt vs invest comparison](/comparisons/pay-off-debt-vs-invest/) works through the trade-off with figures.

## When this calculator helps

- You have several debts and need to choose which to attack first.
- You want a debt-free date to plan around.
- You are weighing an extra payment and want the saving in dollars.
- You have a debt whose payment barely covers the interest, and want to see whether it ever clears.

## Mistakes to avoid

1. **Paying only minimums.** Card minimums are set to keep the balance outstanding; the credit card payoff calculator shows what that costs.
2. **No cash cushion.** Without some savings, one surprise bill sends you back to the card. See the emergency fund calculator.
3. **Closing a paid-off card straight away.** It can lower your credit score by cutting your available credit.
4. **Choosing the plan you will not follow.** A completed plan beats an abandoned optimal one.

## What to do next

Enter every debt with its balance, APR and minimum, set the extra amount, and compare both strategies. If the totals are close, pick the one whose order motivates you.
