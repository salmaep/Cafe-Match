import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  achievementsApi,
  type Achievement,
  type UserAchievement,
} from '../api/achievements.api';

const RARITY_STYLE: Record<string, string> = {
  common: 'from-[#9CA3AF] to-[#6B7280]',
  rare: 'from-[#60A5FA] to-[#2563EB]',
  epic: 'from-[#A78BFA] to-[#7C3AED]',
  legendary: 'from-[#FBBF24] to-[#EA580C]',
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [all, setAll] = useState<Achievement[]>([]);
  const [mine, setMine] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([achievementsApi.all(), achievementsApi.mine()])
      .then(([a, m]) => {
        setAll(a.data ?? []);
        setMine(m.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

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

  const unlockedIds = new Set(mine.map((m) => m.achievementId));
  const totalPoints = mine.reduce((s, m) => s + (m.achievement?.points ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#FBBF24] to-[#EA580C] pt-8 pb-12 px-4 text-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">🏆 Achievements</h1>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat value={mine.length} label="Unlocked" />
            <Stat value={all.length || '—'} label="Total" />
            <Stat value={totalPoints} label="Points" />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : all.length === 0 ? (
          <div className="text-center py-20 text-[#8A8880]">Belum ada achievement tersedia</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {all.map((a) => {
              const unlocked = unlockedIds.has(a.id);
              const userAch = mine.find((m) => m.achievementId === a.id);
              const rarity = (a.rarity ?? 'common').toLowerCase();
              const grad = RARITY_STYLE[rarity] || RARITY_STYLE.common;
              return (
                <div
                  key={a.id}
                  className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
                    unlocked
                      ? 'bg-white border-[#F0EDE8] shadow-sm'
                      : 'bg-[#F5F4F0] border-[#E8E4DD] opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                        unlocked ? `bg-gradient-to-br ${grad} text-white shadow` : 'bg-[#E8E4DD] text-[#8A8880]'
                      }`}
                    >
                      {unlocked ? a.icon || '🏆' : '🔒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-extrabold ${unlocked ? 'text-[#1C1C1A]' : 'text-[#8A8880]'}`}>
                          {a.name}
                        </h3>
                        {a.points != null && (
                          <span className="text-[10px] font-bold text-[#D48B3A]">+{a.points}p</span>
                        )}
                      </div>
                      <p className="text-xs text-[#8A8880] mt-1 line-clamp-2">{a.description}</p>
                      {unlocked && userAch?.unlockedAt && (
                        <p className="text-[10px] text-green-600 font-bold mt-1">
                          ✓ {new Date(userAch.unlockedAt).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
