import { useState, useRef } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ResultItem } from '../../lib/email-types';
import type { PdfInput } from '../../lib/pdf-export';

interface EmailResultsButtonProps {
  toolSlug: string;
  toolName: string;
  getInputs: () => PdfInput[];
  getResults: () => ResultItem[];
}

export default function EmailResultsButton({
  toolSlug,
  toolName,
  getInputs,
  getResults,
}: EmailResultsButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribe, setSubscribe] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleToggle() {
    if (!expanded) {
      setExpanded(true);
      setStatus('idle');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setExpanded(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          toolSlug,
          toolName,
          inputs: getInputs(),
          results: getResults(),
          subscribe,
          honeypot: honeypotRef.current?.value || '',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        if ((window as any).gtag) {
          (window as any).gtag('event', 'email_results', {
            event_category: 'engagement',
            event_label: toolSlug,
          });
        }
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to send. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-accent-600 bg-accent-50 border border-accent-200/60"
        data-pdf-hide
      >
        <CheckCircle size={16} aria-hidden="true" />
        Results sent!
      </div>
    );
  }

  return (
    <div data-pdf-hide className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-primary-600 bg-primary-50 border border-primary-200/60 hover:bg-primary-100"
        aria-expanded={expanded}
        aria-label="Email my results"
      >
        <Mail size={16} aria-hidden="true" />
        Email my results
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Honeypot — hidden from humans */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2">
            <label htmlFor={`email-results-${toolSlug}`} className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id={`email-results-${toolSlug}`}
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="h-9 px-3 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                disabled:opacity-60 w-52"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg transition-all duration-200
                text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60"
              aria-label="Send results to email"
            >
              {status === 'loading' ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} aria-hidden="true" />
              )}
              Send
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={subscribe}
              onChange={(e) => setSubscribe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
            />
            <span className="text-xs text-neutral-500">Also send me free financial tips</span>
          </label>
        </form>
        {status === 'error' && errorMsg && (
          <p role="alert" className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
            <AlertCircle size={12} aria-hidden="true" />
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
