---
title: "$75K to $100K Raise: +{{ (usTakeHome(100000) - usTakeHome(75000)) | usd }}/yr, +{{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }}/mo"
slug: "pay-rise-shock-us"
description: "A $25,000 raise from $75,000 to $100,000 adds {{ (usTakeHome(100000) - usTakeHome(75000)) | usd }} a year, {{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }} a month, after federal tax and FICA. Why a raise never shrinks your take-home pay."
keywords: ["25k raise after taxes", "75k to 100k salary raise", "how much of a raise do you keep", "pay raise tax calculator", "does a raise put you in a higher tax bracket"]
toolSlug: "salary-us"
toolCategory: "income-and-planning"
inputs:
  Current salary: "$75,000"
  New salary: "$100,000"
  Filing status: "Single"
  State Income Tax: "None"
  Tax Year: "{{ taxYear('us') }}"
resultSummary: "+{{ (usTakeHome(100000) - usTakeHome(75000)) | usd }} a year, +{{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }} a month"
datePublished: "2026-07-07"
dateModified: "2026-11-15"
faq:
  - question: "How much of a $25,000 raise do you actually keep?"
    answer: "Going from $75,000 to $100,000 as a single filer, you keep about {{ (usTakeHome(100000) - usTakeHome(75000)) | usd }} a year ({{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }} a month) after federal income tax and FICA, which is {{ (usTakeHome(100000) - usTakeHome(75000)) / 25000 * 100 | pct }} of the raise. The rest, {{ 25000 - (usTakeHome(100000) - usTakeHome(75000)) | usd }}, goes to federal income tax ({{ usPay(100000).federal - usPay(75000).federal | usd }}) and Social Security and Medicare ({{ usPay(100000).fica - usPay(75000).fica | usd }}). State income tax, where it applies, takes a further slice."
  - question: "Can a raise push me into a higher tax bracket and reduce my take-home pay?"
    answer: "No. US federal brackets are marginal: a higher rate only applies to the dollars above each threshold, never to your whole income. A raise always increases your take-home pay. The rare exceptions are benefit phase-outs, such as ACA premium credits or income-tested student loan payments, not the tax brackets themselves."
  - question: "Why did my effective tax rate go up after the raise?"
    answer: "Your effective rate is the average across all your income. At $75,000 the federal-plus-FICA average is {{ usPay(75000).taxRate | pct1 }}; at $100,000 it is {{ usPay(100000).taxRate | pct1 }}. The new dollars were taxed at {{ usMarginalRate(100000) | pct(2) }} ({{ usBracket(100000) | pct }} federal plus {{ usFact('ssRate') + usFact('medicareRate') | pct(2) }} for Social Security and Medicare), which pulls the average up, but every one of those dollars still added to your net pay."
  - question: "Does contributing to a 401(k) reduce the tax on a raise?"
    answer: "Yes. Traditional 401(k) contributions come out before federal income tax, so every dollar you defer in the {{ usBracket(100000) | pct }} bracket saves {{ usBracket(100000) | num }} cents of tax today. Divert $10,000 of this raise and your federal bill falls by {{ usPay(100000).federal - usPay(100000, k401=10).federal | usd }}; the contribution only costs about {{ 10000 - (usPay(100000).federal - usPay(100000, k401=10).federal) | usd }} in reduced take-home. The {{ taxYear('us') }} employee limit is {{ usFact('k401Limit') | usd }}. FICA still applies to 401(k) contributions."
---

## The raise pays {{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }} a month, {{ (usTakeHome(100000) - usTakeHome(75000)) | usd }} a year

**A $25,000 raise from $75,000 to $100,000 adds {{ (usTakeHome(100000) - usTakeHome(75000)) | usd }} a year to a single filer's take-home pay, about {{ (usTakeHome(100000) - usTakeHome(75000)) / 12 | usd }} a month, after federal income tax and FICA.** Of the $25,000, {{ (usTakeHome(100000) - usTakeHome(75000)) | usd(2) }} stays with you and {{ 25000 - (usTakeHome(100000) - usTakeHome(75000)) | usd(2) }} goes in tax. You keep {{ (usTakeHome(100000) - usTakeHome(75000)) / 25000 * 100 | pct }} of every raise dollar.

That is the answer to the question people actually ask when the offer letter lands: not "what is my new salary?" but "what changes in my bank account?"

## The math at both salaries

Both columns use {{ taxYear('us') }} federal rates, the {{ usFact('standardDeduction') | usd }} standard deduction for single filers, and no state income tax:

