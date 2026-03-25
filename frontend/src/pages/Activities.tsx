import { useEffect, useState, type FormEvent } from 'react';
import { getActivitiesApi, addActivityApi, deleteActivityApi } from '../api/activities';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Alert from '../components/Common/Alert';
import type { Activity } from '../utils/types';

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState({ total_calories_burned: 0, total_duration: 0 });
  const [activityText, setActivityText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchActivities = async () => {
    try {
      const res = await getActivitiesApi();
      setActivities(res.data.activities);
      setSummary(res.data.summary);
    } catch {
      console.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleAddActivity = async (e: FormEvent) => {
    e.preventDefault();
    if (!activityText.trim()) return;
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await addActivityApi(activityText);
      setAlert({ type: 'success', message: `Activity added! Estimated ${Math.round(res.data.activity.calories_burned)} calories burned` });
      setActivityText('');
      fetchActivities();
    } catch {
      setAlert({ type: 'error', message: 'Error processing activity. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteActivityApi(id);
      fetchActivities();
    } catch {
      setAlert({ type: 'error', message: 'Error deleting activity' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Activities</h1>

      {/* Today's summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Calories Burned</p>
          <p className="text-lg font-bold text-red-400">{Math.round(summary.total_calories_burned)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Duration</p>
          <p className="text-lg font-bold text-blue-400">{Math.round(summary.total_duration)} min</p>
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Add activity form */}
      <form onSubmit={handleAddActivity} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="block text-sm text-gray-400 mb-2">What activity did you do?</label>
        <textarea
          value={activityText}
          onChange={(e) => setActivityText(e.target.value)}
          placeholder="e.g., 30 minutes running at moderate pace"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !activityText.trim()}
          className="mt-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {submitting ? 'Analyzing with AI...' : 'Add Activity'}
        </button>
      </form>

      {/* Activity list */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activities logged today. Add your first activity above!</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded capitalize">
                      {activity.activity_type}
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded capitalize">
                      {activity.intensity}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white text-sm">{activity.activity_text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span className="text-red-400 font-medium">{Math.round(activity.calories_burned)} cal burned</span>
                    <span>{Math.round(activity.duration)} min</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded transition-colors ml-3"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
