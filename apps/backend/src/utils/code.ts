export function nextSequentialCode(prefix: string, existing: (string | null | undefined)[]): string {
  let max = 0;
  for (const value of existing) {
    if (!value) continue;
    const match = /(\d+)\s*$/.exec(value);
    if (!match) continue;
    const n = Number.parseInt(match[1] as string, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}
