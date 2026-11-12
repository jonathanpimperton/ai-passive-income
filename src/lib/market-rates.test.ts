import { describe, it, expect } from 'vitest';
import {
  MARKET_RATES,
  MARKET_RATES_CHECKED,
  allMarketRates,
  defaultMortgageRate,
  defaultMortgageRateInfo,
  rateAttribution,
  regionForCurrency,
} from './market-rates';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('market-rates table integrity', () => {
  it('every rate is a plausible percentage with dated, sourced provenance', () => {
    for (const r of allMarketRates()) {
      expect(r.value).toBeGreaterThan(0);
      expect(r.value).toBeLessThan(20);
      expect(r.asOf).toMatch(ISO);
      expect(r.checked).toMatch(ISO);
      expect(r.url).toMatch(/^https:\/\//);
      expect(r.source.length).toBeGreaterThan(5);
      expect(r.shortSource.length).toBeGreaterThan(1);
      // A figure cannot describe a date after we checked it.
      expect(r.asOf <= r.checked).toBe(true);
      expect(r.checked <= MARKET_RATES_CHECKED).toBe(true);
    }
  });

  it('pins the verified November 2026 values (update with the sources, not alone)', () => {
    expect(MARKET_RATES.us.mortgage30.value).toBe(7.11);
    expect(MARKET_RATES.us.mortgage15.value).toBe(6.45);
    expect(MARKET_RATES.uk.bankRate.value).toBe(4.0);
    expect(MARKET_RATES.uk.fixed2yr75.value).toBe(5.39);
    expect(MARKET_RATES.uk.fixed5yr75.value).toBe(5.19);
    expect(MARKET_RATES.eur.housePurchase.value).toBe(3.62);
  });
});

describe('defaultMortgageRate', () => {
  it('US: 30-year PMMS by default, 15-year PMMS for terms of 15 years or less', () => {
    expect(defaultMortgageRate('us')).toBe(7.11);
    expect(defaultMortgageRate('us', 30)).toBe(7.11);
    expect(defaultMortgageRate('us', 20)).toBe(7.11);
    expect(defaultMortgageRate('us', 15)).toBe(6.45);
    expect(defaultMortgageRate('us', 10)).toBe(6.45);
  });

  it('UK uses the BoE 2-year fixed 75% LTV rate; EUR the ECB composite', () => {
    expect(defaultMortgageRate('uk', 25)).toBe(5.39);
    expect(defaultMortgageRate('eur', 25)).toBe(3.62);
    expect(defaultMortgageRateInfo('uk').source).toMatch(/Bank of England/);
  });

  it('maps currencies to regions', () => {
    expect(regionForCurrency('USD')).toBe('us');
    expect(regionForCurrency('GBP')).toBe('uk');
    expect(regionForCurrency('EUR')).toBe('eur');
    expect(regionForCurrency('XYZ')).toBe('us');
  });
});

describe('rateAttribution', () => {
  it('prints weekly figures as a day and month-end figures as a month', () => {
    expect(rateAttribution(MARKET_RATES.us.mortgage30)).toBe('Freddie Mac, 12 Nov 2026');
    expect(rateAttribution(MARKET_RATES.uk.fixed2yr75)).toBe('Bank of England, Oct 2026');
    expect(rateAttribution(MARKET_RATES.eur.housePurchase)).toBe('ECB, Sep 2026');
  });
});
