import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  achievementsApi,
  type AchievementCategory,
  type AchievementTier,
  type UserAchievement,
} from '../api/achievements.api';

// Tier visuals — matches server enum values 1:1.
const TIER_STYLE: Record<AchievementTier, { grad: string; label: string }> = {
  bronze_1:  { grad: 'from-[#B45309] to-[#92400E]', label: 'Bronze I' },
  bronze_2:  { grad: 'from-[#B45309] to-[#7C2D12]', label: 'Bronze II' },
  silver_1:  { grad: 'from-[#9CA3AF] to-[#6B7280]', label: 'Silver I' },
  silver_2:  { grad: 'from-[#9CA3AF] to-[#4B5563]', label: 'Silver II' },
  gold_1:    { grad: 'from-[#FBBF24] to-[#D97706]', label: 'Gold I' },
  gold_2:    { grad: 'from-[#FBBF24] to-[#B45309]', label: 'Gold II' },
  platinum:  { grad: 'from-[#A78BFA] to-[#7C3AED]', label: 'Platinum' },
};

// Category groupings — server returns lowercase enum values.
const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  visit_general: 'Kunjungan Umum',
  visit_purpose: 'Berdasarkan Vibe',
  social: 'Sosial',
  streak: 'Streak',
  special: 'Spesial',
};
const CATEGORY_ORDER: AchievementCategory[] = [
  'visit_general',
  'visit_purpose',
  'streak',
  'social',
  'special',
];

export default function AchievementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // /achievements/me returns the full catalog merged with progress + unlock state.
    achievementsApi
      .mine()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#F0EDE8]">
          <p className="text-[#8A8880] mb-4">Login dulu untuk melihat achievements</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const unlockedCount = items.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#FBBF24] to-[#EA580C] pt-8 pb-12 px-4 text-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">🏆 Achievements</h1>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat value={unlockedCount} label="Unlocked" />
            <Stat value={items.length || '—'} label="Total" />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-[#8A8880]">Belum ada achievement tersedia</div>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              return (
                <section key={cat}>
                  <h2 className="text-xs font-extrabold tracking-[0.15em] uppercase text-[#8A8880] mb-2">
                    {CATEGORY_LABELS[cat]}
                  </h2>
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
  const pct =
    a.threshold > 0 ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
        a.unlocked
          ? 'bg-white border-[#F0EDE8] shadow-sm'
          : 'bg-[#F5F4F0] border-[#E8E4DD] opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            a.unlocked
              ? `bg-gradient-to-br ${tier.grad} text-white shadow`
              : 'bg-[#E8E4DD] text-[#8A8880]'
          }`}
        >
          {a.unlocked ? (
            a.iconUrl ? (
              <img src={a.iconUrl} alt="" className="w-8 h-8 object-contain" />
            ) : (
              '🏆'
            )
          ) : (
            '🔒'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-extrabold ${
                a.unlocked ? 'text-[#1C1C1A]' : 'text-[#8A8880]'
              }`}
            >
              {a.name}
            </h3>
            <span className="text-[10px] font-bold text-[#5C5A52] bg-[#F0EDE8] px-1.5 py-0.5 rounded-full">
              {tier.label}
            </span>
            {a.purposeSlug && (
              <span className="text-[10px] font-bold text-[#B97726] bg-[#FDF6EC] px-1.5 py-0.5 rounded-full">
                {a.purposeSlug}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8A8880] mt-1 line-clamp-2">{a.description}</p>

          {a.unlocked && a.unlockedAt ? (
            <p className="text-[10px] text-green-600 font-bold mt-1">
              ✓ {new Date(a.unlockedAt).toLocaleDateString('id-ID')}
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

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{label}</div>
    </div>
  );
}
