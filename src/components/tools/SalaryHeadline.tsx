/**
 * Take-home headline shared by the UK and US salary calculators.
 *
 * Owner requirement (13 Nov 2026): take-home pay is a headline MONTHLY as much as ANNUALLY. Both
 * figures use the same classes (size, weight, mono face), so neither is a secondary line, and
 * the monthly figure is the annual one / 12 from the same engine result (no second rounding path).
 *
 * This whole block is the `[data-headline-result]` element. ToolPageLayout mirrors its text into
 * the mobile result bar, so the bar reads "GBP 2,432 a month GBP 29,184 a year": the single-space
 * text nodes between the pieces keep that text readable (they are not rendered in the flex layout).
 */

interface SalaryHeadlineProps {
  /** Annual take-home (the count-up value). The monthly figure is this divided by 12. */
  annual: number;
  /** Currency formatter for whole units, for example formatGBP. */
  format: (value: number) => string;
}

const FIGURE = 'result-number text-3xl sm:text-4xl font-bold tabular-nums';
const UNIT = 'text-sm text-neutral-500 mt-0.5';

export default function SalaryHeadline({ annual, format }: SalaryHeadlineProps) {
  return (
    <div
      data-headline-result
      data-headline-label="Net"
      className="flex flex-wrap items-end gap-x-10 gap-y-3"
    >
      <div className="min-w-0">
        <p className={FIGURE}>{format(annual / 12)}</p>{' '}
        <p className={UNIT}>a month</p>
      </div>{' '}
      <div className="min-w-0">
        <p className={FIGURE}>{format(annual)}</p>{' '}
        <p className={UNIT}>a year</p>
      </div>
    </div>
  );
}

/**
 * Compact copy of the pair at the TOP of the calculator card, for narrow screens only (below lg).
 * On a phone the results panel sits below the whole input form, so without this the figures are
 * thousands of pixels down on first load. Equal weight again: both figures share one class set.
 *
 * It is a visual duplicate, so it is aria-hidden: screen-reader users get the figures once, from the
 * real headline and its live-region sentence. It is deliberately NOT a [data-headline-result] (the
 * mobile result bar and the tests expect exactly one) and has no focusable content.
 */
const COMPACT_FIGURE = 'font-mono tabular-nums text-2xl font-bold leading-tight text-neutral-900';
const COMPACT_UNIT = 'text-xs text-neutral-500';

export function SalaryHeadlineCompact({ annual, format }: SalaryHeadlineProps) {
  return (
    <div
      aria-hidden="true"
      data-compact-headline
      className="lg:hidden flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-neutral-200/80 bg-neutral-50/50 px-6 py-3"
    >
      <div className="min-w-0">
        <p className={COMPACT_FIGURE}>{format(annual / 12)}</p>
        <p className={COMPACT_UNIT}>take-home a month</p>
      </div>
      <div className="min-w-0">
        <p className={COMPACT_FIGURE}>{format(annual)}</p>
        <p className={COMPACT_UNIT}>take-home a year</p>
      </div>
    </div>
  );
}
