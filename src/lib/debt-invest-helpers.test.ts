/**
 * Tests for the small helpers behind the debt and investing calculators:
 * ROI, net worth, investment fee, guarded result formatting and the
 * free-text numeric field logic.
 *
 * External worked example for annualized ROI (accessed 2026-11-12):
 * "Business Math: A Step-by-Step Handbook" (J. Olivier, Lyryx;
 * eCampusOntario edition), Example 9.5.1,
 * https://ecampusontario.pressbooks.pub/businessmathtextbook/chapter/9-5-2/
 * $7,100 repaid as $8,615.19 three years later is 6.5% compounded quarterly,
 * i.e. an effective annual rate of (1 + 0.065/4)^4 - 1 = 6.660%.
 */
import { describe, it, expect } from 'vitest';
import { calcRoi, annualize } from './roi';
import { summarizeNetWorth, breakdown, itemLabel } from './net-worth';
import { compareFees, feeSchedule } from './investment-fee';
import {
  formatMoneyGuarded,
  formatPercentGuarded,
  formatMonthsLong,
  formatMonthsShort,
  isExtremeMoney,
} from './result-format';
import { interpretNumericText, formatEditableNumber, textForEditing } from './numeric-field';
import { compoundInterest } from './calculator-utils';

describe('ROI', () => {
  it('Example 9.5.1: $7,100 -> $8,615.19 over 3 years annualizes to 6.660%', () => {
    const r = calcRoi(7100, 8615.19, 0, 3);
    expect(r.annualizedReturn).not.toBeNull();
    expect(r.annualizedReturn as number).toBeCloseTo(Math.pow(1 + 0.065 / 4, 4) - 1, 5);
  });

  it('defaults: $10,000 -> $15,000 + $500 over 3 years = 55% total, 15.73% a year', () => {
    const r = calcRoi(10000, 15000, 500, 3);
    expect(r.totalReturn).toBeCloseTo(0.55, 10);
    expect((r.annualizedReturn as number) * 100).toBeCloseTo(15.73, 2);
  });

  it('MATH-US-16: a total loss annualizes to -100%, not 0%', () => {
    const r = calcRoi(10000, 0, 0, 0.25);
    expect(r.totalReturn).toBe(-1);
    expect(r.annualizedReturn).toBe(-1);
    expect(annualize(-1, 5)).toBe(-1);
  });

  it('partial loss annualizes to a negative rate that compounds back', () => {
    const a = annualize(-0.5, 2) as number;
    expect(Math.pow(1 + a, 2)).toBeCloseTo(0.5, 12);
  });

  it('undefined cases are null, not 0', () => {
    expect(calcRoi(0, 100, 0, 1).valid).toBe(false);
    expect(calcRoi(100, 150, 0, 0).annualizedReturn).toBeNull();
  });
});

describe('net worth', () => {
  it('totals and ratios', () => {
    const s = summarizeNetWorth(
      [
        { name: 'Home', value: 300000 },
        { name: 'Cash', value: 1234.56 },
      ],
      [{ name: 'Mortgage', value: 240000 }],
    );
    expect(s.totalAssets).toBeCloseTo(301234.56, 6);
    expect(s.netWorth).toBeCloseTo(61234.56, 6);
    expect(s.debtToAsset as number).toBeCloseTo(240000 / 301234.56, 12);
  });

  it('no assets: ratios undefined, net worth negative', () => {
    const s = summarizeNetWorth([], [{ name: 'Card', value: 3000 }]);
    expect(s.debtToAsset).toBeNull();
    expect(s.equityShare).toBeNull();
    expect(s.netWorth).toBe(-3000);
  });

  it('non-finite values count as 0, never NaN', () => {
    const s = summarizeNetWorth([{ name: 'x', value: NaN }], [{ name: 'y', value: Infinity }]);
    expect(s.netWorth).toBe(0);
  });

  it('blank names get a label; breakdown shares sum to 1', () => {
    expect(itemLabel('', 'asset', 2)).toBe('Asset 3');
    const b = breakdown(
      [
        { name: '', value: 100 },
        { name: 'B', value: 300 },
        { name: 'Z', value: 0 },
      ],
      'liability',
    );
    expect(b.map((r) => r.name)).toEqual(['Liability 1', 'B']);
    expect(b.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 12);
  });
});

