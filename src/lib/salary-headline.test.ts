/**
 * W2-SALARY (owner requirement 13 Nov 2026: "take home pay should be headline monthly as much as
 * annual rate"). Server-renders both salary calculators in their default state and in the
 * relief-at-source payslip state, and checks:
 * - the monthly and annual figures are two equal headline figures (same classes) inside the
 *   `[data-headline-result]` element the mobile result bar mirrors, labelled "a month" / "a year";
 * - 12 x monthly reconciles to annual within rounding;
 * - the live-region sentence mentions both;
 * - the payslip comparison appears only when relief at source changes the tax;
 * - the email rows include the monthly figure (and payslip rows) and survive the worker's sanitiser;
 * - the legacy gross `pensionAmount` default still means gross and maps onto the payslip field.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { sanitizeRows } from './email-sanitize';
import { calculateUkTakeHome } from './uk-tax-calc';
import { computeUsSalary } from './us-tax-calc';

// The first server render of each calculator transforms recharts, lucide and the chart chunks: slow on a busy machine.
vi.setConfig({ testTimeout: 30_000 });

const captured = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

vi.mock('../components/ui/EmailResultsButton', () => ({
  default: (props: Record<string, unknown>) => {
    captured.props.push(props);
    return null;
  },
}));

beforeEach(() => {
  captured.props = [];
});

async function render(file: 'SalaryUkCalc' | 'SalaryCalc', defaults?: Record<string, unknown>) {
  const mod = await import(`../components/tools/${file}.tsx`);
  return renderToString(createElement(mod.default, defaults ? { defaults } : {}));
}

/** The four <p> elements of the headline block: [monthly figure, unit, annual figure, unit]. */
function headlineParagraphs(html: string): Array<{ cls: string; text: string }> {
  const m = /data-headline-result(?:="")?[^>]*>(.*?)<\/div><\/div>/s.exec(html);
  expect(m, 'no [data-headline-result] block').toBeTruthy();
  return [...m![1].matchAll(/<p class="([^"]*)">(.*?)<\/p>/gs)].map((p) => ({ cls: p[1], text: p[2].replace(/<!-- -->/g, '') }));
}

const money = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

describe('monthly and annual take-home are equal headlines', () => {
  for (const [file, symbol] of [['SalaryUkCalc', '£'], ['SalaryCalc', '$']] as const) {
    it(`${file}: two figures, same classes, labelled a month / a year`, async () => {
      const [monthly, monthlyUnit, annual, annualUnit] = headlineParagraphs(await render(file));
      expect(monthlyUnit.text).toBe('a month');
      expect(annualUnit.text).toBe('a year');
      expect(monthly.text.startsWith(symbol)).toBe(true);
      expect(annual.text.startsWith(symbol)).toBe(true);
      // Same size, weight, face and position class: no secondary styling on either.
      expect(monthly.cls).toBe(annual.cls);
      for (const token of ['result-number', 'tabular-nums', 'font-bold', 'text-3xl']) expect(monthly.cls).toContain(token);
      // 12 x monthly reconciles to annual within the rounding of two whole-unit figures (6 max).
      expect(Math.abs(12 * money(monthly.text) - money(annual.text))).toBeLessThanOrEqual(6);
    });
  }

  it('UK default £35,000 with 5% net pay: £27,320 a year, £2,277 a month', async () => {
    // Hand check (see uk-take-home.test.ts): net 27,319.60; / 12 = 2,276.63.
    const [monthly, , annual] = headlineParagraphs(await render('SalaryUkCalc'));
    expect(annual.text).toBe('£27,320');
    expect(monthly.text).toBe('£2,277');
  });

  it('the monthly figure is the engine annual / 12 with no separate rounding path', () => {
    const uk = calculateUkTakeHome({
      salary: 61_234, scottish: false, taxCode: '', studentLoan: 'plan2',
      pensionMode: 'percent', pensionPercent: 4.5, pensionAmount: 0, pensionMethod: 'sacrifice',
    });
    expect(uk.netMonthly).toBe(uk.netAnnual / 12);
    const us = computeUsSalary({
      year: 2026, mode: 'annual', salary: 88_888, hourlyRate: 36, hoursPerWeek: 40, weeksPerYear: 52,
      overtimeHours: 0, overtimeQualifies: true, stateTaxRate: 4.2, filingStatus: 'single', retirement401kPct: 6, seniors: 0,
    });
    expect(us.netMonthly).toBe(us.netAnnual / 12);
    expect(us.netMonthly * 12).toBeCloseTo(us.netAnnual, 9);
  });

  it('the live-region sentence (UK) names both figures', async () => {
    const html = await render('SalaryUkCalc');
    const m = /role="status" aria-live="polite">(.*?)<\/p>/s.exec(html);
    expect(m![1].replace(/<!-- -->/g, '')).toBe('Take-home pay £2,277 a month, £27,320 a year.');
  });
});

