import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShortlist } from '../context/ShortlistContext';
import { useAuth } from '../context/AuthContext';
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from '../hooks/useGeolocation';
import { haversineDistance } from '../utils/haversine';
import CafeCard from '../components/cafe/CafeCard';
import Seo from '../components/seo/Seo';

type SortMode = 'recent' | 'distance' | 'rating';

export default function ShortlistPage() {
  const { shortlist, removeFromShortlist, clearShortlist, loading } = useShortlist();
  const { user, isLoading: authLoading } = useAuth();
  const geo = useGeolocation();

  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const sortedShortlist = useMemo(() => {
    if (sortMode === 'recent') return shortlist;
    const lat = geo.latitude ?? FALLBACK_LAT;
    const lng = geo.longitude ?? FALLBACK_LNG;
    const arr = [...shortlist];
    if (sortMode === 'distance') {
      arr.sort((a, b) => {
        const da = haversineDistance(lat, lng, a.latitude, a.longitude);
        const db = haversineDistance(lat, lng, b.latitude, b.longitude);
        return da - db;
      });
    } else if (sortMode === 'rating') {
      arr.sort((a, b) => (b.googleRating ?? 0) - (a.googleRating ?? 0));
    }
    return arr;
  }, [shortlist, sortMode, geo.latitude, geo.longitude]);

  const handleClearAll = () => {
    if (!confirm(`Hapus semua ${shortlist.length} cafe dari shortlist?`)) return;
    clearShortlist();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        <div className="max-w-2xl mx-auto p-4 pt-12">
          <div className="text-center py-16 bg-white border border-[#F0EDE8] rounded-2xl shadow-sm">
            <span className="text-6xl mb-4 inline-block">⭐</span>
            <h1 className="text-xl font-extrabold text-[#1C1C1A]">
              Login dulu untuk lihat Shortlist
            </h1>
            <p className="text-sm text-[#8A8880] mt-2 mb-5 max-w-xs mx-auto">
              Shortlist kamu disimpan di akun, bisa diakses dari device manapun.
            </p>
            <Link
              to="/login?redirect=%2Fshortlist"
              className="inline-block bg-[#D48B3A] text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-[#B97726] transition-colors shadow-sm"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <Seo title="My Shortlist" description="Cafe yang kamu simpan untuk dikunjungi nanti" />

      {/* Hero — full-width on mobile, card on desktop (consistent with TrendingPage) */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:pt-5">
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
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-amber-200 text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#B45309] mb-2.5 shadow-sm">
                  <span>⭐</span> Shortlist
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1C1A] tracking-tight leading-tight">
                  Cafe yang{' '}
                  <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
                    kamu suka
                  </span>
                </h1>
                <p className="text-sm sm:text-[15px] text-[#5C5A52] mt-2 max-w-xl">
                  {shortlist.length > 0
                    ? `${shortlist.length} cafe disimpan untuk dikunjungi nanti.`
                    : 'Geser kanan saat Discover untuk menyimpan cafe yang menarik.'}
                </p>
              </div>
              {shortlist.length > 0 && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] text-white text-xs font-extrabold shadow-md shadow-orange-500/20">
                  <span className="text-sm leading-none">⭐</span>
                  <span className="tabular-nums">{shortlist.length}</span>
                  <span className="text-[10px] opacity-80 font-bold tracking-wider">CAFES</span>
                </span>
              )}
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {shortlist.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Sort + clear toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white rounded-full p-1 ring-1 ring-[#F0EDE8] shadow-sm">
                <SortPill
                  active={sortMode === 'recent'}
                  onClick={() => setSortMode('recent')}
                  label="Terbaru"
                />
                <SortPill
                  active={sortMode === 'distance'}
                  onClick={() => setSortMode('distance')}
                  label="Terdekat"
                />
                <SortPill
                  active={sortMode === 'rating'}
                  onClick={() => setSortMode('rating')}
                  label="Rating"
                />
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A8880] hover:text-red-600 transition-colors px-3 py-1.5 rounded-full hover:bg-red-50"
              >
                🗑️ Hapus semua
              </button>
            </div>

            {/* Grid — responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedShortlist.map((c) => (
                <div key={c.id} className="relative group">
                  <CafeCard cafe={c} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromShortlist(c.id);
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-red-500 hover:text-white text-[#5C5A52] text-base font-bold shadow-md flex items-center justify-center transition-all z-10 backdrop-blur-sm opacity-90 hover:opacity-100"
                    title="Hapus dari shortlist"
                    aria-label="Hapus dari shortlist"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Footer encouragement */}
            <div className="mt-8 text-center">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#D48B3A] hover:text-[#B97726] transition-colors"
              >
                + Tambah lagi via Discover →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SortPill({
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
      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
        active
          ? 'bg-[#1C1C1A] text-white'
          : 'text-[#5C5A52] hover:text-[#1C1C1A] hover:bg-[#F0EDE8]'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 sm:py-16 bg-white border border-dashed border-[#E0DCD3] rounded-2xl">
      <div className="relative inline-block mb-4">
        <span className="text-6xl">⭐</span>
        <span className="absolute -top-1 -right-2 text-2xl animate-bounce">✨</span>
      </div>
      <h2 className="text-lg font-extrabold text-[#1C1C1A]">
        Shortlist kamu masih kosong
      </h2>
      <p className="text-sm text-[#8A8880] mt-2 mb-5 max-w-sm mx-auto px-4">
        Buka Discover, swipe kanan cafe yang menarik — semua tersimpan di sini.
      </p>
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 bg-gradient-to-br from-[#D48B3A] to-[#B45309] text-white font-bold text-sm px-6 py-3 rounded-xl hover:shadow-lg transition-shadow shadow-md"
      >
        🃏 Mulai Discover
      </Link>
    </div>
  );
}
