import { useState, useEffect } from "react";
import type { Purpose } from "../../types";
import { purposesApi } from "../../api/purposes.api";
import { getPurposeBySlug } from "../../constants/purposes";
import { LucideIcon } from "../../utils/lucideIcon";

interface Props {
  selectedPurposeId: number | null;
  onSelect: (purposeId: number | null) => void;
}

export default function PurposeFilter({ selectedPurposeId, onSelect }: Props) {
  const [purposes, setPurposes] = useState<Purpose[]>([]);

  useEffect(() => {
    purposesApi.getAll().then((res) => setPurposes(res.data));
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
          selectedPurposeId === null
            ? "bg-amber-600 text-white border-amber-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
        }`}
      >
        All Cafes
      </button>
      {purposes.map((p) => {
        // Server purpose.icon is a lucide-style name (e.g. "coffee"). Resolve
        // it via LucideIcon. When the server hasn't set one yet, fall back to
        // the bundled WIZARD_PURPOSES emoji so the chip never renders blank.
        const wizard = getPurposeBySlug(p.slug);
        const label = p.name || wizard?.label || p.slug;
        const active = selectedPurposeId === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
              active
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
            }`}
          >
            {p.icon ? (
              <LucideIcon name={p.icon} size={14} strokeWidth={2} />
            ) : wizard?.emoji ? (
              <span className="text-sm leading-none">{wizard.emoji}</span>
            ) : (
              <LucideIcon size={14} strokeWidth={2} />
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