describe('compact copy at the top of the card (narrow screens)', () => {
  for (const file of ['SalaryUkCalc', 'SalaryCalc'] as const) {
    it(`${file}: an aria-hidden, lg:hidden pair comes first in the card and mirrors the headline`, async () => {
      const html = await render(file);
      // Exactly one real headline: the mobile result bar and aria-live depend on it.
      expect(html.match(/data-headline-result/g)).toHaveLength(1);
      const m = /<div aria-hidden="true" data-compact-headline="true" class="([^"]*)">(.*?<\/p>)<\/div><\/div>/s.exec(html);
      expect(m, 'no compact headline').toBeTruthy();
      expect(m![1]).toContain('lg:hidden');
      const paragraphs = [...m![2].matchAll(/<p class="([^"]*)">(.*?)<\/p>/gs)].map((p) => ({ cls: p[1], text: p[2] }));
      expect(paragraphs).toHaveLength(4);
      const [monthly, monthlyUnit, annual, annualUnit] = paragraphs;
      expect(monthlyUnit.text).toBe('take-home a month');
      expect(annualUnit.text).toBe('take-home a year');
      // Equal weight: one class set for both figures, mono tabular-nums, bold.
      expect(monthly.cls).toBe(annual.cls);
      for (const token of ['tabular-nums', 'font-bold', 'font-mono']) expect(monthly.cls).toContain(token);
      // Same values as the real headline (same result).
      const [headMonthly, , headAnnual] = headlineParagraphs(html);
      expect(monthly.text).toBe(headMonthly.text);
      expect(annual.text).toBe(headAnnual.text);
      // It sits before the inputs: it is the first element inside the island's card, ahead of any form control.
      expect(html.indexOf('data-compact-headline')).toBeLessThan(html.indexOf('<input'));
      // Nothing focusable inside it.
      expect(m![2]).not.toMatch(/<(a|button|input|select|textarea)|tabindex/);
    });
  }
});

describe('UK payslip comparison (relief at source)', () => {
  const additional = {
    salary: 150_000,
    pensionMode: 'amount',
    pensionFromPay: 8_000,
    pensionMethod: 'reliefAtSource',
  };

  it('is hidden when relief at source changes nothing', async () => {
    const html = await render('SalaryUkCalc');
    expect(html).not.toContain('data-payslip-comparison');
    const basic = await render('SalaryUkCalc', { pensionMethod: 'reliefAtSource' });
    expect(basic).not.toContain('data-payslip-comparison');
  });

  it('shows the payslip net and the extra relief next to the headline for an additional-rate payer', async () => {
    // Hand-worked in uk-payslip.test.ts: headline 85,786.40 (7,148.87 a month); payslip 83,286.40
    // (6,940.53 a month); extra relief 2,500.
    const html = await render('SalaryUkCalc', additional);
    expect(html).toContain('data-payslip-comparison');
    const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(text).toContain('On your payslip £6,941 a month · £83,286 a year');
    expect(text).toContain('Extra relief to claim via Self Assessment £2,500 a year');
    const [monthly, , annual] = headlineParagraphs(html);
    expect(monthly.text).toBe('£7,149');
    expect(annual.text).toBe('£85,786');
    // The headline block comes before the payslip comparison.
    expect(html.indexOf('data-headline-result')).toBeLessThan(html.indexOf('data-payslip-comparison'));
    // The pension line reproduces the payslip deduction exactly.
    expect(text).toContain('You pay £8,000; your provider claims £2,000 basic-rate relief, so £10,000 goes into your pension.');
  });

  it('the legacy gross default maps to the same field: pensionAmount £10,000 = £8,000 from pay', async () => {
    const legacy = await render('SalaryUkCalc', {
      salary: 150_000, pensionMode: 'amount', pensionAmount: 10_000, pensionMethod: 'reliefAtSource',
    });
    const text = legacy.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(text).toContain('You pay £8,000; your provider claims £2,000 basic-rate relief, so £10,000 goes into your pension.');
    expect(headlineParagraphs(legacy)[2].text).toBe('£85,786');
  });

  it('a new pensionFromPay default wins over a legacy pensionAmount', async () => {
    const html = await render('SalaryUkCalc', {
      salary: 150_000, pensionMode: 'amount', pensionAmount: 99_999, pensionFromPay: 8_000, pensionMethod: 'reliefAtSource',
    });
    expect(headlineParagraphs(html)[2].text).toBe('£85,786');
  });

  it('for net pay the legacy gross amount seeds the field unchanged', async () => {
    const html = await render('SalaryUkCalc', { salary: 50_000, pensionMode: 'amount', pensionAmount: 3_000, pensionMethod: 'netPay' });
    expect(html.replace(/<!-- -->/g, '')).toContain('£250.00</span> a month');
  });
});

