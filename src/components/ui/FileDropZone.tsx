/**
 * Shared drag-and-drop file upload area for all file converter tools.
 * Dashed border, drag-active highlight, accepted formats display.
 */
import { useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileDropZoneProps {
  accept: string;
  acceptLabel: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  maxSizeMB?: number;
}

export default function FileDropZone({
  accept,
  acceptLabel,
  multiple = false,
  onFiles,
  maxSizeMB = 50,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      const valid = files.filter((f) => f.size <= maxSizeMB * 1024 * 1024);
      if (valid.length > 0) onFiles(multiple ? valid : [valid[0]]);
    },
    [onFiles, multiple, maxSizeMB],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload files. ${acceptLabel}`}
      className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
        ${dragActive ? 'border-primary-500 bg-primary-50 scale-[1.01]' : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-white'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <UploadCloud
        size={48}
        className={`transition-colors duration-200 ${dragActive ? 'text-primary-500' : 'text-neutral-500'}`}
        aria-hidden="true"
      />
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-700">
          Drop {multiple ? 'files' : 'a file'} here or click to browse
        </p>
        <p className="text-xs text-neutral-500 mt-1">{acceptLabel}</p>
        <p className="text-xs text-neutral-500 mt-0.5">Max {maxSizeMB}MB per file</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
