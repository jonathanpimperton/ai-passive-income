import { describe, it, expect, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  maxDate,
  parseGitLog,
  parseGitLogFirstSeen,
  gitFileDates,
  gitDateOf,
  frontmatterValue,
  parseCalculatorMap,
  parseComponentMap,
  readComponentMap,
  buildLastmodMap,
  readGitDates,
} from './sitemap-lastmod.mjs';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const ROOT = resolve(__dirname, '../..');
const TODAY = new Date().toISOString().slice(0, 10);

function mdFiles(dir: string) {
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: `${dir}/${f}`, raw: readFileSync(join(ROOT, dir, f), 'utf8') }));
}

describe('maxDate', () => {
  it('returns the latest valid ISO date and ignores junk', () => {
    expect(maxDate('2026-03-01', undefined, null, '2026-07-07', 'not-a-date', '2026-05-01')).toBe('2026-07-07');
    expect(maxDate()).toBeUndefined();
    expect(maxDate(null, undefined)).toBeUndefined();
  });
});

describe('parseGitLog', () => {
  const log = [
    '\u0000ccc 2026-11-12',
    'src/a.md',
    '',
    '\u0000bbb 2026-07-07',
    'src/a.md',
    'src/b.md',
    '',
    '\u0000aaa 2026-03-01',
    'src/b.md',
    'src/c.md',
  ].join('\n');

  it('keeps the newest commit date per path', () => {
    const m = parseGitLog(log);
    expect(m.get('src/a.md')).toBe('2026-11-12');
    expect(m.get('src/b.md')).toBe('2026-07-07');
    expect(m.get('src/c.md')).toBe('2026-03-01');
  });

  it('treats paths last seen at a shallow-boundary commit as unknown', () => {
    // In a depth-2 clone "bbb" is the boundary: it appears to add every file.
    const shallow = parseGitLog(log.split('\u0000aaa')[0], new Set(['bbb']));
    expect(shallow.get('src/a.md')).toBe('2026-11-12'); // really changed inside the fetched history
    expect(shallow.get('src/b.md')).toBeNull(); // last change unknown
    expect(shallow.has('src/c.md')).toBe(false);
  });

  it('finds the creation date, unknown when it is a shallow boundary', () => {
    const first = parseGitLogFirstSeen(log);
    expect(first.get('src/a.md')).toBe('2026-07-07');
    expect(first.get('src/b.md')).toBe('2026-03-01');
    const shallow = parseGitLogFirstSeen(log.split('\u0000aaa')[0], new Set(['bbb']));
    expect(shallow.get('src/a.md')).toBeNull();
  });

  it('handles CRLF output', () => {
    const m = parseGitLog('\u0000abc 2026-01-02\r\nsrc/x.ts\r\n');
    expect(m.get('src/x.ts')).toBe('2026-01-02');
  });
});

describe('gitDateOf', () => {
  const dates = new Map<string, string | null>([
    ['src/components/homepage/A.astro', '2026-07-01'],
    ['src/components/homepage/B.tsx', '2026-07-03'],
    ['src/components/homepage/C.tsx', null],
    ['src/pages/index.astro', '2026-06-01'],
  ]);
  it('resolves a file', () => expect(gitDateOf(dates, 'src/pages/index.astro')).toBe('2026-06-01'));
  it('resolves the newest known file under a directory', () =>
    expect(gitDateOf(dates, 'src/components/homepage/')).toBe('2026-07-03'));
  it('returns undefined for unknown paths', () => {
    expect(gitDateOf(dates, 'src/nope.ts')).toBeUndefined();
    expect(gitDateOf(dates, 'src/components/homepage/C.tsx')).toBeUndefined();
  });
});

describe('frontmatterValue', () => {
  const raw = '---\ntitle: "A: B"\nslug: "x-y"\ndateModified: 2026-07-07\nlastUpdated: \'2026-03-04\'\n---\nbody slug: "nope"\n';
  it('reads quoted, unquoted and single-quoted values from the frontmatter only', () => {
    expect(frontmatterValue(raw, 'slug')).toBe('x-y');
    expect(frontmatterValue(raw, 'dateModified')).toBe('2026-07-07');
    expect(frontmatterValue(raw, 'lastUpdated')).toBe('2026-03-04');
    expect(frontmatterValue(raw, 'missing')).toBeUndefined();
  });
});

