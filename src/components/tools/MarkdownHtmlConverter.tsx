/**
 * Markdown ↔ HTML Converter — bidirectional conversion using marked.
 * Live preview, copy, download. No server upload.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Download, Copy, Check, ArrowLeftRight, FileText, Eye } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

type Mode = 'md-to-html' | 'html-to-md';

let markedInstance: typeof import('marked') | null = null;

async function loadMarked() {
  if (!markedInstance) {
    markedInstance = await import('marked');
  }
  return markedInstance;
}

/** Strip dangerous tags/attributes from HTML to prevent XSS */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,input,textarea,button').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
      if (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}

function markdownToHtml(md: string): string {
  if (!markedInstance) return '<p>Loading converter...</p>';
  return sanitizeHtml(markedInstance.marked(md) as string);
}

function htmlToMarkdown(html: string): string {
  // Simple HTML-to-Markdown conversion (covers common tags)
  let md = html;
  // Headers
  md = md.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => '#'.repeat(Number(level)) + ' ' + text.trim() + '\n\n');
  // Bold, italic
  md = md.replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*');
  // Code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  // Links and images
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  // Lists
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');
  // Paragraphs and breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<hr\s*\/?>/gi, '---\n\n');
  // Blockquotes
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, content) =>
    content.trim().split('\n').map((l: string) => '> ' + l.trim()).join('\n') + '\n\n');
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

export default function MarkdownHtmlConverter() {
  const [mode, setMode] = useState<Mode>('md-to-html');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [ready, setReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMarked().then(() => setReady(true));
  }, []);

  const result = useMemo(() => {
    if (!input.trim()) return '';
    if (mode === 'md-to-html') return ready ? markdownToHtml(input) : 'Loading...';
    return htmlToMarkdown(input);
  }, [input, mode, ready]);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const text = await f.text();
    setInput(text);
    if (f.name.endsWith('.html') || f.name.endsWith('.htm')) setMode('html-to-md');
    else if (f.name.endsWith('.md') || f.name.endsWith('.markdown')) setMode('md-to-html');
  }, []);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
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

  return (
    <div className="space-y-5">
      <PrivacyBadge />

      <div className="flex items-center gap-3">
        <button
          onClick={toggleMode}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-colors duration-150"
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          {mode === 'md-to-html' ? 'Markdown → HTML' : 'HTML → Markdown'}
        </button>
        {mode === 'md-to-html' && result && (
          <button
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
            className="w-full rounded-xl border border-neutral-200 bg-white text-neutral-900 text-sm font-mono p-4
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 resize-y"
          />
        </div>

        {/* Output */}
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center justify-between">
            <label htmlFor="md-html-output" className="text-sm font-medium text-neutral-700">
              {showPreview ? 'Preview' : mode === 'md-to-html' ? 'HTML Output' : 'Markdown Output'}
            </label>
            {result && (
              <div className="flex items-center gap-2">
                <button onClick={copyResult} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors duration-150">
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={downloadResult} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors duration-150">
                  <Download size={14} aria-hidden="true" /> Download
                </button>
              </div>
            )}
          </div>

          {showPreview && mode === 'md-to-html' ? (
            <div
              ref={previewRef}
              className="prose prose-sm max-w-none rounded-xl border border-neutral-200 bg-white p-4 min-h-[350px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          ) : (
            <textarea
              id="md-html-output"
              readOnly
              value={result}
              placeholder="Output appears here..."
              rows={18}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm font-mono p-4 resize-y"
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
