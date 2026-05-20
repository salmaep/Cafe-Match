import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { cafesApi } from "../api/cafes.api";
import type { Cafe } from "../types";
import { usePreferences } from "../context/PreferencesContext";
import { useShortlist } from "../context/ShortlistContext";
import SwipeCard from "../components/discover/SwipeCard";
import { cafeUrl } from "../utils/cafeUrl";
import Seo from "../components/seo/Seo";

const SWIPE_THRESHOLD = 120;

export default function DiscoverSwipePage() {
  const navigate = useNavigate();
  const { preferences, getPurposeId } = usePreferences();
  const { addToShortlist, isInShortlist } = useShortlist();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // All hooks must come before any conditional returns (rules of hooks)
  useEffect(() => {
    if (!preferences) return;

    const lat = preferences.location?.latitude ?? -6.9175;
    const lng = preferences.location?.longitude ?? 107.6191;
    const radius =
      preferences.radius != null ? preferences.radius * 1000 : 9999 * 1000;
    const purposeId = getPurposeId(preferences.purpose) ?? undefined;
    const facilities =
      preferences.amenities && preferences.amenities.length > 0
        ? preferences.amenities
        : undefined;
    const priceRange = preferences.priceRange || undefined;

    setLoading(true);
    setCafes([]);
    setIndex(0);

    const baseParams = { lat, lng, radius, limit: 10, purposeId, priceRange };

    cafesApi
      .discover({ ...baseParams, facilities })
      .then((res) => {
        if (res.data.length > 0) return res;
        // Fallback 1: drop facilities (too restrictive when auto-preselected from purpose)
        return cafesApi.discover(baseParams);
      })
      .then((res) => {
        if (res.data.length > 0) return res;
        // Fallback 2: drop purposeId too, just location + radius
        return cafesApi.discover({ lat, lng, radius, limit: 10 });
      })
      .then((res) => setCafes(res.data ?? []))
      .catch(() => setCafes([]))
      .finally(() => setLoading(false));
  }, [preferences, getPurposeId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const current = cafes[index];
  const allDone = !loading && (cafes.length === 0 || index >= cafes.length);

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
    if (dir === "right" && current) {
      const cafe = current;
      addToShortlist(cafe).then((added) => {
        if (added) setToast(`Added "${cafe.name}" to Shortlist!`);
      });
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

  if (allDone) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6] p-8 text-center">
        <span className="text-6xl mb-4">🗺️</span>
        <h2 className="text-2xl font-bold text-[#1C1C1A] mb-1">
          Semua sudah dilihat!
        </h2>
        <p className="text-[#8A8880] mb-6">
          Yuk jelajahi lebih banyak cafe di halaman Explore
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="px-6 py-3 bg-[#D48B3A] text-white font-bold rounded-xl hover:bg-[#b87528] transition-colors"
        >
          Buka Explore 🗺️
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
        <h1
          className="m-0 font-normal text-[#1a1410] leading-[1.05] tracking-tight"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(26px, 3.5vw, 40px)",
          }}
        >
          Temukan kafe <em className="italic text-[#b85d04]">favoritmu</em>.
        </h1>
        <p className="text-[#8a7a66] text-[13px] md:text-sm mt-1.5">
          Geser kartu — kanan untuk simpan, kiri untuk lewati.
        </p>
      </header>

      {/* Card area — mobile: full-width edge-to-edge with available height; desktop: centered with aspect ratio */}
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
              currentIndex={index}
              total={cafes.length}
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