| | $75,000 | $100,000 |
|---|---|---|
| Federal income tax | {{ usPay(75000).federal | usd }} | {{ usPay(100000).federal | usd }} |
| Social Security ({{ usFact('ssRate') | pct(1) }}) | {{ usPay(75000).socialSecurity | usd }} | {{ usPay(100000).socialSecurity | usd }} |
| Medicare ({{ usFact('medicareRate') | pct(2) }}) | {{ usPay(75000).medicare | usd }} | {{ usPay(100000).medicare | usd }} |
| **Take-home per year** | **{{ usTakeHome(75000) | usd }}** | **{{ usTakeHome(100000) | usd }}** |
| **Take-home per month** | **{{ usTakeHome(75000) / 12 | usd }}** | **{{ usTakeHome(100000) / 12 | usd }}** |
| Effective tax rate | {{ usPay(75000).taxRate | pct1 }} | {{ usPay(100000).taxRate | pct1 }} |

The monthly difference ({{ usTakeHome(100000) / 12 | usd }} against {{ usTakeHome(75000) / 12 | usd }}) is the number to build your new budget around, not the {{ 25000 / 12 | usd }} the gross figures suggest.

## The bracket myth: a raise never cuts your net pay

Every year, people turn down overtime or worry about a raise "putting them in a higher bracket." The fear rests on a misunderstanding of how marginal tax rates work.

US federal brackets tax slices of income, not the whole amount. For {{ taxYear('us') }}, a single filer pays 10% on the first {{ usBracketStart(12) | usd }} of taxable income, 12% up to {{ usBracketStart(22) | usd }}, and 22% up to {{ usBracketStart(24) | usd }}. Crossing a threshold changes the rate only on the dollars above it; everything below keeps its old rate.

Taxable income (salary minus the standard deduction) goes from {{ usPay(75000).taxableIncome | usd }} to {{ usPay(100000).taxableIncome | usd }}. At the start the next dollar is taxed at {{ usBracket(75000) | pct }} federal and {{ usFact('ssRate') + usFact('medicareRate') | pct(2) }} FICA, {{ usMarginalRate(75000) | pct(2) }} in all; at the end it is {{ usMarginalRate(100000) | pct(2) }}. Across the whole raise you kept {{ (usTakeHome(100000) - usTakeHome(75000)) / 25000 * 100 | pct(2) }} of each new dollar.

Even if a raise pushed taxable income past {{ usBracketStart(24) | usd }} into the 24% bracket, only the dollars above that line would pay 24%. There is no salary at which earning more leaves you with less. What does rise is your *effective* rate, the average across all your income, from {{ usPay(75000).taxRate | pct1 }} to {{ usPay(100000).taxRate | pct1 }} here. A higher average, but a much bigger pile.

## State tax varies, sometimes a lot

These figures cover federal tax and FICA only. In Texas, Florida, Washington and the other no-income-tax states, they are your complete picture. In California or New York the state takes a further share of the raise. Using each state's 2026 tax schedule for a single filer (sources below):

