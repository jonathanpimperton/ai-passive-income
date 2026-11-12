/**
 * Markdown <-> HTML Converter: Markdown to HTML with marked, HTML to Markdown
 * with turndown. Live preview, copy, download. No server upload.
 *
 * Safety: the preview is untrusted HTML. It is sanitised with DOMPurify and
 * rendered in a sandboxed iframe (no scripts, opaque origin) with its own
 * CSP; see src/lib/dev-tools/markdown-preview.ts. There is no raw-HTML sink
 * in this page.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight, FileText, Eye, AlertCircle, ShieldCheck } from 'lucide-react';
import type { DOMPurify } from 'dompurify';
import type TurndownService from 'turndown';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import {
  buildPreviewDocument,
  describeRemoved,
  installPreviewHooks,
  sanitizeHtml,
  type RemovedSummary,
} from '../../lib/dev-tools/markdown-preview';
import { useCopyFeedback } from '../../lib/dev-tools/clipboard';

type Mode = 'md-to-html' | 'html-to-md';

interface Libs {
  marked: typeof import('marked');
  previewPurifier: DOMPurify;
  outputPurifier: DOMPurify;
  turndown: TurndownService;
}

function createTurndown(TurndownCtor: typeof TurndownService): TurndownService {
  const td = new TurndownCtor({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Add table support (GFM tables)
  td.addRule('table', {
    filter: 'table',
    replacement: function (_content, node) {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.rows);
      if (rows.length === 0) return '';

      const getCellText = (cell: HTMLTableCellElement) =>
        cell.textContent?.trim().replace(/\|/g, '\\|') || '';

      const mdRows: string[] = [];

      // First row as header
      const headerCells = Array.from(rows[0].cells);
      mdRows.push('| ' + headerCells.map(getCellText).join(' | ') + ' |');
      mdRows.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');

      // Remaining rows
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].cells);
        // Pad cells to match header count
        while (cells.length < headerCells.length) {
          const td = document.createElement('td');
          cells.push(td);
        }
        mdRows.push('| ' + cells.map(getCellText).join(' | ') + ' |');
      }

      return '\n\n' + mdRows.join('\n') + '\n\n';
    },
  });

  // Handle thead/tbody/tr/td/th by removing them (handled by table rule)
  td.addRule('tableElements', {
    filter: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    replacement: function (content) {
      return content;
    },
  });
  return td;
}

function currentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

interface Conversion {
  output: string;
  /** Sanitised preview body (Markdown mode only). */
  previewHtml: string;
  /** What the preview sanitiser removed. */
  previewRemoved: RemovedSummary | null;
  /** What the output sanitiser removed (only when output sanitising is on). */
  outputRemoved: RemovedSummary | null;
  error: string;
}

const EMPTY: Conversion = { output: '', previewHtml: '', previewRemoved: null, outputRemoved: null, error: '' };

