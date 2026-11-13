/**
 * Base64 Encode/Decode: text or files to Base64, and Base64 back to text or
 * to the original binary file (src/lib/dev-tools/base64.ts). Zero
 * dependencies, no server upload.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Copy, Check, ArrowLeftRight, Download, FileText, Type, File, AlertCircle } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { safely } from '../../lib/dev-tools/safe-compute';
import { decodeBase64, encodeBase64, encodeText, classifyBytes, extensionFor, hexPreview } from '../../lib/dev-tools/base64';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';

type Direction = 'encode' | 'decode';
type InputMode = 'text' | 'file';

interface LoadedFile {
  name: string;
  /** Raw bytes (encode mode). */
  bytes?: Uint8Array;
  /** File contents as text (decode mode: the Base64 to decode). */
  text?: string;
}

type Output =
  | { kind: 'none' }
  | { kind: 'text'; text: string; filename: string }
  | { kind: 'binary'; bytes: Uint8Array; filename: string; mime: string; label: string; reason: string }
  | { kind: 'error'; message: string };

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFile(file: File, as: 'bytes' | 'text'): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      if (as === 'bytes') resolve({ name: file.name, bytes: new Uint8Array(reader.result as ArrayBuffer) });
      else resolve({ name: file.name, text: reader.result as string });
    };
    if (as === 'bytes') reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}

const PREVIEWABLE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon']);

