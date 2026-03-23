import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../store/authSlice';

export default function Navbar() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-emerald-400">
        CalorieMind
      </Link>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">
            {user.name || user.email}
          </span>
          {user.role === 'admin' && (
            <Link to="/admin" className="text-xs bg-amber-600/20 text-amber-400 px-2 py-1 rounded">
              Admin
            </Link>
          )}
          <button
            onClick={() => dispatch(logout())}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
