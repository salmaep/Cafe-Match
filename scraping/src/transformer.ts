/**
 * Transform Google Places API response into a CafeMatch-compatible shape.
 * This is the raw scraped format — NOT the final database format.
 * A separate seeder (not in this project) will map this into the DB schema.
 */

export interface ScrapedCafe {
  google_place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  google_maps_url: string;
  website: string | null;
  opening_hours: Record<string, string> | null;
  price_level: number | null;       // 0-4 from Google
  rating: number | null;            // 1.0-5.0
  total_ratings: number | null;
  photos: { reference: string; width: number; height: number }[];
  types: string[];
  reviews: { author: string; rating: number; text: string; time: number }[];
  scraped_at: string;               // ISO timestamp
}

const DAY_MAP: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function parseOpeningHours(periods: any[] | undefined): Record<string, string> | null {
  if (!periods || periods.length === 0) return null;
  const hours: Record<string, string> = {};
  for (const p of periods) {
    const day = DAY_MAP[p.open?.day];
    if (!day) continue;
    const open = p.open?.time || '0000';
    const close = p.close?.time || '2359';
    const fmt = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`;
    hours[day] = `${fmt(open)}-${fmt(close)}`;
  }
  return Object.keys(hours).length > 0 ? hours : null;
}

/**
 * Transform a Google Place Details result into our ScrapedCafe format.
 * `nearbyResult` provides the place_id and basic location if details are sparse.
 */
export function transformPlace(nearbyResult: any, detailResult: any | null): ScrapedCafe {
  const detail = detailResult || {};
  const geo = detail.geometry?.location || nearbyResult.geometry?.location || {};

  return {
    google_place_id: nearbyResult.place_id,
    name: detail.name || nearbyResult.name || 'Unknown',
    address: detail.formatted_address || nearbyResult.vicinity || '',
    latitude: geo.lat || 0,
    longitude: geo.lng || 0,
    phone: detail.formatted_phone_number || null,
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${nearbyResult.place_id}`,
    website: detail.website || null,
    opening_hours: parseOpeningHours(detail.opening_hours?.periods),
    price_level: detail.price_level ?? nearbyResult.price_level ?? null,
    rating: detail.rating ?? nearbyResult.rating ?? null,
    total_ratings: detail.user_ratings_total ?? nearbyResult.user_ratings_total ?? null,
    photos: (detail.photos || nearbyResult.photos || []).slice(0, 5).map((p: any) => ({
      reference: p.photo_reference,
      width: p.width,
      height: p.height,
    })),
    types: detail.types || nearbyResult.types || [],
    reviews: (detail.reviews || []).map((r: any) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time,
    })),
    scraped_at: new Date().toISOString(),
  };
}
