import { useEffect, useRef, useState } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { RADIUS_OPTIONS } from './wizardData';
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from '../../hooks/useGeolocation';

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined;
const CUSTOM_MIN = 3;
const CUSTOM_MAX = 10;

interface Props {
  value: number;
  onChange: (r: number) => void;
}

export default function StepRadius({ value, onChange }: Props) {
  const { latitude, longitude } = useGeolocation();
  const hasRealCoords = latitude != null && longitude != null;
  const center: { lat: number; lng: number } = {
    lat: latitude ?? FALLBACK_LAT,
    lng: longitude ?? FALLBACK_LNG,
  };

  const isCustom = !RADIUS_OPTIONS.includes(value);
  const [customValue, setCustomValue] = useState(
    isCustom ? value : CUSTOM_MIN,
  );

  // Keep customValue in sync when value changes externally (e.g. back navigation)
  useEffect(() => {
    if (!RADIUS_OPTIONS.includes(value)) setCustomValue(value);
  }, [value]);

  const handleCustomSlider = (v: number) => {
    setCustomValue(v);
    onChange(v);
  };

  const handleSelectPreset = (r: number) => {
    onChange(r);
  };

  const handleSelectCustom = () => {
    onChange(customValue);
  };

  return (
    <div className="w-full px-6 pt-6 pb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        How far are you willing to go?
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-5">Select your search radius</p>

      {/* Preset + Custom buttons */}
      <div className="flex gap-2 mb-3">
        {RADIUS_OPTIONS.map((r) => {
          const active = !isCustom && value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => handleSelectPreset(r)}
              className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
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

        {/* Custom button */}
        <button
          type="button"
          onClick={handleSelectCustom}
          className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
            isCustom
              ? 'border-[#D48B3A] bg-[#FDF6EC]'
              : 'border-transparent bg-[#F0EDE8] hover:bg-[#E8E4DD]'
          }`}
        >
          <span
            className={`text-base font-bold ${isCustom ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'}`}
          >
            {isCustom ? `${customValue} km` : 'Custom'}
          </span>
        </button>
      </div>

      {/* Custom slider — visible when custom mode is active */}
      {isCustom && (
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between text-xs text-[#8A8880] mb-1.5 font-medium">
            <span>{CUSTOM_MIN} km</span>
            <span className="text-[#D48B3A] font-bold text-sm">{customValue} km</span>
            <span>{CUSTOM_MAX} km</span>
          </div>
          <input
            type="range"
            min={CUSTOM_MIN}
            max={CUSTOM_MAX}
            step={1}
            value={customValue}
            onChange={(e) => handleCustomSlider(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #D48B3A ${
                ((customValue - CUSTOM_MIN) / (CUSTOM_MAX - CUSTOM_MIN)) * 100
              }%, #E8E4DD ${
                ((customValue - CUSTOM_MIN) / (CUSTOM_MAX - CUSTOM_MIN)) * 100
              }%)`,
            }}
          />
        </div>
      )}

      <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-[#F0EDE8] bg-[#F0EDE8] relative">
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="none"
          disableDefaultUI
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          <RecenterAndFit center={center} hasRealCoords={hasRealCoords} radiusKm={value} />
          <RadiusCircle center={center} radiusMeters={value * 1000} />
          <AdvancedMarker position={center}>
            <CenterPin />
          </AdvancedMarker>
        </Map>
      </div>
    </div>
  );
}

function RecenterAndFit({
  center,
  hasRealCoords,
  radiusKm,
}: {
  center: { lat: number; lng: number };
  hasRealCoords: boolean;
  radiusKm: number;
}) {
  const map = useMap();
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!map || !window.google || lockedRef.current) return;
    if (center.lat === 0 && center.lng === 0) return;
    const circle = new window.google.maps.Circle({
      center,
      radius: Math.max(radiusKm * 1000 * 1.1, 2200),
    });
    const bounds = circle.getBounds();
    if (bounds) {
      map.fitBounds(bounds, 32);
      if (hasRealCoords) lockedRef.current = true;
    }
  }, [map, center.lat, center.lng, hasRealCoords]);

  // Re-fit map when radius changes so the circle stays visible
  useEffect(() => {
    if (!map || !window.google) return;
    const circle = new window.google.maps.Circle({
      center,
      radius: radiusKm * 1000 * 1.1,
    });
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds, 32);
  }, [radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function RadiusCircle({
  center,
  radiusMeters,
}: {
  center: { lat: number; lng: number };
  radiusMeters: number;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;
    if (!circleRef.current) {
      circleRef.current = new window.google.maps.Circle({
        strokeColor: '#D48B3A',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: '#FBBF24',
        fillOpacity: 0.18,
        map,
        center,
        radius: radiusMeters,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusMeters);
    }
  }, [map, center.lat, center.lng, radiusMeters]);

  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, []);

  return null;
}

function CenterPin() {
  return (
    <div className="relative">
      <div className="w-7 h-7 rounded-full bg-[#D48B3A] ring-4 ring-white shadow-lg flex items-center justify-center text-white text-sm font-bold">
        📍
      </div>
    </div>
  );
}
