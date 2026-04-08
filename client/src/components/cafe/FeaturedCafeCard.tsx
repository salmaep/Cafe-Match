import { Link } from 'react-router-dom';
import { analyticsApi } from '../../api/analytics.api';

interface Props {
  cafe: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  promotion: {
    content_title?: string;
    content_description?: string;
    content_photo_url?: string;
  } | null;
}

export default function FeaturedCafeCard({ cafe, promotion }: Props) {
  const hue = (cafe.id * 37) % 360;
  const imgSrc = promotion?.content_photo_url ||
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue},60%,75%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},50%,60%)"/>
        </linearGradient></defs>
        <rect width="300" height="160" fill="url(#g)"/>
        <text x="150" y="90" text-anchor="middle" font-size="40" fill="rgba(255,255,255,0.8)">&#9749;</text>
      </svg>`
    )}`;

  const handleClick = () => {
    analyticsApi.track(cafe.id, 'click').catch(() => {});
  };

  return (
    <Link
      to={`/cafe/${cafe.id}`}
      onClick={handleClick}
      className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <img src={imgSrc} alt={cafe.name} className="w-full h-32 object-cover" />
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm truncate">{cafe.name}</h3>
        {promotion?.content_title && (
          <p className="text-xs text-amber-700 font-medium mt-1 truncate">
            {promotion.content_title}
          </p>
        )}
        {promotion?.content_description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {promotion.content_description}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1 truncate">{cafe.address}</p>
      </div>
    </Link>
  );
}
