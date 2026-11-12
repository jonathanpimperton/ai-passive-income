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
import { readdirSync, readFileSync, statSync } from 'node:fs';
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

const only = process.env.FIG_FILE?.split(',').map((s) => s.trim()).filter(Boolean);

describe('figure tokens in content', () => {
  const files = only ?? markdownFiles(join(process.cwd(), 'src', 'data'));

  it('every token in src/data resolves', () => {
    const problems = files.flatMap(problemsIn);
    expect(problems, problems.join('\n')).toEqual([]);
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
