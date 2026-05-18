import { useState, useEffect, useCallback, useRef } from "react";
import { getPurposeBySlug } from "@shared/constants/purposes";
import {
  useGeolocation,
  FALLBACK_LAT,
  FALLBACK_LNG,
} from "../hooks/useGeolocation";
import { cafesApi, type SearchParams } from "../api/cafes.api";
import { promotionsApi } from "../api/promotions.api";
import { parseCoords } from "../utils/parseCoords";
import { usePreferences } from "../context/PreferencesContext";
import type { Cafe } from "../types";
import MapView from "../components/map/MapContainer";
import MapErrorBoundary from "../components/map/MapErrorBoundary";
import CafeCard from "../components/cafe/CafeCard";
import CafeListItem from "../components/cafe/CafeListItem";
import FeaturedCafeCard from "../components/cafe/FeaturedCafeCard";
import PurposeFilter from "../components/search/PurposeFilter";
import { purposesApi } from "../api/purposes.api";
import type { Purpose } from "../types";
import SearchBar from "../components/search/SearchBar";
import RadiusSlider from "../components/search/RadiusSlider";
import FilterPanel from "../components/search/FilterPanel";
import BottomSheet from "../components/layout/BottomSheet";
import HybridAdSlot from "../components/HybridAdSlot";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import Seo from "../components/seo/Seo";

const AD_INTERVAL = 5;
const MAX_ADS = 2;
const PAGE_SIZE = 7;

interface Filters {
  q: string;
  facilities: string[];
  priceRange: string;
}

// Radius pill options matching mobile native (0.5 / 1 / 2 km in meters)
const RADIUS_PILLS = [500, 1000, 2000];

function CafeCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 animate-pulse">
      <div className="aspect-video rounded-md bg-gray-100 mb-2" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-1" />
      <div className="h-3 w-1/2 bg-gray-100 rounded" />
    </div>
  );
}

