/**
 * Screen-reader announcement of a calculator's headline result
 * (review A11Y-PERF-03: the whole results panel used to be aria-live, so a
 * single slider step re-read the chart, buttons and affiliate card).
 *
 * Renders one visually hidden, polite status line holding a single short
 * sentence, updated only after the value has been stable for `delay` ms so
 * dragging a slider produces one announcement, not dozens. The visible,
 * animated headline is NOT a live region.
 */
import { useEffect, useState } from 'react';

export default function LiveResult({ text, delay = 600 }: { text: string; delay?: number }) {
  const [announced, setAnnounced] = useState(text);

  useEffect(() => {
    if (text === announced) return;
    const t = window.setTimeout(() => setAnnounced(text), delay);
    return () => window.clearTimeout(t);
  }, [text, delay, announced]);

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announced}
    </p>
  );
}
