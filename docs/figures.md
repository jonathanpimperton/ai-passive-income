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
- **Fields.** Functions that return an object need a field:
  `{{ cardPayoff(5000, 22.99, 100).months | months }}`.
- **Formatters** run left to right after `|`. A number can only be printed through a
  formatter, so the currency and the rounding are always explicit. A token that ends in a
  bare number is an error.
- **Whitespace**, including line breaks, is allowed anywhere inside the braces.
- **Escape.** `\{{` prints a literal `{{`.

### Where tokens work

| Place | Works? | Notes |
|---|---|---|
| Markdown body (paragraphs, headings, lists, **bold**, tables, code) | Yes | Resolved before Markdown is parsed, so a `\|` inside a token does not split a table cell. Bold and table figures still get the mono face (rehype-mono-figures). |
| Prose frontmatter fields: `title`, `description`, `resultSummary`, `inputs` values, `faq`, `workedExamples`, `comparisonTable` cells, `verdict`, `formula`, `assumptions`, `limitations`, `keywords`, `name`, `affiliateContext`, `calculationMethod`, source names | Yes | Resolved by the zod transform in `src/content.config.ts`. |
| Identifier fields: `slug`, `toolSlug`, `toolCategory`, `datePublished`, `dateModified`, `lastUpdated`, `relatedTools`, `affiliatePrograms`, source `url`s | No | A token here fails the build on purpose. |
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
- **Tax year.** Tax functions use the dataset the rates modules currently point at.
  Print it with `{{ taxYear('uk') }}` / `{{ taxYear('us') }}` next to the figures. A
  `year=` option is accepted only for the year that is wired. Any other year fails the
  build rather than quietly using the wrong year.
- **Rounding of parts.** Each token is rounded on its own, so a list of rounded parts
  may not add up to a rounded total by £1. Say "(rounding applies)", or token the
  total as a difference of the same values.
- **"Never".** Payoff and target functions return `Infinity` when the goal is never
  reached (a payment that does not cover the interest, a target out of reach in 100
  years). `| months` prints "never". Money formatters refuse Infinity, so a "never"
  scenario can't print a fake total.

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
| `postgrad` | false | Also repaying a Postgraduate Loan, on top of `plan`. |
| `code` | `'1257L'` | Tax code. Supported: `nnnnL`, `0T`, `BR`, `D0`, `D1`, `NT`, `SD2`, `SD3`, each with an optional `S` (Scottish bands) or `C` (Welsh, rUK bands) prefix. K, T, M, N and emergency codes fail. |
| `scottish` | false | Scottish income tax bands. An `S` code implies it. |
| `year` | current | For example `'2026/27'`. |

How the pension methods work:
- **sacrifice.** Income tax, NI and student loan are all worked out on pay after the
  sacrifice (HMRC: the student loan uses NIC pay).
- **net.** Tax is on pay after the pension. NI and the student loan are on full pay.
- **ras.** Paid from net pay at 80%, and the provider adds 20%. The basic and higher
  rate limits extend by the gross contribution. Not modelled for Scottish taxpayers
  (that combination fails).
- With any method, the personal-allowance taper keys on adjusted net income, so a
  sacrifice that brings income under £100,000 restores the allowance.

| Function | Returns | Example | Value |
|---|---|---|---|
| `ukTakeHome(salary, ...options)` | £ a year | `{{ ukTakeHome(30000, plan=plan2) \| gbp }}` | £25,064 |
| `ukIncomeTax(salary, ...options)` | £ a year | `{{ ukIncomeTax(50000) \| gbp }}` | £7,486 |
| `ukNi(salary, ...options)` | £ a year | `{{ ukNi(50000) \| gbp }}` | £2,994 |
| `ukStudentLoan(salary, ...options)` | £ a year (needs `plan`) | `{{ ukStudentLoan(35000, plan=plan2) \| gbp }}` | £505 |
| `ukMarginalRate(salary, ...options)` | % lost on the next £2 to tax + NI + student loan | `{{ ukMarginalRate(110000) \| pct }}` | 62% |
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
| `ukCgt(gain, income, year=)` | £ CGT. The band is worked out from income (gross salary etc.) | `{{ ukCgt(50000, 40000) \| gbp }}` | £10,664 |

### US pay

