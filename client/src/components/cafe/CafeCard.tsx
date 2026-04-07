import { Link } from 'react-router-dom';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';

function getCafeImage(cafe: Cafe): string {
  if (cafe.photos && cafe.photos.length > 0) {
    const primary = cafe.photos.find((p) => p.isPrimary);
    return (primary || cafe.photos[0]).url;
  }
  // Deterministic placeholder gradient based on cafe id
  const hue = (cafe.id * 37) % 360;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},60%,75%)"/>
        <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},50%,60%)"/>
      </linearGradient></defs>
      <rect width="200" height="120" fill="url(#g)"/>
      <text x="100" y="68" text-anchor="middle" font-size="36" fill="rgba(255,255,255,0.8)">&#9749;</text>
    </svg>`
  )}`;
}

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
        {cafe.matchScore != null && (
          <span className="text-amber-500 font-medium">
            Score: {cafe.matchScore}
          </span>
        )}
      </div>
      </div>
    </Link>
  );
}
