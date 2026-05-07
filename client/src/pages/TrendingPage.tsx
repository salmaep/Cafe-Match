import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import { purposesApi } from '../api/purposes.api';
import type { Cafe, Purpose } from '../types';
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from '../hooks/useGeolocation';
import { getCafeImage, placeholderImage } from '../utils/cafeImage';
import { cafeUrl } from '../utils/cafeUrl';
import HybridAdSlot from '../components/HybridAdSlot';
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel';
import Seo from '../components/seo/Seo';
import FilterPanel from '../components/search/FilterPanel';
import { getOpenStatus } from '../utils/openingHours';
import { buildFacilityChips } from '../utils/facilities';
import { getPurposeBySlug } from '../constants/purposes';

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
  const [facilities, setFacilities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
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
        facilities: facilities.length > 0 ? facilities : undefined,
        priceRange: priceRange || undefined,
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
  }, [latitude, longitude, activePurposeId, facilities, priceRange, geoLoading]);

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
      <Seo
        title="Trending cafes"
        description="See which cafes are getting the most votes and bookmarks this week."
      />
      {/* Header — full-width on mobile, card on desktop */}
      <div className="lg:max-w-[88rem] lg:mx-auto lg:px-8 lg:pt-5">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#FFF1E0] via-[#FFFBF3] to-[#FFF8EC] border-b border-amber-100 lg:border-0 lg:rounded-2xl lg:ring-1 lg:ring-amber-200/60 lg:shadow-sm">
          {/* Decorative glow blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -left-12 w-60 h-60 rounded-full bg-amber-200/50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-orange-200/40 blur-3xl"
          />

          <div className="relative px-5 sm:px-7 lg:px-8 py-6 sm:py-8">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-amber-200 text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#B45309] mb-2.5 shadow-sm">
                  <span>🔥</span> Trending Now
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1C1A] tracking-tight leading-tight">
                  Cafe paling{' '}
                  <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
                    hits
                  </span>{' '}
                  minggu ini
                </h1>
                <p className="text-sm sm:text-[15px] text-[#5C5A52] mt-2 max-w-xl">
                  Berdasarkan jumlah favorit & bookmark dari komunitas — update tiap hari.
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] text-white text-xs font-extrabold shadow-md shadow-orange-500/20">
                  <span className="text-sm leading-none">🔥</span>
                  <span className="tabular-nums">{total.toLocaleString()}</span>
                  <span className="text-[10px] opacity-80 font-bold tracking-wider">CAFES</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#1C1C1A] ring-1 ring-[#E8E4DD] text-xs font-bold hover:ring-[#D48B3A] transition-colors shadow-sm"
                >
                  <span>⚙️</span> Filter
                  {(facilities.length > 0 || priceRange || activePurposeId != null) && (
                    <span className="bg-[#D48B3A] text-white rounded-full px-1.5 text-[10px] font-extrabold">
                      {facilities.length + (priceRange ? 1 : 0) + (activePurposeId != null ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:flex lg:gap-6">
        {/* Desktop sidebar — sticky, contains both Purpose + FilterPanel */}
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain pr-1 space-y-3">
            <PurposeSidebar
              purposes={purposes}
              activeId={activePurposeId}
              onSelect={setActivePurposeId}
            />
            <FilterPanel
              variant="sidebar"
              facilities={facilities}
              onFacilitiesChange={setFacilities}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
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
            {/* Top 3 podium — Winner full-width, runners-up below as 2-col grid */}
            {top1 && (
              <div className="trending-fade-in">
                <WinnerCard cafe={top1} onClick={() => navigate(cafeUrl(top1))} />
              </div>
            )}
            {(top2 || top3) && (
              <div
                className="mt-3 sm:mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 trending-fade-in"
                style={{ animationDelay: '60ms' }}
              >
                {top2 && (
                  <RunnerUpCard
                    cafe={top2}
                    rank={2}
                    onClick={() => navigate(cafeUrl(top2))}
                  />
                )}
                {top3 && (
                  <RunnerUpCard
                    cafe={top3}
                    rank={3}
                    onClick={() => navigate(cafeUrl(top3))}
                  />
                )}
              </div>
            )}

            {rest.length > 0 && (
              <div className="mt-10 mb-4 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#1C1C1A] uppercase tracking-[0.1em]">
                  Peringkat 4 – {Math.min(total, cafes.length)}
                </h2>
                <span className="text-[11px] text-[#8A8880] font-semibold">
                  Geser bawah untuk lihat lebih
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
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
                        onClick={() => navigate(cafeUrl(cafe))}
                      />
                    </div>,
                  );
                  const shouldAd =
                    adsShown < MAX_ADS &&
                    (i + 1) % AD_INTERVAL === 0 &&
                    i !== rest.length - 1;
                  if (shouldAd) {
                    nodes.push(
                      <div key={`ad-${i}`} className="trending-fade-in">
                        <HybridAdSlot slotIndex={adsShown} variant="list" size="compact" />
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
      </div>

      {/* Mobile filter modal — purpose chips above the shared FilterPanel modal */}
      {filterModalOpen && (
        <MobileFilterModal
          purposes={purposes}
          activePurposeId={activePurposeId}
          onPurposeSelect={(id) => setActivePurposeId(id)}
          facilities={facilities}
          onFacilitiesChange={setFacilities}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          onClose={() => setFilterModalOpen(false)}
        />
      )}

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
  const open = getOpenStatus(cafe.openingHours);
  const locality = cafe.district || cafe.city;
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, 4);
  const overflow = allChips.length - visibleChips.length;

  return (
    <div className="relative h-full p-[2px] rounded-3xl bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] shadow-xl shadow-orange-500/15">
      <button
        type="button"
        onClick={onClick}
        className="group relative flex flex-col h-full w-full overflow-hidden rounded-[calc(1.5rem-2px)] bg-white hover:shadow-2xl transition-all text-left"
      >
        <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] flex-1">
          <img
            src={photo}
            alt={cafe.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

          {/* Top-left: champion badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white shadow-lg">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-white text-sm font-extrabold shadow-inner">
                👑
              </span>
              <span className="text-[11px] font-extrabold tracking-[0.18em] text-[#1C1C1A]">
                #1 TRENDING
              </span>
            </div>
            {isHot && (
              <div className="hot-pulse inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#EF4444] to-[#EA580C] text-white text-[10px] font-extrabold tracking-wider shadow-md">
                🔥 HOT
              </div>
            )}
          </div>

          {/* Top-right: floating glass stat pills */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {rating != null && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow-md text-[#1C1C1A] text-[12px] font-extrabold tabular-nums">
                <span className="text-amber-500">★</span>
                {rating.toFixed(1)}
                {reviews != null && (
                  <span className="text-[#8A8880] font-medium ml-0.5">
                    ({reviews.toLocaleString()})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Bottom: title + locality + key inline stats */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.05] line-clamp-2 drop-shadow-md tracking-tight">
              {cafe.name}
            </h2>
            {(locality || km) && (
              <p className="mt-1.5 text-white/90 text-[13px] sm:text-sm line-clamp-1 font-medium">
                {[locality, km ? `${km} km` : null].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-extrabold tabular-nums ring-1 ring-white/20">
                ❤️ {(cafe.favoritesCount ?? 0).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-extrabold tabular-nums ring-1 ring-white/20">
                🔖 {(cafe.bookmarksCount ?? 0).toLocaleString()}
              </span>
              {cafe.priceRange && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-extrabold ring-1 ring-white/20">
                  {cafe.priceRange}
                </span>
              )}
              {open && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${
                    open.isOpen
                      ? 'bg-emerald-500/90 text-white ring-emerald-400/50'
                      : 'bg-black/60 text-white ring-white/20'
                  }`}
                >
                  ● {open.isOpen ? `Buka${open.closesAt ? ` · ${open.closesAt}` : ''}` : 'Tutup'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom strip — facilities only, single cohesive section */}
        {visibleChips.length > 0 && (
          <div className="px-5 py-3 bg-gradient-to-b from-[#FFF1E0] to-[#FDF6EC] border-t border-amber-200/40">
            <div className="flex flex-wrap gap-1.5">
              {visibleChips.map((c) => (
                <span
                  key={c.key}
                  className="bg-white text-[#5C5A52] text-[11px] font-semibold rounded-full px-2.5 py-1 ring-1 ring-amber-200/60 shadow-sm"
                >
                  {c.icon} {c.label}
                </span>
              ))}
              {overflow > 0 && (
                <span className="inline-flex items-center bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full px-2.5 py-1 ring-1 ring-amber-300">
                  +{overflow}
                </span>
              )}
            </div>
          </div>
        )}
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
  const reviews = cafe.totalGoogleReviews;
  const locality = cafe.district || cafe.city;
  const open = getOpenStatus(cafe.openingHours);
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, 3);
  const overflow = allChips.length - visibleChips.length;

  // Border gradient — silver for #2, bronze for #3
  const borderGradient =
    rank === 2
      ? 'from-[#E5E7EB] via-[#9CA3AF] to-[#6B7280]'
      : 'from-[#FCD34D] via-[#D97706] to-[#B45309]';
  const rankBg =
    rank === 2
      ? 'bg-gradient-to-br from-[#E5E7EB] to-[#9CA3AF]'
      : 'bg-gradient-to-br from-[#FCD34D] to-[#B45309]';

  return (
    <div
      className={`relative h-full p-[1.5px] rounded-2xl bg-gradient-to-br ${borderGradient} shadow-md`}
    >
      <button
        type="button"
        onClick={onClick}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[calc(1rem-1.5px)] bg-gradient-to-br from-[#FFF8EC] to-white hover:shadow-lg transition-shadow text-left"
      >
        {/* Photo — full-width tile on top */}
        <div className="relative aspect-[4/3]">
          <img
            src={photo}
            alt={cafe.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Rank pill */}
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-full bg-white shadow-md">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${rankBg} text-white text-[11px] font-extrabold`}
            >
              {rank}
            </span>
            <span className="text-[10px] font-extrabold tracking-wider text-[#1C1C1A]">TOP</span>
          </span>

          {km && (
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold">
              📍 {km} km
            </span>
          )}

          {/* Title overlay on photo */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="text-white text-base font-extrabold line-clamp-1 tracking-tight drop-shadow-sm">
              {cafe.name}
            </h3>
            {locality && (
              <p className="text-white/85 text-[11px] line-clamp-1 mt-0.5 font-medium">
                {locality}
              </p>
            )}
          </div>
        </div>

        {/* Body — amber info section */}
        <div className="px-3.5 py-3 bg-gradient-to-b from-[#FFF1E0] to-[#FDF6EC] flex-1 flex flex-col justify-between">
          {/* Stats row */}
          <div className="flex items-center gap-3 text-[12px]">
            <span className="inline-flex items-center gap-1 font-extrabold text-[#EA580C] tabular-nums">
              ❤️ {(cafe.favoritesCount ?? 0).toLocaleString()}
            </span>
            {rating != null && (
              <span className="inline-flex items-center gap-0.5 font-bold text-[#1C1C1A] tabular-nums">
                ⭐ {rating.toFixed(1)}
                {reviews != null && (
                  <span className="font-medium text-[#8A8880] ml-0.5">
                    ({reviews.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            {cafe.priceRange && (
              <span className="ml-auto font-extrabold text-[#D48B3A]">{cafe.priceRange}</span>
            )}
          </div>

          {/* Open status + facilities */}
          {(open || visibleChips.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {open && (
                <span
                  className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                    open.isOpen
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-stone-200 text-stone-700 ring-1 ring-stone-300'
                  }`}
                >
                  {open.isOpen
                    ? open.closesAt
                      ? `Buka · ${open.closesAt}`
                      : 'Buka'
                    : open.opensAt
                      ? `Tutup · ${open.opensAt}`
                      : 'Tutup'}
                </span>
              )}
              {visibleChips.map((c) => (
                <span
                  key={c.key}
                  className="bg-white/80 text-[#5C5A52] text-[10px] font-semibold rounded-full px-2 py-0.5 ring-1 ring-amber-200/60"
                >
                  {c.icon} {c.label}
                </span>
              ))}
              {overflow > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-2 py-0.5 ring-1 ring-amber-300">
                  +{overflow}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

const VISIBLE_CHIPS = 3;

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
  const reviews = cafe.totalGoogleReviews;
  const locality = cafe.district || cafe.city;
  const open = getOpenStatus(cafe.openingHours);
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, VISIBLE_CHIPS);
  const overflow = allChips.length - visibleChips.length;
  const favPct = Math.max(
    4,
    Math.round(((cafe.favoritesCount ?? 0) / Math.max(maxFavorites, 1)) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-stretch gap-3 bg-white rounded-2xl p-3 ring-1 ring-[#F0EDE8] hover:ring-[#D48B3A]/40 hover:shadow-md transition-all text-left"
    >
      <div className="shrink-0 w-9 flex items-center justify-center text-base font-extrabold text-[#8A8880] tabular-nums">
        {rank}
      </div>
      <div className="relative shrink-0">
        <img
          src={photo}
          alt={cafe.name}
          className="w-[100px] h-[100px] rounded-xl object-cover bg-[#F0EDE8]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
          }}
        />
        {cafe.activePromotionType === 'new_cafe' && (
          <span className="absolute top-1 left-1 bg-[#E94B4B] text-white text-[9px] font-bold rounded px-1 py-px">
            NEW
          </span>
        )}
        {cafe.activePromotionType === 'featured_promo' && (
          <span className="absolute top-1 left-1 bg-[#D48B3A] text-white text-[9px] font-bold rounded px-1 py-px">
            Featured
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-bold text-[#1C1C1A] text-[15px] truncate">{cafe.name}</h3>

        <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#8A8880]">
          {rating != null && (
            <>
              <span className="text-amber-500">★</span>
              <span className="font-semibold text-[#1C1C1A]">{rating.toFixed(1)}</span>
              {reviews != null && <span>({reviews.toLocaleString()})</span>}
              <span className="text-[#D9D6CE]">·</span>
            </>
          )}
          {cafe.priceRange && (
            <>
              <span className="font-bold text-[#D48B3A]">{cafe.priceRange}</span>
              <span className="text-[#D9D6CE]">·</span>
            </>
          )}
          {km && <span>{km} km</span>}
        </div>

        {locality && (
          <p className="text-[11px] text-[#A8A59C] truncate mt-0.5">{locality}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-1.5">
          {open && (
            <span
              className={`text-[10px] font-bold rounded-full px-2 py-px ${
                open.isOpen
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {open.isOpen
                ? open.closesAt
                  ? `Buka · tutup ${open.closesAt}`
                  : 'Buka'
                : open.opensAt
                  ? `Tutup · buka ${open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `}${open.opensAt}`
                  : 'Tutup'}
            </span>
          )}
          {visibleChips.map((c) => (
            <span
              key={c.key}
              className="bg-[#F0EDE8] text-[#5C5A52] text-[10px] font-medium rounded-full px-2 py-px"
            >
              {c.icon} {c.label}
            </span>
          ))}
          {overflow > 0 && (
            <span className="bg-white border border-[#E0DCD3] text-[#8A8880] text-[10px] font-medium rounded-full px-2 py-px">
              +{overflow}
            </span>
          )}
        </div>

        {cafe.topReviewText && (
          <p className="text-[11px] text-[#5C5A52] leading-snug mt-1.5 line-clamp-1 italic">
            <span className="text-[#8A8880] not-italic">💬</span> "{cafe.topReviewText}"
          </p>
        )}

        {/* Popularity bar — trending signature */}
        <div className="mt-2 h-1 rounded-full bg-[#F0EDE8] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FBBF24] via-[#F97316] to-[#EA580C] transition-all"
            style={{ width: `${favPct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-center justify-center min-w-[56px] px-2 border-l border-[#F0EDE8]">
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

function PurposeSidebar({
  purposes,
  activeId,
  onSelect,
}: {
  purposes: Purpose[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#F0EDE8] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F0EDE8]">
        <h3 className="text-sm font-bold text-[#1C1C1A]">Tujuan</h3>
        <p className="text-[11px] text-[#8A8880] mt-0.5">Filter by your reason</p>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            activeId === null
              ? 'bg-[#1C1C1A] text-white border-[#1C1C1A]'
              : 'bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]'
          }`}
        >
          Semua
        </button>
        {purposes.map((p) => {
          const active = activeId === p.id;
          const wizard = getPurposeBySlug(p.slug);
          const label = wizard?.label ?? p.name;
          const emoji = wizard?.emoji ?? '';
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(active ? null : p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? 'bg-[#D48B3A] text-white border-[#D48B3A] shadow-sm'
                  : 'bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]'
              }`}
            >
              {emoji} {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileFilterModal({
  purposes,
  activePurposeId,
  onPurposeSelect,
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  onClose,
}: {
  purposes: Purpose[];
  activePurposeId: number | null;
  onPurposeSelect: (id: number | null) => void;
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="lg:hidden fixed inset-0 z-[1100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full rounded-t-2xl shadow-2xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE8]">
          <h3 className="text-base font-bold text-[#1C1C1A]">Filter</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#F0EDE8]">
            <div className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider mb-2">
              Tujuan
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onPurposeSelect(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  activePurposeId === null
                    ? 'bg-[#1C1C1A] text-white border-[#1C1C1A]'
                    : 'bg-white text-[#1C1C1A] border-[#E8E4DD]'
                }`}
              >
                Semua
              </button>
              {purposes.map((p) => {
                const active = activePurposeId === p.id;
                const wizard = getPurposeBySlug(p.slug);
                const label = wizard?.label ?? p.name;
                const emoji = wizard?.emoji ?? '';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPurposeSelect(active ? null : p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      active
                        ? 'bg-[#D48B3A] text-white border-[#D48B3A]'
                        : 'bg-white text-[#1C1C1A] border-[#E8E4DD]'
                    }`}
                  >
                    {emoji} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Embed the regular sidebar variant — already shows price + facility groups */}
          <FilterPanel
            variant="sidebar"
            facilities={facilities}
            onFacilitiesChange={onFacilitiesChange}
            priceRange={priceRange}
            onPriceRangeChange={onPriceRangeChange}
          />
        </div>

        <div className="border-t border-[#F0EDE8] bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#1C1C1A] hover:bg-black text-white text-sm font-bold py-2.5 rounded-lg"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
