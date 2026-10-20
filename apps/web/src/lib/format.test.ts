import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CURRENCY,
  currencyLocale,
  formatCurrency,
  getActiveCurrency,
  setActiveCurrency,
} from './format';

describe('formatCurrency (INR)', () => {
  it('defaults to INR', () => {
    expect(DEFAULT_CURRENCY).toBe('INR');
    expect(getActiveCurrency()).toBe('INR');
  });

  it('formats INR with the Indian digit grouping from the spec', () => {
    // ₹1,000 / ₹25,500 / ₹1,00,000 / ₹12,50,000
    const plain = (value: number) =>
      formatCurrency(value, 'INR').replace(/[^\d.,]/g, '').replace(/\.00$/, '');

    expect(formatCurrency(1000, 'INR')).toContain('₹');
    expect(plain(1000)).toBe('1,000');
    expect(plain(25500)).toBe('25,500');
    expect(plain(100000)).toBe('1,00,000');
    expect(plain(1250000)).toBe('12,50,000');
  });

  it('uses the en-IN locale for INR so grouping does not follow the device', () => {
    expect(currencyLocale('INR')).toBe('en-IN');
    expect(currencyLocale('inr')).toBe('en-IN');
    expect(currencyLocale('USD')).toBeUndefined();
    expect(formatCurrency(100000, 'INR').includes('1,00,000')).toBe(true);
  });

  it('keeps non-INR currencies on the system locale (no regression)', () => {
    expect(formatCurrency(1234.5, 'USD')).toMatch(/\$/);
    expect(formatCurrency(1234.5, 'EUR')).toMatch(/€|EUR/);
    expect(formatCurrency(1234.5, 'NGN')).toMatch(/₦|NGN/);
  });

  it('honours an explicit currency over the active one', () => {
    setActiveCurrency('INR');
    expect(formatCurrency(100, 'USD')).toBe(formatCurrency(100, 'USD'));
    expect(formatCurrency(100, 'USD')).not.toBe(formatCurrency(100, 'INR'));
  });

  it('falls back to the active currency when none is given', () => {
    setActiveCurrency('INR');
    expect(formatCurrency(100)).toBe(formatCurrency(100, 'INR'));
  });

  it('normalizes currency codes to upper case', () => {
    expect(formatCurrency(100, 'inr')).toBe(formatCurrency(100, 'INR'));
  });

  it('falls back to the default for invalid currency codes', () => {
    setActiveCurrency('not-a-currency');
    expect(formatCurrency(10, '')).toBe(formatCurrency(10, DEFAULT_CURRENCY));
  });

  it('passes through non-numeric values untouched', () => {
    expect(formatCurrency('n/a', 'INR')).toBe('n/a');
    expect(formatCurrency('abc', 'INR')).toBe('abc');
  });

  it('never multiplies or divides amounts (values are preserved)', () => {
    setActiveCurrency('INR');
    expect(formatCurrency(0)).toBe(formatCurrency(0, 'INR'));
    expect(formatCurrency(25500.75, 'INR')).toContain('25,500.75');
  });
});
