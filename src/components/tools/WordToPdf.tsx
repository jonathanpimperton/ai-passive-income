/**
 * Word to PDF — convert DOCX to PDF using mammoth.js + jsPDF + html2canvas.
 * Client-side only. No server upload.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setWarnings([]);
    setHtmlContent('');
    setProcessing(true);

    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const DOMPurify = (await import('dompurify')).default;
      setFile(f);
      setHtmlContent(DOMPurify.sanitize(result.value));
      if (result.messages.length > 0) {
        setWarnings(result.messages.map((m) => m.message).slice(0, 5));
      }
    } catch {
      setError('Could not read this file — make sure it is a .docx file (not .doc).');
    }
    setProcessing(false);
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!previewRef.current || !file) return;
    setConverting(true);
    setError('');

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Render the preview div to a canvas
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Scale image to fit page width
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Handle multi-page documents
      let remainingHeight = imgHeight;
      let yOffset = 0;

      while (remainingHeight > 0) {
        if (yOffset > 0) pdf.addPage();

        // Use a sliced portion of the canvas for each page
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        const sliceHeight = Math.min(
          canvas.height - (yOffset / imgHeight) * canvas.height,
          (usableHeight / imgHeight) * canvas.height
        );
        sliceCanvas.height = sliceHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, (yOffset / imgHeight) * canvas.height,
            canvas.width, sliceHeight,
            0, 0,
            canvas.width, sliceHeight
          );
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
          const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
          pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidth, sliceImgHeight);
        }

        // Free memory
        sliceCanvas.width = 0;
        sliceCanvas.height = 0;

        remainingHeight -= usableHeight;
        yOffset += usableHeight;
      }

      // Free source canvas memory
      canvas.width = 0;
      canvas.height = 0;

      pdf.save(file.name.replace(/\.docx?$/i, '') + '.pdf');
    } catch (e) {
      setError('PDF conversion failed. ' + (e instanceof Error ? e.message : 'Please try a simpler document.'));
    }
    setConverting(false);
  }, [file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          acceptLabel="Supports: DOCX files (Word 2007+)"
          onFiles={handleFiles}
        />

        {file && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText size={20} className="text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
              </div>
            </div>

            <button
              onClick={convertToPdf}
              disabled={converting || !htmlContent}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {converting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Converting to PDF...
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as PDF
                </>
              )}
            </button>

            {warnings.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                <p className="font-medium mb-1">Notes:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs text-neutral-400">
              Best for text-heavy documents. Complex layouts, charts, and macros may not convert perfectly.
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-primary-700">Reading Word document...</span>
          </div>
        )}

        {htmlContent ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">Document Preview</p>
            <div
              ref={previewRef}
              className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-8 prose prose-sm max-w-none min-h-[400px] overflow-auto font-sans leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a Word document (.docx) to convert it to PDF</p>
            <p className="text-xs text-neutral-400 mt-1">Preview appears here, then download as PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}
