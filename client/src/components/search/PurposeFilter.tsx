import { useState, useEffect } from 'react';
import type { Purpose } from '../../types';
import { purposesApi } from '../../api/purposes.api';
import { getPurposeBySlug } from '../../constants/purposes';

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
            ? 'bg-amber-600 text-white border-amber-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
        }`}
      >
        All Cafes
      </button>
      {purposes.map((p) => {
        // Source of truth = WIZARD_PURPOSES (label + emoji). Fall back to server values
        // if the slug isn't in the wizard catalog (forward-compat for new server purposes).
        const wizard = getPurposeBySlug(p.slug);
        const label = wizard?.label ?? p.name;
        const emoji = wizard?.emoji ?? '';
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
              selectedPurposeId === p.id
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
            }`}
          >
            {emoji} {label}
          </button>
        );
      })}
    </div>
  );
}
