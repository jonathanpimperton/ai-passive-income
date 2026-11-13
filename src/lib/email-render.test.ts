/**
 * Renders every calculator that offers "Email my results" on the server (react-dom/server,
 * no browser), in USD, GBP and EUR, and runs its REAL getInputs()/getResults() through the
 * worker's sanitiser. Nothing may be dropped. This is the ground truth for the static scan in
 * tool-registry.test.ts: it exercises the actual formatters, helpers and per-currency
 * wording, but only in each calculator's default state (server render: no effects, no
 * interaction), so the branches that only show other states are covered by the static scan.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeRows } from './email-sanitize';
import { TOOL_REGISTRY } from './tool-registry';

const state = vi.hoisted(() => ({ currency: 'USD', captured: [] as Array<Record<string, unknown>> }));

vi.mock('../components/ui/EmailResultsButton', () => ({
  default: (props: Record<string, unknown>) => {
    state.captured.push(props);
    return null;
  },
}));
vi.mock('../components/ui/CurrencySelector', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/ui/CurrencySelector')>();
  return { ...original, useCurrency: () => ({ currency: state.currency, setCurrency: () => {} }) };
});

const TOOLS_DIR = join(__dirname, '..', 'components', 'tools');
const emailing = readdirSync(TOOLS_DIR)
  .filter((f) => f.endsWith('.tsx'))
  .map((file) => ({ file, slug: /<EmailResultsButton[^>]*toolSlug="([^"]+)"/.exec(readFileSync(join(TOOLS_DIR, file), 'utf8'))?.[1] }))
  .filter((x): x is { file: string; slug: string } => Boolean(x.slug));

describe('real calculator rows survive the sanitiser', () => {
  beforeEach(() => {
    state.captured = [];
  });

  it('finds the calculators', () => {
    expect(emailing.map((e) => e.slug).sort()).toEqual(Object.keys(TOOL_REGISTRY).sort());
  });

  for (const { file, slug } of emailing) {
    for (const currency of ['USD', 'GBP', 'EUR']) {
      it(`${slug} in ${currency}`, async () => {
        state.currency = currency;
        const mod = await import(`../components/tools/${file}`);
        renderToString(createElement(mod.default));
        const props = state.captured.find((p) => p.toolSlug === slug);
        expect(props, `${file} did not render EmailResultsButton`).toBeTruthy();
        const inputs = (props!.getInputs as () => unknown[])();
        const results = (props!.getResults as () => unknown[])();
        const out = sanitizeRows(slug, inputs, results);
        const dropped = [...inputs, ...results]
          .map((r) => r as { label: string; value: string })
          .filter((row) => sanitizeRows(slug, [row], []).inputs.length === 0)
          .map((row) => `${row.label}: ${row.value}`);
        expect(dropped, `${slug}/${currency}: rows the worker would drop`).toEqual([]);
        expect(out.dropped).toBe(0);
        expect(out.results.length).toBeGreaterThan(0);
      });
    }
  }
});
