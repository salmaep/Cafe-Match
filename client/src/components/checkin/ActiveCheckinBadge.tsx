import { useNavigate } from "react-router-dom";
import { useActiveCheckin } from "../../context/ActiveCheckinContext";
import { cafeUrl } from "../../utils/cafeUrl";
import { MapPin } from "../../utils/lucideIcon";

/**
 * Small map-corner badge showing the user's active check-in (replaces the
 * removed Google Maps camera control). Hidden when there's no active
 * check-in. Clicking it opens that cafe's detail page.
 */
export default function ActiveCheckinBadge({
  className = "",
}: {
  className?: string;
}) {
  const { active } = useActiveCheckin();
  const navigate = useNavigate();
  if (!active) return null;

  const cafeName = active.cafeName || active.cafe?.name || "a cafe";
  const target = active.cafe
    ? cafeUrl({ id: active.cafe.id, name: active.cafe.name, slug: active.cafe.slug })
    : null;

  return (
    <button
      type="button"
      onClick={() => target && navigate(target)}
      title={`Checked in at ${cafeName}`}
      className={`inline-flex items-center gap-1.5 max-w-56 px-3 py-2 rounded-full bg-white/95 shadow-lg border border-emerald-200 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors ${className}`}
    >
      <span className="relative flex w-2 h-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
      </span>
      <MapPin size={13} strokeWidth={2.5} className="shrink-0" />
      <span className="truncate">Checked in at {cafeName}</span>
    </button>
  );
}
