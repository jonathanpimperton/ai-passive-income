/**
 * Freshness guard -- the vitest twin of scripts/check-rates-freshness.mjs
 * (which runs before every build). Both use evaluateRatesFreshness() from
 * tax-years.mjs, so the rules are tested here with injected dates.
 *
 * Rules (decision D8): warn from 60 days before a rollover whose new year has
 * no data; fail only when the default year for today has no dataset or its
 * data is 400+ days unchecked.
 *
 * When the real-date test fails: add the missing year's rates from primary
 * sources (IRS / SSA / GOV.UK / gov.scot) to us-rates.ts or uk-rates.ts, list
 * the year in tax-years.mjs, and update docs/freshness-calendar.md.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  US_DATASETS,
  UK_DATASETS,
  evaluateRatesFreshness,
  parseIsoDate,
  ukTaxYearForDate,
  usTaxYearForDate,
  defaultUsTaxYear,
  defaultUkTaxYear,
  daysBetween,
  toIsoDate,
  pinnedToday,
} from './tax-years.mjs';
import { US_RATES_BY_YEAR, US_TAX_YEARS } from './us-rates';
import { UK_RATES_BY_YEAR, UK_TAX_YEARS } from './uk-rates';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const day = (iso: string) => {
  const d = parseIsoDate(iso);
  if (!d) throw new Error(`bad test date ${iso}`);
  return d;
};

describe('rates freshness on the real date (blocks the build when stale)', () => {
  it('has a dataset for today\'s default years, checked within 400 days', () => {
    const report = evaluateRatesFreshness(new Date());
    expect(report.errors).toEqual([]);
  });
});

describe('dataset manifest matches the rate tables', () => {
  it('US years and lastChecked agree', () => {
    expect(Object.keys(US_RATES_BY_YEAR).map(Number).sort()).toEqual(Object.keys(US_DATASETS).map(Number).sort());
    expect(US_TAX_YEARS).toEqual(Object.keys(US_DATASETS).map(Number).sort((a, b) => a - b));
    for (const y of US_TAX_YEARS) {
      expect(US_RATES_BY_YEAR[y].year).toBe(y);
      expect(US_RATES_BY_YEAR[y].lastChecked).toBe(US_DATASETS[y].lastChecked);
    }
  });

  it('UK years and lastChecked agree', () => {
    expect(Object.keys(UK_RATES_BY_YEAR).sort()).toEqual(Object.keys(UK_DATASETS).sort());
    for (const y of UK_TAX_YEARS) {
      expect(UK_RATES_BY_YEAR[y].year).toBe(y);
      expect(UK_RATES_BY_YEAR[y].lastChecked).toBe(UK_DATASETS[y].lastChecked);
    }
  });

  it('every lastChecked is a real YYYY-MM-DD date', () => {
    for (const meta of [...Object.values(US_DATASETS), ...Object.values(UK_DATASETS)]) {
      expect(parseIsoDate(meta.lastChecked)).not.toBeNull();
    }
  });
});

describe('tax-year calendar', () => {
  it('UK tax year turns over on 6 April', () => {
    expect(ukTaxYearForDate(day('2027-04-05'))).toBe('2026/27');
    expect(ukTaxYearForDate(day('2027-04-06'))).toBe('2027/28');
    expect(ukTaxYearForDate(day('2026-01-01'))).toBe('2025/26');
    expect(ukTaxYearForDate(day('2099-12-31'))).toBe('2099/00');
  });

  it('US tax year is the calendar year', () => {
    expect(usTaxYearForDate(day('2026-12-31'))).toBe(2026);
    expect(usTaxYearForDate(day('2027-01-01'))).toBe(2027);
  });

  it('default year falls back to the newest earlier dataset', () => {
    expect(defaultUsTaxYear(day('2028-06-01'), [2026, 2027])).toBe(2027);
    expect(defaultUsTaxYear(day('2025-06-01'), [2026, 2027])).toBe(2026);
    expect(defaultUkTaxYear(day('2027-05-01'), ['2026/27'])).toBe('2026/27');
    expect(defaultUkTaxYear(day('2027-05-01'), ['2027/28', '2026/27'])).toBe('2027/28');
  });

  it('date helpers are exact across DST and leap days', () => {
    expect(daysBetween(day('2026-03-28'), day('2026-03-30'))).toBe(2);
    expect(daysBetween(day('2028-02-28'), day('2028-03-01'))).toBe(2);
    expect(toIsoDate(day('2027-01-02'))).toBe('2027-01-02');
    expect(parseIsoDate('2027-02-30')).toBeNull();
    expect(parseIsoDate('2027-1-2')).toBeNull();
  });
});

describe('guard rules with injected dates (D8)', () => {
  const withoutUs = (year: number) => {
    const us: Record<string, { lastChecked: string }> = { ...US_DATASETS };
    delete us[String(year)];
    return us;
  };

  it('passes today (12 Nov 2026) with no warnings', () => {
    const r = evaluateRatesFreshness(day('2026-11-12'));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.usDefault).toBe(2026);
  });

  it('passes on 2 Jan 2027 with TY2027 as the default (TX-3 acceptance)', () => {
    const r = evaluateRatesFreshness(day('2027-01-02'));
    expect(r.errors).toEqual([]);
    expect(r.usDefault).toBe(2027);
    expect(r.ukDefault).toBe('2026/27');
  });

  it('blocks on 2 Jan 2027 only if the 2027 dataset were missing', () => {
    const r = evaluateRatesFreshness(day('2027-01-02'), { us: withoutUs(2027) });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/No US federal dataset for tax year 2027/);
    expect(r.usDefault).toBe(2026);
  });

  it('warns (without failing) from 60 days before a rollover with no data', () => {
    const before = evaluateRatesFreshness(day('2026-11-01'), { us: withoutUs(2027) }); // 61 days
    expect(before.warnings).toEqual([]);
    const at60 = evaluateRatesFreshness(day('2026-11-02'), { us: withoutUs(2027) }); // 60 days
    expect(at60.errors).toEqual([]);
    expect(at60.warnings.join('\n')).toMatch(/US tax year 2027 starts in 60 days/);
  });

  it('does not warn when the next year already has data', () => {
    expect(evaluateRatesFreshness(day('2026-12-31')).warnings).toEqual([]);
  });

  it('UK: warns before 6 April 2027 and fails from 6 April 2027 until 2027/28 data lands', () => {
    const feb = evaluateRatesFreshness(day('2027-02-10'));
    expect(feb.errors).toEqual([]);
    expect(feb.warnings.join('\n')).toMatch(/UK tax year 2027\/28 starts in 55 days/);

    const lastDay = evaluateRatesFreshness(day('2027-04-05'));
    expect(lastDay.errors).toEqual([]);

    const rollover = evaluateRatesFreshness(day('2027-04-06'));
    expect(rollover.errors.join('\n')).toMatch(/No UK dataset for tax year 2027\/28/);

    const withNext = evaluateRatesFreshness(day('2027-04-06'), {
      uk: { ...UK_DATASETS, '2027/28': { lastChecked: '2027-03-20' } },
    });
    expect(withNext.errors).toEqual([]);
    expect(withNext.ukDefault).toBe('2027/28');
  });

  it('fails at 400 days unchecked and warns from 340', () => {
    const us = { 2026: { lastChecked: '2025-11-01' }, 2027: { lastChecked: '2026-11-12' } };
    const warn = evaluateRatesFreshness(day('2026-11-12'), { us });
    expect(warn.errors).toEqual([]);
    expect(warn.warnings.join('\n')).toMatch(/US 2026 rates were last checked 376 days ago/);
    const under = evaluateRatesFreshness(day('2026-09-26'), { us }); // 330 days
    expect(under.warnings).toEqual([]);
    expect(evaluateRatesFreshness(day('2026-12-05'), { us }).errors).toEqual([]); // 399 days
    expect(evaluateRatesFreshness(day('2026-12-06'), { us }).errors.join('\n')).toMatch(/last checked 400 days ago/);
  });

  it('flags a malformed lastChecked', () => {
    const r = evaluateRatesFreshness(day('2026-11-12'), { us: { 2026: { lastChecked: '12/11/2026' } } });
    expect(r.errors.join('\n')).toMatch(/not a YYYY-MM-DD date/);
  });
});

describe('default year follows the date (aliases switch on 1 January)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('31 Dec 2026 -> 2026 values; 1 Jan 2027 -> 2027 values', async () => {
    vi.stubEnv('CALCRUN_TODAY', ''); // a pinned build clock would override the fake date
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date(2026, 11, 31, 12));
    vi.resetModules();
    const dec = await import('./us-rates');
    expect(dec.US_TAX_YEAR).toBe('2026');
    expect(dec.US_STANDARD_DEDUCTION.single).toBe(16_100);

    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 1));
    vi.resetModules();
    const jan = await import('./us-rates');
    expect(jan.US_TAX_YEAR).toBe('2027');
    expect(jan.US_STANDARD_DEDUCTION.single).toBe(16_600);
    expect(jan.US_SOCIAL_SECURITY.wageCap).toBe(192_300);
    const calc = await import('./us-tax-calc');
    expect(calc.calcFederalTax(100_000, 'single')).toBeCloseTo(12_889.5, 2);
  });

  it('a stale deploy in 2028 keeps the newest data instead of crashing', async () => {
    vi.stubEnv('CALCRUN_TODAY', '');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2028, 5, 1));
    vi.resetModules();
    const mod = await import('./us-rates');
    expect(mod.US_TAX_YEAR).toBe('2027');
  });

  const local = () => {
    // These tests describe a LOCAL rehearsal; CI runners set CI=true.
    vi.stubEnv('CI', '');
    vi.stubEnv('WORKERS_CI', '');
  };

  it('CALCRUN_TODAY pins the build clock for local rollover rehearsals', async () => {
    local();
    vi.stubEnv('CALCRUN_TODAY', '2027-01-02');
    vi.resetModules();
    const mod = await import('./us-rates');
    expect(mod.US_DEFAULT_TAX_YEAR).toBe(2027);
  });

  it('an invalid CALCRUN_TODAY fails loudly', async () => {
    local();
    vi.stubEnv('CALCRUN_TODAY', 'next tuesday');
    vi.resetModules();
    await expect(import('./us-rates')).rejects.toThrow(/CALCRUN_TODAY/);
  });

  it('CALCRUN_TODAY is ignored in CI and Cloudflare builds (cannot freeze the server-rendered year)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 12));
    vi.stubEnv('CALCRUN_TODAY', '2027-01-02');
    vi.stubEnv('CI', '');
    vi.stubEnv('WORKERS_CI', '1');
    vi.resetModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('./us-rates');
    expect(mod.US_DEFAULT_TAX_YEAR).toBe(2026);
    expect(warn.mock.calls.flat().join(' ')).toMatch(/CALCRUN_TODAY=2027-01-02 IGNORED: WORKERS_CI is set/);
    warn.mockRestore();
  });
});

describe('pinnedToday()', () => {
  it('applies locally, is ignored when CI or WORKERS_CI is set, and rejects malformed dates', () => {
    expect(pinnedToday({}).date).toBeNull();
    expect(toIsoDate(pinnedToday({ CALCRUN_TODAY: '2027-01-02' }).date as Date)).toBe('2027-01-02');
    expect(pinnedToday({ CALCRUN_TODAY: '2027-01-02', CI: 'true' })).toMatchObject({ ignored: true, date: null });
    expect(pinnedToday({ CALCRUN_TODAY: '2027-01-02', WORKERS_CI: '1' })).toMatchObject({ ignored: true, date: null });
    expect(pinnedToday({ CALCRUN_TODAY: '2027-01-02', CI: 'false' }).ignored).toBe(false);
    expect(pinnedToday({ CALCRUN_TODAY: '2027-01-02', CI: '0' }).ignored).toBe(false);
    expect(pinnedToday({ CALCRUN_TODAY: 'garbage', CI: 'true' }).ignored).toBe(true);
    expect(() => pinnedToday({ CALCRUN_TODAY: '2027-02-30' })).toThrow(/CALCRUN_TODAY/);
  });
});

describe('scripts/check-rates-freshness.mjs (prebuild guard CLI)', () => {
  const run = (today: string) =>
    spawnSync(process.execPath, ['scripts/check-rates-freshness.mjs', `--today=${today}`], {
      encoding: 'utf8',
      env: { ...process.env, CALCRUN_TODAY: '', GITHUB_ACTIONS: '' },
    });

  it('exits 0 on 2 Jan 2027 and reports TY2027 as the default', () => {
    const r = run('2027-01-02');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/default years US 2027, UK 2026\/27/);
  });

  it('exits 0 with a loud warning ahead of the UK rollover', () => {
    const r = run('2027-02-10');
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/RATES FRESHNESS WARNING/);
  });

  it('exits 1 when the default year has no dataset', () => {
    const r = run('2027-04-06');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/GUARD FAILED/);
  });

  it('rejects a malformed --today', () => {
    expect(run('2027-13-01').status).toBe(2);
  });

  it('announces a pinned date loudly', () => {
    expect(run('2027-01-02').stderr).toMatch(/DATE PINNED BY --today=2027-01-02/);
    const env = { ...process.env, CALCRUN_TODAY: '2027-01-02', CI: '', WORKERS_CI: '', GITHUB_ACTIONS: '' };
    const r = spawnSync(process.execPath, ['scripts/check-rates-freshness.mjs'], { encoding: 'utf8', env });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/DATE PINNED BY CALCRUN_TODAY=2027-01-02/);
    expect(r.stdout).toMatch(/on 2027-01-02/);
  });

  it('ignores CALCRUN_TODAY in a Cloudflare build (WORKERS_CI) and checks the real date', () => {
    const env = { ...process.env, CALCRUN_TODAY: '2030-01-01', CI: '', WORKERS_CI: '1', GITHUB_ACTIONS: '' };
    const r = spawnSync(process.execPath, ['scripts/check-rates-freshness.mjs'], { encoding: 'utf8', env });
    expect(r.stderr).toMatch(/CALCRUN_TODAY=2030-01-01 IGNORED because WORKERS_CI is set/);
    expect(r.stdout).not.toMatch(/on 2030-01-01/);
    expect(r.status).toBe(0); // 2030 has no data: honouring the pin would have failed
  });
});
