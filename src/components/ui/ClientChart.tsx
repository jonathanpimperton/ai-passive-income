/**
 * The one way to render a recharts chart on this site.
 *
 *   <div className="h-56 sm:h-64">                 // the parent sets the height
 *     <ClientChart ariaLabel="Balance growing from $10,000 to $144,573 over 10 years">
 *       <AreaChart data={data}>...</AreaChart>      // exactly one chart element
 *     </ClientChart>
 *   </div>
 *   <ChartDataTable caption="Balance by year" ... />  // the accessible data
 *
 * - Defers the ResponsiveContainer until after mount (no SSR measurement
 *   warnings). The wrapper div is rendered on the server too, so nothing
 *   shifts on hydration.
 * - Accessibility (review A11Y-PERF-11): the wrapper is `role="img"` with
 *   `ariaLabel` as its name, and Recharts' keyboard layer (an unnamed,
 *   focusable `role="application"` svg) is turned off, so the chart is one
 *   named image and is not a tab stop. Put the numbers in a ChartDataTable.
 *   `ariaLabel` is REQUIRED by the per-calculator spec: say what the chart
 *   shows, with the key figures. Typed optional only so calculators not yet
 *   migrated still compile; without it a generic name is used.
 * - Carries `data-chart-pending` until the chart has mounted and painted, so
 *   PDF export waits for it (pairs with ChartSkeleton as the Suspense
 *   fallback of a lazily loaded chart).
 */
import { useState, useEffect, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

export const FALLBACK_CHART_LABEL = 'Chart of the calculator results';

interface ClientChartProps {
  /** Exactly one recharts chart element (AreaChart, LineChart, BarChart, PieChart...). */
  children: ReactNode;
  /** What the chart shows, with its key figures. Required by the per-calculator spec. */
  ariaLabel?: string;
  /** Extra classes for the wrapper (it already fills its parent). */
  className?: string;
  /** Passed to ResponsiveContainer. */
  minWidth?: number;
  minHeight?: number;
  debounce?: number;
}

/** Turn off Recharts' focusable role="application" layer unless the caller set it explicitly. */
export function withoutAccessibilityLayer(children: ReactNode): ReactNode {
  if (!isValidElement(children)) return children;
  const props = children.props as { accessibilityLayer?: boolean };
  if (props.accessibilityLayer !== undefined) return children;
  return cloneElement(children as ReactElement<{ accessibilityLayer?: boolean }>, { accessibilityLayer: false });
}

export default function ClientChart({ children, ariaLabel, className, minWidth = 0, minHeight, debounce }: ClientChartProps) {
  const [mounted, setMounted] = useState(false);
  const [painted, setPainted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Two frames after mount the container has measured and the chart has painted.
  useEffect(() => {
    if (!mounted) return undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [mounted]);

  const label = ariaLabel?.trim();

  return (
    <div
      role="img"
      aria-label={label || FALLBACK_CHART_LABEL}
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      data-chart-pending={painted ? undefined : ''}
    >
      {mounted && (
        <ResponsiveContainer width="100%" height="100%" minWidth={minWidth} minHeight={minHeight} debounce={debounce}>
          {withoutAccessibilityLayer(children) as ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}

export type { ClientChartProps };
