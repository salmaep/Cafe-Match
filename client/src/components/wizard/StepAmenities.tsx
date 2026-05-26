import { useTranslation } from "react-i18next";
import { wizardText } from "@shared/i18n";
import FilterPanel from "../search/FilterPanel";
import { Star } from "../../utils/lucideIcon";

interface Props {
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
  /**
   * Feature keys auto-applied from the chosen purpose's requirements.
   * Rendered with a star marker so users see why they were preselected.
   */
  autoSelectedKeys?: string[];
}

export default function StepAmenities({
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
  autoSelectedKeys,
}: Props) {
  const { t } = useTranslation();
  const hasAutoPick = (autoSelectedKeys?.length ?? 0) > 0;

  return (
    <div className="w-full px-6 pt-6 pb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        {t(wizardText.amenitiesTitle)}
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-3">
        {hasAutoPick
          ? t(wizardText.amenitiesAutoPickSubtitle)
          : t(wizardText.amenitiesSubtitle)}
      </p>
      {hasAutoPick && (
        <div className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-[#B97726] bg-[#FDF6EC] border border-[#F2DAB6] rounded-full px-2.5 py-1 font-semibold">
          <Star size={12} strokeWidth={2.5} fill="currentColor" className="text-[#D48B3A]" />
          <span>{t(wizardText.amenitiesAutoPickBadge)}</span>
        </div>
      )}

      <FilterPanel
        variant="sidebar"
        facilities={facilities}
        onFacilitiesChange={onFacilitiesChange}
        priceRange={priceRange}
        onPriceRangeChange={onPriceRangeChange}
        autoSelectedKeys={autoSelectedKeys}
        hideHeader
      />
    </div>
  );
}
