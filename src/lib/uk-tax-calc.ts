/**
 * Shared UK tax calculation functions.
 *
 * - The simple functions at the top (calcPersonalAllowance, calcIncomeTax,
 *   calcSimpleIncomeTax, calcNI, calcStudentLoan) serve the homepage engine,
 *   the build-time take-home hub and the OG images. Their signatures are
 *   stable; other workstreams depend on them.
 * - calculateUkTakeHome() below is the full UK Salary calculator engine:
 *   Scottish and Welsh rates, tax codes, three pension methods, student loans
 *   and adjusted net income. The SalaryUkCalc component only wires state to it.
 *
 * Primary sources (accessed 12 Nov 2026):
 * - Personal Allowance taper: "Your personal allowance goes down by £1 for
 *   every £2 that your adjusted net income is above £100,000."
 *   https://www.gov.uk/income-tax-rates/income-over-100000
 * - Adjusted net income (relief-at-source contributions deducted grossed up):
 *   https://www.gov.uk/guidance/adjusted-net-income
 * - Student loans use "the same gross pay amount that you would use to work
 *   out your employer's secondary Class 1 National Insurance contributions":
 *   https://www.gov.uk/guidance/special-rules-for-student-loans ; HMRC CSLM17055
 *   "If it is liable to Class 1 NICs then it is also liable to Student and or
 *   postgraduate loan repayments". Salary sacrifice reduces NIC pay, so it
 *   reduces student loan pay; net pay pension deductions do not.
 *   https://www.gov.uk/hmrc-internal-manuals/collection-of-student-loans-manual/cslm17055
 * - Relief at source: the provider adds basic-rate relief; higher rates are
 *   relieved by increasing the basic rate limit and the higher rate limit
 *   (Scotland: the Scottish basic rate limit and every limit above it) by the
 *   contribution. Finance Act 2004 s192(4), (4A), (4B):
 *   https://www.legislation.gov.uk/ukpga/2004/12/section/192 ;
 *   HMRC PTM044220 (relief at source; Scottish starter-rate difference not
 *   recovered): https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044220
 * - K codes: tax cannot exceed half of pre-tax pay:
 *   https://www.gov.uk/tax-codes/k-in-your-tax-code
 * - Tax-Free Childcare and free childcare for working parents end when
 *   expected adjusted net income is over £100,000:
 *   https://www.gov.uk/tax-free-childcare/check-if-youre-eligible ;
 *   https://www.gov.uk/check-eligible-free-childcare-if-youre-working
 * - Pension annual allowance £60,000:
 *   https://www.gov.uk/tax-on-your-private-pension/annual-allowance
 */

import {
  UK_INCOME_TAX,
  UK_NI,
  UK_STUDENT_LOANS,
  UK_SCOTTISH_TAX,
} from './uk-rates';
import {
  parseUkTaxCode,
  regionForCode,
  type ParsedTaxCode,
  type UkTaxRegion,
} from './uk-tax-codes';

const PERSONAL_ALLOWANCE = UK_INCOME_TAX.personalAllowance;
const PA_TAPER_THRESHOLD = UK_INCOME_TAX.paTaperThreshold;
const PA_TAPER_LIMIT = UK_INCOME_TAX.paTaperLimit;
const UK_BANDS: [number, number][] = UK_INCOME_TAX.bands.map(b => [b.from, b.rate]);
const SCOTTISH_BANDS: [number, number][] = UK_SCOTTISH_TAX.bands.map(b => [b.from, b.rate]);

const NI_PRIMARY_THRESHOLD = UK_NI.primaryThreshold;
const NI_UPPER_EARNINGS_LIMIT = UK_NI.upperEarningsLimit;
const NI_MAIN_RATE = UK_NI.mainRate;
const NI_UPPER_RATE = UK_NI.upperRate;

