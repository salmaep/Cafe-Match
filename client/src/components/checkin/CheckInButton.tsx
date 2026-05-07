import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveCheckin } from '../../context/ActiveCheckinContext';
import { useAuth } from '../../context/AuthContext';
import type { Cafe } from '../../types';

interface Props {
  cafe: Cafe;
  className?: string;
}

/**
 * Per-cafe Check-In CTA. Three states:
 *   - Not logged in       → "Login untuk Check In" (link to /login)
 *   - Active elsewhere    → "Sedang check-in di [other cafe]" (disabled-ish, info)
 *   - Active here         → "✓ Sudah Check-In" (disabled, shows duration)
 *   - Idle, can check in  → "Check In Sekarang" (primary CTA)
 */
export default function CheckInButton({ cafe, className = '' }: Props) {
  const { user } = useAuth();
  const { active, checkIn } = useActiveCheckin();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Link
        to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1C1C1A] text-white font-bold text-sm hover:bg-black transition-colors ${className}`}
      >
        📍 Login untuk Check In
      </Link>
    );
  }

  // Active at THIS cafe
  if (active && active.cafeId === cafe.id) {
    return (
      <div
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm ring-1 ring-emerald-200 ${className}`}
      >
        ✓ Sedang Check-In Di Sini
      </div>
    );
  }

  // Active at a different cafe
  if (active && active.cafeId !== cafe.id) {
    const otherName = active.cafeName || active.cafe?.name || 'cafe lain';
    return (
      <div
        className={`flex flex-col items-stretch gap-1 ${className}`}
      >
        <div className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 font-bold text-sm ring-1 ring-amber-200">
          ⚠️ Check out dulu dari {otherName}
        </div>
      </div>
    );
  }

  const handleCheckIn = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    // Get current location
    if (!navigator.geolocation) {
      setError('Browser tidak support GPS');
      setSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await checkIn({
            cafeId: cafe.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        } catch (err: any) {
          setError(err?.response?.data?.message || 'Gagal check-in');
        } finally {
          setSubmitting(false);
        }
      },
      (geoErr) => {
        setSubmitting(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError('Izin lokasi ditolak. Aktifkan GPS untuk check-in.');
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          setError('Lokasi tidak tersedia. Coba lagi di luar ruangan.');
        } else {
          setError('Gagal dapat lokasi. Coba lagi.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className={`flex flex-col items-stretch gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleCheckIn}
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-60 shadow-sm"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Check In…
          </>
        ) : (
          '📍 Check In Sekarang'
        )}
      </button>
      {error && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <p className="text-[11px] text-[#8A8880] text-center">
        Harus berada dalam radius 100m dari cafe
      </p>
    </div>
  );
}
