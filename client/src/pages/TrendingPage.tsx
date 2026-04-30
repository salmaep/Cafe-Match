import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cafesApi } from '../api/cafes.api';
import { purposesApi } from '../api/purposes.api';
import type { Cafe, Purpose } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { getCafeImage, placeholderImage } from '../utils/cafeImage';

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function TrendingPage() {
  const navigate = useNavigate();
  const { latitude, longitude } = useGeolocation();

  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [activePurposeId, setActivePurposeId] = useState<number | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purposesApi
      .getAll()
      .then((res) => setPurposes(res.data ?? []))
      .catch(() => setPurposes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    cafesApi
      .search({
        lat: latitude ?? -6.2,
        lng: longitude ?? 106.8,
        radius: 5000,
        purposeId: activePurposeId ?? undefined,
        limit: 10,
      })
      .then((res) => setCafes(res.data?.data ?? []))
      .catch(() => setCafes([]))
      .finally(() => setLoading(false));
  }, [latitude, longitude, activePurposeId]);

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#1C1C1A] mb-4">🔥 Trending Cafes</h1>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <FilterPill
            active={activePurposeId === null}
            onClick={() => setActivePurposeId(null)}
            label="All"
          />
          {purposes.map((p) => (
            <FilterPill
              key={p.id}
              active={activePurposeId === p.id}
              onClick={() => setActivePurposeId(p.id)}
              label={p.name}
            />
          ))}
          {activePurposeId !== null && (
            <button
              onClick={() => setActivePurposeId(null)}
              className="ml-auto shrink-0 px-3 py-1.5 rounded-full border border-[#D48B3A] text-xs font-semibold text-[#D48B3A] hover:bg-[#FDF6EC] transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cafes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-3">🔥</span>
            <h2 className="text-lg font-bold text-[#1C1C1A] mb-1">No trending cafes</h2>
            <p className="text-sm text-[#8A8880]">Try a different filter or check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cafes.map((cafe, i) => {
              const rank = i + 1;
              const photo = getCafeImage(cafe);
              const distanceKm =
                cafe.distanceMeters != null ? (cafe.distanceMeters / 1000).toFixed(1) : null;
              const rankBg = RANK_COLORS[rank] ?? '#F0EDE8';
              const rankText = rank <= 3 ? '#1C1C1A' : '#8A8880';

              return (
                <button
                  key={cafe.id}
                  onClick={() => navigate(`/cafe/${cafe.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: rankBg, color: rankText }}
                  >
                    {rank}
                  </div>
                  <img
                    src={photo}
                    alt={cafe.name}
                    className="shrink-0 w-[70px] h-[70px] rounded-xl object-cover bg-[#F0EDE8]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1C1C1A] mb-0.5 truncate">{cafe.name}</h3>
                    {distanceKm && (
                      <p className="text-xs text-[#8A8880] mb-1">{distanceKm} km</p>
                    )}
                    {cafe.priceRange && (
                      <span className="inline-block bg-[#FDF6EC] rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#D48B3A]">
                        {cafe.priceRange}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-center min-w-[40px]">
                    <span className="text-base">❤️</span>
                    <span className="text-xs font-bold text-[#D48B3A] mt-0.5">
                      {cafe.favoritesCount ?? 0}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-[#D48B3A] text-white' : 'bg-[#F0EDE8] text-[#8A8880] hover:bg-[#E8E4DD]'
      }`}
    >
      {label}
    </button>
  );
}
