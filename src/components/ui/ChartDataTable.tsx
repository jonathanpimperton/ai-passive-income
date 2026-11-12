/**
 * Collapsible "Show data" table that gives a chart an accessible, text
 * equivalent (WCAG 1.1.1 / 1.3.1). Place it directly below the chart it
 * describes:
 *
 *   <ChartDataTable
 *     caption="Balance by year"
 *     columns={[
 *       { key: 'year', label: 'Year', numeric: true },
 *       { key: 'balance', label: 'Balance', format: (v) => formatCurrency(Number(v), cc) },
 *     ]}
 *     rows={chartData}
 *   />
 *
 * Behaviour a calculator author needs to know:
 * - Collapsed by default. While collapsed the region carries `inert` and
 *   `aria-hidden="true"`, so nothing inside is focusable or announced.
 * - The table is only mounted after the first open (and then stays mounted
 *   so the close animation has content). Hidden 100+ row tables therefore
 *   cost nothing on every slider tick, and the SSR markup of a collapsed
 *   table holds only the toggle and an empty region.
 * - The caption is visually hidden (the chart above already has a visible
 *   heading). It is the table's accessible name and is also appended to the
 *   toggle's accessible name ("Show data: Balance by year"), so several
 *   toggles on one page stay distinguishable to screen-reader users.
 * - Toggle text: `toggleLabel` (default "Show data"). When open, a label that
 *   starts with "Show " reads "Hide ..." instead ("Show data" -> "Hide data",
 *   "Show yearly figures" -> "Hide yearly figures"). Any other label is left
 *   unchanged and only `aria-expanded` changes.
 * - Column defaults: the first column is left-aligned, non-numeric and
 *   rendered as the row header (`<th scope="row">`); every other column is
 *   right-aligned and numeric. Numeric cells get `.tabular-nums` (the mono
 *   figure face). Set `numeric: true` on the first column if it holds
 *   figures such as years. `format` receives the raw value and the whole
 *   row; without it, null/undefined render as an empty cell and anything
 *   else as `String(value)`.
 * - Column `key`s must be unique within `columns`.
 * - Renders nothing when `rows` is empty.
 * - The root carries `data-pdf-hide`: the chart image already represents
 *   the data in a PDF export, and the export's overflow neutralising would
 *   otherwise spill the full table into the capture.
 * - Safe for SSR: no window/document access during render.
 */
import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ChartDataColumn {
  /** Property name in each row. Must be unique within `columns`. */
  key: string;
  /** Header text. */
  label: string;
  /** Default: first column 'left', all others 'right'. */
  align?: 'left' | 'right';
  /** Default: false for the first column, true for all others. Numeric cells get `tabular-nums`. */
  numeric?: boolean;
  /** Cell text. Default: '' for null/undefined, otherwise String(value). */
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface ChartDataTableProps {
  /** Table caption and accessible name, e.g. "Balance by year". Visually hidden. */
  caption: string;
  columns: ChartDataColumn[];
  rows: Array<Record<string, unknown>>;
  /** Base id; the toggle gets `${id}-toggle` and the region `${id}-region`. Default: React useId(). */
  id?: string;
  /** Default false. */
  defaultOpen?: boolean;
  /** Extra classes for the root element (e.g. margins). */
  className?: string;
  /** Default "Show data". A leading "Show " becomes "Hide " while open. */
  toggleLabel?: string;
}

const DEFAULT_TOGGLE_LABEL = 'Show data';

function openLabelFor(closedLabel: string): string {
  return closedLabel.startsWith('Show ') ? `Hide ${closedLabel.slice(5)}` : closedLabel;
}

function cellText(column: ChartDataColumn, row: Record<string, unknown>): string {
  const value = row[column.key];
  if (column.format) return column.format(value, row);
  return value === null || value === undefined ? '' : String(value);
}

export default function ChartDataTable({
  caption,
  columns,
  rows,
  id,
  defaultOpen = false,
  className,
  toggleLabel = DEFAULT_TOGGLE_LABEL,
}: ChartDataTableProps) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const toggleId = `${baseId}-toggle`;
  const regionId = `${baseId}-region`;

  const [open, setOpen] = useState(defaultOpen);
  // Mount the table on first open; keep it mounted afterwards so the close
  // animation still has content to collapse.
  const [hasOpened, setHasOpened] = useState(defaultOpen);

  if (rows.length === 0 || columns.length === 0) return null;

  const handleToggle = () => {
    if (!open) setHasOpened(true);
    setOpen(!open);
  };

  const label = open ? openLabelFor(toggleLabel) : toggleLabel;
  const lastRowIndex = rows.length - 1;

  return (
    <div data-pdf-hide className={`min-w-0${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        id={toggleId}
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex items-center gap-1.5 py-1 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        <span>{label}</span>
        <span className="sr-only">: {caption}</span>
      </button>

      <div
        id={regionId}
        inert={open ? undefined : true}
        aria-hidden={open ? undefined : true}
        className={`grid grid-cols-1 transition-all duration-200 ${
          open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 min-w-0 overflow-hidden">
          {hasOpened && (
            <div className="max-h-80 overflow-auto rounded-lg border border-neutral-200/80">
              <table className="w-full text-sm border-separate border-spacing-0">
                <caption className="sr-only">{caption}</caption>
                <thead>
                  <tr>
                    {columns.map((column, c) => {
                      const align = column.align ?? (c === 0 ? 'left' : 'right');
                      return (
                        <th
                          key={column.key}
                          scope="col"
                          className={`sticky top-0 z-10 bg-neutral-50 border-b border-neutral-200/80 py-2.5 px-4 font-medium text-neutral-600 whitespace-nowrap ${
                            align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {column.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => {
                    const rowBorder = r < lastRowIndex ? ' border-b border-neutral-100' : '';
                    return (
                      // Rows are a positional series (one per chart point), so the index is the identity.
                      <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                        {columns.map((column, c) => {
                          const align = column.align ?? (c === 0 ? 'left' : 'right');
                          const numeric = column.numeric ?? c !== 0;
                          const cls = `py-2 px-4 whitespace-nowrap ${
                            align === 'right' ? 'text-right' : 'text-left'
                          }${numeric ? ' tabular-nums' : ''}${rowBorder}`;
                          const text = cellText(column, row);
                          return c === 0 ? (
                            <th key={column.key} scope="row" className={`${cls} font-medium text-neutral-900`}>
                              {text}
                            </th>
                          ) : (
                            <td key={column.key} className={`${cls} text-neutral-700`}>
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
