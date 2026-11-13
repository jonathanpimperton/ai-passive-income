import { useState, useMemo, useCallback, useEffect } from 'react';
import { RotateCcw, Copy, Check, AlertCircle, CheckCircle, Braces, Key, FileText, Minimize2, AlertTriangle } from 'lucide-react';
import { parseJsonLossless, printJson, describeTopLevel, type JsonParseError, type JsonParseResult } from '../../lib/dev-tools/json-lossless';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';
import { useSizeAwareDebounce } from '../../lib/dev-tools/use-size-aware-debounce';
import { safely } from '../../lib/dev-tools/safe-compute';

const SAMPLE_JSON = `{"name":"John Doe","age":30,"email":"john@example.com","address":{"street":"123 Main St","city":"New York","state":"NY","zip":"10001"},"hobbies":["reading","hiking","photography"],"active":true}`;

type IndentSize = 2 | 4;
type View = 'pretty' | 'minified';

/** The offending line, trimmed around the error column, with a caret under it. */
function errorExcerpt(text: string, error: JsonParseError): { line: string; caret: string } | null {
  const lines = text.split('\n');
  const raw = lines[error.line - 1];
  if (raw === undefined) return null;
  const col = error.column - 1;
  const start = Math.max(0, col - 40);
  const end = Math.min(raw.length, col + 40);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < raw.length ? '...' : '';
  const shown = prefix + raw.slice(start, end).replace(/\t/g, ' ') + suffix;
  return { line: shown, caret: ' '.repeat(prefix.length + col - start) + '^' };
}

