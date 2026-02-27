import { useState } from 'react';
import { Download } from 'lucide-react';
import type { PdfInput } from '../../lib/pdf-export';

interface ExportPdfButtonProps {
  toolName: string;
  getInputs: () => PdfInput[];
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

export default function ExportPdfButton({ toolName, getInputs, resultsRef }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!resultsRef.current) return;
    setExporting(true);
    try {
      const { exportToPdf } = await import('../../lib/pdf-export');
      await exportToPdf({
        toolName,
        inputs: getInputs(),
        resultsElement: resultsRef.current,
      });
    } catch {
      // Silent fail — html2canvas/jsPDF not loading is rare
    }
    setExporting(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200/60 rounded-xl hover:bg-primary-100 disabled:opacity-60 transition-all duration-200"
      aria-label="Export results as PDF"
      data-pdf-hide
    >
      <Download size={16} aria-hidden="true" />
      {exporting ? 'Exporting…' : 'Export PDF'}
    </button>
  );
}
