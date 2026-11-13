import { useState, useMemo, useCallback } from 'react';
import { RotateCcw, Percent, Calculator, ArrowUpDown, Equal } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { parseNumericInput } from '../../lib/parse-number';
import { computePercentage, formatNumber, cleanFloat, type PercentMode } from '../../lib/dev-tools/percentage';

type CalcMode = PercentMode;

const MODES: { key: CalcMode; label: string; shortLabel: string }[] = [
  { key: 'whatIsXofY', label: 'What is X% of Y?', shortLabel: 'X% of Y' },
  { key: 'xIsWhatPercent', label: 'X is what % of Y?', shortLabel: 'X is ?% of Y' },
  { key: 'percentChange', label: 'Percentage Change', shortLabel: '% Change' },
  { key: 'percentDiff', label: 'Percentage Difference', shortLabel: '% Difference' },
];

const DEFAULTS: Record<CalcMode, [string, string]> = {
  whatIsXofY: ['15', '200'],
  xIsWhatPercent: ['35', '200'],
  percentChange: ['50', '65'],
  percentDiff: ['50', '65'],
};

type Parsed = { ok: true; value: number } | { ok: false; message: string };

function parseField(text: string): Parsed {
  const r = parseNumericInput(text, { allowNegative: true });
  if (r.ok) return { ok: true, value: r.value };
  if (r.reason === 'empty') return { ok: false, message: 'Enter a number.' };
  if (r.reason === 'ambiguous') return { ok: false, message: 'Use a dot for decimals and commas only for thousands, e.g. 1,250.5.' };
  return { ok: false, message: 'Enter a number, e.g. 1,250.5 or -3.' };
}

interface NumberInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  suffix?: string;
}

