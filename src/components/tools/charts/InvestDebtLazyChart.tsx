/**
 * Calculator-side loader for the debt and investing charts. Contains no
 * recharts code, so importing it keeps recharts out of the calculator's
 * initial bundle (review A11Y-PERF-05 / CALC-UX-A-14).
 *
 * lazyChart(): React.lazy around a chart module. If the module fails to load
 * (offline, a deploy mid-session) the chart area shows a visible message
 * instead of throwing and unmounting the whole calculator. The failure is
 * cached by React.lazy, so the message stays until the page is reloaded,
 * which is what it tells the reader to do.
 */
import { lazy, type ComponentType } from 'react';

export function ChartLoadError() {
  return (
    <p className="flex h-full items-center justify-center rounded-lg border border-neutral-200/80 px-4 text-center text-sm text-neutral-500">
      The chart could not be loaded. The figures above are unaffected; reload the page to try again.
    </p>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyChart<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(() => loader().catch(() => ({ default: ChartLoadError as unknown as T })));
}
