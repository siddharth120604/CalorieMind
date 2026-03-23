import { useEffect, useState, type FormEvent } from 'react';
import { getMealsApi, addMealApi, deleteMealApi, repeatMealApi } from '../api/meals';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Alert from '../components/Common/Alert';
import type { Meal } from '../utils/types';

export default function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
  const [mealText, setMealText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMeals = async () => {
    try {
      const res = await getMealsApi();
      setMeals(res.data.meals);
      setSummary(res.data.summary);
    } catch {
      console.error('Failed to fetch meals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const handleAddMeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!mealText.trim()) return;
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await addMealApi(mealText);
      setAlert({ type: 'success', message: `Meal added! Estimated ${Math.round(res.data.meal.total_calories)} calories` });
      setMealText('');
      fetchMeals();
    } catch {
      setAlert({ type: 'error', message: 'Error processing meal. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMealApi(id);
      fetchMeals();
    } catch {
      setAlert({ type: 'error', message: 'Error deleting meal' });
    }
  };

  const handleRepeat = async (id: number) => {
    try {
      await repeatMealApi(id);
      setAlert({ type: 'success', message: 'Meal repeated!' });
      fetchMeals();
    } catch {
      setAlert({ type: 'error', message: 'Error repeating meal' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Meals</h1>

      {/* Today's summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Calories" value={Math.round(summary.total_calories)} color="text-emerald-400" />
        <MiniStat label="Protein" value={`${Math.round(summary.total_protein)}g`} color="text-blue-400" />
        <MiniStat label="Carbs" value={`${Math.round(summary.total_carbs)}g`} color="text-amber-400" />
        <MiniStat label="Fats" value={`${Math.round(summary.total_fats)}g`} color="text-red-400" />
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Add meal form */}
      <form onSubmit={handleAddMeal} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="block text-sm text-gray-400 mb-2">What did you eat?</label>
        <textarea
          value={mealText}
          onChange={(e) => setMealText(e.target.value)}
          placeholder="e.g., 2 scrambled eggs, toast with butter, orange juice"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !mealText.trim()}
          className="mt-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {submitting ? 'Analyzing with AI...' : 'Add Meal'}
        </button>
      </form>

      {/* Meal list */}
      <div className="space-y-3">
        {meals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No meals logged today. Add your first meal above!</p>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded capitalize">
                      {meal.meal_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white text-sm">{meal.meal_text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span className="text-emerald-400 font-medium">{Math.round(meal.total_calories)} cal</span>
                    <span>P: {Math.round(meal.protein)}g</span>
                    <span>C: {Math.round(meal.carbs)}g</span>
                    <span>F: {Math.round(meal.fats)}g</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleRepeat(meal.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-2 py-1 rounded transition-colors"
                  >
                    Repeat
                  </button>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
