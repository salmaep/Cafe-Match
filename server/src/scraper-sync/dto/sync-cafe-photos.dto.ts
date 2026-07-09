import { BadRequestException } from '@nestjs/common';

export type SyncPhotoKind = 'cover' | 'gallery' | 'menu';

export interface SyncPhotoMeta {
  /** goscrap image id — 32 hex chars, stable per Google photo token */
  id: string;
  kind: SyncPhotoKind;
  order: number;
  contentType: string;
  caption?: string;
}

export interface SyncCafePhotosPayload {
  googlePlaceId: string;
  /**
   * Alternate identifiers for the same place. Existing rows were imported
   * with the 0x..:0x.. data-id format while the scraper's canonical key is
   * ChIJ..., so the lookup accepts either.
   */
  altIds: string[];
  photos: SyncPhotoMeta[];
}

const ID_RE = /^[0-9a-f]{32}$/;
const KINDS: SyncPhotoKind[] = ['cover', 'gallery', 'menu'];

/**
 * The payload arrives as a multipart text field (not the JSON body), so the
 * global ValidationPipe never sees it — validate manually here.
 */
export function parseAndValidate(raw: unknown): SyncCafePhotosPayload {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new BadRequestException('payload field is required');
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('payload is not valid JSON');
  }
  if (
    typeof parsed?.googlePlaceId !== 'string' ||
    parsed.googlePlaceId.trim() === ''
  ) {
    throw new BadRequestException('googlePlaceId is required');
  }
  if (!Array.isArray(parsed.photos) || parsed.photos.length === 0) {
    throw new BadRequestException('photos must be a non-empty array');
  }

  const seen = new Set<string>();
  let covers = 0;
  const photos: SyncPhotoMeta[] = parsed.photos.map((p: any, i: number) => {
    if (typeof p?.id !== 'string' || !ID_RE.test(p.id)) {
      throw new BadRequestException(`photos[${i}].id must be 32 hex chars`);
    }
    if (seen.has(p.id)) {
      throw new BadRequestException(`photos[${i}].id is duplicated`);
    }
    seen.add(p.id);
    if (!KINDS.includes(p.kind)) {
      throw new BadRequestException(
        `photos[${i}].kind must be one of ${KINDS.join('|')}`,
      );
    }
    if (p.kind === 'cover' && ++covers > 1) {
      throw new BadRequestException('at most one cover photo is allowed');
    }
    return {
      id: p.id,
      kind: p.kind,
      order: Number.isInteger(p.order) ? p.order : i,
      contentType: typeof p.contentType === 'string' ? p.contentType : '',
      caption:
        typeof p.caption === 'string' && p.caption.trim() !== ''
          ? p.caption.slice(0, 255)
          : undefined,
    };
  });

  const altIds: string[] = Array.isArray(parsed.altIds)
    ? parsed.altIds
        .filter((v: any) => typeof v === 'string' && v.trim() !== '')
        .map((v: string) => v.trim())
        .slice(0, 4)
    : [];

  return { googlePlaceId: parsed.googlePlaceId.trim(), altIds, photos };
}
