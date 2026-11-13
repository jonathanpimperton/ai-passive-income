/**
 * Shared drag-and-drop file upload area for all file converter tools.
 * Dashed border, drag-active highlight, accepted formats display.
 *
 * Behaviour (review FILES-10, FILES-12, FILES-16, DEVTOOLS):
 * - The hidden input is reset after every pick, so choosing the same file
 *   again (for example after changing a setting) fires a new change event.
 * - Files that are too large or of a type the tool does not accept are never
 *   dropped silently: they are named in a message below the drop area, and
 *   `onReject` is called so a tool can react too.
 * - Touch devices are told to "tap", not to "drop or click".
 */
import { useState, useRef, useCallback, useId } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileDropZoneProps {
  accept: string;
  acceptLabel: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  maxSizeMB?: number;
  /** Called with one message per rejected file (too large, wrong type, empty, extra files in single mode). */
  onReject?: (messages: string[]) => void;
  /** Disable picking while the tool is busy. */
  disabled?: boolean;
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Does `file` match the input's accept list (".pdf,image/png,image/*")? Lenient: extension OR MIME type. */
export function fileMatchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((t) => {
    if (t === '*' || t === '*/*') return true;
    if (t.startsWith('.')) return name.endsWith(t);
    if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1));
    return type === t;
  });
}

export default function FileDropZone({
  accept,
  acceptLabel,
  multiple = false,
  onFiles,
  maxSizeMB = 50,
  onReject,
  disabled = false,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageId = useId();

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (disabled || !fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      const limit = maxSizeMB * 1024 * 1024;
      const messages: string[] = [];
      const valid: File[] = [];
      for (const f of files) {
        if (!fileMatchesAccept(f, accept)) {
          messages.push(`"${f.name}" was skipped: this file type is not supported here.`);
        } else if (f.size > limit) {
          messages.push(`"${f.name}" was skipped: it is ${formatMB(f.size)} and the limit is ${maxSizeMB} MB per file.`);
        } else if (f.size === 0) {
          messages.push(`"${f.name}" was skipped: the file is empty.`);
        } else {
          valid.push(f);
        }
      }
      if (!multiple && valid.length > 1) {
        messages.push(`This tool works on one file at a time, so only "${valid[0].name}" was used.`);
      }
      setRejected(messages);
      if (messages.length > 0) onReject?.(messages);
      if (valid.length > 0) onFiles(multiple ? valid : [valid[0]]);
    },
    [onFiles, onReject, multiple, maxSizeMB, accept, disabled],
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

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const stateClasses = disabled
    ? 'opacity-60 cursor-not-allowed border-neutral-300 bg-neutral-50'
    : dragActive
      ? 'cursor-pointer border-primary-500 bg-primary-50 scale-[1.01]'
      : 'cursor-pointer border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-white';

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={`Upload ${multiple ? 'files' : 'a file'}. ${acceptLabel}. Maximum ${maxSizeMB} MB per file.`}
        aria-describedby={rejected.length > 0 ? messageId : undefined}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed transition-all duration-200 ${stateClasses}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
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
            <span className="pointer-coarse:hidden">Drop {multiple ? 'files' : 'a file'} here or click to browse</span>
            <span className="hidden pointer-coarse:inline">Tap to choose {multiple ? 'files' : 'a file'}</span>
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
          onChange={(e) => {
            handleFiles(e.target.files);
            // Reset so picking the same file again fires a change event (FILES-10).
            e.target.value = '';
          }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {rejected.length > 0 && (
        <div id={messageId} role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
          {rejected.map((m, i) => <p key={i}>{m}</p>)}
        </div>
      )}
    </div>
  );
}
