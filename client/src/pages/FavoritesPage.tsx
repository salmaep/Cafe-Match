import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoritesApi } from '../api/favorites.api';
import type { Favorite } from '../types';
import CafeCard from '../components/cafe/CafeCard';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    favoritesApi
      .getAll()
      .then((res) => setFavorites(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Favorites</h1>
      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No favorites yet</p>
          <Link to="/" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            Explore cafes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((f) => (
            <CafeCard key={f.id} cafe={f.cafe} />
          ))}
        </div>
      )}
    </div>
  );
}
