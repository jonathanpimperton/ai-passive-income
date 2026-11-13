/**
 * Multi-debt payoff: snowball (smallest balance first) and avalanche (highest
 * rate first), plus the row validation the Debt Payoff Calculator uses.
 *
 * Method, every month:
 *   1. Interest is added to each open balance (balance * APR / 12).
 *   2. Each open debt receives its own minimum payment (capped at its balance).
 *   3. The pool (extra payment + the minimums of debts already cleared, which
 *      roll over permanently, so the total monthly outlay stays constant) is
 *      spent on the open debts in strategy order: smallest balance first
 *      (snowball) or highest APR first (avalanche).
 * The rollover logic is unchanged from the version the Nov 2026 review
 * verified against an independent implementation over 10,000 random
 * portfolios (MATH-US "what works well" #2).
 *
 * Outcomes (review MATH-US-03: the old code printed "50 years" and "$40M
 * interest" for a debt that never shrinks):
 * - 'paid':          every debt cleared within the horizon; totals exact.
 * - 'never':         provably never cleared. After the horizon the same loop
 *                    keeps running (classification only: no totals, no
 *                    timeline) until the never-condition holds: every open
 *                    debt's monthly interest is at least the most it can be
 *                    paid. Under avalanche that is minimum + the whole pool
 *                    for the target (highest rate; the order never changes)
 *                    and its own minimum for every other debt. Under snowball
 *                    the order can change, so every open debt must cover
 *                    minimum + pool. Once that holds no balance can fall, no
 *                    debt can clear, the pool never grows and interest only
 *                    rises. Totals are unbounded and must not be shown.
 * - 'beyondHorizon': not cleared within the horizon and not provably never:
 *                    either it clears later (a slowly shrinking debt can
 *                    clear decades on and release its minimum) or the
 *                    classification cap (12,000 months) is reached first.
 *                    Totals cover the horizon only.
 * - 'empty':         no debts.
 * Debts are tracked by position, so two debts with the same name are kept
 * apart (review MATH-US-04).
 */

export interface Debt {
  name: string;
  balance: number;
  /** Annual rate as a decimal (0.1899 = 18.99%). */
  rate: number;
  minPayment: number;
}

export type Strategy = 'snowball' | 'avalanche';
export type DebtPayoffStatus = 'paid' | 'never' | 'beyondHorizon' | 'empty';

export interface DebtClearance {
  /** Position of the debt in the input array. */
  index: number;
  name: string;
  /** Month the debt was cleared (0 = had no balance), or null if not cleared within the horizon. */
  month: number | null;
}

export interface DebtTimelinePoint {
  month: number;
  totalBalance: number;
  totalInterest: number;
}

export interface DebtSimulation {
  status: DebtPayoffStatus;
  /** 'paid': months to clear everything. Otherwise the months simulated. */
  months: number;
  /** Rounded to cents. For 'never' / 'beyondHorizon' this covers the horizon only. */
  totalInterest: number;
  totalPaid: number;
  /** Total balance left at the end (0 when paid). */
  remainingBalance: number;
  /** Cleared debts in the order they were cleared, then any uncleared debts (month null) in input order. */
  clearances: DebtClearance[];
  timeline: DebtTimelinePoint[];
  /** Sum of the minimums of debts with a balance, plus the extra payment. Constant every month. */
  monthlyOutlay: number;
  /** Interest charged across all debts in month 1. */
  firstMonthInterest: number;
  horizonMonths: number;
}

export const DEBT_HORIZON_MONTHS = 600;
/** How far past the horizon the loop may run purely to tell "never" from "later". */
export const DEBT_CLASSIFY_CAP_MONTHS = 12_000;

interface LoopState {
  balances: number[];
  paidOff: boolean[];
  /** Minimums of cleared debts, rolled into the pool permanently. */
  rolled: number;
}

/**
 * One month of the payoff loop (interest, own minimums, then the pool in
 * strategy order). Mutates `st`; calls `onClear` for each debt cleared.
 */
function stepMonth(
  st: LoopState,
  rates: number[],
  mins: number[],
  extra: number,
  strategy: Strategy,
  onClear: (i: number) => void,
): { interest: number; paid: number } {
  const { balances, paidOff } = st;
  let monthInterest = 0;
  let paid = 0;
  for (let i = 0; i < balances.length; i++) {
    if (balances[i] <= 0) continue;
    const interest = balances[i] * (rates[i] / 12);
    balances[i] += interest;
    monthInterest += interest;
  }

  let available = extra + st.rolled;
  for (let i = 0; i < balances.length; i++) {
    if (balances[i] <= 0) continue;
    const payment = Math.min(mins[i], balances[i]);
    balances[i] -= payment;
    paid += payment;
    if (balances[i] <= 0.01) {
      balances[i] = 0;
      available += mins[i] - payment;
      if (!paidOff[i]) {
        paidOff[i] = true;
        st.rolled += mins[i];
      }
      onClear(i);
    }
  }

  const open = balances
    .map((b, i) => ({ idx: i, balance: b, rate: rates[i] }))
    .filter((d) => d.balance > 0);
  if (strategy === 'snowball') open.sort((a, b) => a.balance - b.balance);
  else open.sort((a, b) => b.rate - a.rate);

  for (const d of open) {
    if (available <= 0) break;
    const payment = Math.min(available, balances[d.idx]);
    balances[d.idx] -= payment;
    paid += payment;
    available -= payment;
    if (balances[d.idx] <= 0.01) {
      balances[d.idx] = 0;
      if (!paidOff[d.idx]) {
        paidOff[d.idx] = true;
        st.rolled += mins[d.idx];
      }
      onClear(d.idx);
    }
  }
  return { interest: monthInterest, paid };
}

