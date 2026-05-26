import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { cafesApi, type DiscoverParams } from "../api/cafes.api";
import type { Cafe } from "../types";
import { usePreferences } from "../context/PreferencesContext";
import { useShortlist } from "../context/ShortlistContext";
import SwipeCard from "../components/discover/SwipeCard";
import { cafeUrl } from "../utils/cafeUrl";
import Seo from "../components/seo/Seo";
import { Map } from "../utils/lucideIcon";

const SWIPE_THRESHOLD = 120;
const BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 3; // prefetch when only N cards left before end
const MAX_RADIUS_METERS = 50_000;

// Tier policy: progressively relax filter + expand radius until truly empty.
// Each tier is tried in order; advance when a fetch returns zero new cafes.
type TierBuilder = (base: {
  lat: number;
  lng: number;
  baseRadius: number;
  purposeId?: number;
  facilities?: string[];
  priceRange?: string;
}) => Omit<DiscoverParams, "limit" | "excludeIds">;

const TIERS: TierBuilder[] = [
  // Tier 0: full filter, original radius
  (b) => ({
    lat: b.lat,
    lng: b.lng,
    radius: b.baseRadius,
    purposeId: b.purposeId,
    facilities: b.facilities,
    priceRange: b.priceRange,
  }),
  // Tier 1: full filter, radius ×2 (cap)
  (b) => ({
    lat: b.lat,
    lng: b.lng,
    radius: Math.min(b.baseRadius * 2, MAX_RADIUS_METERS),
    purposeId: b.purposeId,
    facilities: b.facilities,
    priceRange: b.priceRange,
  }),
  // Tier 2: drop facilities
  (b) => ({
    lat: b.lat,
    lng: b.lng,
    radius: b.baseRadius,
    purposeId: b.purposeId,
    priceRange: b.priceRange,
  }),
  // Tier 3: drop purposeId
  (b) => ({
    lat: b.lat,
    lng: b.lng,
    radius: b.baseRadius,
    priceRange: b.priceRange,
  }),
  // Tier 4: location only, max radius
  (b) => ({
    lat: b.lat,
    lng: b.lng,
    radius: MAX_RADIUS_METERS,
  }),
];

