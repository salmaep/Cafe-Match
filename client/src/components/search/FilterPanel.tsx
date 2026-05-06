import { useEffect, useMemo, useState } from "react";
import { cafesApi, type FilterGroup } from "../../api/cafes.api";

export interface FilterPanelProps {
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  // 'inline' = always-visible sidebar (desktop). 'modal' = full-screen overlay (mobile).
  variant: "inline" | "modal";
  // Only used when variant === 'modal'
  open?: boolean;
  onClose?: () => void;
}

// Module-level cache so the catalog is fetched once across mounts/remounts.
let catalogCache: FilterGroup[] | null = null;
let catalogPromise: Promise<FilterGroup[]> | null = null;

async function loadCatalog(): Promise<FilterGroup[]> {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;
  catalogPromise = cafesApi
    .getFilters()
    .then((res) => {
      catalogCache = res.data?.groups ?? [];
      return catalogCache;
    })
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

const PRICE_OPTIONS = [
  { key: "$", label: "$" },
  { key: "$$", label: "$$" },
  { key: "$$$", label: "$$$" },
];

export default function FilterPanel({
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  variant,
  open,
  onClose,
}: FilterPanelProps) {
  const [groups, setGroups] = useState<FilterGroup[] | null>(catalogCache);
  const [loading, setLoading] = useState(!catalogCache);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    amenity: true,
  });

  useEffect(() => {
    if (catalogCache) {
      setGroups(catalogCache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadCatalog()
      .then((g) => {
        if (!cancelled) {
          setGroups(g);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facilitySet = useMemo(() => new Set(facilities), [facilities]);

  const toggleFacility = (key: string) => {
    const next = new Set(facilitySet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onFacilitiesChange(Array.from(next));
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reset = () => {
    onFacilitiesChange([]);
    onPriceRangeChange("");
  };

  const activeCount = facilities.length + (priceRange ? 1 : 0);

  const body = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE8] bg-white">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1A]">Filter</h3>
          {activeCount > 0 && (
            <p className="text-[11px] text-[#8A8880] mt-0.5">
              {activeCount} filter aktif
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[#D48B3A] hover:underline font-semibold"
            >
              Reset
            </button>
          )}
          {variant === "modal" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Price range — single-select */}
        <div className="px-4 py-3 border-b border-[#F0EDE8]">
          <div className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider mb-2">
            Harga
          </div>
          <div className="flex gap-1.5">
            {PRICE_OPTIONS.map((p) => {
              const active = priceRange === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() =>
                    onPriceRangeChange(active ? "" : p.key)
                  }
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                    active
                      ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
                      : "bg-white text-[#1C1C1A] border-[#F0EDE8] hover:border-[#D48B3A]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-[#8A8880] text-center">
            Memuat filter…
          </div>
        )}

        {!loading && groups && groups.length === 0 && (
          <div className="px-4 py-6 text-sm text-[#8A8880] text-center">
            Filter tidak tersedia.
          </div>
        )}

        {!loading &&
          groups?.map((group) => {
            const isOpen = openGroups[group.key] ?? false;
            const selectedInGroup = group.options.filter((o) =>
              facilitySet.has(o.key),
            ).length;
            return (
              <div key={group.key} className="border-b border-[#F0EDE8]">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAF9F6] text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1C1C1A]">
                      {group.label}
                    </span>
                    {selectedInGroup > 0 && (
                      <span className="text-[10px] font-bold text-white bg-[#D48B3A] rounded-full px-1.5 py-0.5">
                        {selectedInGroup}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[#8A8880] text-xs transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 grid grid-cols-1 gap-1.5">
                    {group.options.map((opt) => {
                      const checked = facilitySet.has(opt.key);
                      const disabled = opt.count === 0 && !checked;
                      return (
                        <label
                          key={opt.key}
                          className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            disabled
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-[#FAF9F6]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 text-sm text-[#1C1C1A]">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleFacility(opt.key)}
                              className="w-4 h-4 rounded border-[#D6CFC2] text-[#D48B3A] focus:ring-[#D48B3A]/40"
                            />
                            {opt.label}
                          </span>
                          <span className="text-[11px] text-[#8A8880]">
                            {opt.count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {variant === "modal" && (
        <div className="border-t border-[#F0EDE8] bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#1C1C1A] hover:bg-black text-white text-sm font-bold py-2.5 rounded-lg"
          >
            Terapkan{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="bg-white rounded-xl border border-[#F0EDE8] overflow-hidden flex flex-col max-h-[60vh]">
        {body}
      </div>
    );
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end lg:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom">
        {body}
      </div>
    </div>
  );
}