export default function Base64EncodeDecode() {
  const [direction, setDirection] = useState<Direction>('encode');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [input, setInput] = useState('');
  const [lineWrap, setLineWrap] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();

  const output = useMemo<Output>(() => safely<Output>(() => {
    const encodeOpts = { urlSafe, wrapAt: lineWrap ? 76 : 0 };
    if (direction === 'encode') {
      if (inputMode === 'file') {
        if (!file?.bytes) return { kind: 'none' };
        return { kind: 'text', text: encodeBase64(file.bytes, encodeOpts), filename: `${file.name}.b64.txt` };
      }
      if (!input) return { kind: 'none' };
      return { kind: 'text', text: encodeText(input, encodeOpts), filename: 'encoded.txt' };
    }
    const source = inputMode === 'file' ? file?.text ?? '' : input;
    if (!source.trim()) return { kind: 'none' };
    const decoded = decodeBase64(source);
    if (!decoded.ok) return { kind: 'error', message: decoded.error };
    const c = classifyBytes(decoded.bytes);
    if (c.kind === 'text') return { kind: 'text', text: c.text, filename: 'decoded.txt' };
    const ext = extensionFor(c.type, decoded.mime);
    return {
      kind: 'binary',
      bytes: decoded.bytes,
      filename: `decoded.${ext}`,
      mime: c.type?.mime ?? decoded.mime ?? 'application/octet-stream',
      label: c.type?.label ?? (decoded.mime ? `${decoded.mime} data` : 'Binary data'),
      reason: c.reason,
    };
  }, (message) => ({ kind: 'error', message })), [direction, inputMode, input, file, lineWrap, urlSafe]);

  // Image preview for decoded binary images (blob: URLs are allowed by the site CSP).
  useEffect(() => {
    if (output.kind !== 'binary' || !PREVIEWABLE.has(output.mime)) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(new Blob([output.bytes as BlobPart], { type: output.mime }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  const stats = useMemo(() => {
    if (inputMode === 'file' || output.kind !== 'text') return null;
    return safely(
      () => {
        const inputSize = new Blob([input]).size;
        const outputSize = new Blob([output.text]).size;
        const ratio = inputSize > 0 ? ((outputSize / inputSize) * 100).toFixed(0) : '0';
        return { inputSize, outputSize, ratio };
      },
      () => null,
    );
  }, [input, output, inputMode]);

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setFileError('');
      try {
        setFile(await readFile(f, direction === 'encode' ? 'bytes' : 'text'));
      } catch {
        setFile(null);
        setFileError(`Could not read "${f.name}". Try choosing the file again.`);
      }
    },
    [direction],
  );

  const handleDownload = useCallback(() => {
    if (output.kind !== 'text' && output.kind !== 'binary') return;
    const blob =
      output.kind === 'text'
        ? new Blob([output.text], { type: 'text/plain;charset=utf-8' })
        : new Blob([output.bytes as BlobPart], { type: output.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = output.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  // Swap direction and carry a text result across, instead of clearing the input (DEVTOOLS-13).
  const toggleDirection = useCallback(() => {
    if (inputMode === 'text' && output.kind === 'text') setInput(output.text.replace(/\n/g, ''));
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
    setFile(null);
    setFileError('');
  }, [inputMode, output]);

  const errorMessage = fileError || (output.kind === 'error' ? output.message : '');

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Direction toggle */}
        <button
          type="button"
          onClick={toggleDirection}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors duration-150"
          aria-label={`Switch to ${direction === 'encode' ? 'decode' : 'encode'} mode`}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {direction === 'encode' ? 'Encode' : 'Decode'}
        </button>

        {/* Input mode toggle */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden" role="group" aria-label="Input type">
          <button
            type="button"
            onClick={() => { setInputMode('text'); setFile(null); setFileError(''); }}
            className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              inputMode === 'text' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={inputMode === 'text'}
          >
            <Type size={14} aria-hidden="true" />
            Text
          </button>
          <button
            type="button"
            onClick={() => { setInputMode('file'); setInput(''); }}
            className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              inputMode === 'file' ? 'bg-primary-50 text-primary-700' : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            aria-pressed={inputMode === 'file'}
          >
            <File size={14} aria-hidden="true" />
            File
          </button>
        </div>

        {direction === 'encode' && (
          <>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lineWrap}
                onChange={(e) => setLineWrap(e.target.checked)}
                className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Wrap lines (76 chars)
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              URL-safe (- and _, no padding)
            </label>
          </>
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
              placeholder={direction === 'encode' ? 'Type or paste text here...' : 'Paste Base64, URL-safe Base64 or a data: URL here...'}
              className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y"
              spellCheck={false}
            />
          ) : (
            <div className="space-y-2">
              <FileDropZone
                accept={direction === 'encode' ? '*/*' : '.txt,.text,.b64,.base64,text/plain,application/base64'}
                acceptLabel={direction === 'encode' ? 'Any file type' : 'A .txt, .b64 or .base64 file containing Base64'}
                onFiles={handleFileUpload}
                maxSizeMB={10}
              />
              {file && (
                <p className="text-sm text-neutral-600">
                  <FileText size={14} className="inline mr-1" aria-hidden="true" />
                  {file.name}
                  {file.bytes && <span className="text-neutral-500"> ({formatBytes(file.bytes.length)})</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {output.kind === 'binary' ? (
              <p className="text-sm font-semibold text-neutral-700">Decoded File</p>
            ) : (
              <label htmlFor="base64-output" className="block text-sm font-semibold text-neutral-700">
                {direction === 'encode' ? 'Base64 Output' : 'Decoded Text'}
              </label>
            )}
            <div className="flex gap-2">
              {output.kind === 'text' && (
                <button
                  type="button"
                  onClick={() => copy(output.text)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                >
                  {copiedKey ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copiedKey ? 'Copied' : failedKey ? 'Copy failed' : 'Copy'}
                </button>
              )}
              {(output.kind === 'text' || output.kind === 'binary') && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                >
                  <Download size={14} aria-hidden="true" />
                  {output.kind === 'binary' ? `Download ${output.filename}` : 'Download'}
                </button>
              )}
            </div>
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>

          {output.kind === 'binary' ? (
            <div className="h-64 overflow-auto p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-700 space-y-3">
              <p>
                <strong className="text-neutral-900">{output.label}</strong>, {formatBytes(output.bytes.length)}.{' '}
                {output.reason === 'known-type'
                  ? 'This is a binary file, so it is offered as a download instead of being shown as text.'
                  : 'These bytes are not readable text, so they are offered as a download instead of being shown as garbled characters.'}
              </p>
              {previewUrl && (
                <img src={previewUrl} alt="Preview of the decoded image" className="max-h-24 max-w-full rounded border border-neutral-200 bg-white" />
              )}
              <p className="font-mono text-xs text-neutral-600 break-all">
                <span className="text-neutral-500">First bytes: </span>
                <span className="tabular-nums">{hexPreview(output.bytes)}</span>
              </p>
            </div>
          ) : (
            <textarea
              id="base64-output"
              readOnly
              value={output.kind === 'text' ? output.text : ''}
              placeholder="Output will appear here..."
              className="w-full h-64 p-4 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 resize-y"
            />
          )}
          {errorMessage && (
            <p className="flex items-start gap-2 text-sm text-red-700 font-medium" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (stats.inputSize > 0 || stats.outputSize > 0) && (
        <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600">
          <span>Input: <strong className="text-neutral-900 tabular-nums">{formatBytes(stats.inputSize)}</strong></span>
          <span>Output: <strong className="text-neutral-900 tabular-nums">{formatBytes(stats.outputSize)}</strong></span>
          <span>Ratio: <strong className="text-neutral-900 tabular-nums">{stats.ratio}%</strong></span>
        </div>
      )}
    </div>
  );
}
