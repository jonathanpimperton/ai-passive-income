/**
 * JSON <-> YAML Converter using js-yaml (src/lib/dev-tools/yaml.ts).
 * Real-time conversion, multi-document YAML, schema choice, copy/download.
 * No server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';
import { parseJsonLossless } from '../../lib/dev-tools/json-lossless';
import { yamlToJson, jsonToYaml, looksLikeYaml, type JsYamlModule, type YamlSchemaChoice } from '../../lib/dev-tools/yaml';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';
import { useSizeAwareDebounce } from '../../lib/dev-tools/use-size-aware-debounce';

type Mode = 'json-to-yaml' | 'yaml-to-json';
type IndentSize = 2 | 4;

const SAMPLE_JSON = `{
  "name": "CalcRun",
  "version": "1.0.0",
  "features": ["calculators", "converters", "utilities"],
  "config": {
    "theme": "light",
    "language": "en",
    "analytics": true
  },
  "limits": {
    "maxFileSize": 50,
    "maxRequests": null
  }
}`;

const SCHEMAS: { value: YamlSchemaChoice; label: string }[] = [
  { value: 'core', label: 'YAML 1.2 Core (dates stay as text)' },
  { value: 'json', label: 'JSON schema (strict)' },
  { value: 'extended', label: 'Extended (dates become timestamps)' },
];

interface Result {
  output: string;
  error: string;
  warnings: string[];
  switchHint: boolean;
}

export default function JsonYamlConverter() {
  const [mode, setMode] = useState<Mode>('json-to-yaml');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [schema, setSchema] = useState<YamlSchemaChoice>('core');
  const [jsYaml, setJsYaml] = useState<JsYamlModule | null>(null);
  const [loadError, setLoadError] = useState('');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();
  const { value: settledInput, pending } = useSizeAwareDebounce(input);

  useEffect(() => {
    let cancelled = false;
    import('js-yaml')
      .then((mod) => {
        if (!cancelled) setJsYaml(((mod as unknown as { default?: JsYamlModule }).default ?? mod) as unknown as JsYamlModule);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The YAML library failed to load. Check your connection and reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo<Result>(() => {
    const none: Result = { output: '', error: '', warnings: [], switchHint: false };
    if (!settledInput.trim()) return none;
    if (!jsYaml) return { ...none, error: loadError };
    if (mode === 'json-to-yaml') {
      const parsed = parseJsonLossless(settledInput);
      if (!parsed.ok) {
        const e = parsed.error;
        return {
          ...none,
          error: `Invalid JSON on line ${e.line}, column ${e.column}: ${e.message}.${e.hint ? ` ${e.hint}` : ''}`,
          switchHint: looksLikeYaml(settledInput),
        };
      }
      const r = jsonToYaml(jsYaml, parsed.value, { indent: indentSize });
      if (!r.ok) return { ...none, error: r.error };
      const duplicates = parsed.warnings.filter((w) => w.kind === 'duplicate-key').map((w) => w.message);
      return { ...none, output: r.yaml, warnings: [...r.warnings, ...duplicates] };
    }
    const r = yamlToJson(jsYaml, settledInput, { schema, indent: indentSize });
    if (!r.ok) return { ...none, error: r.error };
    return { ...none, output: r.json, warnings: r.warnings };
  }, [settledInput, mode, indentSize, schema, jsYaml, loadError]);

  const waitingForLibrary = !jsYaml && !loadError && !!input.trim();

  const handleDownload = useCallback(() => {
    if (!result.output) return;
    const ext = mode === 'json-to-yaml' ? 'yaml' : 'json';
    const mime = mode === 'json-to-yaml' ? 'text/yaml' : 'application/json';
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
    setMode((m) => (m === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml'));
  }, [result.output, result.error]);

  const switchOnly = useCallback(() => setMode('yaml-to-json'), []);

  const inputLabel = mode === 'json-to-yaml' ? 'JSON Input' : 'YAML Input';
  const outputLabel = mode === 'json-to-yaml' ? 'YAML Output' : 'JSON Output';
  const shownOutput = result.error ? '' : waitingForLibrary ? 'Loading YAML library...' : pending ? 'Converting...' : result.output;

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors duration-150"
          aria-label={`Switch to ${mode === 'json-to-yaml' ? 'YAML to JSON' : 'JSON to YAML'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'json-to-yaml' ? 'JSON → YAML' : 'YAML → JSON'}
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

        {mode === 'yaml-to-json' && (
          <div>
            <label htmlFor="yaml-schema" className="block text-xs font-medium text-neutral-600 mb-1">
              YAML types
            </label>
            <select
              id="yaml-schema"
              value={schema}
              onChange={(e) => setSchema(e.target.value as YamlSchemaChoice)}
              className="h-11 rounded-lg border border-neutral-200 bg-white px-2 text-base sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            >
              {SCHEMAS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="yaml-input" className="block text-sm font-semibold text-neutral-700">
            {inputLabel}
          </label>
          <textarea
            id="yaml-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'json-to-yaml' ? 'Paste JSON here...' : 'Paste YAML here...'}
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="yaml-output" className="block text-sm font-semibold text-neutral-700">
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
            id="yaml-output"
            readOnly
            value={shownOutput}
            placeholder="Output will appear here..."
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 resize-y"
          />
          {result.error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700" role="alert">
              <p className="whitespace-pre-wrap">{result.error}</p>
              {result.switchHint && (
                <button
                  type="button"
                  onClick={switchOnly}
                  className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-colors duration-150"
                >
                  <ArrowLeftRight size={14} aria-hidden="true" />
                  This looks like YAML: convert YAML to JSON instead
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
      <div className="px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600">
        <strong className="text-neutral-700">Note:</strong> YAML comments are not preserved when converting to JSON (JSON does not support comments).
        YAML anchors and aliases are expanded during conversion. Files with several documents separated by <code className="font-mono text-primary-600">---</code> become a JSON array.
      </div>
    </div>
  );
}
