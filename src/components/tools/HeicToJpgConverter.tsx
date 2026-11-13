/**
 * HEIC to JPG Converter — converts iPhone HEIC photos to JPG in the browser.
 *
 * Decoding: Safari decodes HEIC natively (createImageBitmap). Every other
 * browser uses the CSP-safe build of heic-to ('heic-to/csp', libheif compiled
 * to JavaScript, run in a blob: worker). The default heic-to build needs
 * 'unsafe-eval' and was blocked by the production CSP for eight months
 * (review FILES-01, S1-12); the /tools/file-tools/heic-to-jpg/ route in
 * public/_headers adds `worker-src 'self' blob:` for this build.
 *
 * Batch support, ZIP download, optional "date taken" preservation (location
 * is always removed), re-convert with new settings, cancel. No upload.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon, RefreshCw } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, withExtension, plural } from '../../lib/file-tools/names';
import { readCaptureDate, writeJpegCaptureDate } from '../../lib/file-tools/exif-date';
import { buildZip } from '../../lib/file-tools/zip';
import {
  createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, errorMessage, revealOnSmallScreens, bytesToBlob,
} from '../../lib/file-tools/browser';

interface ConvertedFile {
  id: string;
  name: string;
  originalSize: number;
  convertedSize: number;
  blob: Blob;
  preview: string;
  dateKept: boolean;
  settings: Settings;
}

interface Settings {
  quality: number;
  keepDate: boolean;
}

type HeicModule = typeof import('heic-to/csp');
let decoderPromise: Promise<HeicModule> | null = null;
/** Load the HEIC decoder once (about 2.7 MB); a failed load can be retried. */
function loadDecoder(): Promise<HeicModule> {
  if (!decoderPromise) {
    decoderPromise = import('heic-to/csp').catch((e: unknown) => {
      decoderPromise = null;
      throw e;
    });
  }
  return decoderPromise;
}

/** Decode with the browser first (Safari), then with heic-to. */
async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    // No native HEIC support (Chrome, Edge, Firefox, Android): use heic-to below.
  }
  let mod: HeicModule;
  try {
    mod = await loadDecoder();
  } catch {
    throw new Error('The HEIC decoder could not be loaded. Check your internet connection and try again.');
  }
  try {
    return await mod.heicTo({ blob: file, type: 'bitmap' });
  } catch {
    throw new Error(`"${file.name}" could not be decoded. It may be damaged, not a HEIC photo, or use a HEIC variant this decoder does not support.`);
  }
}

async function convertOne(file: File, settings: Settings): Promise<ConvertedFile> {
  const bitmap = await decodeToBitmap(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    const made = createCanvas(bitmap.width, bitmap.height);
    canvas = made.canvas;
    made.ctx.drawImage(bitmap, 0, 0);
    const encoded = await encodeCanvas(canvas, 'image/jpeg', settings.quality / 100);
    let blob = encoded.blob;
    let dateKept = false;
    if (settings.keepDate) {
      const date = readCaptureDate(await readBytes(file));
      if (date) {
        const withDate = writeJpegCaptureDate(await readBytes(blob), date);
        blob = bytesToBlob(withDate, 'image/jpeg');
        dateKept = true;
      }
    }
    return {
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: withExtension(file.name, '.jpg'),
      originalSize: file.size,
      convertedSize: blob.size,
      blob,
      preview: URL.createObjectURL(blob),
      dateKept,
      settings,
    };
  } finally {
    bitmap.close();
    if (canvas) releaseCanvas(canvas);
  }
}