export default function MarkdownHtmlConverter() {
  const [mode, setMode] = useState<Mode>('md-to-html');
  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sanitizeOutput, setSanitizeOutput] = useState(true);
  const [libs, setLibs] = useState<Libs | null>(null);
  const [loadError, setLoadError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { copy, copiedKey, failedKey, message: copyMessage } = useCopyFeedback();

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('marked'), import('dompurify'), import('turndown')])
      .then(([markedMod, purifyMod, turndownMod]) => {
        if (cancelled) return;
        const createPurifier = purifyMod.default;
        const previewPurifier = createPurifier(window);
        installPreviewHooks(previewPurifier);
        const outputPurifier = createPurifier(window);
        if (!previewPurifier.isSupported || !outputPurifier.isSupported) {
          setLoadError('This browser cannot run the HTML sanitiser, so conversion is turned off. Try an up-to-date browser.');
          return;
        }
        setLibs({ marked: markedMod, previewPurifier, outputPurifier, turndown: createTurndown(turndownMod.default) });
      })
      .catch(() => {
        if (!cancelled) setLoadError('The converter failed to load. Check your connection and reload the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the preview's colours in step with the site theme toggle.
  useEffect(() => {
    setTheme(currentTheme());
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const conversion = useMemo<Conversion>(() => {
    if (!input.trim() || !libs) return EMPTY;
    try {
      if (mode === 'html-to-md') {
        return { ...EMPTY, output: libs.turndown.turndown(input) };
      }
      const rawHtml = libs.marked.marked.parse(input, { async: false }) as string;
      const out = sanitizeOutput ? sanitizeHtml(libs.outputPurifier, rawHtml) : null;
      const preview = showPreview ? sanitizeHtml(libs.previewPurifier, rawHtml) : null;
      return {
        output: out ? out.html : rawHtml,
        previewHtml: preview ? preview.html : '',
        previewRemoved: preview ? preview.removed : null,
        outputRemoved: out ? out.removed : null,
        error: '',
      };
    } catch (e) {
      return { ...EMPTY, error: e instanceof Error ? `Conversion failed: ${e.message}` : 'Conversion failed.' };
    }
  }, [input, mode, libs, sanitizeOutput, showPreview]);

  const previewDoc = useMemo(
    () => (showPreview && mode === 'md-to-html' && conversion.output ? buildPreviewDocument(conversion.previewHtml, theme) : ''),
    [showPreview, mode, conversion.output, conversion.previewHtml, theme],
  );

  const result = conversion.output;
  const statusText = !input.trim()
    ? ''
    : loadError || (!libs ? 'Loading converter...' : conversion.error);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const text = await f.text();
    setInput(text);
    if (f.name.endsWith('.html') || f.name.endsWith('.htm')) setMode('html-to-md');
    else if (f.name.endsWith('.md') || f.name.endsWith('.markdown')) setMode('md-to-html');
  }, []);

  const downloadResult = () => {
    const ext = mode === 'md-to-html' ? '.html' : '.md';
    const mime = mode === 'md-to-html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([result], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMode = () => {
    setMode(mode === 'md-to-html' ? 'html-to-md' : 'md-to-html');
    if (result) setInput(result);
  };

  const removedNotice = (() => {
    if (mode !== 'md-to-html') return '';
    const summary = showPreview ? conversion.previewRemoved : conversion.outputRemoved;
    if (!summary || summary.total === 0) return '';
    const list = describeRemoved(summary);
    if (showPreview) {
      return `The preview left out ${list} for safety.${sanitizeOutput ? ' They are also removed from the HTML output.' : ' The HTML output keeps them.'}`;
    }
    return `Removed from the HTML output for safety: ${list}. Untick "Remove unsafe HTML" to keep your HTML exactly as written.`;
  })();

  return (
    <div className="space-y-5">
      <PrivacyBadge />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'md-to-html' ? 'Markdown → HTML' : 'HTML → Markdown'}
        </button>
        {mode === 'md-to-html' && result && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors duration-150 ${
              showPreview
                ? 'border-primary-300 bg-primary-50 text-primary-600'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300'
            }`}
            aria-pressed={showPreview}
          >
            <Eye size={16} aria-hidden="true" />
            Preview
          </button>
        )}
        {mode === 'md-to-html' && (
          <label className="inline-flex items-center gap-2 min-h-[44px] text-sm text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={sanitizeOutput}
              onChange={(e) => setSanitizeOutput(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
            />
            Remove unsafe HTML from output
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="space-y-3">
          <label htmlFor="md-html-input" className="block text-sm font-medium text-neutral-700">
            {mode === 'md-to-html' ? 'Markdown Input' : 'HTML Input'}
          </label>
          <FileDropZone
            accept=".md,.markdown,.html,.htm,text/markdown,text/html"
            acceptLabel="Drop a .md or .html file"
            onFiles={handleFiles}
          />
          <textarea
            id="md-html-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'md-to-html'
                ? '# Hello World\n\nThis is **bold** and *italic*.\n\n- Item 1\n- Item 2'
                : '<h1>Hello World</h1>\n<p>This is <strong>bold</strong> and <em>italic</em>.</p>'
            }
            rows={14}
            spellCheck={false}
            className="w-full rounded-xl border border-neutral-200 bg-white text-neutral-900 text-base sm:text-sm font-mono p-4
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 resize-y"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            {showPreview && mode === 'md-to-html' ? (
              <p className="text-sm font-medium text-neutral-700">Preview</p>
            ) : (
              <label htmlFor="md-html-output" className="text-sm font-medium text-neutral-700">
                {mode === 'md-to-html' ? 'HTML Output' : 'Markdown Output'}
              </label>
            )}
            {result && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copy(result)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-sm font-medium text-neutral-600 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
                >
                  {copiedKey ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copiedKey ? 'Copied' : failedKey ? 'Copy failed' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={downloadResult}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-sm font-medium text-neutral-600 rounded-lg hover:text-primary-600 hover:bg-neutral-100 transition-colors duration-150"
                >
                  <Download size={14} aria-hidden="true" /> Download
                </button>
              </div>
            )}
          </div>
          <span className="sr-only" role="status" aria-live="polite">{copyMessage}</span>

          {statusText && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                loadError || conversion.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}
              role={loadError || conversion.error ? 'alert' : 'status'}
            >
              {(loadError || conversion.error) && <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />}
              <span>{statusText}</span>
            </div>
          )}

          {removedNotice && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <ShieldCheck size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{removedNotice}</span>
            </div>
          )}

          {showPreview && mode === 'md-to-html' && previewDoc ? (
            <div className="space-y-2">
              <div className="h-[480px] min-h-[350px] resize-y overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <iframe
                  title="Markdown preview"
                  sandbox=""
                  srcDoc={previewDoc}
                  referrerPolicy="no-referrer"
                  className="block w-full h-full border-0"
                />
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                The preview is isolated from this page: scripts never run, links are not followed and remote images are not loaded.
              </p>
            </div>
          ) : (
            <textarea
              id="md-html-output"
              readOnly
              value={result}
              placeholder="Output appears here..."
              rows={18}
              spellCheck={false}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-base sm:text-sm font-mono p-4 resize-y"
            />
          )}
        </div>
      </div>

      {!input && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
          <p className="text-sm text-neutral-500">Paste content or upload a file to get started</p>
        </div>
      )}
    </div>
  );
}
