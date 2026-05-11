import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveCheckin } from '../../context/ActiveCheckinContext';
import { cafeUrl } from '../../utils/cafeUrl';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format milliseconds as HH:MM:SS (live ticking duration). */
function formatDurationHHMMSS(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSec = Math.floor(safe / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** Format an absolute time as HH:MM:SS in the user's locale. */
function formatClockHHMMSS(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export default function ActiveCheckinBanner() {
  const { active, checkOut } = useActiveCheckin();
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  // Tick every second for live HH:MM:SS duration.
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [active]);

  if (!active) return null;

  const startedDate = new Date(active.checkInAt);
  const startedAt = startedDate.getTime();
  const startedClock = formatClockHHMMSS(startedDate);
  const duration = formatDurationHHMMSS(now - startedAt);
  const cafeName = active.cafeName || active.cafe?.name || 'Cafe';
  const detailUrl = active.cafe ? cafeUrl(active.cafe) : null;

  const handleCheckOut = async () => {
    if (submitting) return;
    if (!confirm(`Check out dari ${cafeName}?`)) return;
    setSubmitting(true);
    try {
      await checkOut();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal check out. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const Pill = (
    <div className="flex-1 min-w-0 flex items-center gap-2.5">
      <span className="relative flex w-2.5 h-2.5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        <span className="relative rounded-full w-2.5 h-2.5 bg-emerald-300" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-emerald-200 shrink-0">
            Check-in {startedClock}
          </span>
          <span className="text-[11px] text-white/85 tabular-nums shrink-0">
            · Durasi {duration}
          </span>
          <span className="text-[11px] text-white/85 tabular-nums shrink-0">· {duration}</span>
        </div>
        <div className="text-xs font-semibold text-white/90 truncate mt-0.5">{cafeName}</div>
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 shadow-lg">
      <div className="max-w-[88rem] mx-auto px-4 py-2 flex items-center gap-3">
        {detailUrl ? (
          <Link to={detailUrl} className="flex-1 min-w-0 flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            {Pill}
          </Link>
        ) : (
          Pill
        )}
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={submitting}
          className="shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white text-emerald-700 text-xs font-extrabold hover:bg-emerald-50 transition-colors disabled:opacity-50 shadow-sm"
        >
          {submitting ? 'Checking out…' : '✕ Check Out'}
        </button>
      </div>
    </div>
  );
}
