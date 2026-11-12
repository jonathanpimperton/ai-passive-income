import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import {
  maxDate,
  parseGitLog,
  gitDateOf,
  frontmatterValue,
  parseCalculatorMap,
  buildLastmodMap,
  readGitDates,
} from './sitemap-lastmod.mjs';

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

describe('parseCalculatorMap', () => {
  it('reads the literal map from the tool route', () => {
    const src = readFileSync(join(ROOT, 'src/pages/tools/[category]/[tool].astro'), 'utf8');
    const map = parseCalculatorMap(src);
    expect(map.get('salary-uk')).toBe('SalaryUkCalc');
    expect(map.get('compound-interest')).toBe('CompoundInterestCalc');
    expect(map.size).toBeGreaterThanOrEqual(40);
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
    for (const { raw } of mdFiles('src/data/tools')) {
      const slug = frontmatterValue(raw, 'slug');
      const category = frontmatterValue(raw, 'category');
      const expected = slug === 'salary-uk' ? '2026-09-09' : maxDate(frontmatterValue(raw, 'lastUpdated'), '2026-01-01');
      expect(map.get(`/tools/${category}/${slug}/`), slug).toBe(expected);
    }
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
