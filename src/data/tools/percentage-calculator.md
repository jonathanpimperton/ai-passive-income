---
name: "Percentage Calculator"
slug: "percentage-calculator"
category: "utility"
description: "Calculate percentages instantly — what is X% of Y, percentage change, percentage difference, and more. Free, no signup, no ads."
keywords:
  - "percentage calculator"
  - "what is X percent of Y"
  - "percentage change calculator"
  - "percent increase calculator"
  - "percent decrease calculator"
  - "percentage difference calculator"
  - "how to calculate percentage"
relatedTools:
  - "roi"
  - "compound-interest"
  - "inflation"
  - "savings-goal"
faq:
  - question: "How do I calculate what X% of Y is?"
    answer: "Multiply the number by the percentage and divide by 100. For example, 15% of 200 = (200 × 15) ÷ 100 = 30. Alternatively, convert the percentage to a decimal first: 15% = 0.15, then 200 × 0.15 = 30. Our calculator handles this instantly for any numbers."
  - question: "How do I calculate percentage change?"
    answer: "Percentage change = ((New Value – Old Value) ÷ Old Value) × 100. For example, if a stock price goes from $50 to $65: ((65 – 50) ÷ 50) × 100 = 30% increase. If it goes from $65 to $50: ((50 – 65) ÷ 65) × 100 = –23.1% decrease. Note that the same absolute change ($15) gives different percentages depending on the starting value."
  - question: "What is the difference between percentage change and percentage difference?"
    answer: "Percentage change measures the relative change from one value to another (and has a direction — increase or decrease). Percentage difference measures how far apart two values are relative to their average, with no direction. Percentage difference = (|A – B| ÷ ((A + B) ÷ 2)) × 100. Use percentage change when comparing a before/after. Use percentage difference when comparing two independent values."
  - question: "How do I find what percentage one number is of another?"
    answer: "Divide the part by the whole and multiply by 100. For example, 'What percentage is 35 of 200?' = (35 ÷ 200) × 100 = 17.5%. This is useful for calculating discounts, test scores, tip percentages, and proportions."
  - question: "How do I reverse-calculate a percentage (find the original number)?"
    answer: "If you know the result and the percentage, divide the result by the percentage as a decimal. For example, if 25% of a number is 60, then the original number = 60 ÷ 0.25 = 240. Similarly, if something costs $80 after a 20% discount, the original price was $80 ÷ 0.80 = $100."
workedExamples:
  - title: "Calculating a tip"
    inputs:
      value: 85
      percentage: 18
    description: "Finding 18% of an $85 restaurant bill: $85 × 0.18 = $15.30 tip. Total bill with tip: $100.30. Quick mental shortcut: 10% of $85 is $8.50, double that for 20% ($17), then take a bit less for 18%."
  - title: "Salary increase percentage"
    inputs:
      oldValue: 52000
      newValue: 58500
    description: "A salary went from $52,000 to $58,500. Percentage increase: ((58,500 – 52,000) ÷ 52,000) × 100 = 12.5% raise. When negotiating, it's useful to know both the dollar amount ($6,500) and the percentage (12.5%) — employers often think in percentages while employees think in dollars."
  - title: "Discount calculation"
    inputs:
      originalPrice: 250
      discountPercent: 35
    description: "A $250 item is 35% off. Discount amount: $250 × 0.35 = $87.50. Sale price: $250 – $87.50 = $162.50. If there's 8% sales tax on the discounted price: $162.50 × 1.08 = $175.50 final cost."
---

## How Percentages Work

A percentage is simply a number expressed as a fraction of 100. The word "percent" literally means "per hundred." When you see 25%, it means 25 out of every 100, or 0.25 as a decimal, or 1/4 as a fraction.

This calculator handles four common percentage operations: finding X% of a number, finding what percentage one number is of another, calculating percentage change (increase or decrease), and calculating percentage difference between two values.

## The Four Calculation Modes

**What is X% of Y?** — Multiply the number by the percentage as a decimal. Example: 18% of $85 = $85 × 0.18 = $15.30. Use this for tips, discounts, tax calculations, and proportions.

**X is what % of Y?** — Divide the part by the whole and multiply by 100. Example: 42 out of 50 = (42 ÷ 50) × 100 = 84%. Use this for test scores, budget proportions, and performance metrics.

**Percentage change** — Measures how much a value increased or decreased relative to its original value: ((New - Old) ÷ Old) × 100. Example: salary from $52,000 to $58,500 = +12.5%. Note that percentage changes are asymmetric — a 50% increase followed by a 50% decrease doesn't return to the original value.

**Percentage difference** — Measures how far apart two values are relative to their average: |A - B| ÷ ((A + B) ÷ 2) × 100. Unlike percentage change, this has no direction and treats both values equally. Use it to compare two independent measurements, prices, or scores.

## Mental Shortcuts

Quick percentage tricks for everyday use:

- **10% of any number:** Move the decimal point one place left. 10% of $85 = $8.50.
- **5%:** Half of 10%. 5% of $85 = $4.25.
- **20%:** Double 10%. 20% of $85 = $17.00.
- **15%:** Add 10% and half of 10%. 15% of $85 = $8.50 + $4.25 = $12.75.
- **25%:** Divide by 4. 25% of $200 = $50.
- **1%:** Move the decimal two places left. 1% of $85 = $0.85. Then multiply for any percentage.

## Common Percentage Pitfalls

**Percentages don't add up symmetrically.** A 20% increase followed by a 20% decrease doesn't return to the starting value. $100 + 20% = $120. $120 - 20% = $96. You're down $4.

**The base matters.** A $15 increase on a $50 item is 30%. The same $15 increase on a $500 item is 3%. Always consider what the percentage is relative to.
