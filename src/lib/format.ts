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
 * Converts between any two supported currencies.
 *
 * CURRENCY_RATES are quoted per USD, so a cross rate goes through USD:
 * value / RATE[from] gives USD, and multiplying by RATE[to] gives the target.
 */
export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return (amount / CURRENCY_RATES[from]) * CURRENCY_RATES[to];
}

/**
 * Builds a currency formatter.
 *
 * `from` is the currency the stored amounts are denominated in — the ad
 * account's own currency, not necessarily USD. Assuming a USD base
 * overstated every figure on an EGP account by roughly 48x.
 *
 * `Intl.NumberFormat` construction is expensive and this runs once per table
 * cell (~11x per campaign row), so the instance is built once per
 * (display, base) pair and reused.
 */
export function createCurrencyFormatter(display: Currency, from: Currency = 'USD') {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: display,
    maximumFractionDigits: 0,
  });
  return (value: number) => nf.format(convert(value, from, display));
}

const compactNumber = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number) => compactNumber.format(value);
