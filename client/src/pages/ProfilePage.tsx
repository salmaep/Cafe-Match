import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { APP_VERSION } from "../config/version";
import {
  Camera,
  ChevronRight,
  Coffee,
  Heart,
  LogOut,
  Pencil,
  Settings,
  Star,
  Trash2,
} from "../utils/lucideIcon";
import EditProfileModal from "../components/profile/EditProfileModal";
import DeleteAccountModal from "../components/profile/DeleteAccountModal";

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          <Coffee
            size={48}
            strokeWidth={1.5}
            className="mx-auto mb-4 text-[#D48B3A]"
          />
          <h1 className="text-2xl font-extrabold text-[#1C1C1A]">
            Welcome to Geser
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

  const handleLogout = () => {
    if (!confirm("Yakin mau logout?")) return;
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-3">
        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-[#F0EDE8] p-5 flex items-center gap-4">
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
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#1C1C1A] text-white flex items-center justify-center border-2 border-white">
              <Camera size={10} strokeWidth={2.5} />
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
                className="shrink-0 text-[#8A8880] hover:text-[#D48B3A] transition-colors"
                title="Edit profil"
                aria-label="Edit profil"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm text-[#8A8880] truncate">{user.email}</p>
          </div>
        </div>

        {/* My Lists */}
        <Section title="Cafe Saya">
          <MenuItem
            to="/favorites"
            icon={Heart}
            label="My Favorites"
            subtitle="Cafe yang kamu suka"
          />
          <MenuItem
            to="/shortlist"
            icon={Star}
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
            <span className="w-7 flex items-center justify-center text-[#5C5A52]">
              <Settings size={18} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-[#1C1C1A]">
                Edit Profil
              </div>
              <div className="text-[11px] text-[#A8A59C]">
                Nama, foto, password
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="text-[#8A8880]" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 border-b border-[#F0EDE8] transition-colors text-left"
          >
            <span className="w-7 flex items-center justify-center text-red-600">
              <LogOut size={18} strokeWidth={2} />
            </span>
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
            <span className="w-7 flex items-center justify-center text-red-600">
              <Trash2 size={18} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-red-600">
                Hapus Akun
              </div>
              <div className="text-[11px] text-[#A8A59C]">
                Data dihapus permanen setelah 30 hari
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="text-[#8A8880]" />
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
          <span>Geser v{APP_VERSION}</span>
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
      <h3 className="text-[10px] font-bold text-[#8A8880] uppercase tracking-wider px-1 mb-1.5">
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
  icon: Icon,
  label,
  subtitle,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF9F6] border-b border-[#F0EDE8] last:border-0 transition-colors"
    >
      <span className="w-7 flex items-center justify-center text-[#5C5A52]">
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#1C1C1A] truncate">
          {label}
        </div>
        {subtitle && (
          <div className="text-[11px] text-[#A8A59C] truncate">{subtitle}</div>
        )}
      </div>
      <ChevronRight size={16} strokeWidth={2} className="text-[#8A8880]" />
    </Link>
  );
}
