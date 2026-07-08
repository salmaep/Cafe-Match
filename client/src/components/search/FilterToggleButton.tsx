interface Props {
  activeCount: number;
  onClick: () => void;
  className?: string;
}

/** Floating "Filter" pill that opens the FilterRail (shared Home/Trending). */
export default function FilterToggleButton({
  activeCount,
  onClick,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buka filter"
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-lg border text-sm font-semibold transition-colors ${
        activeCount > 0
          ? "border-[#D48B3A] text-[#D48B3A]"
          : "border-[#F0EDE8] text-[#1C1C1A] hover:border-[#D48B3A]"
      } ${className}`}
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
      {activeCount > 0 && (
        <span className="bg-[#D48B3A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </button>
  );
}
