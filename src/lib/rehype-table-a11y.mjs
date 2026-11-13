/**
 * rehype-table-a11y -- makes markdown tables self-describing for screen
 * readers (A11Y-PERF F-25):
 *   - every header cell in <thead> gets scope="col"
 *   - a table with no <caption> gets a visually hidden one, taken from the
 *     nearest preceding heading in the same section, so a screen-reader user
 *     jumping between tables hears what each one is about
 * Tables without a preceding heading keep no caption rather than a generic one.
 */
import { visit } from 'unist-util-visit';

const HEADING = /^h[2-6]$/;

function textOf(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

function isWhitespaceText(node) {
  return node.type === 'text' && !node.value.trim();
}

/** Text of the closest heading before `index` among `siblings`, or null. */
export function precedingHeadingText(siblings, index) {
  for (let i = index - 1; i >= 0; i--) {
    const node = siblings[i];
    if (isWhitespaceText(node) || node.type === 'comment') continue;
    if (node.type === 'element' && HEADING.test(node.tagName)) {
      const text = textOf(node).replace(/\s+/g, ' ').trim();
      return text || null;
    }
  }
  return null;
}

export default function rehypeTableA11y() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table') return;

      visit(node, 'element', (cell, _i, cellParent) => {
        if (cell.tagName !== 'th') return;
        cell.properties = cell.properties || {};
        if (cell.properties.scope) return;
        // Header cells of the header row describe columns.
        const inHead = cellParent && cellParent.tagName === 'tr' && isInThead(node, cellParent);
        if (inHead) cell.properties.scope = 'col';
      });

      const hasCaption = (node.children || []).some((c) => c.type === 'element' && c.tagName === 'caption');
      if (hasCaption || !parent || typeof index !== 'number') return;
      const text = precedingHeadingText(parent.children, index);
      if (!text) return;
      node.children = [
        {
          type: 'element',
          tagName: 'caption',
          properties: { className: ['sr-only'] },
          children: [{ type: 'text', value: text }],
        },
        ...(node.children || []),
      ];
    });
  };
}

function isInThead(table, row) {
  for (const section of table.children || []) {
    if (section.type === 'element' && section.tagName === 'thead' && (section.children || []).includes(row)) return true;
  }
  return false;
}
