---
name: "Retirement Age Calculator"
slug: "retirement-age"
category: "income-and-planning"
description: "Find out when you can afford to retire based on your savings, contributions, and target."
keywords:
  - "when can I retire"
  - "retirement age calculator"
  - "early retirement calculator"
  - "when to retire"
  - "FIRE calculator"
relatedTools:
  - "retirement-savings"
  - "retirement-contribution"
  - "compound-interest"
  - "investment-return"
  - "investment-fee"
  - "inflation"
affiliateContext: "Start your retirement savings with a free account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
calculationMethod: "Uses binary search to find the age when projected savings reach the target balance"
faq:
  - question: "At what age can I realistically retire?"
    answer: "It depends entirely on your savings rate and investment returns. With $50,000 saved, $500/month contributions, and 7% returns, you'd reach $1 million around age 62. Increasing contributions to $1,000/month moves that to around 55. The key variables are how much you save and what your target is."
  - question: "Can I retire early with $500,000?"
    answer: "$500,000 supports about $20,000/year using the 4% rule. If that covers your expenses (possibly supplemented by Social Security), you can retire. If you spend $40,000/year, you need to keep saving. Use this calculator to find the exact age your savings will reach your target."
  - question: "What is a good target to retire at 50?"
    answer: "Retiring at 50 means 15+ years before Social Security and Medicare. You'll need your savings to cover everything. At $50,000/year spending, target $1.5 million (using a conservative 3.3% withdrawal rate for the longer retirement). At $30,000/year, $1 million may suffice."
  - question: "How does increasing my savings rate affect my retirement age?"
    answer: "Dramatically. Doubling your monthly contribution doesn't just add more money — each extra dollar also gets more compounding time. Going from $500/month to $1,000/month might move your retirement date up by 7-10 years depending on your current savings and returns."
  - question: "What's the difference between this and the FIRE number?"
    answer: "The FIRE (Financial Independence, Retire Early) number is typically 25x your annual expenses — the 4% rule applied to early retirement. This calculator finds when you'll reach any target you set. For FIRE, enter 25x your expenses as the target and see when you'll hit it."
  - question: "Should I factor in Social Security?"
    answer: "If you're planning to retire before 62, Social Security won't help initially. For retirement at 62+, check your estimated benefit at ssa.gov and subtract it from your annual expenses before calculating your target. For example, if you need $50,000/year and Social Security provides $20,000, your savings only need to cover $30,000/year — requiring $750,000 instead of $1.25 million."
workedExamples:
  - title: "When can I retire with $1 million?"
    inputs:
      currentAge: 35
      currentSavings: 100000
      monthlyContribution: 1000
      targetBalance: 1000000
      annualReturn: 7
    description: "A 35-year-old with $100,000 saved and $1,000/month contributions at 7% returns will reach $1 million around age 56. That's 21 years of saving, with compound growth contributing $748,000 of the total."
  - title: "FIRE target at aggressive savings rate"
    inputs:
      currentAge: 28
      currentSavings: 50000
      monthlyContribution: 2500
      targetBalance: 1500000
      annualReturn: 8
    description: "Saving $2,500/month (aggressive FIRE rate) at 8% returns with $50,000 head start. You'd hit $1.5 million around age 49 — retiring before 50. Total contributions: $680,000. Compound growth: $820,000."
  - title: "Modest saver targeting comfortable retirement"
    inputs:
      currentAge: 40
      currentSavings: 75000
      monthlyContribution: 500
      targetBalance: 750000
      annualReturn: 7
    description: "A 40-year-old with $75,000 saved and $500/month at 7%. You'd reach $750,000 around age 62. At the 4% rule, that provides $30,000/year from savings, supplemented by Social Security for a comfortable retirement."
---

## What Is a Retirement Age Calculator?

This calculator answers the question everyone eventually asks: "When can I stop working?" Given your current savings, how much you're putting away each month, and your investment returns, it finds the age when you'll reach your retirement savings target.

Unlike calculators that assume a fixed retirement age, this one treats retirement age as the output. You tell it where you are and where you want to be, and it tells you when you'll get there.

> **Key takeaway:** Your retirement date is not fixed at 65. It's a direct function of your savings rate. Small changes in monthly contributions can move your retirement date by years.

## How the Calculation Works

The calculator uses binary search to find the year when your projected balance crosses your target. For each candidate year, it computes the compound growth of your existing savings plus all future contributions, and narrows the range until the answer converges.

This approach handles the non-linear relationship between time and growth correctly — there's no simple formula to solve for time when both principal and contributions are growing.

## Key Milestones on the Timeline

<div class="stat-highlight">
  <span class="stat-number">59½</span>
  <span class="stat-text">is the age when 401(k) and IRA withdrawals become penalty-free. Retiring before this means you'll need taxable accounts or Roth conversion strategies to bridge the gap.</span>
</div>

| Age | What happens |
|-----|-------------|
| **50** | Eligible for catch-up contributions ($7,500 extra to 401(k) in 2025) |
| **55** | Rule of 55: penalty-free 401(k) withdrawal if you leave your employer at 55+ |
| **59½** | No more 10% early withdrawal penalty on 401(k)/IRA |
| **62** | Earliest Social Security (at reduced benefit — roughly 70% of full) |
| **65** | Medicare eligibility |
| **67** | Full Social Security retirement age (born after 1960) |
| **70** | Maximum Social Security benefit (132% of full benefit) |

## The Savings Rate Effect

The relationship between savings rate and retirement age is not linear — it's logarithmic. The first $100/month of extra savings might move your retirement 3 years earlier. The next $100/month might only move it 2 years. But those years still compound:

- **$500/month** at 7%: reach $1M around age 65 (starting at 30 with $50K)
- **$1,000/month** at 7%: reach $1M around age 55
- **$2,000/month** at 7%: reach $1M around age 48

Doubling your savings rate cuts the timeline by roughly 10 years.

## What to Do Next

Enter your actual numbers and see when you'll reach your target. If the date is later than you'd like, experiment with increasing your monthly contribution. Even $100-200 more per month can move the date significantly. Also try adjusting your target — the difference between needing $1 million and $800,000 might be 3 years of extra work.
