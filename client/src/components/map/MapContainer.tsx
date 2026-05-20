import { useEffect, useRef, useState } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Cafe } from "../../types";
import { formatDistance } from "../../utils/haversine";
import { cafeUrl } from "../../utils/cafeUrl";
import { getCafeImage, placeholderImage } from "../../utils/cafeImage";
import CafeClusterMarkers from "./CafeClusterMarkers";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined;

interface Props {
  center: [number, number];
  cafes: Cafe[];
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
        strokeColor: "#d97706",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#fbbf24",
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

    // Auto-fit zoom so the radius circle fits the viewport with comfortable
    // padding — otherwise large radii (e.g. 2km) appear oversized on laptop.
    const bounds = circleRef.current?.getBounds();
    if (bounds) {
      map.fitBounds(bounds, 80);
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
    <div style={{ position: "relative", width: 24, height: 24 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.25)",
          animation: "cm-pulse 2s ease-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#3b82f6",
          border: "3px solid #fff",
          boxShadow: "0 0 6px rgba(0,0,0,0.3)",
        }}
      />
      <style>{`@keyframes cm-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}

// ── Main map view ────────────────────────────────────────────────────────────
export default function MapView({ center, cafes, radius, onMapClick }: Props) {
  const [activeCafeId, setActiveCafeId] = useState<number | null>(null);
  const [userPopupOpen, setUserPopupOpen] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 p-6 text-center text-sm text-amber-800">
        Google Maps API key belum diset. Tambahkan{" "}
        <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> di{" "}
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
        style={{ minHeight: "400px" }}
        onClick={(ev) => {
          if (!ev.detail.latLng) return;
          onMapClick?.(ev.detail.latLng.lat, ev.detail.latLng.lng);
        }}
      >
        <RecenterMap center={center} />
        <RadiusCircle center={center} radius={radius} />

        <AdvancedMarker
          position={{ lat: center[0], lng: center[1] }}
          onClick={() => setUserPopupOpen(true)}
        >
          <UserPin />
        </AdvancedMarker>

        {userPopupOpen && (
          <InfoWindow
            position={{ lat: center[0], lng: center[1] }}
            onCloseClick={() => setUserPopupOpen(false)}
          >
            <div className="text-sm">Your location</div>
          </InfoWindow>
        )}

        <CafeClusterMarkers
          cafes={cafes}
          onCafeClick={(id) => setActiveCafeId(id)}
        />

        {activeCafe && (
          <InfoWindow
            position={{ lat: activeCafe.latitude, lng: activeCafe.longitude }}
            onCloseClick={() => setActiveCafeId(null)}
            pixelOffset={[0, -34]}
            headerDisabled
          >
            <a
              href={cafeUrl(activeCafe)}
              className="block w-[240px] no-underline text-inherit"
            >
              <img
                src={getCafeImage(activeCafe)}
                alt={activeCafe.name}
                referrerPolicy="no-referrer"
                className="w-full h-32 object-cover rounded-t-md bg-[#F0EDE8]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = placeholderImage(
                    activeCafe.id,
                  );
                }}
              />
              <div className="px-1 pt-2 pb-1">
                <div className="font-bold text-[14px] text-[#1C1C1A] line-clamp-1">
                  {activeCafe.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#8A8880]">
                  {activeCafe.googleRating != null && (
                    <>
                      <span className="text-[#D48B3A] font-semibold">
                        ★ {activeCafe.googleRating}
                      </span>
                      {activeCafe.totalGoogleReviews != null && (
                        <span>({activeCafe.totalGoogleReviews})</span>
                      )}
                      <span>·</span>
                    </>
                  )}
                  {activeCafe.priceRange && (
                    <>
                      <span>{activeCafe.priceRange}</span>
                      <span>·</span>
                    </>
                  )}
                  {activeCafe.distanceMeters != null && (
                    <span className="text-[#D48B3A]">
                      {formatDistance(activeCafe.distanceMeters)}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#5C5A52] mt-1 line-clamp-2">
                  {activeCafe.address}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(Array.isArray(activeCafe.facilities)
                    ? activeCafe.facilities
                        .slice(0, 3)
                        .map((f: any) => (typeof f === "string" ? f : f?.name))
                        .filter(Boolean)
                    : []
                  ).map((name: string) => (
                    <span
                      key={name}
                      className="bg-[#F0EDE8] text-[#8A8880] text-[10px] font-medium rounded-full px-1.5 py-0.5"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[12px] font-bold text-[#D48B3A]">
                  Cek detail →
                </div>
              </div>
            </a>
          </InfoWindow>
        )}
      </Map>

    </div>
  );
}
