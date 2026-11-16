---
title: "Roth vs Traditional 401(k): Which Is Better?"
slug: "roth-vs-traditional-401k"
description: "Roth vs Traditional 401(k) with the 2026 limits: the math on a full contribution, why equal tax rates tie, and the bracket rule for choosing."
keywords:
  - "roth vs traditional 401k"
  - "roth 401k vs traditional"
  - "should I choose roth or traditional"
relatedTools:
  - "retirement-savings"
  - "retirement-contribution"
  - "retirement-age"
  - "salary-us"
  - "compound-interest"
  - "investment-return"
verdict: "Roth wins if your tax rate in retirement will be higher than today's, Traditional wins if it will be lower, and they tie if it is the same, so the choice is a bet on future rates. Traditional usually wins for earners in the 24% bracket or above, because withdrawals fill the low brackets first: $60,000 of retirement withdrawals in 2026 costs {{ usFederalTax(60000, year=2026) | usd }} in federal tax, an effective {{ usFederalTax(60000, year=2026) / 60000 * 100 | pct1 }}. Roth suits early-career savers in the 10% and 12% brackets. If you cannot call it, split."
comparisonTable:
  - feature: "Tax on contributions"
    option1: "Taxed now (after-tax dollars)"
    option2: "Tax-deductible (pre-tax dollars)"
  - feature: "Tax on withdrawals"
    option1: "Tax-free in retirement (if qualified)"
    option2: "Taxed as ordinary income"
  - feature: "Required minimum distributions"
    option1: "None for the account owner (since 2024)"
    option2: "Start at 73, or 75 if you were born in 1960 or later"
  - feature: "Best for tax bracket"
    option1: "Lower bracket now, higher later"
    option2: "Higher bracket now, lower later"
  - feature: "2026 contribution limit"
    option1: "{{ usFact('k401Limit', year=2026) | usd }} ({{ usFact('k401Limit', year=2026) + usFact('k401CatchUp', year=2026) | usd }} if 50+; {{ usFact('k401Limit', year=2026) + usFact('k401CatchUp60to63', year=2026) | usd }} at 60–63)"
    option2: "{{ usFact('k401Limit', year=2026) | usd }}; any 50+ catch-up must be Roth if your 2025 wages from that employer topped $150,000"
  - feature: "Immediate tax benefit"
    option1: "None"
    option2: "Reduces taxable income today"
  - feature: "Result on a full contribution, 25 years at 7%, 24% now and 22% later"
    option1: "{{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) | usd }} tax-free"
    option2: "{{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) * (1 - 22 / 100) + compoundFV(usFact('k401Limit', year=2026) * 24 / 100, 0, 7, 25, compounding=annually) | usd }} (after tax, with the refund invested)"
affiliateContext: "Open a retirement account"
affiliatePrograms:
  - "Betterment"
  - "Wealthfront"
faq:
  - question: "Is a Roth or Traditional 401(k) better?"
    answer: "Neither wins on its own. Roth is better if your tax rate in retirement will be higher than today's, Traditional is better if it will be lower, and with equal rates they finish level, provided the Traditional saver invests the tax saving. For most people in the 24% bracket or above, the lower retirement rate makes Traditional the likelier winner."
  - question: "What if my tax rate is the same in retirement?"
    answer: "Then the two accounts end level. At 24% now and 24% later, a full contribution of {{ usFact('k401Limit', year=2026) | usd }} grows to {{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) | usd }} in the Roth. The Traditional account ends with {{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) * (1 - 24 / 100) + compoundFV(usFact('k401Limit', year=2026) * 24 / 100, 0, 7, 25, compounding=annually) | usd }} after tax once the {{ usFact('k401Limit', year=2026) * 24 / 100 | usd }} tax saving is invested alongside. Roth pulls ahead only if that saving is spent rather than invested."
  - question: "Can I contribute to both a Roth and a Traditional 401(k)?"
    answer: "Yes, if your plan offers both. The combined limit for employee contributions is the same {{ usFact('k401Limit', year=2026) | usd }} for 2026. Splitting gives you tax-free and taxable money to draw from in retirement, so you can control your tax bracket each year."
  - question: "Is the 401(k) limit different if I earn over $150,000?"
    answer: "The employee limit is the same, but from 2026 if you are 50 or older and your wages from that employer were over $150,000 the year before, your catch-up contributions must go in as Roth. If your plan has no Roth option, you cannot make catch-up contributions at all."
datePublished: "2026-03-05"
dateModified: "2026-11-16"
sources:
  - name: "IRS — 2026 contribution limits (IR-2025-111)"
    url: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500"
  - name: "IRS — Catch-up contributions (Roth catch-up rule from 2026)"
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions"
  - name: "IRS — Retirement plan and IRA required minimum distributions FAQs"
    url: "https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs"
  - name: "IRS — Topic no. 423, Social Security and equivalent railroad retirement benefits"
    url: "https://www.irs.gov/taxtopics/tc423"
---

## The real question: where will your tax rate be?

The Roth vs Traditional decision comes down to one thing: whether your tax rate is higher now or in retirement. Pay taxes now (Roth) if you expect your rate to rise. Defer taxes (Traditional) if you expect it to fall.

Most people assume their income drops in retirement, which makes Traditional look obvious. But that ignores several things that can push retirement taxes higher than expected.

## Reasons to favor Roth

