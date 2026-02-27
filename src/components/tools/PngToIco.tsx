/**
 * PNG to ICO (Favicon Generator) — converts PNG images to multi-size ICO files.
 * ICO assembly is done inline (~40 lines) — no external dependency needed.
 * Uses Canvas API for resizing to standard favicon dimensions.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, Trash2, Image, Check } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { assembleIco } from '../../lib/converter-utils';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;
const DEFAULT_SIZES = new Set([16, 32, 48]);

interface PreviewImage {
  size: number;
  dataUrl: string;
  pngBlob: Blob;
}

/** Resize an image to a specific size using Canvas with high-quality rendering */
function resizeImage(img: HTMLImageElement, size: number): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((blob) => {
      resolve({ dataUrl, blob: blob! });
    }, 'image/png');
  });
}

export default function PngToIco() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set(DEFAULT_SIZES));
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFileUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setSourceName(file.name);
    setError('');

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      setSourceImage(img);
      imgRef.current = img;

      // Generate previews for all sizes
      const newPreviews: PreviewImage[] = [];
      for (const size of FAVICON_SIZES) {
        const { dataUrl, blob } = await resizeImage(img, size);
        newPreviews.push({ size, dataUrl, pngBlob: blob });
      }
      setPreviews(newPreviews);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('Could not load this image — it may be corrupted or unsupported.');
    };
    img.src = objectUrl;
  }, []);

  const toggleSize = useCallback((size: number) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) {
        if (next.size > 1) next.delete(size); // Must keep at least one
      } else {
        next.add(size);
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (previews.length === 0) return;
    setGenerating(true);

    try {
      const selected = previews
        .filter((p) => selectedSizes.has(p.size))
        .sort((a, b) => a.size - b.size);

      const pngBuffers = await Promise.all(
        selected.map(async (p) => ({
          size: p.size,
          data: await p.pngBlob.arrayBuffer(),
        })),
      );

      const icoBuffer = assembleIco(pngBuffers);
      const icoBlob = new Blob([icoBuffer], { type: 'image/x-icon' });
      const url = URL.createObjectURL(icoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'favicon.ico';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }, [previews, selectedSizes]);

  const handleClear = useCallback(() => {
    setSourceImage(null);
    setSourceName('');
    setPreviews([]);
    setSelectedSizes(new Set(DEFAULT_SIZES));
    if (imgRef.current?.src) URL.revokeObjectURL(imgRef.current.src);
  }, []);

  return (
    <div className="space-y-6">
      <PrivacyBadge />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
      )}

      {/* Upload */}
      {!sourceImage ? (
        <FileDropZone
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          acceptLabel="PNG, JPG, WebP, or SVG — square images work best"
          onFiles={handleFileUpload}
          maxSizeMB={10}
        />
      ) : (
        <div className="space-y-6">
          {/* Source info */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-3">
              <Image size={20} className="text-primary-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">{sourceName}</p>
                <p className="text-xs text-neutral-500">
                  {sourceImage.naturalWidth} × {sourceImage.naturalHeight} px
                  {sourceImage.naturalWidth !== sourceImage.naturalHeight && (
                    <span className="text-warning-600 ml-2">
                      (not square — will be stretched to fit)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
              aria-label="Remove image"
            >
              <Trash2 size={14} aria-hidden="true" />
              Remove
            </button>
          </div>

          {/* Size selection + previews */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">
              Select sizes to include in ICO file:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {FAVICON_SIZES.map((size) => {
                const preview = previews.find((p) => p.size === size);
                const isSelected = selectedSizes.has(size);
                return (
                  <button
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${size}×${size} pixels${isSelected ? ' (selected)' : ''}`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5">
                        <Check size={14} className="text-primary-600" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className="bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:8px_8px] rounded-lg flex items-center justify-center"
                      style={{ width: Math.max(size, 32) + 16, height: Math.max(size, 32) + 16 }}
                    >
                      {preview && (
                        <img
                          src={preview.dataUrl}
                          alt={`Preview at ${size}×${size}`}
                          width={Math.max(size, 32)}
                          height={Math.max(size, 32)}
                          style={{ imageRendering: size <= 32 ? 'pixelated' : 'auto' }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium text-neutral-700">
                      {size}×{size}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating || selectedSizes.size === 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Generate and download ICO file"
            >
              <Download size={18} aria-hidden="true" />
              {generating ? 'Generating...' : `Download favicon.ico (${selectedSizes.size} size${selectedSizes.size > 1 ? 's' : ''})`}
            </button>
            <p className="text-xs text-neutral-500">
              Standard set: 16×16, 32×32, 48×48 — covers all browsers
            </p>
          </div>

          {/* Usage guide */}
          <details className="rounded-xl border border-neutral-200 bg-white">
            <summary className="px-4 py-3 text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-50 transition-colors duration-150">
              How to use your favicon
            </summary>
            <div className="px-4 pb-4 space-y-3 text-sm text-neutral-600">
              <p>Place <code className="font-mono text-primary-600 bg-primary-50 px-1 py-0.5 rounded">favicon.ico</code> in your website's root directory, then add this to your HTML <code className="font-mono text-primary-600 bg-primary-50 px-1 py-0.5 rounded">&lt;head&gt;</code>:</p>
              <pre className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 font-mono text-xs overflow-x-auto">
{`<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`}
              </pre>
              <p>Most browsers will automatically look for <code className="font-mono text-primary-600 bg-primary-50 px-1 py-0.5 rounded">/favicon.ico</code> at the root of your domain even without the link tag.</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
