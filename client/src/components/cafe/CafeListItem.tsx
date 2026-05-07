import { Link } from 'react-router-dom';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';
import { cafeUrl } from '../../utils/cafeUrl';
import { getOpenStatus } from '../../utils/openingHours';
import { buildFacilityChips } from '../../utils/facilities';

interface Props {
  cafe: Cafe;
}

const VISIBLE_CHIPS = 4;

export default function CafeListItem({ cafe }: Props) {
  const open = getOpenStatus(cafe.openingHours);
  const locality = cafe.district || cafe.city;
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, VISIBLE_CHIPS);
  const overflow = allChips.length - visibleChips.length;

  return (
    <Link
      to={cafeUrl(cafe)}
      className="flex items-stretch gap-4 bg-white rounded-2xl border border-[#F0EDE8] p-3.5 hover:border-[#D48B3A] hover:shadow-md transition-all"
    >
      <img
        src={getCafeImage(cafe)}
        alt={cafe.name}
        className="w-[110px] h-[110px] rounded-xl object-cover bg-[#F0EDE8] shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-[#1C1C1A] truncate">
            {cafe.name}
          </h3>
          {cafe.activePromotionType === 'new_cafe' && (
            <span className="shrink-0 bg-[#E94B4B] text-white text-[10px] font-bold rounded px-1.5 py-px">
              NEW
            </span>
          )}
          {cafe.activePromotionType === 'featured_promo' && (
            <span className="shrink-0 bg-[#D48B3A] text-white text-[10px] font-bold rounded px-1.5 py-px">
              Featured
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-[12px] text-[#8A8880]">
          {cafe.googleRating != null && (
            <>
              <span className="text-amber-500">★</span>
              <span className="font-semibold text-[#1C1C1A]">
                {cafe.googleRating.toFixed(1)}
              </span>
              {cafe.totalGoogleReviews != null && (
                <span>({cafe.totalGoogleReviews.toLocaleString()})</span>
              )}
              <span className="text-[#D9D6CE]">·</span>
            </>
          )}
          {cafe.priceRange && <span>{cafe.priceRange}</span>}
          {cafe.distanceMeters != null && (
            <>
              <span className="text-[#D9D6CE]">·</span>
              <span>{formatDistance(cafe.distanceMeters)}</span>
            </>
          )}
        </div>

        {locality && (
          <p className="text-[12px] text-[#A8A59C] truncate mt-0.5">{locality}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {open && (
            <span
              className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                open.isOpen
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {open.isOpen
                ? open.closesAt
                  ? `Buka · tutup ${open.closesAt}`
                  : 'Buka'
                : open.opensAt
                  ? `Tutup · buka ${open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `}${open.opensAt}`
                  : 'Tutup'}
            </span>
          )}
          {visibleChips.map((c) => (
            <span
              key={c.key}
              className="bg-[#F0EDE8] text-[#5C5A52] text-[11px] font-medium rounded-full px-2 py-0.5"
            >
              {c.icon} {c.label}
            </span>
          ))}
          {overflow > 0 && (
            <span className="bg-white border border-[#E0DCD3] text-[#8A8880] text-[11px] font-medium rounded-full px-2 py-0.5">
              +{overflow}
            </span>
          )}
        </div>

        {cafe.topReviewText && (
          <p className="text-[12px] text-[#5C5A52] leading-snug mt-2 line-clamp-2 italic">
            <span className="text-[#8A8880] not-italic">💬</span> "{cafe.topReviewText}"
            {cafe.topReviewAuthor && (
              <span className="not-italic text-[#A8A59C]"> — {cafe.topReviewAuthor}</span>
            )}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end justify-between py-0.5">
        <span className="text-sm font-bold text-[#D48B3A]">
          ❤️ {cafe.favoritesCount}
        </span>
        <span className="text-2xl text-[#8A8880] leading-none">›</span>
      </div>
    </Link>
  );
}
