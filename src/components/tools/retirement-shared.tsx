/**
 * Pieces shared by the three retirement calculators (savings, age,
 * contribution): region wording, the client-side "today" used for age-based
 * milestones, the numbered milestone legend and the projection summary table.
 * Calculation logic lives in src/lib/retirement.ts.
 */
import { useEffect, useState } from 'react';
import { formatCurrency } from '../../lib/calculator-utils';
import { todayLocal, type CalendarDate } from '../../lib/uk-pension-ages';
import type { Milestone, ProjectionRow, RetirementRegion } from '../../lib/retirement';

export function regionFor(currency: string): RetirementRegion {
  return currency === 'GBP' ? 'uk' : currency === 'EUR' ? 'eur' : 'us';
}

export const SAVINGS_HINTS: Record<RetirementRegion, string> = {
  us: 'Total saved for retirement so far (401k, IRA, etc.)',
  uk: 'Total saved for retirement so far (pension, SIPP, ISA, etc.)',
  eur: 'Total saved for retirement so far (pension accounts, etc.)',
};

/** Inflation hints: the US long-run average; the BoE and ECB both target 2%. */
export const INFLATION_HINTS: Record<RetirementRegion, string> = {
  us: 'How fast prices rise — ~3% is the US long-term average',
  uk: 'How fast prices rise — the Bank of England targets 2%',
  eur: 'How fast prices rise — the European Central Bank targets 2%',
};

/** Column / card label for inflation-adjusted figures. */
export function todaysMoneyLabel(currency: string): string {
  return currency === 'GBP' ? "Today's pounds" : currency === 'EUR' ? "Today's euros" : "Today's dollars";
}

/**
 * Today's date, known only after mount. Age-based milestones depend on the
 * calendar date, so they are computed on the client to keep the server HTML
 * and the first client render identical.
 */
export function useClientToday(): CalendarDate | null {
  const [today, setToday] = useState<CalendarDate | null>(null);
  useEffect(() => setToday(todayLocal()), []);
  return today;
}

function formatAge(age: number): string {
  const whole = Math.floor(age + 1e-9);
  const months = Math.round((age - whole) * 12);
  if (months === 0) return `${whole}`;
  if (months === 6 && whole === 59) return '59½';
  return `${whole}y ${months}m`;
}

/** Ages to draw as numbered markers (marker i is labelled i + 1, matching the legend). */
export function chartMilestoneAges(milestones: Milestone[]): number[] {
  return milestones.filter((m) => m.onChart).map((m) => m.age);
}

/**
 * Numbered list explaining the markers drawn on the chart, followed by any
 * milestones that fall after the chart ends (listed, not drawn).
 */
export function MilestoneLegend({ milestones, region }: { milestones: Milestone[]; region: RetirementRegion }) {
  if (milestones.length === 0) return null;
  const onChart = milestones.filter((m) => m.onChart);
  const later = milestones.filter((m) => !m.onChart);
  return (
    <div className="mt-3 border-t border-neutral-200/80 pt-3">
      <p className="text-xs font-medium text-neutral-600 mb-1.5">
        {region === 'uk' ? 'UK pension ages' : 'Ages to know'}
      </p>
      {onChart.length > 0 && (
        <ol className="space-y-1">
          {onChart.map((m, i) => (
            <li key={`${m.marker}-${m.age}`} className="flex gap-2 text-xs text-neutral-600 leading-relaxed">
              <span className="shrink-0 w-4 h-4 rounded-full border border-neutral-300 text-[10px] leading-[14px] text-center text-neutral-600 tabular-nums" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <span className="font-medium text-neutral-800 tabular-nums">Age {formatAge(m.age)}:</span> {m.text}
              </span>
            </li>
          ))}
        </ol>
      )}
      {later.length > 0 && (
        <ul className={`space-y-1 ${onChart.length > 0 ? 'mt-1' : ''}`}>
          {later.map((m) => (
            <li key={`${m.marker}-${m.age}`} className="flex gap-2 text-xs text-neutral-600 leading-relaxed">
              <span className="shrink-0 w-4 text-center text-neutral-400" aria-hidden="true">&rsaquo;</span>
              <span>
                <span className="font-medium text-neutral-800 tabular-nums">Age {formatAge(m.age)} (after this chart):</span> {m.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {region === 'uk' && (
        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
          Worked out from your current age, as the calculator does not ask for your birth date. Check yours at{' '}
          <a
            href="https://www.gov.uk/state-pension-age"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-700 underline underline-offset-2 hover:text-primary-800"
          >
            gov.uk/state-pension-age
          </a>
          .
        </p>
      )}
    </div>
  );
}

/** Every-5-years summary table under the chart (the chart's text equivalent). */
export function ProjectionSummaryTable({
  rows,
  currency,
  caption,
}: {
  rows: ProjectionRow[];
  currency: string;
  caption: string;
}) {
  const fmt = (v: number) => formatCurrency(v, currency);
  const shown = rows.filter((row, i) => i === rows.length - 1 || (i > 0 && row.month % 60 === 0));
  if (rows.length < 2) return null;
  const ageLabel = (age: number) => {
    const whole = Math.floor(age + 1e-9);
    const months = Math.round((age - whole) * 12);
    return months === 0 ? `${whole}` : `${whole} + ${months} mo`;
  };
  return (
    <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
      <h3 className="text-sm font-medium text-neutral-700 p-4 pb-0 mb-3">Projection Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200/80">
              <th scope="col" className="text-left py-3 px-4 font-medium text-neutral-600">Age</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">Nominal</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">{todaysMoneyLabel(currency)}</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Contributions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={row.month} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-900 tabular-nums">{ageLabel(row.age)}</th>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">{fmt(row.nominal)}</td>
                <td className="py-2.5 px-4 text-right text-primary-600 tabular-nums">{fmt(row.real)}</td>
                <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">{fmt(row.contributions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
