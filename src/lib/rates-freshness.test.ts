import { describe, it, expect } from 'vitest';
import { UK_TAX_YEAR, UK_RATES_LAST_CHECKED } from './uk-rates';
import { US_TAX_YEAR, US_RATES_LAST_CHECKED } from './us-rates';

/**
 * Freshness guard — runs on every `npm test` AND every `npm run build` (prebuild).
 *
 * The site's core trust claim is "verified rates". These tests fail LOUDLY the
 * moment a new tax year begins without the central rates modules being updated,
 * so stale rates can never ship silently again (this happened once: the site
 * displayed "2025/26 verified" for 3 months into the 2026/27 tax year).
 *
 * When these fail: research the new year's rates from primary sources
 * (GOV.UK / gov.scot / IRS / SSA), update src/lib/uk-rates.ts and us-rates.ts,
 * bump the LAST_CHECKED constants, and update dependent content
 * (see docs/plan-2026-07.md Phase 1A for the process used in July 2026).
 */

/** UK tax year runs 6 April → 5 April, formatted like '2026/27' */
function expectedUkTaxYear(now: Date): string {
  const y = now.getFullYear();
  const afterApril6 = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6);
  const startYear = afterApril6 ? y : y - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

const MAX_UNCHECKED_DAYS = 400;

describe('rates freshness guard', () => {
  it('UK_TAX_YEAR matches the current UK tax year', () => {
    expect(UK_TAX_YEAR).toBe(expectedUkTaxYear(new Date()));
  });

  it('US_TAX_YEAR matches the current calendar year', () => {
    expect(US_TAX_YEAR).toBe(String(new Date().getFullYear()));
  });

  it('rates have been checked within the last 400 days', () => {
    const days = (iso: string) => (Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86_400_000;
    expect(days(UK_RATES_LAST_CHECKED)).toBeLessThan(MAX_UNCHECKED_DAYS);
    expect(days(US_RATES_LAST_CHECKED)).toBeLessThan(MAX_UNCHECKED_DAYS);
  });
});
