import { useState, useEffect, useCallback } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { cafesApi, type SearchParams } from "../api/cafes.api";
import type { Cafe } from "../types";
import MapView from "../components/map/MapContainer";
import CafeCard from "../components/cafe/CafeCard";
import PurposeFilter from "../components/search/PurposeFilter";
import SearchBar from "../components/search/SearchBar";
import RadiusSlider from "../components/search/RadiusSlider";

interface Filters {
  q: string;
  wifiAvailable: boolean;
  hasMushola: boolean;
  priceRange: string;
}

export default function HomePage() {
  const geo = useGeolocation();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(2000);
  const [purposeId, setPurposeId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    wifiAvailable: false,
    hasMushola: false,
    priceRange: "",
  });

  // Set center from geolocation
  useEffect(() => {
    if (geo.latitude && geo.longitude && !center) {
      setCenter([geo.latitude, geo.longitude]);
    }
  }, [geo.latitude, geo.longitude, center]);

  const fetchCafes = useCallback(async () => {
    if (!center) return;
    setLoading(true);
    try {
      const params: SearchParams = {
        lat: center[0],
        lng: center[1],
        radius,
      };
      if (purposeId) params.purposeId = purposeId;
      if (filters.q) params.q = filters.q;
      if (filters.wifiAvailable) params.wifiAvailable = "true";
      if (filters.hasMushola) params.hasMushola = "true";
      if (filters.priceRange) params.priceRange = filters.priceRange;

      const res = await cafesApi.search(params);
      setCafes(res.data.data);
    } catch {
      setCafes([]);
    } finally {
      setLoading(false);
    }
  }, [center, radius, purposeId, filters]);

  useEffect(() => {
    fetchCafes();
  }, [fetchCafes]);

  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lat, lng]);
  };

  const handleSearch = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  if (geo.loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-gray-500">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (geo.error && !center) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2">Could not get your location</p>
          <p className="text-sm text-gray-500">{geo.error}</p>
          <p className="text-sm text-gray-400 mt-4">
            Click on the map to set a search location, or enable location access
            in your browser.
          </p>
          <button
            onClick={() => setCenter([-6.8965, 107.5910])}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"
          >
            Use Bandung as default
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Map */}
      <div className="lg:w-2/3 h-[50vh] lg:h-full">
        {center && (
          <MapView
            center={center}
            cafes={cafes}
            radius={radius}
            onMapClick={handleMapClick}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:w-1/3 flex flex-col gap-3 overflow-hidden">
        <SearchBar onSearch={handleSearch} />
        <RadiusSlider radius={radius} onChange={setRadius} />
        <PurposeFilter selectedPurposeId={purposeId} onSelect={setPurposeId} />

        <div className="text-sm text-gray-500">
          {loading ? "Searching..." : `${cafes.length} cafes found`}
          <span className="ml-2 text-xs text-gray-400">
            (click map to change location)
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {cafes.map((cafe) => (
            <CafeCard key={cafe.id} cafe={cafe} />
          ))}
          {!loading && cafes.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No cafes found nearby
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
