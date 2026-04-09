import { Facility, Purpose } from '../types';

export interface ParsedSearch {
  facilities: Facility[];
  purposes: Purpose[];
  needsLargeTables: boolean;
  labels: string[]; // Human-readable labels for parsed filters
}

// Keyword → Facility mapping (supports Indonesian + English)
const FACILITY_KEYWORDS: [RegExp, Facility][] = [
  [/\bwifi\b|\bwi-fi\b|\binternet\b/i, 'WiFi'],
  [/\bcol[o]?kan\b|\boutlet\b|\bpower\b|\bcharger?\b|\bcharging\b/i, 'Power Outlet'],
  [/\bmushol+a\b|\bprayer\b|\bsholat\b|\bsalat\b|\bibadah\b/i, 'Mushola'],
  [/\bpark(?:ir|ing)\b|\blahan parkir\b/i, 'Parking'],
  [/\bkid\b|\banak\b|\bkeluarga\b|\bchild\b|\bramah anak\b/i, 'Kid-Friendly'],
  [/\btenang\b|\bquiet\b|\bsunyi\b|\bsepi\b|\bcalm\b|\bcozy\b/i, 'Quiet Atmosphere'],
  [/\bmeja besar\b|\blarge table\b|\bbig table\b|\bmeja luas\b|\b\d+\s*orang\b|\brombongan\b|\brame\b|\bspacious\b|\bluas\b/i, 'Large Tables'],
  [/\boutdoor\b|\bluar\b|\bteras\b|\btaman\b|\bopen\s*air\b/i, 'Outdoor Area'],
];

// Keyword → Purpose mapping
const PURPOSE_KEYWORDS: [RegExp, Purpose][] = [
  [/\bme\s*time\b|\bsendiri\b|\balone\b|\bsolo\b|\brelax\b|\bsantai\b/i, 'Me Time'],
  [/\bdate\b|\bromantic?\b|\bkencan\b|\bpacaran\b|\bpasangan\b|\bcoupl[e]?\b/i, 'Date'],
  [/\bfamily\b|\bkeluarga\b|\bfam\b|\banak\b/i, 'Family Time'],
  [/\bstudy\b|\bbelajar\b|\btugas\b|\bkerja\s*kelompok\b|\bgroup\b/i, 'Group Study'],
  [/\bwfc\b|\bwork\b|\bkerja\b|\bremote\b|\blaptop\b|\bnongkrong\b|\bngerjain\b/i, 'WFC'],
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

  return { facilities, purposes, needsLargeTables, labels };
}