export default function JsonFormatter() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [view, setView] = useState<View>('pretty');
  const [announcement, setAnnouncement] = useState('');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();
  const { value: settledInput, pending } = useSizeAwareDebounce(input);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setIndentSize(2);
    setSortKeys(false);
    setView('pretty');
  }, []);

  // One parse per settled change (it used to parse three times per keystroke).
  // An unexpected exception in any of these must show a message, not unmount the tool.
  // Line 0 marks a failure that is not a position in the user's text.
  const parsed = useMemo(
    () =>
      safely<JsonParseResult | null>(
        () => (settledInput.trim() ? parseJsonLossless(settledInput) : null),
        (message) => ({ ok: false, error: { message, line: 0, column: 0, offset: 0 } }),
      ),
    [settledInput],
  );

  const output = useMemo(() => {
    if (!parsed || !parsed.ok) return { formatted: '', minified: '', failure: '' };
    return safely(
      () => ({
        formatted: printJson(parsed.value, { indent: indentSize, sortKeys }),
        minified: printJson(parsed.value, { indent: 0, sortKeys }),
        failure: '',
      }),
      (message) => ({ formatted: '', minified: '', failure: message }),
    );
  }, [parsed, indentSize, sortKeys]);

  const stats = useMemo(() => {
    if (!parsed || !parsed.ok || output.failure) return null;
    return safely(
      () => {
        const top = describeTopLevel(parsed.value);
        return {
          type: top.type,
          keys: top.keys,
          keyLabel: top.type === 'Array' ? 'Items' : 'Top-Level Keys',
          size: new Blob([output.formatted]).size,
          minifiedSize: new Blob([output.minified]).size,
        };
      },
      () => null,
    );
  }, [parsed, output]);

  const failure: JsonParseError | null = output.failure ? { message: output.failure, line: 0, column: 0, offset: 0 } : null;
  const valid = !!parsed && parsed.ok && !failure;
  const error = parsed && !parsed.ok ? parsed.error : failure;
  const warnings = parsed && parsed.ok ? parsed.warnings : [];
  const shown = view === 'minified' ? output.minified : output.formatted;
  const excerpt = useMemo(
    () => (error && error.line > 0 ? safely(() => errorExcerpt(settledInput, error), () => null) : null),
    [error, settledInput],
  );

  // Screen readers get one short, debounced status instead of the whole output on every keystroke.
  useEffect(() => {
    const text = !parsed
      ? ''
      : parsed.ok
        ? `Valid JSON${parsed.warnings.length ? `, ${parsed.warnings.length} warning${parsed.warnings.length === 1 ? '' : 's'}` : ''}`
        : parsed.error.line > 0
          ? `Invalid JSON: ${parsed.error.message}, line ${parsed.error.line}, column ${parsed.error.column}`
          : parsed.error.message;
    const t = setTimeout(() => setAnnouncement(text), 600);
    return () => clearTimeout(t);
  }, [parsed]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Input */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Input</h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 min-h-[40px] px-3 -mr-3 text-sm text-neutral-500 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </button>
          </div>

          <label htmlFor="json-input" className="block text-sm font-medium text-neutral-700 mb-2">Paste your JSON</label>
          <textarea
            id="json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            className="w-full h-[340px] rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-base sm:text-sm
              font-mono leading-relaxed p-4 resize-none
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
          />

          {/* Options */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <div className="flex items-center gap-2">
              <label htmlFor="json-indent" className="text-sm text-neutral-600">Indent:</label>
              <select
                id="json-indent"
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value) as IndentSize)}
                className="h-10 rounded-lg border border-neutral-200 bg-white text-base sm:text-sm px-2
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </div>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
              />
              Sort keys
            </label>
            <div className="flex rounded-lg border border-neutral-200 overflow-hidden" role="group" aria-label="Output style">
              <button
                type="button"
                onClick={() => setView('pretty')}
                aria-pressed={view === 'pretty'}
                className={`min-h-[40px] px-3 text-sm font-medium transition-colors duration-150 ${
                  view === 'pretty' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Beautify
              </button>
              <button
                type="button"
                onClick={() => setView('minified')}
                aria-pressed={view === 'minified'}
                className={`min-h-[40px] px-3 text-sm font-medium transition-colors duration-150 ${
                  view === 'minified' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Minify
              </button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="p-6 lg:p-8 bg-neutral-50/50">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">Output</h2>
              {pending ? (
                <span className="text-xs text-neutral-500">Checking...</span>
              ) : (
                input.trim() && (
                  valid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-50 text-success-700 text-xs font-medium rounded-full">
                      <CheckCircle size={12} aria-hidden="true" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                      <AlertCircle size={12} aria-hidden="true" />
                      Invalid
                    </span>
                  )
                )
              )}
            </div>
            {valid && (
              <button
                type="button"
                onClick={() => copy(shown)}
                className="flex items-center gap-1.5 min-h-[40px] px-3 -mr-3 text-sm text-neutral-600 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
              >
                {copiedKey ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copiedKey ? 'Copied!' : failedKey ? 'Copy failed' : view === 'minified' ? 'Copy minified' : 'Copy'}
              </button>
            )}
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage || announcement}</span>

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-800 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-sm text-amber-800 space-y-1">
                  <p className="font-medium">Valid, with {warnings.length} warning{warnings.length === 1 ? '' : 's'}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {warnings.slice(0, 5).map((w, k) => (
                      <li key={k} className="break-words">{w.message}</li>
                    ))}
                  </ul>
                  {warnings.length > 5 && <p>And {warnings.length - 5} more.</p>}
                </div>
              </div>
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {error.line > 0 ? `Parse error on line ${error.line}, column ${error.column}` : 'Something went wrong'}
                  </p>
                  <p className="text-sm text-red-700 mt-1">{error.line > 0 ? `${error.message}.` : error.message}</p>
                  {error.hint && <p className="text-sm text-red-700 mt-1">{error.hint}</p>}
                  {excerpt && (
                    <pre className="mt-3 text-sm font-mono text-red-800 bg-neutral-50 rounded-lg p-3 overflow-x-auto" aria-hidden="true">
                      {excerpt.line}
                      {'\n'}
                      {excerpt.caret}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre
                className="w-full h-[340px] rounded-xl border border-neutral-200 bg-white text-sm
                  font-mono leading-relaxed p-4 overflow-auto text-neutral-800"
                tabIndex={0}
                aria-label="Formatted JSON output"
              >
                {shown || <span className="text-neutral-500">Formatted JSON will appear here...</span>}
              </pre>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Braces size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Type</p>
                  <p className="text-sm font-semibold text-neutral-900">{stats.type}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Key size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">{stats.keyLabel}</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">{stats.keys.toLocaleString('en-US')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Formatted Size</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatBytes(stats.size)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Minimize2 size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Minified Size</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatBytes(stats.minifiedSize)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
