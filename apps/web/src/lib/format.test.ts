import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY, formatCurrency, getActiveCurrency, setActiveCurrency } from './format';

describe('formatCurrency', () => {
  beforeEach(() => setActiveCurrency(DEFAULT_CURRENCY));

  it('formats a value using an explicit currency', () => {
    expect(formatCurrency(1234.5, 'USD')).toMatch(/\$/);
    expect(formatCurrency(1234.5, 'EUR')).toMatch(/€|EUR/);
    expect(formatCurrency(1234.5, 'NGN')).toMatch(/₦|NGN/);
  });

  it('honours the explicit currency over the active one', () => {
    setActiveCurrency('NGN');
    expect(formatCurrency(100, 'USD')).toBe(formatCurrency(100, 'USD'));
    expect(formatCurrency(100, 'USD')).not.toBe(formatCurrency(100, 'NGN'));
  });

  it('falls back to the active currency when none is given', () => {
    setActiveCurrency('EUR');
    expect(getActiveCurrency()).toBe('EUR');
    expect(formatCurrency(100)).toBe(formatCurrency(100, 'EUR'));
  });

  it('normalizes currency codes to upper case', () => {
    setActiveCurrency('ngn');
    expect(getActiveCurrency()).toBe('NGN');
  });

  it('falls back to the default for invalid currency codes', () => {
    setActiveCurrency('not-a-currency');
    expect(getActiveCurrency()).toBe(DEFAULT_CURRENCY);
    expect(formatCurrency(10, '')).toBe(formatCurrency(10, DEFAULT_CURRENCY));
  });

  it('returns non-numeric values unchanged', () => {
    expect(formatCurrency('n/a', 'USD')).toBe('n/a');
    expect(formatCurrency('abc', 'USD')).toBe('abc');
  });
});
