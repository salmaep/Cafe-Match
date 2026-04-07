import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookmarksApi } from '../api/bookmarks.api';
import type { Bookmark } from '../types';
import CafeCard from '../components/cafe/CafeCard';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookmarksApi
      .getAll()
      .then((res) => setBookmarks(res.data))
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No bookmarks yet</p>
          <Link to="/" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            Explore cafes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <CafeCard key={b.id} cafe={b.cafe} />
          ))}
        </div>
      )}
    </div>
  );
}
