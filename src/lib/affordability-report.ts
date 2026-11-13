/**
 * Wording for the UK affordability results that leave the page (email
 * results, PDF export) and the matching on-screen labels.
 *
 * Kept out of the component so it can be tested: with a stress margin of 0
 * there is NO stress test (the payment is checked at the product rate, as
 * for fixes of 5 years or more), and nothing may still call it a stress test
 * (plan 5.4: getInputs/getResults reflect the real state honestly).
 */
import type { ResultItem } from './email-types';
import type { UkAffordabilityResult } from './mortgage-affordability';

export interface UkStressSettings {
  /** Points over max(product rate, revert-to rate); 0 = no stress test */
  stressMarginPct: number;
  /** The product (pay) rate, % */
  ratePct: number;
  /** Lenders' average revert-to rate, % */
  revertRatePct: number;
  /** Payment + commitments ceiling, % of take-home pay */
  maxShareOfTakeHomePct: number;
}

const pct = (v: number) => `${Number(v.toFixed(2))}%`;

export const hasStressTest = (s: Pick<UkStressSettings, 'stressMarginPct'>) => s.stressMarginPct > 0;

/** Short on-screen label for the payment the check uses ("Payment at stress rate 7.58%"). */
export function ukCheckedPaymentLabel(s: UkStressSettings, stressRatePct: number): string {
  return hasStressTest(s) ? `Payment at stress rate ${pct(stressRatePct)}` : `Payment check at ${pct(s.ratePct)}`;
}

/** Name of the check in the indicator and limits table ("Stress test" / "Payment check"). */
export function ukCheckName(s: Pick<UkStressSettings, 'stressMarginPct'>): string {
  return hasStressTest(s) ? 'Stress test' : 'Payment check';
}

/** The "Stress Test" line in the emailed / exported inputs. */
export function ukStressTestInput(s: UkStressSettings, stressRatePct: number): { label: string; value: string } {
  const share = `max ${s.maxShareOfTakeHomePct}% of take-home pay`;
  if (!hasStressTest(s)) {
    return { label: 'Stress Test', value: `None (fixed 5+ years): payment checked at your ${pct(s.ratePct)} rate; ${share}` };
  }
  return {
    label: 'Stress Test',
    value: `${pct(stressRatePct)} (the higher of your ${pct(s.ratePct)} rate and the ${pct(s.revertRatePct)} average standard variable rate, + ${s.stressMarginPct} pt); ${share}`,
  };
}

/** UK-specific emailed / exported results (after price and loan). */
export function ukResultItems(r: UkAffordabilityResult, s: UkStressSettings, fmt: (v: number) => string): ResultItem[] {
  const items: ResultItem[] = [{ label: `Monthly Payment at ${pct(s.ratePct)}`, value: fmt(r.monthlyPI) }];
  if (hasStressTest(s)) {
    items.push({ label: `Payment at Stress Rate ${pct(r.stressRatePct)}`, value: fmt(r.stressedPayment) });
  }
  items.push({
    label: `${ukCheckName(s)}: Share of Take-Home Pay`,
    value: `${(hasStressTest(s) ? r.stressedShareOfTakeHome : r.shareOfTakeHome).toFixed(1)}%`,
  });
  items.push({ label: 'Income Multiple', value: `${r.incomeMultiple.toFixed(2)}x` });
  return items;
}
