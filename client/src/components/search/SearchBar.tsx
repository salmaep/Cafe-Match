import { useEffect, useState } from "react";
import { X } from "../../utils/lucideIcon";

interface Props {
  q: string;
  onQChange: (next: string) => void;
  /** Optional: fires on every keystroke (drives live autocomplete). */
  onTyping?: (next: string) => void;
  /** Optional focus/blur callbacks for dropdown visibility. */
  onFocus?: () => void;
  onBlur?: () => void;
  // Omit to hide the filter button (e.g. when an inline sidebar already exposes filters)
  onOpenFilters?: () => void;
  activeFilterCount?: number;
}

export default function SearchBar({
  q,
  onQChange,
  onTyping,
  onFocus,
  onBlur,
  onOpenFilters,
  activeFilterCount = 0,
}: Props) {
  const [local, setLocal] = useState(q);

  // Keep local mirror in sync if parent resets q externally.
  useEffect(() => {
    setLocal(q);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onQChange(local);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={local}
          onChange={(e) => {
            const v = e.target.value;
            setLocal(v);
            onTyping?.(v);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Cari kafe, alamat, fasilitas, atau menu…"
          className="w-full px-4 py-2 pl-9 pr-9 border border-[#F0EDE8] rounded-lg text-sm focus:border-[#D48B3A] focus:ring-2 focus:ring-inset focus:ring-[#D48B3A]/30 outline-none transition-colors"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8880]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {local && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLocal("");
              onTyping?.("");
              onQChange("");
            }}
            aria-label="Bersihkan pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#D6CFC2] text-white flex items-center justify-center hover:bg-[#8A8880] transition-colors"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-[#D48B3A] text-white rounded-lg text-sm font-semibold hover:bg-[#B5762E]"
      >
        Cari
      </button>
      {onOpenFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          className={`relative px-3 py-2 border rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilterCount > 0
              ? "border-[#D48B3A] text-[#D48B3A] bg-[#D48B3A]/5"
              : "border-[#F0EDE8] text-[#1C1C1A] hover:border-[#D48B3A]"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#D48B3A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </form>
  );
}