export default function HomePage() {
  const geo = useGeolocation();
  const {
    preferences,
    wizardCompleted,
    setPreferences: setWizardPreferences,
    getPurposeId,
  } = usePreferences();
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  useEffect(() => {
    purposesApi
      .getAll()
      .then((res) => setPurposes(res.data ?? []))
      .catch(() => setPurposes([]));
  }, []);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [mapCafes, setMapCafes] = useState<Cafe[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [radiusSuggestion, setRadiusSuggestion] = useState<{
    suggested: number | null;
    totalIfExpanded: number | null;
  }>({ suggested: null, totalIfExpanded: null });
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  // When user clicks "Perluas radius", we switch off AI rerank for the next
  // fetch so they can browse the full result set via infinite scroll. Resets
  // on next user search.
  const [forceListMode, setForceListMode] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  // Track whether the current center came from GPS or a manual user action
  // (map click / fallback button). When `gps`, GPS updates may overwrite center;
  // when `manual`, GPS updates are ignored until user explicitly recenters.
  const [centerSource, setCenterSource] = useState<"gps" | "manual">("gps");
  const [radius, setRadius] = useState(2000);
  const [purposeId, setPurposeId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    facilities: [],
    priceRange: "",
  });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // Desktop/tablet drawer: overlays the map. Closed by default — user toggles via the floating button.
  // Default open on large monitors (≥1536px / Tailwind 2xl) — user can still close.
  // On smaller screens stays closed by default to keep map space.
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1536px)").matches;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [featuredCafes, setFeaturedCafes] = useState<any[]>([]);
  const [mobileQuery, setMobileQuery] = useState("");
  const [showAllModal, setShowAllModal] = useState(false);
  const [coordInputOpen, setCoordInputOpen] = useState(false);
  const [coordInput, setCoordInput] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("cm_home_view") as "grid" | "list") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("cm_home_view", viewMode);
  }, [viewMode]);

  // ── Hydrate filters from wizard preferences (one-time, on entry) ────────
  // When user lands on HomePage right after finishing wizard / running out of
  // swipe cards, prefill filters so the map shows the same matches. We only
  // hydrate once per mount; further user edits are independent.
  const [wizardBannerVisible, setWizardBannerVisible] = useState(false);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!wizardCompleted || !preferences) return;
    // Wait for serverPurposes to load before resolving slug → numeric id.
    const resolvedPurposeId = getPurposeId(preferences.purpose);
    if (preferences.purpose && resolvedPurposeId == null) return;
    hydratedRef.current = true;

    if (preferences.radius) setRadius(preferences.radius * 1000);
    if (resolvedPurposeId != null) setPurposeId(resolvedPurposeId);
    setFilters({
      q: "",
      facilities: preferences.amenities ?? [],
      priceRange: preferences.priceRange ?? "",
    });
    if (
      preferences.location?.type === "custom" &&
      preferences.location.latitude != null &&
      preferences.location.longitude != null
    ) {
      setCenter([
        preferences.location.latitude,
        preferences.location.longitude,
      ]);
      setCenterSource("manual");
    }
    setWizardBannerVisible(true);
  }, [wizardCompleted, preferences, getPurposeId]);

  const resetWizardFilters = () => {
    setWizardPreferences(null);
    setWizardBannerVisible(false);
    setPurposeId(null);
    setFilters({ q: "", facilities: [], priceRange: "" });
    setRadius(2000);
  };

  useEffect(() => {
    if (centerSource !== "gps") return;
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
      const hasTextQuery = filters.q.trim().length > 0 && !forceListMode;
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
        if (filters.facilities.length > 0)
          params.facilities = filters.facilities;
        if (filters.priceRange) params.priceRange = filters.priceRange;

        if (hasTextQuery) {
          // Semantic path: AI-rewrite + rerank. Returns a single curated page
          // (no infinite scroll), plus a radius suggestion when hits are sparse.
          const res = await cafesApi.semanticSearch(params);
          setCafes(res.data);
          setTotal(res.meta?.total ?? res.data.length);
          setRadiusSuggestion({
            suggested: res.meta?.suggestedRadius ?? null,
            totalIfExpanded: res.meta?.totalIfExpanded ?? null,
          });
          setIsSemanticMode(true);
        } else {
          const res = await cafesApi.search(params);
          const incoming = res.data.data ?? [];
          const totalCount = res.data.meta?.total ?? incoming.length;
          setCafes((prev) =>
            targetPage === 1 ? incoming : [...prev, ...incoming],
          );
          setTotal(totalCount);
          setRadiusSuggestion({ suggested: null, totalIfExpanded: null });
          setIsSemanticMode(false);
        }
      } catch {
        if (targetPage === 1) setCafes([]);
        setTotal(0);
        setRadiusSuggestion({ suggested: null, totalIfExpanded: null });
      } finally {
        setLoading(false);
      }
    },
    [center, radius, purposeId, filters, forceListMode],
  );

  // Reset to page 1 + refetch whenever search inputs change.
  useEffect(() => {
    setPage(1);
    fetchCafes(1);
  }, [center, radius, purposeId, filters, fetchCafes]);

  // Fetch full cafe data with limit=1000 for the map so every matching cafe
  // shows as a pin AND its InfoWindow can render photos / rating / etc. on
  // click — same payload the cafe list uses, just un-paginated.
  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    const params: SearchParams = {
      lat: center[0],
      lng: center[1],
      radius,
      page: 1,
      limit: 1000,
    };
    if (purposeId) params.purposeId = purposeId;
    if (filters.q) params.q = filters.q;
    if (filters.facilities.length > 0) params.facilities = filters.facilities;
    if (filters.priceRange) params.priceRange = filters.priceRange;
    cafesApi
      .search(params)
      .then((res) => {
        if (!cancelled) setMapCafes(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setMapCafes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [center, radius, purposeId, filters]);

  const hasMore = !isSemanticMode && cafes.length < total;

  const loadMore = () => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchCafes(next);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lat, lng]);
    setCenterSource("manual");
  };

  const useMyLocation = () => {
    setCenterSource("gps");
    geo.refetch();
  };

  const submitCoords = () => {
    const parsed = parseCoords(coordInput);
    if (!parsed) return;
    setCenter([parsed.lat, parsed.lng]);
    setCenterSource("manual");
    setCoordInputOpen(false);
    setCoordInput("");
  };

  const parsedCoords = parseCoords(coordInput);

  const setQ = (q: string) => {
    setForceListMode(false);
    setFilters((prev) => ({ ...prev, q }));
  };
  const setFacilities = (facilities: string[]) =>
    setFilters((prev) => ({ ...prev, facilities }));
  const setPriceRange = (priceRange: string) =>
    setFilters((prev) => ({ ...prev, priceRange }));
  const activeFilterCount =
    filters.facilities.length + (filters.priceRange ? 1 : 0);

  // Selecting a purpose chip auto-applies that purpose's required features as
  // the facility filter (mirrors wizard behaviour). Selecting "Semua" / null
  // is a no-op for facilities — user can still keep their picks.
  const handlePurposeSelect = (newId: number | null) => {
    setPurposeId(newId);
    if (newId == null) return;
    const p = purposes.find((x) => x.id === newId);
    if (!p?.requirements) return;
    const features = p.requirements
      .map((r) => r.feature?.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
    if (features.length === 0) return;
    setFilters((prev) => ({ ...prev, facilities: features }));
  };

  // Derived from current inputs (not post-fetch state) so the loading label
  // reflects what the NEXT request will use, not the previous one.
  const willUseSemantic = filters.q.trim().length > 0 && !forceListMode;

  // Feature names linked to the currently active purpose — drive the ⭐
  // marker on FilterPanel chips so users see why those are pre-toggled.
  const autoSelectedFromPurpose: string[] = (() => {
    if (purposeId == null) return [];
    const p = purposes.find((x) => x.id === purposeId);
    return (p?.requirements ?? [])
      .map((r) => r.feature?.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
  })();

  // Debounce mobile search input
  useEffect(() => {
    const t = setTimeout(() => {
      setForceListMode(false);
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
              setCenterSource("manual");
            }}
            className="mt-4 px-4 py-2 bg-[#D48B3A] text-white rounded-lg text-sm"
          >
            Use Bandung as default
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Find a cafe near you"
        description="Browse cafes around you and filter by WiFi, parking, mushola, price, and purpose to find your match."
      />
      {wizardBannerVisible && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 max-w-md w-[calc(100%-1rem)] sm:w-auto bg-[#FDF6EC] border border-[#F2DAB6] rounded-full shadow-md px-3 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#B97726] truncate">
            ⭐ Filter dari wizard kamu
          </span>
          <button
            type="button"
            onClick={resetWizardFilters}
            className="text-[11px] font-bold text-[#D48B3A] hover:text-[#B97726] underline shrink-0"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setWizardBannerVisible(false)}
            aria-label="Tutup"
            className="w-5 h-5 rounded-full hover:bg-[#F2DAB6] text-[#B97726] flex items-center justify-center text-[10px]"
          >
            ✕
          </button>
        </div>
      )}
      {/* ─── MOBILE: full-screen map + floating search + draggable bottom sheet ─── */}
      {/* Map sits behind the sheet; bottom-16 reserves space for the tab bar. */}
      <div className="md:hidden fixed inset-x-0 top-0 bottom-16 z-0">
        {center && (
          <MapErrorBoundary>
            <MapView
              center={center}
              cafes={mapCafes}
              radius={radius}
              onMapClick={handleMapClick}
            />
          </MapErrorBoundary>
        )}
      </div>

      {/* "Use my location" + coord-input floating buttons — mobile only.
          Sits above the bottom sheet bar. */}
      <div className="md:hidden fixed right-3 bottom-[calc(55vh+12px)] z-20 flex flex-col items-end gap-2">
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
            <span
              className={
                centerSource === "gps" ? "text-[#D48B3A]" : "text-[#8A8880]"
              }
            >
              📍
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setCoordInputOpen((v) => !v)}
          title="Masukkan koordinat"
          className={`w-10 h-10 rounded-full shadow-lg border border-[#F0EDE8] flex items-center justify-center text-lg active:scale-95 transition-transform ${
            coordInputOpen
              ? "bg-[#D48B3A] text-white"
              : "bg-white text-[#8A8880]"
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
                if (e.key === "Enter") submitCoords();
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

      <div className="md:hidden">
        <BottomSheet
          snapPoints={[0.14, 0.55, 0.92]}
          initialSnap={1}
          bottomOffset={64}
        >
          {/* Sticky search — direct child of the sheet's scroller so position:sticky
              works (overflow-x on intermediate parents would break it). */}
          <div className="sticky top-0 z-20 bg-white px-4 pt-1 pb-3 flex items-center gap-2">
            <div className="relative flex-1">
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
            <button
              type="button"
              onClick={() => setFilterPanelOpen(true)}
              className={`relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm border transition-colors ${
                activeFilterCount > 0
                  ? "bg-[#D48B3A] text-white border-[#D48B3A]"
                  : "bg-[#F0EDE8] text-[#1C1C1A] border-transparent"
              }`}
              aria-label="Buka filter"
            >
              ⚙︎
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#D48B3A] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-[#D48B3A]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="px-4 pb-8">
            {/* Featured Cafes */}
            {featuredCafes.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1A] mb-2">
                  Featured Today ✨
                </h3>
                <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                const slotIdx = Math.floor(i / AD_INTERVAL);
                const showAd =
                  (i + 1) % AD_INTERVAL === 0 &&
                  i !== cafes.length - 1 &&
                  slotIdx < MAX_ADS;
                const nodes = [<CafeListItem key={cafe.id} cafe={cafe} />];
                if (showAd) {
                  nodes.push(
                    <HybridAdSlot
                      key={`ad-${i}`}
                      slotIndex={slotIdx}
                      variant="list"
                    />,
                  );
                }
                return nodes;
              })}
              {cafes.length > 0 && (
                <InfiniteScrollSentinel
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  loading={loading}
                />
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

      {/* ─── TABLET/DESKTOP (md+): map (full-left) + results · filter is a left-side overlay drawer ─── */}
      <div className="hidden md:flex md:flex-row md:h-[calc(100vh-4rem)] md:gap-3 md:p-3 lg:gap-4 lg:p-4 bg-[#FAF9F6]">
        <div className="md:h-full md:flex-[2] lg:flex-[3] relative">
          {center && (
            <MapErrorBoundary>
              <MapView
                center={center}
                cafes={mapCafes}
                radius={radius}
                onMapClick={handleMapClick}
              />
            </MapErrorBoundary>
          )}

          {/* Filter drawer overlay — slides over the map. Toggleable on md+ via the floating button. */}
          <aside
            className={`absolute left-0 top-0 bottom-0 w-72 z-[5] overflow-y-auto overscroll-contain transition-transform duration-300 ease-out ${
              filterDrawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-hidden={!filterDrawerOpen}
          >
            <div className="relative space-y-3">
              <PurposeChips
                purposes={purposes}
                activeId={purposeId}
                onSelect={handlePurposeSelect}
              />
              <FilterPanel
                variant="sidebar"
                facilities={filters.facilities}
                onFacilitiesChange={setFacilities}
                priceRange={filters.priceRange}
                onPriceRangeChange={setPriceRange}
                autoSelectedKeys={autoSelectedFromPurpose}
              />
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 shadow border border-[#F0EDE8] flex items-center justify-center text-[#8A8880] hover:text-[#1C1C1A]"
                aria-label="Tutup filter"
              >
                ✕
              </button>
            </div>
          </aside>

          {/* Floating filter toggle — surfaces the drawer when closed */}
          {!filterDrawerOpen && (
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className={`absolute top-3 left-3 z-[5] inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-lg border text-sm font-semibold transition-colors ${
                activeFilterCount > 0
                  ? "border-[#D48B3A] text-[#D48B3A]"
                  : "border-[#F0EDE8] text-[#1C1C1A] hover:border-[#D48B3A]"
              }`}
              aria-label="Buka filter"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-[#D48B3A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="md:flex-1 lg:flex-[2] 2xl:flex-none 2xl:w-[580px] md:flex md:flex-col gap-3 md:overflow-hidden md:min-w-0">
          <SearchBar q={filters.q} onQChange={setQ} />
          <RadiusSlider radius={radius} onChange={setRadius} />
          <PurposeFilter
            selectedPurposeId={purposeId}
            onSelect={handlePurposeSelect}
          />

          {featuredCafes.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Featured Cafes
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                  onClick={() => setViewMode("grid")}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-[#1C1C1A] shadow-sm"
                      : "text-[#8A8880] hover:text-[#1C1C1A]"
                  }`}
                  aria-pressed={viewMode === "grid"}
                  title="Grid view"
                >
                  ▦
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-[#1C1C1A] shadow-sm"
                      : "text-[#8A8880] hover:text-[#1C1C1A]"
                  }`}
                  aria-pressed={viewMode === "list"}
                  title="List view"
                >
                  ☰
                </button>
              </div>
              <div className="text-sm text-gray-500 min-w-0 truncate">
                {loading
                  ? willUseSemantic
                    ? "Mencari dengan AI…"
                    : "Mencari…"
                  : `${total} cafes found`}
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
            {radiusSuggestion.suggested != null &&
              radiusSuggestion.suggested > radius &&
              cafes.length < 3 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex items-center justify-between gap-3">
                  <span className="text-amber-900">
                    Hasil terbatas dalam {(radius / 1000).toFixed(1)} km.
                    Perluas radius untuk melihat lebih banyak cafe — scroll
                    untuk memuat hasil tambahan.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = radiusSuggestion.suggested!;
                      setRadiusSuggestion({
                        suggested: null,
                        totalIfExpanded: null,
                      });
                      setForceListMode(true);
                      setRadius(next);
                    }}
                    className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Perluas radius
                  </button>
                </div>
              )}
            {loading && cafes.length === 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 xl:grid-cols-2 gap-3"
                    : "space-y-2"
                }
              >
                {[0, 1, 2].map((i) => (
                  <CafeCardSkeleton key={i} />
                ))}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {cafes.flatMap((cafe, i) => {
                  const slotIdx = Math.floor(i / AD_INTERVAL);
                  const showAd =
                    (i + 1) % AD_INTERVAL === 0 &&
                    i !== cafes.length - 1 &&
                    slotIdx < MAX_ADS;
                  const nodes = [<CafeCard key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    nodes.push(
                      <HybridAdSlot
                        key={`ad-${i}`}
                        slotIndex={slotIdx}
                        variant="card"
                      />,
                    );
                  }
                  return nodes;
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {cafes.flatMap((cafe, i) => {
                  const slotIdx = Math.floor(i / AD_INTERVAL);
                  const showAd =
                    (i + 1) % AD_INTERVAL === 0 &&
                    i !== cafes.length - 1 &&
                    slotIdx < MAX_ADS;
                  const nodes = [<CafeListItem key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    nodes.push(
                      <HybridAdSlot
                        key={`ad-${i}`}
                        slotIndex={slotIdx}
                        variant="list"
                      />,
                    );
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
              <InfiniteScrollSentinel
                onLoadMore={loadMore}
                hasMore={hasMore}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>

      {filterPanelOpen && (
        <MobileFilterModal
          purposes={purposes}
          activePurposeId={purposeId}
          onPurposeSelect={handlePurposeSelect}
          facilities={filters.facilities}
          onFacilitiesChange={setFacilities}
          priceRange={filters.priceRange}
          onPriceRangeChange={setPriceRange}
          autoSelectedKeys={autoSelectedFromPurpose}
          onClose={() => setFilterPanelOpen(false)}
        />
      )}

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
                  const slotIdx = Math.floor(i / AD_INTERVAL);
                  const showAd =
                    (i + 1) % AD_INTERVAL === 0 &&
                    i !== cafes.length - 1 &&
                    slotIdx < MAX_ADS;
                  const nodes = [<CafeCard key={cafe.id} cafe={cafe} />];
                  if (showAd) {
                    nodes.push(
                      <HybridAdSlot
                        key={`ad-${i}`}
                        slotIndex={slotIdx}
                        variant="card"
                      />,
                    );
                  }
                  return nodes;
                })}
              </div>
              {cafes.length > 0 && (
                <InfiniteScrollSentinel
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Purpose chips block — shown above FilterPanel inside the filter UI ──────
function PurposeChips({
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
        <p className="text-[11px] text-[#8A8880] mt-0.5">
          Filter by your reason
        </p>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            activeId === null
              ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
              : "bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]"
          }`}
        >
          Semua
        </button>
        {purposes.map((p) => {
          const active = activeId === p.id;
          const emoji = getPurposeBySlug(p.slug)?.emoji;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(active ? null : p.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? "bg-[#D48B3A] text-white border-[#D48B3A] shadow-sm"
                  : "bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]"
              }`}
            >
              {emoji && <span className="text-sm leading-none">{emoji}</span>}
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile filter modal — purpose chips + FilterPanel sidebar in one sheet ─
function MobileFilterModal({
  purposes,
  activePurposeId,
  onPurposeSelect,
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  autoSelectedKeys,
  onClose,
}: {
  purposes: Purpose[];
  activePurposeId: number | null;
  onPurposeSelect: (id: number | null) => void;
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  autoSelectedKeys?: string[];
  onClose: () => void;
}) {
  return (
    <div className="md:hidden fixed inset-0 z-[1100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
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
                    ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
                    : "bg-white text-[#1C1C1A] border-[#E8E4DD]"
                }`}
              >
                Semua
              </button>
              {purposes.map((p) => {
                const active = activePurposeId === p.id;
                const emoji = getPurposeBySlug(p.slug)?.emoji;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPurposeSelect(active ? null : p.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      active
                        ? "bg-[#D48B3A] text-white border-[#D48B3A]"
                        : "bg-white text-[#1C1C1A] border-[#E8E4DD]"
                    }`}
                  >
                    {emoji && (
                      <span className="text-sm leading-none">{emoji}</span>
                    )}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <FilterPanel
            variant="sidebar"
            facilities={facilities}
            onFacilitiesChange={onFacilitiesChange}
            priceRange={priceRange}
            onPriceRangeChange={onPriceRangeChange}
            autoSelectedKeys={autoSelectedKeys}
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
