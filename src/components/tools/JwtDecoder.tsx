/**
 * JWT Decoder — decode JWT tokens into readable header, payload, and signature info.
 * Zero dependencies — uses native Base64URL decoding and JSON parsing.
 * Does NOT verify signatures (no secret key input).
 */
import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, AlertCircle, Clock, Shield, Key } from 'lucide-react';
import PrivacyBadge from '../ui/PrivacyBadge';
import { decodeJwt } from '../../lib/converter-utils';

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/** Format a Unix timestamp to a readable date */
function formatTimestamp(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'long',
    });
  } catch {
    return String(ts);
  }
}

/** Get time-relative description for expiry */
function getExpiryStatus(exp: number): { label: string; color: 'green' | 'red' | 'amber' } {
  const now = Date.now() / 1000;
  const diff = exp - now;

  if (diff > 0) {
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { label: `Valid — expires in ${days} day${days > 1 ? 's' : ''}`, color: 'green' };
    }
    if (hours > 0) {
      return { label: `Valid — expires in ${hours}h ${minutes}m`, color: 'green' };
    }
    return { label: `Valid — expires in ${minutes}m`, color: 'amber' };
  } else {
    const ago = Math.abs(diff);
    const hours = Math.floor(ago / 3600);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { label: `Expired ${days} day${days > 1 ? 's' : ''} ago`, color: 'red' };
    }
    if (hours > 0) {
      return { label: `Expired ${hours}h ago`, color: 'red' };
    }
    const minutes = Math.floor(ago / 60);
    return { label: `Expired ${minutes}m ago`, color: 'red' };
  }
}

const KNOWN_CLAIMS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
};

function ClaimRow({ name, value }: { name: string; value: unknown }) {
  const isTimestamp = typeof value === 'number' && ['exp', 'nbf', 'iat'].includes(name);
  const knownLabel = KNOWN_CLAIMS[name];

  return (
    <div className="flex items-start gap-3 py-2 border-b border-neutral-100 last:border-0">
      <div className="shrink-0 w-28">
        <code className="text-sm font-mono font-semibold text-primary-600">{name}</code>
        {knownLabel && <p className="text-xs text-neutral-500">{knownLabel}</p>}
      </div>
      <div className="min-w-0 flex-1">
        {isTimestamp ? (
          <div>
            <p className="text-sm text-neutral-900 font-mono">{formatTimestamp(value as number)}</p>
            <p className="text-xs text-neutral-500 font-mono">({value})</p>
            {name === 'exp' && (() => {
              const status = getExpiryStatus(value as number);
              const colorMap = {
                green: 'text-accent-700 bg-accent-50',
                red: 'text-negative-600 bg-negative-50',
                amber: 'text-warning-600 bg-warning-50',
              };
              return (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status.color]}`}>
                  {status.label}
                </span>
              );
            })()}
          </div>
        ) : typeof value === 'object' ? (
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
  const [copiedSection, setCopiedSection] = useState<string>('');

  const decoded = useMemo(() => decodeJwt(input), [input]);

  const handleCopy = useCallback(async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
    }
  }, []);

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
          placeholder="Paste your JWT token here..."
          className="w-full h-32 p-4 rounded-xl border border-neutral-200 bg-white font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-y break-all"
          spellCheck={false}
        />
      </div>

      {/* Error */}
      {decoded.error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-negative-50 border border-negative-100" role="alert">
          <AlertCircle size={18} className="text-negative-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-negative-600 font-medium">{decoded.error}</p>
        </div>
      )}

      {/* Decoded sections */}
      {!decoded.error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-live="polite">
          {/* Header */}
          <div className="rounded-2xl border border-neutral-200/80 shadow-sm bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-b border-primary-100">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary-600" aria-hidden="true" />
                <h3 className="text-sm font-bold text-primary-900">Header</h3>
              </div>
              <button
                onClick={() => handleCopy(JSON.stringify(decoded.header, null, 2), 'header')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-primary-700 hover:bg-primary-100 transition-colors duration-150"
                aria-label="Copy header JSON"
              >
                {copiedSection === 'header' ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                {copiedSection === 'header' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="px-4 py-2">
              {Object.entries(decoded.header).map(([key, value]) => (
                <ClaimRow key={key} name={key} value={value} />
              ))}
            </div>
          </div>

          {/* Payload */}
          <div className="rounded-2xl border border-neutral-200/80 shadow-sm bg-white overflow-hidden lg:col-span-1">
            <div className="flex items-center justify-between px-4 py-3 bg-accent-50 border-b border-accent-100">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-accent-700" aria-hidden="true" />
                <h3 className="text-sm font-bold text-accent-800">Payload</h3>
              </div>
              <button
                onClick={() => handleCopy(JSON.stringify(decoded.payload, null, 2), 'payload')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-accent-700 hover:bg-accent-100 transition-colors duration-150"
                aria-label="Copy payload JSON"
              >
                {copiedSection === 'payload' ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                {copiedSection === 'payload' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="px-4 py-2">
              {Object.entries(decoded.payload).map(([key, value]) => (
                <ClaimRow key={key} name={key} value={value} />
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-2xl border border-neutral-200/80 shadow-sm bg-white overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-neutral-600" aria-hidden="true" />
                <h3 className="text-sm font-bold text-neutral-800">Signature</h3>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-mono text-neutral-700 break-all">{decoded.signature}</p>
              <p className="text-xs text-neutral-500 mt-2">
                Algorithm: <strong>{String(decoded.header.alg || 'unknown')}</strong>.
                Signature verification requires the secret key and is not performed client-side.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