describe('email rows include the monthly figure and survive the sanitiser', () => {
  async function rowsFor(file: 'SalaryUkCalc' | 'SalaryCalc', slug: string, defaults?: Record<string, unknown>) {
    await render(file, defaults);
    const props = captured.props.find((p) => p.toolSlug === slug);
    expect(props, `${file} did not render EmailResultsButton`).toBeTruthy();
    const inputs = (props!.getInputs as () => Array<{ label: string; value: string }>)();
    const results = (props!.getResults as () => Array<{ label: string; value: string }>)();
    const out = sanitizeRows(slug, inputs, results);
    expect(out.dropped, `rows the worker would drop: ${JSON.stringify([...inputs, ...results])}`).toBe(0);
    return { results, out };
  }

  it('UK default: Annual then Monthly take-home', async () => {
    const { results, out } = await rowsFor('SalaryUkCalc', 'salary-uk');
    expect(results.slice(0, 2)).toEqual([
      { label: 'Annual Take-Home Pay', value: '£27,320', highlight: true },
      { label: 'Monthly Take-Home Pay', value: '£2,277' },
    ]);
    expect(out.results.map((r) => r.label)).toContain('Monthly Take-Home Pay');
    expect(results.map((r) => r.label)).not.toContain('Extra Relief to Claim (a year)');
  });

  it('UK additional-rate relief at source: payslip net and extra relief are sent', async () => {
    const { results, out } = await rowsFor('SalaryUkCalc', 'salary-uk', {
      salary: 150_000, pensionMode: 'amount', pensionFromPay: 8_000, pensionMethod: 'reliefAtSource',
    });
    const byLabel = Object.fromEntries(results.map((r) => [r.label, r.value]));
    expect(byLabel['Monthly Take-Home Pay']).toBe('£7,149');
    expect(byLabel['Payslip Take-Home Pay (a month)']).toBe('£6,941');
    expect(byLabel['Payslip Take-Home Pay (a year)']).toBe('£83,286');
    expect(byLabel['Extra Relief to Claim (a year)']).toBe('£2,500');
    expect(out.results.map((r) => r.label)).toEqual(expect.arrayContaining([
      'Payslip Take-Home Pay (a month)', 'Payslip Take-Home Pay (a year)', 'Extra Relief to Claim (a year)',
    ]));
  });

  it('UK pension input rows: payslip amount and qualifying earnings read correctly', async () => {
    await render('SalaryUkCalc', { pensionMode: 'amount', pensionFromPay: 4_950, pensionMethod: 'reliefAtSource' });
    const inputs = (captured.props.find((p) => p.toolSlug === 'salary-uk')!.getInputs as () => Array<{ label: string; value: string }>)();
    expect(inputs.find((r) => r.label === 'Pension Contribution')!.value).toBe('£4,950 a year taken from pay');
    captured.props = [];
    await render('SalaryUkCalc', { pensionPercentOf: 'qualifying', pensionPercent: 5 });
    const q = (captured.props.find((p) => p.toolSlug === 'salary-uk')!.getInputs as () => Array<{ label: string; value: string }>)();
    expect(q.find((r) => r.label === 'Pension Contribution')!.value).toBe('5% of qualifying earnings');
    expect(sanitizeRows('salary-uk', q, []).dropped).toBe(0);
  });

  it('US: Annual then Monthly take-home', async () => {
    const { results } = await rowsFor('SalaryCalc', 'salary');
    expect(results[0].label).toBe('Annual Take-Home Pay');
    expect(results[1].label).toBe('Monthly Take-Home Pay');
    const annual = money(results[0].value);
    const monthly = money(results[1].value);
    expect(Math.abs(12 * monthly - annual)).toBeLessThanOrEqual(6);
  });
});

