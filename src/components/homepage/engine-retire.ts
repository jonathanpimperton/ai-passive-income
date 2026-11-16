/**
 * The Retire question's solver for the homepage engine.
 *
 * Kept apart from engine-math.ts on purpose: src/lib/retirement.ts is a shared
 * chunk of about 3 KB gzip, and the homepage only needs it once a visitor
 * opens the Retire question. index.astro computes the default answer at build
 * time and passes it to the island as a prop; the island loads this module
 * with a dynamic import() when the question opens.
 */

import { solveRetirementAge, formatDuration, type RetirementAgeResult } from '../../lib/retirement';
import { RETIREMENT_DEFAULTS } from './engine-math';

/** The solver's answer plus the two display values the engine needs from retirement.ts. */
export interface EngineRetireAnswer {
  result: RetirementAgeResult;
  /** "29 years 10 months" for a reached target, else null. */
  duration: string | null;
  /** Whole age at which the target is reached (same rule as the tool), else null. */
  wholeAge: number | null;
}

/** Whole age shown for a reached target (same rule as the tool). */
export function wholeRetirementAge(age: number): number {
  return Math.floor(age + 1e-9);
}

/** The full Retirement Age calculator's solver, with its defaults for what the engine does not ask. */
export function engineRetirement(
  currentAge: number,
  currentSavings: number,
  monthlyContribution: number,
): EngineRetireAnswer {
  const result = solveRetirementAge({
    currentAge,
    currentSavings,
    monthlyContribution,
    annualReturn: RETIREMENT_DEFAULTS.annualReturnPct / 100,
    target: RETIREMENT_DEFAULTS.target,
    maxAge: RETIREMENT_DEFAULTS.maxAge,
  });
  return {
    result,
    duration: result.status === 'reached' ? formatDuration(result.months) : null,
    wholeAge: result.status === 'reached' ? wholeRetirementAge(result.age) : null,
  };
}

/** The default answer (index.astro computes it at build time and passes it to the island). */
export function defaultRetireAnswer(): EngineRetireAnswer {
  const d = RETIREMENT_DEFAULTS;
  return engineRetirement(d.currentAge, d.currentSavings, d.monthlyContribution);
}
