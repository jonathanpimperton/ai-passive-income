/**
 * Small building blocks shared by the property and loan calculators
 * (mortgage payment, affordability, rent vs buy, car finance, loan
 * amortization). They implement the per-calculator spec (plan 5.4):
 *
 * - DeferredChart: renders a React.lazy chart only after hydration, inside
 *   <Suspense> with a ChartSkeleton fallback. The server HTML and the first
 *   client render are both the skeleton (which carries data-chart-pending),
 *   so hydration always matches and recharts never loads with the calculator.
 * - ResultAnnouncer: one visually hidden role="status" sentence, debounced,
 *   instead of making the whole results panel aria-live (A11Y-PERF-03).
 * - Collapse: animated disclosure region that is `inert` + aria-hidden while
 *   closed, so hidden inputs can't be tabbed to or changed (A11Y-PERF-02,
 *   CALC-UX-A-15).
 * - compactCurrency: axis-tick formatter that handles negatives ("-£700K",
 *   not "£-700000", CALC-UX-A-16).
 */
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import ChartSkeleton from '../ui/ChartSkeleton';
import { getCurrencyConfig } from '../../lib/currency';

/** False during SSR and the hydration render, true after mount. */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function DeferredChart({ height, className, children }: { height: number; className?: string; children: ReactNode }) {
  const mounted = useHasMounted();
  const skeleton = <ChartSkeleton height={height} className={className} />;
  if (!mounted) return skeleton;
  return <Suspense fallback={skeleton}>{children}</Suspense>;
}

/** Visually hidden live region announcing one short sentence ~500 ms after it settles. */
export function ResultAnnouncer({ text, delay = 500 }: { text: string; delay?: number }) {
  const [announced, setAnnounced] = useState(text);
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(text), delay);
    return () => window.clearTimeout(t);
  }, [text, delay]);
  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announced}
    </p>
  );
}

/** Animated show/hide region; closed = inert, aria-hidden and zero height. */
export function Collapse({ open, id, className, children }: { open: boolean; id?: string; className?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      inert={open ? undefined : true}
      aria-hidden={open ? undefined : true}
      className={`grid grid-cols-1 transition-all duration-200 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}${className ? ` ${className}` : ''}`}
    >
      <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

function trimDecimal(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** "$350K", "-£1.2M", "€900" -- compact axis labels with the sign before the symbol. */
export function compactCurrency(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '';
  const symbol = getCurrencyConfig(currency).symbol;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${symbol}${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${Math.round(abs / 1_000)}K`;
  return `${sign}${symbol}${Math.round(abs)}`;
}
