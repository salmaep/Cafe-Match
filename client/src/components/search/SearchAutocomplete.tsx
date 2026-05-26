import type { AutocompleteHit } from "../../api/cafes.api";
import { Clock, MapPin, X } from "../../utils/lucideIcon";

interface Props {
  q: string;
  open: boolean;
  suggestions: AutocompleteHit[];
  loading: boolean;
  history: string[];
  onPickRecent: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecent: () => void;
  /** Required: parent decides navigation (may intercept for out-of-radius prompt). */
  onPickSuggestion: (hit: AutocompleteHit) => void;
}

export default function SearchAutocomplete({
  q,
  open,
  suggestions,
  loading,
  history,
  onPickRecent,
  onRemoveRecent,
  onClearRecent,
  onPickSuggestion,
}: Props) {
  const showRecent = q.trim().length === 0 && history.length > 0;
  const showSuggestions = q.trim().length >= 2;

  if (!open) return null;
  if (!showRecent && !showSuggestions) return null;

  return (
    <div
      // onMouseDown intercept prevents the input's blur from firing before
      // the click lands — without this, items would never get their onClick.
      onMouseDown={(e) => e.preventDefault()}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#F0EDE8] shadow-lg z-50 overflow-y-auto max-h-[min(60vh,420px)] overscroll-contain"
    >
      {showRecent && (
        <div className="py-2">
          <div className="px-4 pb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#8A8880]">
              Pencarian terakhir
            </span>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[11px] font-semibold text-[#D48B3A] hover:underline"
            >
              Bersihkan
            </button>
          </div>
          <ul>
            {history.map((term) => (
              <li
                key={term}
                className="group flex items-center gap-3 px-4 py-2 hover:bg-[#FAF8F3] cursor-pointer"
                onClick={() => onPickRecent(term)}
              >
                <Clock size={14} strokeWidth={2} className="text-[#8A8880] shrink-0" />
                <span className="flex-1 text-sm text-[#1C1C1A] truncate">
                  {term}
                </span>
                <button
                  type="button"
                  aria-label={`Hapus '${term}' dari riwayat`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(term);
                  }}
                  className="p-1 rounded hover:bg-[#F0EDE8] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} strokeWidth={2.5} className="text-[#8A8880]" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showSuggestions && (
        <div className="py-2">
          <div className="px-4 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#8A8880]">
              Cafe
            </span>
          </div>
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#8A8880]">Mencari...</span>
            </div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-xs text-[#8A8880]">
              Tidak ada saran untuk "{q}".
            </div>
          )}
          {suggestions.length > 0 && (
            <ul>
              {suggestions.map((hit) => {
                const locality = [hit.district, hit.city]
                  .filter(Boolean)
                  .join(", ");
                const distance =
                  hit.distanceMeters != null
                    ? `${(hit.distanceMeters / 1000).toFixed(1)} km`
                    : null;
                return (
                  <li
                    key={hit.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#FAF8F3] cursor-pointer"
                    onClick={() => onPickSuggestion(hit)}
                  >
                    <MapPin
                      size={14}
                      strokeWidth={2}
                      className="text-[#D48B3A] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#1C1C1A] truncate">
                        {hit.name}
                      </div>
                      {locality && (
                        <div className="text-[11px] text-[#8A8880] truncate">
                          {locality}
                        </div>
                      )}
                    </div>
                    {distance && (
                      <span className="text-[11px] text-[#8A8880] shrink-0">
                        {distance}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
