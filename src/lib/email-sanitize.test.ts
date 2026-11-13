import { describe, it, expect } from 'vitest';
import {
  cleanText, isSafeValue, isNumericValue, matchLabel, newLabelContext, sanitizeRows, compileLabel, compileTemplate,
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

describe('isNumericValue accepts well-formed figures', () => {
  const ok = [
    '$1,234', `${POUND}50,000`, `1.234 ${EURO}`, `-1.234 ${EURO}`, '-$1,000', '5%', '5.00%', '0.0%', '6.500%',
    '2% (min $25)', '20% ($80,000)', '5 years', '1 year', '3 yrs 2 mo', '7 yr 3 mo', '15 yr 0 mo',
    '1 year, 3 months', '4 years, 2 months', '0 months', '25+ years', '8 mo', '3y 2mo', '120 months', '360',
    '$36.00/hr', '40 hrs', '40', '52', '2000', '$1,000/mo', '1.5%/yr', '$1,200/yr', '4 kWp', '10 kWh ($5,000)',
    '1,050 kWh/kWp', '28p/kWh', `15${CENT}/kWh`, `12.5${CENT}/kWh`, '4.5x', '12x/yr', '28% / 36%', '12.5% / 30.1%',
    '$1,234,567.89', '1257L', 'S1257L', 'K475', 'BR', 'D0', 'NT', '0T', 'C1257L', '1257L W1', '1257L X', '$50k',
  ];
  for (const v of ok) {
    it(JSON.stringify(v), () => expect(isNumericValue(cleanText(v))).toBe(true));
  }
});

describe('isNumericValue rejects phone shapes, codes and words', () => {
  const bad = [
    // phone-number shapes (review must-fix 1)
    'Emergency tax code 1-800-555-0199', '0800 123 4567', '+1 (800) 555-0199', '1-800-555-0199', '(800) 555-0199',
    '555-0199', '0800 123', '07700 900123', '08001234567', '0800.123.4567', '08001 mo 23456',
    // not one well-formed number
    '123.45.67.89', '1.2.3', '12,34,56', '1,23,456',
    // more than two numbers, free words, codes that are not tax codes
    '1 2 3', 'pay $500 cash or loan not paid', 'g00gle', 'bc1q', 'ab12345cde', 'AB123456', 'Call 0800 now',
    // links, addresses, markup, punctuation outside the grammar
    'https://evil.example/login', 'Verify at https://evil.example', 'evil.example', 'evil . example', 'www evil',
    'a@b.c', '<script>', '"quoted"', 'Pay: now', 'a=b', 'a_b', '#hash', `evil${FULLWIDTH_DOT}example`,
    'x'.repeat(41), '', 'Account notice', 'Yes', 'Annually',
  ];
  for (const v of bad) {
    it(JSON.stringify(v), () => expect(isNumericValue(cleanText(v))).toBe(false));
  }
});

describe('isSafeValue: per-tool phrases plus the numeric grammar', () => {
  const accepted: Array<[string, string]> = [
    ['salary', '2026 tax year (filing in 2027)'], ['salary', '2027 paychecks'], ['salary', 'One of us'],
    ['salary', 'Married Filing Jointly'], ['salary-uk', '1257L'], ['salary-uk', 'Plan 2 (post-2012 England/Wales)'],
    ['salary-uk', 'S1257L (not recognised, 1257L used)'], ['salary-uk', `${POUND}2,400 a year`],
    ['capital-gains-tax', `Short-term (${LE} 1 year)`], ['capital-gains-tax', 'Long-term (> 1 year)'],
    ['savings-goal', 'Already reached'], ['savings-goal', 'Not reached within 100 years'],
    ['savings-goal', '$0: current savings already meet the goal'], ['retirement-age', 'Age 64 (in 29 years 10 months)'],
    ['retirement-age', 'Not reached by age 100'], ['retirement-contribution', 'Not available: retirement age must be after current age'],
    ['mortgage-affordability', 'Not affordable'], ['mortgage-affordability', '$4,120 (estimated)'],
    ['mortgage-affordability', 'None (fixed 5+ years): payment checked at your 5.19% rate; max 50% of take-home pay'],
    ['mortgage-affordability', '7.58% (the higher of your 5.19% rate and the 7.5% average standard variable rate, + 2 pt); max 50% of take-home pay'],
    ['mortgage-affordability', 'Your monthly commitments already use 55.0% of take-home pay (limit 50%).'],
    ['rent-vs-buy', 'Even'], ['rent-vs-buy', '3.0% of price'], ['rent-vs-buy', 'Not included'],
    ['emergency-fund', '3y 2mo (interest only)'], ['emergency-fund', 'More than 50 years at this rate'],
    ['inflation', '2026 (October)'], ['inflation', 'CPI-U, U.S. city average, all items (BLS); latest month October 2026'],
    ['solar-payback', 'Not applicable (no net cost)'], ['solar-payback', '70% (30% base, year 1)'],
    ['debt-payoff', 'Never - the payments do not keep up with the interest'], ['debt-payoff', 'Not within 50 years'],
    ['credit-card-payoff', 'Never - the payment does not cover the interest'], ['credit-card-payoff', '3% of balance (min $25)'],
    ['compound-interest', 'Beyond any realistic outcome - check your inputs'], ['car-finance', 'Hire Purchase'],
    ['stamp-duty', 'First-time buyer'], ['investment-return', 'Not achievable'], ['loan-amortization', 'N/A'],
  ];
  for (const [slug, v] of accepted) {
    it(`${slug}: ${JSON.stringify(v)}`, () => expect(isSafeValue(slug, cleanText(v))).toBe(true));
  }

  const refused: Array<[string, string]> = [
    ['salary-uk', 'Emergency tax code 1-800-555-0199'], ['salary-uk', '0800 123 4567'], ['salary-uk', 'g00gle'],
    ['car-finance', 'pay $500 cash or loan not paid'], ['salary', '+1 (800) 555-0199 tax year (filing in 2027)'],
    ['salary', '0800 123 4567 paychecks'], ['savings-goal', 'Not reached within 0800 123 years'],
    ['inflation', '123.45.67.89 (October)'], ['mortgage-affordability', '0800.123.4567 (estimated)'],
    // A phrase registered for one tool is not accepted for another.
    ['compound-interest', 'Not affordable'], ['salary', 'Already reached'],
    ['compound-interest', 'Verify at https://evil.example'], ['compound-interest', 'x'.repeat(161)],
  ];
  for (const [slug, v] of refused) {
    it(`${slug} refuses ${JSON.stringify(v).slice(0, 60)}`, () => expect(isSafeValue(slug, cleanText(v))).toBe(false));
  }

  it('value templates may not contain {item}', () => {
    expect(() => compileTemplate('{item} owed', false)).toThrow();
  });
});

describe('matchLabel', () => {
  it('matches exact labels case-insensitively and renders the registry text', () => {
    const ctx = newLabelContext();
    expect(matchLabel('compound-interest', 'final balance', ctx)).toBe('Final Balance');
    expect(matchLabel('compound-interest', 'Final Balance', ctx)).toBe('Final Balance');
  });
  it('prefers a same-case entry when two entries differ only in case', () => {
    const ctx = newLabelContext();
    expect(matchLabel('rent-vs-buy', 'Buying costs', ctx)).toBe('Buying costs');
    expect(matchLabel('rent-vs-buy', 'Buying Costs', ctx)).toBe('Buying Costs');
  });
  it('rejects labels that are not on the tool allowlist', () => {
    const ctx = newLabelContext();
    expect(matchLabel('compound-interest', 'Account notice', ctx)).toBeNull();
    expect(matchLabel('compound-interest', 'Visit', ctx)).toBeNull();
    expect(matchLabel('compound-interest', 'National Insurance', ctx)).toBeNull();
    expect(matchLabel('salary-uk', 'National Insurance', ctx)).toBe('National Insurance');
  });
  it('rejects unknown tools and prototype keys', () => {
    const ctx = newLabelContext();
    expect(matchLabel('nope', 'Final Balance', ctx)).toBeNull();
    expect(matchLabel('__proto__', 'Final Balance', ctx)).toBeNull();
    expect(matchLabel('constructor', 'Final Balance', ctx)).toBeNull();
  });
  it('numeric slots accept ONE well-formed number only', () => {
    const ctx = newLabelContext();
    expect(matchLabel('rent-vs-buy', 'Over 10 years, renting leaves you better off by', ctx)).toBe('Over 10 years, renting leaves you better off by');
    expect(matchLabel('rent-vs-buy', 'Over evil.example years, buying and renting come out even', ctx)).toBeNull();
    expect(matchLabel('investment-fee', 'Balance at 0.05% fee', ctx)).toBe('Balance at 0.05% fee');
    expect(matchLabel('investment-fee', 'Balance at click here fee', ctx)).toBeNull();
    expect(matchLabel('inflation', '$1,000 in 2000 equals (in 2026 (October) prices)', ctx)).toBe('$1,000 in 2000 equals (in 2026 (October) prices)');
    expect(matchLabel('inflation', cleanText(`1.000${NBSP}${EURO} in 2000 equals (in 2010 prices)`), ctx)).toBe(`1.000 ${EURO} in 2000 equals (in 2010 prices)`);
    // review must-fix 1: dotted digit runs in a numeric slot
    expect(matchLabel('inflation', '0800.123.4567 in 1990 equals (in 2000 prices)', ctx)).toBeNull();
    expect(matchLabel('inflation', '$1,000 in 123.45.67.89 equals (in 2000 prices)', ctx)).toBeNull();
    expect(matchLabel('inflation', '$1,000 in 0800 123 equals (in 2000 prices)', ctx)).toBeNull();
    expect(matchLabel('solar-payback', '25-Year Savings', ctx)).toBe('25-Year Savings');
    expect(matchLabel('emergency-fund', 'Time to Reach 6-Month Target', ctx)).toBe('Time to Reach 6-Month Target');
    expect(matchLabel('roi', 'Final Value (C)', ctx)).toBeNull();
    expect(matchLabel('car-finance', 'Evil True Cost', ctx)).toBeNull();
    expect(matchLabel('retirement-age', "Inflation-Adjusted Value (Today's pounds)", ctx)).toBe("Inflation-Adjusted Value (Today's pounds)");
    expect(matchLabel('mortgage-affordability', 'Payment check: Share of Take-Home Pay', ctx)).toBe('Payment check: Share of Take-Home Pay');
  });
  it('stamp duty band labels', () => {
    const ctx = newLabelContext();
    const band = `${POUND}125,001 ${EN_DASH} ${POUND}250,000 (2%)`;
    expect(matchLabel('stamp-duty', band, ctx)).toBe(band);
    expect(matchLabel('stamp-duty', `${POUND}1,500,001 ${EN_DASH} ... (12%)`, ctx)).toBe(`${POUND}1,500,001 ${EN_DASH} ... (12%)`);
    expect(matchLabel('stamp-duty', `${POUND}1 ${EN_DASH} evil (2%)`, ctx)).toBeNull();
  });
  it('replaces user-named rows with a numbered noun and never renders the user text', () => {
    const ctx = newLabelContext();
    expect(matchLabel('debt-payoff', 'Chase Visa Balance', ctx)).toBe('Debt 1 Balance');
    expect(matchLabel('debt-payoff', 'Chase Visa APR', ctx)).toBe('Debt 1 APR');
    expect(matchLabel('debt-payoff', 'Car Loan', ctx)).toBe('Debt 2');
    expect(matchLabel('debt-payoff', 'Verify at https://evil.example Balance', ctx)).toBe('Debt 3 Balance');
    // Exact labels win over the {item} templates.
    expect(matchLabel('debt-payoff', 'Total Debt', ctx)).toBe('Total Debt');
    expect(matchLabel('debt-payoff', 'Extra Monthly Payment', ctx)).toBe('Extra Monthly Payment');
  });
  it('templates compile', () => {
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
  it('drops allowed labels carrying unsafe values, including phone shapes', () => {
    const out = sanitizeRows('compound-interest', [], [
      { label: 'Final Balance', value: 'Verify at evil.example', highlight: true },
      { label: 'Interest Earned', value: '0800 123 4567' },
      { label: 'Total Contributions', value: '$5,000' },
    ]);
    expect(out.results).toEqual([{ label: 'Total Contributions', value: '$5,000' }]);
    expect(out.dropped).toBe(2);
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
  it('keeps a savings-goal email whose only result is "Already reached"', () => {
    const out = sanitizeRows('savings-goal', [], [{ label: 'Time to Reach Goal', value: 'Already reached', highlight: true }]);
    expect(out.results).toEqual([{ label: 'Time to Reach Goal', value: 'Already reached', highlight: true }]);
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
