import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomTabBar from './BottomTabBar';

export default function UserLayout() {
  return (
    <>
      <Navbar />
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </>
  );
}
