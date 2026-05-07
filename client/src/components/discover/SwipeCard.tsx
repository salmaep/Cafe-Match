import { useNavigate } from 'react-router-dom';
import type { Cafe } from '../../types';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';
import { cafeUrl } from '../../utils/cafeUrl';
import { getOpenStatus } from '../../utils/openingHours';
import { buildFacilityChips } from '../../utils/facilities';

interface Props {
  cafe: Cafe;
  isSaved: boolean;
  onSave: () => void;
}

const VISIBLE_CHIPS = 5;

export default function SwipeCard({ cafe, isSaved, onSave }: Props) {
  const navigate = useNavigate();
  const photo = getCafeImage(cafe);
  const distanceKm =
    cafe.distanceMeters != null
      ? (cafe.distanceMeters / 1000).toFixed(1)
      : null;
  const open = getOpenStatus(cafe.openingHours);
  const locality = cafe.district || cafe.city;

  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, VISIBLE_CHIPS);
  const overflow = allChips.length - visibleChips.length;
  if (cafe.priceRange) {
    visibleChips.push({ key: '__price', icon: '', label: cafe.priceRange });
  }

  return (
    <div
      onClick={() => navigate(cafeUrl(cafe))}
      className="relative w-full aspect-[3/4] max-w-md mx-auto bg-[#F0EDE8] rounded-2xl overflow-hidden cursor-pointer shadow-xl"
    >
      <img
        src={photo}
        alt={cafe.name}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

      {cafe.matchScore != null && (
        <div className="absolute top-4 right-4 bg-[#D48B3A] rounded-lg px-3 py-1.5 text-center">
          <div className="text-white font-bold text-lg leading-tight">
            {Math.round(cafe.matchScore)}%
          </div>
          <div className="text-white/80 text-[10px] font-semibold leading-tight">Match</div>
        </div>
      )}

      <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
        {open && (
          <span
            className={`text-[11px] font-bold rounded-full px-2.5 py-1 backdrop-blur-sm ${
              open.isOpen
                ? 'bg-emerald-500/90 text-white'
                : 'bg-gray-800/80 text-white'
            }`}
          >
            {open.isOpen ? '● Buka' : '● Tutup'}
            {open.isOpen && open.closesAt && ` · ${open.closesAt}`}
          </span>
        )}
        {cafe.googleRating != null && (
          <span className="bg-white/95 text-[#1C1C1A] text-[11px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1">
            <span className="text-amber-500">★</span>
            {cafe.googleRating.toFixed(1)}
            {cafe.totalGoogleReviews != null && (
              <span className="font-medium text-[#8A8880]">
                ({cafe.totalGoogleReviews.toLocaleString()})
              </span>
            )}
          </span>
        )}
      </div>

      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSave();
        }}
        className={`absolute bottom-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-lg z-20 ${
          isSaved ? 'bg-[#D48B3A]' : 'bg-white/30 hover:bg-white/50 backdrop-blur-sm'
        }`}
      >
        <span className="text-2xl text-white leading-none">{isSaved ? '★' : '☆'}</span>
      </button>

      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <h3 className="text-2xl font-bold mb-1 line-clamp-1">{cafe.name}</h3>
        <p className="text-sm text-white/80 mb-2 line-clamp-1">
          {[locality, distanceKm ? `${distanceKm} km` : null]
            .filter(Boolean)
            .join(' · ') ||
            cafe.address}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {visibleChips.map((c) => (
            <span
              key={c.key}
              className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold"
            >
              {c.icon ? `${c.icon} ${c.label}` : c.label}
            </span>
          ))}
          {overflow > 0 && (
            <span className="bg-white/30 rounded-full px-3 py-1 text-xs font-bold">
              +{overflow}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
