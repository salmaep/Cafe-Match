/**
 * Strip Google Maps "Plus Code" and other scraping artifacts from a cafe
 * address string.
 *
 * Examples cleaned:
 *   "J9CR+25 Jl. Asia Afrika ..." → "Jl. Asia Afrika ..."
 *   "➕ Jl. Sukajadi ..."           → "Jl. Sukajadi ..."
 *   "⊕ Jl. Cihampelas ..."          → "Jl. Cihampelas ..."
 *   "+ Jl. Dakota Raya ..."         → "Jl. Dakota Raya ..."
 */
export function cleanAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim();

  // 1. Strip leading Plus Code (e.g. "J9CR+25", "JCXM+P9F"). Pattern: 4+ alnum,
  //    a literal "+", then 2+ alnum, optionally followed by space.
  s = s.replace(/^[2-9CFGHJMPQRVWX]{4,}\+[2-9CFGHJMPQRVWX]{2,}\b\s*/i, "");

  // 2. Strip ANY leading character that isn't a letter/digit. This catches the
  //    various circle-plus / plus-emoji glyphs that Google Maps scraper sometimes
  //    leaves at the start of an address (➕ ⊕ ⊞ ⨁ + • ● etc.) without us having
  //    to enumerate every Unicode codepoint.
  s = s.replace(/^[^\p{L}\p{N}]+/u, "");

  return s.trim();
}
