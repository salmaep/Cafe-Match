import { RADIUS_OPTIONS } from './wizardData';

interface Props {
  value: number;
  onChange: (r: number) => void;
}

export default function StepRadius({ value, onChange }: Props) {
  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">How far are you willing to go?</h2>
      <p className="text-base text-[#8A8880] mb-8">Select your search radius</p>

      <div className="flex gap-2 mb-8">
        {RADIUS_OPTIONS.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={`flex-1 py-4 rounded-xl border-2 transition-colors ${
                active
                  ? 'border-[#D48B3A] bg-[#FDF6EC]'
                  : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
              }`}
            >
              <span
                className={`text-base font-bold ${
                  active ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
                }`}
              >
                {r} km
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center h-44 relative">
        <div
          className="absolute rounded-full border-2 transition-all duration-300"
          style={{
            width: `${value * 80}px`,
            height: `${value * 80}px`,
            backgroundColor: 'rgba(212, 139, 58, 0.1)',
            borderColor: 'rgba(212, 139, 58, 0.3)',
          }}
        />
        <span className="text-2xl relative">📍</span>
      </div>
    </div>
  );
}
