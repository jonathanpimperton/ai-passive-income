---
title: "Pension vs ISA: Where Should UK Workers Save?"
slug: "pension-vs-isa-uk"
description: "Pension or ISA? Where to put your first and next pound: the employer match, tax relief, a £300 a month example over 25 years, and the £100,000 exception."
keywords:
  - "pension vs ISA UK"
  - "should I save in pension or ISA"
  - "ISA or pension which is better"
relatedTools:
  - "retirement-savings"
  - "retirement-contribution"
  - "salary-uk"
  - "compound-interest"
verdict: "Pay into your workplace pension up to the full employer match first: it is an instant return no ISA can offer. Then fill a Stocks & Shares ISA for money you may need before {{ ukFact('pensionAccessAge') | int }}. One exception reverses that order: if your income is between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }}, pension contributions recover the personal allowance you are losing and relieve tax at an effective {{ ukFact('higherRate') * 1.5 | pct }}, so extra pension comes before the ISA. Higher and additional-rate taxpayers should weigh the larger relief against the lock-in."
comparisonTable:
  - feature: "Tax relief on contributions"
    option1: "{{ ukFact('basicRate') | pct }} to {{ ukFact('additionalRate') | pct }} in England, Wales and Northern Ireland (19% to 48% in Scotland), added by HMRC or your employer"
    option2: "None: paid from after-tax income"
  - feature: "Employer match"
    option1: "Yes, at least 3% of qualifying earnings under auto-enrolment"
    option2: "No"
  - feature: "Annual contribution limit"
    option1: "£60,000 (or 100% of earnings)"
    option2: "£20,000"
  - feature: "Access to funds"
    option1: "Not before {{ ukFact('pensionAccessAge') | int }} ({{ ukFact('pensionAccessAgeFrom2028') | int }} from 6 April 2028)"
    option2: "Anytime, no restrictions"
  - feature: "Tax on withdrawals"
    option1: "25% tax-free, the rest taxed as income"
    option2: "Completely tax-free"
  - feature: "Inheritance tax"
    option1: "Most unused pension funds count towards the estate for deaths from 6 April 2027"
    option2: "Part of your estate (subject to inheritance tax)"
  - feature: "Investment choices"
    option1: "Limited to your scheme's fund range"
    option2: "Wide: shares, bonds, funds and ETFs"
  - feature: "£300 a month of take-home pay for 25 years at 7% (pension with £150 a month from the employer)"
    option1: "{{ compoundFV(0, 300 / 0.8 + 150, 7, 25) | gbp }} pot, about {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) * (0.25 + 0.75 * 0.8) | gbp }} after basic-rate tax"
    option2: "{{ compoundFV(0, 300, 7, 25) | gbp }}"
affiliateContext: "Where to open an ISA or SIPP"
affiliatePrograms:
  - "Nutmeg"
  - "InvestEngine"
faq:
  - question: "Should I pay into a pension or an ISA first?"
    answer: "Pay into the workplace pension up to the full employer match first, because it is free money on top of tax relief. Then use a Stocks & Shares ISA for flexible savings you may need before {{ ukFact('pensionAccessAge') | int }}. If your income is between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }}, extra pension contributions come first because they recover your personal allowance."
  - question: "How much more is a pension worth than an ISA?"
    answer: "On £300 a month of take-home pay for 25 years at 7%, a basic-rate taxpayer whose employer adds £150 a month builds about {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) | gbp }} in the pension against {{ compoundFV(0, 300, 7, 25) | gbp }} in an ISA. After tax on the pension at the basic rate, that is still about {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) * (0.25 + 0.75 * 0.8) | gbp }}. Without the employer money the pension's lead shrinks to the tax relief alone."
  - question: "Can I take money out of a pension before {{ ukFact('pensionAccessAge') | int }}?"
    answer: "Not normally. The earliest age is {{ ukFact('pensionAccessAge') | int }}, rising to {{ ukFact('pensionAccessAgeFrom2028') | int }} from 6 April 2028. Taking money out earlier, outside the rules, is an unauthorised payment and can be taxed at up to 55%. An ISA can be accessed at any time."
  - question: "Is a pension or an ISA better for a first home?"
    answer: "Neither on its own. A pension is locked until {{ ukFact('pensionAccessAge') | int }} and cannot be used for a deposit. A Lifetime ISA adds a 25% bonus if you are under 40 and buy a first home for £450,000 or less; see the Lifetime ISA comparison. A regular ISA is the flexible fallback."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "GOV.UK — Individual Savings Accounts"
    url: "https://www.gov.uk/individual-savings-accounts"
  - name: "GOV.UK — Income Tax rates"
    url: "https://www.gov.uk/income-tax-rates"
  - name: "GOV.UK — Workplace pensions (auto-enrolment contributions)"
    url: "https://www.gov.uk/workplace-pensions"
  - name: "GOV.UK — Pension annual allowance"
    url: "https://www.gov.uk/tax-on-your-private-pension/annual-allowance"
  - name: "HMRC — Inheritance Tax: unused pension funds and death benefits (from 6 April 2027)"
    url: "https://www.gov.uk/government/publications/inheritance-tax-unused-pension-funds-and-death-benefits/inheritance-tax-unused-pension-funds-and-death-benefits"
  - name: "GOV.UK — Early retirement and your pension"
    url: "https://www.gov.uk/early-retirement-pension/personal-and-workplace-pensions"
  - name: "HMRC — Salary sacrifice reform for pension contributions (from 6 April 2029)"
    url: "https://www.gov.uk/government/publications/salary-sacrifice-reform-for-pension-contributions-effective-from-6-april-2029/salary-sacrifice-reform-for-pension-contributions"
