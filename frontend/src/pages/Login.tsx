import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { login, clearError } from '../store/authSlice';
import Alert from '../components/Common/Alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">CalorieMind</h1>
          <p className="text-gray-400 mt-2">Track your calories with AI</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          {error && <Alert type="error" message={error} onClose={() => dispatch(clearError())} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Min 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
