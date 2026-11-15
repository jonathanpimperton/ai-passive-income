---
title: "$30K Debt at 18% APR, $800/mo: {{ cardPayoff(30000, 18, 800).months | months }}"
slug: "pay-off-30k-debt"
description: "Paying $800 a month on $30,000 of debt at 18% APR takes {{ cardPayoff(30000, 18, 800).months | months }} and costs {{ cardPayoff(30000, 18, 800).interest | usd }} in interest. See how payment size, rate and consolidation change it."
keywords: ["pay off 30000 debt", "debt payoff calculator", "credit card debt payoff", "18 percent APR debt", "get out of debt"]
toolSlug: "debt-payoff"
toolCategory: "debt-and-loans"
inputs:
  Total Debt: "$30,000"
  Average APR: "18%"
  Monthly Payment: "$800"
resultSummary: "Paid off in {{ cardPayoff(30000, 18, 800).months | months }}, {{ cardPayoff(30000, 18, 800).interest | usd }} in interest"
affiliateContext: "Consolidate your debt at a lower rate"
affiliatePrograms:
  - "SoFi"
datePublished: "2026-03-02"
dateModified: "2026-11-15"
---

## {{ cardPayoff(30000, 18, 800).months | months }} at $800/month

**Paying $800 a month on $30,000 of debt at 18% APR takes {{ cardPayoff(30000, 18, 800).months | months }} ({{ cardPayoff(30000, 18, 800).months | int }} months) to pay off, and costs {{ cardPayoff(30000, 18, 800).interest | usd }} in total interest.** You pay {{ cardPayoff(30000, 18, 800).totalPaid | usd }} to clear a $30,000 balance, {{ cardPayoff(30000, 18, 800).interest / 30000 * 100 | pct }} more than you originally owed.

## How 18% APR eats into every payment

At 18% APR, interest charges are aggressive. In your first month alone, {{ cardPayoff(30000, 18, 800).firstInterest | usd }} goes to interest and only {{ 800 - cardPayoff(30000, 18, 800).firstInterest | usd }} goes toward your actual balance. That means just {{ (800 - cardPayoff(30000, 18, 800).firstInterest) / 800 * 100 | pct }} of your payment reduces what you owe.

Here is how the payoff progresses:

- **After 1 year:** The balance drops to {{ payoffBalance(30000, 18, 800, 12) | usd }}. You have paid {{ 800 * 12 | usd }} but reduced the debt by only {{ 30000 - payoffBalance(30000, 18, 800, 12) | usd }}; the other {{ 800 * 12 - (30000 - payoffBalance(30000, 18, 800, 12)) | usd }} went to interest.
- **After 2 years:** The balance is {{ payoffBalance(30000, 18, 800, 24) | usd }}. About {{ (800 - payoffBalance(30000, 18, 800, 23) * 18 / 12 / 100) / 800 * 100 | pct }} of each payment now reaches the balance.
- **After 3 years:** The balance is {{ payoffBalance(30000, 18, 800, 36) | usd }}, and the interest share of each payment keeps falling.
- **After 4 years:** The balance is {{ payoffBalance(30000, 18, 800, 48) | usd }}, and about {{ (800 - payoffBalance(30000, 18, 800, 47) * 18 / 12 / 100) / 800 * 100 | pct }} of each payment now goes to principal.
- **Month {{ cardPayoff(30000, 18, 800).months | int }}:** The final payment clears the balance. Total interest paid: {{ cardPayoff(30000, 18, 800).interest | usd }}.

The cruel math of high-interest debt is that you spend the first two years mostly paying the lender for the privilege of owing them money. Only in the second half does progress accelerate.

## Proven strategies to pay less and finish faster

If you are staring at $30,000 in high-interest debt, these strategies help you finish faster and pay less:

**Increase your payment if at all possible.** Bumping from $800 to $1,000 a month cuts your payoff time from {{ cardPayoff(30000, 18, 800).months | int }} months to {{ cardPayoff(30000, 18, 1000).months | int }} months and saves {{ cardPayoff(30000, 18, 800).interest - cardPayoff(30000, 18, 1000).interest | usd }} in interest. Even an extra $100 a month makes a meaningful difference.

**Explore debt consolidation.** A personal loan replaces your 18% debt with a lower rate if you qualify. At an illustrative 10% APR with the same $800 a month, you would pay off in {{ loanPayoff(30000, 10, 800).months | int }} months with {{ loanPayoff(30000, 10, 800).interest | usd }} in interest, saving {{ cardPayoff(30000, 18, 800).interest - loanPayoff(30000, 10, 800).interest | usd }} compared with staying at 18%. Check offers from credit unions and online lenders, and compare any origination fee with the saving.

**Look into 0% APR balance transfer cards.** Many cards offer 0% APR for a promotional period on transferred balances, and the length varies by card. Moving even $10,000 to a 0% card while aggressively paying it down means every dollar goes to principal during that window. Watch for the transfer fee and have a plan to clear the balance before the promotional rate expires.

**Do not pay just the minimum.** On $30,000 at 18% APR, a minimum of 2% of the balance is not cleared even after {{ cardHorizonYears() | int }} years, the longest payoff the card calculator runs. A 3% minimum with a $25 floor takes {{ cardPayoff(30000, 18, minPct=3, minFloor=25).months | months }} and costs {{ cardPayoff(30000, 18, minPct=3, minFloor=25).interest | usd }} in interest. The gap between minimum payments and $800 a month is decades and tens of thousands of dollars.

## Bigger payments, lower rates and lump-sum windfalls

- **You pay $1,200 a month instead of $800:** Payoff time drops to {{ cardPayoff(30000, 18, 1200).months | months }} and total interest falls to {{ cardPayoff(30000, 18, 1200).interest | usd }}, {{ (1 - cardPayoff(30000, 18, 1200).interest / cardPayoff(30000, 18, 800).interest) * 100 | pct }} less than at $800.
- **Your APR is 22% instead of 18%:** At the same $800 a month, payoff stretches to {{ cardPayoff(30000, 22, 800).months | months }} with {{ cardPayoff(30000, 22, 800).interest | usd }} in interest. The 4-point rate increase costs you an extra {{ cardPayoff(30000, 22, 800).interest - cardPayoff(30000, 18, 800).interest | usd }}, which is why consolidating to a lower rate is so valuable.
- **You get a $5,000 windfall (tax refund, bonus):** Applying it directly to the principal in month 1 means you start from {{ 30000 - 5000 | usd }}. At $800 a month that clears in {{ cardPayoff(25000, 18, 800).months | months }} with {{ cardPayoff(25000, 18, 800).interest | usd }} in interest, saving {{ cardPayoff(30000, 18, 800).interest - cardPayoff(25000, 18, 800).interest | usd }}. Lump-sum payments on high-interest debt are one of the highest-return financial moves available.
- **You consolidate to a 10% personal loan:** The same $800 a month pays off in {{ loanPayoff(30000, 10, 800).months | months }} with {{ loanPayoff(30000, 10, 800).interest | usd }} in interest. You save {{ cardPayoff(30000, 18, 800).interest - loanPayoff(30000, 10, 800).interest | usd }} and finish {{ cardPayoff(30000, 18, 800).months - loanPayoff(30000, 10, 800).months | int }} months sooner.

Your payoff timeline depends on your exact balance, interest rate and how much you can put toward payments each month. Use the [Debt Payoff Calculator](/tools/debt-and-loans/debt-payoff/) to model your own debts (it reproduces the figures on this page when you enter one debt with an $800 payment), or the [Credit Card Payoff Calculator](/tools/debt-and-loans/credit-card-payoff/) for a card with a minimum-payment rule. For the same idea on a larger balance, see [$50,000 in credit card debt](/scenarios/50k-credit-card-debt-payoff/); methods are on the [debt payoff methodology page](/how-we-calculate/debt-payoff/).
