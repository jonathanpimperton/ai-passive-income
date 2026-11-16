---
name: "Credit Card Payoff Calculator"
slug: "credit-card-payoff"
category: "debt-and-loans"
description: "Credit card payoff calculator: months until your balance clears and the interest extra payments save, with fixed, percentage and interest-plus minimums."
keywords:
  - "credit card payoff calculator"
  - "minimum payment calculator"
  - "credit card interest calculator"
  - "how long to pay off credit card"
  - "credit card debt calculator"
  - "extra payment calculator"
  - "credit card balance payoff"
relatedTools:
  - "debt-payoff"
  - "loan-amortization"
  - "emergency-fund"
  - "savings-goal"
  - "net-worth"
affiliateContext: "Ready to pay off your card faster? A balance transfer or consolidation loan could cut your rate"
affiliatePrograms:
  - "SoFi"
  - "LendingTree"
calculationMethod: "Month-by-month simulation: interest on the opening balance, then the minimum (fixed, % of balance or interest plus %) plus any extra, until the balance clears or 50 years pass"
dataSources:
  - name: "FCA Handbook CONC 6.7: minimum credit card repayments (UK)"
    url: "https://www.handbook.fca.org.uk/handbook/CONC/6/7.html"
  - name: "FFIEC credit card account management guidance, January 2003 (US)"
    url: "https://www.fdic.gov/news/financial-institution-letters/2003/FIL0302a.html"
faq:
  - question: "Why does it take so long to pay off a credit card with minimum payments?"
    answer: "Most of each minimum payment goes to interest. At {{ 22.99 | pct(2) }} APR on $5,000, the first month's interest is {{ cardPayoff(5000, 22.99, 100).firstInterest | usd(2) }}, so a $100 payment reduces the balance by only {{ 100 - cardPayoff(5000, 22.99, 100).firstInterest | usd(2) }}. Paying $100 a month takes {{ cardPayoff(5000, 22.99, 100).months | months }} and costs {{ cardPayoff(5000, 22.99, 100).interest | usd }} in interest. Issuers set minimums low because they earn more the longer a balance is carried."
  - question: "What is a balance transfer and does it help?"
    answer: "A balance transfer moves your debt to a card with a 0% introductory APR, which gives you a window to pay down principal without interest. Check three things in the offer: the length of the 0% period, the transfer fee and the rate that applies to what is left afterwards. As an example, a 3% fee on $5,000 is {{ 5000 * 0.03 | usd }}, so the transfer pays off only if you clear the balance, or most of it, before the regular APR returns."
  - question: "How is credit card interest calculated?"
    answer: "Issuers charge interest on your balance each day, but for payoff planning the calculator uses the standard monthly approximation, APR divided by 12, charged on the balance at the start of each month. At {{ 22.99 | pct(2) }} APR the monthly rate is {{ 22.99 / 12 | pct(3) }}, which is {{ cardPayoff(5000, 22.99, 100).firstInterest | usd }} on a $5,000 balance in month one. If your issuer compounds daily at a quoted {{ 22.99 | pct(2) }} APR, entering {{ dailyCompoundingApr(22.99) | pct(2) }} matches its charges more closely."
  - question: "Should I pay more than the minimum?"
    answer: "Almost always. On $5,000 at {{ 22.99 | pct(2) }} APR, raising a $100 fixed payment to $150 cuts the payoff from {{ cardPayoff(5000, 22.99, 100).months | months }} to {{ cardPayoff(5000, 22.99, 150).months | months }} and saves {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 150).interest | usd }} in interest. The sooner you add the extra, the more you save, because less principal is left to accrue interest."
  - question: "What are the three minimum payment types in the calculator?"
    answer: "Fixed amount: the same payment every month. % of balance: a share of the balance, never below a floor (the calculator uses $25 or €25, or £5 in pounds), so the payment shrinks as the balance does. Interest plus %: the month's interest plus a share of the balance, which always reduces the balance. UK rules require at least interest plus 1% (FCA CONC 6.7), and many US issuers use a similar formula. Check your statement for the formula your card uses."
  - question: "Which credit card should I pay off first?"
    answer: "Pay the card with the highest APR first (the avalanche method), because that minimises total interest. Make the minimum payment on every card, put every spare dollar on the highest-rate card, then roll its payment onto the next one. If you need quick wins to stay motivated, the snowball method (smallest balance first) also works. The debt payoff calculator compares the two for your own cards."
  - question: "Does closing a paid-off credit card help?"
    answer: "Usually not. Closing a card reduces your total available credit, which can raise your credit utilisation and lower your score. Keep a paid-off card open with a zero balance. If it carries an annual fee, ask the issuer to switch you to a no-fee version instead of closing it."
