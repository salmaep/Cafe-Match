import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, type Notification } from '../api/notifications.api';
import Seo from '../components/seo/Seo';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function dateGroupKey(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dDate.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return 'Minggu ini';
  if (diffDays < 30) return 'Bulan ini';
  return 'Lebih lama';
}

const TYPE_META: Record<string, { icon: string; tone: string }> = {
  friend_request: { icon: '👥', tone: 'bg-blue-50 text-blue-600' },
  friend_accepted: { icon: '🤝', tone: 'bg-emerald-50 text-emerald-600' },
  emoji_thrown: { icon: '😄', tone: 'bg-violet-50 text-violet-600' },
  achievement_unlocked: { icon: '🏆', tone: 'bg-amber-50 text-amber-600' },
  promotion: { icon: '🎁', tone: 'bg-rose-50 text-rose-600' },
  together_bomb: { icon: '💥', tone: 'bg-orange-50 text-orange-600' },
  default: { icon: '🔔', tone: 'bg-[#F0EDE8] text-[#5C5A52]' },
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = (p = 1) => {
    setLoading(true);
    notificationsApi
      .list(p)
      .then((res) => {
        const data = res.data ?? [];
        setItems((prev) => (p === 1 ? data : [...prev, ...data]));
        setHasMore(data.length >= PAGE_SIZE);
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

  const unreadCount = items.filter((n) => !n.isRead).length;

  // Group items by relative date (Hari ini / Kemarin / Minggu ini / etc)
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    const order: string[] = [];
    for (const n of items) {
      const key = dateGroupKey(n.createdAt);
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(n);
    }
    return order.map((key) => ({ key, items: groups[key] }));
  }, [items]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#F0EDE8]">
          <span className="text-5xl mb-4 inline-block">🔔</span>
          <p className="text-[#1C1C1A] font-bold">Login dulu untuk melihat notifikasi</p>
          <p className="text-sm text-[#8A8880] mt-1 mb-5">
            Kami akan kabari saat ada teman, achievement, atau promo baru.
          </p>
          <Link
            to="/login?redirect=%2Fnotifications"
            className="inline-block px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold hover:bg-black transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <Seo title="Notifikasi" description="Lihat update terbaru dari CafeMatch" />

      {/* Hero — full-width on mobile, card on desktop (consistent with other pages) */}
      <div className="lg:max-w-3xl lg:mx-auto lg:px-8 lg:pt-5">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#FFF1E0] via-[#FFFBF3] to-[#FFF8EC] border-b border-amber-100 lg:border-0 lg:rounded-2xl lg:ring-1 lg:ring-amber-200/60 lg:shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -left-12 w-60 h-60 rounded-full bg-amber-200/50 blur-3xl"
          />
          <div className="relative px-5 sm:px-7 lg:px-8 py-5 sm:py-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-amber-200 text-[10px] font-extrabold tracking-[0.15em] uppercase text-[#B45309] mb-2 shadow-sm">
                🔔 Notifikasi
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1C1A] tracking-tight">
                {unreadCount > 0
                  ? `${unreadCount} pesan baru`
                  : 'Semua sudah dibaca'}
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                className="shrink-0 text-xs font-bold text-[#1C1C1A] bg-white hover:bg-[#FFF8EC] ring-1 ring-amber-200 px-3 py-1.5 rounded-full shadow-sm transition-colors"
              >
                ✓ Tandai semua
              </button>
            )}
          </div>
        </header>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {loading && items.length === 0 ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <section key={group.key}>
                <h2 className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider px-1 mb-2">
                  {group.key}
                </h2>
                <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
                  {group.items.map((n, i) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      isLast={i === group.items.length - 1}
                      onClick={() => markOne(n)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {hasMore && (
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  load(next);
                }}
                disabled={loading}
                className="w-full py-3 bg-white border border-[#F0EDE8] rounded-xl font-bold text-sm text-[#1C1C1A] hover:bg-[#FAF9F6] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Memuat…' : 'Muat lebih banyak'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function NotifRow({
  n,
  isLast,
  onClick,
}: {
  n: Notification;
  isLast: boolean;
  onClick: () => void;
}) {
  const meta = TYPE_META[n.type] || TYPE_META.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
        isLast ? '' : 'border-b border-[#F0EDE8]'
      } ${n.isRead ? 'hover:bg-[#FAF9F6]' : 'bg-amber-50/40 hover:bg-amber-50'}`}
    >
      <div
        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${meta.tone}`}
      >
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3
            className={`text-sm truncate ${
              n.isRead ? 'font-semibold text-[#1C1C1A]' : 'font-extrabold text-[#1C1C1A]'
            }`}
          >
            {n.title}
          </h3>
          {!n.isRead && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-[#EA580C] mt-1.5" />
          )}
        </div>
        <p className="text-[13px] text-[#5C5A52] mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[11px] text-[#8A8880] mt-1 font-medium">
          {timeAgo(n.createdAt)}
        </p>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#E0DCD3]">
      <span className="text-5xl mb-3 inline-block">🔔</span>
      <h2 className="text-lg font-bold text-[#1C1C1A]">Belum ada notifikasi</h2>
      <p className="text-sm text-[#8A8880] mt-2 max-w-sm mx-auto px-4">
        Kami bakal kabarin saat ada teman, achievement, promo, atau ada yang
        check-in barengan kamu.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-5">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="h-3 w-24 bg-[#F0EDE8] rounded animate-pulse mb-2 ml-1" />
          <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-[#F0EDE8] last:border-0"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 bg-[#F0EDE8] rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-[#F0EDE8] rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-[#F0EDE8] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
