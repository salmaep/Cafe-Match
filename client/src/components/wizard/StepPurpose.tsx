import type { PurposeSlug } from '../../constants/purposes';
import { WIZARD_PURPOSES } from '../../constants/purposes';

interface Props {
  value: PurposeSlug | undefined;
  onChange: (slug: PurposeSlug) => void;
}

export default function StepPurpose({ value, onChange }: Props) {
  return (
    <div className="w-full px-6 pt-6 pb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        What's your vibe today?
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-5">
        Choose one that fits your mood
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {WIZARD_PURPOSES.map((p) => {
          const active = value === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => onChange(p.slug)}
              className={`flex flex-col items-center justify-center text-center py-4 px-2.5 rounded-xl border-2 transition-all ${
                active
                  ? 'border-[#D48B3A] bg-[#FDF6EC] shadow-sm'
                  : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD] hover:border-[#E0DCD3]'
              }`}
            >
              <span className="text-2xl sm:text-[28px] mb-1.5 leading-none">{p.emoji}</span>
              <span
                className={`text-sm font-bold leading-tight ${
                  active ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
                }`}
              >
                {p.label}
              </span>
              <span
                className={`text-[10px] mt-1 leading-tight line-clamp-2 ${
                  active ? 'text-[#D48B3A]/80' : 'text-[#8A8880]'
                }`}
              >
                {p.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
