/**
 * Dated-facts checker for docs/freshness-calendar.md. Dependency-free Node,
 * run weekly by the CI freshness workflow (and by hand).
 *
 * Each fact has a `due` date: the day the fact changes or is published, so the
 * work can be done ON or AFTER it. An optional `lead` (whole days, empty = 0)
 * says the work must already be under way that many days BEFORE `due`, because
 * it has to be finished before the date (a deadline, not an event). Per fact,
 * with days = days from today to due:
 *   overdue   days < 0               FAIL
 *   due       days = 0               FAIL (it can be acted on today)
 *   lead      0 < days <= lead       FAIL (inside the row's lead time)
 *   upcoming  lead < days <= within  WARN only (listed, does not fail the run)
 *   ok        days > within
 *
 * Exit codes:
 *   0 = no fact is overdue, due or inside its lead, and the calendar reads
 *       cleanly (upcoming facts alone still exit 0);
 *   1 = at least one such fact, or the calendar cannot be read or resolved
 *       (GitHub then emails the owner about the failed run);
 *   2 = bad arguments (--today, --within) or a malformed CALCRUN_TODAY.
 * A pinned date (--today=, or CALCRUN_TODAY outside CI) is announced loudly;
 * CALCRUN_TODAY is ignored, with a warning, when CI or WORKERS_CI is set.
 *
 * Usage:
 *   node scripts/check-facts-calendar.mjs
 *   node scripts/check-facts-calendar.mjs --today=2027-01-02 --within=30
 *   node scripts/check-facts-calendar.mjs --file=docs/freshness-calendar.md
 *
 * Row format: see docs/freshness-calendar.md. `--within` is the upcoming
 * window (default 30 days). A `derive` cell `path#KEY+Nd` (or `-Nd`) takes the
 * first YYYY-MM-DD date after KEY in that file and adds N days; it replaces the
 * static `due` when the file exists. `derive` and `lead` are optional columns.
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { daysBetween, parseIsoDate, pinnedToday, toIsoDate } from '../src/lib/tax-years.mjs';

export const DEFAULT_WITHIN_DAYS = 30;
const BEGIN = '<!-- BEGIN FACTS -->';
const END = '<!-- END FACTS -->';
const REQUIRED_COLUMNS = ['id', 'due', 'derive', 'last_done', 'recurs', 'fact', 'action', 'where', 'source'];

/**
 * @typedef {{ id: string, due: string, derive: string, lead: string, last_done: string, recurs: string,
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
    // `lead` is optional (an old-format table has no such column): no cell means no lead.
    if (row.lead === undefined) row.lead = '';
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
    if (parseLead(row.lead) === null) {
      errors.push(`line ${line} (${row.id}): lead "${row.lead}" must be empty or a whole number of days such as 30`);
    }
    rows.push(row);
  }
  return { rows, errors };
}

/**
 * @param {string | undefined} raw  a `lead` cell
 * @returns {number | null}  days (empty = 0), or null when the cell is not a non-negative whole number
 */
