---
name: "Investment Return Calculator"
slug: "investment-return"
category: "saving-and-growth"
description: "Investment return calculator: project growth, or solve for the contribution, return rate, starting amount or time needed to reach a target."
keywords:
  - "investment calculator"
  - "investment return calculator"
  - "stock return calculator"
  - "portfolio growth calculator"
  - "DRIP calculator"
relatedTools:
  - "compound-interest"
  - "investment-fee"
  - "retirement-savings"
  - "roi"
  - "savings-goal"
  - "inflation"
  - "retirement-contribution"
affiliateContext: "Ready to start investing? Open an account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
calculationMethod: "Compound growth with monthly deposits"
dataSources:
  - name: "Historical returns on stocks, bonds and bills, 1928 to 2025 — NYU Stern (Damodaran), updated January 2026"
    url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html"
faq:
  - question: "What is a good annual return on investments?"
    answer: "There is no single number, because returns arrive unevenly. The S&P 500 including dividends lost 36.55% in 2008 and gained 31.21% in 2019 (NYU Stern, Damodaran, data updated January 2026). The calculator treats your rate as a constant yearly return, so run a cautious case and an optimistic one: on $10,000 plus $500 a month for 25 years, 7% gives {{ compoundFV(10000, 500, 7, 25) | usd }} and 10% gives {{ compoundFV(10000, 500, 10, 25) | usd }}. What counts as good depends on your risk tolerance, timeline and mix of stocks, bonds and cash."
  - question: "How does dividend reinvestment (DRIP) affect returns?"
    answer: "With reinvestment, dividends buy more shares, which then pay dividends of their own. The calculator has no separate dividend setting: the rate you enter is a total return and the calculator assumes it is all reinvested. To model spending the dividends instead, enter only the price return. For a 7% total return with a 3% dividend yield, $50,000 plus $300 a month grows to {{ compoundFV(50000, 300, 7, 20) | usd }} over 20 years with reinvestment. If you spend the dividends, the balance grows at the 4% price return to {{ compoundFV(50000, 300, 4, 20) | usd }}, and the dividends you took arrive as cash along the way."
  - question: "What is the difference between total return and annualized return?"
    answer: "Total return is the gain or loss over the whole period. Annualized return is the steady yearly rate that would produce it, with compounding. A 50% total return over 5 years is {{ annualizedReturn(50, 5) | pct(2) }} a year, not 10% (50% divided by 5). The same 50% over 10 years is {{ annualizedReturn(50, 10) | pct1 }} a year, and over 3 years {{ annualizedReturn(50, 3) | pct1 }}."
  - question: "Should I factor in inflation when calculating investment returns?"
    answer: "Yes. A 10% return with 3% inflation is about {{ (1.10 / 1.03 - 1) * 100 | pct1 }} in real purchasing power. This calculator shows nominal (unadjusted) results. To see what an amount will buy in today's money, use the inflation calculator, or the retirement savings calculator, which shows both nominal and today's-money values."
  - question: "How much should I invest per month?"
    answer: "A common rule of thumb is to put about 15% of gross income towards retirement, counting any employer match. The right amount depends on your goal, timeline and existing savings. Use the Contribution tab: to reach $1,000,000 in 30 years from $10,000 at 7%, you would need about {{ savingsMonthly(1000000, 10000, 7, 360) | usd }} a month, deposited at the end of each month."
  - question: "What if the target is out of reach, or what I pay in already exceeds it?"
    answer: "The Time tab says 'Not within 100 years' when no amount of waiting gets you there, and 'Already there' when your starting amount meets the target. The Return Rate tab can come back negative: to reach $100,000 from $50,000 plus $1,000 a month in 5 years you pay in {{ 50000 + 1000 * 60 | usd }}, which is already more than the target, so the rate that gets you there is {{ requiredRate(50000, 1000, 100000, 5) | pct(2) }}. Time is solved in whole months."
workedExamples:
  - title: "Long-term index fund investor"
    inputs:
      initialInvestment: 10000
      monthlyContribution: 500
      annualReturn: 10
      years: 25
    description: "Start with $10,000 and invest $500 a month in a broad index fund returning 10% a year, compounded monthly. After 25 years the balance is {{ compoundFV(10000, 500, 10, 25) | usd }}. Only {{ 10000 + 500 * 12 * 25 | usd }} of that is money you paid in; the other {{ compoundEarned(10000, 500, 10, 25) | usd }} is growth. At 7% the same plan ends at {{ compoundFV(10000, 500, 7, 25) | usd }}, so the assumed return moves the answer by {{ compoundFV(10000, 500, 10, 25) - compoundFV(10000, 500, 7, 25) | usd }}."
  - title: "Balanced portfolio, dividends reinvested or spent"
    inputs:
      initialInvestment: 50000
      monthlyContribution: 300
      annualReturn: 7
      years: 20
    description: "A $50,000 balanced portfolio plus $300 a month, returning 7% in total (3% from dividends, 4% from price). With every dividend reinvested the balance after 20 years is {{ compoundFV(50000, 300, 7, 20) | usd }}. If you spend the dividends, enter the 4% price return and the balance is {{ compoundFV(50000, 300, 4, 20) | usd }}: reinvesting is worth {{ compoundFV(50000, 300, 7, 20) - compoundFV(50000, 300, 4, 20) | usd }} over the period."
  - title: "Aggressive growth for a young investor"
    inputs:
      initialInvestment: 5000
      monthlyContribution: 1000
      annualReturn: 11
      years: 30
    description: "A 25-year-old invests $5,000 and adds $1,000 a month at 11% a year. By age 55 the balance is {{ compoundFV(5000, 1000, 11, 30) | usd }}. At 8% it is {{ compoundFV(5000, 1000, 8, 30) | usd }}. An 11% return is a high assumption for a long period, so use the 8% case for planning: starting early and depositing steadily matters more than chasing the highest return."
