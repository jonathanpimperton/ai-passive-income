/**
 * Shared financial math functions.
 * All calculators use these — they must be rigorously tested.
 *
 * Formulas are documented inline for E-E-A-T transparency.
 */

/**
 * Compound interest: A = P(1 + r/n)^(nt) + PMT * [((1 + r/n)^(nt) - 1) / (r/n)]
 *
 * @param principal - Initial investment (P)
 * @param monthlyContribution - Regular monthly deposit (PMT)
 * @param annualRate - Annual interest rate as decimal (e.g., 0.07 for 7%)
 * @param years - Number of years (t)
 * @param compoundingFrequency - Times interest compounds per year (n): 1=annually, 4=quarterly, 12=monthly, 365=daily
 * @param timing - 'end' (default) or 'beginning' — when contributions are made within each period
 * @returns Final balance
 */
export function compoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12,
  timing: 'end' | 'beginning' = 'end'
): number {
  const n = compoundingFrequency;
  const r = annualRate;
  const t = years;

  // Convert monthly contribution to per-compounding-period contribution
  const periodicContribution = monthlyContribution * (12 / n);

  // Principal growth: P(1 + r/n)^(nt)
  const principalGrowth = principal * Math.pow(1 + r / n, n * t);

  // Contribution growth (future value of annuity)
  let contributionGrowth = 0;
  if (r > 0) {
    contributionGrowth =
      periodicContribution * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));
  } else {
    contributionGrowth = periodicContribution * n * t;
  }

  // Beginning-of-period contributions earn one extra period of interest
  if (timing === 'beginning' && r > 0) {
    contributionGrowth *= (1 + r / n);
  }

  return principalGrowth + contributionGrowth;
}

/**
 * Generate a year-by-year breakdown of compound interest growth.
 * Useful for charting balance over time.
 */
