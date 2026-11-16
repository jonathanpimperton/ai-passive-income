import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { compoundInterest, formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { US_DEFAULT_TAX_YEAR, isUsTaxYear, type UsTaxYear } from '../../lib/us-rates';
import { UK_TAX_YEAR } from '../../lib/uk-rates';
import { AFFORDABILITY_DEFAULTS } from '../../lib/mortgage-affordability';
import { defaultMortgageRateInfo, rateAttribution } from '../../lib/market-rates';
import { getCurrencyConfig, setActiveCurrency, useActiveCurrency } from '../../lib/currency';
import { safeSessionGet } from '../../lib/safe-storage';
import { taxClockNow } from '../../lib/tax-years.mjs';
import SliderInput from '../ui/SliderInput';
import {
  MORTGAGE_TERM_YEARS,
  RETIREMENT_DEFAULTS,
  US_YEAR_SESSION_KEY,
  engineAffordability,
  engineMortgageRate,
  mortgageCurrency,
  mortgageRegionForCurrency,
  preferredUsYear,
  regionForCurrency,
  takeHomeUk,
  takeHomeUs,
  type EngineRegion,
  type MortgageRegion,
} from './engine-math';
import type { EngineRetireAnswer } from './engine-retire';

/* ── Types ───────────────────────────────────────────────── */

type PromptId = 0 | 1 | 2 | 3;

interface MortgageState {
  income: number;
  downPayment: number;
}

interface SnowballState {
  monthly: number;
  rate: number;
}

interface RetirementState {
  currentAge: number;
  currentSavings: number;
  monthlyContribution: number;
}

interface TakeHomeState {
  salaryUS: number;
  salaryUK: number;
}

/** Props every panel gets. `idp` keeps the desktop and mobile copies' element ids apart (A11Y-PERF-14). */
interface PanelBase {
  idp: 'd' | 'm';
  region: EngineRegion;
  sym: string;
}

type CurrencyChoice = 'USD' | 'GBP' | 'EUR';

/** Props of a panel that has a country switch: it sets the site's display currency. */
interface CountryPanel {
  onCurrencyChange: (code: CurrencyChoice) => void;
}

/* ── Prompt Config ───────────────────────────────────────── */

const SNOWBALL_DEFAULT_MONTHLY = 500;

function promptsFor(sym: string) {
  return [
    { id: 0 as const, question: 'Can I actually afford this house?', short: 'Mortgage' },
    { id: 1 as const, question: `What does ${sym}${SNOWBALL_DEFAULT_MONTHLY}/mo grow into?`, short: 'Compound' },
    { id: 2 as const, question: 'When can I retire?', short: 'Retire' },
    { id: 3 as const, question: "What's my take-home pay?", short: 'Salary' },
  ];
}

const ARROW_ICON = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const CTA_CLASS =
  'shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-all duration-150';

const BIG_NUMBER_CLASS =
  'text-2xl sm:text-4xl lg:text-5xl font-bold tabular-nums lining-nums result-number whitespace-nowrap';

const UNIT_CLASS = 'text-sm text-neutral-500 mt-0.5';

/* ── Shared pieces ───────────────────────────────────────── */

/**
 * One short sentence for screen readers, announced about half a second after
 * the answer settles. It starts equal to the current text and stays silent
 * (aria-live off) for the first 1.5 s, so nothing is read out on load, when
 * the visitor's country is applied after hydration, or when a tab opens. The
 * panel itself is NOT a live region (plan 5.4, A11Y-PERF-03).
 */
function Announcer({ text }: { text: string }) {
  const [announced, setAnnounced] = useState(text);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 1500);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(text), 500);
    return () => window.clearTimeout(t);
  }, [text]);
  return (
    <p className="sr-only" role="status" aria-live={live ? 'polite' : 'off'} aria-atomic="true">
      {announced}
    </p>
  );
}

interface CountryOption {
  code: CurrencyChoice;
  label: string;
}

const COUNTRY_US: CountryOption = { code: 'USD', label: 'US' };
const COUNTRY_UK: CountryOption = { code: 'GBP', label: 'UK' };
const COUNTRY_EUR: CountryOption = { code: 'EUR', label: 'EUR' };

