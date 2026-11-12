import { describe, it, expect } from 'vitest';
import {
  cleanText, isSafeValue, matchLabel, newLabelContext, sanitizeRows, compileLabel,
} from './email-sanitize';

// Build non-ASCII test characters from code points so this file stays ASCII.
const ch = (...cps: number[]) => String.fromCodePoint(...cps);
const POUND = ch(0xa3);
const EURO = ch(0x20ac);
const CENT = ch(0xa2);
const NBSP = ch(0xa0);
const EN_DASH = ch(0x2013);
const LE = ch(0x2264);
const RLO = ch(0x202e); // right-to-left override
const ZWSP = ch(0x200b); // zero-width space
const ZWJ = ch(0x200d);
const LRI = ch(0x2066);
const FULLWIDTH_DOT = ch(0xff0e);
const TAG_A = ch(0xe0041);

describe('cleanText', () => {
  it('strips bidi, zero-width and tag characters', () => {
    expect(cleanText(`Fin${RLO}al${ZWSP} Bal${ZWJ}ance${LRI}${TAG_A}`)).toBe('Final Balance');
  });
  it('folds CR/LF/tab and runs of whitespace to single spaces', () => {
    expect(cleanText('  Total\r\n\tInterest  ')).toBe('Total Interest');
  });
  it('NFKC-normalises full-width forms and no-break spaces', () => {
    expect(cleanText(`evil${FULLWIDTH_DOT}example`)).toBe('evil.example');
    expect(cleanText(`1.234${NBSP}${EURO}`)).toBe(`1.234 ${EURO}`);
  });
});

describe('isSafeValue accepts what the calculators really send', () => {
  const ok = [
    '$1,234', `${POUND}50,000`, `1.234 ${EURO}`, `-1.234 ${EURO}`, '-$1,000', '5%', '5.00%', '0.0%',
    '2% (min $25)', '20% ($80,000)', '5 years', '1 year', '3 yrs 2 mo', '7 yr 3 mo', '1 year, 3 months',
    '25+ years', 'Age 67', '30 years', 'N/A', 'Not reachable', 'Already funded!',
    'Adjust inputs to see results', 'United States', 'United Kingdom', 'Long-term (> 1 year)',
    `Short-term (${LE} 1 year)`, 'Single', 'Married Filing Jointly', 'Married (joint)', 'Head of household',
    'Head of Household', 'Basic rate', 'Higher/additional rate', 'Avalanche (highest rate first)',
    'Snowball (lowest balance first)', 'Annually', 'Semi-annually', 'Quarterly', 'Monthly', 'Daily',
    'End of period', 'Beginning of period', 'Historical', 'Future Projection', 'End Amount', 'Contribution',
    'Return Rate', 'Starting Amount', 'Time', 'Monthly Savings Needed', 'Time to Goal', '1257L', 'S1257L',
    'K475', 'BR', 'D0', 'NT', 'Scotland', 'No Student Loan', 'Plan 1 (pre-2012 England/Wales)',
    'Plan 2 (post-2012 England/Wales)', 'Plan 4 (Scotland)', 'Plan 5 (from 2023)', 'Postgraduate Loan',
    'Salary Sacrifice', '4 kWp', `10 kWh ($5,000)`, 'No', '28p/kWh', `15${CENT}/kWh`, '80% (30% base)',
    '120 months', '$36.00/hr', '40 hrs', '40', '52', 'PCP', 'Hire Purchase', 'Personal Loan', 'Cash',
    'First-time buyer', 'Moving home', 'Additional property', '2000', '$1,000/mo', '1.5%/yr', '$1,200/yr',
    '6.500%', '15 yr 0 mo', '4 years, 2 months', '0 months',
    // W1-TAX salary options
    '2026 tax year (filing in 2027)', '2027 paychecks', 'Yes', 'One of us', 'Both of us',
    // W1-UK option words
    'Salary sacrifice arrangement', 'Not recognised', 'Allowance used', 'Less than 1 year',
  ];
  for (const v of ok) {
    it(JSON.stringify(v), () => expect(isSafeValue(cleanText(v))).toBe(true));
  }
});

