/**
 * Keep big pasted inputs from freezing the page (DEVTOOLS-14).
 *
 * Small inputs pass straight through, so typing feels instant. Inputs at or
 * above `threshold` characters are only handed on after `delay` ms without a
 * change, so the expensive conversion runs once per pause instead of once per
 * keystroke. `pending` is true while a newer large value is waiting.
 */
import { useEffect, useState } from 'react';

export const LARGE_INPUT_CHARS = 100_000;

export function useSizeAwareDebounce(
  value: string,
  threshold = LARGE_INPUT_CHARS,
  delay = 400,
): { value: string; pending: boolean } {
  const [debounced, setDebounced] = useState(value);
  const large = value.length >= threshold;

  useEffect(() => {
    if (!large) {
      setDebounced(value);
      return undefined;
    }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, large, delay]);

  if (!large) return { value, pending: false };
  return { value: debounced, pending: debounced !== value };
}
