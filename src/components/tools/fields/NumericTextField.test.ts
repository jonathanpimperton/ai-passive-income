/**
 * NumericTextField: the convention used to read text found in the box at
 * hydration. Browser behaviour (typing before hydration) is covered by
 * tests/followups.spec.ts and tests/numeric-fields.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { hydrationRules } from './NumericTextField';
import { interpretNumericText } from '../../../lib/numeric-field';

describe('hydrationRules (text typed before hydration is read in the visitor\'s convention)', () => {
  it('the hydration render is USD by design: it never overrides an EUR or GBP visitor', () => {
    expect(hydrationRules({ currency: 'USD', prefix: '$' }, null, 'EUR').currency).toBe('EUR');
    expect(hydrationRules({ currency: 'USD', prefix: '$' }, null, 'GBP').currency).toBe('GBP');
    expect(hydrationRules({ currency: 'USD', prefix: '$' }, null, 'USD').currency).toBe('USD');
    expect(hydrationRules({ currency: 'USD', suffix: '%' }, null, 'EUR').currency).toBe('EUR');
  });

  it('an explicit non-USD currency or a pound/euro prefix is a real choice', () => {
    expect(hydrationRules({ currency: 'GBP' }, null, 'EUR').currency).toBe('GBP');
    expect(hydrationRules({ prefix: '£' }, null, 'EUR').currency).toBe('GBP');
    expect(hydrationRules({ prefix: '€' }, null, 'USD').currency).toBe('EUR');
  });

  it('a one-country page keeps its own convention for every visitor', () => {
    expect(hydrationRules({ currency: 'USD' }, 'GBP', 'EUR').currency).toBe('GBP');
    expect(hydrationRules({ currency: 'USD' }, 'USD', 'EUR').currency).toBe('USD');
  });

  it('keeps every other rule', () => {
    const rules = { currency: 'USD', prefix: '$', min: 0, max: 100_000_000, allowNegative: false };
    expect(hydrationRules(rules, null, 'EUR')).toEqual({ ...rules, currency: 'EUR' });
  });

  it('EUR "5.000" typed before hydration is five thousand (read with the hydration render\'s USD it was 5)', () => {
    const rules = { currency: 'USD', prefix: '$', min: 0, max: 100_000_000 };
    expect(interpretNumericText('5.000', hydrationRules(rules, null, 'EUR'))).toEqual({ kind: 'value', value: 5000 });
    expect(interpretNumericText('5.000', rules)).toEqual({ kind: 'value', value: 5 });
    // ...and a decimal comma is a decimal.
    expect(interpretNumericText('12,5', hydrationRules(rules, null, 'EUR'))).toEqual({ kind: 'value', value: 12.5 });
  });
});
