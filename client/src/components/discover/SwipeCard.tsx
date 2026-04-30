import { useNavigate } from 'react-router-dom';
import type { Cafe } from '../../types';
import { getCafeImage, placeholderImage } from '../../utils/cafeImage';

interface Props {
  cafe: Cafe;
  isSaved: boolean;
  onSave: () => void;
}

export default function SwipeCard({ cafe, isSaved, onSave }: Props) {
  const navigate = useNavigate();
  const photo = getCafeImage(cafe);
  const distanceKm =
    cafe.distanceMeters != null
      ? (cafe.distanceMeters / 1000).toFixed(1)
      : null;

  const facilityChips: string[] = [];
  if (cafe.wifiAvailable) facilityChips.push('WiFi');
  if (cafe.hasMushola) facilityChips.push('Mushola');
  if (cafe.priceRange) facilityChips.push(cafe.priceRange);

  return (
    <div
      onClick={() => navigate(`/cafe/${cafe.id}`)}
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
        {distanceKm && <p className="text-sm text-white/80 mb-2">{distanceKm} km away</p>}
        {!distanceKm && cafe.address && (
          <p className="text-sm text-white/80 mb-2 line-clamp-1">{cafe.address}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {facilityChips.slice(0, 4).map((f) => (
            <span
              key={f}
              className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