- **California:** state income tax rises by {{ ((0.01 * max(0, min((100000 - 5900), 11456) - 0) + 0.02 * max(0, min((100000 - 5900), 27157) - 11456) + 0.04 * max(0, min((100000 - 5900), 42861) - 27157) + 0.06 * max(0, min((100000 - 5900), 59498) - 42861) + 0.08 * max(0, min((100000 - 5900), 75197) - 59498) + 0.093 * max(0, min((100000 - 5900), 384109) - 75197) - 158) - (0.01 * max(0, min((75000 - 5900), 11456) - 0) + 0.02 * max(0, min((75000 - 5900), 27157) - 11456) + 0.04 * max(0, min((75000 - 5900), 42861) - 27157) + 0.06 * max(0, min((75000 - 5900), 59498) - 42861) + 0.08 * max(0, min((75000 - 5900), 75197) - 59498) + 0.093 * max(0, min((75000 - 5900), 384109) - 75197) - 158)) | usd }} and State Disability Insurance (1.3% of wages, no cap) adds {{ (25000 * 0.013) | usd }}, so the state takes {{ (((0.01 * max(0, min((100000 - 5900), 11456) - 0) + 0.02 * max(0, min((100000 - 5900), 27157) - 11456) + 0.04 * max(0, min((100000 - 5900), 42861) - 27157) + 0.06 * max(0, min((100000 - 5900), 59498) - 42861) + 0.08 * max(0, min((100000 - 5900), 75197) - 59498) + 0.093 * max(0, min((100000 - 5900), 384109) - 75197) - 158) - (0.01 * max(0, min((75000 - 5900), 11456) - 0) + 0.02 * max(0, min((75000 - 5900), 27157) - 11456) + 0.04 * max(0, min((75000 - 5900), 42861) - 27157) + 0.06 * max(0, min((75000 - 5900), 59498) - 42861) + 0.08 * max(0, min((75000 - 5900), 75197) - 59498) + 0.093 * max(0, min((75000 - 5900), 384109) - 75197) - 158)) + (25000 * 0.013)) | usd }} a year of the raise, or {{ (((0.01 * max(0, min((100000 - 5900), 11456) - 0) + 0.02 * max(0, min((100000 - 5900), 27157) - 11456) + 0.04 * max(0, min((100000 - 5900), 42861) - 27157) + 0.06 * max(0, min((100000 - 5900), 59498) - 42861) + 0.08 * max(0, min((100000 - 5900), 75197) - 59498) + 0.093 * max(0, min((100000 - 5900), 384109) - 75197) - 158) - (0.01 * max(0, min((75000 - 5900), 11456) - 0) + 0.02 * max(0, min((75000 - 5900), 27157) - 11456) + 0.04 * max(0, min((75000 - 5900), 42861) - 27157) + 0.06 * max(0, min((75000 - 5900), 59498) - 42861) + 0.08 * max(0, min((75000 - 5900), 75197) - 59498) + 0.093 * max(0, min((75000 - 5900), 384109) - 75197) - 158)) + (25000 * 0.013)) / 25000 * 100 | pct1 }} of it. After state tax the raise adds {{ (usTakeHome(100000, year=2026) - usTakeHome(75000, year=2026)) - (((0.01 * max(0, min((100000 - 5900), 11456) - 0) + 0.02 * max(0, min((100000 - 5900), 27157) - 11456) + 0.04 * max(0, min((100000 - 5900), 42861) - 27157) + 0.06 * max(0, min((100000 - 5900), 59498) - 42861) + 0.08 * max(0, min((100000 - 5900), 75197) - 59498) + 0.093 * max(0, min((100000 - 5900), 384109) - 75197) - 158) - (0.01 * max(0, min((75000 - 5900), 11456) - 0) + 0.02 * max(0, min((75000 - 5900), 27157) - 11456) + 0.04 * max(0, min((75000 - 5900), 42861) - 27157) + 0.06 * max(0, min((75000 - 5900), 59498) - 42861) + 0.08 * max(0, min((75000 - 5900), 75197) - 59498) + 0.093 * max(0, min((75000 - 5900), 384109) - 75197) - 158)) + (25000 * 0.013)) | usd }} a year, or {{ ((usTakeHome(100000, year=2026) - usTakeHome(75000, year=2026)) - (((0.01 * max(0, min((100000 - 5900), 11456) - 0) + 0.02 * max(0, min((100000 - 5900), 27157) - 11456) + 0.04 * max(0, min((100000 - 5900), 42861) - 27157) + 0.06 * max(0, min((100000 - 5900), 59498) - 42861) + 0.08 * max(0, min((100000 - 5900), 75197) - 59498) + 0.093 * max(0, min((100000 - 5900), 384109) - 75197) - 158) - (0.01 * max(0, min((75000 - 5900), 11456) - 0) + 0.02 * max(0, min((75000 - 5900), 27157) - 11456) + 0.04 * max(0, min((75000 - 5900), 42861) - 27157) + 0.06 * max(0, min((75000 - 5900), 59498) - 42861) + 0.08 * max(0, min((75000 - 5900), 75197) - 59498) + 0.093 * max(0, min((75000 - 5900), 384109) - 75197) - 158)) + (25000 * 0.013))) / 12 | usd }} a month.
- **New York State:** state income tax rises by {{ (max(max(max(max((4191 + 0.059 * ((100000 - 8000) - 80650)), (586 + 0.054 * ((100000 - 8000) - 13900))), (473 + 0.0515 * ((100000 - 8000) - 11700))), (332 + 0.044 * ((100000 - 8000) - 8500))), (0.039 * (100000 - 8000))) - max(max(max(max((4191 + 0.059 * ((75000 - 8000) - 80650)), (586 + 0.054 * ((75000 - 8000) - 13900))), (473 + 0.0515 * ((75000 - 8000) - 11700))), (332 + 0.044 * ((75000 - 8000) - 8500))), (0.039 * (75000 - 8000)))) | usd }}, {{ (max(max(max(max((4191 + 0.059 * ((100000 - 8000) - 80650)), (586 + 0.054 * ((100000 - 8000) - 13900))), (473 + 0.0515 * ((100000 - 8000) - 11700))), (332 + 0.044 * ((100000 - 8000) - 8500))), (0.039 * (100000 - 8000))) - max(max(max(max((4191 + 0.059 * ((75000 - 8000) - 80650)), (586 + 0.054 * ((75000 - 8000) - 13900))), (473 + 0.0515 * ((75000 - 8000) - 11700))), (332 + 0.044 * ((75000 - 8000) - 8500))), (0.039 * (75000 - 8000)))) / 25000 * 100 | pct1 }} of the raise. After state tax the raise adds {{ (usTakeHome(100000, year=2026) - usTakeHome(75000, year=2026)) - (max(max(max(max((4191 + 0.059 * ((100000 - 8000) - 80650)), (586 + 0.054 * ((100000 - 8000) - 13900))), (473 + 0.0515 * ((100000 - 8000) - 11700))), (332 + 0.044 * ((100000 - 8000) - 8500))), (0.039 * (100000 - 8000))) - max(max(max(max((4191 + 0.059 * ((75000 - 8000) - 80650)), (586 + 0.054 * ((75000 - 8000) - 13900))), (473 + 0.0515 * ((75000 - 8000) - 11700))), (332 + 0.044 * ((75000 - 8000) - 8500))), (0.039 * (75000 - 8000)))) | usd }} a year, or {{ ((usTakeHome(100000, year=2026) - usTakeHome(75000, year=2026)) - (max(max(max(max((4191 + 0.059 * ((100000 - 8000) - 80650)), (586 + 0.054 * ((100000 - 8000) - 13900))), (473 + 0.0515 * ((100000 - 8000) - 11700))), (332 + 0.044 * ((100000 - 8000) - 8500))), (0.039 * (100000 - 8000))) - max(max(max(max((4191 + 0.059 * ((75000 - 8000) - 80650)), (586 + 0.054 * ((75000 - 8000) - 13900))), (473 + 0.0515 * ((75000 - 8000) - 11700))), (332 + 0.044 * ((75000 - 8000) - 8500))), (0.039 * (75000 - 8000))))) / 12 | usd }} a month. Inside New York City the city's resident tax takes another {{ (max(max(max((1813 + 0.03876 * ((100000 - 8000) - 50000)), (858 + 0.03819 * ((100000 - 8000) - 25000))), (369 + 0.03762 * ((100000 - 8000) - 12000))), (0.03078 * (100000 - 8000))) - max(max(max((1813 + 0.03876 * ((75000 - 8000) - 50000)), (858 + 0.03819 * ((75000 - 8000) - 25000))), (369 + 0.03762 * ((75000 - 8000) - 12000))), (0.03078 * (75000 - 8000)))) | usd }}.

