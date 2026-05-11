/**
 * Server-driven icon name → Lucide React Native component.
 *
 * Mirrors `client/src/utils/lucideIcon.tsx` (web) so both clients resolve
 * feature labels the same way. Both sides of the lookup are normalized
 * (lowercase, strip spaces/dashes/underscores).
 *
 * Resolution order in `lucideForFacility(key, category?)`:
 *   1. explicit FACILITY_TO_LUCIDE entry (e.g. "Parkir Gratis" → squareparking)
 *   2. direct lucide alias in ICON_MAP (e.g. raw "Wifi" → wifi)
 *   3. per-category fallback (e.g. unknown space feature → house)
 *   4. undefined — caller can render no icon at all
 *
 * If you add a new feature to the `features` table, add its normalized key
 * here too — otherwise the chip falls back to the category default (or to
 * the LucideIcon `fallback` prop, which defaults to Star).
 */
import React from 'react';
import type { LucideIcon as LucideIconType, LucideProps } from 'lucide-react-native';
import {
  Accessibility, Apple, Armchair, Award, Baby, Backpack, Banknote, Bath, Beef,
  Beer, Bell, Bike, Bone, Book, BookMarked, Bookmark, BookOpen, Briefcase,
  Building2, Cake, CalendarCheck, CalendarClock, Camera, Carrot, ChefHat,
  Cherry, ChevronLeft, Cigarette, CigaretteOff, Citrus, Clock, Coffee, Cookie,
  CreditCard, Crown, CupSoda, Disc, Dog, DoorClosed, Drumstick, Ear, Egg, Fish,
  Flame, Frown, Gamepad2, GlassWater, GraduationCap, HandCoins, Heart, House,
  IceCream, Lamp, Laptop, Layers, Leaf, Lightbulb, MapPin, Martini, Maximize2,
  Meh, MessageSquare, Mic, Mic2, Mountain, Music, Navigation, Palette,
  PartyPopper, PawPrint, Phone, PiggyBank, Pizza, Plane, Plus, Presentation,
  QrCode, Receipt, Salad, Sandwich, Share2, ShoppingBag, ShowerHead, Smartphone,
  Smile, Snowflake, Soup, Sparkles, SquareParking, Sprout, Star, Sun, Table2,
  Theater, ThumbsUp, Ticket, Timer, Toilet, TreePine, Trees, Trophy, Truck,
  User, Users, Utensils, UtensilsCrossed, Vegan, Video, Volume2, VolumeX,
  Wallet, Wifi, Wind, Wine, X, Zap,
} from 'lucide-react-native';

function normalize(name?: string | null): string {
  return (name ?? '').toLowerCase().replace(/[-_\s]/g, '');
}

/** Canonical icon-name keys (normalized) → lucide component. Keys are the
 *  normalized form of either a server purpose icon hint ("coffee"), a feature
 *  `name` label ("parkir gratis"), or a lucide alias the codebase already
 *  uses ("squareparking"). */
const ICON_MAP: Record<string, LucideIconType> = {
  // Purposes (server purposes.icon)
  coffee: Coffee, heart: Heart, users: Users, bookopen: BookOpen, laptop: Laptop,
  briefcase: Briefcase, lightbulb: Lightbulb, coffeecup: Coffee, book: Book,
  bookmark: BookMarked, party: PartyPopper, partypopper: PartyPopper, zap: Zap,
  camera: Camera,

  // Direct lucide aliases
  wifi: Wifi, building2: Building2, squareparking: SquareParking, trees: Trees,
  armchair: Armchair, volumex: VolumeX, lamp: Lamp, volume2: Volume2,
  maximize2: Maximize2, table2: Table2, presentation: Presentation,
  presentationicon: Presentation, calendarcheck: CalendarCheck, wind: Wind,
  baby: Baby, banknote: Banknote, creditcard: CreditCard, qrcode: QrCode,
  smartphone: Smartphone, wallet: Wallet, accessibility: Accessibility,
  ear: Ear, sparkles: Sparkles, piggybank: PiggyBank, music: Music,
  trophy: Trophy, palette: Palette, mic: Mic, mic2: Mic2, house: House,
  mountain: Mountain, treepine: TreePine, disc: Disc, toilet: Toilet,
  bath: Bath, snowflake: Snowflake, wine: Wine, cigaretteoff: CigaretteOff,
  cigarette: Cigarette, clock: Clock, fish: Fish, beer: Beer, martini: Martini,
  dog: Dog, pawprint: PawPrint, gamepad2: Gamepad2, showerhead: ShowerHead,
  utensils: Utensils, utensilscrossed: UtensilsCrossed, bone: Bone,
  glasswater: GlassWater, icecream: IceCream, cookie: Cookie, soup: Soup,
  salad: Salad, sandwich: Sandwich, beef: Beef, drumstick: Drumstick, egg: Egg,
  apple: Apple, chefhat: ChefHat, croissant: Sandwich, wheat: Sandwich,
  carrot: Carrot, cake: Cake, cherry: Cherry, citrus: Citrus, cupsoda: CupSoda,
  truck: Truck, bike: Bike, bell: Bell, shoppingbag: ShoppingBag, leaf: Leaf,
  sprout: Sprout, vegan: Vegan, pizza: Pizza, graduationcap: GraduationCap,
  plane: Plane, crown: Crown, ticket: Ticket, layers: Layers,
  doorclosed: DoorClosed, sun: Sun, theater: Theater, calendarclock: CalendarClock,
  timer: Timer, receipt: Receipt, user: User, award: Award, handcoins: HandCoins,
  backpack: Backpack,

  // Action icons
  thumbsup: ThumbsUp, x: X, chevronleft: ChevronLeft, video: Video, star: Star,
  share2: Share2, navigation: Navigation, phone: Phone, mappin: MapPin,
  flame: Flame, smile: Smile, frown: Frown, meh: Meh, plus: Plus,
  messagesquare: MessageSquare,
};