export function parseLead(raw) {
  const text = (raw ?? '').trim();
  if (text === '') return 0;
  return /^\d+$/.test(text) ? Number(text) : null;
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
 * Work out each fact's effective due date and status (see the header for the
 * status rules). Pure apart from the injected file reader.
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
    // parseCalendar reports an unreadable lead; here it counts as 0 so this stays pure.
    const lead = parseLead(row.lead) ?? 0;
    const status = !due ? 'invalid'
      : days < 0 ? 'overdue'
        : days === 0 ? 'due'
          : days <= lead ? 'lead'
            : days <= within ? 'upcoming'
              : 'ok';
    return { row, due: due ? toIsoDate(due) : row.due, dueSource, days, lead, status };
  });
  // flagged = the rows that FAIL the run (act now); upcoming = rows that only warn.
  const flagged = results.filter((r) => r.status === 'overdue' || r.status === 'due' || r.status === 'lead')
    .sort((a, b) => a.days - b.days);
  const upcoming = results.filter((r) => r.status === 'upcoming').sort((a, b) => a.days - b.days);
  return { results, flagged, upcoming, errors, notes, within };
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
  let today;
  if (todayRaw !== undefined) {
    today = parseIsoDate(todayRaw);
    if (!today) {
      console.error(`--today must be a real date in YYYY-MM-DD form, got "${todayRaw}"`);
      return 2;
    }
    console.warn(`*** DATE PINNED BY --today=${todayRaw}: checking ${toIsoDate(today)}, not the real date ***`);
  } else {
    let pin;
    try {
      pin = pinnedToday();
    } catch (e) {
      console.error(String(e instanceof Error ? e.message : e));
      return 2;
    }
    if (pin.ignored) console.warn(`*** CALCRUN_TODAY=${pin.raw} IGNORED because ${pin.reason}; checking the real date. ***`);
    else if (pin.date) console.warn(`*** DATE PINNED BY CALCRUN_TODAY=${pin.raw}: checking ${toIsoDate(pin.date)}, not the real date ***`);
    today = pin.date ?? new Date();
  }
  if (!existsSync(file)) {
    console.error(`Freshness calendar not found: ${file}`);
    return 1;
  }

  const parsed = parseCalendar(readFileSync(file, 'utf8'));
  const report = evaluateCalendar(parsed.rows, today, { within });
  const errors = [...parsed.errors, ...report.errors];
  const inActions = process.env.GITHUB_ACTIONS === 'true';

  console.log(`Freshness calendar (${file}) on ${toIsoDate(today)}: ${parsed.rows.length} facts, upcoming window ${within} days.`);
  for (const n of report.notes) console.log(`  note: ${n}`);

  const source = (f) => (f.dueSource === 'static' ? '' : `, from ${f.dueSource}`);

  if (report.flagged.length) {
    console.error('');
    console.error('ACTION NEEDED NOW:');
    for (const f of report.flagged) {
      const when = f.status === 'overdue' ? `OVERDUE by ${-f.days} day(s)`
        : f.status === 'due' ? 'due TODAY'
          : `due in ${f.days} day(s)`;
      const lead = f.status === 'lead' ? `, inside its ${f.lead}-day lead` : '';
      const msg = `[${f.row.id}] ${when} (${f.due}${source(f)})${lead}: ${f.row.fact}`;
      console.error(`  - ${msg}`);
      console.error(`      action: ${f.row.action}`);
      console.error(`      where:  ${f.row.where}`);
      console.error(`      source: ${f.row.source}`);
      if (inActions) console.log(`::error title=Freshness calendar::${msg}`);
    }
    console.error('');
    console.error("When done, move the row's due date to the next occurrence and set last_done (docs/freshness-calendar.md).");
  }
  if (errors.length) {
    console.error('CALENDAR ERRORS:');
    for (const e of errors) {
      console.error(`  - ${e}`);
      if (inActions) console.log(`::error title=Freshness calendar::${e}`);
    }
  }
  if (report.upcoming.length) {
    console.log('');
    console.log(`COMING UP (no action yet; within ${within} days):`);
    for (const f of report.upcoming) {
      const line = `[${f.row.id}] ${f.due} (${f.days} day(s))${source(f)}: ${f.row.fact}`;
      console.log(`  - ${line}`);
      if (inActions) console.log(`::warning title=Freshness calendar (upcoming)::${line}`);
    }
    console.log('');
  }

  const next = report.results.filter((r) => r.status === 'ok').sort((a, b) => a.days - b.days).slice(0, 5);
  if (next.length) {
    console.log('Next up:');
    for (const r of next) console.log(`  ${r.due} (${r.days} days)  ${r.row.id}`);
  }

  if (report.flagged.length || errors.length) return 1;
  console.log('No dated fact needs action now.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
