import { describe, it, expect } from 'vitest';
import { formatCurrency } from './calculator-utils';
import { solveUkAffordability } from './mortgage-affordability';
import { ukCheckName, ukCheckedPaymentLabel, ukResultItems, ukStressTestInput, type UkStressSettings } from './affordability-report';

const fmt = (v: number) => formatCurrency(v, 'GBP');
const BASE = { region: 'uk' as const, annualIncome: 80_000, monthlyDebts: 0, deposit: 40_000, termYears: 25 };

describe('UK report wording with a stress test (margin > 0)', () => {
  const s: UkStressSettings = { stressMarginPct: 1, ratePct: 5.39, revertRatePct: 6.58, maxShareOfTakeHomePct: 50 };
  const r = solveUkAffordability({ ...BASE, ratePct: 5.39, stressMarginPct: 1 });

  it('emailed input describes the stress rate', () => {
    const line = ukStressTestInput(s, r.stressRatePct);
    expect(line.label).toBe('Stress Test');
    expect(line.value).toBe('7.58% (the higher of your 5.39% rate and the 6.58% average standard variable rate, + 1 pt); max 50% of take-home pay');
  });

  it('emailed results include the stressed payment and its share of take-home', () => {
    const items = ukResultItems(r, s, fmt);
    expect(items.map((i) => i.label)).toEqual([
      'Monthly Payment at 5.39%',
      'Payment at Stress Rate 7.58%',
      'Stress test: Share of Take-Home Pay',
      'Income Multiple',
    ]);
    expect(items[1].value).toBe(fmt(r.stressedPayment));
    expect(items[2].value).toBe(`${r.stressedShareOfTakeHome.toFixed(1)}%`);
  });

  it('on-screen labels say stress', () => {
    expect(ukCheckedPaymentLabel(s, r.stressRatePct)).toBe('Payment at stress rate 7.58%');
    expect(ukCheckName(s)).toBe('Stress test');
  });
});

describe('UK report wording with no stress test (margin 0, 5-year-plus fix)', () => {
  const s: UkStressSettings = { stressMarginPct: 0, ratePct: 5.19, revertRatePct: 6.58, maxShareOfTakeHomePct: 50 };
  const r = solveUkAffordability({ ...BASE, ratePct: 5.19, stressMarginPct: 0 });

  it('emailed input says there is no stress test', () => {
    const line = ukStressTestInput(s, r.stressRatePct);
    expect(line.value).toBe('None (fixed 5+ years): payment checked at your 5.19% rate; max 50% of take-home pay');
    expect(line.value).not.toMatch(/SVR|standard variable|\+ 0 pt/);
  });

  it('emailed results never mention a stress rate', () => {
    const items = ukResultItems(r, s, fmt);
    for (const i of items) expect(`${i.label} ${i.value}`).not.toMatch(/stress/i);
    expect(items.map((i) => i.label)).toEqual([
      'Monthly Payment at 5.19%',
      'Payment check: Share of Take-Home Pay',
      'Income Multiple',
    ]);
    expect(items[1].value).toBe(`${r.shareOfTakeHome.toFixed(1)}%`);
  });

  it('on-screen labels say payment check', () => {
    expect(ukCheckedPaymentLabel(s, r.stressRatePct)).toBe('Payment check at 5.19%');
    expect(ukCheckName(s)).toBe('Payment check');
  });
});