---

## The order matters more than the choice

This is not really pension *or* ISA: most UK workers should use both. The question is which to fill first, and by how much.

The answer depends on three things: whether your employer matches contributions, your current tax band, and when you will need the money.

## Why pension contributions come first

When your employer pays into your pension, skipping that contribution is leaving money on the table. Under auto-enrolment, employers pay at least 3% of qualifying earnings, and some pay 5% or more.

Say you [earn £35,000](/scenarios/uk-take-home-pay/) and your employer matches 5% of your full salary: that is {{ 35000 * 5 / 100 | gbp }} a year of extra money before any investment growth. If your scheme pays 5% of qualifying earnings only (the band from £6,240 to £50,270), the same 5% is {{ (35000 - 6240) * 5 / 100 | gbp }}, so check which your scheme uses. No ISA gives you a guaranteed 100% return on day one.

On top of the match you get tax relief. A basic-rate taxpayer putting £100 into a pension pays only {{ 100 - ukFact('basicRate') | gbp }} out of pocket, because the government adds {{ ukFact('basicRate') | gbp }}. For higher-rate taxpayers the effective cost falls to {{ 100 - ukFact('higherRate') | gbp }} per £100 contributed, claimed through self-assessment. Additional-rate taxpayers pay {{ 100 - ukFact('additionalRate') | gbp }} per £100. In Scotland the starter band is 19% and the top rate 48%, so the relief ranges from 19% to 48% there.

Over a 30-year career, the combination of employer money and tax relief can add tens of thousands of pounds to your [retirement pot](/tools/income-and-planning/retirement-savings/) compared with saving the same amount in an ISA.

## The same £300 a month, 25 years later

Put numbers on it. Take a basic-rate taxpayer with £300 a month of take-home pay to save, 7% average annual growth (compounded monthly), and an employer who adds £150 a month when they contribute:

- **In a pension:** the £300 becomes {{ 300 / 0.8 | gbp }} after basic-rate relief, plus the £150 from the employer, so {{ 300 / 0.8 + 150 | gbp }} a month invested. After 25 years: **about {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) | gbp }}**.
- **In an ISA:** £300 a month invested. After 25 years: **about {{ compoundFV(0, 300, 7, 25) | gbp }}**.

The pension pot is not all yours to spend. 25% (about {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) * 0.25 | gbp }}) comes out tax-free and the rest is taxed as income. Even if every pound of the remaining 75% were taxed at the basic rate, ignoring the personal allowance, which makes it better still, you would keep **around {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) * (0.25 + 0.75 * 0.8) | gbp }}**. That is {{ compoundFV(0, 300 / 0.8 + 150, 7, 25) * (0.25 + 0.75 * 0.8) - compoundFV(0, 300, 7, 25) | gbp }} more than the ISA from the same £300 of take-home pay. The relief and the employer money do the heavy lifting; the ISA's advantage is access and flexibility.

