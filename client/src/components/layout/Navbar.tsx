import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useShortlist } from '../../context/ShortlistContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { shortlist } = useShortlist();
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
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <nav className="hidden md:block bg-white/90 backdrop-blur-md border-b border-[#F0EDE8] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-9 h-9 rounded-xl bg-[#1C1C1A] flex items-center justify-center text-base shadow-sm group-hover:shadow-md transition-shadow">
              ☕
            </span>
            <span className="text-[19px] font-extrabold tracking-tight text-[#1C1C1A]">
              Cafe<span className="text-[#D48B3A]">Match</span>
            </span>
          </Link>

          {/* Primary nav — centered */}
          <div className="flex items-center justify-center gap-1">
            <NavItem to="/discover" label="Discover" />
            <NavItem to="/trending" label="Trending" />
            <NavItem to="/" label="Explore" exact />
            <NavItem
              to="/shortlist"
              label="Shortlist"
              badge={shortlist.length || undefined}
            />
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
                <span className="w-8 h-8 rounded-full bg-[#D48B3A] text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </span>
                <span className="text-sm font-semibold text-[#1C1C1A] max-w-[140px] truncate">
                  {user.name}
                </span>
                <span
                  className={`text-[10px] text-[#8A8880] transition-transform ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#F0EDE8] shadow-xl py-1.5 overflow-hidden"
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
                    to="/bookmarks"
                    icon="🔖"
                    label="Bookmarks"
                    onClick={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    to="/favorites"
                    icon="❤️"
                    label="Favorites"
                    onClick={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    to="/shortlist"
                    icon="⭐"
                    label="Shortlist"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="h-px bg-[#F0EDE8] my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-base">↩</span>
                    <span className="font-semibold">Logout</span>
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
                      ? 'bg-[#1C1C1A] text-white shadow-sm'
                      : 'text-[#1C1C1A] hover:text-[#D48B3A]'
                  }`
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-[#1C1C1A] text-white shadow-sm'
                      : 'text-[#1C1C1A] hover:text-[#D48B3A]'
                  }`
                }
              >
                Register
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
            ? 'bg-[#FDF6EC] text-[#D48B3A]'
            : 'text-[#1C1C1A] hover:bg-[#F0EDE8]'
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
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: string;
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
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}
