import { useState, useMemo, useCallback } from 'react';
import { RotateCcw, Percent, Calculator, ArrowUpDown, Equal } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

type CalcMode = 'whatIsXofY' | 'xIsWhatPercent' | 'percentChange' | 'percentDiff';

const MODES: { key: CalcMode; label: string; shortLabel: string }[] = [
  { key: 'whatIsXofY', label: 'What is X% of Y?', shortLabel: 'X% of Y' },
  { key: 'xIsWhatPercent', label: 'X is what % of Y?', shortLabel: 'X is ?% of Y' },
  { key: 'percentChange', label: 'Percentage Change', shortLabel: '% Change' },
  { key: 'percentDiff', label: 'Percentage Difference', shortLabel: '% Difference' },
];

function formatResult(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e9) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

interface NumberInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  hint?: string;
}

function NumberInput({ label, id, value, onChange, suffix, prefix, hint }: NumberInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            tabular-nums ${prefix ? 'pl-7' : 'px-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
          inputMode="decimal"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function PercentageCalculator() {
  const [mode, setMode] = useState<CalcMode>('whatIsXofY');
  const [inputA, setInputA] = useState('15');
  const [inputB, setInputB] = useState('200');

  const handleReset = useCallback(() => {
    setInputA(mode === 'whatIsXofY' ? '15' : mode === 'xIsWhatPercent' ? '35' : '50');
    setInputB(mode === 'whatIsXofY' ? '200' : mode === 'xIsWhatPercent' ? '200' : '65');
  }, [mode]);

  const a = parseFloat(inputA) || 0;
  const b = parseFloat(inputB) || 0;

  const result = useMemo(() => {
    switch (mode) {
      case 'whatIsXofY': {
        const value = (a / 100) * b;
        return {
          rawValue: value,
          mainValue: formatResult(value),
          mainLabel: `${inputA}% of ${inputB}`,
          mainUnit: '',
          context: `${inputA}% × ${inputB} = ${formatResult(value)}`,
        };
      }
      case 'xIsWhatPercent': {
        const value = b !== 0 ? (a / b) * 100 : 0;
        return {
          rawValue: value,
          mainValue: formatResult(value),
          mainLabel: `${inputA} is what % of ${inputB}`,
          mainUnit: '%',
          context: `${inputA} ÷ ${inputB} × 100 = ${formatResult(value)}%`,
        };
      }
      case 'percentChange': {
        const value = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : 0;
        const direction = value > 0 ? 'increase' : value < 0 ? 'decrease' : 'no change';
        return {
          rawValue: Math.abs(value),
          mainValue: formatResult(Math.abs(value)),
          mainLabel: `${direction === 'increase' ? '+' : direction === 'decrease' ? '-' : ''}${formatResult(Math.abs(value))}% ${direction}`,
          mainUnit: '%',
          context: `From ${inputA} to ${inputB}: ((${inputB} − ${inputA}) ÷ |${inputA}|) × 100`,
          isPositive: value > 0,
          isNegative: value < 0,
        };
      }
      case 'percentDiff': {
        const avg = (Math.abs(a) + Math.abs(b)) / 2;
        const value = avg !== 0 ? (Math.abs(a - b) / avg) * 100 : 0;
        return {
          rawValue: value,
          mainValue: formatResult(value),
          mainLabel: 'Percentage difference',
          mainUnit: '%',
          context: `|${inputA} − ${inputB}| ÷ ((|${inputA}| + |${inputB}|) / 2) × 100`,
        };
      }
    }
  }, [mode, a, b, inputA, inputB]);

  const labelsForMode = useMemo(() => {
    switch (mode) {
      case 'whatIsXofY':
        return { a: 'Percentage', b: 'Number', aSuffix: '%', bPrefix: undefined };
      case 'xIsWhatPercent':
        return { a: 'Part (X)', b: 'Whole (Y)', aSuffix: undefined, bPrefix: undefined };
      case 'percentChange':
        return { a: 'Original Value', b: 'New Value', aSuffix: undefined, bPrefix: undefined };
      case 'percentDiff':
        return { a: 'Value A', b: 'Value B', aSuffix: undefined, bPrefix: undefined };
    }
  }, [mode]);

  const animatedResult = useAnimatedNumber(result.rawValue);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-neutral-200/80 overflow-x-auto" role="tablist" aria-label="Percentage calculation mode">
        {MODES.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={mode === m.key}
            aria-controls="pct-results"
            onClick={() => {
              setMode(m.key);
              // Reset to sensible defaults per mode
              if (m.key === 'whatIsXofY') { setInputA('15'); setInputB('200'); }
              else if (m.key === 'xIsWhatPercent') { setInputA('35'); setInputB('200'); }
              else if (m.key === 'percentChange') { setInputA('50'); setInputB('65'); }
              else if (m.key === 'percentDiff') { setInputA('50'); setInputB('65'); }
            }}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
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
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
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
            />
            <NumberInput
              label={labelsForMode.b}
              id="pct-input-b"
              value={inputB}
              onChange={setInputB}
              prefix={labelsForMode.bPrefix}
            />
          </div>

          {/* Quick examples */}
          <div className="mt-8">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Quick Examples</p>
            <div className="space-y-2">
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
        <div id="pct-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-8">
            <p className="text-sm text-neutral-500 mb-1">Result</p>
            <p className={`text-4xl sm:text-5xl font-bold tabular-nums ${
              'isPositive' in result && result.isPositive ? 'text-accent-600' :
              'isNegative' in result && result.isNegative ? 'text-red-600' :
              'result-number'
            }`}>
              {formatResult(animatedResult)}{result.mainUnit && <span className="text-2xl ml-1">{result.mainUnit}</span>}
            </p>
            {mode === 'percentChange' && (
              <p className="text-sm text-neutral-600 mt-2">{result.mainLabel}</p>
            )}
          </div>

          {/* Formula display */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
              <Calculator size={16} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Formula</p>
              <p className="text-sm text-neutral-700 font-mono leading-relaxed">{result.context}</p>
            </div>
          </div>

          {/* Helpful conversion card */}
          {mode === 'whatIsXofY' && a > 0 && b > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Related Calculations</p>
              <div className="space-y-2 text-sm text-neutral-700">
                <div className="flex justify-between">
                  <span>Remaining ({(100 - a).toFixed(1)}% of {inputB})</span>
                  <span className="font-medium tabular-nums">{formatResult(((100 - a) / 100) * b)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Double ({(a * 2).toFixed(1)}% of {inputB})</span>
                  <span className="font-medium tabular-nums">{formatResult((a * 2 / 100) * b)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Half ({(a / 2).toFixed(1)}% of {inputB})</span>
                  <span className="font-medium tabular-nums">{formatResult((a / 2 / 100) * b)}</span>
                </div>
              </div>
              </div>
            </div>
          )}

          {mode === 'xIsWhatPercent' && b > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Equal size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Related</p>
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span className="font-medium tabular-nums">{formatResult(b - a)} ({formatResult(((b - a) / b) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ratio</span>
                    <span className="font-medium tabular-nums">{formatResult(a)} : {formatResult(b - a)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'percentChange' && a !== 0 && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-5 mb-6 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowUpDown size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Details</p>
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex justify-between">
                    <span>Absolute change</span>
                    <span className="font-medium tabular-nums">{formatResult(b - a)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Multiplier</span>
                    <span className="font-medium tabular-nums">{formatResult(a !== 0 ? b / a : 0)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reverse change needed</span>
                    <span className="font-medium tabular-nums">{formatResult(b !== 0 ? ((a - b) / Math.abs(b)) * 100 : 0)}%</span>
                  </div>
                </div>
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
                  <p className="font-medium text-neutral-800">{row.pct}</p>
                  <p className="text-neutral-500">{row.frac} = {row.dec}</p>
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
      onClick={onClick}
      className="w-full text-left text-xs text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg px-3 py-2 transition-colors duration-150"
    >
      {label}
    </button>
  );
}
