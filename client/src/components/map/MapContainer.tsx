import { useEffect, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Cafe } from '../../types';
import { formatDistance } from '../../utils/haversine';
import 'leaflet/dist/leaflet.css';

// User location marker — blue pulsing dot
const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:pulse 2s ease-out infinite;"></div>
      <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>
    </div>
    <style>@keyframes pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Cafe marker — amber/brown coffee pin
const cafeIcon = L.divIcon({
  className: '',
  html: `
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="#d97706"/>
      <circle cx="14" cy="13" r="7" fill="#fff"/>
      <text x="14" y="17" text-anchor="middle" font-size="13" fill="#d97706">&#9749;</text>
    </svg>
  `,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

// Promoted cafe marker (Type A: New Cafe Highlight) — "NEW!" badge pin, same size as regular
const promotedCafeIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;">
      <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:10;
        background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:8px;font-weight:800;
        padding:1px 5px;border-radius:6px;letter-spacing:0.5px;white-space:nowrap;
        box-shadow:0 2px 4px rgba(239,68,68,0.5);border:1.5px solid #fff;
        animation:newBounce 2s ease-in-out infinite;">
        NEW!
      </div>
      <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg"
        style="filter:drop-shadow(0 2px 4px rgba(239,68,68,0.4));">
        <defs>
          <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f87171"/>
            <stop offset="100%" stop-color="#dc2626"/>
          </linearGradient>
        </defs>
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="url(#newGrad)"/>
        <circle cx="14" cy="13" r="7" fill="#fff"/>
        <text x="14" y="17" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">&#9749;</text>
      </svg>
      <style>
        @keyframes newBounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}
      </style>
    </div>
  `,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

interface Props {
  center: [number, number];
  cafes: Cafe[];
  radius: number;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapView({ center, cafes, radius, onMapClick }: Props) {
  const [showCafePins, setShowCafePins] = useState(true);
  const [showUserPin, setShowUserPin] = useState(true);

  return (
    <div className="relative h-full w-full">
      <LeafletMap
      center={center}
      zoom={15}
      className="h-full w-full rounded-xl"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <RecenterMap center={center} />
      <MapClickHandler onClick={onMapClick} />

      {/* User location / search center */}
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: '#d97706',
          fillColor: '#fbbf24',
          fillOpacity: 0.1,
          weight: 2,
        }}
      />
      {showUserPin && (
        <Marker position={center} icon={userIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}

      {/* Cafe markers */}
      {showCafePins && cafes.map((cafe) => (
        <Marker
          key={cafe.id}
          position={[cafe.latitude, cafe.longitude]}
          icon={cafe.hasActivePromotion && cafe.activePromotionType === 'new_cafe' ? promotedCafeIcon : cafeIcon}
          zIndexOffset={cafe.hasActivePromotion ? 1000 : 0}
        >
          <Popup>
            <div className="text-sm">
              <strong>{cafe.name}</strong>
              <br />
              {cafe.address}
              {cafe.distanceMeters != null && (
                <>
                  <br />
                  <span className="text-amber-600">
                    {formatDistance(cafe.distanceMeters)}
                  </span>
                </>
              )}
              <br />
              <a
                href={`/cafe/${cafe.id}`}
                className="text-blue-500 underline"
              >
                View details
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
      </LeafletMap>

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
