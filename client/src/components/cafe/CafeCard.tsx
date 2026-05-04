import { Link } from 'react-router-dom';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';

interface Props {
  cafe: Cafe;
}

export default function CafeCard({ cafe }: Props) {
  return (
    <Link
      to={`/cafe/${cafe.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <img
        src={getCafeImage(cafe)}
        alt={cafe.name}
        className="w-full h-32 object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
        }}
      />
      <div className="p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{cafe.name}</h3>
          <p className="text-sm text-gray-500 truncate mt-1">{cafe.address}</p>
        </div>
        {cafe.distanceMeters != null && (
          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
            {formatDistance(cafe.distanceMeters)}
          </span>
        )}
      </div>

      <div className="flex gap-3 mt-3 text-xs text-gray-500">
        {cafe.wifiAvailable && (
          <span className="flex items-center gap-1">
            <span>WiFi</span>
            {cafe.wifiSpeedMbps && <span>({cafe.wifiSpeedMbps}Mbps)</span>}
          </span>
        )}
        {cafe.hasMushola && <span>Mushola</span>}
        <span>{cafe.priceRange}</span>
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span>{cafe.favoritesCount} favorites</span>
        <span>{cafe.bookmarksCount} bookmarks</span>
      </div>
      </div>
    </Link>
  );
}
