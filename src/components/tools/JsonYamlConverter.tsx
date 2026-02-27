/**
 * JSON ↔ YAML Converter — bidirectional conversion using js-yaml.
 * Real-time conversion, copy/download, indent options. No server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';

type Mode = 'json-to-yaml' | 'yaml-to-json';
type IndentSize = 2 | 4;

let jsYamlInstance: typeof import('js-yaml') | null = null;
let jsYamlLoading = false;

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

const SAMPLE_YAML = `name: CalcRun
version: 1.0.0
features:
  - calculators
  - converters
  - utilities
config:
  theme: light
  language: en
  analytics: true
limits:
  maxFileSize: 50
  maxRequests: null`;

export default function JsonYamlConverter() {
  const [mode, setMode] = useState<Mode>('json-to-yaml');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [copied, setCopied] = useState(false);
  const [yamlReady, setYamlReady] = useState(false);

  // Load js-yaml lazily
  useEffect(() => {
    if (jsYamlInstance) {
      setYamlReady(true);
      return;
    }
    if (jsYamlLoading) return;
    jsYamlLoading = true;
    import('js-yaml')
      .then((mod) => {
        jsYamlInstance = mod;
        setYamlReady(true);
      })
      .catch(() => setYamlReady(true)); // Degrade gracefully — result memo handles missing lib
  }, []);

  const result = useMemo(() => {
    if (!yamlReady || !jsYamlInstance) return { output: 'Loading YAML library...', error: '' };
    if (!input.trim()) return { output: '', error: '' };

    try {
      if (mode === 'json-to-yaml') {
        const parsed = JSON.parse(input);
        const yaml = jsYamlInstance.dump(parsed, {
          indent: indentSize,
          lineWidth: -1, // no line wrapping
          noRefs: true,
          sortKeys: false,
        });
        return { output: yaml, error: '' };
      } else {
        const parsed = jsYamlInstance.load(input);
        const json = JSON.stringify(parsed, null, indentSize);
        return { output: json, error: '' };
      }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Conversion failed' };
    }
  }, [input, mode, indentSize, yamlReady]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const newMode = m === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
      setInput(newMode === 'json-to-yaml' ? SAMPLE_JSON : SAMPLE_YAML);
      return newMode;
    });
  }, []);

  const inputLabel = mode === 'json-to-yaml' ? 'JSON Input' : 'YAML Input';
  const outputLabel = mode === 'json-to-yaml' ? 'YAML Output' : 'JSON Output';

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toggleMode}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors duration-150"
          aria-label={`Switch to ${mode === 'json-to-yaml' ? 'YAML to JSON' : 'JSON to YAML'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'json-to-yaml' ? 'JSON → YAML' : 'YAML → JSON'}
        </button>

        {/* Indent selector */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
          <button
            onClick={() => setIndentSize(2)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              indentSize === 2 ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={indentSize === 2}
          >
            2 spaces
          </button>
          <button
            onClick={() => setIndentSize(4)}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              indentSize === 4 ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={indentSize === 4}
          >
            4 spaces
          </button>
        </div>
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
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
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
              {result.output && !result.error && (
                <>
                  <button
                    onClick={() => handleCopy(result.output)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                    aria-label="Copy output"
                  >
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                    aria-label="Download output"
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            id="yaml-output"
            readOnly
            value={result.error ? '' : result.output}
            placeholder="Output will appear here..."
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 resize-y"
            aria-live="polite"
          />
          {result.error && (
            <p className="text-sm text-negative-600 font-medium" role="alert">{result.error}</p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600">
        <strong className="text-neutral-700">Note:</strong> YAML comments are not preserved when converting to JSON (JSON does not support comments).
        YAML anchors and aliases are resolved during conversion.
      </div>
    </div>
  );
}
