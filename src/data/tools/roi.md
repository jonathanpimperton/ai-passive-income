---
name: "ROI Calculator"
slug: "roi"
category: "saving-and-growth"
description: "ROI calculator: total and annualized return from your cost, final value and income received, with a side-by-side comparison of two investments."
keywords:
  - "ROI calculator"
  - "return on investment calculator"
  - "how to calculate ROI"
  - "investment ROI"
  - "annualized return calculator"
relatedTools:
  - "investment-return"
  - "compound-interest"
  - "investment-fee"
  - "inflation"
  - "net-worth"
  - "retirement-savings"
affiliateContext: "Maximize your returns with low-fee investing"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
  - "SoFi"
calculationMethod: "Total return = (final value + income - cost) / cost; annualized = (1 + total return)^(1 / years) - 1"
faq:
  - question: "How do you calculate ROI?"
    answer: "ROI = (final value + income received - cost) / cost x 100. If you invested $10,000 and it is now worth $13,000, your gain is {{ roi(10000, 13000, 0, 1).totalGain | usd }} and your ROI is {{ roi(10000, 13000, 0, 1).totalReturn | pct }}. The calculator also gives the annualized return, which accounts for how long you held the investment."
  - question: "What is a good ROI?"
    answer: "It depends on the risk, the time and what else the money could have earned. Compare the annualized return with three things: inflation (a 5% return in a year of 3% inflation is only {{ (1.05 / 1.03 - 1) * 100 | pct1 }} in purchasing power), what a safe savings account pays now, and what a low-cost index fund returned over a comparable period. A return that does not beat the safe option was not worth the risk."
  - question: "What is the difference between ROI and annualized return?"
    answer: "ROI measures the total return whatever the time: 50% could come in one year or ten. Annualized return converts it to an equivalent yearly rate. A 50% total return over 5 years is {{ annualizedReturn(50, 5) | pct1 }} a year, and over 10 years it is {{ annualizedReturn(50, 10) | pct1 }} a year. Compare investments on annualized returns."
  - question: "How do I calculate ROI on real estate?"
    answer: "Include every cost: purchase price, closing costs, renovation, maintenance, property tax and insurance. Income is the rent collected, plus appreciation if you count the sale. Cash-on-cash return divides annual net income by the cash you put in: $7,200 of net rent on $50,000 invested is {{ 7200 / 50000 * 100 | pct1 }}. If you used a mortgage, include the payments in your costs."
  - question: "Does ROI include dividends?"
    answer: "It should. Total ROI includes price gains and any income received: dividends, interest and rent. A $10,000 stock that rises to $10,500 and pays $300 in dividends has a total ROI of {{ roi(10000, 10500, 300, 1).totalReturn | pct }}, not 5%. Ignoring dividends understates your return."
  - question: "What happens if I lose everything?"
    answer: "A total loss is a total return of {{ roi(10000, 0, 0, 3).totalReturn | pct }}, and it annualizes to {{ roi(10000, 0, 0, 3).annualized | pct }} a year however long you held it. The calculator reports it that way rather than as 0%."
