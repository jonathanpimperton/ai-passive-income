/**
 * SSR smoke tests for the property and loan calculators (W1-PROP) and their
 * shared helpers. Vitest runs in node, so components render with
 * react-dom/server; that also proves they render on the server.
 *
 * Checks the per-calculator spec (plan 5.4): no aria-live on the whole
 * results panel (one compact role=status instead), charts arrive lazily
 * behind a data-chart-pending skeleton, no top-level recharts / ClientChart /
 * ChartTooltip import in the calculator files, and sensible default headlines.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RentVsBuyCalc from './RentVsBuyCalc';
import MortgageAffordabilityCalc from './MortgageAffordabilityCalc';
import MortgagePaymentCalc from './MortgagePaymentCalc';
import CarFinanceCalc from './CarFinanceCalc';
import LoanAmortizationCalc from './LoanAmortizationCalc';
import { Collapse, DeferredChart, ResultAnnouncer, compactCurrency } from './property-shared';

const CALCS = {
  RentVsBuyCalc,
  MortgageAffordabilityCalc,
  MortgagePaymentCalc,
  CarFinanceCalc,
  LoanAmortizationCalc,
} as const;

const render = (c: (props: Record<string, unknown>) => unknown, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(c as never, props));

/** Text content of the element carrying data-headline-result. */
function headline(html: string): string {
  const m = html.match(/<p[^>]*data-headline-result[^>]*>([\s\S]*?)<\/p>/);
  if (!m) throw new Error('no headline');
  return m[1].replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
}

describe.each(Object.entries(CALCS))('%s', (name, Calc) => {
  const html = render(Calc);

  it('renders a headline result on the server', () => {
    expect(headline(html).length).toBeGreaterThan(0);
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('announces through one compact role=status, not an aria-live results panel', () => {
    const live = html.match(/aria-live="polite"/g) ?? [];
    const status = html.match(/role="status"/g) ?? [];
    expect(live.length).toBe(1);
    expect(status.length).toBe(1);
  });

  it('server-renders a chart skeleton (data-chart-pending), never the chart', () => {
    expect(html).toContain('data-chart-pending');
    expect(html).not.toContain('recharts-wrapper');
  });

  it('does not import recharts, ClientChart or ChartTooltip at top level', () => {
    const src = readFileSync(resolve(__dirname, `${name}.tsx`), 'utf8');
    expect(src).not.toMatch(/from ['"]recharts['"]/);
    expect(src).not.toMatch(/import\s+ClientChart\b/);
    expect(src).not.toMatch(/import\s+ChartTooltip\b/);
    expect(src).toMatch(/lazy\(\(\) => import\('\.\/charts\//);
  });

  it('keeps collapsed panels inert and hidden', () => {
    const collapsed = html.match(/<div[^>]*inert=""[^>]*>/g) ?? [];
    for (const tag of collapsed) expect(tag).toContain('aria-hidden="true"');
    if (name !== 'MortgagePaymentCalc') expect(collapsed.length).toBeGreaterThan(0);
  });
});

describe('default headlines (USD on the server)', () => {
  it('mortgage payment: P&I at the market rate, $280k loan', () => {
    // $280,000 at 7.11% over 30 years = $1,883.62 -> "$1,884"
    expect(headline(render(MortgagePaymentCalc))).toBe('$1,884');
  });

  it('mortgage payment honours the defaults prop (hub: 0% down, 7%)', () => {
    const html = render(MortgagePaymentCalc, { defaults: { downPaymentPercent: 0, interestRate: 7 } });
    // $350,000 loan at 7% = $2,328.56, the hub table's figure (CONTENT-06)
    expect(headline(html)).toBe('$2,329');
  });

  it('affordability: front-end-capped price, not the old 36%-only figure', () => {
    const h = headline(render(MortgageAffordabilityCalc));
    const value = Number(h.replace(/[^0-9]/g, ''));
    expect(value).toBeGreaterThan(200_000);
    expect(value).toBeLessThan(322_817); // the old overstated figure at $0 debts
  });

  it('rent vs buy states a verdict in words', () => {
    const html = render(RentVsBuyCalc);
    expect(html).toMatch(/Over 10 years, (buying|renting) leaves you better off by|come out even/);
  });

  it('loan amortization: $300k over 30 years at the market rate', () => {
    // $300,000 at 7.11% = $2,018.17
    expect(headline(render(LoanAmortizationCalc))).toBe('$2,018');
  });

  it('car finance marks exactly one cheapest option', () => {
    const html = render(CarFinanceCalc);
    expect(html.match(/Best Value/g) ?? []).toHaveLength(1);
  });
});

describe('property-shared helpers', () => {
  it('compactCurrency puts the sign before the symbol (CALC-UX-A-16)', () => {
    expect(compactCurrency(-700_000, 'USD')).toBe('-$700K');
    expect(compactCurrency(350_000, 'GBP')).toBe('£350K');
    expect(compactCurrency(-8_000_000, 'USD')).toBe('-$8M');
    expect(compactCurrency(1_250_000, 'EUR')).toBe('€1.3M');
    expect(compactCurrency(950, 'USD')).toBe('$950');
    expect(compactCurrency(0, 'USD')).toBe('$0');
    expect(compactCurrency(Number.NaN, 'USD')).toBe('');
  });

  it('Collapse is inert and aria-hidden only while closed', () => {
    const closed = renderToStaticMarkup(createElement(Collapse, { open: false, id: 'x', children: 'hi' }));
    expect(closed).toMatch(/id="x"[^>]*inert=""/);
    expect(closed).toContain('aria-hidden="true"');
    const open = renderToStaticMarkup(createElement(Collapse, { open: true, id: 'x', children: 'hi' }));
    expect(open).not.toContain('inert');
    expect(open).not.toContain('aria-hidden');
  });

  it('DeferredChart renders only the skeleton on the server', () => {
    const html = renderToStaticMarkup(createElement(DeferredChart, { height: 200, children: createElement('div', { id: 'real' }) }));
    expect(html).toContain('data-chart-pending');
    expect(html).not.toContain('id="real"');
  });

  it('ResultAnnouncer is a polite, atomic, visually hidden status', () => {
    const html = renderToStaticMarkup(createElement(ResultAnnouncer, { text: 'Hello.' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('sr-only');
    expect(html).toContain('Hello.');
  });
});
