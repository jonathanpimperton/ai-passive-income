/**
 * CSV ↔ JSON Converter — bidirectional conversion using PapaParse.
 * Paste or upload, preview output, download result. No server upload.
 */
import { useState, useCallback, useMemo } from 'react';
import { Download, Copy, Check, ArrowLeftRight, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

type Mode = 'csv-to-json' | 'json-to-csv';

/** Split a CSV line respecting quoted fields (handles commas inside quotes) */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function csvToJson(csv: string): { result: string; error: string } {
  try {
    // Lazy import PapaParse
    const Papa = (window as Record<string, unknown>).__papa as typeof import('papaparse') | undefined;
    if (Papa) {
      const parsed = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        return { result: '', error: `Parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row})` };
      }
      return { result: JSON.stringify(parsed.data, null, 2), error: '' };
    }
    // Fallback: quote-aware CSV parser
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return { result: '[]', error: '' };
    const headers = splitCsvLine(lines[0]);
    const data = lines.slice(1).filter((l) => l.trim()).map((line) => {
      const vals = splitCsvLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
    return { result: JSON.stringify(data, null, 2), error: '' };
  } catch (e) {
    return { result: '', error: e instanceof Error ? e.message : 'Parse error' };
  }
}

function jsonToCsv(json: string): { result: string; error: string } {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length === 0) {
      return { result: '', error: 'JSON must be an array of objects' };
    }
    const headers = Object.keys(data[0]);
    const rows = data.map((row: Record<string, unknown>) =>
      headers.map((h) => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(','),
    );
    return { result: [headers.join(','), ...rows].join('\n'), error: '' };
  } catch (e) {
    return { result: '', error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

export default function CsvJsonConverter() {
  const [mode, setMode] = useState<Mode>('csv-to-json');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [papaLoaded, setPapaLoaded] = useState(false);

  // Load PapaParse lazily
  const loadPapa = useCallback(async () => {
    if (papaLoaded) return;
    try {
      const Papa = await import('papaparse');
      (window as Record<string, unknown>).__papa = Papa;
      setPapaLoaded(true);
    } catch {
      // Fallback to simple parser
    }
  }, [papaLoaded]);

  const { result, error } = useMemo(() => {
    if (!input.trim()) return { result: '', error: '' };
    return mode === 'csv-to-json' ? csvToJson(input) : jsonToCsv(input);
  }, [input, mode]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      await loadPapa();
      const f = files[0];
      if (!f) return;
      const text = await f.text();
      setInput(text);
      // Auto-detect mode from file extension
      if (f.name.endsWith('.json')) setMode('json-to-csv');
      else if (f.name.endsWith('.csv')) setMode('csv-to-json');
    },
    [loadPapa],
  );

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = result;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResult = () => {
    const ext = mode === 'csv-to-json' ? '.json' : '.csv';
    const mime = mode === 'csv-to-json' ? 'application/json' : 'text/csv';
    const blob = new Blob([result], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMode = () => {
    setMode(mode === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json');
    // Swap input/output if the result is valid
    if (result) setInput(result);
  };

  return (
    <div className="space-y-5">
      <PrivacyBadge />

      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMode}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'csv-to-json' ? 'CSV → JSON' : 'JSON → CSV'}
        </button>
        <span className="text-xs text-neutral-500">Click to swap direction</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="space-y-3">
          <label htmlFor="csv-json-input" className="block text-sm font-medium text-neutral-700">
            {mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
          </label>
          <FileDropZone
            accept={mode === 'csv-to-json' ? '.csv,text/csv' : '.json,application/json'}
            acceptLabel={mode === 'csv-to-json' ? 'Drop a .csv file' : 'Drop a .json file'}
            onFiles={handleFiles}
          />
          <textarea
            id="csv-json-input"
            value={input}
            onChange={(e) => { setInput(e.target.value); loadPapa(); }}
            placeholder={
              mode === 'csv-to-json'
                ? 'name,age,city\nAlice,30,NYC\nBob,25,LA'
                : '[{"name":"Alice","age":30,"city":"NYC"}]'
            }
            rows={12}
            className="w-full rounded-xl border border-neutral-200 bg-white text-neutral-900 text-sm font-mono p-4
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 resize-y"
          />
        </div>

        {/* Output */}
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center justify-between">
            <label htmlFor="csv-json-output" className="text-sm font-medium text-neutral-700">
              {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            </label>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyResult}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors duration-150"
                >
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={downloadResult}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors duration-150"
                >
                  <Download size={14} aria-hidden="true" />
                  Download
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <textarea
            id="csv-json-output"
            readOnly
            value={result}
            placeholder="Output appears here..."
            rows={16}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm font-mono p-4 resize-y"
          />
        </div>
      </div>

      {!input && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
          <p className="text-sm text-neutral-500">Paste data or upload a file to get started</p>
        </div>
      )}
    </div>
  );
}
