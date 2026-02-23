import { useState, useMemo, useCallback } from 'react';
import { RotateCcw, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';

const SAMPLE_JSON = `{"name":"John Doe","age":30,"email":"john@example.com","address":{"street":"123 Main St","city":"New York","state":"NY","zip":"10001"},"hobbies":["reading","hiking","photography"],"active":true}`;

type IndentSize = 2 | 4;

export default function JsonFormatter() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setIndentSize(2);
    setSortKeys(false);
    setCopied(false);
  }, []);

  const result = useMemo(() => {
    if (!input.trim()) return { formatted: '', error: null, valid: false };

    try {
      let parsed = JSON.parse(input);

      if (sortKeys) {
        parsed = deepSortKeys(parsed);
      }

      const formatted = JSON.stringify(parsed, null, indentSize);
      return { formatted, error: null, valid: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      return { formatted: '', error: msg, valid: false };
    }
  }, [input, indentSize, sortKeys]);

  const minified = useMemo(() => {
    if (!result.valid || !result.formatted) return '';
    try {
      return JSON.stringify(JSON.parse(result.formatted));
    } catch {
      return '';
    }
  }, [result]);

  const stats = useMemo(() => {
    if (!result.valid) return null;
    try {
      const parsed = JSON.parse(input);
      return {
        type: Array.isArray(parsed) ? 'Array' : typeof parsed === 'object' && parsed !== null ? 'Object' : typeof parsed,
        keys: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0,
        size: new Blob([result.formatted]).size,
        minifiedSize: minified ? new Blob([minified]).size : 0,
      };
    } catch {
      return null;
    }
  }, [result, input, minified]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleMinify = useCallback(() => {
    if (minified) setInput(minified);
  }, [minified]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Input */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Input</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset input"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>

          <label htmlFor="json-input" className="sr-only">Paste your JSON here</label>
          <textarea
            id="json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            className="w-full h-[340px] rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm
              font-mono leading-relaxed p-4 resize-none
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
          />

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label htmlFor="json-indent" className="text-sm text-neutral-600">Indent:</label>
              <select
                id="json-indent"
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value) as IndentSize)}
                className="h-9 rounded-lg border border-neutral-200 bg-white text-sm px-2
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
              />
              Sort keys
            </label>
            <button
              onClick={handleMinify}
              disabled={!result.valid}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Minify
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="p-6 lg:p-8 bg-neutral-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">Output</h2>
              {input.trim() && (
                result.valid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-700 text-xs font-medium rounded-full">
                    <CheckCircle size={12} aria-hidden="true" />
                    Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                    <AlertCircle size={12} aria-hidden="true" />
                    Invalid
                  </span>
                )
              )}
            </div>
            {result.valid && (
              <button
                onClick={() => handleCopy(result.formatted)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
                aria-label="Copy formatted JSON"
              >
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {result.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-red-800">Parse Error</p>
                  <p className="text-sm text-red-600 mt-1 font-mono">{result.error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre
                className="w-full h-[340px] rounded-xl border border-neutral-200 bg-white text-sm
                  font-mono leading-relaxed p-4 overflow-auto text-neutral-800"
                aria-live="polite"
              >
                {result.formatted || <span className="text-neutral-400">Formatted JSON will appear here...</span>}
              </pre>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3">
                <p className="text-xs text-neutral-500 mb-0.5">Type</p>
                <p className="text-sm font-semibold text-neutral-900">{stats.type}</p>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3">
                <p className="text-xs text-neutral-500 mb-0.5">Top-Level Keys</p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">{stats.keys}</p>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3">
                <p className="text-xs text-neutral-500 mb-0.5">Formatted Size</p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatBytes(stats.size)}</p>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3">
                <p className="text-xs text-neutral-500 mb-0.5">Minified Size</p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatBytes(stats.minifiedSize)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function deepSortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
        return sorted;
      }, {});
  }
  return obj;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
