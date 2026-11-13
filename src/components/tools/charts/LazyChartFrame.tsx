/**
 * Frame for a React.lazy chart (plan 5.4 "Lazy charts").
 *
 *   const MyChart = lazy(() => import('./charts/MyChart'));
 *   <LazyChartFrame height={240}><MyChart {...props} /></LazyChartFrame>
 *
 * - While the chart chunk loads, ChartSkeleton holds the space and carries
 *   `data-chart-pending`, which PDF export waits on.
 * - If the chunk fails to load (offline, CDN error) the error boundary shows a
 *   short visible message instead of crashing the whole calculator island.
 *   The numbers and the "Show data" table, which live outside the chart, keep
 *   working.
 */
import { Component, Suspense, type ReactNode } from 'react';
import ChartSkeleton from '../../ui/ChartSkeleton';

interface BoundaryProps {
  height: number;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class ChartLoadBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          role="status"
          className="flex items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50 px-4 text-center text-sm text-neutral-600"
          // Inline style is limited to the dynamic height, matching ChartSkeleton.
          style={{ height: `${this.props.height}px` }}
        >
          The chart could not load. Check your connection and reload the page; the figures above are unaffected.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LazyChartFrame({ height, children }: { height: number; children: ReactNode }) {
  return (
    <ChartLoadBoundary height={height}>
      <Suspense fallback={<ChartSkeleton height={height} />}>{children}</Suspense>
    </ChartLoadBoundary>
  );
}