The [US Salary Calculator](/tools/income-and-planning/salary-us/) takes one flat state tax rate, so enter your own effective rate there, along with your filing status and deductions, to get your exact numbers. The state amounts use 2026 schedules.

## The 401(k) lever: choose your own tax rate on the raise

A raise taxed at {{ usBracket(100000) | pct }} federal is also the cheapest retirement contribution you will ever make. Because traditional 401(k) contributions come out pre-tax, deferring $10,000 of this raise cuts your federal bill by {{ usPay(100000).federal - usPay(100000, k401=10).federal | usd }}: you bank $10,000 of savings for about {{ 10000 - (usPay(100000).federal - usPay(100000, k401=10).federal) | usd }} of forgone take-home, and your remaining raise still adds roughly {{ ((usTakeHome(100000) - usTakeHome(75000)) - (10000 - (usPay(100000).federal - usPay(100000, k401=10).federal))) / 12 | usd }} a month to your paycheck.

The {{ taxYear('us') }} employee contribution limit is {{ usFact('k401Limit') | usd }}, which covers {{ min(25000, usFact('k401Limit')) / 25000 * 100 | pct }} of this raise. For most people, a split of some to lifestyle and some to the 401(k) captures the raise without letting spending absorb all of it.

For take-home figures at every salary from $40,000 to $250,000, see the [US take-home pay table](/scenarios/us-take-home-pay/#75k) (the [$75,000](/scenarios/us-take-home-pay/#75k) and [$100,000](/scenarios/us-take-home-pay/#100k) rows are the two columns above), or run your own numbers in the [US Salary Calculator](/tools/income-and-planning/salary-us/). Methods are on the [salary calculator methodology page](/how-we-calculate/salary-us/).

## Sources and as-of dates

- Federal brackets, standard deduction and FICA: [IRS tax inflation adjustments](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) (2026).
- California 2026 schedule, standard deduction and credit: [FTB Tax News, October 2026](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html); SDI 1.3% with no wage cap: [EDD rates and withholding](https://edd.ca.gov/en/Payroll_taxes/Rates_and_withholding), read 15 November 2026.
- New York 2026 schedule: [Tax Law section 601](https://www.nysenate.gov/legislation/laws/TAX/601); standard deduction and New York City resident schedule: [IT-201-I instructions](https://www.tax.ny.gov/forms/current-forms/it/it201i.htm) (2025 edition).
