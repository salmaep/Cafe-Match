import type { Purpose } from "../../types";
import { getPurposeBySlug } from "../../constants/purposes";
import { PurposeIcon } from "../../utils/purposeIcons";

interface Props {
  purposes: Purpose[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}

/**
 * "Tujuan" chips — bare section (no card shell of its own) so it can sit
 * inside the unified filter card (FilterRail / FilterModalMobile) with only a
 * hairline separator to the sections below. Merges the former HomePage
 * PurposeChips and TrendingPage PurposeSidebar.
 */
export default function PurposeSection({ purposes, activeId, onSelect }: Props) {
  return (
    <div className="border-b border-[#F0EDE8]">
      <div className="px-4 py-3 border-b border-[#F0EDE8]">
        <h3 className="text-sm font-bold text-[#1C1C1A]">Tujuan</h3>
        <p className="text-[11px] text-[#8A8880] mt-0.5">
          Filter by your reason
        </p>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            activeId === null
              ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
              : "bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]"
          }`}
        >
          Semua
        </button>
        {purposes.map((p) => {
          const active = activeId === p.id;
          const label = getPurposeBySlug(p.slug)?.label ?? p.name;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(active ? null : p.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? "bg-[#D48B3A] text-white border-[#D48B3A] shadow-sm"
                  : "bg-white text-[#1C1C1A] border-[#E8E4DD] hover:border-[#D48B3A] hover:text-[#D48B3A]"
              }`}
            >
              <PurposeIcon slug={p.slug} icon={p.icon} size={12} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
