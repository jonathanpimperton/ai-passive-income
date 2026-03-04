/**
 * Image Compressor — client-side image compression using Canvas API.
 * Supports PNG, JPG, WebP. Batch support. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, Trash2, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

interface CompressedFile {
  name: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  preview: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Detect if an image has any transparent pixels by sampling the canvas alpha channel */
function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  // Sample a grid of pixels rather than checking every single one (performance)
  const data = ctx.getImageData(0, 0, w, h).data;
  const step = Math.max(1, Math.floor(data.length / (4 * 10000))); // sample ~10k pixels
  for (let i = 3; i < data.length; i += 4 * step) {
    if (data[i] < 250) return true;
  }
  return false;
}

function compressImage(file: File, quality: number, maxWidth: number): Promise<CompressedFile> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const srcUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(srcUrl);
      const scale = maxWidth > 0 && img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      // Draw image first to detect transparency
      ctx.drawImage(img, 0, 0, w, h);

      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      const transparent = isPng && hasTransparency(ctx, w, h);

      if (transparent) {
        // Keep PNG format to preserve transparency — re-render at reduced quality
        // For PNGs with transparency, we keep PNG format but resize if needed
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            resolve({
              name: file.name.replace(/\.[^.]+$/, '') + '_compressed.png',
              originalSize: file.size,
              compressedSize: blob.size,
              blob,
              preview: URL.createObjectURL(blob),
            });
          },
          'image/png',
        );
      } else {
        // No transparency (or not PNG) — safe to convert to JPEG
        // Fill white background first to avoid black areas from alpha channel
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            resolve({
              name: file.name.replace(/\.[^.]+$/, '') + '_compressed.jpg',
              originalSize: file.size,
              compressedSize: blob.size,
              blob,
              preview: URL.createObjectURL(blob),
            });
          },
          'image/jpeg',
          quality / 100,
        );
      }
    };
    img.onerror = () => { URL.revokeObjectURL(srcUrl); reject(new Error('Failed to load image')); };
    img.src = srcUrl;
  });
}

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(0);
  const [results, setResults] = useState<CompressedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      setError('');
      const settled = await Promise.allSettled(files.map((f) => compressImage(f, quality, maxWidth)));
      const succeeded = settled
        .filter((r): r is PromiseFulfilledResult<CompressedFile> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failedCount = settled.filter((r) => r.status === 'rejected').length;
      if (succeeded.length > 0) setResults((prev) => [...prev, ...succeeded]);
      if (failedCount > 0) setError(`${failedCount} image${failedCount > 1 ? 's' : ''} failed to compress.`);
      setProcessing(false);
    },
    [quality, maxWidth],
  );

  const downloadFile = (file: CompressedFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    results.forEach((r) => URL.revokeObjectURL(r.preview));
    setResults([]);
  };

  const totalSaved = results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings column */}
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp"
          acceptLabel="Supports: JPG, PNG, WebP"
          multiple
          onFiles={handleFiles}
        />
        <div className="space-y-4 bg-white rounded-lg border border-neutral-200/80 p-5">
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
            hint="Lower = smaller file, more compression artifacts"
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
        </div>
      </div>

      {/* Output column */}
      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}
        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary-700">Compressing...</span>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                <span className="font-semibold text-accent-600">{results.length}</span> file{results.length !== 1 ? 's' : ''} compressed
                {totalSaved > 0 && (
                  <span className="ml-2 text-accent-600 font-medium">
                    — saved {formatSize(totalSaved)}
                  </span>
                )}
              </div>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150"
              >
                <Trash2 size={14} aria-hidden="true" />
                Clear all
              </button>
            </div>

            <div className="space-y-3">
              {results.map((file, i) => {
                const savings = file.originalSize - file.compressedSize;
                const pct = file.originalSize > 0 ? Math.round((savings / file.originalSize) * 100) : 0;
                return (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                    <img
                      src={file.preview}
                      alt={`Compressed preview of ${file.name}`}
                      className="w-14 h-14 object-cover rounded-lg bg-neutral-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatSize(file.originalSize)} → {formatSize(file.compressedSize)}
                        {pct > 0 && (
                          <span className="ml-1 text-accent-600 font-medium">(-{pct}%)</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(file)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
                      aria-label={`Download ${file.name}`}
                    >
                      <Download size={16} aria-hidden="true" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!processing && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to compress them</p>
            <p className="text-xs text-neutral-500 mt-1">Results appear here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
