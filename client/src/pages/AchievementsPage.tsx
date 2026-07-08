import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  achievementsApi,
  type AchievementCategory,
  type AchievementTier,
  type UserAchievement,
} from "../api/achievements.api";
import { iconForAchievement, metricLabel } from "../utils/achievementIcon";
import {
  Armchair,
  Check,
  Clock,
  Coffee,
  Compass,
  Crown,
  Flame,
  Gem,
  Lock,
  Sparkles,
  Trophy,
  Users,
} from "../utils/lucideIcon";
import type { LucideIcon } from "lucide-react";

// Tier visuals — matches server enum values 1:1.
const TIER_STYLE: Record<AchievementTier, { grad: string; label: string }> = {
  bronze_1: { grad: "from-[#B45309] to-[#92400E]", label: "Bronze I" },
  bronze_2: { grad: "from-[#B45309] to-[#7C2D12]", label: "Bronze II" },
  silver_1: { grad: "from-[#9CA3AF] to-[#6B7280]", label: "Silver I" },
  silver_2: { grad: "from-[#9CA3AF] to-[#4B5563]", label: "Silver II" },
  gold_1: { grad: "from-[#FBBF24] to-[#D97706]", label: "Gold I" },
  gold_2: { grad: "from-[#FBBF24] to-[#B45309]", label: "Gold II" },
  platinum: { grad: "from-[#A78BFA] to-[#7C3AED]", label: "Platinum" },
};

// Category groupings — server returns lowercase enum values.
const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; icon: LucideIcon }
> = {
  points: { label: "Poin", icon: Gem },
  visit_general: { label: "Kunjungan Umum", icon: Coffee },
  table: { label: "Meja Nongkrong", icon: Armchair },
  explorer: { label: "Penjelajah", icon: Compass },
  time: { label: "Waktu Nongkrong", icon: Clock },
  visit_purpose: { label: "Berdasarkan Vibe", icon: Sparkles },
  streak: { label: "Streak", icon: Flame },
  social: { label: "Sosial", icon: Users },
  special: { label: "Spesial", icon: Crown },
};
const CATEGORY_ORDER: AchievementCategory[] = [
  "points",
  "visit_general",
  "table",
  "explorer",
  "time",
  "visit_purpose",
  "streak",
  "social",
  "special",
];

