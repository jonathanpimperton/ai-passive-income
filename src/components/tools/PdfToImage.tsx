/**
 * PDF to Image — convert PDF pages to JPG/PNG using pdfjs-dist + Canvas.
 * Client-side only. No server upload.
 *
 * Review fixes:
 * - One shared pdf.js worker for the page and documents destroyed after use,
 *   instead of two new workers (each holding a copy of the PDF) per upload
 *   (FILES-15).
 * - wasm, CMap and standard-font locations are configured, so JPEG 2000
 *   images and PDFs without embedded fonts render instead of coming out blank
 *   (FILES-13).
 * - Password-protected PDFs get a password prompt (FILES-23).
 * - "Download all" saves one ZIP instead of hundreds of separate downloads
 *   (FILES-09); per-page failures are reported, and conversion can be
 *   cancelled (FILES-12).
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, FileText, Image as ImageIcon, Lock } from 'lucide-react';
import type { PDFDocumentProxy, PDFWorker } from 'pdfjs-dist';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, baseName, plural } from '../../lib/file-tools/names';
import { buildZip } from '../../lib/file-tools/zip';
import {
  createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, errorMessage, nextFrame, revealOnSmallScreens, bytesToBlob,
} from '../../lib/file-tools/browser';

interface PageImage {
  pageNum: number;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
  ext: string;
}

type OutputFormat = 'image/jpeg' | 'image/png';
type PdfJs = typeof import('pdfjs-dist');

const PDFJS_ASSETS = {
  wasmUrl: '/pdfjs/wasm/',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  iccUrl: '/pdfjs/iccs/',
  isEvalSupported: false,
};

let pdfjsPromise: Promise<PdfJs> | null = null;
let sharedWorker: PDFWorker | null = null;

/** Load pdf.js once and create the single worker every document shares. */
async function getPdfJs(): Promise<{ pdfjs: PdfJs; worker: PDFWorker }> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').catch((e: unknown) => {
      pdfjsPromise = null;
      throw e;
    });
  }
  const pdfjs = await pdfjsPromise;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  if (!sharedWorker || sharedWorker.destroyed) sharedWorker = new pdfjs.PDFWorker();
  return { pdfjs, worker: sharedWorker };
}

