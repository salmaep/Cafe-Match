import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { cafeKeys } from './keys';
import { searchCafesApi } from './api';
import { CafeSearchResult, SearchCafesParams } from './types';

export function useSearchCafes(params: SearchCafesParams) {
  // Debounce filter changes (text input, chip toggles) so we don't hammer Meili
  // on every keystroke. Geo coords typically don't change rapidly so OK to include.
  const debounced = useDebouncedValue(params, 300);
  const limit = debounced.limit ?? 50;

  return useInfiniteQuery<CafeSearchResult>({
    queryKey: cafeKeys.list(debounced),
    queryFn: ({ pageParam }) =>
      searchCafesApi({ ...debounced, page: pageParam as number, limit }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, limit: l, total } = last.meta;
      return page * l < total ? page + 1 : undefined;
    },
    enabled: debounced.lat != null && debounced.lng != null,
    staleTime: 60_000,
  });
}
