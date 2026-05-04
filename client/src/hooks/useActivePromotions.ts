import { useEffect, useState } from 'react';
import { promotionsApi } from '../api/promotions.api';
import type { Promotion } from '../types/owner';

// Module-level cache so all <SponsoredCafeSlot /> instances share the same
// fetch and we don't hammer the API once per slot.
let cache: Promotion[] | null = null;
let inflight: Promise<Promotion[]> | null = null;

async function loadPromotions(): Promise<Promotion[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = promotionsApi
    .getActive('featured_promo')
    .then((res) => {
      cache = (res.data ?? []).filter((p) => p.cafe);
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useActivePromotions() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadPromotions().then((list) => {
      if (!cancelled) setPromotions(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return promotions;
}

// Pick a stable promotion for a given slot index so the same slot always
// renders the same promo (avoids flicker on re-render and lets us round-robin).
export function pickPromotion(promotions: Promotion[], index: number): Promotion | null {
  if (promotions.length === 0) return null;
  return promotions[index % promotions.length];
}
