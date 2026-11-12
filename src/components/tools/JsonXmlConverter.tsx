/**
 * JSON <-> XML Converter: XML parsing with fast-xml-parser, JSON -> XML with
 * our own well-formed builder (src/lib/dev-tools/xml.ts). Real-time
 * conversion, configurable root element, copy/download. No server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';
import { parseJsonLossless } from '../../lib/dev-tools/json-lossless';
import { jsonToXml, xmlToJson, isNcName, type FxpModule } from '../../lib/dev-tools/xml';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';
import { useSizeAwareDebounce } from '../../lib/dev-tools/use-size-aware-debounce';

type Mode = 'json-to-xml' | 'xml-to-json';
type IndentSize = 2 | 4;

const SAMPLE_JSON = `{
  "users": {
    "user": [
      {
        "@_id": "1",
        "name": "Alice",
        "email": "alice@example.com",
        "role": "admin"
      },
      {
        "@_id": "2",
        "name": "Bob",
        "email": "bob@example.com",
        "role": "user"
      }
    ]
  }
}`;

interface Result {
  output: string;
  error: string;
  warnings: string[];
  /** Suggest switching direction when the input looks like the other format. */
  switchHint: boolean;
}

/** Second opinion from the browser's own XML parser before showing generated XML. */
function browserRejects(xml: string): string | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  return err ? (err.textContent || 'XML parser error').trim().split('\n')[0] : null;
}