workedExamples:
  - title: "$2,000 balance at 19.99% APR"
    inputs:
      balance: 2000
      apr: 19.99
      minimumPayment: "$50/month fixed"
      extraPayment: 0
    description: "A $2,000 balance at {{ 19.99 | pct(2) }} APR with a fixed $50 payment takes {{ cardPayoff(2000, 19.99, 50).months | months }} to clear, with {{ cardPayoff(2000, 19.99, 50).interest | usd }} in interest. Adding $25 a month ($75 in total) clears it in {{ cardPayoff(2000, 19.99, 75).months | months }} and saves {{ cardPayoff(2000, 19.99, 50).interest - cardPayoff(2000, 19.99, 75).interest | usd }} of interest."
  - title: "$5,000 balance at 22.99% APR"
    inputs:
      balance: 5000
      apr: 22.99
      minimumPayment: "$100/month fixed"
      extraPayment: "$50 extra"
    description: "A $5,000 balance at {{ 22.99 | pct(2) }} APR with a fixed $100 payment costs {{ cardPayoff(5000, 22.99, 100).interest | usd }} in interest over {{ cardPayoff(5000, 22.99, 100).months | months }}. Adding $50 a month ($150 in total) clears it in {{ cardPayoff(5000, 22.99, 150).months | months }} with {{ cardPayoff(5000, 22.99, 150).interest | usd }} of interest: {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 150).interest | usd }} saved and {{ cardPayoff(5000, 22.99, 100).months - cardPayoff(5000, 22.99, 150).months | months }} sooner."
  - title: "$15,000 balance at 24.99% APR"
    inputs:
      balance: 15000
      apr: 24.99
      minimumPayment: "2% of balance, $25 floor"
      extraPayment: "$200 extra"
    description: "A 2% minimum on $15,000 at {{ 24.99 | pct(2) }} APR starts at $300, but the first month's interest is {{ cardPayoff(15000, 24.99, minPct=2, minFloor=25).firstInterest | usd(2) }}, so the balance grows and the calculator shows that the debt is never repaid on the minimum alone. Adding $200 a month clears it in {{ cardPayoff(15000, 24.99, minPct=2, minFloor=25, extra=200).months | months }} with {{ cardPayoff(15000, 24.99, minPct=2, minFloor=25, extra=200).interest | usd }} in interest."
---

## What a $5,000 balance really costs

A credit card payoff calculator shows when your balance reaches zero for a given APR, minimum payment and extra amount, and what the interest adds up to. Carrying a balance is almost always dearer than it feels month to month, because the cost arrives as a slow drip.

The calculator starts on a $5,000 balance at {{ 22.99 | pct(2) }} APR with a fixed $100 payment. On those inputs the interest comes to {{ cardPayoff(5000, 22.99, 100).interest / 5000 | num(1) }} times the original balance. The inputs are the calculator's starting values, not a market average: replace them with your own card's.

## The minimum payment trap

When the minimum is a share of the balance, the payment shrinks as you pay down the card, so progress slows. A 2% minimum on $5,000 at {{ 22.99 | pct(2) }} APR starts at {{ 5000 * 2 / 100 | usd }}, and {{ cardPayoff(5000, 22.99, 100).firstInterest | usd }} of that is interest. The balance falls by only {{ 100 - cardPayoff(5000, 22.99, 100).firstInterest | usd(2) }} in the first month.

<div class="stat-highlight">
  <span class="stat-number">{{ cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).remaining | usd }}</span>
  <span class="stat-text">still owed after 50 years of paying the 2% minimum on a $5,000 balance at {{ 22.99 | pct(2) }} APR, after {{ cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).totalPaid | usd }} paid in total. The calculator labels this "beyond 50 years".</span>
