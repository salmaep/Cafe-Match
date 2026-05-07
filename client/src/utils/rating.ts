/**
 * Format a Google rating value defensively. The API may return it as either
 * `number` (when CAST/aggregated) or `string` (raw MySQL DECIMAL column),
 * so we coerce before calling `.toFixed()`.
 *
 * Returns null if the value is missing or not a finite number.
 */
export function formatRating(value: unknown, digits = 1): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(digits);
}
