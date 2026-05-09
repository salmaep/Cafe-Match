/**
 * UI-only static catalog for cafe feature display (label + icon hints).
 *
 * NOTE: This catalog is no longer authoritative for parsing scraper data.
 * Cafe features are stored as raw strings in `cafe_features.name` exactly as
 * supplied by the frontend pre-processor. Frontends may use this catalog as a
 * preset list for filter UI suggestions, icons, and grouping — but data
 * ingestion does NOT consult this file.
 */

export interface FacilityDef {
  /** Canonical key suggested by UI (mirrors typical cafe_features.name slug). */
  key: string;
  label: string;
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
      { key: 'strong_wifi', label: 'WiFi', icon: 'Wifi' },
      { key: 'mushola', label: 'Mushola', icon: 'Building2' },
      { key: 'parking', label: 'Parkir', icon: 'SquareParking' },
      { key: 'power_outlets', label: 'Stop Kontak', icon: 'Zap' },
      { key: 'outdoor_seating', label: 'Outdoor', icon: 'Trees' },
    ],
  },
  {
    key: 'ambience',
    label: 'Suasana',
    items: [
      { key: 'cozy_seating', label: 'Nyaman', icon: 'Armchair' },
      { key: 'quiet_atmosphere', label: 'Tenang', icon: 'VolumeX' },
      { key: 'ambient_lighting', label: 'Pencahayaan Romantis', icon: 'Lamp' },
      { key: 'intimate_seating', label: 'Intim', icon: 'Heart' },
      { key: 'noise_tolerant', label: 'Boleh Berisik', icon: 'Volume2' },
    ],
  },
  {
    key: 'space',
    label: 'Ruang',
    items: [
      { key: 'spacious', label: 'Luas', icon: 'Maximize2' },
      { key: 'large_tables', label: 'Meja Besar', icon: 'Table2' },
      { key: 'whiteboard', label: 'Whiteboard', icon: 'PresentationIcon' },
      { key: 'bookable_space', label: 'Bisa Booking', icon: 'CalendarCheck' },
      { key: 'smoking_area', label: 'Area Merokok', icon: 'Wind' },
    ],
  },
  {
    key: 'audience',
    label: 'Cocok Untuk',
    items: [
      { key: 'kid_friendly', label: 'Ramah Anak', icon: 'Baby' },
    ],
  },
  {
    key: 'payment',
    label: 'Pembayaran',
    items: [
      { key: 'payment_cash', label: 'Tunai', icon: 'Banknote' },
      { key: 'payment_debit', label: 'Kartu Debit', icon: 'CreditCard' },
      { key: 'payment_credit', label: 'Kartu Kredit', icon: 'CreditCard' },
      { key: 'payment_qris', label: 'QRIS', icon: 'QrCode' },
      { key: 'payment_nfc', label: 'NFC', icon: 'Smartphone' },
      { key: 'payment_ewallet', label: 'E-Wallet', icon: 'Wallet' },
    ],
  },
];
