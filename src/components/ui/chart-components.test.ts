/**
 * SSR markup tests for ChartSkeleton and ChartDataTable.
 *
 * Vitest runs in a node environment (no DOM), so these render with
 * react-dom/server and assert on the HTML string. That also proves both
 * components render on the server without touching window/document.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ChartSkeleton from './ChartSkeleton';
import ChartDataTable, { type ChartDataColumn, type ChartDataTableProps } from './ChartDataTable';

const columns: ChartDataColumn[] = [
  { key: 'year', label: 'Year' },
  { key: 'balance', label: 'Balance', format: (v) => `$${Number(v).toLocaleString('en-US')}` },
  { key: 'interest', label: 'Interest' },
];

const rows = [
  { year: 1, balance: 10500, interest: 500 },
  { year: 2, balance: 11025, interest: 525 },
  { year: 3, balance: 11576, interest: 551 },
];

function renderTable(overrides: Partial<ChartDataTableProps> = {}): string {
  return renderToStaticMarkup(
    createElement(ChartDataTable, { caption: 'Balance by year', columns, rows, ...overrides }),
  );
}

/** Returns the opening tag of the element with the given id. */
function openingTagById(html: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<[a-z]+[^>]*\\sid="${escaped}"[^>]*>`));
  if (!match) throw new Error(`No element with id="${id}" in markup`);
  return match[0];
}

function buttonTag(html: string): string {
  const match = html.match(/<button[^>]*>/);
  if (!match) throw new Error('No <button> in markup');
  return match[0];
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : null;
}

/** Splits the <tbody> into an array of <tr>...</tr> strings. */
function bodyRows(html: string): string[] {
  const tbody = html.match(/<tbody>([\s\S]*)<\/tbody>/);
  if (!tbody) throw new Error('No <tbody> in markup');
  return tbody[1].match(/<tr[\s\S]*?<\/tr>/g) ?? [];
}

describe('ChartSkeleton', () => {
  it('renders a decorative shimmer block with data-chart-pending and a px height', () => {
    const html = renderToStaticMarkup(createElement(ChartSkeleton, { height: 300 }));
    expect(html).toMatch(/^<div[^>]*>/);
    expect(html).toContain('data-chart-pending=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('style="height:300px"');
    expect(html).toContain('shimmer-line');
    expect(html).toContain('rounded-lg');
    expect(html).toContain('w-full');
    expect(html).not.toContain('aria-live');
    expect(html).not.toContain('role=');
  });

  it('accepts a CSS length string and merges className', () => {
    const html = renderToStaticMarkup(createElement(ChartSkeleton, { height: '18rem', className: 'mt-4' }));
    expect(html).toContain('style="height:18rem"');
    expect(html).toMatch(/class="[^"]*\bshimmer-line\b[^"]*\bmt-4\b[^"]*"/);
  });
});

describe('ChartDataTable', () => {
  it('is collapsed by default: aria-expanded=false, region inert + aria-hidden, table not mounted', () => {
    const html = renderTable();
    const button = buttonTag(html);
    expect(attr(button, 'type')).toBe('button');
    expect(attr(button, 'aria-expanded')).toBe('false');

    const regionId = attr(button, 'aria-controls');
    expect(regionId).toBeTruthy();
    const region = openingTagById(html, regionId as string);
    expect(region).toMatch(/\sinert=""/);
    expect(attr(region, 'aria-hidden')).toBe('true');
    expect(region).toContain('grid-rows-[0fr]');
    expect(region).toContain('opacity-0');

    // Lazy mount: no table markup until first open.
    expect(html).not.toContain('<table');
    expect(html).toContain('Show data');
  });

  it('defaultOpen: aria-expanded=true, region has neither inert nor aria-hidden', () => {
    const html = renderTable({ defaultOpen: true });
    const button = buttonTag(html);
    expect(attr(button, 'aria-expanded')).toBe('true');

    const region = openingTagById(html, attr(button, 'aria-controls') as string);
    expect(region).not.toMatch(/\sinert/);
    expect(region).not.toMatch(/\saria-hidden/);
    expect(region).toContain('grid-rows-[1fr]');
    expect(html).toContain('<table');
    expect(html).toContain('Hide data');
    expect(html).not.toContain('Show data');
  });

  it('renders the caption as the table accessible name and in the toggle name', () => {
    const html = renderTable({ defaultOpen: true });
    expect(html).toMatch(/<caption[^>]*>Balance by year<\/caption>/);
    // Caption is appended (visually hidden) to the toggle's accessible name.
    expect(html).toMatch(/<button[\s\S]*?Balance by year[\s\S]*?<\/button>/);
  });

  it('renders <th scope="col"> for every column', () => {
    const html = renderTable({ defaultOpen: true });
    const thead = html.match(/<thead>([\s\S]*)<\/thead>/);
    expect(thead).toBeTruthy();
    const headerCells = (thead as RegExpMatchArray)[1].match(/<th[^>]*>[^<]*<\/th>/g) ?? [];
    expect(headerCells).toHaveLength(columns.length);
    headerCells.forEach((cell, i) => {
      expect(cell).toContain('scope="col"');
      expect(cell).toContain(`>${columns[i].label}<`);
    });
    // Sticky header cells.
    expect(headerCells[0]).toContain('sticky');
  });

  it('renders the first cell of each body row as <th scope="row"> and the rest as <td>', () => {
    const html = renderTable({ defaultOpen: true });
    const trs = bodyRows(html);
    expect(trs).toHaveLength(rows.length);
    trs.forEach((tr, r) => {
      const cells = tr.match(/<(th|td)[^>]*>[^<]*<\/(th|td)>/g) ?? [];
      expect(cells).toHaveLength(columns.length);
      expect(cells[0]).toMatch(/^<th[^>]*\sscope="row"/);
      expect(cells[0]).toContain(`>${rows[r].year}<`);
      cells.slice(1).forEach((cell) => expect(cell).toMatch(/^<td/));
    });
  });

  it('applies tabular-nums to numeric cells only (default: all but the first column)', () => {
    const html = renderTable({ defaultOpen: true });
    const [firstRow] = bodyRows(html);
    const cells = firstRow.match(/<(th|td)[^>]*>/g) ?? [];
    expect(cells[0]).not.toContain('tabular-nums');
    expect(cells[0]).toContain('text-left');
    expect(cells[1]).toContain('tabular-nums');
    expect(cells[1]).toContain('text-right');
    expect(cells[2]).toContain('tabular-nums');
  });

  it('honours explicit numeric and align overrides', () => {
    const html = renderTable({
      defaultOpen: true,
      columns: [
        { key: 'year', label: 'Year', numeric: true, align: 'right' },
        { key: 'balance', label: 'Balance', numeric: false, align: 'left' },
      ],
    });
    const cells = bodyRows(html)[0].match(/<(th|td)[^>]*>/g) ?? [];
    expect(cells[0]).toContain('tabular-nums');
    expect(cells[0]).toContain('text-right');
    expect(cells[1]).not.toContain('tabular-nums');
    expect(cells[1]).toContain('text-left');
  });

  it('applies format() with the value and row, and defaults to String(value)', () => {
    const seen: Array<[unknown, Record<string, unknown>]> = [];
    const html = renderTable({
      defaultOpen: true,
      columns: [
        { key: 'year', label: 'Year' },
        {
          key: 'balance',
          label: 'Balance',
          format: (v, row) => {
            seen.push([v, row]);
            return `$${Number(v).toLocaleString('en-US')}`;
          },
        },
        { key: 'interest', label: 'Interest' },
      ],
    });
    expect(html).toContain('>$10,500<');
    expect(html).toContain('>$11,576<');
    expect(html).toContain('>525<');
    expect(seen[0][0]).toBe(10500);
    expect(seen[0][1]).toBe(rows[0]);
  });

  it('renders null/undefined values as empty cells', () => {
    const html = renderTable({
      defaultOpen: true,
      // No format() here, so the default formatter handles null/undefined.
      columns: [
        { key: 'year', label: 'Year' },
        { key: 'balance', label: 'Balance' },
        { key: 'interest', label: 'Interest' },
      ],
      rows: [{ year: 1, balance: null }],
    });
    const cells = bodyRows(html)[0].match(/<(th|td)[^>]*>[^<]*<\/(th|td)>/g) ?? [];
    expect(cells[1]).toMatch(/><\/td>$/);
    expect(cells[2]).toMatch(/><\/td>$/);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });

  it('aria-controls matches the region id; explicit id is used as the base', () => {
    const html = renderTable({ id: 'ci-growth-data' });
    const button = buttonTag(html);
    expect(attr(button, 'id')).toBe('ci-growth-data-toggle');
    expect(attr(button, 'aria-controls')).toBe('ci-growth-data-region');
    expect(openingTagById(html, 'ci-growth-data-region')).toMatch(/^<div/);
  });

  it('generates unique ids with useId when no id is given', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(ChartDataTable, { caption: 'A', columns, rows }),
        createElement(ChartDataTable, { caption: 'B', columns, rows }),
      ),
    );
    const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
    expect(controls).toHaveLength(2);
    expect(controls[0]).not.toBe(controls[1]);
    controls.forEach((id) => expect(openingTagById(html, id)).toBeTruthy());
  });

  it('derives the open label from a custom toggleLabel starting with "Show "', () => {
    expect(renderTable({ toggleLabel: 'Show yearly figures' })).toContain('Show yearly figures');
    expect(renderTable({ toggleLabel: 'Show yearly figures', defaultOpen: true })).toContain(
      'Hide yearly figures',
    );
    // Labels without a leading "Show " are left unchanged when open.
    expect(renderTable({ toggleLabel: 'Data table', defaultOpen: true })).toContain('>Data table<');
  });

  it('marks the root data-pdf-hide and renders nothing for empty rows', () => {
    // Bare JSX `data-pdf-hide` renders as ="true" (same as ExportPdfButton); pdf-export.ts
    // selects on attribute presence, so any value is fine.
    expect(renderTable()).toMatch(/^<div[^>]*\sdata-pdf-hide(="[^"]*")?[\s>]/);
    expect(renderTable({ rows: [] })).toBe('');
  });
});
