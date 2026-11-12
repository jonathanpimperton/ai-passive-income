/**
 * Credit card payoff simulation (Credit Card Payoff Calculator).
 *
 * Method, month by month, starting from the current balance B:
 *   interest  = B * APR / 12            (charged on the balance at the start of the month)
 *   minimum   = depends on the mode (below)
 *   payment   = min(minimum + extra, B + interest)
 *   B         = B + interest - payment
 *
 * Minimum payment modes:
 * - 'fixed':        a fixed amount every month.
 * - 'percentage':   a percentage of the balance, with a floor (e.g. 2%, at
 *                   least $25). The payment falls as the balance falls.
 * - 'interestPlus': the month's interest plus a percentage of the balance,
 *                   with a floor (e.g. interest + 1%, at least $25). This is
 *                   the structure UK rules require (FCA CONC 6.7.5R: at least
 *                   the interest, fees and charges plus 1% of the amount
 *                   outstanding) and the common US issuer formula; US bank
 *                   regulators expect minimums that "amortize the current
 *                   balance over a reasonable period of time" (FFIEC
 *                   interagency guidance, Jan 2003). It always reduces the
 *                   balance.
 *   Sources (accessed 2026-11-12):
 *   https://www.fca.org.uk/publications/finalised-guidance/credit-cards-retail-revolving-credit-coronavirus-temporary-guidance-firms/printable/print
 *   https://www.fdic.gov/news/financial-institution-letters/2003/FIL0302a.html
 *
 * Outcomes:
 * - 'paid':          cleared within the horizon; totals are exact.
 * - 'never':         the first payment does not exceed the first month's
 *                    interest. In every mode the monthly change in balance
 *                    is an increasing function of the balance, so if the
 *                    first month does not reduce the balance no later month
 *                    can: the debt is never repaid and totals are unbounded.
 *                    No totals are reported (review MATH-US-02/CALC-UX-B-05:
 *                    the old code reported two months of interest as the
 *                    total cost).
 * - 'beyondHorizon': the balance is falling but is not cleared within the
 *                    horizon (600 months = 50 years). Totals cover the
 *                    horizon only and are labelled as such.
 * - 'noBalance':     nothing to pay.
 */

export type MinPaymentMode = 'fixed' | 'percentage' | 'interestPlus';

export interface CardPayoffInputs {
  balance: number;
  /** APR in percent (22.99 = 22.99%). */
  aprPercent: number;
  mode: MinPaymentMode;
  /** 'fixed' mode: the monthly minimum. */
  fixedPayment: number;
  /** 'percentage' / 'interestPlus' modes: percent of the balance (2 = 2%). */
  percentOfBalance: number;
  /** 'percentage' / 'interestPlus' modes: the minimum never drops below this. */
  floor: number;
  /** Paid on top of the minimum every month. */
  extra: number;
  /** Months to simulate before giving up. Default 600 (50 years). */
  horizonMonths?: number;
}

