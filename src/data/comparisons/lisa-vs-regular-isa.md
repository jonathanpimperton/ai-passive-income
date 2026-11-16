---
title: "LISA vs Regular ISA: Which Suits UK Savers?"
slug: "lisa-vs-regular-isa"
description: "Compare the Lifetime ISA and regular Stocks & Shares ISA. See the 25% bonus, withdrawal penalties, age limits, and which works for your goals."
keywords:
  - "LISA vs ISA"
  - "lifetime ISA worth it"
  - "LISA vs stocks and shares ISA UK"
relatedTools:
  - "investment-return"
  - "compound-interest"
  - "salary-uk"
verdict: "Open a LISA if you are under 40 and will buy a first home for £450,000 or less, or want money you will not touch before 60: the 25% bonus is a guaranteed return no other account matches. Use a regular ISA for money you might need for anything else, and for a first home above £450,000, where the 20% charge takes the bonus back. The LISA closes to new savers from 6 April 2029."
comparisonTable:
  - feature: "Annual contribution limit"
    option1: "£4,000"
    option2: "£20,000"
  - feature: "Government bonus"
    option1: "25% (up to £1,000/year)"
    option2: "None"
  - feature: "Age to open"
    option1: "18–39"
    option2: "18+"
  - feature: "Tax on growth"
    option1: "None"
    option2: "None"
  - feature: "Withdrawal penalty"
    option1: "25% on non-qualifying withdrawals (20% on a first home over £450K)"
    option2: "None — fully flexible"
  - feature: "Qualifying withdrawals"
    option1: "First home (£450K or less) or age 60+"
    option2: "Any purpose, any time"
  - feature: "Counts toward ISA allowance"
    option1: "Yes — part of £20,000 total"
    option2: "Yes — up to £20,000"
affiliateContext: "Where to open a LISA or ISA"
affiliatePrograms:
  - "InvestEngine"
  - "Nutmeg"
faq:
  - question: "Is a Lifetime ISA worth it?"
    answer: "Yes, if you will use it for a first home costing £450,000 or less, or for retirement after 60. The government adds 25% to what you pay in, up to £1,000 a year. It is a poor choice if you might need the money for anything else, because a 25% withdrawal charge applies and takes some of your own money as well as the bonus."
  - question: "How much do you lose if you withdraw from a LISA early?"
    answer: "A 25% charge applies to the whole withdrawal, including the bonus. If you paid in £4,000 and the government added £1,000, the account holds £5,000 and the charge is {{ 5000 * 25 / 100 | gbp }}, so you get back {{ 5000 * 75 / 100 | gbp }}, which is {{ 4000 - 5000 * 75 / 100 | gbp }} less than you paid in. For a first home above £450,000 the charge since 29 October 2026 is 20%, or {{ 5000 * 20 / 100 | gbp }} on the same £5,000."
  - question: "How long must a LISA be open before I can use it for a first home?"
    answer: "At least 12 months from the date you first paid into any LISA. The property must cost £450,000 or less."
  - question: "Can I open a LISA if I am over 40?"
    answer: "No. You must be 18 to 39 to open one. A new First Time Buyer ISA is due to replace the LISA for new savers from 6 April 2029, with no upper age limit. If you are over 40 now, a regular Stocks & Shares ISA is the account to use."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "GOV.UK — Lifetime ISA"
    url: "https://www.gov.uk/lifetime-isa"
  - name: "GOV.UK — Individual Savings Accounts"
    url: "https://www.gov.uk/individual-savings-accounts"
  - name: "GOV.UK — Withdrawing money from your Lifetime ISA"
    url: "https://www.gov.uk/lifetime-isa/withdrawing-money-from-your-lifetime-isa"
  - name: "HMRC — Lifetime ISA withdrawal charge (from 29 October 2026)"
    url: "https://www.gov.uk/government/publications/lifetime-isa-withdrawal-charge"
  - name: "HM Treasury — First Time Buyer ISA consultation and response"
    url: "https://www.gov.uk/government/consultations/first-time-buyer-isa-consultation"
---

## How the Lifetime ISA works

The Lifetime ISA (LISA) lets you save up to £4,000 per year and receive a 25% government bonus — that's up to £1,000 of free money annually. You can use the funds for two purposes: [buying your first home](/tools/economic/stamp-duty/) (costing £450,000 or less) or retirement income after age 60.

You must be between 18 and 39 to open a LISA. You can keep contributing until you turn 50. After that, the account stays open and continues to grow tax-free, but no new contributions or bonuses are added.

**The LISA is closing to new savers.** The Budget on 28 October 2026 confirmed that a new First Time Buyer ISA will replace the LISA for new savers from 6 April 2029, with no upper age limit to open one. LISAs opened before then can carry on under the existing rules.

The government pays the bonus to your provider, who adds it to your account, so your money starts earning returns on the bonus-included amount soon after each payment.

## The withdrawal penalty trap

Here is where the LISA gets controversial. If you withdraw money for anything other than a first home or retirement after 60, you pay a 25% penalty on the full withdrawal — including the bonus.

This penalty is worse than it sounds. You don't just lose the bonus — you lose some of your own money too.

