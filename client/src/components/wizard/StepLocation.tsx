import { DESTINATION_SUGGESTIONS } from './wizardData';

interface Props {
  locationType: 'current' | 'custom';
  customAddress: string;
  onTypeChange: (t: 'current' | 'custom') => void;
  onAddressChange: (text: string) => void;
  onSuggestionPick: (s: (typeof DESTINATION_SUGGESTIONS)[number]) => void;
}

export default function StepLocation({
  locationType,
  customAddress,
  onTypeChange,
  onAddressChange,
  onSuggestionPick,
}: Props) {
  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">Where are you heading?</h2>
      <p className="text-base text-[#8A8880] mb-8">We'll find cafes near you</p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onTypeChange('current')}
          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-colors text-left ${
            locationType === 'current'
              ? 'border-[#D48B3A] bg-[#FDF6EC]'
              : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
          }`}
        >
          <span className="text-2xl">📍</span>
          <span
            className={`text-base font-semibold ${
              locationType === 'current' ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
            }`}
          >
            Use my current location
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('custom')}
          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-colors text-left ${
            locationType === 'custom'
              ? 'border-[#D48B3A] bg-[#FDF6EC]'
              : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
          }`}
        >
          <span className="text-2xl">🔍</span>
          <span
            className={`text-base font-semibold ${
              locationType === 'custom' ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'
            }`}
          >
            Enter a destination
          </span>
        </button>
      </div>

      {locationType === 'custom' && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="e.g. Senopati, Jakarta"
            value={customAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            className="w-full bg-[#F0EDE8] rounded-xl px-4 py-3 text-base text-[#1C1C1A] outline-none focus:ring-2 focus:ring-[#D48B3A] placeholder:text-[#8A8880]"
          />
          <p className="text-xs font-semibold text-[#8A8880] mt-4 mb-2 uppercase tracking-wide">
            Suggested Destinations
          </p>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_SUGGESTIONS.map((s) => {
              const active = customAddress === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onSuggestionPick(s)}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl border-2 transition-colors ${
                    active
                      ? 'border-[#D48B3A] bg-[#FDF6EC]'
                      : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
                  }`}
                >
                  <span className="text-sm font-bold text-[#1C1C1A]">{s.label}</span>
                  <span className="text-[11px] text-[#8A8880] mt-0.5">{s.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
