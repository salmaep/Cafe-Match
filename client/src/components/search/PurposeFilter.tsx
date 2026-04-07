import { useState, useEffect } from 'react';
import type { Purpose } from '../../types';
import { purposesApi } from '../../api/purposes.api';

const ICONS: Record<string, string> = {
  coffee: '\u2615',
  heart: '\u2764\uFE0F',
  users: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
  'book-open': '\uD83D\uDCDA',
  laptop: '\uD83D\uDCBB',
};

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
      {purposes.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
            selectedPurposeId === p.id
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
          }`}
        >
          {ICONS[p.icon || ''] || ''} {p.name}
        </button>
      ))}
    </div>
  );
}
