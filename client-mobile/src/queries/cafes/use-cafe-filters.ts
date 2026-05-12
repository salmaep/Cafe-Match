import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import { cafeKeys } from './keys';

export interface CafeFilterOption {
  key: string;
  label: string;
  count: number;
}

export interface CafeFilterGroup {
  key: string;
  label: string;
  options: CafeFilterOption[];
}

export interface CafeFiltersResponse {
  groups: CafeFilterGroup[];
}

const CATEGORY_LABELS: Record<string, string> = {
  amenity: 'Fasilitas',
  ambience: 'Suasana',
  space: 'Ruang',
  audience: 'Cocok Untuk',
  service: 'Layanan',
  payment: 'Pembayaran',
  accessibility: 'Aksesibilitas',
  uncategorized: 'Lainnya',
};

function formatFeatureLabel(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

// Server returns { groups: [{ category, items: [{ name, count }] }] };
// normalize to { groups: [{ key, label, options: [{ key, label, count }] }] }
// so consumers (WizardScreen amenities step) get a stable shape.
async function fetchCafeFilters(): Promise<CafeFiltersResponse> {
  const { data } = await http.get<any>('/cafes/filters');
  const rawGroups: any[] = data?.groups ?? [];
  return {
    groups: rawGroups.map((g: any) => ({
      key: g.category ?? g.key ?? 'uncategorized',
      label:
        CATEGORY_LABELS[g.category as string] ??
        g.label ??
        g.category ??
        'Lainnya',
      options: (g.items ?? g.options ?? []).map((it: any) => ({
        key: it.name ?? it.key,
        label: it.label ?? formatFeatureLabel(it.name ?? it.key ?? ''),
        count: typeof it.count === 'number' ? it.count : 0,
      })),
    })),
  };
}

export function useCafeFilters() {
  return useQuery({
    queryKey: cafeKeys.filters(),
    queryFn: fetchCafeFilters,
    staleTime: 60 * 60 * 1000,
  });
}
