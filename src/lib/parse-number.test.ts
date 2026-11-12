import { describe, it, expect } from 'vitest';
import { parseNumericInput, formatForInput, type ParseFailureReason } from './parse-number';

type Ok = [input: string, expected: number];
type Bad = [input: string, reason: ParseFailureReason];

function expectValue(input: string, expected: number, opts = {}) {
  const r = parseNumericInput(input, opts);
  expect(r, `"${input}" ${JSON.stringify(opts)}`).toEqual({ ok: true, value: expected });
}
function expectFail(input: string, reason: ParseFailureReason, opts = {}) {
  const r = parseNumericInput(input, opts);
  expect({ ok: r.ok, reason: r.ok ? undefined : r.reason }, `"${input}" ${JSON.stringify(opts)}`).toEqual({ ok: false, reason });
}

describe('parseNumericInput: review regressions (CALC-UX-A-01, CALC-UX-B-01)', () => {
  // Every input listed in the two findings, with the value a person meant.
  const usdGbp: Ok[] = [
    ['50,000', 50000],
    ['£50,000', 50000],
    ['$50,000', 50000],
    ['£425,000', 425000],
    ['50k', 50000],
    ['£50k', 50000],
    ['$50k', 50000],
    ['50000', 50000],
    ['50 000', 50000],
    ['52.000', 52], // USD/GBP convention: a dot is a decimal point
  ];
  it.each(usdGbp)('USD/GBP %s -> %d', (input, expected) => {
    expectValue(input, expected, { currency: 'USD' });
    expectValue(input, expected, { currency: 'GBP' });
  });

  it('rejects "1e9" instead of reading 19', () => expectFail('1e9', 'invalid'));
  it('rejects "1.000.000,50" in USD instead of reading 1', () =>
    expectFail('1.000.000,50', 'invalid', { currency: 'USD' }));

  const eur: Ok[] = [
    ['450.000', 450000],
    ['25.000', 25000],
    ['1.000.000,50', 1000000.5],
    ['52.000', 52000],
  ];
  it.each(eur)('EUR %s -> %d', (input, expected) => expectValue(input, expected, { currency: 'EUR' }));
});

describe('parseNumericInput: USD/GBP convention', () => {
  const ok: Ok[] = [
    ['0', 0],
    ['7', 7],
    ['1,234,567.89', 1234567.89],
    ['1,000', 1000],
    ['999,999', 999999],
    ['1234567', 1234567],
    ['12.5', 12.5],
    ['0.125', 0.125],
    ['.5', 0.5],
    ['50.', 50],
    ['  50  ', 50],
    ['+50', 50],
    ['£ 50,000.00', 50000],
    ['50,000 GBP', 50000],
    ['USD 1,200', 1200],
    ['usd1200', 1200],
    ['6.5%', 6.5],
    ['1.5m', 1500000],
    ['1.15M', 1150000], // exact, not 1149999.9999999998
    ['2bn', 2000000000],
    ['2BN', 2000000000],
    ['2.5 k', 2500],
    ['10K', 10000],
    ['1,250k', 1250000],
    ['50 000', 50000], // no-break space (fr-FR formatter output)
    ['1 000 000', 1000000], // narrow no-break space
    ['1 234 567.5', 1234567.5],
    ['-0', 0],
  ];
  it.each(ok)('%s -> %d', (input, expected) => expectValue(input, expected));

  const bad: Bad[] = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['$', 'empty'],
    ['%', 'empty'],
    ['12,34', 'ambiguous'],
    ['0,125', 'ambiguous'],
    ['1234,567', 'ambiguous'],
    ['1,0000', 'ambiguous'],
    [',5', 'ambiguous'],
    ['1.2.3', 'invalid'],
    ['1,23,456', 'invalid'],
    ['1,000,00', 'invalid'],
    ['1.000,5', 'invalid'],
    ['1e9', 'invalid'],
    ['1E3', 'invalid'],
    ['Infinity', 'invalid'],
    ['NaN', 'invalid'],
    ['0x10', 'invalid'],
    ['abc', 'invalid'],
    ['50abc', 'invalid'],
    ['5 0', 'invalid'],
    ['50 00', 'invalid'],
    ['--50', 'invalid'],
    ['50-', 'invalid'],
    ['-', 'invalid'],
    ['k', 'invalid'],
    ['5mm', 'invalid'],
    ['50km', 'invalid'],
    ['.', 'invalid'],
    [',', 'invalid'],
    ['١٢', 'invalid'], // non-ASCII digits are not silently accepted
  ];
  it.each(bad)('%s -> %s', (input, reason) => expectFail(input, reason));
});

