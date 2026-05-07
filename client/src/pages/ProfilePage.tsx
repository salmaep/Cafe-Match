import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications.api';
import { APP_VERSION } from '../config/version';

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [copied, setCopied] = useState(false);

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

  const friendCode = (user as any).friendCode as string | undefined;

  const handleLogout = () => {
    if (!confirm('Yakin mau logout?')) return;
    logout();
    navigate('/');
  };

  const copyCode = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const shareWhatsApp = () => {
    if (!friendCode) return;
    const text = `Yuk gabung CafeMatch! Pakai friend code ku: ${friendCode}\n\nDownload di salma.imola.ai`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareNative = async () => {
    if (!friendCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CafeMatch',
          text: `Friend code ku di CafeMatch: ${friendCode}`,
          url: 'https://salma.imola.ai',
        });
      } catch {}
    } else {
      shareWhatsApp();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Hero — warm gradient with decorative blobs */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1C1C1A] via-[#2A2520] to-[#1C1C1A] pt-10 pb-20 px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-12 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl"
        />

        <div className="relative max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D48B3A] to-[#B45309] flex items-center justify-center text-white text-2xl font-extrabold shadow-xl ring-2 ring-white/10">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white truncate">{user.name}</h1>
            <p className="text-sm text-white/70 truncate">{user.email}</p>
            {friendCode && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold ring-1 ring-white/20">
                🎫 <span className="tracking-widest">{friendCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-12 space-y-4">
        {/* Invite card — prominent */}
        {friendCode && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF1E0] via-[#FDF6EC] to-[#FFF8EC] ring-1 ring-amber-200 shadow-lg">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-300/30 blur-2xl"
            />
            <div className="relative p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#EA580C] flex items-center justify-center text-white text-lg shadow-md">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-[#1C1C1A]">
                    Ajak teman ke CafeMatch
                  </h3>
                  <p className="text-[12px] text-[#8A7460] mt-0.5">
                    Share kode kamu — biar bisa saling lihat check-in & throw emoji
                  </p>
                </div>
              </div>

              {/* Friend code display */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-xl px-4 py-3 ring-1 ring-amber-200 shadow-inner">
                  <div className="text-[10px] font-bold text-[#B45309] uppercase tracking-[0.15em]">
                    Friend Code
                  </div>
                  <div className="text-xl font-extrabold text-[#1C1C1A] tracking-[0.2em] tabular-nums mt-0.5">
                    {friendCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="shrink-0 h-full px-4 py-3 rounded-xl bg-white ring-1 ring-amber-200 hover:ring-[#D48B3A] hover:bg-[#FFF8EC] transition-all text-[#1C1C1A] font-bold text-sm flex flex-col items-center justify-center min-h-[60px]"
                  title="Copy code"
                >
                  {copied ? '✓' : '📋'}
                  <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider text-[#8A7460]">
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>

              {/* Share actions */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1FB855] text-white text-sm font-bold transition-colors shadow-sm"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={shareNative}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1C1C1A] hover:bg-black text-white text-sm font-bold transition-colors shadow-sm"
                >
                  📤 Bagikan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions grid — Friends, Achievements, Notifications, Recap */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <QuickAction to="/friends" icon="👥" label="Teman" tone="amber" />
          <QuickAction to="/achievements" icon="🏆" label="Achievement" tone="orange" />
          <QuickAction
            to="/notifications"
            icon="🔔"
            label="Notifikasi"
            badge={unread > 0 ? unread : undefined}
            tone="rose"
          />
          <QuickAction
            to={`/recap/${new Date().getFullYear()}`}
            icon="📊"
            label={`Recap ${new Date().getFullYear()}`}
            tone="violet"
          />
        </div>

        {/* My Lists section */}
        <Section title="Cafe Saya">
          <MenuItem to="/favorites" icon="❤️" label="My Favorites" subtitle="Cafe yang kamu suka" />
          <MenuItem to="/bookmarks" icon="🔖" label="My Bookmarks" subtitle="Untuk dikunjungi nanti" />
          <MenuItem to="/shortlist" icon="⭐" label="Shortlist" subtitle="Hasil swipe Discover" />
        </Section>

        {/* Account section */}
        <Section title="Akun">
          <MenuItem to="/discover" icon="🪄" label="Ulangi Wizard" subtitle="Atur ulang preferensi" />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left"
          >
            <span className="text-xl w-8 text-center">🚪</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-red-600">Logout</div>
              <div className="text-[11px] text-[#A8A59C]">Keluar dari akun</div>
            </div>
          </button>
        </Section>

        <p className="text-center text-xs text-[#8A8880] pt-2">
          CafeMatch v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-extrabold text-[#8A8880] uppercase tracking-[0.12em] px-1 mb-2">
        {title}
      </h3>
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function MenuItem({
  to,
  icon,
  label,
  subtitle,
  badge,
}: {
  to: string;
  icon: string;
  label: string;
  subtitle?: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAF9F6] border-b border-[#F0EDE8] last:border-0 transition-colors"
    >
      <span className="text-xl w-8 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#1C1C1A] truncate">{label}</div>
        {subtitle && (
          <div className="text-[11px] text-[#A8A59C] truncate">{subtitle}</div>
        )}
      </div>
      {badge != null && (
        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-extrabold">
          {badge}
        </span>
      )}
      <span className="text-[#8A8880]">›</span>
    </Link>
  );
}

const TONE_STYLES: Record<string, string> = {
  amber: 'from-[#FEF3C7] to-[#FDE68A] ring-amber-200 text-amber-900',
  orange: 'from-[#FED7AA] to-[#FDBA74] ring-orange-200 text-orange-900',
  rose: 'from-[#FECDD3] to-[#FDA4AF] ring-rose-200 text-rose-900',
  violet: 'from-[#DDD6FE] to-[#C4B5FD] ring-violet-200 text-violet-900',
};

function QuickAction({
  to,
  icon,
  label,
  badge,
  tone = 'amber',
}: {
  to: string;
  icon: string;
  label: string;
  badge?: number;
  tone?: keyof typeof TONE_STYLES;
}) {
  const style = TONE_STYLES[tone] || TONE_STYLES.amber;
  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl bg-gradient-to-br ${style} ring-1 hover:shadow-md transition-shadow`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
      {badge != null && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold">
          {badge}
        </span>
      )}
    </Link>
  );
}
