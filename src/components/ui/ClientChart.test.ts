/**
 * ClientChart keeps Recharts' own tab stops off (A11Y-PERF-11): the chart root's
 * accessibility layer and a Pie's tabIndex-0 layer.
 */
import { describe, it, expect } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { PieChart, Pie, Cell, Tooltip, AreaChart, Area } from 'recharts';
import { withoutAccessibilityLayer } from './ClientChart';

type Props = { accessibilityLayer?: boolean; rootTabIndex?: number; children?: ReactElement | ReactElement[] };

describe('withoutAccessibilityLayer', () => {
  it('turns off the chart layer and the Pie tab stop', () => {
    const chart = createElement(
      PieChart,
      null,
      createElement(Pie, { data: [{ name: 'a', value: 1 }], dataKey: 'value' }, createElement(Cell, { fill: '#000' })),
      createElement(Tooltip),
    );
    const out = withoutAccessibilityLayer(chart) as ReactElement<Props>;
    expect(out.props.accessibilityLayer).toBe(false);
    const kids = out.props.children as ReactElement<Props>[];
    const pie = kids.find((k) => k.type === Pie)!;
    expect(pie.props.rootTabIndex).toBe(-1);
    // The Pie's own children (its Cells) are left alone.
    expect((pie.props.children as ReactElement).type).toBe(Cell);
  });

  it('finds a Pie nested one level down', () => {
    const chart = createElement(
      PieChart,
      null,
      createElement('g', null, createElement(Pie, { data: [], dataKey: 'value' })),
    );
    const out = withoutAccessibilityLayer(chart) as ReactElement<Props>;
    const g = out.props.children as ReactElement<Props>;
    const pie = (Array.isArray(g.props.children) ? g.props.children[0] : g.props.children) as ReactElement<Props>;
    expect(pie.props.rootTabIndex).toBe(-1);
  });

  it('respects what the caller set', () => {
    const chart = createElement(
      PieChart,
      { accessibilityLayer: true },
      createElement(Pie, { data: [], dataKey: 'value', rootTabIndex: 0 }),
    );
    const out = withoutAccessibilityLayer(chart) as ReactElement<Props>;
    expect(out.props.accessibilityLayer).toBe(true);
    expect((out.props.children as ReactElement<Props>).props.rootTabIndex).toBe(0);
  });

  it('leaves other charts alone apart from the layer', () => {
    const chart = createElement(AreaChart, { data: [] }, createElement(Area, { dataKey: 'v' }));
    const out = withoutAccessibilityLayer(chart) as ReactElement<Props>;
    expect(out.props.accessibilityLayer).toBe(false);
    expect((out.props.children as ReactElement<Props>).props.rootTabIndex).toBeUndefined();
  });
});
