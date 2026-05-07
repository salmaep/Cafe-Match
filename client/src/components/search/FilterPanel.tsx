import { useEffect, useMemo, useState } from "react";
import { cafesApi, type FilterGroup } from "../../api/cafes.api";
import { FACILITY_ICONS } from "../../utils/facilities";

export interface FilterPanelProps {
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  // 'sidebar' = always-visible left rail (desktop), all groups expanded.
  // 'modal'   = full-screen overlay (mobile), groups collapsible.
  variant: "sidebar" | "modal";
  // Only used when variant === 'modal'
  open?: boolean;
  onClose?: () => void;
  // Optional: hide internal "Filter" header (useful when embedded in wizard
  // or other contexts that already have their own title).
  hideHeader?: boolean;
  // Optional: hide price section (e.g. wizard amenities step where price
  // is configured elsewhere).
  hidePrice?: boolean;
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

interface ChipProps {
  label: string;
  active: boolean;
  count?: number;
  disabled?: boolean;
  icon?: string;
  onClick: () => void;
}

function Chip({ label, active, count, disabled, icon, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
        active
          ? "bg-[#D48B3A] text-white border-[#D48B3A] hover:bg-[#B97726] shadow-sm"
          : disabled
            ? "bg-white text-[#C9C5BD] border-[#F0EDE8] cursor-not-allowed"
            : "bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]"
      }`}
    >
      {active ? (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white text-[#D48B3A] text-[9px] font-extrabold shrink-0">
          ✓
        </span>
      ) : icon ? (
        <span className="text-sm leading-none shrink-0">{icon}</span>
      ) : null}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`text-[10px] font-bold px-1 py-px rounded ${
            active ? "bg-white/20 text-white" : "text-[#8A8880]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function FilterPanel({
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  variant,
  open,
  onClose,
  hideHeader,
  hidePrice,
}: FilterPanelProps) {
  const [groups, setGroups] = useState<FilterGroup[] | null>(catalogCache);
  const [loading, setLoading] = useState(!catalogCache);
  // For modal: collapsible groups. For sidebar: always expanded.
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
  const isSidebar = variant === "sidebar";

  // Sidebar takes natural content height (parent container handles scroll
  // via overflow-y-auto + max-h). Modal is fixed-height with internal scroll.
  const isModal = variant === "modal";

  const body = (
    <div className={isModal ? "flex flex-col h-full" : "flex flex-col"}>
      {!hideHeader && (
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
            {isModal && (
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
      )}

      <div className={isModal ? "flex-1 min-h-0 overflow-y-auto overscroll-contain" : ""}>
        {!hidePrice && (
          <div className="px-4 py-3 border-b border-[#F0EDE8]">
            <div className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider mb-2">
              Harga
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_OPTIONS.map((p) => {
                const active = priceRange === p.key;
                return (
                  <Chip
                    key={p.key}
                    label={p.label}
                    active={active}
                    onClick={() => onPriceRangeChange(active ? "" : p.key)}
                  />
                );
              })}
            </div>
          </div>
        )}

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
            const isOpen = isSidebar ? true : (openGroups[group.key] ?? false);
            const selectedInGroup = group.options.filter((o) =>
              facilitySet.has(o.key),
            ).length;

            const header = isSidebar ? (
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider">
                    {group.label}
                  </span>
                  {selectedInGroup > 0 && (
                    <span className="text-[10px] font-bold text-white bg-[#D48B3A] rounded-full px-1.5 py-0.5">
                      {selectedInGroup}
                    </span>
                  )}
                </div>
              </div>
            ) : (
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
            );

            return (
              <div key={group.key} className="border-b border-[#F0EDE8]">
                {header}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 flex flex-wrap gap-1.5">
                    {group.options.map((opt) => {
                      const checked = facilitySet.has(opt.key);
                      return (
                        <Chip
                          key={opt.key}
                          label={opt.label}
                          icon={FACILITY_ICONS[opt.key]}
                          active={checked}
                          onClick={() => toggleFacility(opt.key)}
                        />
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

  if (isSidebar) {
    return (
      <div className="bg-white rounded-xl border border-[#F0EDE8] overflow-hidden">
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
      <div className="relative bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-2xl shadow-2xl h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom">
        {body}
      </div>
    </div>
  );
}