describe('parseNumericInput: EUR convention', () => {
  const opts = { currency: 'EUR' };
  const ok: Ok[] = [
    ['12,5', 12.5],
    ['12,34', 12.34],
    ['0,125', 0.125],
    [',5', 0.5],
    ['50,00', 50],
    ['1.234,567', 1234.567], // dots present, so the comma is unambiguously decimal
    ['12.5', 12.5], // lone dot that cannot be thousands -> decimal point
    ['0.125', 0.125],
    ['100.000', 100000],
    ['€ 1.500', 1500],
    ['1.500 €', 1500],
    ['1,5m', 1500000],
    ['1.5m', 1500000],
    ['50 000', 50000],
    ['1 234,5', 1234.5],
    ['3,25%', 3.25],
  ];
  it.each(ok)('%s -> %d', (input, expected) => expectValue(input, expected, opts));

  const bad: Bad[] = [
    ['50,000', 'ambiguous'], // continental 50 vs Irish 50,000
    ['450,000', 'ambiguous'],
    ['1,2,3', 'invalid'],
    ['1,000.5', 'invalid'],
    ['1.23.456', 'invalid'],
    ['1e9', 'invalid'],
  ];
  it.each(bad)('%s -> %s', (input, reason) => expectFail(input, reason, opts));
});

describe('parseNumericInput: negatives', () => {
  it('rejects negatives by default with a specific reason', () => {
    expectFail('-50', 'negative');
    expectFail('−50', 'negative'); // Unicode minus
    expectFail('-$50', 'negative');
    expectFail('$-50', 'negative');
  });
  it('accepts negatives when allowed', () => {
    expectValue('-50', -50, { allowNegative: true });
    expectValue('-$1,250.75', -1250.75, { allowNegative: true });
    expectValue('− 2.5k', -2500, { allowNegative: true });
    expectValue('-1.000,5', -1000.5, { allowNegative: true, currency: 'EUR' });
  });
});

describe('parseNumericInput: robustness', () => {
  it('handles null/undefined as empty', () => {
    expect(parseNumericInput(null)).toEqual({ ok: false, reason: 'empty' });
    expect(parseNumericInput(undefined)).toEqual({ ok: false, reason: 'empty' });
  });
  it('treats unknown currency codes as the USD/GBP convention', () => {
    expectValue('50,000', 50000, { currency: 'JPY' });
  });
  it('never returns NaN or Infinity for 2,000 random inputs', () => {
    const alphabet = '0123456789.,-+ $£€%kmbnKMBe';
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let i = 0; i < 2000; i++) {
      const len = 1 + Math.floor(rand() * 12);
      let s = '';
      for (let j = 0; j < len; j++) s += alphabet[Math.floor(rand() * alphabet.length)];
      for (const currency of ['USD', 'EUR']) {
        const r = parseNumericInput(s, { currency, allowNegative: true });
        if (r.ok) expect(Number.isFinite(r.value), `"${s}" ${currency}`).toBe(true);
      }
    }
  });
  it('round-trips Intl-formatted values in each currency convention', () => {
    const samples = [0, 7, 999, 1000, 50000, 425000, 1234567.89, 10000000];
    for (const v of samples) {
      const us = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
      const gb = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);
      const de = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
      expectValue(us, v, { currency: 'USD' });
      expectValue(gb, v, { currency: 'GBP' });
      // de-DE "50.000,00 €" is unambiguous because of the 2-digit decimals.
      expectValue(de, v, { currency: 'EUR' });
    }
  });
});

