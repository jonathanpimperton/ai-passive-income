/**
 * Image Format Converter — convert between PNG, JPG, WebP using Canvas API.
 * Batch support. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, Trash2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

const FORMATS = [
  { value: 'image/jpeg', label: 'JPG', ext: '.jpg' },
  { value: 'image/png', label: 'PNG', ext: '.png' },
  { value: 'image/webp', label: 'WebP', ext: '.webp' },
] as const;

type FormatValue = (typeof FORMATS)[number]['value'];

interface ConvertedFile {
  name: string;
  originalSize: number;
  convertedSize: number;
  blob: Blob;
  preview: string;
  fromFormat: string;
  toFormat: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtFromMime(mime: string): string {
  return FORMATS.find((f) => f.value === mime)?.ext ?? '.jpg';
}

function getLabelFromType(type: string): string {
  if (type.includes('png')) return 'PNG';
  if (type.includes('webp')) return 'WebP';
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPG';
  return type.split('/')[1]?.toUpperCase() ?? 'Unknown';
}

function convertImage(file: File, targetFormat: FormatValue, quality: number): Promise<ConvertedFile> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const srcUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(srcUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      // White background for JPG (no alpha channel)
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Conversion failed')); return; }
          const ext = getExtFromMime(targetFormat);
          resolve({
            name: file.name.replace(/\.[^.]+$/, '') + ext,
            originalSize: file.size,
            convertedSize: blob.size,
            blob,
            preview: URL.createObjectURL(blob),
            fromFormat: getLabelFromType(file.type),
            toFormat: getLabelFromType(targetFormat),
          });
        },
        targetFormat,
        targetFormat === 'image/png' ? undefined : quality / 100,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(srcUrl); reject(new Error('Failed to load image')); };
    img.src = srcUrl;
  });
}

export default function ImageFormatConverter() {
  const [targetFormat, setTargetFormat] = useState<FormatValue>('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      setError('');
      const settled = await Promise.allSettled(files.map((f) => convertImage(f, targetFormat, quality)));
      const succeeded = settled
        .filter((r): r is PromiseFulfilledResult<ConvertedFile> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failedCount = settled.filter((r) => r.status === 'rejected').length;
      if (succeeded.length > 0) setResults((prev) => [...prev, ...succeeded]);
      if (failedCount > 0) setError(`${failedCount} image${failedCount > 1 ? 's' : ''} failed to convert.`);
      setProcessing(false);
    },
    [targetFormat, quality],
  );

  const downloadFile = (file: ConvertedFile) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept="image/jpeg,image/png,image/webp"
          acceptLabel="Supports: JPG, PNG, WebP"
          multiple
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 p-5 space-y-4">
          <div>
            <label htmlFor="target-format" className="block text-sm font-medium text-neutral-700 mb-1">Convert to</label>
            <select
              id="target-format"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as FormatValue)}
              className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
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
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}
        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary-700">Converting...</span>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                <span className="font-semibold text-accent-600">{results.length}</span> file{results.length !== 1 ? 's' : ''} converted
              </span>
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150">
                <Trash2 size={14} aria-hidden="true" />
                Clear all
              </button>
            </div>
            <div className="space-y-3">
              {results.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                  <img src={file.preview} alt={`Converted preview of ${file.name}`} className="w-14 h-14 object-cover rounded-lg bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                      {file.fromFormat} <ArrowRight size={12} aria-hidden="true" /> {file.toFormat}
                      <span className="text-neutral-500 ml-1">
                        {formatSize(file.originalSize)} → {formatSize(file.convertedSize)}
                      </span>
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
              ))}
            </div>
          </>
        )}

        {!processing && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload images to convert them</p>
            <p className="text-xs text-neutral-500 mt-1">Results appear here instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
