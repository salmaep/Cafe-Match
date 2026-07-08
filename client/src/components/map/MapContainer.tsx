import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import OpenTablesModal from "../tables/OpenTablesModal";
import OpenTableModal from "../tables/OpenTableModal";
import ActiveCheckinBadge from "../checkin/ActiveCheckinBadge";
import { useActiveTables } from "../../context/ActiveTablesContext";
import { Star } from "../../utils/lucideIcon";

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
  const [tablesModalCafe, setTablesModalCafe] = useState<Cafe | null>(null);
  const [openTableFormCafe, setOpenTableFormCafe] = useState<Cafe | null>(null);
  const { activeCafeIds } = useActiveTables();
  const navigate = useNavigate();

  // Stable callbacks — without these, unrelated parent re-renders (typing in
  // SearchBar, focus toggles) hand new function identities to child effects
  // and force CafeClusterMarkers to tear down + rebuild every marker.
  // Must be declared BEFORE any early return to satisfy rules-of-hooks.
  const handleCafeClick = useCallback((id: number) => {
    setActiveCafeId(id);
  }, []);

  const handleMapClick = useCallback(
    (ev: { detail: { latLng: { lat: number; lng: number } | null } }) => {
      if (!ev.detail.latLng) return;
      onMapClick?.(ev.detail.latLng.lat, ev.detail.latLng.lng);
    },
    [onMapClick],
  );

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
        cameraControl={false}
        className="h-full w-full rounded-xl"
        style={{ minHeight: "400px" }}
        onClick={handleMapClick}
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
          onCafeClick={handleCafeClick}
          activeTableCafeIds={activeCafeIds}
        />

        {activeCafe && (
          <InfoWindow
            position={{ lat: activeCafe.latitude, lng: activeCafe.longitude }}
            onCloseClick={() => setActiveCafeId(null)}
            pixelOffset={[0, -34]}
            headerDisabled
          >
            {activeCafeIds.has(activeCafe.id) ? (
              /* Compact variant — fokus ke open table; pendek supaya
                 InfoWindow tidak memunculkan scrollbar internal. */
              <div className="w-[240px] px-1 pt-1 pb-1.5">
                <div className="font-bold text-[14px] text-[#1C1C1A] line-clamp-1">
                  {activeCafe.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#8A8880]">
                  {activeCafe.googleRating != null && (
                    <>
                      <span className="text-[#D48B3A] font-semibold inline-flex items-center gap-1">
                        <Star size={11} strokeWidth={2} fill="currentColor" />
                        {activeCafe.googleRating}
                      </span>
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
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  🪑 Ada open table di sini
                </div>
                <button
                  type="button"
                  onClick={() => setTablesModalCafe(activeCafe)}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-colors"
                >
                  Lihat Meja
                </button>
                <a
                  href={cafeUrl(activeCafe)}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(cafeUrl(activeCafe));
                  }}
                  className="block mt-1.5 text-center text-[12px] font-bold text-[#D48B3A] no-underline"
                >
                  Cek detail →
                </a>
              </div>
            ) : (
              /* Rich variant — cafe biasa. div wrapper (bukan <a>) supaya tombol
                 open table di bawah tidak ikut navigasi; onClick intercept
                 untuk SPA navigation (href polos = full page reload). */
              <div className="block w-[240px]">
                <a
                  href={cafeUrl(activeCafe)}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(cafeUrl(activeCafe));
                  }}
                  className="block no-underline text-inherit"
                >
                  <img
                    src={getCafeImage(activeCafe)}
                    alt={activeCafe.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-28 object-cover rounded-t-md bg-[#F0EDE8]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        placeholderImage(activeCafe.id);
                    }}
                  />
                  <div className="px-1 pt-2 pb-1">
                    <div className="font-bold text-[14px] text-[#1C1C1A] line-clamp-1">
                      {activeCafe.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#8A8880]">
                      {activeCafe.googleRating != null && (
                        <>
                          <span className="text-[#D48B3A] font-semibold inline-flex items-center gap-1">
                            <Star size={11} strokeWidth={2} fill="currentColor" />
                            {activeCafe.googleRating}
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
                    <div className="text-[12px] text-[#5C5A52] mt-1 line-clamp-1">
                      {activeCafe.address}
                    </div>
                  </div>
                </a>

                {/* Footer compact — Cek detail (kiri) + Open Table (kanan) sebaris,
                    supaya card pendek & InfoWindow tak memunculkan scrollbar. */}
                <div className="flex items-center justify-between gap-2 px-1 pb-1.5 mt-1">
                  <a
                    href={cafeUrl(activeCafe)}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(cafeUrl(activeCafe));
                    }}
                    className="text-[12px] font-bold text-[#D48B3A] no-underline shrink-0"
                  >
                    Cek detail →
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpenTableFormCafe(activeCafe)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shrink-0"
                  >
                    🪑 Open Table
                  </button>
                </div>
              </div>
            )}
          </InfoWindow>
        )}
      </Map>

      {/* Active check-in badge — sits where the removed camera control was */}
      <ActiveCheckinBadge className="absolute bottom-6 right-3 z-[5]" />

      {tablesModalCafe && (
        <OpenTablesModal
          cafe={{ id: tablesModalCafe.id, name: tablesModalCafe.name }}
          onClose={() => setTablesModalCafe(null)}
        />
      )}

      {openTableFormCafe && (
        <OpenTableModal
          cafe={{ id: openTableFormCafe.id, name: openTableFormCafe.name }}
          onClose={() => setOpenTableFormCafe(null)}
        />
      )}
    </div>
  );
}
