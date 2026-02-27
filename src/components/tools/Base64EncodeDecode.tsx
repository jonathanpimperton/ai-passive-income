/**
 * Base64 Encode/Decode — encode text/files to Base64 or decode Base64 to text/files.
 * Uses native btoa/atob with Unicode-safe wrappers. Zero dependencies.
 */
import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, ArrowLeftRight, Download, FileText, Type, File } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { utf8ToBase64, base64ToUtf8, wrapLines, cleanBase64 } from '../../lib/converter-utils';

type Direction = 'encode' | 'decode';
type InputMode = 'text' | 'file';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Base64EncodeDecode() {
  const [direction, setDirection] = useState<Direction>('encode');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [input, setInput] = useState('');
  const [lineWrap, setLineWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileResult, setFileResult] = useState<string>('');
  const [fileName, setFileName] = useState('');

  const result = useMemo(() => {
    if (inputMode === 'file') return { output: fileResult, error: '' };
    if (!input.trim()) return { output: '', error: '' };

    try {
      if (direction === 'encode') {
        const encoded = utf8ToBase64(input);
        return { output: lineWrap ? wrapLines(encoded, 76) : encoded, error: '' };
      } else {
        const cleaned = cleanBase64(input);
        return { output: base64ToUtf8(cleaned), error: '' };
      }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Conversion failed' };
    }
  }, [input, direction, lineWrap, inputMode, fileResult]);

  const stats = useMemo(() => {
    if (inputMode === 'file') return null;
    const inputSize = new Blob([input]).size;
    const outputSize = result.output ? new Blob([result.output]).size : 0;
    const ratio = inputSize > 0 ? ((outputSize / inputSize) * 100).toFixed(0) : '0';
    return { inputSize, outputSize, ratio };
  }, [input, result.output, inputMode]);

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

  const handleFileUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onerror = () => setFileResult('');

    if (direction === 'encode') {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        setFileResult(lineWrap ? wrapLines(base64, 76) : base64);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const cleaned = cleanBase64(text);
          const decoded = base64ToUtf8(cleaned);
          setFileResult(decoded);
        } catch {
          setFileResult('');
        }
      };
      reader.readAsText(file);
    }
  }, [direction, lineWrap]);

  const handleDownloadDecoded = useCallback(() => {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = direction === 'encode' ? 'encoded.txt' : 'decoded.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [result.output, direction]);

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
    setInput('');
    setFileResult('');
    setFileName('');
  }, []);

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Direction toggle */}
        <button
          onClick={toggleDirection}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors duration-150"
          aria-label={`Switch to ${direction === 'encode' ? 'decode' : 'encode'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {direction === 'encode' ? 'Encode' : 'Decode'}
        </button>

        {/* Input mode toggle */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
          <button
            onClick={() => { setInputMode('text'); setFileResult(''); setFileName(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              inputMode === 'text' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={inputMode === 'text'}
          >
            <Type size={14} aria-hidden="true" />
            Text
          </button>
          <button
            onClick={() => { setInputMode('file'); setInput(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              inputMode === 'file' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={inputMode === 'file'}
          >
            <File size={14} aria-hidden="true" />
            File
          </button>
        </div>

        {/* Line wrap (encode only) */}
        {direction === 'encode' && (
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={lineWrap}
              onChange={(e) => setLineWrap(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Wrap lines (76 chars)
          </label>
        )}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="base64-input" className="block text-sm font-semibold text-neutral-700">
            {direction === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
          </label>
          {inputMode === 'text' ? (
            <textarea
              id="base64-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={direction === 'encode' ? 'Type or paste text here...' : 'Paste Base64 string here...'}
              className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
              spellCheck={false}
            />
          ) : (
            <div className="space-y-2">
              <FileDropZone
                accept={direction === 'encode' ? '*/*' : '.txt,.b64'}
                acceptLabel={direction === 'encode' ? 'Any file type' : 'Text or .b64 files'}
                onFiles={handleFileUpload}
                maxSizeMB={10}
              />
              {fileName && (
                <p className="text-sm text-neutral-600">
                  <FileText size={14} className="inline mr-1" aria-hidden="true" />
                  {fileName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="base64-output" className="block text-sm font-semibold text-neutral-700">
              {direction === 'encode' ? 'Base64 Output' : 'Decoded Text'}
            </label>
            <div className="flex gap-2">
              {result.output && (
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
                    onClick={handleDownloadDecoded}
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
            id="base64-output"
            readOnly
            value={result.error ? '' : result.output}
            placeholder="Output will appear here..."
            className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 resize-y"
            aria-live="polite"
          />
          {result.error && (
            <p className="text-sm text-negative-600 font-medium" role="alert">{result.error}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (stats.inputSize > 0 || stats.outputSize > 0) && (
        <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600">
          <span>Input: <strong className="text-neutral-900">{formatBytes(stats.inputSize)}</strong></span>
          <span>Output: <strong className="text-neutral-900">{formatBytes(stats.outputSize)}</strong></span>
          <span>Ratio: <strong className="text-neutral-900">{stats.ratio}%</strong></span>
        </div>
      )}
    </div>
  );
}