- **Tax rates may rise.** The 2025 tax law made today's brackets permanent, but Congress can always raise rates later. Paying today's known rates may beat tomorrow's unknown ones.
- **Social Security taxation.** Traditional 401(k) withdrawals count as income, which can make up to 85% of your Social Security benefits taxable.
- **No RMDs.** Traditional 401(k)s force withdrawals starting at 73 (75 if you were born in 1960 or later), whether you need the money or not. Roth 401(k)s have had no required minimum distributions for the owner since 2024, so the money can keep growing tax-free.
- **Estate planning.** Roth accounts pass to heirs tax-free. Traditional accounts burden heirs with income tax on every dollar withdrawn.
- **A bigger tax-sheltered pot.** The contribution limit is the same either way, but a Roth dollar is already taxed, so the same limit shelters more spending power.

## When Traditional still wins

The Traditional 401(k) is better when:

- You are in the **32% bracket or higher** and confident you will be in a lower bracket in retirement. One limit applies to many of these earners: from 2026, if you are 50 or older and your wages from this employer were over $150,000 the year before, your catch-up contributions must go in as Roth. Only the first {{ usFact('k401Limit', year=2026) | usd }} can be Traditional, and if your plan has no Roth option you cannot make catch-up contributions at all.
- You need the tax deduction now to qualify for other benefits (child tax credit, education credits).
- You are [close to retirement](/tools/income-and-planning/retirement-age/) with little time for Roth growth to compound.
- Your employer match goes into Traditional regardless, so having both provides tax diversification.

A {{ usFact('k401Limit', year=2026) | usd }} Traditional contribution saves someone [in the 24% bracket](/tools/income-and-planning/salary-us/) **{{ usFact('k401Limit', year=2026) * 24 / 100 | usd }}** in federal tax for 2026. That is real money you can invest elsewhere.

## The math on a full contribution

Assume [7% annual growth over 25 years](/tools/saving-and-growth/compound-interest/), a 24% bracket now and 22% in retirement:

**Roth path:** {{ usFact('k401Limit', year=2026) | usd }} after tax grows to {{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) | usd }}. You withdraw **{{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) | usd }} tax-free**.

**Traditional path:** {{ usFact('k401Limit', year=2026) | usd }} pre-tax grows to the same {{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) | usd }}. Withdraw it, pay 22% tax, and **{{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) * (1 - 22 / 100) | usd }}** is yours.

But the Traditional saver got a {{ usFact('k401Limit', year=2026) * 24 / 100 | usd }} tax saving up front. Invested at 7% for 25 years, that becomes **{{ compoundFV(usFact('k401Limit', year=2026) * 24 / 100, 0, 7, 25, compounding=annually) | usd }}**.

Traditional total: {{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) * (1 - 22 / 100) | usd }} plus {{ compoundFV(usFact('k401Limit', year=2026) * 24 / 100, 0, 7, 25, compounding=annually) | usd }}, which is **{{ compoundFV(usFact('k401Limit', year=2026), 0, 7, 25, compounding=annually) * (1 - 22 / 100) + compoundFV(usFact('k401Limit', year=2026) * 24 / 100, 0, 7, 25, compounding=annually) | usd }}** (each figure is rounded on its own). Slightly more than Roth, and only because the retirement rate (22%) is lower than the rate at which you saved (24%).

**If the two rates are the same, the accounts tie.** At 24% now and 24% later the Traditional saver ends with exactly the Roth figure, because the same percentage comes off the account later as came off the refund now. Roth pulls ahead in practice for two reasons: it wins if you spend the Traditional tax saving instead of investing it, and it shelters more when you hit the contribution limit, since the limit counts after-tax dollars.

## Marginal rate in, effective rate out

There is a structural asymmetry that the simple bracket comparison hides. Traditional contributions save tax at your **top marginal rate**: for a single filer earning $85,000 in 2026, every dollar contributed avoids the {{ usBracket(85000, year=2026) | pct }} bracket. But withdrawals in retirement fill the brackets **from the bottom up**.

The first **{{ usFact('standardDeduction', year=2026) | usd }}** of annual withdrawals is wiped out by the standard deduction. The next {{ usBracketStart(12, year=2026) | usd }} of taxable income is taxed at only 10%, then everything up to {{ usBracketStart(22, year=2026) | usd }} at 12%. A retiree drawing **$60,000 a year** from a Traditional 401(k) pays about **{{ usFederalTax(60000, year=2026) | usd }}** in federal tax, an effective rate of **{{ usFederalTax(60000, year=2026) / 60000 * 100 | pct1 }}**. Retirees 65 and older also get a higher standard deduction and a temporary extra deduction for 2025 through 2028, so the real figure can be lower still.

Save at {{ usBracket(85000, year=2026) | pct }} going in, pay {{ usFederalTax(60000, year=2026) / 60000 * 100 | pct1 }} coming out. That spread is the quiet argument for Traditional contributions, and it holds even when retirement income looks respectable. The Roth case rests on whatever erodes it: Social Security, pensions and RMDs filling those low brackets first, or tax rates rising before you retire.

## A simple rule

- **10% or 12% bracket today:** lean Roth. You are paying tax at the lowest rates you will ever see.
- **22% bracket:** either works; split your contributions if you cannot decide.
- **24% bracket or higher:** lean Traditional, unless you expect high income in retirement.

## The best answer: do both

If your employer offers both, split contributions. Tax diversification in retirement is valuable: you can draw from Traditional accounts up to a low bracket, then switch to Roth for the rest. That gives you control over your tax bill in retirement.
