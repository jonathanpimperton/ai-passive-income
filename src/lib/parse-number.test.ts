import { describe, it, expect } from 'vitest';
import { parseNumericInput, type ParseFailureReason } from './parse-number';

type Ok = [input: string, expected: number];
type Bad = [input: string, reason: ParseFailureReason];

function expectValue(input: string, expected: number, opts = {}) {
  const r = parseNumericInput(input, opts);
  expect(r, `"${input}" ${JSON.stringify(opts)}`).toEqual({ ok: true, value: expected });
}
function expectFail(input: string, reason: ParseFailureReason, opts = {}) {
  const r = parseNumericInput(input, opts);
  expect(r, `"${input}" ${JSON.stringify(opts)}`).toEqual({ ok: false, reason });
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
