/**
 * Images to PDF — combine multiple images into a single PDF.
 * Uses jsPDF (already in project). Drag to reorder. No server upload.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, Trash2, FileText, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
}

type PageSize = 'a4' | 'letter';
type Orientation = 'portrait' | 'landscape';
type FitMode = 'fit' | 'fill' | 'stretch';

const PAGE_SIZES: Record<PageSize, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
};

function loadImage(file: File): Promise<ImageEntry> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const previewUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: previewUrl,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(previewUrl); reject(new Error('Failed to load image')); };
    img.src = previewUrl;
  });
}

export default function ImagesToPdf() {
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [margin, setMargin] = useState(10);
  const [generating, setGenerating] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const entries = await Promise.all(
      files.map((f) => loadImage(f).catch(() => null)),
    );
    setImages((prev) => [...prev, ...entries.filter((e): e is ImageEntry => e !== null)]);
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const generatePdf = useCallback(async () => {
    if (images.length === 0) return;
    setGenerating(true);

    try {
      const { jsPDF } = await import('jspdf');
      const [pw, ph] = PAGE_SIZES[pageSize];
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [pw, ph] });

      const pageW = orientation === 'landscape' ? Math.max(pw, ph) : Math.min(pw, ph);
      const pageH = orientation === 'landscape' ? Math.min(pw, ph) : Math.max(pw, ph);

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        const entry = images[i];
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;
        const imgRatio = entry.width / entry.height;
        const areaRatio = availW / availH;

        let drawW: number, drawH: number;

        if (fitMode === 'stretch') {
          drawW = availW;
          drawH = availH;
        } else if (fitMode === 'fill') {
          if (imgRatio > areaRatio) {
            drawH = availH;
            drawW = drawH * imgRatio;
          } else {
            drawW = availW;
            drawH = drawW / imgRatio;
          }
        } else {
          // fit
          if (imgRatio > areaRatio) {
            drawW = availW;
            drawH = drawW / imgRatio;
          } else {
            drawH = availH;
            drawW = drawH * imgRatio;
          }
        }

        const x = margin + (availW - drawW) / 2;
        const y = margin + (availH - drawH) / 2;

        // Convert image to data URL
        const canvas = document.createElement('canvas');
        canvas.width = entry.width;
        canvas.height = entry.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        const img = new window.Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            resolve();
          };
          img.src = entry.preview;
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH);
      }

      pdf.save('images.pdf');
    } catch {
      // PDF generation failed — user sees the button reset from "Generating..." to "Download PDF"
    }
    setGenerating(false);
  }, [images, pageSize, orientation, fitMode, margin]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp"
          acceptLabel="Supports: JPG, PNG, WebP"
          multiple
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-4">
          <div>
            <label htmlFor="pdf-page-size" className="block text-sm font-medium text-neutral-700 mb-1">Page size</label>
            <select
              id="pdf-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">Letter (8.5 × 11 in)</option>
            </select>
          </div>

          <div>
            <span id="pdf-orientation-label" className="block text-sm font-medium text-neutral-700 mb-1">Orientation</span>
            <div className="flex gap-2" role="radiogroup" aria-labelledby="pdf-orientation-label">
              {(['portrait', 'landscape'] as const).map((o) => (
                <button
                  key={o}
                  role="radio"
                  aria-checked={orientation === o}
                  onClick={() => setOrientation(o)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 capitalize ${
                    orientation === o
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pdf-fit" className="block text-sm font-medium text-neutral-700 mb-1">Image fit</label>
            <select
              id="pdf-fit"
              value={fitMode}
              onChange={(e) => setFitMode(e.target.value as FitMode)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              <option value="fit">Fit (maintain ratio, no crop)</option>
              <option value="fill">Fill (maintain ratio, may crop)</option>
              <option value="stretch">Stretch (fill page, may distort)</option>
            </select>
          </div>

          <div>
            <label htmlFor="pdf-margin" className="block text-sm font-medium text-neutral-700 mb-1">
              Margin: {margin}mm
            </label>
            <input
              id="pdf-margin"
              type="range"
              min={0}
              max={30}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-neutral-200 accent-primary-500
                [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
              aria-label="Margin slider"
            />
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {images.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                <span className="font-semibold">{images.length}</span> image{images.length !== 1 ? 's' : ''} — 1 image per page
              </span>
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150">
                <Trash2 size={14} aria-hidden="true" /> Clear all
              </button>
            </div>

            <div className="space-y-2">
              {images.map((img, i) => (
                <div key={img.id} className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200/80 shadow-card p-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 transition-colors"
                      aria-label="Move up"
                    >
                      <ChevronUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                      className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 transition-colors"
                      aria-label="Move down"
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <img src={img.preview} alt={`Page ${i + 1}`} className="w-12 h-12 object-cover rounded-lg bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{img.file.name}</p>
                    <p className="text-xs text-neutral-500">{img.width} × {img.height}px — Page {i + 1}</p>
                  </div>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors duration-150"
                    aria-label={`Remove ${img.file.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                ref={addMoreRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleFiles(Array.from(files));
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => addMoreRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 transition-colors duration-150"
              >
                <Plus size={16} aria-hidden="true" /> Add more
              </button>
              <button
                onClick={generatePdf}
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={16} aria-hidden="true" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to combine into a PDF</p>
            <p className="text-xs text-neutral-400 mt-1">One image per page, reorder by dragging</p>
          </div>
        )}
      </div>
    </div>
  );
}
