import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import { bookmarksApi } from '../api/bookmarks.api';
import { favoritesApi } from '../api/favorites.api';
import type { Cafe } from '../types';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversineDistance, formatDistance } from '../utils/haversine';
import VoteSection from '../components/cafe/VoteSection';

const FACILITY_LABELS: Record<string, string> = {
  quiet_atmosphere: 'Quiet',
  cozy_seating: 'Cozy Seating',
  ambient_lighting: 'Ambient Lighting',
  intimate_seating: 'Intimate Seating',
  kid_friendly: 'Kid Friendly',
  spacious: 'Spacious',
  noise_tolerant: 'Noise Tolerant',
  large_tables: 'Large Tables',
  whiteboard: 'Whiteboard',
  bookable_space: 'Bookable Space',
  strong_wifi: 'Strong WiFi',
  power_outlets: 'Power Outlets',
  outdoor_seating: 'Outdoor Seating',
  parking: 'Parking',
  smoking_area: 'Smoking Area',
};

export default function CafeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const geo = useGeolocation();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!id) return;
    cafesApi
      .getById(Number(id))
      .then((res) => setCafe(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const distance =
    cafe && geo.latitude && geo.longitude
      ? haversineDistance(geo.latitude, geo.longitude, cafe.latitude, cafe.longitude)
      : null;

  const handleBookmark = async () => {
    if (!cafe) return;
    const res = await bookmarksApi.toggle(cafe.id);
    setBookmarked(res.data.bookmarked);
    setCafe((prev) =>
      prev
        ? {
            ...prev,
            bookmarksCount: prev.bookmarksCount + (res.data.bookmarked ? 1 : -1),
          }
        : prev,
    );
  };

  const handleFavorite = async () => {
    if (!cafe) return;
    const res = await favoritesApi.toggle(cafe.id);
    setFavorited(res.data.favorited);
    setCafe((prev) =>
      prev
        ? {
            ...prev,
            favoritesCount: prev.favoritesCount + (res.data.favorited ? 1 : -1),
          }
        : prev,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Cafe not found</p>
        <Link to="/" className="text-amber-600 underline mt-2 inline-block">
          Back to map
        </Link>
      </div>
    );
  }

  // Group menus by category
  const menusByCategory = (cafe.menus || []).reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof cafe.menus>,
  );

  return (
    <div className="max-w-4xl mx-auto p-4 pb-12">
      <Link to="/" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to map
      </Link>

      {/* Hero image */}
      {(() => {
        const primaryPhoto = (cafe.photos || []).find((p) => p.isPrimary) || (cafe.photos || [])[0];
        const hue = (cafe.id * 37) % 360;
        const imgSrc = primaryPhoto
          ? primaryPhoto.url
          : `data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300">
                <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="hsl(${hue},60%,75%)"/>
                  <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},50%,60%)"/>
                </linearGradient></defs>
                <rect width="800" height="300" fill="url(#g)"/>
                <text x="400" y="165" text-anchor="middle" font-size="72" fill="rgba(255,255,255,0.8)">&#9749;</text>
              </svg>`
            )}`;
        return (
          <img
            src={imgSrc}
            alt={cafe.name}
            className="w-full h-48 md:h-64 object-cover rounded-xl mb-6"
          />
        );
      })()}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{cafe.name}</h1>
            <p className="text-gray-500 mt-1">{cafe.address}</p>
            {distance != null && (
              <p className="text-amber-600 text-sm mt-1">
                {formatDistance(distance)} from you
              </p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{cafe.priceRange}</p>
            {cafe.phone && <p className="mt-1">{cafe.phone}</p>}
          </div>
        </div>

        {cafe.description && (
          <p className="text-gray-600 mt-4">{cafe.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          {user && (
            <>
              <button
                onClick={handleBookmark}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  bookmarked
                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                    : 'border-gray-300 text-gray-600 hover:border-amber-400'
                }`}
              >
                {bookmarked ? 'Bookmarked' : 'Bookmark'} ({cafe.bookmarksCount})
              </button>
              <button
                onClick={handleFavorite}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  favorited
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : 'border-gray-300 text-gray-600 hover:border-red-400'
                }`}
              >
                {favorited ? 'Favorited' : 'Favorite'} ({cafe.favoritesCount})
              </button>
            </>
          )}
          <a
            href={cafe.googleMapsUrl || `https://www.google.com/maps?q=${cafe.latitude},${cafe.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:border-blue-400"
          >
            Open in Google Maps
          </a>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Facilities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Facilities</h2>
          <div className="flex flex-wrap gap-2">
            {cafe.wifiAvailable && (
              <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full">
                WiFi {cafe.wifiSpeedMbps ? `(${cafe.wifiSpeedMbps}Mbps)` : ''}
              </span>
            )}
            {cafe.hasMushola && (
              <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">
                Mushola
              </span>
            )}
            {(cafe.facilities || []).map((f) => (
              <span
                key={f.id}
                className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full"
              >
                {FACILITY_LABELS[f.facilityKey] || f.facilityKey}
              </span>
            ))}
            {!cafe.wifiAvailable && !cafe.hasMushola && !(cafe.facilities || []).length && (
              <span className="text-gray-400 text-sm">No facilities listed</span>
            )}
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Opening Hours</h2>
          {cafe.openingHours ? (
            <div className="space-y-1 text-sm">
              {Object.entries(cafe.openingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{day}</span>
                  <span className="text-gray-700">{hours}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Not available</span>
          )}
        </div>
      </div>

      {/* Voting */}
      <VoteSection cafeId={cafe.id} />

      {/* Photos */}
      {(cafe.photos || []).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cafe.photos!.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || cafe.name}
                className="rounded-lg object-cover w-full h-48"
              />
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      {Object.keys(menusByCategory).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Menu</h2>
          {Object.entries(menusByCategory).map(([category, items]) => (
            <div key={category} className="mb-4 last:mb-0">
              <h3 className="text-sm font-medium text-amber-700 mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {items!.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="text-gray-700">{item.itemName}</span>
                      {item.description && (
                        <p className="text-xs text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-600 font-medium ml-4">
                      Rp {Number(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
