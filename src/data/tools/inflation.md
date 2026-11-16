---
name: "Inflation Calculator"
slug: "inflation"
category: "economic"
description: "Inflation calculator on US CPI data from 1913: what money from any year is worth today, or what it will cost at an inflation rate you choose."
keywords:
  - "inflation calculator"
  - "CPI calculator"
  - "purchasing power calculator"
  - "what was X worth in Y year"
  - "inflation rate"
relatedTools:
  - "compound-interest"
  - "retirement-savings"
  - "investment-return"
  - "savings-goal"
  - "salary-us"
  - "retirement-contribution"
affiliateContext: "Don't let inflation erode your wealth: start investing"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
  - "SoFi"
lastUpdated: "2026-11-15"
dataSources:
  - name: "BLS CPI-U, U.S. city average, all items (series CUUR0000SA0)"
    url: "https://data.bls.gov/timeseries/CUUR0000SA0"
  - name: "Bureau of Labor Statistics: Consumer Price Index"
    url: "https://www.bls.gov/cpi/"
  - name: "Federal Reserve: longer-run inflation goal"
    url: "https://www.federalreserve.gov/faqs/economy_14400.htm"
faq:
  - question: "What is inflation and how does it work?"
    answer: "Inflation is the general rise in prices over time, which lowers what each unit of money buys. At 3% a year, something that costs $100 today costs {{ inflationAdjust(100, 3, 1) | usd }} next year. In the US it is measured by the Consumer Price Index (CPI), which tracks the average price change of a basket of goods and services."
  - question: "What is the average inflation rate in the US?"
    answer: "From 1914 to 2025 US prices rose by an average of {{ cpiAdjust(1, 1914, 2025).averageAnnual | pct1 }} a year, using BLS annual CPI-U averages. The Federal Reserve's longer-run goal is 2% a year. Rates swing widely: the annual average rose {{ (cpiValue(2015) / cpiValue(2014) - 1) * 100 | pct1 }} in 2015, {{ (cpiValue(2022) / cpiValue(2021) - 1) * 100 | pct1 }} in 2022, and the 12-month rate peaked at 9.1% in June 2022 (BLS). Long-term plans commonly assume 2.5% to 3.5%."
  - question: "How does inflation affect my savings?"
    answer: "If your savings earn less than the inflation rate, you lose purchasing power. An account paying 0.5% when inflation is 3% loses about {{ (1 - 1.005 / 1.03) * 100 | pct1 }} of its real value a year. Over ten years at 3% inflation, {{ 10000 | usd }} that earns nothing buys what {{ inflationAdjust(10000, 3, 10, mode=value) | usd }} buys today. That is why longer-term savings goals look for a return above inflation."
  - question: "What is the difference between CPI and the inflation rate?"
    answer: "The CPI is an index: the price level of a fixed basket of goods and services, set to 100 in 1982 to 1984. The inflation rate is the percentage change in that index between two dates. When people say inflation is 3%, the CPI is 3% higher than a year earlier. The calculator's CPI-U was {{ cpiValue(2025) | index }} on average in 2025, against {{ cpiValue(1990) | index }} in 1990."
  - question: "How much was a dollar worth in 1970?"
    answer: "One dollar in 1970 buys what {{ cpiAdjust(1, 1970, 2025).adjusted | usd(2) }} buys in 2025 prices. Put the other way round, the dollar lost about {{ 100 - 100 / cpiAdjust(1, 1970, 2025).adjusted | pct }} of its purchasing power over those 55 years, using BLS annual CPI-U averages."
  - question: "Which CPI figures does the calculator use?"
    answer: "BLS CPI-U for all urban consumers, U.S. city average, all items, not seasonally adjusted: annual averages from 1913 to 2025, plus the newest monthly index ({{ cpiValue(2026) | index }}) as the value for the current year until a full-year average exists. The current-year result therefore moves each month. Pick 2025 as the end year for a figure that stays put. BLS did not collect October 2025 prices, and its 2025 average is the mean of the other 11 months."
workedExamples:
  - title: "Purchasing power of a 1990 salary"
    inputs:
      amount: 35000
      startYear: 1990
      endYear: 2025
    description: "A $35,000 salary in 1990 has the buying power of {{ cpiAdjust(35000, 1990, 2025).adjusted | usd }} in 2025, because prices rose {{ cpiAdjust(35000, 1990, 2025).cumulativeChange | pct }} over those 35 years. If your pay has not kept up with that, you earn less in real terms than the number suggests."
  - title: "Future cost of college tuition"
    inputs:
      amount: 25000
      inflationRate: 5
      years: 18
    description: "If tuition is $25,000 a year today and education costs rise 5% a year, one year of tuition costs {{ inflationAdjust(25000, 5, 18) | usd }} in 18 years. Four years of study starting then cost {{ inflationAdjust(25000, 5, 18) + inflationAdjust(25000, 5, 19) + inflationAdjust(25000, 5, 20) + inflationAdjust(25000, 5, 21) | usd }} in total, because prices keep rising each year of the course. That is why a college savings plan pays off most when it starts early."
  - title: "Retirement purchasing power erosion"
    inputs:
      amount: 1000000
      inflationRate: 3
      years: 25
    description: "A $1 million nest egg has the purchasing power of {{ inflationAdjust(1000000, 3, 25, mode=value) | usd }} in today's money after 25 years at 3% inflation. Withdrawals must grow every year just to buy the same things, which makes inflation one of the most overlooked parts of retirement planning."
