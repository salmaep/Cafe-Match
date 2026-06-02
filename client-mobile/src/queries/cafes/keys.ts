import { SearchCafesParams } from './types';

export const cafeKeys = {
  all: ['cafes'] as const,
  lists: () => [...cafeKeys.all, 'list'] as const,
  list: (params: SearchCafesParams) => [...cafeKeys.lists(), params] as const,
  details: () => [...cafeKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...cafeKeys.details(), id] as const,
  promoted: (type?: string) =>
    [...cafeKeys.all, 'promoted', type ?? 'all'] as const,
  bookmarks: () => ['bookmarks'] as const,
  favorites: () => ['favorites'] as const,
  filters: () => [...cafeKeys.all, 'filters'] as const,
  discover: (params: Record<string, unknown>) =>
    [...cafeKeys.all, 'discover', params] as const,
  autocomplete: (params: Record<string, unknown>) =>
    [...cafeKeys.all, 'autocomplete', params] as const,
};
