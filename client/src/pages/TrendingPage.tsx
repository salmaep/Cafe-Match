import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import { purposesApi } from '../api/purposes.api';
import type { Cafe, Purpose } from '../types';
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from '../hooks/useGeolocation';
import { getCafeImage, placeholderImage } from '../utils/cafeImage';
import HybridAdSlot from '../components/HybridAdSlot';
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel';

const PAGE_SIZE = 24;
const AD_INTERVAL = 10;
const MAX_ADS = 2;

function distanceKm(cafe: Cafe): string | null {
  return cafe.distanceMeters != null ? (cafe.distanceMeters / 1000).toFixed(1) : null;
}

export default function TrendingPage() {
  const navigate = useNavigate();
  const { latitude, longitude, loading: geoLoading } = useGeolocation();

  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [activePurposeId, setActivePurposeId] = useState<number | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purposesApi
      .getAll()
      .then((res) => setPurposes(res.data ?? []))
      .catch(() => setPurposes([]));
  }, []);

  const fetchCafes = (targetPage: number) => {
    setLoading(true);
    cafesApi
      .search({
        lat: latitude ?? FALLBACK_LAT,
        lng: longitude ?? FALLBACK_LNG,
        radius: 50000,
        purposeId: activePurposeId ?? undefined,
        page: targetPage,
        limit: PAGE_SIZE,
        sort: 'trending',
      })
      .then((res) => {
        const incoming = res.data?.data ?? [];
        const totalCount = res.data?.meta?.total ?? incoming.length;
        setCafes((prev) => (targetPage === 1 ? incoming : [...prev, ...incoming]));
        setTotal(totalCount);
      })
      .catch(() => {
        if (targetPage === 1) setCafes([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (geoLoading) return;
    setPage(1);
    fetchCafes(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, activePurposeId, geoLoading]);

  const hasMore = cafes.length < total;
  const loadMore = () => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchCafes(next);
  };

  const top1 = cafes[0];
  const top2 = cafes[1];
  const top3 = cafes[2];
  const rest = cafes.slice(3);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24">
      {/* Header — clean, brand-consistent */}
      <header className="bg-white border-b border-[#F0EDE8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-[#1C1C1A]">Trending</h1>
              <p className="text-sm text-[#8A8880] mt-0.5">
                Cafe paling banyak disukai komunitas
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFF1E0] text-[#D48B3A] text-xs font-bold">
              🔥 {total}
            </span>
          </div>

          {/* Filter chips */}
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <FilterPill
              active={activePurposeId === null}
              onClick={() => setActivePurposeId(null)}
              label="Semua"
            />
            {purposes.map((p) => (
              <FilterPill
                key={p.id}
                active={activePurposeId === p.id}
                onClick={() => setActivePurposeId(p.id)}
                label={p.name}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        {loading && cafes.length === 0 ? (
          <SkeletonGrid />
        ) : cafes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-3 inline-block animate-bounce">🔥</span>
            <h2 className="text-lg font-bold text-[#1C1C1A] mb-1">Belum ada cafe trending</h2>
            <p className="text-sm text-[#8A8880]">Coba ganti filter atau cek lagi nanti</p>
          </div>
        ) : (
          <>
            {/* Top 1 — winner card */}
            {top1 && (
              <div className="trending-fade-in">
                <WinnerCard cafe={top1} onClick={() => navigate(`/cafe/${top1.id}`)} />
              </div>
            )}

            {/* Top 2 + 3 */}
            {(top2 || top3) && (
              <div className="grid grid-cols-2 gap-3 mt-3 trending-fade-in" style={{ animationDelay: '60ms' }}>
                {top2 && (
                  <RunnerUpCard
                    cafe={top2}
                    rank={2}
                    onClick={() => navigate(`/cafe/${top2.id}`)}
                  />
                )}
                {top3 && (
                  <RunnerUpCard
                    cafe={top3}
                    rank={3}
                    onClick={() => navigate(`/cafe/${top3.id}`)}
                  />
                )}
              </div>
            )}

            {rest.length > 0 && (
              <div className="mt-8 mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#1C1C1A] uppercase tracking-wider">
                  Peringkat 4 – {Math.min(total, cafes.length)}
                </h2>
                <span className="text-[11px] text-[#8A8880] font-semibold">
                  Geser bawah untuk lihat lebih
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(() => {
                const nodes: React.ReactNode[] = [];
                let adsShown = 0;
                rest.forEach((cafe, i) => {
                  const rank = i + 4;
                  nodes.push(
                    <div
                      key={`row-${cafe.id}`}
                      className="trending-fade-in"
                      style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                    >
                      <ListRow
                        cafe={cafe}
                        rank={rank}
                        maxFavorites={top1?.favoritesCount ?? 1}
                        onClick={() => navigate(`/cafe/${cafe.id}`)}
                      />
                    </div>,
                  );
                  const shouldAd =
                    adsShown < MAX_ADS &&
                    (i + 1) % AD_INTERVAL === 0 &&
                    i !== rest.length - 1;
                  if (shouldAd) {
                    nodes.push(
                      <div key={`ad-${i}`} className="sm:col-span-2 trending-fade-in">
                        <HybridAdSlot slotIndex={adsShown} variant="list" />
                      </div>,
                    );
                    adsShown += 1;
                  }
                });
                return nodes;
              })()}
            </div>
            <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} loading={loading} />
          </>
        )}
      </main>

      {/* Local styles — keep scoped to this page */}
      <style>{`
        @keyframes trendingFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .trending-fade-in {
          animation: trendingFadeIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes hotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.45); }
          50% { box-shadow: 0 0 0 8px rgba(234, 88, 12, 0); }
        }
        .hot-pulse { animation: hotPulse 1.8s ease-out infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-3 trending-fade-in">
      <div className="rounded-3xl bg-white ring-1 ring-[#F0EDE8] overflow-hidden">
        <div className="aspect-[16/9] bg-gradient-to-br from-[#F0EDE8] to-[#E8E4DD] animate-pulse" />
        <div className="grid grid-cols-4 divide-x divide-[#F0EDE8]">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="py-5 px-2 flex flex-col items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F0EDE8] animate-pulse" />
              <div className="w-10 h-3 rounded bg-[#F0EDE8] animate-pulse" />
              <div className="w-12 h-2 rounded bg-[#F0EDE8] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((k) => (
          <div key={k} className="rounded-2xl bg-white ring-1 ring-[#F0EDE8] overflow-hidden">
            <div className="aspect-[4/3] bg-gradient-to-br from-[#F0EDE8] to-[#E8E4DD] animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[#F0EDE8] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-[#F0EDE8] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
        {[0, 1, 2, 3].map((k) => (
          <div
            key={k}
            className="flex items-center gap-3 bg-white rounded-2xl p-2.5 ring-1 ring-[#F0EDE8]"
          >
            <div className="w-9 h-9 rounded-lg bg-[#F0EDE8] animate-pulse" />
            <div className="w-20 h-20 rounded-xl bg-[#F0EDE8] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[#F0EDE8] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-[#F0EDE8] animate-pulse" />
              <div className="h-2.5 w-1/3 rounded bg-[#F0EDE8] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinnerCard({ cafe, onClick }: { cafe: Cafe; onClick: () => void }) {
  const photo = getCafeImage(cafe);
  const km = distanceKm(cafe);
  const rating = cafe.googleRating;
  const reviews = cafe.totalGoogleReviews;
  const isHot = (cafe.favoritesCount ?? 0) >= 300;

  return (
    <div className="relative p-[2px] rounded-3xl bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] shadow-lg shadow-orange-500/10">
      <button
        type="button"
        onClick={onClick}
        className="group relative block w-full overflow-hidden rounded-[calc(1.5rem-2px)] bg-white hover:shadow-xl transition-shadow text-left"
      >
        <div className="relative aspect-[16/9]">
          <img
            src={photo}
            alt={cafe.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {/* #1 ribbon */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white shadow-md">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-white text-xs font-extrabold">
              1
            </span>
            <span className="text-[11px] font-extrabold tracking-widest text-[#1C1C1A]">
              TRENDING
            </span>
          </div>

          {/* HOT pulse badge */}
          {isHot && (
            <div className="hot-pulse absolute top-4 left-[154px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#EF4444] to-[#EA580C] text-white text-[10px] font-extrabold tracking-wider shadow-md">
              🔥 HOT
            </div>
          )}

          {km && (
            <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold">
              📍 {km} km
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5">
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold leading-tight line-clamp-2 drop-shadow-sm">
              {cafe.name}
            </h2>
            {cafe.address && (
              <p className="mt-1 text-white/85 text-sm line-clamp-1">{cafe.address}</p>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 divide-x divide-[#F0EDE8]">
          <StatCell
            icon="❤️"
            value={String(cafe.favoritesCount ?? 0)}
            label="Favorit"
            highlight
          />
          <StatCell
            icon="🔖"
            value={String(cafe.bookmarksCount ?? 0)}
            label="Bookmark"
          />
          <StatCell
            icon="⭐"
            value={rating ? rating.toFixed(1) : '–'}
            label={reviews ? `${reviews} ulasan` : 'Rating'}
          />
          <StatCell
            icon="💰"
            value={cafe.priceRange || '–'}
            label="Harga"
          />
        </div>
      </button>
    </div>
  );
}

function RunnerUpCard({
  cafe,
  rank,
  onClick,
}: {
  cafe: Cafe;
  rank: number;
  onClick: () => void;
}) {
  const photo = getCafeImage(cafe);
  const km = distanceKm(cafe);
  const rating = cafe.googleRating;
  const rankBg =
    rank === 2
      ? 'bg-gradient-to-br from-[#E5E7EB] to-[#9CA3AF]'
      : 'bg-gradient-to-br from-[#FCD34D] to-[#B45309]';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#F0EDE8] hover:shadow-md transition-shadow text-left"
    >
      <div className="relative aspect-[4/3]">
        <img
          src={photo}
          alt={cafe.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

        {/* Rank pill */}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-full bg-white shadow">
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${rankBg} text-white text-[11px] font-extrabold`}
          >
            {rank}
          </span>
          <span className="text-[10px] font-extrabold tracking-wider text-[#1C1C1A]">
            TOP
          </span>
        </span>

        {km && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold">
            {km} km
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-extrabold text-[#1C1C1A] text-sm line-clamp-1">{cafe.name}</h3>
        <p className="text-[11px] text-[#8A8880] line-clamp-1 mt-0.5">{cafe.address}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 font-extrabold text-[#EA580C]">
            ❤️ {cafe.favoritesCount ?? 0}
          </span>
          {rating != null && (
            <span className="inline-flex items-center gap-0.5 font-bold text-[#1C1C1A]">
              ⭐ {rating.toFixed(1)}
            </span>
          )}
          {cafe.priceRange && (
            <span className="ml-auto font-extrabold text-[#D48B3A]">{cafe.priceRange}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function ListRow({
  cafe,
  rank,
  maxFavorites,
  onClick,
}: {
  cafe: Cafe;
  rank: number;
  maxFavorites: number;
  onClick: () => void;
}) {
  const photo = getCafeImage(cafe);
  const km = distanceKm(cafe);
  const rating = cafe.googleRating;
  const favPct = Math.max(
    4,
    Math.round(((cafe.favoritesCount ?? 0) / Math.max(maxFavorites, 1)) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-stretch gap-3 bg-white rounded-2xl p-2.5 ring-1 ring-[#F0EDE8] hover:ring-[#D48B3A]/40 hover:shadow-md transition-all text-left"
    >
      <div className="shrink-0 w-9 flex items-center justify-center text-base font-extrabold text-[#8A8880] tabular-nums">
        {rank}
      </div>
      <div className="relative shrink-0">
        <img
          src={photo}
          alt={cafe.name}
          className="w-20 h-20 rounded-xl object-cover bg-[#F0EDE8]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
          }}
        />
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-bold text-[#1C1C1A] text-sm truncate">{cafe.name}</h3>
        <p className="text-[11px] text-[#8A8880] truncate mt-0.5">{cafe.address}</p>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {rating != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#1C1C1A]">
              ⭐ {rating.toFixed(1)}
            </span>
          )}
          {km && <span className="text-[11px] font-semibold text-[#8A8880]">📍 {km} km</span>}
          {cafe.priceRange && (
            <span className="text-[11px] font-extrabold text-[#D48B3A]">{cafe.priceRange}</span>
          )}
          {cafe.wifiAvailable && <span className="text-[11px]">📶</span>}
        </div>
        {/* Popularity bar */}
        <div className="mt-1.5 h-1 rounded-full bg-[#F0EDE8] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FBBF24] via-[#F97316] to-[#EA580C] transition-all"
            style={{ width: `${favPct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-center justify-center min-w-[52px] px-2 border-l border-[#F0EDE8]">
        <span className="text-base leading-none">❤️</span>
        <span className="text-sm font-extrabold text-[#EA580C] mt-1 leading-none">
          {cafe.favoritesCount ?? 0}
        </span>
        <span className="text-[9px] font-semibold text-[#8A8880] mt-0.5 uppercase tracking-wider">
          fav
        </span>
      </div>
    </button>
  );
}

function StatCell({
  icon,
  value,
  label,
  highlight,
}: {
  icon: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-1">
      <span className="text-base leading-none">{icon}</span>
      <span
        className={`mt-1.5 text-base font-extrabold leading-none tabular-nums ${
          highlight ? 'text-[#EA580C]' : 'text-[#1C1C1A]'
        }`}
      >
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold text-[#8A8880] uppercase tracking-wider leading-none">
        {label}
      </span>
    </div>
  );
}

function FilterPill({
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
      onClick={onClick}
      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
        active
          ? 'bg-[#1C1C1A] text-white shadow-sm'
          : 'bg-white text-[#1C1C1A] ring-1 ring-[#E8E4DD] hover:bg-[#F0EDE8]'
      }`}
    >
      {label}
    </button>
  );
}