/**
 * Country switch. Each button sets the site's display currency, so the full
 * calculators open in the same country as the preview. `pressed` is null when
 * the visitor's currency has no option here (no button looks chosen), and
 * `hint` then says what the preview shows instead.
 */
function CountryToggle({
  options, pressed, onChange, hint,
}: {
  options: CountryOption[];
  pressed: CurrencyChoice | null;
  onChange: (code: CurrencyChoice) => void;
  hint?: string;
}) {
  return (
    <div className="mb-4" role="group" aria-label="Country">
      <div className="inline-flex rounded-lg border border-neutral-200/80 p-0.5 bg-neutral-50">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => onChange(o.code)}
            aria-pressed={pressed === o.code}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${
              pressed === o.code ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

/* ── Segmented Bar ───────────────────────────────────────── */

interface BarSegment {
  label: string;
  value: number;
  className: string;
}

function SegmentedBar({ segments, thick = false }: { segments: BarSegment[]; thick?: boolean }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className={`flex gap-[3px] ${thick ? 'h-4' : 'h-3'} rounded-full overflow-hidden`}>
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={seg.label}
              className={`first:rounded-l-full last:rounded-r-full transition-all duration-300 ${seg.className}`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${pct.toFixed(0)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct < 5) return null;
          return (
            <span key={seg.label} className="text-xs text-neutral-500">
              {seg.label} {pct.toFixed(0)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mortgage Panel ──────────────────────────────────────── */

const AD = AFFORDABILITY_DEFAULTS;

function MortgagePanel({
  idp, mregion, onCurrencyChange, state, onChange,
}: Pick<PanelBase, 'idp'> & CountryPanel & { mregion: MortgageRegion; state: MortgageState; onChange: (s: MortgageState) => void }) {
  const isUK = mregion === 'UK';
  const cur = mortgageCurrency(mregion);
  const symbol = getCurrencyConfig(cur).symbol;
  // The tool's own formatter for the country (EUR reads 414.693 EUR, as on the tool page).
  const fmt = (v: number) => formatCurrency(Math.round(v), cur);
  const term = MORTGAGE_TERM_YEARS[mregion];
  const rate = engineMortgageRate(mregion);
  const rateInfo = defaultMortgageRateInfo(mregion === 'UK' ? 'uk' : mregion === 'EUR' ? 'eur' : 'us', term);

  // The full calculator's own solver and defaults (MATH-US-07): the figure
  // here equals the tool's for the same income and deposit, in every country.
  const result = useMemo(
    () => engineAffordability(mregion, state.income, state.downPayment),
    [mregion, state.income, state.downPayment],
  );
  const ok = result.status === 'ok';
  const animatedPrice = useAnimatedNumber(result.maxPrice);

  const segments: BarSegment[] = ok
    ? [
        { label: 'Loan', value: result.maxLoan, className: 'bg-primary-500' },
        { label: isUK ? 'Deposit' : 'Down payment', value: state.downPayment, className: 'bg-neutral-300' },
      ]
    : [];

  let subline: string;
  if (!ok) {
    subline = 'Existing debts or fixed costs already use up the limit at this income.';
  } else if (result.region === 'uk') {
    subline = `${fmt(result.monthlyPI)}/mo at ${rate}% over ${term} years. ${
      result.binding === 'lti'
        ? `Capped at ${result.ltiCap}x your income.`
        : `Limited by a ${result.stressRatePct.toFixed(2)}% rate-rise check.`
    }`;
  } else if (result.region === 'eur') {
    subline = `${fmt(result.monthlyPI)}/mo at ${rate}% over ${term} years. Payments plus other debts stay within ${AD.eurMaxDebtServicePct}% of gross income.`;
  } else {
    subline = `${fmt(result.totalMonthly)}/mo all-in (loan, tax, insurance${result.needsPMI ? ', PMI' : ''}) at ${rate}% over ${term} years`;
  }

  const attribution = rateAttribution(rateInfo);
  const assumptions =
    mregion === 'UK'
      ? `Assumes no other credit payments, a ${AD.ltiCap}x income cap and a rate-rise check. Rate: ${attribution}.`
      : mregion === 'EUR'
        ? `Assumes ${fmt(AD.monthlyDebts)}/mo other debts and a ${AD.eurMaxDebtServicePct}% combined debt limit; rules differ by country. Rate: ${attribution}.`
        : `Assumes ${fmt(AD.monthlyDebts)}/mo other debts, ${AD.propertyTaxRate}% property tax, ${fmt(AD.insuranceAnnual)}/yr insurance and the ${AD.frontEndPct}/${AD.backEndPct} rule. Rate: ${attribution}.`;

  const liveText = ok
    ? `Maximum home price ${fmt(result.maxPrice)}.`
    : 'No home fits these limits at this income.';

  return (
    <div className="space-y-5">
      <Announcer text={liveText} />
      {/* Result — capacity gauge */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">{ok ? 'You could afford up to' : 'No home fits these limits'}</p>
            <p data-engine-answer="mortgage" className={BIG_NUMBER_CLASS}>{ok ? fmt(animatedPrice) : fmt(0)}</p>
          </div>
          <a href="/tools/debt-and-loans/mortgage-affordability/" className={CTA_CLASS}>
            Open full calculator
            {ARROW_ICON}
          </a>
        </div>
        <p className="text-sm text-neutral-500">{subline}</p>
        <SegmentedBar segments={segments} thick />
        <p className="text-xs text-neutral-500 leading-relaxed">{assumptions}</p>
      </div>

      <div className="h-px bg-neutral-200/80" />

      {/* Controls */}
      <div>
        <CountryToggle
          options={[COUNTRY_US, COUNTRY_UK, COUNTRY_EUR]}
          pressed={cur}
          onChange={onCurrencyChange}
        />
        <SliderInput
          label="Annual income"
          id={`engine-${idp}-income`}
          value={state.income}
          min={30000}
          max={500000}
          step={5000}
          onChange={(v) => onChange({ ...state, income: v })}
          prefix={symbol}
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <SliderInput
            label={isUK ? 'Deposit' : 'Down payment'}
            id={`engine-${idp}-down`}
            value={state.downPayment}
            min={0}
            max={200000}
            step={5000}
            onChange={(v) => onChange({ ...state, downPayment: v })}
            prefix={symbol}
            formatDisplay={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Snowball Panel ──────────────────────────────────────── */

const SNOWBALL_YEARS = 30;

function SnowballPanel({
  idp, sym, state, onChange,
}: PanelBase & { state: SnowballState; onChange: (s: SnowballState) => void }) {
  const result = useMemo(() => {
    const finalBalance = compoundInterest(0, state.monthly, state.rate / 100, SNOWBALL_YEARS, 12);
    const totalContributions = state.monthly * 12 * SNOWBALL_YEARS;
    const interestEarned = finalBalance - totalContributions;
    const multiplier = totalContributions > 0 ? finalBalance / totalContributions : 0;
    return { finalBalance, totalContributions, interestEarned, multiplier };
  }, [state.monthly, state.rate]);

  const animatedBalance = useAnimatedNumber(result.finalBalance);

  const segments: BarSegment[] = [
    { label: 'Interest earned', value: result.interestEarned, className: 'bg-success-500' },
    { label: 'Your contributions', value: result.totalContributions, className: 'bg-neutral-300' },
  ];

  return (
    <div className="space-y-5">
      <Announcer text={`After ${SNOWBALL_YEARS} years: ${sym}${formatNumber(Math.round(result.finalBalance))}.`} />
      {/* Result — growth overpowering contributions */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">After {SNOWBALL_YEARS} years</p>
            <p data-engine-answer="compound" className={BIG_NUMBER_CLASS}>
              {sym}{formatNumber(Math.round(animatedBalance))}
            </p>
          </div>
          <a href="/tools/saving-and-growth/compound-interest/" className={CTA_CLASS}>
            Open full calculator
            {ARROW_ICON}
          </a>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-success-600 tabular-nums">{result.multiplier.toFixed(1)}x</span>
          <span className="text-sm text-neutral-500">your money back — {sym}{formatNumber(Math.round(result.interestEarned))} is pure interest</span>
        </div>
        <SegmentedBar segments={segments} />
      </div>

      <div className="h-px bg-neutral-200/80" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Monthly amount"
          id={`engine-${idp}-monthly`}
          value={state.monthly}
          min={50}
          max={5000}
          step={50}
          onChange={(v) => onChange({ ...state, monthly: v })}
          prefix={sym}
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <SliderInput
            label="Expected return"
            id={`engine-${idp}-rate`}
            value={state.rate}
            min={1}
            max={15}
            step={0.5}
            onChange={(v) => onChange({ ...state, rate: v })}
            suffix="%"
            formatDisplay={(v) => v.toFixed(1)}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Retirement Panel ────────────────────────────────────── */

function RetirementPanel({
  idp, sym, state, onChange, answer, failed,
}: PanelBase & {
  state: RetirementState;
  onChange: (s: RetirementState) => void;
  /** The solver's answer for `state`; null while the solver is still loading. */
  answer: EngineRetireAnswer | null;
  failed: boolean;
}) {
  const fmt = (v: number) => `${sym}${formatNumber(Math.round(v))}`;
  const { target, annualReturnPct, maxAge } = RETIREMENT_DEFAULTS;

  const solved = answer?.result ?? null;
  const reachedAge = answer?.wholeAge ?? state.currentAge;
  const animatedAge = useAnimatedNumber(reachedAge);

  // The full Retirement Age calculator's solver: an unreachable target is
  // reported as such, never as an age that looks like an answer (MATH-US-08).
  let label = 'You could retire at';
  let headline: string;
  let detail: string;
  let liveText: string;
  let segments: BarSegment[] = [];

  if (failed && !solved) {
    label = 'Your answer';
    headline = 'Not loaded';
    detail = 'The retirement answer could not load. Open the full calculator for it.';
    liveText = detail;
  } else if (!solved) {
    headline = '...';
    detail = 'Working it out.';
    liveText = '';
  } else if (solved.status === 'reached') {
    headline = `Age ${Math.round(animatedAge)}`;
    detail = `${answer?.duration} of saving ${fmt(state.monthlyContribution)}/mo to reach ${fmt(target)} at ${annualReturnPct}% a year`;
    liveText = `You reach ${fmt(target)} at age ${reachedAge}, in ${answer?.duration}.`;
    segments = [
      { label: 'Saving years', value: solved.months / 12, className: 'bg-primary-500' },
      { label: 'Retirement years', value: Math.max(0, maxAge - solved.age), className: 'bg-primary-300' },
    ];
  } else if (solved.status === 'already') {
    label = 'Your savings are';
    headline = 'Already there';
    detail = `Your ${fmt(solved.balance)} already meets the ${fmt(target)} target.`;
    liveText = `Your savings already meet ${fmt(target)}.`;
  } else {
    label = 'Your target is';
    headline = `Not by age ${maxAge}`;
    detail = `At ${fmt(state.monthlyContribution)}/mo and ${annualReturnPct}% a year you would have ${fmt(solved.balanceAtMaxAge)} at ${maxAge}, ${fmt(solved.shortfall)} short of ${fmt(target)}.${
      solved.requiredMonthly !== null ? ` About ${fmt(solved.requiredMonthly)} a month would get you there.` : ''
    }`;
    liveText = `${fmt(target)} is not reached by age ${maxAge}; you would have ${fmt(solved.balanceAtMaxAge)}.`;
  }

  return (
    <div className="space-y-5">
      <Announcer text={liveText} />
      {/* Result */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">{label}</p>
            <p data-engine-answer="retire" className={BIG_NUMBER_CLASS}>{headline}</p>
          </div>
          <a href="/tools/income-and-planning/retirement-age/" className={CTA_CLASS}>
            Open full calculator
            {ARROW_ICON}
          </a>
        </div>
        <p className="text-sm text-neutral-600 font-medium">{detail}</p>
        <SegmentedBar segments={segments} />
        <p className="text-xs text-neutral-500 leading-relaxed">
          Assumes {annualReturnPct}% a year and a {fmt(target)} target, as in the full calculator.
        </p>
      </div>

      <div className="h-px bg-neutral-200/80" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Current age"
          id={`engine-${idp}-retire-age`}
          value={state.currentAge}
          min={18}
          max={65}
          step={1}
          onChange={(v) => onChange({ ...state, currentAge: v })}
          suffix="yrs"
        />
        <div className="mt-3">
          <SliderInput
            label="Saved so far"
            id={`engine-${idp}-retire-saved`}
            value={state.currentSavings}
            min={0}
            max={500000}
            step={5000}
            textMax={10000000}
            onChange={(v) => onChange({ ...state, currentSavings: v })}
            prefix={sym}
            formatDisplay={formatNumber}
          />
        </div>
        <div className="mt-3">
          <SliderInput
            label="Monthly savings"
            id={`engine-${idp}-retire-monthly`}
            value={state.monthlyContribution}
            min={100}
            max={5000}
            step={50}
            onChange={(v) => onChange({ ...state, monthlyContribution: v })}
            prefix={sym}
            formatDisplay={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Take-Home Pay Panel ─────────────────────────────────────── */

function TakeHomePanel({
  idp, region, sym, onCurrencyChange, currency, taxYear, state, onChange,
}: PanelBase & CountryPanel & { currency: string; taxYear: UsTaxYear; state: TakeHomeState; onChange: (s: TakeHomeState) => void }) {
  const isUK = region === 'UK';
  const salary = isUK ? state.salaryUK : state.salaryUS;

  // The salary calculators' own engines (UK and US), standard assumptions:
  // no pension, student loan, state tax or 401(k).
  const result = useMemo(
    () => (isUK ? takeHomeUk(salary) : takeHomeUs(salary, taxYear)),
    [isUK, salary, taxYear],
  );

  // One animated annual figure drives both headlines, so the monthly figure is
  // always annual / 12 from the same result, never a separate rounding path.
  const animatedAnnual = useAnimatedNumber(result.netAnnual);
  const monthlyShown = Math.round(animatedAnnual / 12);
  const annualShown = Math.round(animatedAnnual);

  const segments: BarSegment[] = [
    { label: 'Take-home', value: result.netAnnual, className: 'bg-primary-500' },
    { label: isUK ? 'Income tax' : 'Federal tax', value: result.incomeTax, className: 'bg-red-300' },
    { label: result.otherLabel, value: result.other, className: 'bg-neutral-300' },
  ];

  const calcHref = isUK
    ? '/tools/income-and-planning/salary-uk/'
    : '/tools/income-and-planning/salary-us/';

  const basis = isUK
    ? `${UK_TAX_YEAR} rates, England, Wales and NI, no pension or student loan`
    : `${taxYear} federal tax and FICA, single filer, no state tax or 401(k)`;

  // A euro visitor has no euro tax model: the US figures show and no button looks chosen.
  const euro = currency === 'EUR';

  return (
    <div className="space-y-5">
      <Announcer
        text={`Take-home pay ${sym}${formatNumber(Math.round(result.netAnnual / 12))} a month, ${sym}${formatNumber(Math.round(result.netAnnual))} a year.`}
      />
      {/* Result: monthly and annual carry equal weight (owner requirement, 13 Nov 2026).
          Same pattern as the salary calculators: the figure, then "a month" / "a year" under it. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Your take-home pay</p>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3 sm:gap-x-10">
              <div className="min-w-0">
                <p data-engine-net="monthly" className={BIG_NUMBER_CLASS}>
                  {sym}{formatNumber(monthlyShown)}
                </p>
                <p className={UNIT_CLASS}>a month</p>
              </div>
              <div className="min-w-0">
                <p data-engine-net="annual" className={BIG_NUMBER_CLASS}>
                  {sym}{formatNumber(annualShown)}
                </p>
                <p className={UNIT_CLASS}>a year</p>
              </div>
            </div>
          </div>
          <a href={calcHref} className={CTA_CLASS}>
            Open full calculator
            {ARROW_ICON}
          </a>
        </div>
        <p className="text-sm text-neutral-500">
          After {sym}{formatNumber(Math.round(result.totalDeductions))} a year in deductions · {basis}
        </p>
        <SegmentedBar segments={segments} />
      </div>

      <div className="h-px bg-neutral-200/80" />

      {/* Controls */}
      <div>
        <CountryToggle
          options={[COUNTRY_US, COUNTRY_UK]}
          pressed={euro ? null : isUK ? 'GBP' : 'USD'}
          onChange={onCurrencyChange}
          hint={euro ? 'No euro tax model: US figures shown. The buttons set the site currency.' : undefined}
        />
        <SliderInput
          label="Annual salary"
          id={`engine-${idp}-salary`}
          value={salary}
          min={isUK ? 15000 : 20000}
          max={isUK ? 250000 : 500000}
          step={isUK ? 500 : 1000}
          textMax={1000000}
          onChange={(v) => onChange(isUK ? { ...state, salaryUK: v } : { ...state, salaryUS: v })}
          prefix={sym}
          formatDisplay={formatNumber}
          minLabel={`${sym}${isUK ? '15K' : '20K'}`}
          maxLabel={`${sym}${isUK ? '250K' : '500K'}`}
        />
      </div>
    </div>
  );
}

/* ── Hydration: the year the server rendered ─────────────── */

/** Attribute on the engine root (data-engine-year in the JSX below) that carries the server's tax year. */
const YEAR_ATTR = 'data-engine-year';

/**
 * The US tax year the server rendered, read from this island's SSR markup
 * during hydration. The module default differs between build time and
 * page-load time across 1 January (and local time zones differ from the build
 * machine's), so the first client render reuses the server's year (no
 * hydration mismatch, no React #418); the mount effect then applies the
 * visitor's choice or today's default, exactly as SalaryCalc does.
 */
function readRenderedUsYear(): UsTaxYear | null {
  if (typeof document === 'undefined') return null;
  const year = Number(document.querySelector<HTMLElement>(`[${YEAR_ATTR}]`)?.getAttribute(YEAR_ATTR));
  return isUsTaxYear(year) ? year : null;
}

/* ── Mobile accordion: keep the opened question in view ──── */

/** Height of the sticky site header the opened question must clear. */
const STICKY_HEADER_CLEARANCE = 72;
/** A little longer than the panels' 300 ms collapse transition. */
const COLLAPSE_SETTLE_MS = 360;

/**
 * Opening a question collapses the one above it, which pulls the new panel up
 * (sometimes above the top of the screen). Once the collapse has settled, bring
 * the opened question's header back to the top if it ended up under the site
 * header. Smooth unless the visitor prefers reduced motion; a visitor's own
 * scroll is never overridden when the header is already in view.
 */
function keepOpenedQuestionInView(id: PromptId) {
  const header = document.getElementById(`engine-mobile-tab-${id}`);
  if (!header || header.getBoundingClientRect().top >= STICKY_HEADER_CLEARANCE) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  header.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
}

/* ── Main DecisionEngine Component ───────────────────────── */

interface DecisionEngineProps {
  /**
   * The Retire question's answer for the default inputs, computed by
   * index.astro at build time. The retirement solver (a 3 KB gzip chunk) is
   * loaded only when that question opens, so the first render, which must
   * match the server's, uses this.
   */
  retireDefault: EngineRetireAnswer;
}

export default function DecisionEngine({ retireDefault }: DecisionEngineProps) {
  const [active, setActive] = useState<PromptId>(0);
  const [mortgage, setMortgage] = useState<MortgageState>({ income: AD.annualIncome, downPayment: AD.deposit });
  const [snowball, setSnowball] = useState<SnowballState>({ monthly: SNOWBALL_DEFAULT_MONTHLY, rate: 7 });
  const [retirement, setRetirement] = useState<RetirementState>({
    currentAge: RETIREMENT_DEFAULTS.currentAge,
    currentSavings: RETIREMENT_DEFAULTS.currentSavings,
    monthlyContribution: RETIREMENT_DEFAULTS.monthlyContribution,
  });
  const [takeHome, setTakeHome] = useState<TakeHomeState>({ salaryUS: 85000, salaryUK: 45000 });

  // Country follows the site's display currency: USD on the server and in the
  // hydration render (so the markup matches), then the visitor's stored choice
  // or their region's default (UK -> GBP, euro area -> EUR) straight after
  // hydration (HOME-CHROME-10). The mortgage preview has the tool's US, UK and
  // EUR models; the other panels have US and UK (EUR shows the US model).
  const currency = useActiveCurrency();
  const region = regionForCurrency(currency);
  const mregion = mortgageRegionForCurrency(currency);
  const sym = region === 'UK' ? '£' : '$';
  const onCurrencyChange = useCallback((code: CurrencyChoice) => setActiveCurrency(code), []);

  const [taxYear, setTaxYear] = useState<UsTaxYear>(() => readRenderedUsYear() ?? US_DEFAULT_TAX_YEAR);
  useEffect(() => {
    const next = preferredUsYear(safeSessionGet(US_YEAR_SESSION_KEY), taxClockNow());
    setTaxYear((current) => (current === next ? current : next));
  }, []);

  const prompts = useMemo(() => promptsFor(sym), [sym]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchPrompt = useCallback((id: PromptId) => {
    if (id === active) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActive(id);
      setIsTransitioning(false);
    }, 150);
  }, [active]);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, id: PromptId) => {
    let next: PromptId | null = null;
    const count = prompts.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      next = ((id + 1) % count) as PromptId;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      next = ((id + count - 1) % count) as PromptId;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = (count - 1) as PromptId;
    }
    if (next !== null) {
      switchPrompt(next);
      const btn = document.getElementById(`engine-tab-${next}`);
      btn?.focus();
    }
  }, [switchPrompt, prompts.length]);

  // Mobile accordion state — null means all collapsed
  const [mobileExpanded, setMobileExpanded] = useState<PromptId | null>(0);
  const scrollTimer = useRef<number | undefined>(undefined);

  const toggleMobileAccordion = useCallback((id: PromptId) => {
    const opening = mobileExpanded !== id;
    setMobileExpanded(opening ? id : null);
    window.clearTimeout(scrollTimer.current);
    if (opening) {
      scrollTimer.current = window.setTimeout(() => keepOpenedQuestionInView(id), COLLAPSE_SETTLE_MS);
    }
  }, [mobileExpanded]);
  useEffect(() => () => window.clearTimeout(scrollTimer.current), []);

  // Retirement solver: loaded when the Retire question is open (or an input
  // already differs from the default), never on first paint. The default
  // answer comes from the server's prop, so the first render matches it.
  const RD = RETIREMENT_DEFAULTS;
  const retireIsDefault =
    retirement.currentAge === RD.currentAge &&
    retirement.currentSavings === RD.currentSavings &&
    retirement.monthlyContribution === RD.monthlyContribution;
  const retireWanted = active === 2 || mobileExpanded === 2 || !retireIsDefault;
  const [retireSolver, setRetireSolver] = useState<typeof import('./engine-retire') | null>(null);
  const [retireFailed, setRetireFailed] = useState(false);
  useEffect(() => {
    if (!retireWanted || retireSolver || retireFailed) return;
    let cancelled = false;
    import('./engine-retire')
      .then((m) => { if (!cancelled) setRetireSolver(m); })
      .catch(() => { if (!cancelled) setRetireFailed(true); });
    return () => { cancelled = true; };
  }, [retireWanted, retireSolver, retireFailed]);
  const retireAnswer = useMemo<EngineRetireAnswer | null>(() => {
    if (retireIsDefault) return retireDefault;
    return retireSolver
      ? retireSolver.engineRetirement(retirement.currentAge, retirement.currentSavings, retirement.monthlyContribution)
      : null;
  }, [retireIsDefault, retireDefault, retireSolver, retirement.currentAge, retirement.currentSavings, retirement.monthlyContribution]);

  const renderPanel = (id: PromptId, idp: 'd' | 'm') => {
    const base = { idp, region, sym };
    switch (id) {
      case 0: return <MortgagePanel idp={idp} mregion={mregion} onCurrencyChange={onCurrencyChange} state={mortgage} onChange={setMortgage} />;
      case 1: return <SnowballPanel {...base} state={snowball} onChange={setSnowball} />;
      case 2: return <RetirementPanel {...base} state={retirement} onChange={setRetirement} answer={retireAnswer} failed={retireFailed} />;
      case 3: return <TakeHomePanel {...base} currency={currency} onCurrencyChange={onCurrencyChange} taxYear={taxYear} state={takeHome} onChange={setTakeHome} />;
    }
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ─────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-6" data-engine-year={taxYear}>
        {/* Tab list */}
        <div>
        <div role="tablist" aria-label="Choose a financial question">
          {prompts.map((p) => (
            <button
              key={p.id}
              id={`engine-tab-${p.id}`}
              role="tab"
              aria-selected={active === p.id}
              aria-controls="engine-panel"
              tabIndex={active === p.id ? 0 : -1}
              onClick={() => switchPrompt(p.id)}
              onKeyDown={(e) => handleTabKeyDown(e, p.id)}
              className={`group w-full text-left px-5 py-5 transition-all duration-200 border-l-[4px] rounded-r-lg ${
                active === p.id
                  ? 'border-l-primary-500 font-bold text-neutral-900 bg-primary-50/50'
                  : 'border-l-transparent font-medium text-neutral-800 hover:text-neutral-900 hover:bg-neutral-50 hover:border-l-neutral-300'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-xl leading-relaxed">{p.question}</span>
                <svg
                  className={`w-4 h-4 shrink-0 transition-all duration-150 ${
                    active === p.id ? 'text-primary-500' : 'text-neutral-300 group-hover:text-neutral-500'
                  }`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          ))}
        </div>
          {/* Footer sits OUTSIDE the tablist — role="tablist" only allows tab children */}
          <div className="px-5 pt-4 mt-2 border-t border-neutral-200/60">
            <p className="text-xs text-neutral-500 mb-2">Preview only. Open the full calculator for the full breakdown.</p>
            <a
              href="/tools/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-150"
            >
              View all calculators
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
        </div>

        {/* Calculator panel. Not a live region: each panel holds one short announcer sentence. */}
        <div
          id="engine-panel"
          role="tabpanel"
          aria-labelledby={`engine-tab-${active}`}
          ref={panelRef}
          className={`engine-panel rounded-xl p-6 sm:p-8 transition-opacity duration-150 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {renderPanel(active, 'd')}
        </div>
      </div>

      {/* ── Mobile layout (< lg) — Accordion ────────────────── */}
      <div className="lg:hidden space-y-3">
        {prompts.map((p) => {
          const isOpen = mobileExpanded === p.id;
          return (
            <div key={p.id} className="rounded-xl overflow-hidden border border-neutral-200/80">
              <button
                id={`engine-mobile-tab-${p.id}`}
                aria-expanded={isOpen}
                aria-controls={`engine-mobile-panel-${p.id}`}
                onClick={() => toggleMobileAccordion(p.id)}
                className={`w-full text-left px-5 py-4 flex items-center justify-between transition-colors duration-150 ${
                  isOpen ? 'bg-primary-50 font-semibold text-neutral-900' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span className="text-[15px] font-medium leading-snug pr-4">{p.question}</span>
                <svg
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Collapsed panels are inert and hidden from assistive tech, so their sliders
                  and links are neither tabbable nor announced (HOME-CHROME-07). */}
              <div
                id={`engine-mobile-panel-${p.id}`}
                role="region"
                aria-labelledby={`engine-mobile-tab-${p.id}`}
                inert={isOpen ? undefined : true}
                aria-hidden={isOpen ? undefined : true}
                className={`engine-panel overflow-hidden transition-all duration-300 border-t border-neutral-100 ${
                  isOpen ? 'max-h-[1100px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
                }`}
              >
                <div className="p-5 sm:p-6">
                  {renderPanel(p.id, 'm')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: View all link */}
      <div className="lg:hidden mt-4 text-center">
        <a
          href="/tools/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-150"
        >
          View all calculators
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>
    </>
  );
}