/**
 * True when no open balance can ever fall again (see the module comment):
 * avalanche - the target covers minimum + pool, every other debt its own
 * minimum; snowball - every open debt covers minimum + pool (the target can
 * change as balances grow).
 */
function provablyNever(st: LoopState, rates: number[], mins: number[], extra: number, strategy: Strategy): boolean {
  const open: number[] = [];
  st.balances.forEach((b, i) => {
    if (b > 0.01) open.push(i);
  });
  if (open.length === 0) return false;
  const pool = extra + st.rolled;
  const interest = (i: number) => st.balances[i] * (rates[i] / 12);
  if (strategy === 'avalanche') {
    // Same stable order as stepMonth: highest rate first, ties by position.
    const target = [...open].sort((a, b) => rates[b] - rates[a])[0];
    return open.every((i) => interest(i) + 1e-9 >= mins[i] + (i === target ? pool : 0));
  }
  return open.every((i) => interest(i) + 1e-9 >= mins[i] + pool);
}

export function simulateDebtPayoff(
  debts: Debt[],
  extraMonthlyPayment: number,
  strategy: Strategy,
  options: { horizonMonths?: number } = {},
): DebtSimulation {
  const horizon = Math.max(1, Math.floor(options.horizonMonths ?? DEBT_HORIZON_MONTHS));
  const extra = Math.max(0, Number.isFinite(extraMonthlyPayment) ? extraMonthlyPayment : 0);

  const balances = debts.map((d) => (Number.isFinite(d.balance) ? Math.max(0, d.balance) : 0));
  const rates = debts.map((d) => (Number.isFinite(d.rate) ? Math.max(0, d.rate) : 0));
  const mins = debts.map((d) => (Number.isFinite(d.minPayment) ? Math.max(0, d.minPayment) : 0));
  const clearedMonth: Array<number | null> = debts.map(() => null);
  const clearOrder: number[] = [];
  const markCleared = (i: number, month: number) => {
    if (clearedMonth[i] === null) {
      clearedMonth[i] = month;
      clearOrder.push(i);
    }
  };

  // Debts that start with no balance are already clear; their minimums are
  // not part of the monthly budget.
  balances.forEach((b, i) => {
    if (b <= 0.01) {
      balances[i] = 0;
      markCleared(i, 0);
    }
  });

  const monthlyOutlay = extra + mins.reduce((s, m, i) => (balances[i] > 0 ? s + m : s), 0);
  const firstMonthInterest = balances.reduce((s, b, i) => s + b * (rates[i] / 12), 0);

  const timeline: DebtTimelinePoint[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  const state: LoopState = { balances, paidOff: debts.map((_, i) => clearedMonth[i] !== null), rolled: 0 };
  let month = 0;

  while (balances.some((b) => b > 0.01) && month < horizon) {
    month++;
    const m = month;
    const r = stepMonth(state, rates, mins, extra, strategy, (i) => markCleared(i, m));
    totalInterest += r.interest;
    totalPaid += r.paid;
    timeline.push({
      month,
      totalBalance: balances.reduce((s, b) => s + Math.max(0, b), 0),
      totalInterest,
    });
  }

  const remainingBalance = balances.reduce((s, b) => s + Math.max(0, b), 0);
  let status: DebtPayoffStatus;
  if (debts.length === 0) status = 'empty';
  else if (!balances.some((b) => b > 0.01)) status = 'paid';
  else if (provablyNever(state, rates, mins, extra, strategy)) status = 'never';
  else {
    // Classification only: run a copy past the horizon until it clears, becomes
    // provably never, or reaches the cap. Totals and timeline stay at the horizon.
    const probe: LoopState = { balances: [...balances], paidOff: [...state.paidOff], rolled: state.rolled };
    const cap = Math.max(DEBT_CLASSIFY_CAP_MONTHS, horizon);
    status = 'beyondHorizon';
    for (let m = horizon; m < cap; m++) {
      stepMonth(probe, rates, mins, extra, strategy, () => {});
      if (!probe.balances.some((b) => b > 0.01)) break; // clears later
      const runaway = probe.balances.some((b) => !Number.isFinite(b) || b > 1e250);
      const never = provablyNever(probe, rates, mins, extra, strategy);
      if (never || runaway) {
        status = never ? 'never' : 'beyondHorizon';
        break;
      }
    }
  }

  const clearances: DebtClearance[] = [
    ...clearOrder.map((i) => ({ index: i, name: debts[i].name, month: clearedMonth[i] })),
    ...debts
      .map((d, i) => ({ index: i, name: d.name, month: clearedMonth[i] }))
      .filter((c) => c.month === null),
  ];

  return {
    status,
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    remainingBalance: Math.round(remainingBalance * 100) / 100,
    clearances,
    timeline,
    monthlyOutlay,
    firstMonthInterest,
    horizonMonths: horizon,
  };
}

/* -- Legacy API (calculator-utils re-exports this) ----------- */

export interface DebtPayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Debt names in the order they were cleared, then uncleared debts. */
  payoffOrder: string[];
  timeline: DebtTimelinePoint[];
  /** Added Nov 2026: whether the months/totals describe a real payoff. */
  status: DebtPayoffStatus;
}