describe('isSafeValue rejects free text, links and addresses', () => {
  const bad = [
    'https://evil.example/login', 'Verify at https://evil.example', 'evil.example', 'evil . example',
    'www evil', 'visit us', 'Call 0800 now', 'a@b.c', 'probe@example', 'Account notice', 'click here',
    '<script>', '"quoted"', 'Pay: now', 'login', '1257L verify', 'javascript', `evil${FULLWIDTH_DOT}example`,
    'x'.repeat(81), '', 'password reset', 'bitcoin', 'reply to this', 'mailto', 'ftp', '#hash', 'a=b', 'a_b',
    'AB123456', // over-long code-shaped token
  ];
  for (const v of bad) {
    it(JSON.stringify(v), () => expect(isSafeValue(cleanText(v))).toBe(false));
  }
  it('bidi and zero-width characters are removed before checking, never rendered', () => {
    expect(cleanText(`$1,000${RLO}`)).toBe('$1,000');
    expect(isSafeValue(`$1,000${RLO}`)).toBe(false); // uncleaned input is refused outright
  });
});

describe('matchLabel', () => {
  it('matches exact labels case-insensitively and renders the registry text', () => {
    const ctx = newLabelContext();
    expect(matchLabel('compound-interest', 'final balance', ctx)).toBe('Final Balance');
    expect(matchLabel('compound-interest', 'Final Balance', ctx)).toBe('Final Balance');
  });
  it('rejects labels that are not on the tool allowlist', () => {
    const ctx = newLabelContext();
    expect(matchLabel('compound-interest', 'Account notice', ctx)).toBeNull();
    expect(matchLabel('compound-interest', 'Visit', ctx)).toBeNull();
    // A label allowed for one tool is not allowed for another.
    expect(matchLabel('compound-interest', 'National Insurance', ctx)).toBeNull();
    expect(matchLabel('salary-uk', 'National Insurance', ctx)).toBe('National Insurance');
  });
  it('rejects unknown tools and prototype keys', () => {
    const ctx = newLabelContext();
    expect(matchLabel('nope', 'Final Balance', ctx)).toBeNull();
    expect(matchLabel('__proto__', 'Final Balance', ctx)).toBeNull();
    expect(matchLabel('constructor', 'Final Balance', ctx)).toBeNull();
  });
  it('numeric templates accept numbers only in the numeric slots', () => {
    const ctx = newLabelContext();
    expect(matchLabel('rent-vs-buy', 'Over 10 years, buying saves you', ctx)).toBe('Over 10 years, buying saves you');
    expect(matchLabel('rent-vs-buy', 'Over 10 years, renting saves you', ctx)).toBe('Over 10 years, renting saves you');
    expect(matchLabel('rent-vs-buy', 'Over evil.example years, buying saves you', ctx)).toBeNull();
    expect(matchLabel('rent-vs-buy', 'Over 10 years, someone saves you', ctx)).toBeNull();
    expect(matchLabel('investment-fee', 'Balance at 1% fee', ctx)).toBe('Balance at 1% fee');
    expect(matchLabel('investment-fee', 'Balance at 0.05% fee', ctx)).toBe('Balance at 0.05% fee');
    expect(matchLabel('investment-fee', 'Balance at click here fee', ctx)).toBeNull();
    expect(matchLabel('inflation', '$1,000 in 2000 equals', ctx)).toBe('$1,000 in 2000 equals');
    expect(matchLabel('inflation', cleanText(`1.000${NBSP}${EURO} in 2000 equals`), ctx)).toBe(`1.000 ${EURO} in 2000 equals`);
    expect(matchLabel('inflation', `${POUND}1,000 today will cost`, ctx)).toBe(`${POUND}1,000 today will cost`);
    expect(matchLabel('solar-payback', '25-Year Savings', ctx)).toBe('25-Year Savings');
    expect(matchLabel('emergency-fund', 'Recommended Target (6 months)', ctx)).toBe('Recommended Target (6 months)');
    expect(matchLabel('roi', 'Final Value (B)', ctx)).toBe('Final Value (B)');
    expect(matchLabel('roi', 'Final Value (C)', ctx)).toBeNull();
    expect(matchLabel('car-finance', 'Hire Purchase True Cost', ctx)).toBe('Hire Purchase True Cost');
    expect(matchLabel('car-finance', 'Evil True Cost', ctx)).toBeNull();
    for (const l of ['Tax Year', 'Hourly Rate', 'Aged 65 or Older', 'Overtime Deduction', 'Senior Deduction']) {
      expect(matchLabel('salary', l, ctx)).toBe(l);
    }
    for (const l of ['Into Your Pension', 'Adjusted Net Income']) expect(matchLabel('salary-uk', l, ctx)).toBe(l);
    for (const l of ['Non-UK Resident', 'Total Cost (Price + SDLT)']) expect(matchLabel('stamp-duty', l, ctx)).toBe(l);
  });
  it('stamp duty band labels', () => {
    const ctx = newLabelContext();
    const band = `${POUND}125,001 ${EN_DASH} ${POUND}250,000 (2%)`;
    expect(matchLabel('stamp-duty', band, ctx)).toBe(band);
    const top = `${POUND}1,500,001 ${EN_DASH} ... (12%)`;
    expect(matchLabel('stamp-duty', top, ctx)).toBe(top);
    expect(matchLabel('stamp-duty', `${POUND}1 ${EN_DASH} evil (2%)`, ctx)).toBeNull();
  });
  it('replaces user-named rows with a numbered noun and never renders the user text', () => {
    const ctx = newLabelContext();
    expect(matchLabel('debt-payoff', 'Chase Visa Balance', ctx)).toBe('Debt 1 Balance');
    expect(matchLabel('debt-payoff', 'Chase Visa APR', ctx)).toBe('Debt 1 APR');
    expect(matchLabel('debt-payoff', 'Car Loan Min Payment', ctx)).toBe('Debt 2 Min Payment');
    expect(matchLabel('debt-payoff', 'Verify at https://evil.example Balance', ctx)).toBe('Debt 3 Balance');
    // Exact labels win over the {item} templates.
    expect(matchLabel('debt-payoff', 'Total Debt', ctx)).toBe('Total Debt');
    expect(matchLabel('debt-payoff', 'Extra Monthly Payment', ctx)).toBe('Extra Monthly Payment');
  });
  it('every registry template compiles', () => {
    expect(() => compileLabel('{n} in {n} equals')).not.toThrow();
  });
});