`usPay`, `usTakeHome`, `usFederalTax`, `usFica`, `usBracket` and `usMarginalRate` share
these options (they mirror the US salary calculator's annual mode):

| Option | Default | Meaning |
|---|---|---|
| `status` | `single` | `single`, `married` (filing jointly; also `mfj`) or `head` (of household; also `hoh`). |
| `state` | 0 | Flat state and local income tax rate in %, like the calculator's input. Say which state you mean in the prose. |
| `k401` | 0 | 401(k) contribution as % of salary. Capped at the IRS limit, like the calculator. Reduces federal and state taxable pay, but not FICA. |
| `k401Amount` | 0 | 401(k) contribution in $ a year. Use instead of `k401`. |
| `year` | current | For example `2026`. |

| Function | Returns | Example | Value |
|---|---|---|---|
| `usTakeHome(salary, ...options)` | $ a year | `{{ usTakeHome(75000) \| usd }}` | $61,593 |
| `usFederalTax(salary, ...options)` | $ a year, after the standard deduction | `{{ usFederalTax(100000, status=married) \| usd }}` | $7,640 |
| `usFica(salary, ...options)` | $ a year: Social Security + Medicare | `{{ usFica(75000) \| usd }}` | $5,738 |
| `usBracket(salary, ...options)` | % federal bracket of the next dollar (0 below the standard deduction) | `{{ usBracket(60000) \| pct }}` | 12% |
| `usMarginalRate(salary, ...options)` | % of the next $1 lost to federal + FICA + state | `{{ usMarginalRate(75000, state=5) \| pct1 }}` | 34.7% |
| `usPay(salary, ...options)` | object | `{{ usPay(75000, state=5).federal \| usd }}` | $7,670 |

`usPay` fields:
- `.takeHome`, `.monthly`, `.biweekly`, `.weekly`;
- `.federal`, `.fica`, `.socialSecurity`, `.medicare`, `.state`;
- `.k401` (after the cap);
- `.taxRate` ((federal + FICA + state) / salary, %);
- `.effectiveRate` (all deductions including the 401(k), %; the calculator's "effective rate").

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
| `statePensionWeekly`, `statePensionAnnual`, `statePensionAge`, `statePensionAgeFrom2028`, `pensionAccessAge`, `pensionAccessAgeFrom2028` | Pensions |
| `cgtAnnualExempt`, `cgtBasicRate`, `cgtHigherRate` | Capital Gains Tax |
| `sdltNilBand`, `sdltFtbNilBand`, `sdltFtbCap`, `sdltSurcharge` | Stamp duty |
| `mortgageIncomeMultiple` | Typical lender loan-to-income cap (x income) |

| `usFact` key (`status=` where it varies) | Meaning |
|---|---|
| `standardDeduction`, `additionalMedicareThreshold`, `niitThreshold`, `ltcgZeroTop`, `ltcg15Top` | By filing status ($) |
| `ssWageBase`, `ssRate`, `medicareRate`, `additionalMedicareRate`, `niitRate` | FICA and NIIT |
| `k401Limit`, `k401CatchUp` | 401(k) limits ($) |

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
| `cardPayoff(balance, apr, minPct=, minFloor=, extra=)` | object, with a declining minimum: max(minPct% of the balance, minFloor), plus `extra` | `{{ cardPayoff(50000, 22, minPct=3, minFloor=25).months \| months }}` | 33 years 5 months |
| `loanPayoff(balance, apr, payment, extra=)` | object; same engine with a fixed payment (student loans, personal loans) | `{{ loanPayoff(50000, 6.5, 600).interest \| usd }}` | $16,682 |
| `payoffBalance(balance, apr, payment, months)` | balance left after that many fixed payments (0 once cleared) | `{{ payoffBalance(50000, 22, 1200, 12) \| usd }}` | $46,235 |

Payoff fields:
- `.months`, `.interest`, `.totalPaid`: all Infinity when the debt is never cleared;
- `.never` (true or false);
- `.firstInterest` (the first month's interest) and `.firstPayment`.

A payment that does not exceed the month's interest means never. So does anything not
cleared within 1,200 months.

### Saving and investing

| Function | Returns | Example | Value |
|---|---|---|---|
| `compoundFV(start, monthly, rate, years, compounding=, timing=)` | future value. `compounding`: 12 (default), 1, 2, 4, 52, 365 or `annually`/`quarterly`/`monthly`/`weekly`/`daily`; `timing`: `end` (default) or `beginning` | `{{ compoundFV(10000, 0, 7, 30) \| usd }}` | $81,165 |
| `compoundEarned(start, monthly, rate, years, compounding=, timing=)` | growth only (future value minus everything paid in) | `{{ compoundEarned(10000, 200, 7, 30) \| usd }}` | $243,159 |
| `retirementFV(savings, monthly, rate, years, inflation=)` | object: `.nominal` `.real` (today's money) `.contributions` `.growth` | `{{ retirementFV(50000, 500, 7, 35, inflation=3).real \| usd }}` | $524,487 |
| `savingsMonthly(goal, current, rate, months)` | monthly saving needed (0 if already there) | `{{ savingsMonthly(100000, 0, 4, 60) \| usd }}` | $1,508 |
| `savingsMonths(goal, current, monthly, rate)` | months to the goal, rounded up (Infinity if never) | `{{ savingsMonths(50000, 0, 1000, 5) \| months }}` | 3 years 10 months |
| `yearsToTarget(start, monthly, rate, target, compounding=)` | years, fractional (Infinity if not within 100) | `{{ yearsToTarget(10000, 500, 7, 1000000) \| num(1) }}` | 34.8 |
| `feeDrag(start, monthly, rate, years, fee, compareFee=)` | object: `.cost` `.balance` `.compareBalance` `.contributions` `.shareOfGrowth` (%) | `{{ feeDrag(100000, 0, 7, 30, 1).cost \| usd }}` | $209,392 |
| `inflationAdjust(amount, rate, years, mode=)` | `mode=cost` (default): what it will cost; `mode=value`: what today's money will buy | `{{ inflationAdjust(100000, 3, 20, mode=value) \| usd }}` | $55,368 |

### Labels and helpers

| Function | Returns | Example | Value |
|---|---|---|---|
| `taxYear(country)` | text, `uk` or `us` | `{{ taxYear('uk') }}` | 2026/27 |
| `rate(key)` | **not available yet**: fails until `src/lib/market-rates.ts` (W1-PROP) is merged and wired. Until then write a market rate as a literal with its source and date. | `{{ rate('us30') \| pct(2) }}` | fails |
| `min(a, b)` | the smaller number | `{{ min(3, 5) \| int }}` | 3 |
| `max(a, b)` | the larger number | `{{ max(0, 50000 - 60000) \| usd }}` | $0 |

## 5. Formatters

| Formatter | What it does | Example | Value |
|---|---|---|---|
| `gbp`, `usd`, `eur`, `gbp(2)` | Money: symbol, thousands separators, whole units unless decimals are given | `{{ 1234.5 \| usd(2) }}` | $1,234.50 |
| `pct`, `pct(1)`, `pct(auto)` | A percentage number with %. Whole percent by default; `auto` gives up to 2 decimals with no trailing zeros | `{{ 6.5 \| pct(auto) }}` | 6.5% |
| `pct1` | Same as `pct(1)` | `{{ 22.94 \| pct1 }}` | 22.9% |
| `int` | Whole number with separators | `{{ 1234.6 \| int }}` | 1,235 |
| `num`, `num(2)`, `num(auto)` | Number with separators and fixed decimals | `{{ 20.3615 \| num(2) }}` | 20.36 |
| `months` | "13 years 11 months" (rounded to whole months); Infinity prints "never" | `{{ 167 \| months }}` | 13 years 11 months |
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
- **Frontmatter.** Every prose string field in `src/content.config.ts` is
  `z.string().transform(resolveFigureField)`. A bad token becomes a schema error, which
  fails the build.
- **Caching.** Astro caches rendered content in `.astro-cache/`, keyed by file content.
  The remark plugin entry carries a `cacheKey`: a hash of every non-test file in
  `src/lib`. Any engine or rates change alters the Astro config digest and clears the
  content cache, so cached pages can't keep stale figures.
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
- **Interim functions.** Some calculators still keep their logic in `.tsx` components
  while the Wave 1 workstreams move it into `src/lib`. These figure functions compose
  the lib primitives for now, and each is marked `INTERIM` in `figures.ts` with the
  module that should replace it:
  - `ukPay` and the UK pay family, and the tax-code parser: W1-UK, `uk-tax-codes.ts`;
  - `usPay`: W1-TAX;
  - `cardPayoff`: W1-DEBT, `credit-card.ts`;
  - `feeDrag`: W1-DEBT, DB-7;
  - `rate()`: W1-PROP, `market-rates.ts`.

  Re-point each one when its module merges. The tests pin the values.
- **Multi-year tax data.** When the rates modules become year-keyed (W1-TAX, TX-1),
  wire `year=` through to the engines in `figures.ts` (see "MULTI-YEAR HOOK"). Until
  then a `year=` other than the current dataset fails, by design.
