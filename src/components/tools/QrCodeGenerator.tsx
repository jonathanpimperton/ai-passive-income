import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as QRCode from 'qrcode';
import { Download, Image, FileCode, RotateCcw, Link, Type, AlertCircle, QrCode, Hash, Wifi, Contact, Mail, MessageSquare } from 'lucide-react';
import {
  buildWifi, wifiProblems, buildVcard, vcardProblems, buildEmail, emailProblems, buildSms, smsProblems,
  BYTE_CAPACITY, utf8Length, capacityMessage, pngScale,
  type QrMode, type ErrorCorrection, type WifiFields, type VcardFields, type EmailFields, type SmsFields,
} from '../../lib/dev-tools/qr-payloads';

/* Error Correction Levels */
const ERROR_CORRECTION_LEVELS = [
  { label: 'Low (7%)', short: 'Low', value: 'L' as const, description: 'Best for clean environments' },
  { label: 'Medium (15%)', short: 'Medium', value: 'M' as const, description: 'Default, a good balance' },
  { label: 'Quartile (25%)', short: 'Quartile', value: 'Q' as const, description: 'Higher reliability' },
  { label: 'High (30%)', short: 'High', value: 'H' as const, description: 'Best for printed codes' },
] as const;

/* Size Options (target sizes; dense codes are enlarged so every module stays readable) */
const SIZE_OPTIONS = [
  { label: 'Small', value: 128 },
  { label: 'Medium', value: 256 },
  { label: 'Large', value: 512 },
] as const;

