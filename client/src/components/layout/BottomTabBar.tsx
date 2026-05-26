import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { useShortlist } from "../../context/ShortlistContext";
import { useAuth } from "../../context/AuthContext";
import { commonText } from "@shared/i18n";
import { Flame, Map, Sparkles, Star, User } from "../../utils/lucideIcon";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
}

export default function BottomTabBar() {
  const { t } = useTranslation();
  const { shortlist } = useShortlist();
  const { user } = useAuth();

  const TABS: Tab[] = [
    { to: "/", label: t(commonText.navExplore), icon: Map, exact: true },
    { to: "/discover", label: t(commonText.navDiscover), icon: Sparkles },
    { to: "/trending", label: t(commonText.navTrending), icon: Flame },
    {
      to: "/shortlist",
      label: t(commonText.navShortlist),
      icon: Star,
      badge: shortlist.length || undefined,
    },
    {
      to: user ? "/profile" : "/login",
      label: t(commonText.navProfile),
      icon: User,
    },
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
                isActive
                  ? "text-[#D48B3A]"
                  : "text-[#8A8880] hover:text-[#1C1C1A]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 2}
                  className={`transition-opacity ${
                    isActive ? "opacity-100" : "opacity-70"
                  }`}
                />
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
