---
title: "$50K a Year: {{ 50000 / 2080 | usd(2) }}/hr Gross, {{ usTakeHome(50000) / 2080 | usd(2) }}/hr Net"
slug: "50k-salary-hourly-rate"
description: "$50,000 a year is {{ 50000 / 2080 | usd(2) }} an hour before tax and {{ usTakeHome(50000) / 2080 | usd(2) }} after federal tax and FICA: {{ usTakeHome(50000) | usd }} a year, {{ usTakeHome(50000) / 12 | usd }} a month."
keywords: ["50000 a year is how much an hour", "50k salary hourly rate", "50000 salary per hour", "annual to hourly conversion", "50k a year after taxes per hour"]
toolSlug: "salary-us"
toolCategory: "income-and-planning"
inputs:
  Annual Salary: "$50,000"
  Filing Status: "Single"
  State: "No state income tax (TX/FL)"
  Tax Year: "{{ taxYear('us') }}"
resultSummary: "{{ 50000 / 2080 | usd(2) }}/hour gross, {{ usTakeHome(50000) / 2080 | usd(2) }}/hour net, {{ usTakeHome(50000) | usd }} a year, {{ usTakeHome(50000) / 12 | usd }} a month"
datePublished: "2026-03-02"
dateModified: "2026-11-15"
---

## {{ 50000 / 2080 | usd(2) }} an hour gross, {{ usTakeHome(50000) / 2080 | usd(2) }} after taxes

**$50,000 a year works out to {{ 50000 / 2080 | usd(2) }} an hour before taxes, and {{ usTakeHome(50000) / 2080 | usd(2) }} an hour after federal tax and FICA in a no-income-tax state like Texas or Florida ({{ taxYear('us') }} tax year, single filer). That is {{ usTakeHome(50000) | usd }} a year, or {{ usTakeHome(50000) / 12 | usd }} a month, in take-home pay.** The standard conversion assumes 2,080 work hours a year (40 hours a week times 52 weeks), but your real hourly rate depends on how many hours you actually work.

## From annual to hourly: the tax deductions in between

The gross hourly calculation is straightforward: $50,000 divided by 2,080 hours is {{ 50000 / 2080 | usd(2) }} an hour. But that number does not reach your bank account. Here is what comes out:

- **Federal income tax: {{ usPay(50000).federal | usd }}.** With the {{ taxYear('us') }} standard deduction of {{ usFact('standardDeduction') | usd }}, your taxable income is {{ usPay(50000).taxableIncome | usd }}. You pay 10% on the first {{ usBracketStart(12) | usd }} ({{ usBracketStart(12) * 10 / 100 | usd }}) and 12% on the remaining {{ usPay(50000).taxableIncome - usBracketStart(12) | usd }} ({{ (usPay(50000).taxableIncome - usBracketStart(12)) * 12 / 100 | usd }}). Your effective federal rate is {{ usPay(50000).federal / 50000 * 100 | pct1 }}.
- **FICA (Social Security and Medicare): {{ usPay(50000).fica | usd }}.** Social Security is {{ usFact('ssRate') | pct(1) }} ({{ usPay(50000).socialSecurity | usd }}) and Medicare is {{ usFact('medicareRate') | pct(2) }} ({{ usPay(50000).medicare | usd }}). No deductions reduce these.
- **State income tax: $0** in Texas, Florida, Nevada, Washington, Wyoming, South Dakota, Alaska, Tennessee or New Hampshire (on wages).

Total deductions come to {{ 50000 - usTakeHome(50000) | usd }}, leaving {{ usTakeHome(50000) | usd }} a year in take-home. Divide that by 2,080 hours and your net hourly rate is {{ usTakeHome(50000) / 2080 | usd(2) }}.

For tax year 2027 the IRS has raised the standard deduction from {{ usFact('standardDeduction', year=2026) | usd }} to {{ usFact('standardDeduction', year=2027) | usd }} and the top of the 10% band from {{ usBracketStart(12, year=2026) | usd }} to {{ usBracketStart(12, year=2027) | usd }} (IR-2026-133), which cuts federal tax on $50,000 by {{ usPay(50000, year=2026).federal - usPay(50000, year=2027).federal | usd }}, from {{ usPay(50000, year=2026).federal | usd }} to {{ usPay(50000, year=2027).federal | usd }}.

On common pay schedules, $50,000 breaks down to:

- **A month:** {{ 50000 / 12 | usd }} gross, {{ usTakeHome(50000) / 12 | usd }} net
- **Biweekly (26 checks):** {{ 50000 / 26 | usd }} gross, {{ usTakeHome(50000) / 26 | usd }} net
- **A week:** {{ 50000 / 52 | usd }} gross, {{ usTakeHome(50000) / 52 | usd }} net

