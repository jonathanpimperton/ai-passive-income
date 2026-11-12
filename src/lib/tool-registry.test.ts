/**
 * Drift guard for the result-email label allowlist (tool-registry.ts).
 *
 * Scans every calculator that renders <EmailResultsButton> and checks that each label its
 * getInputs()/getResults() can send is allowed by the server. A failure here means the
 * worker would silently DROP that row from the results email: add the label (or a
 * template) to TOOL_REGISTRY[slug].labels in src/lib/tool-registry.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_REGISTRY, isKnownTool } from './tool-registry';
import { matchLabel, newLabelContext, compileLabel } from './email-sanitize';

const TOOLS_DIR = join(__dirname, '..', 'components', 'tools');

/**
 * Labels that are template literals or identifiers in the source. Each entry was checked
 * by hand against the registry; `samples` are concrete renderings that must match.
 * A NEW dynamic label in a calculator fails the test until it is listed here.
 */
const DYNAMIC: Record<string, Record<string, string[]>> = {
  'debt-payoff': {
    '`${d.name} Balance`': ['Credit Card Balance'],
    '`${d.name} APR`': ['Credit Card APR'],
    '`${d.name} Min Payment`': ['Credit Card Min Payment'],
  },
  'investment-return': {
    'result.label': ['End Amount', 'Monthly Contribution', 'Required Return Rate', 'Starting Amount', 'Time Required', 'Result'],
  },
  inflation: {
    '`${formatCurrency(amount)} in ${startYear} equals`': ['$1,000 in 2000 equals'],
    '`${formatCurrency(amount)} today will cost`': ['$1,000 today will cost'],
  },
  'investment-fee': {
    '`Balance at ${yourFee}% fee`': ['Balance at 1% fee'],
    '`Balance at ${comparisonFee}% fee`': ['Balance at 0.1% fee'],
  },
  'mortgage-payment': {
    piLabel: ['Monthly Payment (P&I)', 'Monthly Payment'],
    downLabel: ['Deposit', 'Down Payment'],
  },
  'mortgage-affordability': {
    depositLabel: ['Deposit', 'Down Payment'],
  },
  'rent-vs-buy': {
    propertyChargesLabel: ['Property Tax Rate', 'Annual property charges (% of home value)'],
    "`Over ${timeHorizon} years, ${analysis.buyWins ? 'buying' : 'renting'} saves you`": [
      'Over 10 years, buying saves you', 'Over 30 years, renting saves you',
    ],
  },
  'emergency-fund': {
    savingsRateLabel: ['Savings interest rate (AER)', 'Savings interest rate', 'Savings interest rate (APY)'],
  },
  'solar-payback': {
    '`${analysisPeriod}-Year Savings`': ['25-Year Savings'],
    '`${analysisPeriod}-Year ROI`': ['25-Year ROI'],
  },
  'car-finance': {
    '`${r.label} True Cost`': ['PCP True Cost', 'Hire Purchase True Cost', 'Personal Loan True Cost', 'Cash True Cost'],
    '`${r.label} Monthly`': ['PCP Monthly', 'Hire Purchase Monthly', 'Personal Loan Monthly', 'Cash Monthly'],
  },
  'stamp-duty': {
    "`${fmt(band.from)} \u2013 ${band.to === Infinity ? '...' : fmt(band.to)} (${(band.rate * 100).toFixed(0)}%)`": [
      '\u00A30 \u2013 \u00A3125,000 (0%)', '\u00A31,500,001 \u2013 ... (12%)',
    ],
  },
};

