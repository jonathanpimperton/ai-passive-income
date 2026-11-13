/**
 * Inflation engine and US CPI-U data for the Inflation Calculator.
 *
 * Data: BLS CPI for All Urban Consumers (CPI-U), U.S. city average, all items,
 * not seasonally adjusted, 1982-84 = 100 (series CUUR0000SA0).
 * - Annual averages 1913-2025, from the BLS Public Data API (period M13,
 *   "Annual"): https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0
 *   Series page: https://data.bls.gov/timeseries/CUUR0000SA0
 *   Accessed 2026-11-12. BLS publishes annual averages to one decimal place
 *   before 2007 and three decimals from 2007.
 * - 2025: BLS did not collect October 2025 prices ("Data unavailable due to
 *   the 2025 lapse in appropriations"); its published 2025 annual average,
 *   321.943, is the mean of the other 11 months.
 * - Latest month: the newest monthly index, used as "now" for the current
 *   year until a full-year average exists. It is labelled with its month
 *   everywhere it is shown.
 *
 * FRESHNESS: BLS releases each month's CPI in the middle of the following
 * month. Update CPI_U_LATEST monthly (or at least quarterly) and add the
 * annual average each January. CPI_DATA_CHECKED is the date the figures
 * were last compared with BLS.
 */

export const CPI_DATA_CHECKED = '2026-11-12';

export const CPI_SOURCE = {
  series: 'CUUR0000SA0',
  name: 'CPI-U, U.S. city average, all items (BLS)',
  url: 'https://data.bls.gov/timeseries/CUUR0000SA0',
} as const;

/** BLS CPI-U annual averages (1982-84 = 100). */
export const CPI_U_ANNUAL: Readonly<Record<number, number>> = {
  1913: 9.9, 1914: 10.0, 1915: 10.1, 1916: 10.9, 1917: 12.8, 1918: 15.1,
  1919: 17.3, 1920: 20.0, 1921: 17.9, 1922: 16.8, 1923: 17.1, 1924: 17.1,
  1925: 17.5, 1926: 17.7, 1927: 17.4, 1928: 17.1, 1929: 17.1, 1930: 16.7,
  1931: 15.2, 1932: 13.7, 1933: 13.0, 1934: 13.4, 1935: 13.7, 1936: 13.9,
  1937: 14.4, 1938: 14.1, 1939: 13.9, 1940: 14.0, 1941: 14.7, 1942: 16.3,
  1943: 17.3, 1944: 17.6, 1945: 18.0, 1946: 19.5, 1947: 22.3, 1948: 24.1,
  1949: 23.8, 1950: 24.1, 1951: 26.0, 1952: 26.5, 1953: 26.7, 1954: 26.9,
  1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.1, 1960: 29.6,
  1961: 29.9, 1962: 30.2, 1963: 30.6, 1964: 31.0, 1965: 31.5, 1966: 32.4,
  1967: 33.4, 1968: 34.8, 1969: 36.7, 1970: 38.8, 1971: 40.5, 1972: 41.8,
  1973: 44.4, 1974: 49.3, 1975: 53.8, 1976: 56.9, 1977: 60.6, 1978: 65.2,
  1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6, 1984: 103.9,
  1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0, 1990: 130.7,
  1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9,
  1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9,
  2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.342, 2008: 215.303,
  2009: 214.537, 2010: 218.056, 2011: 224.939, 2012: 229.594, 2013: 232.957, 2014: 236.736,
  2015: 237.017, 2016: 240.007, 2017: 245.120, 2018: 251.107, 2019: 255.657, 2020: 258.811,
  2021: 270.970, 2022: 292.655, 2023: 304.702, 2024: 313.689, 2025: 321.943,
};

/** Newest monthly CPI-U index (BLS), used as the current-year value. */
export const CPI_U_LATEST = {
  year: 2026,
  /** 1-12 */
  month: 10,
  value: 337.511,
  label: 'October 2026',
} as const;

export const CPI_FIRST_YEAR = 1913;
export const CPI_LAST_FULL_YEAR = 2025;
/** Last selectable year: the latest month's year. */
export const CPI_LAST_YEAR = CPI_U_LATEST.year;

/** CPI value for a year: the annual average, or the latest month for the current year. */
export function cpiFor(year: number): number | null {
  if (year === CPI_U_LATEST.year) return CPI_U_LATEST.value;
  const v = CPI_U_ANNUAL[year];
  return typeof v === 'number' ? v : null;
}

/** "2026 (October)" for the partial year, plain "2019" otherwise. */
export function cpiYearLabel(year: number): string {
  return year === CPI_U_LATEST.year ? `${year} (${CPI_U_LATEST.label.split(' ')[0]})` : String(year);
}

export interface HistoricalResult {
  /** amount expressed in toYear prices. */
  adjusted: number;
  /** Cumulative price change from fromYear to toYear (decimal; negative = prices fell). */
  cumulativeChange: number;
  /** Compound average annual change (decimal). */
  averageAnnual: number;
  /** Elapsed years (decimal: the latest month counts as part of its year). */
  years: number;
}

/**
 * Value of `amount` from `fromYear` in `toYear` prices: amount * CPI(to) / CPI(from).
 * Works in either direction. Returns null for years outside the data or equal years.
 */
export function adjustForInflation(amount: number, fromYear: number, toYear: number): HistoricalResult | null {
  const from = cpiFor(fromYear);
  const to = cpiFor(toYear);
  if (from === null || to === null || fromYear === toYear) return null;
  const ratio = to / from;
  // Annual averages sit at mid-year; the latest month sits at its own month.
  const position = (y: number) => (y === CPI_U_LATEST.year ? y + (CPI_U_LATEST.month - 0.5) / 12 : y + 0.5);
  const years = Math.abs(position(toYear) - position(fromYear));
  const growth = toYear > fromYear ? ratio : 1 / ratio;
  return {
    adjusted: (Number.isFinite(amount) ? amount : 0) * ratio,
    cumulativeChange: growth - 1,
    averageAnnual: Math.pow(growth, 1 / years) - 1,
    years,
  };
}

export interface FutureResult {
  /** What `amount` of today's goods will cost. */
  futureCost: number;
  /** What `amount` will buy, in today's money. */
  purchasingPower: number;
  totalInflation: number;
}

export function projectInflation(amount: number, annualRate: number, years: number): FutureResult {
  const a = Number.isFinite(amount) ? amount : 0;
  const factor = Math.pow(1 + (Number.isFinite(annualRate) ? annualRate : 0), Math.max(0, years));
  return { futureCost: a * factor, purchasingPower: a / factor, totalInflation: factor - 1 };
}

/** Year-by-year series between two years (inclusive, either direction). */
export function historicalSeries(amount: number, fromYear: number, toYear: number): Array<{ year: number; value: number }> {
  const from = cpiFor(fromYear);
  if (from === null) return [];
  const step = toYear >= fromYear ? 1 : -1;
  const rows: Array<{ year: number; value: number }> = [];
  for (let y = fromYear; step > 0 ? y <= toYear : y >= toYear; y += step) {
    const cpi = cpiFor(y);
    if (cpi !== null) rows.push({ year: y, value: amount * (cpi / from) });
  }
  return step > 0 ? rows : rows.reverse();
}