workedExamples:
  - title: "Stock investment over 3 years"
    inputs:
      initialInvestment: 15000
      currentValue: 21000
      holdingPeriod: 3
    description: "Invested $15,000 in a stock index fund that is now worth $21,000 after 3 years. Total ROI is {{ roi(15000, 21000, 0, 3).totalReturn | pct }} and annualized ROI is {{ roi(15000, 21000, 0, 3).annualized | pct1 }} a year. The annualized figure is the one to hold up against a savings rate or inflation."
  - title: "Rental property evaluation"
    inputs:
      initialInvestment: 50000
      finalValue: 65000
      incomeReceived: 36000
      holdingPeriod: 5
    description: "A rental bought with $50,000 down that earns $7,200 a year in net rent over 5 years ({{ 7200 * 5 | usd }} in total) and gains $15,000 in value, so it is worth {{ 50000 + 15000 | usd }} at the end. The total return is {{ roi(50000, 50000 + 15000, 7200 * 5, 5).totalGain | usd }} on $50,000: {{ roi(50000, 50000 + 15000, 7200 * 5, 5).totalReturn | pct }} total ROI, or {{ roi(50000, 50000 + 15000, 7200 * 5, 5).annualized | pct1 }} a year. This ignores mortgage principal paid down, which would raise the real return."
  - title: "Comparing two investment options"
    inputs:
      investmentA: "Bond fund: $10,000 to $12,500 in 4 years"
      investmentB: "Growth stock: $10,000 to $14,000 in 6 years"
    description: "Investment A returned {{ roi(10000, 12500, 0, 4).totalReturn | pct }} over 4 years ({{ roi(10000, 12500, 0, 4).annualized | pct1 }} a year). Investment B returned {{ roi(10000, 14000, 0, 6).totalReturn | pct }} over 6 years ({{ roi(10000, 14000, 0, 6).annualized | pct1 }} a year). B's total is higher but the yearly rates are almost the same, which the total alone hides."
---

## How ROI is calculated

Return on investment measures profit relative to cost: for every dollar put in, how many came back. The formula is **ROI = (final value + income received - cost) / cost**. An investment that cost $10,000 and is worth $13,000 has made {{ roi(10000, 13000, 0, 1).totalGain | usd }}, an ROI of {{ roi(10000, 13000, 0, 1).totalReturn | pct }}.

It works for any investment: shares, property, equipment, a marketing campaign, a renovation. The calculator takes your initial investment, the final value, the income you received along the way (dividends, interest, rent) and how long you held it.

## Total ROI vs annualized ROI

<div class="stat-highlight">
  <span class="stat-number">{{ annualizedReturn(30, 10) | pct1 }}</span>
  <span class="stat-text">a year is all a 30% total return over 10 years comes to. A 20% return over 2 years is {{ annualizedReturn(20, 2) | pct1 }} a year, a far better investment with the smaller total.</span>
</div>

Total ROI ignores time. 30% sounds better than 20% until you learn that the 30% took 10 years and the 20% took 2. Annualized ROI converts any total return into an equivalent yearly rate: **(1 + total return)^(1 / years) - 1**.

So a {{ annualizedReturn(50, 10) | pct1 }} annual return is what a 50% total over 10 years really is, and 25% over 3 years is {{ annualizedReturn(25, 3) | pct1 }} a year, almost double. Always annualize before you compare.

## Reading an ROI number

An ROI figure means little alone. Three checks make it useful:

- **Against inflation.** A 5% return in a year of 3% inflation grows your purchasing power by {{ (1.05 / 1.03 - 1) * 100 | pct1 }}, not 5%.
- **Against the safe alternative.** If a savings account pays almost as much, extra risk was not rewarded.
- **Against the risk taken.** Shares, property and a start-up have very different spreads of outcomes; a single good number can hide a lot of risk. Venture-style investments, for example, are driven by a few outliers while most positions lose money.

> **Tip:** use annualized ROI when comparing against any benchmark. A 50% total return sounds large until it turns out to have taken 10 years ({{ annualizedReturn(50, 10) | pct1 }} a year).

## When to use the calculator

- Judging a past investment: enter what you paid and what it is worth now.
- Comparing two options: the comparison mode shows both annualized returns side by side.
- Assessing a business decision, such as equipment, marketing spend or training.
- Evaluating a property: purchase cost, rent received and current value.

## Mistakes that distort ROI

1. **Leaving out costs.** Include fees, taxes, maintenance and the opportunity cost of the money, not just the buy and sell prices.
2. **Comparing totals across different holding periods.** 50% over 10 years ({{ annualizedReturn(50, 10) | pct1 }} a year) is worse than 25% over 3 years ({{ annualizedReturn(25, 3) | pct1 }} a year).
3. **Ignoring inflation.** Use the inflation calculator to turn a nominal return into purchasing power.
4. **Leaving out income.** Dividends, rent and interest belong in total return.

## What to do next

Enter your cost, final value, income received and years held. For two options, switch on comparison and read the annualized column.