describe('UK wording and notes for the review round', () => {
  const text = (html: string) =>
    html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  it('the payslip note speaks of relief above 20%, not only higher-rate relief', async () => {
    const t = text(await render('SalaryUkCalc', { salary: 150_000, pensionMode: 'amount', pensionFromPay: 8_000, pensionMethod: 'reliefAtSource' }));
    expect(t).toContain('any relief above 20% (higher-rate payers, and the Scottish intermediate rate) is not given through payroll');
    expect(t).not.toContain('the higher-rate relief is not given through payroll');
  });

  it('Scottish intermediate-only payer: the block shows £25 a year', async () => {
    const t = text(await render('SalaryUkCalc', {
      salary: 40_000, taxCode: 'S1257L', pensionMode: 'amount', pensionFromPay: 2_000, pensionMethod: 'reliefAtSource',
    }));
    expect(t).toContain('Extra relief to claim via Self Assessment £25 a year');
  });

  it('the allowance note appears only when the pension restores allowance (£115,000, £4,000 from pay)', async () => {
    const restored = text(await render('SalaryUkCalc', { salary: 115_000, pensionMode: 'amount', pensionFromPay: 4_000, pensionMethod: 'reliefAtSource' }));
    expect(restored).toContain('Extra relief to claim via Self Assessment £1,000 a year');
    expect(restored).toContain('Your pension also restores part of your Personal Allowance');
    const none = text(await render('SalaryUkCalc', { salary: 150_000, pensionMode: 'amount', pensionFromPay: 8_000, pensionMethod: 'reliefAtSource' }));
    expect(none).not.toContain('also restores part of your Personal Allowance');
  });

  it('the childcare callout gives the amount from pay for relief at source (computed), and not otherwise', async () => {
    // £150,000, gross 10,000: adjusted net income 140,000, so 40,000 more gross; 80% of that leaves pay.
    const ras = text(await render('SalaryUkCalc', { salary: 150_000, pensionMode: 'amount', pensionFromPay: 8_000, pensionMethod: 'reliefAtSource' }));
    expect(ras).toContain('Another £40,000 a year into your pension (£32,000 from your pay) would bring you to the limit');
    const net = text(await render('SalaryUkCalc', { salary: 150_000, pensionMode: 'amount', pensionFromPay: 8_000, pensionMethod: 'netPay' }));
    expect(net).toContain('Another £');
    expect(net).not.toContain('from your pay)');
  });

  it('the qualifying band limits are set in the mono figure face', async () => {
    const html = (await render('SalaryUkCalc')).replace(/<!-- -->/g, '');
    expect(html).toContain('<span class="tabular-nums">£6,240</span>');
    expect(html).toContain('<span class="tabular-nums">£50,270</span>');
    // Every occurrence is wrapped: none sits bare in the hint or the assumptions list.
    const bare = html.replace(/<span class="tabular-nums">£(6,240|50,270)<\/span>/g, '').match(/£(6,240|50,270)/g);
    expect(bare).toBeNull();
  });

  it('the mobile result bar label is short enough to fit beside both figures', async () => {
    const html = await render('SalaryUkCalc');
    expect(/data-headline-label="([^"]*)"/.exec(html)![1].length).toBeLessThanOrEqual(5);
  });
});
