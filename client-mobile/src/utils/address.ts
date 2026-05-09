/**
 * Strip Google Maps "Plus Code" and other scraping artifacts from a cafe
 * address string. Mirrors client/src/utils/address.ts.
 */
export function cleanAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/^[2-9CFGHJMPQRVWX]{4,}\+[2-9CFGHJMPQRVWX]{2,}\b\s*/i, '');
  s = s.replace(/^[^\p{L}\p{N}]+/u, '');
  return s.trim();
}
