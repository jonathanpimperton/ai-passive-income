/**
 * Content scan: every figure token in src/data resolves (frontmatter and body),
 * so `npm test` catches a bad token in about a second, before a full build.
 *
 * Also a quick checker for content authors (docs/figures.md, "Checking your work"):
 *
 *   Git Bash:    FIG="ukTakeHome(30000, plan=plan2) | gbp" npx vitest run src/lib/figures-scan.test.ts
 *   PowerShell:  $env:FIG="ukTakeHome(30000, plan=plan2) | gbp"; npx vitest run src/lib/figures-scan.test.ts
 *
 *   FIG_FILE=src/data/scenarios/x.md npx vitest run src/lib/figures-scan.test.ts
 *     prints every token in that file (comma-separate several files) with its value.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { resolveFiguresDetailed, evaluateFigure } from './figures';
import { scanTokens } from './figure-parser';

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...markdownFiles(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

function lineOf(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

function problemsIn(file: string): string[] {
  const raw = readFileSync(file, 'utf8');
  const { problems } = resolveFiguresDetailed(raw);
  const shown = relative(process.cwd(), file).replace(/\\/g, '/');
  return problems.map((p) => `${shown}:${lineOf(raw, p.start)} ${p.message}`);
}

/** Frontmatter fields that refuse tokens (mirrors figureIdent() in src/content.config.ts). */
const IDENT_FIELDS = ['slug', 'toolSlug', 'toolCategory', 'datePublished', 'dateModified', 'lastUpdated', 'relatedTools', 'affiliatePrograms', 'url'];

/**
 * Tokens where the schema refuses them, found line by line in the frontmatter
 * (the build is the authority; this gives the same answer in a second):
 * a `{{` before a line's `key:` separator is a token in a KEY (e.g. an
 * `inputs` label), and identifier fields (including their list items) take none.
 */
function misplacedTokens(file: string): string[] {
  const raw = readFileSync(file, 'utf8');
  const fm = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!fm) return [];
  const shown = relative(process.cwd(), file).replace(/\\/g, '/');
  const out: string[] = [];
  let listOwner = '';
  fm[1].split(/\r?\n/).forEach((line, i) => {
    const lineNo = i + 2;
    const body = line.replace(/^\s*-\s+/, '');
    const sep = body.search(/:(\s|$)/);
    const key = sep >= 0 ? body.slice(0, sep).trim().replace(/^["']|["']$/g, '') : '';
    if (sep >= 0 && !/^\s*-\s/.test(line)) listOwner = key;
    const tok = body.indexOf('{{');
    if (tok === -1) return;
    if (sep >= 0 && tok < sep) out.push(`${shown}:${lineNo} token in a key ("${key}"); keys are labels, put figures in the value`);
    else if (IDENT_FIELDS.includes(key) || (sep === -1 && IDENT_FIELDS.includes(listOwner))) {
      out.push(`${shown}:${lineNo} token in identifier field "${key || listOwner}"`);
    }
  });
  return out;
}

const only = process.env.FIG_FILE?.split(',').map((s) => s.trim()).filter(Boolean);

describe('figure tokens in content', () => {
  const files = only ?? markdownFiles(join(process.cwd(), 'src', 'data'));

  it('every token in src/data resolves', () => {
    const problems = files.flatMap(problemsIn);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('no token sits where the schema refuses it (keys, identifier fields)', () => {
    const problems = files.flatMap(misplacedTokens);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('the misplaced-token check catches keys, identifier fields and their list items', () => {
    const dir = mkdtempSync(join(tmpdir(), 'calcrun-scan-'));
    const file = join(dir, 'x.md');
    writeFileSync(
      file,
      [
        '---',
        'slug: "x-{{ taxYear(uk) }}"',
        'resultSummary: "{{ taxYear(uk) }}: fine"',
        'inputs:',
        '  "{{ taxYear(uk) }} year": "label token"',
        '  Tax Year: "{{ taxYear(uk) }}"',
        'affiliatePrograms:',
        '  - "{{ taxYear(uk) }}"',
        'keywords:',
        '  - "{{ taxYear(uk) }} is fine here"',
        '---',
        'Body {{ taxYear(uk) }}',
      ].join('\n'),
    );
    try {
      const found = misplacedTokens(file);
      expect(found).toHaveLength(3);
      expect(found[0]).toMatch(/:2 token in identifier field "slug"/);
      expect(found[1]).toMatch(/:5 token in a key/);
      expect(found[2]).toMatch(/:8 token in identifier field "affiliatePrograms"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!only)('FIG_FILE: print every token with its value', () => {
    for (const file of files) {
      const raw = readFileSync(file, 'utf8');
      const lines = scanTokens(raw).tokens.map((t) => {
        let value: string;
        try {
          value = evaluateFigure(t.inner);
        } catch (e) {
          value = `ERROR ${(e as Error).message}`;
        }
        return `${String(lineOf(raw, t.start)).padStart(4)}  {{${t.inner}}}  ->  ${value}`;
      });
      process.stdout.write(`\n${file}\n${lines.join('\n') || '  (no tokens)'}\n`);
    }
  });

  it.skipIf(!process.env.FIG)('FIG: evaluate a token from the environment', () => {
    for (const src of (process.env.FIG ?? '').split(/\r?\n|;;/).filter((s) => s.trim())) {
      let out: string;
      try {
        out = evaluateFigure(src);
      } catch (e) {
        out = `ERROR ${(e as Error).message}`;
      }
      process.stdout.write(`{{ ${src.trim()} }}  ->  ${out}\n`);
    }
  });
});
