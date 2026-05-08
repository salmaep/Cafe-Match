/**
 * Single source of truth for all cafe facilities.
 *
 * - `key`: canonical identifier stored in `cafe_facilities.facility_key`
 *          and emitted in Meilisearch `facilities[]`. Snake_case ASCII.
 * - `label`: Indonesian display label used by the filter UI. Title Case.
 * - `aliases`: lowercase strings as seen in Google Maps `features[]`.
 * - `derivesFlag`: when present, finding this key in parsed features
 *                  ALSO sets the corresponding boolean column on `cafes`.
 *
 * Adding a new facility: append to the relevant group; no migration needed.
 * Renaming a `key` IS a breaking change — backfill cafe_facilities first.
 *
 * Keys here MUST match what's actually stored in `cafe_facilities`
 * (and referenced by `purpose_requirements`). If you rename a key, you must
 * also update existing rows in those two tables and re-seed purposes.
 */

export type DerivedFlag = 'wifiAvailable' | 'hasMushola' | 'hasParking';

export interface FacilityDef {
  key: string;
  label: string;
  aliases: string[];
  derivesFlag?: DerivedFlag;
  /** Lucide icon name for UI display (e.g. "Wifi", "Zap"). */
  icon?: string;
}

export interface FacilityGroup {
  key: string;
  label: string;
  items: FacilityDef[];
}

export const FACILITY_CATALOG: FacilityGroup[] = [
  {
    key: 'amenity',
    label: 'Fasilitas',
    items: [
      { key: 'strong_wifi', label: 'WiFi', aliases: ['wifi', 'wi-fi', 'wi-fi gratis'], derivesFlag: 'wifiAvailable', icon: 'Wifi' },
      { key: 'mushola', label: 'Mushola', aliases: ['mushola', 'ruang sholat', 'tempat sholat'], derivesFlag: 'hasMushola', icon: 'Building2' },
      { key: 'parking', label: 'Parkir', aliases: ['banyak tempat parkir', 'tempat parkir gratis', 'tempat parkir berbayar', 'parkir di jalan berbayar', 'tempat parkir'], derivesFlag: 'hasParking', icon: 'SquareParking' },
      { key: 'power_outlets', label: 'Stop Kontak', aliases: ['stopkontak', 'colokan listrik'], icon: 'Zap' },
      { key: 'outdoor_seating', label: 'Outdoor', aliases: ['tempat duduk di area terbuka'], icon: 'Trees' },
    ],
  },
  {
    key: 'ambience',
    label: 'Suasana',
    items: [
      { key: 'cozy_seating', label: 'Nyaman', aliases: ['nyaman'], icon: 'Armchair' },
      { key: 'quiet_atmosphere', label: 'Tenang', aliases: ['tenang'], icon: 'VolumeX' },
      { key: 'ambient_lighting', label: 'Pencahayaan Romantis', aliases: [], icon: 'Lamp' },
      { key: 'intimate_seating', label: 'Intim', aliases: [], icon: 'Heart' },
      { key: 'noise_tolerant', label: 'Boleh Berisik', aliases: [], icon: 'Volume2' },
    ],
  },
  {
    key: 'space',
    label: 'Ruang',
    items: [
      { key: 'spacious', label: 'Luas', aliases: [], icon: 'Maximize2' },
      { key: 'large_tables', label: 'Meja Besar', aliases: [], icon: 'Table2' },
      { key: 'whiteboard', label: 'Whiteboard', aliases: [], icon: 'PresentationIcon' },
      { key: 'bookable_space', label: 'Bisa Booking', aliases: [], icon: 'CalendarCheck' },
      { key: 'smoking_area', label: 'Area Merokok', aliases: [], icon: 'Wind' },
    ],
  },
  {
    key: 'audience',
    label: 'Cocok Untuk',
    items: [
      { key: 'kid_friendly', label: 'Ramah Anak', aliases: ['cocok untuk anak-anak', 'kursi tinggi', 'menu anak'], icon: 'Baby' },
    ],
  },
  {
    key: 'payment',
    label: 'Pembayaran',
    items: [
      { key: 'payment_cash', label: 'Tunai', aliases: [], icon: 'Banknote' },
      { key: 'payment_debit', label: 'Kartu Debit', aliases: [], icon: 'CreditCard' },
      { key: 'payment_credit', label: 'Kartu Kredit', aliases: [], icon: 'CreditCard' },
      { key: 'payment_qris', label: 'QRIS', aliases: [], icon: 'QrCode' },
      { key: 'payment_nfc', label: 'NFC', aliases: [], icon: 'Smartphone' },
      { key: 'payment_ewallet', label: 'E-Wallet', aliases: [], icon: 'Wallet' },
    ],
  },
];

// ── Lookup helpers (built once at module load) ──────────────────────────────

const ALIAS_INDEX = new Map<string, FacilityDef>();
const KEY_INDEX = new Map<string, FacilityDef>();

for (const group of FACILITY_CATALOG) {
  for (const def of group.items) {
    KEY_INDEX.set(def.key, def);
    for (const alias of def.aliases) {
      ALIAS_INDEX.set(alias.toLowerCase().trim(), def);
    }
  }
}

export function findFacilityByAlias(alias: string): FacilityDef | undefined {
  return ALIAS_INDEX.get(alias.toLowerCase().trim());
}

export function findFacilityByKey(key: string): FacilityDef | undefined {
  return KEY_INDEX.get(key);
}

export function isValidFacilityKey(key: string): boolean {
  return KEY_INDEX.has(key);
}
