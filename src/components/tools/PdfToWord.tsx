/**
 * PDF to Word — renders each PDF page as a high-resolution image
 * and embeds them in a DOCX for pixel-perfect visual fidelity.
 *
 * Unlike text-extraction approaches that lose formatting and layout,
 * this renders each page exactly as it appears in the PDF.
 *
 * Client-side only. No server upload.
 */
import { useState, useCallback, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

interface RenderedPage {
  pageNum: number;
  pngData: Uint8Array;
  widthPt: number;
  heightPt: number;
  previewUrl: string;
}

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [renderProgress, setRenderProgress] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Clean up preview object URLs on unmount
  useEffect(() => {
    return () => {
      renderedPages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [renderedPages]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setError('');
      // Clean up old preview URLs
      renderedPages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setRenderedPages([]);
      setProcessing(true);
      setRenderProgress('Loading PDF...');

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdfDoc = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;

        const RENDER_SCALE = 2; // 2x for crisp text (~144 DPI effective)
        const pages: RenderedPage[] = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          setRenderProgress(`Rendering page ${i} of ${pdfDoc.numPages}...`);

          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const baseViewport = page.getViewport({ scale: 1 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // White background (PDFs may have transparent backgrounds)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Render the PDF page to canvas at high resolution
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Convert canvas to PNG blob
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (!blob) continue;

          // Get PNG bytes for DOCX embedding + create preview URL
          const pngData = new Uint8Array(await blob.arrayBuffer());
          const previewUrl = URL.createObjectURL(new Blob([pngData], { type: 'image/png' }));

          pages.push({
            pageNum: i,
            pngData,
            widthPt: baseViewport.width,
            heightPt: baseViewport.height,
            previewUrl,
          });
        }

        setFile(f);
        setRenderedPages(pages);
      } catch {
        setError('Could not read this PDF — it may be encrypted or corrupted.');
      }
      setProcessing(false);
      setRenderProgress('');
    },
    [renderedPages]
  );

  const generateDocx = useCallback(async () => {
    if (renderedPages.length === 0 || !file) return;
    setGenerating(true);
    setError('');

    try {
      const docxLib = await import('docx');
      const { Document, Packer, Paragraph, ImageRun } = docxLib;

      // Create one section per page — each page is a full-bleed image
      // that looks exactly like the original PDF page.
      const sections = renderedPages.map((page) => {
        // Convert page dimensions from PDF points to DOCX twips (1 pt = 20 twips)
        const widthTwip = Math.round(page.widthPt * 20);
        const heightTwip = Math.round(page.heightPt * 20);

        // Image display size: docx library expects EMU-equivalent values.
        // The library converts transformation width/height by multiplying × 9525
        // to get EMU. We want the image to fill the page exactly.
        // Page width in inches = widthPt / 72
        // Display pixels at 96 DPI = (widthPt / 72) × 96 = widthPt × 4/3
        const displayW = Math.round(page.widthPt * (96 / 72));
        const displayH = Math.round(page.heightPt * (96 / 72));

        return {
          properties: {
            page: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              size: { width: widthTwip, height: heightTwip },
            },
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: page.pngData,
                  transformation: { width: displayW, height: displayH },
                  type: 'png',
                }),
              ],
              spacing: { before: 0, after: 0, line: 240 },
            }),
          ],
        };
      });

      const doc = new Document({ sections });
      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '') + '.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('DOCX generation failed. ' + (e instanceof Error ? e.message : ''));
    }
    setGenerating(false);
  }, [renderedPages, file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />

        {file && renderedPages.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {renderedPages.length} page{renderedPages.length !== 1 ? 's' : ''} rendered
                </p>
              </div>
            </div>

            <button
              onClick={generateDocx}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {generating ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Generating DOCX...
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as Word (.docx)
                </>
              )}
            </button>

            <p className="text-xs text-neutral-400">
              Each page is rendered as a high-resolution image for pixel-perfect fidelity. The
              output will look exactly like the original PDF.
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div
              className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm text-primary-700">{renderProgress || 'Processing...'}</span>
          </div>
        )}

        {renderedPages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">
              Page Preview — this is exactly how your Word document will look
            </p>
            <div className="bg-neutral-100 rounded-2xl border border-neutral-200/80 shadow-card p-4 max-h-[600px] overflow-auto space-y-4">
              {renderedPages.map((page) => (
                <div key={page.pageNum} className="relative">
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    Page {page.pageNum}
                  </div>
                  <img
                    src={page.previewUrl}
                    alt={`Page ${page.pageNum}`}
                    className="w-full rounded-lg shadow-md bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a PDF to convert it to a Word document
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Each page is rendered as a high-resolution image for perfect fidelity
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
