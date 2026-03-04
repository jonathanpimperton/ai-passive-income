/**
 * HEIC to JPG Converter — converts iPhone HEIC photos to JPG.
 * Uses Canvas API with a polyfill approach. Batch support. No server upload.
 * Note: HEIC decoding relies on browser support or a WASM fallback loaded lazily.
 */
import { useState, useCallback } from 'react';
import { Download, Trash2, Image as ImageIcon } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

interface ConvertedFile {
  name: string;
  originalSize: number;
  convertedSize: number;
  blob: Blob;
  preview: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function convertHeicToJpg(file: File, quality: number): Promise<ConvertedFile> {
  // Try native browser decode first (Safari supports HEIC natively)
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Conversion failed')); return; }
          resolve({
            name: file.name.replace(/\.heic$/i, '') + '.jpg',
            originalSize: file.size,
            convertedSize: blob.size,
            blob,
            preview: URL.createObjectURL(blob),
          });
        },
        'image/jpeg',
        quality / 100,
      );
    });
  }

  // Fallback: dynamically import heic-to for browsers without native HEIC support
  try {
    const { heicTo } = await import('heic-to');
    const jpgBlob = await heicTo({ blob: file, type: 'image/jpeg', quality: quality / 100 });
    const resultBlob = jpgBlob instanceof Blob ? jpgBlob : new Blob([jpgBlob], { type: 'image/jpeg' });
    return {
      name: file.name.replace(/\.heic$/i, '') + '.jpg',
      originalSize: file.size,
      convertedSize: resultBlob.size,
      blob: resultBlob,
      preview: URL.createObjectURL(resultBlob),
    };
  } catch {
    throw new Error('HEIC conversion not supported in this browser. Try Safari or Chrome 128+.');
  }
}

export default function HeicToJpgConverter() {
  const [quality, setQuality] = useState(85);
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      setError('');
      const converted: ConvertedFile[] = [];
      const errors: string[] = [];
      for (const f of files) {
        try {
          converted.push(await convertHeicToJpg(f, quality));
        } catch (e) {
          errors.push(e instanceof Error ? e.message : 'Conversion failed');
        }
      }
      if (converted.length > 0) setResults((prev) => [...prev, ...converted]);
      if (errors.length > 0) {
        const unique = [...new Set(errors)];
        setError(unique.length === 1 ? unique[0] : `${errors.length} files failed: ${unique.join('; ')}`);
      }
      setProcessing(false);
    },
    [quality],
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
    setError('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".heic,.heif,image/heic,image/heif"
          acceptLabel="Supports: HEIC, HEIF (iPhone photos)"
          multiple
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 p-5">
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
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary-700">Converting HEIC files...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                <span className="font-semibold text-accent-600">{results.length}</span> file{results.length !== 1 ? 's' : ''} converted
              </span>
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150">
                <Trash2 size={14} aria-hidden="true" /> Clear all
              </button>
            </div>
            <div className="space-y-3">
              {results.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200/80 p-4">
                  <img src={file.preview} alt={`Converted preview of ${file.name}`} className="w-14 h-14 object-cover rounded-lg bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatSize(file.originalSize)} → {formatSize(file.convertedSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-150"
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

        {!processing && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload HEIC files from your iPhone</p>
            <p className="text-xs text-neutral-400 mt-1">They'll be converted to JPG instantly</p>
          </div>
        )}
      </div>
    </div>
  );
}
