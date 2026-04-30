/**
 * Converts scraper pricing string to price_range ENUM.
 *
 * Examples:
 *   "Rp 25"  → "$"
 *   "Rp 50"  → "$$"
 *   "Rp 100" → "$$$"
 *
 * Assumes the number represents thousands of rupiah (ribuan).
 * Thresholds: ≤30k → "$", 31–60k → "$$", >60k → "$$$"
 */
export function parsePriceRange(pricing: string | null | undefined): '$' | '$$' | '$$$' {
  if (!pricing) return '$$';

  const match = pricing.match(/[\d,.]+/);
  if (!match) return '$$';

  const amount = parseFloat(match[0].replace(',', '.'));
  if (isNaN(amount)) return '$$';

  if (amount <= 30) return '$';
  if (amount <= 60) return '$$';
  return '$$$';
}
