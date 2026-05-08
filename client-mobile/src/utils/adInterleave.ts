export const AD_INTERVAL = 5;

export type AdMarker = { kind: 'ad'; key: string };
export type WithAd<T> = { kind: 'item'; data: T } | AdMarker;

interface InterleaveOptions {
  /** Number of items between ads. Default 5. */
  interval?: number;
  /** Cap on total ads inserted. Default unlimited. */
  maxAds?: number;
}

export function interleaveAds<T>(
  items: T[],
  intervalOrOptions: number | InterleaveOptions = AD_INTERVAL,
): WithAd<T>[] {
  const opts: InterleaveOptions =
    typeof intervalOrOptions === 'number'
      ? { interval: intervalOrOptions }
      : intervalOrOptions;
  const interval = opts.interval ?? AD_INTERVAL;
  const maxAds = opts.maxAds ?? Infinity;

  const out: WithAd<T>[] = [];
  let adsInserted = 0;
  items.forEach((data, idx) => {
    out.push({ kind: 'item', data });
    if (
      adsInserted < maxAds &&
      (idx + 1) % interval === 0 &&
      idx !== items.length - 1
    ) {
      out.push({ kind: 'ad', key: `ad-${adsInserted}` });
      adsInserted++;
    }
  });
  return out;
}
