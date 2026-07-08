import type { Purpose } from "../../types";
import FilterPanel from "./FilterPanel";
import PurposeSection from "./PurposeSection";
import { X } from "../../utils/lucideIcon";

interface Props {
  purposes: Purpose[];
  activePurposeId: number | null;
  onPurposeSelect: (id: number | null) => void;
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  autoSelectedKeys?: string[];
  onClose: () => void;
  /** Breakpoint at which the modal hides (Home uses md, Trending lg). */
  breakpoint?: "md" | "lg";
}

// Literal class names — Tailwind can't build dynamic ones.
const HIDE_AT = { md: "md:hidden", lg: "lg:hidden" } as const;

/**
 * The ONE mobile filter bottom-sheet shared by HomePage & TrendingPage
 * (replaces both pages' near-identical local MobileFilterModal).
 */
export default function FilterModalMobile({
  purposes,
  activePurposeId,
  onPurposeSelect,
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  autoSelectedKeys,
  onClose,
  breakpoint = "md",
}: Props) {
  return (
    <div
      className={`${HIDE_AT[breakpoint]} fixed inset-0 z-[1100] flex items-end justify-center`}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full rounded-t-2xl shadow-2xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE8]">
          <h3 className="text-base font-bold text-[#1C1C1A]">Filter</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-themed [--sb-track:#FFFFFF]">
          <PurposeSection
            purposes={purposes}
            activeId={activePurposeId}
            onSelect={onPurposeSelect}
          />
          <FilterPanel
            variant="sidebar"
            bare
            facilities={facilities}
            onFacilitiesChange={onFacilitiesChange}
            priceRange={priceRange}
            onPriceRangeChange={onPriceRangeChange}
            autoSelectedKeys={autoSelectedKeys}
          />
        </div>

        <div className="border-t border-[#F0EDE8] bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#1C1C1A] hover:bg-black text-white text-sm font-bold py-2.5 rounded-lg"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
