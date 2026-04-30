const DAY_MAP: Record<string, string> = {
  senin: 'mon',
  selasa: 'tue',
  rabu: 'wed',
  kamis: 'thu',
  jumat: 'fri',
  sabtu: 'sat',
  minggu: 'sun',
};

/**
 * Converts scraper openingHours format to DB format.
 *
 * Input:  { "Senin": { "open": "08.00", "close": "22.00" } }
 * Output: { "mon": "08:00-22:00" }
 */
export function parseOpeningHours(
  raw: Record<string, { open: string; close: string }> | null | undefined,
): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;

  const out: Record<string, string> = {};
  for (const [day, hours] of Object.entries(raw)) {
    const key = DAY_MAP[day.toLowerCase()] ?? day.toLowerCase();
    if (!key || !hours) continue;

    const open = (hours.open ?? '').trim();
    const close = (hours.close ?? '').trim();

    if (!open && !close) continue;

    if (/^tutup$/i.test(open)) {
      out[key] = 'Closed';
      continue;
    }

    if (/buka\s*24/i.test(open) || /^24\s*jam$/i.test(open)) {
      out[key] = '00:00-23:59';
      continue;
    }

    const openFormatted = open.replace(/\./g, ':');
    const closeFormatted = close.replace(/\./g, ':');
    out[key] = `${openFormatted}-${closeFormatted}`;
  }

  return Object.keys(out).length > 0 ? out : null;
}
