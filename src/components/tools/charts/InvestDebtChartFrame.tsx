/**
 * Chart-side plumbing for the lazily loaded charts of the debt and investing
 * calculators (compound interest, investment return, investment fee, credit
 * card payoff, debt payoff, net worth, ROI). Imported ONLY by the chart
 * modules in this folder (it pulls in recharts through ClientChart);
 * calculator files use InvestDebtLazyChart.tsx instead.
 *
 * - ChartArea: the sized box a chart renders into. It carries
 *   `data-chart-pending` from mount (and again after each data change) until
 *   the entry animation has finished, so PDF export never captures a
 *   half-drawn chart. The attribute is toggled on the DOM node directly so
 *   it costs no React re-render of the chart.
 * - usePrefersReducedMotion(): charts skip their entry animation for people
 *   who ask for reduced motion (recharts animates in JS, which the global
 *   CSS rule cannot stop).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import ClientChart from '../../ui/ClientChart';
import { getCurrencyConfig } from '../../../lib/currency';

export const CHART_ANIMATION_MS = 600;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      // matchMedia unavailable: keep animations (the default) - nothing to report to the user.
      setReduced(false);
    }
  }, []);
  return reduced;
}

interface ChartAreaProps {
  /** Changes whenever the plotted data changes (e.g. the data array). */
  dataKey: unknown;
  /** Animation length in ms (0 when animations are off). */
  animationMs: number;
  className?: string;
  children: ReactNode;
}

export function ChartArea({ dataKey, animationMs, className = '', children }: ChartAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-chart-pending', '');
    // ClientChart mounts on the next effect pass and ResponsiveContainer
    // measures on the following frame; add a small margin to the animation.
    const t = window.setTimeout(() => el.removeAttribute('data-chart-pending'), animationMs + 150);
    return () => window.clearTimeout(t);
  }, [dataKey, animationMs]);
  return (
    <div ref={ref} data-chart-pending="" className={`h-full w-full ${className}`}>
      {children}
    </div>
  );
}

/** Tooltip/axis animation flag for recharts series. */
export function animationProps(reduced: boolean) {
  return reduced ? { isAnimationActive: false } : { animationDuration: CHART_ANIMATION_MS };
}

/** Y-axis tick: "$1.2M", "$350K", "$4.5B", "$2T". Negative values keep their sign. */
export function moneyTick(currency: string): (v: number) => string {
  const symbol = getCurrencyConfig(currency).symbol;
  return (v: number) => {
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (a >= 1e12) return `${sign}${symbol}${(a / 1e12).toFixed(1)}T`;
    if (a >= 1e9) return `${sign}${symbol}${(a / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${sign}${symbol}${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${sign}${symbol}${(a / 1e3).toFixed(0)}K`;
    return `${sign}${symbol}${Math.round(a)}`;
  };
}

/**
 * ClientChart with the accessible name W1-CORE adds (CO-9). Kept in one place
 * so the prop is passed identically by every chart in this group.
 */
export function ChartCanvas({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return <ClientChart ariaLabel={ariaLabel}>{children}</ClientChart>;
}
