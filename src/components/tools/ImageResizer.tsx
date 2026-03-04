/**
 * Image Resizer — client-side image resizing using Canvas API.
 * Resize by pixels or percentage, maintain aspect ratio option.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Image as ImageIcon, Link, Unlink } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [preview, setPreview] = useState('');
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedSize, setResizedSize] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setResizedBlob(null);
    setResizedSize(0);
    const img = new window.Image();
    const srcUrl = URL.createObjectURL(f);
    img.onload = () => {
      imgRef.current = img;
      setOrigW(img.width);
      setOrigH(img.height);
      setWidth(img.width);
      setHeight(img.height);
      setPreview(srcUrl);
    };
    img.onerror = () => URL.revokeObjectURL(srcUrl);
    img.src = srcUrl;
  }, []);

  const handleWidthChange = (val: string) => {
    const w = Math.max(1, parseInt(val) || 1);
    setWidth(w);
    if (keepAspect && origW > 0) setHeight(Math.round((w / origW) * origH));
  };

  const handleHeightChange = (val: string) => {
    const h = Math.max(1, parseInt(val) || 1);
    setHeight(h);
    if (keepAspect && origH > 0) setWidth(Math.round((h / origH) * origW));
  };

  const resize = useCallback(() => {
    const img = imgRef.current;
    if (!img || width <= 0 || height <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setResizedBlob(blob);
        setResizedSize(blob.size);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(blob));
      },
      'image/png',
    );
  }, [width, height]);

  useEffect(() => {
    if (file && width > 0 && height > 0) resize();
  }, [width, height, resize, file]);

  const download = () => {
    if (!resizedBlob || !file) return;
    const url = URL.createObjectURL(resizedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.[^.]+$/, '') + `_${width}x${height}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Settings */}
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          acceptLabel="Supports: JPG, PNG, WebP, SVG"
          onFiles={handleFiles}
        />

        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 p-5 space-y-4">
            <p className="text-xs text-neutral-500">
              Original: {origW} × {origH}px ({formatSize(file.size)})
            </p>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="resize-w" className="block text-sm font-medium text-neutral-700 mb-1">Width</label>
                <input
                  id="resize-w"
                  type="number"
                  min={1}
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
              </div>

              <button
                onClick={() => setKeepAspect(!keepAspect)}
                className={`mb-0.5 p-2 rounded-lg border transition-colors duration-150 ${
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
                <label htmlFor="resize-h" className="block text-sm font-medium text-neutral-700 mb-1">Height</label>
                <input
                  id="resize-h"
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">Quick resize</p>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 75, 150, 200].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const w = Math.round(origW * (pct / 100));
                      const h = Math.round(origH * (pct / 100));
                      setWidth(w);
                      setHeight(h);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600
                      hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {preview && file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200/80 p-4 overflow-hidden">
              <img
                src={preview}
                alt={`Resized preview of ${file.name}`}
                className="max-w-full max-h-[400px] mx-auto rounded-lg object-contain"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                {width} × {height}px
                {resizedSize > 0 && <span className="ml-2 text-neutral-500">({formatSize(resizedSize)})</span>}
              </p>
              <button
                onClick={download}
                disabled={!resizedBlob}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download PNG
              </button>
            </div>
          </div>
        ) : (
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
