import { NavLink } from 'react-router-dom';

interface Tab {
  to: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { to: '/', label: 'Map', icon: '🗺️' },
  { to: '/discover', label: 'Discover', icon: '☕' },
  { to: '/trending', label: 'Trending', icon: '🔥' },
  { to: '/bookmarks', label: 'Saved', icon: '★' },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-[#F0EDE8] z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-[#D48B3A]' : 'text-[#8A8880] hover:text-[#1C1C1A]'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
