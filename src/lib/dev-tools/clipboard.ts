/**
 * Clipboard helper shared by the developer tools.
 *
 * copyText() tries the async Clipboard API first and falls back to the legacy
 * execCommand path (older browsers, non-secure contexts). It resolves to
 * false when both fail so the caller can tell the user, instead of showing
 * "Copied" for a copy that never happened.
 *
 * useCopyFeedback() gives a component the visible "Copied" state plus a
 * message for a role="status" live region, because a button's visible text
 * change is not announced when the button carries an aria-label (A11Y F-27).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'sr-only';
  document.body.appendChild(ta);
  try {
    ta.select();
    return document.execCommand('copy');
  } catch {
    // execCommand can throw in locked-down contexts; reported to the caller as false.
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context: fall through to the legacy path,
      // whose result is returned to the caller.
    }
  }
  return legacyCopy(text);
}

export interface CopyFeedback {
  /** Copy `text`; `key` identifies which button asked, for per-button feedback. */
  copy: (text: string, key?: string) => Promise<boolean>;
  /** Key of the button whose copy just succeeded, or null. */
  copiedKey: string | null;
  /** Key of the button whose copy just failed, or null. */
  failedKey: string | null;
  /** Text for a polite live region; empty when there is nothing to announce. */
  message: string;
}

export function useCopyFeedback(timeoutMs = 2000): CopyFeedback {
  const [state, setState] = useState<{ key: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (text: string, key = 'default') => {
      const ok = await copyText(text);
      setState({ key, ok });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState(null), ok ? timeoutMs : timeoutMs * 2);
      return ok;
    },
    [timeoutMs],
  );

  return {
    copy,
    copiedKey: state?.ok ? state.key : null,
    failedKey: state && !state.ok ? state.key : null,
    message: state ? (state.ok ? 'Copied to clipboard' : 'Copy failed. Select the text and copy it manually.') : '',
  };
}
