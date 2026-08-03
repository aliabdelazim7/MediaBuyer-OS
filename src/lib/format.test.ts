import { describe, expect, it } from 'vitest';
import { CURRENCY_RATES, createCurrencyFormatter, formatNumber } from './format';
import type { Currency } from '../types/mediaBuyer';

describe('createCurrencyFormatter', () => {
  it('renders USD at a 1:1 rate', () => {
    const fmt = createCurrencyFormatter('USD', 1);
    expect(fmt(1404)).toBe('$1,404');
  });

  it('applies the conversion rate before formatting', () => {
    const fmt = createCurrencyFormatter('EGP', CURRENCY_RATES.EGP);
    // 100 USD * 48.5 = 4,850 EGP
    expect(fmt(100)).toContain('4,850');
  });

  it('handles zero and negative values (a loss-making campaign)', () => {
    const fmt = createCurrencyFormatter('USD', 1);
    expect(fmt(0)).toBe('$0');
    expect(fmt(-250)).toBe('-$250');
  });

  it('returns a reusable function rather than rebuilding Intl per call', () => {
    const fmt = createCurrencyFormatter('USD', 1);
    expect(fmt(10)).toBe(fmt(10));
  });

  it.each(Object.keys(CURRENCY_RATES) as Currency[])(
    'produces a finite formatted string for %s',
    (currency) => {
      const out = createCurrencyFormatter(currency, CURRENCY_RATES[currency])(1000);
      expect(out).toBeTypeOf('string');
      expect(out).not.toContain('NaN');
    },
  );
});

describe('CURRENCY_RATES', () => {
  it('uses USD as the base', () => {
    expect(CURRENCY_RATES.USD).toBe(1);
  });

  it('declares a positive rate for every supported currency', () => {
    for (const rate of Object.values(CURRENCY_RATES)) {
      expect(rate).toBeGreaterThan(0);
    }
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(45200)).toBe('45,200');
  });
});
