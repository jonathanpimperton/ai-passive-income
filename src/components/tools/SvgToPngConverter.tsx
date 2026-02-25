/**
 * SVG to PNG Converter — render SVG in Canvas and export as PNG.
 * Configurable output size. No server upload.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Parse SVG text and return intrinsic width/height */
function getSvgDimensions(svgText: string): { w: number; h: number } | null {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  let w = parseFloat(svg.getAttribute('width') || '0');
  let h = parseFloat(svg.getAttribute('height') || '0');
  const viewBox = svg.getAttribute('viewBox');
  if ((!w || !h) && viewBox) {
    const vb = viewBox.split(/[\s,]+/).map(Number);
    w = vb[2] || 300;
    h = vb[3] || 150;
  }
  if (!w) w = 300;
  if (!h) h = 150;
  return { w, h };
}

export default function SvgToPngConverter() {
  const [scale, setScale] = useState(2);
  const [file, setFile] = useState<File | null>(null);
  const [svgText, setSvgText] = useState('');
  const [pngPreview, setPngPreview] = useState('');
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [pngSize, setPngSize] = useState(0);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [processing, setProcessing] = useState(false);
  const prevPngUrlRef = useRef('');

  const convert = useCallback((text: string, scaleVal: number) => {
    const dims = getSvgDimensions(text);
    if (!dims) return;

    setProcessing(true);
    const outW = Math.round(dims.w * scaleVal);
    const outH = Math.round(dims.h * scaleVal);
    setDimensions({ w: outW, h: outH });

    const img = new window.Image();
    const svgBlob = new Blob([text], { type: 'image/svg+xml' });
    const imgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(imgUrl);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setProcessing(false); return; }
      ctx.drawImage(img, 0, 0, outW, outH);
      canvas.toBlob((blob) => {
        if (!blob) { setProcessing(false); return; }
        // Revoke previous PNG preview URL
        if (prevPngUrlRef.current) URL.revokeObjectURL(prevPngUrlRef.current);
        const newUrl = URL.createObjectURL(blob);
        prevPngUrlRef.current = newUrl;
        setPngBlob(blob);
        setPngSize(blob.size);
        setPngPreview(newUrl);
        setProcessing(false);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(imgUrl); setProcessing(false); };
    img.src = imgUrl;
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setFile(f);

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSvgText(reader.result);
          convert(reader.result, scale);
        }
      };
      reader.readAsText(f);
    },
    [convert, scale],
  );

  // Re-convert when scale changes (if we have SVG text)
  useEffect(() => {
    if (svgText) convert(svgText, scale);
  }, [scale, svgText, convert]);

  const download = () => {
    if (!pngBlob || !file) return;
    const a = document.createElement('a');
    const dlUrl = URL.createObjectURL(pngBlob);
    a.href = dlUrl;
    a.download = file.name.replace(/\.svg$/i, '') + '.png';
    a.click();
    URL.revokeObjectURL(dlUrl);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".svg,image/svg+xml"
          acceptLabel="Supports: SVG files"
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5">
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

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary-700">Converting...</span>
          </div>
        )}

        {pngPreview && file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 overflow-hidden">
              <div className="bg-[repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px] rounded-lg p-2">
                <img
                  src={pngPreview}
                  alt={`PNG preview of ${file.name}`}
                  className="max-w-full max-h-[400px] mx-auto"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                {dimensions.w} × {dimensions.h}px
                <span className="text-neutral-400 ml-2">({formatSize(pngSize)})</span>
              </p>
              <button
                onClick={download}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download PNG
              </button>
            </div>
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload an SVG to convert it to PNG</p>
            <p className="text-xs text-neutral-400 mt-1">Preview appears here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
