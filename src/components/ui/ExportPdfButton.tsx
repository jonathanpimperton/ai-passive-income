import { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import type { PdfInput } from '../../lib/pdf-export';
import { getActiveCurrency, isCurrencyCode } from '../../lib/currency';
import { pageRegionFor } from '../../lib/affiliate-data';

interface ExportPdfButtonProps {
  toolName: string;
  getInputs: () => PdfInput[];
  resultsRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Currency the results are shown in (sets the PDF date format). Default:
   * the page's fixed currency for UK-/US-only tools, else the display currency.
   */
  currency?: string;
}

type PdfModule = typeof import('../../lib/pdf-export');

let pdfModule: Promise<PdfModule> | null = null;

/**
 * Load the PDF library once. A failed load (offline, deploy in progress) is
 * forgotten, so the next click retries instead of failing until reload.
 */
function loadPdfModule(): Promise<PdfModule> {
  if (!pdfModule) {
    pdfModule = import('../../lib/pdf-export').catch((err: unknown) => {
      pdfModule = null;
      throw err;
    });
  }
  return pdfModule;
}

/** Currency for the PDF date: explicit prop, else the page's fixed region, else the display currency. */
function resolveCurrency(explicit?: string): string {
  if (explicit && isCurrencyCode(explicit)) return explicit;
  const slug = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean).pop() : undefined;
  const region = pageRegionFor(slug);
  if (region === 'UK') return 'GBP';
  if (region === 'US') return 'USD';
  return getActiveCurrency();
}

export default function ExportPdfButton({ toolName, getInputs, resultsRef, currency }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);

  async function handleExport() {
    if (!resultsRef.current || exporting) return;
    setExporting(true);
    setError(false);
    try {
      const { exportToPdf } = await loadPdfModule();
      await exportToPdf({
        toolName,
        inputs: getInputs(),
        resultsElement: resultsRef.current,
        currency: resolveCurrency(currency),
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      setError(true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-60 ${
        error
          ? 'text-red-600 bg-red-50 border border-red-200/60 hover:bg-red-100'
          : 'text-primary-600 bg-primary-50 border border-primary-200/60 hover:bg-primary-100'
      }`}
      aria-label={error ? 'PDF export failed. Export results as PDF again' : 'Export results as PDF'}
      data-pdf-hide
      data-export-pdf
    >
      {error ? (
        <>
          <AlertCircle size={16} aria-hidden="true" />
          Export failed. Try again
        </>
      ) : (
        <>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </>
      )}
    </button>
  );
}
