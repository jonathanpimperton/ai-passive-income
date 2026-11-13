/**
 * Image Format Converter — convert between PNG, JPG and WebP in the browser.
 * Batch support, ZIP download. No server upload.
 *
 * Review fixes: changing the target format or quality re-converts the
 * uploaded files (FILES-10); per-file errors and cancel (FILES-12); WebP is
 * checked after encoding because Safari silently returns PNG (FILES-20);
 * PNG output uses a lossless optimiser instead of the browser's 32-bit
 * encoder; optional "date taken" for JPG output (FILES-18); animated images
 * are flagged (only the first frame is converted, FILES-23).
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon, ArrowRight } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, withExtension } from '../../lib/file-tools/names';
import { detectImageKind, isAnimatedImage } from '../../lib/file-tools/image-sniff';
import { encodePngLossless } from '../../lib/file-tools/png-encode';
import { readCaptureDate, writeJpegCaptureDate } from '../../lib/file-tools/exif-date';
import { buildZip } from '../../lib/file-tools/zip';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, bytesToBlob, errorMessage,
  nextFrame, extensionForType, labelForType, revealOnSmallScreens,
} from '../../lib/file-tools/browser';

const FORMATS = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
] as const;

type FormatValue = (typeof FORMATS)[number]['value'];

interface Settings {
  target: FormatValue;
  quality: number;
  keepDate: boolean;
}

interface ConvertedFile {
  id: string;
  name: string;
  originalSize: number;
  convertedSize: number;
  blob: Blob;
  preview: string;
  fromFormat: string;
  toFormat: string;
  notes: string[];
}

const PNG_OPTIMISER_MAX_PIXELS = 16_000_000;

async function convertOne(file: File, s: Settings): Promise<ConvertedFile> {
  const bytes = await readBytes(file);
  const kind = detectImageKind(bytes);
  if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') throw new Error('not a JPG, PNG or WebP image.');
  const notes: string[] = [];
  if (isAnimatedImage(bytes)) notes.push('Animated image: only the first frame was converted.');
  const decoded = await decodeImage(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    const made = createCanvas(decoded.width, decoded.height);
    canvas = made.canvas;
    const ctx = made.ctx;
    if (s.target === 'image/jpeg') {
      // White background: JPG has no alpha channel.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(decoded.source, 0, 0);
    decoded.release();

    let type: string = s.target;
    let blob: Blob;
    if (s.target === 'image/png') {
      blob = canvas.width * canvas.height <= PNG_OPTIMISER_MAX_PIXELS
        ? bytesToBlob(encodePngLossless(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height), 'image/png')
        : (await encodeCanvas(canvas, 'image/png')).blob;
    } else {
      const enc = await encodeCanvas(canvas, s.target, s.quality / 100);
      blob = enc.blob;
      if (enc.fellBack) {
        type = enc.type;
        notes.push(`This browser cannot create ${labelForType(s.target)} files, so the result was saved as ${labelForType(type)}.`);
      }
      if (type === 'image/jpeg' && s.keepDate) {
        const date = readCaptureDate(bytes);
        if (date) blob = bytesToBlob(writeJpegCaptureDate(await readBytes(blob), date), 'image/jpeg');
      }
    }
    return {
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: withExtension(file.name, extensionForType(type) || '.png'),
      originalSize: file.size,
      convertedSize: blob.size,
      blob,
      preview: URL.createObjectURL(blob),
      fromFormat: labelForType(`image/${kind}`),
      toFormat: labelForType(type),
      notes,
    };
  } finally {
    decoded.release();
    if (canvas) releaseCanvas(canvas);
  }
}

export default function ImageFormatConverter() {
  const [targetFormat, setTargetFormat] = useState<FormatValue>('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [keepDate, setKeepDate] = useState(true);
  const [sources, setSources] = useState<File[]>([]);
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef(0);
  const resultsRef = useRef<ConvertedFile[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const firstSettings = useRef(true);

  resultsRef.current = results;
  useEffect(() => () => resultsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const processing = progress !== '';
  const settingsRef = useRef<Settings>({ target: targetFormat, quality, keepDate });
  settingsRef.current = { target: targetFormat, quality, keepDate };

  const run = useCallback(async (list: File[], settings: Settings, replace: boolean) => {
    const runId = ++runRef.current;
    setNotices([]);
    const produced: ConvertedFile[] = [];
    const failures: string[] = [];
    for (let i = 0; i < list.length; i++) {
      if (runRef.current !== runId) { produced.forEach((r) => URL.revokeObjectURL(r.preview)); return; }
      setProgress(`Converting ${i + 1} of ${list.length}: ${list[i].name}...`);
      try {
        produced.push(await convertOne(list[i], settings));
      } catch (e) {
        failures.push(`"${list[i].name}": ${errorMessage(e, 'could not be converted.')}`);
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

  const handleFiles = useCallback((files: File[]) => {
    setSources((prev) => [...prev, ...files]);
    setErrors([]);
    void run(files, settingsRef.current, false);
  }, [run]);

  // Re-convert everything when the target format or quality changes (FILES-10).
  useEffect(() => {
    if (firstSettings.current) { firstSettings.current = false; return; }
    if (sources.length === 0) return;
    const t = window.setTimeout(() => void run(sources, settingsRef.current, true), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFormat, quality, keepDate]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Conversion cancelled. Earlier results are kept below.']);
  };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries = await Promise.all(results.map(async (r) => ({ name: r.name, data: await readBytes(r.blob) })));
      downloadBlob(bytesToBlob(buildZip(entries), 'application/zip'), 'converted-images.zip');
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
        <div className="bg-white rounded-lg border border-neutral-200/80 p-5 space-y-4">
          <div>
            <label htmlFor="target-format" className="block text-sm font-medium text-neutral-700 mb-1">Convert to</label>
            <select
              id="target-format"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as FormatValue)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {targetFormat === 'image/jpeg' && (
              <p className="text-xs text-neutral-500 mt-1">Transparent areas become white (JPG has no transparency).</p>
            )}
          </div>
          {targetFormat !== 'image/png' && (
            <SliderInput
              label="Quality"
              id="fmt-quality"
              value={quality}
              min={10}
              max={100}
              step={5}
              onChange={setQuality}
              suffix="%"
              minLabel="10%"
              maxLabel="100%"
            />
          )}
          {targetFormat === 'image/jpeg' && (
            <label className="flex items-start gap-3 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={keepDate}
                onChange={(e) => setKeepDate(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-neutral-300 accent-primary-600"
              />
              <span>
                Keep the date a photo was taken
                <span className="block text-xs text-neutral-500 mt-0.5">Location (GPS) and other metadata are always removed.</span>
              </span>
            </label>
          )}
        </div>
      </div>

      <div ref={outputRef} className="lg:col-span-3 space-y-4 scroll-mt-24">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={cancel} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {results.length > 0 && (
          <>
            <ResultsToolbar
              summary={<><span className="font-semibold text-neutral-900">{results.length}</span> file{results.length !== 1 ? 's' : ''} converted</>}
              onDownloadAll={results.length > 1 ? downloadAll : undefined}
              onClear={clearAll}
              busy={zipping || processing}
            />
            <ul className="space-y-3">
              {results.map((file) => (
                <li key={file.id} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                  <img src={file.preview} alt={`Converted preview of ${file.name}`} className="w-14 h-14 object-cover rounded-lg bg-neutral-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                      {file.fromFormat} <ArrowRight size={12} aria-hidden="true" /> {file.toFormat}
                      <span className="text-neutral-500 ml-1">
                        {formatBytes(file.originalSize)} → {formatBytes(file.convertedSize)}
                      </span>
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
              ))}
            </ul>
          </>
        )}

        {!processing && results.length === 0 && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to convert them</p>
            <p className="text-xs text-neutral-500 mt-1">Change the format afterwards and they are converted again</p>
          </div>
        )}
      </div>
    </div>
  );
}
