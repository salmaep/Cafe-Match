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
type Size = 'normal' | 'compact';

interface Props {
  variant?: Variant;
  size?: Size;
}

export default function InFeedAd({ variant = 'card', size = 'normal' }: Props) {
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
    return variant === 'list' ? <ListPlaceholder size={size} /> : <CardPlaceholder size={size} />;
  }

  if (size === 'compact') {
    return (
      <div className="relative w-full bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-sm ring-1 ring-amber-400 overflow-hidden pt-5">
        <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded shadow">
          ⚡ Ad
        </span>
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', maxHeight: 120 }}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_INFEED_SLOT}
          {...(ADSENSE_TEST_MODE ? { 'data-adtest': 'on' } : {})}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-md ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF9F6] overflow-hidden pt-7">
      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-2.5 py-1 rounded-md shadow">
        ⚡ Ad
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
function CardPlaceholder({ size }: { size: Size }) {
  if (size === 'compact') {
    return (
      <div className="relative block bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-sm ring-1 ring-amber-400 overflow-hidden">
        <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded shadow">
          ⚡ Sponsored
        </span>
        <div className="w-full h-24 bg-amber-100/40 flex items-center justify-center">
          <span className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">Ad slot</span>
        </div>
        <div className="p-2.5">
          <h3 className="text-[13px] font-bold text-gray-900 truncate">Sponsored slot</h3>
          <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
            Set VITE_ADSENSE_* env to serve real ads.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative block bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-md ring-2 ring-amber-400 ring-offset-2 ring-offset-[#FAF9F6] overflow-hidden">
      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-2.5 py-1 rounded-md shadow">
        ⚡ Sponsored
      </span>
      <div className="w-full h-44 bg-amber-100/40 flex items-center justify-center">
        <span className="text-xs text-amber-700 uppercase tracking-wider font-semibold">Ad slot</span>
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 truncate">Sponsored slot</h3>
        <p className="text-[13px] text-gray-600 mt-1 line-clamp-2">
          Configure VITE_ADSENSE_CLIENT &amp; VITE_ADSENSE_INFEED_SLOT to serve real ads.
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">
            Sponsored
          </span>
        </div>
      </div>
    </div>
  );
}

// Placeholder that mirrors CafeListItem layout (110px photo, info, right side)
function ListPlaceholder({ size }: { size: Size }) {
  if (size === 'compact') {
    return (
      <div className="relative flex items-stretch gap-2.5 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-400 shadow-sm p-2 pt-5">
        <span className="absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-1.5 py-0.5 rounded shadow">
          ⚡ Ad
        </span>
        <div className="w-[64px] h-[64px] rounded-lg bg-amber-100/60 shrink-0 flex items-center justify-center text-[10px] text-amber-700 uppercase tracking-wider font-semibold">
          ad
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-[13px] font-bold text-[#1C1C1A] truncate">Sponsored slot</h3>
          <p className="text-[11px] text-[#5C5A52] mt-0.5 line-clamp-1">
            Set VITE_ADSENSE_* env to serve real ads.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex items-stretch gap-4 bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-400 shadow-md p-3.5 pt-7">
      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase bg-amber-400 text-stone-900 px-2 py-0.5 rounded-md shadow">
        ⚡ Ad
      </span>
      <div className="w-[110px] h-[110px] rounded-xl bg-amber-100/60 shrink-0 flex items-center justify-center text-[11px] text-amber-700 uppercase tracking-wider font-semibold">
        ad
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#1C1C1A] truncate">Sponsored slot</h3>
          <p className="text-[12px] text-[#5C5A52] mt-0.5 line-clamp-2">
            Configure VITE_ADSENSE_* env to serve real ads.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 self-start bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full px-2.5 py-0.5 mt-2">
          Sponsored
        </span>
      </div>
    </div>
  );
}
