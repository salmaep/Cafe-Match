import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications.api';
import { APP_VERSION } from '../config/version';

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .unreadCount()
      .then((res) => {
        const c = typeof res.data === 'number' ? res.data : (res.data as any).count ?? 0;
        setUnread(c);
      })
      .catch(() => setUnread(0));
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-8 max-w-md w-full text-center">
          <span className="text-5xl mb-4 inline-block">☕</span>
          <h1 className="text-2xl font-extrabold text-[#1C1C1A]">Welcome to CafeMatch</h1>
          <p className="text-sm text-[#8A8880] mt-2 mb-6">
            Login to access your profile and saved cafes
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold hover:bg-black transition-colors"
          >
            Login / Register
          </Link>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    if (!confirm('Yakin mau logout?')) return;
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1C1C1A] to-[#3a3a36] pt-10 pb-16 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-[#D48B3A] flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white truncate">{user.name}</h1>
            <p className="text-sm text-white/70 truncate">{user.email}</p>
            {(user as any).friendCode && (
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold">
                🎫 {(user as any).friendCode}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-2xl mx-auto px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] overflow-hidden">
          <MenuItem to="/favorites" icon="❤️" label="My Favorites" />
          <MenuItem to="/bookmarks" icon="🔖" label="My Bookmarks" />
          <MenuItem to="/shortlist" icon="⭐" label="Shortlist" />
          <MenuItem to="/friends" icon="👥" label="Teman & Invite" />
          <MenuItem to="/achievements" icon="🏆" label="Achievements" />
          <MenuItem
            to="/notifications"
            icon="🔔"
            label="Notifikasi"
            badge={unread > 0 ? unread : undefined}
          />
          <MenuItem to={`/recap/${new Date().getFullYear()}`} icon="📊" label={`Recap ${new Date().getFullYear()}`} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 w-full py-3 bg-white border border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
        >
          Logout
        </button>

        <p className="mt-6 text-center text-xs text-[#8A8880]">
          CafeMatch v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}

function MenuItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAF9F6] border-b border-[#F0EDE8] last:border-0 transition-colors"
    >
      <span className="text-xl w-8 text-center">{icon}</span>
      <span className="flex-1 font-semibold text-[#1C1C1A]">{label}</span>
      {badge != null && (
        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-extrabold">
          {badge}
        </span>
      )}
      <span className="text-[#8A8880]">›</span>
    </Link>
  );
}
