---
title: "How We Calculate: UK Salary (Take-Home Pay)"
slug: "salary-uk"
toolSlug: "salary-uk"
formula: "Take-Home = Gross Salary − Income Tax − National Insurance − Student Loan − Pension taken from pay. Monthly take-home = annual take-home / 12."
variables:
  - name: "Gross Salary"
    description: "Annual salary before any deductions. The calculator treats it as one job paid evenly through the year"
  - name: "Tax Code"
    description: "Blank means the standard 1257L with the £100,000 taper. A code the calculator does not recognise also falls back to 1257L, and says so. Recognised: nnnnL, nnnnM, nnnnN, nnnnT, 0T, Knnn, BR, D0, D1, NT, and the Scottish flat codes SBR, SD0, SD1, SD2 and SD3, with an optional S (Scottish) or C (Welsh) prefix and an optional W1, M1, X or NONCUM emergency marker"
  - name: "Personal Allowance"
    description: "Tax-free income threshold ({{ ukFact('personalAllowance') | gbp }} for {{ taxYear('uk') }}), reduced by £1 for every £2 of adjusted net income above {{ ukFact('paTaperThreshold') | gbp }} and gone at {{ ukFact('paTaperLimit') | gbp }}"
  - name: "Adjusted Net Income"
    description: "Salary minus salary sacrifice, minus net pay pension deductions, minus the gross relief-at-source contribution. It decides the taper, the 60% trap warning and the childcare limit"
  - name: "Income Tax"
    description: "Calculated on pay after the allowance through progressive bands, using the tax code and either the rest-of-UK or the Scottish bands"
  - name: "National Insurance"
    description: "Employee Class 1 contributions: {{ ukFact('niMainRate') | pct }} on earnings between {{ ukFact('niPrimaryThreshold') | gbp }} and {{ ukFact('niUpperEarningsLimit') | gbp }}, then {{ ukFact('niUpperRate') | pct }} above"
  - name: "Student Loan"
    description: "{{ ukFact('studentLoanRate') | pct }} of pay above the plan's threshold ({{ ukFact('postgradRate') | pct }} for a Postgraduate Loan), on the pay National Insurance is charged on, which is pay after salary sacrifice"
  - name: "Pension Contribution"
    description: "Entered three ways: a percentage of your full salary, a percentage of qualifying earnings, or a £ a year amount taken from your pay (a payslip's monthly pension line × 12)"
  - name: "Pension Method"
    description: "Net pay arrangement, relief at source, or salary sacrifice. They change which pay the tax, National Insurance and student loan are worked out on"
assumptions:
  - "Uses {{ taxYear('uk') }} tax year rates and thresholds, held in one rates file shared with the other UK tools"
  - "Employee is under State Pension age, with Class 1 category A National Insurance, one job paid evenly through the year, and no bonus, benefits in kind or other income"
  - "A blank tax code means 1257L. An S prefix selects the Scottish bands whatever the Scottish toggle says, and a C prefix selects the rest-of-UK bands (Wales uses the same bands and rates as England in 2026/27)"
  - "The flat-rate codes BR, D0 and D1 take their rate from the code itself and ignore the Scottish toggle. Without an S prefix D0 is the higher rate and D1 the additional rate; the Scottish flat codes are SBR, SD0 (intermediate), SD1 (higher), SD2 (advanced) and SD3 (top)"
  - "K codes add to taxable pay, and tax from the job cannot exceed half of pay"
  - "For L codes the £100,000 taper reduces only the Personal Allowance part of the code. A code at or above 1257L keeps its extra allowance. A code below 1257L uses the lower of the code and the tapered allowance, which is a year-end liability model: PAYE applies the code as issued and HMRC reconciles afterwards. M, N, T and 0T codes use the figure as issued"
  - "Pension percentages apply to your full salary unless you choose qualifying earnings. A £ amount is what leaves your pay, as on a payslip"
  - "Student loan repayments use pay after salary sacrifice (the pay National Insurance is charged on). A net pay or relief at source pension does not reduce them"
  - "Only one student loan plan is active at a time"
  - "Employer pension contributions are not included"
  - "Monthly take-home is annual take-home divided by 12 (weekly is divided by 52 and daily by 260), from the same result, with no separate rounding"
