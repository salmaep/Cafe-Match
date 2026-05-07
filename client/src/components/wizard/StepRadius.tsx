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
          <InitialFit center={center} />
          <RadiusCircle center={center} radiusMeters={value * 1000} />
          <AdvancedMarker position={center}>
            <CenterPin />
          </AdvancedMarker>
        </Map>
      </div>
    </div>
  );
}

// Fit to ~2km bounds ONCE when geolocation resolves — covers all radius options
// (0.5 / 1 / 2 km). Does not refit on radius change so the user sees the circle
// resize in place rather than the map jumping.
function InitialFit({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!map || !window.google || fittedRef.current) return;
    if (center.lat === 0 && center.lng === 0) return;
    const circle = new window.google.maps.Circle({
      center,
      radius: 2200, // slightly larger than max radius (2km) for breathing room
    });
    const bounds = circle.getBounds();
    if (bounds) {
      map.fitBounds(bounds, 32);
      fittedRef.current = true;
    }
  }, [map, center.lat, center.lng]);
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
