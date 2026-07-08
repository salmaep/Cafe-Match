import type { Purpose } from "../../types";
import FilterPanel from "./FilterPanel";
import PurposeSection from "./PurposeSection";
import { X } from "../../utils/lucideIcon";

export interface FilterRailProps {
  open: boolean;
  onClose: () => void;
  purposes: Purpose[];
  activePurposeId: number | null;
  onPurposeSelect: (id: number | null) => void;
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  autoSelectedKeys?: string[];
  /** Height budget for the internal scroller — page contexts differ. */
  maxHeightClassName?: string;
  /** Always-open contexts (Trending): render just the card, no close button. */
  hideClose?: boolean;
}

/**
 * The ONE desktop filter shell shared by HomePage & TrendingPage:
 * - a single white card (Tujuan + Harga + Fasilitas separated by hairlines,
 *   no gaps between "sections")
 * - the scrollbar lives INSIDE the card (themed, track matches the card bg)
 * - the close button sits OUTSIDE the panel at its right edge and never
 *   scrolls away (scroll happens inside the card, button is outside it)
 */
export default function FilterRail({
  open,
  onClose,
  purposes,
  activePurposeId,
  onPurposeSelect,
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  autoSelectedKeys,
  maxHeightClassName = "max-h-[calc(100vh-6rem)]",
  hideClose = false,
}: FilterRailProps) {
  if (!open) return null;

  const card = (
    <div
      className={`w-72 bg-white rounded-xl border border-[#F0EDE8] overflow-hidden flex flex-col ${maxHeightClassName}`}
    >
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
    </div>
  );

  if (hideClose) return card;

  return (
    <div className="flex items-start gap-2">
      {card}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup filter"
        className="sticky top-2 shrink-0 w-8 h-8 rounded-full bg-white/95 shadow border border-[#F0EDE8] flex items-center justify-center text-[#8A8880] hover:text-[#1C1C1A] transition-colors"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
