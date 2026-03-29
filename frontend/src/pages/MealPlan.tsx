import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMealPlansApi, generateMealPlanApi, deleteMealPlanApi } from '../api/mealPlans';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Alert from '../components/Common/Alert';
import type { MealPlan as MealPlanType } from '../utils/types';

const mealTypeIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  snack: '🍎',
  dinner: '🌙',
};

export default function MealPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MealPlanType | null>(
    (location.state as { mealPlan?: MealPlanType })?.mealPlan || null
  );
  const [loading, setLoading] = useState(!plan);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!plan) {
      fetchLatestPlan();
    }
  }, []);

  const fetchLatestPlan = async () => {
    try {
      const res = await getMealPlansApi();
      const plans = res.data.meal_plans;
      if (plans.length > 0) {
        setPlan(plans[0]);
      }
    } catch {
      console.error('Failed to fetch meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setAlert(null);
    try {
      const res = await generateMealPlanApi();
      setPlan(res.data.meal_plan);
      setAlert({ type: 'success', message: 'Meal plan regenerated!' });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to generate meal plan';
      setAlert({ type: 'error', message });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    try {
      await deleteMealPlanApi(plan.id);
      setPlan(null);
    } catch {
      setAlert({ type: 'error', message: 'Error deleting meal plan' });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Meal Plan</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 mb-4">No meal plan yet. Generate one from your inventory!</p>
          <button
            onClick={() => navigate('/inventory')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Go to Inventory
          </button>
        </div>
      </div>
    );
  }

  const meals = plan.plan_data?.meals || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Meal Plan</h1>
          <p className="text-sm text-gray-400 mt-1">
            {plan.date} &middot; Target: {Math.round(plan.total_calories)} kcal
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1.5 rounded transition-colors"
        >
          Delete Plan
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Calories" value={Math.round(plan.total_calories)} color="text-emerald-400" />
        <MiniStat label="Protein" value={`${Math.round(plan.total_protein)}g`} color="text-blue-400" />
        <MiniStat label="Carbs" value={`${Math.round(plan.total_carbs)}g`} color="text-amber-400" />
        <MiniStat label="Fats" value={`${Math.round(plan.total_fats)}g`} color="text-red-400" />
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Meals */}
      {meals.map((meal, idx) => (
        <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{mealTypeIcons[meal.type] || '🍽️'}</span>
            <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded capitalize">{meal.type}</span>
            <span className="text-white font-medium">{meal.name}</span>
          </div>

          <div className="space-y-1 mb-3">
            {meal.items.map((item, iIdx) => (
              <div key={iIdx} className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {item.inventory_item} <span className="text-gray-500">{item.quantity}</span>
                </span>
                <span className="text-gray-400">{Math.round(item.calories)} cal</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-xs text-gray-400 mb-2">
            <span className="text-emerald-400 font-medium">{Math.round(meal.total_calories)} cal</span>
            <span>P: {Math.round(meal.total_protein)}g</span>
            <span>C: {Math.round(meal.total_carbs)}g</span>
            <span>F: {Math.round(meal.total_fats)}g</span>
          </div>

          {meal.preparation && (
            <p className="text-xs text-gray-500 italic">{meal.preparation}</p>
          )}
        </div>
      ))}

      {/* Summary */}
      {plan.plan_data?.summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-300 italic">{plan.plan_data.summary}</p>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={handleRegenerate}
        disabled={generating}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {generating ? 'Regenerating...' : 'Regenerate Plan'}
      </button>
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
