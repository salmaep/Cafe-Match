import { useState, useEffect } from 'react';
import { votesApi } from '../../api/votes.api';
import { purposesApi } from '../../api/purposes.api';
import type { Purpose, VoteTally } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  cafeId: number;
}

export default function VoteSection({ cafeId }: Props) {
  const { user } = useAuth();
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [tallies, setTallies] = useState<VoteTally[]>([]);
  const [myVotes, setMyVotes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    purposesApi.getAll().then((res) => setPurposes(res.data));
    votesApi.getTallies(cafeId).then((res) => setTallies(res.data));
    if (user) {
      votesApi.getMyVotes(cafeId).then((res) => setMyVotes(res.data));
    }
  }, [cafeId, user]);

  const totalVotes = tallies.reduce((sum, t) => sum + t.count, 0);

  const togglePurpose = (purposeId: number) => {
    setMyVotes((prev) => {
      if (prev.includes(purposeId)) {
        return prev.filter((id) => id !== purposeId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, purposeId];
    });
  };

  const handleSubmit = async () => {
    if (myVotes.length === 0) return;
    setSaving(true);
    try {
      await votesApi.castVote(cafeId, myVotes);
      const res = await votesApi.getTallies(cafeId);
      setTallies(res.data);
    } finally {
      setSaving(false);
    }
  };

  const getCount = (purposeId: number) =>
    tallies.find((t) => t.purposeId === purposeId)?.count || 0;

  const getPercentage = (purposeId: number) =>
    totalVotes > 0 ? Math.round((getCount(purposeId) / totalVotes) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      <h2 className="font-semibold text-gray-800 mb-1">
        What's this cafe best for?
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        {user
          ? `Select up to 3 categories (${myVotes.length}/3 selected)`
          : 'Log in to vote'}
      </p>

      <div className="space-y-2">
        {purposes
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((purpose) => {
            const isSelected = myVotes.includes(purpose.id);
            const count = getCount(purpose.id);
            const pct = getPercentage(purpose.id);

            return (
              <div key={purpose.id} className="relative">
                <button
                  onClick={() => user && togglePurpose(purpose.id)}
                  disabled={!user || (!isSelected && myVotes.length >= 3)}
                  className={`relative z-10 w-full text-left px-4 py-2.5 rounded-lg border transition-colors text-sm ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {purpose.icon && <span className="mr-2">{purpose.icon}</span>}
                      {purpose.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {count} vote{count !== 1 ? 's' : ''} ({pct}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-lg bg-amber-100 opacity-30 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </button>
              </div>
            );
          })}
      </div>

      {user && (
        <button
          onClick={handleSubmit}
          disabled={saving || myVotes.length === 0}
          className="mt-4 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Submit Vote'}
        </button>
      )}
    </div>
  );
}
