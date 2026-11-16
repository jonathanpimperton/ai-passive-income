---
title: "Index Funds vs Active Funds: Where to Invest?"
slug: "index-funds-vs-active-funds"
description: "Index funds vs active funds: what a 0.10% and a 1.00% fee cost over 30 years on $500 a month, and when paying an active manager is worth considering."
keywords:
  - "index funds vs active funds"
  - "passive vs active investing"
  - "index fund fees comparison"
relatedTools:
  - "investment-fee"
  - "investment-return"
  - "compound-interest"
  - "roi"
  - "retirement-savings"
  - "retirement-age"
verdict: "Use index funds for the core of your portfolio. Fees are the one number you can see in advance: on $500 a month for 30 years at a 7% gross return, a 1.00% fee leaves {{ feeDrag(0, 500, 7, 30, 0.1).balance - feeDrag(0, 500, 7, 30, 1).balance | usd }} less than a 0.10% fee. Pay for active management only if you can say why a fund should beat its index by more than its extra fee, every year, for decades."
comparisonTable:
  - feature: "Typical annual fee (expense ratio)"
    option1: "Index equity ETFs averaged 0.14% in 2025; the largest broad-market funds charge less"
    option2: "Equity mutual funds averaged 0.40% in 2025, index and active combined; active funds charge more than index funds"
  - feature: "Growth lost to fees on $100,000 over 30 years (7% gross, no deposits)"
    option1: "{{ feeDrag(100000, 0, 7, 30, 0.1).cost | usd }} (at 0.10%)"
    option2: "{{ feeDrag(100000, 0, 7, 30, 1).cost | usd }} (at 1.00%)"
  - feature: "$500 a month for 30 years (7% gross)"
    option1: "{{ feeDrag(0, 500, 7, 30, 0.1).balance | usd }} (at 0.10%)"
    option2: "{{ feeDrag(0, 500, 7, 30, 1).balance | usd }} (at 1.00%)"
  - feature: "Beating the index after fees"
    option1: "Matches the index, less a small fee"
    option2: "Most US large-cap active funds trail the S&P 500 over 15 years (SPIVA)"
  - feature: "Strategy"
    option1: "Buy everything in the market"
    option2: "A manager picks the holdings"
  - feature: "Tax efficiency"
    option1: "High, low turnover"
    option2: "Lower, trading creates taxable gains in a taxable account"
  - feature: "Minimum investment"
    option1: "Often none (ETFs)"
    option2: "Varies; some mutual funds ask for $1,000 or more"
affiliateContext: "Start investing with low fees"
affiliatePrograms:
  - "Betterment"
  - "InvestEngine"
faq:
  - question: "How much do investment fees cost over 30 years?"
    answer: "On $500 a month at a 7% gross return, a 1.00% fee leaves {{ feeDrag(0, 500, 7, 30, 1).balance | usd }} after 30 years against {{ feeDrag(0, 500, 7, 30, 0.1).balance | usd }} at 0.10%, a gap of {{ feeDrag(0, 500, 7, 30, 0.1).balance - feeDrag(0, 500, 7, 30, 1).balance | usd }}. On a single $100,000 deposit with no further contributions, the same fees take {{ feeDrag(100000, 0, 7, 30, 1).cost | usd }} of growth at 1.00% and {{ feeDrag(100000, 0, 7, 30, 0.1).cost | usd }} at 0.10%."
  - question: "Do active funds ever beat index funds?"
    answer: "Some do in any given year, but few keep doing it. The SPIVA scorecards from S&P Dow Jones Indices find that most US large-cap active funds trail the S&P 500 over 5, 10 and 15-year periods, and its persistence reports find that few top-performing funds stay on top. Fees are a guaranteed drag; skill is not guaranteed."
  - question: "What is a good expense ratio?"
    answer: "For a broad-market index fund, the lowest cost you can find from a large provider, which is typically well under 0.10%. For all your fund costs combined, a total of about 0.5% a year or less is a reasonable ceiling: on $500,000 that is {{ 500000 * 0.005 | usd }} a year."
  - question: "Can UK investors use the funds named here?"
    answer: "Usually not. The tickers on this page are US-listed. UK investors generally buy UCITS-domiciled global index funds or ETFs instead, and the same principle applies: compare the ongoing charge, and choose the lowest-cost broad index tracker."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "ICI — Mutual Fund and ETF Fees Remained Near Historic Lows in 2025"
    url: "https://www.ici.org/news-release/mutual-fund-and-etf-fees-remained-near-historic-lows-in-2025"
  - name: "S&P Dow Jones Indices — SPIVA U.S. Scorecard, Year-End 2025"
    url: "https://www.spglobal.com/spdji/en/spiva/article/spiva-us-year-end-2025/"
---

## The fee gap is the entire story

The difference between a 0.10% and a 1.00% [expense ratio](/tools/saving-and-growth/investment-fee/) sounds small: it is {{ 100000 * 0.001 | usd }} against {{ 100000 * 0.01 | usd }} a year on a $100,000 portfolio. But [fees compound just like returns](/tools/saving-and-growth/compound-interest/), except they compound *against* you.

