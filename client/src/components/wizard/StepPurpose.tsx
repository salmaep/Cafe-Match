import type { PurposeSlug } from '../../constants/purposes';
import { getPurposeBySlug } from '@shared/constants/purposes';
import { usePreferences } from '../../context/PreferencesContext';

interface Props {
  value: PurposeSlug | undefined;
  onChange: (slug: PurposeSlug) => void;
}

export default function StepPurpose({ value, onChange }: Props) {
  const { serverPurposes } = usePreferences();
  const loading = serverPurposes.length === 0;

  return (
    <div className="w-full px-6 pt-6 pb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        What's your vibe today?
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-5">
        Choose one that fits your mood
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[110px] rounded-xl bg-[#F0EDE8] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {serverPurposes.map((p) => {
            const active = value === p.slug;
            const reqCount = p.requirements?.length ?? 0;
            const emoji = getPurposeBySlug(p.slug)?.emoji ?? '✨';
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => onChange(p.slug as PurposeSlug)}
                className={`flex flex-col items-center justify-center text-center py-4 px-2.5 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-[#D48B3A] bg-[#FDF6EC] shadow-sm'
                    : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD] hover:border-[#E0DCD3]'
                }`}
              >
                <span className="mb-1.5 text-2xl leading-none">{emoji}</span>
                <span
                  className={`text-sm font-bold leading-tight ${
                    active ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
                  }`}
                >
                  {p.name}
                </span>
                <span
                  className={`text-[10px] mt-1 leading-tight line-clamp-2 ${
                    active ? 'text-[#D48B3A]/80' : 'text-[#8A8880]'
                  }`}
                >
                  {p.description ?? `${reqCount} fitur direkomendasikan`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
