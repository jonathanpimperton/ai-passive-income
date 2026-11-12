/**
 * CSV <-> JSON Converter using PapaParse (src/lib/dev-tools/csv.ts).
 * Paste or upload, delimiter and header options, download result.
 * No server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight, FileText, AlertTriangle } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { parseJsonLossless } from '../../lib/dev-tools/json-lossless';
import { csvToJson, jsonToCsv, delimiterName, type Delimiter, type PapaModule } from '../../lib/dev-tools/csv';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';
import { useSizeAwareDebounce } from '../../lib/dev-tools/use-size-aware-debounce';

type Mode = 'csv-to-json' | 'json-to-csv';

const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: 'auto', label: 'Detect automatically' },
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];

interface Result {
  output: string;
  error: string;
  warnings: string[];
  summary: string;
}

export default function CsvJsonConverter() {
  const [mode, setMode] = useState<Mode>('csv-to-json');
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState<Delimiter>('auto');
  const [header, setHeader] = useState(true);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [protectFormulas, setProtectFormulas] = useState(true);
  const [papa, setPapa] = useState<PapaModule | null>(null);
  const [loadError, setLoadError] = useState('');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();
  const { value: settledInput, pending } = useSizeAwareDebounce(input);

  // Load PapaParse on mount so the very first paste is parsed properly (DEVTOOLS-07).
  useEffect(() => {
    let cancelled = false;
    import('papaparse')
      .then((mod) => {
        if (!cancelled) setPapa(((mod as unknown as { default?: PapaModule }).default ?? mod) as unknown as PapaModule);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The CSV parser failed to load. Check your connection and reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo<Result>(() => {
    const none: Result = { output: '', error: '', warnings: [], summary: '' };
    if (!settledInput.trim()) return none;
    if (mode === 'csv-to-json') {
      if (!papa) return { ...none, error: loadError };
      const r = csvToJson(papa, settledInput, { delimiter, header, skipEmptyLines: skipEmpty });
      if (!r.ok) return { ...none, error: r.error };
      const summary = `${r.rows.toLocaleString('en-US')} row${r.rows === 1 ? '' : 's'}, ${r.columns} column${r.columns === 1 ? '' : 's'}, ${delimiterName(r.delimiter)}-separated`;
      return { ...none, output: r.json, warnings: r.warnings, summary };
    }
    const parsed = parseJsonLossless(settledInput);
    if (!parsed.ok) {
      const e = parsed.error;
      return { ...none, error: `Invalid JSON on line ${e.line}, column ${e.column}: ${e.message}.${e.hint ? ` ${e.hint}` : ''}` };
    }
    const r = jsonToCsv(parsed.value, { delimiter, protectFormulas });
    if (!r.ok) return { ...none, error: r.error };
    const summary = `${r.rows.toLocaleString('en-US')} row${r.rows === 1 ? '' : 's'}, ${r.columns} column${r.columns === 1 ? '' : 's'}`;
    return { ...none, output: r.csv, warnings: r.warnings, summary };
  }, [settledInput, mode, papa, loadError, delimiter, header, skipEmpty, protectFormulas]);

  const output = result.output;
  const waitingForParser = mode === 'csv-to-json' && !papa && !loadError && !!input.trim();

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const text = await f.text();
    setInput(text);
    // Auto-detect mode from file extension
    if (f.name.endsWith('.json')) setMode('json-to-csv');
    else if (f.name.endsWith('.csv') || f.name.endsWith('.tsv') || f.name.endsWith('.txt')) setMode('csv-to-json');
  }, []);

  const downloadResult = () => {
    const ext = mode === 'csv-to-json' ? '.json' : '.csv';
    const mime = mode === 'csv-to-json' ? 'application/json' : 'text/csv';
    const blob = new Blob([output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMode = () => {
    setMode(mode === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json');
    // Swap input/output if the result is valid
    if (output && !result.error) setInput(output);
  };

  const shownOutput = result.error ? '' : waitingForParser ? 'Loading CSV parser...' : pending ? 'Converting...' : output;

  return (
    <div className="space-y-5">
      <PrivacyBadge />

      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'csv-to-json' ? 'CSV → JSON' : 'JSON → CSV'}
        </button>
        <span className="text-xs text-neutral-500">Click to swap direction</span>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <div>
          <label htmlFor="csv-delimiter" className="block text-xs font-medium text-neutral-600 mb-1">
            Delimiter
          </label>
          <select
            id="csv-delimiter"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as Delimiter)}
            className="h-11 rounded-lg border border-neutral-200 bg-white px-2 text-base sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          >
            {DELIMITERS.map((d) => (
              <option key={d.label} value={d.value}>
                {mode === 'json-to-csv' && d.value === 'auto' ? 'Comma (default)' : d.label}
              </option>
            ))}
          </select>
        </div>
        {mode === 'csv-to-json' ? (
          <>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20" />
              First row is column names
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={skipEmpty} onChange={(e) => setSkipEmpty(e.target.checked)} className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20" />
              Skip blank lines
            </label>
          </>
        ) : (
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
            <input type="checkbox" checked={protectFormulas} onChange={(e) => setProtectFormulas(e.target.checked)} className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20" />
            Protect against spreadsheet formulas
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="space-y-3">
          <label htmlFor="csv-json-input" className="block text-sm font-medium text-neutral-700">
            {mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
          </label>
          <FileDropZone
            accept={mode === 'csv-to-json' ? '.csv,.tsv,.txt,text/csv,text/tab-separated-values' : '.json,application/json'}
            acceptLabel={mode === 'csv-to-json' ? 'Drop a .csv or .tsv file' : 'Drop a .json file'}
            onFiles={handleFiles}
          />
          <textarea
            id="csv-json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'csv-to-json'
                ? 'name,age,city\nAlice,30,NYC\nBob,25,LA'
                : '[{"name":"Alice","age":30,"city":"NYC"}]'
            }
            rows={12}
            spellCheck={false}
            className="w-full rounded-xl border border-neutral-200 bg-white text-neutral-900 text-base sm:text-sm font-mono p-4
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 resize-y"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="csv-json-output" className="text-sm font-medium text-neutral-700">
              {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            </label>
            {output && !pending && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copy(output)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-sm font-medium text-neutral-600 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
                >
                  {copiedKey ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copiedKey ? 'Copied' : failedKey ? 'Copy failed' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-sm font-medium text-neutral-600 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
                >
                  <Download size={14} aria-hidden="true" />
                  Download
                </button>
              </div>
            )}
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>

          {result.error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{result.error}</div>
          )}
          {!result.error && result.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <ul className="space-y-1">
                {result.warnings.map((w, k) => <li key={k}>{w}</li>)}
              </ul>
            </div>
          )}

          <textarea
            id="csv-json-output"
            readOnly
            value={shownOutput}
            placeholder="Output appears here..."
            rows={16}
            spellCheck={false}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-base sm:text-sm font-mono p-4 resize-y"
          />
          {result.summary && !result.error && !pending && <p className="text-xs text-neutral-500">{result.summary}</p>}
        </div>
      </div>

      {!input && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
          <p className="text-sm text-neutral-500">Paste data or upload a file to get started</p>
        </div>
      )}
    </div>
  );
}
