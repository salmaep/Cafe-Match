/**
 * Facility key → icon emoji + display label.
 * Shared between web (`client/src/utils/facilities.ts`) and mobile
 * (`client-mobile/src/utils/facilities.ts`). Each side keeps its own
 * `buildFacilityChips()` helper because the Cafe shape differs slightly.
 *
 * Keys are stored in *normalized* form: lowercase, with spaces/dashes/
 * underscores stripped (e.g. "Outdoor Seating" / "outdoor_seating" both
 * resolve to `outdoorseating`). `chipFromFacilityKey()` normalizes the
 * caller's input before lookup so display names from the DB ("Wifi",
 * "Parkir Gratis") and legacy snake_case keys both work.
 */

function normalizeFacilityKey(key: string): string {
  return (key ?? '').toLowerCase().replace(/[-_\s]/g, '');
}

export const FACILITY_ICONS: Record<string, string> = {
  // ── Wifi & power ───────────────────────────────────────────────────────────
  wifi: '📶',
  strongwifi: '📶',
  wifiberbayar: '📶',
  poweroutlet: '🔌',
  poweroutlets: '🔌',

  // ── Outdoor / space ────────────────────────────────────────────────────────
  outdoor: '🌿',
  outdoorseating: '🌿',
  outdoorarea: '🌿',
  rooftop: '🌅',
  privateroom: '🚪',
  multilevel: '🏢',
  spacious: '🏛️',

  // ── Ambience ───────────────────────────────────────────────────────────────
  quiet: '🤫',
  quietatmosphere: '🤫',
  cozy: '🛋️',
  cozyseating: '🛋️',
  ambientlighting: '💡',
  intimateseating: '💕',
  noisetolerant: '🔊',
  romantic: '💕',
  aesthetic: '✨',
  photogenic: '📸',
  vintage: '🎞️',
  rustic: '🌳',
  trendy: '✨',
  homey: '🏠',
  clean: '✨',
  casual: '😊',
  ac: '❄️',
  fireplace: '🔥',
  livemusic: '🎵',
  liveperformance: '🎤',
  karaoke: '🎤',
  karaokeroom: '🎤',
  pemandanganbagus: '🏞️',

  // ── Audience ───────────────────────────────────────────────────────────────
  kidfriendly: '👶',
  familyfriendly: '👨‍👩‍👧',
  petfriendly: '🐾',
  dogfriendlyoutdoor: '🐕',
  groupfriendly: '👥',
  solofriendly: '🧘',
  studentfriendly: '🎓',
  touristfriendly: '✈️',
  wfc: '💻',
  womenowned: '👑',

  // ── Work / meeting ─────────────────────────────────────────────────────────
  largetables: '🪑',
  whiteboard: '📋',
  bookablespace: '📅',
  reservasi: '📅',
  byappointment: '📅',

  // ── Parking ────────────────────────────────────────────────────────────────
  parking: '🅿️',
  parkirgratis: '🅿️',
  parkirberbayar: '🅿️',
  parkirluas: '🅿️',
  parkirterbatas: '🅿️',
  parkirdilokasi: '🅿️',
  valetparking: '🅿️',

  // ── Religion / accessibility ───────────────────────────────────────────────
  mushola: '🕌',
  accessibility: '♿',
  wheelchairentrance: '♿',
  wheelchairparking: '♿',
  wheelchairrestroom: '♿',
  wheelchairseating: '♿',
  hearingloop: '👂',
  genderneutralrestroom: '🚻',
  toilet: '🚻',
  shower: '🚿',

  // ── Payment ────────────────────────────────────────────────────────────────
  paymentcash: '💵',
  paymentdebit: '💳',
  paymentcredit: '💳',
  paymentqris: '🇮🇩',
  paymentnfc: '📱',
  paymentewallet: '📲',
  cash: '💵',
  cashonly: '💵',
  creditcard: '💳',
  debitcard: '💳',
  qris: '🇮🇩',
  nfc: '📱',
  kuponmakanan: '🎟️',

  // ── Smoking ────────────────────────────────────────────────────────────────
  smokingarea: '🚬',
  nonsmokingarea: '🚭',

  // ── Service / food markers ─────────────────────────────────────────────────
  takeaway: '🛍️',
  ambilditoko: '🛍️',
  drivethrough: '🚗',
  contactlessdelivery: '🚚',
  pesanantar: '🚚',
  orderatcounter: '🧾',
  ordeatcounter: '🧾',
  orderattable: '🍽️',
  makanditempat: '🍽️',
  reservasibrunch: '📅',
  reservasimakanmalam: '📅',
  reservasimakansiang: '📅',
  fastservice: '⏱️',
  quickserve: '⏱️',
  latenightfood: '🌙',
  open24hours: '🕐',
  catering: '👨‍🍳',
  freerefill: '🥤',
  nasirefill: '🍚',
  porsibesar: '🍽️',
  spicylevel: '🌶️',
  friendlystaff: '🙂',
  inhouseroasting: '👨‍🍳',
  coffeeeducation: '🎓',
  halal: '☪️',

  // ── Drinks ─────────────────────────────────────────────────────────────────
  bar: '🍷',
  beer: '🍺',
  wine: '🍷',
  cocktail: '🍸',
  alkohol: '🍷',
  butterbeer: '🍺',
  happyhourdrinks: '🍷',
  freshjuice: '🍊',
  matcha: '🍵',
  teaselection: '🫖',
  coffee: '☕',
  kopi: '☕',
  brunch: '🥐',
  breakfast: '🍳',
  manualbrew: '☕',
  kopinusantara: '☕',
  turkishcoffee: '☕',

  // ── Food types ─────────────────────────────────────────────────────────────
  ayambakar: '🍗',
  ayamgeprek: '🍗',
  bakery: '🥐',
  bakmie: '🍜',
  bakso: '🍜',
  bebekgoreng: '🦆',
  bubur: '🍲',
  burger: '🍔',
  cimol: '🍢',
  croffle: '🥐',
  dessert: '🍰',
  dimsum: '🥟',
  durian: '🌰',
  friedchicken: '🍗',
  happyhourfood: '🍽️',
  kebab: '🌯',
  koreanfood: '🍱',
  koreanstreetfood: '🍢',
  lomie: '🍜',
  martabak: '🥞',
  masakansunda: '🍛',
  menuanak: '🧒',
  menuorganik: '🥗',
  mexicanfood: '🌮',
  mexicantheme: '🌮',
  mie: '🍜',
  pho: '🍜',
  pizza: '🍕',
  ramen: '🍜',
  roastedchicken: '🍗',
  sandwich: '🥪',
  satemaranggi: '🍢',
  seafood: '🐟',
  snack: '🍪',
  sourdough: '🥖',
  steak: '🥩',
  tahugejrot: '🍢',
  tahugoreng: '🍢',
  veganoptions: '🌱',
  vegetarianoptions: '🥬',

  // ── Extras ─────────────────────────────────────────────────────────────────
  aquascape: '🐠',
  photobooth: '📸',
  playground: '🎮',
  seating: '🪑',
  biasanyamenunggu: '⏰',
};

