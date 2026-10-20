export function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function humanize(value: unknown): string {
  const text = asString(value);
  if (!text) return '';
  return text
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function shortId(value: unknown): string {
  const text = asString(value);
  return text.length > 10 ? `${text.slice(0, 6)}…${text.slice(-3)}` : text;
}

export function formatDate(value: unknown): string {
  const text = asString(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatDateTime(value: unknown): string {
  const text = asString(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DEFAULT_CURRENCY = 'INR';

let activeCurrency = DEFAULT_CURRENCY;

function normalizeCurrency(currency: unknown): string {
  const code = asString(currency).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : '';
}

/**
 * Picks the locale used to group/format an amount.
 *
 * Indian grouping (₹1,00,000 rather than ₹100,000) is produced by the `en-IN`
 * locale, not by the INR currency code — so the locale cannot simply follow the
 * device. INR therefore always formats as `en-IN`; every other currency keeps
 * following the system locale, exactly as before.
 */
export function currencyLocale(currency: unknown): string | undefined {
  return normalizeCurrency(currency) === 'INR' ? 'en-IN' : undefined;
}

/**
 * The currency used by `formatCurrency` when no explicit code is passed.
 * The settings context sets this from the signed-in user's school.
 */
export function setActiveCurrency(currency: unknown): void {
  activeCurrency = normalizeCurrency(currency) || DEFAULT_CURRENCY;
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function formatCurrency(value: unknown, currency?: string): string {
  const num = typeof value === 'number' ? value : Number(asString(value));
  if (Number.isNaN(num)) {
    return asString(value);
  }
  const requested =
    currency === undefined || currency === null || currency === '' ? activeCurrency : currency;
  const code = normalizeCurrency(requested) || DEFAULT_CURRENCY;
  try {
    // As specified: Intl.NumberFormat with the currency's conventional locale
    // (`en-IN` for INR) so grouping matches the currency's own convention.
    return new Intl.NumberFormat(currencyLocale(code), {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${code} ${num.toLocaleString(currencyLocale(code))}`;
  }
}

export function initials(first: unknown, last: unknown): string {
  const a = asString(first).charAt(0);
  const b = asString(last).charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}