describe('investment fee (DB-7, MTH-08)', () => {
  const base = { principal: 100000, monthlyContribution: 500, grossReturnPercent: 7, years: 30 };

  it('MTH-08 table: $100k + $500/mo at 7% gross for 30 years at 0.03 / 0.5 / 1 / 1.5% fees', () => {
    const at = (fee: number) => compareFees({ ...base, yourFeePercent: fee, comparisonFeePercent: 0 }).yourBalance;
    expect(Math.round(at(0.03))).toBe(1410807);
    expect(Math.round(at(0.5))).toBe(1252269);
    expect(Math.round(at(1))).toBe(1104515);
    expect(Math.round(at(1.5))).toBe(975545);
  });

  it('matches the documented formula: monthly compounding at (gross - fee) / 12', () => {
    const c = compareFees({ ...base, yourFeePercent: 0.5, comparisonFeePercent: 1 });
    expect(c.yourBalance).toBeCloseTo(compoundInterest(100000, 500, 0.065, 30, 12), 6);
    expect(c.feeCost).toBeCloseTo(Math.abs(c.yourBalance - c.compBalance), 9);
  });

  it('MATH-US-17: a fee above the gross return makes deposits lose value too', () => {
    const c = compareFees({ principal: 0, monthlyContribution: 500, grossReturnPercent: 1, years: 30, yourFeePercent: 2, comparisonFeePercent: 0 });
    expect(c.yourBalance).toBeLessThan(c.totalContributions);
    expect(c.yourEarnings).toBeLessThan(0);
  });

  it('share of returns lost is null when the lower-fee fund has no earnings', () => {
    const c = compareFees({ principal: 1000, monthlyContribution: 0, grossReturnPercent: 1, years: 5, yourFeePercent: 2, comparisonFeePercent: 3 });
    expect(c.shareOfReturnsLost).toBeNull();
  });

  it('schedule ends at the final balances', () => {
    const i = { ...base, yourFeePercent: 0.5, comparisonFeePercent: 1 };
    const s = feeSchedule(i);
    const c = compareFees(i);
    expect(s).toHaveLength(31);
    expect(s[30].yourBalance).toBeCloseTo(c.yourBalance, 1);
    expect(s[30].compBalance).toBeCloseTo(c.compBalance, 1);
  });
});

describe('guarded formatting (CALC-UX-B edge values)', () => {
  it('review repro: $10M + $50k/mo at 25% for 100 years is not printed as 21 digits', () => {
    const v = compoundInterest(10_000_000, 50_000, 0.25, 100, 12);
    expect(isExtremeMoney(v)).toBe(true);
    expect(formatMoneyGuarded(v, 'USD')).toBe('Over $1 trillion');
    expect(formatMoneyGuarded(v, 'GBP')).toBe(`Over ${String.fromCharCode(0xa3)}1 trillion`);
  });

  it('ordinary values format normally; non-finite is "--"', () => {
    expect(formatMoneyGuarded(1234.4, 'USD')).toBe('$1,234');
    expect(formatMoneyGuarded(NaN)).toBe('--');
    expect(formatMoneyGuarded(-2e12)).toBe('Under -$1 trillion');
  });

  it('percentages', () => {
    expect(formatPercentGuarded(-1)).toBe('-100.00%');
    expect(formatPercentGuarded(0.1573)).toBe('15.73%');
    expect(formatPercentGuarded(1e5)).toBe('Over 1,000,000%');
    expect(formatPercentGuarded(-0.00001)).toBe('0.00%');
    expect(formatPercentGuarded(Infinity)).toBe('--');
    expect(formatPercentGuarded(123.456)).toBe('12,345.60%');
  });

  it('months', () => {
    expect(formatMonthsLong(59)).toBe('4 years, 11 months');
    expect(formatMonthsLong(0)).toBe('0 months');
    expect(formatMonthsShort(191)).toBe('15 yrs 11 mo');
    expect(formatMonthsShort(192)).toBe('16 years');
    expect(formatMonthsShort(11)).toBe('11 mo');
  });
});

