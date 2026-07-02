/**
 * rehype-mono-figures — wraps financial figures in markdown-rendered content
 * in `<span class="tabular-nums">`, which global.css maps to the mono
 * instrument face (JetBrains Mono + tabular numerals).
 *
 * Scope is deliberately conservative:
 *   - text nodes inside <td> / <th> (comparison + scenario tables)
 *   - <strong> nodes directly inside <p> (bold stat callouts)
 * Anything inside <code>, <pre>, <a>, or an existing .tabular-nums span
 * is left untouched.
 */
import { visit, SKIP } from 'unist-util-visit';

/** Money/number tokens: £1,234.56, $500K, €2m, 1,000,000, 4.5% … */
const FIGURE_RE = /[£$€]\s?[\d,]+(\.\d+)?[KkMm%]?|\b\d{1,3}(,\d{3})+(\.\d+)?\b|\b\d+(\.\d+)?%/g;

/** Never descend into these — links keep their own styling, code is code */
const SKIP_TAGS = new Set(['code', 'pre', 'a', 'script', 'style']);

function hasTabularNums(node) {
  const cls = node.properties && node.properties.className;
  if (Array.isArray(cls)) return cls.includes('tabular-nums');
  return typeof cls === 'string' && cls.split(/\s+/).includes('tabular-nums');
}

/** Split a text value into text + <span class="tabular-nums"> nodes, or null if no figures */
function splitFigures(value) {
  FIGURE_RE.lastIndex = 0;
  const out = [];
  let last = 0;
  let match;
  while ((match = FIGURE_RE.exec(value)) !== null) {
    if (match.index > last) {
      out.push({ type: 'text', value: value.slice(last, match.index) });
    }
    out.push({
      type: 'element',
      tagName: 'span',
      properties: { className: ['tabular-nums'] },
      children: [{ type: 'text', value: match[0] }],
    });
    last = match.index + match[0].length;
  }
  if (out.length === 0) return null;
  if (last < value.length) {
    out.push({ type: 'text', value: value.slice(last) });
  }
  return out;
}

/** Recursively wrap figure tokens in an element's text children */
function wrapFigures(node) {
  if (node.type !== 'element' || SKIP_TAGS.has(node.tagName) || hasTabularNums(node)) return;
  const next = [];
  let changed = false;
  for (const child of node.children || []) {
    if (child.type === 'text') {
      const parts = splitFigures(child.value);
      if (parts) {
        next.push(...parts);
        changed = true;
        continue;
      }
    } else if (child.type === 'element') {
      wrapFigures(child);
    }
    next.push(child);
  }
  if (changed) node.children = next;
}

export default function rehypeMonoFigures() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'td' || node.tagName === 'th') {
        wrapFigures(node);
        return SKIP; // subtree fully handled
      }
      if (node.tagName === 'p') {
        for (const child of node.children || []) {
          if (child.type === 'element' && child.tagName === 'strong') {
            wrapFigures(child);
          }
        }
        return SKIP; // only the <strong> children of paragraphs are in scope
      }
    });
  };
}
