---
title: "£100 Weekly Shop: {{ inflationAdjust(100, 5, 5) | gbp }} After 5 Years at 5%"
slug: "uk-inflation-grocery-prices"
description: "At 5% food price inflation a £100 weekly shop costs {{ inflationAdjust(100, 5, 5) | gbp }} a week after 5 years and {{ inflationAdjust(100, 5, 10) | gbp }} after 10. ONS food inflation was 1.3% in September 2026."
keywords: ["uk inflation groceries", "food price inflation uk", "weekly shop cost uk", "grocery inflation calculator"]
toolSlug: "inflation"
toolCategory: "economic"
inputs:
  Weekly Shop: "£100"
  Inflation Rate: "5%"
  Time Period: "5 years"
resultSummary: "{{ inflationAdjust(100, 5, 5) | gbp }}/week after 5 years at 5% food inflation"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## Your £100 weekly shop becomes {{ inflationAdjust(100, 5, 5) | gbp }} in just 5 years

**At 5% annual food price inflation, a £100 weekly grocery shop rises to {{ inflationAdjust(100, 5, 5) | gbp }} after five years.** That is an extra {{ (inflationAdjust(100, 5, 5) - 100) * 52 | gbp }} per year on groceries alone — money that has to come from somewhere in your budget. Over a decade, the same shop costs {{ inflationAdjust(100, 5, 10) | gbp }}.

## UK food inflation in context

UK food prices rose sharply from 2022–2024, peaking at 19.2% annual inflation in March 2023 — the highest rate in over 45 years (ONS). While the headline rate has fallen since then, food prices have not dropped — they simply stopped rising as fast. The latest ONS reading, for September 2026, is 1.3% for food and non-alcoholic beverages, with prices down 0.2% in the month ([ONS consumer price inflation, September 2026](https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026)).

The 5% rate used in this scenario is therefore a stress test, not a forecast. It is faster than the latest ONS reading and far below the 2023 peak. Use it to see how a sustained rise would compound:

- **March 2023 peak:** 19.2% annual food inflation (ONS)
- **September 2026:** 1.3% (ONS)
- **This scenario:** 5% a year, held for the whole period

## What {{ inflationAdjust(100, 5, 5) - 100 | gbp }} a week extra actually looks like

An extra {{ inflationAdjust(100, 5, 5) - 100 | gbp }} per week on groceries is {{ (inflationAdjust(100, 5, 5) - 100) * 52 | gbp }} per year. Over 5 years, the cumulative extra spend is:

- **Year 1:** {{ (inflationAdjust(100, 5, 1) - 100) * 52 | gbp }} extra/year
- **Year 2:** {{ (inflationAdjust(100, 5, 2) - 100) * 52 | gbp }} extra/year
- **Year 3:** {{ (inflationAdjust(100, 5, 3) - 100) * 52 | gbp }} extra/year
- **Year 4:** {{ (inflationAdjust(100, 5, 4) - 100) * 52 | gbp }} extra/year
- **Year 5:** {{ (inflationAdjust(100, 5, 5) - 100) * 52 | gbp }} extra/year
- **Total extra over 5 years:** {{ ((inflationAdjust(100, 5, 1) - 100) + (inflationAdjust(100, 5, 2) - 100) + (inflationAdjust(100, 5, 3) - 100) + (inflationAdjust(100, 5, 4) - 100) + (inflationAdjust(100, 5, 5) - 100)) * 52 | gbp }}

For a family spending £150/week on food, the same 5% inflation adds {{ ((inflationAdjust(100, 5, 1) - 100) + (inflationAdjust(100, 5, 2) - 100) + (inflationAdjust(100, 5, 3) - 100) + (inflationAdjust(100, 5, 4) - 100) + (inflationAdjust(100, 5, 5) - 100)) * 52 * 1.5 | gbp }} over five years. These are not abstract numbers — they represent fewer restaurant meals, cancelled subscriptions, or reduced savings.

## 10-year projection

Over a decade, compound inflation hits harder:

| Year | Weekly shop cost | Annual cost | Annual increase |
|------|-----------------|------------|-----------------|
| 0 | £100 | {{ 100 * 52 | gbp }} | — |
| 2 | {{ inflationAdjust(100, 5, 2) | gbp }} | {{ inflationAdjust(100, 5, 2) * 52 | gbp }} | {{ (inflationAdjust(100, 5, 2) - 100) * 52 | gbp }} |
| 5 | {{ inflationAdjust(100, 5, 5) | gbp }} | {{ inflationAdjust(100, 5, 5) * 52 | gbp }} | {{ (inflationAdjust(100, 5, 5) - 100) * 52 | gbp }} |
| 7 | {{ inflationAdjust(100, 5, 7) | gbp }} | {{ inflationAdjust(100, 5, 7) * 52 | gbp }} | {{ (inflationAdjust(100, 5, 7) - 100) * 52 | gbp }} |
| 10 | {{ inflationAdjust(100, 5, 10) | gbp }} | {{ inflationAdjust(100, 5, 10) * 52 | gbp }} | {{ (inflationAdjust(100, 5, 10) - 100) * 52 | gbp }} |

After 10 years at 5%, you spend {{ (inflationAdjust(100, 5, 10) - 100) * 52 | gbp }} more per year on groceries than you do now. Your weekly shop has gone up {{ inflationAdjust(100, 5, 10) - 100 | pct }}.

## Groceries vs wages: the squeeze

Food inflation matters most when it outpaces wage growth. Suppose, as an assumption for this example, that wages grow 3% a year while food prices rise 5%. Groceries then take a larger share of your income each year.

For a household earning £35,000 after tax:
- **Groceries at £100/week:** {{ 100 * 52 / 35000 * 100 | pct1 }} of income
- **After 5 years (food inflation 5%, wage growth 3%):** Groceries at {{ inflationAdjust(100, 5, 5) | gbp }}/week on a {{ inflationAdjust(35000, 3, 5) | gbp }} salary = {{ inflationAdjust(100, 5, 5) * 52 / inflationAdjust(35000, 3, 5) * 100 | pct1 }} of income

That {{ (inflationAdjust(100, 5, 5) * 52 / inflationAdjust(35000, 3, 5) - 100 * 52 / 35000) * 100 | num(1) }} percentage point shift might seem small, but it represents about {{ (inflationAdjust(100, 5, 5) * 52 / inflationAdjust(35000, 3, 5) - 100 * 52 / 35000) * inflationAdjust(35000, 3, 5) | gbp }} a year less available for everything else.

## Practical ways to manage rising food costs

- **Switch supermarkets:** The budget chains (Aldi, Lidl) and the premium chains (Waitrose, M&S) price a comparable basket very differently, so a trial month at a cheaper store is worth doing.
- **Meal planning:** Planning meals for the week and shopping from a list reduces impulse buys and food waste.
- **Own-brand products:** Supermarket own-brand items are typically cheaper than branded equivalents, with comparable quality for staples.
- **Batch cooking:** Preparing meals in bulk and freezing portions is cheaper per serving than cooking individual meals daily.
- **Seasonal produce:** Buying fruit and vegetables in season costs less and reduces the impact of import-driven inflation.

None of these removes inflation, but combining several can lower your own basket's rate below the headline figure. Track your own receipts for a month to find out.

Use the [Inflation Calculator](/tools/economic/inflation/) to see how any cost — groceries, rent, childcare — changes over time at different inflation rates, and read [how we calculate inflation](/how-we-calculate/inflation/) for the method.
