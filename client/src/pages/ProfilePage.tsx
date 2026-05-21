import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/notifications.api";
import { APP_VERSION } from "../config/version";
import EditProfileModal from "../components/profile/EditProfileModal";
import DeleteAccountModal from "../components/profile/DeleteAccountModal";

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .unreadCount()
      .then((res) => {
        const c =
          typeof res.data === "number"
            ? res.data
            : ((res.data as any).count ?? 0);
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
          <h1 className="text-2xl font-extrabold text-[#1C1C1A]">
            Welcome to CafeMatch
          </h1>
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

  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const friendCode = (user as any).friendCode as string | undefined;

  const handleLogout = () => {
    if (!confirm("Yakin mau logout?")) return;
    logout();
    navigate("/");
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
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareNative = async () => {
    if (!friendCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "CafeMatch",
          text: `Friend code ku di CafeMatch: ${friendCode}`,
          url: "https://salma.imola.ai",
        });
      } catch {}
    } else {
      shareWhatsApp();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Profile card — clean white card */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#D48B3A] flex items-center justify-center text-white text-xl font-bold overflow-hidden hover:opacity-90 transition-opacity shrink-0"
            title="Edit foto"
          >
            {(user as any).avatarUrl ? (
              <img
                src={(user as any).avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#1C1C1A] text-white text-[9px] flex items-center justify-center border-2 border-white">
              📷
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#1C1C1A] truncate">
                {user.name}
              </h1>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="shrink-0 text-[#8A8880] hover:text-[#D48B3A] transition-colors text-sm"
                title="Edit profil"
                aria-label="Edit profil"
              >
                ✏️
              </button>
            </div>
            <p className="text-sm text-[#8A8880] truncate">{user.email}</p>
            {friendCode && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F0EDE8] text-[#5C5A52] text-[11px] font-semibold tracking-wider">
                🎫 {friendCode}
              </div>
            )}
          </div>
        </div>

        {/* Invite card — minimal */}
        {friendCode && (
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1C1C1A]">
                  Ajak teman ke CafeMatch
                </h3>
                <p className="text-[12px] text-[#8A8880] mt-0.5">
                  Share friend code untuk saling terhubung
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#FAF9F6] rounded-lg px-3 py-2.5 border border-[#F0EDE8]">
                <div className="text-[9px] font-bold text-[#8A8880] uppercase tracking-wider">
                  Friend Code
                </div>
                <div className="text-base font-bold text-[#1C1C1A] tracking-[0.15em] mt-0.5">
                  {friendCode}
                </div>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="shrink-0 px-3 py-2.5 rounded-lg bg-[#FAF9F6] hover:bg-[#F0EDE8] border border-[#F0EDE8] text-[#1C1C1A] text-xs font-semibold transition-colors min-h-[60px] min-w-[56px]"
                title="Copy code"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#1FB855] text-white text-sm font-semibold transition-colors"
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={shareNative}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1C1C1A] hover:bg-black text-white text-sm font-semibold transition-colors"
              >
                📤 Bagikan
              </button>
            </div>
          </div>
        )}

        {/* Quick actions — uniform muted tiles */}
        <div className="grid grid-cols-3 gap-2">
          <QuickAction to="/friends" icon="👥" label="Teman" />
          <QuickAction to="/achievements" icon="🎖️" label="Achievement" />
          <QuickAction
            to="/notifications"
            icon="🔔"
            label="Notifikasi"
            badge={unread > 0 ? unread : undefined}
          />
        </div>

        {/* My Lists */}
        <Section title="Cafe Saya">
          <MenuItem
            to="/favorites"
            icon="❤️"
            label="My Favorites"
            subtitle="Cafe yang kamu suka"
          />
          <MenuItem
            to="/bookmarks"
            icon="🔖"
            label="My Bookmarks"
            subtitle="Untuk dikunjungi nanti"
          />
          <MenuItem
            to="/shortlist"
            icon="⭐"
            label="Shortlist"
            subtitle="Hasil swipe Discover"
          />
        </Section>

        {/* Account */}
        <Section title="Akun">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAF9F6] border-b border-[#F0EDE8] transition-colors text-left"
          >
            <span className="text-lg w-7 text-center">⚙️</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-[#1C1C1A]">
                Edit Profil
              </div>
              <div className="text-[11px] text-[#A8A59C]">
                Nama, foto, password
              </div>
            </div>
            <span className="text-[#8A8880]">›</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 border-b border-[#F0EDE8] transition-colors text-left"
          >
            <span className="text-lg w-7 text-center">🚪</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-red-600">Logout</div>
              <div className="text-[11px] text-[#A8A59C]">Keluar dari akun</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
          >
            <span className="text-lg w-7 text-center">🗑️</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-red-600">
                Hapus Akun
              </div>
              <div className="text-[11px] text-[#A8A59C]">
                Data dihapus permanen setelah 30 hari
              </div>
            </div>
            <span className="text-[#8A8880]">›</span>
          </button>
        </Section>

        <div className="flex items-center justify-center gap-3 text-[11px] text-[#A8A59C] pt-2 pb-1 flex-wrap">
          <Link
            to="/privacy-policy"
            className="hover:text-[#1C1C1A] hover:underline transition-colors"
          >
            Kebijakan Privasi
          </Link>
          <span>·</span>
          <Link
            to="/account-deletion"
            className="hover:text-[#1C1C1A] hover:underline transition-colors"
          >
            Hapus Akun
          </Link>
          <span>·</span>
          <span>CafeMatch v{APP_VERSION}</span>
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider px-1 mb-1.5">
        {title}
      </h3>
      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
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
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF9F6] border-b border-[#F0EDE8] last:border-0 transition-colors"
    >
      <span className="text-lg w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#1C1C1A] truncate">
          {label}
        </div>
        {subtitle && (
          <div className="text-[11px] text-[#A8A59C] truncate">{subtitle}</div>
        )}
      </div>
      {badge != null && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
      <span className="text-[#8A8880]">›</span>
    </Link>
  );
}

function QuickAction({
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
      className="relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl bg-white border border-[#F0EDE8] hover:border-[#D48B3A] hover:bg-[#FFF8EC] transition-colors"
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-semibold text-center leading-tight text-[#5C5A52]">
        {label}
      </span>
      {badge != null && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}
