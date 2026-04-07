interface Props {
  radius: number;
  onChange: (radius: number) => void;
}

export default function RadiusSlider({ radius, onChange }: Props) {
  const km = (radius / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 whitespace-nowrap">Radius</span>
      <input
        type="range"
        min={500}
        max={10000}
        step={500}
        value={radius}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-amber-600 cursor-pointer"
      />
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap min-w-[52px] text-center">
        {km} km
      </span>
    </div>
  );
}
