/**
 * Single source of truth for vibe / purpose options shown in the wizard.
 *
 * `slug` MUST match a row in the server `purposes` table (see
 * `server/src/database/seeds/purposes.seed.ts`). When wizard purpose is
 * selected, the slug is resolved to a numeric `purposeId` via the cached
 * purposes list in `PreferencesContext`, then passed to `cafesApi.search()`.
 */

export interface PurposeOption {
  slug: string;
  label: string;
  emoji: string;
  tagline: string;
}

export const WIZARD_PURPOSES: readonly PurposeOption[] = [
  { slug: 'me-time',     label: 'Me Time',      emoji: '🧘',  tagline: 'Tenang & nyaman sendiri' },
  { slug: 'date',        label: 'Date',         emoji: '💑',  tagline: 'Romantis berdua' },
  { slug: 'family',      label: 'Family Time',  emoji: '👨‍👩‍👧', tagline: 'Cocok bawa keluarga' },
  { slug: 'group-work',  label: 'Group Study',  emoji: '📚',  tagline: 'Belajar bareng teman' },
  { slug: 'wfc',         label: 'WFC',          emoji: '💻',  tagline: 'WiFi & power outlet siap' },
  { slug: 'meeting',     label: 'Meeting',      emoji: '🤝',  tagline: 'Diskusi serius / klien' },
  { slug: 'brainstorm',  label: 'Brainstorm',   emoji: '💡',  tagline: 'Spasi luas, bebas ngobrol' },
  { slug: 'catch-up',    label: 'Catch Up',     emoji: '☕',  tagline: 'Reuni dengan teman lama' },
  { slug: 'reading',     label: 'Reading',      emoji: '📖',  tagline: 'Sudut tenang baca buku' },
  { slug: 'quick-coffee', label: 'Quick Coffee', emoji: '⚡', tagline: 'Mampir sebentar saja' },
  { slug: 'celebration', label: 'Celebration',  emoji: '🎉',  tagline: 'Ulang tahun / spesial' },
  { slug: 'photo-spot',  label: 'Photo Spot',   emoji: '📸',  tagline: 'Estetik untuk konten' },
] as const;

export type PurposeSlug = (typeof WIZARD_PURPOSES)[number]['slug'];

const BY_SLUG: Record<string, PurposeOption> = Object.fromEntries(
  WIZARD_PURPOSES.map((p) => [p.slug, p]),
);

export function getPurposeBySlug(slug: string | undefined | null): PurposeOption | undefined {
  if (!slug) return undefined;
  return BY_SLUG[slug];
}
