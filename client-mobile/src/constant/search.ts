export interface LocationKeyword {
  label: string;
  latitude: number;
  longitude: number;
}

export const LOCATION_KEYWORDS: [RegExp, LocationKeyword][] = [
  [/\bdago\b/i, { label: 'Dago, Bandung', latitude: -6.88, longitude: 107.61 }],
  [
    /\btebet\b/i,
    { label: 'Tebet, Jakarta Selatan', latitude: -6.2241, longitude: 106.8446 },
  ],
  [/\bbandung\b/i, { label: 'Bandung', latitude: -6.9175, longitude: 107.6191 }],
  [/\bjakarta\b/i, { label: 'Jakarta', latitude: -6.2088, longitude: 106.8456 }],
  [
    /\bkemang\b/i,
    { label: 'Kemang, Jakarta Selatan', latitude: -6.2615, longitude: 106.8106 },
  ],
  [
    /\bsenopati\b/i,
    { label: 'Senopati, Jakarta Selatan', latitude: -6.235, longitude: 106.8 },
  ],
  [
    /\bsudirman\b/i,
    { label: 'Sudirman, Jakarta', latitude: -6.2088, longitude: 106.8456 },
  ],
];
