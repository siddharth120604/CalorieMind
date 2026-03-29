import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInventoryApi, addInventoryItemApi, deleteInventoryItemApi } from '../api/inventory';
import { generateMealPlanApi } from '../api/mealPlans';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Alert from '../components/Common/Alert';
import type { InventoryItem } from '../utils/types';

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await getInventoryApi();
      setItems(res.data.items);
    } catch {
      console.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity.trim()) return;
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await addInventoryItemApi(name, quantity);
      setAlert({ type: 'success', message: `Added ${res.data.item.name} (${res.data.item.category})` });
      setName('');
      setQuantity('');
      fetchInventory();
    } catch {
      setAlert({ type: 'error', message: 'Error adding item. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteInventoryItemApi(id);
      fetchInventory();
    } catch {
      setAlert({ type: 'error', message: 'Error deleting item' });
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setAlert(null);
    try {
      const res = await generateMealPlanApi();
      navigate('/meal-plan', { state: { mealPlan: res.data.meal_plan } });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to generate meal plan';
      setAlert({ type: 'error', message });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const categoryColors: Record<string, string> = {
    protein: 'text-blue-400 bg-blue-400/10',
    carb: 'text-amber-400 bg-amber-400/10',
    fat: 'text-red-400 bg-red-400/10',
    supplement: 'text-purple-400 bg-purple-400/10',
    vegetable: 'text-emerald-400 bg-emerald-400/10',
    fruit: 'text-orange-400 bg-orange-400/10',
    dairy: 'text-cyan-400 bg-cyan-400/10',
    other: 'text-gray-400 bg-gray-400/10',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Food & Supplement Inventory</h1>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Add item form */}
      <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="block text-sm text-gray-400 mb-2">Add Item</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name (e.g., chicken breast)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity (e.g., 2 kg)"
            className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim() || !quantity.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {/* Inventory list */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Your Inventory ({items.length} items)</h2>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items in your inventory. Add your first item above!</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${categoryColors[item.category] || categoryColors.other}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{item.quantity}</p>
                  {item.serving_size && (
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span className="text-gray-500">Per {item.serving_size}:</span>
                      {item.calories != null && <span className="text-emerald-400 font-medium">{Math.round(item.calories)} cal</span>}
                      {item.protein != null && <span>P: {Math.round(item.protein)}g</span>}
                      {item.carbs != null && <span>C: {Math.round(item.carbs)}g</span>}
                      {item.fats != null && <span>F: {Math.round(item.fats)}g</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded transition-colors ml-3"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generate meal plan */}
      {items.length > 0 && (
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-lg"
        >
          {generating ? 'Generating Meal Plan with AI...' : "Generate Today's Meal Plan"}
        </button>
      )}
    </div>
  );
}
