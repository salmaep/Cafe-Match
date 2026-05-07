import { Link } from 'react-router-dom';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';
import { cafeUrl } from '../../utils/cafeUrl';
import { getOpenStatus } from '../../utils/openingHours';
import { buildFacilityChips } from '../../utils/facilities';
import { formatRating } from '../../utils/rating';

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
      className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative shrink-0">
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
      <div className="p-5 flex-1 flex flex-col">
        {/* Top: title + locality + address (fixed height per row via line-clamp/min-h) */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{cafe.name}</h3>
            <p className="text-[12px] text-gray-400 truncate mt-0.5">
              {locality || ' '}
            </p>
            <p className="text-[13px] text-gray-500 truncate mt-1">
              {cafe.address || ' '}
            </p>
          </div>
          {cafe.distanceMeters != null && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
              {formatDistance(cafe.distanceMeters)}
            </span>
          )}
        </div>

        {/* Rating row — reserves height even when no rating to keep cards uniform */}
        <div className="flex items-center gap-1 mt-2 text-xs min-h-[18px]">
          {formatRating(cafe.googleRating) && (
            <>
              <span className="text-amber-500">★</span>
              <span className="font-semibold text-gray-800">
                {formatRating(cafe.googleRating)}
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
            </>
          )}
        </div>

        {/* Chips — clamp to one line so card heights stay aligned */}
        <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px] min-h-[22px] overflow-hidden max-h-[22px]">
          {visibleChips.map((c) => (
            <span
              key={c.key}
              className="bg-[#F0EDE8] text-[#5C5A52] rounded-full px-2 py-px font-medium whitespace-nowrap"
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

        {/* Spacer pushes stats + review snippet to the bottom of the card */}
        <div className="mt-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-gray-400">
            <span className="whitespace-nowrap">❤️ {cafe.favoritesCount}</span>
            <span className="whitespace-nowrap">🔖 {cafe.bookmarksCount}</span>
            {open && !open.isOpen && open.opensAt && (
              <span className="text-amber-600 font-medium whitespace-nowrap ml-auto">
                Buka {open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `}
                {open.opensAt}
              </span>
            )}
            {open && open.isOpen && open.closesAt && (
              <span className="text-emerald-600 font-medium whitespace-nowrap ml-auto">
                Tutup {open.closesAt}
              </span>
            )}
          </div>

          {/* Review snippet — fixed height block (clamped to 2 lines) so cards
              with/without reviews stay the same total height. */}
          <div className="mt-3 pt-3 border-t border-[#F0EDE8] min-h-[54px]">
            {cafe.topReviewText ? (
              <>
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
              </>
            ) : (
              <p className="text-[11px] text-[#C9C5BD] italic">
                Belum ada ulasan — jadi yang pertama!
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
