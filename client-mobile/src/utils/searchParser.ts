import { Facility, Purpose } from '../types';

export interface ParsedSearch {
  facilities: Facility[];
  purposes: Purpose[];
  needsLargeTables: boolean;
  labels: string[]; // Human-readable labels for parsed filters
  locationHint?: { label: string; latitude: number; longitude: number };
}

// Keyword → Facility mapping (supports Indonesian + English)
const FACILITY_KEYWORDS: [RegExp, Facility][] = [
  [/\bwifi\b|\bwi-fi\b|\binternet\b|\bkoneksi\b/i, 'WiFi'],
  [/\bcol[o]?kan\b|\boutlet\b|\bpower\b|\bcharger?\b|\bcharging\b|\bstop\s*kontak\b/i, 'Power Outlet'],
  [/\bmushol+a\b|\bprayer\b|\bsholat\b|\bsalat\b|\bibadah\b|\bmasjid\b/i, 'Mushola'],
  [/\bpark(?:ir|ing)\b|\blahan parkir\b|\btempat parkir\b|\bparkiran\b/i, 'Parking'],
  [/\bkid\b|\bramah anak\b|\bchild\b|\banak-anak\b|\bfamily friendly\b/i, 'Kid-Friendly'],
  [/\btenang\b|\bquiet\b|\bsunyi\b|\bsepi\b|\bcalm\b|\bcozy\b|\bnyaman\b/i, 'Quiet Atmosphere'],
  [/\bmeja besar\b|\blarge table\b|\bbig table\b|\bmeja luas\b|\b\d+\s*orang\b|\brombongan\b|\brame\b|\bspacious\b|\bluas\b/i, 'Large Tables'],
  [/\boutdoor\b|\bluar\b|\bteras\b|\btaman\b|\bopen\s*air\b|\bsemi outdoor\b/i, 'Outdoor Area'],
];

// Keyword → Purpose mapping
const PURPOSE_KEYWORDS: [RegExp, Purpose][] = [
  [/\bme\s*time\b|\bsendiri\b|\balone\b|\bsolo\b|\brelax\b|\bsantai\b|\bmerenung\b/i, 'Me Time'],
  [/\bdate\b|\bromantic?\b|\bkencan\b|\bpacaran\b|\bpasangan\b|\bcoupl[e]?\b|\bduaan\b/i, 'Date'],
  [/\bfamily\b|\bkeluarga\b|\bfam\b|\banak-anak\b|\bbawa anak\b/i, 'Family Time'],
  [/\bstudy\b|\bbelajar\b|\btugas\b|\bkerja\s*kelompok\b|\bgroup\b|\bskripsi\b|\bkuliah\b/i, 'Group Study'],
  [/\bwfc\b|\bwork\b|\bkerja\b|\bremote\b|\blaptop\b|\bnongkrong\b|\bngerjain\b|\bnge-laptop\b|\bngelaptop\b/i, 'WFC'],
];

// Known location keywords → coordinates
export const LOCATION_KEYWORDS: [RegExp, { label: string; latitude: number; longitude: number }][] = [
  [/\bdago\b/i, { label: 'Dago, Bandung', latitude: -6.8800, longitude: 107.6100 }],
  [/\btebet\b/i, { label: 'Tebet, Jakarta Selatan', latitude: -6.2241, longitude: 106.8446 }],
  [/\bbandung\b/i, { label: 'Bandung', latitude: -6.9175, longitude: 107.6191 }],
  [/\bjakarta\b/i, { label: 'Jakarta', latitude: -6.2088, longitude: 106.8456 }],
  [/\bkemang\b/i, { label: 'Kemang, Jakarta Selatan', latitude: -6.2615, longitude: 106.8106 }],
  [/\bsenopati\b/i, { label: 'Senopati, Jakarta Selatan', latitude: -6.2350, longitude: 106.8000 }],
  [/\bsudirman\b/i, { label: 'Sudirman, Jakarta', latitude: -6.2088, longitude: 106.8456 }],
];

export function parseSearchQuery(query: string): ParsedSearch {
  const facilities: Facility[] = [];
  const purposes: Purpose[] = [];
  const labels: string[] = [];
  let needsLargeTables = false;

  // Normalize the query
  const q = query.toLowerCase().trim();

  // Match facilities
  for (const [pattern, facility] of FACILITY_KEYWORDS) {
    if (pattern.test(q) && !facilities.includes(facility)) {
      facilities.push(facility);
      labels.push(facility);
    }
  }

  // Match purposes
  for (const [pattern, purpose] of PURPOSE_KEYWORDS) {
    if (pattern.test(q) && !purposes.includes(purpose)) {
      purposes.push(purpose);
      labels.push(purpose);
    }
  }

  // Capacity hints → large tables
  const capacityMatch = q.match(/(\d+)\s*orang/);
  if (capacityMatch && Number(capacityMatch[1]) >= 5) {
    needsLargeTables = true;
    if (!facilities.includes('Large Tables')) {
      facilities.push('Large Tables');
      labels.push('Large Tables');
    }
  }

  // Atmosphere → purpose/facility
  if (/\bromantis?\b/i.test(q) && !purposes.includes('Date')) {
    purposes.push('Date');
    labels.push('Date');
  }

  // Detect location hints
  let locationHint: ParsedSearch['locationHint'];
  for (const [pattern, loc] of LOCATION_KEYWORDS) {
    if (pattern.test(q)) {
      locationHint = loc;
      if (!labels.includes(loc.label)) labels.push(loc.label);
      break;
    }
  }

  return { facilities, purposes, needsLargeTables, labels, locationHint };
}
