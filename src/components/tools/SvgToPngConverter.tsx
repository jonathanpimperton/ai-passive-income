/**
 * SVG to PNG Converter — render SVG in Canvas and export as PNG.
 * Configurable output scale. No server upload.
 *
 * Review fixes (FILES-07, FILES-12):
 * - <style> elements are kept, so CSS-styled SVGs (Illustrator's default
 *   export) no longer come out solid black. The SVG is drawn through <img>,
 *   which never runs scripts or loads external files; the sanitiser still
 *   removes scripts, event handlers, javascript: links and external
 *   references as defence in depth.
 * - Width/height in cm, mm, in, pt or % are converted properly (via the
 *   viewBox for %), instead of "10cm" becoming 10 px.
 * - Invalid SVGs and sizes beyond the browser's canvas limit get a clear
 *   message instead of a spinner that never stops.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner } from '../ui/FileToolKit';
import { formatBytes, withExtension } from '../../lib/file-tools/names';
import { resolveSvgSize, sanitizeSvgDocument } from '../../lib/file-tools/svg';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, errorMessage,
} from '../../lib/file-tools/browser';

interface Prepared {
  /** Sanitised SVG markup with no explicit size (filled in per render). */
  doc: Document;
  baseWidth: number;
  baseHeight: number;
  viewBox: string | null;
  defaulted: boolean;
}

/** Parse and sanitise SVG text; throws a user-facing error when it is not usable. */
function prepareSvg(text: string): Prepared {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (!sanitizeSvgDocument(doc)) {
    throw new Error('This file is not a valid SVG image (it could not be parsed). Check that it opens in a browser.');
  }
  const root = doc.documentElement;
  const size = resolveSvgSize({
    width: root.getAttribute('width'),
    height: root.getAttribute('height'),
    viewBox: root.getAttribute('viewBox'),
  });
  // With no viewBox at all, add one matching the base size so the scale enlarges the drawing too.
  const viewBox = size.viewBox ?? (root.getAttribute('viewBox') ? null : `0 0 ${size.width} ${size.height}`);
  return { doc, baseWidth: size.width, baseHeight: size.height, viewBox, defaulted: size.defaulted };
}

/** Render the prepared SVG at `scale` and return a PNG blob. */
async function renderPng(p: Prepared, scale: number): Promise<{ blob: Blob; width: number; height: number }> {
  const width = Math.max(1, Math.round(p.baseWidth * scale));
  const height = Math.max(1, Math.round(p.baseHeight * scale));
  const { canvas, ctx } = createCanvas(width, height); // throws a clear message when too large
  try {
    const root = p.doc.documentElement.cloneNode(true) as Element;
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    if (p.viewBox) root.setAttribute('viewBox', p.viewBox);
    const markup = new XMLSerializer().serializeToString(root);
    const decoded = await decodeImage(new Blob([markup], { type: 'image/svg+xml' }));
    try {
      ctx.drawImage(decoded.source, 0, 0, width, height);
    } finally {
      decoded.release();
    }
    const encoded = await encodeCanvas(canvas, 'image/png');
    return { blob: encoded.blob, width, height };
  } finally {
    releaseCanvas(canvas);
  }
}

export default function SvgToPngConverter() {
  const [scale, setScale] = useState(2);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [pngPreview, setPngPreview] = useState('');
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const prevPngUrlRef = useRef('');
  const runRef = useRef(0);

  useEffect(() => () => { if (prevPngUrlRef.current) URL.revokeObjectURL(prevPngUrlRef.current); }, []);

  const showResult = (blob: Blob | null, w = 0, h = 0) => {
    if (prevPngUrlRef.current) URL.revokeObjectURL(prevPngUrlRef.current);
    prevPngUrlRef.current = blob ? URL.createObjectURL(blob) : '';
    setPngPreview(prevPngUrlRef.current);
    setPngBlob(blob);
    setDimensions({ w, h });
  };

  const convert = useCallback(async (p: Prepared, scaleVal: number) => {
    const runId = ++runRef.current;
    setProcessing(true);
    setErrors([]);
    try {
      const out = await renderPng(p, scaleVal);
      if (runRef.current !== runId) return;
      showResult(out.blob, out.width, out.height);
    } catch (e) {
      if (runRef.current !== runId) return;
      showResult(null);
      setErrors([errorMessage(e, 'This SVG could not be converted.')]);
    } finally {
      if (runRef.current === runId) setProcessing(false);
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPrepared(null);
    showResult(null);
    setErrors([]);
    try {
      const p = prepareSvg(await f.text());
      setPrepared(p);
    } catch (e) {
      setErrors([`"${f.name}": ${errorMessage(e, 'could not be read.')}`]);
    }
  }, []);

  // Render on upload and whenever the scale changes (debounced while dragging).
  useEffect(() => {
    if (!prepared) return;
    const t = window.setTimeout(() => void convert(prepared, scale), 150);
    return () => window.clearTimeout(t);
  }, [prepared, scale, convert]);

  const download = () => {
    if (!pngBlob || !file) return;
    downloadBlob(pngBlob, withExtension(file.name, '.png'));
  };

  const notices = prepared?.defaulted
    ? ['This SVG has no width, height or viewBox, so the browser default of 300 × 150 was used. Use the scale to make it larger.']
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".svg,image/svg+xml"
          acceptLabel="Supports: SVG files"
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5">
          <SliderInput
            label="Scale"
            id="svg-scale"
            value={scale}
            min={1}
            max={8}
            step={0.5}
            onChange={setScale}
            suffix="×"
            minLabel="1×"
            maxLabel="8×"
            hint="Higher scale = larger PNG for print use"
          />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label="Converting..." />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {pngPreview && file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-4 overflow-hidden">
              <div className="bg-[repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px] rounded-lg p-2">
                <img
                  src={pngPreview}
                  alt={`PNG preview of ${file.name}`}
                  className="max-w-full max-h-[400px] mx-auto"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                {dimensions.w} × {dimensions.h}px
                {pngBlob && <span className="text-neutral-500 ml-2">({formatBytes(pngBlob.size)})</span>}
              </p>
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download PNG
              </button>
            </div>
          </div>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload an SVG to convert it to PNG</p>
            <p className="text-xs text-neutral-500 mt-1">Preview appears here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