limitations:
  - "Does not model employer National Insurance ({{ ukFact('employerNiRate') | pct }} above {{ ukFact('employerNiThreshold') | gbp }} for {{ taxYear('uk') }})"
  - "Does not include tax on benefits in kind (company car, private medical, etc.)"
  - "Does not model the Marriage Allowance transfer. An M code adds the allowance as issued, and the calculator warns when income is too high for a basic-rate taxpayer to receive it"
  - "Flags a pension above the £60,000 annual allowance but does not charge the annual allowance tax charge"
  - "Does not model the Child Benefit High Income Charge (clawback above £60,000)"
  - "Does not include the dividend allowance (£500) or the savings allowances"
  - "From 6 April 2029 National Insurance relief on salary sacrifice above £2,000 a year is due to end. The {{ taxYear('uk') }} figures do not apply that"
  - "A real payslip can differ from the calculator by a few pounds (see Why Your Payslip May Differ)"
  - "Relief at source for Scottish taxpayers uses the same 20% provider relief. The starter-rate difference described in HMRC's pensions tax manual (PTM044220) is not modelled"
dataSources:
  - name: "GOV.UK: Income Tax rates and bands (including the Personal Allowance taper above £100,000)"
    url: "https://www.gov.uk/income-tax-rates"
  - name: "GOV.UK: Adjusted net income"
    url: "https://www.gov.uk/guidance/adjusted-net-income"
  - name: "GOV.UK: What your tax code means"
    url: "https://www.gov.uk/tax-codes/what-your-tax-code-means"
  - name: "GOV.UK: K in your tax code (half-of-pay limit)"
    url: "https://www.gov.uk/tax-codes/k-in-your-tax-code"
  - name: "GOV.UK: National Insurance rates and categories"
    url: "https://www.gov.uk/national-insurance-rates-letters"
  - name: "GOV.UK: Student Loan repayment thresholds and rates"
    url: "https://www.gov.uk/repaying-your-student-loan/what-you-pay"
  - name: "HMRC Collection of Student Loans Manual CSLM17055: loans follow National Insurance pay"
    url: "https://www.gov.uk/hmrc-internal-manuals/collection-of-student-loans-manual/cslm17055"
  - name: "Finance Act 2004 section 192: relief at source and the extended bands"
    url: "https://www.legislation.gov.uk/ukpga/2004/12/section/192"
  - name: "GOV.UK: Workplace pensions, what you, your employer and the government pay (qualifying earnings band)"
    url: "https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay"
  - name: "GOV.UK: Changes to salary sacrifice for pensions from April 2029"
    url: "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029"
  - name: "HMRC Pensions Tax Manual PTM044220: relief at source"
    url: "https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044220"
  - name: "Scottish Government: Scottish Income Tax rates and bands 2026-27"
    url: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/"
---

## What This Calculator Does

The UK salary calculator converts your gross annual salary into take-home pay by applying income tax, National Insurance, student loan repayments and pension contributions for {{ taxYear('uk') }}. The headline gives take-home pay a month and a year with equal weight: the monthly figure is the annual figure divided by 12, taken from the same result.

The calculation follows the order HMRC uses. Start with gross pay, take off any salary sacrifice and net pay pension to get the pay that is taxed, work out the Personal Allowance from adjusted net income, tax what is left through the bands, then add National Insurance and the student loan, and take off the pension paid from your pay. With the defaults (£35,000 salary, 5% of salary into a net pay pension, standard code) take-home pay is {{ ukPay(35000, pension=5, method=net).monthly | gbp }} a month and {{ ukPay(35000, pension=5, method=net).takeHome | gbp }} a year: {{ ukPay(35000, pension=5, method=net).incomeTax | gbp }} of income tax, {{ ukPay(35000, pension=5, method=net).ni | gbp }} of National Insurance and {{ ukPay(35000, pension=5, method=net).pension | gbp }} of pension.