// The tool -> calculator component map has lived in two places: CALCULATOR_MAP
// inside the tool route (up to Nov 2026, still read when the IndexNow script
// rebuilds an old tree) and TOOL_COMPONENTS in src/lib/tool-islands.ts.
const ROUTE_FIXTURE = `---
import ToolPageLayout from '@components/ui/ToolPageLayout.astro';
const CALCULATOR_MAP: Record<string, string> = {
  'compound-interest': 'CompoundInterestCalc',
  'salary-uk': 'SalaryUkCalc',
};
const hasCalculator = slug in CALCULATOR_MAP;
---`;
const ISLANDS_FIXTURE = `/** TOOL_COMPONENTS: one source for three consumers. */
import type { CategorySlug } from './tools-data';

export const TOOL_COMPONENTS: Record<string, string> = {
  'compound-interest': 'CompoundInterestCalc',
  'salary-uk': 'SalaryUkCalc',
  "capital-gains-tax": "CapitalGainsTaxCalc",
};

export function isEmbeddable(category: CategorySlug, slug: string): boolean {
  return slug in TOOL_COMPONENTS;
}`;

describe('component map parsing (both formats)', () => {
  it('reads CALCULATOR_MAP from a tool route', () => {
    const map = parseCalculatorMap(ROUTE_FIXTURE);
    expect([...map]).toEqual([
      ['compound-interest', 'CompoundInterestCalc'],
      ['salary-uk', 'SalaryUkCalc'],
    ]);
  });

  it('reads TOOL_COMPONENTS from tool-islands.ts, anchored on the declaration', () => {
    const map = parseComponentMap(ISLANDS_FIXTURE, 'TOOL_COMPONENTS');
    expect(map.size).toBe(3);
    expect(map.get('capital-gains-tax')).toBe('CapitalGainsTaxCalc');
  });

  it('returns an empty map for a missing constant', () => {
    expect(parseComponentMap(ISLANDS_FIXTURE, 'NOPE').size).toBe(0);
  });
});

