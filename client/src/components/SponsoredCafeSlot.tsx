import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { placeholderImage } from '../utils/cafeImage';
import { cafeUrl } from '../utils/cafeUrl';
import { useActivePromotions, pickPromotion } from '../hooks/useActivePromotions';
import InFeedAd from './InFeedAd';

type Variant = 'card' | 'list';

interface Props {
  // Index in the host feed — used to pick a stable, round-robin promotion
  // so two slots in the same feed don't show the same cafe.
  slotIndex: number;
  variant?: Variant;
}

export default function SponsoredCafeSlot({ slotIndex, variant = 'card' }: Props) {
  const promotions = useActivePromotions();

  // Still loading — show a neutral skeleton-ish placeholder so layout doesn't shift.
  if (promotions === null) {
    return variant === 'list' ? <ListSkeleton /> : <CardSkeleton />;
  }

  // No internal promo inventory — fall back to AdSense.
  const promo = pickPromotion(promotions, slotIndex);
  if (!promo || !promo.cafe) {
    return <InFeedAd variant={variant} />;
  }

  const cafe = promo.cafe;
  const photo = promo.contentPhotoUrl || placeholderImage(cafe.id);
  const headline = promo.contentTitle || cafe.name;
  const subline = promo.contentDescription || cafe.address;

  const handleClick = () => {
    analyticsApi.track(cafe.id, 'click', promo.id).catch(() => {});
  };

  const href = cafeUrl(cafe);

  return variant === 'list' ? (
    <ListView
      to={href}
      photo={photo}
      headline={headline}
      subline={subline}
      cafeName={cafe.name}
      onClick={handleClick}
    />
  ) : (
    <CardView
      to={href}
      photo={photo}
      headline={headline}
      subline={subline}
      cafeName={cafe.name}
      onClick={handleClick}
    />
  );
}

function CardView({
  to,
  photo,
  headline,
  subline,
  cafeName,
  onClick,
}: {
  to: string;
  photo: string;
  headline: string;
  subline: string;
  cafeName: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="relative block bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <span className="absolute top-2 left-2 z-10 text-[10px] font-bold tracking-wider bg-amber-300 text-stone-800 px-1.5 py-0.5 rounded">
        Sponsored
      </span>
      <img
        src={photo}
        alt={cafeName}
        className="w-full h-32 object-cover bg-[#F0EDE8]"
      />
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 truncate">{headline}</h3>
        <p className="text-sm text-gray-500 truncate mt-1">{subline}</p>
        <div className="flex gap-3 mt-3 text-xs text-amber-700 font-medium">
          <span>📍 {cafeName}</span>
        </div>
      </div>
    </Link>
  );
}

function ListView({
  to,
  photo,
  headline,
  subline,
  cafeName,
  onClick,
}: {
  to: string;
  photo: string;
  headline: string;
  subline: string;
  cafeName: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="relative flex items-center gap-3 bg-white rounded-xl border border-amber-200 p-2.5 hover:border-amber-400 hover:shadow-sm transition-all"
    >
      <span className="absolute top-1 left-1 z-10 text-[9px] font-bold tracking-wider bg-amber-300 text-stone-800 px-1 py-0.5 rounded">
        Sponsored
      </span>
      <img
        src={photo}
        alt={cafeName}
        className="w-[72px] h-[72px] rounded-lg object-cover bg-[#F0EDE8] shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-[#1C1C1A] truncate">{headline}</h3>
        <p className="text-xs text-[#8A8880] mt-0.5 line-clamp-1">{subline}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-full px-2 py-px">
            📍 {cafeName}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-xl text-[#8A8880] leading-none">›</span>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="w-full h-32 bg-[#F0EDE8] animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 bg-[#F0EDE8] rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-[#F0EDE8] rounded animate-pulse" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F0EDE8] p-2.5">
      <div className="w-[72px] h-[72px] rounded-lg bg-[#F0EDE8] shrink-0 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-[#F0EDE8] rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-[#F0EDE8] rounded animate-pulse" />
      </div>
    </div>
  );
}
