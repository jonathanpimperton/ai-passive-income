import { useState, useEffect } from 'react';

/** Chart color tokens that respond to light/dark mode */
export interface ChartTheme {
  grid: string;
  axis: string;
  axisText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT: ChartTheme = {
  grid: '#E5E7EB',
  axis: '#E5E7EB',
  axisText: '#6B7280',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E5E7EB',
  tooltipText: '#111827',
};

const DARK: ChartTheme = {
  grid: '#2D3748',
  axis: '#2D3748',
  axisText: '#9CA3AF',
  tooltipBg: '#1E2128',
  tooltipBorder: '#233044',
  tooltipText: '#E5E7EB',
};

export function useChartTheme(): ChartTheme {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK : LIGHT;
}