/** Return the source text of the useCallback(...) call that defines `name`, or ''. */
function callbackBody(src: string, name: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`);
  if (start < 0) return '';
  let i = src.indexOf('(', start);
  let depth = 0;
  let quote: string | null = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
}

/** Expressions that follow `label:` inside a body (up to the next top-level , or }). */
function labelExpressions(body: string): string[] {
  const out: string[] = [];
  const re = /\blabel:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    let tplDepth = 0;
    const begin = i;
    for (; i < body.length; i++) {
      const c = body[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (quote === '`' && c === '$' && body[i + 1] === '{') { tplDepth++; i++; continue; }
        if (quote === '`' && tplDepth > 0 && c === '}') { tplDepth--; continue; }
        if (c === quote && tplDepth === 0) quote = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) break;
        depth--;
      } else if ((c === ',' || c === ';') && depth === 0) break;
    }
    const expr = body.slice(begin, i).trim();
    // Skip TypeScript annotations such as `{ label: string; value: string }[]`.
    if (!/^(string|number|boolean)$/.test(expr)) out.push(expr);
  }
  return out;
}

function stringLiterals(expr: string): string[] {
  return [...expr.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1] ?? x[2]);
}

const calculatorFiles = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.tsx'));
const emailing = calculatorFiles
  .map((f) => ({ file: f, src: readFileSync(join(TOOLS_DIR, f), 'utf8') }))
  .map(({ file, src }) => ({ file, src, slug: /<EmailResultsButton[^>]*toolSlug="([^"]+)"/.exec(src)?.[1] }))
  .filter((x): x is { file: string; src: string; slug: string } => Boolean(x.slug));

describe('tool registry', () => {
  it('has an entry for every calculator that renders EmailResultsButton, and vice versa', () => {
    const fromSource = emailing.map((e) => e.slug).sort();
    expect(Object.keys(TOOL_REGISTRY).sort()).toEqual(fromSource);
    for (const e of emailing) expect(TOOL_REGISTRY[e.slug].component).toBe(e.file);
  });

  it('isKnownTool rejects prototype keys', () => {
    expect(isKnownTool('toString')).toBe(false);
    expect(isKnownTool('__proto__')).toBe(false);
    expect(isKnownTool('compound-interest')).toBe(true);
  });

  it('every template compiles and {item} templates carry no other tokens', () => {
    for (const [slug, entry] of Object.entries(TOOL_REGISTRY)) {
      for (const t of entry.labels) {
        const c = compileLabel(t);
        if (c.hasItem) {
          expect(t.match(/\{[^}]+\}/g)?.length, `${slug}: ${t}`).toBe(1);
          expect(entry.itemNoun, `${slug} needs itemNoun`).toBeTruthy();
        }
      }
    }
  });

  for (const { file, src, slug } of emailing) {
    it(`${file}: every label getInputs/getResults can send is allowed (${slug})`, () => {
      const bodies = [callbackBody(src, 'getInputs'), callbackBody(src, 'getResults')];
      expect(bodies[0].length, `${file}: getInputs not found`).toBeGreaterThan(0);
      expect(bodies[1].length, `${file}: getResults not found`).toBeGreaterThan(0);
      const problems: string[] = [];
      const ctx = newLabelContext();
      for (const expr of bodies.flatMap(labelExpressions)) {
        const isLiteral = /^(['"])(?:[^\\]|\\.)*\1$/.test(expr);
        if (isLiteral || /\?/.test(expr) && !expr.startsWith('`')) {
          // Literal, or a ternary of literals.
          const lits = stringLiterals(expr);
          if (!isLiteral && lits.length < 2) problems.push(`unrecognised conditional label: ${expr}`);
          for (const lit of lits) if (!matchLabel(slug, lit, ctx)) problems.push(`label not in registry: "${lit}"`);
          continue;
        }
        const known = DYNAMIC[slug]?.[expr];
        if (!known) {
          problems.push(`new dynamic label ${expr} -- add it to tool-registry.ts and DYNAMIC in this test`);
          continue;
        }
        for (const sample of known) if (!matchLabel(slug, sample, ctx)) problems.push(`sample "${sample}" for ${expr} not allowed`);
      }
      expect(problems).toEqual([]);
    });
  }
});
