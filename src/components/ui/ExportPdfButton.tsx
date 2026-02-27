import { useState } from 'react';
import { Download } from 'lucide-react';
import type { PdfExportData } from '../../lib/pdf-export';

interface ExportPdfButtonProps {
  getData: () => PdfExportData;
}

export default function ExportPdfButton({ getData }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { exportToPdf } = await import('../../lib/pdf-export');
      exportToPdf(getData());
    } catch {
      // Silent fail — jsPDF not loading is rare
    }
    setExporting(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200/60 rounded-xl hover:bg-primary-100 disabled:opacity-60 transition-all duration-200"
      aria-label="Export results as PDF"
    >
      <Download size={16} aria-hidden="true" />
      {exporting ? 'Exporting...' : 'Export PDF'}
    </button>
  );
}
