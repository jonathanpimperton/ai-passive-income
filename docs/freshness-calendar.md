# Freshness calendar

The site states dated facts: tax rates, wage bases, central-bank rates, market
mortgage rates, CPI and policy dates. Nothing rebuilds the site on its own, so
this file is the maintenance source of truth for when each fact must be
checked again.

Two scripts read the facts from source files and from this file. Both run
weekly in CI (`.github/workflows/freshness.yml`, Mondays 07:00 UTC), and GitHub
emails the owner when either fails:

- `node scripts/check-rates-freshness.mjs` is the tax-year guard. It also runs
  before every build. It warns from 60 days before a rollover whose new year
  has no data, and fails the build only when today's default tax year has no
  dataset or that dataset is 400+ days unchecked. Year data lives in
  `src/lib/us-rates.ts` and `src/lib/uk-rates.ts`; the manifest of years is
  `src/lib/tax-years.mjs`.
- `node scripts/check-facts-calendar.mjs` reads the table below. It fails
  (exit 1, and the email) only when a fact needs action now: it is overdue, it
  is due today, or today is inside its `lead` time. A fact that is only coming
  up within 30 days is listed under `COMING UP` and shown as a warning on the
  CI run; it does not fail the run. The script also fails when the calendar
  cannot be read. Use `--today=YYYY-MM-DD` to rehearse a date and `--within=N`
  to change the upcoming window.

`due` is the date the fact changes or is published: an announcement, a rate
decision, a rule starting. Act on or after that date, not before, because the
source does not have the new figure until then.

`lead` is optional: a whole number of days before `due`. Use it only when the
work has to be finished before the date (a deadline, not an event). For
example, builds fail from 6 Apr 2027 unless the 2027/28 UK data is in, so that
row has a 30-day lead and fails every week from 7 Mar 2027 until the data
lands. An empty `lead` means 0.

The workflow runs on Mondays. An event due mid-week is therefore flagged the
following Monday, up to 6 days after its `due` date. If a row must be acted on
sooner than that, give it a `lead` of at least 7 days.

Exit codes for both scripts: 0 = pass (the rates guard may still print
warnings and the calendar may still list upcoming facts), 1 = failed (stale,
missing, or a fact needs action), 2 = bad arguments (`--today`, `--within`) or
a malformed `CALCRUN_TODAY`.

`CALCRUN_TODAY=YYYY-MM-DD` pins the date for a LOCAL rehearsal of both scripts
and of `npm run build` (for example `CALCRUN_TODAY=2027-01-02 npm run build`).
Any pinned date is announced with a `DATE PINNED BY ...` line. When `CI` or
`WORKERS_CI` is set (GitHub Actions, Cloudflare Workers Builds) the variable is
ignored with a warning, so a forgotten setting can never bypass the guard or
freeze the server-rendered tax year. Never set it in Cloudflare.

## How to use it

1. When the weekly workflow fails, run `node scripts/check-facts-calendar.mjs`
   locally. `ACTION NEEDED NOW` lists what to do. `COMING UP` is a heads-up
   and needs nothing yet.
2. Do the action in the row: check the primary source, update the code or
   content it names, and record the access date beside the figure.
3. Move the row's `due` to the next occurrence (see `recurs`) and set
   `last_done` to today. Never move a due date without doing the check.
4. Rows with a `derive` value compute their due date from a date in a source
   file (`path#KEY+Nd`): for example, 90 days after `MARKET_RATES_CHECKED`.
   Updating that source date moves the due date automatically. If the file
   does not exist yet, the static `due` applies. If the file exists but the
   key is missing, the script fails, because the calendar has lost track.
   These rows carry their own margin and do not need a `lead`.

## Facts

Machine-read by `scripts/check-facts-calendar.mjs` and tested by
`src/lib/facts-calendar.test.ts`. Keep one fact per row and keep the columns.
Dates are `YYYY-MM-DD`. `derive` and `lead` are optional: leave the cell
empty. `lead` is a whole number of days, such as `30`.

