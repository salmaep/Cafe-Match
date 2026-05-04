import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from "../hooks/useGeolocation";
import { cafesApi, type SearchParams } from "../api/cafes.api";
import { promotionsApi } from "../api/promotions.api";
import { usePreferences } from "../context/PreferencesContext";
import { parseCoords } from "../utils/parseCoords";
import type { Cafe } from "../types";
import MapView from "../components/map/MapContainer";
import CafeCard from "../components/cafe/CafeCard";
import CafeListItem from "../components/cafe/CafeListItem";
import FeaturedCafeCard from "../components/cafe/FeaturedCafeCard";
import PurposeFilter from "../components/search/PurposeFilter";
import SearchBar from "../components/search/SearchBar";
import RadiusSlider from "../components/search/RadiusSlider";
import BottomSheet from "../components/layout/BottomSheet";
import HybridAdSlot from "../components/HybridAdSlot";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";

const AD_INTERVAL = 5;
const PAGE_SIZE = 20;

interface Filters {
  q: string;
  wifiAvailable: boolean;
  hasMushola: boolean;
  priceRange: string;
}

// Radius pill options matching mobile native (0.5 / 1 / 2 km in meters)
const RADIUS_PILLS = [500, 1000, 2000];

export default function HomePage() {
  const { wizardCompleted } = usePreferences();
  const geo = useGeolocation();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  // Track whether the current center came from GPS or a manual user action
  // (map click / fallback button). When `gps`, GPS updates may overwrite center;
  // when `manual`, GPS updates are ignored until user explicitly recenters.
  const [centerSource, setCenterSource] = useState<'gps' | 'manual'>('gps');
  const [radius, setRadius] = useState(2000);
  const [purposeId, setPurposeId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    wifiAvailable: false,
    hasMushola: false,
    priceRange: "",
  });
  const [featuredCafes, setFeaturedCafes] = useState<any[]>([]);
  const [mobileQuery, setMobileQuery] = useState("");
  const [showAllModal, setShowAllModal] = useState(false);
  const [coordInputOpen, setCoordInputOpen] = useState(false);
  const [coordInput, setCoordInput] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('cm_home_view') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('cm_home_view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (centerSource !== 'gps') return;
    if (geo.latitude && geo.longitude) {
      setCenter([geo.latitude, geo.longitude]);
    }
  }, [geo.latitude, geo.longitude, centerSource]);

  useEffect(() => {
    promotionsApi
      .getActive("featured_promo")
      .then((res) => setFeaturedCafes(res.data))
      .catch(() => {});
  }, []);

  const fetchCafes = useCallback(
    async (targetPage: number) => {
      if (!center) return;
      setLoading(true);
      try {
        const params: SearchParams = {
          lat: center[0],
          lng: center[1],
          radius,
          page: targetPage,
          limit: PAGE_SIZE,
        };
        if (purposeId) params.purposeId = purposeId;
        if (filters.q) params.q = filters.q;
        if (filters.wifiAvailable) params.wifiAvailable = "true";
        if (filters.hasMushola) params.hasMushola = "true";
        if (filters.priceRange) params.priceRange = filters.priceRange;
        const res = await cafesApi.search(params);
        const incoming = res.data.data ?? [];
        const totalCount = res.data.meta?.total ?? incoming.length;
        // Append on page > 1, replace on page 1 (fresh search).
        setCafes((prev) => (targetPage === 1 ? incoming : [...prev, ...incoming]));
        setTotal(totalCount);
      } catch {
        if (targetPage === 1) setCafes([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [center, radius, purposeId, filters],
  );

  // Reset to page 1 + refetch whenever search inputs change.
  useEffect(() => {
    setPage(1);
    fetchCafes(1);
  }, [center, radius, purposeId, filters, fetchCafes]);

  const hasMore = cafes.length < total;

  const loadMore = () => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchCafes(next);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lat, lng]);
    setCenterSource('manual');
  };

  const useMyLocation = () => {
    setCenterSource('gps');
    geo.refetch();
  };

  const submitCoords = () => {
    const parsed = parseCoords(coordInput);
    if (!parsed) return;
    setCenter([parsed.lat, parsed.lng]);
    setCenterSource('manual');
    setCoordInputOpen(false);
    setCoordInput("");
  };

  const parsedCoords = parseCoords(coordInput);

  const handleSearch = (newFilters: Filters) => setFilters(newFilters);

  // Debounce mobile search input
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: mobileQuery }));
    }, 350);
    return () => clearTimeout(t);
  }, [mobileQuery]);

  if (geo.loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D48B3A] mx-auto mb-4" />
          <p className="text-[#8A8880]">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (geo.error && !center) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2">Could not get your location</p>
          <p className="text-sm text-[#8A8880]">{geo.error}</p>
          <p className="text-sm text-[#8A8880] mt-4">
            Click on the map to set a search location, or enable location access
            in your browser.
          </p>
          <button
            onClick={() => {
              setCenter([FALLBACK_LAT, FALLBACK_LNG]);
              setCenterSource('manual');
            }}
            className="mt-4 px-4 py-2 bg-[#D48B3A] text-white rounded-lg text-sm"
          >
            Use Bandung as default
          </button>
        </div>
      </div>
    );
  }

  if (!wizardCompleted) return <Navigate to="/wizard" replace />;

  return (
    <>
      {/* ─── MOBILE: full-screen map + floating search + draggable bottom sheet ─── */}
      {/* Map sits behind the sheet; bottom-16 reserves space for the tab bar. */}
      <div className="lg:hidden fixed inset-x-0 top-0 bottom-16 z-0">
        {center && (
          <MapView
            center={center}
            cafes={cafes}
            radius={radius}
            onMapClick={handleMapClick}
          />
        )}
      </div>

      {/* "Use my location" + coord-input floating buttons — mobile only.
          Sits above the bottom sheet bar. */}
      <div className="lg:hidden fixed right-3 bottom-[calc(55vh+12px)] z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          title="Gunakan lokasi saya"
          className="w-10 h-10 rounded-full bg-white shadow-lg border border-[#F0EDE8] flex items-center justify-center text-lg active:scale-95 transition-transform disabled:opacity-50"
          disabled={geo.loading}
        >
          {geo.loading ? (
            <div className="w-4 h-4 border-2 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className={centerSource === 'gps' ? 'text-[#D48B3A]' : 'text-[#8A8880]'}>📍</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setCoordInputOpen((v) => !v)}
          title="Masukkan koordinat"
          className={`w-10 h-10 rounded-full shadow-lg border border-[#F0EDE8] flex items-center justify-center text-lg active:scale-95 transition-transform ${
            coordInputOpen ? 'bg-[#D48B3A] text-white' : 'bg-white text-[#8A8880]'
          }`}
        >
          📌
        </button>
        {coordInputOpen && (
          <div className="bg-white rounded-xl shadow-xl border border-[#F0EDE8] p-2.5 w-[260px]">
            <input
              type="text"
              value={coordInput}
              onChange={(e) => setCoordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCoords();
              }}
              placeholder="-6.9175, 107.6191"
              autoFocus
              className="w-full bg-[#F0EDE8] rounded-lg px-3 py-2 text-sm text-[#1C1C1A] outline-none focus:ring-2 focus:ring-[#D48B3A] placeholder:text-[#8A8880]"
            />
            {coordInput.length > 0 && !parsedCoords && (
              <p className="text-[11px] text-[#B58A2C] mt-1.5">
                ⚠️ Format: "lat, lng"
              </p>
            )}
            {parsedCoords && (
              <p className="text-[11px] text-[#2F8F4E] mt-1.5">
                ✓ {parsedCoords.lat.toFixed(4)}, {parsedCoords.lng.toFixed(4)}
              </p>
            )}
            <button
              type="button"
              onClick={submitCoords}
              disabled={!parsedCoords}
              className="w-full mt-2 bg-[#1C1C1A] text-white text-xs font-bold py-2 rounded-lg disabled:opacity-40"
            >
              Pakai koordinat ini
            </button>
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <BottomSheet
          snapPoints={[0.14, 0.55, 0.92]}
          initialSnap={1}
          bottomOffset={64}
        >
          {/* Sticky search — direct child of the sheet's scroller so position:sticky
              works (overflow-x on intermediate parents would break it). */}
          <div className="sticky top-0 z-20 bg-white px-4 pt-1 pb-3">
            <div className="relative">
              <input
                type="text"
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="Cari kafe, alamat, atau fasilitas…"
                className="w-full pl-10 pr-9 py-2.5 bg-[#F0EDE8] rounded-full text-sm text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/40 outline-none border-none transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8880] text-base pointer-events-none">
                🔍
              </span>
              {mobileQuery && (
                <button
                  type="button"
                  onClick={() => setMobileQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#D6CFC2] text-white text-xs font-bold flex items-center justify-center hover:bg-[#8A8880] transition-colors"
                  aria-label="Clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-8">
            {/* Featured Cafes */}
            {featuredCafes.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1A] mb-2">
                  Featured Today ✨
                </h3>
                <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
                  {featuredCafes.map((promo: any) => (
                    <FeaturedCafeCard
                      key={promo.id}
                      cafe={promo.cafe}
                      promotion={{
                        content_title: promo.contentTitle,
                        content_description: promo.contentDescription,
                        content_photo_url: promo.contentPhotoUrl,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Radius pills */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider">
                Radius
              </span>
              <div className="flex bg-[#F0EDE8] rounded-full p-0.5">
                {RADIUS_PILLS.map((r) => {
                  const active = radius === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadius(r)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        active
                          ? "bg-[#1C1C1A] text-white"
                          : "text-[#8A8880] hover:text-[#1C1C1A]"
                      }`}
                    >
                      {r / 1000} km
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cafe count */}
            <div className="mt-4 mb-2">
              <p className="text-sm font-bold text-[#1C1C1A]">
                {loading
                  ? "Mencari kafe…"
                  : total === 0
                    ? "Tidak ada kafe ditemukan"
                    : `${total} kafe dalam ${radius / 1000} km`}
              </p>
            </div>

            {/* List — compact horizontal rows (matches Android MapScreen list) */}
            <div className="space-y-2">
              {cafes.flatMap((cafe, i) => {
                const showAd = (i + 1) % AD_INTERVAL === 0 && i !== cafes.length - 1;
                const nodes = [<CafeListItem key={cafe.id} cafe={cafe} />];
                if (showAd) {
                  const slotIdx = Math.floor(i / AD_INTERVAL);
                  nodes.push(<HybridAdSlot key={`ad-${i}`} slotIndex={slotIdx} variant="list" />);
                }
                return nodes;
              })}
              {cafes.length > 0 && (
                <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} loading={loading} />
              )}
              {!loading && cafes.length === 0 && (
                <div className="text-center py-10">
                  <span className="text-4xl mb-2 inline-block">☕</span>
                  <p className="text-[#8A8880] text-sm">
                    Tidak ada kafe di radius ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRadius(5000)}
                    className="mt-3 text-sm font-bold text-[#D48B3A] hover:underline"
                  >
                    Perluas radius →
                  </button>
                </div>
              )}
            </div>
          </div>
        </BottomSheet>
      </div>

      {/* ─── DESKTOP: side-by-side fixed-height layout ────────────────── */}
      <div className="hidden lg:flex lg:flex-row lg:h-[calc(100vh-4rem)] lg:gap-4 lg:p-4 bg-[#FAF9F6]">
        <div className="lg:h-full lg:w-2/3 relative">
          {center && (
            <MapView
              center={center}
              cafes={cafes}
              radius={radius}
              onMapClick={handleMapClick}
            />
          )}
          {/* "Use my location" + coord-input — desktop overlay on map */}
          <div className="absolute right-3 bottom-3 z-[1000] flex flex-col items-end gap-2">
            {coordInputOpen && (
              <div className="bg-white rounded-xl shadow-xl border border-[#F0EDE8] p-2.5 w-[280px]">
                <p className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wide mb-1.5">
                  Masukkan koordinat
                </p>
                <input
                  type="text"
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitCoords();
                  }}
                  placeholder="-6.9175, 107.6191"
                  autoFocus
                  className="w-full bg-[#F0EDE8] rounded-lg px-3 py-2 text-sm text-[#1C1C1A] outline-none focus:ring-2 focus:ring-[#D48B3A] placeholder:text-[#8A8880]"
                />
                {coordInput.length > 0 && !parsedCoords && (
                  <p className="text-[11px] text-[#B58A2C] mt-1.5">
                    ⚠️ Format: "lat, lng" (contoh dari Google Maps)
                  </p>
                )}
                {parsedCoords && (
                  <p className="text-[11px] text-[#2F8F4E] mt-1.5">
                    ✓ {parsedCoords.lat.toFixed(4)}, {parsedCoords.lng.toFixed(4)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={submitCoords}
                  disabled={!parsedCoords}
                  className="w-full mt-2 bg-[#1C1C1A] hover:bg-black text-white text-xs font-bold py-2 rounded-lg disabled:opacity-40 transition-colors"
                >
                  Pakai koordinat ini
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoordInputOpen((v) => !v)}
                title="Masukkan koordinat"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg border text-xs font-semibold active:scale-95 transition-all ${
                  coordInputOpen
                    ? 'bg-[#D48B3A] border-[#D48B3A] text-white'
                    : 'bg-white border-[#F0EDE8] text-[#1C1C1A] hover:border-[#D48B3A] hover:text-[#D48B3A]'
                }`}
              >
                <span>📌</span>
                <span>Koordinat</span>
              </button>
              <button
                type="button"
                onClick={useMyLocation}
                title="Gunakan lokasi saya"
                disabled={geo.loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-lg border border-[#F0EDE8] text-xs font-semibold hover:border-[#D48B3A] hover:text-[#D48B3A] active:scale-95 transition-all disabled:opacity-50"
              >
                {geo.loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={centerSource === 'gps' ? 'text-[#D48B3A]' : 'text-[#8A8880]'}>📍</span>
                )}
                <span className={centerSource === 'gps' ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'}>
                  Lokasi saya
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:flex-1 lg:flex lg:flex-col gap-3 lg:overflow-hidden">
          <SearchBar onSearch={handleSearch} />
          <RadiusSlider radius={radius} onChange={setRadius} />
          <PurposeFilter selectedPurposeId={purposeId} onSelect={setPurposeId} />

          {featuredCafes.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Featured Cafes
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {featuredCafes.map((promo: any) => (
                  <FeaturedCafeCard
                    key={promo.id}
                    cafe={promo.cafe}
                    promotion={{
                      content_title: promo.contentTitle,
                      content_description: promo.contentDescription,
                      content_photo_url: promo.contentPhotoUrl,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {/* View mode toggle — placed before the count text */}
              <div
                className="flex items-center bg-[#F0EDE8] rounded-lg p-0.5 shrink-0"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#1C1C1A] shadow-sm'
                      : 'text-[#8A8880] hover:text-[#1C1C1A]'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                  title="Grid view"
                >
                  ▦
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-[#1C1C1A] shadow-sm'
                      : 'text-[#8A8880] hover:text-[#1C1C1A]'
                  }`}
                  aria-pressed={viewMode === 'list'}
                  title="List view"
                >
                  ☰
                </button>
              </div>
              <div className="text-sm text-gray-500 min-w-0 truncate">
                {loading ? "Searching..." : `${total} cafes found`}
              </div>
            </div>
            {!loading && cafes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllModal(true)}
                className="shrink-0 text-sm font-semibold text-[#D48B3A] hover:underline whitespace-nowrap"
              >
                Lihat semua →
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {cafes.flatMap((cafe, i) => {
                  const showAd = (i + 1) % AD_INTERVAL === 0 && i !== cafes.length - 1;
                  const nodes = [<CafeCard key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    const slotIdx = Math.floor(i / AD_INTERVAL);
                    nodes.push(<HybridAdSlot key={`ad-${i}`} slotIndex={slotIdx} variant="card" />);
                  }
                  return nodes;
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {cafes.flatMap((cafe, i) => {
                  const showAd = (i + 1) % AD_INTERVAL === 0 && i !== cafes.length - 1;
                  const nodes = [<CafeListItem key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    const slotIdx = Math.floor(i / AD_INTERVAL);
                    nodes.push(<HybridAdSlot key={`ad-${i}`} slotIndex={slotIdx} variant="list" />);
                  }
                  return nodes;
                })}
              </div>
            )}
            {!loading && cafes.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No cafes found nearby
              </p>
            )}
            {cafes.length > 0 && (
              <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} loading={loading} />
            )}
          </div>
        </div>
      </div>

      {/* "Lihat semua" full-screen modal — desktop only */}
      {showAllModal && (
        <div
          className="hidden lg:flex fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm items-start justify-center p-6 overflow-y-auto"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="bg-[#FAF9F6] w-full max-w-7xl rounded-2xl shadow-2xl my-6 flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8] bg-white">
              <div>
                <h2 className="text-xl font-bold text-[#1C1C1A]">All Cafes</h2>
                <p className="text-sm text-[#8A8880] mt-0.5">
                  {total} kafe dalam {radius / 1000} km
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="w-9 h-9 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] text-xl font-bold flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {cafes.flatMap((cafe, i) => {
                  const showAd = (i + 1) % AD_INTERVAL === 0 && i !== cafes.length - 1;
                  const nodes = [<CafeCard key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    const slotIdx = Math.floor(i / AD_INTERVAL);
                    nodes.push(<HybridAdSlot key={`ad-${i}`} slotIndex={slotIdx} variant="card" />);
                  }
                  return nodes;
                })}
              </div>
              {cafes.length > 0 && (
                <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} loading={loading} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