---

## Inflation in one number

Inflation is the general rise in prices over time. When it rises, each dollar buys less: a dollar today does not buy what a dollar bought ten years ago.

Take the plain example. A $10,000 balance that sits in an account at 0% for ten years, with inflation at 3%, still reads $10,000. Its purchasing power has fallen to {{ inflationAdjust(10000, 3, 10, mode=value) | usd }}, a loss of {{ 10000 - inflationAdjust(10000, 3, 10, mode=value) | usd }} that no statement shows.

## How inflation is measured

The main US measure is the **Consumer Price Index (CPI)**, published monthly by the Bureau of Labor Statistics. It follows the price of a broad basket of goods and services that urban households buy: food, housing, transport, medical care, clothing and more.

The **inflation rate** is the percentage change in the CPI between two dates. When the news says inflation is 3%, the same basket that cost $100 a year ago costs $103 now.

## How fast prices have risen

<div class="stat-highlight">
  <span class="stat-number">{{ 100 - 100 / cpiAdjust(1, 1970, 2025).adjusted | pct }}</span>
  <span class="stat-text">of the dollar's purchasing power was lost between 1970 and 2025. What cost $1 in 1970 costs {{ cpiAdjust(1, 1970, 2025).adjusted | usd(2) }} in 2025 prices.</span>
</div>

Since 1914 US prices have risen by an average of {{ cpiAdjust(1, 1914, 2025).averageAnnual | pct1 }} a year, but the average hides sharp swings. Average annual inflation by period, from BLS annual CPI-U values:

| Period | Average annual inflation | Context |
|---|---|---|
| 1970 to 1980 | {{ cpiAdjust(1, 1970, 1980).averageAnnual | pct1 }} | Oil price shocks; the annual average rose {{ (cpiValue(1980) / cpiValue(1979) - 1) * 100 | pct1 }} in 1980 alone |
| 1980 to 1990 | {{ cpiAdjust(1, 1980, 1990).averageAnnual | pct1 }} | Inflation brought down in the early 1980s |
| 1990 to 2000 | {{ cpiAdjust(1, 1990, 2000).averageAnnual | pct1 }} | A long stretch of moderate prices |
| 2000 to 2010 | {{ cpiAdjust(1, 2000, 2010).averageAnnual | pct1 }} | Steady, with the 2008 financial crisis at the end |
| 2010 to 2020 | {{ cpiAdjust(1, 2010, 2020).averageAnnual | pct1 }} | Below the Federal Reserve's 2% goal for much of the decade |
| 2020 to 2025 | {{ cpiAdjust(1, 2020, 2025).averageAnnual | pct1 }} | Post-pandemic spike; the 12-month rate hit 9.1% in June 2022 (BLS) |

> **Tip:** The Federal Reserve aims for 2% a year, but a long plan is safer at 3%. Prices rose {{ cpiAdjust(1, 1914, 2025).averageAnnual | pct1 }} a year on average over the last century, and a spike like 2022 can wipe out years of real returns.

## What inflation does to your finances

Inflation is a quiet tax on cash. At 3% a year, $10,000 held in cash needs {{ inflationAdjust(10000, 3, 10) | usd }} after ten years to buy what it buys now.

> **Example:** $10,000 in 2014 needed {{ cpiAdjust(10000, 2014, 2025).adjusted | usd }} in 2025 to buy the same things. That is a hidden loss of {{ cpiAdjust(10000, 2014, 2025).adjusted - 10000 | usd }} for money that never moved.

The same arithmetic shows up in four places:

- **Pay rises.** A 2% raise when inflation is 3% is a real pay cut of about {{ (1 - 1.02 / 1.03) * 100 | pct1 }}.
- **Retirement.** At 3% inflation, $1 million in 30 years buys what {{ inflationAdjust(1000000, 3, 30, mode=value) | usd }} buys today.
- **Savings goals.** The price of a house, a degree or a car is rising while you save for it.
- **Real returns.** A 10% investment return with 3% inflation is a {{ (1.10 / 1.03 - 1) * 100 | pct1 }} real return, which the shortcut of subtracting 3 points rounds to 7%.

## Using the calculator

- **Convert historical prices.** The Historical tab shows what an amount from any year from 1913 is worth in another year's prices, using US CPI.
- **Project a future cost.** The Future tab applies an inflation rate you choose for up to 100 years. It works for any currency.
- **Check your pay.** Enter an old salary and see if today's pay matches it in real terms.
- **Plan withdrawals.** See how much an annual withdrawal must grow to keep its buying power.

## Common mistakes

1. **Planning with nominal returns.** Subtract inflation first. A return that looks like 10% is {{ (1.10 / 1.03 - 1) * 100 | pct1 }} after 3% inflation.
2. **Assuming a constant rate.** The annual average ranged from {{ (cpiValue(2015) / cpiValue(2014) - 1) * 100 | pct1 }} in 2015 to {{ (cpiValue(2022) / cpiValue(2021) - 1) * 100 | pct1 }} in 2022. A plan at exactly 3% a year ignores both.
3. **Using the overall rate for one expense.** Healthcare, education and housing often rise at a different pace from the overall CPI. BLS publishes category indexes if a single big cost matters to your plan.

## What to do next

Check whether your pay has kept up with prices over the last five to ten years. If a large expense is years away, project what it will cost when you need the money and save toward that figure.
