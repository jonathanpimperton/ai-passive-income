/**
 * Image Compressor — client-side compression for JPG, PNG and WebP.
 * Batch support, ZIP download. No server upload.
 *
 * Review fixes (FILES-03, FILES-10, FILES-12, FILES-18, FILES-20):
 * - Never returns a bigger file: if re-encoding does not save space, the
 *   original is kept and labelled "already optimised".
 * - Keeps the input format by default. PNGs go through a lossless optimiser
 *   (palette/grey/RGB, best filters, maximum zlib) and, below 100% quality,
 *   optional colour reduction to 256 colours that keeps transparency and is
 *   only used when the measured difference stays under a visibility threshold.
 *   No silent PNG-to-JPG conversion; WebP keeps its transparency.
 * - Format changes are an explicit choice, with a warning when transparency
 *   would be lost.
 * - Changing a setting re-compresses the uploaded images automatically.
 * - Per-file error messages; cancel; optional "date taken" for JPG output.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, baseName } from '../../lib/file-tools/names';
import { detectImageKind, isAnimatedImage } from '../../lib/file-tools/image-sniff';
import {
  encodePngLossless, encodePngIndexed, quantizeRgba, expandIndexed, psnr, psnrGateForQuality,
} from '../../lib/file-tools/png-encode';
import { readCaptureDate, writeJpegCaptureDate } from '../../lib/file-tools/exif-date';
import { keepOriginalWithoutMetadata } from '../../lib/file-tools/strip-metadata';
import { buildZip } from '../../lib/file-tools/zip';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, bytesToBlob, errorMessage,
  nextFrame, extensionForType, labelForType, revealOnSmallScreens,
} from '../../lib/file-tools/browser';

type OutputChoice = 'same' | 'image/jpeg' | 'image/webp' | 'image/png';

interface Settings {
  quality: number;
  maxWidth: number;
  output: OutputChoice;
  keepDate: boolean;
}

interface Source {
  id: string;
  file: File;
}

interface CompressedFile {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  preview: string;
  type: string;
  keptOriginal: boolean;
  notes: string[];
}

/** Largest image (pixels) we run the JavaScript PNG optimiser on; bigger ones use the browser encoder. */
const PNG_OPTIMISER_MAX_PIXELS = 16_000_000;

const FIRST_FRAME_NOTE = 'Animated image: only the first frame is kept.';

function mimeForKind(kind: string): string | null {
  if (kind === 'jpeg') return 'image/jpeg';
  if (kind === 'png') return 'image/png';
  if (kind === 'webp') return 'image/webp';
  return null;
}

