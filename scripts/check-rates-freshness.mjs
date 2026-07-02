/**
 * Build-time rates freshness guard — dependency-free (plain Node) so it runs
 * in ANY build environment, including CI without devDependencies.
 *
 * Fails the build when:
 *  - UK_TAX_YEAR doesn't match the current UK tax year (rolls over 6 April)
 *  - US_TAX_YEAR doesn't match the current calendar year
 *  - either rates file hasn't been checked in >400 days
 *
 * The vitest twin (src/lib/rates-freshness.test.ts) covers `npm test`; this
 * script covers `npm run build` via the prebuild hook.
 */
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const grab = (src, name) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*'([^']+)'`));
  if (!m) throw new Error(`Could not find ${name}`);
  return m[1];
};

const uk = read('src/lib/uk-rates.ts');
const us = read('src/lib/us-rates.ts');

const now = new Date();
const y = now.getFullYear();
const afterApril6 = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6);
const ukStart = afterApril6 ? y : y - 1;
const expectedUk = `${ukStart}/${String((ukStart + 1) % 100).padStart(2, '0')}`;
const expectedUs = String(y);

const errors = [];
const ukYear = grab(uk, 'UK_TAX_YEAR');
const usYear = grab(us, 'US_TAX_YEAR');
if (ukYear !== expectedUk) errors.push(`UK_TAX_YEAR is '${ukYear}' but the current UK tax year is '${expectedUk}'`);
if (usYear !== expectedUs) errors.push(`US_TAX_YEAR is '${usYear}' but the current year is '${expectedUs}'`);

const MAX_DAYS = 400;
for (const [label, src, name] of [['UK', uk, 'UK_RATES_LAST_CHECKED'], ['US', us, 'US_RATES_LAST_CHECKED']]) {
  const days = (Date.now() - new Date(grab(src, name) + 'T00:00:00').getTime()) / 86_400_000;
  if (!(days < MAX_DAYS)) errors.push(`${label} rates last checked ${Math.round(days)} days ago (max ${MAX_DAYS})`);
}

if (errors.length) {
  console.error('RATES FRESHNESS GUARD FAILED — the site would ship stale tax data:');
  for (const e of errors) console.error('  - ' + e);
  console.error('Update src/lib/uk-rates.ts / us-rates.ts from primary sources (see docs/plan-2026-07.md Phase 1A).');
  process.exit(1);
}
console.log(`Rates freshness OK: UK ${ukYear}, US ${usYear}`);
