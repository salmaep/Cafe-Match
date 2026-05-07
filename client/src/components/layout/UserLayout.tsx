import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomTabBar from './BottomTabBar';
import ActiveCheckinBanner from '../checkin/ActiveCheckinBanner';

// Routes that should be fullscreen on mobile (no top navbar, no bottom tab bar) —
// matches mobile app behavior where these are dedicated immersive Stack screens
// (CardSwipe, CafeDetail, Wizard) that sit outside MainTabs.
const FULLSCREEN_MOBILE_ROUTES = ['/discover', '/wizard', '/cafe'];

export default function UserLayout() {
  const { pathname } = useLocation();
  const fullscreenMobile = FULLSCREEN_MOBILE_ROUTES.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <>
      {/* Active check-in banner — sticky top, shown across all user pages when checked in */}
      <ActiveCheckinBanner />
      {/* Top navbar — hidden on mobile fullscreen routes, always shown on md+ */}
      <div className={fullscreenMobile ? 'hidden md:block' : ''}>
        <Navbar />
      </div>
      <main className={fullscreenMobile ? 'md:pb-0' : 'pb-16 md:pb-0'}>
        <Outlet />
      </main>
      {!fullscreenMobile && <BottomTabBar />}
    </>
  );
}
