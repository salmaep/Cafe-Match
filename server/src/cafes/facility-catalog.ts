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
      {
        key: 'strong_wifi',
        label: 'WiFi',
        aliases: ['wifi', 'wi-fi', 'wi-fi gratis'],
        derivesFlag: 'wifiAvailable',
      },
      {
        key: 'mushola',
        label: 'Mushola',
        aliases: ['mushola', 'ruang sholat', 'tempat sholat'],
        derivesFlag: 'hasMushola',
      },
      {
        key: 'parking',
        label: 'Parkir',
        aliases: [
          'banyak tempat parkir',
          'tempat parkir gratis',
          'tempat parkir berbayar',
          'parkir di jalan berbayar',
          'tempat parkir',
        ],
        derivesFlag: 'hasParking',
      },
      {
        key: 'power_outlets',
        label: 'Stop Kontak',
        aliases: ['stopkontak', 'colokan listrik'],
      },
      {
        key: 'outdoor_seating',
        label: 'Outdoor',
        aliases: ['tempat duduk di area terbuka'],
      },
    ],
  },
  {
    key: 'ambience',
    label: 'Suasana',
    items: [
      { key: 'cozy_seating', label: 'Nyaman', aliases: ['nyaman'] },
      { key: 'quiet_atmosphere', label: 'Tenang', aliases: ['tenang'] },
      {
        key: 'ambient_lighting',
        label: 'Pencahayaan Romantis',
        aliases: [],
      },
      { key: 'intimate_seating', label: 'Intim', aliases: [] },
      { key: 'noise_tolerant', label: 'Boleh Berisik', aliases: [] },
    ],
  },
  {
    key: 'space',
    label: 'Ruang',
    items: [
      { key: 'spacious', label: 'Luas', aliases: [] },
      { key: 'large_tables', label: 'Meja Besar', aliases: [] },
      { key: 'whiteboard', label: 'Whiteboard', aliases: [] },
      { key: 'bookable_space', label: 'Bisa Booking', aliases: [] },
      { key: 'smoking_area', label: 'Area Merokok', aliases: [] },
    ],
  },
  {
    key: 'audience',
    label: 'Cocok Untuk',
    items: [
      {
        key: 'kid_friendly',
        label: 'Ramah Anak',
        aliases: ['cocok untuk anak-anak', 'kursi tinggi', 'menu anak'],
      },
    ],
  },
  {
    key: 'payment',
    label: 'Pembayaran',
    items: [
      { key: 'payment_cash', label: 'Tunai', aliases: [] },
      { key: 'payment_debit', label: 'Kartu Debit', aliases: [] },
      { key: 'payment_credit', label: 'Kartu Kredit', aliases: [] },
      { key: 'payment_qris', label: 'QRIS', aliases: [] },
      { key: 'payment_nfc', label: 'NFC', aliases: [] },
      { key: 'payment_ewallet', label: 'E-Wallet', aliases: [] },
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
