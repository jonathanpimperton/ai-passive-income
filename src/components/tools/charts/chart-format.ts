/**
 * Small formatters shared by the lazily loaded calculator charts.
 */

/** Compact currency for chart axes: $1.2M, £350K, -€8K. */
export function compactCurrency(v: number, currency: string): string {
  const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}${s}${(a / 1_000).toFixed(0)}K`;
  return `${sign}${s}${Math.round(a)}`;
}

/** "Age 59 + 10 mo" for a decimal age. */
export function ageLabel(age: number): string {
  const whole = Math.floor(age + 1e-9);
  const months = Math.round((age - whole) * 12);
  return months === 0 ? `Age ${whole}` : `Age ${whole} + ${months} mo`;
}

/** Whole-number ticks between min and max, about `count` of them. */
export function integerTicks(min: number, max: number, count = 6): number[] {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi <= lo) return [lo];
  const step = Math.max(1, Math.ceil((hi - lo) / count));
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return ticks;
}

/** "Month 7", "Year 5", "Year 5 + 1 mo" for a month count. */
export function monthLabel(month: number): string {
  if (month < 12) return `Month ${month}`;
  const y = Math.floor(month / 12);
  const m = month % 12;
  return m === 0 ? `Year ${y}` : `Year ${y} + ${m} mo`;
}
