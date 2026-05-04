export const REVIEW_CATEGORY_LABELS: Record<string, string> = {
  overall: '⭐ Rating',
  ambiance: '🎨 Suasana',
  wfc: '💻 WFC',
  food_quality: '🍽️ Makanan',
  service: '🛎️ Pelayanan',
  value_for_money: '💰 Harga',
  kid_friendly: '👶 Ramah Anak',
  mood_me_time: '🧘 Me Time',
  'mood_me-time': '🧘 Me Time',
  mood_date: '💑 Date',
  mood_family: '👨‍👩‍👧 Family',
  mood_family_time: '👨‍👩‍👧 Family',
  mood_group_study: '📚 Group Study',
  'mood_group-work': '📚 Group Study',
  mood_wfc: '💻 WFC',
  facility_wifi: '📶 WiFi',
  facility_power_outlet: '🔌 Power',
  facility_mushola: '🕌 Mushola',
  facility_parking: '🅿️ Parking',
  facility_kid_friendly: '👶 Kid-Friendly',
  facility_quiet_atmosphere: '🤫 Quiet',
  facility_large_tables: '🪑 Large Tables',
  facility_outdoor_area: '🌿 Outdoor',
};

export function prettyReviewCategory(k: string): string {
  if (REVIEW_CATEGORY_LABELS[k]) return REVIEW_CATEGORY_LABELS[k];
  const stripped = k.replace(/^(mood_|facility_)/, '').replace(/[_-]/g, ' ');
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const isMoodCategory = (k: string) => k.startsWith('mood_');
export const isFacilityCategory = (k: string) => k.startsWith('facility_');
export const isStarCategory = (k: string) =>
  !isMoodCategory(k) && !isFacilityCategory(k);
