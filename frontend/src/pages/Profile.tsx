import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/useAppDispatch';
import { fetchProfile, setUser } from '../store/authSlice';
import { updateProfileApi } from '../api/profile';
import Alert from '../components/Common/Alert';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function Profile() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    if (!user) {
      dispatch(fetchProfile());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age?.toString() || '');
      setGender(user.gender || 'male');
      setWeight(user.weight?.toString() || '');
      setHeight(user.height?.toString() || '');
      setGoal(user.goal || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    setReasoning('');

    try {
      const res = await updateProfileApi({
        name,
        age: Number(age),
        gender,
        weight: Number(weight),
        height: Number(height),
        goal,
      });
      dispatch(setUser(res.data.user));
      setAlert({ type: 'success', message: 'Profile saved successfully!' });
      if (res.data.calorie_reasoning) {
        setReasoning(res.data.calorie_reasoning);
      }
      if (!user?.profile_completed) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch {
      setAlert({ type: 'error', message: 'Error saving profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">
        {user.profile_completed ? 'Edit Profile' : 'Complete Your Profile'}
      </h1>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min={1}
              max={150}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
            {user.profile_completed ? (
              <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 text-sm">
                {user.weight ? `${user.weight} kg` : 'Not logged yet'}
                <span className="text-gray-500 ml-2">— log in Body Metrics</span>
              </div>
            ) : (
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Height (cm)</label>
            <input
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Health Goal</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            placeholder="e.g., Lose 5kg in 3 months, build muscle, maintain weight..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        {/* Target fields */}
        <div className="border-t border-gray-800 pt-4 mt-2">
          <h3 className="text-white font-medium text-sm mb-3">Body Targets (optional)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Weight (kg)</label>
              <input type="number" step="0.1" defaultValue={user.target_weight ?? ''} name="target_weight"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Body Fat %</label>
              <input type="number" step="0.1" defaultValue={user.target_body_fat_pct ?? ''} name="target_body_fat_pct"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Muscle Mass (kg)</label>
              <input type="number" step="0.1" defaultValue={user.target_muscle_mass ?? ''} name="target_muscle_mass"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Waist (cm)</label>
              <input type="number" step="0.1" defaultValue={user.target_waist_size ?? ''} name="target_waist_size"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Calculating your target...' : 'Save Profile'}
        </button>

        {user.profile_completed && user.daily_calorie_target && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">BMR:</span>
              <span className="text-white font-medium">{Math.round(user.bmr)} cal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Daily Calorie Target:</span>
              <span className="text-emerald-400 font-bold text-lg">{user.daily_calorie_target} cal</span>
            </div>
            {reasoning && (
              <p className="text-xs text-gray-500 mt-2">{reasoning}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
