import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAutocomplete } from './api';
import { cafeKeys } from './keys';
import { useDebouncedValue } from '../../lib/use-debounced-value';

const DEBOUNCE_MS = 250;
const MIN_QUERY_LEN = 2;
const DEFAULT_LIMIT = 8;

/**
 * Debounced cafe-name autocomplete (mirrors web useAutocomplete). Fires once the
 * query is >= 2 chars; keepPreviousData shows the prior suggestions while the
 * next request is in flight so the dropdown doesn't flash empty.
 */
export function useAutocomplete(
  q: string,
  opts?: { lat?: number; lng?: number; limit?: number },
) {
  const debouncedQ = useDebouncedValue(q.trim(), DEBOUNCE_MS);
  const enabled = debouncedQ.length >= MIN_QUERY_LEN;
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const lat = opts?.lat;
  const lng = opts?.lng;

  const query = useQuery({
    queryKey: cafeKeys.autocomplete({ q: debouncedQ, lat, lng, limit }),
    queryFn: () => fetchAutocomplete({ q: debouncedQ, lat, lng, limit }),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return {
    suggestions: enabled ? query.data?.data ?? [] : [],
    loading: enabled && query.isFetching,
    error: query.isError,
  };
}
