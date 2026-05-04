import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/owner/cafe', label: 'My Cafe', icon: '☕' },
  { to: '/owner/promotion', label: 'Promotion', icon: '⭐' },
];

export default function OwnerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-[#FAF9F6]">
      {/* ── Mobile topbar ────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-[#F0EDE8]">
        <div>
          <h1 className="text-lg font-bold text-[#D48B3A] leading-none">CafeMatch</h1>
          <p className="text-[10px] text-[#8A8880] mt-0.5 uppercase tracking-wider">Owner Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right max-w-[140px]">
            <p className="text-xs font-semibold text-[#1C1C1A] truncate">{user?.name}</p>
            <p className="text-[10px] text-[#8A8880] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#F0EDE8] flex-col shrink-0">
        <div className="p-6 border-b border-[#F0EDE8]">
          <h1 className="text-xl font-bold text-[#D48B3A]">CafeMatch</h1>
          <p className="text-xs text-[#8A8880] mt-1 uppercase tracking-wider">Owner Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#FDF6EC] text-[#D48B3A] font-semibold'
                    : 'text-[#1C1C1A] hover:bg-[#F0EDE8]'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#F0EDE8]">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C1C1A] truncate">{user?.name}</p>
              <p className="text-xs text-[#8A8880] truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-500 hover:text-red-700 whitespace-nowrap ml-2"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#F0EDE8] flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${
                isActive ? 'text-[#D48B3A]' : 'text-[#8A8880]'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
