import { NavLink } from 'react-router-dom';
import { useShortlist } from '../../context/ShortlistContext';
import { useAuth } from '../../context/AuthContext';

interface Tab {
  to: string;
  label: string;
  icon: string;
  badge?: number;
  exact?: boolean;
}

export default function BottomTabBar() {
  const { shortlist } = useShortlist();
  const { user } = useAuth();

  const TABS: Tab[] = [
    { to: '/', label: 'Discover', icon: '🗺️', exact: true },
    { to: '/trending', label: 'Explore', icon: '🔥' },
    {
      to: '/shortlist',
      label: 'Shortlist',
      icon: '★',
      badge: shortlist.length || undefined,
    },
    { to: user ? '/bookmarks' : '/login', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-[#F0EDE8] z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-[#D48B3A]' : 'text-[#8A8880] hover:text-[#1C1C1A]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`text-[22px] leading-none transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="text-[11px] font-semibold">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute top-1 right-1/2 translate-x-[18px] bg-[#D48B3A] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
                    {tab.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
