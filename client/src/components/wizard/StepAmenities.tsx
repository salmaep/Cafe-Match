import type { Facility } from '../../types/wizard';
import { AMENITIES } from './wizardData';

interface Props {
  value: Facility[];
  onToggle: (f: Facility) => void;
}

export default function StepAmenities({ value, onToggle }: Props) {
  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">Anything specific you need?</h2>
      <p className="text-base text-[#8A8880] mb-8">Select all that apply</p>

      <div className="flex flex-wrap gap-2 pb-24">
        {AMENITIES.map((a) => {
          const active = value.includes(a.label);
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => onToggle(a.label)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-colors ${
                active
                  ? 'border-[#D48B3A] bg-[#FDF6EC]'
                  : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
              }`}
            >
              <span className="text-base">{a.icon}</span>
              <span
                className={`text-sm font-semibold ${
                  active ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
                }`}
              >
                {a.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
