import { useEffect, useState } from 'react';
import { checkinsApi, type LeaderboardEntry } from '../../api/checkins.api';

interface Props {
  cafeId: number;
}

const RANK_STYLE: Record<number, { bg: string; text: string; emoji: string }> = {
  1: { bg: 'bg-gradient-to-br from-[#FBBF24] to-[#F59E0B]', text: 'text-white', emoji: '👑' },
  2: { bg: 'bg-gradient-to-br from-[#E5E7EB] to-[#9CA3AF]', text: 'text-white', emoji: '🥈' },
  3: { bg: 'bg-gradient-to-br from-[#FCD34D] to-[#B45309]', text: 'text-white', emoji: '🥉' },
};

function formatTotalDuration(minutes?: number): string | null {
  if (!minutes || minutes < 1) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default function CafeLeaderboard({ cafeId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    checkinsApi
      .leaderboard(cafeId)
      .then((res) => setEntries(res.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [cafeId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 bg-[#F0EDE8] rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E0DCD3] rounded-xl px-4 py-6 text-center">
        <span className="text-3xl mb-2 inline-block">🏆</span>
        <p className="text-sm text-[#5C5A52] font-semibold">Belum ada yang check-in</p>
        <p className="text-[12px] text-[#8A8880] mt-1">
          Jadi yang pertama, tunjukkan namamu di leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#F0EDE8] rounded-2xl overflow-hidden">
      {entries.slice(0, 10).map((entry, idx) => {
        const rankStyle = RANK_STYLE[entry.rank];
        const totalDuration = formatTotalDuration(entry.totalDuration);
        return (
          <div
            key={`${entry.userId}-${entry.rank}`}
            className={`flex items-center gap-3 px-4 py-3 ${
              idx > 0 ? 'border-t border-[#F0EDE8]' : ''
            } ${entry.rank <= 3 ? 'bg-gradient-to-r from-[#FFFBF3] to-white' : ''}`}
          >
            {/* Rank badge */}
            <div className="shrink-0">
              {rankStyle ? (
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-extrabold shadow-sm ${rankStyle.bg} ${rankStyle.text}`}
                >
                  {rankStyle.emoji}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center text-sm font-bold text-[#8A8880] tabular-nums">
                  {entry.rank}
                </div>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#1C1C1A] truncate">
                  {entry.name}
                </span>
                {entry.badge && (
                  <span className="shrink-0 text-[10px] font-bold bg-[#FFF1E0] text-[#B45309] rounded-full px-1.5 py-px">
                    {entry.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8A8880]">
                <span className="font-semibold tabular-nums">
                  {entry.checkinCount}× check-in
                </span>
                {totalDuration && (
                  <>
                    <span className="text-[#D9D6CE]">·</span>
                    <span className="tabular-nums">{totalDuration}</span>
                  </>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="shrink-0 text-right">
              <div className="text-base font-extrabold text-[#EA580C] tabular-nums leading-none">
                {entry.score}
              </div>
              <div className="text-[9px] font-bold text-[#8A8880] uppercase tracking-wider mt-0.5">
                pts
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
