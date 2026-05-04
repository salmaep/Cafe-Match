import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cafeKeys } from './keys';
import { toggleBookmarkApi } from './api';

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cafeId: string) => toggleBookmarkApi(cafeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cafeKeys.bookmarks() });
      qc.invalidateQueries({ queryKey: cafeKeys.lists() });
    },
  });
}
