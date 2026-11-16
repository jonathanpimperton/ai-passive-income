---
name: "Investment Fee Calculator"
slug: "investment-fee"
category: "saving-and-growth"
description: "Investment fee calculator: compare two expense ratios and see what the difference costs you in lost growth over 10, 20 or 30 years."
keywords:
  - "investment fee calculator"
  - "expense ratio calculator"
  - "fund fee impact"
  - "how much do fees cost"
  - "expense ratio comparison"
  - "mutual fund fee calculator"
  - "ETF fee calculator"
  - "investment cost calculator"
relatedTools:
  - "investment-return"
  - "compound-interest"
  - "retirement-savings"
  - "roi"
  - "savings-goal"
  - "retirement-age"
affiliateContext: "Switch to a low-fee investment platform"
affiliatePrograms:
  - "Betterment"
  - "InvestEngine"
  - "Wealthfront"
calculationMethod: "The fee is subtracted from the gross return, then the balance compounds monthly with deposits at the end of each month, for each fee in turn"
dataSources:
  - name: "Morningstar: annual U.S. fund fee study"
    url: "https://www.morningstar.com/lp/annual-us-fund-fee-study"
  - name: "S&P Dow Jones Indices: SPIVA scorecards"
    url: "https://www.spglobal.com/spdji/en/research-insights/spiva/"
  - name: "Investor.gov: expense ratio"
    url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/expense-ratio"
faq:
  - question: "What is an expense ratio?"
    answer: "An expense ratio is the annual fee a fund charges as a percentage of the money you have in it. A fund with a 0.50% expense ratio charges $5 a year for every $1,000 invested. The fee covers management, administration and operating costs, and it comes out of the fund's returns automatically, so you never see a bill."
  - question: "What is a good expense ratio?"
    answer: "Lower is better for the same exposure. Broad index funds and ETFs generally charge a small fraction of a percent, while actively managed funds usually charge several times as much. For current averages by fund type, see Morningstar's annual fund fee study. An actively managed fund has to beat its benchmark by at least its extra fee, year after year, to leave you better off, and most do not."
  - question: "How do I find my fund's expense ratio?"
    answer: "Check the fund's fact sheet or prospectus on the provider's website. Most brokerage platforms list it on the fund page under fees or costs. Morningstar and similar sites list it for any fund. Add any platform or advisory fee you pay on top, because the total is what reduces your return."
  - question: "Why do small fee differences matter so much over time?"
    answer: "Fees compound against you. A 1% fee takes 1% of your balance every year, and also all the growth that money would have earned afterwards. On $100,000 growing at 7% a year for 30 years with no further deposits, a 1% fee leaves {{ feeDrag(100000, 0, 7, 30, 1).balance | usd }} instead of {{ feeDrag(100000, 0, 7, 30, 1).zeroFeeBalance | usd }}, a cost of {{ feeDrag(100000, 0, 7, 30, 1).cost | usd }}. That is {{ feeDrag(100000, 0, 7, 30, 1).shareOfGrowth | pct }} of all the growth the fund would otherwise have earned."
  - question: "Are index funds always cheaper than actively managed funds?"
    answer: "Almost always. Index funds do not pay analysts to pick stocks, so their fees are far lower. Some active funds beat their benchmark, but S&P's SPIVA scorecards show that over 15 years most actively managed US large-cap funds trail the S&P 500, and fees are part of the reason. Check the latest scorecard for the current share."
  - question: "Do robo-advisors have lower fees than traditional financial advisors?"
    answer: "Usually, because they automate the work and tend to hold low-cost index funds. The total cost to compare is the advisory fee plus the fees of the funds it buys. For example, a 0.25% advisory fee on funds that charge 0.05% costs 0.30% in all, against 1.75% for a 1% advisor using funds that charge 0.75%. Check each provider's published fee schedule; this calculator takes the total as a single percentage."
workedExamples:
  - title: "Index fund vs. actively managed fund"
    inputs:
      initialInvestment: 50000
      monthlyContribution: 500
      annualReturn: 7
      years: 30
      yourFee: 0.03
      comparisonFee: 1.00
    description: "A low-cost index fund at 0.03% against an actively managed fund at 1.00%, both earning 7% gross, on $50,000 plus $500 a month for 30 years. The index fund grows to {{ feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).balance | usd }} and the actively managed fund to {{ feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).compareBalance | usd }}. The fee gap costs {{ feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).cost | usd }}, which is {{ feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).cost / feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).contributions * 100 | pct }} of the {{ feeDrag(50000, 500, 7, 30, 0.03, compareFee=1).contributions | usd }} you paid in."
  - title: "Robo-advisor vs. traditional financial advisor"
    inputs:
      initialInvestment: 100000
      monthlyContribution: 1000
      annualReturn: 8
      years: 25
      yourFee: 0.25
      comparisonFee: 1.50
    description: "A total cost of 0.25% against 1.50%, both investing at 8% gross, on $100,000 plus $1,000 a month for 25 years. The 0.25% portfolio reaches {{ feeDrag(100000, 1000, 8, 25, 0.25, compareFee=1.5).balance | usd }} and the 1.50% portfolio {{ feeDrag(100000, 1000, 8, 25, 0.25, compareFee=1.5).compareBalance | usd }}. The 1.25-point fee gap costs {{ feeDrag(100000, 1000, 8, 25, 0.25, compareFee=1.5).cost | usd }}. Whether the higher fee buys advice worth that is the question to ask."
  - title: "Two similar ETFs with different fees"
    inputs:
      initialInvestment: 25000
      monthlyContribution: 300
      annualReturn: 7
      years: 20
      yourFee: 0.07
      comparisonFee: 0.50
    description: "Two ETFs that track similar indices, one at 0.07% and one at 0.50%, on $25,000 plus $300 a month for 20 years at 7% gross. The cheaper ETF reaches {{ feeDrag(25000, 300, 7, 20, 0.07, compareFee=0.5).balance | usd }} and the other {{ feeDrag(25000, 300, 7, 20, 0.07, compareFee=0.5).compareBalance | usd }}. That is {{ feeDrag(25000, 300, 7, 20, 0.07, compareFee=0.5).cost | usd }} lost to a 0.43-point difference in fees."
