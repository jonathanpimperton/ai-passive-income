/**
 * Small shared UI pieces for the file converter tools: message lists,
 * the processing banner (with a Cancel control) and the results toolbar
 * (count, "Download all (.zip)", "Clear all") with 44px tap targets.
 */
import { Download, Trash2, X } from 'lucide-react';

/** Errors (role=alert) and neutral notices (role=status), one line per message. */
export function ToolMessages({ errors = [], notices = [] }: { errors?: string[]; notices?: string[] }) {
  return (
    <>
      {errors.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {errors.length === 1 ? (
            <p>{errors[0]}</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
      )}
      {notices.length > 0 && (
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-700" role="status">
          {notices.length === 1 ? (
            <p>{notices[0]}</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {notices.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/** Spinner banner shown while work is running; optional Cancel button. */
export function ProcessingBanner({ label, onCancel }: { label: string; onCancel?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
      <div className="w-5 h-5 shrink-0 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <span className="flex-1 text-sm text-primary-700">{label}</span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium rounded-lg border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 transition-colors duration-150"
        >
          <X size={16} aria-hidden="true" />
          Cancel
        </button>
      )}
    </div>
  );
}

/** "N files converted   [Download all (.zip)] [Clear all]" with 44px targets. */
export function ResultsToolbar({
  summary,
  onDownloadAll,
  downloadAllLabel = 'Download all (.zip)',
  onClear,
  clearLabel = 'Clear all',
  busy = false,
}: {
  summary: React.ReactNode;
  onDownloadAll?: () => void;
  downloadAllLabel?: string;
  onClear?: () => void;
  clearLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm text-neutral-600">{summary}</div>
      <div className="flex items-center gap-2">
        {onDownloadAll && (
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium rounded-lg border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-colors duration-150"
          >
            <Download size={16} aria-hidden="true" />
            {downloadAllLabel}
          </button>
        )}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm text-neutral-600 rounded-lg hover:text-red-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors duration-150"
          >
            <Trash2 size={16} aria-hidden="true" />
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  );
}
