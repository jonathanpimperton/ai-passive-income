import { useState, useEffect, useCallback, useRef } from 'react';
import * as QRCode from 'qrcode';
import { Download, Image, FileCode, RotateCcw, Link, Type, AlertCircle, QrCode, Hash } from 'lucide-react';

/* ── Error Correction Levels ──────────────────────────────── */
const ERROR_CORRECTION_LEVELS = [
  { label: 'Low (7%)', value: 'L' as const, description: 'Best for clean environments' },
  { label: 'Medium (15%)', value: 'M' as const, description: 'Default — good balance' },
  { label: 'Quartile (25%)', value: 'Q' as const, description: 'Higher reliability' },
  { label: 'High (30%)', value: 'H' as const, description: 'Best for printed codes' },
] as const;

/* ── Size Options ─────────────────────────────────────────── */
const SIZE_OPTIONS = [
  { label: 'Small', value: 128, description: '128 x 128 px' },
  { label: 'Medium', value: 256, description: '256 x 256 px' },
  { label: 'Large', value: 512, description: '512 x 512 px' },
] as const;

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/* ── Main Component ───────────────────────────────────────── */
export default function QrCodeGenerator() {
  const [text, setText] = useState('https://www.calcrun.com');
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>('M');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Generate QR Code ────────────────────────────────────── */
  const generateQrCode = useCallback(async (input: string, qrSize: number, ecLevel: ErrorCorrectionLevel) => {
    if (!input.trim()) {
      setDataUrl('');
      setSvgString('');
      setError('');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const options = {
        errorCorrectionLevel: ecLevel,
        margin: 2,
        width: qrSize,
        color: {
          dark: '#0F1B2D',
          light: '#FFFFFF',
        },
      };

      const [pngUrl, svg] = await Promise.all([
        QRCode.toDataURL(input, options),
        QRCode.toString(input, { ...options, type: 'svg' }),
      ]);

      setDataUrl(pngUrl);
      setSvgString(svg);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(message);
      setDataUrl('');
      setSvgString('');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /* ── Debounced generation on input changes ───────────────── */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      generateQrCode(text, size, errorCorrection);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, size, errorCorrection, generateQrCode]);

  /* ── Download PNG ────────────────────────────────────────── */
  const downloadPng = useCallback(() => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-${size}x${size}.png`;
    link.href = dataUrl;
    link.click();
  }, [dataUrl, size]);

  /* ── Download SVG ────────────────────────────────────────── */
  const downloadSvg = useCallback(() => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qrcode-${size}x${size}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgString, size]);

  /* ── Reset ───────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setText('https://www.calcrun.com');
    setSize(256);
    setErrorCorrection('M');
  }, []);

  const hasContent = text.trim().length > 0;
  const charCount = text.length;
  const isUrl = /^https?:\/\//i.test(text.trim());

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">

        {/* ── Input Panel ───────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Input</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            {/* Text / URL Input */}
            <div>
              <label htmlFor="qr-text" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Text or URL
              </label>
              <div className="relative">
                <textarea
                  id="qr-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={2953}
                  placeholder="Enter a URL, text, or any data..."
                  className="w-full rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                    p-3 resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5">
                  {isUrl ? (
                    <Link size={12} className="text-primary-600" aria-hidden="true" />
                  ) : (
                    <Type size={12} className="text-neutral-400" aria-hidden="true" />
                  )}
                  <span className="text-xs text-neutral-400">
                    {isUrl ? 'URL detected' : 'Plain text'}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {charCount.toLocaleString()} / 2,953
                </span>
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <label id="qr-size-label" className="block text-sm font-medium text-neutral-700 mb-2">
                Size
              </label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="qr-size-label">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSize(opt.value)}
                    className={`flex flex-col items-center gap-0.5 p-3 rounded-lg border text-sm transition-all duration-150
                      ${size === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    aria-pressed={size === opt.value}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Correction Level */}
            <div>
              <label htmlFor="qr-ec" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Error Correction
              </label>
              <select
                id="qr-ec"
                value={errorCorrection}
                onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                {ERROR_CORRECTION_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Higher correction allows the code to be read even if partially damaged or obscured.
              </p>
            </div>
          </div>
        </div>

        {/* ── Preview Panel ─────────────────────────────── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Preview</p>
            <p className="text-lg font-semibold text-primary-900">
              {hasContent ? `${size} x ${size} px QR Code` : 'Enter text to generate'}
            </p>
            <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">
              Error correction: {ERROR_CORRECTION_LEVELS.find((l) => l.value === errorCorrection)?.label}
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex items-center justify-center mb-6">
            <div className={`bg-white rounded-xl border border-neutral-200/80 p-6 inline-flex items-center justify-center
              transition-all duration-200 ${isGenerating ? 'opacity-50' : 'opacity-100'}`}
              style={{ minWidth: Math.min(size + 48, 320), minHeight: Math.min(size + 48, 320) }}
            >
              {error ? (
                <div className="flex flex-col items-center gap-3 text-center p-4" role="alert">
                  <div className="w-12 h-12 rounded-full bg-negative-100 flex items-center justify-center">
                    <AlertCircle size={24} className="text-negative-500" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 mb-1">Generation Error</p>
                    <p className="text-xs text-neutral-500 leading-relaxed">{error}</p>
                  </div>
                </div>
              ) : dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR code for: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`}
                  width={Math.min(size, 280)}
                  height={Math.min(size, 280)}
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-4">
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Image size={28} className="text-neutral-300" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-neutral-400">Your QR code will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadPng}
              disabled={!dataUrl}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700
                disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
            >
              <Download size={16} aria-hidden="true" />
              Download PNG
            </button>
            <button
              onClick={downloadSvg}
              disabled={!svgString}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                border border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100
                disabled:border-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
            >
              <FileCode size={16} aria-hidden="true" />
              Download SVG
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <QrCode size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Format</p>
                <p className="text-sm font-semibold text-neutral-900">
                  QR Code (ISO 18004)
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Hash size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Data Length</p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {charCount.toLocaleString()} character{charCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 p-4 bg-accent-100/50 rounded-xl border border-accent-500/10">
            <p className="text-xs text-accent-700 leading-relaxed">
              <strong>Privacy:</strong> QR codes are generated entirely in your browser. No data is sent to any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