For the same salary shown next to every other salary from $40,000 to $250,000, see the [$50,000 row of the US take-home pay table](/scenarios/us-take-home-pay/#50k).

## Why your actual hours worked change everything

The 2,080-hour assumption is a convenient standard, but it rarely matches reality. If your employer offers two weeks of paid vacation and five sick days, you actually work {{ 2080 - 80 - 40 | int }} hours, which pushes your effective gross rate to {{ 50000 / (2080 - 80 - 40) | usd(2) }} an hour. If you routinely work 45-hour weeks without overtime pay (common in salaried positions), your real rate drops to {{ 50000 / (45 * 52) | usd(2) }}.

This matters when comparing a salaried role with an hourly position. An hourly job at $24 an hour sounds equivalent to $50,000, but hourly workers typically get overtime at 1.5 times pay for hours beyond 40. A salaried employee working 50-hour weeks at $50,000 is effectively making {{ 50000 / (50 * 52) | usd(2) }} an hour with no overtime premium.

Your true hourly rate also helps with side-income decisions. If your net rate is around {{ usTakeHome(50000) / 2080 | usd }} an hour, any side hustle or freelance work earning more than that (after self-employment tax) is adding value above your day job's effective rate.

## State taxes, longer hours and the 401(k) trade-off

- **You live in California instead of Texas:** California income tax on $50,000 is {{ 0.01 * max(0, min((50000 - 5900), 11456) - 0) + 0.02 * max(0, min((50000 - 5900), 27157) - 11456) + 0.04 * max(0, min((50000 - 5900), 42861) - 27157) + 0.06 * max(0, min((50000 - 5900), 59498) - 42861) + 0.08 * max(0, min((50000 - 5900), 75197) - 59498) - 158 | usd }} for 2026 (after the $5,900 standard deduction and $158 personal credit), and State Disability Insurance takes another 1.3% ({{ 50000 * 0.013 | usd }}). Together they cut your take-home to {{ usTakeHome(50000) - (0.01 * max(0, min((50000 - 5900), 11456) - 0) + 0.02 * max(0, min((50000 - 5900), 27157) - 11456) + 0.04 * max(0, min((50000 - 5900), 42861) - 27157) + 0.06 * max(0, min((50000 - 5900), 59498) - 42861) + 0.08 * max(0, min((50000 - 5900), 75197) - 59498) - 158) - 50000 * 0.013 | usd }} a year, or {{ (usTakeHome(50000) - (0.01 * max(0, min((50000 - 5900), 11456) - 0) + 0.02 * max(0, min((50000 - 5900), 27157) - 11456) + 0.04 * max(0, min((50000 - 5900), 42861) - 27157) + 0.06 * max(0, min((50000 - 5900), 59498) - 42861) + 0.08 * max(0, min((50000 - 5900), 75197) - 59498) - 158) - 50000 * 0.013) / 12 | usd }} a month, which is {{ (usTakeHome(50000) - (0.01 * max(0, min((50000 - 5900), 11456) - 0) + 0.02 * max(0, min((50000 - 5900), 27157) - 11456) + 0.04 * max(0, min((50000 - 5900), 42861) - 27157) + 0.06 * max(0, min((50000 - 5900), 59498) - 42861) + 0.08 * max(0, min((50000 - 5900), 75197) - 59498) - 158) - 50000 * 0.013) / 2080 | usd(2) }} an hour net. At this salary the state you live in moves your effective rate by {{ usTakeHome(50000) / 2080 - (usTakeHome(50000) - (0.01 * max(0, min((50000 - 5900), 11456) - 0) + 0.02 * max(0, min((50000 - 5900), 27157) - 11456) + 0.04 * max(0, min((50000 - 5900), 42861) - 27157) + 0.06 * max(0, min((50000 - 5900), 59498) - 42861) + 0.08 * max(0, min((50000 - 5900), 75197) - 59498) - 158) - 50000 * 0.013) / 2080 | usd(2) }} an hour, and by more as income rises. (California schedule: FTB, October 2026; SDI rate: EDD, 2026.)
- **You earn $60,000 instead of $50,000:** Your gross hourly rate rises to {{ 60000 / 2080 | usd(2) }} and your net to {{ usTakeHome(60000) / 2080 | usd(2) }} in a no-tax state. The $10,000 raise adds {{ usTakeHome(60000) - usTakeHome(50000) | usd }} a year, or {{ (usTakeHome(60000) - usTakeHome(50000)) / 12 | usd }} a month, after tax: {{ (usTakeHome(60000) - usTakeHome(50000)) / 2080 | usd(2) }} an hour, not the full {{ 10000 / 2080 | usd(2) }}, because {{ usMarginalRate(50000) | pct(2) }} of each extra dollar goes to federal tax and FICA. Taxable income puts $50,000 in the {{ usBracket(50000) | pct }} federal bracket and $60,000 in the {{ usBracket(60000) | pct }} bracket.
- **You work 50-hour weeks (salaried, no overtime):** Your actual gross rate falls to {{ 50000 / (50 * 52) | usd(2) }} an hour, and your net drops to {{ usTakeHome(50000) / (50 * 52) | usd(2) }}. Those extra 10 hours a week effectively cost you {{ 50000 / 2080 - 50000 / (50 * 52) | usd(2) }} an hour in reduced rate.
- **You contribute 6% to a 401(k):** A {{ 50000 * 6 / 100 | usd }} pre-tax contribution saves {{ usPay(50000).federal - usPay(50000, k401=6).federal | usd }} in federal tax ({{ usBracket(50000) | pct }} of {{ 50000 * 6 / 100 | usd }}), so it costs {{ usTakeHome(50000) - usTakeHome(50000, k401=6) | usd }} in reduced take-home, or {{ (usTakeHome(50000) - usTakeHome(50000, k401=6)) / 12 | usd }} a month. Your net hourly pay drops by {{ (usTakeHome(50000) - usTakeHome(50000, k401=6)) / 2080 | usd(2) }}, but you gain {{ 50000 * 6 / 100 / 2080 | usd(2) }} an hour in retirement savings.

Your true hourly rate depends on your state, filing status, deductions and actual hours worked. Use the [US Salary Calculator](/tools/income-and-planning/salary-us/) to convert your salary to hourly, weekly and monthly figures (set the state tax rate to 0 to match this page) and see how taxes, 401(k) contributions and filing status change the numbers. Methods and sources are on the [salary calculator methodology page](/how-we-calculate/salary-us/).