export default function JsonXmlConverter() {
  const [mode, setMode] = useState<Mode>('json-to-xml');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [rootName, setRootName] = useState('root');
  const [fxp, setFxp] = useState<FxpModule | null>(null);
  const [loadError, setLoadError] = useState('');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();
  const { value: settledInput, pending } = useSizeAwareDebounce(input);

  useEffect(() => {
    let cancelled = false;
    import('fast-xml-parser')
      .then((mod) => {
        if (!cancelled) setFxp(mod as unknown as FxpModule);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The XML library failed to load. Check your connection and reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rootNameError = rootName.trim() && !isNcName(rootName.trim()) ? 'Use letters, digits, _, - or . and start with a letter or _.' : '';

  const result = useMemo<Result>(() => {
    const none: Result = { output: '', error: '', warnings: [], switchHint: false };
    if (!settledInput.trim()) return none;
    if (mode === 'json-to-xml') {
      const parsed = parseJsonLossless(settledInput);
      if (!parsed.ok) {
        const e = parsed.error;
        return {
          ...none,
          error: `Invalid JSON on line ${e.line}, column ${e.column}: ${e.message}.${e.hint ? ` ${e.hint}` : ''}`,
          switchHint: settledInput.trimStart().startsWith('<'),
        };
      }
      const built = jsonToXml(parsed.value, { rootName: rootName.trim() || 'root', indent: indentSize });
      if (!built.ok) return { ...none, error: built.error };
      const rejected = browserRejects(built.xml);
      if (rejected) return { ...none, error: `The generated XML did not pass the browser's XML check (${rejected}). Please report this input.` };
      const duplicates = parsed.warnings.filter((w) => w.kind === 'duplicate-key').map((w) => w.message);
      return { ...none, output: built.xml, warnings: [...built.warnings, ...duplicates] };
    }
    if (!fxp) return { ...none, error: loadError };
    const converted = xmlToJson(fxp, settledInput, indentSize);
    if (!converted.ok) {
      const t = settledInput.trimStart();
      return { ...none, error: converted.error, switchHint: t.startsWith('{') || t.startsWith('[') };
    }
    return { ...none, output: converted.json, warnings: converted.warnings };
  }, [settledInput, mode, indentSize, rootName, fxp, loadError]);

  const waitingForLibrary = mode === 'xml-to-json' && !fxp && !loadError && !!input.trim();

  const handleDownload = useCallback(() => {
    if (!result.output) return;
    const ext = mode === 'json-to-xml' ? 'xml' : 'json';
    const mime = mode === 'json-to-xml' ? 'application/xml' : 'application/json';
    const blob = new Blob([result.output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result.output, mode]);

  // Swapping direction carries the converted output across instead of
  // replacing the user's data with a sample (DEVTOOLS-13).
  const toggleMode = useCallback(() => {
    if (result.output && !result.error) setInput(result.output);
    setMode((m) => (m === 'json-to-xml' ? 'xml-to-json' : 'json-to-xml'));
  }, [result.output, result.error]);

  const switchOnly = useCallback(() => {
    setMode((m) => (m === 'json-to-xml' ? 'xml-to-json' : 'json-to-xml'));
  }, []);

  const inputLabel = mode === 'json-to-xml' ? 'JSON Input' : 'XML Input';
  const outputLabel = mode === 'json-to-xml' ? 'XML Output' : 'JSON Output';
  const shownOutput = result.error ? '' : waitingForLibrary ? 'Loading XML library...' : pending ? 'Converting...' : result.output;

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors duration-150"
          aria-label={`Switch to ${mode === 'json-to-xml' ? 'XML to JSON' : 'JSON to XML'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'json-to-xml' ? 'JSON → XML' : 'XML → JSON'}
        </button>

        {/* Indent selector */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden" role="group" aria-label="Indentation">
          <button
            type="button"
            onClick={() => setIndentSize(2)}
            className={`min-h-[44px] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              indentSize === 2 ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={indentSize === 2}
          >
            2 spaces
          </button>
          <button
            type="button"
            onClick={() => setIndentSize(4)}
            className={`min-h-[44px] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              indentSize === 4 ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={indentSize === 4}
          >
            4 spaces
          </button>
        </div>

        {mode === 'json-to-xml' && (
          <div>
            <label htmlFor="xml-root-name" className="block text-xs font-medium text-neutral-600 mb-1">
              Root element (when needed)
            </label>
            <input
              id="xml-root-name"
              type="text"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              spellCheck={false}
              aria-invalid={!!rootNameError}
              aria-describedby={rootNameError ? 'xml-root-name-error' : undefined}
              className="h-11 w-40 rounded-lg border border-neutral-200 bg-white px-3 font-mono text-base sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            />
            {rootNameError && (
              <p id="xml-root-name-error" className="text-xs text-red-700 mt-1">{rootNameError}</p>
            )}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="xml-input" className="block text-sm font-semibold text-neutral-700">
            {inputLabel}
          </label>
          <textarea
            id="xml-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'json-to-xml' ? 'Paste JSON here...' : 'Paste XML here...'}
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="xml-output" className="block text-sm font-semibold text-neutral-700">
              {outputLabel}
            </label>
            <div className="flex gap-2">
              {result.output && !result.error && !pending && (
                <>
                  <button
                    type="button"
                    onClick={() => copy(result.output)}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                  >
                    {copiedKey ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copiedKey ? 'Copied' : failedKey ? 'Copy failed' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>
          <textarea
            id="xml-output"
            readOnly
            value={shownOutput}
            placeholder="Output will appear here..."
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 resize-y"
          />
          {result.error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700" role="alert">
              <p>{result.error}</p>
              {result.switchHint && (
                <button
                  type="button"
                  onClick={switchOnly}
                  className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-colors duration-150"
                >
                  <ArrowLeftRight size={14} aria-hidden="true" />
                  This looks like {mode === 'json-to-xml' ? 'XML: convert XML to JSON instead' : 'JSON: convert JSON to XML instead'}
                </button>
              )}
            </div>
          )}
          {!result.error && result.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <ul className="space-y-1">
                {result.warnings.map((w, k) => <li key={k}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600 space-y-1">
        <p>
          <strong className="text-neutral-700">Attribute convention:</strong> XML attributes are represented as <code className="font-mono text-primary-600">@_attributeName</code> in JSON.
          For example, <code className="font-mono text-primary-600">&lt;user id="1"&gt;</code> becomes <code className="font-mono text-primary-600">{`{"@_id": "1"}`}</code>.
        </p>
        <p>
          <strong className="text-neutral-700">Values stay as text:</strong> XML has no number type, so <code className="font-mono text-primary-600">&lt;zip&gt;02134&lt;/zip&gt;</code> becomes <code className="font-mono text-primary-600">"02134"</code>, never 2134.
        </p>
      </div>
    </div>
  );
}