**Salary sacrifice widens the gap further.** If your employer offers it, contributions come out of gross pay before National Insurance as well as income tax. A £50,000 earner is below the {{ ukFact('niUpperEarningsLimit') | gbp }} National Insurance upper earnings limit, so their marginal NI rate is {{ ukFact('niMainRate') | pct }}: sacrifice £100 of salary into the pension and the net cost is **{{ 100 - ukFact('basicRate') - ukFact('niMainRate') | gbp }}** (income tax and NI saved). For a higher-rate earner above {{ ukFact('niUpperEarningsLimit') | gbp }} it is **{{ 100 - ukFact('higherRate') - ukFact('niUpperRate') | gbp }} per £100** (40% tax plus {{ ukFact('niUpperRate') | pct }} NI). Some employers also pass on part of their own {{ ukFact('employerNiRate') | pct }} employer NI saving, cheapening it further. One change is coming: from 6 April 2029, only the first £2,000 a year you sacrifice into a pension will be free of National Insurance. Anything above that will pay employee and employer NI like ordinary pay. The change affects National Insurance only, so the income tax saving stays as it is.

## Why the ISA comes second, not never

Pensions have one major drawback: you cannot touch the money until age {{ ukFact('pensionAccessAge') | int }} ({{ ukFact('pensionAccessAgeFrom2028') | int }} from 6 April 2028). If you are 30 today, that means no access until your late fifties. Plans change long before retirement: redundancy, a home deposit, a new career or illness.

A Stocks & Shares ISA gives you tax-free growth and the ability to withdraw whenever you need to. No penalties, no waiting, no tax on the way out. That makes it the natural home for medium-term goals (5 to 20 years) and a flexible backup behind your pension.

The £20,000 annual ISA allowance does not carry forward. Every April that passes unused is gone for good.

## The practical priority order

For most UK workers, the order is:

1. **Workplace pension up to the full employer match.** Anything less is refusing part of your pay.
2. **Stocks & Shares ISA up to £20,000.** Tax-free growth with full access.
3. **[Additional pension contributions.](/tools/income-and-planning/retirement-contribution/)** If you have filled the ISA and will not need the money before {{ ukFact('pensionAccessAgeFrom2028') | int }}, more pension is efficient for higher-rate taxpayers.
4. **General investment account.** Only needed if you are investing more than {{ 60000 + 20000 | gbp }} a year ({{ 60000 | gbp }} pension plus {{ 20000 | gbp }} ISA).

If you are a first-time buyer under 40, a Lifetime ISA can sit between steps 1 and 2; see the [LISA comparison](/comparisons/lisa-vs-regular-isa/).

## When to break the rules

**If your income is between {{ ukFact('paTaperThreshold') | gbp }} and {{ ukFact('paTaperLimit') | gbp }}**, put extra into your pension before the ISA. You lose £1 of personal allowance for every £2 of income above {{ ukFact('paTaperThreshold') | gbp }}, which makes the effective tax rate on that slice {{ ukFact('higherRate') * 1.5 | pct }}. A pension contribution that brings your adjusted net income back under {{ ukFact('paTaperThreshold') | gbp }} recovers that tax, so it is relieved at that higher effective rate. The same applies to the childcare limit: free childcare and Tax-Free Childcare stop once adjusted net income passes {{ ukFact('paTaperThreshold') | gbp }}. See the [60% tax trap](/scenarios/60-percent-tax-trap-uk/) and the [childcare cliff](/scenarios/100k-childcare-cliff-uk/) for worked examples.

**If you are a higher or additional-rate taxpayer**, extra pension contributions beyond the match are very attractive. The {{ ukFact('higherRate') | pct }} to {{ ukFact('additionalRate') | pct }} tax relief means every £1,000 costs you {{ 1000 * (1 - ukFact('higherRate') / 100) | gbp }} or less. Some people prioritise pension over ISA in this situation, accepting the locked access for the stronger tax benefit.

**If you are saving for a first home**, a [Lifetime ISA (LISA)](/comparisons/lisa-vs-regular-isa/) gives you a 25% government bonus on up to £4,000 a year, but it counts towards your £20,000 ISA allowance and carries withdrawal charges for non-qualifying purchases before age 60.

**If you are self-employed**, there is no employer match, so the pension's main advantage is tax relief alone. A SIPP (self-invested personal pension) still gets tax relief, but the ISA's flexibility becomes relatively more valuable.

## The pension tax trap at withdrawal

When you withdraw from a pension, 25% is tax-free and the rest is taxed as income. If you withdraw large amounts in a single year you can push yourself into a higher tax band. Someone who got 20% relief going in but pays 40% coming out has made a bad trade.

That is another reason to hold ISA savings alongside your pension: in retirement you can draw from the ISA in years when pension withdrawals would push you into a higher band, keeping your overall tax bill lower. The two accounts work best as a team, not as competitors.
