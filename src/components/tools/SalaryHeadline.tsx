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
      data-headline-label="Take-home pay"
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
