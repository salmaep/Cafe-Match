/**
 * Slug helpers for cafe canonical URLs.
 *
 * Format: `<slugified-name>-<id>` (mirrors server/src/common/utils/slug.util.ts).
 * The trailing numeric id lets the client recover the cafe id from any slug
 * shape — even old `/cafe/615` links — so we keep ID-based fetching unchanged.
 */

export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'cafe'
  );
}

export function buildCafeSlug(name: string, id: number | string): string {
  return `${slugifyName(name)}-${id}`;
}

export function cafeUrl(cafe: { id: number; name: string; slug?: string | null }): string {
  const slug = cafe.slug && cafe.slug.length > 0 ? cafe.slug : buildCafeSlug(cafe.name, cafe.id);
  return `/cafe/${slug}`;
}

/**
 * Pulls the trailing numeric id off the slug. Returns null when no digits are
 * found (treat as 404 upstream).
 */
export function extractCafeIdFromSlug(slug: string | undefined | null): number | null {
  if (!slug) return null;
  const match = slug.match(/(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}
