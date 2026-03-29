import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/meals', label: 'Meals', icon: '🍽️' },
  { to: '/activities', label: 'Activities', icon: '🏃' },
  { to: '/body-metrics', label: 'Body Metrics', icon: '⚖️' },
  { to: '/inventory', label: 'Inventory', icon: '🗄️' },
  { to: '/meal-plan', label: 'Meal Plan', icon: '📝' },
  { to: '/reports', label: 'Reports', icon: '📋' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 min-h-[calc(100vh-53px)] hidden md:block">
      <nav className="py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-emerald-400 bg-emerald-400/10 border-r-2 border-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