Example: you contribute £4,000. The government adds a £1,000 bonus, so your account holds £5,000. If you withdraw for a non-qualifying reason, the 25% charge is applied to the £5,000, which is {{ 5000 * 25 / 100 | gbp }}. You get back {{ 5000 * 75 / 100 | gbp }}, which is {{ 4000 - 5000 * 75 / 100 | gbp }} less than you put in.

The penalty was temporarily reduced to 20% during COVID (making it break-even), and it is 25% again for most early withdrawals. The one exception, since 29 October 2026, is a first-time buyer buying above the £450,000 cap, who pays 20% (see below). Outside that, the LISA effectively locks your money away unless you use it for a first home or retirement.

## First-time buyer: LISA almost always wins

If you're under 40 and [saving for your first property](/tools/saving-and-growth/savings-goal/) valued under £450,000, the LISA is a clear winner. The 25% bonus on every contribution is an instant, guaranteed return that no other investment can match.

Saving £4,000 a year for 5 years (paid in monthly) gives you {{ 4000 * 5 | gbp }} of your own money plus {{ 1000 * 5 | gbp }} in bonuses, {{ 5000 * 5 | gbp }} before any investment growth. In a Stocks & Shares LISA earning 6% a year, that grows to roughly {{ compoundFV(0, 5000 / 12, 6, 5) | gbp }}.

The same £4,000 a year in a regular ISA, with no bonus and the same 6% return, gives you about {{ compoundFV(0, 4000 / 12, 6, 5) | gbp }}. The LISA is ahead by {{ compoundFV(0, 5000 / 12, 6, 5) - compoundFV(0, 4000 / 12, 6, 5) | gbp }}, entirely from the government bonus and its compounded growth.

**Watch out for the £450,000 property cap.** In London and the South East, this limit excludes many properties. Since 29 October 2026, using a LISA for a first home that costs more than £450,000 carries a 20% withdrawal charge rather than 25%. The charge takes back the government bonus: on the £5,000 example above you would get back {{ 5000 * 80 / 100 | gbp }}, exactly what you paid in, and with investment growth the charge also takes 20% of the growth. So going over the cap no longer costs you your own capital, but the LISA then gives you nothing a regular ISA would not.

## Retirement saving: LISA vs pension vs ISA

For retirement, the comparison gets more complex. The LISA bonus (25%) looks similar to basic-rate pension tax relief (20% gross, which is effectively a 25% bonus on net contributions). But there are key differences:

**LISA advantages over pensions:**
- Tax-free withdrawals at 60 (pensions are taxed as income, except the 25% tax-free lump sum)
- No income tax on the growth or the withdrawal, so no tax-band planning in retirement
- You can use it for a first home as well as retirement; a pension cannot

**Pension advantages over LISA:**
- Higher contribution limits (£60,000 annual allowance against £4,000 for a LISA)
- Employer contributions: your employer's 3% or more is free money on top of tax relief
- Higher-rate taxpayers get 40% or more in relief, far above the LISA's 25%
- Earlier access: a pension can be taken from 55 (57 from 6 April 2028), a LISA only from 60 without a charge

**Pension access rules to know:** you cannot normally take a pension before 55 (57 from 6 April 2028). Taking money out early outside the rules is an unauthorised payment and can be taxed at up to 55%. From the minimum age, withdrawals are taxed as income, except the 25% tax-free part.

For most employees, the priority should be: [workplace pension up to the employer match](/comparisons/pension-vs-isa-uk/) first. Then, if you are a first-time buyer or want a retirement pot you will not touch before 60, a LISA up to £4,000. After that, a Stocks & Shares ISA or additional pension contributions.

If you're a higher-rate (40%) taxpayer, the pension gives you 40% tax relief versus the LISA's 25% bonus. The pension wins on the way in, even though it's taxed on the way out — assuming you'll be a basic-rate taxpayer in retirement, which most people are.

## When the regular ISA is the better choice

A Stocks & Shares ISA beats the LISA when:

- **You're already a homeowner** and don't need the first-home benefit. The LISA bonus only helps if you'll leave the money until 60.
- **You might need the money before 60** for any purpose — career change, emergency, education. The 25% penalty makes early access costly.
- **You want to invest more than £4,000 per year.** The ISA allows £20,000. You can hold both, but the LISA counts toward the £20,000 total allowance.
- **Your first home will cost over £450,000.** Above the cap the 20% charge takes the bonus back, so the LISA adds nothing over a regular ISA.
- **You're over 40.** You cannot open a new LISA, so a regular ISA is your only option for now. The First Time Buyer ISA due in April 2029 will have no upper age limit.

## The best approach for most under-40s

If you can afford it, do both. Contribute £4,000 to a LISA to capture the full £1,000 bonus, then put additional savings into a regular ISA. Your £20,000 total ISA allowance covers £4,000 in the LISA plus {{ 20000 - 4000 | gbp }} in a regular ISA. The planned cut to the Cash ISA limit was cancelled at the Budget on 28 October 2026, so that {{ 20000 - 4000 | gbp }} can sit in cash or in stocks and shares.

This gives you the guaranteed 25% bonus on the first £4,000, plus full flexibility on the remaining {{ 20000 - 4000 | gbp }}. Run the numbers through a [compound interest calculator](/tools/saving-and-growth/compound-interest/) to see what the combined approach looks like over your specific time horizon.
