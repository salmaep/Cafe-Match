import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, type Notification } from '../api/notifications.api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}

const TYPE_ICON: Record<string, string> = {
  friend_request: '👥',
  friend_accepted: '🤝',
  emoji_thrown: '😄',
  achievement_unlocked: '🏆',
  promotion: '🎁',
  default: '🔔',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = (p = 1) => {
    setLoading(true);
    notificationsApi
      .list(p)
      .then((res) => {
        const data = res.data ?? [];
        setItems((prev) => (p === 1 ? data : [...prev, ...data]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    load(1);
  }, [user]);

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const markOne = async (n: Notification) => {
    if (n.isRead) return;
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch {}
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#F0EDE8]">
          <p className="text-[#8A8880] mb-4">Login dulu untuk melihat notifikasi</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <div className="bg-white border-b border-[#F0EDE8] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-[#1C1C1A]">Notifikasi</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              className="text-xs font-bold text-[#D48B3A] hover:underline"
            >
              Tandai semua dibaca ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-3 inline-block">🔔</span>
            <p className="font-bold text-[#1C1C1A]">Belum ada notifikasi</p>
            <p className="text-sm text-[#8A8880] mt-1">Kami akan kabari kalau ada update</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const icon = TYPE_ICON[n.type] || TYPE_ICON.default;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOne(n)}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors ${
                    n.isRead
                      ? 'bg-white border-[#F0EDE8]'
                      : 'bg-[#FFF7ED] border-[#FED7AA]'
                  }`}
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      n.isRead ? 'bg-[#F0EDE8]' : 'bg-[#FED7AA]'
                    }`}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#1C1C1A] truncate">{n.title}</h3>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0" />}
                    </div>
                    <p className="text-sm text-[#8A8880] mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-[#8A8880] mt-1 font-semibold">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
            {items.length >= page * 20 && (
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  load(next);
                }}
                disabled={loading}
                className="w-full py-3 mt-3 bg-white border border-[#F0EDE8] rounded-xl font-bold text-[#1C1C1A] hover:bg-[#FAF9F6] disabled:opacity-50"
              >
                {loading ? 'Memuat…' : 'Muat lebih banyak'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
