import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RotateCcw, Percent, Wallet, ArrowUpDown } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';

/**
 * Average annual CPI-U inflation rates by year (BLS data).
 * Used for historical purchasing power calculations.
 */
const CPI_DATA: Record<number, number> = {
  1913: 9.9, 1914: 10.0, 1915: 10.1, 1916: 10.9, 1917: 12.8, 1918: 15.0,
  1919: 17.3, 1920: 20.0, 1921: 17.9, 1922: 16.8, 1923: 17.1, 1924: 17.1,
  1925: 17.5, 1926: 17.7, 1927: 17.4, 1928: 17.2, 1929: 17.2, 1930: 16.7,
  1931: 15.2, 1932: 13.6, 1933: 12.9, 1934: 13.4, 1935: 13.7, 1936: 13.9,
  1937: 14.4, 1938: 14.1, 1939: 13.9, 1940: 14.0, 1941: 14.7, 1942: 16.3,
  1943: 17.3, 1944: 17.6, 1945: 18.0, 1946: 19.5, 1947: 22.3, 1948: 24.0,
  1949: 23.8, 1950: 24.1, 1951: 26.0, 1952: 26.6, 1953: 26.8, 1954: 26.9,
  1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.2, 1960: 29.6,
  1961: 29.9, 1962: 30.3, 1963: 30.6, 1964: 31.0, 1965: 31.5, 1966: 32.5,
  1967: 33.4, 1968: 34.8, 1969: 36.7, 1970: 38.8, 1971: 40.5, 1972: 41.8,
  1973: 44.4, 1974: 49.3, 1975: 53.8, 1976: 56.9, 1977: 60.6, 1978: 65.2,
  1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6, 1984: 103.9,
  1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0, 1990: 130.7,
  1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9,
  1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9,
  2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3,
  2009: 214.5, 2010: 218.1, 2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7,
  2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7, 2020: 258.8,
  2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 313.0, 2025: 319.0,
};

const MIN_YEAR = Math.min(...Object.keys(CPI_DATA).map(Number));
const MAX_YEAR = Math.max(...Object.keys(CPI_DATA).map(Number));

type Mode = 'historical' | 'future';

const TABS: { key: Mode; label: string }[] = [
  { key: 'historical', label: 'Historical' },
  { key: 'future', label: 'Future Projection' },
];

const DEFAULTS = {
  amount: 1000,
  startYear: 2000,
  endYear: 2025,
  futureYears: 10,
  inflationRate: 3,
};

