import { useQuery } from '@tanstack/react-query';
import {
  searchSemanticApi,
  SemanticSearchParams,
  SemanticSearchResult,
} from './api';
import { cafeKeys } from './keys';

export function useSemanticSearch(
  params: SemanticSearchParams,
  enabled: boolean,
) {
  return useQuery<SemanticSearchResult>({
    queryKey: [...cafeKeys.all, 'semantic', params],
    queryFn: () => searchSemanticApi(params),
    enabled: enabled && !!params.q && !!params.lat && !!params.lng,
    staleTime: 60_000,
  });
}
