/**
 * Rates freshness guard -- runs before every `npm run build` (prebuild hook)
 * and weekly in CI. Dependency-free plain Node, so it runs in any build
 * environment, including CI without devDependencies.
 *
 * Rules (decision D8; logic in src/lib/tax-years.mjs, tested by
 * src/lib/rates-freshness.test.ts):
 * - FAIL (exit 1) only when the default tax year for today has no dataset
 *   (US: the calendar year; UK: the tax year starting 6 April), or the default
 *   dataset was last checked 400+ days ago.
 * - WARN (loud, exit 0) from 60 days before a rollover whose new year has no
 *   dataset yet, and from 340 days unchecked.
 *
 * Usage:
 *   node scripts/check-rates-freshness.mjs
 *   node scripts/check-rates-freshness.mjs --today=2027-01-02   # rehearse a date
 *   CALCRUN_TODAY=2027-01-02 node scripts/check-rates-freshness.mjs
 */
import { evaluateRatesFreshness, parseIsoDate, taxClockNow } from '../src/lib/tax-years.mjs';

function resolveToday(argv) {
  const arg = argv.find((a) => a.startsWith('--today='));
  if (!arg) return taxClockNow();
  const value = arg.slice('--today='.length);
  const date = parseIsoDate(value);
  if (!date) {
    console.error(`--today must be a real date in YYYY-MM-DD form, got "${value}"`);
    process.exit(2);
  }
  return date;
}

const today = resolveToday(process.argv.slice(2));
const report = evaluateRatesFreshness(today);
const inActions = process.env.GITHUB_ACTIONS === 'true';

if (report.warnings.length) {
  console.warn('');
  console.warn('==================== RATES FRESHNESS WARNING ====================');
  for (const w of report.warnings) {
    console.warn('  ! ' + w);
    if (inActions) console.log(`::warning title=Rates freshness::${w}`);
  }
  console.warn('  The build still passes today. See docs/freshness-calendar.md.');
  console.warn('=================================================================');
  console.warn('');
}

if (report.errors.length) {
  console.error('RATES FRESHNESS GUARD FAILED -- the site would ship stale or missing tax data:');
  for (const e of report.errors) {
    console.error('  - ' + e);
    if (inActions) console.log(`::error title=Rates freshness::${e}`);
  }
  console.error('Rates live in src/lib/us-rates.ts and src/lib/uk-rates.ts; the year manifest is src/lib/tax-years.mjs.');
  process.exit(1);
}

console.log(
  `Rates freshness OK on ${report.today}: default years US ${report.usDefault}, UK ${report.ukDefault}` +
    (report.warnings.length ? ` (${report.warnings.length} warning(s) above)` : ''),
);