## Income Tax ({{ taxYear('uk') }})

Income tax is applied to pay after the Personal Allowance through progressive bands:

| Band | Income | Rate |
|------|--------|------|
| Personal Allowance | First {{ ukFact('personalAllowance') | gbp }} | 0% |
| Basic Rate | {{ ukFact('personalAllowance') + 1 | gbp }} to {{ ukFact('higherRateThreshold') | gbp }} | {{ ukFact('basicRate') | pct }} |
| Higher Rate | {{ ukFact('higherRateThreshold') + 1 | gbp }} to {{ ukFact('additionalRateThreshold') | gbp }} | {{ ukFact('higherRate') | pct }} |
| Additional Rate | Over {{ ukFact('additionalRateThreshold') | gbp }} | {{ ukFact('additionalRate') | pct }} |

**Personal Allowance taper.** For adjusted net income above {{ ukFact('paTaperThreshold') | gbp }}, the Personal Allowance is reduced by £1 for every £2. This creates an effective income tax rate of {{ ukFact('higherRate') * 3 / 2 | pct }} in the band (the {{ ukFact('higherRate') | pct }} higher rate on the extra income, plus the tax lost on the allowance): on £110,000 the next £100 of pay costs {{ ukIncomeTax(110100) - ukIncomeTax(110000) | pct }} in income tax and {{ ukMarginalRate(110000) | pct }} with National Insurance. At £110,000 the allowance is {{ ukPay(110000).personalAllowance | gbp }}. The taper keys on adjusted net income, not on gross salary: a pension that brings adjusted net income under {{ ukFact('paTaperThreshold') | gbp }} restores the allowance. With 10% of a £110,000 salary into a net pay pension, adjusted net income is {{ ukPay(110000, pension=10, method=net).ani | gbp }}, the allowance is {{ ukPay(110000, pension=10, method=net).personalAllowance | gbp }}, and the calculator does not show the 60% warning. The childcare limit works the same way: Tax-Free Childcare and the free childcare hours for working parents stop when adjusted net income is over {{ ukFact('paTaperThreshold') | gbp }}.

**Scottish residents.** Scotland has six bands on non-savings income. The Scottish toggle applies them, and so does an S prefix on the tax code. For {{ taxYear('uk') }}, with the standard Personal Allowance:

| Scottish band | Income | Rate |
|---------------|--------|------|
| Starter | £12,571 to £16,537 | 19% |
| Basic | £16,538 to £29,526 | 20% |
| Intermediate | £29,527 to £43,662 | 21% |
| Higher | £43,663 to £75,000 | 42% |
| Advanced | £75,001 to £125,140 | 45% |
| Top | Over £125,140 | 48% |

On a £50,000 salary the rest-of-UK income tax is {{ ukIncomeTax(50000) | gbp }} and the Scottish income tax is {{ ukIncomeTax(50000, scottish=true) | gbp }}, so an S prefix matters: with the code S1257L the calculator gives {{ ukIncomeTax(50000, code='S1257L') | gbp }}, the same as the toggle. Welsh taxpayers use the rest-of-UK bands (a C prefix does the same).

## National Insurance (Employee Class 1)

National Insurance is worked out on earnings, not taxable income:

- **{{ ukFact('niPrimaryThreshold') | gbp }} to {{ ukFact('niUpperEarningsLimit') | gbp }}:** {{ ukFact('niMainRate') | pct }}
- **Over {{ ukFact('niUpperEarningsLimit') | gbp }}:** {{ ukFact('niUpperRate') | pct }}

Earnings below {{ ukFact('niPrimaryThreshold') | gbp }} incur no National Insurance. A net pay or relief at source pension does not reduce National Insurance, but salary sacrifice does.

## Student Loan Repayments

Repayments are {{ ukFact('studentLoanRate') | pct }} of pay above the plan's threshold ({{ ukFact('postgradRate') | pct }} for a Postgraduate Loan):