describe('numeric text fields (DB-4: CALC-UX-B-04)', () => {
  const usd = { currency: 'USD', allowEmpty: true };

  it('"5000.00" is 5,000 and "1234.56" is 1,234.56 (was 500,000 and 123,456)', () => {
    expect(interpretNumericText('5000.00', usd)).toEqual({ kind: 'value', value: 5000 });
    expect(interpretNumericText('1234.56', usd)).toEqual({ kind: 'value', value: 1234.56 });
    expect(formatEditableNumber(1234.56, 'USD')).toBe('1,234.56');
    expect(formatEditableNumber(5000, 'USD')).toBe('5,000');
  });

  it('accepts grouped, symbol and suffix input', () => {
    expect(interpretNumericText('$50,000', usd)).toEqual({ kind: 'value', value: 50000 });
    expect(interpretNumericText('45k', usd)).toEqual({ kind: 'value', value: 45000 });
  });

  it('refuses ambiguous and garbage input with a message', () => {
    const amb = interpretNumericText('12,34', usd);
    expect(amb.kind).toBe('error');
    expect(interpretNumericText('abc', usd).kind).toBe('error');
    expect(interpretNumericText('1e9', usd).kind).toBe('error');
  });

  it('negatives are refused with the caller message unless allowed', () => {
    const r = interpretNumericText('-500', { ...usd, negativeMessage: 'Add debts under Liabilities.' });
    expect(r).toEqual({ kind: 'error', message: 'Add debts under Liabilities.' });
    expect(interpretNumericText('-500', { ...usd, allowNegative: true })).toEqual({ kind: 'value', value: -500 });
  });

  it('blank is empty (or an error when blanks are not allowed); range errors are explained', () => {
    expect(interpretNumericText('  ', usd)).toEqual({ kind: 'empty' });
    expect(interpretNumericText('', { allowEmpty: false }).kind).toBe('error');
    expect(interpretNumericText('2000', { ...usd, max: 1000, prefix: '$' })).toEqual({ kind: 'error', message: 'The maximum is $1,000.' });
  });

  it('EUR convention round-trips through display and edit text', () => {
    expect(formatEditableNumber(1234.5, 'EUR')).toBe('1.234,5');
    expect(interpretNumericText('1.234,5', { currency: 'EUR' })).toEqual({ kind: 'value', value: 1234.5 });
    expect(textForEditing(1234.5, 'EUR')).toBe('1234,5');
    expect(interpretNumericText(textForEditing(1234.5, 'EUR'), { currency: 'EUR' })).toEqual({ kind: 'value', value: 1234.5 });
  });

  it('range picks the reading for an ambiguous EUR "3,875" in an APR field', () => {
    expect(interpretNumericText('3,875', { currency: 'EUR', min: 0, max: 100 })).toEqual({ kind: 'value', value: 3.875 });
  });

  it('a correctly written number above the range is explained, never shrunk (EUR "6.125" = 6125)', () => {
    expect(interpretNumericText('6.125', { currency: 'EUR', min: 0, max: 1000, suffix: '%' })).toEqual({
      kind: 'error',
      message: 'The maximum is 1.000%.',
    });
  });

  it('ambiguous input with no range asks "Did you mean ...?"', () => {
    const r = interpretNumericText('50,000', { currency: 'EUR' });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toMatch(/^Did you mean 50 or 50\.000\?/);
  });
});
