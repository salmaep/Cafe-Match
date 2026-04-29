import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useGeolocation } from "../hooks/useGeolocation";
import { cafesApi, type SearchParams } from "../api/cafes.api";
import { promotionsApi } from "../api/promotions.api";
import { usePreferences } from "../context/PreferencesContext";
import type { Cafe } from "../types";
import MapView from "../components/map/MapContainer";
import CafeCard from "../components/cafe/CafeCard";
import FeaturedCafeCard from "../components/cafe/FeaturedCafeCard";
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
  const { wizardCompleted } = usePreferences();
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
  const [featuredCafes, setFeaturedCafes] = useState<any[]>([]);

  // Set center from geolocation
  useEffect(() => {
    if (geo.latitude && geo.longitude && !center) {
      setCenter([geo.latitude, geo.longitude]);
    }
  }, [geo.latitude, geo.longitude, center]);

  // Fetch featured cafes (Type B promotions)
  useEffect(() => {
    promotionsApi
      .getActive('featured_promo')
      .then((res) => setFeaturedCafes(res.data))
      .catch(() => {});
  }, []);

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

  if (!wizardCompleted) return <Navigate to="/wizard" replace />;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-0 lg:gap-4 lg:p-4">
      {/* Map — full above on mobile, 3/5 left on desktop */}
      <div className="h-[55vh] lg:h-full lg:w-3/5 relative">
        {center && (
          <MapView
            center={center}
            cafes={cafes}
            radius={radius}
            onMapClick={handleMapClick}
          />
        )}
      </div>

      {/* Sidebar / Bottom sheet on mobile */}
      <div className="flex-1 lg:w-2/5 flex flex-col gap-3 overflow-hidden bg-white lg:bg-transparent rounded-t-2xl lg:rounded-none -mt-4 lg:mt-0 pt-4 px-4 lg:px-0 shadow-lg lg:shadow-none relative z-10">
        {/* Drag handle for mobile bottom-sheet feel */}
        <div className="lg:hidden mx-auto w-10 h-1 rounded-full bg-[#E8E4DD] -mt-1 mb-1" />

        <SearchBar onSearch={handleSearch} />
        <RadiusSlider radius={radius} onChange={setRadius} />
        <PurposeFilter selectedPurposeId={purposeId} onSelect={setPurposeId} />

        {featuredCafes.length > 0 && (
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Featured Cafes</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {featuredCafes.map((promo: any) => (
                <FeaturedCafeCard
                  key={promo.id}
                  cafe={promo.cafe}
                  promotion={{
                    content_title: promo.contentTitle,
                    content_description: promo.contentDescription,
                    content_photo_url: promo.contentPhotoUrl,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-500">
          {loading ? "Searching..." : `${cafes.length} cafes found`}
          <span className="ml-2 text-xs text-gray-400 hidden md:inline">
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
