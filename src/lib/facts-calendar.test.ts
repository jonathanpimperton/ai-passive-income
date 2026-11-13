/**
 * docs/freshness-calendar.md and scripts/check-facts-calendar.mjs (the weekly
 * CI freshness check). The real calendar must parse cleanly and cover every
 * dated-fact topic the plan requires (TX-3); the date rules are tested with
 * injected dates and file contents.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseCalendar, evaluateCalendar, parseDerive, findKeyedDate } from '../../scripts/check-facts-calendar.mjs';
import { parseIsoDate, toIsoDate } from './tax-years.mjs';

const day = (iso: string) => parseIsoDate(iso) as Date;
const calendarMd = readFileSync('docs/freshness-calendar.md', 'utf8');

describe('the real freshness calendar', () => {
  const { rows, errors } = parseCalendar(calendarMd);

  it('parses with no errors, unique ids and real dates', () => {
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it('resolves every derived due date (no lost source keys)', () => {
    const report = evaluateCalendar(rows, day('2026-11-12'));
    expect(report.errors).toEqual([]);
  });

  it('covers every dated-fact topic in plan task TX-3', () => {
    const text = rows.map((r) => `${r.id} ${r.fact}`).join('\n').toLowerCase();
    const topics: [string, RegExp][] = [
      ['UK Budget / Spring Statement', /spring (statement|forecast)/],
      ['UK 6 April rollover', /uk tax year 2027\/28 starts 6 apr/],
      ['Scottish budget', /scottish budget/],
      ['IRS October/November release', /irs tax year 2028 inflation adjustments/],
      ['IRS 401(k) notice', /401\(k\)/],
      ['SSA October', /ssa 2028 social security wage base/],
      ['BoE MPC dates', /bank rate|mpc/],
      ['Freddie Mac PMMS 90-day', /pmms/],
      ['BLS CPI', /cpi/],
      ['security.txt expiry', /security\.txt/],
      ['LISA changes (Apr 2029)', /lifetime isa/],
      ['salary-sacrifice NI cap (Apr 2029)', /salary-sacrificed/],
      ['savings income rates (Apr 2027)', /savings and property income/],
      ['US default-year redeploy', /default tax year switches to 2027/],
      ['next UK Autumn Budget', /autumn budget 2027/],
      ['BLS CPI monthly', /cpi-u monthly/],
      ['BLS CPI annual average', /annual average cpi-u/],
      ['Ofgem price cap', /ofgem energy price cap/],
      ['UK 0% VAT on solar/battery', /0% vat on installing energy-saving materials/],
      ['EIA monthly', /eia electric power monthly/],
      ['Eurostat half-yearly', /eurostat household electricity prices/],
      ['DESNZ solar costs', /desnz small-scale solar pv cost/],
      ['UK NMPA 57 in 2028', /normal minimum pension age rises from 55 to 57/],
    ];
    for (const [name, re] of topics) expect(text, name).toMatch(re);
  });

  it('every row cites a source', () => {
    for (const r of rows) expect(r.source, r.id).toMatch(/^(https:\/\/|docs\/)/);
  });

  it('derives the security.txt reminder from its Expires field', () => {
    const report = evaluateCalendar(rows, day('2026-11-12'));
    const sec = report.results.find((r) => r.row.id === 'security-txt-expiry');
    if (!sec) throw new Error('security-txt-expiry row missing');
    const expires = /Expires:\s*(\d{4}-\d{2}-\d{2})/.exec(readFileSync('public/.well-known/security.txt', 'utf8'))![1];
    const expected = day(expires);
    expected.setDate(expected.getDate() - 30);
    expect(sec.due).toBe(toIsoDate(expected));
    expect(sec.dueSource).toMatch(/^Expires \d{4}-\d{2}-\d{2} -30d$/);
  });
});

describe('calendar rules (injected)', () => {
  const md = (rowsText: string) =>
    [
      '<!-- BEGIN FACTS -->',
      '| id | due | derive | last_done | recurs | fact | action | where | source |',
      '|---|---|---|---|---|---|---|---|---|',
      rowsText,
      '<!-- END FACTS -->',
    ].join('\n');

  it('flags overdue and due-within-30-days facts, not later ones', () => {
    const { rows, errors } = parseCalendar(md([
      '| a | 2026-11-01 | | | once | A | x | y | https://a |',
      '| b | 2026-12-12 | | | once | B | x | y | https://b |',
      '| c | 2026-12-13 | | | once | C | x | y | https://c |',
    ].join('\n')));
    expect(errors).toEqual([]);
    const r = evaluateCalendar(rows, day('2026-11-12'));
    expect(r.flagged.map((f) => [f.row.id, f.status])).toEqual([
      ['a', 'overdue'],
      ['b', 'due-soon'],
    ]);
  });

  it('honours a custom window', () => {
    const { rows } = parseCalendar(md('| a | 2026-12-31 | | | once | A | x | y | https://a |'));
    expect(evaluateCalendar(rows, day('2026-11-12'), { within: 60 }).flagged).toHaveLength(1);
    expect(evaluateCalendar(rows, day('2026-11-12'), { within: 30 }).flagged).toHaveLength(0);
  });

  it('reports malformed rows, dates and duplicate ids', () => {
    const { errors } = parseCalendar(md([
      '| a | 2026-02-30 | | | once | A | x | y | https://a |',
      '| a | 2026-12-01 | | | once | A | x | y | https://a |',
      '| b | 2026-12-01 | nonsense | | once | B | x | y | https://b |',
      '| c | 2026-12-01 | | |',
    ].join('\n')));
    expect(errors.join('\n')).toMatch(/not a YYYY-MM-DD date/);
    expect(errors.join('\n')).toMatch(/duplicate id "a"/);
    expect(errors.join('\n')).toMatch(/derive "nonsense"/);
    expect(errors.join('\n')).toMatch(/expected 9 cells/);
  });

  it('reports missing markers', () => {
    expect(parseCalendar('# nothing here').errors[0]).toMatch(/markers/);
  });

  describe('derived due dates', () => {
    const row = '| pmms | 2027-02-10 | src/lib/market-rates.ts#MARKET_RATES_CHECKED+90d | | weekly | PMMS | x | y | https://p |';

    it('adds days to the date found after the key', () => {
      const { rows } = parseCalendar(md(row));
      const r = evaluateCalendar(rows, day('2026-11-12'), {
        readFile: () => "export const MARKET_RATES_CHECKED = '2026-11-12';",
      });
      expect(r.errors).toEqual([]);
      expect(r.results[0].due).toBe('2027-02-10');
      // 90 days after a check made in mid-December lands in mid-March.
      const later = evaluateCalendar(rows, day('2027-03-01'), {
        readFile: () => "export const MARKET_RATES_CHECKED = '2026-12-14';",
      });
      expect(later.results[0].due).toBe('2027-03-14');
      expect(later.flagged).toHaveLength(1);
    });

    it('falls back to the static date when the file does not exist yet', () => {
      const { rows } = parseCalendar(md(row));
      const r = evaluateCalendar(rows, day('2026-11-12'), { readFile: () => null });
      expect(r.errors).toEqual([]);
      expect(r.notes.join('\n')).toMatch(/does not exist yet/);
      expect(r.results[0].due).toBe('2027-02-10');
    });

    it('fails loudly when the file exists but the key is gone', () => {
      const { rows } = parseCalendar(md(row));
      const r = evaluateCalendar(rows, day('2026-11-12'), { readFile: () => 'export const SOMETHING_ELSE = 1;' });
      expect(r.errors.join('\n')).toMatch(/lost track/);
    });

    it('parses derive specs and keyed dates', () => {
      expect(parseDerive('public/.well-known/security.txt#Expires-30d')).toEqual({
        path: 'public/.well-known/security.txt',
        key: 'Expires',
        days: -30,
      });
      expect(parseDerive('no-hash+3d')).toBeNull();
      expect(findKeyedDate('Expires: 2027-03-10T00:00:00.000Z', 'Expires')?.getDate()).toBe(10);
      expect(findKeyedDate("const X_CHECKED = '2026-11-12'", 'X_CHECKED')?.getMonth()).toBe(10);
      expect(findKeyedDate('MY_KEY_EXTRA = "2026-01-01"', 'MY_KEY')).toBeNull();
    });
  });
});

describe('scripts/check-facts-calendar.mjs CLI', () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ['scripts/check-facts-calendar.mjs', ...args], {
      encoding: 'utf8',
      env: { ...process.env, CALCRUN_TODAY: '', GITHUB_ACTIONS: '' },
    });

  it('exits 1 and lists the fact when something is due within 30 days', () => {
    const r = run('--today=2026-11-12');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/us-irs-401k-2027/);
  });

  it('exits 0 when nothing is due in the window', () => {
    const r = run('--today=2026-10-01');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/All dated facts are more than the window away/);
  });

  it('rejects bad arguments with exit 2', () => {
    expect(run('--today=2026-13-01').status).toBe(2);
    expect(run('--within=-1').status).toBe(2);
  });
});
