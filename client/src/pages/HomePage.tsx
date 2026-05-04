import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useGeolocation } from "../hooks/useGeolocation";
import { cafesApi, type SearchParams } from "../api/cafes.api";
import { promotionsApi } from "../api/promotions.api";
import { usePreferences } from "../context/PreferencesContext";
import type { Cafe } from "../types";
import MapView from "../components/map/MapContainer";
import CafeCard from "../components/cafe/CafeCard";
import CafeListItem from "../components/cafe/CafeListItem";
import FeaturedCafeCard from "../components/cafe/FeaturedCafeCard";
import PurposeFilter from "../components/search/PurposeFilter";
import SearchBar from "../components/search/SearchBar";
import RadiusSlider from "../components/search/RadiusSlider";
import BottomSheet from "../components/layout/BottomSheet";

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
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('cm_home_view') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('cm_home_view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (geo.latitude && geo.longitude && !center) {
      setCenter([geo.latitude, geo.longitude]);
    }
  }, [geo.latitude, geo.longitude, center]);

  useEffect(() => {
    promotionsApi
      .getActive("featured_promo")
      .then((res) => setFeaturedCafes(res.data))
      .catch(() => {});
  }, []);

  const fetchCafes = useCallback(async () => {
    if (!center) return;
    setLoading(true);
    try {
      const params: SearchParams = { lat: center[0], lng: center[1], radius };
      if (purposeId) params.purposeId = purposeId;
      if (filters.q) params.q = filters.q;
      if (filters.wifiAvailable) params.wifiAvailable = "true";
      if (filters.hasMushola) params.hasMushola = "true";
      if (filters.priceRange) params.priceRange = filters.priceRange;
      const res = await cafesApi.search(params);
      setCafes(res.data.data);
    } catch {
      setCafes([]);
    } finally {
      setLoading(false);
    }
  }, [center, radius, purposeId, filters]);

  useEffect(() => {
    fetchCafes();
  }, [fetchCafes]);

  const handleMapClick = (lat: number, lng: number) => setCenter([lat, lng]);
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
            onClick={() => setCenter([-6.8965, 107.591])}
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
                  : cafes.length === 0
                    ? "Tidak ada kafe ditemukan"
                    : `${cafes.length} kafe dalam ${radius / 1000} km`}
              </p>
            </div>

            {/* List — compact horizontal rows (matches Android MapScreen list) */}
            <div className="space-y-2">
              {cafes.map((cafe) => (
                <CafeListItem key={cafe.id} cafe={cafe} />
              ))}
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
                {loading ? "Searching..." : `${cafes.length} cafes found`}
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
                {cafes.map((cafe) => (
                  <CafeCard key={cafe.id} cafe={cafe} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {cafes.map((cafe) => (
                  <CafeListItem key={cafe.id} cafe={cafe} />
                ))}
              </div>
            )}
            {!loading && cafes.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No cafes found nearby
              </p>
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
                  {cafes.length} kafe dalam {radius / 1000} km
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
                {cafes.map((cafe) => (
                  <CafeCard key={cafe.id} cafe={cafe} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
