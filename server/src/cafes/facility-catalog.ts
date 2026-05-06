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
        key: 'wifi',
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
      { key: 'toilet', label: 'Toilet', aliases: ['toilet'] },
      {
        key: 'power_outlets',
        label: 'Stop Kontak',
        aliases: ['stopkontak', 'colokan listrik'],
      },
      {
        key: 'air_conditioning',
        label: 'AC',
        aliases: ['ac', 'ber-ac'],
      },
      {
        key: 'outdoor_seating',
        label: 'Outdoor',
        aliases: ['tempat duduk di area terbuka'],
      },
      { key: 'seating', label: 'Tempat Duduk', aliases: ['tempat duduk'] },
      {
        key: 'private_dining',
        label: 'Ruang Privat',
        aliases: ['ruang makan pribadi'],
      },
    ],
  },
  {
    key: 'accessibility',
    label: 'Aksesibilitas',
    items: [
      {
        key: 'wheelchair_access',
        label: 'Akses Kursi Roda',
        aliases: [
          'kursi khusus pengguna kursi roda',
          'pintu masuk khusus pengguna kursi roda',
          'tempat parkir khusus pengguna kursi roda',
        ],
      },
    ],
  },
  {
    key: 'service',
    label: 'Layanan',
    items: [
      {
        key: 'dine_in',
        label: 'Makan di Tempat',
        aliases: ['makan di tempat', 'layanan di tempat'],
      },
      { key: 'takeaway', label: 'Take Away', aliases: ['bawa pulang'] },
      { key: 'delivery', label: 'Pesan Antar', aliases: ['pesan antar'] },
      {
        key: 'contactless_delivery',
        label: 'Antar Tanpa Bertemu',
        aliases: ['antar tanpa bertemu'],
      },
      {
        key: 'reservations',
        label: 'Reservasi',
        aliases: [
          'menerima reservasi',
          'disarankan reservasi dulu untuk sarapan siang',
          'disarankan reservasi dulu untuk makan malam',
        ],
      },
      {
        key: 'table_service',
        label: 'Table Service',
        aliases: ['layanan pesan di meja'],
      },
      { key: 'fast_service', label: 'Cepat Saji', aliases: ['cepat saji'] },
    ],
  },
  {
    key: 'meal',
    label: 'Menu',
    items: [
      { key: 'breakfast', label: 'Sarapan', aliases: ['sarapan'] },
      { key: 'lunch', label: 'Makan Siang', aliases: ['makan siang'] },
      { key: 'dinner', label: 'Makan Malam', aliases: ['makan malam'] },
      { key: 'brunch', label: 'Brunch', aliases: ['brunch'] },
      {
        key: 'dessert',
        label: 'Dessert',
        aliases: ['hidangan penutup', 'makanan pencuci mulut enak'],
      },
      { key: 'coffee', label: 'Kopi', aliases: ['kopi', 'kopi enak'] },
      { key: 'tea', label: 'Teh', aliases: ['pilihan teh enak'] },
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
      {
        key: 'laptop_friendly',
        label: 'WFC (Kerja)',
        aliases: ['cocok untuk bekerja menggunakan laptop'],
      },
      { key: 'solo_friendly', label: 'Solo', aliases: ['makan sendiri'] },
      {
        key: 'group_friendly',
        label: 'Berkelompok',
        aliases: ['berkelompok'],
      },
      {
        key: 'student_friendly',
        label: 'Mahasiswa',
        aliases: ['mahasiswa'],
      },
      {
        key: 'pet_friendly',
        label: 'Ramah Hewan',
        aliases: [
          'anjing boleh dibawa masuk',
          'anjing boleh masuk',
          'area luar boleh dimasuki anjing',
        ],
      },
    ],
  },
  {
    key: 'ambience',
    label: 'Suasana',
    items: [
      { key: 'cozy', label: 'Nyaman', aliases: ['nyaman'] },
      { key: 'quiet', label: 'Tenang', aliases: ['tenang'] },
      { key: 'relaxed', label: 'Santai', aliases: ['santai'] },
      { key: 'trendy', label: 'Trendi', aliases: ['trendi'] },
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
