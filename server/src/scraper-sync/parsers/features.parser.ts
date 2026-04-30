/**
 * Maps Indonesian Google Maps feature strings to internal facility_key values.
 * Keys that are not recognized are skipped.
 */
const FEATURE_MAP: Record<string, string> = {
  'tempat duduk di area terbuka': 'outdoor_seating',
  'antar tanpa bertemu': 'contactless_delivery',
  'pesan antar': 'delivery',
  'layanan di tempat': 'dine_in',
  'bawa pulang': 'takeaway',
  'makan di tempat': 'dine_in',
  'kopi enak': 'great_coffee',
  'makanan pencuci mulut enak': 'great_dessert',
  'pilihan teh enak': 'great_tea',
  'makan sendiri': 'solo_friendly',
  'cocok untuk bekerja menggunakan laptop': 'laptop_friendly',
  'cepat saji': 'fast_service',
  'tempat duduk': 'seating',
  'toilet': 'toilet',
  'nyaman': 'cozy',
  'santai': 'relaxed',
  'tenang': 'quiet',
  'trendi': 'trendy',
  'berkelompok': 'group_friendly',
  'mahasiswa': 'student_friendly',
  'menerima reservasi': 'reservations',
  'agak sulit menemukan tempat parkir': 'limited_parking',
  'parkir di jalan berbayar': 'street_parking',
  'anjing boleh dibawa masuk': 'pet_friendly',
  'anjing boleh masuk': 'pet_friendly',
  'area luar boleh dimasuki anjing': 'pet_friendly_outdoor',
  'mushola': 'mushola',
  'ruang sholat': 'mushola',
  'tempat sholat': 'mushola',
  'wifi': 'wifi',
  'wi-fi': 'wifi',
  'wi-fi gratis': 'wifi',
  'stopkontak': 'power_outlets',
  'colokan listrik': 'power_outlets',
  'ac': 'air_conditioning',
  'ber-ac': 'air_conditioning',
  'area merokok': 'smoking_area',
  'bebas rokok': 'non_smoking',
};

export interface ParsedFacility {
  facilityKey: string;
  facilityValue?: string;
}

/**
 * Parses an array of Indonesian feature strings into facility key-value pairs.
 * Skips payment-related features (handled separately via payment object).
 * Deduplicates — each facility_key appears at most once.
 */
export function parseFeatures(features: string[]): ParsedFacility[] {
  if (!features || features.length === 0) return [];

  const seen = new Set<string>();
  const result: ParsedFacility[] = [];

  for (const rawFeature of features) {
    const normalized = rawFeature.trim().toLowerCase();

    // Skip payment-related features (handled via payment object)
    if (/kartu debit|kartu kredit|pembayaran seluler|nfc|qris|tunai/i.test(normalized)) {
      continue;
    }

    const facilityKey = FEATURE_MAP[normalized];
    if (!facilityKey || seen.has(facilityKey)) continue;

    seen.add(facilityKey);
    result.push({ facilityKey });
  }

  return result;
}

const PAYMENT_KEY_MAP: Record<string, string> = {
  cash: 'payment_cash',
  debitCard: 'payment_debit',
  creditCard: 'payment_credit',
  qris: 'payment_qris',
  nfc: 'payment_nfc',
  ewallet: 'payment_ewallet',
};

/**
 * Converts payment object into facility key-value pairs.
 * Only includes payment methods that are true.
 */
export function parsePayment(
  payment: Record<string, unknown> | null | undefined,
): ParsedFacility[] {
  if (!payment) return [];
  const result: ParsedFacility[] = [];
  for (const [method, enabled] of Object.entries(payment)) {
    const key = PAYMENT_KEY_MAP[method];
    if (!key) continue;
    result.push({ facilityKey: key, facilityValue: String(enabled) });
  }
  return result;
}
