/**
 * URL Encode/Decode — encode and decode URL components using native browser APIs.
 * Zero dependencies. Supports both encodeURIComponent and encodeURI modes.
 */
import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, ArrowLeftRight } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';

type Direction = 'encode' | 'decode';
type EncodeMode = 'component' | 'full';

export default function UrlEncodeDecode() {
  const [direction, setDirection] = useState<Direction>('encode');
  const [encodeMode, setEncodeMode] = useState<EncodeMode>('component');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };

    try {
      if (direction === 'encode') {
        const encoded = encodeMode === 'component'
          ? encodeURIComponent(input)
          : encodeURI(input);
        return { output: encoded, error: '' };
      } else {
        const decoded = encodeMode === 'component'
          ? decodeURIComponent(input)
          : decodeURI(input);
        return { output: decoded, error: '' };
      }
    } catch (e) {
      return {
        output: '',
        error: e instanceof Error ? e.message : 'Conversion failed — check for malformed URL encoding',
      };
    }
  }, [input, direction, encodeMode]);

  const stats = useMemo(() => {
    const inputLen = input.length;
    const outputLen = result.output.length;
    const encodedChars = direction === 'encode' && result.output
      ? (result.output.match(/%[0-9A-F]{2}/gi) || []).length
      : 0;
    return { inputLen, outputLen, encodedChars };
  }, [input, result.output, direction]);

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

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
    setInput('');
  }, []);

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Direction toggle */}
        <button
          onClick={toggleDirection}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors duration-150"
          aria-label={`Switch to ${direction === 'encode' ? 'decode' : 'encode'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {direction === 'encode' ? 'Encode' : 'Decode'}
        </button>

        {/* Encode mode selector */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
          <button
            onClick={() => setEncodeMode('component')}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              encodeMode === 'component' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={encodeMode === 'component'}
            title="Encodes all special characters including : / ? # @ etc."
          >
            Component
          </button>
          <button
            onClick={() => setEncodeMode('full')}
            className={`px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              encodeMode === 'full' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={encodeMode === 'full'}
            title="Preserves URL structure characters like : / ? # @"
          >
            Full URI
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          {encodeMode === 'component'
            ? 'Encodes everything — use for query parameters and values'
            : 'Preserves URL structure (://?#@) — use for full URLs'}
        </p>
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="url-input" className="block text-sm font-semibold text-neutral-700">
            {direction === 'encode' ? 'Text to Encode' : 'URL-Encoded Text to Decode'}
          </label>
          <textarea
            id="url-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === 'encode'
                ? 'Type or paste text to URL-encode...\ne.g. hello world, a=1&b=2, café'
                : 'Paste URL-encoded text...\ne.g. hello%20world, a%3D1%26b%3D2'
            }
            className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="url-output" className="block text-sm font-semibold text-neutral-700">
              {direction === 'encode' ? 'URL-Encoded Output' : 'Decoded Text'}
            </label>
            {result.output && (
              <button
                onClick={() => handleCopy(result.output)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                aria-label="Copy output"
              >
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            id="url-output"
            readOnly
            value={result.error ? '' : result.output}
            placeholder="Output will appear here..."
            className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-900 placeholder:text-neutral-500 resize-y"
            aria-live="polite"
          />
          {result.error && (
            <p className="text-sm text-negative-600 font-medium" role="alert">{result.error}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {(stats.inputLen > 0 || stats.outputLen > 0) && (
        <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600">
          <span>Input: <strong className="text-neutral-900">{stats.inputLen} chars</strong></span>
          <span>Output: <strong className="text-neutral-900">{stats.outputLen} chars</strong></span>
          {direction === 'encode' && stats.encodedChars > 0 && (
            <span>Encoded: <strong className="text-neutral-900">{stats.encodedChars} characters</strong></span>
          )}
        </div>
      )}

      {/* Quick reference */}
      <details className="rounded-xl border border-neutral-200 bg-white">
        <summary className="px-4 py-3 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-50 transition-colors duration-150">
          Common URL Encodings Reference
        </summary>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-mono">
            {[
              ['Space', '%20'],
              ['!', '%21'],
              ['#', '%23'],
              ['$', '%24'],
              ['&', '%26'],
              ['+', '%2B'],
              ['/', '%2F'],
              [':', '%3A'],
              ['=', '%3D'],
              ['?', '%3F'],
              ['@', '%40'],
              ['%', '%25'],
            ].map(([char, code]) => (
              <div key={code} className="flex items-center gap-2 px-2 py-1 rounded bg-neutral-50">
                <span className="text-primary-600 font-semibold">{char}</span>
                <span className="text-neutral-500">→</span>
                <span className="text-neutral-700">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
