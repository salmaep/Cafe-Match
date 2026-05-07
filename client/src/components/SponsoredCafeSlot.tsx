import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { placeholderImage } from '../utils/cafeImage';
import { cafeUrl } from '../utils/cafeUrl';
import { useActivePromotions, pickPromotion } from '../hooks/useActivePromotions';
import InFeedAd from './InFeedAd';

type Variant = 'card' | 'list';
type Size = 'normal' | 'compact';

interface Props {
  // Index in the host feed — used to pick a stable, round-robin promotion
  // so two slots in the same feed don't show the same cafe.
  slotIndex: number;
  variant?: Variant;
  size?: Size;
}

export default function SponsoredCafeSlot({ slotIndex, variant = 'card', size = 'normal' }: Props) {
  const promotions = useActivePromotions();

  // Still loading — show a neutral skeleton-ish placeholder so layout doesn't shift.
  if (promotions === null) {
    return variant === 'list' ? <ListSkeleton /> : <CardSkeleton />;
  }

  // No internal promo inventory — fall back to AdSense.
  const promo = pickPromotion(promotions, slotIndex);
  if (!promo || !promo.cafe) {
    return <InFeedAd variant={variant} size={size} />;
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
      size={size}
    />
  ) : (
    <CardView
      to={href}
      photo={photo}
      headline={headline}
      subline={subline}
      cafeName={cafe.name}
      onClick={handleClick}
      size={size}
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
  size,
}: {
  to: string;
  photo: string;
  headline: string;
  subline: string;
  cafeName: string;
  onClick: () => void;
  size: Size;
}) {
  if (size === 'compact') {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="relative block bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-sm ring-1 ring-amber-400 overflow-hidden hover:shadow-md hover:ring-amber-500 transition-all"
      >
        <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded shadow">
          ⚡ Sponsored
        </span>
        <img src={photo} alt={cafeName} className="w-full h-24 object-cover bg-[#F0EDE8]" />
        <div className="p-2.5">
          <h3 className="text-[13px] font-bold text-gray-900 truncate">{headline}</h3>
          <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">{subline}</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5 truncate">
              📍 {cafeName}
            </span>
            <span className="shrink-0 text-[10px] font-bold text-amber-700 ml-1">Lihat →</span>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      onClick={onClick}
      className="relative block bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-md ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF9F6] overflow-hidden hover:shadow-xl hover:ring-amber-500 transition-all"
    >
      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-2.5 py-1 rounded-md shadow">
        ⚡ Sponsored
      </span>
      <img src={photo} alt={cafeName} className="w-full h-44 object-cover bg-[#F0EDE8]" />
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 truncate">{headline}</h3>
        <p className="text-[13px] text-gray-600 line-clamp-2 mt-1">{subline}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">
            📍 {cafeName}
          </span>
          <span className="text-xs font-bold text-amber-700">Lihat detail →</span>
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
  size,
}: {
  to: string;
  photo: string;
  headline: string;
  subline: string;
  cafeName: string;
  onClick: () => void;
  size: Size;
}) {
  if (size === 'compact') {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="relative flex items-stretch gap-2.5 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-400 shadow-sm p-2 pt-5 hover:border-amber-500 hover:shadow-md transition-all"
      >
        <span className="absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded shadow">
          ⚡ Sponsored
        </span>
        <img
          src={photo}
          alt={cafeName}
          className="w-[64px] h-[64px] rounded-lg object-cover bg-[#F0EDE8] shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-[13px] font-bold text-[#1C1C1A] truncate">{headline}</h3>
          <p className="text-[11px] text-[#5C5A52] mt-0.5 line-clamp-1">{subline}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full px-1.5 py-0 truncate">
              📍 {cafeName}
            </span>
            <span className="shrink-0 text-[10px] font-bold text-amber-700 ml-1">Lihat →</span>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      onClick={onClick}
      className="relative flex items-stretch gap-4 bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-400 shadow-md p-3.5 pt-7 hover:border-amber-500 hover:shadow-lg transition-all"
    >
      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-2 py-0.5 rounded-md shadow">
        ⚡ Sponsored
      </span>
      <img
        src={photo}
        alt={cafeName}
        className="w-[110px] h-[110px] rounded-xl object-cover bg-[#F0EDE8] shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#1C1C1A] truncate">{headline}</h3>
          <p className="text-[12px] text-[#5C5A52] mt-0.5 line-clamp-2">{subline}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full px-2.5 py-0.5">
            📍 {cafeName}
          </span>
          <span className="text-[11px] font-bold text-amber-700">Lihat →</span>
        </div>
      </div>
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
