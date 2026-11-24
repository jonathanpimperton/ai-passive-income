# Figure tokens: generated numbers in content

Every number in `src/data/**` that is a pure function of stated inputs is written as a
**figure token**. The build replaces the token with the value from the same `src/lib`
engines the calculators use. A content figure therefore can't drift from the calculator,
and it updates by itself when the tax year or an engine changes.

```markdown
**On a £30,000 salary with a Plan 2 student loan, you take home {{ ukTakeHome(30000, plan=plan2) | gbp }} a year.**
```

renders as

> **On a £30,000 salary with a Plan 2 student loan, you take home £25,064 a year.**

Plan reference: `docs/plan-2026-11.md` root cause RC1, decision D7, workstream W1-FIG.
Engine code: `src/lib/figures.ts` (catalogue), `src/lib/figure-parser.ts` (syntax),
`src/lib/remark-figures.mjs` (Markdown bodies), `src/lib/figures-content.ts` (frontmatter).

## 1. The rule for content agents

- **Token** every figure that follows from the page's stated inputs: take-home pay, tax,
  payments, interest, balances, payoff times, growth, differences between two scenarios,
  rates derived from the engines (marginal rate, effective rate), and current thresholds
  and rates held in `uk-rates.ts` / `us-rates.ts` (`ukFact`, `usFact`, `taxYear`).
