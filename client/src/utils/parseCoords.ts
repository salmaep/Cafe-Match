// Parse coord strings — supports paste from Google Maps, spreadsheets, plain text.
// Examples that work:
//   "-6.9148492, 107.6648254"
//   "-6.9148492 107.6648254"   (space separator)
//   "-6.9148492;107.6648254"   (semicolon)
//   "-6.9148492,107.6648254"   (no space)
//   "(-6.9148492, 107.6648254)" (parentheses, e.g. from Google Maps)
//   "  -6.9148492 ,  107.6648254  " (extra whitespace, tabs)
export function parseCoords(input: string): { lat: number; lng: number } | null {
  const cleaned = input
    .trim()
    .replace(/^[\(\[\{]+|[\)\]\}]+$/g, '')
    .trim();
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
