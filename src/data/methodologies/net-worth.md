---
title: "How We Calculate: Net Worth"
slug: "net-worth"
toolSlug: "net-worth"
formula: "Net Worth = Total Assets - Total Liabilities"
variables:
  - name: "Assets"
    description: "Everything you own that has financial value — cash, investments, property, vehicles, etc."
  - name: "Liabilities"
    description: "Everything you owe — mortgages, student loans, car loans, credit card balances, etc."
  - name: "Net Worth"
    description: "The difference between what you own and what you owe"
assumptions:
  - "Asset values are current market values (what you could sell them for today)"
  - "Liability values are current outstanding balances"
  - "All values are entered in the same currency"
  - "No future appreciation or depreciation is modeled"
  - "No taxes on unrealized gains are considered"
limitations:
  - "Does not track net worth over time (single point-in-time snapshot)"
  - "Does not account for taxes owed on retirement account withdrawals (a $500,000 pre-tax 401(k) is worth less than $500,000 after-tax)"
  - "Does not model asset appreciation or liability paydown"
  - "Does not distinguish between liquid and illiquid assets"
  - "Personal property values (furniture, clothing, electronics) are typically excluded by convention"
  - "Does not account for human capital (future earning potential)"
  - "Home value estimates are inherently imprecise"
dataSources:
  - name: "Federal Reserve — Survey of Consumer Finances"
    url: "https://www.federalreserve.gov/econres/scfindex.htm"
  - name: "Investopedia — Net Worth"
    url: "https://www.investopedia.com/terms/n/networth.asp"
---

## What This Formula Does

Net worth is the simplest and most important number in personal finance. It answers one question: "If I sold everything I own and paid off everything I owe, how much would I have left?"

The formula is straightforward subtraction. Add up all your assets (checking accounts, savings, investments, retirement accounts, home value, vehicle value). Add up all your liabilities (mortgage balance, student loans, car loans, credit card debt, personal loans). Subtract liabilities from assets.

A positive net worth means you own more than you owe. A negative net worth means you owe more than you own — common for recent graduates with student debt and no significant assets yet.

## What Counts as an Asset

The calculator provides default categories but lets you add or remove items freely. Common asset categories:

**Liquid assets:** Checking accounts, savings accounts, money market funds, cash. These can be converted to cash immediately.

**Investment assets:** Brokerage accounts, retirement accounts (401(k), IRA, pension), stocks, bonds, mutual funds, ETFs. Note that retirement account values should be included at their current balance, even though you'll owe tax on withdrawals.

**Real property:** Home value (estimate what it would sell for, not what you paid), rental properties, land.

**Personal property:** Vehicles (use Kelley Blue Book or similar), valuable collections, jewelry. Most personal property (furniture, electronics, clothing) depreciates rapidly and is conventionally excluded.

## What Counts as a Liability

**Secured debt:** Mortgage, auto loans, home equity loans/HELOCs. These are backed by an asset that's also on your balance sheet.

**Unsecured debt:** Credit cards, personal loans, medical debt. No asset backing these — the lender relies on your promise to pay.

**Student loans:** Federal and private student loans. Include the full outstanding balance.

## How to Use Net Worth Effectively

Net worth is most useful as a trend. A single snapshot tells you where you are; tracking it quarterly or annually tells you whether you're moving in the right direction. The number should increase over time as you pay down debt, save, and let investments grow.

**Debt-to-asset ratio:** Divide total liabilities by total assets. Below 50% is generally considered healthy. Below 20% is strong.

**Liquid net worth:** Subtract your home value and retirement accounts from your net worth to see your accessible financial position. This matters for emergencies and major purchases.

## Common Misconceptions

The biggest misconception is including your home's value without including the mortgage. Your home contributes your equity (market value minus mortgage balance) to net worth, not its full value. A $400,000 home with a $350,000 mortgage adds only $50,000 to net worth.

Another common error is using purchase price instead of current market value. A car bought for $35,000 three years ago might be worth $20,000 today. A home bought for $250,000 ten years ago might be worth $400,000.

Some people exclude retirement accounts because "I can't touch that money until 59.5." While there are penalties for early withdrawal, the money is still yours and has real value. Include it. If you want a more conservative view, reduce retirement account values by your expected tax rate (e.g., count a $100,000 401(k) as $75,000 if you expect a 25% effective rate in retirement).

## Why This Calculator Exists

Net worth is the scoreboard of personal finance. It cuts through the complexity of multiple accounts, debts, and assets to give you one number that represents your overall financial position. The pie chart visualization shows your asset allocation and debt composition at a glance.
