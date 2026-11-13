/**
 * SliderInput: the pure text logic (parse, clamp, messages, display) and the
 * server-rendered markup. Browser behaviour (live apply, hydration reconcile,
 * range transitions) is covered by the Playwright journeys.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SliderInput, {
  commitText,
  liveValue,
  displayText,
  editText,
  describeParseFailure,
  formatBound,
  resolveConvention,
  reconcileConvention,
  toEurSeparators,
  valueToVirtual,
  virtualToValue,
  isNonLinear,
  fillPercent,
} from './SliderInput';
import { parseNumericInput } from '../../lib/parse-number';
import type { CurrencyCode } from '../../lib/currency';

const money = (convention: CurrencyCode, hardMin = 0, hardMax = 10_000_000, prefix = convention === 'GBP' ? '\u00A3' : convention === 'EUR' ? '\u20AC' : '$') => ({
  convention,
  hardMin,
  hardMax,
  allowNegative: false,
  prefix,
});

describe('commitText: the CALC-UX-A/B attack set', () => {
  it.each([
    ['50,000', 50000],
    ['$50,000', 50000],
    ['50000', 50000],
    ['50 000', 50000],
    ['$50k', 50000],
    ['50k', 50000],
    ['1.2m', 1200000],
    ['1,000,000.50', 1000000.5],
    ['  425,000 ', 425000],
  ])('USD %s -> %d', (text, expected) => {
    expect(commitText(text, money('USD'))).toEqual({ value: expected, error: null, notice: null });
  });

  it('GBP \u00A3425,000 (stamp duty price) -> 425000', () => {
    expect(commitText('\u00A3425,000', money('GBP')).value).toBe(425000);
  });

  it('UK salary 50,000 is 50000, not 50 clamped to the \u00A310,000 minimum', () => {
    expect(commitText('50,000', money('GBP', 10000, 1000000))).toEqual({ value: 50000, error: null, notice: null });
  });

  it.each([
    ['25.000', 25000],
    ['450.000', 450000],
    ['1.000.000,50', 1000000.5],
    ['\u20AC50.000', 50000],
  ])('EUR %s -> %d', (text, expected) => {
    expect(commitText(text, money('EUR')).value).toBe(expected);
  });

  it('EUR "50,000" in a salary-sized field is 50000 (only reading in range)', () => {
    expect(commitText('50,000', money('EUR', 10000, 1000000)).value).toBe(50000);
  });

  it('1e9 is refused with a visible message and no value', () => {
    const r = commitText('1e9', money('USD'));
    expect(r.value).toBeNull();
    expect(r.error).toMatch(/"1e9" is not a number we can read/);
  });

  it('USD "12,34" is refused as ambiguous when the decimal reading is out of range', () => {
    const r = commitText('12,34', money('USD', 100));
    expect(r.value).toBeNull();
    expect(r.error).toMatch(/could mean two different numbers/);
    expect(r.error).toMatch(/50,000/);
  });

  it('negative input is refused unless allowed', () => {
    expect(commitText('-500', money('USD')).error).toBe('This value cannot be negative.');
    expect(commitText('-500', { ...money('USD', -1000, 1000), allowNegative: true }).value).toBe(-500);
  });

  it('empty input reverts silently', () => {
    expect(commitText('   ', money('USD'))).toEqual({ value: null, error: null, notice: null });
  });

  it('above the maximum clamps with a visible note in the field currency', () => {
    expect(commitText('5,000,000', money('GBP', 10000, 1000000))).toEqual({
      value: 1000000,
      error: null,
      notice: 'Maximum is \u00A31,000,000, so we used that.',
    });
  });

  it('below the minimum clamps with a note', () => {
    expect(commitText('500', money('GBP', 10000, 1000000)).notice).toBe('Minimum is \u00A310,000, so we used that.');
  });

  it('percent bounds read naturally', () => {
    const r = commitText('45', { convention: 'USD', hardMin: 0, hardMax: 30, allowNegative: false, suffix: '%' });
    expect(r.notice).toBe('Maximum is 30%, so we used that.');
  });
});

describe('EUR rate field (R0 hazard): 6.125% survives tab-through and typing', () => {
  const rate = { convention: 'EUR' as const, hardMin: 0, hardMax: 15, allowNegative: false, suffix: '%' };

  it('the focus text parses back to exactly 6.125', () => {
    const text = editText(6.125, 'EUR');
    expect(text).not.toBe('6,125'); // would be ambiguous
    expect(commitText(text, rate).value).toBe(6.125);
  });

  it('typing "6,125" gives 6.125', () => {
    expect(commitText('6,125', rate).value).toBe(6.125);
  });

  it('typing "6.125" in EUR is 6125 in that convention: clamped to 15% with a visible note, never shrunk', () => {
    expect(commitText('6.125', rate)).toEqual({ value: 15, error: null, notice: 'Maximum is 15%, so we used that.' });
  });
});

describe('above-range input is clamped, never shrunk', () => {
  it('"50,000" in a field with max 5000 gives 5000 with the adjustment note (never 50)', () => {
    expect(commitText('50,000', money('USD', 0, 5000))).toEqual({
      value: 5000,
      error: null,
      notice: 'Maximum is $5,000, so we used that.',
    });
  });
});

describe('did-you-mean prompts', () => {
  it('EUR "50,000" in an unbounded field offers both readings in EUR notation', () => {
    const r = commitText('50,000', { ...money('EUR'), hardMax: Number.MAX_SAFE_INTEGER });
    expect(r.value).toBeNull();
    expect(r.error).toContain('Did you mean €50 or €50.000?');
  });
  it('USD "1.000,50" (continental) offers the reading', () => {
    const r = commitText('1.000,50', money('USD', 5000, 1000000));
    expect(r.value).toBeNull();
    expect(r.error).toContain('Did you mean $1,000.5?');
  });
});

describe('range-aware readings', () => {
  it('USD "12,34" in a money field with no lower bound reads as 12.34 (only valid reading)', () => {
    expect(commitText('12,34', money('USD')).value).toBe(12.34);
  });
  it('USD "52.000" in a salary field is 52000', () => {
    expect(commitText('52.000', money('USD', 10000, 1000000)).value).toBe(52000);
  });
});

describe('liveValue (apply while typing)', () => {
  const opts = { convention: 'USD' as const, hardMin: 10000, hardMax: 1000000, allowNegative: false };
  it('applies clean in-range values', () => {
    expect(liveValue('52,000', opts)).toBe(52000);
    expect(liveValue('52000', opts)).toBe(52000);
  });
  it('waits on incomplete, ambiguous or out-of-range text', () => {
    expect(liveValue('5', opts)).toBeNull(); // below min: probably still typing
    expect(liveValue('52,00', opts)).toBeNull();
    expect(liveValue('1e9', opts)).toBeNull();
    expect(liveValue('', opts)).toBeNull();
  });
});

describe('display text', () => {
  it('keeps the caller format when it is exact', () => {
    expect(displayText(350000, '350,000', 'USD')).toBe('350,000');
    expect(displayText(6.5, '6.5', 'USD')).toBe('6.5');
  });
  it('never shows a rounded figure that differs from the value used (CALC-UX-A-12)', () => {
    expect(displayText(6.75, '6.8', 'USD')).toBe('6.75');
    expect(displayText(1000000.5, '1,000,001', 'USD')).toBe('1,000,000.5');
  });
  it('tidies an unreadable run of decimals', () => {
    expect(displayText(3.14159265358979, '3.14159265358979', 'USD')).toBe('3.141593');
  });
  it('localises EUR separators', () => {
    expect(displayText(50000, '50,000', 'EUR')).toBe('50.000');
    expect(displayText(6.75, '6.8', 'EUR')).toBe('6,75');
    expect(toEurSeparators('1,234.5')).toBe('1.234,5');
    expect(toEurSeparators('30 yrs')).toBe('30 yrs');
  });
  it('every EUR display of a grouped figure parses back to the same value', () => {
    for (const v of [1000, 50000, 425000, 1000000, 12345678]) {
      const shown = displayText(v, v.toLocaleString('en-US'), 'EUR');
      const r = parseNumericInput(shown, { currency: 'EUR' });
      expect(r).toEqual({ ok: true, value: v });
    }
  });
});

describe('editText round-trips in every convention', () => {
  const values = [0, 1, 7.25, 6.125, 0.5, 350000, 1000000.5, 0.1 + 0.2, 1234.567];
  it.each(['USD', 'GBP', 'EUR'] as const)('%s', (c) => {
    for (const v of values) {
      const text = editText(v, c);
      const r = parseNumericInput(text, { currency: c });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBeCloseTo(v, 9);
      expect(text).not.toMatch(/e/i);
    }
  });
  it('trims float noise', () => {
    expect(editText(0.1 + 0.2, 'USD')).toBe('0.3');
  });
});

describe('convention resolution', () => {
  it('explicit prop wins, then prefix, then page currency', () => {
    expect(resolveConvention('EUR', '$', 'USD')).toBe('EUR');
    expect(resolveConvention(undefined, '\u20AC', 'USD')).toBe('EUR');
    expect(resolveConvention(undefined, '\u00A3', 'EUR')).toBe('GBP');
    expect(resolveConvention(undefined, '$', 'EUR')).toBe('USD');
    expect(resolveConvention(undefined, undefined, 'EUR')).toBe('EUR');
    expect(resolveConvention(undefined, undefined, 'USD')).toBe('USD');
  });
});

describe('messages', () => {
  it('money vs non-money examples', () => {
    expect(describeParseFailure('invalid', 'abc', 'USD', true)).toMatch(/50k/);
    expect(describeParseFailure('invalid', 'abc', 'EUR', false)).toMatch(/7,5/);
    expect(describeParseFailure('ambiguous', '50,000', 'EUR', true)).toMatch(/dot for thousands/);
  });
  it('quotes are truncated', () => {
    expect(describeParseFailure('invalid', 'x'.repeat(80), 'USD', true)).toMatch(/x{23}\.\.\."/);
  });
  it('bounds', () => {
    expect(formatBound(1000000, 'EUR', '\u20AC')).toBe('\u20AC1.000.000');
    expect(formatBound(65, 'USD', undefined, 'years')).toBe('65 years');
  });
});

describe('non-linear mapping (unchanged behaviour)', () => {
  it('detects >250 steps', () => {
    expect(isNonLinear(0, 10_000_000, 5000)).toBe(true);
    expect(isNonLinear(0, 100, 1)).toBe(false);
  });
  it('round-trips the ends and stays in range', () => {
    expect(virtualToValue(valueToVirtual(0, 0, 1e7), 0, 1e7, 5000)).toBe(0);
    expect(virtualToValue(valueToVirtual(1e7, 0, 1e7), 0, 1e7, 5000)).toBe(1e7);
    expect(virtualToValue(5000, 0, 1e7, 5000)).toBe(2500000);
  });
});

describe('server markup', () => {
  const html = renderToStaticMarkup(
    createElement(SliderInput, {
      label: 'Annual Salary',
      id: 'uk-salary',
      value: 35000,
      min: 10000,
      max: 500000,
      step: 1000,
      textMax: 1000000,
      onChange: () => {},
      prefix: '\u00A3',
      hint: 'Before tax',
      formatDisplay: (v: number) => v.toLocaleString('en-US'),
    }),
  );

  it('renders the formatted value and a labelled text field', () => {
    expect(html).toContain('id="uk-salary"');
    expect(html).toContain('value="35,000"');
    expect(html).toContain('for="uk-salary"');
  });

  it('links the hint with aria-describedby and renders no live region until there is a message', () => {
    expect(html).toMatch(/aria-describedby="uk-salary-hint"/);
    expect(html).not.toMatch(/aria-live|role="status"|role="alert"|uk-salary-message/);
  });

  it('renders the range thumb at the value with the fill set', () => {
    // 490 steps: non-linear, so the native range holds the virtual position.
    const virt = valueToVirtual(35000, 10000, 500000);
    expect(html).toMatch(new RegExp(`<input type="range"[^>]*aria-valuenow="35000"[^>]*value="${virt}"`));
    expect(html).toMatch(/--slider-fill:\d+(\.\d+)?%/);
  });
});

describe('slider fill percentage', () => {
  it('is rounded to two decimals (no float noise in the CSS variable)', () => {
    expect(fillPercent(1, 0, 3)).toBe(33.33);
    expect(fillPercent(2, 0, 3)).toBe(66.67);
    expect(String(fillPercent(7, 0, 9))).not.toMatch(/\d{4,}/);
  });
  it('stays within 0 to 100', () => {
    expect(fillPercent(-5, 0, 10)).toBe(0);
    expect(fillPercent(15, 0, 10)).toBe(100);
    expect(fillPercent(3, 3, 3)).toBe(0);
  });
});

describe('convention for text typed before hydration', () => {
  it('a $ prefix or USD is only the hydration default: the visitor currency decides', () => {
    expect(reconcileConvention(undefined, '$', null, 'EUR')).toBe('EUR');
    expect(reconcileConvention('USD', '$', null, 'EUR')).toBe('EUR');
    expect(reconcileConvention(undefined, undefined, null, 'GBP')).toBe('GBP');
  });
  it('a pound or euro sign, or another explicit currency, is a real choice', () => {
    expect(reconcileConvention(undefined, '£', null, 'EUR')).toBe('GBP');
    expect(reconcileConvention(undefined, '€', null, 'USD')).toBe('EUR');
    expect(reconcileConvention('GBP', '$', null, 'EUR')).toBe('GBP');
  });
  it('a UK-only or US-only page wins over the visitor currency', () => {
    expect(reconcileConvention(undefined, undefined, 'GBP', 'EUR')).toBe('GBP');
    expect(reconcileConvention(undefined, '$', 'USD', 'EUR')).toBe('USD');
  });
});
