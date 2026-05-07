import { useEffect, useState } from 'react';
import {
  checkinsApi,
  type GlobalLeaderboardEntry,
  type LeaderboardPeriod,
} from '../api/checkins.api';
import Seo from '../components/seo/Seo';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    checkinsApi
      .globalLeaderboard(period)
      .then((res) => setEntries(res.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <Seo
        title="Leaderboard"
        description="Top check-in di seluruh cafe — siapa juaranya minggu ini?"
      />

      {/* Hero — full width on mobile, card on desktop (consistent with Trending) */}
      <div className="lg:max-w-5xl lg:mx-auto lg:px-8 lg:pt-5">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#FFF1E0] via-[#FFFBF3] to-[#FFF8EC] border-b border-amber-100 lg:border-0 lg:rounded-2xl lg:ring-1 lg:ring-amber-200/60 lg:shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -left-12 w-60 h-60 rounded-full bg-amber-200/50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-orange-200/40 blur-3xl"
          />

          <div className="relative px-5 sm:px-7 lg:px-8 py-6 sm:py-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-amber-200 text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#B45309] mb-2.5 shadow-sm">
              <span>🏆</span> Leaderboard
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1C1A] tracking-tight leading-tight">
              Siapa{' '}
              <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
                paling rajin
              </span>{' '}
              ngafe?
            </h1>
            <p className="text-sm sm:text-[15px] text-[#5C5A52] mt-2 max-w-xl">
              Ranking pengguna berdasarkan jumlah check-in, cafe yang dikunjungi, dan
              total waktu nongkrong.
            </p>

            {/* Period toggle */}
            <div className="mt-5 inline-flex items-center gap-1 bg-white rounded-full p-1 ring-1 ring-amber-200 shadow-sm">
              <PeriodPill
                active={period === 'month'}
                onClick={() => setPeriod('month')}
                label="📅 30 Hari"
              />
              <PeriodPill
                active={period === 'all'}
                onClick={() => setPeriod('all')}
                label="🌟 All-time"
              />
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading && entries === null ? (
          <SkeletonGrid />
        ) : entries && entries.length === 0 ? (
          <EmptyState period={period} />
        ) : (
          <>
            {/* Podium — top 3 */}
            {top3.length > 0 && <Podium entries={top3} />}

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-extrabold text-[#1C1C1A] uppercase tracking-[0.12em] mb-3 px-1">
                  Peringkat 4 – {entries?.length}
                </h2>
                <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
                  {rest.map((e, i) => (
                    <ListRow key={e.userId} entry={e} isLast={i === rest.length - 1} />
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-[#A8A59C] mt-8">
              Score = (check-in × 2) + (cafe unik × 5) + (jam nongkrong × 1)
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function PeriodPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
        active
          ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-sm'
          : 'text-[#5C5A52] hover:text-[#1C1C1A] hover:bg-[#FFF8EC]'
      }`}
    >
      {label}
    </button>
  );
}

function Podium({ entries }: { entries: GlobalLeaderboardEntry[] }) {
  // Reorder for visual podium: 2nd, 1st, 3rd (1st in middle, taller)
  const [first, second, third] = [entries[0], entries[1], entries[2]];
  return (
    <div className="grid grid-cols-3 gap-3 items-end mt-2">
      {second && <PodiumStep entry={second} height="h-40 sm:h-48" />}
      {first && <PodiumStep entry={first} height="h-52 sm:h-60" isWinner />}
      {third && <PodiumStep entry={third} height="h-36 sm:h-44" />}
    </div>
  );
}

const STEP_STYLES: Record<number, { gradient: string; emoji: string }> = {
  1: { gradient: 'from-[#FBBF24] via-[#F59E0B] to-[#EA580C]', emoji: '👑' },
  2: { gradient: 'from-[#E5E7EB] via-[#9CA3AF] to-[#6B7280]', emoji: '🥈' },
  3: { gradient: 'from-[#FCD34D] via-[#D97706] to-[#B45309]', emoji: '🥉' },
};

function PodiumStep({
  entry,
  height,
  isWinner,
}: {
  entry: GlobalLeaderboardEntry;
  height: string;
  isWinner?: boolean;
}) {
  const style = STEP_STYLES[entry.rank] || STEP_STYLES[3];
  const initials = entry.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col items-center">
      {/* Avatar above the step */}
      <div className="relative mb-2">
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white text-xl sm:text-2xl font-extrabold shadow-lg ring-4 ring-white`}
        >
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={entry.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="absolute -top-2 -right-2 text-2xl sm:text-3xl">
          {style.emoji}
        </div>
      </div>

      {/* Step pedestal */}
      <div
        className={`relative w-full ${height} rounded-t-2xl bg-gradient-to-br ${style.gradient} shadow-lg flex flex-col items-center justify-start pt-3 px-2`}
      >
        <div className="text-white text-3xl sm:text-4xl font-black tabular-nums leading-none drop-shadow-md">
          {entry.rank}
        </div>
        <div className="mt-2 text-white text-center w-full">
          <div className="text-xs sm:text-sm font-extrabold truncate px-1">
            {entry.name}
          </div>
          {entry.badge && (
            <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold tracking-wider">
              {entry.badge}
            </div>
          )}
        </div>

        {/* Stats at bottom of pedestal */}
        <div className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-0.5 text-white">
          <div className="text-base sm:text-lg font-black tabular-nums leading-none">
            {Math.round(entry.score)}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider opacity-80">
            pts
          </div>
        </div>

        {isWinner && (
          <div className="absolute -top-1 inset-x-2 h-1 rounded-full bg-yellow-200/70 shadow-sm" />
        )}
      </div>
    </div>
  );
}

function ListRow({
  entry,
  isLast,
}: {
  entry: GlobalLeaderboardEntry;
  isLast: boolean;
}) {
  const initials = entry.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        isLast ? '' : 'border-b border-[#F0EDE8]'
      } hover:bg-[#FAF9F6] transition-colors`}
    >
      {/* Rank */}
      <div className="shrink-0 w-9 text-center">
        <span className="text-base font-extrabold text-[#8A8880] tabular-nums">
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#D48B3A] to-[#B45309] flex items-center justify-center text-white text-sm font-bold shadow-sm overflow-hidden">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-[#1C1C1A] truncate">
            {entry.name}
          </span>
          {entry.badge && (
            <span className="shrink-0 text-[9px] font-bold bg-[#FFF1E0] text-[#B45309] rounded-full px-1.5 py-px">
              {entry.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8A8880]">
          <span className="font-semibold tabular-nums">
            ☕ {entry.totalCheckins}
          </span>
          <span className="text-[#D9D6CE]">·</span>
          <span className="font-semibold tabular-nums">
            📍 {entry.uniqueCafes} cafe
          </span>
          <span className="text-[#D9D6CE]">·</span>
          <span className="tabular-nums">{entry.totalDuration}</span>
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <div className="text-base font-extrabold text-[#EA580C] tabular-nums leading-none">
          {Math.round(entry.score)}
        </div>
        <div className="text-[9px] font-bold text-[#8A8880] uppercase tracking-wider mt-0.5">
          pts
        </div>
      </div>
    </div>
  );
}

function EmptyState({ period }: { period: LeaderboardPeriod }) {
  return (
    <div className="text-center py-16 bg-white border border-dashed border-[#E0DCD3] rounded-2xl">
      <span className="text-5xl mb-3 inline-block">🏆</span>
      <h2 className="text-lg font-extrabold text-[#1C1C1A]">
        Belum ada yang masuk leaderboard
      </h2>
      <p className="text-sm text-[#8A8880] mt-2">
        {period === 'month'
          ? 'Belum ada check-in dalam 30 hari terakhir. Yuk mulai!'
          : 'Belum ada check-in sama sekali. Jadi yang pertama!'}
      </p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 items-end">
        {[40, 52, 36].map((h, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F0EDE8] animate-pulse mb-2" />
            <div className={`w-full h-${h} rounded-t-2xl bg-[#F0EDE8] animate-pulse`} style={{ height: `${h * 4}px` }} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#F0EDE8] mt-6 overflow-hidden">
        {[0, 1, 2, 3].map((k) => (
          <div
            key={k}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0EDE8] last:border-0"
          >
            <div className="w-9 h-3 rounded bg-[#F0EDE8] animate-pulse" />
            <div className="w-11 h-11 rounded-full bg-[#F0EDE8] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/2 bg-[#F0EDE8] rounded animate-pulse" />
              <div className="h-2.5 w-1/3 bg-[#F0EDE8] rounded animate-pulse" />
            </div>
            <div className="w-10 h-6 bg-[#F0EDE8] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
