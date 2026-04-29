import type { PurposeLabel } from '../../types/wizard';
import { PURPOSES } from './wizardData';

interface Props {
  value: PurposeLabel | undefined;
  onChange: (p: PurposeLabel) => void;
}

export default function StepPurpose({ value, onChange }: Props) {
  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">What's your vibe today?</h2>
      <p className="text-base text-[#8A8880] mb-8">Choose one that fits your mood</p>
      <div className="grid grid-cols-2 gap-2">
        {PURPOSES.map((p) => {
          const active = value === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.label)}
              className={`flex flex-col items-center justify-center py-5 px-4 rounded-xl border-2 transition-colors ${
                active
                  ? 'border-[#D48B3A] bg-[#FDF6EC]'
                  : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
              }`}
            >
              <span className="text-3xl mb-2">{p.emoji}</span>
              <span
                className={`text-sm font-semibold ${
                  active ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
                }`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