export interface CardMonth {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export type CardPayoffStatus = 'paid' | 'never' | 'beyondHorizon' | 'noBalance';

export interface CardPayoffResult {
  status: CardPayoffStatus;
  /** 'paid': months to clear. 'beyondHorizon': the horizon. Otherwise 0. */
  months: number;
  /** 'paid': total interest. 'beyondHorizon': interest within the horizon. Otherwise 0. */
  totalInterest: number;
  /** 'paid': total paid. 'beyondHorizon': paid within the horizon. Otherwise 0. */
  totalPaid: number;
  /** Balance left at the end of the horizon ('beyondHorizon'), else 0. */
  remainingBalance: number;
  /** Month-by-month rows (values rounded to cents). Empty for 'never' and 'noBalance'. */
  schedule: CardMonth[];
  /** Interest charged in month 1. */
  firstMonthInterest: number;
  /** Total payment in month 1 (minimum + extra, capped at balance + interest). */
  firstPayment: number;
  horizonMonths: number;
}

export const CARD_HORIZON_MONTHS = 600;

/** The minimum payment due this month, before any extra. */
export function minimumPaymentFor(
  balance: number,
  interest: number,
  mode: MinPaymentMode,
  fixedPayment: number,
  percentOfBalance: number,
  floor: number,
): number {
  if (mode === 'fixed') return Math.max(0, fixedPayment);
  const share = balance * (percentOfBalance / 100);
  if (mode === 'percentage') return Math.max(share, floor);
  return Math.max(interest + share, floor);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function simulateCardPayoff(inputs: CardPayoffInputs): CardPayoffResult {
  const horizon = Math.max(1, Math.floor(inputs.horizonMonths ?? CARD_HORIZON_MONTHS));
  const empty = (status: CardPayoffStatus, firstMonthInterest = 0, firstPayment = 0): CardPayoffResult => ({
    status,
    months: 0,
    totalInterest: 0,
    totalPaid: 0,
    remainingBalance: 0,
    schedule: [],
    firstMonthInterest,
    firstPayment,
    horizonMonths: horizon,
  });

  const balance0 = Number.isFinite(inputs.balance) ? inputs.balance : 0;
  if (balance0 <= 0.005) return empty('noBalance');

  const monthlyRate = Math.max(0, inputs.aprPercent) / 100 / 12;
  const extra = Math.max(0, inputs.extra || 0);
  const paymentFor = (b: number, interest: number) =>
    Math.min(
      minimumPaymentFor(b, interest, inputs.mode, inputs.fixedPayment, inputs.percentOfBalance, inputs.floor) + extra,
      b + interest,
    );

  const firstInterest = balance0 * monthlyRate;
  const firstPayment = paymentFor(balance0, firstInterest);
  // Never: the first month does not reduce the balance (see module comment for why
  // this is decisive). A cleared-in-one-month balance is never "never".
  if (firstPayment < balance0 + firstInterest && firstPayment <= firstInterest + 1e-9) {
    return empty('never', firstInterest, firstPayment);
  }

  let remaining = balance0;
  let totalInterest = 0;
  let totalPaid = 0;
  const schedule: CardMonth[] = [];
  for (let month = 1; month <= horizon; month++) {
    const interest = remaining * monthlyRate;
    const payment = paymentFor(remaining, interest);
    const principal = payment - interest;
    remaining = remaining + interest - payment;
    if (remaining < 0.005) remaining = 0;
    totalInterest += interest;
    totalPaid += payment;
    schedule.push({
      month,
      payment: round2(payment),
      principal: round2(principal),
      interest: round2(interest),
      balance: round2(remaining),
    });
    if (remaining === 0) {
      return {
        status: 'paid',
        months: month,
        totalInterest: round2(totalInterest),
        totalPaid: round2(totalPaid),
        remainingBalance: 0,
        schedule,
        firstMonthInterest: firstInterest,
        firstPayment,
        horizonMonths: horizon,
      };
    }
  }
  return {
    status: 'beyondHorizon',
    months: horizon,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    remainingBalance: round2(remaining),
    schedule,
    firstMonthInterest: firstInterest,
    firstPayment,
    horizonMonths: horizon,
  };
}

/**
 * Level monthly payment that clears `balance` in `months` months at the APR
 * (standard amortizing payment). Used for the "clears it in 5 years" hint.
 */
export function paymentToClearIn(balance: number, aprPercent: number, months: number): number {
  if (balance <= 0 || months <= 0) return 0;
  const r = Math.max(0, aprPercent) / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r) / -Math.expm1(-months * Math.log1p(r));
}

/** The smallest monthly payment, rounded up to the next whole unit, that reduces the balance. */
export function paymentToStopGrowth(balance: number, aprPercent: number): number {
  const interest = Math.max(0, balance) * (Math.max(0, aprPercent) / 100 / 12);
  return Math.floor(interest) + 1;
}
