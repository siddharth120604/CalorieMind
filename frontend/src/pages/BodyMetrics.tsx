import { useEffect, useState, type FormEvent } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { logWeightApi, getWeightHistoryApi, getWeightTrendApi } from '../api/weight';
import { logBodyMetricsApi } from '../api/bodyMetrics';
import { getGoalStatusApi } from '../api/goals';
import { getProjectionApi, getAdjustmentApi, acceptAdjustmentApi, rejectAdjustmentApi } from '../api/progress';
import { useAppSelector, useAppDispatch } from '../hooks/useAppDispatch';
import { fetchProfile } from '../store/authSlice';
import Alert from '../components/Common/Alert';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import type { WeightLog, WeightTrendPoint, GoalStatus, Projection, AdjustmentSuggestion } from '../utils/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function BodyMetrics() {
  useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);
  const [goalStatus, setGoalStatus] = useState<GoalStatus[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [adjustment, setAdjustment] = useState<AdjustmentSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [histRes, trendRes, goalRes, projRes, adjRes] = await Promise.all([
        getWeightHistoryApi(60),
        getWeightTrendApi(30),
        getGoalStatusApi(),
        getProjectionApi().catch(() => null),
        getAdjustmentApi().catch(() => null),
      ]);
      setWeightLogs(histRes.data.logs);
      setTrend(trendRes.data.trend);
      setGoalStatus(goalRes.data.goals);
      if (projRes?.data?.projections) setProjections(projRes.data.projections);
      if (adjRes?.data) setAdjustment(adjRes.data);
    } catch {
      console.error('Failed to load body metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogWeight = async (e: FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    setSubmitting(true);
    try {
      await logWeightApi(Number(weight), undefined, notes || undefined);
      setAlert({ type: 'success', message: `Weight logged: ${weight} kg` });
      setWeight('');
      setNotes('');
      dispatch(fetchProfile());
      fetchData();
    } catch {
      setAlert({ type: 'error', message: 'Failed to log weight' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogBodyMetrics = async (e: FormEvent) => {
    e.preventDefault();
    if (!bodyFat && !muscleMass && !waistSize) return;
    setSubmitting(true);
    try {
      await logBodyMetricsApi({
        body_fat_pct: bodyFat ? Number(bodyFat) : undefined,
        muscle_mass: muscleMass ? Number(muscleMass) : undefined,
        waist_size: waistSize ? Number(waistSize) : undefined,
      });
      setAlert({ type: 'success', message: 'Body metrics logged' });
      setBodyFat(''); setMuscleMass(''); setWaistSize('');
      fetchData();
    } catch {
      setAlert({ type: 'error', message: 'Failed to log body metrics' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAdjustment = async () => {
    if (!adjustment?.suggested_target || !adjustment?.correction_factor) return;
    try {
      await acceptAdjustmentApi(adjustment.suggested_target, adjustment.correction_factor);
      setAlert({ type: 'success', message: `Target updated to ${adjustment.suggested_target} cal` });
      dispatch(fetchProfile());
      setAdjustment(null);
    } catch {
      setAlert({ type: 'error', message: 'Failed to update target' });
    }
  };

  const handleRejectAdjustment = async () => {
    try {
      await rejectAdjustmentApi();
      setAdjustment(null);
    } catch {
      console.error('Failed to reject');
    }
  };

  if (loading) return <LoadingSpinner />;

  // Weight trend chart
  const chartData = trend.length > 0 ? {
    labels: trend.map(t => new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: '7-Day Avg',
        data: trend.map(t => t.avg_weight),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Daily',
        data: trend.map(t => t.raw_weight),
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        pointRadius: 3,
        borderDash: [3, 3],
        tension: 0,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9ca3af' } } },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
    },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Body Metrics</h1>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Adjustment suggestion */}
      {adjustment?.has_suggestion && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h3 className="text-amber-400 font-medium mb-2">Target Adjustment Suggested</h3>
          <p className="text-gray-300 text-sm mb-3">{adjustment.reasoning}</p>
          <div className="flex gap-3">
            <button onClick={handleAcceptAdjustment} className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-colors">
              Accept ({adjustment.suggested_target} cal)
            </button>
            <button onClick={handleRejectAdjustment} className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-1.5 rounded-lg transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Goal progress */}
      {goalStatus.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium">Goal Progress</h3>
          {goalStatus.map((g) => (
            <div key={g.metric}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400 capitalize">{g.metric.replace('_', ' ')}</span>
                <span className={g.achieved ? 'text-emerald-400' : 'text-white'}>
                  {g.current} → {g.target} {g.achieved ? '  Achieved!' : `(${g.remaining} to go)`}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${g.achieved ? 'bg-emerald-400' : 'bg-blue-500'}`}
                  style={{ width: `${g.progress_pct || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weight chart */}
      {chartData && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Weight Trend</h3>
          <div className="h-56">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Projections */}
      {projections.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Projections</h3>
          <div className="grid grid-cols-3 gap-3">
            {projections.map((p) => (
              <div key={p.weeks} className="text-center">
                <p className="text-xs text-gray-500">{p.weeks} week{p.weeks > 1 ? 's' : ''}</p>
                <p className="text-lg font-bold text-white">{p.projected_weight} kg</p>
                <p className={`text-xs ${p.projected_change < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.projected_change > 0 ? '+' : ''}{p.projected_change} kg
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleLogWeight} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Log Weight</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button type="submit" disabled={submitting || !weight} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition-colors">
                Log
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today? (optional)"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
        </form>

        <form onSubmit={handleLogBodyMetrics} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Body Composition</h3>
          <div className="space-y-2">
            <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="Body fat %" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            <input type="number" step="0.1" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} placeholder="Muscle mass (kg)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            <input type="number" step="0.1" value={waistSize} onChange={(e) => setWaistSize(e.target.value)} placeholder="Waist size (cm)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            <button type="submit" disabled={submitting || (!bodyFat && !muscleMass && !waistSize)} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors">
              Log Metrics
            </button>
          </div>
        </form>
      </div>

      {/* Recent weight logs */}
      {weightLogs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Recent Logs</h3>
          <div className="space-y-1">
            {weightLogs.slice(-10).reverse().map((l) => (
              <div key={l.id} className="py-2 border-b border-gray-800 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="text-white font-medium">{l.weight} kg</span>
                </div>
                {l.notes && <p className="text-xs text-gray-500 mt-1">{l.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
