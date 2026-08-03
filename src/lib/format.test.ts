import { describe, expect, it } from 'vitest';
import { CURRENCY_RATES, convert, createCurrencyFormatter, formatNumber } from './format';
import type { Currency } from '../types/mediaBuyer';

describe('convert', () => {
  it('is a no-op when the currencies match', () => {
    expect(convert(1234, 'EGP', 'EGP')).toBe(1234);
  });

  it('converts USD to EGP at the table rate', () => {
    expect(convert(100, 'USD', 'EGP')).toBeCloseTo(4850, 0);
  });

  it('converts EGP back to USD', () => {
    // The case that matters: an EGP ad account's raw figures were previously
    // treated as USD and displayed ~48x too high.
    expect(convert(4850, 'EGP', 'USD')).toBeCloseTo(100, 2);
  });

  it('round-trips without drift', () => {
    for (const c of Object.keys(CURRENCY_RATES) as Currency[]) {
      expect(convert(convert(500, 'USD', c), c, 'USD')).toBeCloseTo(500, 6);
    }
  });

  it('crosses two non-USD currencies through USD', () => {
    // 485 EGP -> 10 USD -> 37.5 SAR
    expect(convert(485, 'EGP', 'SAR')).toBeCloseTo(37.5, 2);
  });
});

describe('createCurrencyFormatter', () => {
  it('renders USD amounts unchanged when the base is USD', () => {
    const fmt = createCurrencyFormatter('USD', 'USD');
    expect(fmt(1404)).toBe('$1,404');
  });

  it('converts from the base currency before formatting', () => {
    const fmt = createCurrencyFormatter('EGP', 'USD');
    expect(fmt(100)).toContain('4,850');
  });

  it('does not inflate figures already stored in the display currency', () => {
    // An EGP account showing EGP must render the stored number as-is.
    const fmt = createCurrencyFormatter('EGP', 'EGP');
    expect(fmt(4850)).toContain('4,850');
  });

  it('defaults to a USD base when none is given', () => {
    expect(createCurrencyFormatter('USD')(50)).toBe('$50');
  });

  it('handles zero and negative values (a loss-making campaign)', () => {
    const fmt = createCurrencyFormatter('USD', 'USD');
    expect(fmt(0)).toBe('$0');
    expect(fmt(-250)).toBe('-$250');
  });

  it.each(Object.keys(CURRENCY_RATES) as Currency[])(
    'produces a finite formatted string for %s',
    (currency) => {
      const out = createCurrencyFormatter(currency, 'EGP')(1000);
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