</div>

A minimum that does not cover the month's interest is worse: the balance grows and the calculator reports that the debt is never repaid. A fixed payment of $100 on $5,000 at this rate clears the debt only because it exceeds the first month's interest.

## Three ways issuers set the minimum

The calculator offers all three common formulas, because they give very different results on the same card at {{ 22.99 | pct(2) }} APR and $5,000:

| Minimum payment | Time to pay off | Total interest |
|---|---|---|
| Fixed $100 | {{ cardPayoff(5000, 22.99, 100).months | months }} | {{ cardPayoff(5000, 22.99, 100).interest | usd }} |
| 3% of balance ($25 floor) | {{ cardPayoff(5000, 22.99, minPct=3, minFloor=25).months | months }} | {{ cardPayoff(5000, 22.99, minPct=3, minFloor=25).interest | usd }} |
| Interest plus 1% ($25 floor) | {{ cardPayoff(5000, 22.99, minPct=1, minFloor=25, plusInterest=true).months | months }} | {{ cardPayoff(5000, 22.99, minPct=1, minFloor=25, plusInterest=true).interest | usd }} |

UK rules require at least interest plus 1% of the balance, so the third row is the UK floor. A plain 2% minimum is not on the table because it never clears within 50 years at this rate.

## How extra payments change the result

Extra money goes straight to principal. That lowers next month's interest, so more of the following payment also goes to principal.

On a $5,000 balance at {{ 22.99 | pct(2) }} APR:

| Monthly payment | Time to pay off | Total interest | Interest saved |
|---|---|---|---|
| $100 | {{ cardPayoff(5000, 22.99, 100).months | months }} | {{ cardPayoff(5000, 22.99, 100).interest | usd }} | n/a |
| $150 ($50 extra) | {{ cardPayoff(5000, 22.99, 150).months | months }} | {{ cardPayoff(5000, 22.99, 150).interest | usd }} | {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 150).interest | usd }} |
| $200 ($100 extra) | {{ cardPayoff(5000, 22.99, 200).months | months }} | {{ cardPayoff(5000, 22.99, 200).interest | usd }} | {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 200).interest | usd }} |
| $300 ($200 extra) | {{ cardPayoff(5000, 22.99, 300).months | months }} | {{ cardPayoff(5000, 22.99, 300).interest | usd }} | {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 300).interest | usd }} |

The first $50 does the most work: it saves {{ cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 150).interest | usd }} and takes {{ cardPayoff(5000, 22.99, 100).months - cardPayoff(5000, 22.99, 150).months | months }} off the payoff time. Each further $50 saves less.

## Ways to pay off a card faster

1. **Pay more than the minimum.** Use the calculator to find an extra amount your budget can hold and see what it saves.
2. **Consider a balance transfer.** A 0% introductory card sends every payment to principal while the offer lasts. Count the transfer fee (3% of $5,000 is {{ 5000 * 0.03 | usd }}) and plan to clear the balance before the regular rate returns.
3. **Consider a consolidation loan.** As an illustration, the same $5,000 repaid at $150 a month on a 10% loan costs {{ loanPayoff(5000, 10, 150).interest | usd }} in interest and takes {{ loanPayoff(5000, 10, 150).months | months }}, against {{ cardPayoff(5000, 22.99, 150).interest | usd }} on the card at {{ 22.99 | pct(2) }}. That only helps if you stop adding to the cards. The 10% rate is an example, not a quote; check what you would be offered.
4. **Use the avalanche method** if you hold several cards: highest APR first, minimums on the rest.
5. **Automate the extra.** A second scheduled payment of even $25 removes the need to decide each month.

## When a balance is a warning sign

- You pay only the minimum, and the balance barely moves.
- Your minimum payments take a large share of take-home pay.
- You use one card to pay another.
- Your balances sit near your limits, which lowers your credit score and can raise the rates on new borrowing.

Seeing the dollar cost of your own balance is often what gets an extra payment started. Enter your card's balance, APR and minimum, then try a few extra amounts.
