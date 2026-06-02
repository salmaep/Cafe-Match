export const REVIEW_CATEGORY_LABELS: Record<string, string> = {
  overall: 'Rating',
  ambiance: 'Suasana',
  wfc: 'WFC',
  food_quality: 'Makanan',
  service: 'Pelayanan',
  value_for_money: 'Harga',
  kid_friendly: 'Ramah Anak',
  mood_me_time: 'Me Time',
  'mood_me-time': 'Me Time',
  mood_date: 'Date',
  mood_family: 'Family',
  mood_family_time: 'Family',
  mood_group_study: 'Group Study',
  'mood_group-work': 'Group Study',
  mood_wfc: 'WFC',
  facility_wifi: 'WiFi',
  facility_power_outlet: 'Power',
  facility_mushola: 'Mushola',
  facility_parking: 'Parking',
  facility_kid_friendly: 'Kid-Friendly',
  facility_quiet_atmosphere: 'Quiet',
  facility_large_tables: 'Large Tables',
  facility_outdoor_area: 'Outdoor',
};

export const REVIEW_CATEGORY_ICONS: Record<string, string> = {
  overall: 'star',
  ambiance: 'palette',
  wfc: 'laptop',
  food_quality: 'utensils',
  service: 'bell',
  value_for_money: 'piggybank',
  kid_friendly: 'baby',
  mood_me_time: 'coffee',
  'mood_me-time': 'coffee',
  mood_date: 'heart',
  mood_family: 'users',
  mood_family_time: 'users',
  mood_group_study: 'bookopen',
  'mood_group-work': 'bookopen',
  mood_wfc: 'laptop',
  facility_wifi: 'wifi',
  facility_power_outlet: 'zap',
  facility_mushola: 'building2',
  facility_parking: 'squareparking',
  facility_kid_friendly: 'baby',
  facility_quiet_atmosphere: 'volumex',
  facility_large_tables: 'table2',
  facility_outdoor_area: 'trees',
};

export function prettyReviewCategory(k: string): string {
  if (REVIEW_CATEGORY_LABELS[k]) return REVIEW_CATEGORY_LABELS[k];
  const stripped = k.replace(/^(mood_|facility_)/, '').replace(/[_-]/g, ' ');
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function reviewCategoryIcon(k: string): string | undefined {
  if (REVIEW_CATEGORY_ICONS[k]) return REVIEW_CATEGORY_ICONS[k];
  if (k.startsWith('mood_')) return 'sparkles';
  if (k.startsWith('facility_')) return 'star';
  return 'star';
}

export const isMoodCategory = (k: string) => k.startsWith('mood_');
export const isFacilityCategory = (k: string) => k.startsWith('facility_');
export const isStarCategory = (k: string) =>
  !isMoodCategory(k) && !isFacilityCategory(k);