describe('parseNumericInput: range-aware disambiguation (min/max)', () => {
  const rate = { min: 0, max: 15 };
  const salary = { min: 10000, max: 1000000 };
  const price = { min: 0, max: 10000000 };
  it('EUR rate fields read 3-decimal values as decimals when only that reading is in range', () => {
    expectValue('6.125', 6125, { currency: 'EUR' }); // no range: plan rule (dot + 3 digits = thousands)
    // A valid reading above max is returned as typed (caller clamps and explains), never shrunk 1000x.
    expectValue('6.125', 6125, { currency: 'EUR', ...rate });
    expectValue('4.125%', 4125, { currency: 'EUR', ...rate });
    expectFail('3,875', 'ambiguous', { currency: 'EUR' });
    expectValue('3,875', 3.875, { currency: 'EUR', ...rate });
  });
  it('EUR "50,000" resolves by range, stays ambiguous when both readings fit', () => {
    expectValue('50,000', 50000, { currency: 'EUR', ...salary });
    expectFail('50,000', 'ambiguous', { currency: 'EUR', ...price });
    expectValue('50,000', 50, { currency: 'EUR', min: 0, max: 100 });
  });
  it('keeps the convention reading when both readings are in range', () => {
    expectValue('450.000', 450000, { currency: 'EUR', ...price }); // plan-mandated
    expectValue('1,500', 1500, { currency: 'USD', ...price });
  });
  it('USD/GBP fields accept a continental reading only when it alone is in range', () => {
    expectValue('52.000', 52, { currency: 'GBP' });
    expectValue('52.000', 52000, { currency: 'GBP', ...salary });
    expectValue('6,125', 6125, { currency: 'USD', ...rate }); // valid USD reading above max: as typed
    expectFail('12,34', 'ambiguous', { currency: 'USD' });
    expectValue('12,34', 12.34, { currency: 'USD', min: 0, max: 100 });
    expectValue('1,000.50', 1000.5, { currency: 'EUR', ...price }); // English format in EUR mode
  });
  it('returns the convention reading (for the caller to clamp) when neither reading is in range', () => {
    expectValue('99', 99, { currency: 'USD', ...rate });
    expectValue('450.000', 450000, { currency: 'EUR', ...rate });
    expectFail('50,000', 'ambiguous', { currency: 'EUR', min: 200, max: 300 });
  });
  it('compares signed values against the range', () => {
    expectValue('-6.125', -6.125, { currency: 'EUR', allowNegative: true, min: -15, max: 15 });
    expectFail('-5', 'negative', { min: -10, max: 10 }); // range never overrides allowNegative
  });
  it('never replaces a valid reading above max with a smaller one (R0 re-review S1 repros)', () => {
    expectValue('50,000', 50000, { currency: 'USD', min: 0, max: 5000 }); // affordability "monthly debts"
    expectValue('$6,000', 6000, { currency: 'USD', min: 0, max: 5000 });
    expectValue('12,000', 12000, { currency: 'GBP', min: 0, max: 10000 });
    expectValue('75,000', 75000, { currency: 'USD', min: 0, max: 50000 });
    expectValue('60.000', 60000, { currency: 'EUR', min: 0, max: 50000 });
  });
  it('property: grouped text above max in its own convention never comes back as a different number', () => {
    const conventions: Array<[string, string]> = [['en-US', 'USD'], ['en-GB', 'GBP'], ['de-DE', 'EUR']];
    const maxes = [15, 100, 5000, 10000, 50000, 1000000];
    let seed = 99;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let checked = 0;
    for (const max of maxes) {
      for (let i = 0; i < 1000; i++) {
        const v = Math.round(max * (1 + rand() * 20));
        for (const [locale, currency] of conventions) {
          const text = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(v);
          const r = parseNumericInput(text, { currency, min: 0, max });
          if (r.ok) expect(r.value, `${text} ${currency} max=${max}`).toBe(v);
          else expect(r.reason, `${text} ${currency} max=${max}`).toBe('ambiguous');
          checked++;
        }
      }
    }
    expect(checked).toBe(18000);
  });
  it('failures carry the valid readings as candidates for a "Did you mean" prompt', () => {
    expect(parseNumericInput('50,000', { currency: 'EUR' })).toEqual({ ok: false, reason: 'ambiguous', candidates: [50, 50000] });
    expect(parseNumericInput('12,34', { currency: 'USD' })).toEqual({ ok: false, reason: 'ambiguous', candidates: [12.34] });
    expect(parseNumericInput('1,000.50', { currency: 'EUR' })).toEqual({ ok: false, reason: 'invalid', candidates: [1000.5] });
    expect(parseNumericInput('1.2.3', { currency: 'USD' })).toEqual({ ok: false, reason: 'invalid' });
    expect(parseNumericInput('abc')).toEqual({ ok: false, reason: 'invalid' });
  });
  it('ignores non-finite bounds', () => {
    expectValue('6.125', 6125, { currency: 'EUR', min: Number.NaN, max: Infinity });
  });
});

