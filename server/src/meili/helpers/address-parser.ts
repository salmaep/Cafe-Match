/**
 * Parse city and district from Indonesian address strings.
 * Example: "Jl. Cihapit No.21, Cihapit, Bandung Wetan, Bandung City, West Java 40114"
 * → { city: 'Bandung', district: 'Bandung Wetan' }
 */
export function parseAddressParts(address: string): { city: string | null; district: string | null } {
  if (!address) return { city: null, district: null };

  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return { city: null, district: null };

  // Typical format: street, kelurahan, kecamatan/district, city, province
  // Heuristic: city is usually "Bandung City" or "Kota Bandung" near the end
  let city: string | null = null;
  let district: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.includes('city') || lower.includes('kota') || lower.includes('kabupaten')) {
      city = part.replace(/city/i, '').replace(/kota/i, '').replace(/kabupaten/i, '').replace(/\d+/g, '').trim();
      break;
    }
  }

  // District is typically 2 parts before city
  const cityIndex = parts.findIndex((p) => {
    const l = p.toLowerCase();
    return l.includes('city') || l.includes('kota') || l.includes('kabupaten');
  });

  if (cityIndex >= 2) {
    district = parts[cityIndex - 1];
  } else if (cityIndex === -1 && parts.length >= 3) {
    // Fallback: take second-to-last as district, last as city
    const lastPart = parts[parts.length - 1].replace(/\d+/g, '').trim();
    city = lastPart || null;
    district = parts[parts.length - 2] || null;
  }

  return {
    city: city || null,
    district: district || null,
  };
}
