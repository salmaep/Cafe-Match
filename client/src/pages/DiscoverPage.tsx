import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import type { Cafe } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import { useShortlist } from '../context/ShortlistContext';
import SwipeCard from '../components/discover/SwipeCard';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { preferences, wizardCompleted } = usePreferences();
  const { addToShortlist, isInShortlist, shortlist } = useShortlist();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!wizardCompleted) return;
    const lat = preferences?.location?.latitude ?? -6.2;
    const lng = preferences?.location?.longitude ?? 106.8;
    const radius = (preferences?.radius ?? 2) * 1000;

    cafesApi
      .search({ lat, lng, radius, limit: 10 })
      .then((res) => {
        const data = res.data?.data ?? [];
        setCafes(data);
      })
      .catch(() => setCafes([]))
      .finally(() => setLoading(false));
  }, [preferences, wizardCompleted]);

  if (!wizardCompleted) return <Navigate to="/wizard" replace />;

  const current = cafes[index];
  const allDone = !loading && (cafes.length === 0 || index >= cafes.length);

  const advance = (dir: 'left' | 'right') => {
    setAnimDir(dir);
    setTimeout(() => {
      setAnimDir(null);
      setIndex((i) => i + 1);
    }, 250);
  };

  const handlePass = () => {
    if (!current) return;
    advance('left');
  };
  const handleLike = () => {
    if (!current) return;
    if (!isInShortlist(current.id)) addToShortlist(current);
    advance('right');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#1C1C1A] font-semibold">Finding cafes...</p>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#FAF9F6] p-8 text-center">
        <span className="text-6xl mb-4">🗺️</span>
        <h2 className="text-2xl font-bold text-[#1C1C1A] mb-1">No more cafes</h2>
        <p className="text-[#8A8880] mb-6">
          {shortlist.length > 0
            ? `You shortlisted ${shortlist.length} cafe${shortlist.length > 1 ? 's' : ''}!`
            : 'Try exploring on the map'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#1C1C1A] text-white font-bold rounded-xl hover:bg-black transition-colors"
          >
            Open Map
          </button>
          {shortlist.length > 0 && (
            <button
              onClick={() => navigate('/bookmarks')}
              className="px-6 py-3 bg-[#D48B3A] text-white font-bold rounded-xl hover:bg-[#b87528] transition-colors"
            >
              View Shortlist ({shortlist.length})
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <header className="px-6 pt-6 pb-2 max-w-2xl w-full mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1C1C1A]">
          Cafe<span className="text-[#D48B3A]">Match</span>
        </h1>
        <button
          onClick={() => navigate('/bookmarks')}
          className="relative w-11 h-11 rounded-full bg-[#D48B3A] text-white flex items-center justify-center shadow-md hover:bg-[#b87528] transition-colors"
          title="Shortlist"
        >
          <span className="text-xl leading-none">★</span>
          {shortlist.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-[#D48B3A] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
              {shortlist.length}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div
          className={`w-full max-w-md transition-all duration-250 ${
            animDir === 'left'
              ? '-translate-x-full -rotate-12 opacity-0'
              : animDir === 'right'
                ? 'translate-x-full rotate-12 opacity-0'
                : 'translate-x-0 rotate-0 opacity-100'
          }`}
        >
          {current && (
            <SwipeCard
              cafe={current}
              isSaved={isInShortlist(current.id)}
              onSave={() => addToShortlist(current)}
            />
          )}
        </div>
      </div>

      <footer className="px-6 pb-10 pt-4 max-w-md w-full mx-auto flex items-center justify-center gap-6">
        <button
          onClick={handlePass}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl hover:scale-105 transition-transform border-2 border-red-200 hover:border-red-400"
          title="Pass"
        >
          ❌
        </button>
        <button
          onClick={handleLike}
          className="w-20 h-20 rounded-full bg-[#D48B3A] shadow-xl flex items-center justify-center text-3xl text-white hover:scale-105 transition-transform"
          title="Shortlist"
        >
          ★
        </button>
        <button
          onClick={handlePass}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl hover:scale-105 transition-transform border-2 border-gray-200 hover:border-gray-400"
          title="Skip"
        >
          ⏭️
        </button>
      </footer>
    </div>
  );
}
