import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useActiveCheckin } from "../../context/ActiveCheckinContext";
import { useAuth } from "../../context/AuthContext";
import type { Cafe } from "../../types";
import type { Checkin } from "../../api/checkins.api";
import { AlertTriangle, Check, MapPin } from "../../utils/lucideIcon";

interface Props {
  cafe: Cafe;
  className?: string;
  /** Tight layout for the mobile bottom bar; errors go to toasts (no room inline). */
  compact?: boolean;
  /** Fired after a successful check-in (opens the share-card popup). */
  onCheckedIn?: (checkin: Checkin) => void;
}

// UI copy only — actual validation lives on the server (CHECKIN_RADIUS_METERS).
const CHECKIN_RADIUS_M =
  Number(import.meta.env.VITE_CHECKIN_RADIUS_METERS) || 500;

/**
 * Per-cafe Check-In CTA. States:
 *   - Not logged in       → "Log in to Check In" (link to /login)
 *   - Active elsewhere    → info that another check-in is active
 *   - Active here         → "✓ Checked In Here"
 *   - Idle, can check in  → "Check In" (primary CTA)
 */
export default function CheckInButton({
  cafe,
  className = "",
  compact = false,
  onCheckedIn,
}: Props) {
  const { user } = useAuth();
  const { active, checkIn } = useActiveCheckin();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => {
    if (compact) toast.error(msg);
    else setError(msg);
  };

  if (!user) {
    return (
      <Link
        to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1C1C1A] text-white font-bold text-sm hover:bg-black transition-colors ${className}`}
      >
        <MapPin size={16} strokeWidth={2} /> Log in to Check In
      </Link>
    );
  }

  // Active at THIS cafe
  if (active && active.cafeId === cafe.id) {
    return (
      <div
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm ring-1 ring-emerald-200 ${className}`}
      >
        <Check size={16} strokeWidth={2.5} /> Checked In Here
      </div>
    );
  }

  // Active at a different cafe
  if (active && active.cafeId !== cafe.id) {
    const otherName = active.cafeName || active.cafe?.name || "another cafe";
    return (
      <div className={`flex flex-col items-stretch gap-1 ${className}`}>
        <div className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 font-bold text-sm ring-1 ring-amber-200">
          <AlertTriangle size={14} strokeWidth={2} /> You're checked in at{" "}
          {otherName}
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
      showError("Your browser doesn't support GPS");
      setSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const checkin = await checkIn({
            cafeId: cafe.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          toast.success("Checked in!");
          onCheckedIn?.(checkin);
        } catch (err: any) {
          showError(err?.response?.data?.message || "Check-in failed");
        } finally {
          setSubmitting(false);
        }
      },
      (geoErr) => {
        setSubmitting(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          showError("Location permission denied — enable GPS to check in.");
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          showError("Couldn't read your location, try moving outdoors.");
        } else {
          showError("Couldn't get your location, please try again.");
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
            Checking in…
          </>
        ) : (
          <>
            <MapPin size={16} strokeWidth={2} /> Check In
          </>
        )}
      </button>
      {!compact && error && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {!compact && (
        <p className="text-[11px] text-[#8A8880] text-center">
          You must be within {CHECKIN_RADIUS_M}m of the cafe
        </p>
      )}
    </div>
  );
}
