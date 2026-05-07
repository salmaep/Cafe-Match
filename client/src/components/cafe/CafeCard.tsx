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

const VISIBLE_CHIPS = 5;

export default function CafeCard({ cafe }: Props) {
  const open = getOpenStatus(cafe.openingHours);
  const locality = cafe.district || cafe.city;
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, VISIBLE_CHIPS);
  const overflow = allChips.length - visibleChips.length;

  return (
    <Link
      to={cafeUrl(cafe)}
      className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative">
        <img
          src={getCafeImage(cafe)}
          alt={cafe.name}
          className="w-full h-44 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
          }}
        />
        {cafe.activePromotionType && (
          <span
            className={`absolute top-2.5 left-2.5 text-white text-[11px] font-bold rounded px-2 py-0.5 ${
              cafe.activePromotionType === 'new_cafe'
                ? 'bg-[#E94B4B]'
                : 'bg-[#D48B3A]'
            }`}
          >
            {cafe.activePromotionType === 'new_cafe' ? 'NEW' : 'Featured'}
          </span>
        )}
        {open && (
          <span
            className={`absolute top-2.5 right-2.5 text-[11px] font-bold rounded px-2 py-0.5 ${
              open.isOpen
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-700/80 text-white'
            }`}
          >
            {open.isOpen ? 'Open' : 'Closed'}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{cafe.name}</h3>
            {locality && (
              <p className="text-[12px] text-gray-400 truncate mt-0.5">{locality}</p>
            )}
            <p className="text-[13px] text-gray-500 truncate mt-1">{cafe.address}</p>
          </div>
          {cafe.distanceMeters != null && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
              {formatDistance(cafe.distanceMeters)}
            </span>
          )}
        </div>

        {cafe.googleRating != null && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <span className="text-amber-500">★</span>
            <span className="font-semibold text-gray-800">
              {cafe.googleRating.toFixed(1)}
            </span>
            {cafe.totalGoogleReviews != null && (
              <span className="text-gray-400">
                ({cafe.totalGoogleReviews.toLocaleString()})
              </span>
            )}
            {cafe.priceRange && (
              <>
                <span className="text-gray-300 mx-1">·</span>
                <span className="text-gray-500">{cafe.priceRange}</span>
              </>
            )}
          </div>
        )}

        {visibleChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px]">
            {visibleChips.map((c) => (
              <span
                key={c.key}
                className="bg-[#F0EDE8] text-[#5C5A52] rounded-full px-2 py-px font-medium"
              >
                {c.icon} {c.label}
              </span>
            ))}
            {overflow > 0 && (
              <span className="bg-white border border-[#E0DCD3] text-[#8A8880] rounded-full px-2 py-px font-medium">
                +{overflow}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2.5 text-[11px] text-gray-400">
          <span>❤️ {cafe.favoritesCount}</span>
          <span>🔖 {cafe.bookmarksCount}</span>
          {open && !open.isOpen && open.opensAt && (
            <span className="text-amber-600 font-medium">
              Buka {open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `}
              {open.opensAt}
            </span>
          )}
          {open && open.isOpen && open.closesAt && (
            <span className="text-emerald-600 font-medium">Tutup {open.closesAt}</span>
          )}
        </div>

        {cafe.topReviewText && (
          <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
            <p className="text-[12px] text-[#5C5A52] leading-snug line-clamp-2 italic">
              "{cafe.topReviewText}"
            </p>
            {(cafe.topReviewAuthor || cafe.topReviewRating != null) && (
              <p className="text-[11px] text-[#A8A59C] mt-1 flex items-center gap-1.5">
                {cafe.topReviewRating != null && (
                  <span className="font-semibold text-amber-500">
                    ★ {cafe.topReviewRating}
                  </span>
                )}
                {cafe.topReviewAuthor && (
                  <span className="truncate">— {cafe.topReviewAuthor}</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
