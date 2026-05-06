import { Link } from 'react-router-dom';
import { analyticsApi } from '../../api/analytics.api';
import { placeholderImage } from '../../utils/cafeImage';
import { cafeUrl } from '../../utils/cafeUrl';

interface Props {
  cafe: {
    id: number;
    name: string;
    slug?: string | null;
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
  const fallback = placeholderImage(cafe.id);
  const imgSrc = promotion?.content_photo_url || fallback;

  const handleClick = () => {
    analyticsApi.track(cafe.id, 'click').catch(() => {});
  };

  return (
    <Link
      to={cafeUrl(cafe)}
      onClick={handleClick}
      className="flex flex-col h-full flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <img
        src={imgSrc}
        alt={cafe.name}
        className="w-full h-32 object-cover bg-[#F0EDE8]"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          if (el.src !== fallback) el.src = fallback;
        }}
      />
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
