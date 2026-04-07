import { useState } from 'react';

interface Filters {
  q: string;
  wifiAvailable: boolean;
  hasMushola: boolean;
  priceRange: string;
}

interface Props {
  onSearch: (filters: Filters) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const [q, setQ] = useState('');
  const [wifiAvailable, setWifiAvailable] = useState(false);
  const [hasMushola, setHasMushola] = useState(false);
  const [priceRange, setPriceRange] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ q, wifiAvailable, hasMushola, priceRange });
  };

  const handleClear = () => {
    setQ('');
    setWifiAvailable(false);
    setHasMushola(false);
    setPriceRange('');
    onSearch({ q: '', wifiAvailable: false, hasMushola: false, priceRange: '' });
  };

  const hasActiveFilters = wifiAvailable || hasMushola || priceRange;

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cafe name or address..."
            className="w-full px-4 py-2 pl-9 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
            hasActiveFilters
              ? 'border-amber-400 text-amber-700 bg-amber-50'
              : 'border-gray-300 text-gray-600 hover:border-amber-400'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </button>
      </form>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={wifiAvailable}
              onChange={(e) => {
                setWifiAvailable(e.target.checked);
                onSearch({ q, wifiAvailable: e.target.checked, hasMushola, priceRange });
              }}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            WiFi
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMushola}
              onChange={(e) => {
                setHasMushola(e.target.checked);
                onSearch({ q, wifiAvailable, hasMushola: e.target.checked, priceRange });
              }}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            Mushola
          </label>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Price:</span>
            {['$', '$$', '$$$'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  const newPrice = priceRange === p ? '' : p;
                  setPriceRange(newPrice);
                  onSearch({ q, wifiAvailable, hasMushola, priceRange: newPrice });
                }}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  priceRange === p
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'border-gray-300 hover:border-amber-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-700 ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
