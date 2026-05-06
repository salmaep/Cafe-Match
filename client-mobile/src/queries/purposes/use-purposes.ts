import { useQuery } from '@tanstack/react-query';
import { fetchPurposes } from '../../services/api';

export const purposeKeys = {
  all: ['purposes'] as const,
};

/**
 * Fetch the canonical purpose list from the server (`GET /purposes`).
 * Cached aggressively — purposes are seed data that rarely change.
 */
export function usePurposes() {
  return useQuery({
    queryKey: purposeKeys.all,
    queryFn: fetchPurposes,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}