Investing $500 a month for 30 years at a 7% gross return, with fees taken from the return and monthly compounding:

- **Index fund (0.10% fee):** {{ feeDrag(0, 500, 7, 30, 0.1).balance | usd }}
- **Active fund (1.00% fee):** {{ feeDrag(0, 500, 7, 30, 1).balance | usd }}
- **No fee at all:** {{ feeDrag(0, 500, 7, 30, 0).balance | usd }}

That {{ 1 - 0.1 | num(2) }}% difference in fees costs {{ feeDrag(0, 500, 7, 30, 0.1).balance - feeDrag(0, 500, 7, 30, 1).balance | usd }}, money the fund company earned instead of you. You pay in {{ feeDrag(0, 500, 7, 30, 0.1).contributions | usd }} in total, so the 1.00% fee takes {{ feeDrag(0, 500, 7, 30, 1).shareOfGrowth | pct }} of the growth you would have had at no fee. And this assumes the active fund matches the index before fees, which most do not. Check your own funds in the [investment fee calculator](/tools/saving-and-growth/investment-fee/).

## The fees you don't see

The expense ratio is only the first layer. Add an adviser and a workplace plan and the layers stack:

| Fee layer | Typical range | On a $500,000 portfolio |
|---|---|---|
| Fund expense ratio | 0.03–1.5% | {{ 500000 * 0.0003 | usd }}–{{ 500000 * 0.015 | usd }} a year |
| Financial adviser | 0.5–1.0% | {{ 500000 * 0.005 | usd }}–{{ 500000 * 0.01 | usd }} a year |
| 401(k) plan admin | 0.1–0.5% | {{ 500000 * 0.001 | usd }}–{{ 500000 * 0.005 | usd }} a year |
| **Combined** | **{{ 0.03 + 0.5 + 0.1 | num(2) }}–{{ 1.5 + 1 + 0.5 | num(1) }}%** | **{{ 500000 * (0.0003 + 0.005 + 0.001) | usd }}–{{ 500000 * (0.015 + 0.01 + 0.005) | usd }} a year** |

At the top of that range, a $500,000 portfolio pays {{ 500000 * 0.03 | usd }} every year before you earn a penny. A sensible target is to keep your all-in cost under **0.5%**: that is {{ 500000 * 0.005 | usd }} a year on the same portfolio, leaving the other {{ 500000 * 0.025 | usd }} compounding for you. [Check what your funds actually charge](/tools/saving-and-growth/investment-fee/).

## What the SPIVA scorecard shows

S&P Dow Jones Indices publishes the SPIVA scorecard, which compares active funds with their benchmark index. Its consistent finding is that most US large-cap active funds underperform the S&P 500 over 5, 10 and 15 years, and that the share that underperforms grows with the length of the period. SPIVA also counts funds that closed or merged during the period, so the figures are not flattered by only looking at survivors.

This is not because fund managers are unskilled. Fees and trading costs are a guaranteed drag on returns, while the ability to beat the market year after year is rare and difficult to spot in advance. Read the [latest SPIVA report](https://www.spglobal.com/spdji/en/spiva/article/spiva-us-year-end-2025/) for the percentages by category and period.

## When active funds can make sense

Active management isn't always wrong:

- **Less efficient corners of the market.** Some argue that small-cap and emerging-market stocks leave more mispriced shares for skilled managers to find. SPIVA still shows most active funds in those categories trailing their indexes over long periods, and the fee drag is the same, so the case is weaker than it sounds.
- **Bond funds.** Active bond managers can adjust duration, credit quality and sector mix. Compare the fee against the yield you would give up by holding an index bond fund.
- **Specific themes.** If you want exposure to a sector (healthcare innovation, clean energy) that index funds do not cover well, an active fund may be your only option.

## The compromise: core and satellite

Use index funds for 80-90% of your portfolio (the "core"): US total market, international and bonds. Use 10-20% for active funds or individual stocks if you enjoy researching investments (the "satellites").

This captures most of the index-fund cost savings while letting you act on conviction in specific areas. If the active portion underperforms, it does not derail your overall returns.

## What to actually buy

For most US investors, a three-fund portfolio covers everything:

1. **US total stock market index** (for example VTI or FSKAX)
2. **International stock index** (for example VXUS or FTIHX)
3. **US bond index** (for example BND or FXNAX)

Choose the lowest-cost version of each from a large provider and adjust the split for your age and risk tolerance. Rebalance about once a year. Broad index funds like these typically charge well under 0.10% a year, which on $100,000 is under {{ 100000 * 0.001 | usd }}. Fund costs change, so check the current expense ratio on the fund's own page before you buy.

If you invest from the UK, these US-listed funds are generally not available to retail investors. Use UCITS-domiciled global index funds or ETFs instead and compare their ongoing charges the same way.
