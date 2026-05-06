import { Link } from 'react-router-dom';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';
import { cafeUrl } from '../../utils/cafeUrl';

interface Props {
  cafe: Cafe;
}

/**
 * Compact horizontal cafe row — mirrors the mobile native MapScreen list card:
 * photo (72x72) | name + distance + tags | favorites + arrow.
 */
export default function CafeListItem({ cafe }: Props) {
  return (
    <Link
      to={cafeUrl(cafe)}
      className="flex items-center gap-3 bg-white rounded-xl border border-[#F0EDE8] p-2.5 hover:border-[#D48B3A] hover:shadow-sm transition-all"
    >
      <img
        src={getCafeImage(cafe)}
        alt={cafe.name}
        className="w-[72px] h-[72px] rounded-lg object-cover bg-[#F0EDE8] shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[#1C1C1A] truncate">
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
        {cafe.distanceMeters != null && (
          <p className="text-xs text-[#8A8880] mt-0.5">
            {formatDistance(cafe.distanceMeters)} away
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {cafe.wifiAvailable && (
            <span className="bg-[#F0EDE8] text-[#8A8880] text-[11px] font-medium rounded-full px-2 py-px">
              WiFi
            </span>
          )}
          {cafe.hasMushola && (
            <span className="bg-[#F0EDE8] text-[#8A8880] text-[11px] font-medium rounded-full px-2 py-px">
              Mushola
            </span>
          )}
          {cafe.priceRange && (
            <span className="bg-[#F0EDE8] text-[#8A8880] text-[11px] font-medium rounded-full px-2 py-px">
              {cafe.priceRange}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs font-bold text-[#D48B3A]">
          ❤️ {cafe.favoritesCount}
        </span>
        <span className="text-xl text-[#8A8880] leading-none">›</span>
      </div>
    </Link>
  );
}