export function compoundInterestSchedule(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12,
  timing: 'end' | 'beginning' = 'end'
): Array<{
  year: number;
  balance: number;
  totalContributions: number;
  totalInterest: number;
}> {
  const schedule = [];

  for (let y = 0; y <= years; y++) {
    const balance = compoundInterest(
      principal,
      monthlyContribution,
      annualRate,
      y,
      compoundingFrequency,
      timing
    );
    const totalContributions = principal + monthlyContribution * 12 * y;
    const totalInterest = balance - totalContributions;

    schedule.push({
      year: y,
      balance: Math.round(balance * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Loan amortization: Calculate monthly payment
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - Loan amount (P)
 * @param annualRate - Annual interest rate as decimal (e.g., 0.065 for 6.5%)
 * @param termMonths - Loan term in months (n)
 * @returns Monthly payment amount
 */
export function loanMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) return principal / termMonths;

  const r = annualRate / 12;
  const n = termMonths;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Generate a full amortization schedule.
 */
export function amortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): Array<{
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyPayment = loanMonthlyPayment(principal, annualRate, termMonths);
  const r = annualRate / 12;
  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = balance * r;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Savings goal: How much to save per month to reach a target.
 * PMT = FV * (r/n) / ((1 + r/n)^(nt) - 1)
 *
 * @param goalAmount - Target savings amount (FV)
 * @param currentSavings - Current amount saved
 * @param annualRate - Expected annual return rate as decimal
 * @param months - Number of months to reach goal
 * @returns Required monthly contribution
 */
export function monthlySavingsRequired(
  goalAmount: number,
  currentSavings: number,
  annualRate: number,
  months: number
): number {
  const remainingGoal =
    goalAmount - currentSavings * Math.pow(1 + annualRate / 12, months);

  if (annualRate === 0) return remainingGoal / months;

  const r = annualRate / 12;
  return (remainingGoal * r) / (Math.pow(1 + r, months) - 1);
}

/* ── Investment Return: Solve-for-X helpers ────────────────── */

/**
 * Solve for required monthly contribution to reach a target balance.
 */
export function solveForContribution(
  principal: number,
  targetAmount: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12
): number {
  const n = compoundingFrequency;
  const r = annualRate;
  const t = years;
  const principalGrowth = principal * Math.pow(1 + r / n, n * t);
  const remaining = targetAmount - principalGrowth;
  if (r === 0) return remaining / (12 * t);
  const periodicFV = (Math.pow(1 + r / n, n * t) - 1) / (r / n);
  const periodicContribution = remaining / periodicFV;
  return periodicContribution * (n / 12);
}

/**
 * Solve for required annual return rate to reach a target balance.
 * Uses Newton-Raphson iteration.
 */
export function solveForRate(
  principal: number,
  monthlyContribution: number,
  targetAmount: number,
  years: number,
  compoundingFrequency: number = 12
): number {
  let rate = 0.07; // initial guess 7%
  for (let i = 0; i < 100; i++) {
    const result = compoundInterest(principal, monthlyContribution, rate, years, compoundingFrequency);
    const delta = result - targetAmount;
    if (Math.abs(delta) < 0.01) break;
    const h = 0.0001;
    const resultH = compoundInterest(principal, monthlyContribution, rate + h, years, compoundingFrequency);
    const derivative = (resultH - result) / h;
    if (derivative === 0) break;
    rate = rate - delta / derivative;
    if (rate < 0) rate = 0;
    if (rate > 1) rate = 1;
  }
  return rate;
}

/**
 * Solve for required time (years) to reach a target balance.
 * Uses binary search.
 */
export function solveForTime(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  targetAmount: number,
  compoundingFrequency: number = 12
): number {
  let low = 0;
  let high = 100;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const result = compoundInterest(principal, monthlyContribution, annualRate, mid, compoundingFrequency);
    if (Math.abs(result - targetAmount) < 1) break;
    if (result < targetAmount) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Solve for required starting amount to reach a target balance.
 */
export function solveForPrincipal(
  monthlyContribution: number,
  targetAmount: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12
): number {
  const n = compoundingFrequency;
  const r = annualRate;
  const t = years;
  const periodicContribution = monthlyContribution * (12 / n);
  let contributionGrowth = 0;
  if (r > 0) {
    contributionGrowth = periodicContribution * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));
  } else {
    contributionGrowth = periodicContribution * n * t;
  }
  const remaining = targetAmount - contributionGrowth;
  const growthFactor = Math.pow(1 + r / n, n * t);
  return remaining / growthFactor;
}

/* ── Debt Payoff: Snowball & Avalanche ─────────────────────── */

export interface Debt {
  name: string;
  balance: number;
  rate: number;       // annual rate as decimal
  minPayment: number;
}

export interface DebtPayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: string[];
  timeline: Array<{
    month: number;
    totalBalance: number;
    totalInterest: number;
  }>;
}

/**
 * Calculate debt payoff using either snowball (smallest balance first)
 * or avalanche (highest rate first) strategy.
 */
export function debtPayoff(
  debts: Debt[],
  extraMonthlyPayment: number,
  strategy: 'snowball' | 'avalanche'
): DebtPayoffResult {
  if (debts.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [], timeline: [] };

  const balances = debts.map((d) => d.balance);
  const rates = debts.map((d) => d.rate);
  const mins = debts.map((d) => d.minPayment);
  const payoffOrder: string[] = [];
  const timeline: DebtPayoffResult['timeline'] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const maxMonths = 600;

  while (balances.some((b) => b > 0.01) && month < maxMonths) {
    month++;
    let monthInterest = 0;

    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * (rates[i] / 12);
      balances[i] += interest;
      monthInterest += interest;
    }
    totalInterest += monthInterest;

    let available = extraMonthlyPayment;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const payment = Math.min(mins[i], balances[i]);
      balances[i] -= payment;
      totalPaid += payment;
      if (balances[i] <= 0.01) available += mins[i] - payment;
    }

    const sorted = balances
      .map((b, i) => ({ idx: i, balance: b, rate: rates[i] }))
      .filter((d) => d.balance > 0);

    if (strategy === 'snowball') sorted.sort((a, b) => a.balance - b.balance);
    else sorted.sort((a, b) => b.rate - a.rate);

    for (const d of sorted) {
      if (available <= 0) break;
      const payment = Math.min(available, balances[d.idx]);
      balances[d.idx] -= payment;
      totalPaid += payment;
      available -= payment;
      if (balances[d.idx] <= 0.01 && !payoffOrder.includes(debts[d.idx].name)) {
        payoffOrder.push(debts[d.idx].name);
      }
    }

    timeline.push({
      month,
      totalBalance: balances.reduce((s, b) => s + Math.max(0, b), 0),
      totalInterest,
    });
  }

  for (const d of debts) {
    if (!payoffOrder.includes(d.name)) payoffOrder.push(d.name);
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffOrder,
    timeline,
  };
}

/**
 * Format a number as USD currency string.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as percentage.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a large number with commas.
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
