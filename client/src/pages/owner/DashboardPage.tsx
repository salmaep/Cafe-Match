import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '../../api/owner.api';
import type { OwnerDashboard } from '../../types/owner';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerApi
      .getDashboard()
      .then((res) => setDashboard(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D48B3A] border-t-transparent" />
      </div>
    );
  }

  if (!dashboard?.hasCafe) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1C1A] mb-5">Dashboard</h1>
        <div className="bg-[#FDF6EC] border border-[#D48B3A]/30 rounded-2xl p-6 text-center">
          <span className="block text-4xl mb-3">☕</span>
          <p className="text-[#1C1C1A] font-semibold mb-1">Belum ada cafe terdaftar</p>
          <p className="text-sm text-[#8A8880] mb-4">
            Daftarkan cafe kamu dulu untuk mulai mengelola.
          </p>
          <Link
            to="/owner/cafe"
            className="inline-block px-5 py-2.5 bg-[#D48B3A] text-white rounded-xl font-bold text-sm hover:bg-[#b87528] transition-colors"
          >
            Register Your Cafe
          </Link>
        </div>
      </div>
    );
  }

  const { cafe, analytics, activePromotion, pendingCount } = dashboard;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1C1A] mb-1">Dashboard</h1>
      <p className="text-sm text-[#8A8880] mb-5">{cafe?.name}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Views" value={analytics?.totalViews || 0} color="blue" />
        <StatCard label="Total Clicks" value={analytics?.totalClicks || 0} color="green" />
        <StatCard label="Bookmarks" value={cafe?.bookmarksCount || 0} color="amber" />
        <StatCard label="Favorites" value={cafe?.favoritesCount || 0} color="red" />
      </div>

      {/* Active Promotion */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-5 mb-5">
        <h2 className="text-[13px] font-bold text-[#8A8880] uppercase tracking-[0.08em] mb-3">
          Promotion Status
        </h2>
        {activePromotion ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-full mb-2 uppercase tracking-wider">
                Active
              </span>
              <p className="text-[#1C1C1A] font-semibold truncate">
                {activePromotion.packageName}
              </p>
              <p className="text-xs text-[#8A8880] mt-0.5">
                {activePromotion.type === 'new_cafe' ? 'New Cafe Highlight' : 'Featured Promo'}
                {activePromotion.daysRemaining != null && (
                  <> · {activePromotion.daysRemaining} days remaining</>
                )}
              </p>
            </div>
            <Link
              to="/owner/promotion"
              className="shrink-0 text-sm font-semibold text-[#D48B3A] hover:underline self-start sm:self-center"
            >
              Manage →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[#8A8880] text-sm">No active promotion</p>
            <Link
              to="/owner/promotion"
              className="px-4 py-2 bg-[#D48B3A] text-white rounded-xl font-bold text-sm hover:bg-[#b87528] transition-colors text-center sm:self-start"
            >
              Get Started
            </Link>
          </div>
        )}
        {(pendingCount || 0) > 0 && (
          <p className="text-xs text-[#D48B3A] mt-3 font-semibold">
            ⏳ {pendingCount} promotion(s) pending review
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/owner/cafe"
          className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-5 hover:shadow-md hover:border-[#D48B3A]/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">☕</span>
            <h3 className="font-semibold text-[#1C1C1A]">Edit Cafe Profile</h3>
          </div>
          <p className="text-xs text-[#8A8880]">Update info, menus, photos</p>
        </Link>
        <Link
          to="/owner/promotion"
          className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-5 hover:shadow-md hover:border-[#D48B3A]/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⭐</span>
            <h3 className="font-semibold text-[#1C1C1A]">Buy Promotion</h3>
          </div>
          <p className="text-xs text-[#8A8880]">Boost your cafe visibility</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const ringColor: Record<typeof color, string> = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    amber: 'text-[#D48B3A]',
    red: 'text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-4">
      <p className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-2xl lg:text-3xl font-bold mt-1 ${ringColor[color]}`}>
        {value.toLocaleString('id-ID')}
      </p>
    </div>
  );
}