function NumberInput({ label, id, value, onChange, error, suffix }: NumberInputProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full h-11 rounded-lg border bg-white text-neutral-900 text-base
            focus:ring-2 focus:outline-none transition-all duration-150 tabular-nums pl-3 ${suffix ? 'pr-8' : 'pr-3'}
            ${error ? 'border-red-200 focus:border-red-700 focus:ring-red-200' : 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p id={errorId} className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
}

export default function PercentageCalculator() {
  const [mode, setMode] = useState<CalcMode>('whatIsXofY');
  const [inputA, setInputA] = useState(DEFAULTS.whatIsXofY[0]);
  const [inputB, setInputB] = useState(DEFAULTS.whatIsXofY[1]);

  const handleReset = useCallback(() => {
    setInputA(DEFAULTS[mode][0]);
    setInputB(DEFAULTS[mode][1]);
  }, [mode]);

  const parsedA = parseField(inputA);
  const parsedB = parseField(inputB);
  const inputsOk = parsedA.ok && parsedB.ok;
  const a = parsedA.ok ? parsedA.value : 0;
  const b = parsedB.ok ? parsedB.value : 0;
  const fa = formatNumber(a);
  const fb = formatNumber(b);

  const outcome = useMemo(() => (inputsOk ? computePercentage(mode, a, b) : null), [inputsOk, mode, a, b]);

  const view = useMemo(() => {
    const value = outcome && outcome.kind === 'value' ? outcome.value : 0;
    switch (mode) {
      case 'whatIsXofY':
        return { unit: '', context: `${fa}% × ${fb} = ${formatNumber(value)}` };
      case 'xIsWhatPercent':
        return { unit: '%', context: `${fa} ÷ ${fb} × 100${outcome?.kind === 'value' ? ` = ${formatNumber(value)}%` : ' (dividing by zero is undefined)'}` };
      case 'percentChange':
        return { unit: '%', context: `From ${fa} to ${fb}: ((${fb} − ${fa}) ÷ |${fa}|) × 100` };
      case 'percentDiff':
        return { unit: '%', context: `|${fa} − ${fb}| ÷ ((|${fa}| + |${fb}|) ÷ 2) × 100` };
    }
  }, [mode, fa, fb, outcome]);

  const labelsForMode = useMemo(() => {
    switch (mode) {
      case 'whatIsXofY':
        return { a: 'Percentage', b: 'Number', aSuffix: '%' };
      case 'xIsWhatPercent':
        return { a: 'Part (X)', b: 'Whole (Y)', aSuffix: undefined };
      case 'percentChange':
        return { a: 'Original Value', b: 'New Value', aSuffix: undefined };
      case 'percentDiff':
        return { a: 'Value A', b: 'Value B', aSuffix: undefined };
    }
  }, [mode]);

  const isValue = outcome?.kind === 'value';
  const rawValue = outcome && outcome.kind === 'value' ? (mode === 'percentChange' ? Math.abs(outcome.value) : outcome.value) : 0;
  const animatedResult = useAnimatedNumber(rawValue);
  const direction = outcome && outcome.kind === 'value' ? outcome.direction : undefined;
  const changeLabel =
    outcome && outcome.kind === 'value' && mode === 'percentChange'
      ? `${direction === 'increase' ? '+' : direction === 'decrease' ? '-' : ''}${formatNumber(Math.abs(outcome.value))}% ${direction === 'none' ? 'no change' : direction}`
      : '';

  const headline = !inputsOk
    ? 'Enter two valid numbers to see the result.'
    : outcome?.kind === 'undefined'
      ? outcome.reason
      : mode === 'whatIsXofY'
        ? `${fa}% of ${fb} is ${formatNumber(rawValue)}.`
        : mode === 'xIsWhatPercent'
          ? `${fa} is ${formatNumber(rawValue)}% of ${fb}.`
          : mode === 'percentChange'
            ? `${changeLabel} from ${fa} to ${fb}.`
            : `The percentage difference is ${formatNumber(rawValue)}%.`;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-neutral-200/80 overflow-x-auto" role="tablist" aria-label="Percentage calculation mode">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            aria-controls="pct-results"
            onClick={() => {
              setMode(m.key);
              // Reset to sensible defaults per mode
              setInputA(DEFAULTS[m.key][0]);
              setInputB(DEFAULTS[m.key][1]);
            }}
            className={`flex-1 min-h-[44px] py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
              mode === m.key
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/40'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <span className="hidden sm:inline">{m.label}</span>
            <span className="sm:hidden">{m.shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Enter Values</h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 min-h-[40px] px-3 -mr-3 text-sm text-neutral-500 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="space-y-5">
            <NumberInput
              label={labelsForMode.a}
              id="pct-input-a"
              value={inputA}
              onChange={setInputA}
              suffix={labelsForMode.aSuffix}
              error={parsedA.ok ? undefined : parsedA.message}
            />
            <NumberInput
              label={labelsForMode.b}
              id="pct-input-b"
              value={inputB}
              onChange={setInputB}
              error={parsedB.ok ? undefined : parsedB.message}
            />
          </div>

          {/* Quick examples */}
          <div className="mt-8">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Quick Examples</p>
            <div className="space-y-1">
              {mode === 'whatIsXofY' && (
                <>
                  <QuickExample label="Tip: 18% of $85" onClick={() => { setInputA('18'); setInputB('85'); }} />
                  <QuickExample label="Discount: 35% of $250" onClick={() => { setInputA('35'); setInputB('250'); }} />
                  <QuickExample label="Tax: 8.5% of $1200" onClick={() => { setInputA('8.5'); setInputB('1200'); }} />
                </>
              )}
              {mode === 'xIsWhatPercent' && (
                <>
                  <QuickExample label="Score: 42 out of 50" onClick={() => { setInputA('42'); setInputB('50'); }} />
                  <QuickExample label="Budget: $350 of $2000" onClick={() => { setInputA('350'); setInputB('2000'); }} />
                  <QuickExample label="Target: 75 of 100" onClick={() => { setInputA('75'); setInputB('100'); }} />
                </>
              )}
              {mode === 'percentChange' && (
                <>
                  <QuickExample label="Raise: $52K → $58.5K" onClick={() => { setInputA('52000'); setInputB('58500'); }} />
                  <QuickExample label="Stock: $150 → $120" onClick={() => { setInputA('150'); setInputB('120'); }} />
                  <QuickExample label="Rent: $1800 → $1950" onClick={() => { setInputA('1800'); setInputB('1950'); }} />
                </>
              )}
              {mode === 'percentDiff' && (
                <>
                  <QuickExample label="Prices: $45 vs $52" onClick={() => { setInputA('45'); setInputB('52'); }} />
                  <QuickExample label="Scores: 780 vs 820" onClick={() => { setInputA('780'); setInputB('820'); }} />
                  <QuickExample label="Weights: 155 vs 162" onClick={() => { setInputA('155'); setInputB('162'); }} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div id="pct-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50">
          <div className="mb-8">
            <p className="text-sm text-neutral-500 mb-1">Result</p>
            {isValue ? (
              <p className={`text-4xl sm:text-5xl font-bold tabular-nums ${
                mode === 'percentChange' && direction === 'increase' ? 'text-success-600' :
                mode === 'percentChange' && direction === 'decrease' ? 'text-red-600' :
                'result-number'
              }`} aria-hidden="true">
                {formatNumber(animatedResult)}{view.unit && <span className="text-2xl ml-1">{view.unit}</span>}
              </p>
            ) : (
              <p className="text-3xl sm:text-4xl font-bold text-neutral-700" aria-hidden="true">
                {inputsOk ? 'Undefined' : '-'}
              </p>
            )}
            <p className={`text-sm mt-2 ${outcome?.kind === 'undefined' || !inputsOk ? 'text-neutral-700' : 'text-neutral-600'}`} aria-live="polite">
              {headline}
            </p>
          </div>

          {/* Formula display */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
              <Calculator size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Formula</p>
              <p className="text-sm text-neutral-700 font-mono leading-relaxed break-words">{inputsOk ? view.context : 'Enter two numbers.'}</p>
            </div>
          </div>

          {/* Helpful conversion card */}
          {inputsOk && mode === 'whatIsXofY' && a > 0 && b > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Related Calculations</p>
              <div className="space-y-2 text-sm text-neutral-700">
                {a <= 100 && (
                  <div className="flex justify-between gap-3">
                    <span>Remaining ({formatNumber(100 - a)}% of {fb})</span>
                    <span className="font-medium tabular-nums">{formatNumber(((100 - a) / 100) * b)}</span>
                  </div>
                )}
                {a > 100 && (
                  <div className="flex justify-between gap-3">
                    <span>Amount above {fb} ({formatNumber(a - 100)}%)</span>
                    <span className="font-medium tabular-nums">{formatNumber(((a - 100) / 100) * b)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span>Double ({formatNumber(a * 2)}% of {fb})</span>
                  <span className="font-medium tabular-nums">{formatNumber((a * 2 / 100) * b)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Half ({formatNumber(a / 2)}% of {fb})</span>
                  <span className="font-medium tabular-nums">{formatNumber((a / 2 / 100) * b)}</span>
                </div>
              </div>
              </div>
            </div>
          )}

          {inputsOk && mode === 'xIsWhatPercent' && b > 0 && a >= 0 && a <= b && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Equal size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Related</p>
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex justify-between gap-3">
                    <span>Remaining</span>
                    <span className="font-medium tabular-nums">{formatNumber(b - a)} ({formatNumber(cleanFloat(((b - a) / b) * 100))}%)</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Ratio</span>
                    <span className="font-medium tabular-nums">{formatNumber(a)} : {formatNumber(b - a)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {inputsOk && mode === 'percentChange' && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowUpDown size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Details</p>
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex justify-between gap-3">
                    <span>Absolute change</span>
                    <span className="font-medium tabular-nums">{b - a > 0 ? '+' : ''}{formatNumber(b - a)}</span>
                  </div>
                  {a !== 0 && (
                    <div className="flex justify-between gap-3">
                      <span>Multiplier</span>
                      <span className="font-medium tabular-nums">{formatNumber(cleanFloat(b / a))}x</span>
                    </div>
                  )}
                  {a !== 0 && b !== 0 && (
                    <div className="flex justify-between gap-3">
                      <span>Reverse change needed</span>
                      <span className="font-medium tabular-nums">{formatNumber(cleanFloat(((a - b) / Math.abs(b)) * 100))}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                  If both values are themselves percentages (such as interest rates), the change is{' '}
                  <span className="tabular-nums">{b - a > 0 ? '+' : ''}{formatNumber(b - a)}</span> percentage point{Math.abs(b - a) === 1 ? '' : 's'}
                  {outcome?.kind === 'value' && a !== 0 ? <>, which is a <span className="tabular-nums">{formatNumber(Math.abs(outcome.value))}%</span> relative {direction === 'decrease' ? 'decrease' : 'change'}.</> : '.'}
                </p>
              </div>
            </div>
          )}

          {/* Common percentages reference */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-5">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Common Percentages</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600">
              {[
                { pct: '10%', frac: '1/10', dec: '0.1' },
                { pct: '20%', frac: '1/5', dec: '0.2' },
                { pct: '25%', frac: '1/4', dec: '0.25' },
                { pct: '33.3%', frac: '1/3', dec: '0.333' },
                { pct: '50%', frac: '1/2', dec: '0.5' },
                { pct: '75%', frac: '3/4', dec: '0.75' },
              ].map((row) => (
                <div key={row.pct} className="bg-neutral-50 rounded-lg p-2 text-center">
                  <p className="font-medium text-neutral-800 tabular-nums">{row.pct}</p>
                  <p className="text-neutral-500 tabular-nums">{row.frac} = {row.dec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickExample({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[40px] text-left text-sm text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg px-3 py-2 transition-colors duration-150"
    >
      {label}
    </button>
  );
}
