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
  { id: 0 as const, question: 'What does this salary really become?', short: 'Salary' },
  { id: 1 as const, question: 'Can I actually afford this house?', short: 'Mortgage' },
  { id: 2 as const, question: 'How fast does £500/mo snowball?', short: 'Compound' },
];

/* ── Segmented Bar ───────────────────────────────────────── */

interface BarSegment {
  label: string;
  value: number;
  color: string;
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
              className="first:rounded-l-full last:rounded-r-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
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
            <span key={seg.label} className="text-[11px] opacity-70">
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
        { label: 'Take-home', value: result.net, color: '#5EEAD4' },
        { label: 'Tax', value: result.tax, color: '#64748B' },
        { label: 'NI', value: result.ni!, color: '#94A3B8' },
      ]
    : [
        { label: 'Take-home', value: result.net, color: '#5EEAD4' },
        { label: 'Federal tax', value: result.tax, color: '#64748B' },
        { label: 'FICA', value: result.fica!, color: '#94A3B8' },
      ];

  return (
    <div className="space-y-5">
      <div className="engine-inputs">
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
          <label className="block text-sm font-medium mb-1.5 engine-label">Country</label>
          <div className="flex gap-1">
            {(['uk', 'us'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...state, country: c })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  state.country === c
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/50 hover:text-white/70 border border-transparent'
                }`}
              >
                {c === 'uk' ? '🇬🇧 UK' : '🇺🇸 US'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm opacity-60 mb-1">Monthly take-home</p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums lining-nums text-white">
            {symbol}{formatNumber(Math.round(animatedMonthly))}<span className="text-lg font-medium opacity-60">/mo</span>
          </p>
        </div>
        <p className="text-sm opacity-70">
          You keep {result.keepPct.toFixed(0)}% — {state.country === 'uk' ? 'tax' : 'federal tax'}: {symbol}{formatNumber(Math.round(result.tax))}, {state.country === 'uk' ? 'NI' : 'FICA'}: {symbol}{formatNumber(Math.round(state.country === 'uk' ? result.ni! : result.fica!))}
        </p>
        <SegmentedBar segments={segments} />
        <a
          href={state.country === 'uk' ? '/tools/income-and-planning/salary-uk' : '/tools/income-and-planning/salary-us'}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors duration-150 mt-2"
        >
          See full breakdown
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
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
    // Reverse loanMonthlyPayment: P = M * [(1+r)^n - 1] / [r(1+r)^n]
    const r = MORTGAGE_RATE / 12;
    const factor = (Math.pow(1 + r, termMonths) - 1) / (r * Math.pow(1 + r, termMonths));
    const maxLoan = maxMonthlyPayment * factor;
    const maxPrice = maxLoan + state.downPayment;
    const monthlyPayment = loanMonthlyPayment(maxLoan, MORTGAGE_RATE, termMonths);
    return { maxPrice, maxLoan, monthlyPayment };
  }, [state.income, state.downPayment]);

  const animatedPrice = useAnimatedNumber(result.maxPrice);

  const segments: BarSegment[] = [
    { label: 'Loan', value: result.maxLoan, color: '#5EEAD4' },
    { label: 'Down payment', value: state.downPayment, color: '#94A3B8' },
  ];

  return (
    <div className="space-y-5">
      <div className="engine-inputs">
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

      <div className="space-y-3">
        <div>
          <p className="text-sm opacity-60 mb-1">You could afford up to</p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums lining-nums text-white">
            ${formatNumber(Math.round(animatedPrice))}
          </p>
        </div>
        <p className="text-sm opacity-70">
          Monthly payment: ${formatNumber(Math.round(result.monthlyPayment))} at {(MORTGAGE_RATE * 100).toFixed(2)}% / {MORTGAGE_TERM_YEARS}yr
        </p>
        <p className="text-xs opacity-50">Assumes {(MORTGAGE_DTI * 100).toFixed(0)}% debt-to-income ratio</p>
        <SegmentedBar segments={segments} />
        <a
          href="/tools/debt-and-loans/mortgage-affordability"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors duration-150 mt-2"
        >
          See full breakdown
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
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
    { label: 'Interest earned', value: result.interestEarned, color: '#5EEAD4' },
    { label: 'Your contributions', value: result.totalContributions, color: '#94A3B8' },
  ];

  return (
    <div className="space-y-5">
      <div className="engine-inputs">
        <SliderInput
          label="Monthly amount"
          id="engine-monthly"
          value={state.monthly}
          min={50}
          max={5000}
          step={50}
          onChange={(v) => onChange({ ...state, monthly: v })}
          prefix="£"
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

      <div className="space-y-3">
        <div>
          <p className="text-sm opacity-60 mb-1">After {SNOWBALL_YEARS} years</p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums lining-nums text-white">
            £{formatNumber(Math.round(animatedBalance))}
          </p>
        </div>
        <p className="text-sm opacity-70">
          Your money earns £{formatNumber(Math.round(result.interestEarned))} in interest — {result.multiplier.toFixed(1)}x what you put in
        </p>
        <p className="text-xs opacity-50">Monthly compounding, {SNOWBALL_YEARS} years, no initial lump sum</p>
        <SegmentedBar segments={segments} />
        <a
          href="/tools/saving-and-growth/compound-interest"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors duration-150 mt-2"
        >
          See full breakdown
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>
    </div>
  );
}

/* ── Main DecisionEngine Component ───────────────────────── */

export default function DecisionEngine() {
  const [active, setActive] = useState<PromptId>(0);
  const [salary, setSalary] = useState<SalaryState>({ gross: 45000, country: 'uk' });
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
      // Focus the new tab button
      const btn = document.getElementById(`engine-tab-${next}`);
      btn?.focus();
    }
  }, [switchPrompt]);

  // Mobile accordion state: which one is expanded
  const [mobileExpanded, setMobileExpanded] = useState<PromptId>(0);

  const renderPanel = (id: PromptId) => {
    switch (id) {
      case 0: return <SalaryPanel state={salary} onChange={setSalary} />;
      case 1: return <MortgagePanel state={mortgage} onChange={setMortgage} />;
      case 2: return <SnowballPanel state={snowball} onChange={setSnowball} />;
    }
  };

  return (
    <>
      {/* ── Desktop layout (lg+) ─────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        {/* Tab list */}
        <div role="tablist" aria-label="Choose a financial question" className="space-y-2">
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
              className={`w-full text-left px-5 py-4 rounded-lg transition-all duration-200 border-l-[3px] ${
                active === p.id
                  ? 'border-l-teal-400 bg-neutral-100 font-semibold text-neutral-900'
                  : 'border-l-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="text-[15px] leading-snug">{p.question}</span>
            </button>
          ))}
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
                  isOpen ? 'bg-neutral-100 font-semibold text-neutral-900' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span className="text-sm leading-snug pr-4">{p.question}</span>
                <svg
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                id={`engine-mobile-panel-${p.id}`}
                className={`engine-panel overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
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
    </>
  );
}
