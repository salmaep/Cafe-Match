import type { LucideIcon } from "lucide-react";
import { getPurposeBySlug } from "../constants/purposes";
import {
  Armchair,
  Calendar,
  Clock,
  Coffee,
  Compass,
  Crown,
  Flame,
  Gem,
  Map,
  MessageCircle,
  Moon,
  PartyPopper,
  Sparkles,
  Sunrise,
  Trophy,
  Users,
} from "./lucideIcon";

/**
 * Visual identity per achievement — the achievements screen shouldn't be a
 * wall of identical trophies. purpose_slug doubles as a metric key on the
 * server (table_host, explorer_cafes, time_morning, …), so both metric keys
 * and real purpose slugs are handled here.
 */

const METRIC_ICONS: Record<string, LucideIcon> = {
  table_host: Armchair,
  table_join: Users,
  table_squad: PartyPopper,
  explorer_cafes: Compass,
  explorer_district: Map,
  time_morning: Sunrise,
  time_night: Moon,
  time_weekend: Calendar,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  points: Gem,
  visit_general: Coffee,
  visit_purpose: Sparkles,
  streak: Flame,
  social: Users,
  special: Crown,
  table: Armchair,
  explorer: Compass,
  time: Clock,
};

export function iconForAchievement(a: {
  category: string;
  purposeSlug?: string | null;
  slug: string;
}): LucideIcon {
  if (a.purposeSlug && METRIC_ICONS[a.purposeSlug]) {
    return METRIC_ICONS[a.purposeSlug];
  }
  if (a.category === "social") {
    return a.slug.includes("review") ? MessageCircle : Users;
  }
  return CATEGORY_ICONS[a.category] ?? Trophy;
}

/** Human label for the metric/purpose chip (fixes raw "table_host" chips). */
const METRIC_LABELS: Record<string, string> = {
  table_host: "Hosting",
  table_join: "Joining",
  table_squad: "Squad",
  explorer_cafes: "Unique Cafes",
  explorer_district: "Districts",
  time_morning: "Morning",
  time_night: "Night",
  time_weekend: "Weekend",
};

export function metricLabel(
  purposeSlug: string | null | undefined,
): string | null {
  if (!purposeSlug) return null;
  return (
    METRIC_LABELS[purposeSlug] ??
    getPurposeBySlug(purposeSlug)?.label ??
    purposeSlug
  );
}
