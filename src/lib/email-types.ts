export interface ResultItem {
  label: string;
  value: string;
  /** true for the "big number" primary result */
  highlight?: boolean;
}

export interface EmailResultsBody {
  email: string;
  toolSlug: string;
  toolName: string;
  inputs: Array<{ label: string; value: string }>;
  results: ResultItem[];
  honeypot?: string;
}