- **Literal** only for the page's stated inputs (the £30,000 in "a £30,000 salary") and
  for sourced facts the engines do not hold (a survey median, a depreciation rule of
  thumb, a lender's typical rate). Give those a source and an as-of date.
- **Never** type a number that a token could produce, and never round a token's result by
  hand in the text. Use a formatter (`round100`, `roundTo(1000)`, `pct`, ...) instead.
- Word the prose so it stays true if the number moves: "{{ ... | pct }} of each payment
  goes to principal", not "more than 80%".
- The words around a figure are still your job. Re-read the sentence with the generated
  value in it (section 6 shows how to print every value on a page).
- **Every function is safe to tokenise** (W2-FIG, 15 Nov 2026): each one calls the same
  engine function its calculator calls (section 4, "What each function calls"), and
  `src/lib/figures-grid.test.ts` compares them over a grid of inputs with zero diffs
  allowed. A token never silently disagrees with the tool. Where a token cannot give an
  honest number it **fails the build** instead (a payoff that takes more than 50 years, a
  401(k) limit the IRS has not published, contradictory options). Read the error and
  write that case in words.
- **Guard derived claims.** A sentence that rests on a comparison of live figures ("the 15-year
  loan costs less interest", "the Roth account comes out ahead", "X is cheaper than Y") can go
  stale when a rate moves even though every number in it is a token. Put a `claim(...)` at the end
  of that sentence (section 4, "Guarding a verdict"): the build fails, with your message, the day
  the comparison stops being true.
- **Tell the year.** The US functions follow the calculator's default tax year, which moves
  from 2026 to 2027 on a build after 1 January 2027. Print `{{ taxYear('us') }}` beside the
  figures, or pass `year=2026` (or `2027`) when the sentence is about one specific year.

## 2. Syntax

```text
{{ function(positional, args, name=value) | formatter | formatter(arg) }}
```

- **Arguments.** Numbers are written in full: `300000` or `300_000`, never `300k`,
  `3e5` or `300,000`. Text can be quoted (`'plan2'`, `"plan2"`) or written as a bare word
  (`plan=plan2`). Text that starts with a digit must be quoted: `code='1257L'`. The
  booleans are `true` and `false`. Positional arguments come first, then `name=value`
  options. Any positional parameter can also be given by name.
- **Arithmetic.** `+ - * /` and parentheses work on numbers:
  `{{ ukTakeHome(30000) / 12 | gbp }}` (monthly), or
  `{{ loanTotalInterest(50000, 7, 4) - loanTotalInterest(50000, 4.5, 4) | usd }}` (a saving).
  Arguments can be expressions too, for example `yearly=loanPayment(50000, 7, 4)`.
- **Comparisons.** `<`, `>`, `<=`, `>=`, `==` and `!=` compare two numbers (`==` and `!=` also text),
  and `&&`, `||` and `!` join conditions: `a > b && c < d`. They give true/false, which cannot be
  printed, so they only make sense inside `claim(...)` (section 4). Precedence is the usual one
  (arithmetic, then comparison, then `&&`, then `||`); a comparison does not chain (write
  `a < b && b < c`). Both sides of `&&` and `||` are always evaluated. A single `|` is still the
  formatter pipe; `||` is "or".
- **Fields.** Functions that return an object need a field:
  `{{ cardPayoff(5000, 22.99, 100).months | months }}`.
- **Formatters** run left to right after `|`. A number can only be printed through a
  formatter, so the currency and the rounding are always explicit. A token that ends in a
  bare number is an error.
- **A token must compute something.** A bare word (`{{ taxYear }}`, a forgotten `()`)
  or quoted text on its own (`{{ '£25,064' }}`) is an error, so a hand-typed figure
  can't pass as a generated one. Arithmetic on the page's stated inputs is fine:
  `{{ 50000 / 18 | usd }}`.
- **Whitespace**, including line breaks, is allowed anywhere inside the braces.
- **Escape (rarely needed).** `\{{` stops a token from being read.
  - In body prose it prints a literal `{{`, because Markdown removes the backslash.
  - Inside code spans and fenced code blocks, Markdown keeps the backslash, so readers
    see `\{{`. Avoid literal `{{` in code.
  - In frontmatter, put it in a single-quoted YAML value (`note: 'type \{{ to start'`).
    The transform prints `{{`. A double-quoted YAML value rejects `\{` as an invalid
    escape, and the build fails.

### Where tokens work

| Place | Works? | Notes |
|---|---|---|
| Markdown body (paragraphs, headings, lists, **bold**, tables, code) | Yes | Resolved before Markdown is parsed, so a `\|` inside a token does not split a table cell. Bold and table figures still get the mono face (rehype-mono-figures). |
| Prose frontmatter fields: `title`, `description`, `resultSummary`, `inputs` values, `faq`, `workedExamples`, `comparisonTable` cells, `verdict`, `formula`, `assumptions`, `limitations`, `keywords`, `name`, `affiliateContext`, `calculationMethod`, source names | Yes | Resolved by the zod transform in `src/content.config.ts`. |
| Identifier fields: `slug`, `toolSlug`, `toolCategory`, `datePublished`, `dateModified`, `lastUpdated`, `relatedTools`, `affiliatePrograms`, source `url`s, and the KEYS of `inputs` (the pill labels) | No | A token here fails the build on purpose. Put figures in the `inputs` values, not the labels. |
| `.astro` templates | Use the function | `import { figure } from '@lib/figures';` then `figure("mortgagePayment(300000, 7, 30) \| usd")`. |

**Frontmatter quoting.** Always quote a frontmatter value that holds a token (a bare
`{` starts a YAML mapping). Inside a double-quoted YAML value, use single quotes or bare
words in the token:

```yaml
resultSummary: "{{ ukTakeHome(30000, plan=plan2) | gbp }}/year ({{ ukTakeHome(30000, plan=plan2) / 12 | gbp }}/month)"
inputs:
  Tax Year: "{{ taxYear('uk') }}"
```

## 3. Conventions

- **Rates are percentage numbers**, both as arguments and as results: `7` means 7%.
  `pct` prints a percentage number, so `{{ ukFact('basicRate') | pct }}` gives "20%".
- **Money** is in whole currency units. Formatters round (half away from zero) when
  printing; nothing is rounded inside the engines.
- **Terms** are in years (`loanPayment(50000, 7, 4)` is 4 years), except where the
  name says months (`afterMonths`, `months`). A term must be a whole number of months.
- **Defaults are zero or none**, not the calculators' UI defaults. `ukTakeHome(50000)`
  has no pension and no student loan, and `usTakeHome(75000)` has no state tax and no
  401(k). State every assumption in the token and in the prose.
- **Tax year.**
  - **US.** `year=2026` or `year=2027` picks the dataset in `us-rates.ts` and is passed to the
    engines. With no `year=` the function uses the default year, the same one the US Salary
    calculator starts on: the calendar year once its data exists (2026 until the build of
    1 January 2027). Any other year fails the build. Print it with `{{ taxYear('us') }}`.
  - **UK.** One dataset (2026/27). The UK engines take no year
    argument, so `year=` is accepted only for that dataset and anything else fails the build
    rather than quietly returning the wrong year. Print it with `{{ taxYear('uk') }}`.
- **Years are not months.** A field or function that returns years (`rentVsBuy` `.breakEvenYear` and
  `.laterBreakEvenYear`, `solarPayback` `.paybackYears`, `cardBeyondHorizon` `.years`, `cpiAdjust` `.years`,
  `yearsToTarget`, `cardHorizonYears`, `goalHorizonYears`) refuses the `months` formatter, because it would print
  year 17 as "1 year 5 months". Print years with `int` or `num(1)`; to show years as a duration, multiply by 12
  first (`{{ yearsToTarget(...) * 12 | months }}`).
- **Rounding of parts.** Each token is rounded on its own, so a list of rounded parts
  may not add up to a rounded total by £1. Say "(rounding applies)", or token the
  total as a difference of the same values.
- **"Never", "beyond 50 years" and "not within 100 years".** Payoff and target functions return
  `Infinity` only when the goal can truly never be reached (a card payment that does not
  exceed the first month's interest; savings or investing with no deposits and no growth).
  `| months` prints "never". Money formatters refuse Infinity, so a "never" scenario can't print
  a fake total. A savings goal or investment target that the calculators report as "Not within
  100 years" is NOT "never": `savingsMonths` and `yearsToTarget` fail the build for it (write it in
  words; `{{ goalHorizonYears() | int }}` gives the 100). The card payoff engine has a 600-month
  (50-year) horizon: a balance that is falling but not cleared by then is NOT "never", and
  the calculator labels it "beyond 50 years". A token for that case fails the build, so
  write it in words.


## 4. Function catalogue

Signatures show positional parameters, then options (`name=`). Every example below is
evaluated by `src/lib/figures.test.ts`, and the values shown are for the 2026/27 (UK) and
2026 (US) datasets.

### UK pay

`ukPay`, `ukTakeHome`, `ukIncomeTax`, `ukNi`, `ukStudentLoan` and `ukMarginalRate` share
one engine and one set of options:

| Option | Default | Meaning |
|---|---|---|
| `pension` | 0 | Pension contribution as % of salary. This is the gross amount going into the pot. |
| `pensionAmount` | 0 | Pension contribution in £ a year, gross. Use instead of `pension`. |
| `method` | none | `sacrifice` (salary sacrifice), `net` (net pay arrangement) or `ras` (relief at source). Required whenever a pension is given. |
| `plan` | `none` | Student loan: `plan1`, `plan2`, `plan4`, `plan5` or `postgrad`. |
| `postgrad` | false | Also repaying a Postgraduate Loan on top of `plan`. The calculator holds one loan, so it cannot show this combination: the figure adds the Postgraduate Loan from the same engine on the same NIC pay. |
| `code` | `'1257L'` | Any tax code the calculator accepts: `nnnnL`, `nnnnM`, `nnnnN`, `nnnnT`, `0T`, `Knnn`, `BR`, `D0`, `D1`, `NT`, `SBR`, `SD0` to `SD3`, with an optional `S` (Scottish) or `C` (Welsh, rest-of-UK bands) prefix and an optional `W1`, `M1` or `X` emergency marker. A code the calculator would not recognise (it falls back to 1257L) fails the build. See "Tax code rules" below. |
| `scottish` | false | Scottish income tax bands for `L`, `M`, `N`, `T`, `0T` and `K` codes. An `S` prefix implies it, a `C` prefix means rest-of-UK bands; an explicit contradiction (`S1257L` with `scottish=false`) fails. `BR`, `D0` and `D1` ignore it (below). |
| `year` | current | For example `'2026/27'`. |

How the pension methods work (all three, for every tax code and region, as in the calculator):
- **sacrifice.** Income tax, NI and student loan are all worked out on pay after the
  sacrifice (HMRC: the student loan uses NIC pay).
- **net.** Tax is on pay after the pension. NI and the student loan are on full pay.
- **ras.** Paid from net pay at 80%, and the provider adds 20%. The basic and higher
  rate limits extend by the gross contribution (for Scottish taxpayers, the Scottish basic
  rate limit and every limit above it).
- With any method, the personal-allowance taper keys on adjusted net income, so a
  sacrifice that brings income under £100,000 restores the allowance.

Tax code rules (the calculator's own, from `uk-tax-codes.ts` and `uk-tax-calc.ts`):
- **Region.** An `S` prefix means Scottish bands, a `C` prefix rest-of-UK bands. With no
  prefix, `scottish=true` selects the Scottish bands for the codes that run through the
  bands (`L`, `M`, `N`, `T`, `0T`, `K`).
- **Flat-rate codes** (`BR`, `D0`, `D1`) take their rate from the code itself and ignore the
  `scottish` flag. Without an `S` prefix they are the rest-of-UK rates: `D0` is 40% and `D1`
  is 45%, also with `scottish=true`. This is the HMRC rule (a Scottish taxpayer's codes are
  `SBR`, `SD0` intermediate, `SD1` higher, `SD2` advanced, `SD3` top), and what the
  calculator does. Write the Scottish flat rates as `SD0` and so on. `SD2` and `SD3` exist
  only with the `S` prefix.
- **`L` codes and the £100,000 taper.** The taper reduces only the personal allowance part
  of the code. A code at or above `1257L` keeps its extra allowance on top of the tapered
  allowance. A code below `1257L` is taken to be HMRC's own adjusted figure: the allowance
  is the lower of the code and the tapered allowance, so it is not tapered twice (at
  £110,000, `1100L` gives £7,570, not £6,000). `M`, `N`, `T` and `0T` use the figure as issued.
- **`K` codes** add to taxable pay; tax cannot exceed half of pay. Emergency markers (`W1`,
  `M1`, `X`) show full-year figures.
- **Marginal rate.** `ukMarginalRate` is the calculator's rate on the next £100 of pay, with
  a pension held at its current £ amount (so a percentage pension does not mask the rate).

| Function | Returns | Example | Value |
|---|---|---|---|
| `ukTakeHome(salary, ...options)` | £ a year | `{{ ukTakeHome(30000, plan=plan2) \| gbp }}` | £25,064 |
| `ukIncomeTax(salary, ...options)` | £ a year | `{{ ukIncomeTax(50000) \| gbp }}` | £7,486 |
| `ukNi(salary, ...options)` | £ a year | `{{ ukNi(50000) \| gbp }}` | £2,994 |
| `ukStudentLoan(salary, ...options)` | £ a year (needs `plan`) | `{{ ukStudentLoan(35000, plan=plan2) \| gbp }}` | £505 |
| `ukMarginalRate(salary, ...options)` | % lost on the next £100 to tax + NI + student loan (the calculator's marginal rate) | `{{ ukMarginalRate(110000) \| pct }}` | 62% |
| `ukPay(salary, ...options)` | object | `{{ ukPay(60000, pension=5, method=sacrifice, plan=plan2).studentLoan \| gbp }}` | £2,485 |

`ukPay` fields:
- `.takeHome`, `.monthly` (/12), `.weekly` (/52);
- `.incomeTax`, `.ni`, `.studentLoan`;
- `.pension` (what it costs from pay; under ras the net 80%) and `.pensionPot` (gross into the pot);
- `.ani` (adjusted net income), `.personalAllowance` (after taper);
- `.taxRate` ((tax + NI) as % of salary).

Examples:
- Monthly take-home: `{{ ukTakeHome(50000) / 12 | gbp }}`.
- What a pay rise keeps: `{{ ukTakeHome(50000) - ukTakeHome(40000) | gbp }}`.
- The 60% trap with a sacrifice: `{{ ukPay(110000, pensionAmount=10000, method=sacrifice).personalAllowance | gbp }}`.
- Scottish: `{{ ukIncomeTax(50000, code='S1257L') | gbp }}`.

### UK tax

| Function | Returns | Example | Value |
|---|---|---|---|
| `sdlt(price, buyer=)` | £ SDLT (England and NI). `buyer`: `standard` (default), `ftb` (first-time), `additional` | `{{ sdlt(425000, buyer=ftb) \| gbp }}` | £6,250 |
| `sdlt(price, buyer=, nonResident=true)` | the same with the non-UK resident surcharge (the Stamp Duty tool's checkbox): 2% extra on every band, on a price of £40,000 or more, on top of the first-time buyer or higher rates. Below £40,000 neither surcharge applies, as in the tool | `{{ sdlt(700000, nonResident=true) \| gbp }}` | £39,000 |
| `ukCgt(gain, income, year=)` | £ CGT. The band is worked out from income (gross salary etc.) | `{{ ukCgt(50000, 40000) \| gbp }}` | £10,664 |

### US pay

`usPay`, `usTakeHome`, `usFederalTax`, `usFica`, `usBracket` and `usMarginalRate` share
these options (they mirror the US salary calculator's annual mode):

| Option | Default | Meaning |
|---|---|---|
| `status` | `single` | `single`, `married` (filing jointly; also `mfj`) or `head` (of household; also `hoh`). |
| `state` | 0 | Flat state and local income tax rate in %, like the calculator's input. Say which state you mean in the prose. |
| `k401` | 0 | 401(k) contribution as % of salary. Capped at the IRS limit for the year, like the calculator. Reduces federal and state taxable pay, but not FICA. A contribution above an unpublished limit (2027 until the IRS notice) fails the build. |
| `k401Amount` | 0 | 401(k) contribution in $ a year, converted to a % of salary for the engine. Use instead of `k401`. |
| `year` | default year | `2026` or `2027` (see "Tax year" in section 3). Without it, the calculator's default year. |

| Function | Returns | Example | Value |
|---|---|---|---|
| `usTakeHome(salary, ...options)` | $ a year | `{{ usTakeHome(75000) \| usd }}` | $61,593 |
| `usFederalTax(salary, ...options)` | $ a year, after the standard deduction | `{{ usFederalTax(100000, status=married) \| usd }}` | $7,640 |
| `usFica(salary, ...options)` | $ a year: Social Security + Medicare | `{{ usFica(75000) \| usd }}` | $5,738 |
| `usBracket(salary, ...options)` | % federal bracket the calculator shows for this pay (10%, the lowest, when taxable income is 0) | `{{ usBracket(60000) \| pct }}` | 12% |
| `usMarginalRate(salary, ...options)` | % of the next $1 lost to federal + FICA + state | `{{ usMarginalRate(75000, state=5) \| pct1 }}` | 34.7% |
| `usPay(salary, ...options)` | object | `{{ usPay(75000, state=5).federal \| usd }}` | $7,670 |

`usPay` fields:
- `.takeHome`, `.monthly`, `.biweekly`, `.weekly`;
- `.federal`, `.fica`, `.socialSecurity`, `.medicare`, `.state`;
- `.k401` (after the cap);
- `.taxRate` ((federal + FICA + state) / salary, %);
- `.effectiveRate` (all deductions including the 401(k), %; the calculator's "effective rate");
- `.taxableIncome` (federal taxable income after the 401(k) and the standard deduction) and `.bracket` (the federal bracket the calculator shows, %).

Hourly pay is plain arithmetic: `{{ usTakeHome(50000) / 2080 | usd(2) }}`.

### US tax

| Function | Returns | Example | Value |
|---|---|---|---|
| `usCgt(gain, income, status=, holding=, year=)` | $ federal CGT + NIIT. `income` is ordinary TAXABLE income (after deductions); `holding` is `long` (default) or `short` | `{{ usCgt(50000, 80000) \| usd }}` | $7,500 |

### Facts (thresholds and rates from the rates modules)

`{{ ukFact('key') }}` and `{{ usFact('key', status=married) }}` print data straight
from `uk-rates.ts` / `us-rates.ts`, so the page updates when the data does. Rates come
back as percentages.

| `ukFact` key | Meaning |
|---|---|
| `personalAllowance`, `basicBand`, `higherRateThreshold` (salary where 40% starts), `additionalRateThreshold`, `paTaperThreshold`, `paTaperLimit` | Income tax thresholds (£) |
| `basicRate`, `higherRate`, `additionalRate` | Income tax rates (%) |
| `niPrimaryThreshold`, `niUpperEarningsLimit`, `niMainRate`, `niUpperRate`, `employerNiRate`, `employerNiThreshold` | National Insurance |
| `plan1Threshold`, `plan2Threshold`, `plan4Threshold`, `plan5Threshold`, `postgradThreshold`, `studentLoanRate`, `postgradRate` | Student loans |
| `statePensionWeekly`, `statePensionAnnual`, `pensionAccessAge`, `pensionAccessAgeFrom2028` | Pensions. There is no State Pension age key: it depends on date of birth (66 to 68, `uk-pension-ages.ts`), so write it in words and cite the GOV.UK timetable |
| `cgtAnnualExempt`, `cgtBasicRate`, `cgtHigherRate` | Capital Gains Tax |
| `sdltNilBand`, `sdltFtbNilBand`, `sdltFtbCap`, `sdltSurcharge` | Stamp duty: the 0% band top, the first-time buyer 0% band top and price cap, and the additional-property surcharge (%) |
| `sdltBand2Top`, `sdltBand3Top`, `sdltBand4Top`, `sdltBand2Rate`, `sdltBand3Rate`, `sdltBand4Rate`, `sdltTopRate` | Standard stamp duty bands, numbered from the 0% band (band 1 is 0% up to `sdltNilBand`): the top of the 2%, 5% and 10% bands (£) and the rates of bands 2, 3, 4 and of the band above (%) |
| `sdltFtbRate`, `sdltNonResidentSurcharge`, `sdltNonResidentMinPrice` | First-time buyer rate above the nil band (%), the non-UK resident surcharge (%) and the price from which it applies (£) |
| `scotStarterRate`, `scotBasicRate`, `scotIntermediateRate`, `scotHigherRate`, `scotAdvancedRate`, `scotTopRate` | Scottish income tax rates (%) |
| `scotStarterTop`, `scotBasicTop`, `scotIntermediateTop`, `scotHigherTop`, `scotAdvancedTop` | Top of each Scottish band as income with the standard personal allowance (£), the figures gov.scot publishes: starter to £16,537, basic to £29,526 and so on. `scotAdvancedTop` is where the top rate starts |
| `qualifyingEarningsLower`, `qualifyingEarningsUpper` | Auto-enrolment qualifying earnings band (£ a year) |
| `pensionAnnualAllowance` | Pension annual allowance before any taper (£) |
| `psaBasic`, `psaHigher`, `psaAdditional` | Personal Savings Allowance by income tax band (£) |
| `isaAllowance`, `lisaAnnualLimit`, `lisaPropertyCap` | ISA allowance, the most you can pay into a Lifetime ISA a year, and the first-home price cap (£) |
| `mortgageIncomeMultiple` | Typical lender loan-to-income cap (x income) |

| `usFact` key (`status=` where it varies) | Meaning |
|---|---|
| `standardDeduction`, `additionalMedicareThreshold`, `niitThreshold`, `ltcgZeroTop`, `ltcg15Top` | By filing status ($) |
| `ssWageBase`, `ssRate`, `medicareRate`, `additionalMedicareRate`, `niitRate` | FICA and NIIT |
| `k401Limit`, `k401CatchUp`, `k401CatchUp60to63` | 401(k) limits ($). Fails for a year the IRS has not published yet |
| `iraLimit`, `iraCatchUp` | IRA contribution limit and the age-50 catch-up ($). Fails for a year the IRS has not published yet, like the 401(k) limits |
| `overtimeCap`, `overtimePhaseOutStart` | Qualified overtime deduction cap and the MAGI where it starts to phase out ($, by filing status). One Big Beautiful Bill Act, tax years 2025 to 2028; fails outside them |
| `overtimeReductionPer1000` | Overtime deduction lost for each full $1,000 of MAGI above the start ($) |
| `seniorDeduction`, `seniorPhaseOutStart`, `seniorPhaseOutRate` | Senior deduction per person aged 65+ ($), the MAGI where it starts to phase out ($, by filing status) and the share of MAGI above that which reduces it (%). Same years as the overtime deduction |

| Function | Returns | Example | Value |
|---|---|---|---|
| `ukFact(key, year=)` | number | `{{ ukFact('plan2Threshold') \| gbp }}` | £29,385 |
| `usFact(key, status=, year=)` | number | `{{ usFact('standardDeduction', status=married) \| usd }}` | $32,200 |
| `usBracketStart(rate, status=, year=)` | $ taxable income where a bracket starts | `{{ usBracketStart(22) \| usd }}` | $50,400 |

### Loans and mortgages

These cover principal and interest only: no tax, insurance or PMI. The monthly rate is
the annual rate / 12, as in the calculators.

| Function | Returns | Example | Value |
|---|---|---|---|
| `loanPayment(principal, rate, years)` | monthly payment | `{{ loanPayment(50000, 7, 4) \| usd }}` | $1,197 |
| `mortgagePayment(principal, rate, years)` | same as loanPayment | `{{ mortgagePayment(300000, 7, 30) \| usd(2) }}` | $1,995.91 |
| `loanTotalInterest(principal, rate, years)` | interest over the full term | `{{ loanTotalInterest(50000, 7, 4) \| usd }}` | $7,471 |
| `mortgageTotalInterest(principal, rate, years)` | same as loanTotalInterest | `{{ mortgageTotalInterest(300000, 7, 30) \| usd }}` | $418,527 |
| `loanBalance(principal, rate, years, afterMonths)` | balance after that many payments | `{{ loanBalance(300000, 6.5, 30, 120) \| usd }}` | $254,328 |
| `loanMonth(principal, rate, years, month)` | object: `.payment` `.interest` `.principal` `.balance` `.principalShare` (%) | `{{ loanMonth(50000, 7, 4, 1).interest \| usd }}` | $292 |
| `loanYear(principal, rate, years, year)` | object: `.interest` `.principal` `.endBalance` for that loan year | `{{ loanYear(300000, 7, 30, 1).interest \| usd }}` | $20,903 |
| `overpaymentSaving(principal, rate, years, monthly=, yearly=)` | object: `.interestSaved` `.monthsSaved` `.months` `.interest` `.baseInterest` | `{{ overpaymentSaving(300000, 7, 30, monthly=200).interestSaved \| usd }}` | $116,640 |

`yearly=` is a lump paid with every 12th payment. A "13th payment" is
`yearly=loanPayment(50000, 7, 4)`.

### Debt

| Function | Returns | Example | Value |
|---|---|---|---|
| `cardPayoff(balance, apr, payment)` | object (fields below), with a fixed monthly payment | `{{ cardPayoff(5000, 22.99, 100).months \| months }}` | 13 years 11 months |
| `cardPayoff(balance, apr, minPct=, minFloor=, plusInterest=, extra=)` | object, with a declining minimum: max(minPct% of the balance, minFloor), plus `extra`. `plusInterest=true` makes the minimum the month's interest PLUS minPct% of the balance (the UK/FCA and common US issuer formula), still at least minFloor. The calculator fixes `minFloor` by currency (25 for USD and EUR, 5 for GBP), so `minFloor=25` reproduces the calculator only for USD and EUR visitors; `minPct` is 1 to 10 (percentage) or 1 to 5 (interest plus) in steps of 0.5 there | `{{ cardPayoff(50000, 22, minPct=3, minFloor=25).months \| months }}` | 33 years 5 months |
| `loanPayoff(balance, apr, payment, extra=)` | object; same engine with a fixed payment (student loans, personal loans) | `{{ loanPayoff(50000, 6.5, 600).interest \| usd }}` | $16,682 |
| `payoffBalance(balance, apr, payment, months)` | balance left after that many fixed payments (0 once cleared); `months` is at most 600, the length of the calculator's schedule. Fails if the payment never covers the interest | `{{ payoffBalance(50000, 22, 1200, 12) \| usd }}` | $46,235 |
| `cardHorizonYears()` | the horizon of the card engine in years (50): a balance not cleared within it is "beyond 50 years" | `{{ cardHorizonYears() \| int }}` | 50 |

All four are `simulateCardPayoff` (`credit-card.ts`), the credit card calculator's engine:
interest is charged on the opening balance each month, and the horizon is 600 months
(50 years).

Payoff fields:
- `.months`, `.interest`, `.totalPaid`: all Infinity when the debt is never cleared;
- `.never` (true or false);
- `.firstInterest` (the first month's interest) and `.firstPayment`.

Two different "no answer" cases, matching the calculator:
- **Never**: the first payment does not exceed the first month's interest, so the balance
  never falls. `.months | months` prints "never"; money formatters refuse Infinity.
- **Beyond 50 years**: the balance falls but is not cleared within 600 months (for example a
  2% minimum on a 22% APR card). The calculator labels this "beyond 50 years" and shows
  horizon totals. A token for it **fails the build**, because a bare number would read as
  "paid off in 50 years". Say it in words.

### Saving and investing

Deposits are monthly everywhere. `compounding` only sets the growth rate (the equivalent
monthly rate, as in the calculators), and `timing` says whether each month's deposit goes in
at the `end` (default) or the `beginning` of that month.

| Function | Returns | Example | Value |
|---|---|---|---|
| `compoundFV(start, monthly, rate, years, compounding=, timing=)` | future value. `compounding`: 12 (default), 1, 2, 4, 52, 365 or `annually`/`quarterly`/`monthly`/`weekly`/`daily`; `timing`: `end` (default) or `beginning` of each month | `{{ compoundFV(10000, 0, 7, 30) \| usd }}` | $81,165 |
| `compoundEarned(start, monthly, rate, years, compounding=, timing=)` | growth only (future value minus everything paid in) | `{{ compoundEarned(10000, 200, 7, 30) \| usd }}` | $243,159 |
| `retirementFV(savings, monthly, rate, years, inflation=)` | object: `.nominal` `.real` (today's money) `.contributions` `.growth`. `years` is rounded to whole months, as in the calculator | `{{ retirementFV(50000, 500, 7, 35, inflation=3).real \| usd }}` | $524,487 |
| `savingsMonthly(goal, current, rate, months)` | monthly saving needed (0 if the goal is already met, or interest on the current savings alone gets there) | `{{ savingsMonthly(100000, 0, 4, 60) \| usd }}` | $1,508 |
| `savingsMonths(goal, current, monthly, rate)` | whole months until the balance first meets the goal (0 if already there; Infinity only when it can never be met, with no deposits and no growth; a goal the calculator reports as "Not within 100 years" fails the build) | `{{ savingsMonths(50000, 0, 1000, 5) \| months }}` | 3 years 10 months |
| `yearsToTarget(start, monthly, rate, target, compounding=, timing=)` | years = whole months / 12, as the investment return calculator's Time tab (0 if already there; Infinity only when it can never be reached, with no deposits and no growth; a target the calculator reports as "Not within 100 years" fails the build) | `{{ yearsToTarget(10000, 500, 7, 1000000) \| num(1) }}` | 34.8 |
| `goalHorizonYears()` | how far the savings goal and investment return calculators look, in years (100), for the words around a "Not within 100 years" case | `{{ goalHorizonYears() \| int }}` | 100 |
| `feeDrag(start, monthly, rate, years, fee, compareFee=)` | object: `.cost` `.balance` `.compareBalance` `.zeroFeeBalance` `.feesPaid` `.contributions` `.shareOfGrowth` (%, capped at 100) `.contributionsLost` | `{{ feeDrag(100000, 0, 7, 30, 1).cost \| usd }}` | $209,392 |
| `inflationAdjust(amount, rate, years, mode=)` | steady-rate inflation. `mode=cost` (default): what it will cost; `mode=value`: what today's money will buy | `{{ inflationAdjust(100000, 3, 20, mode=value) \| usd }}` | $55,368 |
| `cpiAdjust(amount, fromYear, toYear)` | object: `.adjusted` (the amount in `toYear` prices) `.cumulativeChange` (%) `.averageAnnual` (%) `.years`. US CPI-U, BLS annual averages 1913 to 2025; the current year uses the latest monthly index (`CPI_U_LATEST` in `inflation.ts`). Either direction; the two years must differ | `{{ cpiAdjust(45000, 2010, 2025).adjusted \| usd }}` | $66,439 |

`feeDrag` is the investment fee calculator's `compareFees`: the fee is subtracted from the
gross return, then monthly compounding with deposits at the end of each month. `.shareOfGrowth`
is the share of the lower-fee fund's earnings that the fee gap takes; when that fund earns
nothing (net return 0 or less) the share is undefined and the token fails. `feeDrag(100000, 500,
7, 30, fee).balance` gives the methodology table: $1,410,807 / $1,252,269 / $1,104,515 /
$975,545 at fees of 0.03 / 0.5 / 1 / 1.5%.

`cpiAdjust` for 2026 uses the latest monthly index, so a figure that ends in 2026 moves
whenever `CPI_U_LATEST` in `inflation.ts` is updated. Use `toYear=2025` for a stable figure.

### More debt functions

| Function | Returns | Example | Value |
|---|---|---|---|
| `cardBeyondHorizon(balance, apr, payment, ...)` | object, same arguments as `cardPayoff`: what the card calculator shows for a balance that is falling but not cleared in 600 months: `.remaining` (balance left), `.interest`, `.totalPaid`, `.months` (600), `.years` (50). Fails for a balance that does clear (use `cardPayoff`) or never falls | `{{ cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).remaining \| usd }}` | $3,017 |
| `dailyCompoundingApr(apr)` | % APR to enter in the calculator (which charges APR / 12 a month) to match an issuer that compounds daily at the quoted APR | `{{ dailyCompoundingApr(22.99) \| pct(2) }}` | 23.20% |
| `debtPayoff(debts, extra, strategy)` | object (fields below): the debt payoff calculator for several debts. `debts` is text, `'balance@apr/minimum'` separated by `;`, APR in %. `strategy` is `avalanche` or `snowball` | `{{ debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest \| usd(2) }}` | $3,105.52 |
| `debtClearMonth(debts, extra, strategy, debt)` | the month the n-th debt listed (1 = the first) is cleared | `{{ debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche', 1) \| int }}` | 20 |

`debtPayoff` fields: `.months`, `.interest`, `.totalPaid`, `.monthlyOutlay` (all the minimums plus the
extra, paid every month), `.firstMonthInterest`. Debts are validated by the calculator's own row
check. A set that is never cleared, or not cleared within 600 months (50 years), **fails the
build**, as the calculator shows no honest total for it. Snowball vs avalanche is two calls:
`{{ debtPayoff(D, 200, 'snowball').interest - debtPayoff(D, 200, 'avalanche').interest | usd(2) }}` with
the debt text written out in both.

### Mortgage affordability

`usAffordability`, `ukAffordability` and `eurAffordability` are the mortgage affordability
calculator's three modes (USD, GBP, EUR). `income`, `debts`, `deposit`, `rate` and `years` are
required, so a token always states its inputs. `years` must be one of the calculator's term buttons: 15 or 30 (USD), 20, 25, 30
or 35 (GBP), 20, 25 or 30 (EUR); any other term fails the build, because the calculator cannot show it. The calculator's own defaults are $500 of monthly debts
for USD and EUR but 0 for GBP, and a market-snapshot rate (pass `rate('us30')` for it). Every
option defaults to the calculator's own default, so a token states only what differs.

| Function | Returns | Example | Value |
|---|---|---|---|
| `usAffordability(income, debts, deposit, rate, years, propertyTax=, insurance=, hoa=, pmi=, frontEnd=, backEnd=)` | object (fields below): the 28/36 rule. Defaults: property tax 1.0%, insurance $1,800, HOA 0, PMI 0.6%, limits 28 and 36 | `{{ usAffordability(80000, 500, 40000, 7, 30).maxPrice \| usd }}` | $250,776 |
| `ukAffordability(income, debts, deposit, rate, years, takeHome=, ltiCap=, revertRate=, stressMargin=, maxShare=)` | object: income multiple plus stress test. `takeHome` defaults to the calculator's one-earner estimate rounded to whole pounds; `revertRate` to the Bank of England average in `market-rates.ts` (6.58% today; the calculator fixes it there, so passing `revertRate=` is an extension it cannot show). Defaults: 4.5x, margin 1, 50% | `{{ ukAffordability(60000, 0, 40000, 5, 25, takeHome=3600, revertRate=6.5).maxPrice \| gbp }}` | £283,575 |
| `eurAffordability(income, debts, deposit, rate, years, maxDebtService=)` | object: one combined payment limit (default 36% of gross income) | `{{ eurAffordability(60000, 0, 40000, 3.5, 25).maxLoan \| eur }}` | €359,552 |

All three return `.maxPrice`, `.maxLoan`, `.monthlyPI`, `.totalMonthly` and `.grossMonthly`.
- US adds `.monthlyTax`, `.monthlyInsurance`, `.monthlyHOA`, `.monthlyPMI`, `.frontEndBudget`,
  `.backEndBudget`, `.housingBudget`, `.frontEndRatio`, `.backEndRatio` (both %), `.needsPMI` and
  `.binding` (`front-end` or `back-end`).
- UK adds `.monthlyTakeHome`, `.ltiCap`, `.ltiLimitLoan`, `.stressRatePct`, `.stressLimitLoan`,
  `.stressedPayment`, `.shareOfTakeHome`, `.stressedShareOfTakeHome` (both %), `.incomeMultiple`,
  `.depositPct`, `.lowDeposit` and `.binding` (`lti` or `stress`).
- EUR adds `.paymentBudget` and `.debtServiceRatio` (%).

When the debts alone use up the limit (or, in the US, property tax, insurance and HOA exceed the
budget) the calculator says "No home fits these limits" and the token **fails the build**.

### Rent vs buy

| Function | Returns | Example | Value |
|---|---|---|---|
| `rentVsBuy(price, down, rate, years, rent, horizon, region=, closing=, selling=, propertyTax=, insurance=, hoa=, maintenance=, appreciation=, rentIncrease=, rentersInsurance=, invest=, marginalTax=, status=, otherItemized=, stateTax=)` | object (fields below): the month-by-month net-worth comparison. `down` is a % of the price; `years` (the mortgage term) is 10 to 35 and `horizon` 1 to 30 whole years, the calculator's slider ranges (outside them the token fails). Defaults are the calculator's (property tax 1%, insurance 1,800, maintenance 1%, growth 3%, rent increase 3%, renters insurance 15, return 7%, US marginal rate 22%, single); buying and selling costs default by region (3% and 6% in the US, 0 in the UK and euro area) | `{{ rentVsBuy(350000, 20, 5.5, 25, 1400, 10, region=uk, closing=3, selling=2, propertyTax=0, insurance=400, rentersInsurance=10).advantage \| gbp }}` | £9,280 |

Fields: `.advantage` (buyer minus renter net worth; negative means renting is ahead),
`.difference` (its absolute value), `.verdict` (`buy`, `rent` or `tie`, printable as text),
`.breakEvenYear` and `.laterBreakEvenYear` (year numbers: print them with `int`, never `months`; using one
when there is no such year, because buying is not ahead at the horizon or never catches up, fails the build with a
message to write it in words), `.downPayment`, `.closingCosts`, `.initialCash`, `.loanAmount`,
`.monthlyMortgage`, `.monthlyOwnershipCost` (first month, before any tax saving),
`.firstMonthRentCost`, `.totalTaxSaving`, `.totalInterest`, `.totalRentPaid`, `.finalHomeValue`,
`.saleCosts`, `.loanBalance`, `.finalEquity`, `.buyerPortfolio`, `.finalBuyerNetWorth`,
`.finalRenterNetWorth`. For another horizon, call it again with another `horizon`. The US
deduction test uses the default tax year's standard deduction (the calculator does too).

### Car finance

| Function | Returns | Example | Value |
|---|---|---|---|
| `carFinance(price, deposit, months, convention=, pcpApr=, balloon=, hpApr=, loanApr=, invest=)` | object (fields below): PCP, HP, personal loan and cash. `convention` is `effective` (default; the GBP and EUR rule) or `nominal` (USD, APR / 12). Defaults: PCP 7.9% with a 40% balloon, HP 8.9%, loan 5.6%, return 4.5% | `{{ carFinance(25000, 2500, 48).pcpMonthly \| gbp(2) }}` | £366.54 |

Fields: `.financeAmount`, `.balloon`, then for each of `pcp`, `hp` and `loan`: `.pcpMonthly`,
`.pcpTotalPaid`, `.pcpTotalInterest`, `.pcpOpportunityCost`, `.pcpTrueCost` (and the same with `hp` and
`loan`), for cash `.cashTotalPaid`, `.cashOpportunityCost`, `.cashTrueCost`, and `.cheapest` (the
lowest true cost, printable as text). `months` is 12 to 84 in steps of 6, like the calculator's slider. A deposit above what the calculator allows, or a balloon above
its cap for the price and deposit, **fails the build** (the calculator clamps and shows a notice).

### Solar payback

| Function | Returns | Example | Value |
|---|---|---|---|
| `solarPayback(region, systemCost=, systemSize=, battery=, batteryCost=, batteryCapacity=, tariff=, exportTariff=, selfConsumption=, inflation=, degradation=, maintenance=, credit=, years=, kWhPerKwp=)` | object (fields below): the solar panel payback calculator. `region` is `uk`, `us` or `eur` and picks the calculator's regional defaults; each option overrides one input. Other defaults: 30% self-consumption, 3% inflation, 0.5% degradation, 25 years (the slider runs 10 to 40 in steps of 5, and so does `years=`), no grant, no battery | `{{ solarPayback('uk').paybackTotalMonths \| months }}` | 19 years 8 months |

Fields: `.paybackYears` and `.paybackMonths` (the "19 years 8 months" parts), `.paybackTotalMonths`,
`.netCost`, `.year1Savings`, `.totalSavings`, `.roi` (%),
`.generationYear1`, `.generationFinal`, `.savingsFinalYear` and `.selfConsumption` (effective
year-1 share in %, with the battery lifting it when `battery=true`). `.paybackYears` is a year count: print it
with `int`, never `months`. A system that does not pay back within the period **fails the build**, and so does
one whose grant covers the whole cost (the calculator says "Pays back immediately", with nothing to pay back).

`solarDefault(region, key)` prints one of those regional defaults, so a page can quote the tariff the
calculator starts from without typing it:
`{{ solarDefault('uk', 'tariff') | num(2) }}` is the UK import tariff in pence per kWh. Keys are the option
names `solarPayback` uses: `systemCost`, `systemSize` (kWp), `batteryCost`, `batteryCapacity` (kWh), `tariff` and
`exportTariff` (pence or cents per kWh), `maintenance` and `kWhPerKwp`. Print tariffs with `num(2)` or `num(auto)`.

| Function | Returns | Example | Value |
|---|---|---|---|
| `solarDefault(region, key)` | number: the calculator's regional default for that input (`region` is `uk`, `us` or `eur`) | `{{ solarDefault('uk', 'tariff') \| num(2) }}` | 26.32 |

### ROI, required rate, CPI and loan schedule

| Function | Returns | Example | Value |
|---|---|---|---|
| `emergencyMonths(target, current, monthly, aer)` | whole months until the emergency fund reaches the target (savings rate is an AER/APY in %). 0 if funded, Infinity only when nothing is saved and nothing earns interest; more than 50 years fails the build | `{{ emergencyMonths(21000, 2000, 500, 4) \| int }}` | 36 |
| `roi(initial, final, income, years)` | object: `.totalGain`, `.totalReturn` (%), `.annualized` (%) | `{{ roi(10000, 15000, 500, 3).annualized \| pct1 }}` | 15.7% |
| `annualizedReturn(totalReturn, years)` | % compound annual return for a total return in % | `{{ annualizedReturn(100, 10) \| pct1 }}` | 7.2% |
| `requiredRate(start, monthly, target, years, compounding=, timing=)` | % annual return needed (negative if the money paid in already exceeds the target). Fails if even 100% is not enough or no return is needed | `{{ requiredRate(10000, 200, 100000, 20) \| pct(2) }}` | 4.34% |
| `cpiValue(year)` | the US CPI-U index the inflation calculator uses for that year (the latest month for the current year); print with `index` | `{{ cpiValue(2025) \| index }}` | 321.943 |
| `loanCrossoverMonth(principal, rate, years)` | the first payment that repays more principal than interest | `{{ loanCrossoverMonth(280000, 7, 30) \| int }}` | 242 |

For "$X in year Y in year Z" use `cpiAdjust(X, Y, Z).adjusted`; `cpiValue` is for printing the index values
themselves (`{{ cpiValue(1990) | index }}`).

### Labels, market rates and helpers

| Function | Returns | Example | Value |
|---|---|---|---|
| `taxYear(country)` | text, `uk` or `us` (the US value is the calculator's default year) | `{{ taxYear('uk') }}` | 2026/27 |
| `rate(key)` | a dated market rate in % from `market-rates.ts`, the calculators' default rates: `us30`, `us15` (Freddie Mac PMMS), `boe` (Bank Rate), `uk2yr`, `uk5yr` (2- and 5-year fixed at 75% LTV), `ukRevert`, `eur` (euro-area house purchase) | `{{ rate('us30') \| pct(2) }}` | varies |
| `rateSource(key)` | text: who published the rate and the date it describes | `{{ rateSource('us30') }}` | varies |
| `min(a, b)` | the smaller number | `{{ min(3, 5) \| int }}` | 3 |
| `max(a, b)` | the larger number | `{{ max(0, 50000 - 60000) \| usd }}` | $0 |

#### Guarding a verdict: `claim(condition, message)`

A figure token cannot drift from the engines, but the words around it can: "the 15-year loan
costs less interest than the 30-year one" stays in the text after a rate moves so far that it is
no longer true. Where a sentence rests on a comparison of live figures, guard it with
`claim(condition, message)`. It prints **nothing** when the condition is true and **fails the
build** with your message when it is false (also in `npm test`, which resolves every token in
`src/data`), so the sentence is rewritten before it ships.

```markdown
The 15-year loan costs less in total interest than the 30-year one.{{ claim(loanTotalInterest(300000, rate('us15'), 15) < loanTotalInterest(300000, rate('us30'), 30), 'the 15-year mortgage costs less total interest than the 30-year one') }}
```

In frontmatter, keep the token's strings single-quoted inside the double-quoted YAML value:

```yaml
verdict: "Pay the card first.{{ claim(cardPayoff(5000, 22.99, 100).interest > 0, 'the card still accrues interest') }}"
```

- **Place it at the end of the sentence it guards**, straight after the full stop, so no stray
  space is left. It can also sit on a line of its own.
- **The message says what the sentence claims**, in words a later editor can act on. The build
  error shows it with the file, line and column: `a claim in the text no longer holds: <message>`.
- Conditions compare the engines' unrounded values with `<`, `>`, `<=`, `>=`, `==`, `!=` and
  join with `&&`, `||`, `!` (section 2). To claim that two amounts are about the same, compare
  their gap: `max(a - b, b - a) < 1`.
- It is for **qualitative statements derived from figures** (a ranking, a verdict, "wins", "ties",
  "breaks even before year 7"). It does not replace tokens: a number the engines can produce is
  still a token, never typed. If the sentence can be worded so it stays true whatever the numbers
  do, do that instead.

The `rate` and `rateSource` values move every time `market-rates.ts` is updated (the owner
re-checks it monthly), which is the point: always print both, so the page shows the figure
with its source and date, for example `{{ rate('us30') | pct(2) }} ({{ rateSource('us30') }})`.
A rate is a market snapshot, not a quote: say so in the words around it.

### What each function calls

| Functions | Engine (the calculator calls the same function) |
|---|---|
| `ukPay`, `ukTakeHome`, `ukIncomeTax`, `ukNi`, `ukStudentLoan`, `ukMarginalRate` | `calculateUkTakeHome` (`uk-tax-calc.ts`) with `parseUkTaxCode` (`uk-tax-codes.ts`) |
| `usPay`, `usTakeHome`, `usFederalTax`, `usFica`, `usBracket`, `usMarginalRate` | `computeUsSalary` (`us-tax-calc.ts`), per tax year (`us-rates.ts`) |
| `usFact`, `usBracketStart`, `usCgt` | `getUsRates(year)` and `calculateUSCgt` (`capital-gains.ts`) |
| `ukFact`, `sdlt`, `ukCgt` | `uk-rates.ts`, `calculateSdlt` (`stamp-duty.ts`), `calculateUKCgt` |
| `cardPayoff`, `loanPayoff`, `payoffBalance` | `simulateCardPayoff` (`credit-card.ts`), 600-month horizon |
| `feeDrag` | `compareFees` (`investment-fee.ts`) |
| `compoundFV`, `compoundEarned` | `futureValue` (`investment-solvers.ts`) |
| `yearsToTarget` | `solveMonthsToTarget` (`investment-solvers.ts`) |
| `savingsMonthly`, `savingsMonths` | `monthlyForGoal`, `timeToGoal` (`savings-goal.ts`) |
| `retirementFV` | `projectRetirement` (`retirement.ts`) |
| `inflationAdjust`, `cpiAdjust` | `projectInflation`, `adjustForInflation` (`inflation.ts`) |
| `rate`, `rateSource` | `MARKET_RATES`, `rateAttribution` (`market-rates.ts`) |
| `usAffordability`, `ukAffordability`, `eurAffordability` | `solveUsAffordability`, `solveUkAffordability`, `solveEurAffordability` (`mortgage-affordability.ts`) |
| `rentVsBuy` | `simulateRentVsBuy`, `laterBreakEvenYear` (`rent-vs-buy.ts`) |
| `carFinance` | `compareCarFinance` (`car-finance.ts`) |
| `emergencyMonths` | `monthsToTarget` (`emergency-fund.ts`) |
| `solarPayback`, `solarDefault` | `calculateSolarPayback`, `effectiveSelfConsumption`, `SOLAR_REGIONAL_DEFAULTS` (`solar-payback.ts`) |
| `roi`, `annualizedReturn` | `calcRoi`, `annualize` (`roi.ts`) |
| `requiredRate` | `solveRequiredRate` (`investment-solvers.ts`) |
| `debtPayoff`, `debtClearMonth` | `simulateDebtPayoff`, `prepareDebts` (`debt-payoff.ts`) |
| `cardBeyondHorizon` | `simulateCardPayoff` (the horizon totals), `dailyCompoundingApr` is arithmetic |
| `cpiValue` | `cpiFor` (`inflation.ts`) |
| `loanCrossoverMonth` | `buildAmortization` (`mortgage-payment.ts`) |
| `loanPayment`, `mortgagePayment`, `loanTotalInterest`, `mortgageTotalInterest`, `loanBalance`, `loanMonth`, `loanYear`, `overpaymentSaving` | their own closed-form and loop arithmetic, proven equal to `mortgage-payment.ts` (the mortgage and loan tools' engine) by `figures-grid.test.ts` (1e-6 on payments, 1e-3 or better on cumulative sums). `yearly=` (a 13th payment) is an extension the tools do not offer |

Options the tool's screen cannot express (so no tool shows the number): UK `postgrad=true`
on top of a plan, US `k401Amount` (the tool takes a %), loan `yearly=`, UK affordability `revertRate` (the calculator fixes it at the market-rates value), and card minimums other
than the screen's: the calculator does not let visitors edit the floor (25 for USD and EUR, 5 for
GBP, set by the currency) and offers `minPct` only from 1 to 10 (percentage) or 1 to 5 (interest
plus) in steps of 0.5, so `minFloor=25` matches only USD and EUR visitors and any other `minPct` or
`minFloor` is an extension. For the structural inputs the token matches the calculator's own choices and refuses
the rest (affordability terms, car months, rent vs buy years and horizon, solar years). Money, rate and
percentage inputs are only range-checked loosely, so a token can pass a value beyond a calculator slider's end:
check the calculator accepts it before telling readers to "try it in the calculator". They are
computed from the same engines, but if the page also tells readers to "try it in the
calculator", pick inputs the calculator can reproduce.

### INTERIM functions

None. Every function above calls the engine in the table. A function marked `interim:` in
`figures.ts` composes primitives instead of calling its calculator's engine and must not be
used by Wave 2 content; if one is ever added it must be listed here, and the catalogue test
fails until it is.

## 5. Formatters

| Formatter | What it does | Example | Value |
|---|---|---|---|
| `gbp`, `usd`, `eur`, `gbp(2)` | Money: symbol, thousands separators, whole units unless decimals are given | `{{ 1234.5 \| usd(2) }}` | $1,234.50 |
| `pct`, `pct(1)`, `pct(auto)` | A percentage number with %. Whole percent by default; `auto` gives up to 2 decimals with no trailing zeros | `{{ 6.5 \| pct(auto) }}` | 6.5% |
| `pct1` | Same as `pct(1)` | `{{ 22.94 \| pct1 }}` | 22.9% |
| `int` | Whole number with separators | `{{ 1234.6 \| int }}` | 1,235 |
| `num`, `num(2)`, `num(auto)` | Number with separators and fixed decimals | `{{ 20.3615 \| num(2) }}` | 20.36 |
| `index` | An index value with up to 3 decimals and no trailing zeros (CPI-U 130.7, 321.943) | `{{ 130.7 \| index }}` | 130.7 |
| `months` | "13 years 11 months" (rounded to whole months); Infinity prints "never". Only for a number of MONTHS: on a year-valued field or function (`.breakEvenYear`, `.paybackYears`, `yearsToTarget`, `cardHorizonYears`, ...) the token fails the build | `{{ 167 \| months }}` | 13 years 11 months |
| `round100` | Round to the nearest 100 (still a number; add a money formatter) | `{{ 37540 \| round100 \| usd }}` | $37,500 |
| `roundTo(step)` | Round to the nearest step | `{{ 37540 \| roundTo(1000) \| usd }}` | $38,000 |
| `ceil`, `floor` | Round up or down to a whole number | `{{ 45.2 \| ceil \| months }}` | 3 years 10 months |
| `abs` | Drop the sign; say "saves" or "costs" in the words instead | `{{ -1885 \| abs \| usd }}` | $1,885 |

## 6. Checking your work

Bad tokens fail loudly. Every one of these stops the build:
- an unknown function or formatter (with a "did you mean");
- an unknown option or a missing argument;
- a wrong type or an out-of-range value;
- NaN or division by zero;
- a number with no formatter;
- an object with no field;
- an unterminated `{{`.

The message names the file and line (body) or the entry and field (frontmatter), plus
the token, for example:

```text
src/data/scenarios/x.md:23:8 figure token {{ ukTakeHome(30000, plan=plan9) | gbp }}: ukTakeHome: "plan" must be one of none, plan1, plan2, plan4, plan5, postgrad (got "plan9")
```

**Fast checks (about a second; no build needed).** Run these from the repo root.

```bash
# every token in src/data resolves (also part of npm test)
npx vitest run src/lib/figures-scan.test.ts

# print every token on one or more pages with its value
FIG_FILE=src/data/scenarios/50k-car-loan-4-years.md npx vitest run src/lib/figures-scan.test.ts

# try tokens (separate several with ;;)
FIG="ukTakeHome(30000, plan=plan2) | gbp;;cardPayoff(5000, 22.99, 100).months | months" npx vitest run src/lib/figures-scan.test.ts
```

In PowerShell, set the variable first: `$env:FIG_FILE="src/data/scenarios/x.md"; npx vitest run src/lib/figures-scan.test.ts`.

**Then build.** Run `npm run build` (through the slot limiter on the shared machine)
and read the generated page in `dist/`.

## 7. How it works, and maintenance

- **Bodies.** `src/lib/remark-figures.mjs` is the one entry in `markdown.remarkPlugins`
  (astro.config.mjs). It wraps the Markdown parser and replaces tokens in the raw text
  before parsing. Astro's glob loader only logs a body that fails to render, so
  `withRenderCheck()` (`src/lib/figures-content.ts`, applied to every collection in
  `src/content.config.ts`) fails the build when an entry has no rendered body.
  - On the dev server (`npm run dev`) a bad body token is only logged, and the page
    shows an empty body. Builds fail correctly. Always check with section 6 or a build.
- **Frontmatter.** Every prose string field in `src/content.config.ts` uses
  `figureText()`, which resolves tokens; a bad token becomes a schema error, which fails
  the build. Identifier fields and `inputs` keys use `figureIdent()`, which refuses tokens.
  - Templates must read `entry.data`, which holds the resolved values. The frontmatter
    copy that Astro passes to the Markdown renderer (`remarkPluginFrontmatter`,
    `rendered.metadata.frontmatter`) still holds the raw, unresolved tokens.
- **Build-level check.** `node scripts/check-figures-build.mjs` runs `astro sync` on a
  small fixture three times. It passes when a bad body token fails, a bad frontmatter
  token fails, and good tokens pass. It proves the wiring still works after an Astro
  upgrade, because `withRenderCheck` relies on how Astro's glob loader stores entries.
  It is opt-in (about 350 MB, under a minute). Run it after any Astro upgrade or change
  to this wiring.
- **Caching.** Astro caches rendered content in `.astro-cache/`, keyed by file content.
  The remark plugin entry carries a `cacheKey`: a hash of every non-test file under
  `src/lib`, subfolders included. Any engine or rates change alters the Astro config
  digest and clears the content cache, so cached pages can't keep stale figures.
  - This does NOT cover other Markdown plugin changes: a change to
    `rehype-mono-figures.mjs` is covered (it lives in `src/lib`), but a new plugin added
    elsewhere is not. After any other plugin change, delete `.astro-cache/` before
    building.
  - The dev server does not reload the config when `src/lib` changes. Restart it to see
    new figures.
- **Speed.** Results are memoised per token, so a value repeated across 142 pages is
  computed once.
- **Adding a function.** Add a `FigureFunction` to the catalogue in `figures.ts`:
  - parameter specs (type, range, allowed values) so bad arguments fail;
  - an `example`;
  - a cross-check against the engine in `figures.test.ts`;
  - a row in this file. The tests fail if a function or formatter is missing here.
- **Re-pointing a function** (the W2-FIG recipe, for the next engine change):
  1. Call the engine function the calculator calls, not a copy of its maths.
  2. Add the function to the grid in `src/lib/figures-grid.test.ts`, with an independent
     engine call built from the case, and exact (`===`) comparison where it is the same
     engine function. The grid must fail if the re-point is reverted.
  3. Keep `figures.test.ts` green: it pins today's values, so any difference is a real
     engine change to review.
- **Methodology literals.** `src/lib/figures-literals.test.ts` lists the figures the methodology pages used to
  type by hand, each as the token that produces it, with the value the page printed. A mismatch there
  means the typed number was not what the engine gives for the page's inputs. Two cases pin a
  deliberate difference between the page's inputs and the calculator's defaults (UK revert-to rate
  6.5% typed vs 6.58% in the calculator; EUR with 0 debts vs the calculator's 500).
- **Multi-year tax data.** The US functions take `year=` through to `us-rates.ts`
  (`getUsRates(year)`, `computeUsSalary({ year })`). The UK engines take no year
  argument, so UK `year=` accepts only the dataset the engines use; when a 2027/28 dataset
  lands, add a year argument to the UK engines first, then wire it in `figures.ts`
  ("Tax years" comment).
