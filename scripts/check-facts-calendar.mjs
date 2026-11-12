/**
 * Dated-facts checker for docs/freshness-calendar.md. Dependency-free Node,
 * run weekly by the CI freshness workflow (and by hand).
 *
 * Exits 1 when any fact is overdue or due within the window (default 30
 * days), or when the calendar cannot be read; exits 0 otherwise. GitHub then
 * emails the owner about the failed run.
 *
 * Usage:
 *   node scripts/check-facts-calendar.mjs
 *   node scripts/check-facts-calendar.mjs --today=2027-01-02 --within=30
 *   node scripts/check-facts-calendar.mjs --file=docs/freshness-calendar.md
 *
 * Row format: see docs/freshness-calendar.md. A `derive` cell `path#KEY+Nd`
 * (or `-Nd`) takes the first YYYY-MM-DD date after KEY in that file and adds
 * N days; it replaces the static `due` when the file exists.
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { daysBetween, parseIsoDate, taxClockNow, toIsoDate } from '../src/lib/tax-years.mjs';

export const DEFAULT_WITHIN_DAYS = 30;
const BEGIN = '<!-- BEGIN FACTS -->';
const END = '<!-- END FACTS -->';
const REQUIRED_COLUMNS = ['id', 'due', 'derive', 'last_done', 'recurs', 'fact', 'action', 'where', 'source'];

/**
 * @typedef {{ id: string, due: string, derive: string, last_done: string, recurs: string,
 *   fact: string, action: string, where: string, source: string, line: number }} FactRow
 */

/**
 * Parse the facts table between the BEGIN/END markers.
 * @param {string} markdown
 * @returns {{ rows: FactRow[], errors: string[] }}
 */
export function parseCalendar(markdown) {
  /** @type {string[]} */ const errors = [];
  /** @type {FactRow[]} */ const rows = [];
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === BEGIN);
  const end = lines.findIndex((l) => l.trim() === END);
  if (start < 0 || end < 0 || end < start) {
    return { rows, errors: [`facts table markers ${BEGIN} / ${END} not found`] };
  }
  const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

  const tableLines = lines.slice(start + 1, end).map((text, i) => ({ text, line: start + 2 + i }))
    .filter((l) => l.text.trim() !== '');
  if (tableLines.length < 2) return { rows, errors: ['facts table has no header'] };

  const header = splitRow(tableLines[0].text);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) errors.push(`facts table is missing column(s): ${missing.join(', ')}`);

  const seen = new Set();
  for (const { text, line } of tableLines.slice(2)) {
    const cells = splitRow(text);
    if (cells.length !== header.length) {
      errors.push(`line ${line}: expected ${header.length} cells, found ${cells.length}`);
      continue;
    }
    const row = /** @type {FactRow} */ ({ line });
    header.forEach((h, i) => { row[h] = cells[i]; });
    if (!row.id) errors.push(`line ${line}: empty id`);
    else if (seen.has(row.id)) errors.push(`line ${line}: duplicate id "${row.id}"`);
    seen.add(row.id);
    if (!parseIsoDate(row.due)) errors.push(`line ${line} (${row.id}): due "${row.due}" is not a YYYY-MM-DD date`);
    if (row.last_done && !parseIsoDate(row.last_done)) {
      errors.push(`line ${line} (${row.id}): last_done "${row.last_done}" is not a YYYY-MM-DD date`);
    }
    if (row.derive && !parseDerive(row.derive)) {
      errors.push(`line ${line} (${row.id}): derive "${row.derive}" must look like path#KEY+90d`);
    }
    rows.push(row);
  }
  return { rows, errors };
}

/**
 * @param {string} spec  e.g. 'src/lib/market-rates.ts#MARKET_RATES_CHECKED+90d'
 * @returns {{ path: string, key: string, days: number } | null}
 */
