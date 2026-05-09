import { useState } from 'react';
import { DESTINATION_SUGGESTIONS } from './wizardData';
import { parseCoords } from '../../utils/parseCoords';

interface Props {
  lat: number | null;
  lng: number | null;
  userLat: number | null;
  userLng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export default function StepLocation({ lat, lng, userLat, userLng, onChange }: Props) {
  // UI-only: which input mode is active. Not persisted to URL.
  const [mode, setMode] = useState<'current' | 'custom'>(
    lat !== null && lat !== userLat ? 'custom' : 'current',
  );
  const [address, setAddress] = useState('');

  const selectCurrent = () => {
    setMode('current');
    setAddress('');
    onChange(userLat, userLng);
  };

  const selectCustom = () => {
    setMode('custom');
    onChange(null, null);
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    const coords = parseCoords(text);
    onChange(coords?.lat ?? null, coords?.lng ?? null);
  };

  const handleSuggestionPick = (s: (typeof DESTINATION_SUGGESTIONS)[number]) => {
    setMode('custom');
    setAddress(s.label);
    onChange(s.latitude, s.longitude);
  };

  const showWarn = mode === 'custom' && address.length > 0 && (lat === null || lng === null);
  const showOk   = mode === 'custom' && lat !== null && lng !== null;

  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">Where are you heading?</h2>
      <p className="text-base text-[#8A8880] mb-8">We'll find cafes near you</p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={selectCurrent}
          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-colors text-left ${
            mode === 'current'
              ? 'border-[#D48B3A] bg-[#FDF6EC]'
              : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
          }`}
        >
          <span className="text-2xl">📍</span>
          <div>
            <span className={`text-base font-semibold ${mode === 'current' ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'}`}>
              Use my current location
            </span>
            {mode === 'current' && userLat !== null && (
              <p className="text-xs text-[#2F8F4E] font-medium mt-0.5">
                ✓ {userLat.toFixed(4)}, {userLng?.toFixed(4)}
              </p>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={selectCustom}
          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-colors text-left ${
            mode === 'custom'
              ? 'border-[#D48B3A] bg-[#FDF6EC]'
              : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
          }`}
        >
          <span className="text-2xl">🔍</span>
          <span className={`text-base font-semibold ${mode === 'custom' ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'}`}>
            Enter a destination
          </span>
        </button>
      </div>

      {mode === 'custom' && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="Koordinat: -6.9175, 107.6191"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            className="w-full bg-[#F0EDE8] rounded-xl px-4 py-3 text-base text-[#1C1C1A] outline-none focus:ring-2 focus:ring-[#D48B3A] placeholder:text-[#8A8880]"
          />
          {showWarn && (
            <p className="text-xs font-medium text-[#B58A2C] mt-2">
              ⚠️ Format: "lat, lng" — contoh: -6.9175, 107.6191
            </p>
          )}
          {showOk && (
            <p className="text-xs font-semibold text-[#2F8F4E] mt-2">
              ✓ {lat!.toFixed(4)}, {lng!.toFixed(4)}
            </p>
          )}
          <p className="text-xs font-semibold text-[#8A8880] mt-4 mb-2 uppercase tracking-wide">
            Suggested Destinations
          </p>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_SUGGESTIONS.map((s) => {
              const active = lat === s.latitude && lng === s.longitude;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSuggestionPick(s)}
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
