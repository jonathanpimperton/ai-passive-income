/**
 * JWT Decoder: decode JWT tokens into readable header, payload and claim
 * checks (src/lib/dev-tools/jwt.ts). Zero dependencies.
 * Does NOT verify signatures, and never labels a token "valid".
 */
import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, AlertCircle, AlertTriangle, Clock, Shield, Key, Info } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';
import { decodeJwtToken, type JwtDecodeResult, type JwtStatus } from '../../lib/dev-tools/jwt';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';
import { safely } from '../../lib/dev-tools/safe-compute';

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/**
 * Format a Unix timestamp (seconds) to a readable date; out-of-range values are explained.
 *
 * `local` is false for the server render and the first client render: they must produce
 * identical text, so they use a fixed UTC format (no Intl, whose spacing differs between
 * Node and browsers). The visitor's own locale and time zone are applied after mount.
 */
function formatTimestamp(seconds: number, local: boolean): string {
  const ms = seconds * 1000;
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return 'outside the range of real dates';
  if (!local) return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' });
}

const KNOWN_CLAIMS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
  alg: 'Algorithm',
  typ: 'Type',
  kid: 'Key ID',
};

const TONE_CLASSES: Record<JwtStatus['tone'], string> = {
  ok: 'text-success-700 bg-success-50 border-success-100',
  warn: 'text-amber-800 bg-amber-50 border-amber-200',
  bad: 'text-red-700 bg-red-50 border-red-200',
};

function ClaimRow({ name, value, localTime }: { name: string; value: unknown; localTime: boolean }) {
  const isTimestamp = typeof value === 'number' && ['exp', 'nbf', 'iat'].includes(name);
  const knownLabel = KNOWN_CLAIMS[name];

  return (
    <div className="flex items-start gap-3 py-2 border-b border-neutral-100 last:border-0">
      <div className="shrink-0 w-28">
        <code className="text-sm font-mono font-semibold text-primary-600 break-all">{name}</code>
        {knownLabel && <p className="text-xs text-neutral-500">{knownLabel}</p>}
      </div>
      <div className="min-w-0 flex-1">
        {isTimestamp ? (
          <div>
            <p className="text-sm text-neutral-900 font-mono">{formatTimestamp(value as number, localTime)}</p>
            <p className="text-xs text-neutral-500 font-mono tabular-nums">({value as number})</p>
          </div>
        ) : typeof value === 'object' && value !== null ? (
          <pre className="text-sm text-neutral-900 font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-neutral-900 font-mono break-all">{String(value)}</p>
        )}
      </div>
    </div>
  );
}

export default function JwtDecoder() {
  const [input, setInput] = useState(SAMPLE_JWT);
  const { copy, copiedKey, message: copyMessage } = useCopyFeedback();
  // Dates show in the visitor's locale and time zone only once mounted (see formatTimestamp).
  const [localTime, setLocalTime] = useState(false);
  useEffect(() => setLocalTime(true), []);

  const decoded = useMemo(
    () => safely<JwtDecodeResult>(() => decodeJwtToken(input), (message) => ({ ok: false, error: message })),
    [input],
  );

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {/* JWT Input */}
      <div className="space-y-2">
        <label htmlFor="jwt-input" className="block text-sm font-semibold text-neutral-700">
          JWT Token
        </label>
        <textarea
          id="jwt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT token here (a leading &quot;Bearer &quot; is fine)..."
          className="w-full h-32 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-base sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y break-all"
          spellCheck={false}
        />
        <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>
      </div>

      {/* Error */}
      {!decoded.ok && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200" role="alert">
          <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700 font-medium">{decoded.error}</p>
        </div>
      )}

      {decoded.ok && (
        <>
          {/* Status and warnings */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${TONE_CLASSES[decoded.status.tone]}`}>
                <Clock size={14} aria-hidden="true" />
                {decoded.status.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-sm text-neutral-700">
                <Shield size={14} aria-hidden="true" />
                Signature not checked
              </span>
            </div>
            {decoded.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <ul className="space-y-1">
                  {decoded.warnings.map((w, k) => <li key={k}>{w}</li>)}
                </ul>
              </div>
            )}
            {decoded.notes.length > 0 && (
              <p className="flex items-start gap-2 text-sm text-neutral-600">
                <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{decoded.notes.join(' ')}</span>
              </p>
            )}
          </div>

          {/* Decoded sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Header */}
            <div className="rounded-lg border border-neutral-200/80 shadow-sm bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-primary-50 border-b border-primary-100">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-primary-600" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-primary-900">Header</h2>
                </div>
                <button
                  type="button"
                  onClick={() => copy(JSON.stringify(decoded.header, null, 2), 'header')}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3 rounded text-sm text-primary-700 hover:bg-primary-100 transition-colors duration-150"
                >
                  {copiedKey === 'header' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copiedKey === 'header' ? 'Copied' : 'Copy header'}
                </button>
              </div>
              <div className="px-4 py-2">
                {Object.entries(decoded.header).map(([key, value]) => (
                  <ClaimRow key={key} name={key} value={value} localTime={localTime} />
                ))}
              </div>
            </div>

            {/* Payload */}
            <div className="rounded-lg border border-neutral-200/80 shadow-sm bg-white overflow-hidden lg:col-span-1">
              <div className="flex items-center justify-between px-4 py-2 bg-success-50 border-b border-success-100">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-success-700" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-success-700">Payload</h2>
                </div>
                <button
                  type="button"
                  onClick={() => copy(JSON.stringify(decoded.payload, null, 2), 'payload')}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3 rounded text-sm text-success-700 hover:bg-success-100 transition-colors duration-150"
                >
                  {copiedKey === 'payload' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copiedKey === 'payload' ? 'Copied' : 'Copy payload'}
                </button>
              </div>
              <div className="px-4 py-2">
                {Object.entries(decoded.payload).map(([key, value]) => (
                  <ClaimRow key={key} name={key} value={value} localTime={localTime} />
                ))}
              </div>
            </div>

            {/* Signature */}
            <div className="rounded-lg border border-neutral-200/80 shadow-sm bg-white overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-neutral-600" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-neutral-800">Signature</h2>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-mono text-neutral-700 break-all">{decoded.signature || '(empty)'}</p>
                <p className="text-sm text-neutral-600 mt-2">
                  Algorithm: <strong>{decoded.alg.name}</strong>.{' '}
                  {decoded.alg.family === 'none'
                    ? 'This token is not signed, so it proves nothing about who created it.'
                    : `This tool does not verify signatures. Verifying this one needs ${decoded.alg.verifyWith}, and should happen on your server before any claim is trusted.`}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
