/**
 * Images to PDF — combine multiple images into a single PDF with jsPDF.
 * Reorder with arrow buttons. No server upload.
 *
 * Review fixes:
 * - Transparent PNG/WebP areas are drawn on white instead of black (FILES-04).
 * - An image size/quality control and a chosen file name, so the PDF can fit
 *   upload limits (FILES-22); the final size is shown after saving.
 * - Undecodable files are named in an error instead of vanishing (FILES-12);
 *   44px reorder/remove targets (FILES-16); cancel for long batches.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Trash2, FileText, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, baseName } from '../../lib/file-tools/names';
import { detectImageKind, isAnimatedImage } from '../../lib/file-tools/image-sniff';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, bytesToBlob, errorMessage, nextFrame,
} from '../../lib/file-tools/browser';

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
type SizePreset = 'original' | 'high' | 'medium' | 'small';

const PAGE_SIZES: Record<PageSize, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
};

/** Longest side (px) and JPEG quality per preset. */
const SIZE_PRESETS: Record<SizePreset, { maxSide: number; quality: number; label: string }> = {
  original: { maxSide: 0, quality: 0.92, label: 'Original size (largest file)' },
  high: { maxSide: 2400, quality: 0.85, label: 'High — good for printing' },
  medium: { maxSide: 1600, quality: 0.75, label: 'Medium — good for email and uploads' },
  small: { maxSide: 1100, quality: 0.65, label: 'Small — smallest file' },
};

async function loadEntry(file: File): Promise<{ entry: ImageEntry; animated: boolean }> {
  const bytes = await readBytes(file);
  const kind = detectImageKind(bytes);
  if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') throw new Error('not a JPG, PNG or WebP image.');
  const decoded = await decodeImage(file);
  const { width, height } = decoded;
  decoded.release();
  return {
    entry: {
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      width,
      height,
    },
    animated: isAnimatedImage(bytes),
  };
}