/** Feature label / facility key → icon-name (key in ICON_MAP). Covers every
 *  row in the `features` table — accessibility, ambience, amenity, audience,
 *  payment, service, space — plus legacy snake_case keys from old seed data. */
const FACILITY_TO_LUCIDE: Record<string, string> = {
  // Legacy snake_case (kept for old wizard/seed flows)
  ambientlighting: 'lamp',
  bookablespace: 'calendarcheck',
  cozyseating: 'armchair',
  intimateseating: 'heart',
  kidfriendly: 'baby', familyfriendly: 'users',
  largetables: 'table2',
  noisetolerant: 'volume2',
  outdoorseating: 'trees', outdoorarea: 'trees',
  paymentewallet: 'wallet', paymentqris: 'qrcode',
  paymentcash: 'banknote', paymentdebit: 'creditcard', paymentcredit: 'creditcard',
  paymentnfc: 'smartphone',
  poweroutlets: 'zap', poweroutlet: 'zap',
  quietatmosphere: 'volumex',
  strongwifi: 'wifi',
  smokingarea: 'cigarette',
  biasanyamenunggu: 'clock',

  // Accessibility
  hearingloop: 'ear',
  wheelchairentrance: 'accessibility',
  wheelchairparking: 'accessibility',
  wheelchairrestroom: 'accessibility',
  wheelchairseating: 'accessibility',

  // Ambience (Suasana)
  aesthetic: 'palette',
  affordable: 'piggybank',
  casual: 'smile',
  clean: 'sparkles',
  cozy: 'armchair',
  homey: 'house',
  livemusic: 'music',
  liveperformance: 'mic',
  mexicantheme: 'utensilscrossed',
  pemandanganbagus: 'mountain',
  photogenic: 'camera',
  quiet: 'volumex',
  romantic: 'heart',
  rustic: 'treepine',
  sports: 'trophy',
  trendy: 'sparkles',
  vintage: 'disc',
  spacious: 'maximize2',

  // Amenity (Fasilitas)
  ac: 'snowflake',
  alkohol: 'wine',
  aquascape: 'fish',
  bar: 'wine',
  beer: 'beer',
  cocktail: 'martini',
  dogfriendlyoutdoor: 'dog',
  fireplace: 'flame',
  genderneutralrestroom: 'bath',
  karaoke: 'mic',
  karaokeroom: 'mic2',
  kopi: 'coffee',
  kursitinggi: 'baby',
  mushola: 'building2',
  nonsmokingarea: 'cigaretteoff',
  open24hours: 'clock',
  outdoor: 'trees',
  parking: 'squareparking',
  parkirberbayar: 'squareparking',
  parkirdilokasi: 'squareparking',
  parkirgratis: 'squareparking',
  parkirluas: 'squareparking',
  parkirterbatas: 'squareparking',
  petfriendly: 'pawprint',
  photobooth: 'camera',
  playground: 'gamepad2',
  seating: 'armchair',
  shower: 'showerhead',
  toilet: 'toilet',
  valetparking: 'squareparking',
  wifiberbayar: 'wifi',
  whiteboard: 'presentation',

  // Audience (Cocok Untuk)
  groupfriendly: 'users',
  kidbirthdayparty: 'cake',
  solofriendly: 'user',
  studentfriendly: 'graduationcap',
  touristfriendly: 'plane',
  wfc: 'laptop',
  womenowned: 'crown',

  // Payment
  cash: 'banknote',
  cashonly: 'banknote',
  creditcard: 'creditcard',
  debitcard: 'creditcard',
  kuponmakanan: 'ticket',
  nfc: 'smartphone',
  qris: 'qrcode',

  // Service (food + service types)
  ambilditoko: 'shoppingbag',
  ayambakar: 'drumstick',
  ayamgeprek: 'drumstick',
  bakery: 'croissant',
  bakmie: 'soup',
  bakso: 'soup',
  bebekgoreng: 'drumstick',
  breakfast: 'egg',
  brunch: 'coffee',
  bubur: 'soup',
  burger: 'sandwich',
  butterbeer: 'beer',
  byappointment: 'calendarclock',
  catering: 'chefhat',
  cimol: 'utensils',
  coffeeeducation: 'graduationcap',
  contactlessdelivery: 'truck',
  croffle: 'croissant',
  dessert: 'icecream',
  dimsum: 'chefhat',
  drivethrough: 'truck',
  durian: 'apple',
  fastservice: 'timer',
  freerefill: 'cupsoda',
  freshjuice: 'citrus',
  friedchicken: 'drumstick',
  friendlystaff: 'smile',
  halal: 'sparkles',
  happyhourdrinks: 'wine',
  happyhourfood: 'utensilscrossed',
  inhouseroasting: 'chefhat',
  kebab: 'sandwich',
  kopinusantara: 'coffee',
  koreanfood: 'utensilscrossed',
  koreanstreetfood: 'utensilscrossed',
  latenightfood: 'clock',
  lomie: 'soup',
  makanditempat: 'utensilscrossed',
  manualbrew: 'coffee',
  martabak: 'pizza',
  masakansunda: 'utensilscrossed',
  matcha: 'leaf',
  menuanak: 'baby',
  menuorganik: 'leaf',
  mexicanfood: 'utensilscrossed',
  mie: 'soup',
  nasirefill: 'cupsoda',
  orderatcounter: 'receipt',
  orderattable: 'utensilscrossed',
  pesanantar: 'truck',
  pho: 'soup',
  porsibesar: 'utensils',
  quickserve: 'timer',
  ramen: 'soup',
  reservasi: 'calendarcheck',
  reservasibrunch: 'calendarcheck',
  reservasimakanmalam: 'calendarcheck',
  reservasimakansiang: 'calendarcheck',
  roastedchicken: 'drumstick',
  sandwich: 'sandwich',
  satemaranggi: 'utensilscrossed',
  seafood: 'fish',
  snack: 'cookie',
  sourdough: 'croissant',
  spicylevel: 'flame',
  steak: 'beef',
  tahugejrot: 'utensils',
  tahugoreng: 'utensils',
  takeaway: 'shoppingbag',
  teaselection: 'cupsoda',
  turkishcoffee: 'coffee',
  veganoptions: 'vegan',
  vegetarianoptions: 'sprout',

  // Space (Ruang)
  multilevel: 'layers',
  privateroom: 'doorclosed',
  rooftop: 'sun',
};

