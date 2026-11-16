---
title: "Lump Sum vs Dollar-Cost Averaging: Which Wins?"
slug: "lump-sum-vs-dollar-cost-averaging"
description: "Lump sum vs dollar-cost averaging on a $60,000 windfall: Vanguard's win rate, what spreading it over 12 or 6 months costs, and when to do it anyway."
keywords:
  - "lump sum vs dollar cost averaging"
  - "DCA vs lump sum investing"
  - "how to invest a windfall"
relatedTools:
  - "investment-return"
  - "compound-interest"
verdict: "Invest the lump sum now if your horizon is 10 years or more and a 30% fall would not make you sell. Vanguard found lump sum ahead of 12-month cost averaging in about two-thirds of periods. Spread it over six months if a large early loss would change your plans: on a $60,000 windfall that costs about {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} over 10 years at 7%, against {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9) | usd }} for 12 months."
comparisonTable:
  - feature: "How often it came out ahead"
    option1: "About 68% of rolling 12-month periods (Vanguard, US, 1976–2022)"
    option2: "About 32% of periods"
  - feature: "Typical extra return"
    option1: "Median 1.2% to 2.2% more over the 12 months, depending on the stock and bond mix (Vanguard)"
    option2: "—"
  - feature: "Result on $60,000 after 10 years (7% a year)"
    option1: "{{ compoundFV(60000, 0, 7, 10) | usd }}"
    option2: "{{ compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9) | usd }} (12 monthly purchases)"
  - feature: "Maximum regret"
    option1: "High: you could invest just before a crash"
    option2: "Lower: only part of the money is exposed at first"
  - feature: "Time in the market"
    option1: "Full exposure from day one"
    option2: "Builds gradually over the schedule"
  - feature: "Best for"
    option1: "Long time horizons and a high tolerance for losses"
    option2: "Nervous investors, or amounts that are most of your net worth"
  - feature: "Opportunity cost"
    option1: "None: the money works immediately"
    option2: "Cash waiting to be invested earns little"
affiliateContext: "Where to invest your windfall"
affiliatePrograms:
  - "Betterment"
  - "InvestEngine"
faq:
  - question: "Is lump sum or dollar-cost averaging better?"
    answer: "On average lump sum investing is better, because markets rise more often than they fall and money held in cash misses those gains. Vanguard's research found it ahead of 12-month cost averaging about 68% of the time. Dollar-cost averaging is the better choice if the risk of investing right before a fall would make you sell."
  - question: "How long should I spread out a lump sum?"
    answer: "As short as you can stand: six months at most for most people. On a $60,000 windfall at 7% a year, spreading it over six months costs about {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} after 10 years, while 12 months costs about {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9) | usd }}. The longer the wait, the more you give up."
  - question: "Should I use dollar-cost averaging for regular monthly investing?"
    answer: "That is a different question. If you invest part of every paycheck, you are already dollar-cost averaging because the money arrives over time. The lump sum versus DCA debate only applies when you hold a large amount of cash that you could invest all at once."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "Vanguard — Cost averaging: Invest now or temporarily hold your cash? (February 2023)"
    url: "https://corporate.vanguard.com/content/dam/corp/research/pdf/cost_averaging_invest_now_or_temporarily_hold_your_cash.pdf"
---

## What the data says

Vanguard studied this question across 1976 to 2022 using rolling 12-month periods. The finding: investing a lump sum immediately beat spreading the same money over 12 months in about **68% of cases** for a US portfolio, and between roughly 62% and 74% across the markets it examined. The median outperformance was between 1.2% and 2.2% over the 12 months, depending on the mix of stocks and bonds.

The reason is straightforward. Stock markets go up more often than they go down. If you hold cash waiting to invest gradually, you are out of the market on most of the days it rises, and every month the cash sits in a savings account instead of being invested, you fall slightly behind. The same study found that cost averaging beat simply holding cash, so the question is how fast to invest, not whether.

## When lump sum loses

The other 32% matters. If you invested a $100,000 windfall as a lump sum in October 2007, the S&P 500 fell by more than half before it bottomed in March 2009. Dollar-cost averaging the same amount over 12 months would have bought more shares at lower prices and left you less exposed in the worst months.

The worst case for lump sum investing, putting everything in right before a major crash, is also what most people imagine when they receive a large sum. The fear is not irrational. A 40% drop on your entire windfall is hard to sit through, even when the rational move is to hold.

## The real risk: what you do next

The academic debate misses the biggest factor: what you do if markets fall after you invest.

If you invest $100,000 as a lump sum and the market drops 20%, you are looking at a {{ 100000 * 20 / 100 | usd }} loss. Many people sell at that point and lock the loss in. They would have been better off with dollar-cost averaging, not because it has better expected returns, but because it would have kept them invested. The strategy you will follow is worth more than the strategy that is better on paper and that you will abandon.

## How to run the numbers for your windfall

Use an [investment return calculator](/tools/saving-and-growth/investment-return/) to model both approaches:

**Lump sum:** enter the full amount as the starting balance, $0 monthly contribution and your expected return. Note the value after 10, 20 and 30 years.

**DCA over 12 months:** enter $0 as the starting balance, set the monthly contribution to the windfall divided by 12 with deposits at the start of each month, and run it for one year. Then use that end balance as a new starting amount with no monthly contribution for the remaining years.

Here is what that looks like on a **$60,000 windfall** at 7% a year (compounded monthly) over 10 years, assuming the cash waiting to be invested earns nothing:

| Plan | Value after 10 years | Cost against lump sum |
|---|---|---|
| Lump sum on day one | {{ compoundFV(60000, 0, 7, 10) | usd }} | — |
| $10,000 a month for 6 months | {{ compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} | {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} |
| $5,000 a month for 12 months | {{ compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9) | usd }} | {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9) | usd }} |
| Half now, $5,000 a month for 6 months | {{ compoundFV(compoundFV(30000, 5000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} | {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(30000, 5000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }} |

The cost of spreading it out is the price of the insurance. The **50/50 hybrid** is the compromise that calms most nerves: invest half today and the other half over six months. It halves your day-one exposure for about {{ compoundFV(60000, 0, 7, 10) - compoundFV(compoundFV(30000, 5000, 7, 0.5, timing=beginning), 0, 7, 9.5) | usd }}. If investing everything at once feels impossible, this is a sensible middle ground.

## A practical DCA schedule

If you choose to spread it out, pick a fixed schedule and automate it:

- **6 months:** invest a sixth each month. Keeps the cash drag small.
- **12 months:** the period Vanguard studied most. The longer wait costs more than six months.
- **Buying extra on dips:** some people hold the cash and invest more when markets fall 5% or more. This sounds smart but needs timing decisions that most people get wrong.

Whatever schedule you pick, set up automatic transfers on fixed dates. Do not wait for a "good time" for each purchase, which turns DCA into market timing.

## When each approach makes sense

**Lump sum if:**

- Your time horizon is 10 years or more.
- You can sit through a 30% drop without selling.
- The amount, while large, is not life-changing (a bonus, not a whole inheritance).
- You accept that about two times in three it is the better move.

**DCA if:**

- The amount is most of your net worth.
- A 30% immediate loss would change your financial plans.
- You are new to investing and still getting comfortable with volatility.
- You would rather slightly underperform on average than risk the worst case.

**Neither yet if:**

- You have high-interest debt: [pay that off first](/comparisons/pay-off-debt-vs-invest/) whichever investing strategy you prefer.
- You have no emergency fund: [set aside 3-6 months of expenses](/tools/income-and-planning/emergency-fund/) before investing.