function isPasswordError(e: unknown): e is { name: string; code?: number } {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'PasswordException';
}

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [images, setImages] = useState<PageImage[]>([]);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [passwordFor, setPasswordFor] = useState<{ file: File; bytes: Uint8Array; wrong: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [zipping, setZipping] = useState(false);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const imagesRef = useRef<PageImage[]>([]);
  const runRef = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);

  imagesRef.current = images;
  const processing = progress !== '';

  const closeDoc = useCallback(() => {
    const doc = docRef.current;
    docRef.current = null;
    if (doc) void doc.destroy();
  }, []);

  const clearImages = useCallback(() => {
    imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  }, []);

  useEffect(() => () => {
    imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    const doc = docRef.current;
    if (doc) void doc.destroy();
  }, []);

  const openPdf = useCallback(async (f: File, bytes: Uint8Array, pass?: string) => {
    runRef.current += 1;
    setErrors([]);
    setNotices([]);
    closeDoc();
    clearImages();
    setProgress('Reading PDF...');
    try {
      const { pdfjs, worker } = await getPdfJs();
      // pdf.js transfers the buffer to its worker, so always hand it a copy.
      const task = pdfjs.getDocument({ data: bytes.slice(), password: pass, worker, ...PDFJS_ASSETS });
      try {
        docRef.current = await task.promise;
      } catch (e) {
        void task.destroy();
        throw e;
      }
      setPasswordFor(null);
      setPassword('');
      setFile(f);
      setPageCount(docRef.current.numPages);
    } catch (e) {
      if (isPasswordError(e)) {
        setFile(null);
        setPasswordFor({ file: f, bytes, wrong: pass !== undefined });
      } else {
        setFile(null);
        setErrors([`Could not read "${f.name}". It may be damaged or not a PDF file.`]);
      }
    } finally {
      setProgress('');
    }
  }, [closeDoc, clearImages]);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setPasswordFor(null);
    setPassword('');
    // Busy from the moment a file is chosen, not once it has been read: until then the previous
    // PDF's Convert button stayed live, and a click started a run that openPdf() then tore down.
    setProgress('Reading PDF...');
    let bytes: Uint8Array;
    try {
      bytes = await readBytes(f);
    } catch (e) {
      setProgress('');
      setErrors([errorMessage(e, `Could not read "${f.name}".`)]);
      return;
    }
    await openPdf(f, bytes); // never throws; clears the busy state itself
  }, [openPdf]);

  const convert = useCallback(async () => {
    const doc = docRef.current;
    if (!file || !doc) return;
    const runId = ++runRef.current;
    setErrors([]);
    setNotices([]);
    clearImages();
    const ext = format === 'image/jpeg' ? '.jpg' : '.png';
    const failures: string[] = [];
    let produced = 0;
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        if (runRef.current !== runId) return;
        setProgress(`Rendering page ${i} of ${doc.numPages}...`);
        let canvas: HTMLCanvasElement | null = null;
        try {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const made = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          canvas = made.canvas;
          if (format === 'image/jpeg') {
            made.ctx.fillStyle = '#FFFFFF';
            made.ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          await page.render({ canvas, canvasContext: made.ctx, viewport }).promise;
          page.cleanup();
          const encoded = await encodeCanvas(canvas, format, format === 'image/jpeg' ? quality / 100 : undefined);
          if (runRef.current !== runId) return;
          const img: PageImage = {
            pageNum: i,
            blob: encoded.blob,
            preview: URL.createObjectURL(encoded.blob),
            width: canvas.width,
            height: canvas.height,
            ext,
          };
          produced += 1;
          setImages((prev) => [...prev, img]);
        } catch (e) {
          failures.push(`Page ${i}: ${errorMessage(e, 'could not be rendered.')}`);
        } finally {
          if (canvas) releaseCanvas(canvas);
        }
        if (i % 5 === 0) await nextFrame();
      }
      if (runRef.current !== runId) return; // cancelled, or a new PDF was opened: these results are stale
      if (failures.length > 0) setErrors(failures);
      if (produced > 0) requestAnimationFrame(() => revealOnSmallScreens(outputRef.current));
    } finally {
      if (runRef.current === runId) setProgress('');
    }
  }, [file, scale, format, quality, clearImages]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Conversion cancelled. Pages already converted are kept below.']);
  };

  const nameFor = (img: PageImage) => `${baseName(file?.name ?? 'page')}_p${img.pageNum}${img.ext}`;

  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries = await Promise.all(images.map(async (img) => ({ name: nameFor(img), data: await readBytes(img.blob) })));
      downloadBlob(bytesToBlob(buildZip(entries), 'application/zip'), `${baseName(file?.name ?? 'pages')}_images.zip`);
    } catch (e) {
      setErrors([errorMessage(e, 'The ZIP file could not be created.')]);
    } finally {
      setZipping(false);
    }
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordFor) void openPdf(passwordFor.file, passwordFor.bytes, password);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
          disabled={processing}
        />

        {passwordFor && (
          <form onSubmit={submitPassword} className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <Lock size={16} aria-hidden="true" /> "{passwordFor.file.name}" is password-protected
            </div>
            <label htmlFor="pdf-password" className="block text-sm text-neutral-700">Password</label>
            <input
              id="pdf-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="pdf-password-note"
              aria-invalid={passwordFor.wrong || undefined}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            />
            {passwordFor.wrong && <p className="text-xs text-red-700" role="alert">That password is not correct. Try again.</p>}
            <p id="pdf-password-note" className="text-xs text-neutral-500">The password is only used in this browser to open the file.</p>
            <button
              type="submit"
              disabled={processing || password === ''}
              className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              Open PDF
            </button>
          </form>
        )}

        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{plural(pageCount, 'page')}</p>
              </div>
            </div>

            <div>
              <label htmlFor="img-format" className="block text-sm font-medium text-neutral-700 mb-1">Output format</label>
              <select
                id="img-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as OutputFormat)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
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
              type="button"
              onClick={convert}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              <ImageIcon size={16} aria-hidden="true" />
              {images.length > 0 ? 'Convert again' : `Convert to ${format === 'image/jpeg' ? 'JPG' : 'PNG'}`}
            </button>
          </div>
        )}
      </div>

      <div ref={outputRef} className="lg:col-span-3 space-y-4 scroll-mt-24">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={progress.startsWith('Rendering') ? cancel : undefined} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {images.length > 0 && (
          <>
            <ResultsToolbar
              summary={<><span className="font-semibold text-neutral-900">{images.length}</span> page{images.length !== 1 ? 's' : ''} converted</>}
              onDownloadAll={images.length > 1 ? downloadAll : undefined}
              onClear={clearImages}
              clearLabel="Clear"
              busy={zipping || processing}
            />
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <li key={img.pageNum} className="bg-white rounded-xl border border-neutral-200/80 shadow-card overflow-hidden">
                  <img src={img.preview} alt={`Page ${img.pageNum}`} className="w-full aspect-[3/4] object-cover bg-neutral-100" />
                  <div className="p-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-900">Page {img.pageNum}</p>
                      <p className="text-xs text-neutral-500">{formatBytes(img.blob.size)}</p>
                    </div>
                    <button type="button" onClick={() => downloadBlob(img.blob, nameFor(img))} className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-neutral-50 transition-colors duration-150" aria-label={`Download page ${img.pageNum}`}>
                      <Download size={18} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {!file && !passwordFor && !processing && images.length === 0 && errors.length === 0 && (
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