describe('sanitizeRows', () => {
  it('drops unlisted labels and link values completely', () => {
    const out = sanitizeRows(
      'compound-interest',
      [{ label: 'Visit', value: 'https://evil.example/login' }],
      [{ label: 'Account notice', value: 'Verify at https://evil.example', highlight: true }],
    );
    expect(out.inputs).toEqual([]);
    expect(out.results).toEqual([]);
    expect(out.dropped).toBe(2);
  });
  it('drops allowed labels carrying unsafe values', () => {
    const out = sanitizeRows('compound-interest', [], [
      { label: 'Final Balance', value: 'Verify at evil.example', highlight: true },
      { label: 'Interest Earned', value: '$5,000' },
    ]);
    expect(out.results).toEqual([{ label: 'Interest Earned', value: '$5,000' }]);
    expect(out.dropped).toBe(1);
  });
  it('keeps only the first highlighted result and never highlights inputs', () => {
    const out = sanitizeRows(
      'compound-interest',
      [{ label: 'Starting Amount', value: '$10,000', highlight: true }],
      [
        { label: 'Final Balance', value: '$20,000', highlight: true },
        { label: 'Interest Earned', value: '$5,000', highlight: true },
      ],
    );
    expect(out.inputs).toEqual([{ label: 'Starting Amount', value: '$10,000' }]);
    expect(out.results[0].highlight).toBe(true);
    expect(out.results[1].highlight).toBeUndefined();
  });
  it('ignores malformed rows and over-long raw text', () => {
    const out = sanitizeRows('compound-interest', [null, 7, 'x', { label: 1, value: 2 }], [
      { label: 'Final Balance', value: '1'.repeat(500) },
      { label: 'Final Balance', value: '$1' },
    ]);
    expect(out.inputs).toEqual([]);
    expect(out.results).toEqual([{ label: 'Final Balance', value: '$1' }]);
    expect(out.dropped).toBe(5);
  });
  it('accepts a 10-debt Debt Payoff email (32 input rows) and renumbers the debts', () => {
    const inputs: Array<{ label: string; value: string }> = [];
    for (let i = 0; i < 10; i++) {
      inputs.push({ label: `Card ${i} Balance`, value: '$1,000' });
      inputs.push({ label: `Card ${i} APR`, value: '19.99%' });
      inputs.push({ label: `Card ${i} Min Payment`, value: '$25' });
    }
    inputs.push({ label: 'Strategy', value: 'Avalanche (highest rate first)' });
    inputs.push({ label: 'Extra Monthly Payment', value: '$100' });
    const out = sanitizeRows('debt-payoff', inputs, [
      { label: 'Debt-Free In', value: '3 years, 2 months', highlight: true },
    ]);
    expect(out.inputs).toHaveLength(32);
    expect(out.dropped).toBe(0);
    expect(out.inputs[27]).toEqual({ label: 'Debt 10 Balance', value: '$1,000' });
    expect(out.inputs.some((r) => r.label.includes('Card'))).toBe(false);
  });
});
