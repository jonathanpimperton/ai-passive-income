/**
 * JSON ↔ XML Converter — bidirectional conversion using fast-xml-parser.
 * Real-time conversion, configurable root element, copy/download. No server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';

type Mode = 'json-to-xml' | 'xml-to-json';
type IndentSize = 2 | 4;

let fxpModule: typeof import('fast-xml-parser') | null = null;
let fxpLoading = false;

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

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<users>
  <user id="1">
    <name>Alice</name>
    <email>alice@example.com</email>
    <role>admin</role>
  </user>
  <user id="2">
    <name>Bob</name>
    <email>bob@example.com</email>
    <role>user</role>
  </user>
</users>`;

export default function JsonXmlConverter() {
  const [mode, setMode] = useState<Mode>('json-to-xml');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [copied, setCopied] = useState(false);
  const [libReady, setLibReady] = useState(false);

  // Load fast-xml-parser lazily
  useEffect(() => {
    if (fxpModule) {
      setLibReady(true);
      return;
    }
    if (fxpLoading) return;
    fxpLoading = true;
    import('fast-xml-parser')
      .then((mod) => {
        fxpModule = mod;
        setLibReady(true);
      })
      .catch(() => setLibReady(true)); // Degrade gracefully — result memo handles missing lib
  }, []);

  const result = useMemo(() => {
    if (!libReady || !fxpModule) return { output: 'Loading XML library...', error: '' };
    if (!input.trim()) return { output: '', error: '' };

    try {
      if (mode === 'json-to-xml') {
        const parsed = JSON.parse(input);
        const builder = new fxpModule.XMLBuilder({
          ignoreAttributes: false,
          format: true,
          indentBy: ' '.repeat(indentSize),
          suppressEmptyNode: false,
          attributeNamePrefix: '@_',
        });
        const xml = builder.build(parsed);
        return { output: `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, error: '' };
      } else {
        const parser = new fxpModule.XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          allowBooleanAttributes: true,
          parseTagValue: true,
          parseAttributeValue: true,
          trimValues: true,
        });
        const parsed = parser.parse(input);
        const json = JSON.stringify(parsed, null, indentSize);
        return { output: json, error: '' };
      }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Conversion failed' };
    }
  }, [input, mode, indentSize, libReady]);

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

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const newMode = m === 'json-to-xml' ? 'xml-to-json' : 'json-to-xml';
      setInput(newMode === 'json-to-xml' ? SAMPLE_JSON : SAMPLE_XML);
      return newMode;
    });
  }, []);

  const inputLabel = mode === 'json-to-xml' ? 'JSON Input' : 'XML Input';
  const outputLabel = mode === 'json-to-xml' ? 'XML Output' : 'JSON Output';

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toggleMode}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors duration-150"
          aria-label={`Switch to ${mode === 'json-to-xml' ? 'XML to JSON' : 'JSON to XML'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'json-to-xml' ? 'JSON → XML' : 'XML → JSON'}
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
          <label htmlFor="xml-input" className="block text-sm font-semibold text-neutral-700">
            {inputLabel}
          </label>
          <textarea
            id="xml-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'json-to-xml' ? 'Paste JSON here...' : 'Paste XML here...'}
            className="w-full h-80 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
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
            id="xml-output"
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
        <strong className="text-neutral-700">Attribute convention:</strong> XML attributes are represented as <code className="font-mono text-primary-600">@_attributeName</code> in JSON.
        For example, <code className="font-mono text-primary-600">&lt;user id="1"&gt;</code> becomes <code className="font-mono text-primary-600">{`{"@_id": "1"}`}</code>.
      </div>
    </div>
  );
}
