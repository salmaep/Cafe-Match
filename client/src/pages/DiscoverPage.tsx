import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import type { Cafe } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import { useShortlist } from '../context/ShortlistContext';
import SwipeCard from '../components/discover/SwipeCard';

const SWIPE_THRESHOLD = 120;

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { preferences, wizardCompleted } = usePreferences();
  const { addToShortlist, removeFromShortlist, isInShortlist, shortlist } = useShortlist();

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
    if (!wizardCompleted) return;
    const lat = preferences?.location?.latitude ?? -6.9175;
    const lng = preferences?.location?.longitude ?? 107.6191;
    // DEV: fetch all cafes regardless of wizard radius (mirrors mobile DEV_DISABLE_RADIUS)
    const radius = 9999 * 1000;

    cafesApi
      .search({ lat, lng, radius, limit: 10 })
      .then((res) => setCafes(res.data?.data ?? []))
      .catch(() => setCafes([]))
      .finally(() => setLoading(false));
  }, [preferences, wizardCompleted]);

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
    if (!allDone) return;
    const t = setTimeout(() => navigate('/', { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [allDone, navigate]);

  if (!wizardCompleted) return <Navigate to="/wizard" replace />;

  const triggerSwipe = (dir: 'left' | 'right') => {
    if (dir === 'right' && current) {
      addToShortlist(current);
      setToast(`Added "${current.name}" to Shortlist!`);
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
        navigate(`/cafe/${current.id}`);
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
      <div className="flex-1 flex items-start justify-center px-4 pt-[8vh] md:pt-[6vh] pb-3 select-none min-h-0">
        <div className="relative w-full max-w-sm">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="touch-none cursor-grab active:cursor-grabbing w-full"
            style={{
              transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
              opacity,
              transition: useTransition ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none',
            }}
          >
            {current && (
              <div className="relative">
                <SwipeCard
                  cafe={current}
                  isSaved={isInShortlist(current.id)}
                  onSave={() => {
                    if (isInShortlist(current.id)) {
                      removeFromShortlist(current.id);
                      setToast(`Removed "${current.name}" from Shortlist`);
                    } else {
                      addToShortlist(current);
                      setToast(`Added "${current.name}" to Shortlist!`);
                    }
                  }}
                />
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

      {/* Footer action buttons — desktop only (mobile uses gesture, mirrors mobile CardSwipe) */}
      <footer className="hidden md:flex px-6 pb-6 pt-2 max-w-md w-full mx-auto items-end justify-center gap-5 relative z-20">
        <button
          onClick={() => triggerSwipe('left')}
          disabled={!!exitDir}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-lg text-red-500 hover:bg-red-50 transition-colors border border-red-200 disabled:opacity-50"
          title="Pass"
        >
          ✕
        </button>
        <button
          onClick={() => triggerSwipe('right')}
          disabled={!!exitDir}
          className="w-14 h-14 rounded-full bg-[#D48B3A] shadow-md flex items-center justify-center text-2xl text-white hover:bg-[#b87528] transition-colors disabled:opacity-50"
          title="Shortlist & next"
        >
          ★
        </button>
        <button
          onClick={() => triggerSwipe('left')}
          disabled={!!exitDir}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-lg text-gray-500 hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50"
          title="Skip"
        >
          ›
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
