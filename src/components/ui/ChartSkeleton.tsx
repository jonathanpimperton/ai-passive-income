/**
 * Placeholder for a lazily loaded recharts chart.
 *
 * Intended as the `<Suspense fallback>` around a `React.lazy` chart:
 *
 *   <Suspense fallback={<ChartSkeleton height={300} />}>
 *     <GrowthChart data={data} />
 *   </Suspense>
 *
 * - Same footprint as the chart it replaces (full width, given height), so
 *   swapping it for the real chart causes no layout shift. Pass the same
 *   height the chart container uses.
 * - Carries `data-chart-pending` for as long as it is mounted. PDF export
 *   waits for every `[data-chart-pending]` element to disappear before
 *   capturing, so the attribute must stay on the root element.
 * - Purely decorative: hidden from assistive tech and never announced.
 * - The shimmer animation (`.shimmer-line` in global.css) is already disabled
 *   under prefers-reduced-motion and follows dark-mode neutral tokens.
 */

export interface ChartSkeletonProps {
  /** Chart height. A number is pixels; a string is any CSS length (e.g. "18rem"). */
  height: number | string;
  /** Extra classes for the root element (e.g. margins). */
  className?: string;
}

export default function ChartSkeleton({ height, className }: ChartSkeletonProps) {
  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      data-chart-pending=""
      aria-hidden="true"
      className={`shimmer-line block w-full rounded-lg${className ? ` ${className}` : ''}`}
      // Inline style is limited to the dynamic height value.
      style={{ height: cssHeight }}
    />
  );
}