export default function InflationCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('historical');
  const [amount, setAmount] = useState(DEFAULTS.amount);
  const [startYear, setStartYear] = useState(DEFAULTS.startYear);
  const [endYear, setEndYear] = useState(DEFAULTS.endYear);
  const [futureYears, setFutureYears] = useState(DEFAULTS.futureYears);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);

  const handleReset = useCallback(() => {
    setAmount(DEFAULTS.amount);
    setStartYear(DEFAULTS.startYear);
    setEndYear(DEFAULTS.endYear);
    setFutureYears(DEFAULTS.futureYears);
    setInflationRate(DEFAULTS.inflationRate);
  }, []);

  const historicalResult = useMemo(() => {
    if (mode !== 'historical') return null;
    const cpiStart = CPI_DATA[startYear];
    const cpiEnd = CPI_DATA[endYear];
    if (!cpiStart || !cpiEnd || startYear >= endYear) return null;

    const adjustedValue = amount * (cpiEnd / cpiStart);
    const totalInflation = (cpiEnd - cpiStart) / cpiStart;
    const years = endYear - startYear;
    const avgAnnualRate = Math.pow(cpiEnd / cpiStart, 1 / years) - 1;
    const purchasingPower = amount * (cpiStart / cpiEnd);

    return { adjustedValue, totalInflation, avgAnnualRate, purchasingPower, years };
  }, [mode, amount, startYear, endYear]);

  const futureResult = useMemo(() => {
    if (mode !== 'future') return null;
    const rate = inflationRate / 100;
    const futureValue = amount * Math.pow(1 + rate, futureYears);
    const purchasingPower = amount / Math.pow(1 + rate, futureYears);
    const totalInflation = Math.pow(1 + rate, futureYears) - 1;

    return { futureValue, purchasingPower, totalInflation };
  }, [mode, amount, futureYears, inflationRate]);

  const animatedHistorical = useAnimatedNumber(historicalResult?.adjustedValue ?? 0);
  const animatedFuture = useAnimatedNumber(futureResult?.futureValue ?? 0);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Mode', value: mode === 'historical' ? 'Historical' : 'Future Projection' },
      { label: 'Dollar Amount', value: formatCurrency(amount) },
    ];
    if (mode === 'historical') {
      inputs.push(
        { label: 'Start Year', value: String(startYear) },
        { label: 'End Year', value: String(endYear) },
      );
    } else {
      inputs.push(
        { label: 'Years Into Future', value: `${futureYears} years` },
        { label: 'Assumed Annual Inflation', value: `${inflationRate.toFixed(1)}%` },
      );
    }
    return inputs;
  }, [mode, amount, startYear, endYear, futureYears, inflationRate]);

  const getResults = useCallback((): ResultItem[] => {
    if (mode === 'historical' && historicalResult) {
      return [
        { label: `${formatCurrency(amount)} in ${startYear} equals`, value: formatCurrency(historicalResult.adjustedValue), highlight: true },
        { label: 'Average Annual Inflation', value: `${(historicalResult.avgAnnualRate * 100).toFixed(2)}%` },
        { label: 'Purchasing Power Today', value: formatCurrency(historicalResult.purchasingPower) },
      ];
    }
    if (mode === 'future' && futureResult) {
      return [
        { label: `${formatCurrency(amount)} today will cost`, value: formatCurrency(futureResult.futureValue), highlight: true },
        { label: 'Purchasing Power Lost', value: formatCurrency(amount - futureResult.purchasingPower) },
      ];
    }
    return [{ label: 'Result', value: 'Adjust inputs to see results', highlight: true }];
  }, [mode, amount, startYear, historicalResult, futureResult]);

  const chartData = useMemo(() => {
    if (mode === 'historical') {
      if (!historicalResult) return [];
      const data = [];
      const cpiStart = CPI_DATA[startYear];
      for (let y = startYear; y <= endYear; y++) {
        const cpi = CPI_DATA[y];
        if (!cpi) continue;
        data.push({
          year: y,
          'Equivalent Value': Math.round(amount * (cpi / cpiStart)),
          'Original Amount': amount,
        });
      }
      return data;
    } else {
      const rate = inflationRate / 100;
      const data = [];
      for (let y = 0; y <= futureYears; y++) {
        data.push({
          year: new Date().getFullYear() + y,
          'Cost in Future Dollars': Math.round(amount * Math.pow(1 + rate, y)),
          'Purchasing Power': Math.round(amount / Math.pow(1 + rate, y)),
        });
      }
      return data;
    }
  }, [mode, amount, startYear, endYear, futureYears, inflationRate, historicalResult]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200/80" role="tablist" aria-label="Inflation calculation mode">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={mode === tab.key}
            aria-controls="inf-results"
            onClick={() => setMode(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
              mode === tab.key
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/40'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              {mode === 'historical' ? 'Historical Lookup' : 'Future Projection'}
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="space-y-5">
            <SliderInput label="Dollar Amount" id="inf-amount" value={amount} min={1} max={1000000} step={100} onChange={setAmount} prefix="$" formatDisplay={formatNumber} hint="The amount you want to check" />

            {mode === 'historical' ? (
              <>
                <SliderInput label="Start Year" id="inf-start" value={startYear} min={MIN_YEAR} max={MAX_YEAR - 1} step={1} onChange={(v) => { setStartYear(v); if (v >= endYear) setEndYear(Math.min(v + 1, MAX_YEAR)); }} formatDisplay={(v) => String(Math.round(v))} />
                <SliderInput label="End Year" id="inf-end" value={endYear} min={startYear + 1} max={MAX_YEAR} step={1} onChange={setEndYear} formatDisplay={(v) => String(Math.round(v))} />
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Using U.S. Bureau of Labor Statistics CPI-U data ({MIN_YEAR}–{MAX_YEAR}).
                  </p>
                </div>
              </>
            ) : (
              <>
                <SliderInput label="Years Into Future" id="inf-future" value={futureYears} min={1} max={50} step={1} onChange={setFutureYears} />
                <SliderInput label="Assumed Annual Inflation Rate" id="inf-rate" value={inflationRate} min={0} max={15} step={0.1} onChange={setInflationRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="How fast prices rise each year — ~3% is the US long-term average" />
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div id="inf-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite" ref={resultsRef}>
          {mode === 'historical' && historicalResult && (
            <>
              <div data-pdf-section className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">{formatCurrency(amount)} in {startYear} equals</p>
                <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {formatCurrency(animatedHistorical)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  in {endYear} dollars ({historicalResult.years} years, {(historicalResult.totalInflation * 100).toFixed(1)}% cumulative inflation)
                </p>
              </div>
              <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Percent size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Avg. Annual Inflation</p>
                    <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                      {(historicalResult.avgAnnualRate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5"><Wallet size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">{endYear} Purchasing Power</p>
                    <p className="text-lg font-semibold text-accent-600 tabular-nums">
                      {formatCurrency(historicalResult.purchasingPower)}
                    </p>
                    <p className="text-xs text-neutral-400">of original {formatCurrency(amount)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'historical' && !historicalResult && (
            <div className="text-sm text-neutral-500 mb-6">
              Select a valid start and end year to see results.
            </div>
          )}

          {mode === 'future' && futureResult && (
            <>
              <div data-pdf-section className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">
                  {formatCurrency(amount)} today will cost
                </p>
                <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {formatCurrency(animatedFuture)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  in {futureYears} years at {inflationRate.toFixed(1)}% annual inflation ({(futureResult.totalInflation * 100).toFixed(1)}% total)
                </p>
              </div>
              <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5"><Wallet size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Your {formatCurrency(amount)} Will Buy</p>
                    <p className="text-lg font-semibold text-accent-600 tabular-nums">
                      {formatCurrency(futureResult.purchasingPower)}
                    </p>
                    <p className="text-xs text-neutral-400">worth of today's goods</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><ArrowUpDown size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Purchasing Power Lost</p>
                    <p className="text-lg font-semibold text-red-600 tabular-nums">
                      {formatCurrency(amount - futureResult.purchasingPower)}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {((1 - futureResult.purchasingPower / amount) * 100).toFixed(1)}% decrease
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <EmailResultsButton toolSlug="inflation" toolName="Inflation Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Inflation Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">
              {mode === 'historical' ? 'Value Over Time' : 'Purchasing Power Over Time'}
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="infColor1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="infColor2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      `$${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`
                    }
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip labelPrefix="" />} />
                  {mode === 'historical' ? (
                    <>
                      <Area type="monotone" dataKey="Equivalent Value" stroke="#2563EB" strokeWidth={2} fill="url(#infColor1)" animationDuration={600} />
                      <Area type="monotone" dataKey="Original Amount" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="4 3" fill="none" animationDuration={600} />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="Cost in Future Dollars" stroke="#2563EB" strokeWidth={2} fill="url(#infColor1)" animationDuration={600} />
                      <Area type="monotone" dataKey="Purchasing Power" stroke="#10B981" strokeWidth={2} fill="url(#infColor2)" animationDuration={600} />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
