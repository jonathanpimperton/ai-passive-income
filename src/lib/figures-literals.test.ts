/**
 * The hand-typed figures on the W2-METH methodology pages (nov26/w2-meth,
 * src/data/methodologies), each as the figure token that now produces it.
 *
 * Every case is [token, the value the page prints]. The test doubles as a
 * check on the page's literals: a mismatch here means the typed number is not
 * what the calculator's engine gives for the inputs the page states. Where the
 * page's inputs differ from the calculator's own defaults, the case says so
 * (the "not the tool default" groups), and a second group pins what the tool
 * itself gives.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFigure as f } from './figures';

type Case = [token: string, printed: string];

function check(cases: Case[]): void {
  for (const [token, printed] of cases) expect(f(token), token).toBe(printed);
}

const DEFAULT_DEBTS = '6500@22.99/195; 3500@11.5/120; 12000@6.5/350';
const SIMILAR_DEBTS = '5000@20/150; 3000@22/90; 1000@18/40';
const WIDE_DEBTS = '4000@24/120; 20000@5/400; 1500@5/50';
const UK_HOME = "350000, 20, 5.5, 25, 1400";
const UK_OPTS = 'region=uk, closing=3, selling=2, propertyTax=0, insurance=400, rentersInsurance=10';

describe('credit-card-payoff.md', () => {
  it('fixed payments, APR and balance sweeps', () => {
    check([
      ['cardPayoff(5000, 22.99, 100).months | int', '167'],
      ['cardPayoff(5000, 22.99, 100).interest | usd', '$11,694'],
      ['cardPayoff(5000, 22.99, 96).months | int', '324'],
      ['cardPayoff(5000, 22.99, 96).interest | usd', '$26,025'],
      ['cardPayoff(5000, 22.99, 95).months | months', 'never'],
      ['cardPayoff(5000, 22.99, 150).months | int', '54'],
      ['cardPayoff(5000, 22.99, 150).interest | usd', '$3,045'],
      ['cardPayoff(5000, 22.99, 100).interest - cardPayoff(5000, 22.99, 150).interest | usd', '$8,649'],
      ['(cardPayoff(5000, 22.99, 100).months - cardPayoff(5000, 22.99, 150).months) / 12 | num(1)', '9.4'],
      ['cardPayoff(5000, 22.99, 250).months | int', '26'],
      ['cardPayoff(5000, 22.99, 250).interest | usd', '$1,366'],
      ['cardPayoff(10000, 22.99, 250).months | int', '77'],
      ['cardPayoff(10000, 22.99, 250).interest | usd', '$9,153'],
      ['cardPayoff(5000, 16.99, 150).months | int', '46'],
      ['cardPayoff(5000, 16.99, 150).interest | usd', '$1,813'],
      ['cardPayoff(5000, 29.99, 150).months | int', '73'],
      ['cardPayoff(5000, 29.99, 150).interest | usd', '$5,878'],
      ['cardPayoff(5000, 22.99, loanPayment(5000, 22.99, 5)).months | int', '60'],
    ]);
  });
  it('percentage minimums, interest-plus and the 50-year horizon', () => {
    check([
      ['cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).remaining | usd', '$3,017'],
      ['cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).interest | usd', '$45,140'],
      ['cardPayoff(5000, 22.99, minPct=2, minFloor=25, extra=50).months | int', '92'],
      ['cardPayoff(5000, 22.99, minPct=2, minFloor=25, extra=50).interest | usd', '$4,546'],
      ['cardPayoff(5000, 22.99, minPct=1, minFloor=25, plusInterest=true).months | int', '232'],
      ['cardPayoff(5000, 22.99, minPct=1, minFloor=25, plusInterest=true).interest | usd', '$8,489'],
    ]);
  });
  it('daily compounding', () => {
    check([
      ['dailyCompoundingApr(22.99) | num(4)', '23.2043'],
      ['cardPayoff(5000, dailyCompoundingApr(22.99), 100).months | int', '178'],
      ['cardPayoff(5000, dailyCompoundingApr(22.99), 100).interest | usd', '$12,787'],
      ['(cardPayoff(5000, dailyCompoundingApr(22.99), 100).interest / cardPayoff(5000, 22.99, 100).interest - 1) * 100 | pct', '9%'],
    ]);
  });
});

describe('debt-payoff.md', () => {
  it('the calculator defaults: avalanche vs snowball, extra payments, order cleared', () => {
    check([
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'avalanche').months | int`, '30'],
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'avalanche').interest | usd(2)`, '$3,105.52'],
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'snowball').months | int`, '30'],
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'snowball').interest | usd(2)`, '$3,509.39'],
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'snowball').interest - debtPayoff('${DEFAULT_DEBTS}', 200, 'avalanche').interest | usd(2)`, '$403.87'],
      [`debtPayoff('${DEFAULT_DEBTS}', 200, 'avalanche').monthlyOutlay | usd`, '$865'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'avalanche', 1) | int`, '20'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'avalanche', 2) | int`, '24'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'avalanche', 3) | int`, '30'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'snowball', 2) | int`, '12'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'snowball', 1) | int`, '24'],
      [`debtClearMonth('${DEFAULT_DEBTS}', 200, 'snowball', 3) | int`, '30'],
      [`debtPayoff('${DEFAULT_DEBTS}', 0, 'avalanche').months | int`, '42'],
      [`debtPayoff('${DEFAULT_DEBTS}', 0, 'snowball').months | int`, '42'],
      [`debtPayoff('${DEFAULT_DEBTS}', 0, 'avalanche').interest | usd(2)`, '$5,541.15'],
      [`debtPayoff('${DEFAULT_DEBTS}', 0, 'snowball').interest | usd(2)`, '$5,550.11'],
      [`debtPayoff('${DEFAULT_DEBTS}', 100, 'avalanche').months | int`, '34'],
      [`debtPayoff('${DEFAULT_DEBTS}', 400, 'avalanche').months | int`, '23'],
      [`debtPayoff('${DEFAULT_DEBTS}', 400, 'avalanche').interest | usd(2)`, '$2,269.26'],
    ]);
  });
  it('similar-rate and wide-rate sets (minimums 150/90/40 and 120/400/50)', () => {
    check([
      [`debtPayoff('${SIMILAR_DEBTS}', 200, 'avalanche').months | int`, '23'],
      [`debtPayoff('${SIMILAR_DEBTS}', 200, 'snowball').months | int`, '23'],
      [`debtPayoff('${SIMILAR_DEBTS}', 200, 'avalanche').interest | usd(2)`, '$1,892.80'],
      [`debtPayoff('${SIMILAR_DEBTS}', 200, 'snowball').interest | usd(2)`, '$1,937.58'],
      [`debtPayoff('${SIMILAR_DEBTS}', 200, 'snowball').interest - debtPayoff('${SIMILAR_DEBTS}', 200, 'avalanche').interest | usd(2)`, '$44.78'],
      [`debtPayoff('${WIDE_DEBTS}', 300, 'avalanche').interest | usd(2)`, '$2,182.53'],
      [`debtPayoff('${WIDE_DEBTS}', 300, 'snowball').interest | usd(2)`, '$2,400.50'],
    ]);
  });
  it('the never case fails the build; its interest is plain arithmetic', () => {
    expect(() => f("debtPayoff('10000@24/150', 0, 'avalanche').months | int")).toThrow(/never cleared/);
    expect(f('10000 * 24 / 100 / 12 | usd')).toBe('$200');
  });
});

describe('rent-vs-buy.md (UK example)', () => {
  it('the 10-year worked example', () => {
    const r = (field: string, fmt: string) => f(`rentVsBuy(${UK_HOME}, 10, ${UK_OPTS}).${field} | ${fmt}`);
    expect(r('downPayment', 'gbp')).toBe('£70,000');
    expect(r('closingCosts', 'gbp')).toBe('£10,500');
    expect(r('initialCash', 'gbp')).toBe('£80,500');
    expect(r('monthlyOwnershipCost', 'gbp(2)')).toBe('£2,044.44');
    expect(r('monthlyMortgage', 'gbp(2)')).toBe('£1,719.44');
    expect(r('firstMonthRentCost', 'gbp')).toBe('£1,410');
    expect(r('finalHomeValue', 'gbp')).toBe('£470,371');
    expect(r('saleCosts', 'gbp')).toBe('£9,407');
    expect(r('loanBalance', 'gbp')).toBe('£210,437');
    expect(r('finalBuyerNetWorth', 'gbp')).toBe('£250,526');
    expect(r('finalRenterNetWorth', 'gbp')).toBe('£241,246');
    expect(r('buyerPortfolio', 'gbp')).toBe('£0');
    expect(r('advantage', 'gbp')).toBe('£9,280');
    expect(r('breakEvenYear', 'int')).toBe('8');
    expect(f(`rentVsBuy(${UK_HOME}, 10, ${UK_OPTS}).verdict`)).toBe('buy');
  });
  it('the horizon sweep: 3 and 5 years renting ahead, 8, 15 and 25 years buying ahead', () => {
    const adv = (h: number) => f(`rentVsBuy(${UK_HOME}, ${h}, ${UK_OPTS}).difference | gbp`);
    const verdict = (h: number) => f(`rentVsBuy(${UK_HOME}, ${h}, ${UK_OPTS}).verdict`);
    expect([adv(3), verdict(3)]).toEqual(['£11,275', 'rent']);
    expect([adv(5), verdict(5)]).toEqual(['£6,342', 'rent']);
    expect([adv(8), verdict(8)]).toEqual(['£2,416', 'buy']);
    expect([adv(15), verdict(15)]).toEqual(['£30,720', 'buy']);
    expect([adv(25), verdict(25)]).toEqual(['£98,191', 'buy']);
  });
  it('without buying or selling costs', () => {
    const free = 'region=uk, closing=0, selling=0, propertyTax=0, insurance=400, rentersInsurance=10';
    expect(f(`rentVsBuy(${UK_HOME}, 10, ${free}).advantage | gbp`)).toBe('£39,789');
    expect(f(`rentVsBuy(${UK_HOME}, 10, ${free}).breakEvenYear | int`)).toBe('1');
    expect(f(`rentVsBuy(${UK_HOME}, 5, ${free}).advantage | gbp`)).toBe('£16,658');
  });
});

describe('mortgage-affordability.md', () => {
  it('US: 80,000 income, 500 debts, 40,000 down, 7%, 30 years', () => {
    const us = (field: string, fmt: string, args = '80000, 500, 40000, 7, 30') => f(`usAffordability(${args}).${field} | ${fmt}`);
    expect(us('maxPrice', 'usd')).toBe('$250,776');
    expect(us('maxLoan', 'usd')).toBe('$210,776');
    expect(us('monthlyPI', 'usd(2)')).toBe('$1,402.30');
    expect(us('monthlyTax', 'usd(2)')).toBe('$208.98');
    expect(us('monthlyInsurance', 'usd(2)')).toBe('$150.00');
    expect(us('monthlyPMI', 'usd(2)')).toBe('$105.39');
    expect(us('totalMonthly', 'usd(2)')).toBe('$1,866.67');
    expect(us('frontEndRatio', 'pct1')).toBe('28.0%');
    expect(us('backEndRatio', 'pct1')).toBe('35.5%');
    expect(f('40000 / usAffordability(80000, 500, 40000, 7, 30).maxPrice * 100 | pct')).toBe('16%');
    expect(us('maxPrice', 'usd', '90000, 500, 40000, 7, 30')).toBe('$279,993');
    expect(us('maxPrice', 'usd', '80000, 900, 40000, 7, 30')).toBe('$204,864');
    expect(us('maxPrice', 'usd', '80000, 1200, 40000, 7, 30')).toBe('$175,803');
    expect(us('maxPrice', 'usd', '80000, 500, 80000, 7, 30')).toBe('$300,401');
    expect(us('maxPrice', 'usd', '80000, 500, 40000, 7, 30, propertyTax=0.5')).toBe('$264,580');
    expect(us('maxPrice', 'usd', '80000, 500, 40000, 7, 30, propertyTax=2')).toBe('$227,081');
  });
  it('UK as the page states it: revert-to rate typed as 6.5% (NOT the tool default of 6.58%)', () => {
    const uk = (field: string, fmt: string) =>
      f(`ukAffordability(60000, 0, 40000, 5, 25, takeHome=3600, revertRate=6.5).${field} | ${fmt}`);
    expect(uk('ltiLimitLoan', 'gbp')).toBe('£270,000');
    expect(uk('stressLimitLoan', 'gbp')).toBe('£243,575');
    expect(uk('maxLoan', 'gbp')).toBe('£243,575');
    expect(uk('maxPrice', 'gbp')).toBe('£283,575');
    expect(uk('monthlyPI', 'gbp(2)')).toBe('£1,423.92');
    expect(uk('shareOfTakeHome', 'pct1')).toBe('39.6%');
    expect(uk('stressedPayment', 'gbp')).toBe('£1,800');
  });
  it('UK as the calculator gives it: the revert-to rate is fixed at market-rates.ts (6.58%)', () => {
    const uk = (field: string, fmt: string) => f(`ukAffordability(60000, 0, 40000, 5, 25, takeHome=3600).${field} | ${fmt}`);
    expect(uk('stressRatePct', 'pct(2)')).toBe('7.58%');
    expect(uk('maxLoan', 'gbp')).toBe('£241,870');
    expect(uk('maxPrice', 'gbp')).toBe('£281,870');
  });
  it('EUR as the page states it: 0 monthly debts (NOT the calculator default of 500 for EUR)', () => {
    expect(f('eurAffordability(60000, 0, 40000, 3.5, 25).maxLoan | eur')).toBe('€359,552');
    expect(f('eurAffordability(60000, 0, 40000, 3.5, 25).paymentBudget | eur')).toBe('€1,800');
  });
});

describe('car-finance.md (UK convention unless stated)', () => {
  const c = (field: string, fmt: string, args = '25000, 2500, 48') => f(`carFinance(${args}).${field} | ${fmt}`);
  it('PCP under both APR conventions', () => {
    expect(c('pcpMonthly', 'gbp(2)')).toBe('£366.54');
    expect(c('pcpMonthly', 'gbp(2)', '25000, 2500, 48, convention=nominal')).toBe('£370.41');
  });
  it('the worked table', () => {
    expect([c('cashTotalPaid', 'gbp'), c('cashOpportunityCost', 'gbp'), c('cashTrueCost', 'gbp')]).toEqual(['£25,000', '£4,920', '£29,920']);
    expect([c('loanMonthly', 'gbp(2)'), c('loanTotalPaid', 'gbp'), c('loanOpportunityCost', 'gbp'), c('loanTrueCost', 'gbp')]).toEqual(['£522.87', '£27,598', '£2,837', '£30,434']);
    expect([c('hpMonthly', 'gbp(2)'), c('hpTotalPaid', 'gbp'), c('hpOpportunityCost', 'gbp'), c('hpTrueCost', 'gbp')]).toEqual(['£555.19', '£29,149', '£2,981', '£32,130']);
    expect([c('pcpMonthly', 'gbp(2)'), c('pcpTotalPaid', 'gbp'), c('pcpOpportunityCost', 'gbp'), c('pcpTrueCost', 'gbp')]).toEqual(['£366.54', '£30,094', '£2,136', '£32,230']);
    expect(c('balloon', 'gbp')).toBe('£10,000');
    expect(f('carFinance(25000, 2500, 48).cheapest')).toBe('cash');
  });
  it('price, deposit, term and APR effects', () => {
    expect(f('carFinance(30000, 2500, 48).loanMonthly - carFinance(25000, 2500, 48).loanMonthly | gbp(2)')).toBe('£116.19');
    expect(f('carFinance(30000, 2500, 48).hpMonthly - carFinance(25000, 2500, 48).hpMonthly | gbp(2)')).toBe('£123.37');
    expect(f('carFinance(25000, 2500, 48).loanMonthly - carFinance(25000, 3500, 48).loanMonthly | gbp(2)')).toBe('£23.24');
    expect(f('carFinance(25000, 2500, 48).hpMonthly - carFinance(25000, 3500, 48).hpMonthly | gbp(2)')).toBe('£24.67');
    expect(f('carFinance(25000, 2500, 48).loanTotalInterest - carFinance(25000, 3500, 48).loanTotalInterest | gbp')).toBe('£115');
    expect(f('carFinance(25000, 2500, 48).hpTotalInterest - carFinance(25000, 3500, 48).hpTotalInterest | gbp')).toBe('£184');
    expect([c('hpMonthly', 'gbp(2)', '25000, 2500, 36'), c('hpMonthly', 'gbp(2)', '25000, 2500, 60')]).toEqual(['£710.86', '£462.23']);
    expect([c('hpTotalInterest', 'gbp', '25000, 2500, 36'), c('hpTotalInterest', 'gbp', '25000, 2500, 60')]).toEqual(['£3,091', '£5,234']);
    expect(f('(1 - carFinance(25000, 2500, 60).hpMonthly / carFinance(25000, 2500, 36).hpMonthly) * 100 | pct')).toBe('35%');
    expect(f('(carFinance(25000, 2500, 60).hpTotalInterest / carFinance(25000, 2500, 36).hpTotalInterest - 1) * 100 | pct')).toBe('69%');
    expect([c('pcpTotalInterest', 'gbp'), c('loanTotalInterest', 'gbp')]).toEqual(['£5,094', '£2,598']);
    expect(f('carFinance(25000, 2500, 48).pcpTotalInterest - carFinance(25000, 2500, 48).loanTotalInterest | gbp')).toBe('£2,496');
  });
});

describe('solar-payback.md', () => {
  it('UK defaults without and with the battery', () => {
    const s = (field: string, fmt: string, opts = '') => f(`solarPayback('uk'${opts}).${field} | ${fmt}`);
    expect(s('paybackTotalMonths', 'months')).toBe('19 years 8 months');
    expect(s('totalSavings', 'gbp')).toBe('£9,807');
    expect(s('roi', 'pct1')).toBe('40.1%');
    expect(s('year1Savings', 'gbp')).toBe('£248');
    expect(s('netCost', 'gbp')).toBe('£7,000');
    expect(s('generationYear1', 'int')).toBe('3,600');
    expect(s('generationFinal', 'int')).toBe('3,192');
    expect(s('savingsFinalYear', 'gbp')).toBe('£567');
    expect(s('paybackTotalMonths', 'months', ', battery=true')).toBe('15 years');
    expect(s('totalSavings', 'gbp', ', battery=true')).toBe('£22,873');
    expect(s('selfConsumption', 'pct', ', battery=true')).toBe('76%');
    expect(s('selfConsumption', 'pct')).toBe('30%');
  });
  it('US defaults without and with the battery (net metering: the battery adds cost, not savings)', () => {
    expect(f("solarPayback('us').paybackTotalMonths | months")).toBe('11 years 10 months');
    expect(f("solarPayback('us', battery=true).paybackTotalMonths | months")).toBe('18 years 3 months');
  });
});

describe('emergency-fund.md', () => {
  it('3, 6 and 12 months of $3,500 expenses, $2,000 saved, $500 a month', () => {
    const m = (cover: number, aer: number) => f(`emergencyMonths(${3500 * cover}, 2000, 500, ${aer}) | int`);
    expect([m(3, 4), m(6, 4), m(12, 4)]).toEqual(['17', '36', '71']);
    expect([m(3, 0), m(6, 0), m(12, 0)]).toEqual(['17', '38', '80']);
    expect(m(12, 0.38)).toBe('79');
  });
});

describe('investment-return.md, roi.md, mortgage-payment.md', () => {
  it('required rate and ROI', () => {
    check([
      ['requiredRate(10000, 200, 100000, 20) | pct(2)', '4.34%'],
      ['roi(10000, 15000, 500, 3).totalGain | usd', '$5,500'],
      ['roi(10000, 15000, 500, 3).totalReturn | pct', '55%'],
      ['roi(10000, 15000, 500, 3).annualized | pct1', '15.7%'],
      ['annualizedReturn(100, 1) | pct', '100%'],
      ['annualizedReturn(100, 10) | pct1', '7.2%'],
      ['annualizedReturn(80, 15) | pct1', '4.0%'],
      ['annualizedReturn(50, 3) | pct1', '14.5%'],
    ]);
  });
  it('the month principal first exceeds interest on a 30-year loan at 7%', () => {
    expect(f('loanCrossoverMonth(280000, 7, 30) | int')).toBe('242');
  });
});

describe('inflation.md: the typed CPI constants and the amounts built from them', () => {
  it('index values', () => {
    check([
      ['cpiValue(2025) | index', '321.943'],
      ['cpiValue(1990) | index', '130.7'],
      ['cpiValue(2010) | index', '218.056'],
      ['cpiValue(1995) | index', '152.4'],
      ['cpiValue(2024) | index', '313.689'],
    ]);
  });
  it('amounts: cpiAdjust prints exactly what the page\'s typed arithmetic printed', () => {
    for (const [amount, from, cpiFrom] of [[100, 1990, 130.7], [1000, 1990, 130.7], [45000, 2010, 218.056], [25000, 1995, 152.4]] as const) {
      expect(f(`cpiAdjust(${amount}, ${from}, 2025).adjusted | usd`), `${amount} ${from}`).toBe(f(`${amount} * 321.943 / ${cpiFrom} | usd`));
    }
    expect(f('cpiAdjust(45000, 2010, 2025).adjusted | usd')).toBe('$66,439');
    expect(f('cpiValue(2024) / 100 | num(2)')).toBe('3.14');
  });
});
