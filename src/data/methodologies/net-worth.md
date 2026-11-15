---
title: "How We Calculate: Net Worth"
slug: "net-worth"
toolSlug: "net-worth"
formula: "Net Worth = Total Assets − Total Liabilities; Debt-to-Asset Ratio = Total Liabilities / Total Assets; Equity Share = Net Worth / Total Assets"
variables:
  - name: "Assets"
    description: "Everything you own that has financial value: cash, investments, property, vehicles, etc. Each item is a positive amount"
  - name: "Liabilities"
    description: "Everything you owe: mortgages, student loans, car loans, credit card balances, etc. Each item is a positive amount"
  - name: "Net Worth"
    description: "The difference between what you own and what you owe. It is negative when you owe more than you own"
  - name: "Debt-to-Asset Ratio"
    description: "Total liabilities divided by total assets. Not defined when total assets are zero"
  - name: "Equity Share"
    description: "Net worth divided by total assets: the part of what you own that is not owed to anyone. Not defined when total assets are zero"
assumptions:
  - "Asset values are current market values (what you could sell them for today)"
  - "Liability values are current outstanding balances"
  - "All values are entered in the same currency. The currency selector changes the symbol and renames two untouched default items (Checking Account and 401(k) become Current Account and Pension in GBP and EUR mode), and nothing else"
  - "Amounts are entered as positive numbers. Money you owe belongs under Liabilities, and a negative amount in either list is refused with a message, not added up as a negative"
  - "Amounts can be typed with commas, decimals or k/m suffixes (for example 50,000 or 1.5m). An entry the calculator cannot read in the selected currency is refused and not guessed"
  - "An item that is blank or not a valid number counts as zero"
  - "No future appreciation or depreciation is modelled"
  - "No tax on unrealised gains is considered"
limitations:
  - "Does not track net worth over time: it is a single snapshot"
  - "Does not account for tax owed on retirement account withdrawals (a $500,000 pre-tax 401(k) is worth less than $500,000 after tax)"
  - "Does not model asset appreciation or liability paydown"
  - "Does not distinguish between liquid and illiquid assets"
  - "Personal property (furniture, clothing, electronics) is typically left out by convention"
  - "Does not account for human capital (future earning potential)"
  - "Home value estimates are imprecise"
dataSources:
  - name: "Federal Reserve: Survey of Consumer Finances"
    url: "https://www.federalreserve.gov/econres/scfindex.htm"
  - name: "Investopedia: Net Worth"
    url: "https://www.investopedia.com/terms/n/networth.asp"
---

## What This Formula Does

Net worth is the simplest and most useful number in personal finance. It answers one question: "If I sold everything I own and paid off everything I owe, how much would I have left?"

The formula is subtraction. Add up your assets (current accounts, savings, investments, retirement accounts, home value, vehicle value). Add up your liabilities (mortgage balance, student loans, car loans, credit card debt, personal loans). Subtract liabilities from assets.

A positive net worth means you own more than you owe. A negative one means you owe more than you own, which is common for recent graduates with student debt and few assets.

The calculator also shows two ratios: liabilities divided by assets (the debt-to-asset ratio) and net worth divided by assets (the equity share). Both are left blank when your assets total zero, because dividing by zero has no meaning.

## Worked Example

The calculator's default items add up as follows:

- **Assets:** 5,000 (current account) + 15,000 (savings) + 45,000 (401(k) or pension) + 300,000 (home) + 18,000 (car) = {{ 5000 + 15000 + 45000 + 300000 + 18000 | usd }}
- **Liabilities:** 240,000 (mortgage) + 25,000 (student loans) + 12,000 (auto loan) + 3,000 (credit card) = {{ 240000 + 25000 + 12000 + 3000 | usd }}
- **Net worth:** {{ 5000 + 15000 + 45000 + 300000 + 18000 - (240000 + 25000 + 12000 + 3000) | usd }}
- **Debt-to-asset ratio:** {{ (240000 + 25000 + 12000 + 3000) / (5000 + 15000 + 45000 + 300000 + 18000) * 100 | pct1 }}
- **Equity share:** {{ (5000 + 15000 + 45000 + 300000 + 18000 - (240000 + 25000 + 12000 + 3000)) / (5000 + 15000 + 45000 + 300000 + 18000) * 100 | pct1 }}

## What Counts as an Asset

The calculator provides default categories and lets you add or remove items. Common asset categories:

**Liquid assets:** Current or checking accounts, savings accounts, money market funds, cash. These can be turned into cash quickly.

**Investment assets:** Brokerage accounts, retirement accounts (401(k), IRA, pension), stocks, bonds, mutual funds, ETFs. Include retirement accounts at their current balance, even though tax may be due on withdrawals.

**Real property:** Home value (estimate what it would sell for, not what you paid), rental properties, land.

**Personal property:** Vehicles (use a price guide for the current value), valuable collections, jewellery. Most personal property (furniture, electronics, clothing) loses value fast and is conventionally excluded.

## What Counts as a Liability

**Secured debt:** Mortgage, car loans, home equity loans and HELOCs. These are backed by an asset that is also on your list.

**Unsecured debt:** Credit cards, personal loans, medical debt. Nothing backs them but your promise to pay.

**Student loans:** Federal and private student loans. Include the full outstanding balance.

## How to Use Net Worth Effectively

Net worth is most useful as a trend. One snapshot tells you where you are, and tracking it quarterly or yearly tells you whether you are moving in the right direction. It should rise as you pay down debt, save and let investments grow.

**Debt-to-asset ratio:** A lower ratio means less of what you own is financed by debt. There is no official cut-off, so watch the direction of travel.

**Liquid net worth:** Subtract your home and retirement accounts from your net worth to see your accessible position, which matters for emergencies and big purchases.

## Common Misconceptions

The biggest misconception is counting your home's full value without counting the mortgage. Your home adds your equity (market value minus mortgage balance) to your net worth, not its full value. A $400,000 home with a $350,000 mortgage adds {{ 400000 - 350000 | usd }}.

Another common error is using the purchase price instead of the current market value. A car bought for $35,000 three years ago might be worth much less today, and a house bought a decade ago might be worth much more.

Some people leave out retirement accounts because they cannot touch the money before 59½. Early withdrawals may carry penalties, but the money is still yours and has real value, so include it. For a more cautious view, reduce retirement account values by your expected tax rate: at a 25% effective rate, a $100,000 401(k) counts as {{ 100000 * (1 - 25 / 100) | usd }}.

## Why This Calculator Exists

Net worth is the scoreboard of personal finance. It cuts through the complexity of several accounts, debts and assets to give one number for your overall financial position. The donut charts show how your assets and liabilities break down, with a data table behind each chart.