export default function AchievementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserAchievement[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // /achievements/me returns the full catalog merged with progress + unlock state.
    achievementsApi
      .mine()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    achievementsApi
      .points()
      .then((res) => setPoints(res.data.total ?? 0))
      .catch(() => setPoints(null));
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, UserAchievement[]>();
    for (const a of items) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [items]);

  const recentUnlocks = useMemo(
    () =>
      items
        .filter((a) => a.unlocked && a.unlockedAt)
        .sort(
          (a, b) =>
            new Date(b.unlockedAt!).getTime() -
            new Date(a.unlockedAt!).getTime(),
        )
        .slice(0, 6),
    [items],
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#F0EDE8]">
          <p className="text-[#8A8880] mb-4">
            Login dulu untuk melihat achievements
          </p>
          <Link
            to="/login?redirect=%2Fachievements"
            className="inline-block px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const unlockedCount = items.filter((a) => a.unlocked).length;
  const completionPct =
    items.length > 0 ? Math.round((unlockedCount / items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] pt-8 pb-10 px-4 text-white">
        {/* Decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-[#7C2D12]/30 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 ring-2 ring-white/50 backdrop-blur-sm flex items-center justify-center shadow-lg shrink-0">
              <Trophy size={32} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Achievements
              </h1>
              <p className="text-[13px] text-white/85">
                Kumpulkan badge dari check-in, meja nongkrong, dan eksplorasi
                kafe.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat
              icon={Gem}
              value={points ?? "—"}
              label="Poin"
            />
            <Stat
              icon={Trophy}
              value={`${unlockedCount}/${items.length || "—"}`}
              label="Unlocked"
            />
            <Stat icon={Sparkles} value={`${completionPct}%`} label="Selesai" />
          </div>

          {/* Overall completion bar */}
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/90 rounded-full transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-[#8A8880]">
            Belum ada achievement tersedia
          </div>
        ) : (
          <div className="space-y-7">
            {/* Recently unlocked showcase */}
            {recentUnlocks.length > 0 && (
              <section>
                <h2 className="text-xs font-extrabold tracking-[0.15em] uppercase text-[#8A8880] mb-3">
                  Baru Terbuka
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {recentUnlocks.map((a) => {
                    const Icon = iconForAchievement(a);
                    const tier = TIER_STYLE[a.tier] ?? TIER_STYLE.bronze_1;
                    return (
                      <div
                        key={a.id}
                        className="flex flex-col items-center gap-1.5 w-20 shrink-0"
                        title={a.description}
                      >
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-br ${tier.grad} text-white flex items-center justify-center shadow-md ring-2 ring-white`}
                        >
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        <p className="text-[10px] font-bold text-[#1C1C1A] text-center leading-tight line-clamp-2">
                          {a.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              const meta = CATEGORY_META[cat];
              const CatIcon = meta.icon;
              const catUnlocked = list.filter((a) => a.unlocked).length;
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#FDF6EC] border border-[#F2DAB6] text-[#B97726] flex items-center justify-center">
                      <CatIcon size={15} strokeWidth={2.25} />
                    </span>
                    <h2 className="text-xs font-extrabold tracking-[0.15em] uppercase text-[#5C5A52]">
                      {meta.label}
                    </h2>
                    <span className="ml-auto text-[11px] font-bold text-[#8A8880] tabular-nums">
                      {catUnlocked}/{list.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((a) => (
                      <AchievementCard key={a.id} achievement={a} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: UserAchievement }) {
  const tier = TIER_STYLE[a.tier] ?? TIER_STYLE.bronze_1;
  const Icon = iconForAchievement(a);
  const chip = metricLabel(a.purposeSlug);
  const pct =
    a.threshold > 0
      ? Math.min(100, Math.round((a.progress / a.threshold) * 100))
      : 0;
  const isPlatinum = a.tier === "platinum";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
        a.unlocked
          ? "bg-white border-[#F0EDE8] shadow-sm"
          : "bg-[#F5F4F0] border-[#E8E4DD]"
      }`}
    >
      {/* Subtle sparkle watermark on platinum cards */}
      {isPlatinum && a.unlocked && (
        <Sparkles
          size={64}
          strokeWidth={1}
          className="absolute -top-3 -right-3 text-[#A78BFA]/15 pointer-events-none"
        />
      )}

      <div className="flex items-start gap-3">
        {/* Medallion */}
        <div className="relative shrink-0">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              a.unlocked
                ? `bg-gradient-to-br ${tier.grad} text-white shadow ring-2 ring-white`
                : "bg-[#E8E4DD] text-[#B0AB9F]"
            }`}
          >
            {a.iconUrl ? (
              <img src={a.iconUrl} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <Icon size={24} strokeWidth={2} />
            )}
          </div>
          {!a.unlocked && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#8A8880] text-white flex items-center justify-center border-2 border-[#F5F4F0]">
              <Lock size={10} strokeWidth={2.5} />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-extrabold ${
                a.unlocked ? "text-[#1C1C1A]" : "text-[#8A8880]"
              }`}
            >
              {a.name}
            </h3>
            <span className="text-[10px] font-bold text-[#5C5A52] bg-[#F0EDE8] px-1.5 py-0.5 rounded-full">
              {tier.label}
            </span>
            {chip && (
              <span className="text-[10px] font-bold text-[#B97726] bg-[#FDF6EC] px-1.5 py-0.5 rounded-full">
                {chip}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8A8880] mt-1 line-clamp-2">
            {a.description}
          </p>

          {a.unlocked && a.unlockedAt ? (
            <p className="text-[10px] text-green-600 font-bold mt-1 inline-flex items-center gap-1">
              <Check size={11} strokeWidth={2.5} />
              {new Date(a.unlockedAt).toLocaleDateString("id-ID")}
            </p>
          ) : (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#8A8880] mb-1">
                <span>Progress</span>
                <span className="tabular-nums">
                  {a.progress} / {a.threshold}
                </span>
              </div>
              <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tier.grad} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
}) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xl font-extrabold tabular-nums">
        <Icon size={16} strokeWidth={2.25} className="opacity-90" />
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
        {label}
      </div>
    </div>
  );
}
