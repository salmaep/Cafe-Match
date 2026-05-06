/**
 * Slug utilities for cafe canonical URLs.
 *
 * Format: `<slugified-name>-<id>` (e.g. "kopi-kenangan-615").
 * Trailing numeric id makes ID extraction trivial on the client and keeps
 * `/cafe/615` backward compatible.
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

export function cafeSlugOrFallback(cafe: { id: number; name: string; slug?: string | null }): string {
  return cafe.slug && cafe.slug.length > 0 ? cafe.slug : buildCafeSlug(cafe.name, cafe.id);
}
