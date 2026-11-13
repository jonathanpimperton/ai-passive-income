/**
 * Last line of defence for the developer tools.
 *
 * The tools compute their output inside useMemo during render. An exception
 * thrown there unmounts the whole React island, so the user loses every
 * control. Each tool wraps that computation in safely() so an unexpected
 * throw becomes an ordinary error message and the tool stays usable. The
 * specific, helpful messages still come from the libraries themselves; this
 * only catches what nobody anticipated.
 */

/** A short, plain message for an exception nobody planned for. */
export function unexpectedErrorMessage(e: unknown): string {
  const detail = e instanceof Error ? e.message || e.name : typeof e === 'string' ? e : '';
  const trimmed = detail.replace(/\s+/g, ' ').trim();
  const shown = trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
  return `Something unexpected went wrong while processing this input${shown ? ` (${shown})` : ''}. Your text is unchanged: edit it or clear it and try again.`;
}

/** Run `compute`; if it throws, return `onError(message)` instead of propagating. */
export function safely<T>(compute: () => T, onError: (message: string) => T): T {
  try {
    return compute();
  } catch (e) {
    return onError(unexpectedErrorMessage(e));
  }
}
