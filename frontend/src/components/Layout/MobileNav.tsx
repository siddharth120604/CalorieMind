import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Home', icon: '📊' },
  { to: '/meals', label: 'Meals', icon: '🍽️' },
  { to: '/activities', label: 'Activity', icon: '🏃' },
  { to: '/body-metrics', label: 'Body', icon: '⚖️' },
  { to: '/reports', label: 'Reports', icon: '📋' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2 z-50">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs px-2 py-1 ${
              isActive ? 'text-emerald-400' : 'text-gray-500'
            }`
          }
        >
          <span className="text-lg">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