| Plan | Threshold ({{ taxYear('uk') }}) | Rate |
|------|---------------------|------|
| Plan 1 (pre-2012 England and Wales, Northern Ireland) | {{ ukFact('plan1Threshold') | gbp }} | {{ ukFact('studentLoanRate') | pct }} |
| Plan 2 (post-2012 England and Wales) | {{ ukFact('plan2Threshold') | gbp }} | {{ ukFact('studentLoanRate') | pct }} |
| Plan 4 (Scotland) | {{ ukFact('plan4Threshold') | gbp }} | {{ ukFact('studentLoanRate') | pct }} |
| Plan 5 (England, from 2023) | {{ ukFact('plan5Threshold') | gbp }} | {{ ukFact('studentLoanRate') | pct }} |
| Postgraduate Loan | {{ ukFact('postgradThreshold') | gbp }} | {{ ukFact('postgradRate') | pct }} |

Repayments are worked out on the same pay as National Insurance, which is pay after salary sacrifice. HMRC's student loan manual says a loan is repaid on pay that is liable to Class 1 National Insurance, so a salary sacrifice also reduces the repayment, and a net pay pension does not. On a £40,000 salary with a Plan 2 loan, the repayment is {{ ukStudentLoan(40000, plan=plan2) | gbp }}. With 5% of salary sacrificed it is {{ ukStudentLoan(40000, plan=plan2, pension=5, method=sacrifice) | gbp }}, which is {{ ukStudentLoan(40000, plan=plan2) - ukStudentLoan(40000, plan=plan2, pension=5, method=sacrifice) | gbp }} less. With 5% into a net pay pension it stays at {{ ukStudentLoan(40000, plan=plan2, pension=5, method=net) | gbp }}.

## Pension Contributions

**How you enter it.** There are three ways:

