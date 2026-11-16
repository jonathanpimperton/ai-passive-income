/**
 * The figure engine must refuse to print a 401(k) limit the IRS has not
 * published yet (the rates module then carries the prior year's values with
 * `published: false`). Real data only has that state for a few weeks a year,
 * so this file mocks the 2027 dataset as unpublished to keep the guard covered
 * whatever the live rates say.
 */
import { describe, it, expect, vi } from 'vitest';
import { evaluateFigure as f, FigureError } from './figures';

vi.mock('./us-rates', async (importOriginal) => {
  const real = await importOriginal<typeof import('./us-rates')>();
  return {
    ...real,
    getUsRates: (year: Parameters<typeof real.getUsRates>[0]) => {
      const rates = real.getUsRates(year);
      if (year !== 2027) return rates;
      return {
        ...rates,
        retirement401k: { ...real.getUsRates(2026).retirement401k, published: false },
      };
    },
  };
});

describe('unpublished 401(k) limits', () => {
  const cases: Array<[string, RegExp]> = [
    ["usFact('k401Limit', year=2027) | usd", /has not published the 2027 401\(k\) limits/],
    ['usTakeHome(100000, k401=30, year=2027) | usd', /has not published the 2027 401\(k\) limit/],
  ];
  for (const [src, re] of cases) {
    it(src, () => {
      let caught: unknown;
      try {
        f(src);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(FigureError);
      expect((caught as FigureError).message).toMatch(re);
      expect((caught as FigureError).message.startsWith(`{{ ${src} }}`)).toBe(true);
    });
  }

  it('still prints a published year', () => {
    expect(() => f("usFact('k401Limit', year=2026) | usd")).not.toThrow();
  });

  it('allows a contribution under the carried limit', () => {
    expect(() => f('usTakeHome(100000, k401=10, year=2027) | usd')).not.toThrow();
  });
});
