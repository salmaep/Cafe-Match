export const FACILITY_ICONS: Record<string, string> = {
  WiFi: '📶',
  'Power Outlet': '🔌',
  Mushola: '🕌',
  Parking: '🅿️',
  'Kid-Friendly': '👶',
  'Quiet Atmosphere': '🤫',
  'Large Tables': '🪑',
  'Outdoor Area': '🌿',
  'Cozy Seating': '🛋️',
  'Ambient Lighting': '💡',
  'Intimate Seating': '💕',
  'Family Friendly': '👨‍👩‍👧',
  Spacious: '🏛️',
  Whiteboard: '📋',
  'Bookable Space': '📅',
  'Smoking Area': '🚬',
};

export function getFacilityIcon(label: string): string {
  if (FACILITY_ICONS[label]) return FACILITY_ICONS[label];
  const lower = label.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return '📶';
  if (
    lower.includes('power') ||
    lower.includes('outlet') ||
    lower.includes('charge')
  )
    return '🔌';
  if (lower.includes('park')) return '🅿️';
  if (lower.includes('quiet') || lower.includes('calm')) return '🤫';
  if (lower.includes('outdoor') || lower.includes('garden')) return '🌿';
  if (lower.includes('kid') || lower.includes('family')) return '👶';
  if (lower.includes('table')) return '🪑';
  if (lower.includes('light')) return '💡';
  if (lower.includes('seat') || lower.includes('cozy')) return '🛋️';
  if (lower.includes('smoke') || lower.includes('smoking')) return '🚬';
  if (lower.includes('pray') || lower.includes('mushola')) return '🕌';
  if (lower.includes('book')) return '📅';
  return '✓';
}
