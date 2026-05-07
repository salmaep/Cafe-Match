import { useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { RADIUS_OPTIONS } from './wizardData';
import { useGeolocation, FALLBACK_LAT, FALLBACK_LNG } from '../../hooks/useGeolocation';

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined;

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

  return (
    <div className="w-full px-6 pt-6 pb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        How far are you willing to go?
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-5">Select your search radius</p>

      <div className="flex gap-2 mb-4">
        {RADIUS_OPTIONS.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
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
      </div>

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
          <RecenterAndFit center={center} hasRealCoords={hasRealCoords} />
          <RadiusCircle center={center} radiusMeters={value * 1000} />
          <AdvancedMarker position={center}>
            <CenterPin />
          </AdvancedMarker>
        </Map>
      </div>
    </div>
  );
}

/**
 * Re-fit the map when the user's real coordinates arrive.
 *
 * Geolocation resolves async — on first render `center` is the fallback
 * (Bandung). The map's `defaultCenter` only applies on mount, so without this
 * effect the user's real location ends up off-screen once GPS resolves.
 *
 * Strategy: fit on every center change UNTIL we've fitted with real coords,
 * then lock so radius changes don't move the map.
 */
function RecenterAndFit({
  center,
  hasRealCoords,
}: {
  center: { lat: number; lng: number };
  hasRealCoords: boolean;
}) {
  const map = useMap();
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!map || !window.google || lockedRef.current) return;
    if (center.lat === 0 && center.lng === 0) return;
    const circle = new window.google.maps.Circle({
      center,
      radius: 2200, // slightly larger than max radius (2km) for breathing room
    });
    const bounds = circle.getBounds();
    if (bounds) {
      map.fitBounds(bounds, 32);
      // Only lock once we've fitted to the user's REAL location. If we're
      // still on fallback coords, allow another fit when real coords arrive.
      if (hasRealCoords) lockedRef.current = true;
    }
  }, [map, center.lat, center.lng, hasRealCoords]);

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
