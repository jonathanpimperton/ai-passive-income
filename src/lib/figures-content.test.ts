import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import type { Loader, LoaderContext } from 'astro/loaders';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { resolveFigureField, withRenderCheck } from './figures-content';
import { evaluateFigure } from './figures';

describe('resolveFigureField (frontmatter zod transform)', () => {
  const text = z.string().transform(resolveFigureField);

  it('resolves tokens in a frontmatter string', () => {
    const r = text.safeParse('{{ ukTakeHome(30000, plan=plan2) | gbp }}/year');
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe(`${evaluateFigure('ukTakeHome(30000, plan=plan2) | gbp')}/year`);
  });

  it('leaves token-free strings untouched and unescapes \\{{', () => {
    expect(text.parse('plain text')).toBe('plain text');
    expect(text.parse('literal \\{{ x }}')).toBe('literal {{ x }}');
  });

  it('turns every bad token into a schema issue (which fails the Astro build)', () => {
    const schema = z.object({ faq: z.array(z.object({ answer: text })) });
    const r = schema.safeParse({ faq: [{ answer: 'a {{ nope() | gbp }} b {{ 1 }}' }] });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues).toHaveLength(2);
    expect(r.error.issues[0].path).toEqual(['faq', 0, 'answer']);
    expect(r.error.issues[0].message).toMatch(/figure token \{\{ nope\(\) \| gbp \}\}: unknown function "nope"/);
    expect(r.error.issues[1].message).toMatch(/add a formatter/);
  });

  it('works inside unions and optionals the way content.config.ts uses it', () => {
    const inputs = z.record(z.string(), z.union([text, z.number()]));
    expect(inputs.parse({ a: 5, b: "{{ taxYear('uk') }}" })).toEqual({ a: 5, b: evaluateFigure("taxYear('uk')") });
    expect(text.optional().parse(undefined)).toBeUndefined();
  });
});

/* ── withRenderCheck ────────────────────────────────────── */

interface FakeEntry {
  id: string;
  filePath?: string;
  rendered?: { html: string };
  deferredRender?: boolean;
  data: Record<string, unknown>;
}

function fakeContext(root: string) {
  const map = new Map<string, FakeEntry>();
  const store = {
    values: () => [...map.values()],
    delete: (id: string) => void map.delete(id),
    set: (e: FakeEntry) => (map.set(e.id, e), true),
    has: (id: string) => map.has(id),
  };
  const context = { collection: 'scenarios', store, config: { root: pathToFileURL(root + '/') } } as unknown as LoaderContext;
  return { context, map, store };
}

function fakeLoader(entries: FakeEntry[]): Loader {
  return {
    name: 'glob-loader',
    load: async (ctx) => {
      for (const e of entries) (ctx.store as unknown as { set: (x: FakeEntry) => void }).set(e);
    },
  };
}

describe('withRenderCheck (body render failures fail the build)', () => {
  const root = join(process.cwd(), 'fake-root');

  it('passes when every Markdown entry rendered', async () => {
    const { context, map } = fakeContext(root);
    await withRenderCheck(
      fakeLoader([
        { id: 'a', filePath: 'src/data/scenarios/a.md', rendered: { html: '<p>ok</p>' }, data: {} },
        { id: 'b', filePath: 'src/data/scenarios/b.md', rendered: { html: '' }, data: {} },
        { id: 'c', filePath: 'src/data/x.json', data: {} },
        { id: 'd', filePath: 'src/data/d.mdx', deferredRender: true, data: {} },
      ]),
    ).load(context);
    expect(map.size).toBe(4);
  });

  it('throws, naming the file, and drops the broken entry so the next build re-renders it', async () => {
    const { context, map } = fakeContext(root);
    const reg = ((globalThis as Record<string, unknown>).__calcrunFigureErrors ??= new Map()) as Map<string, string[]>;
    reg.set(join(root, 'src/data/scenarios/bad.md'), ['src/data/scenarios/bad.md:12:3 figure token {{ x() }}: unknown function "x"']);
    const loader = withRenderCheck(
      fakeLoader([
        { id: 'good', filePath: 'src/data/scenarios/good.md', rendered: { html: '<p>ok</p>' }, data: {} },
        { id: 'bad', filePath: 'src/data/scenarios/bad.md', data: {} },
        { id: 'bad2', filePath: 'src/data/scenarios/bad2.md', data: {} },
      ]),
    );
    expect(loader.name).toBe('glob-loader');
    await expect(loader.load(context)).rejects.toThrow(
      /2 scenarios entries failed to render[\s\S]*bad\.md:12:3 figure token[\s\S]*bad2\.md: Markdown body failed to render/,
    );
    expect([...map.keys()]).toEqual(['good']);
  });
});
