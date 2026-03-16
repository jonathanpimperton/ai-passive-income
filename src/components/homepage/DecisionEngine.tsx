import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { calcSimpleIncomeTax, calcNI } from '../../lib/uk-tax-calc';
import { calcFederalTax, calcFICA } from '../../lib/us-tax-calc';
import { compoundInterest } from '../../lib/calculator-utils';
import { loanMonthlyPayment } from '../../lib/calculator-utils';
import { formatNumber } from '../../lib/calculator-utils';
import SliderInput from '../ui/SliderInput';

/* ── Types ───────────────────────────────────────────────── */

type PromptId = 0 | 1 | 2;

interface SalaryState {
  gross: number;
  country: 'uk' | 'us';
}

interface MortgageState {
  income: number;
  downPayment: number;
}

interface SnowballState {
  monthly: number;
  rate: number;
}

/* ── Prompt Config ───────────────────────────────────────── */

const PROMPTS = [
  { id: 0 as const, question: 'Can I actually afford this house?', short: 'Mortgage' },
  { id: 1 as const, question: 'How fast does $500/mo snowball?', short: 'Compound' },
  { id: 2 as const, question: 'What does this salary really become?', short: 'Salary' },
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
            <span key={seg.label} className="text-[11px] text-neutral-500">
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
            <span key={seg.label} className="text-[11px] text-neutral-500">
              {seg.label} {pct.toFixed(0)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Salary Bar — thick who-takes-what split ─────────────── */

function SalaryBar({ segments }: { segments: BarSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex gap-[3px] h-5 rounded-full overflow-hidden">
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
            <span key={seg.label} className="text-xs font-medium text-neutral-500">
              {seg.label} {pct.toFixed(0)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Salary Panel ────────────────────────────────────────── */

function SalaryPanel({ state, onChange }: { state: SalaryState; onChange: (s: SalaryState) => void }) {
  const result = useMemo(() => {
    if (state.country === 'uk') {
      const tax = calcSimpleIncomeTax(state.gross);
      const ni = calcNI(state.gross);
      const net = state.gross - tax - ni;
      const monthly = net / 12;
      const keepPct = state.gross > 0 ? (net / state.gross) * 100 : 0;
      return { monthly, net, tax, ni, keepPct, totalDeductions: tax + ni, symbol: '£' };
    } else {
      const tax = calcFederalTax(state.gross, 'single');
      const fica = calcFICA(state.gross, 'single');
      const net = state.gross - tax - fica.total;
      const monthly = net / 12;
      const keepPct = state.gross > 0 ? (net / state.gross) * 100 : 0;
      return { monthly, net, tax, fica: fica.total, keepPct, totalDeductions: tax + fica.total, symbol: '$' };
    }
  }, [state.gross, state.country]);

  const animatedMonthly = useAnimatedNumber(result.monthly);
  const symbol = result.symbol;

  const segments: BarSegment[] = state.country === 'uk'
    ? [
        { label: 'Take-home', value: result.net, className: 'bg-primary-500' },
        { label: 'Tax', value: result.tax, className: 'bg-accent-400' },
        { label: 'NI', value: result.ni!, className: 'bg-accent-300' },
      ]
    : [
        { label: 'Take-home', value: result.net, className: 'bg-primary-500' },
        { label: 'Federal tax', value: result.tax, className: 'bg-accent-400' },
        { label: 'FICA', value: result.fica!, className: 'bg-accent-300' },
      ];

  return (
    <div className="space-y-5">
      {/* Result — who takes what */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">You actually take home</p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums lining-nums result-number">
            {symbol}{formatNumber(Math.round(animatedMonthly))}<span className="text-xl font-medium text-neutral-400">/mo</span>
          </p>
        </div>
        <p className="text-sm text-neutral-600 font-medium">
          {result.keepPct.toFixed(0)}% is yours. {(100 - Number(result.keepPct.toFixed(0)))}% goes to {state.country === 'uk' ? 'tax and NI' : 'federal tax and FICA'}.
        </p>
        <SalaryBar segments={segments} />
        <a
          href={state.country === 'uk' ? '/tools/income-and-planning/salary-uk' : '/tools/income-and-planning/salary-us'}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-all duration-150 mt-2"
        >
          Open full calculator
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      {/* Controls */}
      <div>
        <SliderInput
          label="Gross salary"
          id="engine-salary"
          value={state.gross}
          min={20000}
          max={200000}
          step={1000}
          onChange={(v) => onChange({ ...state, gross: v })}
          prefix={symbol}
          formatDisplay={formatNumber}
        />
        <div className="mt-3">
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Country</label>
          <div className="flex gap-1">
            {(['uk', 'us'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...state, country: c })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                  state.country === c
                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                    : 'text-neutral-500 hover:text-neutral-700 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {c === 'uk' ? '🇬🇧 UK' : '🇺🇸 US'}
              </button>
            ))}
          </div>
        </div>
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
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Your buying power</p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums lining-nums result-number">
            ${formatNumber(Math.round(animatedPrice))}
          </p>
        </div>
        <p className="text-sm text-neutral-500">
          ${formatNumber(Math.round(result.monthlyPayment))}/mo at {(MORTGAGE_RATE * 100).toFixed(2)}% over {MORTGAGE_TERM_YEARS} years
        </p>
        <MortgageBar segments={segments} />
        <a
          href="/tools/debt-and-loans/mortgage-affordability"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-all duration-150 mt-2"
        >
          Open full calculator
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
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
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">After {SNOWBALL_YEARS} years</p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums lining-nums result-number">
            ${formatNumber(Math.round(animatedBalance))}
          </p>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-accent-600">{result.multiplier.toFixed(1)}x</span>
          <span className="text-sm text-neutral-500">your money back — ${formatNumber(Math.round(result.interestEarned))} is pure interest</span>
        </div>
        <SegmentedBar segments={segments} />
        <a
          href="/tools/saving-and-growth/compound-interest"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-all duration-150 mt-2"
        >
          Open full calculator
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
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

/* ── Main DecisionEngine Component ───────────────────────── */

export default function DecisionEngine() {
  const [active, setActive] = useState<PromptId>(0);
  const [salary, setSalary] = useState<SalaryState>({ gross: 75000, country: 'us' });
  const [mortgage, setMortgage] = useState<MortgageState>({ income: 75000, downPayment: 50000 });
  const [snowball, setSnowball] = useState<SnowballState>({ monthly: 500, rate: 7 });

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
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      next = ((id + 1) % 3) as PromptId;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      next = ((id + 2) % 3) as PromptId;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = 2;
    }
    if (next !== null) {
      switchPrompt(next);
      const btn = document.getElementById(`engine-tab-${next}`);
      btn?.focus();
    }
  }, [switchPrompt]);

  // Mobile accordion state
  const [mobileExpanded, setMobileExpanded] = useState<PromptId>(0);

  const renderPanel = (id: PromptId) => {
    switch (id) {
      case 0: return <MortgagePanel state={mortgage} onChange={setMortgage} />;
      case 1: return <SnowballPanel state={snowball} onChange={setSnowball} />;
      case 2: return <SalaryPanel state={salary} onChange={setSalary} />;
    }
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ─────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-6">
        {/* Tab list */}
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
                  : 'border-l-transparent text-neutral-800 hover:text-neutral-900 hover:border-l-neutral-300'
              }`}
            >
              <span className="text-xl leading-relaxed">{p.question}</span>
            </button>
          ))}
          <div className="px-5 pt-4 mt-2 border-t border-neutral-200/60">
            <p className="text-xs text-neutral-400 mb-2">Quick estimates — full calculators have more inputs, charts, and exports.</p>
            <a
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-150"
            >
              View all calculators
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </a>
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
                onClick={() => setMobileExpanded(p.id)}
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