---

## Return has two parts: price and income

Investment return measures how much your investments gained or lost over a period. It has two sources: **price appreciation** (an asset bought at $50 and now worth $65 has gained $15) and **income** (dividends from stocks, interest from bonds, rent from property). Judge a portfolio on total return, both parts together, not on whether the share price rose.

Income can be spent or reinvested. Reinvested dividends buy more shares, which pay further dividends: that is DRIP (a dividend reinvestment plan). The calculator assumes everything is reinvested, so the rate you enter should be a total return. If you plan to spend the income, enter the price return instead.

> **Example:** $50,000 plus $300 a month at 7% total return reaches {{ compoundFV(50000, 300, 7, 20) | usd }} in 20 years. Spend a 3% dividend yield and the balance grows at 4% to {{ compoundFV(50000, 300, 4, 20) | usd }}.

## What the calculator assumes

Deposits are monthly, at the end of each month by default, or the start. Interest compounds annually, semi-annually, quarterly, monthly or daily, and the compounding choice sets the growth rate rather than how often you deposit. The rate is constant every year, which real markets are not. It is a planning tool for comparing cases, not a forecast.

The five tabs each solve for one input and hold the others fixed: End Amount, Contribution, Return Rate, Starting Amount and Time. Time is solved in whole months and capped at 100 years. With $10,000 to start and $500 a month at 7%, reaching $1,000,000 takes {{ yearsToTarget(10000, 500, 7, 1000000) | num(1) }} years. Reaching $100,000 in 20 years from $10,000 plus $200 a month needs a return of {{ requiredRate(10000, 200, 100000, 20) | pct(2) }}.

## Time in the market

<div class="stat-highlight">
  <span class="stat-number">{{ compoundEarned(10000, 500, 10, 25) / compoundFV(10000, 500, 10, 25) * 100 | pct }}</span>
  <span class="stat-text">of the final balance in the index fund example is growth rather than money paid in. The longer the horizon, the more of the result growth supplies.</span>
</div>

Staying invested through both good and bad stretches is the simplest way to collect long-term growth. Yearly returns are uneven (the S&P 500 including dividends returned -36.55% in 2008 and +31.21% in 2019), and a small number of strong days account for a large part of long-run gains, often close to the worst days. An investor who sells in a panic tends to miss them.

## Annualized returns

A total return is hard to compare across different time spans. A 50% gain sounds impressive, but over 10 years it is {{ annualizedReturn(50, 10) | pct1 }} a year, and over 3 years {{ annualizedReturn(50, 3) | pct1 }} a year. Annualizing converts any total return into the equivalent steady yearly rate, with compounding: (1 + total return)^(1/years) - 1. The [ROI calculator](/tools/saving-and-growth/roi/) does this for a single holding.

## Key terms

- **DRIP (dividend reinvestment plan):** automatically using dividends to buy more shares.
- **CAGR (compound annual growth rate):** the steady annual rate that links a starting and an ending value.
- **Nominal return:** the return before inflation.
- **Real return:** the return after inflation, which reflects the buying power you gain.
- **Dollar-cost averaging:** investing a fixed amount on a schedule, which buys more shares when prices are low.

## Mistakes that cost money

| Mistake | Why it matters | Effect |
|---|---|---|
| **Ignoring inflation** | A 10% return with 3% inflation is about {{ (1.10 / 1.03 - 1) * 100 | pct1 }} real | At 3% inflation, money loses {{ 100 - inflationAdjust(100, 3, 30, mode=value) | pct }} of its buying power in 30 years |
| **Extrapolating a good run** | A strong year says little about the next one | Test a cautious case as well as a hopeful one |
| **Forgetting fees** | A 1% annual fee looks small | On $100,000 at 8% for 30 years, a 1% fee against a 0.1% fee leaves {{ feeDrag(100000, 0, 8, 30, 1, compareFee=0.1).cost | usd }} less |
| **Spending dividends you did not need** | You lose the compounding on them | Reinvesting turns {{ compoundFV(50000, 300, 4, 20) | usd }} into {{ compoundFV(50000, 300, 7, 20) | usd }} in the balanced example |

## What to do next

Enter your own starting amount, deposit and return, then raise the deposit and watch the end amount. In the index fund example, $100 more a month adds {{ compoundFV(10000, 600, 7, 25) - compoundFV(10000, 500, 7, 25) | usd }} at 7%. Use the Contribution tab to work backwards from a target, and see the [investment fee calculator](/tools/saving-and-growth/investment-fee/) for what a fund's expense ratio takes.
