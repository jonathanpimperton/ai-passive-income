---
title: "$100K Reinvested for 20 Years Grows to {{ compoundFV(100000, 0, 7, 20) | usd }}"
slug: "100k-investment-dividend-reinvest"
description: "$100,000 at 7% with dividends reinvested grows to {{ compoundFV(100000, 0, 7, 20) | usd }} in 20 years. Compare spending the dividends, and see what tax and monthly deposits change."
keywords: ["100k dividend reinvestment", "dividend reinvestment calculator", "100000 invested 20 years", "DRIP calculator"]
toolSlug: "investment-return"
toolCategory: "saving-and-growth"
inputs:
  Starting Amount: "$100,000"
  Monthly Contribution: "$0"
  Annual Return: "7%"
  Time Period: "20 years"
resultSummary: "{{ compoundFV(100000, 0, 7, 20) | usd }} (from $100,000 invested)"
affiliateContext: "Start investing with low fees"
affiliatePrograms:
  - "Betterment"
  - "InvestEngine"
datePublished: "2026-03-04"
dateModified: "2026-11-15"
---

## $100,000 becomes {{ compoundFV(100000, 0, 7, 20) | usd }} with dividends reinvested

**A $100,000 investment earning 7% a year, compounded monthly, grows to approximately {{ compoundFV(100000, 0, 7, 20) | usd }} over 20 years when all dividends and gains are reinvested.** That is {{ compoundEarned(100000, 0, 7, 20) | usd }} of investment growth, or {{ compoundFV(100000, 0, 7, 20) / 100000 | num(1) }} times your starting amount, with no additional contributions.

## Reinvesting vs spending dividends

A 7% total return on a diversified stock portfolio comes from two sources. For this example, assume 2% is paid out as dividends and 5% comes from price growth. These are illustrative splits, not a forecast. What you do with the dividends changes the outcome a lot. Every scenario below uses the same method as the 7% line: monthly compounding, 20 years.

**Scenario 1: Reinvest all dividends (7% total return)**
- After 20 years: {{ compoundFV(100000, 0, 7, 20) | usd }}
- Total growth: {{ compoundEarned(100000, 0, 7, 20) | usd }}

**Scenario 2: Spend the dividends, keep only the price growth (5% a year)**
- After 20 years the portfolio is worth {{ compoundFV(100000, 0, 5, 20) | usd }}.
- Dividends spent over the 20 years: about {{ 100000 * 2 / 100 / 12 * compoundFV(0, 1, 5, 20) | usd }}. The yield applies to a balance that keeps growing, so the payouts rise over time.
- Portfolio plus dividends spent: {{ compoundFV(100000, 0, 5, 20) + 100000 * 2 / 100 / 12 * compoundFV(0, 1, 5, 20) | usd }}

**Scenario 3: Spend a fixed $2,000 a year (2% of the original $100,000), keep the price growth**
- After 20 years the portfolio is worth {{ compoundFV(100000, 0, 5, 20) | usd }}, the same as Scenario 2.
- Dividends spent: {{ 2000 * 20 | usd }}, so portfolio plus dividends is {{ compoundFV(100000, 0, 5, 20) + 2000 * 20 | usd }}.

Reinvesting leaves a portfolio worth {{ compoundFV(100000, 0, 7, 20) - compoundFV(100000, 0, 5, 20) | usd }} more than spending the dividends. Counting the dividends you spent in Scenario 2 as cash in hand, the advantage of reinvesting is {{ compoundFV(100000, 0, 7, 20) - compoundFV(100000, 0, 5, 20) - 100000 * 2 / 100 / 12 * compoundFV(0, 1, 5, 20) | usd }}, before tax. The reason: reinvested dividends buy more shares, which generate their own dividends, which buy more shares.

## Year-by-year growth milestones