---

## What a fee does to the end balance

Every fund charges an annual fee, the expense ratio. It is stated as a small percentage, such as 0.03%, 0.50% or 1.25%, and most investors look at it once and never again.

That is expensive. A fee does not just take a slice of your money today. It takes a slice of your money and of all the growth that slice would have earned for the next 20, 30 or 40 years.

Here is the same $100,000 plus $500 a month at 7% gross return for 30 years, with four different fees:

| Annual fee | Balance after 30 years | Compared with the 0.03% fund |
|---|---|---|
| 0.03% | {{ feeDrag(100000, 500, 7, 30, 0.03).balance | usd }} | n/a |
| 0.50% | {{ feeDrag(100000, 500, 7, 30, 0.5).balance | usd }} | {{ feeDrag(100000, 500, 7, 30, 0.03).balance - feeDrag(100000, 500, 7, 30, 0.5).balance | usd }} less |
| 1.00% | {{ feeDrag(100000, 500, 7, 30, 1).balance | usd }} | {{ feeDrag(100000, 500, 7, 30, 0.03).balance - feeDrag(100000, 500, 7, 30, 1).balance | usd }} less |
| 1.50% | {{ feeDrag(100000, 500, 7, 30, 1.5).balance | usd }} | {{ feeDrag(100000, 500, 7, 30, 0.03).balance - feeDrag(100000, 500, 7, 30, 1.5).balance | usd }} less |

> **The 1.50% fund gives up {{ (feeDrag(100000, 500, 7, 30, 0.03).balance - feeDrag(100000, 500, 7, 30, 1.5).balance) / feeDrag(100000, 500, 7, 30, 0.03).balance * 100 | pct }} of the final balance** against the 0.03% fund, from a fee difference of 1.47 percentage points.

## How the calculator works

The calculator runs compound growth at two effective returns and shows the gap.

- **Effective return** is your expected gross return minus the fund's fee.
- A fund earning 7% gross with a 0.50% fee earns an effective 6.50%.
- The same 7% with a 1.00% fee earns an effective 6.00%.
- Growth compounds monthly, and each month's deposit goes in at the end of the month.

A 0.50-point gap looks negligible in year one. Over 30 years it costs {{ feeDrag(100000, 500, 7, 30, 0.03).balance - feeDrag(100000, 500, 7, 30, 0.5).balance | usd }} on this example. The size of the portfolio and the deposits you make decide how large it gets.

## What counts as a fee

The expense ratio is the most predictable cost of investing, but it is not the only one. What it covers, and what it does not:

| In the expense ratio | Not in it |
|---|---|
| Fund management | Trading commissions |
| Administration | Platform or account fees |
| Regulatory compliance | Financial advisor fees |
| Marketing (12b-1 fees) | Tax drag from fund turnover |

When you compare total cost, add the fund's expense ratio to any advisory or platform fee. The calculator takes one percentage per fund, so enter the total.

## Where fees sit today

Fund fees have fallen steadily for two decades, led by index funds. Broad market index funds are at the cheap end, target-date funds and robo-advisors sit in the middle, and actively managed funds and traditional advisors are at the other end, with advisory fees charged on top of fund costs. Morningstar's annual fee study gives the current averages. Whatever the averages, the calculator shows what a particular gap costs you.

> **Fees and results:** Morningstar's research has found that a fund's expense ratio is one of the better predictors of its future performance, better than past returns or star ratings. Lower-cost funds in a category tend to beat higher-cost ones more often than not.

## When to use this calculator

- **Compare two funds.** See the long-term cost of choosing an active fund over an index fund.
- **Judge an advisor.** Work out what extra return a higher fee must deliver to break even.
- **Put a number on fee drag.** Find out what 0.50% or 1% costs on your own balance and timeline.
- **Decide on a switch.** See what moving from an expensive fund to a cheap one could save.

## Key terms

- **Expense ratio:** the annual fee a fund charges as a percentage of its assets.
- **Fee drag:** the cumulative loss of return from ongoing fees, increased by the compounding you give up.
- **Total cost of ownership:** the expense ratio plus advisory fees, trading costs and tax drag from fund turnover.
- **Basis point:** one hundredth of a percentage point (0.01%). A fee of 50 basis points is 0.50%.