export default function DiscoverSwipePage() {
  const navigate = useNavigate();
  const { preferences, getPurposeId } = usePreferences();
  const { addToShortlist, isInShortlist } = useShortlist();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tier, setTier] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const swipedIdsRef = useRef<Set<number>>(new Set());

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // Stable identity of current preference values so the fetcher can capture
  // them without re-recreating on every render.
  const baseParams = useMemo(() => {
    if (!preferences) return null;
    const lat = preferences.location?.latitude ?? -6.9175;
    const lng = preferences.location?.longitude ?? 107.6191;
    const baseRadius =
      preferences.radius != null
        ? Math.min(preferences.radius * 1000, MAX_RADIUS_METERS)
        : 9999 * 1000;
    const purposeId = getPurposeId(preferences.purpose) ?? undefined;
    const facilities =
      preferences.amenities && preferences.amenities.length > 0
        ? preferences.amenities
        : undefined;
    const priceRange = preferences.priceRange || undefined;
    return { lat, lng, baseRadius, purposeId, facilities, priceRange };
  }, [preferences, getPurposeId]);

  // ── Fetch loop: tries current tier; if it returns zero new cafes, escalate
  //    to the next tier and retry. Stops once tier 4 (loosest) also returns 0.
  const fetchMore = useCallback(async () => {
    if (!baseParams || loadingMore || exhausted || fetchError) return;
    setLoadingMore(true);
    try {
      let currentTier = tier;
      while (currentTier < TIERS.length) {
        const params = TIERS[currentTier](baseParams);
        const res = await cafesApi.discover({
          ...params,
          limit: BATCH_SIZE,
          excludeIds: [...swipedIdsRef.current],
        });
        const incoming = res.data ?? [];
        // De-dup against already-loaded cafes (defense in depth — server may
        // race or promo-injection could repeat).
        const seenIds = new Set([
          ...swipedIdsRef.current,
          ...cafes.map((c) => c.id),
        ]);
        const fresh = incoming.filter((c) => !seenIds.has(c.id));

        if (fresh.length > 0) {
          setCafes((prev) => [...prev, ...fresh]);
          setTier(currentTier);
          return;
        }
        // Empty tier — escalate.
        currentTier += 1;
      }
      // Exhausted all tiers.
      setExhausted(true);
      setTier(TIERS.length);
    } catch {
      // Network/server error: mark errored so the prefetch effect stops
      // re-firing in a tight loop. User sees retry UI.
      setFetchError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [baseParams, loadingMore, exhausted, fetchError, tier, cafes]);

  // Reset entire deck when preferences change (user edited filter in Home).
  // Identity of `preferences` object is stable per setPreferences, so this
  // only fires on actual change.
  useEffect(() => {
    if (!preferences) return;
    swipedIdsRef.current = new Set();
    setCafes([]);
    setIndex(0);
    setTier(0);
    setExhausted(false);
    setFetchError(false);
    setLoading(true);
  }, [preferences]);

  // Initial + reactive fetch. Triggers on mount, after reset, and whenever
  // user swipes close to the end of the current deck.
  useEffect(() => {
    if (!preferences) return;
    if (loadingMore || exhausted || fetchError) {
      if (loading) setLoading(false);
      return;
    }
    const remaining = cafes.length - index;
    if (cafes.length === 0 || remaining <= PREFETCH_THRESHOLD) {
      fetchMore().finally(() => setLoading(false));
    } else if (loading) {
      setLoading(false);
    }
  }, [
    preferences,
    cafes.length,
    index,
    loadingMore,
    exhausted,
    fetchError,
    loading,
    fetchMore,
  ]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const current = cafes[index];
  const allDone = !loading && exhausted && index >= cafes.length;

  useEffect(() => {
    if (!allDone || !preferences) return;
    const t = setTimeout(() => navigate("/", { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [allDone, navigate, preferences]);

  // Conditional returns only after all hooks
  if (!preferences) {
    return <Navigate to="/discover" replace />;
  }

  const triggerSwipe = (dir: "left" | "right") => {
    if (current) {
      swipedIdsRef.current.add(current.id);
      if (dir === "right") {
        const cafe = current;
        addToShortlist(cafe).then((added) => {
          if (added) setToast(`Added "${cafe.name}" to Shortlist!`);
        });
      }
    }
    setExitDir(dir);
    setDragging(false);
    setTimeout(() => {
      setExitDir(null);
      setDragX(0);
      setIndex((i) => i + 1);
    }, 300);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exitDir) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    setDragX(e.clientX - startXRef.current);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) triggerSwipe("right");
    else if (dragX < -SWIPE_THRESHOLD) triggerSwipe("left");
    else {
      if (Math.abs(dragX) < 8 && current) {
        navigate(cafeUrl(current), { state: { backLabel: "Discover" } });
      }
      setDragX(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#1C1C1A] font-semibold">Finding cafes...</p>
      </div>
    );
  }

  if (fetchError && cafes.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6] p-8 text-center">
        <p className="text-[#1C1C1A] font-semibold mb-1">
          Gagal memuat kafe
        </p>
        <p className="text-[#8A8880] text-sm mb-6">
          Periksa koneksi atau coba lagi sebentar.
        </p>
        <button
          type="button"
          onClick={() => {
            setFetchError(false);
            setLoading(true);
          }}
          className="px-5 py-2.5 bg-[#D48B3A] text-white font-bold rounded-xl hover:bg-[#b87528] transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6] p-8 text-center">
        <Map size={56} strokeWidth={1.5} className="mb-4 text-[#D48B3A]" />
        <h2 className="text-2xl font-bold text-[#1C1C1A] mb-1">
          Semua sudah dilihat!
        </h2>
        <p className="text-[#8A8880] mb-6">
          Yuk jelajahi lebih banyak cafe di halaman Explore
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#D48B3A] text-white font-bold rounded-xl hover:bg-[#b87528] transition-colors"
        >
          Buka Explore
          <Map size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  let translateX = dragX;
  let rotate = dragX / 20;
  let opacity = 1;
  let useTransition = !dragging;
  if (exitDir === "right") {
    translateX = window.innerWidth;
    rotate = 25;
    opacity = 0;
    useTransition = true;
  } else if (exitDir === "left") {
    translateX = -window.innerWidth;
    rotate = -25;
    opacity = 0;
    useTransition = true;
  }

  return (
    <div
      className="h-[calc(100dvh-3.5rem)] bg-[#f6efe2] flex flex-col relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -20%, #f9e9c8 0%, transparent 60%), radial-gradient(900px 500px at -10% 110%, #f1d9b2 0%, transparent 55%)",
      }}
    >
      <Seo
        title="Discover cafes"
        description="Swipe through cafes that match your preferences and shortlist the ones you love."
      />

      {/* Page header */}
      <header className="md:absolute md:left-20 shrink-0 w-full max-w-130 md:max-w-275 mx-auto px-4 md:px-8 pt-4 md:pt-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1C1A] tracking-tight leading-tight">
          Temukan kafe <br />
          <span className="bg-linear-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
            favoritmu
          </span>
          .
        </h1>
        <p className="text-[#8A8880] text-[13px] md:text-sm mt-1.5">
          Geser kartu — kanan untuk simpan, kiri untuk lewati.
        </p>
      </header>

      {/* Card area */}
      <div className="mx-3 md:mx-0 flex-1 min-h-0 flex items-stretch md:items-center justify-center pb-1">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="touch-none cursor-grab active:cursor-grabbing select-none w-full h-full mx-auto md:w-auto md:h-full md:max-h-[min(78vh,100vh)] md:aspect-[3/4.2]"
          style={{
            transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
            opacity,
            transition: useTransition
              ? "transform 0.3s ease-out, opacity 0.3s ease-out"
              : "none",
          }}
        >
          {current && (
            <SwipeCard
              cafe={current}
              className="w-full h-full"
              shortlisted={isInShortlist(current.id)}
              dragX={dragX}
              onSkip={() => triggerSwipe("left")}
              onKeep={() => triggerSwipe("right")}
            />
          )}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1C1C1A] text-white px-5 py-3 rounded-full shadow-xl z-40 text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}
