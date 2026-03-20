import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { compoundInterest, solveForRetirementAge } from '../../lib/calculator-utils';
import { loanMonthlyPayment } from '../../lib/calculator-utils';
import { formatNumber } from '../../lib/calculator-utils';
import SliderInput from '../ui/SliderInput';

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
  monthlyContribution: number;
}

interface SolarState {
  systemCost: number;
  electricityBill: number;
}

/* ── Prompt Config ───────────────────────────────────────── */

const PROMPTS = [
  { id: 0 as const, question: 'Can I actually afford this house?', short: 'Mortgage' },
  { id: 1 as const, question: 'How fast does $500/mo snowball?', short: 'Compound' },
  { id: 2 as const, question: 'When can I retire?', short: 'Retire' },
  { id: 3 as const, question: 'Should I invest in solar panels?', short: 'Solar' },
];

/* ── Segmented Bar ───────────────────────────────────────── */

interface BarSegment {
  label: string;
  value: number;
  className: string;
}

function SegmentedBar({ segments }: { segments: BarSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex gap-[3px] h-3 rounded-full overflow-hidden">
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

/* ── Mortgage Bar — thick capacity gauge ─────────────────── */

function MortgageBar({ segments }: { segments: BarSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex gap-[3px] h-4 rounded-full overflow-hidden">
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

const MORTGAGE_RATE = 0.0675;
const MORTGAGE_TERM_YEARS = 30;
const MORTGAGE_DTI = 0.36;

function MortgagePanel({ state, onChange }: { state: MortgageState; onChange: (s: MortgageState) => void }) {
  const result = useMemo(() => {
    const maxMonthlyPayment = (state.income / 12) * MORTGAGE_DTI;
    const termMonths = MORTGAGE_TERM_YEARS * 12;
    const r = MORTGAGE_RATE / 12;
    const factor = (Math.pow(1 + r, termMonths) - 1) / (r * Math.pow(1 + r, termMonths));
    const maxLoan = maxMonthlyPayment * factor;
    const maxPrice = maxLoan + state.downPayment;
    const monthlyPayment = loanMonthlyPayment(maxLoan, MORTGAGE_RATE, termMonths);
    return { maxPrice, maxLoan, monthlyPayment };
  }, [state.income, state.downPayment]);

  const animatedPrice = useAnimatedNumber(result.maxPrice);

  const segments: BarSegment[] = [
    { label: 'Loan', value: result.maxLoan, className: 'bg-primary-500' },
    { label: 'Down payment', value: state.downPayment, className: 'bg-neutral-300' },
  ];

  return (
    <div className="space-y-5">
      {/* Result — capacity gauge */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">You could afford up to</p>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-bold tabular-nums lining-nums result-number whitespace-nowrap">
              ${formatNumber(Math.round(animatedPrice))}
            </p>
          </div>
          <a
            href="/tools/debt-and-loans/mortgage-affordability"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2.5 rounded-lg transition-all duration-150"
          >
            Open full calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
        <p className="text-sm text-neutral-500">
          ${formatNumber(Math.round(result.monthlyPayment))}/mo at {(MORTGAGE_RATE * 100).toFixed(2)}% over {MORTGAGE_TERM_YEARS} years
        </p>
        <MortgageBar segments={segments} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Annual income"
          id="engine-income"
          value={state.income}
          min={30000}
          max={500000}
          step={5000}
          onChange={(v) => onChange({ ...state, income: v })}
          prefix="$"
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <SliderInput
            label="Down payment"
            id="engine-down"
            value={state.downPayment}
            min={0}
            max={200000}
            step={5000}
            onChange={(v) => onChange({ ...state, downPayment: v })}
            prefix="$"
            formatDisplay={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Snowball Panel ──────────────────────────────────────── */

const SNOWBALL_YEARS = 30;

function SnowballPanel({ state, onChange }: { state: SnowballState; onChange: (s: SnowballState) => void }) {
  const result = useMemo(() => {
    const finalBalance = compoundInterest(0, state.monthly, state.rate / 100, SNOWBALL_YEARS, 12);
    const totalContributions = state.monthly * 12 * SNOWBALL_YEARS;
    const interestEarned = finalBalance - totalContributions;
    const multiplier = totalContributions > 0 ? finalBalance / totalContributions : 0;
    return { finalBalance, totalContributions, interestEarned, multiplier };
  }, [state.monthly, state.rate]);

  const animatedBalance = useAnimatedNumber(result.finalBalance);

  const segments: BarSegment[] = [
    { label: 'Interest earned', value: result.interestEarned, className: 'bg-accent-500' },
    { label: 'Your contributions', value: result.totalContributions, className: 'bg-neutral-300' },
  ];

  return (
    <div className="space-y-5">
      {/* Result — growth overpowering contributions */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">After {SNOWBALL_YEARS} years</p>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-bold tabular-nums lining-nums result-number whitespace-nowrap">
              ${formatNumber(Math.round(animatedBalance))}
            </p>
          </div>
          <a
            href="/tools/saving-and-growth/compound-interest"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2.5 rounded-lg transition-all duration-150"
          >
            Open full calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-accent-600">{result.multiplier.toFixed(1)}x</span>
          <span className="text-sm text-neutral-500">your money back — ${formatNumber(Math.round(result.interestEarned))} is pure interest</span>
        </div>
        <SegmentedBar segments={segments} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Monthly amount"
          id="engine-monthly"
          value={state.monthly}
          min={50}
          max={5000}
          step={50}
          onChange={(v) => onChange({ ...state, monthly: v })}
          prefix="$"
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <SliderInput
            label="Expected return"
            id="engine-rate"
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

const RETIREMENT_RETURN = 0.07;
const RETIREMENT_TARGET = 1000000;

function RetirementPanel({ state, onChange }: { state: RetirementState; onChange: (s: RetirementState) => void }) {
  const result = useMemo(() => {
    const retireAge = solveForRetirementAge(
      state.currentAge, 0, state.monthlyContribution, RETIREMENT_RETURN, RETIREMENT_TARGET
    );
    const roundedAge = Math.round(retireAge);
    const years = Math.max(0, roundedAge - state.currentAge);
    const totalContributions = state.monthlyContribution * 12 * years;
    const interestEarned = RETIREMENT_TARGET - totalContributions;
    return { retireAge: roundedAge, years, totalContributions, interestEarned: Math.max(0, interestEarned) };
  }, [state.currentAge, state.monthlyContribution]);

  const animatedAge = useAnimatedNumber(result.retireAge);

  const segments: BarSegment[] = [
    { label: 'Saving years', value: result.years, className: 'bg-primary-500' },
    { label: 'Retirement years', value: Math.max(0, 90 - result.retireAge), className: 'bg-accent-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Result */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">You could retire at</p>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-bold tabular-nums lining-nums result-number whitespace-nowrap">
              Age {Math.round(animatedAge)}
            </p>
          </div>
          <a
            href="/tools/income-and-planning/retirement-age"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2.5 rounded-lg transition-all duration-150"
          >
            Open full calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
        <p className="text-sm text-neutral-600 font-medium">
          {result.years} years of saving to reach ${formatNumber(RETIREMENT_TARGET)} at 7% return
        </p>
        <SegmentedBar segments={segments} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Current age"
          id="engine-retire-age"
          value={state.currentAge}
          min={18}
          max={65}
          step={1}
          onChange={(v) => onChange({ ...state, currentAge: v })}
          suffix="yrs"
        />
        <div className="mt-3">
          <SliderInput
            label="Monthly savings"
            id="engine-retire-monthly"
            value={state.monthlyContribution}
            min={100}
            max={5000}
            step={50}
            onChange={(v) => onChange({ ...state, monthlyContribution: v })}
            prefix="$"
            formatDisplay={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Solar Panel ────────────────────────────────────────── */

const SOLAR_SYSTEM_SIZE = 4; // kWp
const SOLAR_KWH_PER_KWP = 900;
const SOLAR_SELF_CONSUMPTION = 0.30;
const SOLAR_EXPORT_TARIFF = 4.5; // p/kWh
const SOLAR_ENERGY_INFLATION = 0.03;
const SOLAR_DEGRADATION = 0.005;
const SOLAR_MAINTENANCE = 150;
const SOLAR_YEARS = 25;

function SolarPanel({ state, onChange }: { state: SolarState; onChange: (s: SolarState) => void }) {
  const result = useMemo(() => {
    const annualGeneration = SOLAR_SYSTEM_SIZE * SOLAR_KWH_PER_KWP;
    // Simplified: use electricity bill to derive rough tariff
    const tariff = 0.245; // £/kWh

    let cumulative = 0;
    let paybackYear = -1;
    for (let y = 1; y <= SOLAR_YEARS; y++) {
      const degradedGen = annualGeneration * Math.pow(1 - SOLAR_DEGRADATION, y - 1);
      const inflatedTariff = tariff * Math.pow(1 + SOLAR_ENERGY_INFLATION, y - 1);
      const inflatedExport = (SOLAR_EXPORT_TARIFF / 100) * Math.pow(1 + SOLAR_ENERGY_INFLATION, y - 1);
      const savings = (degradedGen * SOLAR_SELF_CONSUMPTION * inflatedTariff) +
                      (degradedGen * (1 - SOLAR_SELF_CONSUMPTION) * inflatedExport) -
                      SOLAR_MAINTENANCE;
      cumulative += savings;
      if (paybackYear === -1 && cumulative >= state.systemCost) {
        paybackYear = y;
      }
    }

    const year1Savings = (annualGeneration * SOLAR_SELF_CONSUMPTION * tariff) +
                         (annualGeneration * (1 - SOLAR_SELF_CONSUMPTION) * SOLAR_EXPORT_TARIFF / 100) -
                         SOLAR_MAINTENANCE;
    const totalProfit = cumulative - state.systemCost;

    return { paybackYear, totalSavings: cumulative, year1Savings, totalProfit };
  }, [state.systemCost, state.electricityBill]);

  const animatedSavings = useAnimatedNumber(result.totalSavings);

  const segments: BarSegment[] = result.totalProfit > 0
    ? [
        { label: 'Profit', value: result.totalProfit, className: 'bg-primary-500' },
        { label: 'System cost', value: state.systemCost, className: 'bg-neutral-300' },
      ]
    : [
        { label: 'Savings so far', value: result.totalSavings, className: 'bg-primary-500' },
        { label: 'Remaining cost', value: Math.max(0, state.systemCost - result.totalSavings), className: 'bg-neutral-300' },
      ];

  return (
    <div className="space-y-5">
      {/* Result */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 mb-1">{SOLAR_YEARS}-year savings</p>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-bold tabular-nums lining-nums result-number whitespace-nowrap">
              £{formatNumber(Math.round(animatedSavings))}
            </p>
          </div>
          <a
            href="/tools/saving-and-growth/solar-payback"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2.5 rounded-lg transition-all duration-150"
          >
            Open full calculator
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
        <p className="text-sm text-neutral-600 font-medium">
          {result.paybackYear > 0
            ? `Pays for itself in ${result.paybackYear} years. Year 1 saves £${formatNumber(Math.round(result.year1Savings))}.`
            : `Year 1 saves £${formatNumber(Math.round(result.year1Savings))}. May not reach payback.`}
        </p>
        <SegmentedBar segments={segments} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Controls */}
      <div>
        <SliderInput
          label="System cost"
          id="engine-solar-cost"
          value={state.systemCost}
          min={3000}
          max={15000}
          step={500}
          onChange={(v) => onChange({ ...state, systemCost: v })}
          prefix="£"
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <SliderInput
            label="Monthly electricity bill"
            id="engine-solar-bill"
            value={state.electricityBill}
            min={30}
            max={300}
            step={10}
            onChange={(v) => onChange({ ...state, electricityBill: v })}
            prefix="£"
            formatDisplay={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main DecisionEngine Component ───────────────────────── */

export default function DecisionEngine() {
  const [active, setActive] = useState<PromptId>(0);
  const [mortgage, setMortgage] = useState<MortgageState>({ income: 75000, downPayment: 50000 });
  const [snowball, setSnowball] = useState<SnowballState>({ monthly: 500, rate: 7 });
  const [retirement, setRetirement] = useState<RetirementState>({ currentAge: 30, monthlyContribution: 500 });
  const [solar, setSolar] = useState<SolarState>({ systemCost: 7000, electricityBill: 120 });

  const panelRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Hide skeleton on mount
  useEffect(() => {
    const skeleton = document.getElementById('engine-skeleton');
    if (skeleton) skeleton.style.display = 'none';
  }, []);

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
    const count = PROMPTS.length;
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
  }, [switchPrompt]);

  // Mobile accordion state — null means all collapsed
  const [mobileExpanded, setMobileExpanded] = useState<PromptId | null>(0);

  const toggleMobileAccordion = useCallback((id: PromptId) => {
    setMobileExpanded((prev) => (prev === id ? null : id));
  }, []);

  const renderPanel = (id: PromptId) => {
    switch (id) {
      case 0: return <MortgagePanel state={mortgage} onChange={setMortgage} />;
      case 1: return <SnowballPanel state={snowball} onChange={setSnowball} />;
      case 2: return <RetirementPanel state={retirement} onChange={setRetirement} />;
      case 3: return <SolarPanel state={solar} onChange={setSolar} />;
    }
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ─────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-6">
        {/* Tab list */}
        <div>
        <div role="tablist" aria-label="Choose a financial question">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              id={`engine-tab-${p.id}`}
              role="tab"
              aria-selected={active === p.id}
              aria-controls="engine-panel"
              tabIndex={active === p.id ? 0 : -1}
              onClick={() => switchPrompt(p.id)}
              onKeyDown={(e) => handleTabKeyDown(e, p.id)}
              className={`w-full text-left px-5 py-5 transition-all duration-200 border-l-[4px] ${
                active === p.id
                  ? 'border-l-primary-500 font-bold text-neutral-900'
                  : 'border-l-transparent font-medium text-neutral-800 hover:text-neutral-900 hover:border-l-neutral-300'
              }`}
            >
              <span className="text-xl leading-relaxed">{p.question}</span>
            </button>
          ))}
          <div className="px-5 pt-4 mt-2 border-t border-neutral-200/60">
            <p className="text-xs text-neutral-400 mb-2">Preview only. Open the full calculator for the full breakdown.</p>
            <a
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-150"
            >
              View all calculators
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
        </div>
        </div>

        {/* Calculator panel */}
        <div
          id="engine-panel"
          role="tabpanel"
          aria-labelledby={`engine-tab-${active}`}
          ref={panelRef}
          className={`engine-panel rounded-xl p-6 sm:p-8 transition-opacity duration-150 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          aria-live="polite"
        >
          {renderPanel(active)}
        </div>
      </div>

      {/* ── Mobile layout (< lg) — Accordion ────────────────── */}
      <div className="lg:hidden space-y-3">
        {PROMPTS.map((p) => {
          const isOpen = mobileExpanded === p.id;
          return (
            <div key={p.id} className="rounded-xl overflow-hidden border border-neutral-200/80">
              <button
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
              <div
                id={`engine-mobile-panel-${p.id}`}
                className={`engine-panel overflow-hidden transition-all duration-300 border-t border-neutral-100 ${
                  isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
                }`}
              >
                <div className="p-5 sm:p-6" aria-live="polite">
                  {renderPanel(p.id)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: View all link */}
      <div className="lg:hidden mt-4 text-center">
        <a
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-150"
        >
          View all calculators
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>
    </>
  );
}
