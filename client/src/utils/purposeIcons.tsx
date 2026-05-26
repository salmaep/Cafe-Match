import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Camera,
  Coffee,
  Flower2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Laptop,
  Leaf,
  Lightbulb,
  MessageCircle,
  Music,
  PartyPopper,
  Sparkles,
  Sun,
  TreePine,
  Users,
  LucideIcon as LucideIconRenderer,
} from "./lucideIcon";

// Each purpose slug maps to a unique lucide icon.
// 12 core wizard purposes + common extra server purposes.
const PURPOSE_ICONS: Record<string, LucideIcon> = {
  "me-time": Flower2,           // zen / relax solo
  "date": HeartHandshake,       // romantic couple
  "family": Users,              // group / family
  "group-work": GraduationCap,  // study group
  "wfc": Laptop,                // work from cafe
  "meeting": Handshake,         // business meeting
  "brainstorm": Lightbulb,      // idea
  "catch-up": MessageCircle,    // chat with old friends
  "reading": BookOpen,          // book
  "quick-coffee": Coffee,       // literal coffee break
  "celebration": PartyPopper,   // party
  "photo-spot": Camera,         // photo
  // Extra server purposes
  "halal-friendly": Leaf,       // clean / natural
  "outdoor": TreePine,          // nature / open air
  "live-music": Music,          // music / performance
  "rooftop": Sun,               // open sky / rooftop
};

export function getPurposeIcon(slug: string | undefined | null): LucideIcon {
  return (slug && PURPOSE_ICONS[slug]) || Sparkles;
}

// Accepts server-provided `icon` (lucide name string) with slug as fallback.
// Pass both so this component is the single source of truth for purpose icons.
export function PurposeIcon({
  slug,
  icon,
  size = 14,
  className,
}: {
  slug?: string | null;
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  if (icon) {
    return (
      <LucideIconRenderer
        name={icon}
        size={size}
        strokeWidth={2}
        className={className}
      />
    );
  }
  const Icon = getPurposeIcon(slug);
  return <Icon size={size} strokeWidth={2} className={className} />;
}
