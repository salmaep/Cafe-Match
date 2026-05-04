export const AD_INTERVAL = 5;

export type AdMarker = { kind: 'ad'; key: string };
export type WithAd<T> = { kind: 'item'; data: T } | AdMarker;

export function interleaveAds<T>(items: T[], interval: number = AD_INTERVAL): WithAd<T>[] {
  const out: WithAd<T>[] = [];
  items.forEach((data, idx) => {
    out.push({ kind: 'item', data });
    if ((idx + 1) % interval === 0 && idx !== items.length - 1) {
      out.push({ kind: 'ad', key: `ad-${idx}` });
    }
  });
  return out;
}
