/**
 * File-name and size helpers shared by the file converter tools.
 * Pure functions (no DOM), unit-tested in names.test.ts.
 */

/** Human-readable byte size: "512 B", "14.1 KB", "2.74 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * How a new size compares with the old one, as a phrase that reads after "is" and stays true for
 * any size: "the same size as", "12% larger than", "3.4 times the size of" (from 2x up).
 */
export function describeSizeChange(newSize: number, oldSize: number): string {
  if (!(oldSize > 0) || !(newSize > oldSize)) return 'the same size as';
  const ratio = newSize / oldSize;
  if (ratio >= 2) return `${ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10} times the size of`;
  return `${Math.max(1, Math.round((ratio - 1) * 100))}% larger than`;
}

/**
 * The file name without its final extension. "photo.HEIC" -> "photo",
 * "x.jpg" -> "x", "archive.tar.gz" -> "archive.tar", ".env" -> ".env",
 * "README" -> "README". Path separators are dropped defensively.
 */
export function baseName(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? name;
  const dot = leaf.lastIndexOf('.');
  if (dot <= 0) return leaf || 'file';
  return leaf.slice(0, dot);
}

/** Replace any extension with `ext` (which must include the dot): "x.jpg" + ".jpg" -> "x.jpg", never "x.jpg.jpg". */
export function withExtension(name: string, ext: string): string {
  return baseName(name) + ext;
}

/** Lower-case extension including the dot, or '' when there is none. */
export function extensionOf(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? name;
  const dot = leaf.lastIndexOf('.');
  return dot > 0 ? leaf.slice(dot).toLowerCase() : '';
}

/**
 * Make every name in the list unique (case-insensitively, as Windows and
 * macOS file systems are) by appending " (2)", " (3)"... before the
 * extension. Used for ZIP entries, where duplicates would overwrite.
 */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    let n = 2;
    while (seen.has(candidate.toLowerCase())) {
      const ext = extensionOf(name);
      candidate = `${baseName(name)} (${n})${ext}`;
      n += 1;
    }
    seen.add(candidate.toLowerCase());
    return candidate;
  });
}

/** "3 files" / "1 file". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
