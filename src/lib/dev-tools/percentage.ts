/**
 * Percentage calculator maths (DEVTOOLS-10/23).
 *
 * Division by zero is reported as undefined instead of "0% no change"
 * (0 -> 50 is an infinite increase, and "5 is what % of 0" has no answer).
 * Results are cleaned of floating-point noise (7% of 100 is 7, not
 * 7.000000000000001) and formatted consistently, keeping significant digits
 * for very small values (0.001% of 1 is 0.00001, not 0.00).
 */

export type PercentMode = 'whatIsXofY' | 'xIsWhatPercent' | 'percentChange' | 'percentDiff';

export type PercentOutcome =
  | { kind: 'value'; value: number; direction?: 'increase' | 'decrease' | 'none' }
  | { kind: 'undefined'; reason: string };

/** Remove binary floating-point noise: 7.000000000000001 -> 7. */
export function cleanFloat(v: number): number {
  if (!Number.isFinite(v) || v === 0) return v === 0 ? 0 : v;
  return Number(v.toPrecision(12));
}

export function computePercentage(mode: PercentMode, a: number, b: number): PercentOutcome {
  switch (mode) {
    case 'whatIsXofY':
      return { kind: 'value', value: cleanFloat((a / 100) * b) };
    case 'xIsWhatPercent':
      if (b === 0) {
        return { kind: 'undefined', reason: 'Undefined: the whole (Y) is 0, and a percentage of 0 cannot be calculated (it would mean dividing by zero).' };
      }
      return { kind: 'value', value: cleanFloat((a / b) * 100) };
    case 'percentChange': {
      if (a === 0) {
        if (b === 0) return { kind: 'value', value: 0, direction: 'none' };
        return {
          kind: 'undefined',
          reason: `Undefined: the original value is 0, so going to ${formatNumber(b)} is an infinite percentage ${b > 0 ? 'increase' : 'decrease'}. Compare the absolute change instead.`,
        };
      }
      const value = cleanFloat(((b - a) / Math.abs(a)) * 100);
      return { kind: 'value', value, direction: value > 0 ? 'increase' : value < 0 ? 'decrease' : 'none' };
    }
    case 'percentDiff': {
      const avg = (Math.abs(a) + Math.abs(b)) / 2;
      if (avg === 0) return { kind: 'value', value: 0 };
      return { kind: 'value', value: cleanFloat((Math.abs(a - b) / avg) * 100) };
    }
  }
}

/**
 * Consistent display: whole numbers without decimals, up to 4 decimals
 * otherwise, and up to 6 significant digits for values below 0.01.
 */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return '';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  const v = cleanFloat(value);
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e21) return v.toExponential(4);
  if (abs >= 1e9) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (abs < 0.01) return v.toLocaleString('en-US', { maximumSignificantDigits: 6 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
