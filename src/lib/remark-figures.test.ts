/**
 * remark-figures through Astro's own Markdown processor, configured like
 * astro.config.mjs (gfm + smartypants on, remark-figures, rehype-mono-figures).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkFigures, { remarkFiguresPlugin, figuresCacheKey, figureRenderErrors, substituteFigures } from './remark-figures.mjs';
import rehypeMonoFigures from './rehype-mono-figures.mjs';
import { evaluateFigure } from './figures';

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>>;
let dir: string;

beforeAll(async () => {
  processor = await createMarkdownProcessor({
    remarkPlugins: [remarkFiguresPlugin as never],
    rehypePlugins: [rehypeMonoFigures as never],
  });
  dir = mkdtempSync(join(tmpdir(), 'calcrun-figures-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const render = async (md: string, file?: string) =>
  (await processor.render(md, file ? ({ fileURL: pathToFileURL(file) } as never) : undefined)).code;

describe('remark-figures in the Astro Markdown pipeline', () => {
  it('resolves tokens in paragraphs and keeps the mono-figure styling on bold stats', async () => {
    const html = await render('**You take home {{ ukTakeHome(30000, plan=plan2) | gbp }} a year.**');
    const fig = evaluateFigure('ukTakeHome(30000, plan=plan2) | gbp');
    expect(html).toContain(`<strong>You take home <span class="tabular-nums">${fig}</span> a year.</strong>`);
    expect(html).not.toContain('{{');
  });

  it('resolves tokens inside table cells, including a | inside the token', async () => {
    const md = [
      '| Payment | Payoff time | Interest |',
      '|---|---|---|',
      '| $1,200 | {{ cardPayoff(50000, 22, 1200).months | months }} | {{ cardPayoff(50000, 22, 1200).interest | usd }} |',
    ].join('\n');
    const html = await render(md);
    expect(html).toContain(`<td>${evaluateFigure('cardPayoff(50000, 22, 1200).months | months')}</td>`);
    expect(html).toContain(`<td><span class="tabular-nums">${evaluateFigure('cardPayoff(50000, 22, 1200).interest | usd')}</span></td>`);
    expect((html.match(/<td>/g) ?? []).length).toBe(3);
  });

  it('quoted arguments survive smartypants, and \\{{ renders a literal {{', async () => {
    const html = await render("Year {{ taxYear('uk') }} and literal \\{{ braces }}.");
    expect(html).toContain(`Year ${evaluateFigure("taxYear('uk')")} and literal {{ braces }}.`);
  });

  it('a bad token rejects the render with file:line:column and the token', async () => {
    const file = join(dir, 'page.md');
    const md = 'First paragraph.\n\nSecond {{ ukTakeHome(30000, plan=plan9) | gbp }} line.';
    writeFileSync(file, `---\ntitle: "x"\nslug: "y"\n---\n\n${md}\n`);
    await expect(render(md, file)).rejects.toThrow(/page\.md:8:8 figure token \{\{ ukTakeHome\(30000, plan=plan9\) \| gbp \}\}: .*"plan" must be one of/);
    const messages = [...figureRenderErrors().entries()].find(([k]) => k.endsWith('page.md'))?.[1];
    expect(messages?.[0]).toMatch(/page\.md:8:8/);
  });

  it('reports every bad token in a body, not just the first', () => {
    expect(() => substituteFigures('{{ a() }} ok {{ 1 | gbp }} {{ b() }}', undefined)).toThrow(/a\(\)[\s\S]*b\(\)/);
  });

  it('a successful render clears earlier errors for that file', async () => {
    const file = join(dir, 'fixed.md');
    writeFileSync(file, 'x');
    await expect(render('{{ nope() }}', file)).rejects.toThrow();
    await render('{{ 1 | gbp }}', file);
    expect([...figureRenderErrors().keys()].some((k) => k.endsWith('fixed.md'))).toBe(false);
  });

  it('refuses to run without a parser', () => {
    expect(() => remarkFigures.call({ parser: undefined } as never)).toThrow(/after remark-parse/);
  });
});

describe('figuresCacheKey', () => {
  it('changes when an engine source changes, ignores tests', () => {
    const lib = join(dir, 'lib');
    mkdirSync(lib);
    writeFileSync(join(lib, 'engine.ts'), 'export const a = 1;');
    writeFileSync(join(lib, 'engine.test.ts'), 'test');
    const k1 = figuresCacheKey(lib);
    writeFileSync(join(lib, 'engine.test.ts'), 'test changed');
    expect(figuresCacheKey(lib)).toBe(k1);
    writeFileSync(join(lib, 'engine.ts'), 'export const a = 2;');
    expect(figuresCacheKey(lib)).not.toBe(k1);
  });

  it('the exported plugin entry carries the key for the Astro config digest', () => {
    expect(remarkFiguresPlugin[0]).toBe(remarkFigures);
    expect(remarkFiguresPlugin[1]).toEqual({ cacheKey: expect.stringMatching(/^[0-9a-f]{16}$/) });
    // JSON.stringify (how Astro digests the config) keeps the key and drops the function
    expect(JSON.stringify(remarkFiguresPlugin)).toContain((remarkFiguresPlugin[1] as { cacheKey: string }).cacheKey);
  });
});