function hasAlpha(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

async function encodePng(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, quality: number): Promise<Blob> {
  const { width, height } = canvas;
  if (width * height > PNG_OPTIMISER_MAX_PIXELS) return (await encodeCanvas(canvas, 'image/png')).blob;
  const rgba = ctx.getImageData(0, 0, width, height).data;
  await nextFrame();
  let best = encodePngLossless(rgba, width, height);
  if (quality < 100) {
    await nextFrame();
    const q = quantizeRgba(rgba, width, height, 256, 0);
    if (psnr(rgba, expandIndexed(q, width * height)) >= psnrGateForQuality(quality)) {
      const reduced = encodePngIndexed(q.palette, q.indices, width, height);
      if (reduced.length < best.length) best = reduced;
    }
  }
  return bytesToBlob(best, 'image/png');
}

async function compressOne(file: File, s: Settings): Promise<CompressedFile> {
  const bytes = await readBytes(file);
  const kind = detectImageKind(bytes);
  const inputType = mimeForKind(kind);
  if (!inputType) throw new Error(`"${file.name}" is not a JPG, PNG or WebP image.`);
  const notes: string[] = [];
  const animated = isAnimatedImage(bytes);
  if (animated) notes.push(FIRST_FRAME_NOTE);

  const decoded = await decodeImage(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    const scale = s.maxWidth > 0 && decoded.width > s.maxWidth ? s.maxWidth / decoded.width : 1;
    const w = Math.max(1, Math.round(decoded.width * scale));
    const h = Math.max(1, Math.round(decoded.height * scale));
    const made = createCanvas(w, h);
    canvas = made.canvas;
    const ctx = made.ctx;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, w, h);
    decoded.release();

    let target = s.output === 'same' ? inputType : s.output;
    let blob: Blob;
    if (target === 'image/jpeg') {
      if (inputType !== 'image/jpeg' && hasAlpha(ctx.getImageData(0, 0, w, h).data)) {
        notes.push('Transparent areas were filled with white (JPG has no transparency).');
      }
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      blob = (await encodeCanvas(canvas, 'image/jpeg', s.quality / 100)).blob;
      if (s.keepDate) {
        const date = readCaptureDate(bytes);
        if (date) blob = bytesToBlob(writeJpegCaptureDate(await readBytes(blob), date), 'image/jpeg');
      }
    } else if (target === 'image/webp') {
      const enc = await encodeCanvas(canvas, 'image/webp', s.quality / 100);
      blob = enc.blob;
      if (enc.fellBack) {
        // Safari cannot encode WebP and silently returns PNG (FILES-20).
        target = 'image/png';
        blob = await encodePng(canvas, ctx, s.quality);
        notes.push('This browser cannot create WebP files, so the result was saved as PNG.');
      }
    } else {
      blob = await encodePng(canvas, ctx, s.quality);
    }

    const changedSize = scale !== 1;
    const changedFormat = target !== inputType;
    let keptOriginal = false;
    if (!changedSize && !changedFormat) {
      // Never hand back a bigger file (FILES-03) - but never hand back the
      // original's metadata either: strip Exif/GPS/XMP/text without re-encoding.
      // A photo taken sideways shows upright only because of its Orientation tag,
      // which the strip removes with the rest of the Exif; keepOriginalWithoutMetadata
      // keeps the kept file the same way round as the input (see strip-metadata.ts).
      const { bytes: original, needsUpright } = keepOriginalWithoutMetadata(bytes, s.keepDate);
      if (original && blob.size >= original.length) {
        blob = bytesToBlob(original, inputType);
        target = inputType;
        keptOriginal = true;
        if (animated) {
          // The kept file still has every frame, so the first-frame note would be untrue.
          notes.splice(notes.indexOf(FIRST_FRAME_NOTE), 1);
          notes.unshift('Already optimised: no smaller version at these settings, so your original animated image is kept (all frames), with location and other metadata removed.');
        } else {
          notes.unshift('Already optimised: no smaller version at these settings, so your original image is kept, with location and other metadata removed.');
        }
      } else if (!original && blob.size >= file.size) {
        notes.push(needsUpright
          ? 'This copy is slightly larger than the original: re-encoding was needed to keep the photo the right way up while removing its metadata.'
          : 'This copy is slightly larger than the original: re-encoding was the only safe way to remove its metadata.');
      }
    }
    if (!keptOriginal && blob.size > file.size && (changedSize || changedFormat)) {
      notes.push(`This is larger than the original because of the ${changedFormat ? 'format change' : 'settings'}.`);
    }
    return {
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: keptOriginal ? file.name : `${baseName(file.name)}_compressed${extensionForType(target)}`,
      originalSize: file.size,
      compressedSize: blob.size,
      blob,
      preview: URL.createObjectURL(blob),
      type: target,
      keptOriginal,
      notes,
    };
  } finally {
    decoded.release();
    if (canvas) releaseCanvas(canvas);
  }
}

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(0);
  const [output, setOutput] = useState<OutputChoice>('same');
  const [keepDate, setKeepDate] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [results, setResults] = useState<CompressedFile[]>([]);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef(0);
  const resultsRef = useRef<CompressedFile[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const firstSettings = useRef(true);

  resultsRef.current = results;
  useEffect(() => () => resultsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const processing = progress !== '';

  /** Compress `list` with `settings`; replaces all results (settings change) or appends (new files). */
  const run = useCallback(async (list: Source[], settings: Settings, replace: boolean) => {
    const runId = ++runRef.current;
    setNotices([]);
    const produced: CompressedFile[] = [];
    const failures: string[] = [];
    for (let i = 0; i < list.length; i++) {
      if (runRef.current !== runId) { produced.forEach((r) => URL.revokeObjectURL(r.preview)); return; }
      setProgress(`Compressing ${i + 1} of ${list.length}: ${list[i].file.name}...`);
      try {
        produced.push(await compressOne(list[i].file, settings));
      } catch (e) {
        failures.push(`"${list[i].file.name}": ${errorMessage(e, 'could not be compressed.')}`);
      }
      await nextFrame();
    }
    if (runRef.current !== runId) { produced.forEach((r) => URL.revokeObjectURL(r.preview)); return; }
    if (replace) {
      resultsRef.current.forEach((r) => URL.revokeObjectURL(r.preview));
      setResults(produced);
    } else {
      setResults((prev) => [...prev, ...produced]);
    }
    setErrors(failures);
    setProgress('');
    if (produced.length > 0) requestAnimationFrame(() => revealOnSmallScreens(outputRef.current));
  }, []);

  const settings: Settings = { quality, maxWidth, output, keepDate };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const handleFiles = useCallback((files: File[]) => {
    const added = files.map((file) => ({ id: `${file.name}-${Math.random().toString(36).slice(2)}`, file }));
    setSources((prev) => [...prev, ...added]);
    setErrors([]);
    void run(added, settingsRef.current, false);
  }, [run]);

  // Changing a setting re-compresses everything already uploaded (FILES-10).
  useEffect(() => {
    if (firstSettings.current) { firstSettings.current = false; return; }
    if (sources.length === 0) return;
    const t = window.setTimeout(() => void run(sources, settingsRef.current, true), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, maxWidth, output, keepDate]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Compression cancelled. Earlier results are kept below.']);
  };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries = await Promise.all(results.map(async (r) => ({ name: r.name, data: await readBytes(r.blob) })));
      downloadBlob(bytesToBlob(buildZip(entries), 'application/zip'), 'compressed-images.zip');
    } catch (e) {
      setErrors([errorMessage(e, 'The ZIP file could not be created.')]);
    } finally {
      setZipping(false);
    }
  };

  const clearAll = () => {
    runRef.current += 1;
    results.forEach((r) => URL.revokeObjectURL(r.preview));
    setResults([]);
    setSources([]);
    setProgress('');
    setErrors([]);
    setNotices([]);
  };

  const totalSaved = results.reduce((sum, r) => sum + Math.max(0, r.originalSize - r.compressedSize), 0);
  const pngHint = output === 'image/png' || output === 'same';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings column */}
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          acceptLabel="Supports: JPG, PNG, WebP"
          multiple
          onFiles={handleFiles}
          disabled={processing}
        />
        <div className="space-y-4 bg-white rounded-lg border border-neutral-200/80 p-5">
          <div>
            <label htmlFor="compress-format" className="block text-sm font-medium text-neutral-700 mb-1">Output format</label>
            <select
              id="compress-format"
              value={output}
              onChange={(e) => setOutput(e.target.value as OutputChoice)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              <option value="same">Same as original (recommended)</option>
              <option value="image/jpeg">JPG (smallest for photos; no transparency)</option>
              <option value="image/webp">WebP (small; keeps transparency)</option>
              <option value="image/png">PNG (lossless graphics; keeps transparency)</option>
            </select>
            {output === 'image/jpeg' && (
              <p className="text-xs text-neutral-500 mt-1">Transparent areas in PNG or WebP images will become white.</p>
            )}
          </div>
          <SliderInput
            label="Quality"
            id="quality"
            value={quality}
            min={10}
            max={100}
            step={5}
            onChange={setQuality}
            suffix="%"
            minLabel="10%"
            maxLabel="100%"
            hint={pngHint
              ? 'Lower = smaller file. For PNG, 100% is lossless; lower allows reducing to 256 colours where the difference is not visible.'
              : 'Lower = smaller file, more compression artifacts'}
          />
          <SliderInput
            label="Max width (0 = no resize)"
            id="maxWidth"
            value={maxWidth}
            min={0}
            max={4000}
            step={100}
            onChange={setMaxWidth}
            suffix="px"
            minLabel="Original"
            maxLabel="4000px"
            hint="Resize wider images down to this width"
          />
          <label className="flex items-start gap-3 text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={keepDate}
              onChange={(e) => setKeepDate(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-neutral-300 accent-primary-600"
            />
            <span>
              Keep the date a photo was taken (JPG output)
              <span className="block text-xs text-neutral-500 mt-0.5">Location (GPS) and other metadata are always removed.</span>
            </span>
          </label>
        </div>
      </div>

      {/* Output column */}
      <div ref={outputRef} className="lg:col-span-3 space-y-4 scroll-mt-24">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={cancel} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {results.length > 0 && (
          <>
            <ResultsToolbar
              summary={
                <>
                  <span className="font-semibold text-neutral-900">{results.length}</span> file{results.length !== 1 ? 's' : ''} compressed
                  {totalSaved > 0 && <span className="ml-2 text-success-600 font-medium">— saved {formatBytes(totalSaved)}</span>}
                </>
              }
              onDownloadAll={results.length > 1 ? downloadAll : undefined}
              onClear={clearAll}
              busy={zipping || processing}
            />

            <ul className="space-y-3">
              {results.map((file) => {
                const savings = file.originalSize - file.compressedSize;
                const pct = file.originalSize > 0 ? Math.round((savings / file.originalSize) * 100) : 0;
                return (
                  <li key={file.id} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                    <img
                      src={file.preview}
                      alt={`Compressed preview of ${file.name}`}
                      className="w-14 h-14 object-cover rounded-lg bg-neutral-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {labelForType(file.type)} · {formatBytes(file.originalSize)} → {formatBytes(file.compressedSize)}
                        {file.keptOriginal
                          ? <span className="ml-1 text-neutral-600 font-medium">(original kept)</span>
                          : pct > 0
                            ? <span className="ml-1 text-success-600 font-medium">(-{pct}%)</span>
                            : <span className="ml-1 text-neutral-600 font-medium">(+{Math.abs(pct)}%)</span>}
                      </p>
                      {file.notes.map((n, i) => <p key={i} className="text-xs text-neutral-500 mt-0.5">{n}</p>)}
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBlob(file.blob, file.name)}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150 shrink-0"
                      aria-label={`Download ${file.name}`}
                    >
                      <Download size={16} aria-hidden="true" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!processing && results.length === 0 && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to compress them</p>
            <p className="text-xs text-neutral-500 mt-1">Change any setting afterwards and they are re-compressed</p>
          </div>
        )}
      </div>
    </div>
  );
}
