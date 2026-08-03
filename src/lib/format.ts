import type { Currency } from '../types/mediaBuyer';

/**
 * Static USD-base conversion rates.
 *
 * NOTE: these are hardcoded placeholders. Any real deployment must source
 * these from an FX provider with a timestamp, because reporting revenue at a
 * stale rate misstates client-facing financials.
 */
export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1.0,
  EGP: 48.5,
  SAR: 3.75,
  EUR: 0.92,
};

/**
 * Builds a currency formatter for a given target currency.
 *
 * `Intl.NumberFormat` construction is expensive and this runs once per table
 * cell (~11x per campaign row), so the instance is created once per
 * (currency, rate) pair and reused.
 */
export function createCurrencyFormatter(currency: Currency, rate: number) {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return (usdValue: number) => nf.format(usdValue * rate);
}

const compactNumber = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number) => compactNumber.format(value);
