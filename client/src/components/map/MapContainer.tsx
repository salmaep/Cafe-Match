import { useEffect, useRef, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { formatDistance } from '../../utils/haversine';
import { cafeUrl } from '../../utils/cafeUrl';

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined;

// Minimal cafe shape needed to render markers + popup. Wider Cafe types
// (with photos, menus, etc.) are still assignable.
export interface MapCafe {
  id: number;
  name: string;
  slug: string | null;
  address: string;
  latitude: number;
  longitude: number;
  hasActivePromotion: boolean;
  activePromotionType?: string | null;
  distanceMeters?: number;
}

interface Props {
  center: [number, number];
  cafes: MapCafe[];
  radius: number;
  onMapClick?: (lat: number, lng: number) => void;
}

// ── Recenter when `center` prop changes ──────────────────────────────────────
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: center[0], lng: center[1] });
  }, [center, map]);
  return null;
}

// ── Radius circle (no JSX component in @vis.gl, use imperative API) ──────────
function RadiusCircle({
  center,
  radius,
}: {
  center: [number, number];
  radius: number;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;

    if (!circleRef.current) {
      circleRef.current = new window.google.maps.Circle({
        strokeColor: '#d97706',
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: '#fbbf24',
        fillOpacity: 0.1,
        map,
        center: { lat: center[0], lng: center[1] },
        radius,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter({ lat: center[0], lng: center[1] });
      circleRef.current.setRadius(radius);
    }
  }, [map, center, radius]);

  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, []);

  return null;
}

// ── Marker visuals ───────────────────────────────────────────────────────────
function UserPin() {
  return (
    <div style={{ position: 'relative', width: 24, height: 24 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.25)',
          animation: 'cm-pulse 2s ease-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#3b82f6',
          border: '3px solid #fff',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }}
      />
      <style>{`@keyframes cm-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

function CafePin() {
  return (
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
        fill="#d97706"
      />
      <circle cx="14" cy="13" r="7" fill="#fff" />
      <text x="14" y="17" textAnchor="middle" fontSize="13" fill="#d97706">
        ☕
      </text>
    </svg>
  );
}

function PromotedCafePin() {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'linear-gradient(135deg,#ef4444,#dc2626)',
          color: '#fff',
          fontSize: 8,
          fontWeight: 800,
          padding: '1px 5px',
          borderRadius: 6,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(239,68,68,0.5)',
          border: '1.5px solid #fff',
          animation: 'cm-newbounce 2s ease-in-out infinite',
        }}
      >
        NEW!
      </div>
      <svg
        width="28"
        height="38"
        viewBox="0 0 28 38"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(239,68,68,0.4))' }}
      >
        <defs>
          <linearGradient id="cm-newGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path
          d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
          fill="url(#cm-newGrad)"
        />
        <circle cx="14" cy="13" r="7" fill="#fff" />
        <text x="14" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#dc2626">
          ☕
        </text>
      </svg>
      <style>{`@keyframes cm-newbounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}`}</style>
    </div>
  );
}

// ── Main map view ────────────────────────────────────────────────────────────
export default function MapView({ center, cafes, radius, onMapClick }: Props) {
  const [showCafePins, setShowCafePins] = useState(true);
  const [showUserPin, setShowUserPin] = useState(true);
  const [activeCafeId, setActiveCafeId] = useState<number | null>(null);
  const [userPopupOpen, setUserPopupOpen] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 p-6 text-center text-sm text-amber-800">
        Google Maps API key belum diset. Tambahkan{' '}
        <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> di{' '}
        <code className="font-mono">.env</code>.
      </div>
    );
  }

  const activeCafe = cafes.find((c) => c.id === activeCafeId) ?? null;

  return (
    <div className="relative h-full w-full">
      <Map
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={15}
        mapId={MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        streetViewControl={false}
        fullscreenControl={false}
        mapTypeControl={false}
        className="h-full w-full rounded-xl"
        style={{ minHeight: '400px' }}
        onClick={(ev) => {
          if (!ev.detail.latLng) return;
          onMapClick?.(ev.detail.latLng.lat, ev.detail.latLng.lng);
        }}
      >
        <RecenterMap center={center} />
        <RadiusCircle center={center} radius={radius} />

        {showUserPin && (
          <AdvancedMarker
            position={{ lat: center[0], lng: center[1] }}
            onClick={() => setUserPopupOpen(true)}
          >
            <UserPin />
          </AdvancedMarker>
        )}

        {showUserPin && userPopupOpen && (
          <InfoWindow
            position={{ lat: center[0], lng: center[1] }}
            onCloseClick={() => setUserPopupOpen(false)}
          >
            <div className="text-sm">Your location</div>
          </InfoWindow>
        )}

        {showCafePins &&
          cafes.map((cafe) => {
            const isPromoted =
              cafe.hasActivePromotion && cafe.activePromotionType === 'new_cafe';
            return (
              <AdvancedMarker
                key={cafe.id}
                position={{ lat: cafe.latitude, lng: cafe.longitude }}
                zIndex={cafe.hasActivePromotion ? 1000 : undefined}
                onClick={() => setActiveCafeId(cafe.id)}
              >
                {isPromoted ? <PromotedCafePin /> : <CafePin />}
              </AdvancedMarker>
            );
          })}

        {activeCafe && (
          <InfoWindow
            position={{ lat: activeCafe.latitude, lng: activeCafe.longitude }}
            onCloseClick={() => setActiveCafeId(null)}
            pixelOffset={[0, -34]}
          >
            <div className="text-sm">
              <strong>{activeCafe.name}</strong>
              <br />
              {activeCafe.address}
              {activeCafe.distanceMeters != null && (
                <>
                  <br />
                  <span className="text-amber-600">
                    {formatDistance(activeCafe.distanceMeters)}
                  </span>
                </>
              )}
              <br />
              <a
                href={cafeUrl(activeCafe)}
                className="text-blue-500 underline"
              >
                View details
              </a>
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Pin toggle buttons (top-right overlay) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowCafePins((v) => !v)}
          title={showCafePins ? 'Hide cafe pins' : 'Show cafe pins'}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-md border-2 transition-colors ${
            showCafePins
              ? 'bg-[#D48B3A] border-[#D48B3A] text-white'
              : 'bg-white border-white text-[#1C1C1A] hover:bg-[#F0EDE8]'
          }`}
        >
          ☕
        </button>
        <button
          type="button"
          onClick={() => setShowUserPin((v) => !v)}
          title={showUserPin ? 'Hide my location' : 'Show my location'}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-md border-2 transition-colors ${
            showUserPin
              ? 'bg-[#D48B3A] border-[#D48B3A] text-white'
              : 'bg-white border-white text-[#1C1C1A] hover:bg-[#F0EDE8]'
          }`}
        >
          📍
        </button>
      </div>
    </div>
  );
}