export default function HeicToJpgConverter() {
  const [quality, setQuality] = useState(85);
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

  resultsRef.current = results;
  useEffect(() => () => resultsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const processing = progress !== '';

  const run = useCallback(async (files: File[], settings: Settings, replace: boolean) => {
    const runId = ++runRef.current;
    setErrors([]);
    setNotices([]);
    if (replace) {
      resultsRef.current.forEach((r) => URL.revokeObjectURL(r.preview));
      setResults([]);
    }
    const failures: string[] = [];
    let done = 0;
    for (const f of files) {
      if (runRef.current !== runId) break;
      setProgress(`Converting ${done + 1} of ${files.length}: ${f.name}...`);
      try {
        const converted = await convertOne(f, settings);
        if (runRef.current !== runId) { URL.revokeObjectURL(converted.preview); break; }
        setResults((prev) => [...prev, converted]);
      } catch (e) {
        failures.push(errorMessage(e, `"${f.name}" could not be converted.`));
      }
      done += 1;
    }
    if (runRef.current === runId) {
      setProgress('');
      if (failures.length > 0) setErrors(failures);
      requestAnimationFrame(() => revealOnSmallScreens(outputRef.current));
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    setSources((prev) => [...prev, ...files]);
    void run(files, { quality, keepDate }, false);
  }, [run, quality, keepDate]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Conversion cancelled. Files already converted are kept below.']);
  };

  const reconvert = () => void run(sources, { quality, keepDate }, true);

  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries = await Promise.all(results.map(async (r) => ({ name: r.name, data: await readBytes(r.blob) })));
      downloadBlob(bytesToBlob(buildZip(entries), 'application/zip'), 'converted-photos.zip');
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

  const stale = !processing && sources.length > 0 &&
    results.some((r) => r.settings.quality !== quality || r.settings.keepDate !== keepDate);
  const keptDates = results.filter((r) => r.dateKept).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".heic,.heif,image/heic,image/heif"
          acceptLabel="Supports: HEIC, HEIF (iPhone photos)"
          multiple
          onFiles={handleFiles}
          disabled={processing}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 p-5 space-y-4">
          <SliderInput
            label="JPG Quality"
            id="heic-quality"
            value={quality}
            min={10}
            max={100}
            step={5}
            onChange={setQuality}
            suffix="%"
            minLabel="10%"
            maxLabel="100%"
            hint="Higher = better quality, larger file"
          />
          <label className="flex items-start gap-3 text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={keepDate}
              onChange={(e) => setKeepDate(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-neutral-300 accent-primary-600"
            />
            <span>
              Keep the date the photo was taken
              <span className="block text-xs text-neutral-500 mt-0.5">Location (GPS) and all other metadata are always removed.</span>
            </span>
          </label>
        </div>
      </div>

      <div ref={outputRef} className="lg:col-span-3 space-y-4 scroll-mt-24">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={cancel} />}
          <ToolMessages errors={errors} notices={notices} />
          {stale && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-700">
              <span>Settings changed since these files were converted.</span>
              <button
                type="button"
                onClick={reconvert}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-150"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Re-convert {plural(sources.length, 'photo')}
              </button>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <>
            <ResultsToolbar
              summary={
                <>
                  <span className="font-semibold text-neutral-900">{results.length}</span> {results.length === 1 ? 'file' : 'files'} converted
                  {keepDate && keptDates > 0 && <span className="block text-xs text-neutral-500">Date taken kept on {keptDates} of {results.length}</span>}
                </>
              }
              onDownloadAll={results.length > 1 ? downloadAll : undefined}
              busy={zipping || processing}
              onClear={clearAll}
            />
            <ul className="space-y-3">
              {results.map((file) => (
                <li key={file.id} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                  <img src={file.preview} alt={`Converted preview of ${file.name}`} className="w-14 h-14 object-cover rounded-lg bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatBytes(file.originalSize)} → {formatBytes(file.convertedSize)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadBlob(file.blob, file.name)}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
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
            <p className="text-sm text-neutral-500">Upload HEIC files from your iPhone</p>
            <p className="text-xs text-neutral-500 mt-1">They are converted to JPG on this device</p>
          </div>
        )}
      </div>
    </div>
  );
}