/** Basic-rate relief added by a relief-at-source provider (rest-of-UK basic rate). */
const RAS_BASIC_RELIEF = UK_INCOME_TAX.bands.find(b => b.name === 'Basic')!.rate;
/** Pension annual allowance (GOV.UK, 2026/27). Not in uk-rates.ts yet; see REQUEST for W1-TAX. */
export const UK_PENSION_ANNUAL_ALLOWANCE = 60_000;
/** Adjusted net income above which Tax-Free Childcare and working-parent free hours stop. */
export const UK_CHILDCARE_ANI_LIMIT = 100_000;

/**
 * Calculate Personal Allowance with taper for high earners.
 * Between £100K-£125,140 the PA reduces by £1 for every £2 over £100K.
 */
export function calcPersonalAllowance(grossIncome: number, taxCodeOverride?: number | null): number {
  if (taxCodeOverride !== undefined && taxCodeOverride !== null) return taxCodeOverride;
  if (grossIncome <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  if (grossIncome >= PA_TAPER_LIMIT) return 0;
  const reduction = Math.floor((grossIncome - PA_TAPER_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

/** Tax on `taxable` (income after allowances) through progressive bands. */
export function calcBandTax(taxable: number, bands: [number, number][]): number {
  let tax = 0;
  for (let i = 0; i < bands.length; i++) {
    const [threshold, rate] = bands[i];
    const nextThreshold = i + 1 < bands.length ? bands[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    tax += (Math.min(taxable, nextThreshold) - threshold) * rate;
  }
  return tax;
}

/**
 * Calculate UK income tax using the standard (non-Scottish) bands.
 * For Scottish rates or tax code overrides, use calcUkIncomeTax.
 *
 * @param taxableIncome - Gross income minus pension (the amount to tax)
 * @param bands - Tax bands to use (defaults to UK standard)
 * @param personalAllowance - Override PA (for tax code scenarios)
 */
export function calcIncomeTax(
  taxableIncome: number,
  bands: [number, number][] = UK_BANDS,
  personalAllowance?: number
): number {
  const pa = personalAllowance ?? calcPersonalAllowance(taxableIncome);
  return calcBandTax(Math.max(0, taxableIncome - pa), bands);
}

/**
 * Calculate simple UK income tax for a given gross salary.
 * Uses standard PA with taper and standard (non-Scottish) bands.
 * This is the function the homepage uses.
 */
export function calcSimpleIncomeTax(grossIncome: number): number {
  return calcIncomeTax(grossIncome);
}

/**
 * Calculate employee National Insurance contributions.
 * 8% on earnings between primary threshold and UEL, 2% above.
 */
export function calcNI(grossIncome: number): number {
  if (grossIncome <= NI_PRIMARY_THRESHOLD) return 0;
  const mainBand = Math.min(grossIncome, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD;
  const upperBand = Math.max(0, grossIncome - NI_UPPER_EARNINGS_LIMIT);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad';

/**
 * Annual student loan repayment: a flat rate on pay above the plan's
 * threshold. `nicPay` must be the pay Class 1 NICs are worked out on, i.e.
 * AFTER salary sacrifice (see the sources at the top of this file).
 */
export function calcStudentLoan(nicPay: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = UK_STUDENT_LOANS[plan];
  return nicPay > threshold ? (nicPay - threshold) * rate : 0;
}

/* ── Full engine: tax codes, regions, pension methods ──────────────────── */

/** Personal Allowance after the £100,000 taper, from adjusted net income. */
export function taperedPersonalAllowance(adjustedNetIncome: number): number {
  return calcPersonalAllowance(adjustedNetIncome);
}

/**
 * The allowance to use for a parsed code.
 *
 * - Blank or unrecognised code: the standard allowance with the taper.
 * - L codes: the £100,000 taper reduces only the Personal Allowance part of
 *   the code. A code at or above 1257L keeps its extra allowances (e.g. job
 *   expenses) on top of the tapered allowance. A code below 1257L is assumed
 *   to already reflect HMRC's adjustments, so the allowance is the lower of
 *   the code and the tapered allowance (no double taper for a code like 757L
 *   that HMRC has already reduced).
 * - M, N, T and 0T codes: the code's figure as issued (HMRC has done the
 *   "other calculations" a T code signals).
 */
export function allowanceForCode(code: ParsedTaxCode, adjustedNetIncome: number): { allowance: number; tapered: boolean } {
  const tapered = taperedPersonalAllowance(adjustedNetIncome);
  if (code.kind === 'blank' || code.kind === 'invalid') {
    return { allowance: tapered, tapered: tapered < PERSONAL_ALLOWANCE };
  }
  if (code.kind !== 'allowance') return { allowance: 0, tapered: false };
  if (!code.tapers) return { allowance: code.allowance, tapered: false };
  const extra = Math.max(0, code.allowance - PERSONAL_ALLOWANCE);
  const allowance = Math.max(0, Math.min(code.allowance, tapered) + extra);
  return { allowance, tapered: tapered < PERSONAL_ALLOWANCE };
}

function bandsFor(region: UkTaxRegion): [number, number][] {
  return region === 'scotland' ? SCOTTISH_BANDS : UK_BANDS;
}

/**
 * Bands with relief-at-source contributions applied: the basic rate limit and
 * every limit above it rise by the gross contribution (FA 2004 s192(4)/(4A)).
 * For rest-of-UK bands that is every threshold after the basic band; for
 * Scotland it is every threshold above the Scottish basic band (the starter
 * band is unchanged).
 */
export function extendBands(region: UkTaxRegion, extension: number): [number, number][] {
  const base = region === 'scotland' ? UK_SCOTTISH_TAX.bands : UK_INCOME_TAX.bands;
  const basicIndex = base.findIndex(b => b.name === 'Basic');
  return base.map((b, i) => [i > basicIndex && extension > 0 ? b.from + extension : b.from, b.rate]);
}

export interface UkIncomeTaxInput {
  /** Pay taxed through PAYE: salary after salary sacrifice and net-pay pension deductions. */
  pay: number;
  /** Adjusted net income, for the Personal Allowance taper. */
  adjustedNetIncome: number;
  region: UkTaxRegion;
  code: ParsedTaxCode;
  /** Gross relief-at-source contributions (extend the bands). */
  bandExtension?: number;
}

export interface UkIncomeTaxResult {
  tax: number;
  /** Allowance used (0 for flat-rate, K and NT codes). */
  personalAllowance: number;
  /** True when the £100k taper reduced the allowance. */
  tapered: boolean;
  /** Income the bands were applied to (0 for flat-rate / NT codes). */
  taxableIncome: number;
  /** True when the K-code half-of-pay limit reduced the tax. */
  kCapApplied: boolean;
}

/** Income tax for one employment under a parsed tax code. */
export function calcUkIncomeTax(input: UkIncomeTaxInput): UkIncomeTaxResult {
  const pay = Math.max(0, input.pay);
  const { code, region } = input;
  const extension = Math.max(0, input.bandExtension ?? 0);
  const bands = extension > 0 ? extendBands(region, extension) : bandsFor(region);

  if (code.kind === 'nt') {
    return { tax: 0, personalAllowance: 0, tapered: false, taxableIncome: 0, kCapApplied: false };
  }
  if (code.kind === 'flat') {
    return { tax: pay * code.rate, personalAllowance: 0, tapered: false, taxableIncome: 0, kCapApplied: false };
  }
  if (code.kind === 'k') {
    const taxableIncome = pay + code.addition;
    const uncapped = calcBandTax(taxableIncome, bands);
    const cap = pay * 0.5;
    return {
      tax: Math.min(uncapped, cap),
      personalAllowance: 0,
      tapered: false,
      taxableIncome,
      kCapApplied: uncapped > cap,
    };
  }
  const { allowance, tapered } = allowanceForCode(code, input.adjustedNetIncome);
  const taxableIncome = Math.max(0, pay - allowance);
  return { tax: calcBandTax(taxableIncome, bands), personalAllowance: allowance, tapered, taxableIncome, kCapApplied: false };
}

export type PensionMethod = 'netPay' | 'reliefAtSource' | 'sacrifice';
export type PensionInputMode = 'percent' | 'amount';

export interface UkTakeHomeInput {
  /** Gross annual salary before any deductions. */
  salary: number;
  /** The "Scottish tax rates" toggle (an S or C tax code prefix overrides it). */
  scottish: boolean;
  taxCode: string;
  studentLoan: StudentLoanPlan;
  pensionMode: PensionInputMode;
  /** Percent of full gross salary (used when pensionMode is 'percent'). */
  pensionPercent: number;
  /** Annual amount going into the pension, gross (used when pensionMode is 'amount'). */
  pensionAmount: number;
  pensionMethod: PensionMethod;
}

export interface UkTakeHomeResult {
  gross: number;
  code: ParsedTaxCode;
  region: UkTaxRegion;
  regionSource: 'code' | 'toggle';
  pension: {
    method: PensionMethod;
    /** Total going into the pension (for relief at source: your payment plus basic-rate relief). */
    gross: number;
    /** What leaves your pay for the pension (relief at source: 80% of gross). */
    fromPay: number;
    /** Basic-rate relief the provider claims and adds (relief at source only). */
    providerRelief: number;
    /** The requested amount was more than the salary and was limited to it. */
    capped: boolean;
  };
  /** Pay taxed through PAYE (after sacrifice and net-pay deductions). */
  payForTax: number;
  /** Pay Class 1 NICs and student loans use (after salary sacrifice only). */
  payForNI: number;
  adjustedNetIncome: number;
  personalAllowance: number;
  /** The £100k taper reduced the allowance. */
  tapered: boolean;
  incomeTax: number;
  kCapApplied: boolean;
  ni: number;
  studentLoan: number;
  /** Income tax + NI + student loan + pension from pay. */
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  netWeekly: number;
  netDaily: number;
  /** Total deductions / gross (0 when gross is 0). */
  effectiveDeductionRate: number;
  /** Salary sacrifice only: NI and student loan saved compared with net pay for the same contribution. */
  sacrificeSaving: { ni: number; studentLoan: number } | null;
  /** Adjusted net income is inside the taper zone (£100,000 to £125,140) and the taper applies. */
  inTaperZone: boolean;
  /** Effective marginal rates on the next £100 of pay (income tax only, and with NI and student loan). */
  marginal: { incomeTax: number; withNiAndLoan: number };
  /** Adjusted net income is over £100,000: Tax-Free Childcare and working-parent free hours stop. */
  overChildcareLimit: boolean;
  /** Extra gross pension contribution that would bring adjusted net income to £100,000 (0 if already there). */
  pensionToReach100k: number;
  /** Gross contribution above the £60,000 annual allowance (charge not modelled). */
  overAnnualAllowance: boolean;
}

function grossPension(input: UkTakeHomeInput): { gross: number; capped: boolean } {
  const salary = Math.max(0, input.salary);
  const requested = input.pensionMode === 'amount'
    ? Math.max(0, input.pensionAmount)
    : salary * Math.max(0, input.pensionPercent) / 100;
  return requested > salary ? { gross: salary, capped: true } : { gross: requested, capped: false };
}

/** Income tax + NI + student loan for given pay figures; used for marginal rates. */
function coreDeductions(input: UkTakeHomeInput, code: ParsedTaxCode, region: UkTaxRegion, salary: number) {
  const { gross } = grossPension({ ...input, salary });
  const method = input.pensionMethod;
  const sacrifice = method === 'sacrifice' ? gross : 0;
  const netPay = method === 'netPay' ? gross : 0;
  const ras = method === 'reliefAtSource' ? gross : 0;

  const payForNI = salary - sacrifice;
  const payForTax = salary - sacrifice - netPay;
  const adjustedNetIncome = Math.max(0, salary - sacrifice - netPay - ras);
  const tax = calcUkIncomeTax({ pay: payForTax, adjustedNetIncome, region, code, bandExtension: ras });
  return {
    gross,
    sacrifice,
    netPay,
    ras,
    payForNI,
    payForTax,
    adjustedNetIncome,
    tax,
    ni: calcNI(payForNI),
    studentLoan: calcStudentLoan(payForNI, input.studentLoan),
  };
}

/** The full UK take-home calculation behind the UK Salary calculator. */
export function calculateUkTakeHome(input: UkTakeHomeInput): UkTakeHomeResult {
  const salary = Math.max(0, Number.isFinite(input.salary) ? input.salary : 0);
  const code = parseUkTaxCode(input.taxCode);
  const { region, source } = regionForCode(code, input.scottish);
  const { capped } = grossPension({ ...input, salary });

  const d = coreDeductions(input, code, region, salary);
  const providerRelief = d.ras * RAS_BASIC_RELIEF;
  const fromPay = d.sacrifice + d.netPay + (d.ras - providerRelief);

  const incomeTax = d.tax.tax;
  const totalDeductions = incomeTax + d.ni + d.studentLoan + fromPay;
  const netAnnual = salary - totalDeductions;

  // Marginal rates: deductions on the next £100 of salary with the pension
  // held at its current amount (so a percentage pension doesn't mask the rate).
  const STEP = 100;
  const fixedPension: UkTakeHomeInput = { ...input, pensionMode: 'amount', pensionAmount: d.gross };
  const next = coreDeductions(fixedPension, code, region, salary + STEP);
  const marginalTax = (next.tax.tax - incomeTax) / STEP;
  const marginalAll = (next.tax.tax + next.ni + next.studentLoan - incomeTax - d.ni - d.studentLoan) / STEP;

  const taperApplies = code.kind === 'blank' || code.kind === 'invalid' || (code.kind === 'allowance' && code.tapers);
  const ani = d.adjustedNetIncome;

  return {
    gross: salary,
    code,
    region,
    regionSource: source,
    pension: { method: input.pensionMethod, gross: d.gross, fromPay, providerRelief, capped },
    payForTax: d.payForTax,
    payForNI: d.payForNI,
    adjustedNetIncome: ani,
    personalAllowance: d.tax.personalAllowance,
    tapered: d.tax.tapered,
    incomeTax,
    kCapApplied: d.tax.kCapApplied,
    ni: d.ni,
    studentLoan: d.studentLoan,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    netWeekly: netAnnual / 52,
    netDaily: netAnnual / 260,
    effectiveDeductionRate: salary > 0 ? totalDeductions / salary : 0,
    sacrificeSaving: d.sacrifice > 0
      ? {
          ni: calcNI(salary) - d.ni,
          studentLoan: calcStudentLoan(salary, input.studentLoan) - d.studentLoan,
        }
      : null,
    inTaperZone: taperApplies && ani > PA_TAPER_THRESHOLD && ani < PA_TAPER_LIMIT,
    marginal: { incomeTax: marginalTax, withNiAndLoan: marginalAll },
    overChildcareLimit: ani > UK_CHILDCARE_ANI_LIMIT,
    pensionToReach100k: Math.max(0, ani - UK_CHILDCARE_ANI_LIMIT),
    overAnnualAllowance: d.gross > UK_PENSION_ANNUAL_ALLOWANCE,
  };
}

// Re-export band data so the full calculator can use the same constants
export { UK_BANDS, SCOTTISH_BANDS, PERSONAL_ALLOWANCE, PA_TAPER_THRESHOLD, PA_TAPER_LIMIT };
