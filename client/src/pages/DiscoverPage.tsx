import { useEffect, useRef, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import type { Cafe } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import { useShortlist } from '../context/ShortlistContext';
import SwipeCard from '../components/discover/SwipeCard';
import { cafeUrl } from '../utils/cafeUrl';
import Seo from '../components/seo/Seo';
import Wizard from '../components/wizard/Wizard';

const SWIPE_THRESHOLD = 120;

export default function DiscoverPage() {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { preferences, getPurposeId, wizardCompleted } = usePreferences();
  const { addToShortlist, shortlist } = useShortlist();

  const [showWizard, setShowWizard] = useState(
    () => !wizardCompleted || navType !== 'POP',
  );

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (showWizard) return;
    const lat = preferences?.location?.latitude ?? -6.9175;
    const lng = preferences?.location?.longitude ?? 107.6191;
    // DEV: fetch all cafes regardless of wizard radius (mirrors mobile DEV_DISABLE_RADIUS)
    const radius = 9999 * 1000;

    // Apply wizard preferences to backend filters: vibe (purpose), facilities, price.
    const purposeId = getPurposeId(preferences?.purpose) ?? undefined;
    const facilities =
      preferences?.amenities && preferences.amenities.length > 0
        ? preferences.amenities
        : undefined;
    const priceRange = preferences?.priceRange || undefined;

    cafesApi
      .search({ lat, lng, radius, limit: 5, purposeId, facilities, priceRange })
      .then((res) => setCafes(res.data?.data ?? []))
      .catch(() => setCafes([]))
      .finally(() => setLoading(false));
  }, [preferences, showWizard, getPurposeId]);

  // Auto-hide toast after 2.5s (mirrors mobile Toast component)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const current = cafes[index];
  const allDone = !loading && (cafes.length === 0 || index >= cafes.length);

  // Auto-redirect to home after all cafes swiped (mirrors mobile 1.2s delay)
  useEffect(() => {
    if (showWizard || !allDone) return;
    const t = setTimeout(() => navigate('/', { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [allDone, navigate, showWizard]);

  if (showWizard) {
    return (
      <Wizard
        onComplete={() => setShowWizard(false)}
        onSkip={() => navigate('/', { replace: true })}
      />
    );
  }

  const triggerSwipe = (dir: 'left' | 'right') => {
    if (dir === 'right' && current) {
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
    if (dragX > SWIPE_THRESHOLD) triggerSwipe('right');
    else if (dragX < -SWIPE_THRESHOLD) triggerSwipe('left');
    else {
      // Small movement → treat as tap → open cafe detail
      if (Math.abs(dragX) < 8 && current) {
        navigate(cafeUrl(current));
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
        <h2 className="text-2xl font-bold text-[#1C1C1A] mb-1">No match?</h2>
        <p className="text-[#8A8880]">Let's explore the map!</p>
      </div>
    );
  }

  let translateX = dragX;
  let rotate = dragX / 20;
  let opacity = 1;
  let useTransition = !dragging;
  if (exitDir === 'right') {
    translateX = window.innerWidth;
    rotate = 25;
    opacity = 0;
    useTransition = true;
  } else if (exitDir === 'left') {
    translateX = -window.innerWidth;
    rotate = -25;
    opacity = 0;
    useTransition = true;
  }

  const likeOverlayOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const passOverlayOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

  return (
    <div className="h-screen md:h-[calc(100vh-64px)] bg-[#FAF9F6] flex flex-col relative overflow-hidden">
      <Seo
        title="Discover cafes"
        description="Swipe through cafes that match your preferences and shortlist the ones you love."
      />
      {/* Hint banner — explains swipe gestures */}
      <div className="px-4 pt-3 pb-1 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between gap-2 bg-white border border-[#F0EDE8] rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#5C5A52] shadow-sm">
          <span className="flex items-center gap-1 text-red-500">
            <span className="text-sm">←</span> Geser kiri = <span className="font-bold">Skip</span>
          </span>
          <span className="flex items-center gap-1 text-[#D48B3A]">
            <span className="font-bold">Shortlist</span> = Geser kanan <span className="text-sm">→</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pt-[2vh] md:pt-4 lg:pt-6 pb-3 select-none min-h-0">
        <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg h-full flex items-center justify-center">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="touch-none cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center"
            style={{
              transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
              opacity,
              transition: useTransition ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none',
            }}
          >
            {current && (
              <div className="relative h-full max-h-full flex items-center justify-center">
                <SwipeCard cafe={current} />
                <div
                  className="absolute top-8 left-8 -rotate-12 px-4 py-2 border-4 border-[#D48B3A] rounded-lg pointer-events-none"
                  style={{ opacity: likeOverlayOpacity }}
                >
                  <span className="text-2xl font-extrabold text-[#D48B3A] tracking-wider">
                    SHORTLIST ★
                  </span>
                </div>
                <div
                  className="absolute top-8 right-8 rotate-12 px-4 py-2 border-4 border-red-500 rounded-lg pointer-events-none"
                  style={{ opacity: passOverlayOpacity }}
                >
                  <span className="text-2xl font-extrabold text-red-500 tracking-wider">
                    NOPE
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shortlist FAB — bottom right (mirrors mobile, local-only — no auth) */}
      <button
        onClick={() => navigate('/shortlist')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D48B3A] text-white shadow-xl flex items-center justify-center hover:bg-[#b87528] transition-colors z-30"
        title="View Shortlist"
      >
        <span className="text-2xl leading-none">★</span>
        {shortlist.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-[#D48B3A] text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow border border-[#D48B3A]">
            {shortlist.length}
          </span>
        )}
      </button>

      {/* Footer action buttons — only 2 (left = skip/nope, right = shortlist) */}
      <footer className="flex px-6 pb-6 pt-2 max-w-md w-full mx-auto items-center justify-center gap-10 relative z-20">
        <button
          onClick={() => triggerSwipe('left')}
          disabled={!!exitDir}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl text-red-500 hover:bg-red-50 transition-colors border-2 border-red-200 disabled:opacity-50"
          title="Skip / Nope"
        >
          ✕
        </button>
        <button
          onClick={() => triggerSwipe('right')}
          disabled={!!exitDir}
          className="w-16 h-16 rounded-full bg-[#D48B3A] shadow-lg flex items-center justify-center text-3xl text-white hover:bg-[#b87528] transition-colors disabled:opacity-50"
          title="Add to Shortlist"
        >
          ★
        </button>
      </footer>

      {/* Toast (mirrors mobile Toast) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1C1C1A] text-white px-5 py-3 rounded-full shadow-xl z-40 text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}