- **Year 1:** {{ compoundFV(100000, 0, 7, 1) | usd }} (+{{ compoundEarned(100000, 0, 7, 1) | usd }})
- **Year 5:** {{ compoundFV(100000, 0, 7, 5) | usd }} (+{{ compoundEarned(100000, 0, 7, 5) | usd }})
- **Year 10:** {{ compoundFV(100000, 0, 7, 10) | usd }} (+{{ compoundEarned(100000, 0, 7, 10) | usd }}), {{ compoundFV(100000, 0, 7, 10) / 100000 | num(1) }}x the start
- **Year 15:** {{ compoundFV(100000, 0, 7, 15) | usd }} (+{{ compoundEarned(100000, 0, 7, 15) | usd }})
- **Year 20:** {{ compoundFV(100000, 0, 7, 20) | usd }} (+{{ compoundEarned(100000, 0, 7, 20) | usd }}), {{ compoundFV(100000, 0, 7, 20) / 100000 | num(1) }}x the start

This is the Rule of 72 in action: at 7%, money doubles about every {{ 72 / 7 | num(1) }} years, so two doublings in 20 years gets you to roughly four times the start.

## How DRIP programs work

Most brokerages offer automatic dividend reinvestment plans (DRIPs). When a stock or fund pays a dividend, the DRIP uses that cash to buy more shares, often fractional shares, so nothing sits idle as cash.

Benefits of DRIP:
- **No transaction fees** on reinvested dividends at most brokerages
- **Dollar-cost averaging**: dividends buy more shares when prices are low
- **Removes the temptation** to spend small dividend payments
- **Fractional shares** mean every cent gets reinvested

The main reason to turn DRIP off is if you are retired and need the dividend income to cover expenses.

## Tax considerations

In a taxable brokerage account you owe tax on dividends whether you reinvest them or not. Reinvesting does not defer the tax. Qualified dividends are taxed federally at 0%, 15% or 20% depending on your income (higher earners can also owe the 3.8% net investment income tax); other dividends are taxed as ordinary income. See [IRS Topic 404, Dividends](https://www.irs.gov/taxtopics/tc404).

This is why tax-advantaged accounts (401(k), IRA, and the ISA in the UK) suit dividend reinvestment. Inside them, dividends compound tax-free (Roth, ISA) or tax-deferred (traditional 401(k) and IRA).

As an illustration, take the 2% dividend yield from above and a 15% tax rate on it, paid each year from the account's own growth. That trims the return by {{ 2 * 15 / 100 | num(1) }} percentage points, to {{ 7 - 2 * 15 / 100 | num(1) }}%. After 20 years the account holds about {{ compoundFV(100000, 0, 7 - 2 * 15 / 100, 20) | usd }}, which is {{ compoundFV(100000, 0, 7, 20) - compoundFV(100000, 0, 7 - 2 * 15 / 100, 20) | usd }} less. In a Roth IRA or a Stocks and Shares ISA you keep the full {{ compoundFV(100000, 0, 7, 20) | usd }}. (This ignores tax on the price gains when you sell.)

## What if you also add contributions?

Adding $500 a month on top of the $100,000 at 7% over 20 years grows to approximately {{ compoundFV(100000, 500, 7, 20) | usd }}. The $100,000 grows to {{ compoundFV(100000, 0, 7, 20) | usd }}, and the monthly contributions add another {{ compoundFV(100000, 500, 7, 20) - compoundFV(100000, 0, 7, 20) | usd }}. In total the portfolio earns {{ compoundEarned(100000, 500, 7, 20) | usd }} of investment gains on {{ 100000 + 500 * 12 * 20 | usd }} of money put in.

Use the [Investment Return Calculator](/tools/saving-and-growth/investment-return/) to model your investment with different return assumptions, contribution amounts and time horizons. The same starting amount over 30 years is on the [$100,000 invested for 30 years](/scenarios/100000-invested-30-years/) page, and the [investment growth reference](/scenarios/investment-growth/#100000) shows other amounts side by side. The method is in [how we calculate investment return](/how-we-calculate/investment-return/).

Sources (checked 15 November 2026): [IRS Topic 404, Dividends](https://www.irs.gov/taxtopics/tc404) for the federal rates on qualified dividends.
