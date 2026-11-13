export interface ResultItem {
  label: string;
  value: string;
  /** true for the "big number" primary result */
  highlight?: boolean;
}

/**
 * Body of POST /api/email-results. The server renders only labels on its per-tool
 * allowlist (src/lib/tool-registry.ts) and only numeric/option-word values
 * (src/lib/email-sanitize.ts); the tool name comes from the server registry.
 */
export interface EmailResultsBody {
  email: string;
  toolSlug: string;
  inputs: Array<{ label: string; value: string }>;
  results: ResultItem[];
  /** Newsletter opt-in. Only an explicit `true` enrols; the checkbox defaults to unticked. */
  subscribe: boolean;
  /** Honeypot field; real visitors leave it empty. */
  honeypot: string;
  /** Cloudflare Turnstile token (single use). */
  turnstileToken: string;
}

/** Body of POST /api/subscribe. */
export interface SubscribeBody {
  email: string;
  toolSlug?: string;
  honeypot: string;
  turnstileToken: string;
}

/** Successful JSON response from either endpoint. */
export interface EmailApiSuccess {
  success: true;
  /** email-results only: the email was sent but the newsletter opt-in failed. */
  subscribeFailed?: true;
}