describe('readComponentMap (file precedence)', () => {
  const make = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'calcrun-lastmod-'));
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(join(dir, rel, '..'), { recursive: true });
      writeFileSync(join(dir, rel), body);
    }
    return dir;
  };
  const ROUTE = 'src/pages/tools/[category]/[tool].astro';
  const ISLANDS = 'src/lib/tool-islands.ts';

  it('prefers src/lib/tool-islands.ts when it exists', () => {
    const dir = make({ [ISLANDS]: ISLANDS_FIXTURE, [ROUTE]: '---\nconst x = 1;\n---' });
    try {
      expect(readComponentMap(dir).size).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to the route CALCULATOR_MAP (older trees)', () => {
    const dir = make({ [ROUTE]: ROUTE_FIXTURE });
    try {
      expect(readComponentMap(dir).get('salary-uk')).toBe('SalaryUkCalc');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is empty when neither exists', () => {
    const dir = make({ 'src/x.txt': '' });
    try {
      expect(readComponentMap(dir).size).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Fails loudly if the map moves or is renamed again: tool lastmods would
  // otherwise silently lose the calculator's commit date.
  it('finds a component for every calculator tool in this tree, each file present', () => {
    const map = readComponentMap(ROOT);
    expect(map.size).toBeGreaterThanOrEqual(40);
    for (const { raw } of mdFiles('src/data/tools')) {
      const slug = frontmatterValue(raw, 'slug')!;
      const component = map.get(slug);
      expect(component, `no calculator component mapped for ${slug}`).toBeTruthy();
      expect(existsSync(join(ROOT, 'src/components/tools', `${component}.tsx`)), component).toBe(true);
    }
  });
});

describe('buildLastmodMap (real content, injected git dates)', () => {
  const fakeGit = new Map<string, string | null>();
  for (const { file } of mdFiles('src/data/methodologies')) fakeGit.set(file, '2026-08-01');
  for (const { file } of mdFiles('src/data/tools')) fakeGit.set(file, '2026-01-01');
  fakeGit.set('src/components/tools/SalaryUkCalc.tsx', '2026-09-09');
  fakeGit.set('src/pages/about.astro', '2026-05-05');
  fakeGit.set('src/pages/index.astro', '2026-04-04');
  fakeGit.set('src/components/homepage/Hero.astro', '2026-06-06');
  const map = buildLastmodMap({ root: ROOT, gitDates: fakeGit });

  it('uses the editorial dateModified for scenarios and comparisons', () => {
    for (const dir of ['scenarios', 'comparisons']) {
      for (const { raw } of mdFiles(`src/data/${dir}`)) {
        const slug = frontmatterValue(raw, 'slug');
        expect(map.get(`/${dir}/${slug}/`), slug).toBe(frontmatterValue(raw, 'dateModified'));
      }
    }
  });

  it('uses the latest of lastUpdated, markdown and component for tools', () => {
    // The expectation is derived the way the sitemap derives it, from the same
    // three inputs, so editing a tool page's frontmatter (adding or dropping
    // lastUpdated) can never leave a hard-coded date behind.
    const components = readComponentMap(ROOT);
    for (const { file, raw } of mdFiles('src/data/tools')) {
      const slug = frontmatterValue(raw, 'slug')!;
      const category = frontmatterValue(raw, 'category');
      const component = components.get(slug);
      const expected = maxDate(
        frontmatterValue(raw, 'lastUpdated'),
        fakeGit.get(file),
        component ? fakeGit.get(`src/components/tools/${component}.tsx`) : undefined,
      );
      expect(expected, `${slug}: no date input at all`).toBeTruthy();
      expect(map.get(`/tools/${category}/${slug}/`), slug).toBe(expected);
    }
  });

  it('lets the calculator component date win when it is the newest input, and a newer lastUpdated beat both', () => {
    const git = new Map(fakeGit);
    const mdFile = 'src/data/tools/salary-uk.md';
    const raw = readFileSync(join(ROOT, mdFile), 'utf8');
    const lastUpdated = frontmatterValue(raw, 'lastUpdated');
    git.set('src/components/tools/SalaryUkCalc.tsx', '2099-01-02');
    const newerComponent = buildLastmodMap({ root: ROOT, gitDates: git });
    expect(newerComponent.get('/tools/income-and-planning/salary-uk/')).toBe('2099-01-02');
    // The markdown's own git date moves it too, whichever of the three is newest.
    git.set('src/components/tools/SalaryUkCalc.tsx', '2026-09-09');
    git.set(mdFile, '2099-03-04');
    const newerMarkdown = buildLastmodMap({ root: ROOT, gitDates: git });
    expect(newerMarkdown.get('/tools/income-and-planning/salary-uk/')).toBe('2099-03-04');
    // lastUpdated is an input too: with both git dates old, the page's own date (if it has one) decides.
    git.set(mdFile, '2000-01-01');
    git.set('src/components/tools/SalaryUkCalc.tsx', '2000-01-01');
    const oldGit = buildLastmodMap({ root: ROOT, gitDates: git });
    expect(oldGit.get('/tools/income-and-planning/salary-uk/')).toBe(maxDate(lastUpdated, '2000-01-01'));
  });

  it('uses the git date for methodology and template pages', () => {
    expect(map.get('/how-we-calculate/salary-uk/')).toBe('2026-08-01');
    expect(map.get('/about/')).toBe('2026-05-05');
    expect(map.get('/')).toBe('2026-06-06'); // homepage components count
  });

  it('uses the DATE_MODIFIED constant for hub pages', () => {
    const src = readFileSync(join(ROOT, 'src/pages/scenarios/uk-take-home-pay.astro'), 'utf8');
    const constDate = src.match(/const DATE_MODIFIED\s*=\s*'([^']+)'/)![1];
    expect(map.get('/scenarios/uk-take-home-pay/')).toBe(constDate);
  });

  it('dates index pages by their newest listed entry', () => {
    const newestComparison = maxDate(...mdFiles('src/data/comparisons').map(({ raw }) => frontmatterValue(raw, 'dateModified')));
    expect(map.get('/comparisons/')! >= newestComparison!).toBe(true);
  });

  it('never invents a date: no git date means no lastmod for git-dated pages', () => {
    const noGit = buildLastmodMap({ root: ROOT, gitDates: new Map() });
    expect(noGit.has('/how-we-calculate/salary-uk/')).toBe(false);
    expect(noGit.has('/about/')).toBe(false);
    // ...while editorially dated pages keep theirs
    expect(noGit.get('/scenarios/uk-take-home-pay/')).toBeTruthy();
    for (const d of noGit.values()) expect(d <= TODAY).toBe(true);
  });

  it('excludes the 404 page', () => {
    expect(map.has('/404/')).toBe(false);
  });
});

describe('buildLastmodMap (real git history)', () => {
  let shallow = true;
  try {
    shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim() === 'true';
  } catch {
    shallow = true;
  }

  it.skipIf(shallow)('gives methodology files a creation date no later than their last change', () => {
    const d = gitFileDates(ROOT, 'src/data/methodologies/salary-uk.md');
    expect(d.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.published! <= d.modified!).toBe(true);
    expect(gitFileDates(ROOT, 'src/data/nope.md')).toEqual({ published: undefined, modified: undefined });
  });

  it.skipIf(shallow)('dates every generated page, none in the future', () => {
    const map = buildLastmodMap({ root: ROOT, gitDates: readGitDates(ROOT) });
    const expected = new Set<string>(['/', '/tools/', '/scenarios/', '/comparisons/', '/about/', '/privacy/', '/terms/']);
    for (const { raw } of mdFiles('src/data/tools')) {
      expected.add(`/tools/${frontmatterValue(raw, 'category')}/${frontmatterValue(raw, 'slug')}/`);
    }
    for (const [dir, base] of [['scenarios', 'scenarios'], ['comparisons', 'comparisons'], ['methodologies', 'how-we-calculate']]) {
      for (const { raw } of mdFiles(`src/data/${dir}`)) expected.add(`/${base}/${frontmatterValue(raw, 'slug')}/`);
    }
    for (const path of expected) {
      expect(map.get(path), path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(map.get(path)! <= TODAY, path).toBe(true);
    }
  });
});
