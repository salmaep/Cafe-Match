import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useShortlist } from "../../context/ShortlistContext";
import { usePreferences } from "../../context/PreferencesContext";
import { commonText } from "@shared/i18n";
import { Coffee, LogOut, Trash2, User } from "../../utils/lucideIcon";
import { ChevronDown } from "lucide-react";

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { shortlist } = useShortlist();
  const { clearPreferences, preferences, wizardCompleted } = usePreferences();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const handleClearPreferences = () => {
    setMenuOpen(false);
    clearPreferences();
    navigate("/discover", { replace: true });
  };

  const hasPreferences = wizardCompleted && !!preferences;

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="hidden md:block bg-white/90 backdrop-blur-md border-b border-[#F0EDE8] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-9 h-9 rounded-xl bg-[#1C1C1A] flex items-center justify-center text-[#D48B3A] shadow-sm group-hover:shadow-md transition-shadow">
              <Coffee size={18} strokeWidth={2} />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight text-[#1C1C1A]">
              Ge<span className="text-[#D48B3A]">ser</span>
            </span>
          </Link>

          {/* Primary nav — centered */}
          <div className="flex items-center justify-center gap-1">
            <NavItem to="/" label={t(commonText.navExplore)} exact />
            <NavItem to="/discover" label={t(commonText.navDiscover)} />
            <NavItem to="/trending" label={t(commonText.navTrending)} />
            <NavItem
              to="/shortlist"
              label={t(commonText.navShortlist)}
              badge={shortlist.length || undefined}
            />
            {user && <NavItem to="/profile" label={t(commonText.navProfile)} />}
          </div>

          {/* Auth */}
          {user ? (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-[#F0EDE8] transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-[#D48B3A] text-white text-xs font-bold flex items-center justify-center overflow-hidden">
                  {(user as any).avatarUrl ? (
                    <img
                      src={(user as any).avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </span>
                <span className="text-sm font-semibold text-[#1C1C1A] max-w-[140px] truncate">
                  {user.name}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  className={`text-[#8A8880] transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#F0EDE8] shadow-xl py-1.5 overflow-hidden z-60"
                >
                  <div className="px-4 py-2.5 border-b border-[#F0EDE8] mb-1">
                    <div className="text-sm font-bold text-[#1C1C1A] truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-[#8A8880] truncate">
                      {user.email}
                    </div>
                  </div>
                  <MenuLink
                    to="/profile"
                    icon={User}
                    label={t(commonText.navProfile)}
                    onClick={() => setMenuOpen(false)}
                  />
                  {hasPreferences && (
                    <button
                      type="button"
                      onClick={handleClearPreferences}
                      role="menuitem"
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#1C1C1A] hover:bg-[#F5F3EE] transition-colors"
                    >
                      <Trash2 size={16} strokeWidth={2} className="text-[#8A8880]" />
                      <span className="font-semibold">Clear my preferences</span>
                    </button>
                  )}
                  <div className="h-px bg-[#F0EDE8] my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} strokeWidth={2} />
                    <span className="font-semibold">{t(commonText.logout)}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center bg-[#F0EDE8] rounded-full p-0.5 shrink-0">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-[#1C1C1A] text-white shadow-sm"
                      : "text-[#1C1C1A] hover:text-[#D48B3A]"
                  }`
                }
              >
                {t(commonText.login)}
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-[#1C1C1A] text-white shadow-sm"
                      : "text-[#1C1C1A] hover:text-[#D48B3A]"
                  }`
                }
              >
                {t(commonText.register)}
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  exact,
  badge,
}: {
  to: string;
  label: string;
  exact?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
          isActive
            ? "bg-[#FDF6EC] text-[#D48B3A]"
            : "text-[#1C1C1A] hover:bg-[#F0EDE8]"
        }`
      }
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#D48B3A] text-white text-[10px] font-bold align-middle">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2 text-sm text-[#1C1C1A] hover:bg-[#F0EDE8] transition-colors"
    >
      <Icon size={16} strokeWidth={2} className="text-[#5C5A52]" />
      <span className="font-semibold">{label}</span>
    </Link>
  );
}