- **% of salary:** a percentage of your full gross salary (the default).
- **% of qualifying earnings:** many auto-enrolment schemes work the percentage out on earnings between £6,240 and £50,270 a year, before tax (GOV.UK, accessed 15 November 2026; check your scheme's rules). Qualifying earnings are your salary, capped at £50,270, minus £6,240, never below zero. On a £35,000 salary that is {{ max(0, min(35000, 50270) - 6240) | gbp }}, so 5% is {{ max(0, min(35000, 50270) - 6240) * 5 / 100 | gbp }} and not the {{ 35000 * 5 / 100 | gbp }} that 5% of full salary would give.
- **£ a year taken from your pay:** the amount your payslip shows leaving your pay for the pension, multiplied by 12. With relief at source the pension receives that amount plus the provider's 20% relief, so the gross contribution is the amount from pay divided by 0.8 (the same as × 1.25).

**How it is paid.**

- **Net pay arrangement:** the contribution comes off before tax. Income tax falls, National Insurance and the student loan do not.
- **Salary sacrifice:** your salary is cut instead. Income tax, National Insurance and the student loan are all worked out on the lower pay, so a sacrifice saves more than a net pay pension of the same size. The calculator shows how much National Insurance and student loan it saves.
- **Relief at source:** you pay from take-home pay and your provider adds 20% basic-rate relief. For higher- and additional-rate taxpayers (and the Scottish intermediate rate and above) the extra relief is claimed through the tax bands: the basic rate limit and every limit above it rise by the gross contribution (Finance Act 2004 s192).

**Relief at source: headline against payslip.** Payroll does not give the relief above 20%: you claim it through Self Assessment or a tax code change. So the calculator gives two take-home figures. The headline includes the claim. The "On your payslip" figure leaves out the band extension, and changes nothing else (same allowance, National Insurance, student loan and pension payment). The difference is the extra relief to claim a year. Example: a £60,000 salary with £400 a month taken from pay for a relief at source pension. That is {{ ukPay(60000, pensionAmount=6000, method=ras).pension | gbp }} a year from pay, so {{ ukPay(60000, pensionAmount=6000, method=ras).pensionPot | gbp }} goes into the pension.

- Headline: income tax {{ ukPay(60000, pensionAmount=6000, method=ras).incomeTax | gbp }}, take-home {{ ukPay(60000, pensionAmount=6000, method=ras).monthly | gbp(2) }} a month and {{ ukPay(60000, pensionAmount=6000, method=ras).takeHome | gbp }} a year.
- On your payslip: income tax {{ ukIncomeTax(60000) | gbp }}, take-home {{ (ukPay(60000, pensionAmount=6000, method=ras).takeHome - (ukIncomeTax(60000) - ukIncomeTax(60000, pensionAmount=6000, method=ras))) / 12 | gbp(2) }} a month and {{ ukPay(60000, pensionAmount=6000, method=ras).takeHome - (ukIncomeTax(60000) - ukIncomeTax(60000, pensionAmount=6000, method=ras)) | gbp }} a year.
- Extra relief to claim via Self Assessment: {{ ukIncomeTax(60000) - ukIncomeTax(60000, pensionAmount=6000, method=ras) | gbp }} a year.

If the pension also brings adjusted net income under £100,000 and restores part of the Personal Allowance, both figures use the restored allowance, so the extra relief counts only the band extension. If your tax code was set from your pay before the pension, the real amount to claim can be larger, and the calculator says so.

## Tax Codes

- **1257L** (standard) and any other number-and-letter code: the figure is the allowance divided by 10 (1257L is £12,570). L codes are tapered above £100,000 as described above.
- **M and N codes** carry Marriage Allowance received or transferred. They use the figure as issued, and for an M code the calculator warns when your income is too high for a basic-rate taxpayer to receive it.
- **T and 0T:** the code's figure as issued (T means HMRC has made other adjustments; 0T means no allowance).
- **BR, D0 and D1:** flat-rate codes. All pay from the job is taxed at the basic, higher or additional rate. They ignore the Scottish toggle. On £50,000, D0 gives {{ ukIncomeTax(50000, code=D0) | gbp }} of income tax whether the toggle is on or off. For Scottish flat rates use SBR, SD0, SD1, SD2 and SD3: SD0 on £50,000 gives {{ ukIncomeTax(50000, code=SD0) | gbp }} and SD1 gives {{ ukIncomeTax(50000, code=SD1) | gbp }}.
- **NT:** no tax.
- **K codes** (for example K475): the number is added to taxable pay, used when benefits in kind exceed your allowance. Tax from the job cannot exceed half of pay: on £12,000 with K2000 the bands would give more, and the calculator caps the tax at {{ ukIncomeTax(12000, code=K2000) | gbp }}. HMRC collects the rest another way.
- **S and C prefixes:** S selects the Scottish bands and C the Welsh (rest-of-UK) bands.
- **Emergency markers (W1, M1, X, NONCUM):** accepted, and shown as full-year figures.
- **A code below 1257L in the taper zone:** for 1100L at £110,000, the calculator uses the lower of the code and the tapered allowance, which is {{ ukPay(110000, code='1100L').personalAllowance | gbp }}, so the taper is not applied twice. This is a year-end liability. PAYE applies the code as issued, and HMRC reconciles after the year.
- **Anything else:** the calculator uses 1257L and shows: Tax code "X" not recognised, so these figures use the standard 1257L code.

## Why Your Payslip May Differ

The calculator works out a full year and divides by 12. PAYE works month by month: it takes free pay as the code × 10 + 9 (spread over the year), applies tax to whole-pound taxable pay, and rounds the monthly National Insurance thresholds. A real payslip can therefore differ by a few pounds a month from the calculator, and the relief at source "On your payslip" figure has the same small gap. Where you have a bonus, a second job or benefits in kind, the difference can be larger.

## Common Misconceptions

The {{ ukFact('higherRate') * 3 / 2 | pct }} effective rate between £100,000 and £125,140 surprises many people. It is not a separate tax band: it is the 40% rate plus the Personal Allowance taper. Because the taper keys on adjusted net income, a pension contribution that brings adjusted net income below £100,000 can be very tax-efficient, and the calculator shows how much more into your pension would get you there.

Another misconception is that salary sacrifice costs you money. For most employees it is better than a personal contribution of the same size because it saves National Insurance on top of income tax, and the student loan too. The trade-offs are a lower stated salary for mortgage and loan applications, and the cap on National Insurance relief that is due from 6 April 2029.
