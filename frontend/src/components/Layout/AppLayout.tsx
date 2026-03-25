import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
