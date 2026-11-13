/**
 * Image Resizer — client-side image resizing using Canvas API.
 * Resize by pixels or percentage, maintain aspect ratio option.
 *
 * Review fixes (FILES-11, FILES-12, FILES-23):
 * - Keeps the input format (JPG stays JPG, WebP stays WebP) with a quality
 *   setting, instead of always writing a PNG that was often bigger than the
 *   original. SVG and GIF inputs are saved as PNG. A different format can be
 *   chosen explicitly.
 * - Nothing is encoded until Download, so large photos are not re-encoded on
 *   every keystroke; the preview is the original image scaled by the browser.
 * - The size fields accept free typing (they no longer snap to "1" when
 *   cleared, which turned "800" into "1800").
 * - Impossible sizes (canvas limits) and unreadable images get a clear
 *   message, and the file name always matches the real output size.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon, Link, Unlink } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner } from '../ui/FileToolKit';
import { formatBytes, baseName } from '../../lib/file-tools/names';
import { detectImageKind, isAnimatedImage } from '../../lib/file-tools/image-sniff';
import { canvasSizeProblem, isIosLike } from '../../lib/file-tools/canvas-limits';
import { encodePngLossless } from '../../lib/file-tools/png-encode';
import { parseNumericInput } from '../../lib/parse-number';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, bytesToBlob, errorMessage,
  extensionForType, labelForType, type DecodedImage,
} from '../../lib/file-tools/browser';

type OutputChoice = 'same' | 'image/jpeg' | 'image/png' | 'image/webp';

const PNG_OPTIMISER_MAX_PIXELS = 16_000_000;

/** Parse a dimension field: whole pixels, 1 or more. */
function parseDimension(text: string): number | null {
  const res = parseNumericInput(text, { min: 1, max: 100000 });
  if (!res.ok || !Number.isFinite(res.value) || res.value < 1) return null;
  return Math.round(res.value);
}

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState('image/png');
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [widthText, setWidthText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [keepAspect, setKeepAspect] = useState(true);
  const [output, setOutput] = useState<OutputChoice>('same');
  const [quality, setQuality] = useState(85);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const decodedRef = useRef<DecodedImage | null>(null);
  const previewRef = useRef('');

  previewRef.current = preview;
  useEffect(() => () => {
    decodedRef.current?.release();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setErrors([]);
    setNotices([]);
    decodedRef.current?.release();
    decodedRef.current = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setPreview('');
    setFile(null);
    setProgress('Reading image...');
    try {
      const bytes = await readBytes(f);
      const kind = detectImageKind(bytes);
      const type = kind === 'jpeg' ? 'image/jpeg' : kind === 'webp' ? 'image/webp' : 'image/png';
      const decoded = await decodeImage(kind === 'svg' ? new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/svg+xml' }) : f);
      decodedRef.current = decoded;
      setInputType(type);
      setOrigW(decoded.width);
      setOrigH(decoded.height);
      setWidthText(String(decoded.width));
      setHeightText(String(decoded.height));
      setPreview(URL.createObjectURL(f));
      setFile(f);
      const notes: string[] = [];
      if (isAnimatedImage(bytes)) notes.push('Animated image: only the first frame will be resized.');
      if (kind === 'svg' || kind === 'gif') notes.push(`${labelForType(`image/${kind}`)} images are saved as PNG.`);
      setNotices(notes);
    } catch (e) {
      setErrors([`"${f.name}": ${errorMessage(e, 'could not be read as an image.')}`]);
    } finally {
      setProgress('');
    }
  }, []);

  const width = parseDimension(widthText);
  const height = parseDimension(heightText);

  const onWidthChange = (text: string) => {
    setWidthText(text);
    const w = parseDimension(text);
    if (keepAspect && w && origW > 0) setHeightText(String(Math.max(1, Math.round((w / origW) * origH))));
  };
  const onHeightChange = (text: string) => {
    setHeightText(text);
    const h = parseDimension(text);
    if (keepAspect && h && origH > 0) setWidthText(String(Math.max(1, Math.round((h / origH) * origW))));
  };
  const applyPercent = (pct: number) => {
    setWidthText(String(Math.max(1, Math.round(origW * (pct / 100)))));
    setHeightText(String(Math.max(1, Math.round(origH * (pct / 100)))));
  };

  const targetType = output === 'same' ? inputType : output;
  const sizeProblem = width && height ? canvasSizeProblem(width, height, isIosLike()) : null;
  const fieldProblem = file && (!width || !height) ? 'Enter a whole number of pixels (1 or more) for width and height.' : null;

  const download = async () => {
    const decoded = decodedRef.current;
    if (!file || !decoded || !width || !height || sizeProblem) return;
    setErrors([]);
    setNotices([]);
    setProgress('Resizing...');
    let canvas: HTMLCanvasElement | null = null;
    try {
      const made = createCanvas(width, height);
      canvas = made.canvas;
      const ctx = made.ctx;
      if (targetType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(decoded.source, 0, 0, width, height);
      let type: string = targetType;
      let blob: Blob;
      if (targetType === 'image/png') {
        blob = width * height <= PNG_OPTIMISER_MAX_PIXELS
          ? bytesToBlob(encodePngLossless(ctx.getImageData(0, 0, width, height).data, width, height), 'image/png')
          : (await encodeCanvas(canvas, 'image/png')).blob;
      } else {
        const enc = await encodeCanvas(canvas, targetType, quality / 100);
        blob = enc.blob;
        type = enc.type;
      }
      const name = `${baseName(file.name)}_${width}x${height}${extensionForType(type) || '.png'}`;
      downloadBlob(blob, name);
      const notes = [`Saved ${name} (${formatBytes(blob.size)}; original ${formatBytes(file.size)}).`];
      if (type !== targetType) notes.push(`This browser cannot create ${labelForType(targetType)} files, so it was saved as ${labelForType(type)}.`);
      setNotices(notes);
    } catch (e) {
      setErrors([errorMessage(e, 'The image could not be resized.')]);
    } finally {
      if (canvas) releaseCanvas(canvas);
      setProgress('');
    }
  };

  const processing = progress !== '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings */}
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,.jpg,.jpeg,.png,.webp,.svg,.gif"
          acceptLabel="Supports: JPG, PNG, WebP, SVG, GIF"
          onFiles={handleFiles}
          disabled={processing}
        />

        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 p-5 space-y-4">
            <p className="text-xs text-neutral-500">
              Original: {origW} × {origH}px ({labelForType(inputType)}, {formatBytes(file.size)})
            </p>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="resize-w" className="block text-sm font-medium text-neutral-700 mb-1">Width (px)</label>
                <input
                  id="resize-w"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={widthText}
                  onChange={(e) => onWidthChange(e.target.value)}
                  aria-invalid={!width || undefined}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
              </div>

              <button
                type="button"
                onClick={() => setKeepAspect(!keepAspect)}
                className={`mb-0 w-11 h-11 inline-flex items-center justify-center rounded-lg border transition-colors duration-150 ${
                  keepAspect
                    ? 'border-primary-300 bg-primary-50 text-primary-600'
                    : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-600'
                }`}
                aria-label={keepAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                aria-pressed={keepAspect}
              >
                {keepAspect ? <Link size={18} aria-hidden="true" /> : <Unlink size={18} aria-hidden="true" />}
              </button>

              <div className="flex-1">
                <label htmlFor="resize-h" className="block text-sm font-medium text-neutral-700 mb-1">Height (px)</label>
                <input
                  id="resize-h"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={heightText}
                  onChange={(e) => onHeightChange(e.target.value)}
                  aria-invalid={!height || undefined}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
              </div>
            </div>
            {(fieldProblem || sizeProblem) && (
              <p className="text-xs text-red-700" role="alert">{fieldProblem || sizeProblem}</p>
            )}

            {/* Quick presets */}
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">Quick resize</p>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 75, 150, 200].map((pct) => (
                  <button
                    type="button"
                    key={pct}
                    onClick={() => applyPercent(pct)}
                    className="min-h-11 px-3 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600
                      hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="resize-format" className="block text-sm font-medium text-neutral-700 mb-1">Save as</label>
              <select
                id="resize-format"
                value={output}
                onChange={(e) => setOutput(e.target.value as OutputChoice)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                <option value="same">Same format as original ({labelForType(inputType)})</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
            {targetType !== 'image/png' && (
              <SliderInput
                label="Quality"
                id="resize-quality"
                value={quality}
                min={10}
                max={100}
                step={5}
                onChange={setQuality}
                suffix="%"
                minLabel="10%"
                maxLabel="100%"
                hint="Higher = sharper, larger file"
              />
            )}
          </div>
        )}
      </div>

      {/* Output */}
      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>
        {preview && file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200/80 p-4 overflow-hidden">
              <img
                src={preview}
                alt={`Preview of ${file.name}`}
                className={`max-w-full max-h-[400px] mx-auto rounded-lg ${keepAspect ? "object-contain" : "object-fill"}`}
                style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                {width && height ? `${width} × ${height}px` : 'Enter a size'} · {labelForType(targetType)}
              </p>
              <button
                type="button"
                onClick={download}
                disabled={!width || !height || !!sizeProblem || processing}
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download {labelForType(targetType)}
              </button>
            </div>
          </div>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload an image to resize it</p>
            <p className="text-xs text-neutral-500 mt-1">Preview appears here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
