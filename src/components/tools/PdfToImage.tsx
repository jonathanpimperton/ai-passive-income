/**
 * PDF to Image — convert PDF pages to JPG/PNG using pdfjs-dist + Canvas.
 * Client-side only. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

interface PageImage {
  pageNum: number;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type OutputFormat = 'image/jpeg' | 'image/png';

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [images, setImages] = useState<PageImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setImages((prev) => { prev.forEach((img) => URL.revokeObjectURL(img.preview)); return []; });
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = pdfjsLib.getDocument({ data: await f.arrayBuffer() });
      const pdfDoc = await loadingTask.promise;
      setFile(f);
      setPageCount(pdfDoc.numPages);
    } catch {
      setError('Could not read this PDF — it may be encrypted or corrupted.');
    }
  }, []);

  const convert = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setImages((prev) => { prev.forEach((img) => URL.revokeObjectURL(img.preview)); return []; });
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
      const pdfDoc = await loadingTask.promise;
      const results: PageImage[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // White background for JPEG
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Render failed'))),
            format,
            format === 'image/jpeg' ? quality / 100 : undefined,
          );
        });

        // Free canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;

        results.push({
          pageNum: i,
          blob,
          preview: URL.createObjectURL(blob),
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
      }
      setImages(results);
    } catch (e) {
      setError('Conversion failed. ' + (e instanceof Error ? e.message : ''));
    }
    setProcessing(false);
  }, [file, scale, format, quality]);

  const downloadImage = (img: PageImage) => {
    const ext = format === 'image/jpeg' ? '.jpg' : '.png';
    const a = document.createElement('a');
    a.href = img.preview;
    a.download = (file?.name.replace(/\.pdf$/i, '') || 'page') + `_p${img.pageNum}${ext}`;
    a.click();
  };

  const downloadAll = () => images.forEach(downloadImage);

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />
        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div>
              <label htmlFor="img-format" className="block text-sm font-medium text-neutral-700 mb-1">Output format</label>
              <select
                id="img-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as OutputFormat)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>

            <SliderInput label="Scale" id="pdf-img-scale" value={scale} min={1} max={4} step={0.5} onChange={setScale} suffix="×" minLabel="1×" maxLabel="4×" hint="Higher = larger, sharper images" />

            {format === 'image/jpeg' && (
              <SliderInput label="JPG Quality" id="pdf-img-quality" value={quality} min={30} max={100} step={5} onChange={setQuality} suffix="%" minLabel="30%" maxLabel="100%" />
            )}

            <button
              onClick={convert}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Converting...
                </>
              ) : (
                <>
                  <ImageIcon size={16} aria-hidden="true" />
                  Convert to {format === 'image/jpeg' ? 'JPG' : 'PNG'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}

        {images.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                <span className="font-semibold text-accent-600">{images.length}</span> page{images.length !== 1 ? 's' : ''} converted
              </span>
              <div className="flex items-center gap-3">
                <button onClick={downloadAll} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors duration-150">
                  <Download size={14} aria-hidden="true" /> Download all
                </button>
                <button onClick={clearAll} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150">
                  <Trash2 size={14} aria-hidden="true" /> Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.pageNum} className="bg-white rounded-xl border border-neutral-200/80 shadow-card overflow-hidden group">
                  <img src={img.preview} alt={`Page ${img.pageNum}`} className="w-full aspect-[3/4] object-cover bg-neutral-100" />
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-900">Page {img.pageNum}</p>
                      <p className="text-xs text-neutral-500">{formatSize(img.blob.size)}</p>
                    </div>
                    <button onClick={() => downloadImage(img)} className="p-1.5 text-neutral-500 hover:text-primary-600 transition-colors" aria-label={`Download page ${img.pageNum}`}>
                      <Download size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!file && !processing && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to convert pages to images</p>
            <p className="text-xs text-neutral-500 mt-1">Each page becomes a separate JPG or PNG</p>
          </div>
        )}
      </div>
    </div>
  );
}