<!-- BEGIN FACTS -->
| id | due | derive | lead | last_done | recurs | fact | action | where | source |
|---|---|---|---|---|---|---|---|---|---|
| ofgem-price-cap | 2026-11-25 | | | | quarterly (late Feb, May, Aug, Nov) | Ofgem energy price cap for 1 Jan-31 Mar 2027, announced 25 Nov 2026 per Ofgem's schedule | Update the UK electricity unit rate default in the solar calculator and any content quoting the cap; move due to the next announcement | src/components/tools/SolarPaybackCalc.tsx, src/lib/solar-payback.ts, src/data/** | https://www.ofgem.gov.uk/energy-price-caps/industry |
| scottish-budget-2027-28 | 2026-12-03 | | | | yearly | Scottish Budget 2027-28 (income tax bands for 2027/28), presented 3 Dec 2026 | Note the 2027/28 Scottish bands for the UK 2027/28 data drop; check Scottish content pages | src/lib/uk-rates.ts (2027/28 block, later) | https://www.parliament.scot/-/media/files/committees/session-7/finance-committee/correspondence/2026/20260901-draft-scottish-budget-timetable-sg-to-fpac.pdf |
| boe-mpc-2026-12 | 2026-12-17 | | | | per MPC | Bank of England Bank Rate decision (next MPC: 17 Dec 2026; 2027: 4 Feb, 18 Mar, 29 Apr, 17 Jun, 29 Jul, 16 Sep, 4 Nov, 16 Dec) | Check every Bank Rate statement in content and the UK default in market-rates; move due to the next MPC date | src/lib/market-rates.ts, src/data/** | https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates |
| us-default-year-2027 | 2027-01-01 | | | | yearly | US default tax year switches to 2027 on 1 Jan 2027; static pages keep the year they were built with | Trigger a deploy on or after 1 Jan 2027 (push, or Cloudflare dashboard: Retry deployment) so hub pages, badges and titles render TY2027 by default | src/lib/us-rates.ts (US_DEFAULT_TAX_YEAR) | docs/plan-2026-11.md (D8) |
| bls-cpi-2026-annual | 2027-01-13 | | | | each January | BLS December 2026 CPI release (gives the 2026 annual average CPI-U), 13 Jan 2027 | Add the 2026 annual average to the inflation calculator's CPI table and re-check CPI figures in content | src/components/tools/InflationCalc.tsx | https://www.bls.gov/schedule/news_release/cpi.htm |
| security-txt-expiry | 2027-02-08 | public/.well-known/security.txt#Expires-30d | | | yearly | security.txt Expires field (RFC 9116: must stay in the future) | Bump Expires by up to a year and redeploy | public/.well-known/security.txt | https://www.rfc-editor.org/rfc/rfc9116 |
| freddie-mac-pmms | 2027-02-10 | src/lib/market-rates.ts#MARKET_RATES_CHECKED+90d | | | weekly source, 90-day limit | Freddie Mac PMMS 30-year and 15-year averages used as mortgage defaults (stale after 90 days) | Re-read PMMS, update market-rates values, asOf and MARKET_RATES_CHECKED | src/lib/market-rates.ts | https://www.freddiemac.com/pmms |
| bls-cpi-monthly | 2027-02-11 | | | | monthly source, reviewed quarterly | BLS CPI-U monthly release (review at the January 2027 CPI release, 11 Feb 2027) | Check content that quotes the latest US inflation rate; move due to the release about 3 months later | src/data/**, src/components/tools/InflationCalc.tsx | https://www.bls.gov/schedule/news_release/cpi.htm |
| eia-electricity-monthly | 2027-02-26 | | | | monthly source, reviewed quarterly | EIA Electric Power Monthly: average US residential electricity price (solar calculator US default) | Re-read the latest 12-month average residential price, update the default and its as-of date; move due about 3 months on | src/components/tools/SolarPaybackCalc.tsx, src/lib/solar-payback.ts | https://www.eia.gov/electricity/monthly/ |
| uk-spring-forecast-2027 | 2027-03-01 | | | | yearly | UK Spring Statement / Spring Forecast 2027 (date not announced on 2026-11-12) | Check for in-year UK tax changes; set this row to the announced date once HM Treasury publishes it | src/lib/uk-rates.ts, src/data/** | https://www.gov.uk/government/organisations/hm-treasury |
| uk-vat-energy-saving-zero-rate | 2027-03-31 | | 14 | | once | UK 0% VAT on installing energy-saving materials (solar panels, batteries) applies 1 May 2023 to 31 Mar 2027 | Check whether it was extended; update solar cost assumptions and solar content either way | src/components/tools/SolarPaybackCalc.tsx, src/data/** | https://www.gov.uk/guidance/vat-on-energy-saving-materials-and-heating-equipment-notice-7086 |
| uk-rates-2027-28 | 2027-04-06 | | 30 | | yearly | UK tax year 2027/28 starts 6 Apr 2027: income tax, NI, Scottish bands, student loan thresholds, State Pension. Builds FAIL from this date until the data lands | Add UK_RATES_BY_YEAR['2027/28'] from complete primary sources, list it in UK_DATASETS, update 2026/27 wording in content | src/lib/uk-rates.ts, src/lib/tax-years.mjs | https://www.gov.uk/income-tax-rates |
| uk-savings-income-rates-2027 | 2027-04-06 | | 14 | | once | UK savings and property income tax rates change from 6 Apr 2027 (Budget announcement) | Check comparisons and methodology pages that state savings income tax rates | src/data/comparisons/**, src/data/methodologies/** | https://www.gov.uk/government/publications/budget-2025-document/budget-2025-html |
| uk-state-pension-2027-28 | 2027-04-06 | | 30 | | yearly | Full new State Pension weekly rate for 2027/28 (triple-lock uprating each April) | Update statePension in the 2027/28 block and the figure quoted in content | src/lib/uk-rates.ts, src/data/** | https://www.gov.uk/new-state-pension/what-youll-get |
| eurostat-electricity-half-yearly | 2027-04-30 | | | | half-yearly (spring and autumn) | Eurostat household electricity prices, EU average (solar calculator EUR default) | Re-read the latest half-year EU household price, update the default and its as-of date; move due six months on | src/components/tools/SolarPaybackCalc.tsx, src/lib/solar-payback.ts | https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics |
| desnz-solar-pv-costs | 2027-05-31 | | | | yearly (late May) | DESNZ small-scale solar PV cost data (2026 release: 28 May 2026) | Update the UK installed-cost default per kW and solar content | src/components/tools/SolarPaybackCalc.tsx, src/lib/solar-payback.ts | https://www.gov.uk/government/statistics/solar-pv-cost-data |
| uk-autumn-budget-2027 | 2027-09-01 | | | | yearly | UK Autumn Budget 2027 (date not announced on 2026-11-13; the 2026 Budget was 28 Oct 2026) | Set due to the Budget date once HM Treasury announces it; after the Budget, check UK rates, thresholds and policy statements in code and content | src/lib/uk-rates.ts, src/data/** | https://www.gov.uk/government/organisations/hm-treasury |
| ssa-wage-base-2028 | 2027-10-31 | | | | yearly | SSA 2028 Social Security wage base (COLA announcement, usually mid-October) | Record the 2028 wage base for US_RATES_BY_YEAR[2028] | src/lib/us-rates.ts | https://www.ssa.gov/cola/ |
| irs-ty2028-adjustments | 2027-11-15 | | | | yearly | IRS tax year 2028 inflation adjustments (Rev. Proc., usually October/November). The rates guard warns from 2 Nov 2027 and fails builds from 1 Jan 2028 without TY2028 data | Add US_RATES_BY_YEAR[2028] from the Rev. Proc. and SSA, list it in US_DATASETS, add docs/tax-values-2028.json | src/lib/us-rates.ts, src/lib/tax-years.mjs | https://www.irs.gov/newsroom |
| us-irs-401k-2028 | 2027-11-15 | | | 2026-11-16 | yearly (IRS notice, usually mid-November) | IRS 2028 401(k)/IRA limits notice (the 2027 limits came in Notice 2026-66, 12 Nov 2026) | Set US_RATES_BY_YEAR[2028].retirement401k and US_RATES_BY_YEAR[2028].retirementIra (limit and catch-up) from the notice with published: true (until it is out, carry the 2027 values with published: false); bump US_DATASETS[2028].lastChecked only if every 2028 figure was re-verified that day | src/lib/us-rates.ts, src/lib/tax-years.mjs | https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions |
| uk-nmpa-57-2028 | 2028-04-06 | | 14 | | once | UK normal minimum pension age rises from 55 to 57 on 6 Apr 2028 | Switch retirement tools and content to 57 | src/lib/uk-pension-ages.ts, src/data/** | https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age |
| obbba-deductions-end-2028 | 2028-12-31 | | 30 | | once | OBBBA overtime, tips, car-loan interest and senior deductions apply to tax years 2025-2028 only | Set obbba: null for tax years from 2029 and update the salary tool's disclosures | src/lib/us-rates.ts | https://www.law.cornell.edu/uscode/text/26/225 |
| uk-salary-sacrifice-ni-cap-2029 | 2029-04-06 | | 30 | | once | Salary-sacrificed pension contributions above £2,000 a year become liable to NI from 6 Apr 2029 | Model or disclose the cap in the UK salary tool and pension content | src/lib/uk-tax-calc.ts, src/data/** | https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029 |
| uk-lisa-new-savers-2029 | 2029-04-06 | | 14 | | once | Lifetime ISA closes to new savers from 6 Apr 2029; First Time Buyer ISA replaces it (legislation pending) | Update LISA comparisons and scenarios | src/data/comparisons/**, src/data/scenarios/** | https://www.gov.uk/government/publications/tax-free-savings-newsletter-24/tax-free-savings-newsletter-24-october-2026 |
<!-- END FACTS -->

## Notes

- `us-irs-401k-2027` was done on 2026-11-16 (IRS Notice 2026-66, published
  12 Nov 2026) and replaced by the yearly `us-irs-401k-2028` row. Until a
  year's notice is out, the salary tool says that year's 401(k) limit is
  "not yet published" and carries the prior year's.
- The 2027 IRA limit ($7,500) and age-50 catch-up ($1,100) were confirmed from
  IRS news release IR-2026-136 on 2026-11-24, so `us-irs-ira-2027` was removed.
- The Freddie Mac row derives from `MARKET_RATES_CHECKED` in
  `src/lib/market-rates.ts` (added by the property workstream). Until that file
  exists, the static due date applies.
- Monthly sources (BLS CPI, EIA) are reviewed quarterly: a monthly due date
  would fail the weekly workflow once a month.
- Keep rows in due-date order when you edit them; the checker does not rely on the order.
- Sources were accessed on 2026-11-12. ssa.gov blocks automated fetches
  (HTTP 403); check it in a browser.
