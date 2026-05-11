/**
 * Server-driven icon name → Lucide React component.
 *
 * Server stores icon hints as strings in two casings:
 *   - lowercase ("coffee", "heart")  ← purposes.icon
 *   - PascalCase ("Wifi", "SquareParking")  ← features.icon (facility-catalog.ts)
 *
 * We normalize to lowercase and strip dashes so both forms resolve. Unknown
 * names fall back to <Star> so the chip never renders blank.
 */
import type { LucideProps, LucideIcon as LucideIconType } from 'lucide-react';
import {
  Coffee, Heart, Users, BookOpen, Laptop, Briefcase, Lightbulb, BookMarked,
  Book, PartyPopper, Zap, Camera, Star, Wifi, Building2, SquareParking,
  Trees, Armchair, VolumeX, Lamp, Volume2, Maximize2, Table2, Presentation,
  CalendarCheck, Wind, Baby, Banknote, CreditCard, QrCode, Smartphone,
  Wallet, ThumbsUp, X, ChevronLeft, Video, Bookmark, Share2, Navigation,
  Phone, MapPin, Flame, Smile, Frown, Meh, Plus, MessageSquare,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIconType> = {
  // Purposes (lowercase from server)
  coffee: Coffee,
  heart: Heart,
  users: Users,
  bookopen: BookOpen,
  laptop: Laptop,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  coffeecup: Coffee,
  book: Book,
  bookmark: BookMarked,
  party: PartyPopper,
  partypopper: PartyPopper,
  zap: Zap,
  camera: Camera,

  // Facilities (PascalCase from server, lowercased here)
  wifi: Wifi,
  building2: Building2,
  squareparking: SquareParking,
  trees: Trees,
  armchair: Armchair,
  volumex: VolumeX,
  lamp: Lamp,
  volume2: Volume2,
  maximize2: Maximize2,
  table2: Table2,
  presentationicon: Presentation,
  presentation: Presentation,
  calendarcheck: CalendarCheck,
  wind: Wind,
  baby: Baby,
  banknote: Banknote,
  creditcard: CreditCard,
  qrcode: QrCode,
  smartphone: Smartphone,
  wallet: Wallet,

  // Action icons
  thumbsup: ThumbsUp,
  x: X,
  chevronleft: ChevronLeft,
  video: Video,
  star: Star,
  share2: Share2,
  navigation: Navigation,
  phone: Phone,
  mappin: MapPin,
  flame: Flame,
  smile: Smile,
  frown: Frown,
  meh: Meh,
  plus: Plus,
  messagesquare: MessageSquare,
};

function normalize(name?: string | null): string {
  return (name ?? '').toLowerCase().replace(/[-_\s]/g, '');
}

/** Facility key (cafe_features.name slug) → lucide icon name. Mirrors the
 *  server-side hints in `server/src/cafes/facility-catalog.ts` so the chip in
 *  WriteReviewModal/MobileFilterModal stays visually consistent across the app
 *  even though the server's GET /cafes/filters response doesn't ship icons. */
const FACILITY_TO_LUCIDE: Record<string, string> = {
  wifi: 'wifi', strong_wifi: 'wifi',
  power_outlet: 'zap', power_outlets: 'zap',
  mushola: 'building2',
  parking: 'squareparking',
  kid_friendly: 'baby', family_friendly: 'baby',
  quiet_atmosphere: 'volumex',
  noise_tolerant: 'volume2',
  large_tables: 'table2',
  outdoor_area: 'trees', outdoor_seating: 'trees',
  cozy_seating: 'armchair',
  ambient_lighting: 'lamp',
  intimate_seating: 'heart',
  spacious: 'maximize2',
  whiteboard: 'presentation',
  bookable_space: 'calendarcheck',
  smoking_area: 'wind',
  payment_cash: 'banknote',
  payment_debit: 'creditcard',
  payment_credit: 'creditcard',
  payment_qris: 'qrcode',
  payment_nfc: 'smartphone',
  payment_ewallet: 'wallet',
};

export function lucideForFacility(key: string): string | undefined {
  return FACILITY_TO_LUCIDE[key];
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

/** Direct re-exports for sites that want the named import ergonomics. */
export {
  X, ChevronLeft, Camera, Video, Star, ThumbsUp, Bookmark, Heart, Share2,
  Navigation, Phone, MapPin, Flame, Smile, Frown, Meh, Plus, MessageSquare,
};