export const FACILITY_LABELS: Record<string, string> = {
  // Keep the most-shown ones with friendly labels; rest use the auto
  // titleization from the key. Both keys and lookups are normalized.
  strongwifi: 'Strong WiFi',
  wifi: 'WiFi',
  wifiberbayar: 'WiFi Berbayar',
  poweroutlets: 'Power Outlets',
  poweroutlet: 'Power Outlet',
  mushola: 'Mushola',
  parking: 'Parkir',
  parkirgratis: 'Parkir Gratis',
  parkirberbayar: 'Parkir Berbayar',
  parkirluas: 'Parkir Luas',
  parkirterbatas: 'Parkir Terbatas',
  parkirdilokasi: 'Parkir di Lokasi',
  valetparking: 'Valet Parking',
  kidfriendly: 'Kid Friendly',
  familyfriendly: 'Family Friendly',
  petfriendly: 'Pet Friendly',
  groupfriendly: 'Group Friendly',
  solofriendly: 'Solo Friendly',
  studentfriendly: 'Student Friendly',
  touristfriendly: 'Tourist Friendly',
  quietatmosphere: 'Tenang',
  cozyseating: 'Cozy',
  ambientlighting: 'Ambient Lighting',
  intimateseating: 'Intimate',
  spacious: 'Spacious',
  noisetolerant: 'Noise Tolerant',
  largetables: 'Large Tables',
  whiteboard: 'Whiteboard',
  bookablespace: 'Bookable',
  outdoor: 'Outdoor',
  outdoorarea: 'Outdoor',
  outdoorseating: 'Outdoor',
  rooftop: 'Rooftop',
  privateroom: 'Private Room',
  multilevel: 'Multi-Level',
  smokingarea: 'Smoking Area',
  nonsmokingarea: 'No Smoking',
  paymentcash: 'Cash',
  paymentdebit: 'Debit',
  paymentcredit: 'Credit Card',
  paymentqris: 'QRIS',
  paymentnfc: 'NFC',
  paymentewallet: 'E-Wallet',
  cashonly: 'Cash Only',
  creditcard: 'Credit Card',
  debitcard: 'Debit Card',
  ac: 'AC',
  livemusic: 'Live Music',
  liveperformance: 'Live Performance',
  open24hours: '24 Jam',
  fastservice: 'Fast Service',
  takeaway: 'Take Away',
  drivethrough: 'Drive Through',
  freerefill: 'Free Refill',
  halal: 'Halal',
  veganoptions: 'Vegan',
  vegetarianoptions: 'Vegetarian',
};

export interface FacilityChip {
  key: string;
  icon: string;
  label: string;
}

/** Convert a raw key (snake_case, display label, or anything) into a chip
 *  with an icon and pretty label. Both the icon and label tables are keyed
 *  by the normalized form so callers can pass anything sensible. */
export function chipFromFacilityKey(key: string): FacilityChip {
  const n = normalizeFacilityKey(key);
  const icon = FACILITY_ICONS[n] || '✨';
  const label =
    FACILITY_LABELS[n] ||
    // If the input already has spaces/title case (display name from DB),
    // use it as-is. Otherwise turn snake_case into space-separated.
    (/\s/.test(key) ? key : key.replace(/_/g, ' '));
  return { key, icon, label };
}
