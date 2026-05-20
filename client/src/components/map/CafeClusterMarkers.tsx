import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import {
  MarkerClusterer,
  type Renderer,
  type Cluster,
} from "@googlemaps/markerclusterer";
import type { Cafe } from "../../types";

interface Props {
  cafes: Cafe[];
  onCafeClick: (id: number) => void;
}

const CAFE_PIN_SVG = `
<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="#d97706"/>
  <circle cx="14" cy="13" r="7" fill="#fff"/>
  <text x="14" y="17" text-anchor="middle" font-size="13" fill="#d97706">☕</text>
</svg>`;

const PROMOTED_PIN_HTML = `
<div style="position:relative;">
  <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:10;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:8px;font-weight:800;padding:1px 5px;border-radius:6px;letter-spacing:0.5px;white-space:nowrap;box-shadow:0 2px 4px rgba(239,68,68,0.5);border:1.5px solid #fff;animation:cm-newbounce 2s ease-in-out infinite;">NEW!</div>
  <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(239,68,68,0.4));">
    <defs>
      <linearGradient id="cm-newGrad-cluster" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="100%" stop-color="#dc2626"/>
      </linearGradient>
    </defs>
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="url(#cm-newGrad-cluster)"/>
    <circle cx="14" cy="13" r="7" fill="#fff"/>
    <text x="14" y="17" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">☕</text>
  </svg>
</div>`;

function buildPinElement(isPromoted: boolean): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = isPromoted ? PROMOTED_PIN_HTML : CAFE_PIN_SVG;
  return el;
}

const KEYFRAMES_STYLE_ID = "cm-cluster-pin-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_STYLE_ID;
  style.textContent = `@keyframes cm-newbounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}`;
  document.head.appendChild(style);
}

function buildClusterPinSVG(count: number, size: number): string {
  const height = Math.round(size * (44 / 32));
  const digits = String(count).length;
  const fontSize = digits >= 3 ? 11 : digits === 2 ? 13 : 15;
  return `
<svg width="${size}" height="${height}" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#d97706" stroke="#fff" stroke-width="1.5"/>
  <circle cx="16" cy="15" r="11" fill="#fff"/>
  <text x="16" y="15" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#d97706">${count}</text>
</svg>`;
}

const clusterRenderer: Renderer = {
  render: ({ count, position }: Cluster) => {
    const size = count < 10 ? 40 : count < 100 ? 48 : 56;
    const div = document.createElement("div");
    div.innerHTML = buildClusterPinSVG(count, size);
    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: div,
      zIndex: 100 + count,
    });
  },
};

export default function CafeClusterMarkers({ cafes, onCafeClick }: Props) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map || !window.google?.maps?.marker) return;

    ensureKeyframes();
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];

    const markers = cafes.map((cafe) => {
      const isPromoted =
        !!cafe.hasActivePromotion && cafe.activePromotionType === "new_cafe";
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: cafe.latitude, lng: cafe.longitude },
        content: buildPinElement(isPromoted),
        zIndex: cafe.hasActivePromotion ? 1000 : undefined,
      });
      const listener = marker.addListener("click", () => onCafeClick(cafe.id));
      listenersRef.current.push(listener);
      return marker;
    });

    markersRef.current = markers;

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: clusterRenderer,
    });

    return () => {
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      markersRef.current = [];
    };
  }, [map, cafes, onCafeClick]);

  return null;
}