const MODES: { key: QrMode; label: string; icon: typeof Type }[] = [
  { key: 'text', label: 'Text / URL', icon: Type },
  { key: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { key: 'vcard', label: 'Contact', icon: Contact },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
];

const MARGIN = 2;
const DEFAULT_TEXT = 'https://www.calcrun.com';

const inputClass =
  'w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base sm:text-sm px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/* Main Component */
export default function QrCodeGenerator() {
  const [mode, setMode] = useState<QrMode>('text');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [wifi, setWifi] = useState<WifiFields>({ ssid: '', password: '', security: 'WPA', hidden: false });
  const [vcard, setVcard] = useState<VcardFields>({ firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '' });
  const [email, setEmail] = useState<EmailFields>({ to: '', subject: '', body: '' });
  const [sms, setSms] = useState<SmsFields>({ phone: '', message: '' });
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrection>('M');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [actualSize, setActualSize] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Build the payload a phone will read for the chosen mode */
  const { payload, problems } = useMemo(() => {
    switch (mode) {
      case 'wifi':
        return { payload: buildWifi(wifi), problems: wifiProblems(wifi) };
      case 'vcard':
        return { payload: buildVcard(vcard), problems: vcardProblems(vcard) };
      case 'email':
        return { payload: buildEmail(email), problems: emailProblems(email) };
      case 'sms':
        return { payload: buildSms(sms), problems: smsProblems(sms) };
      default:
        return { payload: text, problems: [] as string[] };
    }
  }, [mode, text, wifi, vcard, email, sms]);

  const bytes = utf8Length(payload);
  const ecInfo = ERROR_CORRECTION_LEVELS.find((l) => l.value === errorCorrection)!;
  const capacityError = capacityMessage(bytes, errorCorrection, ecInfo.short);
  const ready = payload.trim().length > 0 && problems.length === 0 && !capacityError;

  /* Generate QR Code */
  const generateQrCode = useCallback(async (input: string, target: number, ecLevel: ErrorCorrection) => {
    setIsGenerating(true);
    setError('');
    try {
      const symbol = QRCode.create(input, { errorCorrectionLevel: ecLevel });
      const { scale, size: px, enlarged: grew } = pngScale(symbol.modules.size, MARGIN, target);
      const options = {
        errorCorrectionLevel: ecLevel,
        margin: MARGIN,
        scale,
        color: { dark: '#0F1B2D', light: '#FFFFFF' },
      };
      const [pngUrl, svg] = await Promise.all([
        QRCode.toDataURL(input, options),
        QRCode.toString(input, { ...options, type: 'svg', width: px }),
      ]);
      setDataUrl(pngUrl);
      setSvgString(svg);
      setActualSize(px);
      setEnlarged(grew);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(/too big|amount of data/i.test(message) ? 'This content is too large for a QR code. Shorten it or lower the error correction.' : message);
      setDataUrl('');
      setSvgString('');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /* Debounced generation on input changes */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!ready) {
      setDataUrl('');
      setSvgString('');
      setError('');
      return undefined;
    }
    debounceRef.current = setTimeout(() => {
      generateQrCode(payload, size, errorCorrection);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [payload, ready, size, errorCorrection, generateQrCode]);

  /* Downloads are named with the real pixel size */
  const downloadPng = useCallback(() => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-${actualSize}x${actualSize}.png`;
    link.href = dataUrl;
    link.click();
  }, [dataUrl, actualSize]);

  const downloadSvg = useCallback(() => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcode.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgString]);

  /* Reset */
  const handleReset = useCallback(() => {
    setMode('text');
    setText(DEFAULT_TEXT);
    setWifi({ ssid: '', password: '', security: 'WPA', hidden: false });
    setVcard({ firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '' });
    setEmail({ to: '', subject: '', body: '' });
    setSms({ phone: '', message: '' });
    setSize(256);
    setErrorCorrection('M');
  }, []);

  const isUrl = /^https?:\/\//i.test(text.trim());
  const limit = BYTE_CAPACITY[errorCorrection];
  // Before anything is typed in a structured mode, show the placeholder rather than a list of problems.
  const untouched =
    mode === 'text' ? !text.trim()
    : mode === 'wifi' ? !wifi.ssid && !wifi.password
    : mode === 'vcard' ? Object.values(vcard).every((v) => !v.trim())
    : mode === 'email' ? !email.to && !email.subject && !email.body
    : !sms.phone && !sms.message;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">

        {/* Input Panel */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Input</h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 min-h-[40px] px-3 -mr-3 text-sm text-neutral-500 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
              aria-label="Reset to defaults"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </button>
          </div>

          {/* Content type */}
          <div className="mb-5">
            <p id="qr-mode-label" className="block text-sm font-medium text-neutral-700 mb-2">What should the code do?</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2" role="group" aria-labelledby="qr-mode-label">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    aria-pressed={mode === m.key}
                    className={`flex flex-col items-center gap-1 min-h-[56px] p-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
                      mode === m.key
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            {mode === 'text' && (
              <div>
                <label htmlFor="qr-text" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Text or URL
                </label>
                <textarea
                  id="qr-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Enter a URL, text, or any data..."
                  className="w-full rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base sm:text-sm
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                    p-3 resize-none leading-relaxed"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isUrl ? <Link size={12} className="text-primary-600" aria-hidden="true" /> : <Type size={12} className="text-neutral-500" aria-hidden="true" />}
                  <span className="text-xs text-neutral-500">{isUrl ? 'URL detected' : 'Plain text'}</span>
                </div>
              </div>
            )}

            {mode === 'wifi' && (
              <>
                <Field id="qr-wifi-ssid" label="Network name (SSID)">
                  <input id="qr-wifi-ssid" type="text" className={inputClass} value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-wifi-security" label="Security">
                  <select id="qr-wifi-security" className={inputClass} value={wifi.security} onChange={(e) => setWifi({ ...wifi, security: e.target.value as WifiFields['security'] })}>
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP (old)</option>
                    <option value="nopass">No password (open network)</option>
                  </select>
                </Field>
                {wifi.security !== 'nopass' && (
                  <Field id="qr-wifi-password" label="Password">
                    <input id="qr-wifi-password" type="text" className={inputClass} value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} autoComplete="off" spellCheck={false} />
                  </Field>
                )}
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
                  <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20" />
                  Hidden network
                </label>
              </>
            )}

            {mode === 'vcard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="qr-vc-first" label="First name">
                  <input id="qr-vc-first" type="text" className={inputClass} value={vcard.firstName} onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-vc-last" label="Last name">
                  <input id="qr-vc-last" type="text" className={inputClass} value={vcard.lastName} onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-vc-org" label="Organisation">
                  <input id="qr-vc-org" type="text" className={inputClass} value={vcard.organization} onChange={(e) => setVcard({ ...vcard, organization: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-vc-title" label="Job title">
                  <input id="qr-vc-title" type="text" className={inputClass} value={vcard.title} onChange={(e) => setVcard({ ...vcard, title: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-vc-phone" label="Phone">
                  <input id="qr-vc-phone" type="tel" className={inputClass} value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-vc-email" label="Email">
                  <input id="qr-vc-email" type="email" className={inputClass} value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} autoComplete="off" />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="qr-vc-web" label="Website">
                    <input id="qr-vc-web" type="url" className={inputClass} value={vcard.website} onChange={(e) => setVcard({ ...vcard, website: e.target.value })} autoComplete="off" />
                  </Field>
                </div>
              </div>
            )}

            {mode === 'email' && (
              <>
                <Field id="qr-email-to" label="Send to">
                  <input id="qr-email-to" type="email" className={inputClass} value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-email-subject" label="Subject (optional)">
                  <input id="qr-email-subject" type="text" className={inputClass} value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-email-body" label="Message (optional)">
                  <textarea id="qr-email-body" rows={3} className={`${inputClass} h-auto py-2 resize-none`} value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} />
                </Field>
              </>
            )}

            {mode === 'sms' && (
              <>
                <Field id="qr-sms-phone" label="Phone number">
                  <input id="qr-sms-phone" type="tel" className={inputClass} value={sms.phone} onChange={(e) => setSms({ ...sms, phone: e.target.value })} autoComplete="off" />
                </Field>
                <Field id="qr-sms-message" label="Message (optional)">
                  <textarea id="qr-sms-message" rows={3} className={`${inputClass} h-auto py-2 resize-none`} value={sms.message} onChange={(e) => setSms({ ...sms, message: e.target.value })} />
                </Field>
              </>
            )}

            {/* Capacity */}
            <p className={`text-xs tabular-nums ${capacityError ? 'text-red-700' : 'text-neutral-500'}`}>
              {bytes.toLocaleString('en-US')} / {limit.toLocaleString('en-US')} bytes at {ecInfo.short} error correction
            </p>

            {/* Size Selector */}
            <div>
              <p id="qr-size-label" className="block text-sm font-medium text-neutral-700 mb-2">
                Size
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="qr-size-label">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSize(opt.value)}
                    className={`flex flex-col items-center gap-0.5 p-3 rounded-lg border text-sm transition-all duration-150
                      ${size === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    aria-pressed={size === opt.value}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs opacity-70 tabular-nums">about {opt.value} px</span>
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
                onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrection)}
                className={inputClass}
              >
                {ERROR_CORRECTION_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}: {opt.description} (up to {BYTE_CAPACITY[opt.value].toLocaleString('en-US')} bytes)
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Higher correction allows the code to be read even if partially damaged or obscured, but holds less data.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="p-6 lg:p-8 bg-neutral-50/50">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Preview</p>
            <p className="text-lg font-semibold text-primary-900 tabular-nums" aria-live="polite">
              {dataUrl ? `${actualSize} x ${actualSize} px QR code` : ready ? 'Generating...' : 'Fill in the details to generate a code'}
            </p>
            <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">
              Error correction: {ecInfo.label}
            </p>
            {dataUrl && enlarged && (
              <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                Enlarged from about {size} px so each square is big enough for phone cameras to read.
              </p>
            )}
          </div>

          {/* QR Code Display */}
          <div className="flex items-center justify-center mb-6">
            <div className={`bg-white rounded-xl border border-neutral-200/80 p-6 inline-flex items-center justify-center min-w-[240px] min-h-[240px]
              transition-all duration-200 ${isGenerating ? 'opacity-50' : 'opacity-100'}`}
            >
              {error || capacityError || (!untouched && problems.length > 0) ? (
                <div className="flex flex-col items-center gap-3 text-center p-4 max-w-xs" role="alert">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 mb-1">{error || capacityError ? 'Cannot make this code' : 'A few details are missing'}</p>
                    <p className="text-xs text-neutral-600 leading-relaxed">{error || capacityError || problems.join(' ')}</p>
                  </div>
                </div>
              ) : dataUrl ? (
                <img
                  src={dataUrl}
                  alt={mode === 'text' ? `QR code for: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}` : `QR code (${MODES.find((m) => m.key === mode)?.label})`}
                  width={Math.min(actualSize, 280)}
                  height={Math.min(actualSize, 280)}
                  className="[image-rendering:pixelated]"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-4">
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Image size={28} className="text-neutral-300" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-neutral-500">Your QR code will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={downloadPng}
              disabled={!dataUrl}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700
                disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              <Download size={16} aria-hidden="true" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              disabled={!svgString}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm
                transition-all duration-150
                border border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100
                disabled:border-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              <FileCode size={16} aria-hidden="true" />
              Download SVG
            </button>
          </div>

          {/* What the code contains */}
          {mode !== 'text' && payload && problems.length === 0 && (
            <details className="mt-6 rounded-xl border border-neutral-200/80 bg-white">
              <summary className="px-4 py-3 min-h-[44px] text-sm font-medium text-neutral-700 cursor-pointer">What the code contains</summary>
              <pre className="px-4 pb-4 text-xs font-mono text-neutral-700 whitespace-pre-wrap break-all">{payload.replace(/\r\n/g, '\n')}</pre>
            </details>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <QrCode size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Format</p>
                <p className="text-sm font-semibold text-neutral-900">QR Code (ISO 18004)</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Hash size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Data Size</p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {bytes.toLocaleString('en-US')} byte{bytes !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 p-4 bg-primary-50/50 rounded-xl border border-primary-200/40">
            <p className="text-xs text-primary-700 leading-relaxed">
              <strong>Privacy:</strong> QR codes are generated entirely in your browser. No data is sent to any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
