/**
 * Phase 3 spot-check: the four hub pages' BUILT HTML must contain figures that
 * match independent recomputation via the pure libs (correct decimal-rate
 * conventions). Catches wrong call conventions (e.g. 7 vs 0.07) and
 * formatting drift between the page frontmatter and the libs.
 *
 * Requires dist/ to exist (run after `npm run build`); tests skip when it
 * doesn't, so the suite stays green on fresh clones.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { calcSimpleIncomeTax, calcNI } from './uk-tax-calc';
import { calcFederalTax, calcFICA } from './us-tax-calc';
import { loanMonthlyPayment, compoundInterest } from './calculator-utils';

const hub = (slug: string) => `dist/scenarios/${slug}/index.html`;
const built = existsSync('dist/scenarios/uk-take-home-pay/index.html');

const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

describe.skipIf(!built)('hub pages match independent lib computation', () => {
  it('UK take-home hub: £50k row', () => {
    const html = readFileSync(hub('uk-take-home-pay'), 'utf8');
    const takeHome = 50000 - calcSimpleIncomeTax(50000) - calcNI(50000);
    expect(html).toContain(gbp(takeHome)); // annual
    expect(html).toContain(gbp(takeHome / 12)); // monthly
  });

  it('US take-home hub: $100k row', () => {
    const html = readFileSync(hub('us-take-home-pay'), 'utf8');
    const takeHome = 100000 - calcFederalTax(100000, 'single') - calcFICA(100000, 'single').total;
    expect(html).toContain(usd(takeHome));
  });

  it('mortgage hub: $300k at 6.5% over 30 years', () => {
    const html = readFileSync(hub('mortgage-payments-by-amount'), 'utf8');
    const monthly = loanMonthlyPayment(300000, 0.065, 360);
    expect(html).toContain(usd(monthly));
  });

  it('investment hub: $500/month for 30 years at 7%', () => {
    const html = readFileSync(hub('investment-growth'), 'utf8');
    const fv = compoundInterest(0, 500, 0.07, 30, 12, 'end');
    expect(html).toContain(usd(fv));
  });
});