export default function ImagesToPdf() {
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [margin, setMargin] = useState(10);
  const [sizePreset, setSizePreset] = useState<SizePreset>('high');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const imagesRef = useRef<ImageEntry[]>([]);
  const runRef = useRef(0);

  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview)), []);

  const processing = progress !== '';

  const handleFiles = useCallback(async (files: File[]) => {
    setErrors([]);
    setNotices([]);
    const added: ImageEntry[] = [];
    const failures: string[] = [];
    const animated: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Reading ${i + 1} of ${files.length}: ${files[i].name}...`);
        try {
          const res = await loadEntry(files[i]);
          added.push(res.entry);
          if (res.animated) animated.push(files[i].name);
        } catch (e) {
          failures.push(`"${files[i].name}": ${errorMessage(e, 'could not be read as an image.')}`);
        }
      }
    } finally {
      setProgress('');
    }
    if (added.length > 0) setImages((prev) => [...prev, ...added]);
    if (failures.length > 0) setErrors(failures);
    if (animated.length > 0) setNotices([`Animated images use their first frame only: ${animated.join(', ')}.`]);
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
    runRef.current += 1;
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setErrors([]);
    setNotices([]);
  };

  const defaultName = images.length > 0 ? baseName(images[0].file.name) : 'images';
  const outputName = `${(fileName.trim() || defaultName).replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_')}.pdf`;

  const generatePdf = useCallback(async () => {
    if (images.length === 0) return;
    const runId = ++runRef.current;
    setErrors([]);
    setNotices([]);
    const preset = SIZE_PRESETS[sizePreset];
    try {
      setProgress('Loading PDF library...');
      const { jsPDF } = await import('jspdf');
      const [pw, ph] = PAGE_SIZES[pageSize];
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [pw, ph], compress: true });
      const pageW = orientation === 'landscape' ? Math.max(pw, ph) : Math.min(pw, ph);
      const pageH = orientation === 'landscape' ? Math.min(pw, ph) : Math.max(pw, ph);

      for (let i = 0; i < images.length; i++) {
        if (runRef.current !== runId) return;
        setProgress(`Adding image ${i + 1} of ${images.length}...`);
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
        } else if ((fitMode === 'fill') === (imgRatio > areaRatio)) {
          drawH = availH;
          drawW = drawH * imgRatio;
        } else {
          drawW = availW;
          drawH = drawW / imgRatio;
        }
        const x = margin + (availW - drawW) / 2;
        const y = margin + (availH - drawH) / 2;

        const scale = preset.maxSide > 0 && Math.max(entry.width, entry.height) > preset.maxSide
          ? preset.maxSide / Math.max(entry.width, entry.height)
          : 1;
        const w = Math.max(1, Math.round(entry.width * scale));
        const h = Math.max(1, Math.round(entry.height * scale));
        const decoded = await decodeImage(entry.file);
        const { canvas, ctx } = createCanvas(w, h);
        try {
          // White first: JPEG has no alpha, and an unfilled canvas encodes transparency as black (FILES-04).
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(decoded.source, 0, 0, w, h);
          const jpeg = await readBytes((await encodeCanvas(canvas, 'image/jpeg', preset.quality)).blob);
          pdf.addImage(jpeg, 'JPEG', x, y, drawW, drawH, undefined, 'NONE');
        } finally {
          decoded.release();
          releaseCanvas(canvas);
        }
        await nextFrame();
      }
      if (runRef.current !== runId) return;
      setProgress('Saving PDF...');
      const bytes = new Uint8Array(pdf.output('arraybuffer'));
      downloadBlob(bytesToBlob(bytes, 'application/pdf'), outputName);
      setNotices([`Saved ${outputName} (${formatBytes(bytes.length)}, ${images.length} page${images.length === 1 ? '' : 's'}).`]);
    } catch (e) {
      setErrors([`PDF generation failed: ${errorMessage(e, 'try removing very large or damaged images and retry.')}`]);
    } finally {
      if (runRef.current === runId) setProgress('');
    }
  }, [images, pageSize, orientation, fitMode, margin, sizePreset, outputName]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['PDF creation cancelled.']);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          acceptLabel="Supports: JPG, PNG, WebP"
          multiple
          onFiles={handleFiles}
          disabled={processing}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-4">
          <div>
            <label htmlFor="pdf-page-size" className="block text-sm font-medium text-neutral-700 mb-1">Page size</label>
            <select
              id="pdf-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
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
                  type="button"
                  key={o}
                  role="radio"
                  aria-checked={orientation === o}
                  onClick={() => setOrientation(o)}
                  className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 capitalize ${
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
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
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
                [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          <div>
            <label htmlFor="pdf-image-size" className="block text-sm font-medium text-neutral-700 mb-1">Image quality and file size</label>
            <select
              id="pdf-image-size"
              value={sizePreset}
              onChange={(e) => setSizePreset(e.target.value as SizePreset)}
              aria-describedby="pdf-image-size-hint"
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              {(Object.keys(SIZE_PRESETS) as SizePreset[]).map((k) => (
                <option key={k} value={k}>{SIZE_PRESETS[k].label}</option>
              ))}
            </select>
            <p id="pdf-image-size-hint" className="text-xs text-neutral-500 mt-1">
              Choose a smaller setting if a portal limits upload size (often 10-20 MB).
            </p>
          </div>

          <div>
            <label htmlFor="pdf-file-name" className="block text-sm font-medium text-neutral-700 mb-1">PDF file name</label>
            <input
              id="pdf-file-name"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={defaultName}
              autoComplete="off"
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            />
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={progress.startsWith('Adding') ? cancel : undefined} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>
        {images.length > 0 ? (
          <>
            <ResultsToolbar
              summary={<><span className="font-semibold">{images.length}</span> image{images.length !== 1 ? 's' : ''} — 1 image per page</>}
              onClear={clearAll}
              busy={processing}
            />

            <ul className="space-y-2">
              {images.map((img, i) => (
                <li key={img.id} className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200/80 shadow-card p-2">
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 transition-colors duration-150"
                      aria-label={`Move ${img.file.name} up`}
                    >
                      <ChevronUp size={20} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 transition-colors duration-150"
                      aria-label={`Move ${img.file.name} down`}
                    >
                      <ChevronDown size={20} aria-hidden="true" />
                    </button>
                  </div>
                  <img src={img.preview} alt={`Page ${i + 1}`} className="w-12 h-12 object-cover rounded-lg bg-neutral-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{img.file.name}</p>
                    <p className="text-xs text-neutral-500">{img.width} × {img.height}px — Page {i + 1}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-red-600 transition-colors duration-150 shrink-0"
                    aria-label={`Remove ${img.file.name}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <input
                ref={addMoreRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) void handleFiles(Array.from(files));
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => addMoreRef.current?.click()}
                disabled={processing}
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 disabled:opacity-50 transition-colors duration-150"
              >
                <Plus size={16} aria-hidden="true" /> Add more
              </button>
              <button
                type="button"
                onClick={generatePdf}
                disabled={processing}
                className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download PDF
              </button>
            </div>
          </>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to combine into a PDF</p>
            <p className="text-xs text-neutral-500 mt-1">One image per page; reorder with the arrow buttons</p>
          </div>
        )}
      </div>
    </div>
  );
}
