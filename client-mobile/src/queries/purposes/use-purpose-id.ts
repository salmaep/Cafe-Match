import { useMemo } from 'react';
import { Purpose } from '../../types';
import { PURPOSE_SLUG_MAP } from '../../constant/purpose';
import { usePurposes } from './use-purposes';

/**
 * Resolve a UI Purpose label to the server-assigned numeric ID by looking up
 * the slug in the cached `/purposes` response. Returns `undefined` while the
 * query is loading or if the purpose is not in the server catalog.
 *
 * Why: server seed IDs are not guaranteed stable across reseeds; deriving
 * from the API response keeps the client correct without manual sync.
 */
export function usePurposeId(label: Purpose | null | undefined): number | undefined {
  const { data } = usePurposes();
  return useMemo(() => {
    if (!label || !data) return undefined;
    const slug = PURPOSE_SLUG_MAP[label];
    if (!slug) return undefined;
    return data.find((p) => p.slug === slug)?.id;
  }, [label, data]);
}
