/**
 * docs/freshness-calendar.md and scripts/check-facts-calendar.mjs (the weekly
 * CI freshness check). The real calendar must parse cleanly and cover every
 * dated-fact topic the plan requires (TX-3); the date rules (overdue, due,
 * lead, upcoming, ok) are tested with injected dates and file contents.
 */
import { afterAll, describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCalendar, evaluateCalendar, parseDerive, parseLead, findKeyedDate } from '../../scripts/check-facts-calendar.mjs';
import { parseIsoDate, toIsoDate } from './tax-years.mjs';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const day = (iso: string) => parseIsoDate(iso) as Date;
const calendarMd = readFileSync('docs/freshness-calendar.md', 'utf8');

describe('the real freshness calendar', () => {
  const { rows, errors } = parseCalendar(calendarMd);

  it('parses with no errors, unique ids and real dates', () => {
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it('has a lead cell on every row: empty or a whole number of days', () => {
    for (const r of rows) {
      expect(r.lead, r.id).toBeDefined();
      expect(r.lead, r.id).toMatch(/^(\d+)?$/);
      expect(parseLead(r.lead), `${r.id} lead "${r.lead}"`).not.toBeNull();
    }
  });

  it('gives the deadline rows a lead and leaves derived rows without one', () => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    // Builds fail from 6 Apr 2027 without the 2027/28 UK data, so work must start well before.
    const rates = byId.get('uk-rates-2027-28');
    if (!rates) throw new Error('uk-rates-2027-28 row missing');
    expect(parseLead(rates.lead)).toBeGreaterThanOrEqual(30);
    for (const r of rows) if (r.derive) expect(r.lead, `${r.id} derives its own margin`).toBe('');
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
      '| id | due | derive | lead | last_done | recurs | fact | action | where | source |',
      '|---|---|---|---|---|---|---|---|---|---|',
      rowsText,
      '<!-- END FACTS -->',
    ].join('\n');
  // An old-format table: no lead column at all.
  const mdNoLead = (rowsText: string) =>
    [
      '<!-- BEGIN FACTS -->',
      '| id | due | derive | last_done | recurs | fact | action | where | source |',
      '|---|---|---|---|---|---|---|---|---|',
      rowsText,
      '<!-- END FACTS -->',
    ].join('\n');
  const row = (id: string, due: string, lead = '', derive = '') =>
    `| ${id} | ${due} | ${derive} | ${lead} | | once | ${id.toUpperCase()} | x | y | https://${id} |`;
  const evalRows = (rowsText: string, today: string, options: { within?: number } = {}) => {
    const parsed = parseCalendar(md(rowsText));
    expect(parsed.errors).toEqual([]);
    return evaluateCalendar(parsed.rows, day(today), options);
  };
  const T = '2026-11-12';

  it('flags overdue facts; a fact due within the window with no lead only warns', () => {
    const r = evalRows([
      row('a', '2026-11-01'),
      row('b', '2026-12-12'), // exactly 30 days away
      row('c', '2026-12-13'), // 31 days away
    ].join('\n'), T);
    expect(r.flagged.map((f) => [f.row.id, f.status])).toEqual([['a', 'overdue']]);
    expect(r.upcoming.map((f) => [f.row.id, f.status])).toEqual([['b', 'upcoming']]);
    expect(r.results.find((f) => f.row.id === 'c')?.status).toBe('ok');
  });

  it('an event row due in 10 days with no lead is upcoming, not flagged', () => {
    const r = evalRows(row('event', '2026-11-22'), T);
    expect(r.flagged).toEqual([]);
    expect(r.upcoming.map((f) => [f.row.id, f.days, f.status])).toEqual([['event', 10, 'upcoming']]);
  });

  it('flags a fact due today', () => {
    const r = evalRows(row('today', T), T);
    expect(r.flagged.map((f) => [f.row.id, f.days, f.status])).toEqual([['today', 0, 'due']]);
    expect(r.upcoming).toEqual([]);
  });

  it('flags an overdue fact, however long overdue', () => {
    const r = evalRows([row('late', '2026-11-11'), row('later', '2025-01-01')].join('\n'), T);
    expect(r.flagged.map((f) => [f.row.id, f.status])).toEqual([['later', 'overdue'], ['late', 'overdue']]);
  });

  it('a fact inside its lead is flagged, one outside the lead only warns', () => {
    const inside = evalRows(row('inside', '2026-11-22', '14'), T); // 10 days away, lead 14
    expect(inside.flagged.map((f) => [f.row.id, f.status, f.lead])).toEqual([['inside', 'lead', 14]]);
    expect(inside.upcoming).toEqual([]);
    const outside = evalRows(row('outside', '2026-12-02', '14'), T); // 20 days away, lead 14
    expect(outside.flagged).toEqual([]);
    expect(outside.upcoming.map((f) => [f.row.id, f.status])).toEqual([['outside', 'upcoming']]);
  });

  it('treats the lead boundary as inclusive', () => {
    const exact = evalRows(row('exact', '2026-12-12', '30'), T); // exactly 30 days, lead 30
    expect(exact.flagged.map((f) => f.status)).toEqual(['lead']);
    const beyond = evalRows(row('beyond', '2026-12-13', '30'), T); // 31 days, lead 30
    expect(beyond.flagged).toEqual([]);
    expect(beyond.results[0].status).toBe('ok'); // past the default 30-day upcoming window too
    const widerWindow = evalRows(row('beyond', '2026-12-13', '30'), T, { within: 45 });
    expect(widerWindow.flagged).toEqual([]);
    expect(widerWindow.upcoming.map((f) => f.status)).toEqual(['upcoming']);
  });

  it('a lead longer than the window still fails inside the lead', () => {
    const r = evalRows(row('long', '2026-12-27', '60'), T); // 45 days away, lead 60, window 30
    expect(r.flagged.map((f) => f.status)).toEqual(['lead']);
  });

  it('an explicit lead of 0 behaves like no lead', () => {
    const r = evalRows([row('a', '2026-11-13', '0'), row('b', T, '0')].join('\n'), T);
    expect(r.flagged.map((f) => [f.row.id, f.status])).toEqual([['b', 'due']]);
    expect(r.upcoming.map((f) => f.row.id)).toEqual(['a']);
  });

  it('sorts flagged and upcoming rows by days', () => {
    const r = evalRows([
      row('u2', '2026-12-01'),
      row('f2', '2026-11-20', '30'),
      row('u1', '2026-11-20'),
      row('f1', '2026-11-01'),
      row('u3', '2026-12-10'),
    ].join('\n'), T);
    expect(r.flagged.map((f) => f.row.id)).toEqual(['f1', 'f2']);
    expect(r.upcoming.map((f) => f.row.id)).toEqual(['u1', 'u2', 'u3']);
  });

  it('honours a custom upcoming window', () => {
    const text = row('a', '2026-12-31');
    expect(evalRows(text, T, { within: 60 }).upcoming).toHaveLength(1);
    expect(evalRows(text, T, { within: 30 }).upcoming).toHaveLength(0);
    // The window never makes a row fail: only overdue, due and lead do.
    expect(evalRows(text, T, { within: 60 }).flagged).toHaveLength(0);
  });

  describe('lead cells', () => {
    it('parses empty and whole-number leads', () => {
      expect(parseLead('')).toBe(0);
      expect(parseLead(undefined)).toBe(0);
      expect(parseLead('0')).toBe(0);
      expect(parseLead('14')).toBe(14);
      expect(parseLead(' 30 ')).toBe(30);
    });

    it.each(['-3', '1.5', 'abc', '30d', '+5', '1e2'])('rejects the lead "%s" with a parse error naming the row', (bad) => {
      expect(parseLead(bad)).toBeNull();
      const { errors } = parseCalendar(md(row('bad-lead', '2026-12-01', bad)));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('line 4 (bad-lead)');
      expect(errors[0]).toContain(`lead "${bad}"`);
    });

    it('still parses a table with no lead column, as lead 0', () => {
      const parsed = parseCalendar(mdNoLead([
        '| ev | 2026-11-22 | | | once | EV | x | y | https://ev |',
        '| now | 2026-11-12 | | | once | NOW | x | y | https://now |',
      ].join('\n')));
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows.map((r) => r.lead)).toEqual(['', '']);
      const r = evaluateCalendar(parsed.rows, day(T));
      expect(r.flagged.map((f) => [f.row.id, f.status, f.lead])).toEqual([['now', 'due', 0]]);
      expect(r.upcoming.map((f) => [f.row.id, f.lead])).toEqual([['ev', 0]]);
    });
  });

  it('reports malformed rows, dates and duplicate ids', () => {
    const { errors } = parseCalendar(md([
      row('a', '2026-02-30'),
      row('a', '2026-12-01'),
      row('b', '2026-12-01', '', 'nonsense'),
      '| c | 2026-12-01 | | |',
    ].join('\n')));
    expect(errors.join('\n')).toMatch(/not a YYYY-MM-DD date/);
    expect(errors.join('\n')).toMatch(/duplicate id "a"/);
    expect(errors.join('\n')).toMatch(/derive "nonsense"/);
    expect(errors.join('\n')).toMatch(/expected 10 cells/);
  });

  it('reports missing markers', () => {
    expect(parseCalendar('# nothing here').errors[0]).toMatch(/markers/);
  });

  describe('derived due dates', () => {
    const pmmsRow = '| pmms | 2027-02-10 | src/lib/market-rates.ts#MARKET_RATES_CHECKED+90d | | | weekly | PMMS | x | y | https://p |';

    it('adds days to the date found after the key', () => {
      const { rows } = parseCalendar(md(pmmsRow));
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
      // 13 days away, no lead: it only warns until due.
      expect(later.flagged).toHaveLength(0);
      expect(later.upcoming).toHaveLength(1);
      const dueDay = evaluateCalendar(rows, day('2027-03-14'), {
        readFile: () => "export const MARKET_RATES_CHECKED = '2026-12-14';",
      });
      expect(dueDay.flagged.map((f) => f.status)).toEqual(['due']);
    });

    it('applies a lead to a derived due date', () => {
      const { rows, errors } = parseCalendar(md(
        '| pmms | 2027-02-10 | src/lib/market-rates.ts#MARKET_RATES_CHECKED+90d | 14 | | weekly | PMMS | x | y | https://p |',
      ));
      expect(errors).toEqual([]);
      const readFile = () => "export const MARKET_RATES_CHECKED = '2026-11-12';"; // derived due 2027-02-10
      const inside = evaluateCalendar(rows, day('2027-01-30'), { readFile }); // 11 days away
      expect(inside.flagged.map((f) => [f.status, f.due, f.lead])).toEqual([['lead', '2027-02-10', 14]]);
      const outside = evaluateCalendar(rows, day('2027-01-20'), { readFile }); // 21 days away
      expect(outside.flagged).toEqual([]);
      expect(outside.upcoming.map((f) => f.status)).toEqual(['upcoming']);
    });

    it('falls back to the static date when the file does not exist yet', () => {
      const { rows } = parseCalendar(md(pmmsRow));
      const r = evaluateCalendar(rows, day('2026-11-12'), { readFile: () => null });
      expect(r.errors).toEqual([]);
      expect(r.notes.join('\n')).toMatch(/does not exist yet/);
      expect(r.results[0].due).toBe('2027-02-10');
    });

    it('fails loudly when the file exists but the key is gone', () => {
      const { rows } = parseCalendar(md(pmmsRow));
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
  // Fixed fixtures, so completing a row in the real calendar never breaks these tests.
  const fixtureDir = mkdtempSync(join(tmpdir(), 'calcrun-calendar-'));
  afterAll(() => rmSync(fixtureDir, { recursive: true, force: true }));
  let n = 0;
  const fixtureFile = (rowsText: string, withLeadColumn = true) => {
    const file = join(fixtureDir, `calendar-${n++}.md`);
    writeFileSync(file, [
      '<!-- BEGIN FACTS -->',
      withLeadColumn
        ? '| id | due | derive | lead | last_done | recurs | fact | action | where | source |'
        : '| id | due | derive | last_done | recurs | fact | action | where | source |',
      withLeadColumn ? '|---|---|---|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|---|---|---|',
      rowsText,
      '<!-- END FACTS -->',
      '',
    ].join('\n'));
    return file;
  };
  const row = (id: string, due: string, lead = '') =>
    `| ${id} | ${due} | | ${lead} | | once | Fact ${id} | do ${id} | where ${id} | https://example.com/${id} |`;
  const run = (file: string, args: string[], env: Record<string, string> = {}) =>
    spawnSync(process.execPath, ['scripts/check-facts-calendar.mjs', `--file=${file}`, ...args], {
      encoding: 'utf8',
      env: { ...process.env, CALCRUN_TODAY: '', GITHUB_ACTIONS: '', ...env },
    });
  const T = '--today=2026-11-12';

  it('exits 0 and prints a COMING UP line when an event is due within 30 days', () => {
    const r = run(fixtureFile(row('fixture-event', '2026-11-22')), [T]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/COMING UP \(no action yet; within 30 days\):/);
    expect(r.stdout).toMatch(/\[fixture-event\] 2026-11-22 \(10 day\(s\)\): Fact fixture-event/);
    expect(r.stdout).toMatch(/No dated fact needs action now\./);
    expect(r.stderr).not.toMatch(/ACTION NEEDED NOW/);
  });

  it('exits 1 under ACTION NEEDED NOW when a fact is due today', () => {
    const r = run(fixtureFile(row('fixture-today', '2026-11-12')), [T]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/ACTION NEEDED NOW:/);
    expect(r.stderr).toMatch(/\[fixture-today\] due TODAY \(2026-11-12\)/);
    expect(r.stderr).toMatch(/action: do fixture-today/);
    expect(r.stdout).not.toMatch(/No dated fact needs action now/);
  });

  it('exits 1 when a fact is overdue', () => {
    const r = run(fixtureFile(row('fixture-late', '2026-11-01')), [T]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[fixture-late\] OVERDUE by 11 day\(s\)/);
  });

  it('exits 1 and names the lead when a fact is inside its lead time', () => {
    const r = run(fixtureFile(row('fixture-lead', '2026-11-22', '14')), [T]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[fixture-lead\] due in 10 day\(s\) \(2026-11-22\), inside its 14-day lead/);
  });

  it('exits 0 when a fact has a lead and is still outside it', () => {
    const r = run(fixtureFile(row('fixture-lead', '2026-12-02', '14')), [T]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/COMING UP/);
  });

  it('exits 0 and prints no COMING UP block when everything is beyond the window', () => {
    const r = run(fixtureFile(row('fixture-far', '2027-06-01')), ['--today=2026-10-01']);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/COMING UP/);
    expect(r.stdout).toMatch(/Next up:/);
    expect(r.stdout).toMatch(/No dated fact needs action now\./);
  });

  it('lists both kinds together and still fails on the action row', () => {
    const r = run(fixtureFile([row('f-late', '2026-11-01'), row('f-soon', '2026-11-20')].join('\n')), [T]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\[f-late\]/);
    expect(r.stdout).toMatch(/COMING UP[\s\S]*\[f-soon\]/);
    expect(r.stderr).not.toMatch(/\[f-soon\]/);
  });

  it('exits 1 on a calendar error such as a bad lead', () => {
    const r = run(fixtureFile(row('fixture-bad', '2027-06-01', '30d')), [T]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/CALENDAR ERRORS:/);
    expect(r.stderr).toMatch(/\(fixture-bad\): lead "30d"/);
  });

  it('reads an old-format table with no lead column', () => {
    const file = fixtureFile('| old-event | 2026-11-22 | | | once | Old event | x | y | https://example.com |', false);
    const r = run(file, [T]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[old-event\] 2026-11-22/);
  });

  it('honours --within for the upcoming window', () => {
    const file = fixtureFile(row('fixture-event', '2026-11-22'));
    expect(run(file, [T, '--within=5']).stdout).not.toMatch(/COMING UP/);
    expect(run(file, [T, '--within=10']).stdout).toMatch(/COMING UP \(no action yet; within 10 days\):/);
  });

  describe('in GitHub Actions', () => {
    const ci = { GITHUB_ACTIONS: 'true' };

    it('annotates upcoming facts as warnings, not errors, and exits 0', () => {
      const r = run(fixtureFile(row('fixture-event', '2026-11-22')), [T], ci);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/^::warning title=Freshness calendar \(upcoming\)::\[fixture-event\]/m);
      expect(r.stdout).not.toMatch(/::error/);
    });

    it('annotates facts needing action as errors, not warnings, and exits 1', () => {
      const r = run(fixtureFile(row('fixture-today', '2026-11-12')), [T], ci);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/^::error title=Freshness calendar::\[fixture-today\]/m);
      expect(r.stdout).not.toMatch(/::warning/);
    });

    it('prints no annotations outside Actions', () => {
      const r = run(fixtureFile(row('fixture-event', '2026-11-22')), [T]);
      expect(r.stdout).not.toMatch(/::warning|::error/);
    });
  });

  it('rejects bad arguments with exit 2', () => {
    const file = fixtureFile(row('fixture-event', '2026-11-22'));
    expect(run(file, ['--today=2026-13-01']).status).toBe(2);
    expect(run(file, ['--within=-1']).status).toBe(2);
  });
});
