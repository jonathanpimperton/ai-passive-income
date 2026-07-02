import { useState, useEffect } from 'react';

/**
 * Chart theme — the single visual system every calculator chart inherits
 * ("Precision Instrument"): flat solid grid at low-ink opacity (no dashes),
 * brand teal for the primary series, quiet neutral for comparison series,
 * semantic green/red only where a series means gain/cost, mono numerals on
 * axes and tooltips, no default recharts legend on 2-series charts (label
 * lines directly or use the stat cards instead).
 *
 * Usage:
 *   const theme = useChartTheme();
 *   <CartesianGrid stroke={theme.grid} vertical={false} />
 *   <XAxis tick={{ fill: theme.axisText, fontSize: 12, fontFamily: theme.monoFont }} ... />
 *   <Area stroke={theme.series1} strokeWidth={2} fill={theme.series1Fill} ... />
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  axisText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Primary data series — brand teal */
  series1: string;
  /** Soft area fill under series1 */
  series1Fill: string;
  /** Secondary/comparison series — quiet neutral */
  series2: string;
  series2Fill: string;
  /** Semantic: money gained/kept */
  gain: string;
  /** Semantic: money paid/lost (interest, tax, fees) */
  cost: string;
  /** Donut/segment palette — teal-led, ordered */
  segments: string[];
  /** Mono stack for axis ticks and tooltip numerals */
  monoFont: string;
}

const MONO = "'JetBrains Mono', ui-monospace, monospace";

const LIGHT: ChartTheme = {
  grid: '#ECECEA',
  axis: '#E4E4E0',
  axisText: '#6B7280',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E4E4E0',
  tooltipText: '#14161A',
  series1: '#0B6E6E',
  series1Fill: 'rgba(11, 110, 110, 0.10)',
  series2: '#979DA8',
  series2Fill: 'rgba(151, 157, 168, 0.12)',
  gain: '#1A7F4B',
  cost: '#C4442A',
  segments: ['#0B6E6E', '#979DA8', '#38AEAE', '#C6C9CF', '#0A5555'],
  monoFont: MONO,
};

const DARK: ChartTheme = {
  grid: '#2A2F38',
  axis: '#2D333E',
  axisText: '#9CA3AF',
  tooltipBg: '#1E2128',
  tooltipBorder: '#2D333E',
  tooltipText: '#E5E7EB',
  series1: '#38AEAE',
  series1Fill: 'rgba(56, 174, 174, 0.14)',
  series2: '#6B7280',
  series2Fill: 'rgba(107, 114, 128, 0.14)',
  gain: '#3FBF7F',
  cost: '#E0664A',
  segments: ['#38AEAE', '#6B7280', '#6EC7C7', '#3D4451', '#0E8585'],
  monoFont: MONO,
};

export function useChartTheme(): ChartTheme {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK : LIGHT;
}