export function parseDerive(spec) {
  const m = /^([^#\s]+)#([A-Za-z0-9_.-]+)([+-]\d+)d$/.exec(spec.trim());
  if (!m) return null;
  return { path: m[1], key: m[2], days: Number(m[3]) };
}

/**
 * Find the first YYYY-MM-DD date that follows KEY in a source file
 * (`KEY = '2026-11-12'`, `KEY: 2027-03-10T00:00:00Z`, ...).
 * @param {string} source
 * @param {string} key
 * @returns {Date | null}
 */
export function findKeyedDate(source, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`\\b${escaped}\\b\\s*[:=]\\s*['"\`]?(\\d{4}-\\d{2}-\\d{2})`).exec(source);
  return m ? parseIsoDate(m[1]) : null;
}

/**
 * Work out each fact's effective due date and status. Pure apart from the
 * injected file reader.
 * @param {FactRow[]} rows
 * @param {Date} today
 * @param {{ within?: number, readFile?: (path: string) => string | null }} [options]
 */
export function evaluateCalendar(rows, today, options = {}) {
  const within = options.within ?? DEFAULT_WITHIN_DAYS;
  const readFile = options.readFile ?? ((p) => (existsSync(p) ? readFileSync(p, 'utf8') : null));
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const notes = [];
  const results = rows.map((row) => {
    let due = parseIsoDate(row.due);
    let dueSource = 'static';
    const spec = row.derive ? parseDerive(row.derive) : null;
    if (spec) {
      const source = readFile(spec.path);
      if (source === null) {
        notes.push(`${row.id}: ${spec.path} does not exist yet; using the static due date ${row.due}`);
      } else {
        const base = findKeyedDate(source, spec.key);
        if (!base) {
          errors.push(`${row.id}: no YYYY-MM-DD date after "${spec.key}" in ${spec.path}; the calendar has lost track of this fact`);
        } else {
          due = new Date(base.getFullYear(), base.getMonth(), base.getDate() + spec.days);
          dueSource = `${spec.key} ${toIsoDate(base)} ${spec.days >= 0 ? '+' : ''}${spec.days}d`;
        }
      }
    }
    const days = due ? daysBetween(today, due) : NaN;
    const status = !due ? 'invalid' : days < 0 ? 'overdue' : days <= within ? 'due-soon' : 'ok';
    return { row, due: due ? toIsoDate(due) : row.due, dueSource, days, status };
  });
  const flagged = results.filter((r) => r.status === 'overdue' || r.status === 'due-soon')
    .sort((a, b) => a.days - b.days);
  return { results, flagged, errors, notes, within };
}

function main(argv) {
  const opt = (name) => {
    const a = argv.find((x) => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : undefined;
  };
  const file = opt('file') ?? 'docs/freshness-calendar.md';
  const withinRaw = opt('within');
  const within = withinRaw === undefined ? DEFAULT_WITHIN_DAYS : Number(withinRaw);
  if (!Number.isInteger(within) || within < 0) {
    console.error(`--within must be a whole number of days, got "${withinRaw}"`);
    return 2;
  }
  const todayRaw = opt('today');
  const today = todayRaw === undefined ? taxClockNow() : parseIsoDate(todayRaw);
  if (!today) {
    console.error(`--today must be a real date in YYYY-MM-DD form, got "${todayRaw}"`);
    return 2;
  }
  if (!existsSync(file)) {
    console.error(`Freshness calendar not found: ${file}`);
    return 1;
  }

  const parsed = parseCalendar(readFileSync(file, 'utf8'));
  const report = evaluateCalendar(parsed.rows, today, { within });
  const errors = [...parsed.errors, ...report.errors];
  const inActions = process.env.GITHUB_ACTIONS === 'true';

  console.log(`Freshness calendar (${file}) on ${toIsoDate(today)}: ${parsed.rows.length} facts, window ${within} days.`);
  for (const n of report.notes) console.log(`  note: ${n}`);

  if (report.flagged.length) {
    console.error('');
    console.error('DATED FACTS NEED ATTENTION:');
    for (const f of report.flagged) {
      const when = f.status === 'overdue' ? `OVERDUE by ${-f.days} day(s)` : `due in ${f.days} day(s)`;
      const msg = `[${f.row.id}] ${when} (${f.due}${f.dueSource === 'static' ? '' : `, from ${f.dueSource}`}): ${f.row.fact}`;
      console.error(`  - ${msg}`);
      console.error(`      action: ${f.row.action}`);
      console.error(`      where:  ${f.row.where}`);
      console.error(`      source: ${f.row.source}`);
      if (inActions) console.log(`::error title=Freshness calendar::${msg}`);
    }
    console.error('');
    console.error('When done, move the row\'s due date to the next occurrence and set last_done (docs/freshness-calendar.md).');
  }
  if (errors.length) {
    console.error('CALENDAR ERRORS:');
    for (const e of errors) {
      console.error(`  - ${e}`);
      if (inActions) console.log(`::error title=Freshness calendar::${e}`);
    }
  }

  const next = report.results.filter((r) => r.status === 'ok').sort((a, b) => a.days - b.days).slice(0, 5);
  if (next.length) {
    console.log('Next up:');
    for (const r of next) console.log(`  ${r.due} (${r.days} days)  ${r.row.id}`);
  }

  if (report.flagged.length || errors.length) return 1;
  console.log('All dated facts are more than the window away.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
