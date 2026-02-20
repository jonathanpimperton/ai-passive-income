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
 * @returns Final balance
 */
export function compoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12
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
  compoundingFrequency: number = 12
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
      compoundingFrequency
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
