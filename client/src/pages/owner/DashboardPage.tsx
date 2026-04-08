import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '../../api/owner.api';
import type { OwnerDashboard } from '../../types/owner';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerApi.getDashboard()
      .then((res) => setDashboard(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!dashboard?.hasCafe) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 mb-4">You haven't registered your cafe yet.</p>
          <Link
            to="/owner/cafe"
            className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Register Your Cafe
          </Link>
        </div>
      </div>
    );
  }

  const { cafe, analytics, activePromotion, pendingCount } = dashboard;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Views" value={analytics?.totalViews || 0} color="blue" />
        <StatCard label="Total Clicks" value={analytics?.totalClicks || 0} color="green" />
        <StatCard label="Bookmarks" value={cafe?.bookmarksCount || 0} color="amber" />
        <StatCard label="Favorites" value={cafe?.favoritesCount || 0} color="red" />
      </div>

      {/* Active Promotion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Promotion Status</h2>
        {activePromotion ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium mb-2">
                Active
              </span>
              <p className="text-gray-700">
                <strong>{activePromotion.packageName}</strong> — {activePromotion.type === 'new_cafe' ? 'New Cafe Highlight' : 'Featured Promo'}
              </p>
              {activePromotion.daysRemaining != null && (
                <p className="text-sm text-gray-500 mt-1">
                  {activePromotion.daysRemaining} days remaining
                </p>
              )}
            </div>
            <Link
              to="/owner/promotion"
              className="text-sm text-amber-600 hover:underline"
            >
              Manage
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-500">No active promotion</p>
            <Link
              to="/owner/promotion"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
            >
              Get Started
            </Link>
          </div>
        )}
        {(pendingCount || 0) > 0 && (
          <p className="text-sm text-amber-600 mt-3">
            {pendingCount} promotion(s) pending review
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/owner/cafe"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-medium text-gray-700">Edit Cafe Profile</h3>
          <p className="text-xs text-gray-400 mt-1">Update info, menus, photos</p>
        </Link>
        <Link
          to="/owner/promotion"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-medium text-gray-700">Buy Promotion</h3>
          <p className="text-xs text-gray-400 mt-1">Boost your cafe visibility</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]?.split(' ')[1] || 'text-gray-800'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
