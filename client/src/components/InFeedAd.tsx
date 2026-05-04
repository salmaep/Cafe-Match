import { useEffect, useRef } from 'react';
import {
  ADSENSE_CLIENT,
  ADSENSE_ENABLED,
  ADSENSE_INFEED_SLOT,
  ADSENSE_TEST_MODE,
} from '../config/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Variant = 'card' | 'list';

interface Props {
  variant?: Variant;
}

export default function InFeedAd({ variant = 'card' }: Props) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_ENABLED || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet — placeholder will stay visible
    }
  }, []);

  if (!ADSENSE_ENABLED) {
    return variant === 'list' ? <ListPlaceholder /> : <CardPlaceholder />;
  }

  return (
    <div className="relative w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <span className="absolute top-2 left-2 z-10 text-[10px] font-bold tracking-wider bg-amber-300 text-stone-800 px-1.5 py-0.5 rounded">
        Ad
      </span>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_INFEED_SLOT}
        {...(ADSENSE_TEST_MODE ? { 'data-adtest': 'on' } : {})}
      />
    </div>
  );
}

// Placeholder that mirrors CafeCard layout (image on top, info below)
function CardPlaceholder() {
  return (
    <div className="relative block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <span className="absolute top-2 left-2 z-10 text-[10px] font-bold tracking-wider bg-amber-300 text-stone-800 px-1.5 py-0.5 rounded">
        Ad
      </span>
      <div className="w-full h-32 bg-[#F0EDE8] flex items-center justify-center">
        <span className="text-[11px] text-[#8A8880] uppercase tracking-wider">Sponsored</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 truncate">Sponsored slot</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          Configure VITE_ADSENSE_CLIENT &amp; VITE_ADSENSE_INFEED_SLOT to serve real ads.
        </p>
        <div className="flex gap-3 mt-3 text-xs text-gray-400">
          <span>Sponsored</span>
        </div>
      </div>
    </div>
  );
}

// Placeholder that mirrors CafeListItem layout (72x72 photo, info, right side)
function ListPlaceholder() {
  return (
    <div className="relative flex items-center gap-3 bg-white rounded-xl border border-[#F0EDE8] p-2.5">
      <span className="absolute top-1 left-1 z-10 text-[9px] font-bold tracking-wider bg-amber-300 text-stone-800 px-1 py-0.5 rounded">
        Ad
      </span>
      <div className="w-[72px] h-[72px] rounded-lg bg-[#F0EDE8] shrink-0 flex items-center justify-center text-[10px] text-[#8A8880] uppercase tracking-wider">
        ad
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-[#1C1C1A] truncate">Sponsored slot</h3>
        <p className="text-xs text-[#8A8880] mt-0.5 truncate">
          Configure VITE_ADSENSE_* env to serve real ads.
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="bg-[#F0EDE8] text-[#8A8880] text-[11px] font-medium rounded-full px-2 py-px">
            Sponsored
          </span>
        </div>
      </div>
    </div>
  );
}
