import { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import type { PdfInput } from '../../lib/pdf-export';

interface ExportPdfButtonProps {
  toolName: string;
  getInputs: () => PdfInput[];
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

export default function ExportPdfButton({ toolName, getInputs, resultsRef }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);

  async function handleExport() {
    if (!resultsRef.current) return;
    setExporting(true);
    setError(false);
    try {
      const { exportToPdf } = await import('../../lib/pdf-export');
      await exportToPdf({
        toolName,
        inputs: getInputs(),
        resultsElement: resultsRef.current,
      });
    } catch {
      setError(true);
    }
    setExporting(false);
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
      aria-label="Export results as PDF"
      data-pdf-hide
    >
      {error ? (
        <>
          <AlertCircle size={16} aria-hidden="true" />
          Export failed — try again
        </>
      ) : (
        <>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Exporting…' : 'Export PDF'}
        </>
      )}
    </button>
  );
}
