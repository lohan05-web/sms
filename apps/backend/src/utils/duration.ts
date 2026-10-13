const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Parses a duration string such as `15m`, `7d` or `30s` into milliseconds.
 * Bare numbers are treated as milliseconds. Falls back to `fallbackMs` when
 * the input cannot be parsed.
 */
export function parseDuration(input: string, fallbackMs: number): number {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/i.exec(input.trim());
  if (!match) {
    return fallbackMs;
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  const multiplier = UNIT_TO_MS[unit];

  if (!Number.isFinite(value) || multiplier === undefined) {
    return fallbackMs;
  }

  return value * multiplier;
}