/** Per-category fallback for features that have no explicit icon mapping.
 *  Strings match `features.category` values returned by GET /cafes/filters. */
const CATEGORY_FALLBACK: Record<string, string> = {
  accessibility: 'accessibility',
  ambience: 'sparkles',
  amenity: 'star',
  audience: 'users',
  payment: 'creditcard',
  service: 'utensilscrossed',
  space: 'house',
};

/** Resolve a feature label / facility key to a lucide icon name. See file
 *  docstring for the resolution order. */
export function lucideForFacility(
  key: string | null | undefined,
  category?: string | null,
): string | undefined {
  const n = normalize(key);
  if (n) {
    if (FACILITY_TO_LUCIDE[n]) return FACILITY_TO_LUCIDE[n];
    if (ICON_MAP[n]) return n;
  }
  if (category) {
    const c = normalize(category);
    if (CATEGORY_FALLBACK[c]) return CATEGORY_FALLBACK[c];
  }
  return undefined;
}

interface LucideIconProps extends Omit<LucideProps, 'name'> {
  /** Icon hint string from server (e.g. "wifi", "Building2", "book-open"). */
  name?: string | null;
  /** Component used when `name` is missing or unknown. Defaults to Star. */
  fallback?: LucideIconType;
}

export function LucideIcon({ name, fallback = Star, ...rest }: LucideIconProps) {
  const Cmp = ICON_MAP[normalize(name)] ?? fallback;
  return <Cmp {...rest} />;
}

/** Direct re-exports for sites that want named-import ergonomics. */
export {
  X, ChevronLeft, Camera, Video, Star, ThumbsUp, Bookmark, Heart, Share2,
  Navigation, Phone, MapPin, Flame, Smile, Frown, Meh, Plus, MessageSquare,
};