/**
 * Original signature used by the homepage and older callers: same rollover
 * method, 600-month horizon. Check `status` before presenting `months` or
 * totals as a payoff.
 */
export function debtPayoff(debts: Debt[], extraMonthlyPayment: number, strategy: Strategy): DebtPayoffResult {
  const sim = simulateDebtPayoff(debts, extraMonthlyPayment, strategy);
  return {
    months: sim.months,
    totalInterest: sim.totalInterest,
    totalPaid: sim.totalPaid,
    payoffOrder: sim.clearances.map((c) => c.name),
    timeline: sim.timeline,
    status: sim.status,
  };
}

/* -- Row validation for the calculator form ------------------- */

export interface DebtRowInput {
  name: string;
  /** null = blank field. */
  balance: number | null;
  /** APR in percent; null = blank field. */
  ratePercent: number | null;
  minPayment: number | null;
}

export type DebtField = 'balance' | 'ratePercent' | 'minPayment';

export interface DebtRowIssue {
  /** 0-based row position. */
  row: number;
  field: DebtField;
  message: string;
}

export interface PreparedDebts {
  /** Debts to simulate (names defaulted, rates as decimals). */
  debts: Debt[];
  /** Row position of each entry in `debts`. */
  rowOf: number[];
  /** Problems that keep a row out of the calculation. */
  issues: DebtRowIssue[];
  /** Completely blank rows (ignored without an error). */
  blankRows: number[];
}

export const MAX_APR_PERCENT = 1000;

/** Display name for a row: the typed name, or "Debt n". */
export function debtLabel(name: string, row: number): string {
  const trimmed = name.trim();
  return trimmed === '' ? `Debt ${row + 1}` : trimmed;
}

/**
 * Turn form rows into debts. Unnamed rows become "Debt n" and are included
 * (review CALC-UX-B-06). A row with a blank or impossible field is left out
 * and reported, never turned into NaN (CALC-UX-B-08 / MATH-US-04).
 */
export function prepareDebts(rows: DebtRowInput[]): PreparedDebts {
  const debts: Debt[] = [];
  const rowOf: number[] = [];
  const issues: DebtRowIssue[] = [];
  const blankRows: number[] = [];

  const labels = rows.map((r, i) => debtLabel(r.name, i));
  const counts = new Map<string, number>();
  labels.forEach((l) => counts.set(l.toLowerCase(), (counts.get(l.toLowerCase()) ?? 0) + 1));

  rows.forEach((r, i) => {
    const isBlank = r.name.trim() === '' && r.balance === null && r.ratePercent === null && r.minPayment === null;
    if (isBlank) {
      blankRows.push(i);
      return;
    }
    const rowIssues: DebtRowIssue[] = [];
    if (r.balance === null || !Number.isFinite(r.balance)) {
      rowIssues.push({ row: i, field: 'balance', message: 'Enter the balance.' });
    } else if (r.balance <= 0) {
      rowIssues.push({ row: i, field: 'balance', message: 'Enter a balance above 0.' });
    }
    if (r.ratePercent === null || !Number.isFinite(r.ratePercent)) {
      rowIssues.push({ row: i, field: 'ratePercent', message: 'Enter the APR (0 if interest-free).' });
    } else if (r.ratePercent < 0 || r.ratePercent > MAX_APR_PERCENT) {
      rowIssues.push({ row: i, field: 'ratePercent', message: `Enter an APR between 0% and ${MAX_APR_PERCENT}%.` });
    }
    if (r.minPayment === null || !Number.isFinite(r.minPayment)) {
      rowIssues.push({ row: i, field: 'minPayment', message: 'Enter the minimum payment (0 if none).' });
    } else if (r.minPayment < 0) {
      rowIssues.push({ row: i, field: 'minPayment', message: 'Enter a minimum payment of 0 or more.' });
    }
    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }
    const base = labels[i];
    const name = (counts.get(base.toLowerCase()) ?? 0) > 1 ? `${base} (debt ${i + 1})` : base;
    debts.push({
      name,
      balance: r.balance as number,
      rate: (r.ratePercent as number) / 100,
      minPayment: r.minPayment as number,
    });
    rowOf.push(i);
  });

  return { debts, rowOf, issues, blankRows };
}