describe('formatForInput (inverse)', () => {
  it('writes plain, ungrouped, exponent-free text in each convention', () => {
    expect(formatForInput(50000, 'USD')).toBe('50000');
    expect(formatForInput(6.125, 'USD')).toBe('6.125');
    expect(formatForInput(6.125, 'EUR')).toBe('6,1250');
    expect(formatForInput(6.12, 'EUR')).toBe('6,12');
    expect(formatForInput(0.125, 'EUR')).toBe('0,125');
    expect(formatForInput(-1234.5, 'EUR')).toBe('-1234,5');
    expect(formatForInput(1e21, 'USD')).toBe('1000000000000000000000');
    expect(formatForInput(1.5e-7, 'GBP')).toBe('0.00000015');
    expect(formatForInput(-0, 'USD')).toBe('0');
    expect(formatForInput(Number.NaN, 'USD')).toBe('');
    expect(formatForInput(Infinity, 'EUR')).toBe('');
  });
  it('round-trips 30,000 values (0-6 decimals, +/-, USD/GBP/EUR), with and without a containing range', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let i = 0; i < 10000; i++) {
      const decimals = Math.floor(rand() * 7);
      const magnitude = 10 ** Math.floor(rand() * 10);
      const v = (rand() < 0.2 ? -1 : 1) * Math.round(rand() * magnitude * 10 ** decimals) / 10 ** decimals;
      for (const currency of ['USD', 'GBP', 'EUR']) {
        const text = formatForInput(v, currency);
        const plain = parseNumericInput(text, { currency, allowNegative: true });
        expect(plain, `${v} ${currency} "${text}"`).toEqual({ ok: true, value: v === 0 ? 0 : v });
        const ranged = parseNumericInput(text, { currency, allowNegative: true, min: Math.min(v, 0), max: Math.max(v, 15) });
        expect(ranged, `ranged ${v} ${currency} "${text}"`).toEqual({ ok: true, value: v === 0 ? 0 : v });
      }
    }
  });
});

describe('parseNumericInput: input hygiene', () => {
  it('rejects over-long input quickly (no quadratic backtracking)', () => {
    expectFail('1'.repeat(65), 'invalid');
    const t0 = performance.now();
    expectFail('1' + ' '.repeat(40000) + '1', 'invalid');
    expect(performance.now() - t0).toBeLessThan(100);
  });
  it('reads full-width (IME) digits and drops zero-width marks', () => {
    expectValue('５０,０００', 50000);
    expectValue('￡５０ｋ', 50000);
    expectValue('﻿50,000', 50000);
    expectValue('50​000', 50000);
  });
  it('accepts apostrophe thousands separators (Swiss) when grouped', () => {
    expectValue("50'000", 50000, { currency: 'EUR' });
    expectValue("1'234'567", 1234567);
    expectValue('50’000', 50000);
    expectFail("50'00", 'invalid');
  });
  it('treats the currency option case-insensitively', () => {
    expectValue('450.000', 450000, { currency: 'eur' });
    expectFail('50,000', 'ambiguous', { currency: 'Eur' });
  });
});
